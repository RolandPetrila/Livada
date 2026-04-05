# RECOMANDARI IMBUNATATIRI v5 — Livada Mea Dashboard

**Data:** 2026-04-05 (actualizat S15: 2026-04-05)
**Versiune:** v5 (post-Sesiuni 1-15)
**HTML:** 11,034+ linii | **API:** 11 routes | **Specii:** 20 + 1 general
**Comparatie vs v4:** S12-S14 completate (38 items P0-P2). S15: 5 items implementate (report 504, R2, I1, I5, I9).

**S15 IMPLEMENTAT:**
- `api/report.js` — fix 504: `maxDuration:60` → Edge Runtime ✅
- R2 `checkAlerts()` — offline fallback cu localStorage cache ✅
- I1 `visibilitychange` — auto-refresh dashboard dupa 30 min background ✅
- I5 `authFetch()` — retry cu backoff (0s/2s/5s) pe 429/503/504 ✅
- I9 `generateReport()` — butoane Copiaza + Printeaza dupa raport ✅
- I10 `printFisa()` — deja implementat (popup blocker check existent) ✅
- R3 humidity — deja implementat in `initDashboardAzi` (URL + fallback existent) ✅

---

## STATUS v4 — CE S-A IMPLEMENTAT (S12-S14)

| Sesiune | Items | Categorie |
|---------|-------|-----------|
| S12 | 12 items P0 | Securitate critica + buguri |
| S13 | 13 items P1 | Securitate medie + features: search jurnal, lightbox, quick-add |
| S14 | 13 items P2 | Performanta + features: statistici, species history, dark mode, compress |
| **Total** | **38/54** | **P0-P2 complete** |

**Ramas din v4:** P3 (9 items) + P4 (7 items) = 16 items — **re-prioritizate mai jos**

---

## PARTE 0 — REMEDIERI CRITICE DESCOPERITE IN V5

> Probleme noi identificate la analiza codului 11,034 linii (vs 7,358 la v4).

### R1. `generateReport()` — Trimite TOATE intrarile, nu doar anul curent

**Fisier:** `public/index.html:10452`
**Problema:** `localJournal = getJurnalEntries().map(...)` trimite ALL entries la Groq. Cu 200+ interventii din 3 ani, risipesti token-uri pe date irelevante si poti depasi limita contextului LLM.

**Fix:**
```javascript
async function generateReport() {
  var year = new Date().getFullYear();
  var allEntries = getJurnalEntries();
  var yearEntries = allEntries.filter(function(e) { return e.date && e.date.startsWith(String(year)); });
  if (yearEntries.length === 0) {
    showToast('Nicio interventie in ' + year + '. Alege un alt an sau adauga interventii.');
    return;
  }
  if (!confirm('Datele din ' + year + ' (' + yearEntries.length + ' interventii) vor fi trimise la Groq AI. Continua?')) return;
  var localJournal = yearEntries.map(function(e) { return e.date + ': [' + e.type + '] ' + (e.note||''); }).join('\n');
  // ... restul neschimbat, cu localJournal filtrat
```

**Complexitate:** Mica (5 linii) | **Impact:** Mare — rapoarte focusate, token-uri economisite

---

### R2. `checkAlerts()` — Fara fallback offline

**Fisier:** `public/index.html:10320-10334`
**Problema:** `if (!navigator.onLine) return;` — daca utilizatorul e offline, alertele din sesiunea anterioara dispar. Inghet detectat ieri e invizibil azi la pornire fara internet.

**Fix:**
```javascript
const ALERTS_CACHE_KEY = 'livada-alerts-cache';

async function checkAlerts() {
  // Afiseaza cache-ul existent imediat (chiar offline)
  try {
    var cached = JSON.parse(localStorage.getItem(ALERTS_CACHE_KEY) || 'null');
    if (cached) applyAlerts(cached);
  } catch(e) {}

  if (!navigator.onLine) return;
  try {
    var res = await fetchWithTimeout('/api/frost-alert', {}, 5000);
    if (!res.ok) return;
    var data = await res.json();
    localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(data));
    applyAlerts(data);
  } catch(e) {}
}

function applyAlerts(data) {
  if (data.frost && data.frost.active) {
    document.getElementById('frostText').textContent = data.frost.message;
    document.getElementById('frostBanner').classList.add('active');
  }
  if (data.disease && data.disease.active) {
    document.getElementById('diseaseText').textContent = data.disease.message;
    document.getElementById('diseaseBanner').classList.add('active');
  }
}
```

