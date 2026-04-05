# RECOMANDARI IMBUNATATIRI v6 — Livada Mea Dashboard

**Data:** 2026-04-06 | **Versiune:** v7 (post-Sesiuni 1-17)
**HTML:** ~11,350 linii | **API:** 11 routes | **Specii:** 20 + 1 general

---

## LEGENDA STATUS

| Simbol | Semnificatie |
|--------|-------------|
| ✅ | DONE — Implementat si testat |
| 🔄 | IN PROGRESS — In curs de implementare |
| ⬜ | TODO — De implementat |
| 🔵 | VIITOR — Planificat strategic, nu urgent |
| ❌ | ANULAT — Nu se mai implementeaza |

---

## CHECKLIST MASTER — Toate fazele (viziune rapida)

### FAZA 1 — Securitate critica (~25 min)
- ✅ **S1** `index.html:8948` DOMPurify pin @3.3.3 + fallback XSS safe — DONE S16
- ✅ **S5** `api/_auth.js:20` CORS reject origini necunoscute — DONE S17
- ✅ **S7** `api/meteo-cron.js:22` CRON_SECRET enforce non-empty — DONE S16
- ✅ **T3** `api/ping.js` CORS headers + OPTIONS — DONE S16
- ✅ **T4** `api/meteo-history.js` Error detection robusta + validare date Redis — DONE S17

### FAZA 2 — Stabilitate API + Modele AI (~30 min)
- ✅ **S2** `api/meteo-cron.js` Edge Runtime — DONE S16
- ✅ **S3** `api/diagnose.js` Gemini 2.5-flash primary + 2.5-flash-lite fallback — DONE S16/S17
- ✅ **S4** `api/ask.js` + `api/diagnose.js` AbortController + fallback modele — DONE S16

### FAZA 3 — Memory leaks + cleanup (~30 min)
- ✅ **S8** `index.html` compressImage ObjectURL revoke — DONE S16
- ✅ **S9** `index.html` Lightbox singleton + event cleanup — DONE S16

### FAZA 4 — UX improvements v5 (4–6h)
- ✅ **R1** generateReport() filtru an curent — DONE (server-side report.js)
- ✅ **R2** checkAlerts() offline fallback — DONE S15
- ✅ **R3** Spray score humidity real — DONE (existent in initDashboardAzi)
- ✅ **R4** Meteo history risc micoze alert (rainyStreak >= 3) — DONE S16
- ✅ **I1** visibilitychange auto-refresh 30min — DONE S15
- ✅ **I2** Calendar buton "Azi" — DONE S16
- ✅ **I3** Recolta comparatie multi-an (selector an) — DONE S16
- ✅ **I4** Sync timestamp vizibil (timp relativ) — DONE S16
- ✅ **I5** authFetch() retry backoff — DONE S15
- ✅ **I6** Lightbox swipe gesture + tastatura + counter — DONE S16
- ✅ **I7** Species history buton "Adauga interventie" — DONE S16
- ✅ **I8** Stats selector an + total kg recolta — DONE S16
- ✅ **I9** generateReport() butoane Copiaza + Printeaza — DONE S15
- ✅ **I10** printFisa() popup blocker check — DONE (existent)

### FAZA 5 — Backend modernizare (5h)
- ✅ **S6** Open-Meteo parametri agricultura (uv_index, soil_moisture, et0) — DONE S17
- ⬜ **S10** photos.js Edge Runtime (testeaza upload Blob)
- ✅ **S11** Report caching Redis TTL 1h — DONE S17

