import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  // Rate limit restrictiv — 3 req/min (previne spam, Open-Meteo e gratuit)
  const rlErr = await rateLimit(req, 3);
  if (rlErr) return rlErr;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "Serviciu indisponibil" },
      { status: 503, headers: corsHeaders(req) },
    );
  }

  try {
    // Apeleaza meteo-cron cu CRON_SECRET server-side. Origine HARDCODATA (nu derivata
    // din req.url) ca CRON_SECRET sa nu poata pleca vreodata catre un Host falsificat.
    const origin = "https://livada-mea-psi.vercel.app";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 22000);
    const res = await fetch(`${origin}/api/meteo-cron`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    const body = await res.json();
    return Response.json(body, {
      status: res.status,
      headers: { ...corsHeaders(req), "Cache-Control": "no-cache" },
    });
  } catch (err) {
    return Response.json(
      { error: "Actualizare esuata: " + (err.message || "timeout") },
      { status: 502, headers: corsHeaders(req) },
    );
  }
}
