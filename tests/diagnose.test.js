// Unit tests pentru api/diagnose.js — diagnostic foto: lant vision + Pl@ntNet paralel + Plant.id la nevoie
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

import handler from "../api/diagnose.js";

const IMG = "iVBORw0KGgo="; // base64 valid, mic
const post = (body) => handler(jsonReq("/api/diagnose", "POST", body));
const valid = { base64: IMG, mimeType: "image/jpeg", species: "Cires" };

const plantnetOk = okJson({
  results: [{ score: 0.9, species: { scientificNameWithoutAuthor: "Prunus avium", commonNames: ["Cires"] } }],
});
const plantIdOk = okJson({
  suggestions: [{ plant_name: "Prunus avium", probability: 0.8, plant_details: { common_names: ["cires"] } }],
});

function setRoutes(over = {}) {
  const r = {
    "gemini:gemini-2.5-flash": okGemini("Diagnostic Gemini"),
    "gemini:gemini-3.5-flash-lite": okGemini("Diagnostic Lite"),
    "mistral:pixtral-12b-2409": okOpenAI("Diagnostic Pixtral"),
    "xai:grok-4.3": okOpenAI("Diagnostic Grok"),
    plantnet: plantnetOk,
    plant_id: plantIdOk,
    ...over,
  };
  routeFetch(mockFetchWithTimeout, (c) => {
    const k = c.model ? `${c.provider}:${c.model}` : c.provider;
    const v = typeof r[k] === "function" ? r[k](c) : r[k];
    return v || fail(500);
  });
}