### FAZA 6 — Features noi (6h)
- ⬜ **II1** Cost Tracker (cheltuieli sezon)
- ✅ **II3** SW Update Notification (toast versiune noua + buton Reincarca) — DONE S17
- ⬜ **II2/S13** Push Notifications inghet (Notification API)
- ⬜ **II4** Import jurnal CSV
- ✅ **P3-5** Jurnal filtru per specie — DONE S17
- ✅ **P3-6** Keyboard shortcuts (J/C/M/K//?/Esc) + help overlay — DONE S17
- ✅ **P3-7** localStorage Quota Monitor (warning >80%) — DONE S17

### FAZA 7 — Strategic / Viitor
- 🔵 **T1/S12** Offline Queue delete/edit + Background Sync API
- 🔵 **T2/S14** Rate limiting Redis-backed (distribuit)
- 🔵 **T5/S15** Teste unitare vitest

---

## PROGRES SESIUNI ANTERIOARE

| Sesiune | Items | Categorie | Status |
|---------|-------|-----------|--------|
| S1-S8 | Faze 1-4 | Infrastructura + continut specii + AI | ✅ DONE |
| S9 | 10 items P0/P1 | Spray score, prognoza, securitate, UX | ✅ DONE |
| S10 | 6 items UX | Imbunatatiri UX | ✅ DONE |
| S11 | 20 items | Audit standard — securitate + calitate | ✅ DONE |
| S12 | 12 items P0 | 3 specii noi + securitate critica | ✅ DONE |
| S13 | 13 items P1 | Securitate medie + search, lightbox, quick-add | ✅ DONE |
| S14 | 13 items P2 | Performanta + statistici, dark mode, compress | ✅ DONE |
| S15 | 7 items | 504 fix, offline alerts, retry, visibilitychange, copy/print | ✅ DONE |
| S16 | 12 items | Faza 3+4: recolta multi-an, lightbox, sync badge, risc micoze, toast AI, gemini 2.5-flash | ✅ DONE |
| S17 | 11 items | CORS fix, Gemini fallback lite, meteo agro, report cache, SW toast, jurnal filtru specie, kb shortcuts, quota monitor | ✅ DONE |
| **Total** | **118+ items** | | **Sesiuni 1-17 complete** |

---

---

# FAZA 1 — Securitate critica

> **Timp estimat: ~25 min** | **Risc: LOW** | **ROI: 9–10/10**

---

## S1. DOMPurify — Pin versiune + fix fallback XSS

**Status:** ⬜ TODO
**Fisier:** `public/index.html:8948` (CDN) + `public/index.html:9918` (fallback)
**Prioritate:** CRITICA — CVE-2026-0540 (HIGH, XSS bypass in 3.1.3–3.3.1)

**Problema:**
1. CDN `@3` nepinuit — daca jsdelivr serve o versiune afectata temporar = XSS.
2. Linia 9918: `return md` returneaza HTML nesanitizat daca DOMPurify nu s-a incarcat inca.

**Fix:**
```html
<!-- index.html:8948 — INAINTE: -->
<script defer src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>

<!-- DUPA: -->
<script defer src="https://cdn.jsdelivr.net/npm/dompurify@3.3.3/dist/purify.min.js"></script>
```

```javascript
// index.html:9918 — INAINTE:
  return md;
}

// DUPA:
  // Fallback sigur: strip all tags daca DOMPurify nu e incarcat
  return md.replace(/<[^>]*>/g, '');
}
```

**Efort:** 15 min | **Sursa:** https://github.com/advisories/GHSA-v2wj-7wpq-c8vv

---

## S5. CORS — Reject 403 in loc de fallback origin

**Status:** ⬜ TODO
**Fisier:** `api/_auth.js:20`

**Problema:** Daca origin-ul nu e in whitelist, returneaza `ALLOWED_ORIGINS[0]` — nu respinge. Orice domeniu poate vedea header-ul CORS al productiei.

**Fix:**
```javascript
// _auth.js:19-23 — INAINTE:
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    ...
  };

// DUPA:
  return {
    'Access-Control-Allow-Origin': allowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-livada-token',
  };
```

**Efort:** 10 min

---

## S7. CRON_SECRET — Enforce non-empty

**Status:** ⬜ TODO
**Fisier:** `api/meteo-cron.js:22`

**Problema:** `if (cronSecret) { ... }` — daca `CRON_SECRET` nu e setat in Vercel env, oricine poate triggera cronul manual.

**Fix:**
```javascript
// INAINTE:
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = ...
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Neautorizat' }, { status: 401 });
    }
  }

// DUPA:
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: 'CRON_SECRET neconfigurat' }, { status: 500 });
  }
  const auth = req.headers?.get?.('authorization') || req.headers?.['authorization'] || '';
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Neautorizat' }, { status: 401 });
  }
```

**Efort:** 5 min

---

## T3. ping.js — Adauga CORS headers

**Status:** ⬜ TODO
**Fisier:** `api/ping.js`

**Problema:** `ping.js` nu aplica CORS si nu raspunde la `OPTIONS`. Request de pe localhost sau alt origin e blocat.

**Fix (inlocuieste complet):**
```javascript
import { corsHeaders, handleOptions } from './_auth.js';
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  return new Response(JSON.stringify({ ok: true, t: Date.now() }), {
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(req))
  });
}
```

**Efort:** 5 min

---

## T4. meteo-history.js — Error detection robusta

**Status:** ⬜ TODO
**Fisier:** `api/meteo-history.js`

**Problema:** `msg.includes('UPSTASH') || msg.includes('Missing')` — string-matching fragil.

**Fix:**
```javascript
// INAINTE:
if (msg.includes('UPSTASH') || msg.includes('Missing')) {

// DUPA:
if (!process.env.UPSTASH_REDIS_REST_URL || err instanceof TypeError) {
```

**Efort:** 5 min

---

---

# FAZA 2 — Stabilitate API + Modele AI

> **Timp estimat: ~30 min** | **Risc: LOW** | **ROI: 8–9/10**

---

## S2. meteo-cron.js — Edge Runtime

**Status:** ⬜ TODO
**Fisier:** `api/meteo-cron.js`

**Problema:** Singurul route cu I/O extern (Open-Meteo + Redis x4) care ruleaza pe Node.js serverless. Vercel Hobby: 10s limita. Lantul Open-Meteo (2-3s) + 4 Redis ops (2-4s) = risc 504 la conexiune lenta.

**Fix (adauga dupa import):**
```javascript
import { Redis } from '@upstash/redis';

export const runtime = 'edge';  // ADAUGA ACEASTA LINIE

const LAT = 46.17;
```

**Efort:** 5 min | **De ce merge:** Upstash Redis si Open-Meteo folosesc HTTP intern — compatibil Edge Runtime.

---

## S3. Gemini — Upgrade 1.5-flash → 2.5-flash

**Status:** ⬜ TODO
**Fisiere:** `api/diagnose.js:69` + `api/diagnose-test.js:34`

**Problema:** Codul foloseste `gemini-1.5-flash` — 2 generatii in urma. Gemini 2.5-flash ofera calitate semnificativ mai buna la analiza imagine. NOTA: `gemini-2.0-flash` se deprecieaza 1 iunie 2026!

**Fix — diagnose.js:69:**
```javascript
// INAINTE:
'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',

// DUPA:
'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
```

**Fix — diagnose-test.js:34:**
```javascript
// INAINTE:
'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',

// DUPA:
'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
```

**Efort:** 5 min | **Sursa:** https://ai.google.dev/gemini-api/docs/models

---

## S4. AbortController proper pe ask.js si diagnose.js

**Status:** ⬜ TODO
**Fisiere:** `api/ask.js:68` + `api/diagnose.js:68`

**Problema:** Ask si diagnose folosesc `Promise.race` cu timeout promise — fetch-ul AI continua in background dupa ce clientul a primit raspuns, consumand quota Groq/Gemini inutil. `diagnose-test.js` il face corect (model de urmat).

**Fix ask.js (inlocuieste Promise.race cu AbortController):**
```javascript
// INAINTE (Promise.race):
const fetchPromise = fetch('https://api.groq.com/...', {...});
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('GROQ_TIMEOUT')), 28000)
);
const groqRes = await Promise.race([fetchPromise, timeoutPromise]);

// DUPA (AbortController):
const controller = new AbortController();
const tid = setTimeout(() => controller.abort(), 28000);
let groqRes;
try {
  groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({...}),
    signal: controller.signal,
  });
  clearTimeout(tid);
} catch (err) {
  clearTimeout(tid);
  if (err.name === 'AbortError') {
    return Response.json({ error: 'AI-ul raspunde lent. Incearca din nou.' }, { status: 503, headers: corsHeaders(req) });
  }
  throw err;
}
```

**Acelasi pattern pentru diagnose.js** (timeout 22s in loc de 28s).

**Efort:** 30 min (2 fisiere)

---

---

# FAZA 3 — Memory leaks + cleanup

> **Timp estimat: ~30 min** | **Risc: LOW** | **ROI: 6/10**

---

## S8. compressImage — Revoke ObjectURL

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — functia `compressImage()`

**Problema:** `URL.createObjectURL(file)` aloca un blob URL care nu e revocat dupa success. Fiecare poza comprimata = cateva KB leakate in sesiune (5-10 poze = 1-2MB neeliberate).

**Fix — adauga revoke in finally:**
```javascript
function compressImage(file, maxBytes, callback) {
  var src = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function() {
    // ... cod compresie existent ...
    canvas.toDataURL(file.type || 'image/jpeg', quality);
    URL.revokeObjectURL(src); // ADAUGA ACEASTA LINIE
    callback(dataUrl);
  };
  img.onerror = function() {
    URL.revokeObjectURL(src); // deja existent sau adauga
    callback(null);
  };
  img.src = src;
}
```

**Efort:** 10 min

---

## S9. Event listener cleanup pe modali

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — `openLightbox()` + modal checklist

**Problema:** La fiecare deschidere lightbox/modal, se adauga listeneri noi fara sa se stearga cei vechi. Dupa 20 deschideri = 20 listeneri identici care ruleaza in paralel.

**Fix — verifica existenta overlay inainte de creare:**
```javascript
function openLightbox(src, allSrcs) {
  allSrcs = allSrcs || [src];
  var idx = allSrcs.indexOf(src);
  var overlay = document.getElementById('lightbox-overlay');
  if (!overlay) {
    // CREEAZA overlay o singura data
    overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    // ... adauga listeneri O SINGURA DATA ...
    document.body.appendChild(overlay);
  }
  // Actualizeaza doar imaginea si counter-ul
  document.getElementById('lightbox-img').src = src;
  // ... rest neschimbat
}
```

**Efort:** 20 min

---

---

# FAZA 4 — UX improvements v5

> **Timp estimat: 4–6h** | **Risc: LOW** | **ROI: 7–8/10**

---

## R1. generateReport() — Filtru an curent ✅ DONE

**Status:** ✅ DONE — Implementat in `api/report.js` (server-side, filtrare la liniile 30-31)

---

## R2. checkAlerts() — Fallback offline ✅ DONE

**Status:** ✅ DONE — Implementat in S15 cu `ALERTS_CACHE_KEY` localStorage

---

## R3. calculateSprayScore() — Humidity real ✅ DONE

**Status:** ✅ DONE — Existent in `initDashboardAzi` cu `relative_humidity_2m_mean`

---

## R4. loadMeteoHistory() — Risc boli vizualizat

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — `loadMeteoHistory()` ~linia 10338

**Problema:** Graficul meteo history arata doar temperatura. Backend returneaza si `rain` si `humidity` — suficient pentru risc fungic — dar nu sunt afisate.

**Fix — adauga nota risc sub grafic:**
```javascript
// In loadMeteoHistory(), dupa constructia bars:
var riskDays = entries.filter(function(e) {
  var d = e[1];
  return d.rain > 0 && d.temp >= 10 && d.temp <= 25;
});
var riskNote = riskDays.length >= 3
  ? '<div class="alert alert-warning" style="font-size:0.78rem;margin-top:8px;"><strong>' + riskDays.length + ' zile cu conditii favorabile pentru boli fungice</strong> in ultimele 30 zile. Verifica rapanul si monilioza.</div>'
  : (riskDays.length > 0
     ? '<div class="alert alert-info" style="font-size:0.78rem;margin-top:8px;">' + riskDays.length + ' zi/zile cu ploi la temperatura optima pentru boli.</div>'
     : '');
container.innerHTML = '...(grafic existent)...' + riskNote;
```

**Efort:** 30 min | **Impact:** Mediu — valorifica date existente din API

---

## I1. visibilitychange auto-refresh ✅ DONE

**Status:** ✅ DONE — Implementat in S15 cu handler 30min

---

## I2. renderCalendar() — Buton "Azi"

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — zona calendar navigation

**Problema:** Navigare doar ← → luna cu luna. Intoarcerea la luna curenta dupa navigare = N click-uri.

**Fix — adauga buton central:**
```javascript
var navHtml = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
  '<button class="btn btn-secondary" style="padding:6px 12px;" onclick="calNav(-1)">&#8249;</button>' +
  '<div style="text-align:center;">' +
  '<div style="font-weight:700;font-size:0.95rem;">' + MONTHS_RO[calMonth] + ' ' + calYear + '</div>' +
  '<button class="btn btn-secondary" style="padding:2px 10px;font-size:0.7rem;margin-top:4px;" ' +
  'onclick="calMonth=new Date().getMonth();calYear=new Date().getFullYear();renderCalendar();enhanceCalendarWithMeteo();">Azi</button>' +
  '</div>' +
  '<button class="btn btn-secondary" style="padding:6px 12px;" onclick="calNav(1)">&#8250;</button>' +
  '</div>';
```

**Efort:** 15 min | **Impact:** Mediu — navigare fluida

---

## I3. renderRecoltaSummary() — Selector an (comparatie multi-an)

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — zona recoltaSummary

**Problema:** Tabelul arata doar anul curent. Dupa 2-3 ani nu poti compara productia.

**Fix complet:**
```javascript
function renderRecoltaSummary() {
  var el = document.getElementById('recoltaSummary');
  if (!el) return;
  var allEntries = getJurnalEntries().filter(function(e) { return e.type === 'recoltare' && e.kg > 0; });
  var years = [...new Set(allEntries.map(function(e){ return (e.date||'').substring(0,4); }).filter(Boolean))].sort().reverse();
  if (years.length === 0) {
    el.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:16px;">Nicio recolta inregistrata cu cantitate (kg).</p>'; return;
  }
  var existingSel = document.getElementById('recoltaYearSel');
  var selYear = existingSel ? existingSel.value : years[0];
  var yearEntries = allEntries.filter(function(e){ return (e.date||'').startsWith(selYear); });
  var bySpecies = {};
  yearEntries.forEach(function(e){
    var sp = SPECIES[e.species] || e.species || 'Nespecificat';
    bySpecies[sp] = (bySpecies[sp]||0) + parseFloat(e.kg||0);
  });
  var total = Object.values(bySpecies).reduce(function(a,b){return a+b;}, 0);
  var selHtml = years.length > 1
    ? '<select id="recoltaYearSel" onchange="renderRecoltaSummary()" style="padding:4px 8px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.78rem;margin-bottom:8px;">' +
      years.map(function(y){return '<option value="'+y+'"'+(y===selYear?' selected':'')+'>'+y+'</option>';}).join('') + '</select>'
    : '';
  var rows = Object.entries(bySpecies).sort(function(a,b){return b[1]-a[1];}).map(function(p){
    return '<tr><td>' + escapeHtml(p[0]) + '</td><td><strong>' + p[1].toFixed(1) + ' kg</strong></td></tr>';
  }).join('');
  el.innerHTML = selHtml +
    '<table class="table-wrap"><thead><tr><th>Specie</th><th>Cantitate</th></tr></thead><tbody>' + rows + '</tbody>' +
    '<tfoot><tr><td><strong>Total</strong></td><td><strong>' + total.toFixed(1) + ' kg</strong></td></tr></tfoot></table>';
}
```

**Efort:** 30 min | **Impact:** Mare

---

## I4. syncJournal() — Timestamp ultima sincronizare

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — `updateSyncBadge()`

**Problema:** Badge-ul arata "Sincronizat" dar nu stie utilizatorul CAND.

**Fix:**
```javascript
// In syncJournal(), la succes:
jSyncStatus = 'synced';
localStorage.setItem('livada-last-sync', new Date().toISOString());
updateSyncBadge();

// In updateSyncBadge():
function updateSyncBadge(customLabel) {
  var badge = document.getElementById('syncBadge');
  if (!badge) return;
  if (customLabel) { badge.textContent = customLabel; return; }
  if (jSyncStatus === 'synced') {
    var lastSync = localStorage.getItem('livada-last-sync');
    var timeLabel = '';
    if (lastSync) {
      var diff = Math.round((Date.now() - new Date(lastSync)) / 60000);
      timeLabel = diff < 1 ? ' (acum)' : diff < 60 ? ' (' + diff + ' min)' : ' (' + Math.round(diff/60) + ' h)';
    }
    badge.textContent = 'Sincronizat' + timeLabel;
    badge.style.color = 'var(--success)';
  }
}
```

**Efort:** 20 min | **Impact:** Mediu

---

## I5. authFetch() — Retry backoff ✅ DONE

**Status:** ✅ DONE — Implementat in S15 cu retries [0, 2000, 5000]

---

## I6. openLightbox() — Swipe gesture galerie

**Status:** ⬜ TODO
**Fisier:** `public/index.html:10061`

**Problema:** Lightbox se deschide la click dar nu exista navigare stanga/dreapta. Pe Android = imposibil de navigat intre poze.

**Fix complet:**
```javascript
function openLightbox(src, allSrcs) {
  allSrcs = allSrcs || [src];
  var idx = allSrcs.indexOf(src);
  var overlay = document.getElementById('lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:400;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
    overlay.innerHTML =
      '<button id="lb-prev" style="position:absolute;left:12px;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:2rem;padding:8px 14px;border-radius:50%;cursor:pointer;z-index:1;">&#8249;</button>' +
      '<img id="lightbox-img" style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px;">' +
      '<button id="lb-next" style="position:absolute;right:12px;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:2rem;padding:8px 14px;border-radius:50%;cursor:pointer;z-index:1;">&#8250;</button>' +
      '<div id="lb-counter" style="position:absolute;bottom:12px;color:rgba(255,255,255,0.7);font-size:0.8rem;"></div>';
    var touchStartX = 0;
    overlay.addEventListener('touchstart', function(e){ touchStartX = e.touches[0].clientX; }, {passive:true});
    overlay.addEventListener('touchend', function(e){
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) navigate(dx > 0 ? -1 : 1);
    });
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.style.display = 'none'; });
    document.body.appendChild(overlay);
  }
  function navigate(dir) {
    idx = (idx + dir + allSrcs.length) % allSrcs.length;
    document.getElementById('lightbox-img').src = allSrcs[idx];
    document.getElementById('lb-counter').textContent = (idx+1) + ' / ' + allSrcs.length;
  }
  document.getElementById('lb-prev').onclick = function(e){ e.stopPropagation(); navigate(-1); };
  document.getElementById('lb-next').onclick = function(e){ e.stopPropagation(); navigate(1); };
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lb-counter').textContent = (idx+1) + ' / ' + allSrcs.length;
  document.getElementById('lb-prev').style.display = allSrcs.length > 1 ? '' : 'none';
  document.getElementById('lb-next').style.display = allSrcs.length > 1 ? '' : 'none';
  overlay.style.display = 'flex';
}

// In loadGallery(), modifica click handler:
var photoUrls = photos.map(function(p){ return p.url; });
grid.onclick = function(e) {
  var btn = e.target.closest('.gal-del'); if (btn) { deletePhoto(btn.dataset.url); return; }
  var img = e.target.closest('img');
  if (img) openLightbox(img.src, photoUrls);
};
```

**Efort:** 45 min | **Impact:** Mare pe Android

---

## I7. injectSpeciesHistory() — Buton "Adauga interventie"

**Status:** ⬜ TODO
**Fisier:** `public/index.html:10005`

**Problema:** Flux lung: tab specie → iesire → modal jurnal → selectare specie manual.

**Fix:**
```javascript
function injectSpeciesHistory(speciesId, container) {
  // ... cod existent ...
  var speciesName = SPECIES[speciesId] || speciesId;
  var addBtn = '<div style="margin-top:10px;">' +
    '<button class="btn btn-secondary" style="width:100%;font-size:0.8rem;padding:8px;" ' +
    'onclick="openModal(\'jurnal\');setTimeout(function(){ var sp=document.getElementById(\'jurnalSpecies\'); if(sp) sp.value=\'' + speciesId + '\'; }, 100);">' +
    '+ Adauga interventie pentru ' + escapeHtml(speciesName) + '</button></div>';
  div.innerHTML += addBtn;
  container.appendChild(div);
}
```

**Efort:** 20 min | **Impact:** Mediu

---

## I8. renderStats() — Selector an + total kg recolta

**Status:** ⬜ TODO
**Fisier:** `public/index.html:9950`

**Problema:** Graficul interventii e limitat la anul curent, nu include kg recolta.

**Fix — adauga la inceputul renderStats():**
```javascript
function renderStats() {
  var entries = getJurnalEntries();
  var allYears = [...new Set(entries.map(function(e){ return (e.date||'').substring(0,4); }).filter(Boolean))].sort().reverse();
  var year = parseInt(localStorage.getItem('livada-stats-year') || String(new Date().getFullYear()));
  if (!allYears.includes(String(year))) year = parseInt(allYears[0] || new Date().getFullYear());
  var yearEntries = entries.filter(function(e){ return e.date && e.date.startsWith(String(year)); });

  var yearSelHtml = allYears.length > 1
    ? '<div style="margin-bottom:12px;"><select onchange="localStorage.setItem(\'livada-stats-year\',this.value);injectStatsSection();" style="padding:4px 8px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
      allYears.map(function(y){ return '<option value="'+y+'"'+(String(year)===y?' selected':'')+'>'+y+'</option>'; }).join('') +
      '</select></div>'
    : '';

  var totalKg = yearEntries.filter(function(e){ return e.type==='recoltare' && e.kg>0; }).reduce(function(s,e){ return s+parseFloat(e.kg||0); }, 0);
  var kgHtml = totalKg > 0
    ? '<div style="padding:8px 12px;background:var(--bg-surface);border-radius:8px;margin-bottom:12px;font-size:0.85rem;">Recolta totala ' + year + ': <strong>' + totalKg.toFixed(1) + ' kg</strong></div>'
    : '';

  // ... restul graficelor cu yearEntries in loc de entries ...
}
```

**Efort:** 45 min | **Impact:** Mare

---

## I9. generateReport() — Butoane Copiaza + Printeaza ✅ DONE

**Status:** ✅ DONE — Implementat in S15

---

## I10. printFisa() — Popup blocker check ✅ DONE

**Status:** ✅ DONE — Existent in cod

---

---

# FAZA 5 — Backend modernizare

> **Timp estimat: ~5h** | **Risc: MEDIUM** | **ROI: 7–9/10**

---

## S6. Open-Meteo — Parametri agricultura

**Status:** ⬜ TODO
**Fisier:** `api/meteo-cron.js` (URL si stocare) + `public/index.html` (afisare)

**De ce:** Date GRATUITE, extrem de utile. Disponibile in API, nefolosite inca.
- `soil_moisture_0_to_1cm` — decizie irigatie
- `et0_fao_evapotranspiration` — necesar apa zilnic
- `leaf_wetness_probability` — predictor boli fungice (mai precis decat formula actuala)
- `uv_index` — stres solar, arsuri fructe

**Fix — extinde URL meteo-cron.js:**
```javascript
const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation` +
  `&hourly=temperature_2m,precipitation,relative_humidity_2m,weather_code` +
  `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
  `,et0_fao_evapotranspiration,uv_index_max` +          // NOU
  `&hourly=leaf_wetness_probability` +                   // NOU
  `&daily=soil_moisture_0_to_1cm_mean` +                 // NOU
  `&timezone=Europe/Bucharest&forecast_days=5`;
```

**Stocare extinsa in Redis:**
```javascript
history[today] = {
  // ... campuri existente ...
  et0: data.daily.et0_fao_evapotranspiration?.[0] || 0,
  uv: data.daily.uv_index_max?.[0] || 0,
  soil_moisture: data.daily.soil_moisture_0_to_1cm_mean?.[0] || null,
};
```

**Widget nou in dashboard:** Afisare `et0` (necesar apa ml/mp) si `uv` (index UV) in sectiunea meteo.

**Efort:** 4h | **Sursa:** https://open-meteo.com/en/docs

---

## S10. photos.js — Edge Runtime

**Status:** ⬜ TODO
**Fisier:** `api/photos.js:3`

**Problema:** `maxDuration: 60` fara `runtime: 'edge'` — acelasi pattern ca vechiul report.js bug.

**Actiune:** Testeaza mai intai daca `@vercel/blob` `put()` functioneaza in Edge Runtime.
```javascript
// TESTEAZA: adauga temporar si verifica upload in production
export const config = { runtime: 'edge' };
// Daca upload-ul functioneaza → keep. Daca nu → revert la Node.js cu maxDuration explicit.
```

**Efort:** 30 min (test + deploy) | **Risc:** MEDIUM — @vercel/blob PUT in Edge neconfirmat

---

## S11. Report caching Redis TTL 1h

**Status:** ⬜ TODO
**Fisier:** `api/report.js`

**Problema:** Raportul anual se regenereaza complet la fiecare click — Redis + Groq consumate inutil.

**Fix — cache in Redis cu TTL 3600s:**
```javascript
// Dupa Redis.fromEnv():
const cacheKey = `livada:report:${year}`;
const cached = await kv.get(cacheKey);
if (cached) {
  return Response.json(cached, { headers: corsHeaders(req) });
}

// ... genereaza report ...

// Inainte de return final:
await kv.setex(cacheKey, 3600, { report, year, journalCount: yearEntries.length, meteoDays: meteoEntries.length });
return Response.json({ report, year, ... });
```

**Efort:** 2h | **Impact:** Reduce latenta + economiseste tokens Groq

---

---

# FAZA 6 — Features noi

> **Timp estimat: ~6h** | **Risc: LOW** | **ROI: 6–8/10**

---

## II1. Cost Tracker — Evidenta cheltuieli sezon

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — sectiunea Plan Livada

**De ce:** "Am dat 800 lei pe fungicide — merit sa cumpar stoc de toamna?" — intrebare reala fara raspuns actual.

**Implementare JS:**
```javascript
function getCostEntries() {
  try { return JSON.parse(localStorage.getItem('livada-costs') || '[]'); }
  catch { return []; }
}
function addCost() {
  var product = document.getElementById('costProduct').value.trim();
  var qty = parseFloat(document.getElementById('costQty').value);
  var price = parseFloat(document.getElementById('costPrice').value);
  if (!product || isNaN(qty) || isNaN(price)) { showToast('Completeaza toate campurile.'); return; }
  var entries = getCostEntries();
  entries.unshift({ id: Date.now(), date: todayLocal(), product: product, qty: qty, price: price, total: qty * price });
  localStorage.setItem('livada-costs', JSON.stringify(entries));
  renderCosts();
  showToast('Cost inregistrat!');
}
function renderCosts() {
  var el = document.getElementById('costsBody'); if (!el) return;
  var entries = getCostEntries();
  var year = new Date().getFullYear();
  var yearEntries = entries.filter(function(e){ return (e.date||'').startsWith(String(year)); });
  var total = yearEntries.reduce(function(s,e){ return s + (e.total||0); }, 0);
  el.innerHTML = yearEntries.length === 0
    ? '<p style="color:var(--text-dim);padding:12px;text-align:center;">Nicio cheltuiala inregistrata in ' + year + '.</p>'
    : '<table class="table-wrap"><thead><tr><th>Data</th><th>Produs</th><th>Cantitate</th><th>Total (lei)</th></tr></thead><tbody>' +
      yearEntries.map(function(e){
        return '<tr><td>' + escapeHtml(e.date||'') + '</td><td>' + escapeHtml(e.product||'') + '</td>' +
          '<td>' + (e.qty||'') + ' x ' + (e.price||'') + ' lei</td>' +
          '<td><strong>' + (e.total||0).toFixed(2) + ' lei</strong></td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><td colspan="3"><strong>Total ' + year + '</strong></td>' +
      '<td><strong>' + total.toFixed(2) + ' lei</strong></td></tr></tfoot></table>';
}
```

**HTML section:**
```html
<div class="section" id="costs-section" style="margin-top:16px;">
  <h2 class="section-title">Cheltuieli Sezon</h2>
  <div class="section-body">
    <div style="display:grid;grid-template-columns:1fr 80px 80px auto;gap:6px;margin-bottom:12px;align-items:end;">
      <input id="costProduct" type="text" placeholder="Produs (ex: Score 250 EC)"
        style="padding:8px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">
      <input id="costQty" type="number" placeholder="Cantitate" min="0.01" step="0.01"
        style="padding:8px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">
      <input id="costPrice" type="number" placeholder="Lei/unit" min="0" step="0.01"
        style="padding:8px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">
      <button class="btn btn-primary" onclick="addCost()" style="padding:8px 14px;">+</button>
    </div>
    <div id="costsBody"></div>
  </div>
</div>
```

**Efort:** 2h | **Impact:** Mare

---

## II3. SW Update Notification

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — sectiunea SW registration (~linia 9777) + `public/sw.js`

**Problema:** Dupa `git push`, Roland poate folosi ore intregi versiunea veche din cache.

**Fix — index.html (inlocuieste inregistrarea SW):**
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(reg) {
    reg.addEventListener('updatefound', function() {
      var newWorker = reg.installing;
      newWorker.addEventListener('statechange', function() {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          var t = document.createElement('div');
          t.className = 'toast';
          t.style.cssText += 'cursor:pointer;background:var(--accent);color:#fff;';
          t.textContent = 'Versiune noua disponibila. Apasa pentru actualizare.';
          t.addEventListener('click', function() {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            location.reload();
          });
          document.body.appendChild(t);
          setTimeout(function() { if (t.parentNode) t.remove(); }, 10000);
        }
      });
    });
  });
}
```

**Fix — sw.js (adauga handler):**
```javascript
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

