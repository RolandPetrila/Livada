import { Redis } from '@upstash/redis';
import { corsHeaders, handleOptions, checkAuth, rateLimit } from './_auth.js';

const KEY = 'livada:journal';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const authErr = checkAuth(req);
  if (authErr) return authErr;
  const limitErr = rateLimit(req);
  if (limitErr) return limitErr;

  const hdrs = corsHeaders(req);

  try {
    const kv = Redis.fromEnv();

    if (req.method === 'GET') {
      const entries = (await kv.get(KEY)) || [];
      return Response.json(entries, { headers: hdrs });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const stored = (await kv.get(KEY)) || [];
      const incoming = Array.isArray(body) ? body : [body];

      const map = new Map();
      for (const e of stored) map.set(e.id, e);
      for (const e of incoming) {
        if (typeof e.id !== 'number' || !e.date || !e.type) continue;
        map.set(e.id, {
          id: e.id,
          date: String(e.date).substring(0, 10),
          type: String(e.type).substring(0, 50),
          note: String(e.note || '').substring(0, 500),
          timestamp: Number(e.timestamp || Date.now()),
        });
      }
      const merged = [...map.values()].sort((a, b) => b.id - a.id);

      await kv.set(KEY, merged);
      return Response.json({ ok: true, count: merged.length }, { headers: hdrs });
    }

    if (req.method === 'DELETE') {
      let body;
      try { body = await req.json(); } catch {
        return Response.json({ error: 'Body invalid' }, { status: 400, headers: hdrs });
      }
      const id = Number(body.id);
      if (!Number.isFinite(id)) {
        return Response.json({ error: 'ID invalid' }, { status: 400, headers: hdrs });
      }
      const stored = (await kv.get(KEY)) || [];
      const filtered = stored.filter(e => e.id !== id);
      await kv.set(KEY, filtered);
      return Response.json({ ok: true, count: filtered.length }, { headers: hdrs });
    }

    return Response.json({ error: 'Metoda nepermisa' }, { status: 405, headers: hdrs });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes('UPSTASH') || msg.includes('Missing') || msg.includes('ERR')) {
      return Response.json(
        { error: 'Vercel KV nu este configurat. Provisioneaza un KV store din Vercel Dashboard → Storage.' },
        { status: 503, headers: hdrs }
      );
    }
    console.error('API journal error:', msg);
    return Response.json({ error: 'Eroare la procesare. Incercati din nou.' }, { status: 500, headers: hdrs });
  }
}
