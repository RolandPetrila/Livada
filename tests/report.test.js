// Unit tests for api/report.js — Redis + Groq raport anual cu cache + fallback
// Mocks: @upstash/redis, _auth.js, _timeout.js, _ai.js

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockKv, mockFromEnv, mockFetchWithTimeout, mockCallCerebras } =
  vi.hoisted(() => {
    const mockKv = {
      get: vi.fn(),
      set: vi.fn(),
    };
    return {
      mockKv,
      mockFromEnv: vi.fn(() => mockKv),
      mockFetchWithTimeout: vi.fn(),
      mockCallCerebras: vi.fn(),
    };
  });

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: mockFromEnv },
}));

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));

vi.mock("../api/_timeout.js", () => ({
  fetchWithTimeout: mockFetchWithTimeout,
}));

vi.mock("../api/_ai.js", () => ({
  callCerebras: mockCallCerebras,
}));

import handler from "../api/report.js";

function fakeReq(method, body = null) {
  return {
    method,
    headers: { get: () => null },
    json: vi.fn(async () => {
      if (body === null) throw new Error("no body");
      return body;
    }),
  };
}

function groqOkResponse(report = "Raport test generat") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: report } }],
      usage: { total_tokens: 500 },
    }),
    text: async () => "",
  };
}

function groqErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    text: async () => "error",
  };
}

