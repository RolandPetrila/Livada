import { corsHeaders, handleOptions, rateLimit } from "./_auth.js";
import { Redis } from "@upstash/redis";

// H3 Sprint 1: health check extins — verifica si varsta cronului meteo
// Util pentru UptimeRobot sau alt monitor extern: daca cronul cade (ca 2026-04-14),
// ping returneaza 503 cu stale:true si monitorul trimite notificare.
// Sprint 2 fix: rate limit 60/min adaugat (UptimeRobot 5min + browser = under limit)
export const config = { runtime: "edge" };

// Cron meteo ar trebui sa ruleze orar (:05) si zilnic 02:00 UTC.
// Daca ultima executie reusita e > 90 min in urma → stale.
const STALE_THRESHOLD_MS = 90 * 60 * 1000;

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  // Rate limit mai permisiv pt health check (60/min) — UptimeRobot + browser + dev tools
  const rlErr = await rateLimit(req, 60);
  if (rlErr) return rlErr;

  const now = Date.now();
  let cron = null;
  let stale = false;

  try {
    const kv = Redis.fromEnv();
    // Timeout 1s — ping trebuie sa fie rapid
    const lastRun = await Promise.race([
      kv.get("livada:cron:last-run"),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 1000),
      ),
    ]);
    if (lastRun && typeof lastRun === "object") {
      const ts = Number(lastRun.timestamp) || 0;
      const ageMs = now - ts;
      cron = {
        lastRun: ts ? new Date(ts).toISOString() : null,
        success: !!lastRun.success,
        ageMinutes: ts ? Math.round(ageMs / 60000) : null,
        stale: ts ? ageMs > STALE_THRESHOLD_MS || !lastRun.success : true,
      };
      stale = cron.stale;
    } else {
      cron = { lastRun: null, stale: true, reason: "no_data" };
      stale = true;
    }
  } catch (err) {
    cron = { stale: null, error: err.message || "redis_error" };
    // Nu marcam stale=true doar din cauza Redis — pinger-ul extern decide
  }

  const status = stale ? 503 : 200;
  const body = {
    ok: !stale,
    t: now,
    cron,
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(req),
    },
  });
}
