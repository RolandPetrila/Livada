import { Redis } from '@upstash/redis';
import { corsHeaders, handleOptions, rateLimit } from './_auth.js';

const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), ms)),
]);

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  const rlErr = rateLimit(req);
  if (rlErr) return rlErr;

  try {
    const kv = Redis.fromEnv();
    const url = new URL(req.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 365);

    const history = await withTimeout(kv.get('livada:meteo:history'), 5000).catch(() => null) || {};

    // Filter to requested number of days
    const dates = Object.keys(history).sort().slice(-days);
    const filtered = {};
    for (const d of dates) filtered[d] = history[d];

    return Response.json(filtered, { headers: { ...corsHeaders(req), 'Cache-Control': 'public, max-age=1800' } });
  } catch (err) {
    if (err.message?.includes('UPSTASH') || err.message?.includes('Missing')) {
      return Response.json({ error: 'KV nu este configurat' }, { status: 503, headers: corsHeaders(req) });
    }
    console.error('meteo-history error:', err);
    return Response.json({ error: 'Eroare interna server' }, { status: 500, headers: corsHeaders(req) });
  }
}
