import { Redis } from '@upstash/redis';
import { corsHeaders, handleOptions } from './_auth.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  try {
    const kv = Redis.fromEnv();
    const frost = (await kv.get('livada:frost-alert')) || { active: false };
    const disease = (await kv.get('livada:disease-risk')) || { active: false };

    return Response.json({ frost, disease }, { headers: corsHeaders(req) });
  } catch (err) {
    // Graceful fallback when KV not provisioned
    return Response.json({
      frost: { active: false },
      disease: { active: false },
    }, { headers: corsHeaders(req) });
  }
}
