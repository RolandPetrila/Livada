import { Redis } from "@upstash/redis";
import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";
import { runChain, textSteps } from "./_ai.js";
import { recordAiCalls } from "./_quota.js";
import { streamJson } from "./_stream.js";

// Edge Runtime + raspuns in flux (vezi _stream.js) — raportul lung + fallback pot depasi 25 s
export const config = { runtime: "edge" };

const BUDGET_MS = 55000; // frontend asteapta 65 s

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

  // Jurnalul local trimis din dispozitiv (optional)
  let localJournal = "";
  try {
    const body = await req.json();
    if (body.localJournal) {
      localJournal =
        "\n\nJurnal local (din dispozitiv):\n" +
        String(body.localJournal).substring(0, 5000);
    }
  } catch {}

  const t0 = Date.now();
  const logR = (msg) => console.log(`[report] ${msg} t+${Date.now() - t0}ms`);

  return streamJson(corsHeaders(req), async () => {
    let kv;
    try {
      kv = Redis.fromEnv();
    } catch (err) {
      console.error("API report error:", err?.message);
      return { error: "Baza de date (Redis) nu este configurata." };
    }
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
        logR(`cache hit, age ${Math.round(ageMs / 60000)}min`);
        return { ...cached, _cached: true };
      }
      if (cacheIsStale) logR("cache stale — jurnal actualizat dupa generare");
    }

    const [journal, meteoHistory] = await Promise.all([
      kv.get("livada:journal").catch(() => null),
      kv.get("livada:meteo:history").catch(() => null),
    ]);

    // Filter journal for current year
    const yearEntries = (journal || []).filter(
      (e) => e.date && e.date.startsWith(String(year)),
    );
    const journalSummary =
      yearEntries.length > 0
        ? yearEntries.map((e) => `${e.date}: [${e.type}] ${e.note}`).join("\n")
        : "Nicio interventie inregistrata in " + year + ".";

    // Filter meteo for current year
    const meteoEntries = Object.entries(meteoHistory || {}).filter(([d]) =>
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

    let todayRo = "";
    try {
      todayRo = new Intl.DateTimeFormat("ro-RO", {
        timeZone: "Europe/Bucharest",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());
    } catch {
      todayRo = new Date().toISOString().slice(0, 10);
    }
    const reportMessages = [
      {
        role: "system",
        content: `Esti consultant pomicol expert. Data de azi: ${todayRo}. Genereaza un RAPORT ANUAL detaliat pentru o livada din Nadlac, judetul Arad:
- 100+ pomi, 20 specii (cires, visin, cais, piersic, prun, migdal, par, mar, zmeur, mur, afin, alun, rodiu, kaki)
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

    const s = textSteps(reportMessages, { temperature: 0.4 });
    const attempts = [];
    const r = await runChain(
      [s.groqPrimary, s.groqFallback, s.geminiLite2, s.geminiLite1],
      { deadline: t0 + BUDGET_MS, log: logR, attempts },
    );
    await recordAiCalls(attempts);
    if (!r) return { error: "Serviciul AI nu a raspuns. Incearca din nou." };

    const payload = {
      report: r.text,
      year,
      journalCount: yearEntries.length,
      meteoDays: meteoEntries.length,
      generatedAt: Date.now(),
      _model: r.label,
      ...(r.index > 0
        ? { _fallback: true, _fallbackModel: r.label, _fallbackReason: r.reason }
        : {}),
    };

    // Salveaza in cache Redis cu TTL 1h
    await kv.set(cacheKey, payload, { ex: 3600 }).catch(() => {});
    return payload;
  });
}
