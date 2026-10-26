// Unit tests pentru api/_ai.js — lantul de fallback, parsere, apeluri furnizori
import { describe, it, expect, vi, beforeEach } from "vitest";
import { okOpenAI, okGemini, fail, describeCall } from "./helpers/ai.js";

const { mockFetchWithTimeout } = vi.hoisted(() => ({ mockFetchWithTimeout: vi.fn() }));
vi.mock("../api/_timeout.js", () => ({ fetchWithTimeout: mockFetchWithTimeout }));

import {
  runChain,
  describeFailure,
  geminiText,
  openaiText,
  callGroq,
  callGemini,
  callGeminiText,
  textSteps,
  MODELS,
  LABELS,
} from "../api/_ai.js";

const step = (over = {}) => ({
  provider: "groq",
  label: "Pas",
  enabled: true,
  maxMs: 10000,
  call: vi.fn(async () => okOpenAI("raspuns")),
  parse: openaiText,
  ...over,
});

describe("runChain", () => {
  it("returneaza primul pas reusit, fara fallback", async () => {
    const attempts = [];
    const r = await runChain([step({ label: "A" }), step({ label: "B" })], {
      deadline: Date.now() + 30000,
      attempts,
    });
    expect(r).toMatchObject({ text: "raspuns", label: "A", index: 0, reason: "" });
    expect(attempts).toEqual([{ provider: "groq", ok: true }]);
  });

  it("trece la pasul urmator si pastreaza motivul primului esec", async () => {
    const attempts = [];
    const a = step({ label: "A", call: vi.fn(async () => fail(404, "model_not_found")) });
    const b = step({ label: "B", provider: "gemini_lite" });
    const r = await runChain([a, b], { deadline: Date.now() + 30000, attempts });
    expect(r.label).toBe("B");
    expect(r.index).toBe(1);
    expect(r.reason).toBe("A: model retras");
    expect(attempts[0]).toMatchObject({ provider: "groq", ok: false });
    expect(attempts[0].err).toMatch(/^404/);
    expect(attempts[1]).toEqual({ provider: "gemini_lite", ok: true });
  });

  it("sare pasii dezactivati fara sa-i apeleze; skipReason devine motivul", async () => {
    const off = step({ label: "Gemini", enabled: false, skipReason: "quota" });
    const on = step({ label: "Lite" });
    const r = await runChain([off, on], { deadline: Date.now() + 30000 });
    expect(off.call).not.toHaveBeenCalled();
    expect(r.label).toBe("Lite");
    expect(r.reason).toBe("Gemini: limita zilnica atinsa");
  });

  it("trateaza AbortError ca timeout", async () => {
    const err = Object.assign(new Error("aborted"), { name: "AbortError" });
    const attempts = [];
    const r = await runChain([step({ label: "A", call: vi.fn(async () => { throw err; }) })], {
      deadline: Date.now() + 30000,
      attempts,
    });
    expect(r).toBeNull();
    expect(attempts[0].err).toBe("timeout");
  });

  it("trateaza raspuns gol ca esec", async () => {
    const attempts = [];
    const r = await runChain([step({ call: vi.fn(async () => okOpenAI("")) })], {
      deadline: Date.now() + 30000,
      attempts,
    });
    expect(r).toBeNull();
    expect(attempts[0].err).toBe("raspuns gol");
  });

  it("limiteaza timeout-ul pasului la bugetul ramas si se opreste cand bugetul e epuizat", async () => {
    const a = step({ maxMs: 60000 });
    await runChain([a], { deadline: Date.now() + 10000 });
    const ms = a.call.mock.calls[0][0];
    expect(ms).toBeLessThanOrEqual(9500);
    expect(ms).toBeGreaterThan(8000);

    const b = step();
    const r = await runChain([b], { deadline: Date.now() + 2000 });
    expect(b.call).not.toHaveBeenCalled();
    expect(r).toBeNull();
  });
});

