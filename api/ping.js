import { corsHeaders, handleOptions } from "./_auth.js";
import { Redis } from "@upstash/redis";

// Health check server: raspunde mereu 200 daca Edge runtime traieste.
// Varsta cronului meteo ramane vizibila in body (cron.stale, cron.ageMinutes),
// dar nu mai triggereaza alarma externa — GitHub Actions cron are delay-uri
// best-effort (2-3h) care produceau false positive pe UptimeRobot.
export const config = { runtime: "edge" };

const STALE_THRESHOLD_MS = 90 * 60 * 1000;

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

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

  const body = {
    ok: true,
    t: now,
    cron,
    cronStale: stale,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(req),
    },
  });
}
