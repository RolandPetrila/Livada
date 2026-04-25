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

// Opțiunea 1 — NASA POWER: acumuleaza GDD (Growing Degree Days) din
// temperatura reala de ieri (NASA POWER are latency 1-2 zile).
// Base temp 5°C (standard pomicultură). Reset automat la 1 ian.
// Fara API key, gratuit permanent.
async function fetchAndAccumulateGdd(kv) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD pt NASA API
  const yISO = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD pt storage

  let gddData = null;
  try {
    gddData = await kv.get("livada:gdd:annual");
  } catch {}
  const currentYear = new Date().getFullYear();
  if (!gddData || gddData.year !== currentYear) {
    gddData = { year: currentYear, cumulative: 0, lastDate: null };
  }
  if (gddData.lastDate === yISO) return gddData; // deja procesat azi

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?lat=${LAT}&lon=${LON}&parameters=T2M_MAX,T2M_MIN&community=AG&start=${yStr}&end=${yStr}&format=JSON`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return gddData;
    const nasaData = await res.json();
    const tmax = nasaData.properties?.parameter?.T2M_MAX?.[yStr];
    const tmin = nasaData.properties?.parameter?.T2M_MIN?.[yStr];
    // NASA POWER returneaza -999 pentru date invalide/lipsa
    if (tmax != null && tmin != null && tmax > -990 && tmin > -990) {
      const gddDay = Math.max(0, Math.round(((tmax + tmin) / 2 - 5) * 10) / 10);
      gddData.cumulative = Math.round((gddData.cumulative + gddDay) * 10) / 10;
      gddData.lastDate = yISO;
    }
  } catch {
    clearTimeout(timer);
  }
  return gddData;
}

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
    // Optiunea 2: icon_seamless = ICON-EU 2.2km pt Europa (cel mai precis pt
    // campie joasa Nadlac). wind_speed_10m orar adaugat pt spray window.
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&hourly=temperature_2m,apparent_temperature,precipitation,precipitation_probability,relative_humidity_2m,weather_code,uv_index,soil_moisture_0_to_1cm,cloud_cover,dew_point_2m,wind_gusts_10m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_min,precipitation_sum,weather_code,uv_index_max,et0_fao_evapotranspiration,wind_gusts_10m_max&timezone=Europe/Bucharest&forecast_days=5&models=icon_seamless`;

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
    if (!meteoRes?.ok) {
      // Open-Meteo indisponibil temporar (timeout sau eroare HTTP) — returnam
      // 200 cu flag cached:true ca sa nu generam email-uri false in GitHub Actions.
      // livada:cron:last-run ramane nemodificat → badge-ul "Cron stale" din UI
      // apare corect dupa 2+ ore de esecuri consecutive.
      return Response.json({
        success: false,
        cached: true,
        reason:
          lastMeteoError?.name === "AbortError"
            ? "Open-Meteo timeout (>6s/attempt)"
            : `Open-Meteo HTTP ${meteoRes?.status ?? "error"}`,
      });
    }
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
    // History se scrie doar in batch (jos) — evita duplicate write + ofera
    // rollback automat daca urmatorii pasi esueaza. Vezi hardening 2026-04-23.

    // G6 + gradient iarna: frost alert pe tot anul cu prag/mesaj dinamice.
    //   - sezon activ (Mar-Mai, Sep-Nov): prag 3.5°C, pomi activi/fructe
    //   - iarna severa (Dec-Feb): prag -10°C, pt rodiu+kaki in dormancy
    //   - BANDA INTERMEDIARA (Nov-29→Dec-15 + Feb-15→Mar-15): pragul
    //     gliseaza linear intre 3.5°C si -10°C → elimina discontinuitatea
    //     sezoniera (inainte: 27 Feb -8°C silent, 1 Mar -8°C alert).
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const nowMs = now.getTime();
    const isActiveFrostSeason =
      (month >= 3 && day >= 16 && month <= 5) ||
      (month > 3 && month < 5) ||
      month === 5 ||
      (month >= 9 && month <= 10) ||
      (month === 11 && day <= 29);
    const isSevereWinter =
      (month === 12 && day >= 16) || month === 1 || (month === 2 && day <= 14);
    // Banda intermediara: interpolare liniara intre cele doua praguri.
    // Exemple: Nov 30 ~3.4°C, Dec 5 ~1°C, Dec 10 ~-4°C, Dec 15 ~-9°C.
    //          Feb 15 ~-9°C, Feb 28 ~-3°C, Mar 10 ~1.5°C.
    let frostThresholdDynamic;
    let bandLabel = "";
    if (isActiveFrostSeason) {
      frostThresholdDynamic = FROST_THRESHOLD;
      bandLabel = "activ";
    } else if (isSevereWinter) {
      frostThresholdDynamic = -10;
      bandLabel = "iarna-severa";
    } else {
      // Banda de tranzitie — lerpeaza intre 3.5 si -10 peste ~15 zile fiecare capat.
      // Calculam fractiunea intre "ultima zi activ" si "prima zi iarna severa".
      const dayOfYear = Math.floor(
        (now - new Date(now.getFullYear(), 0, 0)) / 86400000,
      );
      // Nov 30 = day ~334, Dec 15 = day ~349 (toamna → iarna)
      // Feb 15 = day ~46, Mar 15 = day ~74 (iarna → primavara)
      let frac;
      if (month === 11 || (month === 12 && day <= 15)) {
        // Toamna → iarna
        const startDoy = 334; // Nov 30
        const endDoy = 349; // Dec 15
        frac = Math.min(
          1,
          Math.max(0, (dayOfYear - startDoy) / (endDoy - startDoy)),
        );
      } else {
        // Iarna → primavara (Feb 15 → Mar 15)
        const startDoy = 46; // Feb 15
        const endDoy = 74; // Mar 15
        frac = Math.min(
          1,
          Math.max(0, 1 - (dayOfYear - startDoy) / (endDoy - startDoy)),
        );
      }
      // frac=0 → activ (3.5), frac=1 → iarna (-10)
      frostThresholdDynamic = FROST_THRESHOLD - frac * (FROST_THRESHOLD + 10);
      frostThresholdDynamic = Math.round(frostThresholdDynamic * 10) / 10;
      bandLabel = `tranzitie (prag ${frostThresholdDynamic}°C)`;
    }
    const speciesHint = isSevereWinter
      ? "rodiu si kaki — frost SEVER, risc mortalitate"
      : isActiveFrostSeason
        ? "piersic, cais, migdal, rodiu"
        : "rodiu, kaki si soiuri in dormancy tardiva";
    let frostAlert = { active: false, updatedAt: new Date().toISOString() };

    if (data.hourly?.temperature_2m) {
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
        if (new Date(times[i]).getTime() < nowMs) continue;
        const apparentTemp = apparentTemps[i];
        const dewPoint = dewPoints[i] ?? null;
        const cloudCover = cloudCovers[i] ?? 100;
        // In sezon activ sau banda tranzitie: frost daca apparent < prag SAU
        //   dew_point < 0 (bruma radiativa).
        // In iarna severa: doar apparent < prag (dew_point negativ e normal).
        const frostRisk = isSevereWinter
          ? apparentTemp < frostThresholdDynamic
          : apparentTemp < frostThresholdDynamic ||
            (dewPoint !== null && dewPoint < 0);
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
        const prefix = isSevereWinter
          ? "Inghet SEVER prognozat"
          : "Inghet prognozat";
        const tempRounded = Math.round(worstApparent);
        const fullMessage = `${prefix}: ${tempRounded}°C (perceput) pe ${frostDate} la ~${frostHourStr}${cerinaSen}${dewMsg} Protejeaza pomii sensibili (${speciesHint})!`;
        // Audit #9: mesaj scurt pt notificare mobila (~100 chars vizibili)
        const shortTarget = isSevereWinter ? "rodiu/kaki" : "piersic/cais";
        const shortMessage = `Inghet ${tempRounded}°C ${frostDate} ${frostHourStr} — protejeaza ${shortTarget}`;
        frostAlert = {
          active: true,
          minTemp: Math.round(worstApparent * 10) / 10,
          date: frostDate,
          frostHour: frostTime,
          message: fullMessage,
          shortMessage,
          severity:
            worstApparent < -5
              ? "critical"
              : worstApparent < 0
                ? "warning"
                : "info",
          band: bandLabel,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // F3.2 — Alert multi-noapte consecutive (apparent_temperature_min zilnic)
    let consecutiveFrostMsg = "";
    if (data.daily?.apparent_temperature_min) {
      const frostNights = [];
      const frostNightTemps = [];
      const dailyDates = data.daily.time || [];
      const dailyApparent = data.daily.apparent_temperature_min;
      dailyDates.forEach(function (date, i) {
        if (date < today) return; // skip zile trecute
        const t = dailyApparent[i];
        if (t != null && t < frostThresholdDynamic) {
          frostNights.push(date);
          frostNightTemps.push(t);
        }
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
          // Fix: Math.min din temperaturile REALE ale noptilor cu frost
          // (inainte mapam index local in array daily, producand cifre eronate).
          const minTempMulti =
            frostNightTemps.length > 0 ? Math.min(...frostNightTemps) : 99;
          frostAlert = {
            active: true,
            minTemp: Math.round(minTempMulti * 10) / 10,
            date: frostNights[0],
            message:
              consecutiveFrostMsg +
              `. Protejeaza pomii sensibili (${speciesHint})!`,
            shortMessage: `${frostNights.length} nopti frost ${frostNights[0]}→${frostNights[frostNights.length - 1]} — protejeaza pomii`,
            severity:
              minTempMulti < -5
                ? "critical"
                : minTempMulti < 0
                  ? "warning"
                  : "info",
            band: bandLabel,
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
          date: today,
          message: `Risc crescut de boli fungice! Ploaie + ${Math.round(avgT)}°C + umiditate ${Math.round(avgH)}%. Verifica rapanul la mar/par si monilioza la cais/piersic.`,
          shortMessage: `Risc boli fungice — ${Math.round(avgT)}°C, umiditate ${Math.round(avgH)}%`,
          severity: "warning",
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // F8.2: Hail alert — WMO codes 96 (grindina usoara) si 99 (grindina puternica)
    let hailAlert = { active: false, updatedAt: new Date().toISOString() };
    if (data.hourly?.weather_code) {
      const hCodes = data.hourly.weather_code;
      const hTimes = data.hourly.time;
      for (let i = 0; i < hCodes.length; i++) {
        if (new Date(hTimes[i]).getTime() < nowMs) continue;
        if (hCodes[i] === 96 || hCodes[i] === 99) {
          const hailDate = hTimes[i].split("T")[0];
          const hailHourStr = hTimes[i].split("T")[1]?.slice(0, 5) || "";
          const severity = hCodes[i] === 99 ? "puternica" : "usoara";
          hailAlert = {
            active: true,
            severity,
            date: hailDate,
            alertHour: hTimes[i],
            message: `GRINDINA ${severity}! Furtuna cu grindina pe ${hailDate} la ~${hailHourStr}. Protejeaza fructele si pomii tineri!`,
            shortMessage: `Grindina ${severity} ${hailDate} ${hailHourStr} — acopera pomii`,
            updatedAt: new Date().toISOString(),
          };
          break;
        }
      }
    }

    // F8.2: Wind alert — rafale >= 40 km/h (prag scazut pt pomi tineri)
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
      if (maxGust >= 40) {
        const gustDate = gustTime.split("T")[0];
        const gustHourStr = gustTime.split("T")[1]?.slice(0, 5) || "";
        windAlert = {
          active: true,
          maxGust: Math.round(maxGust),
          date: gustDate,
          alertHour: gustTime,
          message: `Rafale puternice: ${Math.round(maxGust)} km/h pe ${gustDate} la ~${gustHourStr}. Verifica pomii tineri si spalierele!`,
          shortMessage: `Vant ${Math.round(maxGust)} km/h ${gustDate} ${gustHourStr} — verifica spalierele`,
          severity: maxGust >= 70 ? "critical" : "warning",
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
            shortMessage: `Canicula ${Math.round(data.daily.temperature_2m_max[i])}°C ${hDate} — iriga devreme/seara`,
            severity:
              data.daily.temperature_2m_max[i] >= 40 ? "critical" : "warning",
            updatedAt: new Date().toISOString(),
          };
          break;
        }
      }
    }

    // Optiunea 3 — Multi-model consensus extins: frost + vant critic (>=70 km/h)
    // + canicula severa (>=38°C). Un singur fetch suplimentar pt toate alertele.
    // windAlert si heatAlert sunt deja declarate mai sus — fara TDZ.
    const runMultiModel =
      frostAlert.active ||
      (windAlert.active && windAlert.maxGust >= 70) ||
      (heatAlert.active && heatAlert.maxTemp >= 38);
    if (runMultiModel) {
      try {
        const mmUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=apparent_temperature&daily=temperature_2m_max,wind_gusts_10m_max&forecast_days=2&timezone=Europe/Bucharest&models=icon_seamless,ecmwf_ifs025,gfs_seamless`;
        const mmCtrl = new AbortController();
        const mmTimer = setTimeout(() => mmCtrl.abort(), 5000);
        const mmRes = await fetch(mmUrl, { signal: mmCtrl.signal });
        clearTimeout(mmTimer);
        if (mmRes.ok) {
          const mmData = await mmRes.json();
          const models = ["icon_seamless", "ecmwf_ifs025", "gfs_seamless"];
          const mmTimes = mmData.hourly?.time || [];

          if (frostAlert.active) {
            let modelsFrost = 0;
            for (const model of models) {
              const temps =
                mmData.hourly?.[`apparent_temperature_${model}`] || [];
              for (let i = 0; i < temps.length; i++) {
                if (new Date(mmTimes[i]).getTime() < nowMs) continue;
                if (temps[i] < frostThresholdDynamic) {
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

          if (windAlert.active && windAlert.maxGust >= 70) {
            let modelsWind = 0;
            for (const model of models) {
              const gusts = mmData.daily?.[`wind_gusts_10m_max_${model}`] || [];
              if (gusts.some((g) => g >= 70)) modelsWind++;
            }
            const windConf =
              modelsWind >= 3
                ? "cert"
                : modelsWind >= 2
                  ? "probabil"
                  : "posibil";
            windAlert.confidence = windConf;
            windAlert.modelsAgree = modelsWind;
            windAlert.message += ` [${windConf.toUpperCase()} — ${modelsWind}/3 modele]`;
          }

          if (heatAlert.active && heatAlert.maxTemp >= 38) {
            let modelsHeat = 0;
            for (const model of models) {
              const maxTemps =
                mmData.daily?.[`temperature_2m_max_${model}`] || [];
              if (maxTemps.some((t) => t >= 38)) modelsHeat++;
            }
            const heatConf =
              modelsHeat >= 3
                ? "cert"
                : modelsHeat >= 2
                  ? "probabil"
                  : "posibil";
            heatAlert.confidence = heatConf;
            heatAlert.modelsAgree = modelsHeat;
            heatAlert.message += ` [${heatConf.toUpperCase()} — ${modelsHeat}/3 modele]`;
          }
        }
      } catch {
        // Multi-model e optional — daca esueaza, alertele raman fara confidence
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
            shortMessage: `Ploaie ${Math.round(data.daily.precipitation_sum[i])} mm ${rDate} — risc eroziune`,
            severity:
              data.daily.precipitation_sum[i] >= 50 ? "critical" : "warning",
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
          shortMessage: `Seceta — ET0 ${Math.round(maxEt0 * 10) / 10} mm/zi, ploaie ${Math.round(totalRain5d)} mm/5z — iriga`,
          severity: "warning",
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // Optiunea 4 — Fereastra optima tratamente (spray window): urmatoarele 48h
    // cu conditii ideale pentru aplicarea pesticidelor/fungicidelor.
    // Criterii: vant <15 km/h, fara ploaie (prob <20%, precip <0.1mm),
    //           temperatura 10-25°C, umiditate <85%. Minim 2h consecutive.
    let sprayWindow = { available: false, updatedAt: new Date().toISOString() };
    if (data.hourly?.wind_speed_10m) {
      const swTimes = data.hourly.time;
      const swN = Math.min(48, swTimes.length);
      let goodHours = [];
      for (let i = 0; i < swN; i++) {
        if (new Date(swTimes[i]).getTime() < nowMs) continue;
        const ok =
          (data.hourly.wind_speed_10m?.[i] ?? 99) < 15 &&
          (data.hourly.temperature_2m?.[i] ?? -99) >= 10 &&
          (data.hourly.temperature_2m?.[i] ?? 99) <= 25 &&
          (data.hourly.relative_humidity_2m?.[i] ?? 99) < 85 &&
          (data.hourly.precipitation_probability?.[i] ?? 100) < 20 &&
          (data.hourly.precipitation?.[i] ?? 1) < 0.1;
        if (ok) {
          goodHours.push(swTimes[i]);
        } else if (goodHours.length >= 2) {
          break;
        } else {
          goodHours = [];
        }
      }
      if (goodHours.length >= 2) {
        const swDate = goodHours[0].split("T")[0];
        const swStart = goodHours[0].split("T")[1]?.slice(0, 5) || "";
        const swEnd =
          goodHours[goodHours.length - 1].split("T")[1]?.slice(0, 5) || "";
        const swDur = goodHours.length;
        sprayWindow = {
          available: true,
          date: swDate,
          startHour: goodHours[0],
          endHour: goodHours[goodHours.length - 1],
          durationH: swDur,
          message: `Fereastra tratamente: ${swDate} ${swStart}–${swEnd} (${swDur}h). Vant slab (<15km/h), fara ploaie, temperatura optima.`,
          shortMessage: `Spray optim ${swDate} ${swStart}–${swEnd} (${swDur}h)`,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // Jurnal alerte — acumuleaza intrari cand o alerta devine activa
    // Deduplicare pe type+date (o singura intrare per tip per zi)
    const journal = (await kv.get("livada:alert-journal")) || [];
    const nowIso = new Date().toISOString();
    const alertsToLog = [
      frostAlert.active && {
        type: "frost",
        label: "Inghet",
        icon: "\u2744\uFE0F",
        date: frostAlert.date,
        hour: frostAlert.frostHour || null,
        message: frostAlert.message,
        shortMessage: frostAlert.shortMessage,
        severity: frostAlert.severity,
      },
      diseaseRisk.active && {
        type: "disease",
        label: "Boli fungice",
        icon: "\u26A0\uFE0F",
        date: diseaseRisk.date,
        hour: null,
        message: diseaseRisk.message,
        shortMessage: diseaseRisk.shortMessage,
        severity: diseaseRisk.severity,
      },
      hailAlert.active && {
        type: "hail",
        label: "Grindina",
        icon: "\uD83C\uDF2A",
        date: hailAlert.date,
        hour: hailAlert.alertHour || null,
        message: hailAlert.message,
        shortMessage: hailAlert.shortMessage,
        severity: hailAlert.severity,
      },
      windAlert.active && {
        type: "wind",
        label: "Vant",
        icon: "\uD83D\uDCA8",
        date: windAlert.date,
        hour: windAlert.alertHour || null,
        message: windAlert.message,
        shortMessage: windAlert.shortMessage,
        severity: windAlert.severity,
      },
      heatAlert.active && {
        type: "heat",
        label: "Canicula",
        icon: "\uD83C\uDF21\uFE0F",
        date: heatAlert.date,
        hour: null,
        message: heatAlert.message,
        shortMessage: heatAlert.shortMessage,
        severity: heatAlert.severity,
      },
      rainAlert.active && {
        type: "rain",
        label: "Ploaie",
        icon: "\uD83C\uDF27\uFE0F",
        date: rainAlert.date,
        hour: null,
        message: rainAlert.message,
        shortMessage: rainAlert.shortMessage,
        severity: rainAlert.severity,
      },
      droughtAlert.active && {
        type: "drought",
        label: "Seceta",
        icon: "\u2600\uFE0F",
        date: droughtAlert.date,
        hour: null,
        message: droughtAlert.message,
        shortMessage: droughtAlert.shortMessage,
        severity: droughtAlert.severity,
      },
    ].filter(Boolean);
    for (const entry of alertsToLog) {
      const dedupKey = entry.type + ":" + entry.date;
      if (!journal.some((j) => j.key === dedupKey)) {
        journal.push({
          key: dedupKey,
          type: entry.type,
          label: entry.label,
          icon: entry.icon,
          date: entry.date,
          hour: entry.hour,
          message: entry.message,
          shortMessage: entry.shortMessage,
          severity: entry.severity,
          loggedAt: nowIso,
        });
      }
    }
    // Pastreaza ultimele 50 intrari (rolling window ~2 luni)
    if (journal.length > 50) journal.splice(0, journal.length - 50);

    // Prepare all Redis writes for batching
    const redisWrites = [
      kv.set("livada:meteo:history", history),
      kv.set("livada:frost-alert", frostAlert),
      kv.set("livada:disease-risk", diseaseRisk),
      kv.set("livada:alert-hail", hailAlert),
      kv.set("livada:alert-wind", windAlert),
      kv.set("livada:alert-heat", heatAlert),
      kv.set("livada:alert-rain", rainAlert),
      kv.set("livada:alert-drought", droughtAlert),
      kv.set("livada:alert-spray", sprayWindow),
      kv.set("livada:alert-journal", journal),
    ];

    // Yr.no (divergenta) + NASA POWER GDD — in paralel (ambele best-effort)
    const [yrnoMin, gddData] = await Promise.all([
      fetchYrnoMin(),
      fetchAndAccumulateGdd(kv),
    ]);
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
      kv.set("livada:gdd:annual", gddData),
      kv.set("livada:cron:last-run", {
        date: today,
        success: true,
        temp: data.current.temperature_2m,
        timestamp: Date.now(),
      }),
    );

    // Batch all Redis operations cu timeout global (hardening 2026-04-23):
    // daca Upstash incetineste > 10s, abandonam batch-ul si semnalam eroare
    // clara in loc sa prindem 500-uri generice dupa Edge timeout.
    await Promise.race([
      Promise.all(redisWrites),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Redis batch timeout (>10s)")), 10000),
      ),
    ]);

    // Audit #1 — Web Push broadcast (fire-and-forget pentru alerte active).
    // Daca oricare dintre alerte devine activa si nu a mai trimis azi,
    // declansam broadcast la toti subscriberii. Endpoint separat (Node.js)
    // pt compatibilitate cu `web-push` library care are nevoie de Node crypto.
    try {
      const activeAlerts = [
        frostAlert.active && frostAlert,
        diseaseRisk.active && diseaseRisk,
        hailAlert.active && hailAlert,
        windAlert.active && windAlert,
        heatAlert.active && heatAlert,
        rainAlert.active && rainAlert,
        droughtAlert.active && droughtAlert,
      ].filter(Boolean);
      if (activeAlerts.length > 0) {
        const origin = req.headers?.get?.("host")
          ? `https://${req.headers.get("host")}`
          : "https://livada-mea-psi.vercel.app";
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        await fetch(`${origin}/api/push-broadcast`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({
            alerts: activeAlerts.map((a) => ({
              type:
                alertsToLog.find((e) => e.message === a.message)?.type ||
                "alert",
              title:
                alertsToLog.find((e) => e.message === a.message)?.label ||
                "Livada",
              body: a.shortMessage || a.message,
              severity: a.severity || "info",
              date: a.date,
            })),
          }),
          signal: ctrl.signal,
        }).catch(() => {});
        clearTimeout(timer);
      }
    } catch {
      // Push broadcast best-effort — nu blocheaza success-ul cronului
    }

    return Response.json({
      success: true,
      date: today,
      temp: data.current.temperature_2m,
      frostAlert: frostAlert.active,
      frostConfidence: frostAlert.confidence || null,
      frostConsecutive: !!consecutiveFrostMsg,
      diseaseRisk: diseaseRisk.active,
      hailAlert: hailAlert.active,
      windAlert: windAlert.active,
      windConfidence: windAlert.confidence || null,
      heatAlert: heatAlert.active,
      heatConfidence: heatAlert.confidence || null,
      rainAlert: rainAlert.active,
      droughtAlert: droughtAlert.active,
      sprayWindow: sprayWindow.available,
      sprayDate: sprayWindow.date || null,
      gddCumulative: gddData.cumulative,
      gddLastDate: gddData.lastDate,
      yrnoMin,
    });
  } catch (err) {
    // Hardening 2026-04-23: log detaliat pentru debugging intermitent 500.
    const errInfo = {
      success: false,
      error: err?.message || String(err),
      errorName: err?.name || "unknown",
      timestamp: Date.now(),
    };
    try {
      await Promise.race([
        kv.set("livada:cron:last-run", errInfo),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("redis timeout on error path")), 2000),
        ),
      ]);
    } catch {}
    console.error(
      "meteo-cron error:",
      errInfo.errorName,
      errInfo.error,
      err?.stack || "",
    );
    return Response.json(
      {
        error: "Eroare interna server",
        detail: errInfo.error,
        name: errInfo.errorName,
      },
      { status: 500 },
    );
  }
}