**Efort:** 1h | **Impact:** Mediu — elimina utilizarea versiunii vechi dupa deploy

---

## II2/S13. Push Notifications inghet (Notification API)

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — `initDashboardAzi()` + buton setari

**De ce:** Alerta de inghet vizibila pe ecranul telefonului chiar daca app-ul e inchis.

**Implementare:**
```javascript
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    var perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

async function checkAlertsWithNotification() {
  await checkAlerts();
  if (!navigator.onLine) return;
  try {
    var res = await fetchWithTimeout('/api/frost-alert', {}, 5000);
    if (!res.ok) return;
    var data = await res.json();
    if (data.frost && data.frost.active) {
      var lastNotif = localStorage.getItem('livada-frost-notif-date');
      var today = todayLocal();
      if (lastNotif !== today) {
        var granted = await requestNotificationPermission();
        if (granted) {
          new Notification('Livada Mea — Alerta Inghet', {
            body: data.frost.message || 'Inghet posibil. Protejeaza pomii sensibili!',
            icon: '/icon.svg',
            tag: 'frost-alert'
          });
          localStorage.setItem('livada-frost-notif-date', today);
        }
      }
    }
  } catch(e) {}
}
// In initDashboardAzi(), inlocuieste checkAlerts() cu checkAlertsWithNotification()
```

