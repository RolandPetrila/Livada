export const runtime = 'edge';
export default async function handler(req) {
  return new Response(JSON.stringify({ ok: true, t: Date.now() }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
