import { Redis } from '@upstash/redis';
import { corsHeaders, handleOptions } from './_auth.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  try {
    const kv = Redis.fromEnv();
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30', 10);

    const history = (await kv.get('livada:meteo:history')) || {};

    // Filter to requested number of days
    const dates = Object.keys(history).sort().slice(-days);
    const filtered = {};
    for (const d of dates) filtered[d] = history[d];

    return Response.json(filtered, { headers: corsHeaders(req) });
  } catch (err) {
    if (err.message?.includes('UPSTASH') || err.message?.includes('Missing')) {
      return Response.json({ error: 'KV nu este configurat' }, { status: 503, headers: corsHeaders(req) });
    }
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders(req) });
  }
}