**Buton in setari:**
```html
<button class="btn btn-secondary" onclick="requestNotificationPermission().then(function(ok){showToast(ok?'Notificari activate!':'Notificari refuzate.');})">
  Notificari inghet
</button>
```

**Efort:** 2h | **Impact:** Maxim (prevenire pierderi productie)

---

## II4. Import jurnal CSV

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — modal jurnal

**De ce:** Roland poate importa date din 2024-2025 dintr-un Excel vechi.

**Implementare:**
```javascript
function importJurnalCSV(input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var lines = e.target.result.split('\n').filter(function(l){ return l.trim(); });
    if (lines.length < 2) { showToast('CSV gol sau invalid.'); return; }
    var imported = 0;
    var entries = getJurnalEntries();
    var existingIds = new Set(entries.map(function(e){ return e.id; }));
    for (var i = 1; i < lines.length; i++) {
      var parts = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g);
      if (!parts || parts.length < 3) continue;
      var date = parts[0].replace(/^"|"$/g,'').trim();
      var type = parts[1].replace(/^"|"$/g,'').trim().toLowerCase();
      var note = parts[2].replace(/^"|"$/g,'').replace(/""/g,'"').trim();
      if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !note) continue;
      var newId = new Date(date).getTime() + i;
      if (existingIds.has(newId)) continue;
      entries.push({ id: newId, date: date, type: type || 'observatie', note: note });
      imported++;
    }
    if (imported > 0) {
      entries.sort(function(a,b){ return b.id - a.id; });
      saveJurnalEntries(entries);
      renderJurnal();
      syncJournal();
      showToast(imported + ' interventii importate din CSV!');
    } else { showToast('Nicio intrare valida. Format: YYYY-MM-DD,tip,nota'); }
  };
  reader.readAsText(file);
  input.value = '';
}
```

