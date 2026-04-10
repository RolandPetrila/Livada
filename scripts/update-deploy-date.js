#!/usr/bin/env node

/**
 * update-deploy-date.js
 *
 * Actualizeaza automat DEPLOY_DATE, DEPLOY_TIME, DEPLOY_INFO in public/app.js
 * si BUILD_DATE in public/sw.js cu timestamp-ul curent (Europe/Bucharest).
 *
 * Ruleaza:
 * - Pe Vercel la fiecare deploy (buildCommand din vercel.json → npm run build)
 * - Local daca rulezi `npm run build` manual
 *
 * DEPLOY_INFO:
 * 1. Pe Vercel: VERCEL_GIT_COMMIT_MESSAGE (injectat automat de Vercel)
 * 2. Local: ultimul mesaj de commit git
 * 3. Fallback: "Deploy automat"
 *
 * Zero interventie manuala. Niciodata nu mai trebuie sa editezi manual DEPLOY_DATE.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ────── TIMESTAMP curent in Europe/Bucharest ──────
const now = new Date();
const fmt = new Intl.DateTimeFormat("ro-RO", {
  timeZone: "Europe/Bucharest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const parts = fmt.formatToParts(now).reduce((acc, p) => {
  if (p.type !== "literal") acc[p.type] = p.value;
  return acc;
}, {});

const DEPLOY_DATE = `${parts.year}-${parts.month}-${parts.day}`; // "2026-04-11"
const DEPLOY_TIME = `${parts.hour}:${parts.minute}`; // "02:35"
const BUILD_DATE = `${parts.year}${parts.month}${parts.day}`; // "20260411"

// ────── DEPLOY_INFO din sursa disponibila ──────
let DEPLOY_INFO = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";

if (!DEPLOY_INFO) {
  try {
    DEPLOY_INFO = execSync("git log -1 --pretty=%s", {
      encoding: "utf8",
      cwd: ROOT,
    }).trim();
  } catch {
    DEPLOY_INFO = "Deploy automat";
  }
}

// Sanitizare: prima linie, elimina caractere care ar sparge string literal JS
DEPLOY_INFO = DEPLOY_INFO.split("\n")[0]
  .replace(/["`]/g, "'") // inlocuieste quote-uri cu apostrof
  .replace(/\\/g, "/") // elimina backslash
  .substring(0, 120) // limita lungime tooltip
  .trim();

if (!DEPLOY_INFO) DEPLOY_INFO = "Deploy automat";

console.log(`[DEPLOY-DATE] ${DEPLOY_DATE} ${DEPLOY_TIME} Europe/Bucharest`);
console.log(`[DEPLOY-DATE] Info: ${DEPLOY_INFO}`);

// Helper: inlocuieste prin regex si verifica ca linia tinta exista in rezultat.
// Idempotent — daca linia e deja la valoarea corecta, trece fara eroare.
function replaceConstant(source, regex, targetLine, constName, filePath) {
  const updated = source.replace(regex, targetLine);
  if (!updated.includes(targetLine)) {
    console.error(
      `[DEPLOY-DATE] ❌ EROARE: ${constName} nu exista in ${filePath} cu formatul asteptat`,
    );
    console.error(`[DEPLOY-DATE] Cautam regex: ${regex}`);
    process.exit(1);
  }
  return updated;
}

// ────── Update public/app.js ──────
const appJsPath = join(ROOT, "public/app.js");
let appJs = readFileSync(appJsPath, "utf8");

appJs = replaceConstant(
  appJs,
  /const DEPLOY_DATE = "[^"]*";/,
  `const DEPLOY_DATE = "${DEPLOY_DATE}";`,
  "DEPLOY_DATE",
  "public/app.js",
);
appJs = replaceConstant(
  appJs,
  /const DEPLOY_TIME = "[^"]*";/,
  `const DEPLOY_TIME = "${DEPLOY_TIME}";`,
  "DEPLOY_TIME",
  "public/app.js",
);
// DEPLOY_INFO e pe 2 linii; verificam ca string literal-ul final e prezent
const deployInfoTarget = `const DEPLOY_INFO =\n  "${DEPLOY_INFO}";`;
appJs = appJs.replace(/const DEPLOY_INFO =\s*"[^"]*";/, deployInfoTarget);
if (!appJs.includes(`"${DEPLOY_INFO}";`)) {
  console.error(
    "[DEPLOY-DATE] ❌ EROARE: DEPLOY_INFO nu a fost updatat in public/app.js",
  );
  process.exit(1);
}

writeFileSync(appJsPath, appJs, "utf8");
console.log("[DEPLOY-DATE] ✅ public/app.js updated");

// ────── Update public/sw.js ──────
const swJsPath = join(ROOT, "public/sw.js");
let swJs = readFileSync(swJsPath, "utf8");

swJs = replaceConstant(
  swJs,
  /const BUILD_DATE = "[^"]*";/,
  `const BUILD_DATE = "${BUILD_DATE}";`,
  "BUILD_DATE",
  "public/sw.js",
);

writeFileSync(swJsPath, swJs, "utf8");
console.log("[DEPLOY-DATE] ✅ public/sw.js updated");

console.log("[DEPLOY-DATE] 🚀 Automatizare completa, continuare deploy...");
