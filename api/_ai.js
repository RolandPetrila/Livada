// api/_ai.js — Shared vision AI helpers (Gemini + OpenAI-compatible)
// Importat de: diagnose.js, identify.js
import { fetchWithTimeout } from "./_timeout.js";

// Model Cerebras curent — centralizat ca sa nu existe label drift in UI.
// Cerebras a retras llama-3.3-70b; gpt-oss-120b e disponibil pe cheia curenta.
export const CEREBRAS_MODEL = "gpt-oss-120b";

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

export async function callGemini(
  apiKey,
  model,
  base64OrImages,
  mimeType,
  prompt,
  timeoutMs,
  { maxTokens = 8192, temperature = 0.3 } = {},
) {
  const images = normalizeImages(base64OrImages, mimeType);
  const parts = [{ text: prompt }];
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  }
  return fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
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

export const geminiText = (json) =>
  json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
export const openaiText = (json) =>
  json?.choices?.[0]?.message?.content || null;

// Shared Cerebras caller — folosit de ask.js si report.js
export function callCerebras(
  messages,
  timeoutMs,
  maxTokens = 8192,
  temperature = 0.3,
) {
  const KEY = process.env.CEREBRAS_API_KEY;
  if (!KEY) throw new Error("CEREBRAS_API_KEY lipsa");
  return fetchWithTimeout(
    "https://api.cerebras.ai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        // Cerebras e in spatele Cloudflare; fara User-Agent "de browser" cererea de la
        // Vercel Edge e blocata cu 403 (pagina challenge Cloudflare). (Fix 2026-06-24)
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      body: JSON.stringify({
        // NOTA: pe Edge runtime Cerebras e blocat de Cloudflare (403) — fallback-ul adanc
        // Edge ramane nesigur; a doua parere reala merge prin api/cerebras-opinion.js (Node).
        model: CEREBRAS_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    },
    timeoutMs,
  );
}
