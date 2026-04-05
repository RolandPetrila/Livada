import { corsHeaders, handleOptions, checkAuth, rateLimit, checkOrigin } from './_auth.js';

// Edge Runtime: raspunsul este trimis imediat, fara sa astepte I/O background
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

  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
    return Response.json({ error: 'GROQ_API_KEY lipsa' }, { status: 500, headers: corsHeaders(req) });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body invalid' }, { status: 400, headers: corsHeaders(req) });
  }

  const { question, species, context } = body;

  if (!question || !question.trim()) {
    return Response.json({ error: 'Scrie o intrebare' }, { status: 400, headers: corsHeaders(req) });
  }

  const ctx = context ? context.substring(0, 12000) : '';

  const systemPrompt = `Esti consultant pomicol expert, specializat in livezi din zona Nadlac/Arad, Romania (climat continental, sol cernoziom pH 7-8).

Reguli:
- Raspunde DOAR in romana
- Fii detaliat si practic — nu limita lungimea raspunsului daca subiectul o cere
- Daca intrebarea nu e despre pomicultura, spune politicos ca poti ajuta doar cu teme de pomicultura
- Cand recomanzi produse, include doze ca concentratie % la 10L apa
- Mentioneaza alternativele BIO cand exista
- Daca ai documentatie de referinta, bazeaza-te pe ea dar completeaza cu expertiza ta

Specia curenta: ${species || 'general (toate speciile)'}`;

  const safeQuestion = question.trim().substring(0, 8000);
  const userMsg = ctx
    ? `Documentatie de referinta pentru ${species}:\n${ctx}\n\n---\nIntrebarea pomicultorului: ${safeQuestion}`
    : `Intrebarea pomicultorului: ${safeQuestion}`;

  async function callGroq(model, timeoutMs) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }],
          max_tokens: 8192,
          temperature: 0.3,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      return res;
    } catch (err) {
      clearTimeout(tid);
      throw err;
    }
  }

  try {
    let groqRes = await callGroq('llama-3.3-70b-versatile', 26000);
    let usedFallback = false;

    // Fallback la llama-3.1-8b-instant daca modelul primar e suprasolicitat/indisponibil
    if (!groqRes.ok && (groqRes.status === 429 || groqRes.status >= 500)) {
      console.error('[ask] primary failed', groqRes.status, '— try fallback llama-3.1-8b-instant');
      try {
        groqRes = await callGroq('llama-3.1-8b-instant', 12000);
        usedFallback = true;
      } catch (fallbackErr) {
        console.error('[ask] fallback err:', fallbackErr.message);
        return Response.json({ error: 'AI indisponibil temporar. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
      }
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => '');
      console.error('[ask] Groq eroare:', groqRes.status, errText.substring(0, 200));
      return Response.json(
        { error: groqRes.status === 429 ? 'AI suprasolicitat. Incearca din nou.' : `AI indisponibil (${groqRes.status}). Incearca din nou.` },
        { status: 503, headers: corsHeaders(req) }
      );
    }

    const result = await groqRes.json();
    const answer = result.choices?.[0]?.message?.content || 'Nu am putut genera un raspuns.';
    return Response.json(
      { answer, ...(usedFallback ? { _fallback: true, _fallbackModel: 'llama-3.1-8b-instant' } : {}) },
      { headers: corsHeaders(req) }
    );

  } catch (err) {
    console.error('[ask] eroare:', err?.name, err?.message);
    if (err?.name === 'AbortError') {
      return Response.json({ error: 'AI-ul raspunde lent. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
    }
    return Response.json({ error: 'Eroare la procesare. Incercati din nou.' }, { status: 500, headers: corsHeaders(req) });
  }
}
