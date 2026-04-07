import { Redis } from "@upstash/redis";
import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";
import { callCerebras } from "./_ai.js";
import { fetchWithTimeout } from "./_timeout.js";

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

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    return Response.json(
      { error: "GROQ_API_KEY lipsa" },
      { status: 500, headers: corsHeaders(req) },
    );
  }

  try {
    const kv = Redis.fromEnv();
    const year = new Date().getFullYear();

    // Cache check: returneaza raportul cached daca e mai recent de 1h SI jurnalul nu s-a schimbat
    const cacheKey = `livada:report:cache:${year}`;
    const [cached, journalLastUpdate] = await Promise.all([
      kv.get(cacheKey).catch(() => null),
      kv.get("livada:journal:last-update").catch(() => null),
    ]);
    if (cached && cached.generatedAt) {
      const ageMs = Date.now() - cached.generatedAt;
      const cacheIsStale =
        journalLastUpdate && Number(journalLastUpdate) > cached.generatedAt;
      if (ageMs < 3600_000 && !cacheIsStale) {
        console.log(`[report] cache hit, age ${Math.round(ageMs / 60000)}min`);
        return Response.json(
          { ...cached, _cached: true },
          { headers: corsHeaders(req) },
        );
      }
      if (cacheIsStale)
        console.log("[report] cache stale — jurnal actualizat dupa generare");
    }

    const journal = (await kv.get("livada:journal")) || [];
    const meteoHistory = (await kv.get("livada:meteo:history")) || {};

    // Filter journal for current year
    const yearEntries = journal.filter(
      (e) => e.date && e.date.startsWith(String(year)),
    );
    const journalSummary =
      yearEntries.length > 0
        ? yearEntries.map((e) => `${e.date}: [${e.type}] ${e.note}`).join("\n")
        : "Nicio interventie inregistrata in " + year + ".";

    // Filter meteo for current year
    const meteoEntries = Object.entries(meteoHistory).filter(([d]) =>
      d.startsWith(String(year)),
    );
    const meteoSummary =
      meteoEntries.length > 0
        ? meteoEntries
            .map(
              ([d, m]) =>
                `${d}: ${m.temp_min}°C—${m.temp_max}°C, ${m.description}, umid ${m.humidity}%`,
            )
            .join("\n")
        : "Nicio inregistrare meteo in " + year + ".";

    // Also include locally-sent journal from the request body
    let localJournal = "";
    try {
      const body = await req.json();
      if (body.localJournal) {
        localJournal =
          "\n\nJurnal local (din dispozitiv):\n" +
          String(body.localJournal).substring(0, 5000);
      }
    } catch {}

    const reportMessages = [
      {
        role: "system",
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
        role: "user",
        content: `Genereaza raportul anual ${year}.\n\nJURNAL INTERVENTII (${yearEntries.length} inregistrari):\n${journalSummary}${localJournal}\n\nISTORIC METEO (${meteoEntries.length} zile):\n${meteoSummary}`,
      },
    ];

    // M10: foloseste fetchWithTimeout din _timeout.js
    const callGroqReport = (model, ms) =>
      fetchWithTimeout(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: reportMessages,
            max_tokens: 8192,
            temperature: 0.4,
          }),
        },
        ms,
      );

    const tAI = Date.now();
    const logR = (msg) =>
      console.log(`[report] ${msg} t+${Date.now() - tAI}ms`);

    // Primary: llama-4-scout (Llama 4, disponibil free tier Groq)
    logR("start → llama-4-scout");
    let groqRes = await callGroqReport(
      "meta-llama/llama-4-scout-17b-16e-instruct",
      23000,
    );
    let usedFallback = false;
    let activeModel = "llama-4-scout";

    if (!groqRes.ok && groqRes.status !== 401 && groqRes.status !== 403) {
      logR(`llama-4-scout failed ${groqRes.status} → llama-3.3-70b`);
      let anyFbOk = false;

      // Fallback 1: llama-3.3-70b-versatile
      try {
        groqRes = await callGroqReport("llama-3.3-70b-versatile", 20000);
        anyFbOk = groqRes.ok;
        if (anyFbOk) {
          usedFallback = true;
          activeModel = "llama-3.3-70b-versatile";
          logR("llama-3.3-70b ok");
        }
      } catch (e) {
        logR(`llama-3.3-70b err: ${e.message}`);
      }

      // Fallback 2: Cerebras
      if (!anyFbOk) {
        logR("all groq failed → Cerebras");
        try {
          const cerebrasRes = await callCerebras(
            reportMessages,
            20000,
            8192,
            0.4,
          );
          if (cerebrasRes.ok) {
            const result = await cerebrasRes.json();
            const report =
              result.choices?.[0]?.message?.content ||
              "Nu am putut genera raportul.";
            logR("cerebras ok");
            const payload = {
              report,
              year,
              journalCount: yearEntries.length,
              meteoDays: meteoEntries.length,
              generatedAt: Date.now(),
              _fallback: true,
              _fallbackModel: "cerebras-llama-3.3-70b",
            };
            await kv.set(cacheKey, payload, { ex: 3600 }).catch(() => {});
            return Response.json(payload, { headers: corsHeaders(req) });
          }
        } catch (cerebrasErr) {
          logR(`cerebras err: ${cerebrasErr.message}`);
        }
        return Response.json(
          { error: "Serviciul AI nu a raspuns. Incearca din nou." },
          { status: 503, headers: corsHeaders(req) },
        );
      }
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "");
      logR(`Groq eroare ${groqRes.status}: ${errText.substring(0, 200)}`);
      if (groqRes.status === 429)
        return Response.json(
          { error: "AI suprasolicitat. Incearca din nou." },
          { status: 503, headers: corsHeaders(req) },
        );
      return Response.json(
        { error: "AI indisponibil. Incearca din nou." },
        { status: 503, headers: corsHeaders(req) },
      );
    }

    const result = await groqRes.json();
    const report =
      result.choices?.[0]?.message?.content || "Nu am putut genera raportul.";
    logR(`ok model=${activeModel} tokens=${result.usage?.total_tokens || "?"}`);

    const payload = {
      report,
      year,
      journalCount: yearEntries.length,
      meteoDays: meteoEntries.length,
      generatedAt: Date.now(),
      ...(usedFallback ? { _fallback: true, _fallbackModel: activeModel } : {}),
    };

    // Salveaza in cache Redis cu TTL 1h
    await kv.set(cacheKey, payload, { ex: 3600 }).catch(() => {});

    return Response.json(payload, { headers: corsHeaders(req) });
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes("UPSTASH")) {
      return Response.json(
        { error: "Vercel KV nu este configurat." },
        { status: 503, headers: corsHeaders(req) },
      );
    }
    console.error("API report error:", err);
    return Response.json(
      { error: "Eroare la procesare. Incercati din nou." },
      { status: 500, headers: corsHeaders(req) },
    );
  }
}