describe("describeFailure (mesaje pentru utilizator, fara JSON brut)", () => {
  it.each([
    ["429 rate", "X: prea multe cereri acum"],
    ["timeout", "X: raspuns prea lent"],
    ["401 bad", "X: cheie API invalida"],
    ['400 {"message":"API key not valid"}', "X: cheie API invalida"],
    ["402 payment", "X: fara credite"],
    ["404 nope", "X: model retras"],
    ["503 down", "X: eroare temporara la furnizor"],
    ["quota", "X: limita zilnica atinsa"],
    ["ceva", "X indisponibil"],
  ])("%s → %s", (err, expected) => {
    expect(describeFailure("X", err)).toBe(expected);
  });
});

describe("parsere", () => {
  it("openaiText elimina blocurile <think>", () => {
    expect(openaiText({ choices: [{ message: { content: "<think>x</think>\nRaspuns" } }] })).toBe(
      "Raspuns",
    );
    expect(openaiText({})).toBeNull();
  });

  it("geminiText lipeste partile si ignora partile thought", () => {
    const json = {
      candidates: [{ content: { parts: [{ text: "gand", thought: true }, { text: "A" }, { text: "B" }] } }],
    };
    expect(geminiText(json)).toBe("AB");
    expect(geminiText({})).toBeNull();
  });
});

describe("apeluri furnizori", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetchWithTimeout.mockResolvedValue(okOpenAI("ok"));
    process.env.GROQ_API_KEY = "test-groq";
  });

  it("callGroq trimite reasoning_effort=low doar pentru gpt-oss", async () => {
    await callGroq([{ role: "user", content: "q" }], MODELS.groqPrimary, 5000);
    await callGroq([{ role: "user", content: "q" }], MODELS.groqFallback, 5000);
    const [b1, b2] = mockFetchWithTimeout.mock.calls.map((c) => describeCall(c[0], c[1]).body);
    expect(b1.reasoning_effort).toBe("low");
    expect(b2.reasoning_effort).toBeUndefined();
  });

  it("callGroq arunca daca lipseste cheia", () => {
    delete process.env.GROQ_API_KEY;
    expect(() => callGroq([], MODELS.groqPrimary, 5000)).toThrow(/GROQ_API_KEY/);
  });

  it("callGemini pune thinkingBudget doar pe familia 2.5", async () => {
    mockFetchWithTimeout.mockResolvedValue(okGemini("ok"));
    await callGemini("k", "gemini-2.5-flash", "AAA", "image/jpeg", "p", 5000, { thinkingBudget: 0 });
    await callGemini("k", "gemini-3.5-flash-lite", "AAA", "image/jpeg", "p", 5000, { thinkingBudget: 0 });
    const [b1, b2] = mockFetchWithTimeout.mock.calls.map((c) => describeCall(c[0], c[1]).body);
    expect(b1.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(b2.generationConfig.thinkingConfig).toBeUndefined();
  });

  it("callGeminiText muta mesajul system in systemInstruction si mapeaza rolurile", async () => {
    mockFetchWithTimeout.mockResolvedValue(okGemini("ok"));
    await callGeminiText(
      "k",
      MODELS.geminiLite,
      [
        { role: "system", content: "S" },
        { role: "user", content: "U" },
        { role: "assistant", content: "A" },
      ],
      5000,
    );
    const body = describeCall(...mockFetchWithTimeout.mock.calls[0]).body;
    expect(body.systemInstruction).toEqual({ parts: [{ text: "S" }] });
    expect(body.contents.map((c) => c.role)).toEqual(["user", "model"]);
  });

  it("textSteps: dezactiveaza pasii fara cheie", () => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    process.env.GOOGLE_AI_API_KEY_2 = "k2";
    const s = textSteps([]);
    expect(s.groqPrimary.enabled).toBe(false);
    expect(s.geminiLite1.enabled).toBe(false);
    expect(s.geminiLite2.enabled).toBe(true);
    expect(s.geminiLite2.label).toBe(LABELS.geminiLite);
    delete process.env.GOOGLE_AI_API_KEY_2;
  });
});
