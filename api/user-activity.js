// C Sprint 3: Backend activity log pentru audit user-facing
// Accepta POST cu batch de events → scrie in Redis list livada:user-activity
// GET returneaza ultimele 200 intrari (pentru dashboard sau debug)
//
// Threat model: uz personal Roland + parinti, site obscur. Nu stocam PII.
// Events contin doar: ts, module (20), action (40), status (20), detail (100).

import { Redis } from "@upstash/redis";
import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";
import { withTimeout } from "./_timeout.js";

export const config = { runtime: "edge" };

const KEY = "livada:user-activity";
const MAX_ENTRIES = 1000; // rolling window
const MAX_BATCH_SIZE = 50; // per POST

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  // Rate limit permisiv pe client (frontend batch-uieste 5 events or 10s)
  // 30 req/min per IP = max 150 events/min per user — suficient pt orice
  const rlErr = await rateLimit(req);
  if (rlErr) return rlErr;

  const hdrs = corsHeaders(req);

  let kv;
  try {
    kv = Redis.fromEnv();
  } catch {
    return Response.json(
      { error: "Storage indisponibil" },
      { status: 503, headers: hdrs },
    );
  }

  if (req.method === "POST") {
    // Parse cu size limit — max 50KB payload
    let body;
    try {
      const text = await req.text();
      if (text.length > 50_000) {
        return Response.json(
          { error: "Payload prea mare" },
          { status: 413, headers: hdrs },
        );
      }
      body = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "Body invalid" },
        { status: 400, headers: hdrs },
      );
    }

    const events = Array.isArray(body.events) ? body.events : [body];
    if (events.length === 0 || events.length > MAX_BATCH_SIZE) {
      return Response.json(
        { error: "Batch invalid (1-50 events)" },
        { status: 400, headers: hdrs },
      );
    }

    // Sanitizeaza fiecare event — nu acceptam campuri libere
    const sanitized = [];
    for (const e of events) {
      if (!e || typeof e !== "object") continue;
      const ts = Number(e.ts) || Date.now();
      if (ts < 0 || ts > Date.now() + 86400_000) continue; // reject absurd
      sanitized.push({
        ts,
        module: String(e.module || "").substring(0, 20),
        action: String(e.action || "").substring(0, 40),
        status: String(e.status || "").substring(0, 20),
        detail: String(e.detail || "").substring(0, 100),
        ip: req.headers?.get?.("x-real-ip") || null,
      });
    }
    if (sanitized.length === 0) {
      return Response.json(
        { ok: true, written: 0 },
        { status: 200, headers: hdrs },
      );
    }

    try {
      // Pipeline: LPUSH toate + LTRIM pt rolling window
      const pipeline = kv.pipeline();
      for (const ev of sanitized) {
        pipeline.lpush(KEY, JSON.stringify(ev));
      }
      pipeline.ltrim(KEY, 0, MAX_ENTRIES - 1);
      await withTimeout(pipeline.exec(), 3000);
      return Response.json(
        { ok: true, written: sanitized.length },
        { status: 200, headers: hdrs },
      );
    } catch (err) {
      console.error("user-activity POST error:", err.message);
      return Response.json(
        { error: "Scriere esuata" },
        { status: 503, headers: hdrs },
      );
    }
  }

  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const limit = Math.min(
        Math.max(
          parseInt(url.searchParams.get("limit") || "100", 10) || 100,
          1,
        ),
        MAX_ENTRIES,
      );
      const raw = await withTimeout(kv.lrange(KEY, 0, limit - 1), 3000).catch(
        () => [],
      );
      const events = [];
      for (const r of raw || []) {
        try {
          events.push(typeof r === "string" ? JSON.parse(r) : r);
        } catch {
          // entry corupt — skip
        }
      }
      return Response.json(
        { events, count: events.length },
        {
          status: 200,
          headers: { ...hdrs, "Cache-Control": "no-store" },
        },
      );
    } catch (err) {
      console.error("user-activity GET error:", err.message);
      return Response.json(
        { events: [], error: "Citire esuata" },
        { status: 503, headers: hdrs },
      );
    }
  }

  return Response.json(
    { error: "Metoda nepermisa" },
    { status: 405, headers: hdrs },
  );
}
