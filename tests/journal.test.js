// Unit tests for api/journal.js — Redis CRUD jurnal sync
// Mocks: @upstash/redis, _auth.js

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockKv, mockFromEnv } = vi.hoisted(() => {
  const mockKv = {
    get: vi.fn(),
    set: vi.fn(),
  };
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

import handler from "../api/journal.js";

function fakeReq(method, opts = {}) {
  const rawText =
    opts.rawText ??
    (opts.body !== undefined ? JSON.stringify(opts.body) : "{}");
  return {
    method,
    headers: { get: () => null },
    text: vi.fn(async () => rawText),
    json: vi.fn(async () => {
      if (opts.jsonError) throw new Error("parse error");
      return opts.body;
    }),
  };
}

describe("journal API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromEnv.mockReturnValue(mockKv);
    mockKv.get.mockResolvedValue([]);
    mockKv.set.mockResolvedValue("OK");
  });

  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  // ── GET ──────────────────────────────────────────────────────────────────────
  describe("GET", () => {
    it("returns empty array when no data in Redis", async () => {
      mockKv.get.mockResolvedValue(null);
      const res = await handler(fakeReq("GET"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });

    it("returns stored journal entries", async () => {
      const entries = [
        { id: 1, date: "2026-04-01", type: "tratament", note: "cupru" },
      ];
      mockKv.get.mockResolvedValue(entries);
      const res = await handler(fakeReq("GET"));
      expect(await res.json()).toEqual(entries);
    });

    it("returns empty array on Redis timeout (graceful fallback)", async () => {
      mockKv.get.mockRejectedValue(new Error("Redis timeout"));
      const res = await handler(fakeReq("GET"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual([]);
    });
  });

  // ── POST ─────────────────────────────────────────────────────────────────────
  describe("POST", () => {
    it("rejects payload > 100KB with 413", async () => {
      const res = await handler(
        fakeReq("POST", { rawText: "x".repeat(100_001) }),
      );
      expect(res.status).toBe(413);
      expect((await res.json()).error).toMatch(/prea mare/i);
    });

    it("rejects invalid JSON with 400", async () => {
      const res = await handler(
        fakeReq("POST", { rawText: "{ not valid json" }),
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/Body invalid/);
    });

    it("merges single entry successfully", async () => {
      const entry = {
        id: 1,
        date: "2026-04-01",
        type: "tratament",
        note: "cupru",
        timestamp: 100,
      };
      const res = await handler(fakeReq("POST", { body: entry }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.count).toBe(1);
    });

    it("merges array of entries", async () => {
      const entries = [
        { id: 1, date: "2026-04-01", type: "tratament" },
        { id: 2, date: "2026-04-02", type: "irigare" },
      ];
      const res = await handler(fakeReq("POST", { body: entries }));
      expect((await res.json()).count).toBe(2);
    });

    it("overwrites existing entry with same id (dedup by id)", async () => {
      mockKv.get.mockResolvedValue([
        { id: 1, date: "2026-01-01", type: "old", note: "old", timestamp: 50 },
      ]);
      const res = await handler(
        fakeReq("POST", {
          body: { id: 1, date: "2026-04-01", type: "new", note: "new" },
        }),
      );
      expect((await res.json()).count).toBe(1);
      const saved = mockKv.set.mock.calls[0][1];
      expect(saved[0].type).toBe("new");
    });

    it("skips entries missing required fields (id/date/type)", async () => {
      const entries = [
        { id: 1, date: "2026-04-01", type: "ok" },
        { id: "not-number", date: "2026-04-02", type: "bad" },
        { id: 2, type: "no-date" },
        { id: 3, date: "2026-04-03" },
      ];
      const res = await handler(fakeReq("POST", { body: entries }));
      expect((await res.json()).count).toBe(1);
    });

    it("truncates fields to max lengths", async () => {
      const entry = {
        id: 1,
        date: "2026-04-01-extra-data",
        type: "x".repeat(100),
        note: "n".repeat(1000),
      };
      await handler(fakeReq("POST", { body: entry }));
      const saved = mockKv.set.mock.calls[0][1][0];
      expect(saved.date).toBe("2026-04-01");
      expect(saved.type.length).toBe(50);
      expect(saved.note.length).toBe(500);
    });

    it("sorts merged entries by id descending", async () => {
      mockKv.get.mockResolvedValue([
        { id: 1, date: "2026-01-01", type: "a", note: "", timestamp: 1 },
      ]);
      const entries = [
        { id: 3, date: "2026-04-03", type: "c" },
        { id: 2, date: "2026-04-02", type: "b" },
      ];
      await handler(fakeReq("POST", { body: entries }));
      const saved = mockKv.set.mock.calls[0][1];
      expect(saved.map((e) => e.id)).toEqual([3, 2, 1]);
    });

    it("batch writes to Redis (journal data + last-update timestamp)", async () => {
      await handler(
        fakeReq("POST", {
          body: { id: 1, date: "2026-04-01", type: "a" },
        }),
      );
      // Promise.all does both set calls
      expect(mockKv.set).toHaveBeenCalledTimes(2);
      expect(mockKv.set.mock.calls[1][0]).toBe("livada:journal:last-update");
    });

    it("defaults note to empty string and timestamp to Date.now()", async () => {
      await handler(
        fakeReq("POST", {
          body: { id: 1, date: "2026-04-01", type: "test" },
        }),
      );
      const saved = mockKv.set.mock.calls[0][1][0];
      expect(saved.note).toBe("");
      expect(typeof saved.timestamp).toBe("number");
      expect(saved.timestamp).toBeGreaterThan(0);
    });
  });

  // ── DELETE ───────────────────────────────────────────────────────────────────
  describe("DELETE", () => {
    it("removes entry by id", async () => {
      mockKv.get.mockResolvedValue([
        { id: 1, date: "2026-04-01", type: "a" },
        { id: 2, date: "2026-04-02", type: "b" },
      ]);
      const res = await handler(fakeReq("DELETE", { body: { id: 1 } }));
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.count).toBe(1);
    });

    it("rejects non-numeric id with 400", async () => {
      const res = await handler(fakeReq("DELETE", { body: { id: "abc" } }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/ID invalid/);
    });

    it("rejects Infinity id with 400", async () => {
      const res = await handler(fakeReq("DELETE", { body: { id: Infinity } }));
      expect(res.status).toBe(400);
    });

    it("rejects invalid body (parse error) with 400", async () => {
      const req = {
        method: "DELETE",
        headers: { get: () => null },
        json: async () => {
          throw new Error("bad body");
        },
      };
      const res = await handler(req);
      expect(res.status).toBe(400);
    });

    it("returns count 0 when deleting non-existent id", async () => {
      mockKv.get.mockResolvedValue([]);
      const res = await handler(fakeReq("DELETE", { body: { id: 999 } }));
      expect((await res.json()).count).toBe(0);
    });
  });

  // ── Errors ───────────────────────────────────────────────────────────────────
  it("returns 405 for unsupported methods", async () => {
    const res = await handler(fakeReq("PUT"));
    expect(res.status).toBe(405);
    expect((await res.json()).error).toMatch(/nepermisa/i);
  });

  it("returns 503 when Redis.fromEnv throws", async () => {
    mockFromEnv.mockImplementationOnce(() => {
      throw new Error("UPSTASH_REDIS_REST_URL missing");
    });
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/stocare indisponibil/i);
  });
});
