// Unit tests for api/ask.js — Groq AI intrebari cu fallback chain
// Mocks: _auth.js, _timeout.js, _ai.js, global fetch

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFetchWithTimeout, mockCallCerebras } = vi.hoisted(() => ({
  mockFetchWithTimeout: vi.fn(),
  mockCallCerebras: vi.fn(),
}));

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));

vi.mock("../api/_timeout.js", () => ({
  fetchWithTimeout: mockFetchWithTimeout,
}));

vi.mock("../api/_ai.js", () => ({
  callCerebras: mockCallCerebras,
  CEREBRAS_MODEL: "gpt-oss-120b",
}));

import handler from "../api/ask.js";

function fakeReq(method, opts = {}) {
  const rawText =
    opts.rawText ??
    (opts.body !== undefined ? JSON.stringify(opts.body) : "{}");
  return {
    method,
    headers: { get: (name) => opts.headers?.[name.toLowerCase()] ?? null },
    text: vi.fn(async () => rawText),
  };
}

function groqOkResponse(answer = "Raspuns test", model = "test-model") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: answer } }],
      usage: { total_tokens: 100 },
    }),
    text: async () => "",
  };
}

function groqErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    json: async () => ({ error: "fail" }),
    text: async () => "error body",
  };
}

describe("ask API route", () => {
  const ORIGINAL_KEY = process.env.GROQ_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = "test-groq-key-1234";
    delete process.env.CEREBRAS_API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_KEY) process.env.GROQ_API_KEY = ORIGINAL_KEY;
    else delete process.env.GROQ_API_KEY;
  });

  it("OPTIONS returns 204", async () => {
    const res = await handler(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("rejects non-POST methods with 405", async () => {
    const res = await handler(fakeReq("GET"));
    expect(res.status).toBe(405);
  });

  it("returns 500 when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const res = await handler(fakeReq("POST", { body: { question: "test?" } }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/GROQ_API_KEY/);
  });

  it("rejects payload > 50KB with 413", async () => {
    const res = await handler(fakeReq("POST", { rawText: "x".repeat(50_001) }));
    expect(res.status).toBe(413);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await handler(fakeReq("POST", { rawText: "{bad json" }));
    expect(res.status).toBe(400);
  });

  it("rejects empty question with 400", async () => {
    const res = await handler(fakeReq("POST", { body: { question: "   " } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/intrebare/i);
  });

  it("rejects missing question with 400", async () => {
    const res = await handler(fakeReq("POST", { body: { species: "Mar" } }));
    expect(res.status).toBe(400);
  });

  // ── Groq primary success ──────────────────────────────────────────────────
  it("returns answer from Groq primary model (llama-4-scout)", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      groqOkResponse("Raspunsul la intrebare"),
    );
    const res = await handler(
      fakeReq("POST", {
        body: { question: "Cand se tund ciresii?", species: "Cires" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toBe("Raspunsul la intrebare");
    expect(body._model).toBe("llama-4-scout");
  });

  it("includes species and context in Groq prompt", async () => {
    mockFetchWithTimeout.mockResolvedValue(groqOkResponse());
    await handler(
      fakeReq("POST", {
        body: {
          question: "test?",
          species: "Piersic",
          context: "Documentatie piersic",
        },
      }),
    );
    const callBody = JSON.parse(mockFetchWithTimeout.mock.calls[0][1].body);
    expect(callBody.messages[0].content).toContain("Piersic");
    expect(callBody.messages[1].content).toContain("Documentatie piersic");
    expect(callBody.messages[1].content).toContain("test?");
  });

  // ── Fallback chain ────────────────────────────────────────────────────────
  it("falls back to llama-3.3-70b when scout fails", async () => {
    mockFetchWithTimeout
      .mockResolvedValueOnce(groqErrorResponse(500)) // scout fails
      .mockResolvedValueOnce(groqOkResponse("Fallback answer")); // 70b ok

    const res = await handler(fakeReq("POST", { body: { question: "test?" } }));
    const body = await res.json();
    expect(body.answer).toBe("Fallback answer");
    expect(body._fallback).toBe(true);
    expect(body._model).toBe("llama-3.3-70b-versatile");
  });

  it("falls back to Cerebras when all Groq models fail", async () => {
    mockFetchWithTimeout
      .mockResolvedValueOnce(groqErrorResponse(500)) // scout fails
      .mockResolvedValueOnce(groqErrorResponse(500)); // 70b fails
    mockCallCerebras.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Cerebras raspuns" } }],
      }),
    });

    const res = await handler(fakeReq("POST", { body: { question: "test?" } }));
    const body = await res.json();
    expect(body.answer).toBe("Cerebras raspuns");
    expect(body._model).toBe("Cerebras gpt-oss-120b");
  });

  it("returns 503 when all AI providers fail", async () => {
    mockFetchWithTimeout
      .mockResolvedValueOnce(groqErrorResponse(500))
      .mockResolvedValueOnce(groqErrorResponse(500));
    mockCallCerebras.mockResolvedValue({ ok: false, status: 500 });

    const res = await handler(fakeReq("POST", { body: { question: "test?" } }));
    expect(res.status).toBe(503);
  });

  it("does not try fallback when Groq returns 401/403 (auth error)", async () => {
    mockFetchWithTimeout.mockResolvedValue(groqErrorResponse(401));
    const res = await handler(fakeReq("POST", { body: { question: "test?" } }));
    expect(res.status).toBe(503);
    // Only 1 fetch call — no fallback attempted
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  // ── preferModel = cerebras ────────────────────────────────────────────────
  it("skips Groq and calls Cerebras directly when preferModel=cerebras", async () => {
    mockCallCerebras.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Cerebras direct" } }],
      }),
    });

    const res = await handler(
      fakeReq("POST", {
        body: { question: "test?", preferModel: "cerebras" },
      }),
    );
    const body = await res.json();
    expect(body.answer).toBe("Cerebras direct");
    expect(body._model).toBe("Cerebras gpt-oss-120b");
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("returns 503 when preferModel=cerebras and Cerebras fails", async () => {
    mockCallCerebras.mockRejectedValue(new Error("Cerebras down"));
    const res = await handler(
      fakeReq("POST", {
        body: { question: "test?", preferModel: "cerebras" },
      }),
    );
    expect(res.status).toBe(503);
  });

  // ── Error handling ────────────────────────────────────────────────────────
  it("handles AbortError (timeout) gracefully", async () => {
    const abortErr = new Error("timeout");
    abortErr.name = "AbortError";
    mockFetchWithTimeout.mockRejectedValue(abortErr);

    const res = await handler(fakeReq("POST", { body: { question: "test?" } }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/lent/i);
  });

  it("handles 429 (rate limit) from Groq", async () => {
    // Scout returns 429, no fallback (because we need to check the flow)
    // Actually, 429 is not 401/403, so it does try fallback
    mockFetchWithTimeout
      .mockResolvedValueOnce(groqErrorResponse(429)) // scout 429
      .mockResolvedValueOnce(groqErrorResponse(429)); // 70b 429
    mockCallCerebras.mockResolvedValue({ ok: false, status: 500 });

    const res = await handler(fakeReq("POST", { body: { question: "test?" } }));
    expect(res.status).toBe(503);
  });

  it("truncates question to 8000 chars", async () => {
    mockFetchWithTimeout.mockResolvedValue(groqOkResponse());
    await handler(
      fakeReq("POST", {
        body: { question: "q".repeat(10000) },
      }),
    );
    const callBody = JSON.parse(mockFetchWithTimeout.mock.calls[0][1].body);
    const userMsg = callBody.messages[1].content;
    expect(userMsg.length).toBeLessThanOrEqual(8100); // 8000 + prefix text
  });

  it("truncates context to 12000 chars", async () => {
    mockFetchWithTimeout.mockResolvedValue(groqOkResponse());
    await handler(
      fakeReq("POST", {
        body: { question: "test?", context: "c".repeat(15000) },
      }),
    );
    const callBody = JSON.parse(mockFetchWithTimeout.mock.calls[0][1].body);
    const userMsg = callBody.messages[1].content;
    // Context is substring(0, 12000) so msg should be less than 12000 + question + prefix
    expect(userMsg.length).toBeLessThan(13000);
  });
});
