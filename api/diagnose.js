import { corsHeaders, handleOptions, checkAuth, rateLimit } from './_auth.js';

export const runtime = 'edge';
export const config = { maxDuration: 30 };

// Chunk-based base64 — rapid si sigur pe Edge Runtime (evita call stack limit)
function toBase64(bytes) {
  const CHUNK = 32768;
  const parts = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length))));
  }
  return btoa(parts.join(''));
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') {
    return Response.json({ error: 'Metoda nepermisa' }, { status: 405, headers: corsHeaders(req) });
  }

  const authErr = checkAuth(req);
  if (authErr) return authErr;
  const limitErr = rateLimit(req);
  if (limitErr) return limitErr;

  const API_KEY = process.env.GOOGLE_AI_API_KEY;
  if (!API_KEY) {
    return Response.json({ error: 'GOOGLE_AI_API_KEY lipsa' }, { status: 500, headers: corsHeaders(req) });
  }

  const t0 = Date.now();

  let formData;
  try {
    formData = await req.formData();
  } catch (e) {
    console.error('[diagnose] formData error:', e.message);
    return Response.json({ error: 'Eroare citire imagine. Incearca din nou.' }, { status: 400, headers: corsHeaders(req) });
  }

  const file = formData.get('image');
  const species = (formData.get('species') || 'necunoscut').replace(/[^a-zA-Z0-9\s_-]/g, '').substring(0, 100);

  if (!file || typeof file === 'string') {
    return Response.json({ error: 'Nicio imagine selectata' }, { status: 400, headers: corsHeaders(req) });
  }
  if (file.size > 4 * 1024 * 1024) {
    return Response.json({ error: 'Imaginea depaseste 4MB' }, { status: 400, headers: corsHeaders(req) });
  }

  console.log(`[diagnose] start — ${file.size}B, ${species}, t+${Date.now()-t0}ms`);

  let base64, mimeType;
  try {
    const buf = await file.arrayBuffer();
    console.log(`[diagnose] arrayBuffer done t+${Date.now()-t0}ms`);
    base64 = toBase64(new Uint8Array(buf));
    console.log(`[diagnose] base64 done (${base64.length}chars) t+${Date.now()-t0}ms`);
    mimeType = (file.type && file.type.startsWith('image/')) ? file.type : 'image/jpeg';
  } catch (e) {
    console.error('[diagnose] base64 error:', e.message);
    return Response.json({ error: 'Nu am putut procesa imaginea.' }, { status: 400, headers: corsHeaders(req) });
  }

  const prompt = `Esti expert agronom si fitopatolog specializat in pomicultura din zona Nadlac/Arad, Romania (climat continental, sol predominant cernoziom, pH 7-8).

Analizeaza aceasta fotografie a speciei: ${species}.

Raspunde STRUCTURAT in romana:

**DIAGNOSTIC:**
- Ce boli sau daunatori observi? Descrie simptomele vizibile.
- Daca nu vezi probleme, spune ca planta pare sanatoasa.

**SEVERITATE:** Usoara / Medie / Grava

**TRATAMENT RECOMANDAT:**
- Produse fitosanitare specifice cu doze (concentratie % la 10L apa)
- Alternativa BIO daca exista
- Cand sa se aplice (moment optim)

**PREVENTIE:**
- Ce masuri preventive pentru viitor

**URGENTA:** Cat de repede trebuie actionat (imediat / saptamana aceasta / la urmatorul tratament programat)

Fii concis, practic, cu informatii pe care un pomicultor le poate aplica imediat.`;

  const fetchPromise = fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
      }),
    }
  );

  const timeoutMs = 20000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), timeoutMs)
  );

  let geminiRes;
  try {
    geminiRes = await Promise.race([fetchPromise, timeoutPromise]);
    console.log(`[diagnose] gemini responded ${geminiRes.status} t+${Date.now()-t0}ms`);
  } catch (err) {
    console.error(`[diagnose] fetch error: ${err.message} t+${Date.now()-t0}ms`);
    if (err.message === 'GEMINI_TIMEOUT') {
      return Response.json({ error: `Analiza AI a durat prea mult (${Date.now()-t0}ms). Incearca din nou.` }, { status: 503, headers: corsHeaders(req) });
    }
    return Response.json({ error: 'Eroare conexiune AI. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
  }

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text().catch(() => '');
    console.error(`[diagnose] Gemini ${geminiRes.status}: ${errBody.substring(0, 300)}`);
    return Response.json({ error: `AI indisponibil (${geminiRes.status}). Incearca din nou.` }, { status: 503, headers: corsHeaders(req) });
  }

  try {
    const result = await geminiRes.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Nu am putut analiza imaginea. Incearca cu o poza mai clara.';
    console.log(`[diagnose] done t+${Date.now()-t0}ms`);
    return Response.json({ diagnosis: text }, { headers: corsHeaders(req) });
  } catch (err) {
    console.error('[diagnose] parse error:', err.message);
    return Response.json({ error: 'Eroare procesare raspuns AI.' }, { status: 500, headers: corsHeaders(req) });
  }
}
