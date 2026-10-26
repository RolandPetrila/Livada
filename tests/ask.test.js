// Unit tests pentru api/ask.js — Intreaba AI: Groq GPT-OSS → Qwen → Gemini Lite; a doua parere
// Mocks: _auth.js, _timeout.js (router pe URL/model), _quota.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { okOpenAI, okGemini, fail, routeFetch, callLog, readJson, jsonReq, describeCall } from "./helpers/ai.js";

const { mockFetchWithTimeout, mockRecord } = vi.hoisted(() => ({
  mockFetchWithTimeout: vi.fn(),
  mockRecord: vi.fn(async () => {}),
}));

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));
vi.mock("../api/_timeout.js", () => ({ fetchWithTimeout: mockFetchWithTimeout }));
vi.mock("../api/_quota.js", () => ({ recordAiCalls: mockRecord }));

import handler from "../api/ask.js";

const ask = (body) => handler(jsonReq("/api/ask", "POST", body));

describe("ask API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    process.env.GROQ_API_KEY = "test-groq";
    process.env.GOOGLE_AI_API_KEY = "k1";
    process.env.GOOGLE_AI_API_KEY_2 = "k2";
    routeFetch(mockFetchWithTimeout, (c) =>
      c.provider === "groq" ? okOpenAI("Raspuns Groq") : okGemini("Raspuns Gemini"),
    );
  });

  it("405 pe GET", async () => {
    const res = await handler(jsonReq("/api/ask", "GET"));
    expect(res.status).toBe(405);
  });

  it("400 la intrebare goala", async () => {
    const res = await ask({ question: "   " });
    expect(res.status).toBe(400);
  });

  it("413 la payload prea mare", async () => {
    const res = await ask({ question: "x".repeat(60000) });
    expect(res.status).toBe(413);
  });

  it("raspunde din modelul principal Groq GPT-OSS 120B, fara fallback", async () => {
    const res = await ask({ question: "Cand tai ciresul?", species: "Cires" });
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect(data).toEqual({ answer: "Raspuns Groq", _model: "Groq GPT-OSS 120B" });
    expect(callLog(mockFetchWithTimeout)).toEqual(["groq:openai/gpt-oss-120b"]);
    expect(mockRecord).toHaveBeenCalledWith([{ provider: "groq", ok: true }]);
  });

  it("include data, specia si contextul in prompt; trunchiaza intrebarea si contextul", async () => {
    await ask({ question: "q".repeat(9000), species: "Cires", context: "c".repeat(13000) });
    const { body } = describeCall(...mockFetchWithTimeout.mock.calls[0]);
    expect(body.messages[0].content).toContain("Specia curenta: Cires");
    expect(body.messages[0].content).toMatch(/Data de azi este/);
    const user = body.messages[1].content;
    expect(user).toContain("c".repeat(12000));
    expect(user).not.toContain("c".repeat(12001));
    expect(user).toContain("q".repeat(8000));
    expect(user).not.toContain("q".repeat(8001));
  });

  it("model Groq retras (404) → Qwen, cu motiv lizibil", async () => {
    routeFetch(mockFetchWithTimeout, (c) =>
      c.model === "openai/gpt-oss-120b" ? fail(404, "model_not_found") : okOpenAI("Raspuns Qwen"),
    );
    const data = await readJson(await ask({ question: "q" }));
    expect(data.answer).toBe("Raspuns Qwen");
    expect(data._model).toBe("Groq Qwen 3.8");
    expect(data._fallback).toBe(true);
    expect(data._fallbackReason).toBe("Groq GPT-OSS 120B: model retras");
  });

  it("tot Groq picat → Gemini Flash-Lite pe cheia 2", async () => {
    routeFetch(mockFetchWithTimeout, (c) =>
      c.provider === "groq" ? fail(429, "rate") : okGemini("Raspuns Gemini"),
    );
    const data = await readJson(await ask({ question: "q" }));
    expect(data._model).toBe("Gemini 3.5 Flash-Lite");
    expect(data._fallbackReason).toBe("Groq GPT-OSS 120B: prea multe cereri acum");
    const last = describeCall(...mockFetchWithTimeout.mock.calls.at(-1));
    expect(last.key).toBe("k2");
    expect(last.model).toBe("gemini-3.5-flash-lite");
  });

  it("fara GROQ_API_KEY → direct la Gemini (fara 500)", async () => {
    delete process.env.GROQ_API_KEY;
    const data = await readJson(await ask({ question: "q" }));
    expect(data._model).toBe("Gemini 3.5 Flash-Lite");
    expect(callLog(mockFetchWithTimeout)).toEqual(["gemini:gemini-3.5-flash-lite"]);
  });

  it("toti furnizorii picati → { error } in corp (status 200, raspuns in flux)", async () => {
    routeFetch(mockFetchWithTimeout, () => fail(500));
    const res = await ask({ question: "q" });
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect(data.error).toMatch(/AI indisponibil/);
    expect(callLog(mockFetchWithTimeout)).toHaveLength(4);
  });

  it("a doua parere (preferModel=second) foloseste Gemini, nu Groq", async () => {
    const data = await readJson(await ask({ question: "q", preferModel: "second" }));
    expect(data).toMatchObject({ answer: "Raspuns Gemini", _model: "Gemini 3.5 Flash-Lite", _second: true });
    expect(data._fallback).toBeUndefined();
    expect(callLog(mockFetchWithTimeout)).toEqual(["gemini:gemini-3.5-flash-lite"]);
  });

  it("preferModel=cerebras (app.js vechi in cache) e tratat ca a doua parere", async () => {
    const data = await readJson(await ask({ question: "q", preferModel: "cerebras" }));
    expect(data._second).toBe(true);
    expect(data._model).toBe("Gemini 3.5 Flash-Lite");
  });

  it("a doua parere: Gemini picat pe ambele chei → Groq Qwen", async () => {
    routeFetch(mockFetchWithTimeout, (c) =>
      c.provider === "gemini" ? fail(503) : okOpenAI("Raspuns Qwen"),
    );
    const data = await readJson(await ask({ question: "q", preferModel: "second" }));
    expect(data._model).toBe("Groq Qwen 3.8");
    expect(callLog(mockFetchWithTimeout)).toEqual([
      "gemini:gemini-3.5-flash-lite",
      "gemini:gemini-3.5-flash-lite",
      "groq:qwen/qwen3.8-27b",
    ]);
  });

  it("a doua parere: totul picat → mesaj dedicat", async () => {
    routeFetch(mockFetchWithTimeout, () => fail(500));
    const data = await readJson(await ask({ question: "q", preferModel: "second" }));
    expect(data.error).toMatch(/A doua parere/);
  });
});
