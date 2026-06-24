// Unit tests for api/_quota.js — quota tracking logic (T1 Sprint 1)
// Pure-ish logic: QUOTA_LIMITS, todayRomania, checkAndIncrementQuota, getQuotaStatus
// Mocks: @upstash/redis (Redis.fromEnv -> kv with incr/expire/pipeline/mget)

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockKv, mockPipeline, mockFromEnv } = vi.hoisted(() => {
  const mockPipeline = {
    incr: vi.fn(),
    expire: vi.fn(),
    exec: vi.fn(),
  };
  const mockKv = {
    pipeline: vi.fn(() => mockPipeline),
    mget: vi.fn(),
  };
  return { mockKv, mockPipeline, mockFromEnv: vi.fn(() => mockKv) };
});

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: mockFromEnv },
}));

// NOTE: todayRomania este o functie interna NEexportata in _quota.js,
// deci nu poate fi testata direct. Comportamentul ei (cheia datata
// Europe/Bucharest) e acoperit indirect prin getQuotaStatus/checkAndIncrementQuota.
import {
  QUOTA_LIMITS,
  checkAndIncrementQuota,
  getQuotaStatus,
} from "../api/_quota.js";

beforeEach(() => {
  vi.clearAllMocks();
  mockFromEnv.mockReturnValue(mockKv);
  mockKv.pipeline.mockReturnValue(mockPipeline);
  // pipeline.exec() default: [usedCount, expireResult]
  mockPipeline.exec.mockResolvedValue([1, 1]);
});

describe("getQuotaStatus uses an Europe/Bucharest dated key (indirect todayRomania)", () => {
  it("mget keys are ai-quota:<provider>:<YYYY-MM-DD>", async () => {
    mockKv.mget.mockResolvedValue(Object.keys(QUOTA_LIMITS).map(() => 0));
    await getQuotaStatus();
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Bucharest",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const keys = mockKv.mget.mock.calls[0];
    expect(keys).toContain(`ai-quota:gemini:${day}`);
    expect(
      keys.every((k) => /^ai-quota:[a-z_0-9]+:\d{4}-\d{2}-\d{2}$/.test(k)),
    ).toBe(true);
  });
});

describe("QUOTA_LIMITS shape", () => {
  it("each provider has daily/warn/label", () => {
    for (const [provider, cfg] of Object.entries(QUOTA_LIMITS)) {
      expect(typeof cfg.daily, provider).toBe("number");
      expect(cfg.daily, provider).toBeGreaterThan(0);
      expect(typeof cfg.warn, provider).toBe("number");
      expect(cfg.warn, provider).toBeGreaterThan(0);
      expect(cfg.warn, provider).toBeLessThanOrEqual(1);
      expect(typeof cfg.label, provider).toBe("string");
    }
  });

  it("includes known providers gemini and groq", () => {
    expect(QUOTA_LIMITS.gemini.daily).toBe(1000);
    expect(QUOTA_LIMITS.groq.daily).toBe(14400);
  });
});