**Complexitate:** Mica | **Impact:** Mare — alerte vizibile offline (salvate din ultima sesiune online)

---

### R3. `calculateSprayScore()` — Umiditate hardcoded 60% (A0-16 din v4, neimplementat)

**Fisier:** `public/index.html:10515`
**Problema confirmata in cod:** Prognoza stropire calculeaza scorul cu `humidity=60` hardcodat. Open-Meteo daily API nu returneaza umiditate zilnica in query-ul actual.

**Fix complet (adauga `relative_humidity_2m_mean` la Open-Meteo query):**
```javascript
// In fetchMeteo(), modifica URL-ul Open-Meteo:
var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + LIVADA_LAT + '&longitude=' + LIVADA_LON +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max' +
  ',relative_humidity_2m_mean' +   // ADAUGA ACEASTA LINIE
  '&forecast_days=5&timezone=Europe%2FBucharest';

// Apoi in procesarea zilelor prognoza:
var humidity = data.daily.relative_humidity_2m_mean[i] || 60;
calculateSprayScore((tMax + tMin) / 2, wMax, prec, humidity);
```

**Complexitate:** Mica (2 linii) | **Impact:** Mediu — spray score prognoza corect

---

### R4. `loadMeteoHistory()` — Date meteo fara vizualizare risc boli

**Fisier:** `public/index.html:10338`
**Problema:** Graficul meteo history arata doar temperatura (bare colorate). Backend-ul `meteo-history` returneaza si `rain` si `humidity` — suficient pentru calculul riscului fungic — dar nu sunt afisate.

**Fix — adauga linie risc sub grafic:**
```javascript
// In loadMeteoHistory(), dupa constructia bars:
var riskDays = entries.filter(function(e) {
  var d = e[1];
  return d.rain > 0 && d.temp >= 10 && d.temp <= 25;
});
var riskNote = riskDays.length >= 3
  ? '<div class="alert alert-warning" style="font-size:0.78rem;margin-top:8px;">⚠️ <strong>' + riskDays.length + ' zile cu conditii favorabile pentru boli fungice</strong> in ultimele 30 zile. Verifica rapanul si monilioza.</div>'
  : (riskDays.length > 0
     ? '<div class="alert alert-info" style="font-size:0.78rem;margin-top:8px;">ℹ️ ' + riskDays.length + ' zi/zile cu ploi la temperatura optima pentru boli.</div>'
     : '');
container.innerHTML = '...(grafic existent)...' + riskNote;
```

**Complexitate:** Mica | **Impact:** Mediu — valorifica date existente din API

---

---

## PARTEA I — IMBUNATATIRI FUNCTII EXISTENTE

### 1. `initDashboardAzi()` — Auto-refresh la visibility change (P3 → P1)

**Fisier:** `public/index.html` — nu exista `visibilitychange` handler
**Problema:** Dashboard-ul se incarca o singura data. Daca app-ul e in background 2-3 ore, meteo-ul si alertele sunt vechi. Pe Android (PWA), frecvent app-ul e minimizat si redeschis.

**Imbunatatire:**
```javascript
// Adauga dupa initializarea SW (linia ~9777):
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    var last = parseInt(localStorage.getItem('livada-last-dashboard-refresh') || '0');
    var now = Date.now();
    if (now - last > 30 * 60 * 1000) { // 30 minute
      var activeTab = document.querySelector('.tab-content.active');
      if (activeTab && activeTab.id === 'azi') {
        initDashboardAzi();
        localStorage.setItem('livada-last-dashboard-refresh', String(now));
      }
    }
  }
});
```

**Complexitate:** Mica | **Impact:** Mare — date mereu actuale la revenire in app

---

### 2. `renderCalendar()` — Buton "Azi" pentru navigare rapida (P3 → P1)

**Fisier:** `public/index.html` — zona calendar navigation
**Problema:** Singura navigare e ← → luna cu luna. Daca utilizatorul navigheza la o luna anterioara pentru a verifica o interventie, intoarcerea la luna curenta necesita N click-uri.

