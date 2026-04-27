import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";
import { callGemini, callOpenAIVision, geminiText, openaiText } from "./_ai.js";
import { fetchWithTimeout } from "./_timeout.js";
import { checkAndIncrementQuota } from "./_quota.js";

export const config = { runtime: "edge" };

const MAX_IMAGES = 4;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024; // 5MB total base64 (toate pozele)
const VALID_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

// ── Plant.id v2 (free tier) — identificare specie + boli pe cont free ─────────
// v3 cu health="all" cere abonament platit — skip pe free tier.
// PLANT_ID_USE_V3=1 reactiveaza v3 daca user-ul upgradeaza la Plus/Premium.
async function callPlantId(apiKey, images, timeoutMs) {
  const dataUrls = images.map(
    (img) => `data:${img.mimeType};base64,${img.base64}`,
  );

  if (process.env.PLANT_ID_USE_V3 === "1") {
    const v3Res = await fetchWithTimeout(
      "https://plant.id/api/v3/identification",
      {
        method: "POST",
        headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          images: dataUrls,
          health: "all",
          similar_images: false,
        }),
      },
      Math.min(timeoutMs, 12000),
    );
    if (v3Res.ok) return { res: v3Res, version: "v3" };
    console.log(`[diagnose] plant.id v3 fail (${v3Res.status}), trying v2`);
  }

  const v2Res = await fetchWithTimeout(
    "https://api.plant.id/v2/identify",
    {
      method: "POST",
      headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        images: dataUrls,
        plant_details: ["common_names", "url"],
      }),
    },
    Math.min(timeoutMs, 12000),
  );
  return { res: v2Res, version: "v2" };
}

