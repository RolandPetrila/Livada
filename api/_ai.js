// api/_ai.js — Helpers AI comune (Groq, Gemini, OpenAI-compat vision) + lant de fallback
// Importat de: ask.js, report.js, second-opinion.js, diagnose.js, identify.js
import { fetchWithTimeout } from "./_timeout.js";

// Modele curente — verificate live 2026-10-27 (GET /models + apel real pe fiecare).
// La retragerea unui model se schimba DOAR aici. Istoric retrageri: Groq llama-4-scout +
// llama-3.3-70b (404), xAI grok-2-vision (404), GitHub Models (retras 30.07.2026),
// Cerebras (402 — fara plan gratuit), Gemini 2.5-pro (indisponibil conturi noi).
export const MODELS = {
  groqPrimary: "openai/gpt-oss-120b",
  groqFallback: "qwen/qwen3.8-27b",
  geminiFlash: "gemini-2.5-flash",
  geminiLite: "gemini-3.5-flash-lite",
  mistralVision: "pixtral-12b-2409",
  xaiVision: "grok-4.3",
};

// Etichete afisate in UI (campul _model din raspunsuri)
export const LABELS = {
  groqPrimary: "Groq GPT-OSS 120B",
  groqFallback: "Groq Qwen 3.8",
  geminiFlash: "Gemini 2.5 Flash",
  geminiLite: "Gemini 3.5 Flash-Lite",
  mistralVision: "Pixtral-12B",
  xaiVision: "Grok 4.3",
};

const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Normalizeaza input la array de {base64, mimeType}.
// Accepta:
//  - (base64String, mimeTypeString)
//  - (imagesArray, ignoredMimeArg) — array de {base64, mimeType}
function normalizeImages(base64OrArr, mimeType) {
  if (Array.isArray(base64OrArr)) {
    return base64OrArr
      .filter((i) => i && i.base64)
      .map((i) => ({ base64: i.base64, mimeType: i.mimeType || "image/jpeg" }));
  }
  return [{ base64: base64OrArr, mimeType: mimeType || "image/jpeg" }];
}

// thinkingBudget e suportat doar de familia 2.5; 0 = fara "thinking" (≈ −6 s pe diagnostic)
function geminiGenerationConfig(model, { maxTokens, temperature, thinkingBudget }) {
  const cfg = { maxOutputTokens: maxTokens, temperature };
  if (thinkingBudget !== undefined && model.startsWith("gemini-2.5")) {
    cfg.thinkingConfig = { thinkingBudget };
  }
  return cfg;
}

export async function callGemini(
  apiKey,
  model,
  base64OrImages,
  mimeType,
  prompt,
  timeoutMs,
  { maxTokens = 8192, temperature = 0.3, thinkingBudget } = {},
) {
  const images = normalizeImages(base64OrImages, mimeType);
  const parts = [{ text: prompt }];
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  }
  return fetchWithTimeout(
    GEMINI_URL(model),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: geminiGenerationConfig(model, {
          maxTokens,
          temperature,
          thinkingBudget,
        }),
      }),
    },
    timeoutMs,
  );
}

// Gemini text din mesaje in format OpenAI (system/user/assistant)
export async function callGeminiText(
  apiKey,
  model,
  messages,
  timeoutMs,
  { maxTokens = 8192, temperature = 0.3, thinkingBudget } = {},
) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  return fetchWithTimeout(
    GEMINI_URL(model),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: geminiGenerationConfig(model, {
          maxTokens,
          temperature,
          thinkingBudget,
        }),
      }),
    },
    timeoutMs,
  );
}

export async function callOpenAIVision(
  endpoint,
  apiKey,
  model,
  base64OrImages,
  mimeType,
  prompt,
  timeoutMs,
  { maxTokens = 8192, temperature = 0.3 } = {},
) {
  const images = normalizeImages(base64OrImages, mimeType);
  const content = [{ type: "text", text: prompt }];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    });
  }
  return fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        max_tokens: maxTokens,
        temperature,
      }),
    },
    timeoutMs,
  );
}

// Groq (OpenAI-compat). gpt-oss e model "reasoning": efort scazut = raspuns ~25% mai rapid,
// calitate practic identica pe intrebari de pomicultura (testat 2026-10-27).
export function callGroq(
  messages,
  model,
  timeoutMs,
  { maxTokens = 8192, temperature = 0.3 } = {},
) {
  const KEY = process.env.GROQ_API_KEY;
  if (!KEY) throw new Error("GROQ_API_KEY lipsa");
  return fetchWithTimeout(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
      }),
    },
    timeoutMs,
  );
}

// Gemini poate intoarce mai multe parti (si parti "thought") — le lipim doar pe cele de raspuns
export const geminiText = (json) => {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text || "")
    .join("");
  return text || null;
};
// Unele modele (Qwen) pot emite <think>…</think> inainte de raspuns
export const openaiText = (json) => {
  const raw = json?.choices?.[0]?.message?.content;
  if (!raw) return null;
  return raw.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim() || null;
};

// Motiv lizibil pt notificarea de fallback din UI
// (afisat parintilor — fara JSON brut; detaliul tehnic ramane in log-uri si in ai-health)
export function describeFailure(label, err) {
  const e = String(err || "");
  if (/^quota/.test(e)) return `${label}: limita zilnica atinsa`;
  if (/^429/.test(e)) return `${label}: prea multe cereri acum`;
  if (/timeout|abort/i.test(e)) return `${label}: raspuns prea lent`;
  if (/^40[13]/.test(e) || /^400 .*key/i.test(e)) return `${label}: cheie API invalida`;
  if (/^402/.test(e)) return `${label}: fara credite`;
  if (/^404/.test(e)) return `${label}: model retras`;
  if (/^5\d\d/.test(e)) return `${label}: eroare temporara la furnizor`;
  return `${label} indisponibil`;
}

