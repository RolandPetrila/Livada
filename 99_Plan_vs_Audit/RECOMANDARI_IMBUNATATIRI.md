# RECOMANDARI IMBUNATATIRI v4 — Livada Mea Dashboard

**Data:** 2026-04-04
**Versiune:** v4 (post-Sesiuni 1-11 + Audit Standard 12 domenii)
**HTML:** 7358 linii | **API:** 9 routes | **Specii:** 17/17 complete
**Scor audit:** 52/100
**Comparatie vs v3:** +25 remedieri audit, prioritati recalculate

---

## STATUS RECOMANDARI v2 (snapshot 2026-03-28)

| # | Recomandare v2 | Status |
|---|---|---|
| P0-1 | DOMPurify timing fix | ✅ IMPLEMENTAT S9 |
| P0-2 | escapeHtml dublu fix | ✅ IMPLEMENTAT S9 |
| P0-3 | CSP header complet | ✅ IMPLEMENTAT S9 |
| P1-1 | Prognoza 5 zile cu spray score | ✅ IMPLEMENTAT S9 (3 zile pe dashboard) |
| P1-2 | Dashboard spray score + next treatment | ✅ IMPLEMENTAT S9 |
| P1-3 | Offline indicator | ✅ IMPLEMENTAT S9 |
| P1-4 | ARIA + focus management | ✅ IMPLEMENTAT S9 |
| P2-1 | Cautare highlight in text | ✅ IMPLEMENTAT S10 |
| P2-2 | Jurnal editare inline | ✅ IMPLEMENTAT S10 |
| P2-3 | Calendar jurnal overlay | ✅ IMPLEMENTAT S10 |
| P2-4 | Calculator total pomi | ✅ IMPLEMENTAT (exista deja) |
| P2-5 | Recolta sumar vizual | ✅ IMPLEMENTAT S10 |
| P2-6 | Auto-backup reminder | ✅ IMPLEMENTAT S10 |
| P2-7 | Print curatare HTML | ✅ IMPLEMENTAT S10 |
| — | Audit standard 12 domenii + 20 fix-uri | ✅ IMPLEMENTAT S11 |

**Neimplementate din v2 (deprioritizate sau depasit context):** 8 din 31

---

## PARTEA 0 — REMEDIERI AUDIT (Securitate + Corectitudine + Performanta)

> Descoperite prin audit standard 12 domenii, 2026-04-04.
> Aceste remedieri au prioritate fata de features noi — sunt buguri, vulnerabilitati si probleme de corectitudine.

### A0-1. [CRITICA] Auth bypass cand LIVADA_API_TOKEN lipseste

**Fisier:** `api/_auth.js:31-32`
**Problema:** `checkAuth()` returneaza `null` (skip auth complet) daca `LIVADA_API_TOKEN` nu e setat in environment. TOATE endpoint-urile autentificate devin publice.

**Fix:**
```javascript
// _auth.js linia 31 — inlocuieste:
if (!token) return null;
// cu:
if (!token) return Response.json({error:'Server misconfigured — token lipsa'}, {status:403, headers:corsHeaders(req)});
```

**Complexitate:** Mica (1 linie) | **Impact:** CRITIC — securitate totala

---

### A0-2. [CRITICA] Zero teste in tot proiectul

**Problema:** Niciun fisier de test. 9 API routes + 30+ functii JS fara nicio validare automata. Functii critice netestata: `checkAuth()`, `calculateSprayScore()`, `syncJournal()`, `escapeHtml()`.

**Fix:** Creare fisier de teste cu vitest:
```bash
npm install -D vitest
```

```javascript
// tests/auth.test.js
import { describe, it, expect } from 'vitest';
// Extrage functiile pure din _auth.js pentru testare

// tests/sprayScore.test.js  
// Extrage calculateSprayScore() intr-un modul testabil
```

**Prioritate testare:**
1. `_auth.js` — checkAuth, rateLimit, corsHeaders
2. `calculateSprayScore()` — formula agronomica critica
3. `escapeHtml()`, `sanitizeAI()` — securitate
4. `syncJournal()` — merge bidirectional

**Complexitate:** Medie | **Impact:** CRITIC — calitate si incredere in cod

---

### A0-3. [HIGH] meteo-cron.js fara autentificare

**Fisier:** `api/meteo-cron.js:19`
**Problema:** Endpoint complet deschis. Oricine poate triggera cron-ul si scrie in Redis — flood, date false, suprascrie frost-alert si disease-risk.

**Fix:**
```javascript
// La inceputul handler-ului, dupa import:
const cronSecret = req.headers.get('authorization');
if (cronSecret !== 'Bearer ' + process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Nota:** Vercel trimite automat `CRON_SECRET` la cron jobs. Trebuie setat in Vercel Dashboard.

**Complexitate:** Mica (3 linii) | **Impact:** HIGH — previne abuz Redis

---

### A0-4. [HIGH] frost-alert.js + meteo-history.js fara rate limit

**Fisiere:** `api/frost-alert.js:4`, `api/meteo-history.js:4`
**Problema:** Endpoint-uri GET publice fara nicio protectie. Pot fi flood-uite cu request-uri la Redis.

**Fix:**
```javascript
// In ambele fisiere, adauga la inceput:
import { rateLimit } from './_auth.js';

// In handler, inainte de logica:
const rlRes = rateLimit(req);
if (rlRes) return rlRes;
```

**Complexitate:** Mica (2 linii per fisier) | **Impact:** HIGH — previne flood Redis

---

### A0-5. [HIGH] DOMPurify nu e incarcat efectiv

**Fisier:** `public/index.html`
**Problema:** CSP permite cdn.jsdelivr.net, `sanitizeAI()` verifica `typeof DOMPurify`, dar tag-ul `<script>` pentru DOMPurify fie lipseste fie nu are `defer`. Mereu se executa fallback-ul mai putin sigur (regex pe HTML escaped).

**Fix:**
```html
<!-- In <head>, dupa link-urile Google Fonts: -->
<script defer src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>
```

**Complexitate:** Mica (1 linie) | **Impact:** HIGH — sanitizare AI robusta

---

### A0-6. [HIGH] photos.js — DELETE fara validare URL + extensie nesanitizata

**Fisier:** `api/photos.js:62,78`
**Problema 1:** DELETE accepta orice URL pentru stergere, fara validare ca apartine blob-ului propriu.
**Problema 2:** Extensia fisierului vine de la client fara validare.

**Fix:**
```javascript
// photos.js — validare DELETE URL (linia ~78):
if (!url || !url.includes('.public.blob.vercel-storage.com/livada/photos/')) {
  return Response.json({error:'URL invalid'}, {status:400, headers:hdrs});
}

// photos.js — validare extensie (linia ~62):
const allowedExt = ['jpg','jpeg','png','webp','heic'];
let ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
if (!allowedExt.includes(ext)) ext = 'jpg';
```

**Complexitate:** Mica (6 linii) | **Impact:** HIGH — previne stergere/upload arbitrar

---

### A0-7. [HIGH] photos.js GET fara rate limit

**Fisier:** `api/photos.js:11`
**Problema:** GET listeaza toate URL-urile blob publice fara niciun rate limit.

**Fix:**
```javascript
// La inceputul GET handler-ului:
const rlRes = rateLimit(req);
if (rlRes) return rlRes;
```

**Complexitate:** Mica (2 linii) | **Impact:** HIGH — previne enumerare blob-uri

---

### A0-8. [HIGH] syncJournal() race condition

**Fisier:** `public/index.html:6838`
**Problema:** Doua sync-uri pot rula in paralel (adaugari rapide). Ambele fac POST cu aceleasi date, apoi GET si merge. Rezultat: pierdere date.

**Fix:**
```javascript
var _isSyncing = false;
var _pendingSync = false;

