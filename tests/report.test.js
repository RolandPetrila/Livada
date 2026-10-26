// Unit tests pentru api/report.js — raport anual: cache Redis + lant text (Groq → Qwen → Gemini)
// Mocks: @upstash/redis, _auth.js, _timeout.js (router), _quota.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { okOpenAI, okGemini, fail, routeFetch, callLog, readJson, jsonReq, describeCall } from "./helpers/ai.js";

const { mockKv, mockFromEnv, mockFetchWithTimeout, mockRecord } = vi.hoisted(() => {
  const mockKv = { get: vi.fn(), set: vi.fn() };
  return {
    mockKv,
    mockFromEnv: vi.fn(() => mockKv),
    mockFetchWithTimeout: vi.fn(),
    mockRecord: vi.fn(async () => {}),
  };
});

vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: mockFromEnv } }));
vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));
vi.mock("../api/_timeout.js", () => ({ fetchWithTimeout: mockFetchWithTimeout }));
vi.mock("../api/_quota.js", () => ({ recordAiCalls: mockRecord }));

import handler from "../api/report.js";

const year = new Date().getFullYear();
const post = (body = {}) => handler(jsonReq("/api/report", "POST", body));

function kvData({ cached = null, lastUpdate = null, journal = [], meteo = {} } = {}) {
  mockKv.get.mockImplementation(async (key) => {
    if (key === `livada:report:cache:${year}`) return cached;
    if (key === "livada:journal:last-update") return lastUpdate;
    if (key === "livada:journal") return journal;
    if (key === "livada:meteo:history") return meteo;
    return null;
  });
}

describe("report API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockFromEnv.mockImplementation(() => mockKv);
    mockKv.set.mockResolvedValue("OK");
    kvData();
    process.env.GROQ_API_KEY = "test-groq";
    process.env.GOOGLE_AI_API_KEY = "k1";
    process.env.GOOGLE_AI_API_KEY_2 = "k2";
    routeFetch(mockFetchWithTimeout, (c) =>
      c.provider === "groq" ? okOpenAI("Raport Groq") : okGemini("Raport Gemini"),
    );
  });

  it("405 pe GET", async () => {
    expect((await handler(jsonReq("/api/report", "GET"))).status).toBe(405);
  });

  it("intoarce raportul din cache (< 1h, jurnal neschimbat) fara apel AI", async () => {
    kvData({ cached: { report: "vechi", generatedAt: Date.now() - 60_000 } });
    const data = await readJson(await post());
    expect(data).toMatchObject({ report: "vechi", _cached: true });
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("regenereaza cand jurnalul s-a schimbat dupa generare", async () => {
    const gen = Date.now() - 60_000;
    kvData({ cached: { report: "vechi", generatedAt: gen }, lastUpdate: gen + 1000 });
    const data = await readJson(await post());
    expect(data.report).toBe("Raport Groq");
  });

  it("regenereaza cand cache-ul e mai vechi de 1h", async () => {
    kvData({ cached: { report: "vechi", generatedAt: Date.now() - 3700_000 } });
    expect((await readJson(await post())).report).toBe("Raport Groq");
  });

  it("genereaza cu Groq GPT-OSS, salveaza in cache 1h si raporteaza modelul", async () => {
    kvData({
      journal: [
        { date: `${year}-03-10`, type: "tratament", note: "zeama bordeleza" },
        { date: `${year - 1}-03-10`, type: "tratament", note: "an trecut" },
      ],
      meteo: { [`${year}-03-10`]: { temp_min: 1, temp_max: 12, description: "senin", humidity: 60 } },
    });
    const data = await readJson(await post({ localJournal: "nota locala" }));
    expect(data).toMatchObject({ report: "Raport Groq", year, journalCount: 1, meteoDays: 1, _model: "Groq GPT-OSS 120B" });
    expect(mockKv.set).toHaveBeenCalledWith(`livada:report:cache:${year}`, expect.objectContaining({ report: "Raport Groq" }), { ex: 3600 });
    const { body } = describeCall(...mockFetchWithTimeout.mock.calls[0]);
    const user = body.messages[1].content;
    expect(user).toContain("zeama bordeleza");
    expect(user).not.toContain("an trecut");
    expect(user).toContain("nota locala");
    expect(body.temperature).toBe(0.4);
  });

  it("Groq picat → Qwen → Gemini, cu fallback marcat", async () => {
    routeFetch(mockFetchWithTimeout, (c) => (c.provider === "groq" ? fail(404) : okGemini("Raport Gemini")));
    const data = await readJson(await post());
    expect(data.report).toBe("Raport Gemini");
    expect(data._fallback).toBe(true);
    expect(data._fallbackModel).toBe("Gemini 3.5 Flash-Lite");
    expect(callLog(mockFetchWithTimeout).slice(0, 2)).toEqual(["groq:openai/gpt-oss-120b", "groq:qwen/qwen3.8-27b"]);
  });

  it("toti furnizorii picati → { error }, fara cache", async () => {
    routeFetch(mockFetchWithTimeout, () => fail(500));
    const data = await readJson(await post());
    expect(data.error).toMatch(/nu a raspuns/);
    expect(mockKv.set).not.toHaveBeenCalled();
  });

  it("Redis neconfigurat → { error } explicit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFromEnv.mockImplementation(() => {
      throw new Error("UPSTASH_REDIS_REST_URL missing");
    });
    const data = await readJson(await post());
    expect(data.error).toMatch(/Redis/);
  });
});