// ── Lant de fallback cu buget global de timp ───────────────────────────────────
// steps: [{ provider, label, enabled, maxMs, call(ms) → Promise<Response>, parse(json) → text }]
// Fiecare pas primeste min(maxMs, timp ramas). Pasii dezactivati (fara cheie / cota) sunt
// sariti. Fiecare incercare e consemnata in `attempts` (pt sanatate + cota in Redis).
// Intoarce { text, label, provider, index, reason } sau null daca toti pasii au esuat.
export async function runChain(steps, { deadline, log = () => {}, attempts = [], minMs = 3000 }) {
  let reason = "";
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step.enabled) {
      if (step.skipReason && !reason) reason = describeFailure(step.label, step.skipReason);
      continue;
    }
    const left = deadline - Date.now() - 500;
    if (left < minMs) {
      log(`${step.label}: buget de timp epuizat (${left}ms)`);
      break;
    }
    const ms = Math.min(step.maxMs, left);
    let err = "";
    try {
      const res = await step.call(ms);
      if (res.ok) {
        const text = step.parse(await res.json());
        if (text) {
          attempts.push({ provider: step.provider, ok: true });
          log(`${step.label} ok`);
          return { text, label: step.label, provider: step.provider, index: i, reason };
        }
        err = "raspuns gol";
      } else {
        const body = await res.text().catch(() => "");
        err = `${res.status} ${body.replace(/\s+/g, " ").substring(0, 120)}`.trim();
      }
    } catch (e) {
      err = e?.name === "AbortError" ? "timeout" : e?.message || "eroare";
    }
    attempts.push({ provider: step.provider, ok: false, err });
    log(`${step.label} esuat: ${err}`);
    if (!reason) reason = describeFailure(step.label, err);
  }
  return null;
}

// ── Pasi standard pentru vision (Diagnostic / Identificare) ────────────────────
// Ordine: Gemini 2.5 Flash (cheia 1, cea mai buna calitate masurata) → 3.5 Flash-Lite pe aceeasi
// cheie (cota separata, ~5 s) → 2.5 Flash cheia 2 → Pixtral → Grok 4.3 (lent, 9–17 s, ultimul).
// images: array {base64,mimeType} SAU base64 + mimeType. geminiBlocked = cota cheii 1 atinsa.
export function visionSteps(images, mimeType, prompt, opts, { geminiBlocked = false, primaryMs = 25000 } = {}) {
  const K1 = process.env.GOOGLE_AI_API_KEY;
  const K2 = process.env.GOOGLE_AI_API_KEY_2;
  const MISTRAL = process.env.MISTRAL_API_KEY;
  const XAI = process.env.XAI_API_KEY;
  const gem = (key, model, provider, label, maxMs, enabled, skipReason = "") => ({
    provider,
    label,
    maxMs,
    enabled,
    skipReason,
    call: (ms) => callGemini(key, model, images, mimeType, prompt, ms, opts),
    parse: geminiText,
  });
  const oai = (endpoint, key, model, provider, label, maxMs) => ({
    provider,
    label,
    maxMs,
    enabled: !!key,
    call: (ms) => callOpenAIVision(endpoint, key, model, images, mimeType, prompt, ms, opts),
    parse: openaiText,
  });
  return [
    gem(K1, MODELS.geminiFlash, "gemini", LABELS.geminiFlash, primaryMs, !!K1 && !geminiBlocked, geminiBlocked ? "quota" : ""),
    gem(K1, MODELS.geminiLite, "gemini_lite", LABELS.geminiLite, 15000, !!K1),
    gem(K2, MODELS.geminiFlash, "gemini2", LABELS.geminiFlash + " (cheia 2)", 25000, !!K2),
    oai("https://api.mistral.ai/v1/chat/completions", MISTRAL, MODELS.mistralVision, "mistral", LABELS.mistralVision, 20000),
    oai("https://api.x.ai/v1/chat/completions", XAI, MODELS.xaiVision, "xai", LABELS.xaiVision, 25000),
  ];
}

// ── Pasi standard pentru text (Intreaba / Raport / A doua parere) ───────────────
export function textSteps(messages, { maxTokens = 8192, temperature = 0.3 } = {}) {
  const opts = { maxTokens, temperature };
  const K1 = process.env.GOOGLE_AI_API_KEY;
  const K2 = process.env.GOOGLE_AI_API_KEY_2;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const gem = (key, provider) => ({
    provider,
    label: LABELS.geminiLite,
    enabled: !!key,
    maxMs: 25000,
    call: (ms) => callGeminiText(key, MODELS.geminiLite, messages, ms, opts),
    parse: geminiText,
  });
  return {
    groqPrimary: {
      provider: "groq",
      label: LABELS.groqPrimary,
      enabled: hasGroq,
      maxMs: 25000,
      call: (ms) => callGroq(messages, MODELS.groqPrimary, ms, opts),
      parse: openaiText,
    },
    groqFallback: {
      provider: "groq",
      label: LABELS.groqFallback,
      enabled: hasGroq,
      maxMs: 20000,
      call: (ms) => callGroq(messages, MODELS.groqFallback, ms, opts),
      parse: openaiText,
    },
    // Gemini Lite: cheia 2 intai (cheia 1 e rezervata diagnosticului foto)
    geminiLite2: gem(K2, "gemini_lite"),
    geminiLite1: gem(K1, "gemini_lite"),
  };
}
