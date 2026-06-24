// Unit tests for api/ai-status.js — AI services health check (Edge Runtime)
// export default async function handler(req) -> default import.
// Mocks: _auth.js + _quota.js. Env keys toggled via vi.stubEnv.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../api/_auth.js", () => ({
  corsHeaders: vi.fn(() => ({ "X-Test": "1" })),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  checkOrigin: vi.fn(() => null),
  rateLimit: vi.fn(async () => null),
}));

const { mockGetQuotaStatus } = vi.hoisted(() => ({
  mockGetQuotaStatus: vi.fn(),
}));

vi.mock("../api/_quota.js", () => ({
  getQuotaStatus: mockGetQuotaStatus,
}));

import handler from "../api/ai-status.js";
import { handleOptions, checkOrigin, rateLimit } from "../api/_auth.js";

function fakeReq(method = "GET") {
  return { method, headers: { get: () => null } };
}

// Every env key the handler probes — cleared before each test for isolation.
const ENV_KEYS = [
  "GROQ_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GOOGLE_AI_API_KEY_2",
  "GITHUB_MODELS_TOKEN",
  "CEREBRAS_API_KEY",
  "PLANTNET_API_KEY",
  "PLANT_ID_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetQuotaStatus.mockResolvedValue({});
  // Start from a clean slate: no keys set.
  for (const k of ENV_KEYS) vi.stubEnv(k, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ai-status API route", () => {
  it("OPTIONS returns 204 via handleOptions", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
    expect(handleOptions).toHaveBeenCalled();
  });

  it("short-circuits when checkOrigin returns an error response", async () => {
    checkOrigin.mockReturnValueOnce(new Response("forbidden", { status: 403 }));
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(403);
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("short-circuits when rateLimit returns an error response", async () => {
    rateLimit.mockResolvedValueOnce(new Response("too many", { status: 429 }));
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(429);
  });

  it("GET returns 200 with all providers false when no keys set", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toEqual({
      groq: false,
      gemini: false,
      gemini2: false,
      github_models: false,
      cerebras: false,
      plantnet: false,
      plant_id: false,
      redis: false,
      blob: false,
    });
    expect(typeof body.ts).toBe("number");
  });

  it("maps each present env key to true (boolean only, no values leaked)", async () => {
    vi.stubEnv("GROQ_API_KEY", "secret-groq-value");
    vi.stubEnv("GOOGLE_AI_API_KEY", "secret-gemini");
    vi.stubEnv("GOOGLE_AI_API_KEY_2", "secret-gemini2");
    vi.stubEnv("GITHUB_MODELS_TOKEN", "ghtok");
    vi.stubEnv("CEREBRAS_API_KEY", "cb");
    vi.stubEnv("PLANTNET_API_KEY", "pn");
    vi.stubEnv("PLANT_ID_API_KEY", "pid");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blobtok");

    const res = await handler(fakeReq("GET"));
    const body = await res.json();

    expect(body.status.groq).toBe(true);
    expect(body.status.gemini).toBe(true);
    expect(body.status.gemini2).toBe(true);
    expect(body.status.github_models).toBe(true);
    expect(body.status.cerebras).toBe(true);
    expect(body.status.plantnet).toBe(true);
    expect(body.status.plant_id).toBe(true);
    expect(body.status.blob).toBe(true);
    // redis still false (both URL+TOKEN required, neither set)
    expect(body.status.redis).toBe(false);

    // No raw secret value should appear anywhere in the response payload.
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("secret-groq-value");
    expect(raw).not.toContain("secret-gemini");
    expect(raw).not.toContain("blobtok");
    // values are strictly booleans
    for (const v of Object.values(body.status)) {
      expect(typeof v).toBe("boolean");
    }
  });

  it("redis is true only when BOTH url and token are set", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://x.upstash.io");
    let body = await (await handler(fakeReq("GET"))).json();
    expect(body.status.redis).toBe(false); // token missing

    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    body = await (await handler(fakeReq("GET"))).json();
    expect(body.status.redis).toBe(true);
  });

  it("includes quota from getQuotaStatus in the response", async () => {
    mockGetQuotaStatus.mockResolvedValue({
      gemini: { used: 5, limit: 1000, percent: 1, warning: false },
    });
    const body = await (await handler(fakeReq("GET"))).json();
    expect(body.quota.gemini).toEqual({
      used: 5,
      limit: 1000,
      percent: 1,
      warning: false,
    });
  });

  it("passes through quota {error} stub when Redis is down", async () => {
    mockGetQuotaStatus.mockResolvedValue({ error: "quota_unavailable" });
    const body = await (await handler(fakeReq("GET"))).json();
    expect(body.quota).toEqual({ error: "quota_unavailable" });
  });

  it("sets Cache-Control public max-age=60", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
  });
});
