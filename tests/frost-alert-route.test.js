// Unit tests for api/frost-alert.js — the API route (reads all alerts from Redis)
// Distinct from frost-alert.test.js which tests isAlertStale logic
// Mocks: @upstash/redis, _auth.js

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockKv, mockFromEnv } = vi.hoisted(() => {
  const mockKv = { get: vi.fn() };
  return { mockKv, mockFromEnv: vi.fn(() => mockKv) };
});

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: mockFromEnv },
}));

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({ "X-Test": "1" })),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));

import handler from "../api/frost-alert.js";
import { checkOrigin, rateLimit } from "../api/_auth.js";

function fakeReq(method = "GET") {
  return {
    method,
    headers: {
      get: () => null,
    },
  };
}

describe("frost-alert API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromEnv.mockReturnValue(mockKv);
    // Default: all Redis keys return null
    mockKv.get.mockResolvedValue(null);
  });

  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("calls checkOrigin and rateLimit", async () => {
    await handler(fakeReq("GET"));
    expect(checkOrigin).toHaveBeenCalled();
    expect(rateLimit).toHaveBeenCalled();
  });

  it("returns default inactive alerts when Redis is empty", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.frost).toEqual({ active: false });
    expect(body.disease).toEqual({ active: false });
    expect(body.hail).toEqual({ active: false });
    expect(body.wind).toEqual({ active: false });
    expect(body.heat).toEqual({ active: false });
    expect(body.rain).toEqual({ active: false });
    expect(body.drought).toEqual({ active: false });
    expect(body.journal).toEqual([]);
  });

  it("returns stored alert data from Redis", async () => {
    const frostData = {
      active: true,
      minTemp: 1.5,
      date: "2026-04-14",
      message: "Inghet prognozat!",
    };
    const journalData = [
      { key: "frost:2026-04-14", type: "frost", message: "test" },
    ];

    // Mock Redis.get to return different data based on key
    mockKv.get.mockImplementation((key) => {
      if (key === "livada:frost-alert") return Promise.resolve(frostData);
      if (key === "livada:alert-journal") return Promise.resolve(journalData);
      return Promise.resolve(null);
    });

    const res = await handler(fakeReq("GET"));
    const body = await res.json();
    expect(body.frost).toEqual(frostData);
    expect(body.journal).toEqual(journalData);
    expect(body.disease).toEqual({ active: false });
  });

  it("includes Cache-Control header (5 min)", async () => {
    const res = await handler(fakeReq("GET"));
    const cc = res.headers.get("Cache-Control");
    expect(cc).toBe("public, max-age=300");
  });

  it("returns graceful defaults when Redis throws (KV unavailable)", async () => {
    mockFromEnv.mockImplementationOnce(() => {
      throw new Error("Redis unavailable");
    });
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.frost).toEqual({ active: false });
    expect(body.journal).toEqual([]);
  });

  it("handles individual Redis key timeout gracefully", async () => {
    // All .get() calls have .catch(() => null), so individual failures return null
    mockKv.get.mockRejectedValue(new Error("timeout"));
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.frost).toEqual({ active: false });
  });

  it("reads all 8 Redis keys in parallel", async () => {
    await handler(fakeReq("GET"));
    expect(mockKv.get).toHaveBeenCalledTimes(8);
    const keys = mockKv.get.mock.calls.map((c) => c[0]);
    expect(keys).toContain("livada:frost-alert");
    expect(keys).toContain("livada:disease-risk");
    expect(keys).toContain("livada:alert-hail");
    expect(keys).toContain("livada:alert-wind");
    expect(keys).toContain("livada:alert-heat");
    expect(keys).toContain("livada:alert-rain");
    expect(keys).toContain("livada:alert-drought");
    expect(keys).toContain("livada:alert-journal");
  });
});