```html
<!-- In footer modal jurnal, langa Export CSV: -->
<label class="btn btn-secondary" style="cursor:pointer;font-size:0.8rem;">
  Import CSV
  <input type="file" accept=".csv,text/csv" style="display:none;" onchange="importJurnalCSV(this)">
</label>
```

**Efort:** 1h | **Impact:** Mediu

---

## P3-5. Jurnal filtru per specie

**Status:** ⬜ TODO
**Fisier:** `public/index.html` — filtrul jurnalului + `renderJurnal()`

**Implementare:**
```javascript
// Dropdown in HTML filtru jurnal:
// <select id="jurnalSpeciesFilter" onchange="jurnalPage=0;renderJurnal();">
//   <option value="">Toate speciile</option>
//   ... (generat din SPECIES)
// </select>

// In renderJurnal():
var speciesFilter = document.getElementById('jurnalSpeciesFilter');
if (speciesFilter && speciesFilter.value) {
  var spId = speciesFilter.value;
  var spName = (SPECIES[spId] || '').toLowerCase();
  entries = entries.filter(function(e) {
    return (e.species && e.species === spId) ||
           (spName && (e.note||'').toLowerCase().includes(spName));
  });
}
```

**Efort:** 1h | **Impact:** Mare (cu 200+ interventii filtrul e esential)