describe("getQuotaStatus", () => {
  it("maps mget counters to used/limit/percent/warning/label per provider", async () => {
    const providers = Object.keys(QUOTA_LIMITS);
    // gemini at 800 -> 80% -> warning (warn 0.8); others at 0
    mockKv.mget.mockResolvedValue(
      providers.map((p) => (p === "gemini" ? 800 : 0)),
    );

    const out = await getQuotaStatus();

    expect(out.error).toBeUndefined();
    expect(out.gemini).toEqual({
      used: 800,
      limit: 1000,
      percent: 80,
      label: "Gemini",
      warning: true, // 800 >= floor(1000 * 0.8) = 800
    });
    expect(out.groq).toEqual({
      used: 0,
      limit: 14400,
      percent: 0,
      label: "Groq Llama",
      warning: false,
    });
    // mget called once with all provider keys for today
    expect(mockKv.mget).toHaveBeenCalledTimes(1);
    expect(mockKv.mget.mock.calls[0].length).toBe(providers.length);
  });

  it("warning is false just below the warn threshold", async () => {
    const providers = Object.keys(QUOTA_LIMITS);
    // gemini at 799 -> below floor(800) -> no warning
    mockKv.mget.mockResolvedValue(
      providers.map((p) => (p === "gemini" ? 799 : 0)),
    );
    const out = await getQuotaStatus();
    expect(out.gemini.warning).toBe(false);
    expect(out.gemini.percent).toBe(80); // round(799/1000*100)=80
  });

  it("treats null/missing counters as 0 used", async () => {
    const providers = Object.keys(QUOTA_LIMITS);
    mockKv.mget.mockResolvedValue(providers.map(() => null));
    const out = await getQuotaStatus();
    expect(out.gemini.used).toBe(0);
    expect(out.gemini.percent).toBe(0);
    expect(out.gemini.warning).toBe(false);
  });

  it("fail-open: returns {error} stub when Redis.fromEnv throws", async () => {
    mockFromEnv.mockImplementationOnce(() => {
      throw new Error("Redis down");
    });
    const out = await getQuotaStatus();
    expect(out).toEqual({ error: "quota_unavailable" });
  });

  it("fail-open: returns {error} stub when mget rejects", async () => {
    mockKv.mget.mockRejectedValue(new Error("mget boom"));
    const out = await getQuotaStatus();
    expect(out).toEqual({ error: "quota_unavailable" });
  });
});

describe("checkAndIncrementQuota", () => {
  it("returns {ok:true, unknown:true} for unknown provider (no Redis call)", async () => {
    const out = await checkAndIncrementQuota("does_not_exist");
    expect(out).toEqual({ ok: true, unknown: true });
    expect(mockFromEnv).not.toHaveBeenCalled();
  });

  it("increments and returns ok/used/limit/percent below warn", async () => {
    mockPipeline.exec.mockResolvedValue([10, 1]); // used=10
    const out = await checkAndIncrementQuota("gemini");
    expect(mockPipeline.incr).toHaveBeenCalledTimes(1);
    expect(mockPipeline.expire).toHaveBeenCalledTimes(1);
    expect(out.ok).toBe(true);
    expect(out.used).toBe(10);
    expect(out.limit).toBe(1000);
    expect(out.percent).toBe(1); // round(10/1000*100)=1
    expect(out.warning).toBe(false);
  });

  it("sets warning:true at/over the warn threshold", async () => {
    mockPipeline.exec.mockResolvedValue([800, 1]); // floor(1000*0.8)=800
    const out = await checkAndIncrementQuota("gemini");
    expect(out.warning).toBe(true);
    expect(out.ok).toBe(true); // still <= daily
    expect(out.percent).toBe(80);
  });

  it("sets ok:false when used exceeds daily limit", async () => {
    mockPipeline.exec.mockResolvedValue([1001, 1]); // > 1000
    const out = await checkAndIncrementQuota("gemini");
    expect(out.ok).toBe(false);
    expect(out.warning).toBe(true);
  });

  it("fail-open: returns {ok:true,error} when pipeline.exec rejects", async () => {
    mockPipeline.exec.mockRejectedValue(new Error("redis timeout"));
    const out = await checkAndIncrementQuota("groq");
    expect(out).toEqual({ ok: true, error: "quota_check_failed" });
  });

  it("fail-open: returns {ok:true,error} when Redis.fromEnv throws", async () => {
    mockFromEnv.mockImplementationOnce(() => {
      throw new Error("no env");
    });
    const out = await checkAndIncrementQuota("groq");
    expect(out).toEqual({ ok: true, error: "quota_check_failed" });
  });

  it("treats non-numeric exec result as 0 used", async () => {
    mockPipeline.exec.mockResolvedValue([null, 1]);
    const out = await checkAndIncrementQuota("groq");
    expect(out.used).toBe(0);
    expect(out.ok).toBe(true);
  });
});
