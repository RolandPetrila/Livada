// Shared auth, CORS, and rate-limit middleware for all API routes

// M2: localhost permis doar in development — nu in productie
const ALLOWED_ORIGINS = [
  "https://livada-mea-psi.vercel.app",
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://localhost:5173"]
    : []),
];

// Helper: citeste header compatibil cu Web API Headers SI plain object (Node.js IncomingMessage)
function getHeader(req, name) {
  if (typeof req?.headers?.get === "function") return req.headers.get(name);
  return req?.headers?.[name.toLowerCase()] ?? null;
}

// Regex pt URL-uri preview Vercel ale acestui proiect (orice deployment CLI)
const ALLOWED_ORIGIN_RE =
  /^https:\/\/livada-[a-z0-9]+-rolandpetrilas-projects\.vercel\.app$/;

export function checkOrigin(req) {
  const origin = getHeader(req, "origin") || "";
  // Permis: fara origin (server-to-server/cron), 'null' (PWA standalone Android/iOS),
  //         origine exacta in allowlist, sau URL preview Vercel al proiectului
  if (
    !origin ||
    origin === "null" ||
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGIN_RE.test(origin)
  ) {
    return null;
  }
  return Response.json({ error: "Origine nepermisa" }, { status: 403 });
}

export function corsHeaders(req) {
  const origin = getHeader(req, "origin") || "";
  const allowed =
    !origin ||
    origin === "null" ||
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGIN_RE.test(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin || ALLOWED_ORIGINS[0] : "",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-livada-token",
  };
}

export function handleOptions(req) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

// C4: Auth re-activata. Daca LIVADA_API_TOKEN e setat si >= 16 chars in Vercel env,
//     toate endpoint-urile sensibile cer x-livada-token header.
//     Daca token-ul nu e setat (sau e prea scurt) — skip (backward compat).
export function checkAuth(req) {
  const expected = process.env.LIVADA_API_TOKEN || "";
  if (!expected || expected.length < 16) return null;
  const token = getHeader(req, "x-livada-token") || "";
  if (token !== expected) {
    return Response.json({ error: "Neautorizat" }, { status: 401 });
  }
  return null;
}

const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;
// M8: 30 req/min general; AI endpoints (ask, diagnose, report) folosesc rateLimit(req, 10)
const RATE_MAX = 30;
// H2: folosim DOAR x-real-ip (de incredere de la Vercel) — x-forwarded-for e spoofabil
export function rateLimit(req, maxOverride) {
  const max = maxOverride !== undefined ? maxOverride : RATE_MAX;
  const ip = getHeader(req, "x-real-ip") || "unknown";
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
  if (entry.count > max) {
    return Response.json(
      { error: "Prea multe cereri. Incearca din nou peste un minut." },
      { status: 429, headers: corsHeaders(req) },
    );
  }

  return null;
}
