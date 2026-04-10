// Unit tests for markdown → HTML transformations used by sanitizeAI
// sanitizeAI lives in public/app.js and depends on window.DOMPurify (browser).
// Here we test the pure markdown regex transforms + escapeHtml logic as pure JS
// by replicating the exact transform chain from app.js:2223-2245.
// If the production code changes, update these tests accordingly.

import { describe, it, expect } from "vitest";

// Replicated from public/app.js (escapeHtml — uses document, so polyfill here)
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Replicated from public/app.js — the markdown transform chain
// (without DOMPurify step, which requires browser)
function markdownTransform(text) {
  let md = text
    .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^[\-\*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
    .replace(/\n/g, "<br>");
  md = md.replace(/<br>(<h[34]>)/g, "$1").replace(/(<\/h[34]>)<br>/g, "$1");
  md = md.replace(/<br>(<ul>)/g, "$1").replace(/(<\/ul>)<br>/g, "$1");
  return md;
}

describe("escapeHtml", () => {
  it("escapes basic HTML entities", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("escapes quotes for attribute context", () => {
    expect(escapeHtml('" onmouseover="alert(1)')).toBe(
      "&quot; onmouseover=&quot;alert(1)",
    );
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes ampersand before other entities (order matters)", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("stringifies non-string input", () => {
    expect(escapeHtml(42)).toBe("42");
    expect(escapeHtml(null)).toBe("null");
    expect(escapeHtml(undefined)).toBe("undefined");
  });
});

describe("markdownTransform", () => {
  it("transforms ### heading", () => {
    expect(markdownTransform("### Titlu")).toBe("<h3>Titlu</h3>");
  });

  it("transforms #### heading", () => {
    expect(markdownTransform("#### Subtitlu")).toBe("<h4>Subtitlu</h4>");
  });

  it("transforms **bold**", () => {
    expect(markdownTransform("text **bold** text")).toBe(
      "text <strong>bold</strong> text",
    );
  });

  it("transforms *italic*", () => {
    expect(markdownTransform("text *italic* text")).toBe(
      "text <em>italic</em> text",
    );
  });

  it("transforms ***bold italic***", () => {
    expect(markdownTransform("***combined***")).toBe(
      "<strong><em>combined</em></strong>",
    );
  });

  it("transforms - bullet list", () => {
    const out = markdownTransform("- item 1\n- item 2");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>item 1</li>");
    expect(out).toContain("<li>item 2</li>");
    expect(out).toContain("</ul>");
  });

  it("transforms numbered list", () => {
    const out = markdownTransform("1. first\n2. second");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>first</li>");
    expect(out).toContain("<li>second</li>");
  });

  it("transforms newlines to <br>", () => {
    expect(markdownTransform("line1\nline2")).toBe("line1<br>line2");
  });

  it("strips <br> around headings", () => {
    expect(markdownTransform("### Titlu\ntext")).toBe("<h3>Titlu</h3>text");
  });

  it("strips <br> around lists", () => {
    const out = markdownTransform("text\n- item");
    expect(out).not.toContain("<br><ul>");
  });

  // SECURITY tests — markdown must NOT bypass into raw HTML for script tags
  // (DOMPurify layer will catch these in production, but we verify inputs
  // are structurally preserved so DOMPurify can do its job)
  it("does not interpret raw HTML as markdown", () => {
    const input = "<script>alert(1)</script>";
    const out = markdownTransform(input);
    // Raw tags pass through — DOMPurify will strip them in production
    expect(out).toBe("<script>alert(1)</script>");
  });

  it("does not interpret <img onerror> as markdown structure", () => {
    const input = '<img src=x onerror="alert(1)">';
    const out = markdownTransform(input);
    expect(out).toBe('<img src=x onerror="alert(1)">');
  });

  it("preserves markdown inside AI diagnosis-like content", () => {
    const ai = "### DIAGNOSTIC:\n- **Boala:** Rapan\n- **Severitate:** Medie";
    const out = markdownTransform(ai);
    expect(out).toContain("<h3>DIAGNOSTIC:</h3>");
    expect(out).toContain("<strong>Boala:</strong>");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>");
  });
});
