// Unit tests for api/photos.js — galeria foto (Vercel Blob + cache Redis)
// GOTCHA: ruta NODE cu `export default { async fetch(req) }` (NU `export default function`).
//   Daca cineva revine la `export default function`, `mod.fetch` devine undefined
//   → 504 in productie. Testul OPTIONS→204 + metoda gresita→405 blocheaza acea regresie.
// Mocks: @vercel/blob (put/list/del), @upstash/redis (Redis.fromEnv), _auth.js

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPut, mockList, mockDel, mockKv, mockFromEnv } = vi.hoisted(() => {
  const mockKv = { get: vi.fn(), set: vi.fn(), del: vi.fn() };
  return {
    mockPut: vi.fn(),
    mockList: vi.fn(),
    mockDel: vi.fn(),
    mockKv,
    mockFromEnv: vi.fn(() => mockKv),
  };
});

vi.mock("@vercel/blob", () => ({
  put: mockPut,
  list: mockList,
  del: mockDel,
}));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: mockFromEnv },
}));

vi.mock("../api/_auth.js", () => ({
  corsHeaders: vi.fn(() => ({ "X-Test": "1" })),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  checkAuth: vi.fn(() => null),
  checkOrigin: vi.fn(() => null),
  rateLimit: vi.fn(async () => null),
}));

import mod from "../api/photos.js";
import {
  checkOrigin,
  checkAuth,
  rateLimit,
  handleOptions,
} from "../api/_auth.js";

// Ruta Node Web Standard: handler-ul real e `mod.fetch`. Acesta e contractul anti-504.
const handler = (req) => mod.fetch(req);

function fakeReq(method = "GET", opts = {}) {
  const url = opts.url ?? "http://localhost/api/photos";
  return {
    method,
    url,
    headers: { get: (name) => opts.headers?.[name.toLowerCase()] ?? null },
    formData: opts.formData,
    json: opts.json,
  };
}

