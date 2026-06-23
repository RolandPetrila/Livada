import { put, list, del } from "@vercel/blob";
import { Redis } from "@upstash/redis";
import {
  corsHeaders,
  handleOptions,
  checkAuth,
  rateLimit,
  checkOrigin,
} from "./_auth.js";

export const config = { maxDuration: 10 };

// Cache lista foto in Redis. Blob `list()` poate fi lent (cold start Node + latenta
// store) → cauza 504 FUNCTION_INVOCATION_TIMEOUT pe aceasta ruta (singura Node, 10s Hobby).
// Strategie: citire din cache (rapid), list() cu timeout (fara 504), invalidare la write.
const PHOTO_CACHE_TTL = 3600; // 1h; oricum invalidata la upload/delete (doar acest app scrie)
const LIST_LIMIT = 1000;

function photoCacheKey(species) {
  return `livada:photos:list:${species || "_all"}`;
}
function getRedis() {
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}
async function invalidatePhotoCache(species) {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(photoCacheKey(species), photoCacheKey(""));
  } catch {
    /* best-effort */
  }
}

// Vercel Node runtime: `export default function` = handler legacy (req,res) → Response-ul
// e ignorat → 504 pe orice metoda. Forma Web Standard `{ async fetch(request) }` primeste
// un Request real (cu .formData()/.json()) si trimite Response-ul corect. (Fix 2026-06-24)
export default {
  async fetch(req) {
    if (req.method === "OPTIONS") return handleOptions(req);

    const originErr = checkOrigin(req);
    if (originErr) return originErr;

    try {
      // GET — list photos (optionally filtered by species) — public, rate-limited
      if (req.method === "GET") {
        const rlErr = await rateLimit(req);
        if (rlErr) return rlErr;
        const url = new URL(req.url, "http://localhost");
        const rawSpecies = (url.searchParams.get("species") || "").replace(
          /[^a-zA-Z0-9_-]/g,
          "",
        );
        const prefix = rawSpecies
          ? `livada/photos/${rawSpecies}/`
          : "livada/photos/";

        const diag = url.searchParams.get("diag") === "1";
        const key = photoCacheKey(rawSpecies);
        const redis = getRedis();

        // Fast path — cache Redis
        if (redis && !diag) {
          try {
            const cached = await redis.get(key);
            if (cached) {
              return Response.json(cached, {
                headers: { ...corsHeaders(req), "X-Photos-Cache": "HIT" },
              });
            }
          } catch {
            /* cache miss/eroare — continua la list() */
          }
        }

        // list() cu timeout strict — nu mai depasim maxDuration (fara 504)
        const t0 = Date.now();
        const timeoutMs = diag ? 9000 : 7000;
        let photos = null;
        let timedOut = false;
        try {
          const result = await Promise.race([
            list({ prefix, limit: LIST_LIMIT }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("blob-list-timeout")),
                timeoutMs,
              ),
            ),
          ]);
          photos = result.blobs.map((b) => ({
            url: b.url,
            pathname: b.pathname,
            size: b.size,
            uploadedAt: b.uploadedAt,
          }));
          if (redis) {
            try {
              await redis.set(key, photos, { ex: PHOTO_CACHE_TTL });
            } catch {
              /* best-effort */
            }
          }
        } catch (e) {
          timedOut = String((e && e.message) || e).includes("timeout");
          // Degradare grațioasa: cache vechi daca exista, altfel gol (fara 504/500)
          if (redis) {
            try {
              const stale = await redis.get(key);
              if (stale) photos = stale;
            } catch {
              /* ignore */
            }
          }
          if (!photos) photos = [];
        }
        const ms = Date.now() - t0;

        if (diag) {
          return Response.json(
            {
              count: Array.isArray(photos) ? photos.length : -1,
              ms,
              timedOut,
              prefix,
            },
            { headers: corsHeaders(req) },
          );
        }

        return Response.json(photos, {
          headers: {
            ...corsHeaders(req),
            "X-Photos-Cache": "MISS",
            "X-Photos-List-Ms": String(ms),
          },
        });
      }

      // POST/DELETE require auth + rate limit
      const authErr = checkAuth(req);
      if (authErr) return authErr;
      const limitErr = await rateLimit(req);
      if (limitErr) return limitErr;

      // POST — upload a photo
      if (req.method === "POST") {
        let formData;
        try {
          formData = await req.formData();
        } catch {
          return Response.json(
            { error: "Date formular invalide" },
            { status: 400, headers: corsHeaders(req) },
          );
        }
        const file = formData.get("file");
        let species = (formData.get("species") || "general").replace(
          /[^a-zA-Z0-9_-]/g,
          "",
        );
        if (!species) species = "general";
        // I3: leaga poza de un pom anume (optional) — encodat in pathname
        const treeId = (formData.get("treeId") || "").replace(
          /[^a-zA-Z0-9_-]/g,
          "",
        );

        if (!file) {
          return Response.json(
            { error: "Niciun fisier selectat" },
            { status: 400, headers: corsHeaders(req) },
          );
        }

        // Validate file type
        const validTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
        ];
        if (!validTypes.includes(file.type)) {
          return Response.json(
            { error: "Format invalid. Acceptat: JPG, PNG, WebP, HEIC" },
            { status: 400, headers: corsHeaders(req) },
          );
        }

        // Limit 5MB
        if (file.size > 5 * 1024 * 1024) {
          return Response.json(
            { error: "Fisierul depaseste 5MB" },
            { status: 400, headers: corsHeaders(req) },
          );
        }

        const timestamp = Date.now();
        const allowedExt = ["jpg", "jpeg", "png", "webp", "heic"];
        let ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
        if (!allowedExt.includes(ext)) ext = "jpg";
        const pathname = treeId
          ? `livada/photos/${species}/${treeId}__${timestamp}.${ext}`
          : `livada/photos/${species}/${timestamp}.${ext}`;

        const blob = await put(pathname, file, {
          access: "public",
          contentType: file.type,
        });

        // Invalideaza cache-ul listei pt specia respectiva → poza noua apare imediat
        await invalidatePhotoCache(species);

        return Response.json(
          {
            url: blob.url,
            pathname: blob.pathname,
            uploadedAt: new Date().toISOString(),
          },
          { headers: corsHeaders(req) },
        );
      }

      // DELETE — remove a photo
      if (req.method === "DELETE") {
        let body;
        try {
          body = await req.json();
        } catch {
          return Response.json(
            { error: "Body invalid" },
            { status: 400, headers: corsHeaders(req) },
          );
        }
        const { url } = body;
        if (!url) {
          return Response.json(
            { error: "URL lipsa" },
            { status: 400, headers: corsHeaders(req) },
          );
        }
        if (!url.includes(".public.blob.vercel-storage.com/livada/photos/")) {
          return Response.json(
            { error: "URL invalid — nu apartine acestui proiect" },
            { status: 400, headers: corsHeaders(req) },
          );
        }
        await del(url);
        // Invalideaza cache-ul listei pt specia din URL (+ cheia _all)
        try {
          const m = url.match(/\/livada\/photos\/([a-zA-Z0-9_-]+)\//);
          await invalidatePhotoCache(m ? m[1] : "");
        } catch {
          /* best-effort */
        }
        return Response.json({ ok: true }, { headers: corsHeaders(req) });
      }

      return Response.json(
        { error: "Metoda nepermisa" },
        { status: 405, headers: corsHeaders(req) },
      );
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes("BLOB_READ_WRITE_TOKEN") || msg.includes("Missing")) {
        return Response.json(
          {
            error:
              "Vercel Blob nu este configurat. Provisoneaza un Blob store din Vercel Dashboard → Storage.",
          },
          { status: 503, headers: corsHeaders(req) },
        );
      }
      console.error("API photos error:", msg);
      return Response.json(
        { error: "Eroare la procesare. Incercati din nou." },
        { status: 500, headers: corsHeaders(req) },
      );
    }
  },
};
