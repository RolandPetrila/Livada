// Unit tests for api/diagnose.js — Gemini diagnostic foto AI cu fallback chain
// Mocks: _auth.js, _ai.js, _timeout.js (for callPlantId), env vars

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockCallGemini,
  mockCallOpenAIVision,
  mockGeminiText,
  mockOpenaiText,
  mockFetchWithTimeout,
} = vi.hoisted(() => ({
  mockCallGemini: vi.fn(),
  mockCallOpenAIVision: vi.fn(),
  mockGeminiText: vi.fn(),
  mockOpenaiText: vi.fn(),
  mockFetchWithTimeout: vi.fn(),
}));

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));

vi.mock("../api/_ai.js", () => ({
  callGemini: mockCallGemini,
  callOpenAIVision: mockCallOpenAIVision,
  geminiText: mockGeminiText,
  openaiText: mockOpenaiText,
}));

// T1 Sprint 1: mock quota module (nu cheie Redis in teste)
vi.mock("../api/_quota.js", () => ({
  checkAndIncrementQuota: vi.fn(async () => ({
    ok: true,
    used: 1,
    limit: 1000,
    percent: 0,
  })),
}));

vi.mock("../api/_timeout.js", () => ({
  fetchWithTimeout: mockFetchWithTimeout,
}));

import handler from "../api/diagnose.js";

function fakeReq(method, body = {}) {
  return {
    method,
    headers: { get: () => null },
    json: vi.fn(async () => body),
  };
}

const validBody = {
  base64: "iVBORw0KGgo=", // small fake base64
  mimeType: "image/jpeg",
  species: "Cires",
};

