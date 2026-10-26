// Unit tests pentru api/_stream.js — raspuns JSON keep-alive (Edge 25 s first-byte)
import { describe, it, expect, vi } from "vitest";
import { streamJson } from "../api/_stream.js";

describe("streamJson", () => {
  it("trimite imediat un spatiu, apoi JSON-ul final; status 200", async () => {
    const res = streamJson({ "X-Test": "1" }, async () => ({ ok: 1 }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
    expect(res.headers.get("X-Test")).toBe("1");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const txt = await res.text();
    expect(txt.startsWith(" ")).toBe(true);
    expect(JSON.parse(txt)).toEqual({ ok: 1 });
  });

  it("trimite spatii keep-alive cat timp lucreaza", async () => {
    vi.useFakeTimers();
    let release;
    const res = streamJson({}, () => new Promise((r) => (release = r)), { intervalMs: 1000 });
    const reading = res.text();
    await vi.advanceTimersByTimeAsync(3500);
    release({ done: true });
    vi.useRealTimers();
    const txt = await reading;
    expect(txt.length - txt.trimStart().length).toBeGreaterThanOrEqual(4);
    expect(JSON.parse(txt)).toEqual({ done: true });
  });

  it("transforma o exceptie din work in { error } (nu crapa fluxul)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = streamJson({}, async () => {
      throw new Error("boom");
    });
    const data = JSON.parse(await res.text());
    expect(data.error).toMatch(/Eroare la procesare/);
    spy.mockRestore();
  });
});
