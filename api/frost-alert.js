import { Redis } from '@upstash/redis';
import { corsHeaders, handleOptions, rateLimit, checkOrigin } from './_auth.js';

// Edge Runtime: raspunsul e trimis imediat, fetch-ul Redis background e abandonat
export const config = { runtime: 'edge' };

const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), ms)),
]);

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

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
