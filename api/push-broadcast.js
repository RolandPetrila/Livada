// Audit #1 — Web Push VAPID broadcast (Node.js Runtime)
// web-push library depinde de Node crypto → NU Edge Runtime.
// Cheamat de meteo-cron cu Bearer CRON_SECRET.
//
// Primeste: { alerts: [{ type, title, body, severity, date }] }
// Trimite notificare Web Push la toti subscriberii salvati in Redis.
// Cleanup automat: subscription-uri care intorc 410 Gone se sterg.
import { Redis } from "@upstash/redis";
import webpush from "web-push";

const SUBS_KEY = "livada:push-subs";
const SENT_KEY_PREFIX = "livada:push-sent:"; // dedup server-side 24h

// M5 dedupe: evita sa trimitem de 24x/zi aceeasi alerta (un per ora).
// Cheia: `livada:push-sent:<type>:<date>` cu TTL 24h.
async function wasSentToday(kv, type, date) {
  const k = `${SENT_KEY_PREFIX}${type}:${date}`;
  const existing = await kv.get(k);
  if (existing) return true;
  await kv.set(k, 1, { ex: 24 * 3600 });
  return false;
}

function readJsonBody(req) {
  // Vercel Node.js runtime parseaza automat dar fallback manual pt safety
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  // Node.js runtime request/response API diferita de Edge
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metoda nepermisa" });
    return;
  }

  // Auth: CRON_SECRET (apelul vine din meteo-cron Edge) sau
  //       skip auth daca request e din acelasi project via server-to-server
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization || "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Neautorizat" });
    return;
  }

  const vapidPub = process.env.VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  const vapidContact =
    process.env.VAPID_CONTACT || "mailto:petrilarolly@gmail.com";
  if (!vapidPub || !vapidPriv) {
    res.status(503).json({
      error: "VAPID_PUBLIC_KEY sau VAPID_PRIVATE_KEY lipsesc in env vars",
    });
    return;
  }

  webpush.setVapidDetails(vapidContact, vapidPub, vapidPriv);

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    res.status(400).json({ error: "JSON invalid" });
    return;
  }

  const alerts = Array.isArray(body?.alerts) ? body.alerts : [];
  if (alerts.length === 0) {
    res
      .status(200)
      .json({ ok: true, sent: 0, skipped: 0, reason: "no_alerts" });
    return;
  }

  let kv;
  try {
    kv = Redis.fromEnv();
  } catch {
    res.status(503).json({ error: "Redis indisponibil" });
    return;
  }

  // Filtreaza alertele deja trimise azi
  const alertsToSend = [];
  for (const a of alerts) {
    if (!a?.type || !a?.body) continue;
    const date = a.date || new Date().toISOString().slice(0, 10);
    const already = await wasSentToday(kv, a.type, date);
    if (!already) {
      alertsToSend.push({
        ...a,
        date,
      });
    }
  }
  if (alertsToSend.length === 0) {
    res
      .status(200)
      .json({ ok: true, sent: 0, skipped: alerts.length, reason: "dedup_24h" });
    return;
  }

  const subsRaw = (await kv.smembers(SUBS_KEY)) || [];
  const subs = subsRaw
    .map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (subs.length === 0) {
    res
      .status(200)
      .json({ ok: true, sent: 0, skipped: 0, reason: "no_subscribers" });
    return;
  }

  let sent = 0;
  let removed = 0;
  const toRemove = [];

  for (const alert of alertsToSend) {
    const payload = JSON.stringify({
      title: alert.title || "Livada Mea — alerta",
      body: alert.body,
      tag: `livada-${alert.type}-${alert.date}`,
      url: "/?tab=azi",
      severity: alert.severity || "info",
    });

    for (let i = 0; i < subs.length; i++) {
      try {
        await webpush.sendNotification(subs[i], payload, { TTL: 6 * 3600 });
        sent++;
      } catch (err) {
        // 410 Gone sau 404 = subscription invalida → cleanup
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          toRemove.push(subsRaw[i]);
          removed++;
        }
        // Alte erori: log + continua (alti subscriberi pot avea success)
        console.warn("push-broadcast send err:", err?.statusCode, err?.message);
      }
    }
  }

  // Cleanup subscription-uri moarte
  if (toRemove.length > 0) {
    try {
      await kv.srem(SUBS_KEY, ...toRemove);
    } catch {}
  }

  res.status(200).json({
    ok: true,
    sent,
    removed,
    subscribers: subs.length,
    alertsSent: alertsToSend.length,
  });
}
