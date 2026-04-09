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

  const { question, species, context, preferModel } = body;

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

  const t0 = Date.now();
  const log = (msg) => console.log(`[ask] ${msg} t+${Date.now() - t0}ms`);

  try {
    // F4.1 — Daca preferModel === "cerebras" → sari direct la Cerebras
    if (preferModel === "cerebras") {
      log("start → cerebras (preferModel)");
      try {
        const cerebrasRes = await callCerebras(cerebrasMessages, 20000);
        if (cerebrasRes.ok) {
          const result = await cerebrasRes.json();
          const answer =
            result.choices?.[0]?.message?.content ||
            "Nu am putut genera un raspuns.";
          log("cerebras ok (preferModel)");
          return Response.json(
            { answer, _model: "cerebras-llama-3.3-70b" },
            { headers: corsHeaders(req) },
          );
        }
      } catch (e) {
        log(`cerebras preferModel err: ${e.message}`);
      }
      return Response.json(
        { error: "Cerebras indisponibil momentan." },
        { status: 503, headers: corsHeaders(req) },
      );
    }

    // Primary: llama-4-scout (Llama 4, disponibil free tier Groq)
    log("start → llama-4-scout");
    let groqRes = await callGroq(
      "meta-llama/llama-4-scout-17b-16e-instruct",
      22000,
    );
    let usedFallback = false;
    let activeModel = "llama-4-scout";

    if (!groqRes.ok && groqRes.status !== 401 && groqRes.status !== 403) {
      log(`llama-4-scout failed ${groqRes.status} → llama-3.3-70b`);

      // Fallback 1: llama-3.3-70b-versatile (confirmat functional)
      let fb1Ok = false;
      try {
        groqRes = await callGroq("llama-3.3-70b-versatile", 22000);
        fb1Ok = groqRes.ok;
        if (fb1Ok) {
          usedFallback = true;
          activeModel = "llama-3.3-70b-versatile";
          log("llama-3.3-70b ok");
        }
      } catch (e) {
        log(`llama-3.3-70b err: ${e.message}`);
      }

      // Fallback 2: Cerebras llama-3.3-70b
      if (!fb1Ok) {
        log("all groq failed → Cerebras");
        try {
          const cerebrasRes = await callCerebras(cerebrasMessages, 20000);
          if (cerebrasRes.ok) {
            const result = await cerebrasRes.json();
            const answer =
              result.choices?.[0]?.message?.content ||
              "Nu am putut genera un raspuns.";
            log("cerebras ok");
            return Response.json(
              {
                answer,
                _fallback: true,
                _fallbackModel: "cerebras-llama-3.3-70b",
                _model: "cerebras-llama-3.3-70b",
              },
              { headers: corsHeaders(req) },
            );
          }
        } catch (e) {
          log(`cerebras err: ${e.message}`);
        }
        return Response.json(
          { error: "AI indisponibil temporar. Incearca din nou." },
          { status: 503, headers: corsHeaders(req) },
        );
      }
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "");
      log(`Groq eroare ${groqRes.status}: ${errText.substring(0, 200)}`);
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
    log(`ok model=${activeModel} tokens=${result.usage?.total_tokens || "?"}`);
    return Response.json(
      {
        answer,
        _model: activeModel,
        ...(usedFallback
          ? { _fallback: true, _fallbackModel: activeModel }
          : {}),
      },
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
