// Unit tests for api/ping.js — health check extins cu cron staleness (H3 Sprint 1)
// Mocks: _auth.js + @upstash/redis

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockKv, mockFromEnv } = vi.hoisted(() => {
  const mockKv = { get: vi.fn() };
  return { mockKv, mockFromEnv: vi.fn(() => mockKv) };
});

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: mockFromEnv },
}));

vi.mock("../api/_auth.js", () => ({
  corsHeaders: vi.fn(() => ({ "Access-Control-Allow-Origin": "*" })),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));

import handler from "../api/ping.js";
import { handleOptions } from "../api/_auth.js";

function fakeReq(method = "GET") {
  return { method, headers: { get: () => null } };
}

describe("ping API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromEnv.mockReturnValue(mockKv);
    mockKv.get.mockResolvedValue(null);
  });

  it("OPTIONS returns 204 via handleOptions", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
    expect(handleOptions).toHaveBeenCalled();
  });

  it("returns 200 with ok:true when cron is fresh (<90min)", async () => {
    mockKv.get.mockResolvedValue({
      success: true,
      timestamp: Date.now() - 30 * 60 * 1000, // 30 min in urma
    });
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.cron.stale).toBe(false);
    expect(body.cron.success).toBe(true);
    expect(body.cron.ageMinutes).toBeGreaterThanOrEqual(29);
    expect(body.cron.ageMinutes).toBeLessThanOrEqual(31);
  });

  // Nota: dupa commit c686d6b (2026-04-14), ping.js intoarce mereu 200 ca
  // health check server. Staleness cronului ramane vizibila in body
  // (cron.stale + cronStale), dar nu mai triggereaza 503 — pinger-ul extern
  // (UptimeRobot) decide, iar delay-uri GitHub Actions cron nu mai fac false
  // positive. Testele verifica acum body-ul, nu status code.
  it("returns 200 but body signals stale when cron >90min", async () => {
    mockKv.get.mockResolvedValue({
      success: true,
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2h in urma
    });
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.cron.stale).toBe(true);
    expect(body.cronStale).toBe(true);
  });

  it("returns 200 but body marks stale when last cron had success:false", async () => {
    mockKv.get.mockResolvedValue({
      success: false,
      timestamp: Date.now() - 5 * 60 * 1000, // fresh but failed
      error: "Open-Meteo timeout",
    });
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cron.stale).toBe(true);
  });

  it("returns 200 with reason:no_data when Redis has no cron data", async () => {
    mockKv.get.mockResolvedValue(null);
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cron.reason).toBe("no_data");
    expect(body.cronStale).toBe(true);
  });

  it("returns 200 when Redis errors (extern monitor decide)", async () => {
    mockFromEnv.mockImplementation(() => {
      throw new Error("Redis down");
    });
    const res = await handler(fakeReq("GET"));
    // Redis down nu e automat stale — lasam monitorul extern sa decide
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cron.error).toBeTruthy();
  });

  it("returns Content-Type application/json + no-store", async () => {
    mockKv.get.mockResolvedValue({ success: true, timestamp: Date.now() });
    const res = await handler(fakeReq("GET"));
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
