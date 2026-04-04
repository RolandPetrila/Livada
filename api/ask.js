export default async function handler(req) {
  console.log('[ask] bare minimum, method:', req.method);
  return new Response(JSON.stringify({ answer: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
