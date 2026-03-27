// Shared auth, CORS, and rate-limit middleware for all API routes

const ALLOWED_ORIGINS = [
  'https://livada-mea-psi.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

// Helper: citeste header compatibil cu Web API Headers SI plain object (Node.js IncomingMessage)
function getHeader(req, name) {
  if (typeof req?.headers?.get === 'function') return req.headers.get(name);
  return req?.headers?.[name.toLowerCase()] ?? null;
}

export function corsHeaders(req) {
  const origin = getHeader(req, 'origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-livada-token',
  };
}

export function handleOptions(req) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function checkAuth(req) {
  const token = process.env.LIVADA_API_TOKEN;
  if (!token) return null;

  const provided = getHeader(req, 'x-livada-token');
  if (provided === token) return null;

  return Response.json(
    { error: 'Neautorizat. Seteaza token-ul in Setari aplicatie.' },
    { status: 401, headers: corsHeaders(req) }
  );
}

const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;
const RATE_MAX = 10;

export function rateLimit(req) {
  const ip = (getHeader(req, 'x-forwarded-for') || 'unknown').split(',')[0].trim();
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
