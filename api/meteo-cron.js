import { Redis } from '@upstash/redis';

const LAT = 46.17;
const LON = 20.75;

const WMO_CODES = {
  0: 'Cer senin', 1: 'Predominant senin', 2: 'Partial innorat', 3: 'Innorat',
  45: 'Ceata', 48: 'Ceata cu chiciura',
  51: 'Burinta usoara', 53: 'Burinta moderata', 55: 'Burinta densa',
  61: 'Ploaie usoara', 63: 'Ploaie moderata', 65: 'Ploaie puternica',
  66: 'Ploaie inghetata usoara', 67: 'Ploaie inghetata puternica',
  71: 'Ninsoare usoara', 73: 'Ninsoare moderata', 75: 'Ninsoare puternica',
  77: 'Granule de zapada',
  80: 'Averse usoare', 81: 'Averse moderate', 82: 'Averse violente',
  85: 'Ninsoare usoara (averse)', 86: 'Ninsoare puternica (averse)',
  95: 'Furtuna', 96: 'Furtuna cu grindina usoara', 99: 'Furtuna cu grindina puternica',
};

export default async function handler(req) {
  // Verificare CRON_SECRET — previne triggerare manuala neautorizata
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET neconfigurat' }, { status: 500 });
  }
  const auth = req.headers?.get?.('authorization') || req.headers?.['authorization'] || '';
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Neautorizat' }, { status: 401 });
  }

  let kv;
  try { kv = Redis.fromEnv(); } catch (err) {
    return Response.json({ error: 'Redis nu este configurat' }, { status: 503 });
  }

  try {
    // Un singur fetch — Open-Meteo, gratuit, fara API key
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&hourly=temperature_2m,precipitation,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=Europe/Bucharest&forecast_days=5`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('Open-Meteo API error: ' + res.status);
    const data = await res.json();

    // Salveaza in Redis — format identic
    const today = new Date().toISOString().split('T')[0];
    const history = (await kv.get('livada:meteo:history')) || {};
    history[today] = {
      temp: Math.round(data.current.temperature_2m * 10) / 10,
      temp_min: Math.round(data.daily.temperature_2m_min[0] * 10) / 10,
      temp_max: Math.round(data.daily.temperature_2m_max[0] * 10) / 10,
      humidity: data.current.relative_humidity_2m,
      description: WMO_CODES[data.current.weather_code] || 'Necunoscut',
      wind: Math.round(data.current.wind_speed_10m),
      rain: data.current.precipitation || 0,
    };

    const dates = Object.keys(history).sort();
    if (dates.length > 90) {
      for (const d of dates.slice(0, dates.length - 90)) delete history[d];
    }
    await kv.set('livada:meteo:history', history);

    // Frost alert (March–May): itereaza hourly temps
    const month = new Date().getMonth() + 1;
    let frostAlert = { active: false, updatedAt: new Date().toISOString() };

    if (month >= 3 && month <= 5 && data.hourly?.temperature_2m) {
      const temps = data.hourly.temperature_2m;
      const times = data.hourly.time;
      let minTemp = Infinity, frostTime = '';
      for (let i = 0; i < temps.length; i++) {
        if (temps[i] < 0 && temps[i] < minTemp) {
          minTemp = temps[i];
          frostTime = times[i];
        }
      }
      if (minTemp < 0) {
        const frostDate = frostTime.split('T')[0];
        frostAlert = {
          active: true,
          minTemp: Math.round(minTemp * 10) / 10,
          date: frostDate,
          message: `Inghet prognozat: ${Math.round(minTemp)}°C pe ${frostDate}. Protejeaza pomii sensibili (piersic, cais, migdal, rodiu)!`,
          updatedAt: new Date().toISOString(),
        };
      }
    }
    await kv.set('livada:frost-alert', frostAlert);

    // Disease risk (next 48h): rain + warm + humid = fungal
    let diseaseRisk = { active: false, updatedAt: new Date().toISOString() };
    if (data.hourly?.temperature_2m) {
      const n = Math.min(48, data.hourly.temperature_2m.length);
      let rainyH = 0, sumT = 0, sumH = 0;
      for (let i = 0; i < n; i++) {
        sumT += data.hourly.temperature_2m[i];
        sumH += data.hourly.relative_humidity_2m[i];
        if (data.hourly.precipitation[i] > 0) rainyH++;
      }
      const avgT = sumT / n, avgH = sumH / n;
      if (rainyH >= 4 && avgT >= 10 && avgT <= 25 && avgH > 70) {
        diseaseRisk = {
          active: true,
          message: `Risc crescut de boli fungice! Ploaie + ${Math.round(avgT)}°C + umiditate ${Math.round(avgH)}%. Verifica rapanul la mar/par si monilioza la cais/piersic.`,
          updatedAt: new Date().toISOString(),
        };
      }
    }
    await kv.set('livada:disease-risk', diseaseRisk);

    await kv.set('livada:cron:last-run', {
      date: today, success: true, temp: data.current.temperature_2m, timestamp: Date.now(),
    });

    return Response.json({
      success: true, date: today, temp: data.current.temperature_2m,
      frostAlert: frostAlert.active, diseaseRisk: diseaseRisk.active,
    });
  } catch (err) {
    try { await kv.set('livada:cron:last-run', { success: false, error: err.message, timestamp: Date.now() }); } catch {}
    console.error('meteo-cron error:', err);
    return Response.json({ error: 'Eroare interna server' }, { status: 500 });
  }
}
