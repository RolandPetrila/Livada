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
    // O singura comanda Redis (MGET) in loc de 10 GET-uri separate — reduce
    // command-count Upstash de ~10x pe ruta cea mai apelata (load + polling).
    const ALERT_KEYS = [
      "livada:frost-alert",
      "livada:disease-risk",
      "livada:alert-hail",
      "livada:alert-wind",
      "livada:alert-heat",
      "livada:alert-rain",
      "livada:alert-drought",
      "livada:alert-spray",
      "livada:gdd:annual",
      "livada:alert-journal",
    ];
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
    ] = await withTimeout(kv.mget(...ALERT_KEYS), 5000).catch(() =>
      new Array(ALERT_KEYS.length).fill(null),
    );

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
