// Unit tests for api/identify.js — identificare specie din poza
// Lant: Pl@ntNet + Gemini + GPT-4.1 in paralel → fallback (key2/Mistral/xAI)
// Mocks: _auth.js, _ai.js, _timeout.js, _quota.js, env vars
// Focus: OPTIONS, 405, validare input, quota (NU 429 — sare providerul), happy-path minimal.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockCallGemini,
  mockCallOpenAIVision,
  mockGeminiText,
  mockOpenaiText,
  mockFetchWithTimeout,
  mockCheckAndIncrementQuota,
} = vi.hoisted(() => ({
  mockCallGemini: vi.fn(),
  mockCallOpenAIVision: vi.fn(),
  mockGeminiText: vi.fn(),
  mockOpenaiText: vi.fn(),
  mockFetchWithTimeout: vi.fn(),
  mockCheckAndIncrementQuota: vi.fn(),
}));

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));

// identify.js imports: callGemini, callOpenAIVision, geminiText, openaiText
vi.mock("../api/_ai.js", () => ({
  callGemini: mockCallGemini,
  callOpenAIVision: mockCallOpenAIVision,
  geminiText: mockGeminiText,
  openaiText: mockOpenaiText,
}));

vi.mock("../api/_timeout.js", () => ({
  fetchWithTimeout: mockFetchWithTimeout,
}));

vi.mock("../api/_quota.js", () => ({
  checkAndIncrementQuota: mockCheckAndIncrementQuota,
}));

import handler from "../api/identify.js";

function fakeReq(method, body = {}) {
  return {
    method,
    headers: { get: () => null },
    json: vi.fn(async () => body),
  };
}

// "iVBORw0KGgo=" e base64 valid → atob() nu arunca pe happy-path.
const validBody = {
  base64: "iVBORw0KGgo=",
  mimeType: "image/jpeg",
  organ: "leaf",
};

