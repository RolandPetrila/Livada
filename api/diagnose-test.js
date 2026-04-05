// Endpoint diagnostic — testeaza conexiunea Gemini fara imagine
// Accesat la /api/diagnose-test (GET) — returneaza timing si status
import { corsHeaders } from './_auth.js';

export const runtime = 'edge';

export default async function handler(req) {
  if (req.method !== 'GET') {
    return Response.json({ error: 'GET only' }, { status: 405, headers: corsHeaders(req) });
  }

  const API_KEY = process.env.GOOGLE_AI_API_KEY;
  if (!API_KEY) {
    return Response.json({ ok: false, error: 'GOOGLE_AI_API_KEY lipsa', step: 'config' }, { headers: corsHeaders(req) });
  }

  const t0 = Date.now();
  const result = { ok: false, steps: {} };

  // Test 1: ping Gemini cu o cerere text simpla (fara imagine)
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_15s')), 15000)
  );

  try {
    const fetchPromise = fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Raspunde cu un singur cuvant: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    );

    const res = await Promise.race([fetchPromise, timeoutPromise]);
    result.steps.gemini_status = res.status;
    result.steps.gemini_ms = Date.now() - t0;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      result.error = `Gemini HTTP ${res.status}: ${body.substring(0, 200)}`;
      result.step = 'gemini_http';
    } else {
      const json = await res.json();
      result.steps.gemini_response = json.candidates?.[0]?.content?.parts?.[0]?.text || '(gol)';
      result.ok = true;
      result.total_ms = Date.now() - t0;
    }
  } catch (e) {
    result.error = e.message;
    result.step = 'gemini_fetch';
    result.steps.elapsed_ms = Date.now() - t0;
  }

  return Response.json(result, { headers: corsHeaders(req) });
}
