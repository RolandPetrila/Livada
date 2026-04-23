// Audit #1 — Web Push VAPID subscribe/unsubscribe endpoint (Edge Runtime)
// POST: salveaza subscription in Redis (key: livada:push-subs, set de JSON strings)
// DELETE: elimina subscription dupa endpoint
import { Redis } from "@upstash/redis";
import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";

export const config = { runtime: "edge" };

const SUBS_KEY = "livada:push-subs";

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const rlErr = await rateLimit(req, 10);
  if (rlErr) return rlErr;

  let kv;
  try {
    kv = Redis.fromEnv();
  } catch {
    return Response.json(
      { error: "Redis nu este configurat" },
      { status: 503, headers: corsHeaders(req) },
    );
  }

  try {
    const body = await req.json();
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.auth || !sub?.keys?.p256dh) {
      return Response.json(
        { error: "Subscription invalida (lipseste endpoint/keys)" },
        { status: 400, headers: corsHeaders(req) },
      );
    }

    // Folosim SADD + SREM — set natural dedup pe JSON string
    // (acelasi user care re-subscribe nu dubleaza)
    const subJson = JSON.stringify(sub);

    if (req.method === "DELETE" || body?.action === "unsubscribe") {
      await kv.srem(SUBS_KEY, subJson);
      return Response.json(
        { ok: true, action: "unsubscribed" },
        { headers: corsHeaders(req) },
      );
    }

    await kv.sadd(SUBS_KEY, subJson);
    return Response.json(
      { ok: true, action: "subscribed" },
      { headers: corsHeaders(req) },
    );
  } catch (err) {
    return Response.json(
      { error: "Eroare salvare subscription", detail: err?.message },
      { status: 500, headers: corsHeaders(req) },
    );
  }
}