---

## P3-6. Keyboard shortcuts

**Status:** ⬜ TODO
**Fisier:** `public/index.html`

```javascript
document.addEventListener('keydown', function(e) {
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if (document.querySelector('.modal-overlay.open')) return;
  var key = e.key.toLowerCase();
  var map = { 'j': 'jurnal', 'c': 'calendar', 'm': 'meteo', 'k': 'calculator' };
  if (map[key]) { e.preventDefault(); openModal(map[key]); return; }
  if (key === '/') { e.preventDefault(); if (btnSearch) btnSearch.click(); return; }
  if (key === '?') showToast('Taste: J=Jurnal C=Calendar M=Meteo K=Calculator /=Cautare');
});
```

**Efort:** 30 min | **Impact:** Mic (util pe desktop/tableta cu tastatura)

---

## P3-7. localStorage Quota Monitor

**Status:** ⬜ TODO
**Fisier:** `public/index.html`

```javascript
function checkStorageUsage(warn) {
  var total = 0;
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    total += key.length + (localStorage.getItem(key)||'').length;
  }
  var mb = (total * 2) / (1024 * 1024);
  if (warn && mb > 3.5) {
    showToast('Stocare locala ' + mb.toFixed(1) + '/5 MB. Fa backup si sterge jurnalul vechi!');
  }
  return mb;
}
// Apeleaza: checkStorageUsage(true) dupa initNewFeatures() si dupa addJurnalEntry()
```

