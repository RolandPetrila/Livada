import { corsHeaders, handleOptions, checkAuth, rateLimit } from './_auth.js';

export const runtime = 'edge';
export const config = { maxDuration: 30 };

// btoa-safe base64 via TextDecoder — fara uint8ToBase64 care poate da TypeError pe Edge
function toBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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

  let formData;
  try {
    formData = await req.formData();
  } catch (e) {
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

  let base64, mimeType;
  try {
    const buf = await file.arrayBuffer();
    base64 = toBase64(new Uint8Array(buf));
    mimeType = (file.type && file.type.startsWith('image/')) ? file.type : 'image/jpeg';
  } catch (e) {
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

  // Promise.race — acelasi pattern ca ask.js (functioneaza pe Edge Runtime)
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
  } catch (err) {
    if (err.message === 'GEMINI_TIMEOUT') {
      return Response.json({ error: 'Analiza AI a durat prea mult. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
    }
    return Response.json({ error: 'Eroare conexiune AI. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
  }

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text().catch(() => '');
    console.error(`Gemini error: ${geminiRes.status} — ${errBody.substring(0, 200)}`);
    return Response.json({ error: `AI indisponibil (${geminiRes.status}). Incearca din nou.` }, { status: 503, headers: corsHeaders(req) });
  }

  try {
    const result = await geminiRes.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Nu am putut analiza imaginea. Incearca cu o poza mai clara.';
    return Response.json({ diagnosis: text }, { headers: corsHeaders(req) });
  } catch (err) {
    console.error('Gemini parse error:', err);
    return Response.json({ error: 'Eroare procesare raspuns AI.' }, { status: 500, headers: corsHeaders(req) });
  }
}
