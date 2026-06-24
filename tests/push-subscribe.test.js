// Unit tests for api/push-subscribe.js — Web Push subscribe/unsubscribe (Edge)
// Mocks: @upstash/redis, _auth.js
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockKv, mockFromEnv } = vi.hoisted(() => {
  const mockKv = { sadd: vi.fn(), srem: vi.fn() };
  return { mockKv, mockFromEnv: vi.fn(() => mockKv) };
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

import handler from "../api/push-subscribe.js";

const validSub = {
  endpoint: "https://push.example.com/abc",
  keys: { auth: "a", p256dh: "p" },
};

function fakeReq(method = "POST", body) {
  return {
    method,
    headers: { get: () => null },
    json: vi.fn(async () => body ?? {}),
  };
}

describe("push-subscribe API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromEnv.mockReturnValue(mockKv);
    mockKv.sadd.mockResolvedValue(1);
    mockKv.srem.mockResolvedValue(1);
  });

  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("rejects invalid subscription (no endpoint/keys) with 400", async () => {
    const res = await handler(
      fakeReq("POST", { subscription: { endpoint: "x" } }),
    );
    expect(res.status).toBe(400);
    expect(mockKv.sadd).not.toHaveBeenCalled();
  });

  it("subscribes a valid subscription (sadd) → 200", async () => {
    const res = await handler(fakeReq("POST", { subscription: validSub }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, action: "subscribed" });
    expect(mockKv.sadd).toHaveBeenCalledWith(
      "livada:push-subs",
      JSON.stringify(validSub),
    );
  });

  it("unsubscribes via DELETE (srem) → 200", async () => {
    const res = await handler(fakeReq("DELETE", { subscription: validSub }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, action: "unsubscribed" });
    expect(mockKv.srem).toHaveBeenCalledWith(
      "livada:push-subs",
      JSON.stringify(validSub),
    );
    expect(mockKv.sadd).not.toHaveBeenCalled();
  });

  it("unsubscribes via action=unsubscribe (srem) → 200", async () => {
    const res = await handler(
      fakeReq("POST", { subscription: validSub, action: "unsubscribe" }),
    );
    expect(res.status).toBe(200);
    expect(mockKv.srem).toHaveBeenCalled();
  });

  it("returns 503 when Redis is not configured", async () => {
    mockFromEnv.mockImplementationOnce(() => {
      throw new Error("no redis");
    });
    const res = await handler(fakeReq("POST", { subscription: validSub }));
    expect(res.status).toBe(503);
  });

  it("on write error returns 500 WITHOUT leaking err.message (FT7)", async () => {
    mockKv.sadd.mockRejectedValueOnce(new Error("redis-internal-detail"));
    const res = await handler(fakeReq("POST", { subscription: validSub }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.detail).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("redis-internal-detail");
  });
});
