import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";
import { callGemini, callOpenAIVision, geminiText, openaiText } from "./_ai.js";
import { fetchWithTimeout } from "./_timeout.js";

export const config = { runtime: "edge" };

// ── Helper: apel Plant.id v3 (diagnostic specializat boli) ───────────────────
function callPlantId(apiKey, base64, mimeType, timeoutMs) {
  return fetchWithTimeout(
    "https://plant.id/api/v3/identification",
    {
      method: "POST",
      headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        images: [`data:${mimeType};base64,${base64}`],
        health: "all",
        similar_images: false,
      }),
    },
    timeoutMs,
  );
}

// ── Formateaza rezultatul Plant.id in romana ──────────────────────────────────
function formatPlantIdResult(data) {
  try {
    const result = data.result;
    if (!result) return null;

    const isPlant = result.is_plant?.binary;
    if (!isPlant) return null;

    const isHealthy = result.is_healthy?.binary;
    const healthyProb = Math.round((result.is_healthy?.probability || 0) * 100);
    const diseases = result.disease?.suggestions || [];

    if (isHealthy && healthyProb >= 70) {
      return `**[Plant.id] Stare sanatate: SANATOASA** (${healthyProb}% probabilitate sanatoasa)\n`;
    }

    if (!diseases.length) return null;

    let txt = `**[Plant.id] Boli detectate (diagnostic specializat):**\n`;
    diseases.slice(0, 3).forEach((d) => {
      const prob = Math.round((d.probability || 0) * 100);
      txt += `- **${d.name}** — ${prob}% probabilitate\n`;
    });
    txt += "\n---\n";
    return txt;
  } catch {
    return null;
  }
}

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

  const limitErr = await rateLimit(req, 10); // M8: AI endpoint — limita 10 req/min
  if (limitErr) return limitErr;

  const GEMINI_KEY1 = process.env.GOOGLE_AI_API_KEY;
  if (!GEMINI_KEY1) {
    return Response.json(
      { error: "GOOGLE_AI_API_KEY lipsa" },
      { status: 500, headers: corsHeaders(req) },
    );
  }

  const t0 = Date.now();

  let base64, mimeType, species;
  try {
    const body = await req.json();
    base64 = body.base64;
    // H8: valideaza mimeType — accepta doar imagini cunoscute
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
    species = (body.species || "necunoscut")
      .replace(/[^a-zA-Z0-9\s_-]/g, "")
      .substring(0, 100);
    if (!base64 || typeof base64 !== "string") {
      return Response.json(
        { error: "Lipseste imaginea (base64)." },
        { status: 400, headers: corsHeaders(req) },
      );
    }
    if (base64.length > 5 * 1024 * 1024) {
      return Response.json(
        { error: "Imaginea este prea mare. Comprima mai mult." },
        { status: 400, headers: corsHeaders(req) },
      );
    }
  } catch (e) {
    console.error("[diagnose] json parse error:", e.message);
    return Response.json(
      { error: "Eroare citire date. Incearca din nou." },
      { status: 400, headers: corsHeaders(req) },
    );
  }

  console.log(
    `[diagnose] start — base64 ${base64.length}chars, ${species}, t+${Date.now() - t0}ms`,
  );

  const prompt = `Esti expert agronom si fitopatolog specializat in pomicultura din zona Nadlac/Arad, Romania (climat continental, sol predominant cernoziom, pH 7-8).

Analizeaza aceasta fotografie a speciei: ${species}.

Raspunde STRUCTURAT in romana:

**DIAGNOSTIC:**
- Ce boli sau daunatori observi? Descrie simptomele vizibile.
- Daca nu vezi probleme, spune ca planta pare sanatoasa.

**SEVERITATE:** Usoara / Medie / Grava

**TRATAMENT RECOMANDAT:**
- Produse fitosanitare specifice cu doze (concentratie % la 10L apa)
- Alternativa BIO daca exista
- Cand sa se aplice (moment optim)

**PREVENTIE:**
- Ce masuri preventive pentru viitor

**URGENTA:** Cat de repede trebuie actionat (imediat / saptamana aceasta / la urmatorul tratament programat)

Fii concis, practic, cu informatii pe care un pomicultor le poate aplica imediat.`;

  const log = (msg) => console.log(`[diagnose] ${msg} t+${Date.now() - t0}ms`);

  // ── Plant.id + Gemini + GPT-4.1 IN PARALEL ──────────────────────────────────
  const PLANT_ID_KEY = process.env.PLANT_ID_API_KEY;
  const GH_TOKEN = process.env.GITHUB_MODELS_TOKEN;
  const [geminiSettled, plantIdSettled, gpt41Settled] =
    await Promise.allSettled([
      callGemini(
        GEMINI_KEY1,
        "gemini-2.5-flash",
        base64,
        mimeType,
        prompt,
        20000,
      ),
      PLANT_ID_KEY
        ? callPlantId(PLANT_ID_KEY, base64, mimeType, 18000)
        : Promise.reject(new Error("no key")),
      GH_TOKEN
        ? callOpenAIVision(
            "https://models.inference.ai.azure.com/chat/completions",
            GH_TOKEN,
            "gpt-4.1",
            base64,
            mimeType,
            prompt,
            18000,
          )
        : Promise.reject(new Error("no github token")),
    ]);

  // Extrage rezultat Plant.id
  let plantIdPrefix = "";
  if (plantIdSettled.status === "fulfilled" && plantIdSettled.value.ok) {
    try {
      const pidJson = await plantIdSettled.value.json();
      plantIdPrefix = formatPlantIdResult(pidJson) || "";
      log(`plant.id ok — prefix: ${plantIdPrefix ? "da" : "nu"}`);
    } catch {
      log("plant.id parse err");
    }
  } else {
    log(
      `plant.id skip: ${plantIdSettled.reason?.message || plantIdSettled.value?.status}`,
    );
  }

  // Extrage rezultat Gemini primary
  let diagnosisText = null;
  let diagnosisMeta = {};

  if (geminiSettled.status === "fulfilled" && geminiSettled.value.ok) {
    try {
      const text = geminiText(await geminiSettled.value.json());
      if (text) {
        diagnosisText = text;
        log("gemini-2.5-flash key1 ok");
      }
    } catch {
      log("gemini parse err");
    }
  } else {
    log(
      `gemini-2.5-flash key1 failed: ${geminiSettled.reason?.name || geminiSettled.value?.status}`,
    );
  }

  // Daca Gemini a picat, incearca GPT-4.1 (rulat deja in paralel)
  if (!diagnosisText) {
    if (gpt41Settled.status === "fulfilled" && gpt41Settled.value.ok) {
      try {
        const text = openaiText(await gpt41Settled.value.json());
        if (text) {
          diagnosisText = text;
          diagnosisMeta._fallback = true;
          log("gpt-4.1 ok (primary parallel)");
        }
      } catch {
        log("gpt-4.1 parse err");
      }
    } else {
      log(
        `gpt-4.1 skip: ${gpt41Settled.reason?.name || gpt41Settled.value?.status}`,
      );
    }
  }

  // Returneaza daca cel putin un primar AI a raspuns
  if (diagnosisText) {
    const finalText = plantIdPrefix
      ? plantIdPrefix + diagnosisText
      : diagnosisText;
    if (plantIdPrefix) diagnosisMeta._plantid = true;
    return Response.json(
      { diagnosis: finalText, ...diagnosisMeta },
      { headers: corsHeaders(req) },
    );
  }

  // ── Ambele primary AI au picat dar Plant.id a reusit ─────────────────────────
  if (plantIdPrefix) {
    log("returning plant.id only (both primary AI failed)");
    return Response.json(
      {
        diagnosis:
          plantIdPrefix +
          "\n_Analiza AI detaliata indisponibila momentan. Plant.id a detectat bolile de mai sus._",
        _fallback: true,
        _plantid: true,
      },
      { headers: corsHeaders(req) },
    );
  }

  // ── Fallback 2: Gemini 2.5-flash cheia 2 ─────────────────────────────────────
  const GEMINI_KEY2 = process.env.GOOGLE_AI_API_KEY_2;
  if (GEMINI_KEY2) {
    try {
      const res = await callGemini(
        GEMINI_KEY2,
        "gemini-2.5-flash",
        base64,
        mimeType,
        prompt,
        15000,
      );
      log(`gemini-2.5-flash key2 → ${res.status}`);
      if (res.ok) {
        const text = geminiText(await res.json());
        if (text)
          return Response.json(
            { diagnosis: text, _fallback: true },
            { headers: corsHeaders(req) },
          );
      }
    } catch (e) {
      log(`gemini key2 err: ${e.name}`);
    }
  }

  // ── Fallback 4: Pixtral-12B via Mistral ──────────────────────────────────────
  const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
  if (MISTRAL_KEY) {
    try {
      const res = await callOpenAIVision(
        "https://api.mistral.ai/v1/chat/completions",
        MISTRAL_KEY,
        "pixtral-12b-2409",
        base64,
        mimeType,
        prompt,
        20000,
      );
      log(`pixtral-12b → ${res.status}`);
      if (res.ok) {
        const text = openaiText(await res.json());
        if (text)
          return Response.json(
            { diagnosis: text, _fallback: true },
            { headers: corsHeaders(req) },
          );
      }
    } catch (e) {
      log(`pixtral err: ${e.name}`);
    }
  }

  // ── Fallback 5: Grok-2-vision (xAI) ──────────────────────────────────────────
  const XAI_KEY = process.env.XAI_API_KEY;
  if (XAI_KEY) {
    try {
      const res = await callOpenAIVision(
        "https://api.x.ai/v1/chat/completions",
        XAI_KEY,
        "grok-2-vision-1212",
        base64,
        mimeType,
        prompt,
        15000,
      );
      log(`grok-2-vision → ${res.status}`);
      if (res.ok) {
        const text = openaiText(await res.json());
        if (text)
          return Response.json(
            { diagnosis: text, _fallback: true },
            { headers: corsHeaders(req) },
          );
      }
    } catch (e) {
      log(`grok err: ${e.name}`);
    }
  }

  log("toate fallback-urile epuizate");
  return Response.json(
    {
      error:
        "Serviciul AI de diagnostic este indisponibil momentan. Incearca din nou.",
    },
    { status: 503, headers: corsHeaders(req) },
  );
}
