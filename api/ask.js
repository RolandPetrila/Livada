import { corsHeaders, handleOptions, checkAuth, rateLimit } from './_auth.js';

export default async function handler(req) {
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
    return Response.json({ error: 'GROQ_API_KEY lipsa' }, { status: 500, headers: corsHeaders(req) });
  }

  try {
    const { question, species, context } = await req.json();

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

    const userMsg = ctx
      ? `Documentatie de referinta pentru ${species}:\n${ctx}\n\n---\nIntrebarea mea: ${question}`
      : question;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      throw new Error(`Groq API: ${groqRes.status}`);
    }

    const result = await groqRes.json();
    const answer = result.choices?.[0]?.message?.content || 'Nu am putut genera un raspuns. Incearca din nou.';

    return Response.json({ answer }, { headers: corsHeaders(req) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders(req) });
  }
}
