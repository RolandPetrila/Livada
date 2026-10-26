import { corsHeaders, handleOptions, checkOrigin, rateLimit } from "./_auth.js";
import { runChain, visionSteps } from "./_ai.js";
import { fetchWithTimeout } from "./_timeout.js";
import { isOverQuota, recordAiCalls } from "./_quota.js";
import { streamJson } from "./_stream.js";

// Edge Runtime + raspuns in flux (vezi _stream.js) — lantul de fallback poate depasi 25 s
export const config = { runtime: "edge" };

const AI_PROMPT = `Esti botanist si agronom expert. Analizeaza fotografia si identifica planta.

Raspunde DIRECT cu structura de mai jos, fara introducere sau text generic inainte:

**SPECIE IDENTIFICATA:**
- Denumire stiintifica: [nume]
- Denumire comuna in romana: [nume]
- Familia botanica: [familie]

**DESCRIERE:**
- 2-3 propozitii despre caracteristicile vizibile in poza

**RELEVANTA AGRICOLA:**
- Este cultivata in Romania / zona Arad-Nadlac?
- Valoare: ornamentala / comestibila / medicinala / daunator?

**OBSERVATII PENTRU POMICULTOR:**
- Ce trebuie sa stie un pomicultor despre aceasta planta
- Eventuale riscuri (invaziva, toxica, daunator etc.)

Daca nu poti identifica cu certitudine, spune ce grupuri/familii sunt posibile.`;

const IDENTIFY_OPTS = { maxTokens: 4096, temperature: 0.2, thinkingBudget: 0 };
const BUDGET_MS = 50000; // frontend asteapta 65 s

export default async function handler(req) {
  if (req.method === "OPTIONS") return handleOptions(req);

  const originErr = checkOrigin(req);
  if (originErr) return originErr;

  if (req.method !== "POST") {
    return Response.json(
      { error: "Metoda nepermisa" },
      { status: 405, headers: corsHeaders(req) },
    );
  }

  const limitErr = await rateLimit(req, 10); // AI endpoint — limita 10 req/min
  if (limitErr) return limitErr;

  const t0 = Date.now();
  const log = (msg) => console.log(`[identify] ${msg} t+${Date.now() - t0}ms`);

  let base64, mimeType, organ;
  try {
    const body = await req.json();
    base64 = body.base64;
    const VALID_MIMES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ];
    mimeType = VALID_MIMES.includes(body.mimeType)
      ? body.mimeType
      : "image/jpeg";
    const VALID_ORGANS = ["leaf", "flower", "fruit", "bark", "auto", "other"];
    organ = VALID_ORGANS.includes(body.organ) ? body.organ : "auto";
    if (!base64 || typeof base64 !== "string") {
      return Response.json(
        { error: "Lipseste imaginea (base64)." },
        { status: 400, headers: corsHeaders(req) },
      );
    }
    if (base64.length > 5 * 1024 * 1024) {
      return Response.json(
        { error: "Imaginea prea mare. Max ~3MB." },
        { status: 400, headers: corsHeaders(req) },
      );
    }
  } catch {
    return Response.json(
      { error: "Eroare citire date." },
      { status: 400, headers: corsHeaders(req) },
    );
  }

  // ── Construieste FormData pentru Pl@ntNet ─────────────────────────────────
  let formData;
  try {
    let binaryStr;
    try {
      binaryStr = atob(base64);
    } catch {
      return Response.json(
        { error: "Date imagine invalide (base64 malformat)." },
        { status: 400, headers: corsHeaders(req) },
      );
    }
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++)
      bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    formData = new FormData();
    formData.append("images", blob, "plant.jpg");
    formData.append("organs", organ);
  } catch (e) {
    console.error("[identify] blob err:", e.message);
    return Response.json(
      { error: "Eroare procesare imagine." },
      { status: 400, headers: corsHeaders(req) },
    );
  }

  // ── Pl@ntNet + lant AI IN PARALEL ─────────────────────────────────────────
  const PLANTNET_KEY = process.env.PLANTNET_API_KEY;

  return streamJson(corsHeaders(req), async () => {
    const attempts = [];
    // Cota Gemini atinsa → sarim doar Gemini 2.5 Flash; Pl@ntNet + restul lantului raman active
    const geminiBlocked = await isOverQuota("gemini");

    const [plantnetSettled, aiChain] = await Promise.all([
      PLANTNET_KEY
        ? fetchWithTimeout(
            `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_KEY}&lang=ro&nb-results=5&include-related-images=false`,
            { method: "POST", body: formData },
            18000,
          ).then(
            (v) => ({ status: "fulfilled", value: v }),
            (e) => ({ status: "rejected", reason: e }),
          )
        : Promise.resolve({ status: "rejected", reason: new Error("no plantnet key") }),
      runChain(visionSteps(base64, mimeType, AI_PROMPT, IDENTIFY_OPTS, { geminiBlocked, primaryMs: 20000, liteFirst: true }), {
        deadline: t0 + BUDGET_MS,
        log,
        attempts,
      }),
    ]);

    // ── Extrage rezultate Pl@ntNet ──────────────────────────────────────────
    let plantnetResults = [];
    if (plantnetSettled.status === "fulfilled" && plantnetSettled.value.ok) {
      try {
        const data = await plantnetSettled.value.json();
        plantnetResults = (data.results || []).slice(0, 3).map((r) => ({
          scientificName: r.species?.scientificNameWithoutAuthor || "",
          commonNames: (r.species?.commonNames || []).slice(0, 2),
          family: r.species?.family?.scientificNameWithoutAuthor || "",
          score: Math.round((r.score || 0) * 100),
        }));
        log(`plantnet ok — ${plantnetResults.length} rezultate`);
      } catch {
        log("plantnet parse err");
      }
      attempts.push({ provider: "plantnet", ok: true });
    } else if (PLANTNET_KEY) {
      let err;
      if (plantnetSettled.status === "rejected") {
        err = `${plantnetSettled.reason?.name} — ${plantnetSettled.reason?.message}`;
      } else {
        let errBody = "";
        try {
          errBody = await plantnetSettled.value.text();
        } catch {}
        err = `HTTP ${plantnetSettled.value?.status}: ${errBody.substring(0, 120)}`;
      }
      log(`plantnet err: ${err}`);
      attempts.push({ provider: "plantnet", ok: false, err });
    }

    await recordAiCalls(attempts);

    const aiResult = aiChain ? { text: aiChain.text, model: aiChain.label } : null;

    // ── Daca nici Pl@ntNet nici AI nu au raspuns — eroare ──────────────────
    if (!plantnetResults.length && !aiResult) {
      return {
        error:
          "Identificarea a esuat. Incearca o poza mai clara, cu planta in prim-plan.",
      };
    }

    log(`done — plantnet:${plantnetResults.length} ai:${aiResult ? aiResult.model : "none"}`);
    return {
      results: plantnetResults,
      ai: aiResult,
      ...(aiChain && aiChain.index > 0
        ? { _fallback: true, _fallbackModel: aiChain.label, _fallbackReason: aiChain.reason }
        : {}),
    };
  });
}