async function syncJournal(retryCount) {
  if (_isSyncing) { _pendingSync = true; return; }
  _isSyncing = true;
  retryCount = retryCount || 0;
  // ... logica existenta sync ...
  // La final (in finally block):
  _isSyncing = false;
  if (_pendingSync) { _pendingSync = false; syncJournal(); }
}
```

**Complexitate:** Mica (6 linii wrapper) | **Impact:** HIGH — previne pierdere date jurnal

---

### A0-9. [HIGH] journal.js DELETE fara validare body

**Fisier:** `api/journal.js:48`
**Problema:** DELETE parseaza `req.json()` fara try/catch. Body invalid = eroare necontrolata 500.

**Fix:**
```javascript
// In DELETE handler:
let body;
try { body = await req.json(); } 
catch { return Response.json({error:'Body invalid'}, {status:400, headers:hdrs}); }
const id = Number(body.id);
if (!Number.isFinite(id)) return Response.json({error:'ID invalid'}, {status:400, headers:hdrs});
```

**Complexitate:** Mica (4 linii) | **Impact:** HIGH — previne crash la input invalid

---

### A0-10. [MEDIUM] Timezone bug — toISOString().split('T')[0]

**Fisiere:** `public/index.html:6348`, `public/index.html:7265`
**Problema:** `new Date().toISOString()` genereaza data in UTC. La ora 23:00 Romania (UTC+2/+3), returneaza data de MAINE. Afecteaza: data default jurnal, startStropire().

**Fix:**
```javascript
function todayLocal() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
// Inlocuieste TOATE aparitiile:
//   new Date().toISOString().split('T')[0]
// cu:
//   todayLocal()
```

**Complexitate:** Mica | **Impact:** MEDIUM — data gresita seara afecteaza jurnal si tratamente

---

### A0-11. [MEDIUM] Rate limit IP spoofabil

**Fisier:** `api/_auth.js:57`
**Problema:** IP extras din `x-forwarded-for` split(',')[0] — prima valoare e controlata de client.

**Fix:**
```javascript
// Inlocuieste:
const ip = getHeader(req, 'x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
// cu:
const ip = getHeader(req, 'x-real-ip') || getHeader(req, 'x-forwarded-for')?.split(',').pop()?.trim() || 'unknown';
```

**Complexitate:** Mica (1 linie) | **Impact:** MEDIUM — rate limit mai greu de ocolit

---

### A0-12. [MEDIUM] HSTS header lipsa

**Fisier:** `vercel.json`
**Problema:** Fara Strict-Transport-Security, prima vizita poate fi interceptata pe HTTP.

**Fix:**
```json
{ "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
```

**Complexitate:** Mica (1 linie in vercel.json) | **Impact:** MEDIUM — securitate transport

---

### A0-13. [MEDIUM] Erori API expun detalii interne

**Fisier:** `api/meteo-cron.js:112` (si alte rute)
**Problema:** `return Response.json({ error: err.message })` poate expune path-uri, URL-uri Redis, stack traces.

**Fix:**
```javascript
// Inlocuieste in catch-uri:
return Response.json({ error: err.message }, ...);
// cu:
console.error('Handler error:', err);
return Response.json({ error: 'Eroare interna server' }, { status: 500 });
```

**Complexitate:** Mica | **Impact:** MEDIUM — nu expune informatii interne

---

### A0-14. [MEDIUM] restoreData() suprascrie orice cheie livada-*

**Fisier:** `public/index.html:7208`
**Problema:** Un backup JSON malitios poate seta `livada-api-token` la o valoare controlata de atacator. Nu exista whitelist de chei permise.

**Fix:**
```javascript
var RESTORE_SAFE_KEYS = ['livada-jurnal','livada-theme','livada-last-backup','livada-costs','livada-checklist'];
// In restoreData(), filtreaza:
keys = keys.filter(function(k) { return RESTORE_SAFE_KEYS.includes(k); });
```

**Complexitate:** Mica | **Impact:** MEDIUM — previne overwrite token prin restore

---

### A0-15. [MEDIUM] Token API acceptat fara validare

**Fisier:** `public/index.html:6927`
**Problema:** `showTokenSetup()` accepta orice valoare, inclusiv string gol sau spatii.

**Fix:**
```javascript
if (!val || val.trim().length < 16) {
  alert('Token invalid — minim 16 caractere.');
  return;
}
```

**Complexitate:** Mica | **Impact:** MEDIUM — previne token-uri invalide

---

### A0-16. [MEDIUM] Spray score prognoza — umiditate hardcoded 60%

**Fisier:** `public/index.html:7157`
**Problema:** `calculateSprayScore((tMax+tMin)/2, wMax, prec, 60)` — Open-Meteo nu returneaza umiditate zilnica, se foloseste placeholder 60% care poate da scoruri incorecte.

**Fix:**
```javascript
// In query-ul Open-Meteo daily, adauga:
daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean'
// Apoi inlocuieste 60 cu:
calculateSprayScore((tMax+tMin)/2, wMax, prec, humidityMean)
```

**Complexitate:** Mica | **Impact:** MEDIUM — spray score prognoza corect

---

### A0-17. [MEDIUM] printFisa() fara check popup blocker

**Fisier:** `public/index.html:7279`
**Problema:** `window.open()` returneaza null daca popup e blocat → `win.document.write` arunca eroare.

**Fix:**
```javascript
var win = window.open('', '_blank');
if (!win) { showToast('Deblocheaza popup-urile pentru print.'); return; }
```

**Complexitate:** Mica (2 linii) | **Impact:** MEDIUM — previne eroare pe mobile

---

### A0-18. [MEDIUM] submitAsk() innerText forteaza reflow

**Fisier:** `public/index.html:6813`
**Problema:** `.innerText` forteaza recalculare layout pe tot subtree-ul tab-ului activ. Lent pe mobile cu tab-uri mari.

**Fix:**
```javascript
// Inlocuieste:
tc.innerText.substring(0, 3000)
// cu:
tc.textContent.substring(0, 3000)
```

**Complexitate:** Mica (1 cuvant) | **Impact:** MEDIUM — performanta pe mobile

---

### A0-19. [MEDIUM] Google Fonts render-blocking

**Fisier:** `public/index.html:16-17`
**Problema:** Preload redundant (linia 16) + stylesheet (linia 17) blocheaza first paint. Preload-ul incarca weights diferite de stylesheet.

**Fix:**
```html
<!-- Sterge linia 16 (preload redundant) -->
<!-- Modifica linia 17: -->
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@400;600;700&display=swap"
  rel="stylesheet" media="print" onload="this.media='all'">
<noscript><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet"></noscript>
```

**Complexitate:** Mica | **Impact:** MEDIUM — first paint mai rapid

---

### A0-20. [MEDIUM] doSearch() textContent heavy la fiecare keystroke

**Fisier:** `public/index.html:6121`
**Problema:** Itereaza prin TOATE tab-urile si apeleaza `.textContent` pe fiecare (7000+ linii DOM) la fiecare keystroke (debounced 300ms dar tot scump).

**Fix:**
```javascript
// Pre-calculeaza textContent per tab la init (o singura data):
var _tabSearchCache = {};
function buildSearchCache() {
  $$('.tab-content').forEach(function(tc) {
    _tabSearchCache[tc.id] = tc.textContent.toLowerCase();
  });
}
// Apeleaza buildSearchCache() la DOMContentLoaded
// In doSearch(), cauta in _tabSearchCache in loc de .textContent live
```

**Complexitate:** Mica | **Impact:** MEDIUM — search mai rapid pe mobile

---

### A0-21. [MEDIUM] SW cache version hardcoded

**Fisier:** `public/sw.js:1`
**Problema:** `livada-v3` fara legatura cu deploy. Utilizatori raman pe cache vechi.

**Fix:**
```javascript
// In sw.js, genereaza versiune din data build-ului:
const CACHE_NAME = 'livada-v4-20260404';
```

**Nota:** Trebuie actualizat manual la fiecare deploy semnificativ, sau automatizat cu un script pre-deploy.

**Complexitate:** Mica | **Impact:** MEDIUM — utilizatori primesc updates

---

### A0-22. [MEDIUM] setInterval in _auth.js — dead code serverless

**Fisier:** `api/_auth.js:49-54`
**Problema:** `setInterval` pentru cleanup rateLimitMap nu ruleaza real in Vercel Serverless (instanta moare). Cod inselator.

**Fix:**
```javascript
// Sterge setInterval-ul complet
// In rateLimit(), adauga cleanup lazy:
function rateLimit(req) {
  const now = Date.now();
  // Cleanup lazy: sterge entries expirate
  for (const [key, val] of rateLimitMap) {
    if (now - val.start > 60000) rateLimitMap.delete(key);
  }
  // ... restul logicii
}
```

**Complexitate:** Mica | **Impact:** MEDIUM — cod curat, fara dead code

---

### A0-23. [MEDIUM] Documentatie CLAUDE.md incompleta

**Fisier:** `CLAUDE.md`
**Problema:** Nu listeza env variables necesare si dependente externe.

**Fix:** Adauga sectiuni:
```markdown
## Variabile de mediu (Vercel Dashboard)
- LIVADA_API_TOKEN — autentificare API
- GROQ_API_KEY — AI ask + raport
- GOOGLE_AI_API_KEY — AI diagnostic foto
- UPSTASH_REDIS_REST_URL — Redis cache meteo + jurnal
- UPSTASH_REDIS_REST_TOKEN — Redis auth
- BLOB_READ_WRITE_TOKEN — Vercel Blob galerie foto
- CRON_SECRET — autentificare cron job

## Dependente externe
- Groq API (llama-3.3-70b) — raspunsuri AI intrebari + rapoarte
- Google Gemini (2.5-flash) — diagnostic foto
- Open-Meteo — date meteo gratuite
- Upstash Redis — persistenta jurnal + meteo cache
- Vercel Blob — stocare fotografii galerie
- DOMPurify CDN — sanitizare HTML raspunsuri AI
```

**Complexitate:** Mica | **Impact:** MEDIUM — onboarding rapid

---

### A0-24. [LOW] CORS localhost permanent in productie

**Fisier:** `api/_auth.js:4-5`
**Problema:** `http://localhost:3000` si `5173` in ALLOWED_ORIGINS permanent, inclusiv productie.

**Fix:** `if (process.env.NODE_ENV !== 'production') ALLOWED_ORIGINS.push('http://localhost:3000', ...);`

---

### A0-25. [LOW] CSP lipsa frame-ancestors

**Fisier:** `vercel.json:28`
**Fix:** Adauga in CSP: `frame-ancestors 'none';`

---

---

## PARTEA I — IMBUNATATIRI FUNCTII EXISTENTE

### 1. `highlightInActiveTab()` — Highlight TOATE aparitiile, nu doar prima per nod

**Fisier:** `public/index.html` — linia ~6092
**Problema actuala:** Functia gaseste prima aparitie per text node si se opreste. Daca cuvantul "rapan" apare de 3 ori intr-un paragraf, doar prima e evidentiata. Utilizatorul crede ca sunt putine rezultate.

**Imbunatatire propusa:**
- Iterare pe TOATE aparitiile din fiecare text node
- Counter vizibil cu numarul total de match-uri
- Navigare prev/next intre rezultate cu butoane

**Exemplu implementare:**
```javascript
function highlightInActiveTab(query) {
  clearSearchHighlights();
  if (!query || query.length < 2) return 0;
  var active = document.querySelector('.tab-content.active');
  if (!active) return 0;
  var walker = document.createTreeWalker(active, NodeFilter.SHOW_TEXT);
  var toReplace = [];
  var lowerQ = query.toLowerCase();
  while (walker.nextNode()) {
    var node = walker.currentNode;
    var text = node.textContent.toLowerCase();
    var idx = 0;
    while ((idx = text.indexOf(lowerQ, idx)) >= 0) {
      toReplace.push({ node: node, index: idx, length: query.length });
      idx += query.length;
    }
  }
  // Reverse order to avoid offset shifts
  toReplace.sort(function(a, b) {
    if (a.node === b.node) return b.index - a.index;
    return 0;
  });
  toReplace.reverse().forEach(function(item) {
    var mark = document.createElement('mark');
    mark.className = 'search-hl';
    var range = document.createRange();
    range.setStart(item.node, item.index);
    range.setEnd(item.node, item.index + item.length);
    range.surroundContents(mark);
  });
  var allMarks = active.querySelectorAll('mark.search-hl');
  if (allMarks.length > 0) allMarks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  return allMarks.length;
}
```

Si in `doSearch()`, afiseaza counter total:
```javascript
var inTab = highlightInActiveTab(q);
searchCount.textContent = totalMatches > 0
  ? totalMatches + ' tab' + (totalMatches > 1 ? 'uri' : '') + (inTab > 0 ? ' (' + inTab + ' in tab activ)' : '')
  : 'Nimic gasit';
```

**Complexitate:** Mica | **Impact:** Mediu — cautare mult mai utila in taburile cu documentatie lunga

---

### 2. `calculateSprayScore()` — Adauga ora zilei si punct de roua

**Fisier:** `public/index.html` — linia ~7064
**Problema actuala:** Scorul ignora ora zilei (dimineata devreme = risc de roua, seara tarziu = evaporare slaba) si punctul de roua. Scorul poate zice "Excelent" la 6 dimineata cand roua e inca pe frunze.

**Imbunatatire propusa:**
- Factor ora: penalizare dimineata (6-9) si seara (dupa 18)
- Factor dew point: calculat din temp + umiditate
- Fereastra optima vizuala: "Cel mai bun moment: 10:00-16:00"

**Exemplu implementare:**
```javascript
function calculateSprayScore(temp, wind, rain, humidity, hour) {
  if (temp < 5 || temp > 30 || wind > 15 || rain > 2) return 0;
  var score = 100;
  if (temp < 10) score -= (10 - temp) * 8;
  if (temp > 25) score -= (temp - 25) * 8;
  if (wind > 10) score -= (wind - 10) * 10;
  if (rain > 0) score -= rain * 20;
  if (humidity > 80) score -= (humidity - 80) * 2;
  // Dew point: Magnus formula approximation
  var dewPoint = temp - ((100 - humidity) / 5);
  if (temp - dewPoint < 3) score -= 15;
  // Hour factor (optional)
  if (typeof hour === 'number') {
    if (hour < 7) score -= 20;
    else if (hour < 9) score -= 10;
    else if (hour > 18) score -= 15;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
```

**Complexitate:** Mica | **Impact:** Mare — scor mai precis = decizii mai bune pe teren

---

### 3. `renderCalendar()` — Buton "Azi" si navigare rapida

**Fisier:** `public/index.html` — linia ~6377
**Problema actuala:** Singura navigare e ← → luna cu luna. Daca utilizatorul e in ianuarie 2025 si vrea sa ajunga la aprilie 2026, trebuie sa apese 15 butoane. Nu exista buton "inapoi la azi".

**Imbunatatire propusa:**
- Buton "Azi" central care reseteaza la luna curenta
- Vizibil intre sagetile de navigare

**Exemplu implementare:**
```html
<div style="text-align:center;margin-bottom:8px;">
  <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.72rem;"
    onclick="calMonth=new Date().getMonth();calYear=new Date().getFullYear();renderCalendar();enhanceCalendarWithMeteo();">
    Azi
  </button>
</div>
```

**Complexitate:** Mica | **Impact:** Mediu — navigare mai fluida

---

### 4. `syncJournal()` — Retry automat cu backoff

**Fisier:** `public/index.html` — linia ~6838
**Problema actuala:** Daca sync-ul esueaza, status-ul ramane "Eroare sync" fara retry. Utilizatorul trebuie sa inchida si redeschida jurnalul manual.

**Nota:** Aceasta recomandare se combina cu A0-8 (race condition) — implementeaza ambele simultan.

**Imbunatatire propusa:**
- Retry automat: 2s → 5s → 15s (max 3 incercari)
- Badge mai detaliat: "Retry 2/3..."
- Buton manual "Resincronizeaza" vizibil la eroare

**Exemplu implementare:**
```javascript
var SYNC_MAX_RETRIES = 3;
var SYNC_BACKOFF = [2000, 5000, 15000];
var _isSyncing = false;
var _pendingSync = false;

async function syncJournal(retryCount) {
  if (_isSyncing) { _pendingSync = true; return; }
  _isSyncing = true;
  retryCount = retryCount || 0;
  if (!navigator.onLine) { _isSyncing = false; return; }
  try {
    jSyncStatus = 'syncing'; updateSyncBadge();
    var local = getJurnalEntries();
    var res = await authFetch('/api/journal', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(local) });
    if (!res.ok) throw new Error('sync fail ' + res.status);
    var pullRes = await authFetch('/api/journal');
    if (pullRes.ok) {
      var remote = await pullRes.json();
      if (Array.isArray(remote) && remote.length > 0) {
        var map = new Map();
        local.forEach(function(e) { map.set(e.id, e); });
        remote.forEach(function(e) { map.set(e.id, e); });
        var merged = Array.from(map.values()).sort(function(a,b) { return b.id - a.id; });
        saveJurnalEntries(merged);
        if (document.getElementById('modal-jurnal').classList.contains('open')) renderJurnal();
      }
    }
    jSyncStatus = 'synced'; updateSyncBadge();
  } catch(e) {
    if (retryCount < SYNC_MAX_RETRIES) {
      jSyncStatus = 'retrying'; updateSyncBadge('Retry ' + (retryCount+1) + '/' + SYNC_MAX_RETRIES);
      setTimeout(function() { syncJournal(retryCount + 1); }, SYNC_BACKOFF[retryCount]);
    } else {
      jSyncStatus = 'error'; updateSyncBadge();
    }
  } finally {
    _isSyncing = false;
    if (_pendingSync) { _pendingSync = false; setTimeout(function(){ syncJournal(); }, 500); }
  }
}
```

**Complexitate:** Mica | **Impact:** Mare — sincronizare mult mai robusta + fara race condition

---

### 5. `exportJurnalCSV()` — Include specie si kg la recoltare

**Fisier:** `public/index.html` — linia ~6328
**Problema actuala:** CSV-ul exporta doar 3 coloane: Data, Tip, Nota. Dar pentru recoltare exista si `species` si `kg` pe entry — date valoroase pierdute.

**Imbunatatire propusa:**
- Adauga coloanele Specie si Kg
- BOM UTF-8 pentru diacritice corecte in Excel

**Exemplu implementare:**
```javascript
function exportJurnalCSV() {
  var entries = getJurnalEntries();
  if (!entries.length) { alert('Jurnal gol.'); return; }
  var bom = '\uFEFF';
  var csv = bom + 'Data,Tip,Nota,Specie,Kg\n' + entries.map(function(e) {
    var sp = e.species ? (SPECIES[e.species] || e.species) : '';
    var kg = e.kg ? e.kg : '';
    return e.date + ',' + e.type + ',"' + (e.note||'').replace(/"/g,'""') + '",' + sp + ',' + kg;
  }).join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'jurnal-livada-' + todayLocal() + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
}
```

**Complexitate:** Mica | **Impact:** Mediu — date complete la export

---

### 6. `sanitizeAI()` — Parsare markdown completa (liste, heading-uri)

**Fisier:** `public/index.html` — linia ~6641
**Problema actuala:** Converteste doar `**bold**` si `\n` → `<br>`. AI-ul returneaza liste cu `-`, `1.`, heading-uri `###`, italic `*text*`. Utilizatorul vede text brut cu simboluri markdown.

**Imbunatatire propusa:**
- Parsare `-` si `*` ca liste `<ul>`
- Parsare `1.` ca liste `<ol>`
- Parsare `###` si `####` ca heading-uri
- Parsare `*text*` ca italic

**Exemplu implementare:**
```javascript
function sanitizeAI(text) {
  var md = text
    .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    .replace(/\n/g, '<br>');
  md = md.replace(/<br>(<h[34]>)/g, '$1').replace(/(<\/h[34]>)<br>/g, '$1');
  md = md.replace(/<br>(<ul>)/g, '$1').replace(/(<\/ul>)<br>/g, '$1');
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(md, {
      ALLOWED_TAGS: ['strong','em','br','p','ul','ol','li','h3','h4'],
      ALLOWED_ATTR: []
    });
  }
  return md;
}
```

**Complexitate:** Mica | **Impact:** Mare — raspunsuri AI formatate profesional

---

### 7. `editJurnalEntry()` — Editare completa (data, tip, nu doar nota)

**Fisier:** `public/index.html` — linia ~6303
**Problema actuala:** Editare inline permite doar modificarea notei. Daca utilizatorul a gresit data sau tipul, trebuie sa stearga si re-creeze entry-ul.

**Imbunatatire propusa:**
- Inline edit cu input date + select tip + textarea nota
- Buton "Salveaza" actualizeaza toate campurile

**Exemplu implementare:**
```javascript
function editJurnalEntry(id) {
  var entries = getJurnalEntries();
  var e = entries.find(function(x){return x.id===id;});
  if (!e) return;
  var entryEl = document.querySelector('.jurnal-entry[data-id="' + id + '"]');
  if (!entryEl) return;
  var textEl = entryEl.querySelector('.je-text');
  if (!textEl || textEl.dataset.editing) return;
  textEl.dataset.editing = 'true';
  var types = ['tratament','tundere','fertilizare','irigare','recoltare','observatie','altele'];
  var opts = types.map(function(t){
    return '<option value="'+t+'"'+(t===e.type?' selected':'')+'>'+t+'</option>';
  }).join('');
  entryEl.querySelector('.je-date').innerHTML =
    '<input type="date" class="je-edit-date" value="'+escapeHtml(e.date)+'" style="font-size:0.78rem;padding:2px 4px;background:var(--bg-surface);color:var(--text);border:1px solid var(--border);border-radius:4px;">';
  entryEl.querySelector('.je-type').innerHTML =
    '<select class="je-edit-type" style="font-size:0.72rem;padding:2px 4px;background:var(--bg-surface);color:var(--text);border:1px solid var(--border);border-radius:4px;">' + opts + '</select>';
  textEl.innerHTML = '<textarea class="je-edit-area" rows="3">' + escapeHtml(e.note) + '</textarea>' +
    '<div style="display:flex;gap:6px;margin-top:6px;">' +
    '<button class="btn btn-primary" style="padding:4px 12px;font-size:0.75rem;" onclick="saveJurnalEdit('+id+')">Salveaza</button>' +
    '<button class="btn btn-secondary" style="padding:4px 12px;font-size:0.75rem;" onclick="renderJurnal()">Anuleaza</button></div>';
  textEl.querySelector('textarea').focus();
}
function saveJurnalEdit(id) {
  var entryEl = document.querySelector('.jurnal-entry[data-id="' + id + '"]');
  var ta = entryEl.querySelector('.je-edit-area');
  var dateInput = entryEl.querySelector('.je-edit-date');
  var typeSelect = entryEl.querySelector('.je-edit-type');
  if (!ta || !ta.value.trim()) return;
  var entries = getJurnalEntries();
  var e = entries.find(function(x){return x.id===id;});
  if (e) {
    e.note = ta.value.trim();
    if (dateInput) e.date = dateInput.value;
    if (typeSelect) e.type = typeSelect.value;
    saveJurnalEntries(entries);
    syncJournal();
  }
  renderJurnal();
}
```

**Complexitate:** Medie | **Impact:** Mediu — elimina stergere + recreere la greseala

---

### 8. `renderJurnal()` — Cautare si filtru date in jurnal

**Fisier:** `public/index.html` — linia ~6262
**Problema actuala:** Exista filtru per tip, dar lipseste cautare text in note si filtru per interval de date. Cu 100+ interventii, gasirea unei intrari specifice e dificila.

**Imbunatatire propusa:**
- Input search care filtreaza in timp real dupa text din nota
- Date range picker (de la / pana la)
- Counter total filtrat vs total

**Exemplu implementare HTML (dupa filtrul existent):**
```html
<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
  <input type="text" id="jurnalSearch" placeholder="Cauta in note..."
    style="flex:1;min-width:120px;padding:6px 10px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.8rem;"
    oninput="jurnalPage=0;renderJurnal();">
  <input type="date" id="jurnalDateFrom" onchange="jurnalPage=0;renderJurnal();"
    style="padding:4px 6px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.75rem;">
  <input type="date" id="jurnalDateTo" onchange="jurnalPage=0;renderJurnal();"
    style="padding:4px 6px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.75rem;">
</div>
```

```javascript
// In renderJurnal(), dupa filtrarea per tip:
var searchVal = (document.getElementById('jurnalSearch')?.value || '').toLowerCase().trim();
var dateFrom = document.getElementById('jurnalDateFrom')?.value || '';
var dateTo = document.getElementById('jurnalDateTo')?.value || '';
if (searchVal) entries = entries.filter(function(e){ return (e.note||'').toLowerCase().includes(searchVal); });
if (dateFrom) entries = entries.filter(function(e){ return e.date >= dateFrom; });
if (dateTo) entries = entries.filter(function(e){ return e.date <= dateTo; });
```

**Complexitate:** Mica | **Impact:** Mare — gasire rapida in jurnal cu 100+ interventii

---

### 9. `loadGallery()` — Lightbox zoom pe imagini

**Fisier:** `public/index.html` — linia ~6712
**Problema actuala:** Pozele sunt in grid mic. Click pe poza nu face nimic (doar butonul X sterge). Nu exista zoom. Pe mobile, pozele mici sunt greu de analizat — esential pentru diagnostic.

**Imbunatatire propusa:**
- Click pe imagine → lightbox fullscreen
- Tap pe overlay inchide

**Exemplu implementare:**
```javascript
// In loadGallery(), modificare click handler:
grid.onclick = function(e) {
  var btn = e.target.closest('.gal-del');
  if (btn) { deletePhoto(btn.dataset.url); return; }
  var img = e.target.closest('img');
  if (img) openLightbox(img.src);
};

function openLightbox(src) {
  var overlay = document.getElementById('lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:400;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
    overlay.innerHTML = '<img id="lightbox-img" style="max-width:95vw;max-height:90vh;object-fit:contain;border-radius:8px;">';
    overlay.addEventListener('click', function() { overlay.style.display = 'none'; });
    document.body.appendChild(overlay);
  }
  overlay.querySelector('#lightbox-img').src = src;
  overlay.style.display = 'flex';
}
```

**Complexitate:** Mica | **Impact:** Mare — imagini vizibile clar pe mobil

---

### 10. `startStropire()` — Inlocuieste prompt() cu formular inline

**Fisier:** `public/index.html` — linia ~7261
**Problema actuala:** Foloseste `prompt()` nativ care pe mobil Android e urat, pierde contextul vizual, si nu permite input multiline.

**Imbunatatire propusa:**
- Textarea inline in checklist modal
- Pre-populare cu data curenta

**Exemplu implementare:**
```javascript
function startStropire() {
  var ckBody = document.querySelector('#modal-checklist .modal-body');
  var existing = document.getElementById('ck-note-area');
  if (existing) { existing.querySelector('textarea').focus(); return; }
  var div = document.createElement('div');
  div.id = 'ck-note-area';
  div.style.marginTop = '16px';
  div.innerHTML = '<label style="font-size:0.85rem;color:var(--text-dim);">Ce tratament aplici?</label>' +
    '<textarea id="ckNote" rows="3" placeholder="Produse, doze, specii..." style="width:100%;padding:10px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-family:inherit;margin-top:4px;"></textarea>' +
    '<div style="display:flex;gap:8px;margin-top:8px;">' +
    '<button class="btn btn-primary" style="flex:1;" onclick="confirmStropire()">Inregistreaza</button>' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'ck-note-area\').remove();">Anuleaza</button></div>';
  ckBody.appendChild(div);
  div.querySelector('textarea').focus();
}
function confirmStropire() {
  var note = document.getElementById('ckNote').value.trim();
  if (!note) { showToast('Completeaza ce tratament aplici.'); return; }
  var entries = getJurnalEntries();
  entries.unshift({id:Date.now(), date:todayLocal(), type:'tratament', note:note});
  saveJurnalEntries(entries);
  syncJournal();
  closeModal('checklist');
  showToast('Tratament inregistrat in jurnal!');
}
```

**Complexitate:** Mica | **Impact:** Mediu — UX nativ, fara prompt() pe mobil

---

### 11. `wmoEmoji()` — Default return si acoperire coduri lipsa

**Fisier:** `public/index.html` — linia ~6491
**Problema actuala:** Functia nu are `return` default. Pentru coduri WMO nemapate returneaza `undefined`, afisand spatiu gol sau "undefined" in UI.

**Fix:**
```javascript
function wmoEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '🌡️'; // fallback
}
```

**Complexitate:** Mica | **Impact:** Mic — previne "undefined" in UI

---

### 12. `generateReport()` — Selectie interval date

**Fisier:** `public/index.html` — linia ~6998
**Problema actuala:** Raportul trimite TOATE intrarile la Groq indiferent de an. La 200+ intrari, token-urile sunt risipite pe ani irelevanti.

**Fix:**
```javascript
async function generateReport() {
  var year = new Date().getFullYear();
  var allEntries = getJurnalEntries();
  var entries = allEntries.filter(function(e) { return e.date && e.date.startsWith(String(year)); });
  if (entries.length === 0) { showToast('Nicio interventie in ' + year + '.'); return; }
  if (!confirm('Generez raport ' + year + ' din ' + entries.length + ' interventii?\nDatele vor fi trimise la Groq AI.')) return;
  var localJournal = entries.map(function(e) { return e.date + ': [' + e.type + '] ' + e.note; }).join('\n');
  // ... restul cu localJournal filtrat
}
```

**Complexitate:** Mica | **Impact:** Mediu — rapoarte focusate, mai putine token-uri

---

### 13. `initDashboardAzi()` — Auto-refresh la visibility change

**Fisier:** `public/index.html` — linia ~7095
**Problema actuala:** Dashboard-ul se incarca o data si nu se mai actualizeaza. Daca app-ul e in background 2 ore, meteo-ul e vechi.

**Fix:**
```javascript
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    var activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.dataset.tab === 'azi') initDashboardAzi();
  }
});
```

**Complexitate:** Mica | **Impact:** Mediu — date mereu proaspete

---

### 14. `renderRecoltaSummary()` — Comparatie multi-an

**Fisier:** `public/index.html` — linia ~6446
**Problema actuala:** Tabelul arata doar anul curent. Nu exista mod de a compara recoltele intre ani.

**Fix:**
```javascript
function renderRecoltaSummary() {
  var el = document.getElementById('recoltaSummary');
  if (!el) return;
  var allEntries = getJurnalEntries().filter(function(e) { return e.type === 'recoltare' && e.kg > 0; });
  var years = [...new Set(allEntries.map(function(e){ return e.date ? e.date.substring(0,4) : null; }).filter(Boolean))].sort().reverse();
  if (years.length === 0) {
    el.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:16px;">Nicio recolta inregistrata.</p>';
    return;
  }
  var existingSel = document.getElementById('recoltaYearSel');
  var selYear = existingSel ? existingSel.value : years[0];
  // ... render cu selYear filter
}
```

**Complexitate:** Mica | **Impact:** Mediu — vizibilitate progres anual

---

### 15. `backupData()` — Monitorizare quota localStorage

**Fisier:** `public/index.html` — linia ~7175
**Problema actuala:** localStorage are limita 5MB. Nicio verificare — la overflow, JS arunca exceptie si datele nu se mai salveaza.

**Fix:**
```javascript
function checkStorageUsage() {
  var total = 0;
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    total += key.length + (localStorage.getItem(key) || '').length;
  }
  var mb = (total * 2) / (1024 * 1024);
  if (mb > 4) showToast('Stocare locala aproape plina (' + mb.toFixed(1) + '/5 MB). Fa backup!');
  return mb;
}
```

**Complexitate:** Mica | **Impact:** Mediu — previne pierdere date

---

## PARTEA II — FUNCTII NOI

### 1. Jurnal Quick-Add — Adaugare rapida din dashboard

**Descriere:** Buton "+" pe dashboard "Ce fac azi?" cu mini-formular inline (tip + nota). Perfect pentru inregistrari rapide pe teren fara modal complet.

**De ce e util:** Roland e in livada cu telefonul, tocmai a stropit. Vrea: click → scrie → gata. Reduce 4 tap-uri la 2.

**Complexitate:** Mica | **Impact:** Mare

**Exemplu implementare:**
```javascript
function quickAddJurnal() {
  var container = document.getElementById('quickAddArea');
  if (container.style.display === 'block') { container.style.display = 'none'; return; }
  container.style.display = 'block';
  container.innerHTML =
    '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:end;">' +
    '<select id="qaType" style="padding:8px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
    '<option value="tratament">Tratament</option><option value="tundere">Tundere</option>' +
    '<option value="fertilizare">Fertilizare</option><option value="irigare">Irigare</option>' +
    '<option value="recoltare">Recoltare</option><option value="observatie">Observatie</option></select>' +
    '<input id="qaNote" type="text" placeholder="Ce ai facut?" style="flex:1;min-width:150px;padding:8px 10px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.85rem;">' +
    '<button class="btn btn-primary" style="padding:8px 14px;" onclick="submitQuickAdd()">+</button></div>';
  container.querySelector('#qaNote').focus();
}
function submitQuickAdd() {
  var note = document.getElementById('qaNote').value.trim();
  if (!note) return;
  var type = document.getElementById('qaType').value;
  var entries = getJurnalEntries();
  entries.unshift({id:Date.now(), date:todayLocal(), type:type, note:note});
  saveJurnalEntries(entries);
  syncJournal();
  document.getElementById('quickAddArea').style.display = 'none';
  showToast('Adaugat in jurnal!');
}
```

---

### 2. Statistici Interventii — Grafice per tip si luna

**Descriere:** Sectiune in tab "Plan Livada" cu grafice (bare CSS, fara librarie): interventii per tip, per luna, distributia anuala. Zero dependinte.

**De ce e util:** "Am stropit suficient?", "In ce luna am fost cel mai activ?" — intrebari reale la care jurnalul simplu nu raspunde.

**Complexitate:** Medie | **Impact:** Mare

**Exemplu implementare:**
```javascript
function renderStats() {
  var entries = getJurnalEntries();
  var year = new Date().getFullYear();
  var yearEntries = entries.filter(function(e){ return e.date && e.date.startsWith(String(year)); });
  var byType = {};
  yearEntries.forEach(function(e){ byType[e.type] = (byType[e.type]||0) + 1; });
  var maxType = Math.max.apply(null, Object.values(byType).concat([1]));
  var typeHTML = Object.entries(byType).sort(function(a,b){return b[1]-a[1];}).map(function(p) {
    var pct = Math.round(p[1] / maxType * 100);
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
      '<span style="min-width:80px;font-size:0.78rem;color:var(--text-dim);">' + p[0] + '</span>' +
      '<div style="flex:1;height:18px;background:var(--bg-surface);border-radius:4px;overflow:hidden;">' +
      '<div style="width:'+pct+'%;height:100%;background:var(--accent);border-radius:4px;"></div></div>' +
      '<span style="font-size:0.78rem;font-weight:700;min-width:24px;text-align:right;">' + p[1] + '</span></div>';
  }).join('');
  var byMonth = {};
  yearEntries.forEach(function(e){
    var m = parseInt(e.date.split('-')[1]);
    byMonth[m] = (byMonth[m]||0) + 1;
  });
  var monthNames = ['','Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec'];
  var maxMonth = Math.max.apply(null, Object.values(byMonth).concat([1]));
  var monthHTML = '';
  for (var m = 1; m <= 12; m++) {
    var count = byMonth[m] || 0;
    var pct = Math.round(count / maxMonth * 100);
    monthHTML += '<div style="text-align:center;"><div style="height:60px;display:flex;align-items:flex-end;justify-content:center;">' +
      '<div style="width:20px;height:'+pct+'%;background:var(--accent);border-radius:3px 3px 0 0;min-height:'+(count>0?'4':'0')+'px;"></div></div>' +
      '<div style="font-size:0.6rem;color:var(--text-dim);margin-top:2px;">'+monthNames[m]+'</div>' +
      (count>0?'<div style="font-size:0.6rem;font-weight:700;">'+count+'</div>':'') + '</div>';
  }
  return '<h3 style="margin-bottom:8px;">Per tip</h3>' + typeHTML +
    '<h3 style="margin:14px 0 8px;">Per luna</h3><div style="display:grid;grid-template-columns:repeat(12,1fr);gap:2px;">' + monthHTML + '</div>' +
    '<p style="font-size:0.72rem;color:var(--text-dim);margin-top:8px;">Total ' + year + ': ' + yearEntries.length + ' interventii</p>';
}
```

---

### 3. Cost Tracker — Calcul cost produse per sezon

**Descriere:** Sectiune unde utilizatorul inregistreaza costul produselor cumparate si vede total per sezon.

**De ce e util:** "Am dat 500 lei pe fungicide, merita?" — intrebare reala la care datele actuale nu raspund.

**Complexitate:** Medie | **Impact:** Mare

**Exemplu implementare:**
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
  entries.unshift({ id: Date.now(), date: todayLocal(),
    product: product, quantity: qty, pricePerUnit: price, total: qty * price });
  localStorage.setItem('livada-costs', JSON.stringify(entries));
  renderCosts();
  showToast('Cost inregistrat!');
}
```

---

### 4. Dark Mode Auto — Respecta prefers-color-scheme

**Descriere:** Optiune "Auto" pentru tema care detecteaza preferinta sistemului (dark/light). Cycle: dark → light → auto → dark.

**De ce e util:** Telefonul pe dark mode noaptea si light mode ziua — app-ul se adapteaza singur.

**Complexitate:** Mica | **Impact:** Mediu

**Exemplu implementare:**
```javascript
function setTheme(mode) {
  localStorage.setItem('livada-theme', mode);
  var isLight;
  if (mode === 'auto') {
    isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    btnTheme.textContent = '\u2699';
  } else {
    isLight = mode === 'light';
    btnTheme.textContent = isLight ? '\u2600' : '\u263E';
  }
  document.body.classList.toggle('light-mode', isLight);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = isLight ? '#f4f7f4' : '#1a2e1a';
}
btnTheme.addEventListener('click', function() {
  var current = localStorage.getItem('livada-theme') || 'dark';
  var next = current === 'dark' ? 'light' : current === 'light' ? 'auto' : 'dark';
  setTheme(next);
});
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function() {
  if (localStorage.getItem('livada-theme') === 'auto') setTheme('auto');
});
```

---

### 5. Service Worker Update Notification

**Descriere:** Toast cand service worker-ul se actualizeaza: "Versiune noua disponibila. Apasa pentru actualizare." Previne utilizarea cache-ului vechi dupa deploy.

**De ce e util:** Dupa `git push`, Roland poate folosi ore intregi versiunea veche din cache.

**Complexitate:** Mica | **Impact:** Mediu

**Exemplu implementare:**
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    reg.addEventListener('updatefound', function() {
      var newWorker = reg.installing;
      newWorker.addEventListener('statechange', function() {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          var t = document.createElement('div');
          t.className = 'toast';
          t.style.cursor = 'pointer';
          t.innerHTML = '🔄 Versiune noua! <u>Actualizeaza</u>';
          t.addEventListener('click', function() { location.reload(); });
          document.body.appendChild(t);
        }
      });
    });
  });
}
```

