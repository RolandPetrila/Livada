// Unit tests for api/meteo-refresh.js — proxy endpoint catre meteo-cron cu CRON_SECRET server-side
// Critical: tocmai a fost reparat flow-ul de auth CRON_SECRET (incident 2026-04-14)
// Mocks: _auth.js + global fetch

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({ "X-Test": "1" })),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));

import handler from "../api/meteo-refresh.js";
import { checkOrigin, rateLimit } from "../api/_auth.js";

function fakeReq(
  method = "GET",
  url = "https://livada-mea-psi.vercel.app/api/meteo-refresh",
) {
  return {
    method,
    url,
    headers: { get: () => null },
  };
}

describe("meteo-refresh API route", () => {
  const ORIG_SECRET = process.env.CRON_SECRET;
  const ORIG_FETCH = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    if (ORIG_SECRET) process.env.CRON_SECRET = ORIG_SECRET;
    else delete process.env.CRON_SECRET;
    globalThis.fetch = ORIG_FETCH;
  });

  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("returns 503 if CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/Serviciu indisponibil/);
  });

  it("rejects request when checkOrigin denies", async () => {
    checkOrigin.mockReturnValueOnce(
      new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }),
    );
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(403);
  });

  it("rejects request when rateLimit throttles (3 req/min)", async () => {
    rateLimit.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Prea multe cereri" }), {
        status: 429,
      }),
    );
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(429);
    // Verify rateLimit was called with max=3 (restrictive)
    expect(rateLimit).toHaveBeenCalledWith(expect.anything(), 3);
  });

  it("proxies to /api/meteo-cron with Bearer CRON_SECRET and forwards response", async () => {
    const mockCronResponse = {
      success: true,
      date: "2026-04-15",
      temp: 12.5,
      frostAlert: false,
    };
    globalThis.fetch = vi.fn(async () => ({
      status: 200,
      json: async () => mockCronResponse,
    }));

    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockCronResponse);

    // Verify it called meteo-cron with correct auth header
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://livada-mea-psi.vercel.app/api/meteo-cron",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-cron-secret",
        }),
      }),
    );
  });

  it("forwards non-200 status from meteo-cron", async () => {
    globalThis.fetch = vi.fn(async () => ({
      status: 500,
      json: async () => ({ error: "Internal error" }),
    }));
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal error");
  });

  it("returns 502 when fetch to meteo-cron throws (timeout/network)", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("Network timeout");
    });
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/Actualizare esuata/);
  });

  it("sets Cache-Control no-cache in response", async () => {
    globalThis.fetch = vi.fn(async () => ({
      status: 200,
      json: async () => ({ success: true }),
    }));
    const res = await handler(fakeReq("GET"));
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
  });
});
