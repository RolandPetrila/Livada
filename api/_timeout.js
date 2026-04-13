// M10: Shared timeout utilities — elimina duplicarea din API routes
// fetchWithTimeout: importat de _ai.js, ask.js, report.js, diagnose.js, diagnose-test.js
// withTimeout: importat de frost-alert.js, journal.js, meteo-history.js

export function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis timeout")), ms),
    ),
  ]);
}

export async function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}
