import { Redis } from "@upstash/redis";
import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";

// Edge Runtime: raspunsul e trimis imediat, fetch-ul Redis background e abandonat
export const config = { runtime: "edge" };

const withTimeout = (p, ms) =>
  Promise.race([
    p,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis timeout")), ms),
    ),
  ]);

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const rlErr = await rateLimit(req);
  if (rlErr) return rlErr;

  let kv;
  try {
    kv = Redis.fromEnv();
  } catch {
    return Response.json(
      { error: "KV nu este configurat" },
      { status: 503, headers: corsHeaders(req) },
    );
  }

  try {
    const url = new URL(req.url);
    const days = Math.min(
      Math.max(parseInt(url.searchParams.get("days") || "30", 10) || 30, 1),
      365,
    );

    const raw = await withTimeout(kv.get("livada:meteo:history"), 5000).catch(
      (e) => {
        console.error("meteo-history Redis timeout:", e.message);
        return null;
      },
    );

    // Validare: asigura ca raw e obiect (nu array, nu null, nu string)
    const history =
      raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

    // Filter to requested number of days; validare fiecare entry
    const dates = Object.keys(history)
      .sort()
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .slice(-days);
    const filtered = {};
    for (const d of dates) {
      const entry = history[d];
      if (entry && typeof entry === "object") filtered[d] = entry;
    }

    return Response.json(filtered, {
      headers: { ...corsHeaders(req), "Cache-Control": "public, max-age=1800" },
    });
  } catch (err) {
    // M4: nu expune detalii eroare in raspuns public
    console.error("[meteo-history]", err.message);
    return Response.json(
      { error: "Eroare interna server" },
      { status: 500, headers: corsHeaders(req) },
    );
  }
}
