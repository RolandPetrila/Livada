import { Redis } from '@upstash/redis';
import { corsHeaders, handleOptions, rateLimit } from './_auth.js';

const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), ms)),
]);

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  const rlErr = rateLimit(req);
  if (rlErr) return rlErr;

  try {
    const kv = Redis.fromEnv();
    const [frost, disease] = await Promise.all([
      withTimeout(kv.get('livada:frost-alert'), 5000).catch(() => null),
      withTimeout(kv.get('livada:disease-risk'), 5000).catch(() => null),
    ]);

    return Response.json(
      { frost: frost || { active: false }, disease: disease || { active: false } },
      { headers: { ...corsHeaders(req), 'Cache-Control': 'public, max-age=300' } }
    );
  } catch (err) {
    // Graceful fallback when KV not provisioned or unavailable
    return Response.json(
      { frost: { active: false }, disease: { active: false } },
      { headers: corsHeaders(req) }
    );
  }
}
