import { Redis } from "@upstash/redis";

export const config = { runtime: "edge" };

// F8.3: Coordonate GPS exacte livada (confirmate Roland 2026-04-12)
const LAT = 46.164779;
const LON = 20.716786;

// F8.2: Prag frost ajustat +1.5°C pt microclimat Mures (livada la ~270m de rau)
const FROST_THRESHOLD = 3.5;

const WMO_CODES = {
  0: "Cer senin",
  1: "Predominant senin",
  2: "Partial innorat",
  3: "Innorat",
  45: "Ceata",
  48: "Ceata cu chiciura",
  51: "Burinta usoara",
  53: "Burinta moderata",
  55: "Burinta densa",
  61: "Ploaie usoara",
  63: "Ploaie moderata",
  65: "Ploaie puternica",
  66: "Ploaie inghetata usoara",
  67: "Ploaie inghetata puternica",
  71: "Ninsoare usoara",
  73: "Ninsoare moderata",
  75: "Ninsoare puternica",
  77: "Granule de zapada",
  80: "Averse usoare",
  81: "Averse moderate",
  82: "Averse violente",
  85: "Ninsoare usoara (averse)",
  86: "Ninsoare puternica (averse)",
  95: "Furtuna",
  96: "Furtuna cu grindina usoara",
  99: "Furtuna cu grindina puternica",
};

