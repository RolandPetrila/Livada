import { Redis } from '@upstash/redis';


const KEY = 'livada:journal';

function getKV() {
  return Redis.fromEnv();
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const kv = getKV();

    if (req.method === 'GET') {
      const entries = (await kv.get(KEY)) || [];
      return Response.json(entries, { headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const stored = (await kv.get(KEY)) || [];
      const incoming = Array.isArray(body) ? body : [body];

      const map = new Map();
      for (const e of stored) map.set(e.id, e);
      for (const e of incoming) map.set(e.id, e);
      const merged = [...map.values()].sort((a, b) => b.id - a.id);

      await kv.set(KEY, merged);
      return Response.json({ ok: true, count: merged.length }, { headers: corsHeaders });
    }

    if (req.method === 'DELETE') {
      const { id } = await req.json();
      const stored = (await kv.get(KEY)) || [];
      const filtered = stored.filter(e => e.id !== id);
      await kv.set(KEY, filtered);
      return Response.json({ ok: true, count: filtered.length }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Metoda nepermisa' }, { status: 405, headers: corsHeaders });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes('UPSTASH') || msg.includes('Missing') || msg.includes('ERR')) {
      return Response.json(
        { error: 'Vercel KV nu este configurat. Provisoneaza un KV store din Vercel Dashboard → Storage.' },
        { status: 503, headers: corsHeaders }
      );
    }
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
}
