// M10: Shared fetch-with-timeout utility — elimina duplicarea din 5+ fisiere API
// Importat de: _ai.js, ask.js, report.js, diagnose.js, diagnose-test.js

export async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}
