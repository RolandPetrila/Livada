import { Redis } from "@upstash/redis";
import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";
import { withTimeout } from "./_timeout.js";

// Edge Runtime: raspunsul e trimis imediat, fetch-ul Redis background e abandonat
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const rlErr = await rateLimit(req);
  if (rlErr) return rlErr;

  try {
    const kv = Redis.fromEnv();
    const [
      frost,
      disease,
      hail,
      wind,
      heat,
      rain,
      drought,
      spray,
      gdd,
      journal,
    ] = await Promise.all([
      withTimeout(kv.get("livada:frost-alert"), 5000).catch(() => null),
      withTimeout(kv.get("livada:disease-risk"), 5000).catch(() => null),
      withTimeout(kv.get("livada:alert-hail"), 5000).catch(() => null),
      withTimeout(kv.get("livada:alert-wind"), 5000).catch(() => null),
      withTimeout(kv.get("livada:alert-heat"), 5000).catch(() => null),
      withTimeout(kv.get("livada:alert-rain"), 5000).catch(() => null),
      withTimeout(kv.get("livada:alert-drought"), 5000).catch(() => null),
      withTimeout(kv.get("livada:alert-spray"), 5000).catch(() => null),
      withTimeout(kv.get("livada:gdd:annual"), 5000).catch(() => null),
      withTimeout(kv.get("livada:alert-journal"), 5000).catch(() => null),
    ]);

    return Response.json(
      {
        frost: frost || { active: false },
        disease: disease || { active: false },
        hail: hail || { active: false },
        wind: wind || { active: false },
        heat: heat || { active: false },
        rain: rain || { active: false },
        drought: drought || { active: false },
        spray: spray || { available: false },
        gdd: gdd || null,
        journal: journal || [],
      },
      {
        headers: {
          ...corsHeaders(req),
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch (err) {
    // Graceful fallback when KV not provisioned or unavailable
    return Response.json(
      {
        frost: { active: false },
        disease: { active: false },
        hail: { active: false },
        wind: { active: false },
        heat: { active: false },
        rain: { active: false },
        drought: { active: false },
        journal: [],
      },
      { headers: corsHeaders(req) },
    );
  }
}
