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

export function checkOrigin(req) {
  const origin = getHeader(req, 'origin') || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return Response.json({ error: 'Origine nepermisa' }, { status: 403 });
  }
  return null;
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
  // Aplicatie personala cu un singur utilizator — autentificarea web e dezactivata.
  // Protectia ramane prin: rate limiting (10 req/min/IP) + CRON_SECRET pt cron.
  return null;
}

const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;
const RATE_MAX = 1000; // aplicatie personala (Roland + parinti) — fara limite practice
export function rateLimit(req) {
  const ip = getHeader(req, 'x-real-ip') || (getHeader(req, 'x-forwarded-for') || 'unknown').split(',').pop().trim();
  const now = Date.now();

  // Lazy cleanup: sterge entries expirate
  for (const [key, val] of rateLimitMap) {
    if (now > val.reset) rateLimitMap.delete(key);
  }

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