describe("diagnose API route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockOverQuota.mockResolvedValue(false);
    process.env.GOOGLE_AI_API_KEY = "k1";
    process.env.GOOGLE_AI_API_KEY_2 = "k2";
    process.env.MISTRAL_API_KEY = "m";
    process.env.XAI_API_KEY = "x";
    delete process.env.PLANTNET_API_KEY;
    delete process.env.PLANT_ID_API_KEY;
    delete process.env.PLANT_ID_USE_V3;
    setRoutes();
  });

  it("405 pe GET", async () => {
    expect((await handler(jsonReq("/api/diagnose", "GET"))).status).toBe(405);
  });

  it("400 fara imagine", async () => {
    expect((await post({ species: "Cires" })).status).toBe(400);
  });

  it("400 la mai mult de 4 poze", async () => {
    const images = Array.from({ length: 5 }, () => ({ base64: IMG, mimeType: "image/jpeg" }));
    expect((await post({ images })).status).toBe(400);
  });

  it("400 cand pozele depasesc 5MB total", async () => {
    expect((await post({ base64: "A".repeat(5 * 1024 * 1024 + 10) })).status).toBe(400);
  });

  it("diagnostic din Gemini 2.5 Flash cu thinkingBudget 0 (raspuns in flux, status 200)", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect(data.diagnosis).toBe("Diagnostic Gemini");
    expect(data._model).toBe("Gemini 2.5 Flash");
    expect(data._fallback).toBeUndefined();
    const { body, key } = describeCall(...mockFetchWithTimeout.mock.calls[0]);
    expect(key).toBe("k1");
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(body.contents[0].parts[0].text).toContain('"Cires"');
  });

  it("igienizeaza specia (caractere speciale, max 100)", async () => {
    await post({ ...valid, species: "<script>Cires</script>" + "a".repeat(200) });
    const { body } = describeCall(...mockFetchWithTimeout.mock.calls[0]);
    expect(body.contents[0].parts[0].text).not.toContain("<script>");
  });

  it("accepta images[] (multi-foto) si adauga nota de unghiuri multiple", async () => {
    await post({ images: [{ base64: IMG }, { base64: IMG, mimeType: "image/png" }], species: "Mar" });
    const { body } = describeCall(...mockFetchWithTimeout.mock.calls[0]);
    expect(body.contents[0].parts).toHaveLength(3);
    expect(body.contents[0].parts[0].text).toContain("2 fotografii");
  });

  it("Gemini 2.5 Flash picat → 3.5 Flash-Lite pe aceeasi cheie, cu motiv", async () => {
    setRoutes({ "gemini:gemini-2.5-flash": (c) => (c.key === "k1" ? fail(503) : okGemini("k2")) });
    const data = await readJson(await post(valid));
    expect(data.diagnosis).toBe("Diagnostic Lite");
    expect(data._fallback).toBe(true);
    expect(data._fallbackModel).toBe("Gemini 3.5 Flash-Lite");
    expect(data._fallbackReason).toBe("Gemini 2.5 Flash: eroare temporara la furnizor");
  });

  it("cota Gemini atinsa → sare peste 2.5 Flash fara apel, motiv 'limita zilnica'", async () => {
    mockOverQuota.mockResolvedValue(true);
    const data = await readJson(await post(valid));
    expect(callLog(mockFetchWithTimeout)[0]).toBe("gemini:gemini-3.5-flash-lite");
    expect(data._fallbackReason).toBe("Gemini 2.5 Flash: limita zilnica atinsa");
  });

  it("Gemini picat complet → Pixtral → Grok", async () => {
    setRoutes({
      "gemini:gemini-2.5-flash": fail(500),
      "gemini:gemini-3.5-flash-lite": fail(500),
      "mistral:pixtral-12b-2409": fail(429),
    });
    const data = await readJson(await post(valid));
    expect(data._model).toBe("Grok 4.3");
    expect(callLog(mockFetchWithTimeout)).toEqual([
      "gemini:gemini-2.5-flash",
      "gemini:gemini-3.5-flash-lite",
      "gemini:gemini-2.5-flash",
      "mistral:pixtral-12b-2409",
      "xai:grok-4.3",
    ]);
  });

  it("Pl@ntNet ruleaza in paralel si prefixeaza specia; Plant.id NU e apelat cand AI-ul merge", async () => {
    process.env.PLANTNET_API_KEY = "pn";
    process.env.PLANT_ID_API_KEY = "pid";
    const data = await readJson(await post(valid));
    expect(data.diagnosis).toMatch(/^\*\*\[Pl@ntNet\] Specie identificata:\*\* Prunus avium/);
    expect(data.diagnosis).toContain("Diagnostic Gemini");
    expect(data._plantnet).toBe(true);
    expect(data._plantid).toBe(false);
    expect(callLog(mockFetchWithTimeout)).not.toContain("plant_id");
    expect(mockRecord.mock.calls[0][0]).toEqual(
      expect.arrayContaining([{ provider: "gemini", ok: true }, { provider: "plantnet", ok: true }]),
    );
  });

  it("toate AI vision picate + Pl@ntNet OK → identificare onesta, fara Plant.id", async () => {
    process.env.PLANTNET_API_KEY = "pn";
    process.env.PLANT_ID_API_KEY = "pid";
    setRoutes({
      "gemini:gemini-2.5-flash": fail(500),
      "gemini:gemini-3.5-flash-lite": fail(500),
      "mistral:pixtral-12b-2409": fail(500),
      "xai:grok-4.3": fail(500),
    });
    const data = await readJson(await post(valid));
    expect(data._model).toBe("Pl@ntNet");
    expect(data.diagnosis).toContain("indisponibil momentan");
    expect(callLog(mockFetchWithTimeout)).not.toContain("plant_id");
  });

  it("AI vision + Pl@ntNet picate → Plant.id ca ultima sursa (credite limitate)", async () => {
    process.env.PLANTNET_API_KEY = "pn";
    process.env.PLANT_ID_API_KEY = "pid";
    setRoutes({
      "gemini:gemini-2.5-flash": fail(500),
      "gemini:gemini-3.5-flash-lite": fail(500),
      "mistral:pixtral-12b-2409": fail(500),
      "xai:grok-4.3": fail(500),
      plantnet: fail(500),
    });
    const data = await readJson(await post(valid));
    expect(data._model).toBe("Plant.id");
    expect(data._plantid).toBe(true);
    expect(data.diagnosis).toContain("[Plant.id v2] Planta identificata:");
  });

  it("totul picat → { error } in corp", async () => {
    setRoutes({
      "gemini:gemini-2.5-flash": fail(500),
      "gemini:gemini-3.5-flash-lite": fail(500),
      "mistral:pixtral-12b-2409": fail(500),
      "xai:grok-4.3": fail(500),
    });
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect((await readJson(res)).error).toMatch(/indisponibil/);
  });

  it("fara nicio cheie vision → { error }, fara apeluri", async () => {
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY_2;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.XAI_API_KEY;
    const data = await readJson(await post(valid));
    expect(data.error).toBeDefined();
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });
});
