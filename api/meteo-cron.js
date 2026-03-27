import { Redis } from '@upstash/redis';

// Nadlac coordinates
const LAT = 46.17;
const LON = 20.75;

export default async function handler(req) {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  if (!API_KEY) {
    return Response.json({ error: 'OPENWEATHER_API_KEY lipsa' }, { status: 500 });
  }

  let kv;
  try {
    kv = Redis.fromEnv();
  } catch (err) {
    return Response.json({ error: 'Upstash Redis nu este configurat: ' + err.message }, { status: 503 });
  }

  try {
    // 1) Fetch current weather
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&lang=ro&appid=${API_KEY}`
    );
    if (!weatherRes.ok) throw new Error('OpenWeather API error: ' + weatherRes.status);
    const weather = await weatherRes.json();

    // 2) Fetch 5-day / 3-hour forecast (free tier)
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=metric&lang=ro&appid=${API_KEY}`
    );
    const forecast = forecastRes.ok ? await forecastRes.json() : null;

    // 3) Save today's weather to history
    const today = new Date().toISOString().split('T')[0];
    const history = (await kv.get('livada:meteo:history')) || {};
    history[today] = {
      temp: Math.round(weather.main.temp * 10) / 10,
      temp_min: Math.round(weather.main.temp_min * 10) / 10,
      temp_max: Math.round(weather.main.temp_max * 10) / 10,
      humidity: weather.main.humidity,
      description: weather.weather[0].description,
      icon: weather.weather[0].icon,
      wind: Math.round(weather.wind.speed * 3.6),
      rain: weather.rain?.['1h'] || 0,
    };

    // Keep last 90 days
    const dates = Object.keys(history).sort();
    if (dates.length > 90) {
      for (const d of dates.slice(0, dates.length - 90)) delete history[d];
    }
    await kv.set('livada:meteo:history', history);

    // 4) Frost alert detection (March–May)
    const month = new Date().getMonth() + 1;
    let frostAlert = { active: false, updatedAt: new Date().toISOString() };

    if (month >= 3 && month <= 5 && forecast?.list) {
      const frostEntries = forecast.list.filter(f => f.main.temp < 0);
      if (frostEntries.length > 0) {
        const minTemp = Math.min(...frostEntries.map(f => f.main.temp));
        const frostDate = frostEntries[0].dt_txt;
        frostAlert = {
          active: true,
          minTemp: Math.round(minTemp * 10) / 10,
          date: frostDate,
          message: `Inghet prognozat: ${Math.round(minTemp)}°C pe ${frostDate.split(' ')[0]}. Protejeaza pomii sensibili (piersic, cais, migdal, rodiu)!`,
          updatedAt: new Date().toISOString(),
        };
      }
    }
    await kv.set('livada:frost-alert', frostAlert);

    // 5) Disease risk detection (rain + warm = fungal risk)
    let diseaseRisk = { active: false, updatedAt: new Date().toISOString() };
    if (forecast?.list) {
      const next48h = forecast.list.slice(0, 16);
      const rainyHours = next48h.filter(f => f.rain?.['3h'] > 0 || f.weather[0].main === 'Rain');
      const avgTemp = next48h.reduce((s, f) => s + f.main.temp, 0) / next48h.length;
      const avgHumidity = next48h.reduce((s, f) => s + f.main.humidity, 0) / next48h.length;

      if (rainyHours.length >= 4 && avgTemp >= 10 && avgTemp <= 25 && avgHumidity > 70) {
        diseaseRisk = {
          active: true,
          message: `Risc crescut de boli fungice! Ploaie + ${Math.round(avgTemp)}°C + umiditate ${Math.round(avgHumidity)}%. Verifica rapanul la mar/par si monilioza la cais/piersic.`,
          updatedAt: new Date().toISOString(),
        };
      }
    }
    await kv.set('livada:disease-risk', diseaseRisk);

    // 6) Save cron run status (IMP-11: monitoring)
    await kv.set('livada:cron:last-run', {
      date: today,
      success: true,
      temp: weather.main.temp,
      timestamp: Date.now(),
    });

    return Response.json({
      success: true,
      date: today,
      temp: weather.main.temp,
      frostAlert: frostAlert.active,
      diseaseRisk: diseaseRisk.active,
    });
  } catch (err) {
    // Save failure status
    try { await kv.set('livada:cron:last-run', { success: false, error: err.message, timestamp: Date.now() }); } catch {}
    return Response.json({ error: err.message }, { status: 500 });
  }
}