describe("diagnose API route", () => {
  const ORIG_GEMINI = process.env.GOOGLE_AI_API_KEY;
  const ORIG_PLANT = process.env.PLANT_ID_API_KEY;
  const ORIG_GH = process.env.GITHUB_MODELS_TOKEN;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GOOGLE_AI_API_KEY = "test-gemini-key";
    delete process.env.PLANT_ID_API_KEY;
    delete process.env.PLANTNET_API_KEY;
    delete process.env.PLANT_ID_USE_V3;
    delete process.env.GITHUB_MODELS_TOKEN;
    delete process.env.GOOGLE_AI_API_KEY_2;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.XAI_API_KEY;

    // Default: Gemini succeeds
    mockCallGemini.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Diagnostic test" }] } }],
      }),
    });
    mockGeminiText.mockReturnValue("Diagnostic test");

    // Default: Plant.id and GPT-4.1 rejected (no keys)
    mockCallOpenAIVision.mockRejectedValue(new Error("no key"));
    mockFetchWithTimeout.mockRejectedValue(new Error("no key"));
  });

  afterEach(() => {
    if (ORIG_GEMINI) process.env.GOOGLE_AI_API_KEY = ORIG_GEMINI;
    else delete process.env.GOOGLE_AI_API_KEY;
    if (ORIG_PLANT) process.env.PLANT_ID_API_KEY = ORIG_PLANT;
    else delete process.env.PLANT_ID_API_KEY;
    if (ORIG_GH) process.env.GITHUB_MODELS_TOKEN = ORIG_GH;
    else delete process.env.GITHUB_MODELS_TOKEN;
  });

  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("rejects non-POST with 405", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(405);
  });

  it("returns 500 when GOOGLE_AI_API_KEY is missing", async () => {
    delete process.env.GOOGLE_AI_API_KEY;
    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/GOOGLE_AI_API_KEY/);
  });

  // ── Input validation ──────────────────────────────────────────────────────
  it("rejects missing base64 with 400", async () => {
    const res = await handler(
      fakeReq("POST", { mimeType: "image/jpeg", species: "Mar" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/imaginea/i);
  });

  it("rejects oversized base64 (>5MB) with 400", async () => {
    const res = await handler(
      fakeReq("POST", {
        ...validBody,
        base64: "x".repeat(5 * 1024 * 1024 + 1),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/prea mar[ie]/i);
  });

  it("sanitizes invalid mimeType to image/jpeg", async () => {
    const res = await handler(
      fakeReq("POST", { ...validBody, mimeType: "text/html" }),
    );
    expect(res.status).toBe(200);
    expect(mockCallGemini).toHaveBeenCalled();
    // 3rd arg now is images array; mimeType lives in images[0].mimeType
    const imgsArg = mockCallGemini.mock.calls[0][2];
    expect(Array.isArray(imgsArg)).toBe(true);
    expect(imgsArg[0].mimeType).toBe("image/jpeg");
  });

  it("accepts valid mimeTypes (png, webp, gif, heic, heif)", async () => {
    for (const mime of [
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ]) {
      vi.clearAllMocks();
      mockCallGemini.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      mockGeminiText.mockReturnValue("ok");
      const res = await handler(
        fakeReq("POST", { ...validBody, mimeType: mime }),
      );
      expect(res.status).toBe(200);
    }
  });

  it("sanitizes species (strips special chars, truncates to 100)", async () => {
    const res = await handler(
      fakeReq("POST", {
        ...validBody,
        species: '<script>alert("xss")</script>' + "A".repeat(200),
      }),
    );
    expect(res.status).toBe(200);
    // Prompt sent to Gemini should have sanitized species
    const prompt = mockCallGemini.mock.calls[0][4]; // 5th arg is prompt
    expect(prompt).not.toContain("<script>");
    expect(prompt.length).toBeLessThan(2000); // reasonable prompt length
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
  });

  // ── Gemini success ────────────────────────────────────────────────────────
  it("returns diagnosis from Gemini on success", async () => {
    mockGeminiText.mockReturnValue("**DIAGNOSTIC:** Rapan pe mar");
    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.diagnosis).toContain("Rapan pe mar");
  });

  // ── Gemini pro → flash fallback ───────────────────────────────────────────
  it("falls back from Gemini pro to flash when pro fails", async () => {
    mockCallGemini
      .mockResolvedValueOnce({ ok: false, status: 429 }) // pro fails
      .mockResolvedValueOnce({
        // flash succeeds
        ok: true,
        json: async () => ({}),
      });
    // geminiText is called ONCE — on the final settled result (flash)
    mockGeminiText.mockReturnValue("Flash diag");

    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(200);
    expect(mockCallGemini).toHaveBeenCalledTimes(2);
    // First call should be pro, second flash
    expect(mockCallGemini.mock.calls[0][1]).toContain("pro");
    expect(mockCallGemini.mock.calls[1][1]).toBe("gemini-2.5-flash");
  });

  // ── GPT-4.1 fallback ─────────────────────────────────────────────────────
  it("uses GPT-4.1 when Gemini fails and GH token available", async () => {
    process.env.GITHUB_MODELS_TOKEN = "test-gh-token";
    mockCallGemini.mockResolvedValue({ ok: false, status: 500 });
    mockGeminiText.mockReturnValue(null);
    mockCallOpenAIVision.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    mockOpenaiText.mockReturnValue("GPT-4.1 diagnostic");

    const res = await handler(fakeReq("POST", validBody));
    const body = await res.json();
    expect(body.diagnosis).toBe("GPT-4.1 diagnostic");
    expect(body._fallback).toBe(true);
  });

  // ── All primary fail → 503 ────────────────────────────────────────────────
  it("returns 503 when all AI providers fail", async () => {
    mockCallGemini.mockResolvedValue({ ok: false, status: 500 });
    mockGeminiText.mockReturnValue(null);
    mockOpenaiText.mockReturnValue(null);

    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/indisponibil/i);
  });

  // ── Plant.id integration ──────────────────────────────────────────────────
  it("prepends Plant.id result when available", async () => {
    process.env.PLANT_ID_API_KEY = "test-plantid-key";
    process.env.PLANT_ID_USE_V3 = "1";

    // Plant.id v3 success
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          is_plant: { binary: true },
          is_healthy: { binary: false, probability: 0.3 },
          disease: {
            suggestions: [{ name: "Rapan", probability: 0.85 }],
          },
        },
      }),
    });

    // geminiText is called once on the settled Gemini result
    mockGeminiText.mockReturnValue("Diagnostic Gemini complet");

    const res = await handler(fakeReq("POST", validBody));
    const body = await res.json();
    expect(body.diagnosis).toContain("Plant.id");
    expect(body.diagnosis).toContain("Rapan");
    expect(body.diagnosis).toContain("Diagnostic Gemini complet");
    expect(body._plantid).toBe(true);
  });

  it("skips Plant.id prefix when plant is healthy", async () => {
    process.env.PLANT_ID_API_KEY = "test-plantid-key";
    process.env.PLANT_ID_USE_V3 = "1";

    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          is_plant: { binary: true },
          is_healthy: { binary: true, probability: 0.95 },
          disease: { suggestions: [] },
        },
      }),
    });

    mockGeminiText.mockReturnValue("Gemini text");

    const res = await handler(fakeReq("POST", validBody));
    const body = await res.json();
    expect(body.diagnosis).toContain("SANATOASA");
    expect(body.diagnosis).toContain("Gemini text");
  });

  // ── Multi-image (max 4) ───────────────────────────────────────────────────
  it("accepts images[] array (multi-photo)", async () => {
    mockGeminiText.mockReturnValue("Diag multi");
    const res = await handler(
      fakeReq("POST", {
        images: [
          { base64: "img1aaa", mimeType: "image/jpeg" },
          { base64: "img2bbb", mimeType: "image/jpeg" },
          { base64: "img3ccc", mimeType: "image/jpeg" },
        ],
        species: "Cires",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body._imagesCount).toBe(3);
    // callGemini receives the images array as 3rd arg
    const imgsArg = mockCallGemini.mock.calls[0][2];
    expect(Array.isArray(imgsArg)).toBe(true);
    expect(imgsArg.length).toBe(3);
  });

  it("rejects more than 4 images", async () => {
    const big = Array.from({ length: 5 }, (_, i) => ({
      base64: "img" + i,
      mimeType: "image/jpeg",
    }));
    const res = await handler(fakeReq("POST", { images: big, species: "Mar" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Maxim 4/i);
  });

  it("rejects when total bytes across images exceed limit", async () => {
    const huge = [
      { base64: "x".repeat(3 * 1024 * 1024), mimeType: "image/jpeg" },
      { base64: "x".repeat(3 * 1024 * 1024), mimeType: "image/jpeg" },
    ];
    const res = await handler(
      fakeReq("POST", { images: huge, species: "Mar" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/prea mari/i);
  });

  // ── P1 fix: mesaj corect cand Plant.id v2 e singurul disponibil ──────────
  it("returns honest fallback message when only Plant.id v2 ID + AI all failed", async () => {
    process.env.PLANT_ID_API_KEY = "test-plantid-key";
    // Default: PLANT_ID_USE_V3 not set → v2 path. Mock v2 response.
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          {
            plant_name: "Magnolia grandiflora",
            probability: 0.81,
            plant_details: { common_names: ["southern magnolia"] },
          },
        ],
      }),
    });
    // All AI fails
    mockCallGemini.mockResolvedValue({ ok: false, status: 500 });
    mockGeminiText.mockReturnValue(null);

    const res = await handler(fakeReq("POST", validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body._fallback).toBe(true);
    expect(body._plantid).toBe(true);
    expect(body.diagnosis).toContain("Magnolia grandiflora");
    // Mesajul nou — nu mai pretinde ca au fost detectate boli
    expect(body.diagnosis).not.toContain("a detectat bolile de mai sus");
    expect(body.diagnosis).toMatch(/Diagnostic.*indisponibil|indisponibil/i);
  });

  // ── Gemini key2 fallback ──────────────────────────────────────────────────
  it("tries Gemini key2 when primary providers fail", async () => {
    process.env.GOOGLE_AI_API_KEY_2 = "test-gemini-key2";
    // All primary fail
    mockCallGemini
      .mockResolvedValueOnce({ ok: false, status: 500 }) // pro key1
      .mockResolvedValueOnce({ ok: false, status: 500 }) // flash key1 (returned by callGeminiProWithFallback)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      }); // flash key2
    // geminiText called once: for the key2 result (primary gemini was not ok, so skipped)
    mockGeminiText.mockReturnValue("Key2 diagnostic");

    const res = await handler(fakeReq("POST", validBody));
    const body = await res.json();
    expect(body.diagnosis).toBe("Key2 diagnostic");
    expect(body._fallback).toBe(true);
  });
});
