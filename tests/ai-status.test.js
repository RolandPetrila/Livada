// Unit tests pentru api/ai-status.js — cheie prezenta + stare reala (ai-health) + quota
import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsonReq } from "./helpers/ai.js";

const { mockQuota, mockHealth } = vi.hoisted(() => ({
  mockQuota: vi.fn(),
  mockHealth: vi.fn(),
}));

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));
vi.mock("../api/_quota.js", () => ({ getQuotaStatus: mockQuota, getHealthStatus: mockHealth }));

import handler from "../api/ai-status.js";

const KEYS = [
  "GROQ_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GOOGLE_AI_API_KEY_2",
  "MISTRAL_API_KEY",
  "XAI_API_KEY",
  "PLANTNET_API_KEY",
  "PLANT_ID_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
];

const get = async () => {
  const res = await handler(jsonReq("/api/ai-status", "GET"));
  return { res, data: await res.json() };
};

describe("ai-status API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    KEYS.forEach((k) => delete process.env[k]);
    mockQuota.mockResolvedValue({ groq: { used: 3, limit: 1000 } });
    mockHealth.mockResolvedValue({});
  });

  it("fara chei → toti furnizorii false", async () => {
    const { res, data } = await get();
    expect(res.status).toBe(200);
    expect(Object.values(data.status).every((v) => v === false)).toBe(true);
    expect(data.status).not.toHaveProperty("cerebras");
    expect(data.status).not.toHaveProperty("github_models");
  });

  it("mapeaza cheile la boolean (fara valori expuse); gemini_lite = oricare cheie Gemini", async () => {
    process.env.GROQ_API_KEY = "secret-groq";
    process.env.GOOGLE_AI_API_KEY_2 = "secret-g2";
    const { data } = await get();
    expect(data.status.groq).toBe(true);
    expect(data.status.gemini).toBe(false);
    expect(data.status.gemini_lite).toBe(true);
    expect(JSON.stringify(data)).not.toContain("secret");
  });

  it("redis e true doar cu URL si TOKEN", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "u";
    expect((await get()).data.status.redis).toBe(false);
    process.env.UPSTASH_REDIS_REST_TOKEN = "t";
    expect((await get()).data.status.redis).toBe(true);
  });

  it("ultimul apel real esuat → status false chiar daca cheia exista (fara 'verde fals')", async () => {
    process.env.GROQ_API_KEY = "k";
    process.env.MISTRAL_API_KEY = "m";
    mockHealth.mockResolvedValue({
      groq: { ok: false, at: 1, err: "404 model_not_found" },
      mistral: { ok: true, at: 2 },
    });
    const { data } = await get();
    expect(data.keys.groq).toBe(true);
    expect(data.status.groq).toBe(false);
    expect(data.status.mistral).toBe(true);
    expect(data.health.groq.err).toMatch(/404/);
  });

  it("health indisponibil (Redis down) → status dupa chei", async () => {
    process.env.GROQ_API_KEY = "k";
    mockHealth.mockResolvedValue({ error: "health_unavailable" });
    expect((await get()).data.status.groq).toBe(true);
  });

  it("include quota si Cache-Control 60s", async () => {
    const { res, data } = await get();
    expect(data.quota.groq.used).toBe(3);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });
});
