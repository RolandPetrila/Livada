// Unit tests for api/_auth.js pure functions
// Covers: checkOrigin, corsHeaders, handleOptions, checkAuth
// Does NOT test rateLimit (requires Redis) — integration test territory

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkOrigin,
  corsHeaders,
  handleOptions,
  checkAuth,
} from "../api/_auth.js";

// Fake request helper — mimics Web API Request shape with Headers
function fakeReq(headers = {}) {
  return {
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  };
}

// Fake request with plain object headers (Node.js IncomingMessage shape)
function fakeReqPlain(headers = {}) {
  const lower = {};
  for (const k in headers) lower[k.toLowerCase()] = headers[k];
  return { headers: lower };
}

describe("checkOrigin", () => {
  it("allows production origin", () => {
    const req = fakeReq({ origin: "https://livada-mea-psi.vercel.app" });
    expect(checkOrigin(req)).toBeNull();
  });

  it("allows empty origin (cron/server-to-server)", () => {
    const req = fakeReq({});
    expect(checkOrigin(req)).toBeNull();
  });

  it("allows origin 'null' (PWA standalone)", () => {
    const req = fakeReq({ origin: "null" });
    expect(checkOrigin(req)).toBeNull();
  });

  it("allows Vercel preview URLs matching pattern", () => {
    const req = fakeReq({
      origin: "https://livada-abc123xyz-rolandpetrilas-projects.vercel.app",
    });
    expect(checkOrigin(req)).toBeNull();
  });

  it("rejects foreign origin", async () => {
    const req = fakeReq({ origin: "https://evil.example.com" });
    const res = checkOrigin(req);
    expect(res).not.toBeNull();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/nepermisa/i);
  });

  it("rejects preview URL from different project", () => {
    const req = fakeReq({
      origin: "https://other-abc-rolandpetrilas-projects.vercel.app",
    });
    const res = checkOrigin(req);
    expect(res).not.toBeNull();
    expect(res.status).toBe(403);
  });

  it("works with plain object headers (Node.js shape)", () => {
    const req = fakeReqPlain({ origin: "https://livada-mea-psi.vercel.app" });
    expect(checkOrigin(req)).toBeNull();
  });
});

describe("corsHeaders", () => {
  it("echoes allowed origin back", () => {
    const req = fakeReq({ origin: "https://livada-mea-psi.vercel.app" });
    const h = corsHeaders(req);
    expect(h["Access-Control-Allow-Origin"]).toBe(
      "https://livada-mea-psi.vercel.app",
    );
  });

  it("includes required CORS methods", () => {
    const req = fakeReq({ origin: "https://livada-mea-psi.vercel.app" });
    const h = corsHeaders(req);
    expect(h["Access-Control-Allow-Methods"]).toContain("POST");
    expect(h["Access-Control-Allow-Methods"]).toContain("DELETE");
    expect(h["Access-Control-Allow-Methods"]).toContain("OPTIONS");
  });

  it("includes x-livada-token in allowed headers", () => {
    const req = fakeReq({ origin: "https://livada-mea-psi.vercel.app" });
    const h = corsHeaders(req);
    expect(h["Access-Control-Allow-Headers"]).toContain("x-livada-token");
  });

  it("returns empty Allow-Origin for foreign origin", () => {
    const req = fakeReq({ origin: "https://evil.example.com" });
    const h = corsHeaders(req);
    expect(h["Access-Control-Allow-Origin"]).toBe("");
  });

  it("falls back to default origin when origin header missing", () => {
    const req = fakeReq({});
    const h = corsHeaders(req);
    expect(h["Access-Control-Allow-Origin"]).toBe(
      "https://livada-mea-psi.vercel.app",
    );
  });
});

describe("handleOptions", () => {
  it("returns 204 with CORS headers", () => {
    const req = fakeReq({ origin: "https://livada-mea-psi.vercel.app" });
    const res = handleOptions(req);
    expect(res.status).toBe(204);
  });
});

describe("checkAuth", () => {
  const ORIGINAL_TOKEN = process.env.LIVADA_API_TOKEN;

  afterEach(() => {
    // Restore env after each test to avoid leaks
    if (ORIGINAL_TOKEN === undefined) delete process.env.LIVADA_API_TOKEN;
    else process.env.LIVADA_API_TOKEN = ORIGINAL_TOKEN;
  });

  it("skips auth when token not set (backward compat)", () => {
    delete process.env.LIVADA_API_TOKEN;
    const req = fakeReq({});
    expect(checkAuth(req)).toBeNull();
  });

  it("skips auth when token is too short (< 16 chars)", () => {
    process.env.LIVADA_API_TOKEN = "short";
    const req = fakeReq({});
    expect(checkAuth(req)).toBeNull();
  });

  it("rejects request without token when token is configured", async () => {
    process.env.LIVADA_API_TOKEN = "a-long-enough-token-for-auth-check-1234";
    const req = fakeReq({});
    const res = checkAuth(req);
    expect(res).not.toBeNull();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Neautorizat/i);
  });

  it("rejects request with wrong token", async () => {
    process.env.LIVADA_API_TOKEN = "a-long-enough-token-for-auth-check-1234";
    const req = fakeReq({ "x-livada-token": "wrong-token-wrong-token-wrong" });
    const res = checkAuth(req);
    expect(res.status).toBe(401);
  });

  it("accepts request with correct token", () => {
    const TOKEN = "a-long-enough-token-for-auth-check-1234";
    process.env.LIVADA_API_TOKEN = TOKEN;
    const req = fakeReq({ "x-livada-token": TOKEN });
    expect(checkAuth(req)).toBeNull();
  });

  it("is case-sensitive on token value", () => {
    const TOKEN = "A-Long-Enough-Token-For-Auth-Check-1234";
    process.env.LIVADA_API_TOKEN = TOKEN;
    const req = fakeReq({ "x-livada-token": TOKEN.toLowerCase() });
    const res = checkAuth(req);
    expect(res.status).toBe(401);
  });
});
