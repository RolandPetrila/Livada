// Unit tests for api/cerebras-opinion.js — a doua parere Cerebras (NODE route).
// Mocks: _auth.js, _ai.js (CEREBRAS_MODEL), global fetch.
//
// GOTCHA: ruta foloseste `export default { async fetch(req) }` (Web Standard pe Node),
// NU `export default function`. Testul apeleaza `mod.fetch(req)`. Daca cineva revine la
// `export default function`, `mod.fetch` devine undefined si suita pica — blocheaza
// regresia 504 (handler legacy Node ignora Response-ul intors).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../api/_auth.js", () => ({
  checkOrigin: vi.fn(() => null),
  corsHeaders: vi.fn(() => ({})),
  handleOptions: vi.fn(() => new Response(null, { status: 204 })),
  rateLimit: vi.fn(async () => null),
}));

vi.mock("../api/_ai.js", () => ({
  CEREBRAS_MODEL: "gpt-oss-120b",
}));

import mod from "../api/cerebras-opinion.js";

function fakeReq(method, opts = {}) {
  const rawText =
    opts.rawText ??
    (opts.body !== undefined ? JSON.stringify(opts.body) : "{}");
  return {
    method,
    headers: { get: (name) => opts.headers?.[name.toLowerCase()] ?? null },
    json: vi.fn(async () => JSON.parse(rawText)),
    text: vi.fn(async () => rawText),
  };
}

function cerebrasOk(answer = "Cerebras raspuns test") {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: answer } }] }),
    text: async () => "",
  };
}

function cerebrasErr(status = 503) {
  return {
    ok: false,
    status,
    json: async () => ({ error: "fail" }),
    text: async () => "error body from cerebras",
  };
}

describe("cerebras-opinion API route", () => {
  const ORIGINAL_KEY = process.env.CEREBRAS_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CEREBRAS_API_KEY = "test-cerebras-key-1234";
    global.fetch = vi.fn();
  });

  afterEach(() => {
    if (ORIGINAL_KEY) process.env.CEREBRAS_API_KEY = ORIGINAL_KEY;
    else delete process.env.CEREBRAS_API_KEY;
    vi.restoreAllMocks();
  });

  // ── Regression guard: Web Standard export shape ───────────────────────────
  it("exports a { fetch } object, NOT a bare function (blocheaza regresia 504)", () => {
    expect(typeof mod).toBe("object");
    expect(typeof mod.fetch).toBe("function");
  });

  it("OPTIONS returns 204", async () => {
    const res = await mod.fetch(fakeReq("OPTIONS"));
    expect(res.status).toBe(204);
  });

  it("rejects non-POST methods with 405", async () => {
    const res = await mod.fetch(fakeReq("GET"));
    expect(res.status).toBe(405);
  });

  it("returns 500 when CEREBRAS_API_KEY is missing", async () => {
    delete process.env.CEREBRAS_API_KEY;
    const res = await mod.fetch(
      fakeReq("POST", { body: { question: "test?" } }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/CEREBRAS_API_KEY/);
  });

  it("rejects missing question with 400", async () => {
    const res = await mod.fetch(fakeReq("POST", { body: { species: "Mar" } }));
    expect(res.status).toBe(400);
  });

  it("rejects empty/whitespace question with 400", async () => {
    const res = await mod.fetch(fakeReq("POST", { body: { question: "   " } }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON body with 400", async () => {
    const res = await mod.fetch(fakeReq("POST", { rawText: "{bad json" }));
    expect(res.status).toBe(400);
  });

  // ── Happy path ────────────────────────────────────────────────────────────
  it("returns 200 with answer + _model when Cerebras responds OK", async () => {
    global.fetch.mockResolvedValue(cerebrasOk("Raspunsul Cerebras"));
    const res = await mod.fetch(
      fakeReq("POST", {
        body: { question: "Cand se tund ciresii?", species: "Cires" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toBe("Raspunsul Cerebras");
    expect(body._model).toBe("Cerebras gpt-oss-120b");
  });

  it("sends model + question to api.cerebras.ai", async () => {
    global.fetch.mockResolvedValue(cerebrasOk());
    await mod.fetch(
      fakeReq("POST", {
        body: {
          question: "intrebare test",
          species: "Piersic",
          context: "doc",
        },
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("api.cerebras.ai");
    const callBody = JSON.parse(opts.body);
    expect(callBody.model).toBe("gpt-oss-120b");
    expect(callBody.messages[1].content).toContain("intrebare test");
    expect(callBody.messages[1].content).toContain("doc");
  });

  // ── Upstream failure ──────────────────────────────────────────────────────
  it("returns 503 when Cerebras responds non-ok", async () => {
    global.fetch.mockResolvedValue(cerebrasErr(500));
    const res = await mod.fetch(
      fakeReq("POST", { body: { question: "test?" } }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Cerebras HTTP 500/);
  });

  it("returns 503 when fetch throws (network/abort)", async () => {
    global.fetch.mockRejectedValue(new Error("network down"));
    const res = await mod.fetch(
      fakeReq("POST", { body: { question: "test?" } }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Cerebras/);
  });
});
