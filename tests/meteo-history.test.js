// Unit tests for api/meteo-history.js — Redis read endpoint pentru istoric meteo 30 zile
// Mocks: @upstash/redis, _auth.js, _timeout.js

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

vi.mock("../api/_timeout.js", () => ({
  withTimeout: vi.fn((promise) => promise),
}));

import handler from "../api/meteo-history.js";

function fakeReq(method = "GET", query = "") {
  return {
    method,
    url: `https://livada-mea-psi.vercel.app/api/meteo-history${query}`,
    headers: { get: () => null },
  };
}

const sampleHistory = {
  "2026-04-10": { temp: 15, temp_min: 5, temp_max: 18 },
  "2026-04-11": { temp: 16, temp_min: 6, temp_max: 19 },
  "2026-04-12": { temp: 14, temp_min: 4, temp_max: 17 },
  "2026-04-13": { temp: 13, temp_min: 3, temp_max: 16 },
  "2026-04-14": { temp: 17, temp_min: 7, temp_max: 20 },
};

describe("meteo-history API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromEnv.mockReturnValue(mockKv);
    mockKv.get.mockResolvedValue(sampleHistory);
  });

  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("returns full history when days=30 (default)", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).length).toBe(5);
    expect(body["2026-04-14"]).toBeDefined();
  });

  it("filters to last N days via query param", async () => {
    const res = await handler(fakeReq("GET", "?days=3"));
    const body = await res.json();
    expect(Object.keys(body).length).toBe(3);
    expect(body["2026-04-14"]).toBeDefined();
    expect(body["2026-04-10"]).toBeUndefined();
  });

  it("clamps days correctly: 0 fallbacks to default 30, 999 clamps to 365", async () => {
    // days=0 → parseInt('0')||30 → 30 (fallback), returns all 5 entries
    const res1 = await handler(fakeReq("GET", "?days=0"));
    const body1 = await res1.json();
    expect(Object.keys(body1).length).toBe(5);

    // days=1 → clamps to min 1
    const res2 = await handler(fakeReq("GET", "?days=1"));
    const body2 = await res2.json();
    expect(Object.keys(body2).length).toBe(1);

    // days=999 → clamps to 365, returns all 5 available
    const res3 = await handler(fakeReq("GET", "?days=999"));
    const body3 = await res3.json();
    expect(Object.keys(body3).length).toBe(5);
  });

  it("returns empty object when Redis has no history", async () => {
    mockKv.get.mockResolvedValue(null);
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({});
  });

  it("handles Redis returning array (invalid type) gracefully", async () => {
    mockKv.get.mockResolvedValue([1, 2, 3]);
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({});
  });

  it("filters out entries with invalid date keys", async () => {
    mockKv.get.mockResolvedValue({
      "2026-04-14": { temp: 15 },
      "invalid-key": { temp: 99 },
      "2026/04/10": { temp: 10 }, // wrong format
    });
    const res = await handler(fakeReq("GET"));
    const body = await res.json();
    expect(Object.keys(body).length).toBe(1);
    expect(body["2026-04-14"]).toBeDefined();
  });

  it("returns 503 if Redis.fromEnv throws (not configured)", async () => {
    mockFromEnv.mockImplementation(() => {
      throw new Error("Redis not configured");
    });
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(503);
  });

  it("sets Cache-Control public max-age=1800", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.headers.get("Cache-Control")).toMatch(/max-age=1800/);
  });

  it("handles Redis timeout gracefully (returns empty)", async () => {
    mockKv.get.mockRejectedValue(new Error("Redis timeout"));
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({});
  });
});
