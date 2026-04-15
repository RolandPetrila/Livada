import { corsHeaders, handleOptions, checkOrigin, rateLimit } from "./_auth.js";
import { getQuotaStatus } from "./_quota.js";

// Edge Runtime — health check pentru toate serviciile AI configurate
// T1 Sprint 1: include si quota usage per provider
// Sprint 2 fix: rate limit adaugat (era expus fara protectie)
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  const rlErr = await rateLimit(req); // 30 req/min default
  if (rlErr) return rlErr;

  const t0 = Date.now();

  // Verifica prezenta cheilor API (nu expune valorile, doar boolean)
  const status = {
    groq: !!process.env.GROQ_API_KEY,
    gemini: !!process.env.GOOGLE_AI_API_KEY,
    gemini2: !!process.env.GOOGLE_AI_API_KEY_2,
    github_models: !!process.env.GITHUB_MODELS_TOKEN,
    cerebras: !!process.env.CEREBRAS_API_KEY,
    plantnet: !!process.env.PLANTNET_API_KEY,
    plant_id: !!process.env.PLANT_ID_API_KEY,
    redis: !!(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ),
    blob: !!process.env.BLOB_READ_WRITE_TOKEN,
  };

  // T1: quota usage per provider (daca Redis indisponibil, quota e {error})
  const quota = await getQuotaStatus();

  console.log(`[ai-status] ${JSON.stringify(status)} t+${Date.now() - t0}ms`);

  return Response.json(
    { status, quota, ts: Date.now() },
    {
      headers: {
        ...corsHeaders(req),
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