describe("photos API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromEnv.mockReturnValue(mockKv);
    mockKv.get.mockResolvedValue(null);
    mockKv.set.mockResolvedValue("OK");
    mockKv.del.mockResolvedValue(1);
    mockList.mockResolvedValue({ blobs: [] });
  });

  // ── Contract anti-504: forma export-ului ───────────────────────────────────
  it("exports a Web Standard fetch handler (NOT export default function)", () => {
    expect(typeof mod).toBe("object");
    expect(typeof mod.fetch).toBe("function");
  });

  it("OPTIONS returns 204 (preflight)", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
    expect(handleOptions).toHaveBeenCalled();
  });

  it("unknown method (PUT) returns 405", async () => {
    const res = await handler(fakeReq("PUT"));
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toMatch(/nepermisa/i);
  });

  // ── checkOrigin gate ───────────────────────────────────────────────────────
  it("calls checkOrigin and returns its error when origin denied", async () => {
    checkOrigin.mockReturnValueOnce(
      Response.json({ error: "Origine nepermisa" }, { status: 403 }),
    );
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(403);
  });

  // ── GET — list ─────────────────────────────────────────────────────────────
  it("GET returns 200 with photo list from blob list()", async () => {
    mockList.mockResolvedValue({
      blobs: [
        {
          url: "https://x.public.blob.vercel-storage.com/livada/photos/general/1.jpg",
          pathname: "livada/photos/general/1.jpg",
          size: 1234,
          uploadedAt: "2026-06-24T00:00:00.000Z",
        },
      ],
    });
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    expect(rateLimit).toHaveBeenCalled();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].pathname).toBe("livada/photos/general/1.jpg");
    expect(res.headers.get("X-Photos-Cache")).toBe("MISS");
  });

  it("GET serves from Redis cache (HIT) without calling list()", async () => {
    mockKv.get.mockResolvedValue([
      { url: "u", pathname: "p", size: 1, uploadedAt: "t" },
    ]);
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Photos-Cache")).toBe("HIT");
    expect(mockList).not.toHaveBeenCalled();
  });

  it("GET caches the list result in Redis (set with TTL)", async () => {
    mockList.mockResolvedValue({
      blobs: [
        {
          url: "u",
          pathname: "livada/photos/general/1.jpg",
          size: 1,
          uploadedAt: "t",
        },
      ],
    });
    await handler(fakeReq("GET"));
    expect(mockKv.set).toHaveBeenCalled();
    const [, , opts] = mockKv.set.mock.calls[0];
    expect(opts).toMatchObject({ ex: 3600 });
  });

  it("GET degrades gracefully (200, empty) when list() times out and no cache", async () => {
    mockList.mockImplementation(
      () =>
        new Promise((_, reject) =>
          // resolves after the route's 7s timeout would have fired
          setTimeout(() => reject(new Error("never")), 60_000),
        ),
    );
    vi.useFakeTimers();
    const p = handler(fakeReq("GET"));
    await vi.advanceTimersByTimeAsync(8000);
    const res = await p;
    vi.useRealTimers();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("GET filters species (sanitized) into blob prefix", async () => {
    await handler(
      fakeReq("GET", { url: "http://localhost/api/photos?species=Cires" }),
    );
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: "livada/photos/Cires/" }),
    );
  });

  // ── POST — upload ──────────────────────────────────────────────────────────
  function fakeFormData(map) {
    return { get: (k) => (k in map ? map[k] : null) };
  }

  it("POST with invalid formData returns 400 (not 500/504)", async () => {
    const res = await handler(
      fakeReq("POST", {
        formData: vi.fn(async () => {
          throw new Error("bad form");
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect(checkAuth).toHaveBeenCalled();
  });

  it("POST without file returns 400", async () => {
    const res = await handler(
      fakeReq("POST", {
        formData: vi.fn(async () => fakeFormData({ species: "Mar" })),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/fisier/i);
  });

  it("POST with invalid file type returns 400", async () => {
    const file = { type: "application/pdf", size: 100, name: "x.pdf" };
    const res = await handler(
      fakeReq("POST", {
        formData: vi.fn(async () => fakeFormData({ file })),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Format invalid/i);
  });

  it("POST with oversized file (>5MB) returns 400", async () => {
    const file = { type: "image/jpeg", size: 6 * 1024 * 1024, name: "big.jpg" };
    const res = await handler(
      fakeReq("POST", {
        formData: vi.fn(async () => fakeFormData({ file })),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/5MB/);
  });

  it("POST valid upload returns 200 and calls put() + invalidates cache", async () => {
    const file = { type: "image/jpeg", size: 1000, name: "p.jpg" };
    mockPut.mockResolvedValue({
      url: "https://x.public.blob.vercel-storage.com/livada/photos/Mar/123.jpg",
      pathname: "livada/photos/Mar/123.jpg",
    });
    const res = await handler(
      fakeReq("POST", {
        formData: vi.fn(async () => fakeFormData({ file, species: "Mar" })),
      }),
    );
    expect(res.status).toBe(200);
    expect(mockPut).toHaveBeenCalled();
    const body = await res.json();
    expect(body.pathname).toBe("livada/photos/Mar/123.jpg");
    expect(mockKv.del).toHaveBeenCalled(); // invalidatePhotoCache
  });

  // ── DELETE ─────────────────────────────────────────────────────────────────
  it("DELETE without url returns 400", async () => {
    const res = await handler(
      fakeReq("DELETE", { json: vi.fn(async () => ({})) }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/URL lipsa/i);
  });

  it("DELETE rejects url not belonging to this project (400)", async () => {
    const res = await handler(
      fakeReq("DELETE", {
        json: vi.fn(async () => ({ url: "https://evil.com/foo.jpg" })),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/nu apartine/i);
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("DELETE valid project url returns 200 and calls del()", async () => {
    const url =
      "https://x.public.blob.vercel-storage.com/livada/photos/Mar/123.jpg";
    const res = await handler(
      fakeReq("DELETE", { json: vi.fn(async () => ({ url })) }),
    );
    expect(res.status).toBe(200);
    expect(mockDel).toHaveBeenCalledWith(url);
    expect((await res.json()).ok).toBe(true);
  });

  it("DELETE with invalid json body returns 400", async () => {
    const res = await handler(
      fakeReq("DELETE", {
        json: vi.fn(async () => {
          throw new Error("bad json");
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Body invalid/i);
  });

  // ── Blob token missing → 503 ───────────────────────────────────────────────
  it("returns 503 when Vercel Blob is not configured", async () => {
    const file = { type: "image/jpeg", size: 1000, name: "p.jpg" };
    mockPut.mockRejectedValue(new Error("No BLOB_READ_WRITE_TOKEN found"));
    const res = await handler(
      fakeReq("POST", {
        formData: vi.fn(async () => fakeFormData({ file, species: "Mar" })),
      }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Blob nu este configurat/i);
  });
});
