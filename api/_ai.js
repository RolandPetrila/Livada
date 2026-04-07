// api/_ai.js — Shared vision AI helpers (Gemini + OpenAI-compatible)
// Importat de: diagnose.js, identify.js
import { fetchWithTimeout } from "./_timeout.js";

export async function callGemini(
  apiKey,
  model,
  base64,
  mimeType,
  prompt,
  timeoutMs,
  { maxTokens = 2048, temperature = 0.3 } = {},
) {
  return fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
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
  base64,
  mimeType,
  prompt,
  timeoutMs,
  { maxTokens = 2048, temperature = 0.3 } = {},
) {
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
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
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
