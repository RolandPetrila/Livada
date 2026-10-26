import { corsHeaders, handleOptions, checkOrigin, rateLimit } from "./_auth.js";
import { getQuotaStatus, getHealthStatus } from "./_quota.js";

// Edge Runtime — status servicii AI: cheie prezenta + ULTIMA STARE REALA (din apelurile
// reale consemnate de rute in Redis) + quota zilnica.
// `status[x]` e false daca lipseste cheia SAU ultimul apel real a esuat — ca panoul din UI
// sa nu mai arate "verde" un furnizor mort (incident 2026-10-27).
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const rlErr = await rateLimit(req); // 30 req/min default
  if (rlErr) return rlErr;

  const t0 = Date.now();
  const E = process.env;

  // Prezenta cheilor (nu expune valorile, doar boolean)
  const keys = {
    groq: !!E.GROQ_API_KEY,
    gemini: !!E.GOOGLE_AI_API_KEY,
    gemini2: !!E.GOOGLE_AI_API_KEY_2,
    gemini_lite: !!(E.GOOGLE_AI_API_KEY || E.GOOGLE_AI_API_KEY_2),
    mistral: !!E.MISTRAL_API_KEY,
    xai: !!E.XAI_API_KEY,
    plantnet: !!E.PLANTNET_API_KEY,
    plant_id: !!E.PLANT_ID_API_KEY,
    redis: !!(E.UPSTASH_REDIS_REST_URL && E.UPSTASH_REDIS_REST_TOKEN),
    blob: !!E.BLOB_READ_WRITE_TOKEN,
  };

  const [quota, health] = await Promise.all([getQuotaStatus(), getHealthStatus()]);

  const status = {};
  for (const [k, present] of Object.entries(keys)) {
    const h = health && !health.error ? health[k] : null;
    status[k] = present && !(h && h.ok === false);
  }

  console.log(`[ai-status] ${JSON.stringify(status)} t+${Date.now() - t0}ms`);

  return Response.json(
    { status, keys, health, quota, ts: Date.now() },
    {
      headers: {
        ...corsHeaders(req),
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
