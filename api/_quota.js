// T1 Sprint 1: AI cost tracking + quota guard
// Counter Redis per provider per zi — previne epuizare silent Gemini 1000 req/zi
// Foloseste Europe/Bucharest pentru "ziua" (aliniaza cu meteo-cron today)
import { Redis } from "@upstash/redis";

// Limite free tier cunoscute (conservatoare — fara card inregistrat)
export const QUOTA_LIMITS = {
  gemini: { daily: 1000, warn: 0.8, label: "Gemini" },
  gemini2: { daily: 1000, warn: 0.8, label: "Gemini (cheia 2)" },
  groq: { daily: 14400, warn: 0.85, label: "Groq Llama" },
  cerebras: { daily: 1440, warn: 0.85, label: "Cerebras" },
  github_models: { daily: 150, warn: 0.7, label: "GitHub Models" },
  plantnet: { daily: 500, warn: 0.8, label: "PlantNet" },
  plant_id: { daily: 50, warn: 0.6, label: "Plant.ID" },
};

function todayRomania() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Incrementeaza si verifica quota — returneaza {ok, warning, used, limit, percent}
export async function checkAndIncrementQuota(provider) {
  const limit = QUOTA_LIMITS[provider];
  if (!limit) return { ok: true, unknown: true };

  try {
    const kv = Redis.fromEnv();
    const key = `ai-quota:${provider}:${todayRomania()}`;
    const pipeline = kv.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 26 * 3600); // TTL safety margin
    const [used] = await Promise.race([
      pipeline.exec(),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Quota Redis timeout")), 1500),
      ),
    ]);
    const usedNum = Number(used) || 0;
    return {
      ok: usedNum <= limit.daily,
      warning: usedNum >= Math.floor(limit.daily * limit.warn),
      used: usedNum,
      limit: limit.daily,
      percent: Math.round((usedNum / limit.daily) * 100),
    };
  } catch {
    // Redis indisponibil — nu bloca AI call (fail-open pe quota e acceptabil,
    // cheia AI va raspunde ea insasi cu 429 daca e depasita).
    return { ok: true, error: "quota_check_failed" };
  }
}

// Citeste status curent toate provider-ele (fara increment)
export async function getQuotaStatus() {
  const out = {};
  try {
    const kv = Redis.fromEnv();
    const day = todayRomania();
    const keys = Object.keys(QUOTA_LIMITS).map((p) => `ai-quota:${p}:${day}`);
    // mget paralel — 1 RTT
    const values = await Promise.race([
      kv.mget(...keys),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Quota mget timeout")), 1500),
      ),
    ]);
    Object.keys(QUOTA_LIMITS).forEach((provider, i) => {
      const used = Number(values[i]) || 0;
      const lim = QUOTA_LIMITS[provider];
      out[provider] = {
        used,
        limit: lim.daily,
        percent: Math.round((used / lim.daily) * 100),
        label: lim.label,
        warning: used >= Math.floor(lim.daily * lim.warn),
      };
    });
    return out;
  } catch {
    // Redis down — returneaza stub
    return { error: "quota_unavailable" };
  }
}
