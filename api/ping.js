import { corsHeaders, handleOptions } from './_auth.js';

export const runtime = 'edge';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  return new Response(JSON.stringify({ ok: true, t: Date.now() }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) }
  });
}
