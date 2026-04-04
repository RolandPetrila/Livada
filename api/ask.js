import { corsHeaders, handleOptions, checkAuth, rateLimit } from './_auth.js';

export const config = { maxDuration: 60 };

export default async function handler(req) {
  console.log('[ask] start', req.method);

  if (req.method === 'OPTIONS') return handleOptions(req);

  if (req.method !== 'POST') {
    return Response.json({ error: 'Metoda nepermisa' }, { status: 405, headers: corsHeaders(req) });
  }

  const authErr = checkAuth(req);
  if (authErr) return authErr;
  const limitErr = rateLimit(req);
  if (limitErr) return limitErr;

  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
    console.error('[ask] GROQ_API_KEY lipsa');
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

  // Truncate context to ~3000 chars (~750 tokens) to stay within limits
  const ctx = context ? context.substring(0, 3000) : '';

  const systemPrompt = `Esti consultant pomicol expert, specializat in livezi din zona Nadlac/Arad, Romania (climat continental, sol cernoziom pH 7-8).

Reguli:
- Raspunde DOAR in romana
- Fii concis si practic (max 300 cuvinte)
- Daca intrebarea nu e despre pomicultura, spune politicos ca poti ajuta doar cu teme de pomicultura
- Cand recomanzi produse, include doze ca concentratie % la 10L apa
- Mentioneaza alternativele BIO cand exista
- Daca ai documentatie de referinta, bazeaza-te pe ea dar completeaza cu expertiza ta

Specia curenta: ${species || 'general (toate speciile)'}`;

  const safeQuestion = question.trim().substring(0, 2000);
  const userMsg = ctx
    ? `Documentatie de referinta pentru ${species}:\n${ctx}\n\n---\nIntrebarea pomicultorului: ${safeQuestion}`
    : `Intrebarea pomicultorului: ${safeQuestion}`;

  console.log('[ask] trimit cerere Groq, intrebare lungime:', safeQuestion.length);

  try {
    // Promise.race in loc de AbortController — functioneaza chiar si cand
    // fetch() nu raspunde la semnale de abort (hang la nivel TCP/TLS)
    const fetchPromise = fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('GROQ_TIMEOUT')), 50000)
    );

    const groqRes = await Promise.race([fetchPromise, timeoutPromise]);
    console.log('[ask] Groq status:', groqRes.status);

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => '');
      console.error('[ask] Groq eroare:', groqRes.status, errText.substring(0, 200));
      if (groqRes.status === 429) {
        return Response.json(
          { error: 'AI suprasolicitat. Incearca din nou in cateva secunde.' },
          { status: 503, headers: corsHeaders(req) }
        );
      }
      return Response.json(
        { error: `AI indisponibil temporar (${groqRes.status}). Incearca din nou.` },
        { status: 503, headers: corsHeaders(req) }
      );
    }

    const result = await groqRes.json();
    const answer = result.choices?.[0]?.message?.content || 'Nu am putut genera un raspuns.';
    console.log('[ask] raspuns primit, lungime:', answer.length);
    return Response.json({ answer }, { headers: corsHeaders(req) });

  } catch (err) {
    console.error('[ask] eroare:', err?.name, err?.message);
    if (err?.message === 'GROQ_TIMEOUT' || err?.name === 'AbortError') {
      return Response.json(
        { error: 'AI-ul raspunde lent. Incearca din nou in cateva secunde.' },
        { status: 503, headers: corsHeaders(req) }
      );
    }
    return Response.json(
      { error: 'Eroare la procesare. Incercati din nou.' },
      { status: 500, headers: corsHeaders(req) }
    );
  }
}
