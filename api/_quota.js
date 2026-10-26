// AI cost tracking + quota guard + sanatate reala per furnizor
// Contor Redis per provider per zi (Europe/Bucharest) + ultima stare reala a fiecarui apel.
// Starea reala exista pentru ca prezenta cheii NU inseamna functionare (2026-10-27: Groq/Cerebras/
// GitHub Models aveau cheie, dar toate apelurile reale esuau → panoul AI arata fals "verde").
import { Redis } from "@upstash/redis";

// Limite free tier. Gemini [CERT] citite din AI Studio → Rate Limit, proiect "Livada"
// (gen-lang-client-0462189427, Free tier) la 2026-10-27: 2.5 Flash = 5 RPM / 20 RPD,
// 3.5 Flash-Lite = 15 RPM / 500 RPD. Cheia 2 e in alt proiect [INCERT] — aceeasi limita presupusa.
// Groq/Mistral/xAI [INCERT] (nepublicate stabil). La depasire furnizorul raspunde 429, iar
// lantul de fallback trece la urmatorul model; guard-ul doar evita apelul sigur esuat.
export const QUOTA_LIMITS = {
  gemini: { daily: 20, warn: 0.8, label: "Gemini 2.5 Flash" },
  gemini2: { daily: 20, warn: 0.8, label: "Gemini 2.5 Flash (cheia 2)" },
  gemini_lite: { daily: 500, warn: 0.8, label: "Gemini 3.5 Flash-Lite" },
  groq: { daily: 1000, warn: 0.85, label: "Groq" },
  mistral: { daily: 1000, warn: 0.85, label: "Mistral Pixtral" },
  xai: { daily: 100, warn: 0.7, label: "xAI Grok (credite)" },
  plantnet: { daily: 500, warn: 0.8, label: "PlantNet" },
  plant_id: { daily: 50, warn: 0.6, label: "Plant.ID (credite totale)" },
};

const HEALTH_TTL = 14 * 24 * 3600;
const REDIS_TIMEOUT_MS = 1500;

function todayRomania() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// In ai-health salvam DOAR categoria erorii (cod HTTP / timeout), nu corpul brut al raspunsului:
// /api/ai-status e public, iar corpul unei erori ar putea reflecta URL-uri cu chei (ex. Pl@ntNet).
function errCategory(err) {
  const e = String(err || "");
  const code = e.match(/\b([1-5]\d\d)\b/);
  if (code) return "HTTP " + code[1];
  if (/timeout|abort/i.test(e)) return "timeout";
  if (/gol/.test(e)) return "raspuns gol";
  return "eroare";
}

const quotaKey = (provider, day = todayRomania()) => `ai-quota:${provider}:${day}`;
const healthKey = (provider) => `ai-health:${provider}`;

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timeout`)), REDIS_TIMEOUT_MS),
    ),
  ]);
}

// Citeste (fara increment) daca providerul a depasit cota zilnica. Fail-open la Redis down.
export async function isOverQuota(provider) {
  const limit = QUOTA_LIMITS[provider];
  if (!limit) return false;
  try {
    const used = await withTimeout(Redis.fromEnv().get(quotaKey(provider)), "Quota get");
    return (Number(used) || 0) >= limit.daily;
  } catch {
    return false;
  }
}

// Consemneaza apelurile facute intr-o cerere: +1 la cota + ultima stare (ok/eroare).
// attempts: [{ provider, ok, err? }]. Nu arunca niciodata (best effort, 1 RTT).
export async function recordAiCalls(attempts) {
  if (!Array.isArray(attempts) || !attempts.length) return;
  try {
    const kv = Redis.fromEnv();
    const pipeline = kv.pipeline();
    const now = Date.now();
    const last = {};
    for (const a of attempts) {
      if (!a || !a.provider) continue;
      if (QUOTA_LIMITS[a.provider]) {
        pipeline.incr(quotaKey(a.provider));
        pipeline.expire(quotaKey(a.provider), 26 * 3600);
      }
      last[a.provider] = a; // ultima incercare per provider castiga
    }
    for (const [provider, a] of Object.entries(last)) {
      pipeline.set(
        healthKey(provider),
        { ok: !!a.ok, at: now, ...(a.ok ? {} : { err: errCategory(a.err) }) },
        { ex: HEALTH_TTL },
      );
    }
    await withTimeout(pipeline.exec(), "Record");
  } catch (e) {
    console.warn("[quota] record failed:", e?.message);
  }
}

// Citeste status curent toate provider-ele (fara increment)
export async function getQuotaStatus() {
  const out = {};
  try {
    const kv = Redis.fromEnv();
    const providers = Object.keys(QUOTA_LIMITS);
    const values = await withTimeout(kv.mget(...providers.map((p) => quotaKey(p))), "Quota mget");
    providers.forEach((provider, i) => {
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
    return { error: "quota_unavailable" };
  }
}

// Ultima stare reala per provider: { provider: { ok, at, err? } | null }
export async function getHealthStatus() {
  const out = {};
  try {
    const kv = Redis.fromEnv();
    const providers = Object.keys(QUOTA_LIMITS);
    const values = await withTimeout(kv.mget(...providers.map(healthKey)), "Health mget");
    providers.forEach((provider, i) => {
      out[provider] = values[i] || null;
    });
    return out;
  } catch {
    return { error: "health_unavailable" };
  }
}
