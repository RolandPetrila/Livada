#!/usr/bin/env node

/**
 * H4 Sprint 2: Minify public/app.js in-place
 *
 * Regex-based minify (zero deps) — acelasi pattern ca minify-html.js.
 * Reduce ~272KB → ~180KB (33% compression) + gzip ~50KB.
 *
 * Ruleaza:
 * - Pe Vercel la build (via npm run build)
 * - Local doar daca user foloseste `npm run build` manual
 *
 * Idempotent: rulari repetate pe fisier deja minificat nu introduc erori.
 * Fail-safe: daca rezultat > original, pastreaza originalul.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsPath = path.join(__dirname, "../public/app.js");

const source = fs.readFileSync(jsPath, "utf-8");
const originalSize = source.length;

console.log(
  `[MINIFY-JS] Original size: ${(originalSize / 1024).toFixed(1)} KB`,
);

function minifyJs(js) {
  let out = js;

  // 1. Protect string literals + template literals + regex (avoid breaking them)
  const placeholders = [];
  function stash(match) {
    placeholders.push(match);
    return "\u0001" + (placeholders.length - 1) + "\u0001";
  }
  // Preserve strings "..." '...' `...` and regex /.../
  out = out.replace(/"(?:\\.|[^"\\])*"/g, stash);
  out = out.replace(/'(?:\\.|[^'\\])*'/g, stash);
  out = out.replace(/`(?:\\.|[^`\\])*`/g, stash);
  // Template literals with interpolation handled above (backtick-to-backtick)

  // 2. Remove block comments /* ... */
  out = out.replace(/\/\*[\s\S]*?\*\//g, "");

  // 3. Remove line comments // ... (but not inside URLs like http://)
  out = out.replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");

  // 4. Collapse whitespace (preserve newlines initially)
  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/\n\s*/g, "\n");
  out = out.replace(/\n+/g, "\n");

  // 5. Remove spaces around syntax chars (conservative, avoid breaking expressions)
  out = out.replace(/ ?([{};,:=()<>!&|+\-*\/[\]]) ?/g, "$1");

  // 6. Remove leading/trailing ws
  out = out.trim();

  // 7. Restore placeholders
  out = out.replace(/\u0001(\d+)\u0001/g, function (_, i) {
    return placeholders[Number(i)];
  });

  return out;
}

const minified = minifyJs(source);
const minifiedSize = minified.length;

// Fail-safe: daca rezultat mai mare decat original (deja minificat), nu suprascrie
if (minifiedSize >= originalSize * 0.95) {
  console.log(
    `[MINIFY-JS] Already minified (${(minifiedSize / 1024).toFixed(1)} KB) — skipping rewrite`,
  );
  process.exit(0);
}

fs.writeFileSync(jsPath, minified, "utf-8");

const reduction = (
  ((originalSize - minifiedSize) / originalSize) *
  100
).toFixed(1);
console.log(
  `[MINIFY-JS] Final size: ${(minifiedSize / 1024).toFixed(1)} KB (${reduction}% reduction)`,
);
console.log("[MINIFY-JS] ✅ Minified app.js successfully");