---

### 6. Import Jurnal din CSV

**Descriere:** Buton "Import CSV" in modal jurnal care parseaza un CSV (Data, Tip, Nota) si adauga intrarile.

**De ce e util:** Daca Roland a tinut un jurnal in Excel inainte de app, importa totul cu un click.

**Complexitate:** Mica | **Impact:** Mediu

**Exemplu implementare:**
```javascript
function importJurnalCSV(input) {
  var file = input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var lines = e.target.result.split('\n').filter(function(l){ return l.trim(); });
    if (lines.length < 2) { showToast('CSV gol.'); return; }
    var imported = 0;
    var entries = getJurnalEntries();
    for (var i = 1; i < lines.length; i++) {
      var parts = lines[i].match(/(".*?"|[^,]+)/g);
      if (!parts || parts.length < 3) continue;
      var date = parts[0].replace(/"/g,'').trim();
      var type = parts[1].replace(/"/g,'').trim().toLowerCase();
      var note = parts[2].replace(/"/g,'').trim();
      if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !note) continue;
      entries.push({ id: Date.now() + i, date: date, type: type, note: note });
      imported++;
    }
    if (imported > 0) {
      entries.sort(function(a,b){ return b.id - a.id; });
      saveJurnalEntries(entries);
      renderJurnal();
      syncJournal();
      showToast(imported + ' interventii importate!');
    } else { showToast('Nicio intrare valida.'); }
  };
  reader.readAsText(file);
  input.value = '';
}
```

