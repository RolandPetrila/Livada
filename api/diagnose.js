import { corsHeaders, handleOptions, checkAuth, rateLimit, checkOrigin } from './_auth.js';

export const config = { runtime: 'edge' };

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

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 22000);

  let geminiRes;
  try {
    geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(timer);
    console.log(`[diagnose] gemini ${geminiRes.status} t+${Date.now()-t0}ms`);
  } catch (err) {
    clearTimeout(timer);
    console.error(`[diagnose] fetch err: ${err.name} ${err.message} t+${Date.now()-t0}ms`);
    if (err.name === 'AbortError') {
      return Response.json({ error: 'Analiza AI a durat prea mult. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
    }
    return Response.json({ error: 'Eroare conexiune AI. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
  }

  // Fallback la gemini-2.5-flash-lite daca modelul primar esueaza
  let usedFallback = false;
  if (!geminiRes.ok) {
    const primaryStatus = geminiRes.status;
    console.error(`[diagnose] primary ${primaryStatus}, try fallback gemini-2.5-flash-lite t+${Date.now()-t0}ms`);
    const ctrl2 = new AbortController();
    const timer2 = setTimeout(() => ctrl2.abort(), 15000);
    try {
      geminiRes = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
          }),
          signal: ctrl2.signal,
        }
      );
      clearTimeout(timer2);
      console.log(`[diagnose] fallback ${geminiRes.status} t+${Date.now()-t0}ms`);
      usedFallback = true;
    } catch (fallbackErr) {
      clearTimeout(timer2);
      console.error(`[diagnose] fallback err: ${fallbackErr.message}`);
      return Response.json({ error: `AI indisponibil (${primaryStatus}). Incearca din nou.` }, { status: 503, headers: corsHeaders(req) });
    }
    if (!geminiRes.ok) {
      const errBody = await geminiRes.text().catch(() => '');
      console.error(`[diagnose] fallback failed ${geminiRes.status}: ${errBody.substring(0, 200)}`);
      return Response.json({ error: `AI indisponibil (${geminiRes.status}). Incearca din nou.` }, { status: 503, headers: corsHeaders(req) });
    }
  }

  try {
    const result = await geminiRes.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Nu am putut analiza imaginea. Incearca cu o poza mai clara.';
    console.log(`[diagnose] done${usedFallback ? ' (fallback)' : ''} t+${Date.now()-t0}ms`);
    return Response.json(
      { diagnosis: text, ...(usedFallback ? { _fallback: true, _fallbackModel: 'gemini-2.5-flash-lite' } : {}) },
      { headers: corsHeaders(req) }
    );
  } catch (err) {
    console.error('[diagnose] parse error:', err.message);
    return Response.json({ error: 'Eroare procesare raspuns AI.' }, { status: 500, headers: corsHeaders(req) });
  }
}
