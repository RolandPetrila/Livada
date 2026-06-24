// Unit tests for api/push-broadcast.js — Web Push fan-out (Node.js legacy req/res)
// Mocks: @upstash/redis, web-push
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockKv, mockFromEnv, mockSend, mockSetVapid } = vi.hoisted(() => {
  const mockKv = {
    get: vi.fn(),
    set: vi.fn(),
    smembers: vi.fn(),
    srem: vi.fn(),
  };
  return {
    mockKv,
    mockFromEnv: vi.fn(() => mockKv),
    mockSend: vi.fn(),
    mockSetVapid: vi.fn(),
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: mockFromEnv },
}));

vi.mock("web-push", () => ({
  default: { setVapidDetails: mockSetVapid, sendNotification: mockSend },
}));

import handler from "../api/push-broadcast.js";

const SECRET = "test-cron-secret";

function makeRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(o) {
      this.body = o;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

function fakeReq(method = "POST", { auth = `Bearer ${SECRET}`, body } = {}) {
  return { method, headers: { authorization: auth }, body: body ?? {} };
}

const sub = {
  endpoint: "https://push.example.com/x",
  keys: { auth: "a", p256dh: "p" },
};
const alert = {
  type: "frost",
  title: "Inghet",
  body: "Risc inghet",
  date: "2026-06-24",
};

describe("push-broadcast API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromEnv.mockReturnValue(mockKv);
    mockKv.get.mockResolvedValue(null); // nimic trimis azi
    mockKv.set.mockResolvedValue("OK");
    mockKv.smembers.mockResolvedValue([JSON.stringify(sub)]);
    mockKv.srem.mockResolvedValue(1);
    mockSend.mockResolvedValue({});
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("OPTIONS returns 204", async () => {
    const res = makeRes();
    await handler(fakeReq("OPTIONS"), res);
    expect(res.statusCode).toBe(204);
  });

  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await handler(fakeReq("GET"), res);
    expect(res.statusCode).toBe(405);
  });

  it("rejects wrong CRON_SECRET with 401", async () => {
    const res = makeRes();
    await handler(
      fakeReq("POST", { auth: "Bearer wrong", body: { alerts: [alert] } }),
      res,
    );
    expect(res.statusCode).toBe(401);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 503 when VAPID keys missing", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    const res = makeRes();
    await handler(fakeReq("POST", { body: { alerts: [alert] } }), res);
    expect(res.statusCode).toBe(503);
  });

  it("returns 200 sent:0 when no alerts", async () => {
    const res = makeRes();
    await handler(fakeReq("POST", { body: { alerts: [] } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, sent: 0, reason: "no_alerts" });
  });

  it("sends notification to subscribers and returns sent count", async () => {
    const res = makeRes();
    await handler(fakeReq("POST", { body: { alerts: [alert] } }), res);
    expect(res.statusCode).toBe(200);
    expect(mockSetVapid).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(res.body.sent).toBe(1);
  });

  it("skips alert already sent today (dedup 24h)", async () => {
    mockKv.get.mockResolvedValue(1); // wasSentToday → true
    const res = makeRes();
    await handler(fakeReq("POST", { body: { alerts: [alert] } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ reason: "dedup_24h" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns no_subscribers when subscriber set is empty", async () => {
    mockKv.smembers.mockResolvedValue([]);
    const res = makeRes();
    await handler(fakeReq("POST", { body: { alerts: [alert] } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ reason: "no_subscribers" });
  });

  it("cleans up dead subscriptions on 410 Gone", async () => {
    mockSend.mockRejectedValueOnce({ statusCode: 410 });
    const res = makeRes();
    await handler(fakeReq("POST", { body: { alerts: [alert] } }), res);
    expect(res.statusCode).toBe(200);
    expect(mockKv.srem).toHaveBeenCalled();
    expect(res.body.removed).toBe(1);
  });
});