---

### 7. Keyboard Shortcuts — Navigare cu taste

**Descriere:** Scurtaturi: `J`=Jurnal, `C`=Calendar, `M`=Meteo, `K`=Calculator, `/`=Cautare, `?`=Help.

**De ce e util:** Pe desktop/tablet cu tastatura, navigare rapida.

**Complexitate:** Mica | **Impact:** Mic (niche, power users)

**Exemplu implementare:**
```javascript
document.addEventListener('keydown', function(e) {
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if (document.querySelector('.modal-overlay.open')) return;
  switch(e.key.toLowerCase()) {
    case 'j': openModal('jurnal'); break;
    case 'c': openModal('calendar'); break;
    case 'm': openModal('meteo'); break;
    case 'k': openModal('calculator'); break;
    case '/': e.preventDefault(); btnSearch.click(); break;
    case '?': showToast('J=Jurnal C=Calendar M=Meteo K=Calculator /=Cautare'); break;
  }
});
```

---

### 8. Istoric Tratamente per Specie — Timeline in tab specie

**Descriere:** In fiecare tab de specie, widget "Ultimele interventii" care filtreaza jurnalul dupa specia respectiva.

**De ce e util:** Cand Roland deschide tab-ul Cais, vede rapid: "Cand am stropit ultima data?", "Ce am aplicat in martie?" fara sa caute manual in jurnal.

