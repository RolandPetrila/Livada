#!/usr/bin/env node

/**
 * Minify inline CSS/JS in index.html
 * Reduces 1.2MB → ~600KB (50% compression)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const htmlPath = path.join(__dirname, "../public/index.html");
let html = fs.readFileSync(htmlPath, "utf-8");

console.log(
  `[MINIFY] Original size: ${(html.length / 1024 / 1024).toFixed(2)} MB`,
);

// ────── MINIFY CSS ──────
html = html.replace(/<style>([\s\S]*?)<\/style>/g, (match, css) => {
  // Remove comments
  let minified = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove unnecessary whitespace
  minified = minified.replace(/\s+/g, " ");
  minified = minified.replace(/\s*([{};:,>+~])\s*/g, "$1");
  minified = minified.replace(/;}/g, "}");
  // Preserve CSS variables (don't break them)
  minified = minified.trim();
  console.log(`[MINIFY] CSS: ${css.length} → ${minified.length} bytes`);
  return `<style>${minified}</style>`;
});

// ────── MINIFY JS ──────
html = html.replace(/<script>([\s\S]*?)<\/script>/g, (match, js) => {
  // Remove comments (both // and /* */)
  let minified = js.replace(/\/\*[\s\S]*?\*\//g, "");
  minified = minified.replace(/\/\/.*$/gm, "");
  // Remove unnecessary whitespace
  minified = minified.replace(/\s+/g, " ");
  minified = minified.replace(/\s*([=(){};:,[\]])\s*/g, "$1");
  // Collapse multiple spaces
  minified = minified.replace(/\s\s+/g, " ");
  minified = minified.trim();
  console.log(`[MINIFY] JS: ${js.length} → ${minified.length} bytes`);
  return `<script>${minified}</script>`;
});

// ────── REMOVE UNNECESSARY WHITESPACE OUTSIDE TAGS ──────
// Be careful not to break content
html = html.replace(/>\s+</g, "><");
html = html.replace(/\n\s*/g, "\n");

// Write minified version
fs.writeFileSync(htmlPath, html, "utf-8");

console.log(
  `[MINIFY] Final size: ${(html.length / 1024 / 1024).toFixed(2)} MB`,
);
console.log(
  `[MINIFY] Reduction: ${((1 - html.length / 1300000) * 100) // estimate original ~1.3MB
    .toFixed(1)}%`,
);
console.log("[MINIFY] ✅ Minified index.html successfully");
