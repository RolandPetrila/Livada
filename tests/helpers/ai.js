// Helpers comune pentru testele rutelor AI.
// Rutele folosesc fetchWithTimeout (din _timeout.js) pentru TOATE apelurile externe;
// testele il inlocuiesc cu un router care raspunde dupa URL + modelul din body.

export function okOpenAI(text) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: text } }] }),
    text: async () => "",
  };
}

export function okGemini(text) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    text: async () => "",
  };
}

export function okJson(data) {
  return { ok: true, status: 200, json: async () => data, text: async () => "" };
}

export function fail(status = 500, body = "error") {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  };
}

// Identifica furnizorul + modelul unui apel (url, opts) facut prin fetchWithTimeout
export function describeCall(url, opts = {}) {
  let body = {};
  try {
    body = typeof opts.body === "string" ? JSON.parse(opts.body) : {};
  } catch {}
  const u = String(url);
  if (u.includes("api.groq.com")) return { provider: "groq", model: body.model, body };
  if (u.includes("generativelanguage.googleapis.com")) {
    const model = u.match(/models\/([^:]+):/)?.[1];
    return { provider: "gemini", model, key: opts.headers?.["x-goog-api-key"], body };
  }
  if (u.includes("api.mistral.ai")) return { provider: "mistral", model: body.model, body };
  if (u.includes("api.x.ai")) return { provider: "xai", model: body.model, body };
  if (u.includes("plantnet.org")) return { provider: "plantnet", body };
  if (u.includes("plant.id")) return { provider: "plant_id", body };
  return { provider: "unknown", body };
}

// handler(call) → raspuns; call = describeCall(...) + {url}
export function routeFetch(mock, handler) {
  mock.mockImplementation(async (url, opts) => {
    const call = { url, ...describeCall(url, opts) };
    const res = await handler(call);
    if (!res) throw new Error("unrouted call: " + url);
    return res;
  });
}

// Lista apelurilor facute, in ordine: ["groq:openai/gpt-oss-120b", "gemini:gemini-3.5-flash-lite", ...]
export function callLog(mock) {
  return mock.mock.calls.map(([url, opts]) => {
    const c = describeCall(url, opts);
    return c.model ? `${c.provider}:${c.model}` : c.provider;
  });
}

// Raspunsurile rutelor AI vin in flux (spatii keep-alive + JSON) — citim ca text si parsam
export async function readJson(res) {
  const txt = await res.text();
  return JSON.parse(txt);
}

export const ORIGIN = "https://livada-mea-psi.vercel.app";

export function jsonReq(path, method = "POST", body = {}) {
  return new Request(ORIGIN + path, {
    method,
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    ...(method === "GET" || method === "OPTIONS" ? {} : { body: JSON.stringify(body) }),
  });
}
