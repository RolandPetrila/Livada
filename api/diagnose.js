import { corsHeaders, handleOptions, checkAuth, rateLimit, checkOrigin } from './_auth.js';

export const config = { runtime: 'edge' };

// ── Helper: apel Gemini (inline_data base64) ─────────────────────────────────
async function callGemini(apiKey, model, base64, mimeType, prompt, timeoutMs) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
        }),
        signal: ctrl.signal,
      }
    );
    clearTimeout(tid);
    return res;
  } catch (err) { clearTimeout(tid); throw err; }
}

// ── Helper: apel OpenAI-compatible cu image_url (GitHub/Mistral/xAI) ─────────
async function callOpenAIVision(endpoint, apiKey, model, base64, mimeType, prompt, timeoutMs) {
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
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        }],
        max_tokens: 2048,
        temperature: 0.3,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    return res;
  } catch (err) { clearTimeout(tid); throw err; }
}

// ── Extrage text din raspuns Gemini ──────────────────────────────────────────
function geminiText(json) {
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}
// ── Extrage text din raspuns OpenAI-compatible ────────────────────────────────
function openaiText(json) {
  return json?.choices?.[0]?.message?.content || null;
}

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

  const GEMINI_KEY1 = process.env.GOOGLE_AI_API_KEY;
  if (!GEMINI_KEY1) {
    return Response.json({ error: 'GOOGLE_AI_API_KEY lipsa' }, { status: 500, headers: corsHeaders(req) });
  }

  const t0 = Date.now();

  let base64, mimeType, species;
  try {
    const body = await req.json();
    base64   = body.base64;
    mimeType = body.mimeType || 'image/jpeg';
    species  = (body.species || 'necunoscut').replace(/[^a-zA-Z0-9\s_-]/g, '').substring(0, 100);
    if (!base64 || typeof base64 !== 'string') {
      return Response.json({ error: 'Lipseste imaginea (base64).' }, { status: 400, headers: corsHeaders(req) });
    }
    if (base64.length > 5 * 1024 * 1024) {
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

  // ── Lanț de fallback ─────────────────────────────────────────────────────────
  // 1. Gemini 2.5-flash (cheia 1)
  // 2. Gemini 2.5-flash-lite (cheia 1) — model mai mic
  // 3. Gemini 2.5-flash (cheia 2) — rotatie cheie, evita rate limit
  // 4. GPT-4o via GitHub Models — 50 req/zi gratuit, calitate top
  // 5. Pixtral-12B via Mistral — 1B tokens/luna gratuit
  // 6. Grok-2-vision (xAI) — rezerva finala

  const log = (msg) => console.log(`[diagnose] ${msg} t+${Date.now()-t0}ms`);

  // ── 1. Gemini 2.5-flash cheia 1 ──────────────────────────────────────────────
  let res, text;
  try {
    res = await callGemini(GEMINI_KEY1, 'gemini-2.5-flash', base64, mimeType, prompt, 22000);
    log(`gemini-2.5-flash key1 → ${res.status}`);
    if (res.ok) {
      text = geminiText(await res.json());
      if (text) return Response.json({ diagnosis: text }, { headers: corsHeaders(req) });
    }
  } catch (e) {
    log(`gemini-2.5-flash key1 err: ${e.name}`);
    if (e.name === 'AbortError') {
      return Response.json({ error: 'Analiza AI a durat prea mult. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
    }
  }

  // ── 2. Gemini 2.5-flash-lite cheia 1 ─────────────────────────────────────────
  try {
    res = await callGemini(GEMINI_KEY1, 'gemini-2.5-flash-lite', base64, mimeType, prompt, 15000);
    log(`gemini-2.5-flash-lite key1 → ${res.status}`);
    if (res.ok) {
      text = geminiText(await res.json());
      if (text) return Response.json({ diagnosis: text, _fallback: true, _fallbackModel: 'gemini-2.5-flash-lite' }, { headers: corsHeaders(req) });
    }
  } catch (e) { log(`gemini-flash-lite err: ${e.name}`); }

  // ── 3. Gemini 2.5-flash cheia 2 (rotatie cheie) ───────────────────────────────
  const GEMINI_KEY2 = process.env.GOOGLE_AI_API_KEY_2;
  if (GEMINI_KEY2) {
    try {
      res = await callGemini(GEMINI_KEY2, 'gemini-2.5-flash', base64, mimeType, prompt, 15000);
      log(`gemini-2.5-flash key2 → ${res.status}`);
      if (res.ok) {
        text = geminiText(await res.json());
        if (text) return Response.json({ diagnosis: text, _fallback: true, _fallbackModel: 'gemini-2.5-flash (key2)' }, { headers: corsHeaders(req) });
      }
    } catch (e) { log(`gemini key2 err: ${e.name}`); }
  }

  // ── 4. GPT-4o via GitHub Models (50 req/zi gratuit) ──────────────────────────
  const GITHUB_TOKEN = process.env.GITHUB_MODELS_TOKEN;
  if (GITHUB_TOKEN) {
    try {
      res = await callOpenAIVision(
        'https://models.inference.ai.azure.com/chat/completions',
        GITHUB_TOKEN, 'gpt-4o', base64, mimeType, prompt, 20000
      );
      log(`gpt-4o github → ${res.status}`);
      if (res.ok) {
        text = openaiText(await res.json());
        if (text) return Response.json({ diagnosis: text, _fallback: true, _fallbackModel: 'gpt-4o (github)' }, { headers: corsHeaders(req) });
      }
    } catch (e) { log(`gpt-4o github err: ${e.name}`); }
  }

  // ── 5. Pixtral-12B via Mistral (1B tokens/luna gratuit) ───────────────────────
  const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
  if (MISTRAL_KEY) {
    try {
      res = await callOpenAIVision(
        'https://api.mistral.ai/v1/chat/completions',
        MISTRAL_KEY, 'pixtral-12b-2409', base64, mimeType, prompt, 20000
      );
      log(`pixtral-12b mistral → ${res.status}`);
      if (res.ok) {
        text = openaiText(await res.json());
        if (text) return Response.json({ diagnosis: text, _fallback: true, _fallbackModel: 'pixtral-12b (mistral)' }, { headers: corsHeaders(req) });
      }
    } catch (e) { log(`pixtral err: ${e.name}`); }
  }

  // ── 6. Grok-2-vision (xAI) — rezerva finala ──────────────────────────────────
  const XAI_KEY = process.env.XAI_API_KEY;
  if (XAI_KEY) {
    try {
      res = await callOpenAIVision(
        'https://api.x.ai/v1/chat/completions',
        XAI_KEY, 'grok-2-vision-1212', base64, mimeType, prompt, 15000
      );
      log(`grok-2-vision xai → ${res.status}`);
      if (res.ok) {
        text = openaiText(await res.json());
        if (text) return Response.json({ diagnosis: text, _fallback: true, _fallbackModel: 'grok-2-vision-1212' }, { headers: corsHeaders(req) });
      }
    } catch (e) { log(`grok err: ${e.name}`); }
  }

  // ── Toate fallback-urile epuizate ─────────────────────────────────────────────
  log('toate fallback-urile epuizate');
  return Response.json({ error: 'Serviciul AI de diagnostic este indisponibil momentan. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
}