**Complexitate:** Medie | **Impact:** Mare

**Exemplu implementare:**
```javascript
function getSpeciesHistory(speciesId) {
  var name = (SPECIES[speciesId] || '').toLowerCase();
  if (!name) return [];
  return getJurnalEntries().filter(function(e) {
    return (e.note || '').toLowerCase().includes(name) || (e.species && e.species === speciesId);
  }).slice(0, 10);
}
// In injectSpeciesTools(), adauga dupa butoane:
var history = getSpeciesHistory(tabId);
if (history.length > 0) {
  var histHtml = '<div class="section" style="margin-top:12px;">' +
    '<h2 class="section-title">📋 Ultimele interventii</h2><div class="section-body">' +
    history.map(function(e) {
      return '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">' +
        '<span style="color:var(--accent);font-weight:700;">' + escapeHtml(e.date) + '</span> ' +
        '<span style="color:var(--text-dim);">[' + e.type + ']</span> ' + escapeHtml(e.note) + '</div>';
    }).join('') + '</div></div>';
  div.innerHTML += histHtml;
}
```

---

## PARTEA III — IMBUNATATIRI TEHNICE

### 1. Debounce pe butoane de submit

**Problema:** Butoanele "Adauga in jurnal", "Trimite intrebarea", "Genereaza Raport" nu au protectie la double-click. Duplicate la conexiune lenta.
**Solutie:** Disable buton pe durata procesarii, re-enable la finish/error.
**Complexitate:** Mica | **Impact:** Calitate — previne duplicate

