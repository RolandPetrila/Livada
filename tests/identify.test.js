// Unit tests pentru api/identify.js — identificare planta: Pl@ntNet + lant AI in paralel
// Mocks: _auth.js, _timeout.js (router pe URL/model), _quota.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { okOpenAI, okGemini, okJson, fail, routeFetch, callLog, readJson, jsonReq, describeCall } from "./helpers/ai.js";

const { mockFetchWithTimeout, mockRecord, mockOverQuota } = vi.hoisted(() => ({
  mockFetchWithTimeout: vi.fn(),
  mockRecord: vi.fn(async () => {}),
  mockOverQuota: vi.fn(async () => false),
}));

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));
vi.mock("../api/_timeout.js", () => ({ fetchWithTimeout: mockFetchWithTimeout }));
vi.mock("../api/_quota.js", () => ({ recordAiCalls: mockRecord, isOverQuota: mockOverQuota }));

import handler from "../api/identify.js";

const IMG = "iVBORw0KGgo=";
const post = (body) => handler(jsonReq("/api/identify", "POST", body));

const plantnetOk = okJson({
  results: [
    {
      score: 0.87,
      species: {
        scientificNameWithoutAuthor: "Malus domestica",
        commonNames: ["Mar", "Mar de cultura", "extra"],
        family: { scientificNameWithoutAuthor: "Rosaceae" },
      },
    },
  ],
});

function setRoutes(over = {}) {
  const r = {
    "gemini:gemini-2.5-flash": okGemini("ID Gemini"),
    "gemini:gemini-3.5-flash-lite": okGemini("ID Lite"),
    "mistral:pixtral-12b-2409": okOpenAI("ID Pixtral"),
    "xai:grok-4.3": okOpenAI("ID Grok"),
    plantnet: plantnetOk,
    ...over,
  };
  routeFetch(mockFetchWithTimeout, (c) => {
    const k = c.model ? `${c.provider}:${c.model}` : c.provider;
    return r[k] || fail(500);
  });
}

describe("identify API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockOverQuota.mockResolvedValue(false);
    process.env.GOOGLE_AI_API_KEY = "k1";
    process.env.GOOGLE_AI_API_KEY_2 = "k2";
    process.env.MISTRAL_API_KEY = "m";
    process.env.XAI_API_KEY = "x";
    process.env.PLANTNET_API_KEY = "pn";
    setRoutes();
  });

  it("405 pe GET", async () => {
    expect((await handler(jsonReq("/api/identify", "GET"))).status).toBe(405);
  });

  it("400 fara base64", async () => {
    expect((await post({ mimeType: "image/jpeg" })).status).toBe(400);
  });

  it("400 la base64 malformat", async () => {
    expect((await post({ base64: "%%%nu-e-base64%%%" })).status).toBe(400);
  });

  it("400 la imagine prea mare", async () => {
    expect((await post({ base64: "A".repeat(5 * 1024 * 1024 + 4) })).status).toBe(400);
  });

  it("intoarce Pl@ntNet (max 2 nume comune) + AI Gemini 2.5 Flash", async () => {
    const res = await post({ base64: IMG, mimeType: "image/jpeg", organ: "leaf" });
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect(data.results).toEqual([
      { scientificName: "Malus domestica", commonNames: ["Mar", "Mar de cultura"], family: "Rosaceae", score: 87 },
    ]);
    expect(data.ai).toEqual({ text: "ID Gemini", model: "Gemini 2.5 Flash" });
    expect(data._fallback).toBeUndefined();
  });

  it("mimeType invalid → image/jpeg in apelul AI", async () => {
    await post({ base64: IMG, mimeType: "application/x-evil" });
    const gem = mockFetchWithTimeout.mock.calls.map((c) => describeCall(...c)).find((c) => c.provider === "gemini");
    expect(gem.body.contents[0].parts[1].inline_data.mime_type).toBe("image/jpeg");
  });

  it("Gemini 2.5 Flash picat → 3.5 Flash-Lite, marcat fallback", async () => {
    setRoutes({ "gemini:gemini-2.5-flash": fail(429) });
    const data = await readJson(await post({ base64: IMG }));
    expect(data.ai.model).toBe("Gemini 3.5 Flash-Lite");
    expect(data._fallback).toBe(true);
    expect(data._fallbackReason).toBe("Gemini 2.5 Flash: prea multe cereri acum");
  });

  it("cota Gemini atinsa → nu apeleaza 2.5 Flash", async () => {
    mockOverQuota.mockResolvedValue(true);
    await post({ base64: IMG });
    expect(callLog(mockFetchWithTimeout)).not.toContain("gemini:gemini-2.5-flash");
  });

  it("toate AI picate, Pl@ntNet OK → doar rezultatele Pl@ntNet", async () => {
    setRoutes({
      "gemini:gemini-2.5-flash": fail(500),
      "gemini:gemini-3.5-flash-lite": fail(500),
      "mistral:pixtral-12b-2409": fail(500),
      "xai:grok-4.3": fail(500),
    });
    const data = await readJson(await post({ base64: IMG }));
    expect(data.results).toHaveLength(1);
    expect(data.ai).toBeNull();
  });

  it("nici Pl@ntNet, nici AI → { error }", async () => {
    setRoutes({
      plantnet: fail(500),
      "gemini:gemini-2.5-flash": fail(500),
      "gemini:gemini-3.5-flash-lite": fail(500),
      "mistral:pixtral-12b-2409": fail(500),
      "xai:grok-4.3": fail(500),
    });
    const data = await readJson(await post({ base64: IMG }));
    expect(data.error).toMatch(/Identificarea a esuat/);
    expect(mockRecord.mock.calls[0][0]).toEqual(
      expect.arrayContaining([expect.objectContaining({ provider: "plantnet", ok: false })]),
    );
  });
});
