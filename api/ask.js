import { corsHeaders, handleOptions, checkAuth, rateLimit } from './_auth.js';

export const config = { maxDuration: 60 };

export default async function handler(req) {
  console.log('[ask] v_minimal start', req.method);

  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') {
    return Response.json({ error: 'Metoda nepermisa' }, { status: 405, headers: corsHeaders(req) });
  }

  console.log('[ask] before checkAuth');
  try {
    const authErr = checkAuth(req);
    console.log('[ask] after checkAuth, result:', authErr);
    if (authErr) return authErr;
  } catch(e) {
    console.error('[ask] checkAuth threw:', e?.message);
    return Response.json({ error: 'auth error' }, { status: 500 });
  }

  console.log('[ask] before rateLimit');
  try {
    const limitErr = rateLimit(req);
    console.log('[ask] after rateLimit, result:', limitErr);
    if (limitErr) return limitErr;
  } catch(e) {
    console.error('[ask] rateLimit threw:', e?.message);
    return Response.json({ error: 'rateLimit error' }, { status: 500 });
  }

  console.log('[ask] before env check');
  const API_KEY = process.env.GROQ_API_KEY;
  console.log('[ask] apiKey exists:', !!API_KEY);

  // MINIMAL TEST — return immediately without calling Groq
  return Response.json({ answer: '[TEST] Functia ask raspunde corect. Groq dezactivat temporar pentru diagnosticare.' }, { headers: corsHeaders(req) });
}
