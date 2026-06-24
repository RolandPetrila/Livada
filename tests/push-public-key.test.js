// Unit tests for api/push-public-key.js — expune VAPID_PUBLIC_KEY pentru frontend.
// Mocks: _auth.js. Env via vi.stubEnv / vi.unstubAllEnvs.

import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../api/_auth.js", () => ({
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
}));

import handler from "../api/push-public-key.js";

function fakeReq(method = "GET") {
  return { method, headers: { get: () => null } };
}

describe("push-public-key API route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("OPTIONS returns 204 via handleOptions", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("GET with VAPID_PUBLIC_KEY set returns 200 with key + configured:true", async () => {
    vi.stubEnv("VAPID_PUBLIC_KEY", "BHello-test-vapid-public-key");
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.publicKey).toBe("BHello-test-vapid-public-key");
    expect(body.configured).toBe(true);
  });

  it("GET without VAPID_PUBLIC_KEY returns empty key + configured:false", async () => {
    vi.stubEnv("VAPID_PUBLIC_KEY", "");
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.publicKey).toBe("");
    expect(body.configured).toBe(false);
  });

  it("sets Cache-Control public max-age=3600", async () => {
    vi.stubEnv("VAPID_PUBLIC_KEY", "BSomeKey");
    const res = await handler(fakeReq("GET"));
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });
});
