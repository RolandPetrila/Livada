import { Redis } from '@upstash/redis';
import { corsHeaders, handleOptions, checkAuth, rateLimit, checkOrigin } from './_auth.js';

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

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    return Response.json({ error: 'GROQ_API_KEY lipsa' }, { status: 500, headers: corsHeaders(req) });
  }

  try {
    const kv = Redis.fromEnv();
    const journal = (await kv.get('livada:journal')) || [];
    const meteoHistory = (await kv.get('livada:meteo:history')) || {};
    const year = new Date().getFullYear();

    // Filter journal for current year
    const yearEntries = journal.filter(e => e.date && e.date.startsWith(String(year)));
    const journalSummary =
      yearEntries.length > 0
        ? yearEntries.map(e => `${e.date}: [${e.type}] ${e.note}`).join('\n')
        : 'Nicio interventie inregistrata in ' + year + '.';

    // Filter meteo for current year
    const meteoEntries = Object.entries(meteoHistory).filter(([d]) => d.startsWith(String(year)));
    const meteoSummary =
      meteoEntries.length > 0
        ? meteoEntries
            .map(([d, m]) => `${d}: ${m.temp_min}°C—${m.temp_max}°C, ${m.description}, umid ${m.humidity}%`)
            .join('\n')
        : 'Nicio inregistrare meteo in ' + year + '.';

    // Also include locally-sent journal from the request body
    let localJournal = '';
    try {
      const body = await req.json();
      if (body.localJournal) {
        localJournal = '\n\nJurnal local (din dispozitiv):\n' + String(body.localJournal).substring(0, 5000);
      }
    } catch {}

    const reportMessages = [
      {
        role: 'system',
        content: `Esti consultant pomicol expert. Genereaza un RAPORT ANUAL detaliat pentru o livada din Nadlac, judetul Arad:
- 100+ pomi, 17 specii (cires, visin, cais, piersic, prun, migdal, par, mar, zmeur, mur, afin, alun, rodiu)
- Proprietar: profesor, abordare semi-comerciala
- Clima: continental, ierni reci, veri calde, sol cernoziom pH 7-8

Structura raportului:
1. REZUMAT GENERAL — evaluare in 2-3 paragrafe
2. INTERVENTII REALIZATE — ce s-a facut bine, ce s-a respectat din calendar
3. CONDITII METEO — cum a fost anul meteorologic, impact asupra livezii
4. PROBLEME IDENTIFICATE — ce s-a ratat, ce tratamente lipsesc
5. RECOMANDARI PENTRU ANUL URMATOR — prioritati, investitii, schimbari
6. NOTA FINALA — scor general 1-10

Scrie in romana, profesional dar accesibil. Fii specific si practic.`,
      },
      {
        role: 'user',
        content: `Genereaza raportul anual ${year}.\n\nJURNAL INTERVENTII (${yearEntries.length} inregistrari):\n${journalSummary}${localJournal}\n\nISTORIC METEO (${meteoEntries.length} zile):\n${meteoSummary}`,
      },
    ];

    async function callGroqReport(model, timeoutMs) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({ model, messages: reportMessages, max_tokens: 2048, temperature: 0.4 }),
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        return res;
      } catch (err) { clearTimeout(tid); throw err; }
    }

    let groqRes = await callGroqReport('llama-3.3-70b-versatile', 23000);
    let usedFallback = false;

    if (!groqRes.ok && (groqRes.status === 429 || groqRes.status >= 500)) {
      console.error('[report] primary failed', groqRes.status, '— try fallback llama-3.1-8b-instant');
      try {
        groqRes = await callGroqReport('llama-3.1-8b-instant', 10000);
        usedFallback = true;
      } catch (fallbackErr) {
        return Response.json({ error: 'Serviciul AI nu a raspuns. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
      }
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => '');
      console.error('[report] Groq', groqRes.status, errText.substring(0, 200));
      if (groqRes.status === 429) return Response.json({ error: 'AI suprasolicitat. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
      return Response.json({ error: `AI indisponibil (${groqRes.status}). Incearca din nou.` }, { status: 503, headers: corsHeaders(req) });
    }

    const result = await groqRes.json();
    const report = result.choices?.[0]?.message?.content || 'Nu am putut genera raportul.';

    return Response.json({ report, year, journalCount: yearEntries.length, meteoDays: meteoEntries.length, ...(usedFallback ? { _fallback: true, _fallbackModel: 'llama-3.1-8b-instant' } : {}) }, { headers: corsHeaders(req) });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes('UPSTASH')) {
      return Response.json({ error: 'Vercel KV nu este configurat.' }, { status: 503, headers: corsHeaders(req) });
    }
    console.error('API report error:', err);
    return Response.json({ error: 'Eroare la procesare. Incercati din nou.' }, { status: 500, headers: corsHeaders(req) });
  }
}
