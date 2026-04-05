import { corsHeaders, handleOptions, checkAuth, rateLimit, checkOrigin } from './_auth.js';

export const runtime = 'edge';
export const config = { maxDuration: 30 };

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

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

  // Accepta JSON cu base64 (trimis direct din browser — fara overhead multipart)
  let base64, mimeType, species;
  try {
    const body = await req.json();
    base64   = body.base64;
    mimeType = body.mimeType || 'image/jpeg';
    species  = (body.species || 'necunoscut').replace(/[^a-zA-Z0-9\s_-]/g, '').substring(0, 100);
    if (!base64 || typeof base64 !== 'string') {
      return Response.json({ error: 'Lipseste imaginea (base64).' }, { status: 400, headers: corsHeaders(req) });
    }
    if (base64.length > 5 * 1024 * 1024) { // ~3.75MB imagine originala
      return Response.json({ error: 'Imaginea este prea mare. Comprima mai mult.' }, { status: 400, headers: corsHeaders(req) });
    }
  } catch (e) {
    console.error('[diagnose] json parse error:', e.message);
    return Response.json({ error: 'Eroare citire date. Incearca din nou.' }, { status: 400, headers: corsHeaders(req) });
  }

  console.log(`[diagnose] start — base64 ${base64.length}chars, ${species}, t+${Date.now()-t0}ms`);

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

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 22000)
  );

  let geminiRes;
  try {
    geminiRes = await Promise.race([fetchPromise, timeoutPromise]);
    console.log(`[diagnose] gemini ${geminiRes.status} t+${Date.now()-t0}ms`);
  } catch (err) {
    console.error(`[diagnose] fetch err: ${err.message} t+${Date.now()-t0}ms`);
    if (err.message === 'GEMINI_TIMEOUT') {
      return Response.json({ error: 'Analiza AI a durat prea mult. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
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