// F3.3 — Yr.no: fetch prognoza minima noapte urmatoare pentru comparare
async function fetchYrnoMin() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${LAT}&lon=${LON}`,
      {
        headers: { "User-Agent": "LivadaMea/2.0 (petrilarolly@gmail.com)" },
        signal: ctrl.signal,
      },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const timeseries = data.properties?.timeseries || [];
    // Gaseste minimul de temperatura din urmatoarele 24h
    let minTemp = Infinity;
    const now = Date.now();
    for (const ts of timeseries) {
      const t = new Date(ts.time).getTime();
      if (t < now || t > now + 24 * 3600 * 1000) continue;
      const temp =
        ts.data?.instant?.details?.air_temperature ??
        ts.data?.next_1_hours?.details?.air_temperature_min;
      if (temp !== undefined && temp < minTemp) minTemp = temp;
    }
    return minTemp === Infinity ? null : Math.round(minTemp * 10) / 10;
  } catch {
    return null;
  }
}

export default async function handler(req) {
  // Verificare CRON_SECRET — previne triggerare manuala neautorizata
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET neconfigurat" },
      { status: 500 },
    );
  }
  const auth =
    req.headers?.get?.("authorization") || req.headers?.["authorization"] || "";
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Neautorizat" }, { status: 401 });
  }

  let kv;
  try {
    kv = Redis.fromEnv();
  } catch (err) {
    return Response.json(
      { error: "Redis nu este configurat" },
      { status: 503 },
    );
  }

  try {
    // F3.1 — URL extins cu apparent_temperature, cloud_cover, dew_point_2m, precipitation_probability
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,relative_humidity_2m,weather_code,uv_index,soil_moisture_0_to_1cm,cloud_cover,dew_point_2m,wind_gusts_10m&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_min,precipitation_sum,weather_code,uv_index_max,et0_fao_evapotranspiration,wind_gusts_10m_max&timezone=Europe/Bucharest&forecast_days=5`;

    let meteoRes, lastMeteoError;
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      try {
        meteoRes = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (meteoRes.ok) break;
        lastMeteoError = new Error("Open-Meteo API error: " + meteoRes.status);
      } catch (err) {
        clearTimeout(timer);
        lastMeteoError = err;
        meteoRes = null;
      }
      if (attempt < 1) await new Promise((r) => setTimeout(r, 2000));
    }
    if (!meteoRes?.ok)
      throw lastMeteoError || new Error("Open-Meteo indisponibil");
    const data = await meteoRes.json();

    // Salveaza in Redis — format identic
    // Fix: foloseste Europe/Bucharest pentru "today" (nu UTC) — previne
    // bug-uri subtile daca cronul ruleaza intre 22:00-24:00 UTC cand data
    // locala e deja ziua urmatoare fata de UTC.
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Bucharest",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()); // format: "2026-04-11"
    const history = (await kv.get("livada:meteo:history")) || {};

    const h24 = Math.min(24, (data.hourly?.uv_index || []).length);
    const uvAvg =
      h24 > 0
        ? Math.round(
            (data.hourly.uv_index
              .slice(0, h24)
              .reduce((s, v) => s + (v || 0), 0) /
              h24) *
              10,
          ) / 10
        : null;
    const smAvg =
      h24 > 0 && data.hourly?.soil_moisture_0_to_1cm
        ? Math.round(
            (data.hourly.soil_moisture_0_to_1cm
              .slice(0, h24)
              .reduce((s, v) => s + (v || 0), 0) /
              h24) *
              1000,
          ) / 1000
        : null;
    const uvMax = data.daily?.uv_index_max?.[0] ?? null;
    const et0 = data.daily?.et0_fao_evapotranspiration?.[0] ?? null;

    history[today] = {
      temp: Math.round(data.current.temperature_2m * 10) / 10,
      temp_min: Math.round(data.daily.temperature_2m_min[0] * 10) / 10,
      temp_max: Math.round(data.daily.temperature_2m_max[0] * 10) / 10,
      humidity: data.current.relative_humidity_2m,
      description: WMO_CODES[data.current.weather_code] || "Necunoscut",
      wind: Math.round(data.current.wind_speed_10m),
      rain: data.current.precipitation || 0,
      uv_index: uvMax ?? uvAvg,
      soil_moisture: smAvg,
      et0_mm: et0 !== null ? Math.round(et0 * 10) / 10 : null,
    };

    const dates = Object.keys(history).sort();
    if (dates.length > 90) {
      for (const d of dates.slice(0, dates.length - 90)) delete history[d];
    }
    await kv.set("livada:meteo:history", history);

    // F8.2: Frost alert (March–May): apparent_temperature + cloud_cover + dew_point
    // Varianta A: skip ore trecute, salveaza frostHour, prag FROST_THRESHOLD (microclimat Mures)
    const month = new Date().getMonth() + 1;
    const nowMs = Date.now();
    let frostAlert = { active: false, updatedAt: new Date().toISOString() };

    if (month >= 3 && month <= 5 && data.hourly?.temperature_2m) {
      const apparentTemps =
        data.hourly.apparent_temperature || data.hourly.temperature_2m;
      const cloudCovers = data.hourly.cloud_cover || [];
      const dewPoints = data.hourly.dew_point_2m || [];
      const times = data.hourly.time;

      let worstApparent = Infinity,
        frostTime = "",
        frostCloudless = false,
        frostDewPoint = null;
      for (let i = 0; i < apparentTemps.length; i++) {
        // Varianta A: skip ore deja trecute — nu crea alerte pt frost din trecut
        if (new Date(times[i]).getTime() < nowMs) continue;
        const apparentTemp = apparentTemps[i];
        const dewPoint = dewPoints[i] ?? null;
        const cloudCover = cloudCovers[i] ?? 100;
        const frostRisk =
          apparentTemp < FROST_THRESHOLD || (dewPoint !== null && dewPoint < 0);
        if (frostRisk && apparentTemp < worstApparent) {
          worstApparent = apparentTemp;
          frostTime = times[i];
          frostCloudless = cloudCover < 20;
          frostDewPoint = dewPoint;
        }
      }

      if (worstApparent < Infinity) {
        const frostDate = frostTime.split("T")[0];
        const frostHourStr = frostTime.split("T")[1]?.slice(0, 5) || "";
        const cerinaSen = frostCloudless ? " — cer senin, risc de bruma!" : "";
        const dewMsg =
          frostDewPoint !== null && frostDewPoint < 0
            ? ` Punct de roua: ${Math.round(frostDewPoint * 10) / 10}°C (bruma sigura).`
            : "";
        frostAlert = {
          active: true,
          minTemp: Math.round(worstApparent * 10) / 10,
          date: frostDate,
          frostHour: frostTime,
          message: `Inghet prognozat: ${Math.round(worstApparent)}°C (perceput) pe ${frostDate} la ~${frostHourStr}${cerinaSen}${dewMsg} Protejeaza pomii sensibili (piersic, cais, migdal, rodiu)!`,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // F3.2 — Alert multi-noapte consecutive (apparent_temperature_min zilnic)
    let consecutiveFrostMsg = "";
    if (month >= 3 && month <= 5 && data.daily?.apparent_temperature_min) {
      const frostNights = [];
      const dailyDates = data.daily.time || [];
      const dailyApparent = data.daily.apparent_temperature_min;
      dailyDates.forEach(function (date, i) {
        if (date < today) return; // skip zile trecute
        if ((dailyApparent[i] ?? 99) < FROST_THRESHOLD) frostNights.push(date);
      });
      if (frostNights.length >= 2) {
        consecutiveFrostMsg =
          "ATENTIE: " +
          frostNights.length +
          " nopti consecutive cu risc (" +
          frostNights[0] +
          " - " +
          frostNights[frostNights.length - 1] +
          ")";
        if (frostAlert.active) {
          frostAlert.consecutiveMsg = consecutiveFrostMsg;
          frostAlert.frostNights = frostNights;
        } else {
          frostAlert = {
            active: true,
            minTemp: Math.min(
              ...frostNights.map(
                (_, i) => data.daily.apparent_temperature_min[i] ?? 99,
              ),
            ),
            date: frostNights[0],
            message:
              consecutiveFrostMsg +
              ". Protejeaza pomii sensibili (piersic, cais, migdal, rodiu)!",
            consecutiveMsg: consecutiveFrostMsg,
            frostNights,
            updatedAt: new Date().toISOString(),
          };
        }
      }
      // Marcheaza zilele cu frost sever (< 0°C) pentru UI (border rosu)
      if (frostAlert.active) {
        frostAlert.severeDays = dailyDates.filter(
          (_, i) => (dailyApparent[i] ?? 99) < 0,
        );
      }
    }

    // F8.3: Multi-model frost consensus (ICON-EU, ECMWF, GFS)
    if (month >= 3 && month <= 5 && frostAlert.active) {
      try {
        const mmUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=apparent_temperature&forecast_days=2&timezone=Europe/Bucharest&models=icon_seamless,ecmwf_ifs025,gfs_seamless`;
        const mmCtrl = new AbortController();
        const mmTimer = setTimeout(() => mmCtrl.abort(), 5000);
        const mmRes = await fetch(mmUrl, { signal: mmCtrl.signal });
        clearTimeout(mmTimer);
        if (mmRes.ok) {
          const mmData = await mmRes.json();
          const models = ["icon_seamless", "ecmwf_ifs025", "gfs_seamless"];
          let modelsFrost = 0;
          const mmTimes = mmData.hourly?.time || [];
          for (const model of models) {
            const key = `apparent_temperature_${model}`;
            const temps = mmData.hourly?.[key] || [];
            for (let i = 0; i < temps.length; i++) {
              if (new Date(mmTimes[i]).getTime() < nowMs) continue;
              if (temps[i] < FROST_THRESHOLD) {
                modelsFrost++;
                break;
              }
            }
          }
          const confidence =
            modelsFrost >= 3
              ? "cert"
              : modelsFrost >= 2
                ? "probabil"
                : "posibil";
          frostAlert.confidence = confidence;
          frostAlert.modelsAgree = modelsFrost;
          frostAlert.message += ` [${confidence.toUpperCase()} — ${modelsFrost}/3 modele]`;
        }
      } catch {
        // Multi-model e optional — daca esueaza, alerta ramane fara confidence
      }
    }

    // Disease risk (next 48h): rain + warm + humid + probability > 50%
    let diseaseRisk = { active: false, updatedAt: new Date().toISOString() };
    if (data.hourly?.temperature_2m) {
      const n = Math.min(48, data.hourly.temperature_2m.length);
      let rainyH = 0,
        sumT = 0,
        sumH = 0;
      const precipProbs = data.hourly.precipitation_probability || [];
      for (let i = 0; i < n; i++) {
        sumT += data.hourly.temperature_2m[i];
        sumH += data.hourly.relative_humidity_2m[i];
        const precipProb = precipProbs[i] ?? 100;
        if (data.hourly.precipitation[i] > 0 && precipProb > 50) rainyH++;
      }
      const avgT = sumT / n,
        avgH = sumH / n;
      if (rainyH >= 4 && avgT >= 10 && avgT <= 25 && avgH > 70) {
        diseaseRisk = {
          active: true,
          message: `Risc crescut de boli fungice! Ploaie + ${Math.round(avgT)}°C + umiditate ${Math.round(avgH)}%. Verifica rapanul la mar/par si monilioza la cais/piersic.`,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // F8.2: Wind alert — rafale >= 50 km/h
    let windAlert = { active: false, updatedAt: new Date().toISOString() };
    if (data.hourly?.wind_gusts_10m) {
      const gusts = data.hourly.wind_gusts_10m;
      const hTimes = data.hourly.time;
      let maxGust = 0,
        gustTime = "";
      for (let i = 0; i < gusts.length; i++) {
        if (new Date(hTimes[i]).getTime() < nowMs) continue;
        if ((gusts[i] ?? 0) > maxGust) {
          maxGust = gusts[i];
          gustTime = hTimes[i];
        }
      }
      if (maxGust >= 50) {
        const gustDate = gustTime.split("T")[0];
        const gustHourStr = gustTime.split("T")[1]?.slice(0, 5) || "";
        windAlert = {
          active: true,
          maxGust: Math.round(maxGust),
          date: gustDate,
          alertHour: gustTime,
          message: `Rafale puternice: ${Math.round(maxGust)} km/h pe ${gustDate} la ~${gustHourStr}. Verifica pomii tineri si spalierele!`,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // F8.2: Heat alert — maxima zilnica >= 35°C
    let heatAlert = { active: false, updatedAt: new Date().toISOString() };
    if (data.daily?.temperature_2m_max) {
      for (let i = 0; i < data.daily.temperature_2m_max.length; i++) {
        const hDate = data.daily.time[i];
        if (hDate < today) continue;
        if (data.daily.temperature_2m_max[i] >= 35) {
          heatAlert = {
            active: true,
            maxTemp: Math.round(data.daily.temperature_2m_max[i] * 10) / 10,
            date: hDate,
            message: `Canicula: ${Math.round(data.daily.temperature_2m_max[i])}°C maxima pe ${hDate}. Iriga pomii dimineata devreme sau seara!`,
            updatedAt: new Date().toISOString(),
          };
          break;
        }
      }
    }

    // F8.2: Rain alert — precipitatii >= 20mm/zi
    let rainAlert = { active: false, updatedAt: new Date().toISOString() };
    if (data.daily?.precipitation_sum) {
      for (let i = 0; i < data.daily.precipitation_sum.length; i++) {
        const rDate = data.daily.time[i];
        if (rDate < today) continue;
        if (data.daily.precipitation_sum[i] >= 20) {
          rainAlert = {
            active: true,
            amount: Math.round(data.daily.precipitation_sum[i] * 10) / 10,
            date: rDate,
            message: `Ploaie abundenta: ${Math.round(data.daily.precipitation_sum[i])} mm pe ${rDate}. Risc eroziune si inec radacini!`,
            updatedAt: new Date().toISOString(),
          };
          break;
        }
      }
    }

    // F8.2: Drought alert — ET0 ridicat + lipsa ploaie + sol uscat
    let droughtAlert = {
      active: false,
      updatedAt: new Date().toISOString(),
    };
    if (
      data.daily?.et0_fao_evapotranspiration &&
      data.daily?.precipitation_sum
    ) {
      const totalRain5d = data.daily.precipitation_sum.reduce(
        (s, v) => s + (v || 0),
        0,
      );
      const maxEt0 = Math.max(...data.daily.et0_fao_evapotranspiration);
      if (maxEt0 > 5 && totalRain5d < 5 && smAvg !== null && smAvg < 0.15) {
        droughtAlert = {
          active: true,
          et0: Math.round(maxEt0 * 10) / 10,
          soilMoisture: smAvg,
          totalRain: Math.round(totalRain5d * 10) / 10,
          message: `Stres hidric posibil! ET0 ${Math.round(maxEt0 * 10) / 10} mm/zi, ploaie doar ${Math.round(totalRain5d)} mm in 5 zile. Iriga pomii tineri si fructiferi!`,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // Prepare all Redis writes for batching
    const redisWrites = [
      kv.set("livada:meteo:history", history),
      kv.set("livada:frost-alert", frostAlert),
      kv.set("livada:disease-risk", diseaseRisk),
      kv.set("livada:alert-wind", windAlert),
      kv.set("livada:alert-heat", heatAlert),
      kv.set("livada:alert-rain", rainAlert),
      kv.set("livada:alert-drought", droughtAlert),
    ];

    // F3.3 — Yr.no: compara cu Open-Meteo, salveaza avertizare divergenta
    const yrnoMin = await fetchYrnoMin();
    if (yrnoMin !== null && data.hourly?.apparent_temperature) {
      const openMeteoApparent = data.hourly.apparent_temperature;
      const openMeteoMin =
        data.daily?.apparent_temperature_min?.[0] ??
        Math.min(...openMeteoApparent.slice(0, 24));
      const diffTemp = Math.abs(openMeteoMin - yrnoMin);
      if (diffTemp > 2) {
        redisWrites.push(
          kv.set(
            "livada:meteo:divergenta",
            `Prognoze divergente: Open-Meteo ${openMeteoMin}°C vs Yr.no ${yrnoMin}°C — verifica manual!`,
          ),
        );
      } else {
        redisWrites.push(kv.del("livada:meteo:divergenta"));
      }
    }

    redisWrites.push(
      kv.set("livada:cron:last-run", {
        date: today,
        success: true,
        temp: data.current.temperature_2m,
        timestamp: Date.now(),
      }),
    );

    // Batch all Redis operations
    await Promise.all(redisWrites);

    return Response.json({
      success: true,
      date: today,
      temp: data.current.temperature_2m,
      frostAlert: frostAlert.active,
      frostConfidence: frostAlert.confidence || null,
      frostConsecutive: !!consecutiveFrostMsg,
      diseaseRisk: diseaseRisk.active,
      windAlert: windAlert.active,
      heatAlert: heatAlert.active,
      rainAlert: rainAlert.active,
      droughtAlert: droughtAlert.active,
      yrnoMin,
    });
  } catch (err) {
    try {
      await kv.set("livada:cron:last-run", {
        success: false,
        error: err.message,
        timestamp: Date.now(),
      });
    } catch {}
    console.error("meteo-cron error:", err);
    return Response.json({ error: "Eroare interna server" }, { status: 500 });
  }
}
