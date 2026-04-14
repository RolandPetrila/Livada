// Unit tests for api/ping.js — simple health check endpoint
// Mocks: _auth.js

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api/_auth.js", () => ({
  corsHeaders: vi.fn(() => ({ "Access-Control-Allow-Origin": "*" })),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
}));

import handler from "../api/ping.js";
import { handleOptions, corsHeaders } from "../api/_auth.js";

function fakeReq(method = "GET") {
  return { method, headers: { get: () => null } };
}

describe("ping API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("OPTIONS returns 204 via handleOptions", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
    expect(handleOptions).toHaveBeenCalled();
  });

  it("GET returns 200 with ok:true and timestamp", async () => {
    const before = Date.now();
    const res = await handler(fakeReq("GET"));
    const after = Date.now();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.t).toBe("number");
    expect(body.t).toBeGreaterThanOrEqual(before);
    expect(body.t).toBeLessThanOrEqual(after);
  });

  it("returns Content-Type application/json", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("applies corsHeaders on GET response", async () => {
    await handler(fakeReq("GET"));
    expect(corsHeaders).toHaveBeenCalled();
  });
});
