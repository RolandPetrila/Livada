import { corsHeaders, handleOptions, checkOrigin, rateLimit } from './_auth.js';

export const config = { runtime: 'edge' };

const AI_PROMPT = `Esti botanist si agronom expert. Analizeaza fotografia si identifica planta.

Raspunde STRUCTURAT in romana:

**SPECIE IDENTIFICATA:**
- Denumire stiintifica (italic)
- Denumire comuna in romana
- Familia botanica

**DESCRIERE:**
- 2-3 propozitii despre caracteristicile vizibile in poza

**RELEVANTA AGRICOLA:**
- Este cultivata in Romania / zona Arad-Nadlac?
- Valoare: ornamentala / comestibila / medicinala / daunator?

**OBSERVATII PENTRU POMICULTOR:**
- Ce trebuie sa stie un pomicultor despre aceasta planta
- Eventuale riscuri (invaziva, toxica, daunator etc.)

Daca nu poti identifica cu certitudine, spune ce grupuri/familii sunt posibile.`;

// ── Helper Gemini vision ──────────────────────────────────────────────────────
async function callGemini(apiKey, base64, mimeType, timeoutMs) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: AI_PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(tid);
    return res;
  } catch (err) { clearTimeout(tid); throw err; }
}

// ── Helper OpenAI-compatible vision ──────────────────────────────────────────
async function callOpenAIVision(endpoint, apiKey, model, base64, mimeType, timeoutMs) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: AI_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        }],
        max_tokens: 1024,
        temperature: 0.2,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    return res;
  } catch (err) { clearTimeout(tid); throw err; }
}

