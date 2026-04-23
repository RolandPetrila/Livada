// Audit #1 — Expune VAPID_PUBLIC_KEY pentru frontend subscription
// Public key e safe sa fie citit de oricine (e public prin design)
import { corsHeaders, handleOptions } from "./_auth.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);
  const pub = process.env.VAPID_PUBLIC_KEY || "";
  return Response.json(
    { publicKey: pub, configured: pub.length > 0 },
    {
      headers: {
        ...corsHeaders(req),
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