**Imbunatatire — adauga buton central:**
```javascript
// In renderCalendar(), dupa constructia header-ului cu sagetile:
// Inlocuieste div-ul cu butoanele de navigare cu:
var navHtml = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
  '<button class="btn btn-secondary" style="padding:6px 12px;" onclick="calNav(-1)">&#8249;</button>' +
  '<div style="text-align:center;">' +
  '<div style="font-weight:700;font-size:0.95rem;">' + MONTHS_RO[calMonth] + ' ' + calYear + '</div>' +
  '<button class="btn btn-secondary" style="padding:2px 10px;font-size:0.7rem;margin-top:4px;" onclick="calMonth=new Date().getMonth();calYear=new Date().getFullYear();renderCalendar();enhanceCalendarWithMeteo();">Azi</button>' +
  '</div>' +
  '<button class="btn btn-secondary" style="padding:6px 12px;" onclick="calNav(1)">&#8250;</button>' +
  '</div>';
```

**Complexitate:** Mica | **Impact:** Mediu — navigare mult mai fluida

---

### 3. `renderRecoltaSummary()` — Selector an (comparatie multi-an) (P3 → P1)

**Fisier:** `public/index.html` — zona recoltaSummary
**Problema:** Tabelul arata doar anul curent. Dupa 2-3 ani de jurnal, comparatia productiei ("Am recoltat mai mult in 2025 sau 2026?") e imposibila.

**Imbunatatire:**
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

**Complexitate:** Mica | **Impact:** Mare — vizibilitate progres anual (esential dupa 2+ ani de jurnal)

---

### 4. `syncJournal()` — Afiseaza timestamp ultima sincronizare reusita (din S11 planificat)

**Fisier:** `public/index.html` — `updateSyncBadge()`
**Problema:** Badge-ul arata "Sincronizat" dar nu stie utilizatorul CAND. "Sincronizat acum 3 zile" are alta relevanta decat "Sincronizat acum 2 minute".