### 2. Image compression inainte de upload

**Problema:** Upload photo trimite imaginea raw (poate fi 4MB HEIC). Cu 50 poze, costul Blob creste.
**Solutie:** Canvas resize la max 1200px latime + conversie JPEG quality 0.8 inainte de upload. ~3MB → ~200KB.
**Complexitate:** Medie | **Impact:** Performanta — galerie rapida, storage mic

### 3. Accessibility — Labels lipsa si focus vizibil

**Problema:** Bottom bar butoanele nu au `aria-label`. Focus outline invizibil in dark mode pe unele elemente.
**Solutie:** Adauga `aria-label` pe bottom-btn, `:focus-visible` outline cu contrast suficient.
**Complexitate:** Mica | **Impact:** Accesibilitate — WCAG 2.1 AA

### 4. localStorage quota monitoring

**Problema:** localStorage limita 5MB, nicio verificare — la overflow, JS arunca exceptie silentioasa.
**Solutie:** Check size la init + dupa save. Toast warning la 4MB.
**Complexitate:** Mica | **Impact:** Calitate — previne pierdere date

### 5. Offline queue pentru operatii cloud

**Problema:** Daca utilizatorul e offline si sterge/editeaza intrari, delete-urile locale se pierd la sync (remote inca le are).
**Solutie:** Queue local `livada-pending-ops` executat la reconectare.
**Complexitate:** Medie | **Impact:** Calitate — sync robust fara pierderi