describe("report API route", () => {
  const ORIG_KEY = process.env.GROQ_API_KEY;
  const year = new Date().getFullYear();
  const cacheKey = `livada:report:cache:${year}`;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = "test-groq-key";
    mockFromEnv.mockReturnValue(mockKv);
    mockKv.get.mockResolvedValue(null);
    mockKv.set.mockResolvedValue("OK");
    mockFetchWithTimeout.mockResolvedValue(groqOkResponse());
  });

  afterEach(() => {
    if (ORIG_KEY) process.env.GROQ_API_KEY = ORIG_KEY;
    else delete process.env.GROQ_API_KEY;
  });

  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("rejects non-POST with 405", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(405);
  });

  it("returns 500 when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const res = await handler(fakeReq("POST"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/GROQ_API_KEY/);
  });

  // ── Cache hit ─────────────────────────────────────────────────────────────
  it("returns cached report when fresh (< 1h, no journal update)", async () => {
    const cached = {
      report: "Raport cached",
      generatedAt: Date.now() - 30 * 60_000, // 30 min ago
      year,
      journalCount: 5,
      meteoDays: 10,
    };
    mockKv.get.mockImplementation((key) => {
      if (key === cacheKey) return Promise.resolve(cached);
      if (key === "livada:journal:last-update")
        return Promise.resolve(cached.generatedAt - 10000); // journal older than cache
      return Promise.resolve(null);
    });

    const res = await handler(fakeReq("POST"));
    const body = await res.json();
    expect(body.report).toBe("Raport cached");
    expect(body._cached).toBe(true);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("regenerates when cache is stale (journal updated after generation)", async () => {
    const cached = {
      report: "Old report",
      generatedAt: Date.now() - 10 * 60_000, // 10 min ago
      year,
    };
    mockKv.get.mockImplementation((key) => {
      if (key === cacheKey) return Promise.resolve(cached);
      if (key === "livada:journal:last-update")
        return Promise.resolve(Date.now()); // journal newer than cache
      if (key === "livada:journal") return Promise.resolve([]);
      if (key === "livada:meteo:history") return Promise.resolve({});
      return Promise.resolve(null);
    });

    const res = await handler(fakeReq("POST"));
    const body = await res.json();
    expect(body._cached).toBeUndefined();
    expect(mockFetchWithTimeout).toHaveBeenCalled();
  });

  it("regenerates when cache is expired (> 1h)", async () => {
    const cached = {
      report: "Expired report",
      generatedAt: Date.now() - 2 * 3600_000, // 2h ago
    };
    mockKv.get.mockImplementation((key) => {
      if (key === cacheKey) return Promise.resolve(cached);
      if (key === "livada:journal") return Promise.resolve([]);
      if (key === "livada:meteo:history") return Promise.resolve({});
      return Promise.resolve(null);
    });

    const res = await handler(fakeReq("POST"));
    expect(mockFetchWithTimeout).toHaveBeenCalled();
  });

  // ── Groq success ──────────────────────────────────────────────────────────
  it("generates report with Groq and caches in Redis", async () => {
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:journal")
        return Promise.resolve([
          {
            id: 1,
            date: `${year}-03-15`,
            type: "tratament",
            note: "Cupru",
          },
        ]);
      if (key === "livada:meteo:history")
        return Promise.resolve({
          [`${year}-03-15`]: {
            temp: 12,
            temp_min: 5,
            temp_max: 15,
            description: "Senin",
            humidity: 60,
          },
        });
      return Promise.resolve(null);
    });
    mockFetchWithTimeout.mockResolvedValue(
      groqOkResponse("Raportul anual complet"),
    );

    const res = await handler(fakeReq("POST"));
    const body = await res.json();
    expect(body.report).toBe("Raportul anual complet");
    expect(body.year).toBe(year);
    expect(body.journalCount).toBe(1);
    expect(body.meteoDays).toBe(1);
    // Cache should be set
    expect(mockKv.set).toHaveBeenCalledWith(
      cacheKey,
      expect.objectContaining({ report: "Raportul anual complet" }),
      { ex: 3600 },
    );
  });

  it("includes localJournal from request body in prompt", async () => {
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:journal") return Promise.resolve([]);
      if (key === "livada:meteo:history") return Promise.resolve({});
      return Promise.resolve(null);
    });
    mockFetchWithTimeout.mockResolvedValue(groqOkResponse());

    await handler(fakeReq("POST", { localJournal: "Date locale test" }));
    const callBody = JSON.parse(mockFetchWithTimeout.mock.calls[0][1].body);
    expect(callBody.messages[1].content).toContain("Date locale test");
  });

  it("filters journal entries by current year", async () => {
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:journal")
        return Promise.resolve([
          { id: 1, date: `${year}-01-01`, type: "a", note: "this year" },
          { id: 2, date: `${year - 1}-12-31`, type: "b", note: "last year" },
        ]);
      if (key === "livada:meteo:history") return Promise.resolve({});
      return Promise.resolve(null);
    });
    mockFetchWithTimeout.mockResolvedValue(groqOkResponse());

    const res = await handler(fakeReq("POST"));
    const body = await res.json();
    expect(body.journalCount).toBe(1);
  });

  // ── Fallback chain ────────────────────────────────────────────────────────
  it("falls back to llama-3.3-70b when scout fails", async () => {
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:journal") return Promise.resolve([]);
      if (key === "livada:meteo:history") return Promise.resolve({});
      return Promise.resolve(null);
    });
    mockFetchWithTimeout
      .mockResolvedValueOnce(groqErrorResponse(500))
      .mockResolvedValueOnce(groqOkResponse("Fallback report"));

    const res = await handler(fakeReq("POST"));
    const body = await res.json();
    expect(body.report).toBe("Fallback report");
    expect(body._fallback).toBe(true);
  });

  it("falls back to Cerebras when all Groq models fail", async () => {
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:journal") return Promise.resolve([]);
      if (key === "livada:meteo:history") return Promise.resolve({});
      return Promise.resolve(null);
    });
    mockFetchWithTimeout
      .mockResolvedValueOnce(groqErrorResponse(500))
      .mockResolvedValueOnce(groqErrorResponse(500));
    mockCallCerebras.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Cerebras report" } }],
      }),
    });

    const res = await handler(fakeReq("POST"));
    const body = await res.json();
    expect(body.report).toBe("Cerebras report");
    expect(body._fallbackModel).toBe("cerebras-llama-3.3-70b");
  });

  it("returns 503 when all AI providers fail", async () => {
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:journal") return Promise.resolve([]);
      if (key === "livada:meteo:history") return Promise.resolve({});
      return Promise.resolve(null);
    });
    mockFetchWithTimeout
      .mockResolvedValueOnce(groqErrorResponse(500))
      .mockResolvedValueOnce(groqErrorResponse(500));
    mockCallCerebras.mockResolvedValue({ ok: false, status: 500 });

    const res = await handler(fakeReq("POST"));
    expect(res.status).toBe(503);
  });

  it("returns 503 with rate limit message on Groq 429", async () => {
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:journal") return Promise.resolve([]);
      if (key === "livada:meteo:history") return Promise.resolve({});
      return Promise.resolve(null);
    });
    // Scout returns 429 — since it's not 401/403, it tries fallback
    mockFetchWithTimeout
      .mockResolvedValueOnce(groqErrorResponse(429))
      .mockResolvedValueOnce(groqErrorResponse(429));
    mockCallCerebras.mockResolvedValue({ ok: false, status: 500 });

    const res = await handler(fakeReq("POST"));
    expect(res.status).toBe(503);
  });

  // ── Redis failure ─────────────────────────────────────────────────────────
  it("returns 503 with UPSTASH message on Redis init failure", async () => {
    mockFromEnv.mockImplementationOnce(() => {
      throw new Error("UPSTASH_REDIS_REST_URL missing");
    });
    const res = await handler(fakeReq("POST"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/KV/i);
  });
});
