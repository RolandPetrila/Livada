import { corsHeaders, handleOptions, rateLimit, checkOrigin } from "./_auth.js";
import { runChain, visionSteps } from "./_ai.js";
import { fetchWithTimeout } from "./_timeout.js";
import { isOverQuota, recordAiCalls } from "./_quota.js";
import { streamJson } from "./_stream.js";

// Edge Runtime + raspuns in flux (vezi _stream.js) — diagnosticul dureaza 14–21 s doar pe
// modelul principal; fara streaming orice fallback lovea limita Edge de 25 s (504).
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

const BUDGET_MS = 55000; // frontend asteapta 65 s

const DIAG_OPTS = { maxTokens: 6144, temperature: 0.3, thinkingBudget: 0 };

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

  return streamJson(corsHeaders(req), async () => {
    const deadline = t0 + BUDGET_MS;
    const attempts = [];
    // Cota Gemini (cheia 1) atinsa → sarim doar Gemini 2.5 Flash, restul lantului ramane activ
    const geminiBlocked = await isOverQuota("gemini");

    const PLANT_ID_KEY = process.env.PLANT_ID_API_KEY;
    const PLANTNET_KEY = process.env.PLANTNET_API_KEY;

    // Pl@ntNet (identificare specie, gratuit) IN PARALEL cu lantul vision
    const [plantNetSettled, vision] = await Promise.all([
      PLANTNET_KEY
        ? callPlantNet(PLANTNET_KEY, images, 12000).then(
            (v) => ({ status: "fulfilled", value: v }),
            (e) => ({ status: "rejected", reason: e }),
          )
        : Promise.resolve({ status: "rejected", reason: new Error("no plantnet key") }),
      runChain(
        visionSteps(images, null, prompt, DIAG_OPTS, { geminiBlocked, primaryMs: 30000 }),
        { deadline, log, attempts },
      ),
    ]);

    // ── Pl@ntNet ───────────────────────────────────────────────────────────
    let plantNetInfo = null;
    if (plantNetSettled.status === "fulfilled" && plantNetSettled.value.ok) {
      try {
        plantNetInfo = formatPlantNetResult(await plantNetSettled.value.json());
        log(`plantnet ok — sp:${plantNetInfo?.identifiedSpecies?.name || "?"}`);
      } catch {
        log("plantnet parse err");
      }
      attempts.push({ provider: "plantnet", ok: !!plantNetInfo });
    } else if (PLANTNET_KEY) {
      const err = plantNetSettled.value?.status || plantNetSettled.reason?.message;
      log(`plantnet skip: ${err}`);
      attempts.push({ provider: "plantnet", ok: false, err: String(err) });
    }

    // ── Plant.id — DOAR daca nici AI-ul vision, nici Pl@ntNet n-au raspuns.
    // Free tier = 50 credite TOTAL (nu se reincarca); v2 identifica doar specia, ca Pl@ntNet.
    let plantIdInfo = null;
    if (!vision && !plantNetInfo && PLANT_ID_KEY && deadline - Date.now() > 6000) {
      try {
        const pid = await callPlantId(PLANT_ID_KEY, images, Math.min(12000, deadline - Date.now() - 1000));
        if (pid.res.ok) {
          plantIdInfo = formatPlantIdResult(await pid.res.json(), pid.version);
          log(`plant.id ${pid.version} ok — diseases:${!!plantIdInfo?.hasDiseases}`);
        }
        attempts.push({ provider: "plant_id", ok: pid.res.ok, err: pid.res.ok ? "" : String(pid.res.status) });
      } catch (e) {
        log(`plant.id err: ${e.name}`);
        attempts.push({ provider: "plant_id", ok: false, err: e.name });
      }
    }

    await recordAiCalls(attempts);

    const idPrefix = (plantIdInfo?.prefix || "") + (plantNetInfo?.prefix || "");
    const meta = {
      _plantid: !!plantIdInfo,
      _plantnet: !!plantNetInfo,
      _imagesCount: images.length,
    };

    if (vision) {
      log(`ok — model=${vision.label} images=${images.length}`);
      return {
        diagnosis: idPrefix ? idPrefix + vision.text : vision.text,
        _model: vision.label,
        ...(vision.index > 0
          ? {
              _fallback: true,
              _fallbackModel: vision.label,
              _fallbackReason: vision.reason || "Modelul principal indisponibil",
            }
          : {}),
        ...meta,
      };
    }

    // ── Toate AI vision au picat — returneaza identificare specie + nota onesta ─
    if (idPrefix) {
      log("returning ID-only (all vision AI failed)");
      const note = plantIdInfo?.hasDiseases
        ? "_Plant.id a detectat bolile listate mai sus. Diagnostic AI extins indisponibil momentan._"
        : "_Specia a fost identificata. Diagnosticul AI de boli si tratamente este indisponibil momentan — incearca din nou peste cateva minute._";
      return {
        diagnosis: idPrefix + "\n" + note,
        _fallback: true,
        _fallbackReason: "Toate modelele AI vision indisponibile",
        _model: plantIdInfo ? "Plant.id" : "Pl@ntNet",
        ...meta,
      };
    }

    log("toate fallback-urile epuizate");
    return {
      error: "Serviciul AI de diagnostic este indisponibil momentan. Incearca din nou.",
    };
  });
}