describe("identify API route", () => {
  const ORIG = {
    GEMINI: process.env.GOOGLE_AI_API_KEY,
    GEMINI2: process.env.GOOGLE_AI_API_KEY_2,
    PLANTNET: process.env.PLANTNET_API_KEY,
    GH: process.env.GITHUB_MODELS_TOKEN,
    MISTRAL: process.env.MISTRAL_API_KEY,
    XAI: process.env.XAI_API_KEY,
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Default: quota OK (Gemini nu e blocat)
    mockCheckAndIncrementQuota.mockResolvedValue({
      ok: true,
      used: 1,
      limit: 1000,
      percent: 0,
    });

    // Default env: doar Gemini key1 prezent
    process.env.GOOGLE_AI_API_KEY = "test-gemini-key";
    delete process.env.GOOGLE_AI_API_KEY_2;
    delete process.env.PLANTNET_API_KEY;
    delete process.env.GITHUB_MODELS_TOKEN;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.XAI_API_KEY;

    // Default: Gemini reuseste
    mockCallGemini.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Identificare test" }] } }],
      }),
    });
    mockGeminiText.mockReturnValue("**SPECIE IDENTIFICATA:** Malus domestica");

    // Default: vision providers / plantnet rejected (no keys)
    mockCallOpenAIVision.mockRejectedValue(new Error("no key"));
    mockFetchWithTimeout.mockRejectedValue(new Error("no plantnet key"));
    mockOpenaiText.mockReturnValue(null);
  });

  afterEach(() => {
    const restore = (k, v) => {
      if (v !== undefined) process.env[k] = v;
      else delete process.env[k];
    };
    restore("GOOGLE_AI_API_KEY", ORIG.GEMINI);
    restore("GOOGLE_AI_API_KEY_2", ORIG.GEMINI2);
    restore("PLANTNET_API_KEY", ORIG.PLANTNET);
    restore("GITHUB_MODELS_TOKEN", ORIG.GH);
    restore("MISTRAL_API_KEY", ORIG.MISTRAL);
    restore("XAI_API_KEY", ORIG.XAI);
  });

  // ── Contract de baza ────────────────────────────────────────────────────────
  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("rejects non-POST with 405", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(405);
    expect((await res.json()).error).toMatch(/nepermisa/i);
  });

  // ── Validare input ──────────────────────────────────────────────────────────
  it("rejects missing base64 with 400", async () => {
    const res = await handler(
      fakeReq("POST", { mimeType: "image/jpeg", organ: "leaf" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/imaginea/i);
  });

  it("rejects non-string base64 with 400", async () => {
    const res = await handler(fakeReq("POST", { ...validBody, base64: 12345 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/imaginea/i);
  });

  it("rejects oversized base64 (>5MB) with 400", async () => {
    // Folosim caractere base64 valide ca sa nu cada inainte la atob.
    const res = await handler(
      fakeReq("POST", {
        ...validBody,
        base64: "A".repeat(5 * 1024 * 1024 + 4),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/prea mare/i);
  });

  it("rejects malformed base64 (atob throws) with 400", async () => {
    // Caracter invalid in base64 → atob arunca → 400 "base64 malformat"
    const res = await handler(
      fakeReq("POST", { ...validBody, base64: "@@@not-base64@@@" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/base64 malformat/i);
  });

  it("rejects invalid body (json parse error) with 400", async () => {
    const req = {
      method: "POST",
      headers: { get: () => null },
      json: async () => {
        throw new Error("bad json");
      },
    };
    const res = await handler(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/citire date/i);
  });

  // ── Happy path minimal ──────────────────────────────────────────────────────
  it("returns 200 with parsed AI result when Gemini succeeds", async () => {
    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ai).toBeTruthy();
    expect(body.ai.model).toBe("gemini-2.5-flash");
    expect(body.ai.text).toContain("Malus domestica");
    expect(Array.isArray(body.results)).toBe(true);
    expect(mockCallGemini).toHaveBeenCalled();
  });

  it("returns Pl@ntNet results when Pl@ntNet succeeds", async () => {
    process.env.PLANTNET_API_KEY = "test-plantnet-key";
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            score: 0.92,
            species: {
              scientificNameWithoutAuthor: "Malus domestica",
              commonNames: ["Mar", "Apple"],
              family: { scientificNameWithoutAuthor: "Rosaceae" },
            },
          },
        ],
      }),
    });
    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBe(1);
    expect(body.results[0].scientificName).toBe("Malus domestica");
    expect(body.results[0].score).toBe(92);
    expect(body.results[0].family).toBe("Rosaceae");
  });

  // ── Quota guard: NU 429 — doar sare Gemini (fix 2026-06-24) ─────────────────
  it("does NOT return 429 when Gemini quota is exhausted — skips Gemini, uses GPT-4.1", async () => {
    // Quota blocata → geminiBlocked=true → callGemini NU e apelat pt parallel primary
    mockCheckAndIncrementQuota.mockResolvedValue({
      ok: false,
      used: 1000,
      limit: 1000,
      percent: 100,
    });
    process.env.GITHUB_MODELS_TOKEN = "test-gh-token";
    mockCallOpenAIVision.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    mockOpenaiText.mockReturnValue("GPT-4.1 identificare");

    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Gemini sarit (quota) — nu apelat in parallel primary
    expect(mockCallGemini).not.toHaveBeenCalled();
    expect(body.ai.text).toBe("GPT-4.1 identificare");
    expect(body.ai.model).toBe("gpt-4.1 (github)");
  });

  // ── GPT-4.1 fallback cand Gemini pica ──────────────────────────────────────
  it("uses GPT-4.1 result when Gemini fails but GH token available", async () => {
    process.env.GITHUB_MODELS_TOKEN = "test-gh-token";
    mockCallGemini.mockResolvedValue({ ok: false, status: 500 });
    mockGeminiText.mockReturnValue(null);
    mockCallOpenAIVision.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    mockOpenaiText.mockReturnValue("GPT vision result");

    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ai.model).toBe("gpt-4.1 (github)");
    expect(body.ai.text).toBe("GPT vision result");
  });

  // ── Toate sursele pica → 503 ───────────────────────────────────────────────
  it("returns 503 when neither Pl@ntNet nor any AI responds", async () => {
    // Gemini pica, niciun alt provider configurat, plantnet reject
    mockCallGemini.mockResolvedValue({ ok: false, status: 500 });
    mockGeminiText.mockReturnValue(null);
    mockOpenaiText.mockReturnValue(null);

    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/esuat/i);
  });

  // ── Fallback secundar: Mistral (pixtral) ───────────────────────────────────
  it("falls back to Mistral pixtral when primary AI all fail", async () => {
    process.env.MISTRAL_API_KEY = "test-mistral-key";
    // Gemini primary pica
    mockCallGemini.mockResolvedValue({ ok: false, status: 500 });
    mockGeminiText.mockReturnValue(null);
    // Fara GH_TOKEN, GPT-4.1 paralel NU apeleaza callOpenAIVision (Promise.reject in allSettled).
    // callOpenAIVision e apelat o singura data — pt pixtral (fallback).
    mockCallOpenAIVision.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    mockOpenaiText.mockReturnValue("Pixtral identificare");

    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ai.model).toContain("pixtral");
    expect(body.ai.text).toBe("Pixtral identificare");
  });

  // ── Sanitizare mimeType invalid → image/jpeg (nu arunca) ───────────────────
  it("sanitizes invalid mimeType to image/jpeg and still succeeds", async () => {
    const res = await handler(
      fakeReq("POST", { ...validBody, mimeType: "text/html" }),
    );
    expect(res.status).toBe(200);
    // mimeType e arg #4 (index 3) la callGemini
    const mimeArg = mockCallGemini.mock.calls[0][3];
    expect(mimeArg).toBe("image/jpeg");
  });
});