// ── Fallback AI chain ─────────────────────────────────────────────────────────
async function tryAiFallbacks(base64, mimeType, log) {
  // Gemini key2
  const KEY2 = process.env.GOOGLE_AI_API_KEY_2;
  if (KEY2) {
    try {
      const res = await callGemini(KEY2, base64, mimeType, 14000);
      log(`gemini key2 → ${res.status}`);
      if (res.ok) {
        const j = await res.json();
        const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text, model: 'gemini-2.5-flash (key2)' };
      }
    } catch (e) { log(`gemini key2 err: ${e.name}`); }
  }

  // GPT-4o via GitHub Models
  const GH = process.env.GITHUB_MODELS_TOKEN;
  if (GH) {
    try {
      const res = await callOpenAIVision('https://models.inference.ai.azure.com/chat/completions', GH, 'gpt-4o', base64, mimeType, 18000);
      log(`gpt-4o → ${res.status}`);
      if (res.ok) {
        const j = await res.json();
        const text = j?.choices?.[0]?.message?.content;
        if (text) return { text, model: 'gpt-4o (github)' };
      }
    } catch (e) { log(`gpt-4o err: ${e.name}`); }
  }

  // Pixtral-12B via Mistral
  const MISTRAL = process.env.MISTRAL_API_KEY;
  if (MISTRAL) {
    try {
      const res = await callOpenAIVision('https://api.mistral.ai/v1/chat/completions', MISTRAL, 'pixtral-12b-2409', base64, mimeType, 18000);
      log(`pixtral → ${res.status}`);
      if (res.ok) {
        const j = await res.json();
        const text = j?.choices?.[0]?.message?.content;
        if (text) return { text, model: 'pixtral-12b (mistral)' };
      }
    } catch (e) { log(`pixtral err: ${e.name}`); }
  }

  // Grok vision
  const XAI = process.env.XAI_API_KEY;
  if (XAI) {
    try {
      const res = await callOpenAIVision('https://api.x.ai/v1/chat/completions', XAI, 'grok-2-vision-1212', base64, mimeType, 14000);
      log(`grok → ${res.status}`);
      if (res.ok) {
        const j = await res.json();
        const text = j?.choices?.[0]?.message?.content;
        if (text) return { text, model: 'grok-2-vision-1212' };
      }
    } catch (e) { log(`grok err: ${e.name}`); }
  }

  return null;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  if (req.method !== 'POST') {
    return Response.json({ error: 'Metoda nepermisa' }, { status: 405, headers: corsHeaders(req) });
  }

  const limitErr = rateLimit(req);
  if (limitErr) return limitErr;

  const t0 = Date.now();
  const log = (msg) => console.log(`[identify] ${msg} t+${Date.now()-t0}ms`);

  let base64, mimeType, organ;
  try {
    const body = await req.json();
    base64   = body.base64;
    mimeType = body.mimeType || 'image/jpeg';
    organ    = body.organ || 'auto';
    if (!base64 || typeof base64 !== 'string') {
      return Response.json({ error: 'Lipseste imaginea (base64).' }, { status: 400, headers: corsHeaders(req) });
    }
    if (base64.length > 5 * 1024 * 1024) {
      return Response.json({ error: 'Imaginea prea mare. Max ~3MB.' }, { status: 400, headers: corsHeaders(req) });
    }
  } catch {
    return Response.json({ error: 'Eroare citire date.' }, { status: 400, headers: corsHeaders(req) });
  }

  // ── Construieste FormData pentru Pl@ntNet ─────────────────────────────────
  let formData;
  try {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    formData = new FormData();
    formData.append('images', blob, 'plant.jpg');
    formData.append('organs', organ);
  } catch (e) {
    console.error('[identify] blob err:', e.message);
    return Response.json({ error: 'Eroare procesare imagine.' }, { status: 400, headers: corsHeaders(req) });
  }

  // ── Pl@ntNet + Gemini IN PARALEL ─────────────────────────────────────────
  const PLANTNET_KEY = process.env.PLANTNET_API_KEY;
  const GEMINI_KEY1  = process.env.GOOGLE_AI_API_KEY;

  const [plantnetSettled, geminiSettled] = await Promise.allSettled([
    // Pl@ntNet — identificare specie specializata
    PLANTNET_KEY
      ? fetch(
          `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_KEY}&lang=ro&nb-results=5&include-related-images=false`,
          { method: 'POST', body: formData, signal: AbortSignal.timeout(15000) }
        )
      : Promise.reject(new Error('no plantnet key')),

    // Gemini 2.5-flash — identificare AI cu descriere in romana
    GEMINI_KEY1
      ? callGemini(GEMINI_KEY1, base64, mimeType, 18000)
      : Promise.reject(new Error('no gemini key')),
  ]);

  // ── Extrage rezultate Pl@ntNet ────────────────────────────────────────────
  let plantnetResults = [];
  if (plantnetSettled.status === 'fulfilled' && plantnetSettled.value.ok) {
    try {
      const data = await plantnetSettled.value.json();
      plantnetResults = (data.results || []).slice(0, 3).map(r => ({
        scientificName: r.species?.scientificNameWithoutAuthor || '',
        commonNames:    (r.species?.commonNames || []).slice(0, 2),
        family:         r.species?.family?.scientificNameWithoutAuthor || '',
        score:          Math.round((r.score || 0) * 100),
      }));
      log(`plantnet ok — ${plantnetResults.length} rezultate`);
    } catch { log('plantnet parse err'); }
  } else {
    log(`plantnet skip: ${plantnetSettled.reason?.message || plantnetSettled.value?.status}`);
  }

  // ── Extrage rezultate Gemini ──────────────────────────────────────────────
  let aiResult = null;
  if (geminiSettled.status === 'fulfilled' && geminiSettled.value.ok) {
    try {
      const j = await geminiSettled.value.json();
      const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) { aiResult = { text, model: 'gemini-2.5-flash' }; log('gemini ok'); }
    } catch { log('gemini parse err'); }
  } else {
    log(`gemini key1 skip: ${geminiSettled.reason?.name || geminiSettled.value?.status}`);
  }

  // ── Daca Gemini a picat, incearca fallback-uri AI ─────────────────────────
  if (!aiResult) {
    log('gemini failed — try AI fallbacks');
    aiResult = await tryAiFallbacks(base64, mimeType, log);
  }

  // ── Daca nici Pl@ntNet nici AI nu au raspuns — eroare ────────────────────
  if (!plantnetResults.length && !aiResult) {
    return Response.json(
      { error: 'Identificarea a esuat. Incearca o poza mai clara, cu planta in prim-plan.' },
      { status: 503, headers: corsHeaders(req) }
    );
  }

  log(`done — plantnet:${plantnetResults.length} ai:${aiResult ? aiResult.model : 'none'}`);
  return Response.json(
    { results: plantnetResults, ai: aiResult },
    { headers: corsHeaders(req) }
  );
}
