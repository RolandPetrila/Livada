// Shared auth, CORS, and rate-limit middleware for all API routes

const ALLOWED_ORIGIN = 'https://livada-mea-psi.vercel.app';

export function corsHeaders(req) {
  const origin = req?.headers?.get?.('origin') || '';
  const allowed =
    origin === ALLOWED_ORIGIN ||
    origin.endsWith('.vercel.app') ||
    origin.startsWith('http://localhost');

  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-livada-token',
  };
}

export function handleOptions(req) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * Verifica token-ul de autentificare.
 * Daca LIVADA_API_TOKEN nu e setat pe Vercel, lasa traficul sa treaca (backwards compat).
 * Daca e setat, cere header x-livada-token.
 * GET requests pe routes read-only (frost-alert, meteo-history) pot fi excluse.
 */
export function checkAuth(req) {
  const token = process.env.LIVADA_API_TOKEN;
  if (!token) return null; // no token configured, allow all

  const provided = req.headers.get('x-livada-token');
  if (provided === token) return null; // authorized

  return Response.json(
    { error: 'Neautorizat. Seteaza token-ul in Setari aplicatie.' },
    { status: 401, headers: corsHeaders(req) }
  );
}

/**
 * Basic rate limiting using in-memory Map.
 * Note: On Vercel serverless, state resets between cold starts.
 * For persistent rate limiting, use Upstash Redis.
 */
const rateLimitMap = new Map();
const RATE_WINDOW = 60_000; // 1 minute
const RATE_MAX = 10; // max requests per minute per IP

export function rateLimit(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return null;
  }

  entry.count++;
  if (entry.count > RATE_MAX) {
    return Response.json(
      { error: 'Prea multe cereri. Incearca din nou peste un minut.' },
      { status: 429, headers: corsHeaders(req) }
    );
  }

  return null;
}