### 6. content-visibility: auto pe sectiuni

**Problema:** Aplicat pe `.tab-content`, dar 119 sectiuni `.section` nu il au → rendering inutil.
**Solutie:** `.section { content-visibility: auto; contain-intrinsic-size: 0 300px; }`
**Complexitate:** Mica | **Impact:** Performanta — load mai rapid

### 7. authFetch retry cu backoff

**Problema:** Un singur request, fail instant la 503/429.
**Solutie:** Wrapper cu retry exponential (2s → 5s) pentru coduri 429, 503, 504.
**Complexitate:** Mica | **Impact:** Calitate — API calls robuste

### 8. rateLimitMap cleanup in _auth.js

**Problema:** `setInterval` in serverless nu ruleaza intre request-uri — cod inselator.
**Solutie:** Eliminare setInterval, cleanup inline in rateLimit(). (Duplicat cu A0-22)
**Complexitate:** Mica | **Impact:** Mentenanta — cod curat

---

## SUMAR PRIORITATI UNIFICAT

> Toate itemele din Partea 0 (audit) + Partea I-III (features/tehnic), ordonate pentru executie.

### P0 — URGENT (Securitate critica + buguri)

| # | ID | Nume | Fisier | Complexitate | Tip |
|---|---|---|---|---|---|
| 1 | A0-1 | Auth bypass token lipsa | `_auth.js:31` | Mica | Securitate |
| 2 | A0-3 | meteo-cron fara CRON_SECRET | `meteo-cron.js:19` | Mica | Securitate |
| 3 | A0-4 | frost-alert + meteo-history fara rate limit | `frost-alert.js`, `meteo-history.js` | Mica | Securitate |
| 4 | A0-5 | DOMPurify neincarcat efectiv | `index.html` | Mica | Securitate |
| 5 | A0-6 | photos.js URL + extensie nevalidate | `photos.js:62,78` | Mica | Securitate |
| 6 | A0-7 | photos.js GET fara rate limit | `photos.js:11` | Mica | Securitate |
| 7 | A0-9 | journal DELETE fara validare body | `journal.js:48` | Mica | Securitate |
| 8 | A0-10 | Timezone bug toISOString | `index.html:6348,7265` | Mica | Corectitudine |
| 9 | A0-8 + I-4 | syncJournal race condition + retry | `index.html:6838` | Mica | Corectitudine |
| 10 | I-6 | sanitizeAI parsare markdown | `index.html:6641` | Mica | Calitate |
| 11 | I-11 | wmoEmoji default return | `index.html:6491` | Mica | Calitate |
| 12 | III-1 | Debounce pe butoane submit | `index.html` | Mica | Calitate |

