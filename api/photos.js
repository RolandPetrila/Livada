import { put, list, del } from "@vercel/blob";
import {
  corsHeaders,
  handleOptions,
  checkAuth,
  rateLimit,
  checkOrigin,
} from "./_auth.js";

export const config = { maxDuration: 10 };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  try {
    // GET — list photos (optionally filtered by species) — public, rate-limited
    if (req.method === "GET") {
      const rlErr = rateLimit(req);
      if (rlErr) return rlErr;
      const url = new URL(req.url, "http://localhost");
      const rawSpecies = (url.searchParams.get("species") || "").replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );
      const prefix = rawSpecies
        ? `livada/photos/${rawSpecies}/`
        : "livada/photos/";

      const result = await list({ prefix });
      const photos = result.blobs.map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      }));

      return Response.json(photos, { headers: corsHeaders(req) });
    }

    // POST/DELETE require auth + rate limit
    const authErr = checkAuth(req);
    if (authErr) return authErr;
    const limitErr = rateLimit(req);
    if (limitErr) return limitErr;

    // POST — upload a photo
    if (req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file");
      let species = (formData.get("species") || "general").replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );
      if (!species) species = "general";

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
      const pathname = `livada/photos/${species}/${timestamp}.${ext}`;

      const blob = await put(pathname, file, {
        access: "public",
        contentType: file.type,
      });

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
}
