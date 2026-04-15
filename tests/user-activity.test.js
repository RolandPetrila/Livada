// Unit tests for api/user-activity.js — Redis-backed audit log (C Sprint 3)
// Mocks: @upstash/redis, _auth.js, _timeout.js

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockKv, mockFromEnv, mockPipeline } = vi.hoisted(() => {
  const mockPipeline = {
    lpush: vi.fn().mockReturnThis(),
    ltrim: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };
  const mockKv = {
    pipeline: vi.fn(() => mockPipeline),
    lrange: vi.fn(),
  };
  return { mockKv, mockFromEnv: vi.fn(() => mockKv), mockPipeline };
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

import handler from "../api/user-activity.js";

function fakeReq(method = "GET", body = null, query = "") {
  return {
    method,
    url: `https://livada-mea-psi.vercel.app/api/user-activity${query}`,
    headers: { get: () => null },
    text: async () => (body ? JSON.stringify(body) : ""),
  };
}

describe("user-activity API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromEnv.mockReturnValue(mockKv);
    mockPipeline.lpush.mockReturnThis();
    mockPipeline.ltrim.mockReturnThis();
    mockPipeline.exec.mockResolvedValue([]);
    mockKv.lrange.mockResolvedValue([]);
  });

  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("POST writes batch of events + ltrim rolling", async () => {
    const body = {
      events: [
        { module: "UI", action: "modal-open", status: "diagnose" },
        { module: "AI", action: "ask", status: "OK" },
      ],
    };
    const res = await handler(fakeReq("POST", body));
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.written).toBe(2);
    expect(mockPipeline.lpush).toHaveBeenCalledTimes(2);
    expect(mockPipeline.ltrim).toHaveBeenCalledWith(
      "livada:user-activity",
      0,
      999,
    );
  });

  it("POST rejects body > 50KB", async () => {
    const bigDetail = "x".repeat(51_000);
    const req = fakeReq("POST");
    req.text = async () => bigDetail;
    const res = await handler(req);
    expect(res.status).toBe(413);
  });

  it("POST rejects invalid JSON", async () => {
    const req = fakeReq("POST");
    req.text = async () => "{not json";
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it("POST rejects batch > 50 events", async () => {
    const events = [];
    for (let i = 0; i < 51; i++) events.push({ module: "X", action: "Y" });
    const res = await handler(fakeReq("POST", { events }));
    expect(res.status).toBe(400);
  });

  it("POST rejects empty events array", async () => {
    const res = await handler(fakeReq("POST", { events: [] }));
    expect(res.status).toBe(400);
  });

  it("POST truncates fields longer than limits", async () => {
    const body = {
      events: [
        {
          module: "a".repeat(50),
          action: "b".repeat(100),
          status: "c".repeat(50),
          detail: "d".repeat(200),
        },
      ],
    };
    const res = await handler(fakeReq("POST", body));
    expect(res.status).toBe(200);
    // Check lpush was called with truncated strings
    const lpushCall = mockPipeline.lpush.mock.calls[0];
    const eventStr = lpushCall[1];
    const event = JSON.parse(eventStr);
    expect(event.module.length).toBe(20);
    expect(event.action.length).toBe(40);
    expect(event.status.length).toBe(20);
    expect(event.detail.length).toBe(100);
  });

  it("POST skips events with invalid timestamps", async () => {
    const body = {
      events: [
        { module: "UI", action: "test", ts: Date.now() + 2 * 86400_000 }, // >24h future
        { module: "UI", action: "valid" },
      ],
    };
    const res = await handler(fakeReq("POST", body));
    const result = await res.json();
    expect(result.written).toBe(1);
  });

  it("GET returns events from Redis list", async () => {
    const sample = [
      JSON.stringify({ ts: 1, module: "UI", action: "open" }),
      JSON.stringify({ ts: 2, module: "AI", action: "ask", status: "OK" }),
    ];
    mockKv.lrange.mockResolvedValue(sample);
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(2);
    expect(body.events[0].module).toBe("UI");
  });

  it("GET clamps limit to 1-1000", async () => {
    mockKv.lrange.mockResolvedValue([]);
    await handler(fakeReq("GET", null, "?limit=5000"));
    // Verify lrange was called with max 999 (limit - 1)
    expect(mockKv.lrange).toHaveBeenCalledWith("livada:user-activity", 0, 999);
  });

  it("GET handles corrupted entries gracefully", async () => {
    mockKv.lrange.mockResolvedValue([
      JSON.stringify({ module: "UI", action: "ok" }),
      "not valid json",
      JSON.stringify({ module: "AI" }),
    ]);
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(2); // skipped corrupt entry
  });

  it("returns 503 when Redis throws on init", async () => {
    mockFromEnv.mockImplementation(() => {
      throw new Error("not configured");
    });
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(503);
  });

  it("returns 405 for unsupported methods", async () => {
    const res = await handler(fakeReq("DELETE"));
    expect(res.status).toBe(405);
  });
});
