import { corsHeaders, handleOptions, checkOrigin } from "./_auth.js";

// Edge Runtime — health check pentru toate serviciile AI configurate
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

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

  console.log(`[ai-status] ${JSON.stringify(status)} t+${Date.now() - t0}ms`);

  return Response.json(
    { status, ts: Date.now() },
    { headers: corsHeaders(req) },
  );
}