**Imbunatatire:**
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
    badge.textContent = '● Sincronizat' + timeLabel;
    badge.style.color = 'var(--success)';
  }
  // ... restul status-urilor neschimbat
}
```

**Complexitate:** Mica | **Impact:** Mediu — utilizatorul stie cat de proaspete sunt datele

---

### 5. `authFetch()` — Retry automat cu backoff (P3 → P1)

**Fisier:** `public/index.html` — `authFetch()` la linia ~9860
**Problema:** Un request esuat (503/429/504) = fail instant fara retry. Pe conexiuni mobile fluctuante sau la Vercel cold start, un request perfect valid esueaza.

**Imbunatatire:**
```javascript
async function authFetch(url, opts, ms) {
  ms = ms || 10000;
  opts = opts || {};
  var retries = [0, 2000, 5000]; // 3 incercari: imediat, 2s, 5s
  for (var i = 0; i < retries.length; i++) {
    if (i > 0) await new Promise(function(r){ setTimeout(r, retries[i]); });
    try {
      var res = await fetchWithTimeout(url, Object.assign({}, opts, {
        headers: Object.assign(authHeaders(), opts.headers || {})
      }), ms);
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        if (i < retries.length - 1) continue; // retry
      }
      return res;
    } catch(e) {
      if (i === retries.length - 1) throw e;
    }
  }
}
```

**Complexitate:** Mica | **Impact:** Mare — API calls robuste pe mobil cu conexiune slaba

---

### 6. `openLightbox()` — Swipe gesture pentru navigare intre poze (mobil)

**Fisier:** `public/index.html:10061`
**Problema:** Lightbox-ul se deschide la click pe imagine dar nu exista navigare stanga/dreapta. Pe Android, utilizatorul vrea sa swipe-uiasca prin galeria specimenului pentru a urmari evolutia bolii.

**Imbunatatire:**
```javascript
// Extinde openLightbox() cu suport swipe + navigate:
function openLightbox(src, allSrcs) {
  allSrcs = allSrcs || [src];
  var idx = allSrcs.indexOf(src);
  var overlay = document.getElementById('lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:400;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
    overlay.innerHTML = '<button id="lb-prev" style="position:absolute;left:12px;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:2rem;padding:8px 14px;border-radius:50%;cursor:pointer;z-index:1;">&#8249;</button>' +
      '<img id="lightbox-img" style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px;">' +
      '<button id="lb-next" style="position:absolute;right:12px;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:2rem;padding:8px 14px;border-radius:50%;cursor:pointer;z-index:1;">&#8250;</button>' +
      '<div id="lb-counter" style="position:absolute;bottom:12px;color:rgba(255,255,255,0.7);font-size:0.8rem;"></div>';
    // Touch swipe
    var touchStartX = 0;
    overlay.addEventListener('touchstart', function(e){ touchStartX = e.touches[0].clientX; }, {passive:true});
    overlay.addEventListener('touchend', function(e){
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) navigate(dx > 0 ? -1 : 1);
    });
    overlay.addEventListener('click', function(e){
      if (e.target === overlay) overlay.style.display = 'none';
    });
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

**Complexitate:** Medie | **Impact:** Mare — navigare naturala in galerie pe Android

---

### 7. `injectSpeciesHistory()` — Buton "Adauga interventie" direct in widget specie

**Fisier:** `public/index.html:10005`
**Problema:** Widget-ul "Ultimele interventii" arata istoricul per specie, dar pentru a adauga o interventie noua, utilizatorul trebuie sa iasa din tab, sa deschida modalul Jurnal, sa selecteze manual specia. Flux inutil de lung.

**Imbunatatire — adauga buton la finalul widget-ului:**
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

**Complexitate:** Mica | **Impact:** Mediu — flux rapid din tab specie → adaugare jurnal

---

### 8. `renderStats()` — Adauga selectie an + total kg recolta in statistici

**Fisier:** `public/index.html:9950`
**Problema:** Graficul interventii per tip si luna e limitat la anul curent si nu include recoltele (kg). Un pomicultor vrea sa vada si productia anuala, nu doar numarul de interventii.

**Imbunatatire:**
```javascript
function renderStats() {
  var entries = getJurnalEntries();
  var allYears = [...new Set(entries.map(function(e){ return (e.date||'').substring(0,4); }).filter(Boolean))].sort().reverse();
  var year = parseInt(localStorage.getItem('livada-stats-year') || String(new Date().getFullYear()));
  if (!allYears.includes(String(year))) year = parseInt(allYears[0] || new Date().getFullYear());
  var yearEntries = entries.filter(function(e){ return e.date && e.date.startsWith(String(year)); });
  
  // Selector an (daca exista mai multi ani)
  var yearSelHtml = allYears.length > 1
    ? '<div style="margin-bottom:12px;"><select onchange="localStorage.setItem(\'livada-stats-year\',this.value);injectStatsSection();" style="padding:4px 8px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
      allYears.map(function(y){ return '<option value="'+y+'"'+(String(year)===y?' selected':'')+'>'+y+'</option>'; }).join('') + '</select></div>'
    : '';
  
  // Total recolta kg
  var totalKg = yearEntries.filter(function(e){ return e.type==='recoltare' && e.kg>0; }).reduce(function(s,e){ return s+parseFloat(e.kg||0); }, 0);
  var kgHtml = totalKg > 0
    ? '<div style="padding:8px 12px;background:var(--bg-surface);border-radius:8px;margin-bottom:12px;font-size:0.85rem;">🍎 Recolta totala ' + year + ': <strong>' + totalKg.toFixed(1) + ' kg</strong></div>'
    : '';
  
  // ... restul graficelor neschimbat (byType + byMonth) ...
  return yearSelHtml + kgHtml + '<!-- grafice existente -->';
}
```

**Complexitate:** Mica | **Impact:** Mare — viziune completa an (interventii + productie)

---

### 9. `generateReport()` — Buton copiere raport + buton print

**Fisier:** `public/index.html:10463`
**Problema:** Raportul se genereaza si se afiseaza, dar nu exista mod de a-l salva. Nu are buton "Copiaza" sau "Printeaza". Utilizatorul poate face Ctrl+A, Ctrl+C din div — dar pe mobil e imposibil.

**Imbunatatire — adauga butoane dupa display:**
```javascript
// In generateReport(), dupa result.innerHTML = ...:
result.innerHTML += '<div style="display:flex;gap:8px;margin-top:12px;">' +
  '<button class="btn btn-secondary" style="flex:1;font-size:0.8rem;" onclick="copyTextEl(\'reportResult\')">Copiaza raport</button>' +
  '<button class="btn btn-secondary" style="flex:1;font-size:0.8rem;" onclick="window.print()">Printeaza</button>' +
  '</div>';
```

**Complexitate:** Mica (3 linii) | **Impact:** Mediu — raportul devine utilizabil offline (copiat in WhatsApp, email, etc.)

---

### 10. `printFisa()` — Verifica popup blocker (P3 → P1)

**Fisier:** `public/index.html` — functia printFisa
**Problema:** `window.open()` returneaza `null` daca popup-urile sunt blocate pe Android Chrome. Urmatoarea linie `win.document.write(...)` arunca `TypeError: Cannot read property 'document' of null`.

**Fix:**
```javascript
function printFisa() {
  var win = window.open('', '_blank');
  if (!win) { showToast('Permite popup-urile pentru aceasta pagina (Settings > Site settings).'); return; }
  // ... restul neschimbat
}
```

**Complexitate:** Mica (2 linii) | **Impact:** Mediu — previne crash pe Android cu popup blocker activ

---

## PARTEA II — FUNCTII NOI

### 1. Cost Tracker — Evidenta cheltuieli per sezon (P3 → P1)

**Descriere:** Sectiune in "Plan Livada" unde utilizatorul adauga costul produselor cumparate (produs, cantitate, pret/unitate). Calculeaza totalul per sezon si emite alerta daca depaseste un buget setat.

**De ce e util:** "Am dat 800 lei pe fungicide in 2025 — merit sa cumpar in stoc de toamna?" — intrebare reala. Datele exista in jurnal (tratamentele) dar costul niciodata.

**Complexitate:** Medie | **Impact:** Mare

**Exemplu implementare (localStorage + UI inline):**
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
  renderCosts(); showToast('Cost inregistrat!');
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

```html
<!-- HTML pentru sectiunea costs in Plan Livada: -->
<div class="section" id="costs-section" style="margin-top:16px;">
  <h2 class="section-title">💰 Cheltuieli Sezon</h2>
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

---

### 2. Notificari Browser pentru Inghet (Notification API)

**Descriere:** La detectarea unui alert de inghet de catre meteo-cron (setat in Redis), app-ul poate trimite o notificare push nativa la urmatoarea deschidere sau la vizita activa.

**De ce e util:** Roland poate vedea notificarea chiar daca nu a deschis app-ul. "Inghet posibil maine —2°C" direct pe ecranul telefonului = reactioneaza imediat (acopera pomii sensibili).

**Complexitate:** Medie | **Impact:** Maxim (prevenire pierderi productie)

**Exemplu implementare:**
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
  await checkAlerts(); // functia existenta
  if (!navigator.onLine) return;
  try {
    var res = await fetchWithTimeout('/api/frost-alert', {}, 5000);
    if (!res.ok) return;
    var data = await res.json();
    if (data.frost && data.frost.active) {
      var lastNotif = localStorage.getItem('livada-frost-notif-date');
      var today = todayLocal();
      if (lastNotif !== today) { // notifica o data pe zi
        var granted = await requestNotificationPermission();
        if (granted) {
          new Notification('❄️ Livada Mea — Alerta Inghet', {
            body: data.frost.message || 'Inghet posibil. Protejeaza pomii sensibili!',
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: 'frost-alert'
          });
          localStorage.setItem('livada-frost-notif-date', today);
        }
      }
    }
  } catch(e) {}
}

// In initDashboardAzi(), inlocuieste checkAlerts() cu checkAlertsWithNotification()
// Adauga buton "Activeaza notificari" in setari rapide:
```

```html
<button class="btn btn-secondary" onclick="requestNotificationPermission().then(function(ok){showToast(ok?'Notificari activate!':'Notificari refuzate.');})">
  🔔 Notificari inghet
</button>
```

---

### 3. Service Worker Update Notification (P3 → P2)

**Descriere:** Toast clickabil cand service worker-ul se actualizeaza: "Versiune noua disponibila. Apasa pentru actualizare." Previne utilizarea cache-ului vechi dupa deploy.

**De ce e util:** Dupa `git push`, Roland poate folosi ore intregi versiunea veche din cache fara sa stie. Actualizarea manuala e imposibila fara sa stii ca e nevoie.

**Complexitate:** Mica | **Impact:** Mediu

**Exemplu implementare:**
```javascript
// In sectiunea de Service Worker registration (linia ~9777):
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(reg) {
    reg.addEventListener('updatefound', function() {
      var newWorker = reg.installing;
      newWorker.addEventListener('statechange', function() {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Versiune noua instalata, asteapta activare
          var t = document.createElement('div');
          t.className = 'toast';
          t.style.cssText += 'cursor:pointer;background:var(--accent);color:#fff;';
          t.textContent = '🔄 Versiune noua disponibila. Apasa pentru actualizare.';
          t.addEventListener('click', function() {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            location.reload();
          });
          document.body.appendChild(t);
          setTimeout(function() { t.remove(); }, 10000);
        }
      });
    });
  });
}

// In sw.js, adauga handler pentru SKIP_WAITING:
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

---

### 4. Import Jurnal din CSV (P4 → P2)

**Descriere:** Buton "Import CSV" in modalul jurnal care parseaza un fisier CSV (Data,Tip,Nota) si adauga intrarile in jurnal. Util daca utilizatorul a tinut jurnal in Excel anterior sau vrea sa migreze date.

**De ce e util:** Roland poate adauga datele din 2024-2025 dintr-un Excel vechi. Datele istorice imbunatatesc rapoartele AI si statisticile.

**Complexitate:** Mica | **Impact:** Mediu

**Exemplu implementare:**
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
    } else { showToast('Nicio intrare valida in CSV. Format: YYYY-MM-DD,tip,nota'); }
  };
  reader.readAsText(file);
  input.value = '';
}
```

```html
<!-- Adauga in footer-ul modal jurnal, langa butonul Export CSV: -->
<label class="btn btn-secondary" style="cursor:pointer;font-size:0.8rem;">
  Import CSV
  <input type="file" accept=".csv,text/csv" style="display:none;" onchange="importJurnalCSV(this)">
</label>
```

---

### 5. Jurnal filtru per specie (specii din jurnal)

**Descriere:** Dropdown "Specie" in filtrul jurnalului care afiseaza doar intrarile pentru o anumita specie (camp `species` din entry sau detectat in nota).

**De ce e util:** Cu 20 specii si 200+ interventii, "Cate stropiri am aplicat la Piersic?" e o intrebare frecventa fara raspuns rapid actual.

**Complexitate:** Mica | **Impact:** Mare

**Exemplu implementare:**
```javascript
// Adauga in HTML filtrul jurnal (dupa filtrul de tip):
// <select id="jurnalSpeciesFilter" onchange="jurnalPage=0;renderJurnal();">
//   <option value="">Toate speciile</option>
//   <option value="piersic">Piersic</option>... (generat din SPECIES)
// </select>

// In renderJurnal(), adauga filtru:
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

---

### 6. Keyboard Shortcuts pentru navigare rapida (P4 → P3)

**Descriere:** Scurtaturi de tastatura pentru putere-utilizatori pe desktop/tablet: `J`=Jurnal, `C`=Calendar, `M`=Meteo, `K`=Calculator, `/`=Cautare.

**De ce e util:** Pe desktop sau tableta cu tastatura, navigarea intre modale cu mouse-ul e mai lenta. Util cand utilizatorul consulta app-ul in timp ce introduce date intr-un alt program.

**Complexitate:** Mica | **Impact:** Mic (niche)

**Exemplu implementare:**
```javascript
// Adauga in sectiunea event listeners:
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

---

### 7. localStorage Quota Monitor (P4 → P3)

**Descriere:** Verificare automata a dimensiunii localStorage la startup si dupa fiecare save. Toast de avertizare daca se apropie de limita de 5MB.

**De ce e util:** La 11,034 linii de documentatie inline + jurnal + galerie blob URLs, riscul de depasire creste. Un overflow silentios = pierdere de date fara niciun mesaj.

**Complexitate:** Mica | **Impact:** Mediu

**Exemplu implementare:**
```javascript
function checkStorageUsage(warn) {
  var total = 0;
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    total += key.length + (localStorage.getItem(key)||'').length;
  }
  var mb = (total * 2) / (1024 * 1024);
  if (warn && mb > 3.5) {
    showToast('⚠️ Stocare locala ' + mb.toFixed(1) + '/5 MB. Fa backup si sterge jurnalul vechi!');
  }
  return mb;
}
// Apeleaza checkStorageUsage(true) dupa initNewFeatures() si dupa addJurnalEntry()
```

---

## PARTEA III — IMBUNATATIRI TEHNICE

### T1. Offline Queue pentru delete/edit (P3 ramane P3)

**Problema:** Daca utilizatorul sterge o interventie din jurnal offline, stergerea e aplicata in localStorage dar la sync-ul urmator Redis inca are entry-ul → re-apare dupa sync.
**Solutie:** Queue `livada-pending-ops` [{op:'delete',id:N}] salvat in localStorage, executat la reconnect inainte de sync.
**Complexitate:** Medie | **Impact:** Calitate — sync robust fara re-aparitii dupa offline

---

### T2. Rate limit persistent Redis (din S11 planificat, P3)

**Problema:** Rate limiter din `_auth.js` foloseste `Map` in-memory → se pierde la cold start Vercel. La restart frecvent, rate limiting e efectiv dezactivat.
**Solutie:** Salvare contor in Upstash Redis cu TTL 60s. Performanta acceptabila (<5ms per check).
**Complexitate:** Medie | **Impact:** Securitate/Calitate

---

### T3. ping.js — Adauga CORS headers

**Fisier:** `api/ping.js`
**Problema:** `ping.js` nu aplica CORS headers si nu raspunde la `OPTIONS`. Orice request de la alt origin (ex: diagnostic de pe localhost) va fi blocat de browser.

**Fix:**
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

**Complexitate:** Mica (5 linii) | **Impact:** Corectitudine

---

### T4. meteo-history.js — Error detection robusta

**Fisier:** `api/meteo-history.js`
**Problema:** `msg.includes('UPSTASH') || msg.includes('Missing')` — string-matching fragil pe mesajul de eroare.

**Fix:**
```javascript
// Inlocuieste:
if (msg.includes('UPSTASH') || msg.includes('Missing'))
// Cu:
if (err instanceof TypeError || !process.env.UPSTASH_REDIS_REST_URL)
```

**Complexitate:** Mica | **Impact:** Mentenanta

---

### T5. Teste unitare pentru functii critice (P3 ramane P3)

**Problema:** Zero teste. Functii critice netestata: `calculateSprayScore()`, `escapeHtml()`, `syncJournal()` merge logic, `rateLimit()`.
**Solutie:** Extrage functiile pure in module testabile + vitest.
**Complexitate:** Mare | **Impact:** Calitate pe termen lung

---

### T6. Accesibilitate — `aria-label` pe bottom bar si modals

**Problema:** Butoanele din bottom bar nu au `aria-label`. Screen reader-ul citeste icon SVG sau nimic.
**Solutie:**
```html
<button class="bottom-btn" aria-label="Deschide calculator doze" onclick="openModal('calculator')">...</button>
<button class="bottom-btn" aria-label="Deschide jurnal interventii" onclick="openModal('jurnal')">...</button>
```
**Complexitate:** Mica | **Impact:** Accesibilitate WCAG 2.1

---

### T7. Diagnostice de imagini — Progress indicator (%)

**Fisier:** `public/index.html` — `compressDiagnoseImage()` + `submitDiagnose()`
**Problema:** La upload imagine mare, utilizatorul vede spinner static. Daca compresia dureaza 3-4s pe telefon vechi, nu exista feedback de progres.
**Solutie:** Adauga text dinamic: "Comprima imaginea...", "Trimite la AI...", "Analizeaza...".

```javascript
async function submitDiagnose(input) {
  // ...
  loadingDiv.textContent = 'Comprima imaginea...';
  var compressed = await compressDiagnoseImage(file);
  loadingDiv.textContent = 'Trimite la AI (' + (compressed.size/1024).toFixed(0) + ' KB)...';
  // ... fetch
  loadingDiv.textContent = 'Analizeaza...';
}
```
**Complexitate:** Mica | **Impact:** UX — feedback clar pe telefoane lente

---

## SUMAR PRIORITATI v5

| Prioritate | # | Nume | Complexitate | Impact | Tip |
|---|---|---|---|---|---|
| **P0 — REMEDIERI CRITICE** | R1 | generateReport() filtru an | Mica | Mare | Corectitudine |
| **P0** | R2 | checkAlerts() cache offline | Mica | Mare | UX/Offline |
| **P0** | R3 | Spray score umiditate API | Mica | Mediu | Corectitudine |
| **P1 — IMPORTANT** | 1 | Dashboard auto-refresh | Mica | Mare | Feature |
| **P1** | 2 | Calendar buton Azi | Mica | Mediu | UX |
| **P1** | 3 | Recolta comparatie multi-an | Mica | Mare | Feature |
| **P1** | 4 | Sync timestamp vizibil | Mica | Mediu | UX |
| **P1** | 5 | authFetch retry backoff | Mica | Mare | Tehnic |
| **P1** | 10 | printFisa popup check | Mica | Mediu | Bugfix |
| **P1** | R4 | Meteo history risc boli | Mica | Mediu | Feature |
| **P2 — VALOROS** | 6 | Lightbox swipe galerie | Medie | Mare | UX Mobile |
| **P2** | 7 | Species history add button | Mica | Mediu | UX |
| **P2** | 8 | Stats selector an + kg | Mica | Mare | Feature |
| **P2** | 9 | Report copiere + print | Mica | Mediu | UX |
| **P2** | II-1 | Cost Tracker | Medie | Mare | Feature |
| **P2** | II-3 | SW update notification | Mica | Mediu | Tehnic |
| **P2** | II-4 | Import CSV jurnal | Mica | Mediu | Feature |
| **P2** | T3 | ping.js CORS | Mica | Corectitudine | Tehnic |
| **P3 — STRATEGIC** | II-2 | Notificari inghet (Notification API) | Medie | Maxim | Feature |
| **P3** | II-5 | Jurnal filtru specie | Mica | Mare | Feature |
| **P3** | T1 | Offline queue delete/edit | Medie | Calitate | Tehnic |
| **P3** | T2 | Rate limit Redis persistent | Medie | Securitate | Tehnic |
| **P3** | T6 | localStorage quota monitor | Mica | Mediu | Feature |
| **P4 — NICE-TO-HAVE** | II-6 | Keyboard shortcuts | Mica | Mic | Feature |
| **P4** | T4 | meteo-history error detect | Mica | Mentenanta | Tehnic |
| **P4** | T5 | Teste unitare (vitest) | Mare | Calitate | Tehnic |
| **P4** | T6 | Aria-labels accesibilitate | Mica | Accesibilitate | Tehnic |
| **P4** | T7 | Diagnose progress indicator | Mica | UX | Feature |

**Total v5: 28 recomandari** (4 P0 remedieri + 6 P1 + 8 P2 + 5 P3 + 5 P4)

---

## NOTE IMPLEMENTARE

1. **Constrangere single-file:** Tot codul ramane inline in `public/index.html`. Exceptie: sw.js si api/*.js au fisierele lor.

2. **Pattern stocare localStorage:** Toate cheile noi incep cu `livada-`. Noi chei adaugate in v5:
   - `livada-alerts-cache` — ultima stare alerte (JSON)
   - `livada-costs` — cost tracker (JSON array)
   - `livada-stats-year` — ultimul an selectat in statistici
   - `livada-last-sync` — timestamp ISO ultima sincronizare reusita
   - `livada-last-dashboard-refresh` — timestamp ultima reimprospatare dashboard
   - `livada-frost-notif-date` — data ultimei notificari inghet (YYYY-MM-DD)

3. **Dependinte intre recomandari:**
   - R1 (generateReport filtru an) independent, implementeaza primul
   - R2 (checkAlerts cache) independent, 15 minute implementare
   - R3 (spray score humidity) necesita modificarea URL-ului Open-Meteo in fetchMeteo()
   - II-1 (Cost Tracker) necesita o sectiune noua in Plan Livada — adauga dupa stats-section
   - II-2 (Notificari) depinde de R2 (checkAlerts reformat)
   - 3 (Recolta multi-an) depinde de structura `renderRecoltaSummary()` refacuta

4. **Ce NU se schimba:**
   - Continutul documentatiei per specie (A-G) — 20 specii complete
   - Structura tab-urilor (20 + azi + plan-livada)
   - API routes si contractele lor
   - Deploy flow (git push → auto-deploy Vercel)
   - SW.js strategie network-first

5. **Sesiuni recomandate:**
   - **Sesiunea 15:** P0 (R1+R2+R3+R4) + P1 top (dashboard auto-refresh, Calendar Azi, recolta multi-an, authFetch retry, print fix)
   - **Sesiunea 16:** P2 features (lightbox swipe, stats an, cost tracker, SW update notif, import CSV)
   - **Sesiunea 17:** P3 strategic (notificari inghet, jurnal filtru specie, offline queue)
   - **Sesiunea 18:** P4 polish + teste

6. **Estimare dimensiune HTML dupa v5 complet:**
   - P0 (4 items): ~+60 linii
   - P1 (6 items): ~+150 linii
   - P2 (8 items): ~+350 linii (Cost Tracker e substantial)
   - P3+P4: ~+250 linii
   - **Total estimat: ~11,850 linii** (vs 11,034 acum)
