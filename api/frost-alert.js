import { Redis } from '@upstash/redis';
import { corsHeaders, handleOptions, rateLimit } from './_auth.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  const rlErr = rateLimit(req);
  if (rlErr) return rlErr;

  try {
    const kv = Redis.fromEnv();
    const frost = (await kv.get('livada:frost-alert')) || { active: false };
    const disease = (await kv.get('livada:disease-risk')) || { active: false };

    return Response.json({ frost, disease }, { headers: { ...corsHeaders(req), 'Cache-Control': 'public, max-age=300' } });
  } catch (err) {
    // Graceful fallback when KV not provisioned
    return Response.json({
      frost: { active: false },
      disease: { active: false },
    }, { headers: corsHeaders(req) });
  }
}
