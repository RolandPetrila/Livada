import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const kv = Redis.fromEnv();
    const frost = (await kv.get('livada:frost-alert')) || { active: false };
    const disease = (await kv.get('livada:disease-risk')) || { active: false };

    return Response.json({ frost, disease });
  } catch (err) {
    // Graceful fallback when KV not provisioned
    return Response.json({
      frost: { active: false },
      disease: { active: false },
    });
  }
}
