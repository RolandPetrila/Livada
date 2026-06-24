// A doua parere de la Cerebras — endpoint NODE (nu Edge).
// Cerebras e in spatele Cloudflare, care blocheaza cu 403 (managed challenge) cererile
// venite de la Vercel Edge. Runtime Node (IP datacenter normal) are sanse sa treaca.
// Forma `export default { fetch }` = Web Standard pe Node (NU `export default function` → 504).
import { corsHeaders, handleOptions, checkOrigin, rateLimit } from "./_auth.js";

export const config = { maxDuration: 15 };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default {
  async fetch(req) {
    if (req.method === "OPTIONS") return handleOptions(req);
    const originErr = checkOrigin(req);
    if (originErr) return originErr;

    // DIAG temporar: lista modelelor disponibile pt cheia curenta (?models=1)
    try {
      const u = new URL(req.url, "http://x");
      if (u.searchParams.get("models") === "1") {
        const mr = await fetch("https://api.cerebras.ai/v1/models", {
          headers: {
            Authorization: `Bearer ${process.env.CEREBRAS_API_KEY || ""}`,
            "User-Agent": UA,
            Accept: "application/json",
          },
        });
        const mb = await mr.text();
        return Response.json(
          { status: mr.status, body: mb.substring(0, 1200) },
          { headers: corsHeaders(req) },
        );
      }
    } catch (e) {
      return Response.json(
        { error: String(e && e.message) },
        { headers: corsHeaders(req) },
      );
    }

    if (req.method !== "POST")
      return Response.json(
        { error: "Metoda nepermisa" },
        { status: 405, headers: corsHeaders(req) },
      );
    const rl = await rateLimit(req, 12);
    if (rl) return rl;

    const KEY = process.env.CEREBRAS_API_KEY;
    if (!KEY)
      return Response.json(
        { error: "CEREBRAS_API_KEY lipsa" },
        { status: 500, headers: corsHeaders(req) },
      );

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Body invalid" },
        { status: 400, headers: corsHeaders(req) },
      );
    }
    const question = (body.question || "").trim();
    if (!question)
      return Response.json(
        { error: "Scrie o intrebare" },
        { status: 400, headers: corsHeaders(req) },
      );
    const species = body.species || "general";
    const context = body.context ? String(body.context).substring(0, 8000) : "";

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

    const sys = `Esti consultant pomicol expert, livezi Nadlac/Arad (climat continental, sol cernoziom pH 7-8). Data de azi: ${todayRo}. Raspunde DOAR in romana, detaliat si practic. Specia curenta: ${species}.`;
    const userMsg =
      (context ? `Documentatie de referinta:\n${context}\n\n---\n` : "") +
      `Intrebarea pomicultorului: ${question.substring(0, 8000)}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 14000);
    try {
      const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${KEY}`,
          "User-Agent": UA,
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: userMsg },
          ],
          max_tokens: 8192,
          temperature: 0.3,
        }),
      });
      clearTimeout(timer);
      if (!res.ok) {
        const eb = await res.text().catch(() => "");
        return Response.json(
          {
            error: "Cerebras HTTP " + res.status,
            _detail: eb.replace(/\s+/g, " ").substring(0, 200),
          },
          { status: 503, headers: corsHeaders(req) },
        );
      }
      const j = await res.json();
      const answer =
        j.choices?.[0]?.message?.content || "Nu am putut genera un raspuns.";
      return Response.json(
        { answer, _model: "cerebras-llama-3.3-70b" },
        { headers: corsHeaders(req) },
      );
    } catch (e) {
      clearTimeout(timer);
      return Response.json(
        { error: "Cerebras: " + (e.message || "eroare") },
        { status: 503, headers: corsHeaders(req) },
      );
    }
  },
};
