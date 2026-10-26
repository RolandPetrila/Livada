// Unit tests pentru api/_quota.js — cota zilnica + sanatate reala per furnizor
// Mocks: @upstash/redis (Redis.fromEnv -> kv cu get/mget/pipeline)
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockKv, mockPipeline, mockFromEnv } = vi.hoisted(() => {
  const mockPipeline = { incr: vi.fn(), expire: vi.fn(), set: vi.fn(), exec: vi.fn() };
  const mockKv = { pipeline: vi.fn(() => mockPipeline), mget: vi.fn(), get: vi.fn() };
  return { mockKv, mockPipeline, mockFromEnv: vi.fn(() => mockKv) };
});

vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: mockFromEnv } }));

import {
  QUOTA_LIMITS,
  isOverQuota,
  recordAiCalls,
  getQuotaStatus,
  getHealthStatus,
} from "../api/_quota.js";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

beforeEach(() => {
  vi.clearAllMocks();
  mockFromEnv.mockReturnValue(mockKv);
  mockKv.pipeline.mockReturnValue(mockPipeline);
  mockPipeline.exec.mockResolvedValue([]);
});

describe("QUOTA_LIMITS", () => {
  it("contine furnizorii actuali si nu mai contine furnizorii retrasi", () => {
    for (const p of ["gemini", "gemini2", "gemini_lite", "groq", "mistral", "xai", "plantnet", "plant_id"]) {
      expect(QUOTA_LIMITS[p]).toMatchObject({ daily: expect.any(Number), label: expect.any(String) });
    }
    // valori citite din AI Studio (proiect Livada, Free tier) 2026-10-27
    expect(QUOTA_LIMITS.gemini.daily).toBe(20);
    expect(QUOTA_LIMITS.gemini_lite.daily).toBe(500);
    expect(QUOTA_LIMITS.cerebras).toBeUndefined();
    expect(QUOTA_LIMITS.github_models).toBeUndefined();
  });
});

describe("isOverQuota", () => {
  it("false sub limita, true la/peste limita (cheie datata Europe/Bucharest)", async () => {
    mockKv.get.mockResolvedValueOnce("5");
    expect(await isOverQuota("gemini")).toBe(false);
    const key = mockKv.get.mock.calls[0][0];
    expect(key.startsWith("ai-quota:gemini:")).toBe(true);
    expect(key.split(":")[2]).toMatch(DAY_RE);
    mockKv.get.mockResolvedValueOnce(String(QUOTA_LIMITS.gemini.daily));
    expect(await isOverQuota("gemini")).toBe(true);
  });

  it("provider necunoscut → false fara Redis", async () => {
    expect(await isOverQuota("nimeni")).toBe(false);
    expect(mockFromEnv).not.toHaveBeenCalled();
  });

  it("fail-open cand Redis pica", async () => {
    mockFromEnv.mockImplementationOnce(() => {
      throw new Error("no env");
    });
    expect(await isOverQuota("gemini")).toBe(false);
    mockKv.get.mockRejectedValueOnce(new Error("down"));
    expect(await isOverQuota("gemini")).toBe(false);
  });
});

describe("recordAiCalls", () => {
  it("incrementeaza cota pt fiecare apel si salveaza ultima stare per furnizor", async () => {
    await recordAiCalls([
      { provider: "groq", ok: false, err: "404 model_not_found" },
      { provider: "groq", ok: true },
      { provider: "gemini_lite", ok: false, err: "timeout" },
    ]);
    expect(mockPipeline.incr).toHaveBeenCalledTimes(3);
    expect(mockPipeline.expire).toHaveBeenCalledTimes(3);
    const sets = Object.fromEntries(mockPipeline.set.mock.calls.map(([k, v]) => [k, v]));
    expect(sets["ai-health:groq"]).toMatchObject({ ok: true });
    expect(sets["ai-health:groq"].err).toBeUndefined();
    expect(sets["ai-health:gemini_lite"]).toMatchObject({ ok: false, err: "timeout" });
    expect(mockPipeline.set.mock.calls[0][2]).toEqual({ ex: 14 * 24 * 3600 });
    expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
  });

  it("salveaza doar categoria erorii, niciodata corpul brut (ai-status e public)", async () => {
    await recordAiCalls([
      { provider: "plantnet", ok: false, err: 'HTTP 401: {"error":"bad api-key=SECRET123"}' },
      { provider: "groq", ok: false, err: "eroare ciudata cu SECRET" },
    ]);
    const sets = Object.fromEntries(mockPipeline.set.mock.calls.map(([k, v]) => [k, v]));
    expect(sets["ai-health:plantnet"].err).toBe("HTTP 401");
    expect(sets["ai-health:groq"].err).toBe("eroare");
    expect(JSON.stringify(mockPipeline.set.mock.calls)).not.toContain("SECRET");
  });

  it("lista goala → niciun apel Redis", async () => {
    await recordAiCalls([]);
    expect(mockFromEnv).not.toHaveBeenCalled();
  });

  it("nu arunca niciodata (Redis down)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockPipeline.exec.mockRejectedValueOnce(new Error("down"));
    await expect(recordAiCalls([{ provider: "groq", ok: true }])).resolves.toBeUndefined();
  });
});

describe("getQuotaStatus", () => {
  it("mapeaza mget la used/limit/percent/warning/label", async () => {
    const providers = Object.keys(QUOTA_LIMITS);
    mockKv.mget.mockResolvedValueOnce(providers.map((p) => (p === "groq" ? "900" : null)));
    const out = await getQuotaStatus();
    expect(out.groq).toMatchObject({ used: 900, limit: 1000, percent: 90, warning: true, label: "Groq" });
    expect(out.gemini).toMatchObject({ used: 0, warning: false });
  });

  it("Redis down → { error }", async () => {
    mockKv.mget.mockRejectedValueOnce(new Error("down"));
    expect(await getQuotaStatus()).toEqual({ error: "quota_unavailable" });
  });
});

describe("getHealthStatus", () => {
  it("intoarce ultima stare per furnizor (null daca nu exista)", async () => {
    const providers = Object.keys(QUOTA_LIMITS);
    mockKv.mget.mockResolvedValueOnce(providers.map((p) => (p === "xai" ? { ok: false, at: 1, err: "402" } : null)));
    const out = await getHealthStatus();
    expect(out.xai).toEqual({ ok: false, at: 1, err: "402" });
    expect(out.groq).toBeNull();
    expect(mockKv.mget.mock.calls[0]).toContain("ai-health:xai");
  });

  it("Redis down → { error }", async () => {
    mockKv.mget.mockRejectedValueOnce(new Error("down"));
    expect(await getHealthStatus()).toEqual({ error: "health_unavailable" });
  });
});
