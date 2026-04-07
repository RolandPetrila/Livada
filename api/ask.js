import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";
import { fetchWithTimeout } from "./_timeout.js";
import { callCerebras } from "./_ai.js";

// Edge Runtime: raspunsul este trimis imediat, fara sa astepte I/O background
export const config = { runtime: "edge" };

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

  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
    return Response.json(
      { error: "GROQ_API_KEY lipsa" },
      { status: 500, headers: corsHeaders(req) },
    );
  }

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

  const { question, species, context } = body;

  if (!question || !question.trim()) {
    return Response.json(
      { error: "Scrie o intrebare" },
      { status: 400, headers: corsHeaders(req) },
    );
  }

  const ctx = context ? context.substring(0, 12000) : "";

  const systemPrompt = `Esti consultant pomicol expert, specializat in livezi din zona Nadlac/Arad, Romania (climat continental, sol cernoziom pH 7-8).

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

  // M10: foloseste fetchWithTimeout din _timeout.js
  async function callGroq(model, timeoutMs) {
    return fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMsg },
          ],
          max_tokens: 8192,
          temperature: 0.3,
        }),
      },
      timeoutMs,
    );
  }

  const cerebrasMessages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMsg },
  ];

  try {
    // Primary: llama-4-maverick (mai capabil, 128k context) — M9: 22s (buffer 6s pana la limita Edge)
    let groqRes = await callGroq(
      "meta-llama/llama-4-maverick-17b-128e-instruct",
      22000,
    );
    let usedFallback = false;
    let fallbackModel = "";

    if (!groqRes.ok && (groqRes.status === 429 || groqRes.status >= 500)) {
      console.error("[ask] llama-4-maverick failed", groqRes.status);

      // Fallback 1: llama-3.3-70b-versatile
      let fb1Ok = false;
      try {
        groqRes = await callGroq("llama-3.3-70b-versatile", 22000);
        fb1Ok = groqRes.ok;
        if (fb1Ok) {
          usedFallback = true;
          fallbackModel = "llama-3.3-70b-versatile";
        }
      } catch (e) {
        console.error("[ask] fb1 err:", e.message);
      }

      // Fallback 2: llama-3.1-8b-instant
      if (!fb1Ok) {
        let fb2Ok = false;
        try {
          groqRes = await callGroq("llama-3.1-8b-instant", 12000);
          fb2Ok = groqRes.ok;
          if (fb2Ok) {
            usedFallback = true;
            fallbackModel = "llama-3.1-8b-instant";
          }
        } catch (e) {
          console.error("[ask] fb2 err:", e.message);
        }

        // Fallback 3: Cerebras
        if (!fb2Ok) {
          console.error("[ask] all groq failed — try Cerebras");
          try {
            const cerebrasRes = await callCerebras(cerebrasMessages, 15000);
            if (cerebrasRes.ok) {
              const result = await cerebrasRes.json();
              const answer =
                result.choices?.[0]?.message?.content ||
                "Nu am putut genera un raspuns.";
              return Response.json(
                { answer, _fallback: true },
                { headers: corsHeaders(req) },
              );
            }
          } catch (e) {
            console.error("[ask] cerebras err:", e.message);
          }
          return Response.json(
            { error: "AI indisponibil temporar. Incearca din nou." },
            { status: 503, headers: corsHeaders(req) },
          );
        }
      }
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "");
      // H7: nu expune status code sau provider in raspuns public
      console.error(
        "[ask] Groq eroare:",
        groqRes.status,
        errText.substring(0, 200),
      );
      return Response.json(
        {
          error:
            groqRes.status === 429
              ? "AI suprasolicitat. Incearca din nou."
              : "AI indisponibil. Incearca din nou.",
        },
        { status: 503, headers: corsHeaders(req) },
      );
    }

    const result = await groqRes.json();
    const answer =
      result.choices?.[0]?.message?.content || "Nu am putut genera un raspuns.";
    // H7: _fallbackModel nu e expus in raspuns public (detaliu intern)
    return Response.json(
      { answer, ...(usedFallback ? { _fallback: true } : {}) },
      { headers: corsHeaders(req) },
    );
  } catch (err) {
    console.error("[ask] eroare:", err?.name, err?.message);
    if (err?.name === "AbortError") {
      return Response.json(
        { error: "AI-ul raspunde lent. Incearca din nou." },
        { status: 503, headers: corsHeaders(req) },
      );
    }
    return Response.json(
      { error: "Eroare la procesare. Incercati din nou." },
      { status: 500, headers: corsHeaders(req) },
    );
  }
}
