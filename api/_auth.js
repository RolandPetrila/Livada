// Shared auth, CORS, and rate-limit middleware for all API routes
import { Redis } from "@upstash/redis";

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

// M8: 30 req/min general; AI endpoints (ask, diagnose, report) folosesc rateLimit(req, 10)
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60_000;

// T2 (Sprint 1): in-memory sliding window fallback cand Redis cade
// Scope: per Edge instance (nu cross-instance), safety net previne DDoS
// Atunci cand Upstash are downtime sau timeout (fail-closed contra fail-open initial)
const _memBuckets = new Map(); // IP → array timestamps

function rateLimitInMemory(ip, max, windowMs) {
  const now = Date.now();
  const arr = (_memBuckets.get(ip) || []).filter((ts) => now - ts < windowMs);
  arr.push(now);
  _memBuckets.set(ip, arr);
  // Cleanup periodic best-effort daca Map-ul creste
  if (_memBuckets.size > 1000) {
    for (const [k, v] of _memBuckets) {
      if (!v.length || now - v[v.length - 1] > windowMs * 2) {
        _memBuckets.delete(k);
      }
    }
  }
  return arr.length > max;
}

// H2: folosim DOAR x-real-ip (de incredere de la Vercel) — x-forwarded-for e spoofabil
// Redis-based rate limiting — persistent cross-isolate pe Vercel Edge
// Fallback in-memory cand Redis cade (T2 Sprint 1 — fail-closed)
export async function rateLimit(req, maxOverride) {
  const max = maxOverride !== undefined ? maxOverride : RATE_MAX;
  const ip = getHeader(req, "x-real-ip") || "unknown";
  // Bucket per-ruta: fiecare endpoint are propriul contor. Altfel un singur contor
  // per-IP era partajat de TOATE rutele, iar traficul general (meteo/journal/ai-status/...)
  // umplea pragul mic al AI-ului (10) → "Prea multe cereri" la prima intrebare. (Fix 2026-06-24)
  let bucket = "gen";
  try {
    bucket =
      new URL(req.url, "http://localhost").pathname
        .replace(/[^a-z0-9]/gi, "")
        .slice(0, 24) || "gen";
  } catch {
    /* req.url indisponibil → bucket implicit */
  }
  const key = `livada:rl:${bucket}:${ip}`;

  try {
    const kv = Redis.fromEnv();
    // Pipeline INCR + EXPIRE atomic — evita race condition TTL
    const pipeline = kv.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60); // fereastra 60s
    // Timeout strict 1.5s — daca Redis lent, fallback in-memory
    const [count] = await Promise.race([
      pipeline.exec(),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Redis RL timeout")), 1500),
      ),
    ]);

    if (count > max) {
      return Response.json(
        { error: "Prea multe cereri. Incearca din nou peste un minut." },
        { status: 429, headers: corsHeaders(req) },
      );
    }
    return null;
  } catch {
    // Redis indisponibil — fallback in-memory (fail-closed, nu fail-open)
    if (rateLimitInMemory(bucket + ":" + ip, max, RATE_WINDOW_MS)) {
      return Response.json(
        { error: "Prea multe cereri. Incearca din nou peste un minut." },
        { status: 429, headers: corsHeaders(req) },
      );
    }
    return null;
  }
}
