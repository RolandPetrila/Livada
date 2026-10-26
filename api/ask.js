import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";
import { runChain, textSteps } from "./_ai.js";
import { recordAiCalls } from "./_quota.js";
import { streamJson } from "./_stream.js";

// Edge Runtime + raspuns in flux (vezi _stream.js) — lantul de fallback poate depasi 25 s
export const config = { runtime: "edge" };

const BUDGET_MS = 50000; // frontend asteapta 65 s

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  if (req.method !== "POST") {
    return Response.json(
      { error: "Metoda nepermisa" },
      { status: 405, headers: corsHeaders(req) },
    );
  }

  const limitErr = await rateLimit(req, 10); // M8: AI endpoint — limita 10 req/min
  if (limitErr) return limitErr;

  // H5/H8: size limit inainte de parse
  let body;
  try {
    const bodyText = await req.text();
    if (bodyText.length > 50_000)
      return Response.json(
        { error: "Payload prea mare" },
        { status: 413, headers: corsHeaders(req) },
      );
    body = JSON.parse(bodyText);
  } catch {
    return Response.json(
      { error: "Body invalid" },
      { status: 400, headers: corsHeaders(req) },
    );
  }

  const { question, species, context, preferModel } = body;

  if (!question || !question.trim()) {
    return Response.json(
      { error: "Scrie o intrebare" },
      { status: 400, headers: corsHeaders(req) },
    );
  }

  const ctx = context ? context.substring(0, 12000) : "";

  // Data curenta (Europe/Bucharest) — ca AI-ul sa stie ziua de azi / sezonul, nu data din training
  let todayRo = "";
  try {
    todayRo = new Intl.DateTimeFormat("ro-RO", {
      timeZone: "Europe/Bucharest",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    todayRo = new Date().toISOString().slice(0, 10);
  }

  const systemPrompt = `Esti consultant pomicol expert, specializat in livezi din zona Nadlac/Arad, Romania (climat continental, sol cernoziom pH 7-8).

Data de azi este ${todayRo}. Foloseste-o cand intrebarea tine de timp, sezon, calendar sau "ce urmeaza". NU inventa alta data si NU folosi data din memoria ta de antrenament.

Reguli:
- Raspunde DOAR in romana
- Fii detaliat si practic — nu limita lungimea raspunsului daca subiectul o cere
- Daca intrebarea nu e despre pomicultura, spune politicos ca poti ajuta doar cu teme de pomicultura
- Cand recomanzi produse, include doze ca concentratie % la 10L apa
- Mentioneaza alternativele BIO cand exista
- Daca ai documentatie de referinta, bazeaza-te pe ea dar completeaza cu expertiza ta

Specia curenta: ${species || "general (toate speciile)"}`;

  const safeQuestion = question.trim().substring(0, 8000);
  const userMsg = ctx
    ? `Documentatie de referinta pentru ${species}:\n${ctx}\n\n---\nIntrebarea pomicultorului: ${safeQuestion}`
    : `Intrebarea pomicultorului: ${safeQuestion}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMsg },
  ];

  // "A doua parere" = alt furnizor decat cel principal (Gemini in loc de Groq).
  // "cerebras" ramas pt clientii cu app.js vechi in cache (Cerebras nu mai are plan gratuit).
  const second = preferModel === "second" || preferModel === "cerebras";
  const s = textSteps(messages);
  const steps = second
    ? [s.geminiLite2, s.geminiLite1, s.groqFallback]
    : [s.groqPrimary, s.groqFallback, s.geminiLite2, s.geminiLite1];

  const t0 = Date.now();
  const log = (msg) => console.log(`[ask] ${msg} t+${Date.now() - t0}ms`);
  log(`start${second ? " (a doua parere)" : ""}`);

  return streamJson(corsHeaders(req), async () => {
    const attempts = [];
    const r = await runChain(steps, { deadline: t0 + BUDGET_MS, log, attempts });
    await recordAiCalls(attempts);
    if (!r) {
      return {
        error: second
          ? "A doua parere e indisponibila momentan. Incearca din nou peste cateva minute."
          : "AI indisponibil temporar. Incearca din nou.",
      };
    }
    return {
      answer: r.text,
      _model: r.label,
      ...(second ? { _second: true } : {}),
      ...(r.index > 0
        ? { _fallback: true, _fallbackModel: r.label, _fallbackReason: r.reason }
        : {}),
    };
  });
}
