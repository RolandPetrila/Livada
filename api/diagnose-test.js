import { corsHeaders, handleOptions, checkOrigin } from "./_auth.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const t0 = Date.now();
  const API_KEY = process.env.GOOGLE_AI_API_KEY;

  // Pas 1: verifica imediat fara sa astepte Gemini
  if (req.url && req.url.includes("ping")) {
    // L7: nu expune lungimea cheii API
    return Response.json(
      {
        ok: true,
        ping: true,
        hasKey: !!API_KEY,
        runtime: "edge",
      },
      { headers: corsHeaders(req) },
    );
  }

  // Pas 2: testeaza Gemini cu timeout strict 12s
  if (!API_KEY) {
    return Response.json(
      { ok: false, error: "GOOGLE_AI_API_KEY lipsa" },
      { headers: corsHeaders(req) },
    );
  }

  let geminiStatus = null;
  let geminiMs = null;
  let geminiBody = null;

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 12000);
    const t1 = Date.now();
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say OK" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      },
    );
    clearTimeout(tid);
    geminiStatus = res.status;
    geminiMs = Date.now() - t1;
    geminiBody = await res.text().catch(() => "");
  } catch (e) {
    geminiStatus = "error";
    geminiBody = e.message;
    geminiMs = Date.now() - t0;
  }

  return Response.json(
    {
      ok: geminiStatus === 200,
      gemini_status: geminiStatus,
      gemini_ms: geminiMs,
      gemini_response: geminiBody.substring(0, 300),
      total_ms: Date.now() - t0,
    },
    { headers: corsHeaders(req) },
  );
}