**Efort:** 30 min | **Impact:** Mediu — previne pierdere silentioasa de date

---

---

# FAZA 7 — Strategic / Viitor

> **Planificate pentru faze ulterioare. Nu blocheaza nimic din fazele 1-6.**

---

## T1/S12. Offline Queue + Background Sync API

**Status:** 🔵 VIITOR
**De ce:** Daca utilizatorul sterge o interventie offline → entry re-apare dupa sync. Background Sync API rezolva sincronizarea automata la reconectare.
**Complexitate:** Medie | **ROI:** 7/10 — util daca offline editing devine frecvent

---

## T2/S14. Rate limiting Redis-backed

**Status:** 🔵 VIITOR
**De ce:** Rate limiter curent e in-memory Map — se reseteaza la cold start Vercel. La 1-3 utilizatori riscul de abuz e minim.
**Complexitate:** Medie | **ROI:** 4/10 — nu justifica efortul la scala actuala

---

## T5/S15. Teste unitare vitest

**Status:** 🔵 VIITOR
**De ce:** Zero teste = risc la refactorizari. Util la urmatoarea extindere majora.
**Complexitate:** Mare | **ROI:** 6/10 pe termen lung

---

---

*Actualizat: 2026-04-05 | Urmatoarea revizie: dupa Faza 1-3 completate*