// Formateaza Plant.id; intoarce { prefix, hasDiseases, identifiedSpecies }
function formatPlantIdResult(data, version) {
  try {
    if (version === "v3" && data.result) {
      const result = data.result;
      if (!result.is_plant?.binary) return null;
      const isHealthy = result.is_healthy?.binary;
      const healthyProb = Math.round(
        (result.is_healthy?.probability || 0) * 100,
      );
      const diseases = result.disease?.suggestions || [];
      if (isHealthy && healthyProb >= 70) {
        return {
          prefix: `**[Plant.id] Stare sanatate: SANATOASA** (${healthyProb}% sanatoasa)\n`,
          hasDiseases: false,
          identifiedSpecies: null,
        };
      }
      if (!diseases.length) return null;
      let txt = `**[Plant.id] Boli detectate (diagnostic specializat):**\n`;
      diseases.slice(0, 3).forEach((d) => {
        txt += `- **${d.name}** — ${Math.round((d.probability || 0) * 100)}% probabilitate\n`;
      });
      txt += "\n---\n";
      return { prefix: txt, hasDiseases: true, identifiedSpecies: null };
    }

    // v2: doar identificare specie (NU detecteaza boli)
    if (data.suggestions && data.suggestions.length > 0) {
      const top = data.suggestions[0];
      const prob = Math.round((top.probability || 0) * 100);
      const name = top.plant_name || "necunoscuta";
      const common = top.plant_details?.common_names?.[0] || "";
      return {
        prefix: `**[Plant.id v2] Planta identificata:** ${name}${common ? " (" + common + ")" : ""} — ${prob}% probabilitate\n\n---\n`,
        hasDiseases: false,
        identifiedSpecies: { name, common, prob },
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Pl@ntNet — identificare specie (gratuit, 500 req/zi) ─────────────────────
async function callPlantNet(apiKey, images, timeoutMs) {
  const formData = new FormData();
  for (const img of images) {
    let binaryStr;
    try {
      binaryStr = atob(img.base64);
    } catch {
      continue;
    }
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++)
      bytes[i] = binaryStr.charCodeAt(i);
    const blob = new Blob([bytes], { type: img.mimeType });
    formData.append("images", blob, "plant.jpg");
    formData.append("organs", "auto");
  }
  return fetchWithTimeout(
    `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=ro&nb-results=3&include-related-images=false`,
    { method: "POST", body: formData },
    Math.min(timeoutMs, 12000),
  );
}

function formatPlantNetResult(data) {
  try {
    const results = (data.results || []).slice(0, 3);
    if (!results.length) return null;
    const top = results[0];
    const sci = top.species?.scientificNameWithoutAuthor || "necunoscuta";
    const common = top.species?.commonNames?.[0] || "";
    const score = Math.round((top.score || 0) * 100);
    return {
      prefix: `**[Pl@ntNet] Specie identificata:** ${sci}${common ? " (" + common + ")" : ""} — ${score}% probabilitate\n\n---\n`,
      identifiedSpecies: { name: sci, common, prob: score },
    };
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

  const limitErr = await rateLimit(req, 10);
  if (limitErr) return limitErr;

  const GEMINI_KEY1 = process.env.GOOGLE_AI_API_KEY;
  if (!GEMINI_KEY1) {
    return Response.json(
      { error: "GOOGLE_AI_API_KEY lipsa" },
      { status: 500, headers: corsHeaders(req) },
    );
  }

  const geminiQuota = await checkAndIncrementQuota("gemini");
  if (!geminiQuota.ok) {
    return Response.json(
      {
        error:
          "Cota Gemini zilnica epuizata (1000 req/zi). Incearca dupa miezul noptii sau foloseste intrebare text in loc de diagnostic foto.",
        _quota: geminiQuota,
      },
      { status: 429, headers: corsHeaders(req) },
    );
  }

  const t0 = Date.now();
  let images, species;

  try {
    const body = await req.json();
    species = (body.species || "necunoscut")
      .replace(/[^a-zA-Z0-9\s_-]/g, "")
      .substring(0, 100);

    // Acceptam: (1) images:[{base64,mimeType}] sau (2) base64+mimeType (legacy)
    let raw = [];
    if (Array.isArray(body.images) && body.images.length > 0) {
      raw = body.images;
    } else if (body.base64) {
      raw = [{ base64: body.base64, mimeType: body.mimeType }];
    } else {
      return Response.json(
        { error: "Lipseste imaginea (images[] sau base64)." },
        { status: 400, headers: corsHeaders(req) },
      );
    }

    if (raw.length > MAX_IMAGES) {
      return Response.json(
        { error: `Maxim ${MAX_IMAGES} fotografii per diagnostic.` },
        { status: 400, headers: corsHeaders(req) },
      );
    }

    images = [];
    let totalBytes = 0;
    for (const item of raw) {
      if (!item || typeof item.base64 !== "string" || !item.base64) continue;
      const mime = VALID_MIMES.includes(item.mimeType)
        ? item.mimeType
        : "image/jpeg";
      totalBytes += item.base64.length;
      images.push({ base64: item.base64, mimeType: mime });
    }
    if (!images.length) {
      return Response.json(
        { error: "Nicio imagine valida primita." },
        { status: 400, headers: corsHeaders(req) },
      );
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      return Response.json(
        { error: "Imaginile sunt prea mari (total). Comprima mai mult." },
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

  const log = (msg) => console.log(`[diagnose] ${msg} t+${Date.now() - t0}ms`);
  log(`start — ${images.length} imagine(i), species=${species}`);

  const multiNote =
    images.length > 1
      ? `\n\nIMPORTANT: Ai primit ${images.length} fotografii ale ACELEIASI plante din unghiuri diferite (frunza fata/verso, ramura, ansamblu). Foloseste TOATE pentru un diagnostic mai precis. Nu le trata ca plante diferite.`
      : "";

  const prompt = `Esti expert agronom si fitopatolog specializat in pomicultura din zona Nadlac/Arad, Romania (climat continental, sol predominant cernoziom, pH 7-8).

Analizeaza fotografia (sau fotografiile) speciei declarate de utilizator: ${species}.${multiNote}

Raspunde STRUCTURAT in romana:

**VERIFICARE SPECIE:**
- Specia declarata de utilizator este "${species}". Confirma sau contesta — ce vezi in poza?
- Daca planta din poza pare alta specie, semnaleaza CLAR si continua diagnosticul pe specia reala observata.

**DIAGNOSTIC:**
- Ce boli, daunatori sau dezechilibre observi? Descrie simptomele vizibile (cu referinta la unghiurile vazute, daca sunt mai multe poze).
- Daca planta pare sanatoasa, spune asta explicit.
- Daca simptomele pot avea cauze multiple (ex: ingalbenire = chloroza fier SAU exces apa SAU deficit azot), enumera-le si spune ce ar ajuta la diferentiere.

**SEVERITATE:** Usoara / Medie / Grava

**TRATAMENT RECOMANDAT:**
- Produse fitosanitare specifice cu doze (concentratie % la 10L apa)
- Alternativa BIO daca exista
- Cand sa se aplice (moment optim)

**PREVENTIE:**
- Ce masuri preventive pentru viitor

**URGENTA:** imediat / saptamana aceasta / la urmatorul tratament programat

Fii concis, practic, cu informatii pe care un pomicultor le poate aplica imediat.`;

  // ── AI5: Gemini 2.5-pro → flash fallback ─
  async function callGeminiProWithFallback(key, imgs, pr, timeout, opts) {
    const proRes = await callGemini(
      key,
      "gemini-2.5-pro-preview-03-25",
      imgs,
      null,
      pr,
      5000,
      opts,
    );
    if (proRes.ok) {
      log("gemini-2.5-pro key1 ok");
      return proRes;
    }
    log(`gemini-2.5-pro quota/fail (${proRes.status}), fallback flash`);
    return callGemini(key, "gemini-2.5-flash", imgs, null, pr, timeout, opts);
  }

  // ── Plant.id + Pl@ntNet + Gemini + GPT-4.1 IN PARALEL ─────────────────────
  const PLANT_ID_KEY = process.env.PLANT_ID_API_KEY;
  const PLANTNET_KEY = process.env.PLANTNET_API_KEY;
  const GH_TOKEN = process.env.GITHUB_MODELS_TOKEN;

  const [geminiSettled, plantIdSettled, plantNetSettled, gpt41Settled] =
    await Promise.allSettled([
      callGeminiProWithFallback(GEMINI_KEY1, images, prompt, 20000, {
        maxTokens: 8192,
      }),
      PLANT_ID_KEY
        ? callPlantId(PLANT_ID_KEY, images, 18000)
        : Promise.reject(new Error("no plant.id key")),
      PLANTNET_KEY
        ? callPlantNet(PLANTNET_KEY, images, 12000)
        : Promise.reject(new Error("no plantnet key")),
      GH_TOKEN
        ? callOpenAIVision(
            "https://models.inference.ai.azure.com/chat/completions",
            GH_TOKEN,
            "gpt-4.1",
            images,
            null,
            prompt,
            18000,
            { maxTokens: 8192 },
          )
        : Promise.reject(new Error("no github token")),
    ]);

  // ── Plant.id ───────────────────────────────────────────────────────────────
  let plantIdInfo = null;
  if (plantIdSettled.status === "fulfilled" && plantIdSettled.value?.res?.ok) {
    try {
      const pidJson = await plantIdSettled.value.res.json();
      plantIdInfo = formatPlantIdResult(pidJson, plantIdSettled.value.version);
      log(
        `plant.id ${plantIdSettled.value.version} ok — diseases:${!!plantIdInfo?.hasDiseases}`,
      );
    } catch {
      log("plant.id parse err");
    }
  } else {
    const status =
      plantIdSettled.value?.res?.status || plantIdSettled.reason?.message;
    log(`plant.id skip: ${String(status).substring(0, 80)}`);
  }

  // ── Pl@ntNet ───────────────────────────────────────────────────────────────
  let plantNetInfo = null;
  if (plantNetSettled.status === "fulfilled" && plantNetSettled.value.ok) {
    try {
      const pnJson = await plantNetSettled.value.json();
      plantNetInfo = formatPlantNetResult(pnJson);
      log(`plantnet ok — sp:${plantNetInfo?.identifiedSpecies?.name || "?"}`);
    } catch {
      log("plantnet parse err");
    }
  } else {
    log(
      `plantnet skip: ${plantNetSettled.value?.status || plantNetSettled.reason?.message}`,
    );
  }

  const idPrefix = (plantIdInfo?.prefix || "") + (plantNetInfo?.prefix || "");

  // ── Gemini primary ─────────────────────────────────────────────────────────
  let diagnosisText = null;
  let diagnosisMeta = {};

  if (geminiSettled.status === "fulfilled" && geminiSettled.value.ok) {
    try {
      const text = geminiText(await geminiSettled.value.json());
      if (text) {
        diagnosisText = text;
        log("gemini ok (pro or flash key1)");
      }
    } catch {
      log("gemini parse err");
    }
  } else {
    log(
      `gemini key1 failed: ${geminiSettled.reason?.name || geminiSettled.value?.status}`,
    );
  }

  // GPT-4.1 (rulat in paralel)
  if (!diagnosisText) {
    if (gpt41Settled.status === "fulfilled" && gpt41Settled.value.ok) {
      try {
        const text = openaiText(await gpt41Settled.value.json());
        if (text) {
          diagnosisText = text;
          diagnosisMeta._fallback = true;
          diagnosisMeta._model = "GPT-4.1";
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

  if (diagnosisText) {
    const finalText = idPrefix ? idPrefix + diagnosisText : diagnosisText;
    if (plantIdInfo) diagnosisMeta._plantid = true;
    if (plantNetInfo) diagnosisMeta._plantnet = true;
    diagnosisMeta._model = diagnosisMeta._model || "Gemini 2.5-flash";
    diagnosisMeta._imagesCount = images.length;
    log(`ok — model=${diagnosisMeta._model} images=${images.length}`);
    return Response.json(
      { diagnosis: finalText, ...diagnosisMeta },
      { headers: corsHeaders(req) },
    );
  }

  // ── Fallback 2: Gemini 2.5-flash cheia 2 ─────────────────────────────────
  const GEMINI_KEY2 = process.env.GOOGLE_AI_API_KEY_2;
  if (GEMINI_KEY2) {
    try {
      const res = await callGemini(
        GEMINI_KEY2,
        "gemini-2.5-flash",
        images,
        null,
        prompt,
        20000,
        { maxTokens: 8192 },
      );
      log(`gemini-2.5-flash key2 → ${res.status}`);
      if (res.ok) {
        const text = geminiText(await res.json());
        if (text) {
          return Response.json(
            {
              diagnosis: idPrefix ? idPrefix + text : text,
              _fallback: true,
              _model: "Gemini 2.5-flash (key2)",
              _plantid: !!plantIdInfo,
              _plantnet: !!plantNetInfo,
              _imagesCount: images.length,
            },
            { headers: corsHeaders(req) },
          );
        }
      }
    } catch (e) {
      log(`gemini key2 err: ${e.name}`);
    }
  }

  // ── Fallback 4: Pixtral-12B via Mistral ──────────────────────────────────
  const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
  if (MISTRAL_KEY) {
    try {
      const res = await callOpenAIVision(
        "https://api.mistral.ai/v1/chat/completions",
        MISTRAL_KEY,
        "pixtral-12b-2409",
        images,
        null,
        prompt,
        20000,
        { maxTokens: 8192 },
      );
      log(`pixtral-12b → ${res.status}`);
      if (res.ok) {
        const text = openaiText(await res.json());
        if (text)
          return Response.json(
            {
              diagnosis: idPrefix ? idPrefix + text : text,
              _fallback: true,
              _model: "Pixtral-12B",
              _plantid: !!plantIdInfo,
              _plantnet: !!plantNetInfo,
              _imagesCount: images.length,
            },
            { headers: corsHeaders(req) },
          );
      }
    } catch (e) {
      log(`pixtral err: ${e.name}`);
    }
  }

  // ── Fallback 5: Grok-2-vision (xAI) ──────────────────────────────────────
  const XAI_KEY = process.env.XAI_API_KEY;
  if (XAI_KEY) {
    try {
      const res = await callOpenAIVision(
        "https://api.x.ai/v1/chat/completions",
        XAI_KEY,
        "grok-2-vision-1212",
        images,
        null,
        prompt,
        20000,
        { maxTokens: 8192 },
      );
      log(`grok-2-vision → ${res.status}`);
      if (res.ok) {
        const text = openaiText(await res.json());
        if (text)
          return Response.json(
            {
              diagnosis: idPrefix ? idPrefix + text : text,
              _fallback: true,
              _model: "Grok-2-vision",
              _plantid: !!plantIdInfo,
              _plantnet: !!plantNetInfo,
              _imagesCount: images.length,
            },
            { headers: corsHeaders(req) },
          );
      }
    } catch (e) {
      log(`grok err: ${e.name}`);
    }
  }

  // ── Toate AI vision au picat — returneaza identificare specie + nota onesta ─
  if (idPrefix) {
    log("returning ID-only (all vision AI failed)");
    let note = "_Diagnostic AI detaliat indisponibil momentan._";
    if (plantIdInfo?.hasDiseases) {
      note =
        "_Plant.id v3 a detectat bolile listate mai sus. Diagnostic AI extins indisponibil momentan._";
    } else if (
      plantIdInfo?.identifiedSpecies ||
      plantNetInfo?.identifiedSpecies
    ) {
      note =
        "_Specia a fost identificata de Plant.id/Pl@ntNet. Diagnosticul AI de boli si tratamente este indisponibil momentan — incearca din nou peste cateva minute._";
    }
    return Response.json(
      {
        diagnosis: idPrefix + "\n" + note,
        _fallback: true,
        _plantid: !!plantIdInfo,
        _plantnet: !!plantNetInfo,
        _model: plantIdInfo ? "Plant.id" : "Pl@ntNet",
        _imagesCount: images.length,
      },
      { headers: corsHeaders(req) },
    );
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