### P1 — IMPORTANT (Securitate medie + features cu impact mare)

| # | ID | Nume | Fisier | Complexitate | Tip |
|---|---|---|---|---|---|
| 13 | A0-11 | Rate limit IP spoofabil | `_auth.js:57` | Mica | Securitate |
| 14 | A0-12 | HSTS header lipsa | `vercel.json` | Mica | Securitate |
| 15 | A0-13 | Erori API expun detalii | `api/*.js` | Mica | Securitate |
| 16 | A0-14 | restoreData whitelist chei | `index.html:7208` | Mica | Securitate |
| 17 | A0-15 | Token validare format | `index.html:6927` | Mica | Securitate |
| 18 | A0-16 | Spray score umiditate prognoza | `index.html:7157` | Mica | Corectitudine |
| 19 | A0-17 | printFisa popup blocker check | `index.html:7279` | Mica | Corectitudine |
| 20 | A0-18 | innerText → textContent | `index.html:6813` | Mica | Performanta |
| 21 | A0-22 | setInterval dead code serverless | `_auth.js:49` | Mica | Calitate |
| 22 | I-8 | Jurnal cautare + date filter | `index.html:6262` | Mica | Feature |
| 23 | II-1 | Jurnal Quick-Add dashboard | `index.html` | Mica | Feature |
| 24 | I-2 | Spray score ora + dew point | `index.html:7064` | Mica | Feature |
| 25 | I-9 | Lightbox zoom galerie | `index.html:6712` | Mica | Feature |

### P2 — VALOROS (Performanta + features medii)

| # | ID | Nume | Complexitate | Tip |
|---|---|---|---|---|
| 26 | A0-19 | Google Fonts non-blocking | Mica | Performanta |
| 27 | A0-20 | doSearch cache textContent | Mica | Performanta |
| 28 | A0-21 | SW cache versioning | Mica | Performanta |
| 29 | A0-23 | CLAUDE.md env vars + deps | Mica | Documentatie |
| 30 | I-1 | Highlight toate aparitiile | Mica | Feature |
| 31 | I-7 | Editare jurnal completa | Medie | Feature |
| 32 | I-5 | Export CSV coloane complete | Mica | Feature |
| 33 | I-10 | startStropire inline form | Mica | Feature |
| 34 | II-2 | Statistici interventii grafice | Medie | Feature |
| 35 | II-8 | Istoric tratamente per specie | Medie | Feature |
| 36 | II-4 | Dark mode auto | Mica | Feature |
| 37 | III-2 | Image compression upload | Medie | Tehnic |
| 38 | III-6 | content-visibility pe sectiuni | Mica | Performanta |

### P3 — STRATEGIC (Features noi + tehnic avansat)

| # | ID | Nume | Complexitate | Tip |
|---|---|---|---|---|
| 39 | A0-2 | Teste unitare (vitest) | Medie | Calitate |
| 40 | I-12 | Raport filtru an | Mica | Feature |
| 41 | I-3 | Calendar buton Azi | Mica | Feature |
| 42 | I-13 | Dashboard auto-refresh | Mica | Feature |
| 43 | I-14 | Recolta comparatie multi-an | Mica | Feature |
| 44 | II-3 | Cost Tracker | Medie | Feature |
| 45 | II-5 | SW update notification | Mica | Feature |
| 46 | III-5 | Offline queue operatii | Medie | Tehnic |
| 47 | III-7 | authFetch retry backoff | Mica | Tehnic |

### P4 — NICE-TO-HAVE

| # | ID | Nume | Complexitate | Tip |
|---|---|---|---|---|
| 48 | A0-24 | CORS localhost conditonat | Mica | Securitate |
| 49 | A0-25 | CSP frame-ancestors | Mica | Securitate |
| 50 | I-15 | Storage quota monitor | Mica | Feature |
| 51 | II-6 | Import jurnal CSV | Mica | Feature |
| 52 | II-7 | Keyboard shortcuts | Mica | Feature |
| 53 | III-3 | Accessibility labels | Mica | Tehnic |
| 54 | III-4 | localStorage quota check | Mica | Tehnic |

---

## NOTE IMPLEMENTARE

1. **Constrangere single-file:** Tot codul ramane inline in `public/index.html`. CSS nou in `<style>`, JS nou in `<script>`.

2. **Pattern stocare:** Toate cheile localStorage incep cu `livada-`. Nu depasi 5MB total.

3. **Dependinte intre recomandari:**
   - A0-1 (auth bypass) INAINTE de orice — securitate critica
   - A0-5 (DOMPurify) inainte de I-6 (sanitizeAI markdown) — trebuie incarcat DOMPurify inainte de parsare
   - A0-8 + I-4 (sync race + retry) se implementeaza simultan
   - A0-10 (todayLocal) creeaza functia helper folosita de I-10, II-1, II-3
   - I-8 (jurnal search) combinabil cu II-1 (quick-add) in aceeasi sesiune

4. **Ce NU se schimba:**
   - Structura 18 tab-uri
   - Continutul documentatiei per specie (A-G)
   - API routes (9 endpoints)
   - Deploy flow (git push → auto-deploy Vercel)
   - Zero dependinte externe (exceptie: DOMPurify, Google Fonts)

5. **Estimare impact dimensiune:**
   - P0 (12 items): ~+80 linii (majoritatea sunt fix-uri mici)
   - P0+P1 (25 items): ~+250 linii
   - P0-P2 (38 items): ~+600 linii
   - Toate (54 items): ~+1100 linii (→ ~8450 total)

6. **Plan executie recomandat:**
   - **Sesiune 12:** P0 complet (12 items securitate + buguri) — ~80 linii, impact maxim
   - **Sesiune 13:** P1 securitate (items 13-21) + P1 features top 2 (items 22-23) — ~150 linii
   - **Sesiune 14:** P1 features restul (24-25) + P2 performanta (26-28) + P2 features top 3 (30-32)
   - **Sesiune 15:** P2 restul + P3 selectiv
   - Audit rapid dupa fiecare sesiune
