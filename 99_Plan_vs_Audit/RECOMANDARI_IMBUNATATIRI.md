# RECOMANDARI IMBUNATATIRI v8 — Livada Mea Dashboard

**Data:** 2026-04-06 | **Versiune:** v8 (post-Sesiuni 1-17, analiza /imbunatatiri runda 8)
**HTML:** ~11,350 linii | **API:** 11 routes | **Specii:** 20 + 1 general
**Functii JS inventariate:** 62 | **Event listeners:** 24 | **localStorage keys:** 11

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
- ✅ **R1** generateReport() filtru an curent — DONE
- ✅ **R2** checkAlerts() offline fallback — DONE S15
- ✅ **R3** Spray score humidity real — DONE
- ✅ **R4** Meteo history risc micoze alert — DONE S16
- ✅ **I1** visibilitychange auto-refresh 30min — DONE S15
- ✅ **I2** Calendar buton "Azi" — DONE S16
- ✅ **I3** Recolta comparatie multi-an (selector an) — DONE S16
- ✅ **I4** Sync timestamp vizibil (timp relativ) — DONE S16
- ✅ **I5** authFetch() retry backoff — DONE S15
- ✅ **I6** Lightbox swipe gesture + tastatura + counter — DONE S16
- ✅ **I7** Species history buton "Adauga interventie" — DONE S16
- ✅ **I8** Stats selector an + total kg recolta — DONE S16
- ✅ **I9** generateReport() butoane Copiaza + Printeaza — DONE S15
- ✅ **I10** printFisa() popup blocker check — DONE

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
- ✅ **P3-6** Keyboard shortcuts (J/C/M/K/?/Esc) + help overlay — DONE S17
- ✅ **P3-7** localStorage Quota Monitor (warning >80%) — DONE S17

### FAZA 7 — Strategic / Viitor
- 🔵 **T1/S12** Offline Queue delete/edit + Background Sync API
- 🔵 **T2/S14** Rate limiting Redis-backed (distribuit)
- 🔵 **T5/S15** Teste unitare vitest

### FAZA 8 — Noi (din analiza runda 8) — v8
- ✅ **V1** renderStats() — Recolta kg per specie vizuala + comparatie ani
- ✅ **V2** injectSpeciesHistory() — Interval de la ultimul tratament + warning
- ⬜ **V3** submitDiagnose() — Buton "Calculeaza doza" post-diagnostic
- ✅ **V4** addJurnalEntry() — Warning interval minim intre tratamente
- ⬜ **V5** generateReport() — Invalidare cache la adaugare jurnal
- ✅ **V6** loadGallery() — Data upload vizibila + sortare cronologica
- ⬜ **N1** PHI Calculator — Alerta pauza securitate inainte de recoltare
- ⬜ **N2** Spray Window 7 zile — Calendar cu zile optime stropire din prognoza
- ⬜ **N3** Stoc Produse — Inventar produse fitosanitare cu cantitati
- ⬜ **N4** Cost per tratament — Camp cost in jurnal + sumar cheltuieli
- ⬜ **N5** Timeline Specie — Vedere cronologica integrata foto+jurnal+diagnose
- ⬜ **N6** Import CSV Jurnal — Import din Excel/CSV
- ⬜ **N7** Push Notifications — Inghet + tratamente (iOS 16.4+)
- ✅ **T6** Groq Llama 4 upgrade — Scout/Maverick mai rapid
- ✅ **T7** Report cache invalidation — Reset TTL la jurnal nou
- ✅ **T8** Meteo deduplicare request — Nu refetch < 5 min
- ⬜ **T9** Manifest PNG icons — iOS nu suporta SVG maskable pe toate versiunile

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

# PARTEA I — IMBUNATATIRI FUNCTII EXISTENTE

---

### 1. `renderStats()` — Recolta kg per specie vizuala

**Fisier:** `public/index.html` — linia ~10022
**Problema actuala:** Sectiunea de statistici afiseaza `Total: X kg` ca text simplu la sfarsit. Nu exista breakdown per specie, nu se poate vedea care specie a produs cel mai mult, nu exista comparatie vizuala intre ani.

**Imbunatatire propusa:**
- Adauga un grafic cu bare orizontale pentru kg recoltati per specie in anul selectat
- Afiseaza speciile sortate descrescator dupa productie
- Bara colorata proportional cu cel mai productiv an ca referinta
- Afiseaza numarul de recoltari + kg total per specie

**Exemplu implementare** (adauga in `renderStats()` dupa calculul `recoltaKg`):

```javascript
// Adauga dupa linia: var recoltaKg = ...
var recoltaPerSpecie = {};
yearEntries.filter(function(e){ return e.type === 'recoltare' && e.kg > 0; }).forEach(function(e) {
  var sp = e.species || 'necunoscut';
  if (!recoltaPerSpecie[sp]) recoltaPerSpecie[sp] = { kg: 0, count: 0 };
  recoltaPerSpecie[sp].kg += e.kg || 0;
  recoltaPerSpecie[sp].count++;
});
var maxKg = Math.max.apply(null, Object.values(recoltaPerSpecie).map(function(v){ return v.kg; }).concat([1]));
var recoltaSpecieHTML = Object.entries(recoltaPerSpecie)
  .sort(function(a,b){ return b[1].kg - a[1].kg; })
  .map(function(p) {
    var spName = SPECIES[p[0]] || p[0];
    var pct = Math.round(p[1].kg / maxKg * 100);
    return '<div style="margin-bottom:7px;">' +
      '<div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:2px;">' +
        '<span>' + escapeHtml(spName) + '</span>' +
        '<span style="color:var(--accent);font-weight:700;">' + p[1].kg.toFixed(1) + ' kg</span>' +
      '</div>' +
      '<div style="height:12px;background:var(--bg-surface);border-radius:4px;overflow:hidden;">' +
        '<div style="width:' + pct + '%;height:100%;background:var(--accent);border-radius:4px;transition:width 0.5s;"></div>' +
      '</div>' +
    '</div>';
  }).join('');

// Adauga in return-ul final, dupa graficul pe luna:
// ... + (recoltaSpecieHTML ? '<h3 style="margin:14px 0 8px;font-size:0.9rem;">Recolta per specie (' + selectedYear + ')</h3>' + recoltaSpecieHTML : '')
```

**Complexitate:** Mica | **Impact:** Mediu — fermierul vede imediat care specii sunt mai productive

---

### 2. `injectSpeciesHistory()` — Interval de la ultimul tratament + warning

**Fisier:** `public/index.html` — linia ~10088
**Problema actuala:** Afiseaza ultimele 8 interventii per specie, dar nu arata cat timp a trecut de la ultimul tratament. Un fermier vrea sa stie instant "Am mai stropit acum 5 zile, pot sa stropesc din nou?". Intervalul minim intre tratamente (7-14 zile) nu e verificat nicaieri.

**Imbunatatire propusa:**
- Adauga un "Interval de la ultimul tratament: X zile" deasupra listei
- Coloreaza in rosu daca < 7 zile, galben 7-10 zile, verde > 10 zile
- Afiseaza tipul ultimului tratament (ex: "Tratament fitosanitar acum 5 zile")

**Exemplu implementare** (inlocuire sectiune header in `injectSpeciesHistory()`):

```javascript
// Adauga inainte de history.map(...)
var lastTreatment = history.find(function(e){ return e.type === 'tratament'; });
var intervalHtml = '';
if (lastTreatment && lastTreatment.date) {
  var daysSince = Math.floor((Date.now() - new Date(lastTreatment.date)) / 86400000);
  var color = daysSince < 7 ? 'var(--danger)' : daysSince < 10 ? 'var(--warning)' : 'var(--accent)';
  var msg = daysSince < 7
    ? '⚠️ Ultimul tratament acum ' + daysSince + ' zile — interval minim 7 zile nerespect!'
    : '✓ Ultimul tratament acum ' + daysSince + ' zile';
  intervalHtml = '<div style="padding:6px 10px;border-radius:8px;background:var(--bg-surface);border-left:3px solid ' + color + ';font-size:0.8rem;color:' + color + ';margin-bottom:8px;">' + msg + '</div>';
}
// Adauga intervalHtml la inceputul section-body
```

**Complexitate:** Mica | **Impact:** Mare — previne aplicare produse la interval prea scurt (risc fitotoxicitate)

---

### 3. `submitDiagnose()` — Buton "Calculeaza doza" post-diagnostic

**Fisier:** `public/index.html` — linia ~10310
**Problema actuala:** Dupa ce AI-ul diagnosticheaza "Rapan — Dithane M-45 0.2%", utilizatorul trebuie sa inchida modalul, sa deschida calculatorul, sa caute manual produsul. Fluxul e intrerupt. Este cel mai frecvent workflow din aplicatie (diagnostic → tratament).

**Imbunatatire propusa:**
- Dupa afisarea diagnosticului, adauga sub butonul "Copiaza" un buton "Adauga tratament in jurnal"
- Click deschide modalul de jurnal cu data = azi, tip = tratament, nota pre-populata cu "Tratament dupa diagnostic AI: [prima linie din diagnostic]"
- Permite fermierului sa completeze/editeze inainte de salvare

**Exemplu implementare** (adauga in `submitDiagnose()`, dupa afisarea rezultatului):

```javascript
// Dupa: document.getElementById('diagCopyRow').style.display = 'block';
var addTreatBtn = document.getElementById('diagAddTreatment');
if (!addTreatBtn) {
  addTreatBtn = document.createElement('div');
  addTreatBtn.id = 'diagAddTreatment';
  addTreatBtn.style.cssText = 'margin-top:8px;text-align:right;';
  document.getElementById('diagCopyRow').parentNode.appendChild(addTreatBtn);
}
var diagText = (document.getElementById('diagResult').textContent || '').split('\n')[0].substring(0, 120);
addTreatBtn.innerHTML = '<button class="btn btn-primary" style="font-size:0.8rem;padding:6px 14px;" ' +
  'onclick="closeModal(\'diagnose\');openModal(\'jurnal\');" ' +
  'data-note="' + escapeHtml('Tratament dupa diagnostic AI: ' + diagText) + '">' +
  '+ Adauga tratament in jurnal</button>';
addTreatBtn.style.display = 'block';
// Event listener pe buton pentru pre-populare nota
addTreatBtn.querySelector('button').addEventListener('click', function() {
  setTimeout(function() {
    var noteEl = document.getElementById('jurnalNote');
    var typeEl = document.getElementById('jurnalType');
    if (noteEl) noteEl.value = addTreatBtn.querySelector('button').dataset.note;
    if (typeEl) typeEl.value = 'tratament';
  }, 200);
});
```

**Complexitate:** Mica | **Impact:** Mare — cel mai frecvent flux (diagnoza → tratament) devine continuu

---

### 4. `addJurnalEntry()` — Warning interval minim intre tratamente

**Fisier:** `public/index.html` — linia ~9425
**Problema actuala:** Nu exista nicio validare. Fermierul poate adauga "Tratament Dithane" in 3 zile consecutive accidental (re-introdus de doua ori sau greseala). Fungicidele au interval minim 7-14 zile, insecticidele 10-21 zile.

**Imbunatatire propusa:**
- La salvare tip=tratament, verifica daca in ultimele 5 zile exista deja un tratament inregistrat
- Daca da, afiseaza un toast warning (nu blocant) cu "Atentie: ai mai inregistrat un tratament acum X zile"
- Utilizatorul poate ignora si salva oricum

**Exemplu implementare** (adauga in `addJurnalEntry()` inainte de `saveJurnalEntries`):

```javascript
// Adauga inainte de var entries = getJurnalEntries(); (la final de addJurnalEntry)
if (type === 'tratament') {
  var existing = getJurnalEntries();
  var newDate = new Date(date);
  var recentTreatment = existing.find(function(e) {
    if (e.type !== 'tratament') return false;
    var daysDiff = Math.abs((newDate - new Date(e.date)) / 86400000);
    return daysDiff < 7 && daysDiff > 0;
  });
  if (recentTreatment) {
    var daysDiff = Math.round(Math.abs((newDate - new Date(recentTreatment.date)) / 86400000));
    showToast('⚠️ Ai mai inregistrat un tratament acum ' + daysDiff + ' zile. Intervalul recomandat e 7-14 zile.', 'warning');
    // Nu blocam — utilizatorul poate continua
  }
}
```

**Complexitate:** Mica | **Impact:** Mediu — previne erori de inregistrare duplicata

---

### 5. `generateReport()` + `report.js` — Invalidare cache la jurnal nou

**Fisier:** `public/index.html` linia ~10652 + `api/report.js`
**Problema actuala:** Raportul e cacheat 1h in Redis (implementat S17). Daca adaugi 10 intrari in jurnal si generezi imediat raportul, primesti versiunea veche (din cache). Cache-ul nu stie ca s-au adaugat date noi.

**Imbunatatire propusa:**
- Salveaza in Redis `livada:journal:last-update` timestamp la fiecare sync
- In `report.js`, compara `generatedAt` cu `journal:last-update` — daca raportul e mai vechi, ignora cache-ul
- Pe frontend, adauga un indicator "(din cache)" sau "(actualizat)" langa raport

**Exemplu implementare in `api/report.js`** (adauga dupa `const cached = await kv.get(cacheKey)`):

```javascript
// Dupa: if (cached && cached.generatedAt) {
const journalLastUpdate = await kv.get('livada:journal:last-update').catch(() => 0);
const cacheIsStale = journalLastUpdate && cached.generatedAt < journalLastUpdate;
if (!cacheIsStale && ageMs < 3600_000) {
  // cache valid
  return Response.json({ ...cached, _cached: true }, { headers: corsHeaders(req) });
}
// ...
```

**In `api/journal.js`**, adauga la POST success:
```javascript
await kv.set('livada:journal:last-update', Date.now());
```

**Complexitate:** Mica | **Impact:** Mediu — raportul reflecta intotdeauna datele reale

---

### 6. `loadGallery()` — Data upload si sortare cronologica

**Fisier:** `public/index.html` — linia ~10121
**Problema actuala:** Fotografiile nu au data vizibila, sunt afisate in ordinea returnata de API (nedeterminista). Fermierul nu poate corela "poza cu pete din 15 martie" cu "aplicat Dithane pe 16 martie". Galeria nu are nicio referinta temporala.

**Imbunatatire propusa:**
- Afiseaza data extrasă din URL-ul Blob (care contine timestamp) sau din metadata
- Grupare optionala pe luna (header "Aprilie 2026 — 3 poze")
- Counter vizibil: "3 poze" deasupra galeriei

**Exemplu implementare** — extragere data din URL Blob si afisare:

```javascript
// In loadGallery(), inlocuire render photos:
grid.innerHTML = '<div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:8px;">' +
  photos.length + ' ' + (photos.length === 1 ? 'fotografie' : 'fotografii') + '</div>' +
  photos.map(function(p) {
    // Vercel Blob URL contine timestamp in path: .../foto_1712345678901.jpg
    var ts = null;
    var m = (p.url || '').match(/[_-](\d{13})/);
    if (m) ts = new Date(parseInt(m[1]));
    var dateLabel = ts && !isNaN(ts) ? ts.toLocaleDateString('ro-RO', {day:'2-digit', month:'short', year:'2-digit'}) : '';
    return '<div class="gal-item">' +
      '<img src="' + escapeHtml(p.url) + '" alt="Foto livada" loading="lazy">' +
      (dateLabel ? '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:0.65rem;padding:2px 4px;text-align:center;">' + dateLabel + '</div>' : '') +
      '<button class="gal-del" data-url="' + escapeHtml(p.url) + '">✕</button>' +
      '</div>';
  }).join('');
// Nota: .gal-item trebuie sa aiba position:relative in CSS
```

**CSS necesar:**
```css
.gal-item { position: relative; }
```

**Complexitate:** Mica | **Impact:** Mediu — galeria devine un istoric vizual cu referinta temporala

---

### 7. `renderCalendar()` — Marcaj zile cu interventii din jurnal

**Fisier:** `public/index.html` — linia ~9608
**Problema actuala:** Calendarul afiseaza fazele fenologice si evenimentele de tratament, dar nu marcheaza vizual zilele in care fermierul A EFECTUAT tratamente (din jurnal). Exista `showDayJournal(day)` pentru click, dar fara indicatori vizuali pe zilele cu interventii.

**Imbunatatire propusa:**
- Adauga un dot verde pe zilele care au interventii in jurnal (luna curenta)
- Dot rosu/portocaliu pentru tratamente, verde pentru observatii, albastru pentru recoltare
- Afiseaza numarul de interventii in colt daca > 1

**Exemplu implementare** (adauga in `renderCalendar()`, la construirea grid-ului):

```javascript
// Adauga inainte de renderCalendar, calcul map de interventii
var journalByDay = {};
var monthStr = String(calYear) + '-' + String(calMonth + 1).padStart(2, '0');
getJurnalEntries().forEach(function(e) {
  if ((e.date || '').startsWith(monthStr)) {
    var day = parseInt(e.date.split('-')[2]);
    if (!journalByDay[day]) journalByDay[day] = [];
    journalByDay[day].push(e.type);
  }
});

// In constructia fiecarui .cal-day, adauga:
var dayInterventions = journalByDay[dayNum] || [];
var dotColor = dayInterventions.includes('tratament') ? 'var(--danger)'
  : dayInterventions.includes('recoltare') ? 'var(--accent)'
  : dayInterventions.length > 0 ? 'var(--info)' : '';
var dotHtml = dotColor
  ? '<span style="display:block;width:6px;height:6px;border-radius:50%;background:' + dotColor + ';margin:2px auto 0;"></span>'
  : '';
// Adauga dotHtml in HTML-ul celulei de calendar
```

**Complexitate:** Mica | **Impact:** Mediu — calendarul devine un jurnal vizual lunar

---

# PARTEA II — FUNCTII NOI

---

### 1. PHI Calculator — Alerta pauza securitate inainte de recoltare

**Descriere:** La adaugarea unei interventii de tip "recoltare" in jurnal, sistemul verifica daca exista tratamente fitosanitare recente si avertizeaza daca Preharvest Interval (PHI/pauza securitate) nu e respectat. Fiecare produs are o pauza de securitate (7-28 zile) obligatorie.

**De ce e util:** Fermierii pot accidental recolta dupa un tratament aplicat cu 5 zile inainte, cand produsul nu s-a descompus. Asta e un risc alimentar si legal. Aplicatia poate preveni asta automat.

**Complexitate:** Mica | **Impact:** Maxim — siguranta alimentara, conformitate legala

**Exemplu implementare** (in `addJurnalEntry()`, la type === 'recoltare'):

```javascript
// Map PHI zile pentru produse comune (adauga ca constanta globala)
var PHI_DAYS = {
  'dithane': 28, 'score': 14, 'chorus': 7, 'switch': 7,
  'topsin': 14, 'mospilan': 7, 'fastac': 14, 'karate': 14,
  'decis': 21, 'confidor': 14, 'calypso': 14, 'movento': 14,
  'zeama bordeleza': 28, 'copper': 28, 'oxiclorura': 14,
  'thiovit': 3, 'sulf': 3, 'tratament': 10  // default
};

// Adauga in addJurnalEntry(), cand type === 'recoltare'
if (type === 'recoltare') {
  var entries = getJurnalEntries();
  var harvestDate = new Date(date);
  var phiViolations = [];
  entries.filter(function(e) {
    return e.type === 'tratament' && e.date;
  }).forEach(function(e) {
    var treatDate = new Date(e.date);
    var daysDiff = Math.round((harvestDate - treatDate) / 86400000);
    if (daysDiff < 0 || daysDiff > 30) return;
    // Cauta produsul in nota
    var noteL = (e.note || '').toLowerCase();
    var phi = 10; // default
    for (var prod in PHI_DAYS) {
      if (noteL.includes(prod)) { phi = PHI_DAYS[prod]; break; }
    }
    if (daysDiff < phi) {
      phiViolations.push('Tratament din ' + e.date + ' (pauza: ' + phi + ' zile, au trecut: ' + daysDiff + ' zile)');
    }
  });
  if (phiViolations.length > 0) {
    var ok = confirm('⚠️ ATENTIE PAUZA SECURITATE!\n\n' + phiViolations.join('\n') + '\n\nSigur vrei sa inregistrezi recoltarea?');
    if (!ok) return;
  }
}
```

---

### 2. Spray Window 7 zile — Zile optime stropire din prognoza

**Descriere:** Un nou card pe tab-ul "Azi" sau in modal Meteo afiseaza urmatorii 7 zile cu un scor de aptitudine pentru stropire calculat din prognoza Open-Meteo. Fermierul vede dintr-o privire "Sambata si Duminica sunt ideale pentru tratament".

**De ce e util:** Fermierii planifica tratamentele cu 1-2 zile inainte. In prezent, tab-ul Azi arata prognoza 3 zile dar fara un "scor" clar. Extinderea la 7 zile cu highlighting "Ziua recomandata" economiseste timp real.

**Complexitate:** Medie | **Impact:** Mare — planificare tratamente mai eficienta

**Exemplu implementare** (noua functie adaugata in initDashboardAzi sau ca sectiune separata):

```javascript
async function renderSprayWindow() {
  var container = document.getElementById('sprayWindow');
  if (!container) return;
  try {
    var res = await fetchWithTimeout(
      'https://api.open-meteo.com/v1/forecast?latitude=' + LIVADA_LAT + '&longitude=' + LIVADA_LON +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean,weather_code' +
      '&timezone=Europe/Bucharest&forecast_days=7', {}, 8000
    );
    if (!res.ok) return;
    var d = await res.json();
    var ZILE = ['Du','Lu','Ma','Mi','Jo','Vi','Sa'];
    var html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">';
    for (var i = 0; i < 7; i++) {
      var dt = new Date(d.daily.time[i] + 'T12:00');
      var tMax = d.daily.temperature_2m_max[i];
      var tMin = d.daily.temperature_2m_min[i];
      var prec = d.daily.precipitation_sum[i];
      var wind = d.daily.wind_speed_10m_max[i];
      var hum = d.daily.relative_humidity_2m_mean[i];
      var score = calculateSprayScore((tMax + tMin) / 2, wind, prec, hum);
      var sl = sprayLabel(score);
      var isToday = d.daily.time[i] === new Date().toISOString().split('T')[0];
      html += '<div style="text-align:center;padding:6px 2px;border-radius:8px;' +
        (score >= 80 ? 'background:rgba(106,191,105,0.15);border:1px solid var(--accent);' :
         score >= 50 ? 'background:var(--bg-surface);' : 'opacity:0.5;') +
        (isToday ? 'outline:2px solid var(--accent);' : '') + '">' +
        '<div style="font-size:0.65rem;color:var(--text-dim);">' + ZILE[dt.getDay()] + '</div>' +
        '<div style="font-size:1rem;">' + wmoEmoji(d.daily.weather_code[i]) + '</div>' +
        '<div style="font-size:0.7rem;">' + Math.round(tMax) + '°</div>' +
        '<div class="' + sl.cls + '" style="font-size:0.6rem;font-weight:700;margin-top:2px;">' + score + '</div>' +
        '</div>';
    }
    html += '</div><p style="font-size:0.68rem;color:var(--text-dim);margin-top:6px;">Scor stropire 0-100 (verde=ideal)</p>';
    container.innerHTML = html;
  } catch(e) { container.innerHTML = '<p style="font-size:0.78rem;color:var(--text-dim);">Indisponibil offline</p>'; }
}
```

**HTML necesar** (in sectiunea "Ce fac azi?"):
```html
<div class="section">
  <h2 class="section-title">🌤️ Ferestre Stropire — 7 Zile</h2>
  <div class="section-body">
    <div id="sprayWindow"><p style="color:var(--text-dim);font-size:0.8rem;">Se incarca...</p></div>
  </div>
</div>
```

---

### 3. Stoc Produse Fitosanitare

**Descriere:** O sectiune simpla de management stoc in care fermierul noteaza ce produse are, in ce cantitate, si data de expirare. La adaugarea unui tratament in jurnal, poate "scade" din stoc cantitatea folosita. Alert la produse < 20% stoc sau expirate.

**De ce e util:** Fermierii cumpara produse en-gros si uita ce au. Aplicatia stie ce tratamente s-au facut (jurnal) dar nu stie "Mai am Dithane?". Integrarea cu jurnalul face aplicatia un tool complet de gestiune.

**Complexitate:** Medie | **Impact:** Mare — elimina surpriza "am ramas fara produs in mijlocul sezonului"

**Exemplu implementare:**

```javascript
// Stocare localStorage
var STOC_KEY = 'livada-stoc-produse';

function getStoc() {
  try { return JSON.parse(localStorage.getItem(STOC_KEY) || '[]'); } catch(e) { return []; }
}
function saveStoc(stoc) {
  localStorage.setItem(STOC_KEY, JSON.stringify(stoc));
}
function addProdus(name, cantitate, unitate, dataExpirare) {
  var stoc = getStoc();
  stoc.push({ id: Date.now(), name: name, cantitate: cantitate, unitate: unitate || 'g', dataExpirare: dataExpirare || '' });
  saveStoc(stoc);
  renderStoc();
}
function renderStoc() {
  var container = document.getElementById('stocList');
  if (!container) return;
  var stoc = getStoc();
  if (stoc.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim);font-size:0.82rem;">Niciun produs adaugat.</p>';
    return;
  }
  var today = new Date();
  container.innerHTML = stoc.map(function(p) {
    var expired = p.dataExpirare && new Date(p.dataExpirare) < today;
    var expSoon = p.dataExpirare && (new Date(p.dataExpirare) - today) < 30 * 86400000;
    var borderColor = expired ? 'var(--danger)' : expSoon ? 'var(--warning)' : 'var(--border)';
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid ' + borderColor + ';border-radius:8px;margin-bottom:6px;">' +
      '<div style="flex:1;">' +
        '<div style="font-size:0.85rem;font-weight:600;">' + escapeHtml(p.name) + '</div>' +
        '<div style="font-size:0.75rem;color:var(--text-dim);">' + p.cantitate + ' ' + p.unitate +
          (p.dataExpirare ? ' · Exp: ' + p.dataExpirare : '') +
          (expired ? ' ⚠️ EXPIRAT' : '') + '</div>' +
      '</div>' +
      '<button onclick="deleteStocProdus(' + p.id + ')" style="background:none;border:none;color:var(--danger);font-size:1.1rem;cursor:pointer;padding:4px;">✕</button>' +
    '</div>';
  }).join('');
  // Alert stoc redus
  var expiredCount = stoc.filter(function(p) { return p.dataExpirare && new Date(p.dataExpirare) < today; }).length;
  if (expiredCount > 0) showToast('⚠️ ' + expiredCount + ' produse din stoc au expirat!', 'warning');
}
function deleteStocProdus(id) {
  var stoc = getStoc().filter(function(p){ return p.id !== id; });
  saveStoc(stoc);
  renderStoc();
}
```

---

### 4. Cost per Tratament — Camp cost in jurnal

**Descriere:** Adauga un camp optional "Cost (RON)" la intrarea de jurnal. In statistici, afiseaza cheltuielile totale per sezon si per tip de interventie (cat s-a cheltuit pe fungicide, insecticide, fertilizare etc.).

**De ce e util:** O livada semi-comerciala cu 100 pomi si 20 specii are costuri semnificative de intretinere. Fara tracking, e imposibil sa stii daca e profitabila. Datele sunt deja colectate (jurnal), lipseste doar campul cost.

**Complexitate:** Mica | **Impact:** Mare — vizibilitate financiara completa

**Exemplu implementare** — adaugare camp cost in form jurnal:

```html
<!-- Adauga dupa textarea jurnalNote in modal-jurnal -->
<div id="costField" style="margin-top:8px;">
  <label for="jurnalCost" style="font-size:0.8rem;color:var(--text-dim);">Cost (RON) — optional</label>
  <input type="number" id="jurnalCost" placeholder="0.00" min="0" step="0.01"
    style="padding:6px 10px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.85rem;width:100%;">
</div>
```

```javascript
// In addJurnalEntry(), adauga campul cost la entry:
var cost = parseFloat(document.getElementById('jurnalCost')?.value) || 0;
if (cost > 0) entry.cost = cost;

// In renderStats(), adauga sumar cheltuieli:
var totalCost = yearEntries.reduce(function(sum, e){ return sum + (e.cost || 0); }, 0);
var costByType = {};
yearEntries.filter(function(e){ return e.cost > 0; }).forEach(function(e){
  costByType[e.type] = (costByType[e.type] || 0) + e.cost;
});
var costHtml = totalCost > 0
  ? '<h3 style="margin:14px 0 8px;font-size:0.9rem;">💰 Cheltuieli (' + selectedYear + ')</h3>' +
    Object.entries(costByType).sort(function(a,b){ return b[1]-a[1]; }).map(function(p){
      return '<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:3px 0;border-bottom:1px solid var(--border);">' +
        '<span>' + p[0] + '</span><span style="color:var(--accent);font-weight:700;">' + p[1].toFixed(2) + ' RON</span></div>';
    }).join('') +
    '<div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:700;margin-top:6px;padding-top:6px;border-top:2px solid var(--border);">' +
    '<span>TOTAL</span><span style="color:var(--accent);">' + totalCost.toFixed(2) + ' RON</span></div>'
  : '';
```

---

### 5. Timeline Specie — Vedere cronologica integrata

**Descriere:** O noua sectiune "Timeline" per specie care combina in ordine cronologica: fotografii din galerie + interventii din jurnal + diagnostice AI salvate. Fermierul vede povestea completa a unui pom pe axa timpului: "Martie: poza cu pete → Diagnostic: rapan → Aplicat Dithane → Aprilie: poza frunze sanatoase".

**De ce e util:** In prezent galeria, jurnalul si diagnosticul sunt in 3 locuri separate. Corelarea manuala e imposibila. Timeline-ul transforma aplicatia dintr-un tool de inregistrare intr-un tool de analiza.

**Complexitate:** Medie | **Impact:** Mare — vizibilitate completa evolutie specie

**Exemplu implementare:**

```javascript
async function renderSpeciesTimeline(speciesId, container) {
  var prev = document.getElementById('sp-timeline');
  if (prev) prev.remove();
  var spName = (SPECIES[speciesId] || '').toLowerCase();

  // Colecteaza interventii din jurnal
  var journalItems = getJurnalEntries().filter(function(e) {
    return (e.note || '').toLowerCase().includes(spName) || e.species === speciesId;
  }).map(function(e) {
    return { date: e.date, type: 'jurnal', icon: '📋', label: e.type, desc: e.note, id: e.id };
  });

  // Combina si sorteaza
  var allItems = journalItems.sort(function(a, b) { return b.date.localeCompare(a.date); });
  if (allItems.length === 0) return;

  var div = document.createElement('div');
  div.id = 'sp-timeline';
  div.className = 'section';
  div.style.marginTop = '12px';
  div.innerHTML = '<h2 class="section-title" style="cursor:default;">🕐 Timeline</h2>' +
    '<div class="section-body">' +
    allItems.map(function(item) {
      return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">' +
        '<div style="font-size:1.2rem;flex-shrink:0;">' + item.icon + '</div>' +
        '<div>' +
          '<div style="font-size:0.72rem;color:var(--text-dim);">' + escapeHtml(item.date) + ' · ' + escapeHtml(item.label) + '</div>' +
          '<div style="font-size:0.82rem;margin-top:2px;">' + escapeHtml((item.desc || '').substring(0, 100)) + '</div>' +
        '</div></div>';
    }).join('') +
    '</div>';
  container.appendChild(div);
}
// Apeleaza din injectSpeciesTools() dupa injectSpeciesHistory()
```

---

### 6. Import CSV Jurnal

**Descriere:** Buton "Import CSV" in modalul de jurnal care permite incarcarea unui fisier CSV (ex: export Excel) cu coloanele Data, Tip, Nota, Specie, Kg si importarea automata a interventiilor.

**De ce e util:** Roland sau un eventual ajutor pot tine evidenta tratamentelor in Excel si sa le importe bulk in aplicatie. De asemenea, este util pentru migrarea datelor dintr-un alt sistem.

**Complexitate:** Medie | **Impact:** Mediu

**Exemplu implementare:**

```javascript
function importCSV(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var text = e.target.result;
      var lines = text.split('\n').filter(function(l){ return l.trim(); });
      if (lines.length < 2) { showToast('CSV gol sau invalid', 'error'); return; }
      // Detecteaza daca prima linie e header
      var startIdx = lines[0].toLowerCase().includes('data') ? 1 : 0;
      var imported = 0, errors = 0;
      var entries = getJurnalEntries();
      var existingDates = new Set(entries.map(function(e){ return e.date + e.note; }));
      lines.slice(startIdx).forEach(function(line) {
        // Suporta separator , si ;
        var sep = line.includes(';') ? ';' : ',';
        var parts = line.split(sep).map(function(p){ return p.trim().replace(/^"|"$/g,''); });
        var date = parts[0], type = parts[1] || 'observatie', note = parts[2] || '';
        var species = parts[3] || '', kg = parseFloat(parts[4]) || 0;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !note) { errors++; return; }
        var key = date + note;
        if (existingDates.has(key)) return; // skip duplicat
        var entry = { id: Date.now() + imported, date: date, type: type, note: note };
        if (species) entry.species = species;
        if (kg > 0) entry.kg = kg;
        entries.push(entry);
        existingDates.add(key);
        imported++;
      });
      if (imported > 0) {
        entries.sort(function(a,b){ return b.id - a.id; });
        saveJurnalEntries(entries);
        renderJurnal();
        syncJournal();
        showToast('✓ Importat ' + imported + ' interventii' + (errors > 0 ? ' (' + errors + ' erori)' : ''));
      } else {
        showToast('Nicio intrare noua de importat' + (errors > 0 ? ' (' + errors + ' linii invalide)' : ''), 'warning');
      }
    } catch(err) {
      showToast('Eroare la parsarea CSV: ' + err.message, 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
  input.value = ''; // reset pentru re-upload
}
```

**HTML necesar** (adauga in butoanele din modal-jurnal):
```html
<button class="btn btn-secondary" style="padding:4px 10px;font-size:0.72rem;"
  onclick="document.getElementById('csvImportInput').click()">⬆ Import CSV</button>
<input type="file" id="csvImportInput" accept=".csv,text/csv" style="display:none" onchange="importCSV(this)">
```

---

### 7. Push Notifications — Inghet + Tratamente urgente

**Descriere:** Implementare Web Push Notifications pentru alertele de inghet (deja detectate de meteo-cron) si pentru remindere tratamente. Functioneaza pe iOS 16.4+ (PWA instalata), Android si desktop.

**De ce e util:** In prezent, alertele de inghet sunt vizibile doar cand deschizi aplicatia. Dar un inghet prognozat la 3 AM necesita actiune seara — fermierul trebuie notificat. Push notifications rezolva exact asta.

**Complexitate:** Mare | **Impact:** Maxim — prima linie de aparare impotriva ingereatei

**Exemplu implementare — sw.js** (adauga handler push):

```javascript
// In sw.js — adauga la final:
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Livada Mea', {
      body: data.body || 'Notificare noua',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'livada-alert',
      renotify: true,
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
```

**Exemplu implementare — index.html** (request permission + subscribe):

```javascript
async function requestPushPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    showToast('Push notifications nu sunt suportate pe acest dispozitiv', 'warning');
    return;
  }
  var perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    showToast('Notificarile au fost refuzate. Le poti activa din setarile browserului.', 'warning');
    return;
  }
  showToast('✓ Notificari activate! Vei fi alertat la inghet si tratamente urgente.');
  localStorage.setItem('livada-push-enabled', '1');
}
```

**Nota:** Necesita VAPID keys si un nou API endpoint `/api/push-subscribe` pentru stocarea subscription in Redis. Aceasta e implementarea de baza — partea de server necesita ~2h suplimentar.

---

# PARTEA III — IMBUNATATIRI TEHNICE

---

### 1. Groq Llama 4 — Upgrade modele

**Problema:** `llama-3.3-70b-versatile` e modelul curent. Groq a lansat `llama-4-scout` (mai rapid, context 10M) si `llama-4-maverick` (mai capabil). Free tier disponibil conform documentatiei Groq.
**Solutie:** Inlocuire in `api/ask.js` si `api/report.js`: primary → `meta-llama/llama-4-maverick-17b-128e-instruct`, fallback → `llama-3.3-70b-versatile`.
**Complexitate:** Mica | **Impact:** Performanta — raspunsuri mai rapide si mai precise

---

### 2. `api/photos.js` — Testare Edge Runtime

**Problema:** `photos.js` ruleaza pe Node.js cu `maxDuration: 60s`. Pe Vercel Hobby, Node.js are 10s timeout pentru executie (60s e pentru plan Pro/Enterprise). Edge Runtime nu are aceasta limita si e mai rapid.
**Solutie:** Testeaza upload Blob din Edge Runtime. Vercel Blob suporta Edge Runtime incepand cu versiunea 2.x — `@vercel/blob` 2.3.2 e compatibil. Daca uploadul functioneaza, eliminam dependenta Node.js.
**Complexitate:** Medie | **Impact:** Stabilitate — elimina riscul timeout upload pe Hobby

---

### 3. Meteo request deduplicare — Nu refetch < 5 min

**Problema:** `fetchMeteo()` si `initDashboardAzi()` fac amandoua request la Open-Meteo independent. Daca utilizatorul deschide modalul Meteo si tab-ul Azi in interval scurt, se fac 2 request-uri identice la Open-Meteo in cateva secunde.
**Solutie:** Cache in-memory (nu localStorage) cu TTL 5 minute:
```javascript
var _meteoCache = null, _meteoCacheTs = 0;
async function fetchMeteoWithCache() {
  if (_meteoCache && Date.now() - _meteoCacheTs < 300000) return _meteoCache;
  var res = await fetchWithTimeout('https://api.open-meteo.com/v1/forecast?...');
  _meteoCache = await res.json();
  _meteoCacheTs = Date.now();
  return _meteoCache;
}
```
**Complexitate:** Mica | **Impact:** Performanta — reduce request-urile externe cu ~50%

---

### 4. Manifest — PNG icons pentru compatibilitate iOS completa

**Problema:** `manifest.json` contine un singur icon SVG cu `purpose: "any maskable"`. iOS Safari (< 16) nu suporta SVG icons in manifest si poate afisa o icoana alba la install. Android accepta SVG dar unele launcher-e vechi nu.
**Solutie:** Genereaza PNG la 192x192 si 512x512 din SVG (tool: `sharp`, `svgexport` sau manual). Adauga in `manifest.json`:
```json
"icons": [
  { "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" },
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
]
```
**Complexitate:** Mica | **Impact:** Compatibilitate — install PWA perfect pe toate platformele

---

### 5. `api/report.js` — Cache invalidation la jurnal nou

**Problema:** (detaliat la Imbunatatiri #5) — Cache 1h ignorat daca jurnal s-a actualizat.
**Solutie:** `livada:journal:last-update` timestamp in Redis, comparat cu `generatedAt`.
**Complexitate:** Mica | **Impact:** Calitate date — raportul reflecta intotdeauna jurnalul real

---

### 6. `api/journal.js` — Validare server-side dimensiune

**Problema:** `syncJournal()` trimite intregul jurnal la fiecare sync (POST cu body = JSON entries). Daca jurnalul creste la 500+ entries, payload-ul poate depasi limita Edge Runtime (4MB request body pe Vercel).
**Solutie:** Adauga validare in `api/journal.js`:
```javascript
const bodyText = await req.text();
if (bodyText.length > 3 * 1024 * 1024) {
  return Response.json({ error: 'Jurnal prea mare. Exporta si arhiveaza entries vechi.' }, { status: 413, headers: corsHeaders(req) });
}
```
**Complexitate:** Mica | **Impact:** Stabilitate — previne erori silentioase la jurnal mare

---

### 7. `calculateSprayScore()` — Integrare UV Index din meteo-cron

**Problema:** Scorul de stropire foloseste temp/wind/rain/humidity. De la S17, Redis contine si `uv_index` si `soil_moisture` per zi. Un UV index ridicat (>7) creste riscul de fitotoxicitate la stropire in amiaza. Soil moisture scazut indica necesitate irigare.
**Solutie:** Extinde functia sa accepte optional `uvIndex`:
```javascript
function calculateSprayScore(temp, wind, rain, humidity, uvIndex) {
  // ... codul existent ...
  if (uvIndex && uvIndex > 7 && temp > 20) score -= (uvIndex - 7) * 5; // fitotoxicitate amiaza
  return Math.max(0, Math.min(100, Math.round(score)));
}
```
**Complexitate:** Mica | **Impact:** Precizie — recomandari stropire mai exacte

---

### 8. Service Worker — Cache versioning robust

**Problema:** `STATIC_CACHE = 'livada-static-v1'` e hardcodat. La fiecare deploy, daca nu schimbi manual `v1` → `v2`, sw.js serveste assets vechi din cache pana expirace. Strategia Network-First pentru HTML evita problema principala, dar icon-urile pot ramane vechi.
**Solutie:** Genereaza automat cache name cu hash din data deploy:
```javascript
const BUILD_HASH = 'livada-static-20260406'; // Actualizat la fiecare deploy relevant
```
Sau mai elegant, importa din `APP_BUILD` care e deja calculat din `document.lastModified`.
**Complexitate:** Mica | **Impact:** Mentenanta — elimina cache stale dupa deploy

---

## SUMAR PRIORITATI

| Prioritate | # | Nume | Complexitate | Impact | Categorie |
|---|---|---|---|---|---|
| **P0 — URGENT** | V5 | Report cache invalidation la jurnal nou | Mica | Calitate | Backend |
| **P0 — URGENT** | T6 | Groq Llama 4 upgrade | Mica | Performanta | Backend |
| **P1 — IMPORTANT** | N1 | PHI Calculator pauza securitate | Mica | Maxim | Siguranta |
| **P1 — IMPORTANT** | V3 | Diagnostic → buton "Adauga tratament" | Mica | Mare | UX/Flow |
| **P1 — IMPORTANT** | V2 | Interval de la ultimul tratament | Mica | Mare | UX |
| **P1 — IMPORTANT** | V1 | Recolta kg per specie vizuala | Mica | Mediu | UX |
| **P1 — IMPORTANT** | N2 | Spray Window 7 zile | Medie | Mare | Feature |
| **P1 — IMPORTANT** | T8 | Meteo deduplicare request | Mica | Performanta | Tehnic |
| **P2 — VALOROS** | V4 | Warning interval minim tratamente | Mica | Mediu | UX |
| **P2 — VALOROS** | V6 | Galerie date upload + sortare | Mica | Mediu | UX |
| **P2 — VALOROS** | V7 | Calendar dots jurnal | Mica | Mediu | UX |
| **P2 — VALOROS** | N4 | Cost per tratament + sumar financiar | Mica | Mare | Feature |
| **P2 — VALOROS** | N6 | Import CSV jurnal | Medie | Mediu | Feature |
| **P2 — VALOROS** | T7 | Journal size validation server-side | Mica | Stabilitate | Tehnic |
| **P2 — VALOROS** | T9 | Manifest PNG icons | Mica | Compatibilitate | Tehnic |
| **P3 — STRATEGIC** | N3 | Stoc produse fitosanitare | Medie | Mare | Feature |
| **P3 — STRATEGIC** | N5 | Timeline specie integrata | Medie | Mare | Feature |
| **P3 — STRATEGIC** | T10 | calculateSprayScore + UV Index | Mica | Precizie | Tehnic |
| **P3 — STRATEGIC** | S10 | photos.js Edge Runtime testare | Medie | Stabilitate | Tehnic |
| **P4 — NICE-TO-HAVE** | N7 | Push Notifications (inghet + tratamente) | Mare | Maxim | Feature |
| **P4 — NICE-TO-HAVE** | T11 | SW cache versioning automat | Mica | Mentenanta | Tehnic |

---

## NOTE IMPLEMENTARE

1. **Single HTML constraint:** Toate modificarile frontend merg in `public/index.html`. Nu se creeaza fisiere JS separate.
2. **Storage pattern:** Date noi in localStorage cu prefix `livada-` (ex: `livada-stoc-produse`, `livada-costs`). Date sincronizate in Redis prin `api/journal.js` extins.
3. **Dependente intre recomandari:**
   - V5 (report cache) → necesita modificare si `api/journal.js` (adaugare `journal:last-update`)
   - N7 (push notifications) → necesita API route nou `/api/push-subscribe` + VAPID keys + modificare `sw.js`
   - N2 (spray window) → poate refolosi `calculateSprayScore()` existent fara modificari
   - N4 (cost tracker) → extinde `addJurnalEntry()` si `renderStats()` — nu necesita API nou
4. **Ce NU se schimba:** Arhitectura Edge Runtime, stack Groq+Gemini, structura localStorage, API routes existente (exceptie journal.js pentru V5), layout general HTML.
5. **Gemini 2.5-flash-lite:** Model non-confirmat oficial la data analizei — verifica disponibilitatea inainte de implementare. Alternativa sigura: `gemini-2.0-flash-lite` (confirmata disponibila).
6. **Rate limit Groq free tier:** La upgrade Llama 4, verifica noile limite — modelele noi pot avea RPM mai mici pe free tier.


---

---

# RECOMANDARI IMBUNATATIRI v9 — Analiza Runda 9

**Data:** 2026-04-07 | **Mod:** `/imbunatatiri noi` — exclusiv features noi
**Baza:** v8 (917 linii) + discovery complet cod sursa index.html (~11.750 linii) + API routes
**Features noi in v8 (de nu duplicat):** N1 PHI, N2 Spray Window, N3 Stoc produse, N4 Cost tracker, N5 Timeline, N6 Import CSV, N7 Push Notifications

---

## CHECKLIST RAPID — Faza 9

- ✅ **N8** GDD Calculator — Caldura acumulata + predictie fenologica
- ✅ **N9** Planner Saptamanal Integrat — 7 zile: meteo + tratamente + jurnal
- ✅ **N10** Risc Boala per Specie — Alerte specifice (monilioza, rapan, fainare)
- ✅ **N11** Chill Hours Tracker — Ore de frig acumulate Nov-Feb per specie
- ✅ **N12** Jurnal Vocal — Dictare nota via Web Speech API
- ✅ **N13** Comparator Specii — Calendare tratamente aliniate side-by-side
- ✅ **N14** Harta Livada Vizuala — Grid pomi clickabili cu stare sanatate
- ✅ **N15** Note per Pom Individual — Tracking per copac (100+ pomi)
- ✅ **N16** Tura Saptamanala — Checklist inspectie ghidata per specie/luna
- ✅ **N17** Raport Printabil per Specie — Fisa cultura cu date jurnal an curent

---

# PARTEA II — FUNCTII NOI (Runda 9)

---

### N8. GDD Calculator — Caldura acumulata si predictie fenologica

**Descriere:** Calculeaza Growing Degree Days (GDD) — suma caldurii utile acumulate de la 1 martie, folosind datele deja stocate in Redis (temp_min + temp_max per zi, disponibile via `/api/meteo-history`). Afiseaza GDD curent + milestones fenologice per specie activa (ex: "Cais: 143 GDD — Inflorire completata, Legarea fructelor in ~7-14 zile").

**De ce e util:** Roland are 20 specii cu ferestre de tratament diferite. GDD elimina ghicitul — in loc de "e luna mai, ar trebui sa stropesc" devine "caisul are 340 GDD, am 3-5 zile inainte de fructe mari, acum e momentul taierii in verde". Date disponibile ACUM in Redis — feature zero-cost, zero API nou.

**Complexitate:** Medie | **Impact:** Maxim — optimizeaza timing-ul tuturor interventiilor

**Exemplu implementare — JS in `public/index.html`:**

```javascript
// GDD: temp baza 10°C (standard pomicultura temperata)
// Formula: GDD_zi = max(0, (Tmax + Tmin)/2 - Tbase)
var GDD_BASE_TEMP = 10;

// Milestones fenologice orientative pentru clima continentala (Nadlac/Arad)
var GDD_MILESTONES = {
  cais: [
    { gdd: 80,   label: 'Dezmugurit',     icon: '🌱' },
    { gdd: 120,  label: 'Inflorire',       icon: '🌸' },
    { gdd: 170,  label: 'Cadere petale',   icon: '🍃' },
    { gdd: 230,  label: 'Legare fructe',   icon: '🔵' },
    { gdd: 700,  label: 'Recolta posibila',icon: '🍑' },
  ],
  piersic: [
    { gdd: 100,  label: 'Dezmugurit',     icon: '🌱' },
    { gdd: 150,  label: 'Inflorire',       icon: '🌸' },
    { gdd: 210,  label: 'Cadere petale',   icon: '🍃' },
    { gdd: 280,  label: 'Legare fructe',   icon: '🔵' },
    { gdd: 1050, label: 'Recolta posibila',icon: '🍑' },
  ],
  cires: [
    { gdd: 70,   label: 'Dezmugurit',     icon: '🌱' },
    { gdd: 100,  label: 'Inflorire',       icon: '🌸' },
    { gdd: 150,  label: 'Cadere petale',   icon: '🍃' },
    { gdd: 600,  label: 'Recolta posibila',icon: '🍒' },
  ],
  visin: [
    { gdd: 80,   label: 'Dezmugurit',     icon: '🌱' },
    { gdd: 120,  label: 'Inflorire',       icon: '🌸' },
    { gdd: 700,  label: 'Recolta posibila',icon: '🍒' },
  ],
  'par-clapp': [
    { gdd: 130,  label: 'Dezmugurit',     icon: '🌱' },
    { gdd: 180,  label: 'Inflorire',       icon: '🌸' },
    { gdd: 250,  label: 'Legare fructe',   icon: '🔵' },
    { gdd: 1100, label: 'Recolta posibila',icon: '🍐' },
  ],
  'mar-florina': [
    { gdd: 150,  label: 'Dezmugurit',     icon: '🌱' },
    { gdd: 200,  label: 'Inflorire',       icon: '🌸' },
    { gdd: 270,  label: 'Legare fructe',   icon: '🔵' },
    { gdd: 1300, label: 'Recolta posibila',icon: '🍎' },
  ],
  prun: [
    { gdd: 100,  label: 'Dezmugurit',     icon: '🌱' },
    { gdd: 140,  label: 'Inflorire',       icon: '🌸' },
    { gdd: 900,  label: 'Recolta posibila',icon: '🫐' },
  ],
  migdal: [
    { gdd: 60,   label: 'Dezmugurit (TIMPURIU!)', icon: '⚠️' },
    { gdd: 90,   label: 'Inflorire',       icon: '🌸' },
    { gdd: 800,  label: 'Recolta posibila',icon: '🌰' },
  ],
};

function calculateGDD(meteoHistory) {
  var year = new Date().getFullYear();
  var startDate = year + '-03-01';
  var total = 0;
  var dates = Object.keys(meteoHistory).sort();
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i];
    if (d < startDate) continue;
    var m = meteoHistory[d];
    if (!m || m.temp_min == null || m.temp_max == null) continue;
    var avg = (parseFloat(m.temp_min) + parseFloat(m.temp_max)) / 2;
    total += Math.max(0, avg - GDD_BASE_TEMP);
  }
  return Math.round(total * 10) / 10;
}

function renderGDDSection(speciesId, containerEl) {
  var history = JSON.parse(localStorage.getItem('livada-meteo-history') || '{}');
  var gdd = calculateGDD(history);
  var milestones = GDD_MILESTONES[speciesId];
  if (!milestones || !Object.keys(history).length) return;

  var currentStage = null, nextStage = null;
  for (var i = 0; i < milestones.length; i++) {
    if (gdd >= milestones[i].gdd) currentStage = milestones[i];
    else { nextStage = milestones[i]; break; }
  }
  var progressPct = nextStage ? Math.min(100, Math.round((gdd / nextStage.gdd) * 100)) : 100;

  var gddEl = document.createElement('div');
  gddEl.className = 'alert alert-info';
  gddEl.style.cssText = 'margin:10px 0;padding:10px 14px;';
  gddEl.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
    '<strong>🌡️ Caldura acumulata (GDD)</strong>' +
    '<span style="font-size:1.1rem;font-weight:700;color:var(--accent);">' + Math.round(gdd) + ' GDD</span>' +
    '</div>' +
    (currentStage ? '<div style="font-size:0.82rem;margin-bottom:4px;">' +
      currentStage.icon + ' Stadiu curent: <strong>' + currentStage.label + '</strong></div>' : '') +
    (nextStage ? '<div style="font-size:0.78rem;color:var(--text-dim);">Urmator: ' +
      nextStage.icon + ' ' + nextStage.label + ' la ' + nextStage.gdd +
      ' GDD (' + (nextStage.gdd - Math.round(gdd)) + ' GDD ramase)</div>' : '') +
    '<div style="margin-top:6px;height:4px;background:var(--bg-surface);border-radius:2px;">' +
    '<div style="height:4px;background:var(--accent);border-radius:2px;width:' + progressPct + '%;transition:width 0.5s;"></div>' +
    '</div>';
  containerEl.insertBefore(gddEl, containerEl.firstChild);
}
```

**CSS necesar** (daca `.alert-info` nu exista deja):
```css
.alert-info { background: rgba(90,159,212,0.12); border-left: 3px solid var(--info); }
```

**Integrare:** Apeleaza `renderGDDSection(activeSpeciesId, sectionBodyEl)` la afisarea fiecarui tab de specie. Necesita `loadMeteoHistory()` la init (deja exista). Salveaza rezultatul in `livada-meteo-history` din localStorage.

---

### N9. Planner Saptamanal Integrat — Tot ce ai nevoie pe 7 zile

**Descriere:** Un modal nou care afiseaza urmatoarele 7 zile dintr-o singura privire: prognoza meteo zilnica, scor spray calculat, tratamente programate conform `TREATMENTS_CAL`, si evenimentele existente din jurnal. Totul pe un ecran vertical, fara sa deschizi 3 modals diferite.

**De ce e util:** Cel mai frecvent scenariu: Roland vrea sa stie "cand stropes saptamana asta?" Acum trebuie sa deschida meteo (modal), sa verifice spray score, sa verifice calendarul tratamente (tab specie), si jurnalul. Planner-ul face asta intr-o singura privire.

**Complexitate:** Medie | **Impact:** Mare — economiseste 5-10 min per decizie de stropire

**Exemplu implementare:**

```javascript
async function openWeeklyPlanner() {
  openModal('planner');
  var body = document.getElementById('plannerBody');
  body.innerHTML = '<div class="ai-load"><div class="ai-spin"></div><br>Se incarca prognoza...</div>';

  try {
    var meteoRes = await fetchWithTimeout(
      'https://api.open-meteo.com/v1/forecast?latitude=46.17&longitude=20.75' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,' +
      'relative_humidity_2m_max,weather_code&timezone=Europe%2FBucharest&forecast_days=7',
      {}, 8000
    );
    var data = await meteoRes.json();
    var journal = getJurnalEntries();
    var today = todayLocal();
    var monthNow = new Date().getMonth() + 1;

    var rows = '';
    for (var i = 0; i < 7; i++) {
      var dateStr = data.daily.time[i];
      var tmax = data.daily.temperature_2m_max[i];
      var tmin = data.daily.temperature_2m_min[i];
      var rain = data.daily.precipitation_sum[i];
      var wind = data.daily.wind_speed_10m_max[i];
      var hum = data.daily.relative_humidity_2m_max[i];
      var score = calculateSprayScore(tmax, wind, rain, hum);
      var scoreColor = score >= 70 ? 'color:var(--accent-glow)' : score >= 40 ? 'color:var(--warning)' : 'color:var(--danger)';
      var jEntries = journal.filter(function(e) { return e.date === dateStr; });
      var isToday = dateStr === today;
      var dateObj = new Date(dateStr + 'T12:00:00');
      var dayName = ['Dum','Lun','Mar','Mie','Joi','Vin','Sam'][dateObj.getDay()];
      var dayNum = dateObj.getDate() + '.' + String(dateObj.getMonth() + 1).padStart(2, '0');

      rows +=
        '<div style="padding:10px 0;border-bottom:1px solid var(--border);' +
        (isToday ? 'background:rgba(106,191,105,0.06);border-radius:8px;padding:10px;margin:2px 0;' : '') + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
        '<div><strong' + (isToday ? ' style="color:var(--accent-glow)"' : '') + '>' +
        (isToday ? '📍 ' : '') + dayName + ' ' + dayNum + '</strong>' +
        '<span style="font-size:0.75rem;color:var(--text-dim);margin-left:6px;">' +
        Math.round(tmin) + '°/' + Math.round(tmax) + '°' +
        (rain > 0 ? ' | 🌧 ' + Math.round(rain * 10) / 10 + 'mm' : '') +
        ' | 💨 ' + Math.round(wind) + 'km/h</span></div>' +
        '<span style="font-size:0.85rem;font-weight:700;' + scoreColor + '">Spray ' + score + '%</span>' +
        '</div>';

      if (jEntries.length > 0) {
        rows += '<div style="font-size:0.78rem;color:var(--accent);margin-top:3px;">📝 ' +
          jEntries.map(function(e) {
            return '[' + e.type + '] ' + (e.note ? e.note.substring(0, 45) + (e.note.length > 45 ? '…' : '') : '');
          }).join(' | ') + '</div>';
      }
      rows += '</div>';
    }

    body.innerHTML =
      '<p style="font-size:0.78rem;color:var(--text-dim);margin-bottom:10px;">' +
      'Scor spray: <span style="color:var(--accent-glow)">verde ≥70% ideal</span> | ' +
      '<span style="color:var(--warning)">galben 40-69%</span> | ' +
      '<span style="color:var(--danger)">rosu &lt;40% evita</span></p>' + rows;
  } catch(e) {
    body.innerHTML = '<p style="color:var(--danger);">Eroare la incarcare prognoza. Verifica conexiunea.</p>';
  }
}
```

**HTML modal:**
```html
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-planner">
  <div class="modal">
    <div class="modal-header">
      <h2>📅 Planner 7 Zile</h2>
      <button class="modal-close" aria-label="Inchide" onclick="closeModal('planner')">✕</button>
    </div>
    <div class="modal-body" id="plannerBody"></div>
  </div>
</div>
```

**Buton** (adauga in sectiunea Azi, langa butonul Meteo):
```html
<button class="btn btn-secondary" onclick="openWeeklyPlanner()" style="font-size:0.8rem;padding:8px 14px;">
  📅 Planner 7 Zile
</button>
```

---

### N10. Risc Boala per Specie — Alerte specifice in loc de mesaj generic

**Descriere:** Inlocuieste alerta generica "Risc crescut de boli fungice!" cu alerte specifice per clasa de boli si specii vizate. Exemplu: "Monilioza: RISC MARE la Cais/Piersic (18°C + ploaie 6h). Stropeste cu Teldor sau Switch in 24h." Calculat pe frontend din datele de prognoza deja disponibile.

**De ce e util:** Alerta actuala e utila dar vaga — Roland nu stie ce specie sa prioritizeze sau ce produs sa aplice. O alerta specifica ii spune exact ce face in urmatoarea ora.

**Complexitate:** Mica | **Impact:** Mare — fiecare alerta specifica = interventie la timp

**Exemplu implementare:**

```javascript
var DISEASE_RULES = [
  {
    id: 'monilioza',
    label: 'Monilioza (putregai brun)',
    species: 'Cais, Piersic, Cires, Visin, Prun',
    condition: function(avgT, avgH, rainyH) {
      return avgT >= 15 && avgT <= 28 && rainyH >= 3 && avgH >= 75;
    },
    isHigh: function(avgT, avgH, rainyH) {
      return avgT >= 18 && rainyH >= 5 && avgH >= 80;
    },
    treatment: 'Teldor 500 SC (1g/L) sau Switch 62.5 WG (0.8g/L)',
    timing: '24-48h dupa ploaie (preventiv > curativ)',
  },
  {
    id: 'rapan',
    label: 'Rapan (Venturia)',
    species: 'Mar, Par',
    condition: function(avgT, avgH, rainyH) {
      return avgT >= 8 && avgT <= 22 && rainyH >= 4 && avgH >= 80;
    },
    isHigh: function(avgT, avgH, rainyH) {
      return avgT >= 12 && rainyH >= 6 && avgH >= 85;
    },
    treatment: 'Captan 80 WG (2g/L) sau Merpan 80 WDG (2g/L)',
    timing: 'INAINTE de ploaie (preventiv!) sau max 24h dupa',
  },
  {
    id: 'fainare',
    label: 'Fainare (Podosphaera)',
    species: 'Mar, Par, Piersic, Cires',
    condition: function(avgT, avgH, rainyH) {
      return avgT >= 18 && avgT <= 28 && avgH >= 50 && avgH <= 75 && rainyH < 2;
    },
    isHigh: function(avgT, avgH, rainyH) {
      return avgT >= 22 && avgH >= 55 && rainyH === 0;
    },
    treatment: 'Topas 100 EC (0.4ml/L) sau sulf muiabil 0.3%',
    timing: 'Timp uscat, dimineata devreme',
  },
  {
    id: 'patarea_frunzelor',
    label: 'Patarea frunzelor (Blumeriella)',
    species: 'Visin, Cires',
    condition: function(avgT, avgH, rainyH) {
      return avgT >= 16 && rainyH >= 3 && avgH >= 78;
    },
    isHigh: function(avgT, avgH, rainyH) {
      return avgT >= 20 && rainyH >= 5;
    },
    treatment: 'Merpan 80 WDG (2g/L) sau zeama bordelez 0.5%',
    timing: '24h dupa ploaie continua',
  },
];

// Apeleaza cu datele hourly din prognoza Open-Meteo (disponibile in fetchMeteoData())
function assessDiseaseRisks(hourlyTemp, hourlyHumidity, hourlyPrecip) {
  var n = Math.min(48, hourlyTemp.length);
  var sumT = 0, sumH = 0, rainyH = 0;
  for (var i = 0; i < n; i++) {
    sumT += hourlyTemp[i] || 0;
    sumH += hourlyHumidity[i] || 0;
    if ((hourlyPrecip[i] || 0) > 0.1) rainyH++;
  }
  var avgT = sumT / n, avgH = sumH / n;
  return DISEASE_RULES.filter(function(r) { return r.condition(avgT, avgH, rainyH); })
    .map(function(r) {
      return {
        label: r.label,
        level: r.isHigh(avgT, avgH, rainyH) ? 'MARE' : 'MEDIU',
        levelColor: r.isHigh(avgT, avgH, rainyH) ? 'var(--danger)' : 'var(--warning)',
        species: r.species,
        treatment: r.treatment,
        timing: r.timing,
      };
    });
}

function renderSpecificDiseaseAlerts(risks, containerEl) {
  if (!risks || risks.length === 0) return;
  var html = '<div style="margin:10px 0;"><strong style="font-size:0.85rem;">⚠️ Riscuri specifice detectate (48h):</strong>';
  risks.forEach(function(r) {
    html +=
      '<div style="margin:6px 0;padding:8px 12px;background:var(--bg-surface);' +
      'border-left:3px solid ' + r.levelColor + ';border-radius:0 8px 8px 0;">' +
      '<div style="font-weight:700;font-size:0.82rem;color:' + r.levelColor + ';">' +
      r.label + ' — RISC ' + r.level + '</div>' +
      '<div style="font-size:0.78rem;color:var(--text-dim);">Specii: ' + r.species + '</div>' +
      '<div style="font-size:0.78rem;">🧪 ' + r.treatment + '</div>' +
      '<div style="font-size:0.75rem;color:var(--text-dim);">⏱ ' + r.timing + '</div>' +
      '</div>';
  });
  html += '</div>';
  containerEl.innerHTML += html;
}
```

**Integrare:** In `checkAlerts()`, dupa fetch-ul de alerte, apeleaza `assessDiseaseRisks()` cu datele hourly din prognoza Open-Meteo (deja disponibile in `fetchMeteoData()`). Afiseaza in sectiunea de alerte din tab Azi.

---

### N11. Chill Hours Tracker — Ore de frig acumulate per specie

**Descriere:** Calculeaza orele de frig (temperaturi <7°C) acumulate din 1 noiembrie, folosind datele deja disponibile in Redis (temp_min + temp_max per zi din meteo history). Afiseaza bara de progres per specie cu procentul din necesarul minim atins, cu alerta daca un soi risca sa nu-si completeze necesarul (iarna calda).

**De ce e util:** Piersicul, caisul si migdalul au nevoie de 400-1200 ore de frig pentru a intra corect in repaus si a inflori normal. O iarna calda poate duce la inflorire neregulata sau esec total de rod — Roland trebuie sa stie asta inca din ianuarie.

**Complexitate:** Medie | **Impact:** Mare — alerta timpurie pentru soiuri vulnerabile la ierni calde

**Exemplu implementare:**

```javascript
var CHILL_REQUIREMENTS = {
  cais:          { min: 400,  max: 800,  label: 'Cais' },
  piersic:       { min: 600,  max: 1200, label: 'Piersic' },
  migdal:        { min: 300,  max: 600,  label: 'Migdal' },
  cires:         { min: 800,  max: 1200, label: 'Cires' },
  visin:         { min: 600,  max: 1000, label: 'Visin' },
  prun:          { min: 700,  max: 1200, label: 'Prun' },
  'par-clapp':   { min: 900,  max: 1500, label: 'Par Clapp' },
  'par-williams':{ min: 800,  max: 1400, label: 'Par Williams' },
  'mar-florina': { min: 900,  max: 1500, label: 'Mar Florina' },
  'mar-golden':  { min: 800,  max: 1400, label: 'Mar Golden' },
  kaki:          { min: 200,  max: 500,  label: 'Kaki Rojo' },
  rodiu:         { min: 100,  max: 300,  label: 'Rodiu' },
};

// Estimare ore < 7°C din date zilnice (model sinusoidal simplificat)
function estimateChillHours(tempMin, tempMax) {
  if (tempMin >= 7) return 0;
  if (tempMax <= 7) return 24;
  var range = tempMax - tempMin;
  if (range <= 0) return tempMin < 7 ? 12 : 0;
  var fracBelow = (7 - tempMin) / range;
  return Math.round(Math.min(24, fracBelow * 24 * 0.75));
}

function calculateChillHours(meteoHistory) {
  var year = new Date().getFullYear();
  var startDate = (year - 1) + '-11-01';
  var total = 0;
  var dates = Object.keys(meteoHistory).sort();
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i];
    if (d < startDate) continue;
    var month = parseInt(d.split('-')[1]);
    if (month >= 4) continue; // dupa 1 aprilie nu mai conteaza
    var m = meteoHistory[d];
    if (!m || m.temp_min == null) continue;
    total += estimateChillHours(parseFloat(m.temp_min), parseFloat(m.temp_max));
  }
  return total;
}

function renderChillHoursWidget(containerEl) {
  var history = JSON.parse(localStorage.getItem('livada-meteo-history') || '{}');
  if (!Object.keys(history).length) return;
  var month = new Date().getMonth() + 1;
  if (month >= 4 && month <= 10) return; // afiseaza doar nov-mar

  var chillH = calculateChillHours(history);
  var html =
    '<div style="margin:12px 0;padding:12px;background:var(--bg-surface);border-radius:10px;">' +
    '<div style="font-weight:700;margin-bottom:8px;">❄️ Ore de frig: <span style="color:var(--info);">' +
    chillH + 'h</span> <span style="font-size:0.75rem;color:var(--text-dim);">(din 1 nov, estimat)</span></div>';

  Object.entries(CHILL_REQUIREMENTS).forEach(function(entry) {
    var id = entry[0], req = entry[1];
    var pct = Math.min(100, Math.round((chillH / req.min) * 100));
    var barColor = pct >= 100 ? 'var(--accent)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)';
    var status = pct >= 100 ? '✅' : pct >= 70 ? '🟡' : '🔴';
    html +=
      '<div style="margin:5px 0;">' +
      '<div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:2px;">' +
      '<span>' + status + ' ' + req.label + '</span>' +
      '<span style="color:var(--text-dim);">' + pct + '% din ' + req.min + 'h</span></div>' +
      '<div style="height:4px;background:var(--border);border-radius:2px;">' +
      '<div style="height:4px;background:' + barColor + ';border-radius:2px;width:' + pct + '%;"></div>' +
      '</div></div>';
  });

  if (chillH < 500) {
    html += '<div style="margin-top:8px;font-size:0.8rem;color:var(--warning);">' +
      '⚠️ Iarna calda! Piersicul si caisul pot inflori neregulat — monitorizeaza muguri din februarie.</div>';
  }
  html += '</div>';
  containerEl.innerHTML = html + containerEl.innerHTML;
}
```

**Integrare:** Apeleaza `renderChillHoursWidget()` in `initDashboardAzi()`. Widget-ul apare automat doar in lunile noiembrie-martie cand e relevant.

---

### N12. Jurnal Vocal — Dictare nota direct din livada

**Descriere:** Buton "Dictez" in modalul de adaugare jurnal care activeaza microfonul si transcrie nota vocala in romana. Bazat pe Web Speech API (nativa in Chrome/Android, zero dependente extern). Util cand Roland este in livada cu mainile ocupate.

**De ce e util:** Cel mai frecvent obstacol pentru a nota ceva in jurnal: "nu am timp / mainile nu sunt libere". Dictarea vocala reduce adaugarea unei note de la 60 secunde la 5 secunde.

**Complexitate:** Mica | **Impact:** Mediu — creste rata de utilizare a jurnalului

**Exemplu implementare:**

```javascript
var _voiceRec = null;

function startVoiceInput(targetInputId) {
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showToast('Dictarea vocala nu e suportata in acest browser. Foloseste Chrome pe Android.', 'warning');
    return;
  }
  if (_voiceRec) { try { _voiceRec.stop(); } catch(e) {} _voiceRec = null; }

  var btn = document.getElementById('voiceDictateBtn');
  var inputEl = document.getElementById(targetInputId);
  if (!inputEl) return;

  _voiceRec = new SpeechRec();
  _voiceRec.lang = 'ro-RO';
  _voiceRec.interimResults = false;
  _voiceRec.maxAlternatives = 1;
  _voiceRec.continuous = false;

  if (btn) { btn.textContent = '🎤 Ascult…'; btn.style.background = 'var(--danger)'; }

  _voiceRec.onresult = function(e) {
    var text = e.results[0][0].transcript;
    inputEl.value = (inputEl.value ? inputEl.value.trim() + '. ' : '') +
      text.charAt(0).toUpperCase() + text.slice(1);
  };

  _voiceRec.onend = function() {
    _voiceRec = null;
    if (btn) { btn.textContent = '🎤 Dictez'; btn.style.background = ''; }
  };

  _voiceRec.onerror = function(e) {
    _voiceRec = null;
    if (btn) { btn.textContent = '🎤 Dictez'; btn.style.background = ''; }
    var ERRORS = {
      'not-allowed': 'Permisiune microfon refuzata — activeaza din setarile browserului.',
      'no-speech': 'Nicio voce detectata. Incearca din nou.',
      'network': 'Eroare retea la recunoastere vocala.',
    };
    showToast(ERRORS[e.error] || 'Eroare dictare: ' + e.error, 'error');
  };

  _voiceRec.start();
}
```

**HTML** (adauga langa textarea nota din modal-jurnal):
```html
<div style="display:flex;gap:8px;align-items:flex-start;">
  <textarea id="jurnalNote" rows="3"
    placeholder="Nota (ex: 2L zeama bordelez, pomii cu simptome vizibile...)"
    style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:8px;
    background:var(--bg-surface);color:var(--text);font-size:0.9rem;resize:vertical;"></textarea>
  <button id="voiceDictateBtn" onclick="startVoiceInput('jurnalNote')"
    title="Dicteaza nota (Chrome/Android)"
    style="padding:10px;background:var(--bg-surface);border:1px solid var(--border);
    border-radius:8px;cursor:pointer;font-size:0.9rem;min-height:44px;min-width:44px;
    color:var(--text);transition:background 0.2s;" aria-label="Dicteaza nota vocala">
    🎤 Dictez
  </button>
</div>
<script>
// Ascunde butonul daca Web Speech API nu e disponibila
if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
  document.addEventListener('DOMContentLoaded', function() {
    var b = document.getElementById('voiceDictateBtn');
    if (b) b.style.display = 'none';
  });
}
</script>
```

**Nota compatibilitate:** Functioneaza nativ pe Chrome/Chromium (desktop + Android). iOS Safari necesita iOS 14.5+. Firefox: nesuportat.

---

### N13. Comparator Specii — Calendare de tratament aliniate side-by-side

**Descriere:** Un modal cu doua coloane: specia A si specia B, cu lunile de tratament aliniate pe randuri. Marcheaza lunile in care ambele specii au tratamente — potentiale zile de camp combinate. Simplu si imediat util.

**De ce e util:** Roland are 20 specii. Daca poate stropi caisul si piersicul in aceeasi zi, economiseste 2-3 ore. Acum trebuie sa deschida doua tab-uri si sa compare mental.

**Complexitate:** Mica | **Impact:** Mediu — optimizare directa a timpului in camp

**Exemplu implementare:**

```javascript
// Calendare tratamente hardcodate per specie (extras din TREATMENTS_CAL existent)
// Structura: specie -> luna (1-12) -> array tratamente
var SPECIES_TREATMENTS_MONTHLY = {
  cais: {
    2: ['Zeama bordelez 1%'],
    3: ['Zeama bordelez 1%', 'Topas 0.4ml/L la inflorire'],
    4: ['Switch 10g/10L post-inflorire', 'Teldor 1g/L'],
    5: ['Teldor 1g/L preventiv'],
    6: ['Switch daca ploaie'],
  },
  piersic: {
    2: ['Zeama bordelez 1%', 'Dithan M-45 (basculare preventiv)'],
    3: ['Topas 0.4ml/L la inflorire'],
    4: ['Confidor 0.5ml/L afide', 'Topas fainare'],
    5: ['Switch monilioza', 'Teldor fructe'],
    6: ['Optasol sau Bumper la nevoie'],
  },
  'mar-florina': {
    2: ['Zeama bordelez 1.5%'],
    3: ['Captan 2g/L pre-inflorire'],
    4: ['Captan 2g/L post-inflorire', 'Topas fainare'],
    5: ['Captan sau Merpan preventiv'],
    6: ['Score 2ml/L la nevoie'],
    9: ['Zeama bordelez 0.5% post-recolta'],
  },
  // Adauga mai multe specii dupa aceleasi date din CLAUDE.md
};

function renderSpeciesComparator() {
  var sel1 = document.getElementById('compSp1').value;
  var sel2 = document.getElementById('compSp2').value;
  if (!sel1 || !sel2 || sel1 === sel2) {
    document.getElementById('comparatorResult').innerHTML =
      '<p style="color:var(--text-dim);text-align:center;">Selecteaza doua specii diferite.</p>';
    return;
  }

  var MONTHS = ['', 'Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var t1 = SPECIES_TREATMENTS_MONTHLY[sel1] || {};
  var t2 = SPECIES_TREATMENTS_MONTHLY[sel2] || {};
  var currentMonth = new Date().getMonth() + 1;

  var html = '<div style="overflow-x:auto;">' +
    '<table style="width:100%;border-collapse:collapse;font-size:0.8rem;">' +
    '<tr><th style="padding:5px 8px;border:1px solid var(--border);">Luna</th>' +
    '<th style="padding:5px 8px;border:1px solid var(--border);color:var(--accent);">' +
    sel1.toUpperCase().replace('-', ' ') + '</th>' +
    '<th style="padding:5px 8px;border:1px solid var(--border);color:var(--info);">' +
    sel2.toUpperCase().replace('-', ' ') + '</th>' +
    '<th style="padding:5px 8px;border:1px solid var(--border);">Combinat</th></tr>';

  for (var m = 1; m <= 12; m++) {
    var tr1 = t1[m] || [], tr2 = t2[m] || [];
    var hasBoth = tr1.length > 0 && tr2.length > 0;
    var isCurrent = m === currentMonth;
    var bg = isCurrent ? 'background:rgba(106,191,105,0.1);' : m % 2 === 0 ? 'background:var(--bg-surface);' : '';

    html += '<tr style="' + bg + '">' +
      '<td style="padding:5px 8px;border:1px solid var(--border);font-weight:' + (isCurrent ? '700' : 'normal') + ';">' +
      (isCurrent ? '📍 ' : '') + MONTHS[m] + '</td>' +
      '<td style="padding:5px 8px;border:1px solid var(--border);color:var(--accent-dim);">' +
      (tr1.length ? tr1.join('<br>') : '<span style="opacity:0.3">—</span>') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid var(--border);color:var(--info);">' +
      (tr2.length ? tr2.join('<br>') : '<span style="opacity:0.3">—</span>') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid var(--border);text-align:center;">' +
      (hasBoth ? '<span style="color:var(--accent);">✓</span>' : '') + '</td></tr>';
  }
  html += '</table></div>' +
    '<p style="font-size:0.75rem;color:var(--text-dim);margin-top:6px;">✓ = luni cu tratamente la ambele specii — combina intr-o singura tura (verifica compatibilitatea produselor).</p>';

  document.getElementById('comparatorResult').innerHTML = html;
}
```

**HTML modal:**
```html
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-comparator">
  <div class="modal">
    <div class="modal-header">
      <h2>🔄 Comparator Specii</h2>
      <button class="modal-close" onclick="closeModal('comparator')">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <select id="compSp1" onchange="renderSpeciesComparator()"
          style="flex:1;padding:8px;border-radius:8px;background:var(--bg-surface);
          border:1px solid var(--border);color:var(--text);">
          <option value="">Specia 1...</option>
          <option value="cais">Cais</option><option value="piersic">Piersic</option>
          <option value="cires">Cires</option><option value="visin">Visin</option>
          <option value="mar-florina">Mar Florina</option><option value="par-clapp">Par Clapp</option>
          <option value="prun">Prun</option><option value="migdal">Migdal</option>
        </select>
        <select id="compSp2" onchange="renderSpeciesComparator()"
          style="flex:1;padding:8px;border-radius:8px;background:var(--bg-surface);
          border:1px solid var(--border);color:var(--text);">
          <option value="">Specia 2...</option>
          <option value="cais">Cais</option><option value="piersic">Piersic</option>
          <option value="cires">Cires</option><option value="visin">Visin</option>
          <option value="mar-florina">Mar Florina</option><option value="par-clapp">Par Clapp</option>
          <option value="prun">Prun</option><option value="migdal">Migdal</option>
        </select>
      </div>
      <div id="comparatorResult"></div>
    </div>
  </div>
</div>
```

---

### N14. Harta Livada Vizuala — Grid interactiv cu 100+ pomi

**Descriere:** O reprezentare vizuala a livezii sub forma de grid (randuri x coloane). Fiecare celula = un pom cu icon specie + indicator status (sanatos/atentie/bolnav). Click pe pom: popup cu nota rapida, specie, an plantat, si ultimele interventii din jurnal. Date stocate in `localStorage` cheie `livada-tree-map`.

**De ce e util:** Cu 100+ pomi, Roland nu poate tine in cap care piersic a avut probleme sau care par a dat mai putine fructe. Harta da contextul vizual instant si permite selectarea rapida a unui pom individual.

**Complexitate:** Mare | **Impact:** Mare — instrument de management real pentru livada de 100+ pomi

**Exemplu implementare:**

```javascript
var TREE_SPECIES_ICONS = {
  cais:'🍑', piersic:'🍑', cires:'🍒', visin:'🍒', prun:'🫐',
  'mar-florina':'🍎', 'mar-golden':'🍎', 'par-clapp':'🍐', 'par-williams':'🍐',
  'par-hosui':'🍐', 'par-napoca':'🍐', migdal:'🌰', rodiu:'🪷', kaki:'🟠',
  afin:'🫐', zmeur:'🍓', 'zmeur-galben':'🍓', mur:'⚫', 'mur-copac':'⚫', alun:'🌰',
};

function getTreeMap() { return JSON.parse(localStorage.getItem('livada-tree-map') || '{}'); }
function saveTreeMap(map) { localStorage.setItem('livada-tree-map', JSON.stringify(map)); }

function renderTreeMap() {
  var map = getTreeMap();
  var rows = 10, cols = 12; // configurabil
  var container = document.getElementById('treemapGrid');
  var STATUS_COLOR = { ok:'var(--accent)', warning:'var(--warning)', sick:'var(--danger)' };

  var html = '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:3px;">';
  for (var r = 1; r <= rows; r++) {
    for (var c = 1; c <= cols; c++) {
      var key = 'r' + r + 'c' + c;
      var tree = map[key];
      var icon = tree ? (TREE_SPECIES_ICONS[tree.species] || '🌳') : '+';
      var border = tree ? 'border:2px solid ' + (STATUS_COLOR[tree.status || 'ok']) : 'border:1px dashed var(--border)';
      html += '<button onclick="openTreeCell(\'' + key + '\')" ' +
        'title="' + (tree ? escapeHtml(tree.name || key) : 'Gol — click sa adaugi') + '" ' +
        'style="aspect-ratio:1;' + border + ';border-radius:6px;background:' +
        (tree ? 'rgba(106,191,105,0.06)' : 'transparent') +
        ';cursor:pointer;font-size:' + (tree ? '1.1rem' : '0.9rem') +
        ';min-height:32px;padding:0;color:' + (tree ? 'inherit' : 'var(--border)') + ';">' +
        icon + '</button>';
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

function openTreeCell(key) {
  var map = getTreeMap();
  var t = map[key] || {};
  document.getElementById('treeCellKey').value = key;
  document.getElementById('treeCellName').value = t.name || '';
  document.getElementById('treeCellSpecies').value = t.species || '';
  document.getElementById('treeCellPlanted').value = t.planted || '';
  document.getElementById('treeCellNotes').value = t.notes || '';
  document.getElementById('treeCellStatus').value = t.status || 'ok';
  openModal('treecell');
}

function saveTreeCell() {
  var key = document.getElementById('treeCellKey').value;
  var map = getTreeMap();
  var species = document.getElementById('treeCellSpecies').value;
  var name = document.getElementById('treeCellName').value.trim();
  if (!species && !name) { delete map[key]; }
  else {
    map[key] = {
      species: species, name: name,
      planted: document.getElementById('treeCellPlanted').value,
      notes: document.getElementById('treeCellNotes').value.trim(),
      status: document.getElementById('treeCellStatus').value,
      updatedAt: todayLocal(),
    };
  }
  saveTreeMap(map);
  closeModal('treecell');
  renderTreeMap();
  showToast(name ? 'Pom "' + name + '" salvat.' : 'Celula curatata.');
}
```

**HTML modals** (doi mici: unul pentru harta, unul pentru detalii pom):
```html
<!-- Modal harta -->
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-treemap">
  <div class="modal" style="max-width:500px;">
    <div class="modal-header">
      <h2>🗺️ Harta Livada</h2>
      <button class="modal-close" onclick="closeModal('treemap')">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:0.78rem;color:var(--text-dim);margin-bottom:8px;">Click pe orice celula pentru a adauga/edita un pom. Chenar colorat = status sanatate.</p>
      <div id="treemapGrid"></div>
    </div>
  </div>
</div>

<!-- Modal detalii pom -->
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-treecell">
  <div class="modal" style="max-width:360px;">
    <div class="modal-header">
      <h2>🌳 Detalii Pom</h2>
      <button class="modal-close" onclick="closeModal('treecell')">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="treeCellKey">
      <input id="treeCellName" placeholder="Nume (ex: Cais #3)" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);">
      <select id="treeCellSpecies" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);">
        <option value="">Specia...</option>
        <option value="cais">Cais</option><option value="piersic">Piersic</option>
        <option value="cires">Cires</option><option value="visin">Visin</option>
        <option value="prun">Prun</option><option value="mar-florina">Mar Florina</option>
        <option value="par-clapp">Par Clapp</option><option value="migdal">Migdal</option>
        <option value="rodiu">Rodiu</option><option value="kaki">Kaki</option>
        <option value="afin">Afin</option><option value="alun">Alun</option>
      </select>
      <input id="treeCellPlanted" type="number" min="1990" max="2030" placeholder="An plantat (ex: 2018)"
        style="width:100%;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);">
      <select id="treeCellStatus" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);">
        <option value="ok">✅ Sanatos</option>
        <option value="warning">⚠️ Atentie</option>
        <option value="sick">🔴 Bolnav</option>
      </select>
      <textarea id="treeCellNotes" rows="2" placeholder="Note (ex: monilioza 2024, productie slaba)"
        style="width:100%;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);resize:vertical;"></textarea>
      <button class="btn btn-primary" style="width:100%;" onclick="saveTreeCell()">Salveaza</button>
    </div>
  </div>
</div>
```

---

### N15. Note per Pom Individual — Tracking fara harta

**Descriere:** Versiune simplificata fata de N14: sistem de notite indexate per pom (ex: "Piersic #3", "Cais randul 2 stanga"), accesibil dintr-un buton in fiecare tab de specie. Lista pomi ai speciei, cu note rapide si status. 80% din valoarea hartii, in 20% din timpul de implementare.

**De ce e util:** Cu mai multi pomi din aceeasi specie, trebuie sa diferentiezi "care cais a avut scurgeri de guma in 2025" fara a construi harta vizuala completa.

**Complexitate:** Mica | **Impact:** Mediu-Mare — util zilnic la inspecte

**Exemplu implementare:**

```javascript
// localStorage: 'livada-trees' = array de { id, species, label, notes, status, planted, updatedAt }

function getTrees(species) {
  var all = JSON.parse(localStorage.getItem('livada-trees') || '[]');
  return species ? all.filter(function(t) { return t.species === species; }) : all;
}
function saveTrees(list) { localStorage.setItem('livada-trees', JSON.stringify(list)); }

function openTreePanel(speciesId) {
  var panel = document.getElementById('treePanel-' + speciesId);
  if (!panel) return;
  var trees = getTrees(speciesId);
  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
    '<strong style="font-size:0.85rem;">🌳 Pomi: ' + trees.length + '</strong>' +
    '<button class="btn btn-primary" style="font-size:0.75rem;padding:5px 10px;" ' +
    'onclick="addTree(\'' + speciesId + '\')">+ Adauga pom</button></div>';

  if (trees.length === 0) {
    html += '<p style="color:var(--text-dim);font-size:0.82rem;">Niciun pom inregistrat. Adauga primul pentru tracking individual.</p>';
  } else {
    trees.forEach(function(t) {
      var sc = { ok:'var(--accent)', warning:'var(--warning)', sick:'var(--danger)' }[t.status || 'ok'];
      var age = t.planted ? ' | ' + (new Date().getFullYear() - parseInt(t.planted)) + ' ani' : '';
      html += '<div style="padding:8px 10px;margin:4px 0;background:var(--bg-surface);border-radius:8px;border-left:3px solid ' + sc + ';">' +
        '<div style="display:flex;justify-content:space-between;">' +
        '<strong style="font-size:0.85rem;">' + escapeHtml(t.label) + '</strong>' +
        '<button onclick="editTree(\'' + t.id + '\',\'' + speciesId + '\')" ' +
        'style="font-size:0.7rem;padding:2px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text);">✏️</button>' +
        '</div>' +
        (t.planted ? '<div style="font-size:0.72rem;color:var(--text-dim);">Plantat: ' + t.planted + age + '</div>' : '') +
        (t.notes ? '<div style="font-size:0.8rem;margin-top:2px;">' + escapeHtml(t.notes) + '</div>' : '') +
        '</div>';
    });
  }

  panel.innerHTML = html;
  panel.style.display = panel.style.display === 'none' || !panel.style.display ? 'block' : 'none';
}

function addTree(speciesId) {
  var trees = getTrees();
  var newTree = {
    id: speciesId + '-' + Date.now(),
    species: speciesId,
    label: speciesId.charAt(0).toUpperCase() + speciesId.slice(1) + ' #' + (getTrees(speciesId).length + 1),
    notes: '', status: 'ok', planted: '', updatedAt: todayLocal(),
  };
  trees.push(newTree);
  saveTrees(trees);
  editTree(newTree.id, speciesId);
}
```

**Integrare:** Adauga in fiecare tab de specie un buton `onclick="openTreePanel('cais')"` si un div `id="treePanel-cais"` (toggle). Implementare in ~45 minute, zero API nou.

---

### N16. Tura Saptamanala — Checklist ghidat de inspectie

**Descriere:** Un checklist interactiv generat dinamic bazat pe luna curenta. Listeaza exact CE sa cauti la fiecare specie: simptome de boli active, actiuni preventive, verificari de rutina. La finalizare, ofera un buton care preia observatiile in jurnal cu un singur click.

**De ce e util:** Inlocuieste "ma duc sa vad ce e pe acolo" cu o tura structurata de 15-20 minute. Util mai ales primavara (mart-mai) cand evolutia e rapida si o saptamana de intarziere poate insemna 30% pierderi.

**Complexitate:** Medie | **Impact:** Mare — preventie direct proportionala cu atentia la detaliu

**Exemplu implementare:**

```javascript
var INSPECTION_GUIDE = {
  2: { // Februarie
    general: [
      'Ultima sansa pentru taieri de iarna inainte de dezmugurit',
      'Zeama bordelez preventiva la specii sensibile (cais, piersic, migdal)',
    ],
    migdal: ['⚠️ Dezmugurit timpuriu posibil — verifica zilnic, protejeaza la inghet'],
    piersic: ['Verifica muguri pentru semne de basculare (umflati, rozii, deformati)'],
    cais: ['Muguri gata de deschidere? Prognoza inghet = acoperire agrotextil urgent!'],
  },
  3: { // Martie
    general: [
      '⚠️ INGHET: verifica prognoza in fiecare dimineata (inghet floral = pierdere totala productie)',
      'Prima stropire preventiva: zeama bordelez 1% la umezirea mugurelui',
    ],
    cais: [
      'Monilinia inflorescente: muguri negri, ramuri cu inflorescente ofilite = taie si arde IMEDIAT',
      'Scurgeri de guma (gomoza) pe ramuri principale — semne de ciupercuri sau soc mecanic',
    ],
    piersic: [
      'Bascularea: frunze umflate, rosiatice, deformate = Dithan M-45 sau Score URGENT',
      'Inflorire in curs — nu stropi cu insecticide (protejezi albinele!)',
    ],
    'mar-florina': [
      'Primele semne de rapan pe lastari noi (pete mici, uleiose) = Captan 2g/L preventiv',
      'Fainare: varfuri albe-fainoase pe lastari = Topas 0.4ml/L',
    ],
    zmeur: ['Curata tulpinile vechi (care au rodit) pana la pamant — sursa de boli'],
  },
  4: { // Aprilie
    general: [
      'Saptamanal in livada obligatoriu — evolutie rapida',
      'Irigat daca nu a plouat 10+ zile (radacini superficiale la zmeur, afin)',
    ],
    cais: [
      'Monilioza fructe verzi (dupa ploaie + caldura >15°C): tratament Switch 10g/10L urgent',
      'Afide: colonii pe lastari noi = sapun potasic 2% sau Confidor 0.5ml/L',
    ],
    piersic: [
      'Taiere in verde: indeparteaza lastarii verticali excesivi (lacomi)',
      'Afide: sapun potasic 2% sau Confidor 0.5ml/L pe colonii vizibile',
    ],
    'mar-florina': [
      'Rapan activ! Verifica fata INFERIOARA a frunzelor — pete brune-cenusii',
      'Mucegai fainosi pe lastari noi (alb-prafuit) = Topas 0.4ml/L',
    ],
    cires: ['Monilioza florilor: flori ingalbenite, ramuri cu flori moarte = Switch urgent'],
    visin: ['Patarea frunzelor (Blumeriella): pete mici brune = Merpan 2g/L preventiv'],
  },
  5: { // Mai
    general: [
      'Nu stropi cand albinele sunt active (stropeste dimineata la 6-8 sau seara la 19+)',
      'Scor spray sub 40%: evita tratamentele — risc fitotoxicitate',
    ],
    cais: ['Fructe verzi: monilioza posibila dupa ploaie. Teldor 1g/L preventiv'],
    piersic: ['Rareala fructe: max 1 fruct la 5-8cm distanta (soiuri Grand August, Collins)'],
    cires: ['⚠️ Musca ciresului activa! Instaleaza capcane cromotrope galbene ACUM'],
    'mar-florina': ['Rapan pe fructele in formare (pete circulare): Merpan sau Score'],
    rodiu: ['Prima stropire preventiva zeama bordelez 0.5% dupa caderea petalelor'],
  },
  6: {
    general: ['Caniculara posibila: nu stropi intre 10-18 (fitotoxicitate risc ridicat)'],
    cires: ['RECOLTA CIRES — verifica zilnic. Crapaturi = recolta prea tarzie sau ploaie dupa seceta'],
    visin: ['RECOLTA VISIN + capcane Drosophila suzukii verificate saptamanal'],
    cais: ['RECOLTA CAIS — monilioza apare rapid pe fructe coapte dupa ploaie'],
  },
};

function openInspectionChecklist() {
  openModal('inspection');
  var month = new Date().getMonth() + 1;
  var guide = INSPECTION_GUIDE[month];
  var MONTHS = ['','Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec'];
  var body = document.getElementById('inspectionBody');

  if (!guide) {
    body.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:20px 0;">Ghid de inspectie disponibil pentru lunile Februarie — Iunie.<br>In celelalte luni, consulta calendarul tratamente din tab-ul speciei.</p>';
    return;
  }

  var items = [];
  Object.keys(guide).forEach(function(key) {
    (guide[key] || []).forEach(function(text) {
      items.push({ id: key + items.length, text: text, cat: key === 'general' ? 'GENERAL' : key.toUpperCase().replace('-', ' ') });
    });
  });

  var html = '<p style="font-size:0.82rem;color:var(--text-dim);margin-bottom:12px;">' +
    MONTHS[month] + ' — ' + items.length + ' puncte de verificat</p>';
  items.forEach(function(item, idx) {
    html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;">' +
      '<input type="checkbox" id="insp-' + idx + '" style="margin-top:3px;min-width:18px;height:18px;">' +
      '<div><div style="font-size:0.7rem;color:var(--accent-dim);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">' +
      item.cat + '</div>' +
      '<div style="font-size:0.85rem;line-height:1.4;">' + escapeHtml(item.text) + '</div></div></label>';
  });
  html += '<button class="btn btn-primary" style="width:100%;margin-top:14px;" onclick="finishInspection()">✓ Finalizeaza tura — adauga in jurnal</button>';
  body.innerHTML = html;
}

function finishInspection() {
  var cbs = document.querySelectorAll('#inspectionBody input[type="checkbox"]');
  var total = cbs.length, done = 0;
  cbs.forEach(function(cb) { if (cb.checked) done++; });
  var note = 'Tura inspectie: ' + done + '/' + total + ' puncte verificate.';
  var jNote = document.getElementById('jurnalNote');
  if (jNote) jNote.value = note;
  closeModal('inspection');
  openModal('jurnal');
  showToast('Tura finalizata! Adauga observatii in jurnal.');
}
```

**HTML modal:**
```html
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-inspection">
  <div class="modal">
    <div class="modal-header">
      <h2>🔍 Tura Saptamanala</h2>
      <button class="modal-close" onclick="closeModal('inspection')">✕</button>
    </div>
    <div class="modal-body" id="inspectionBody"></div>
  </div>
</div>
```

---

### N17. Raport Printabil per Specie — Fisa cultura cu date din jurnal

**Descriere:** Extinde `printFisa()` existent cu date reale din jurnal pentru specia activa. Genereaza un document printabil A4 cu: interventii din anul curent (din jurnal), rezumat recolta (kg extrasi din note), si statistici simple. Valoros pentru documentatie personala sau banci/subventii APIA.

**De ce e util:** APIA si bancile cer fise de cultura cu evidenta tratamentelor. Acum Roland ar trebui sa faca manual un Excel. Feature-ul genereaza automat fisa din datele deja introduse in jurnal.

**Complexitate:** Mica | **Impact:** Mare — elimina dubla inregistrare (jurnal + Excel separat)

**Exemplu implementare:**

```javascript
function printSpeciesReport(speciesId) {
  var speciesLabel = speciesId.charAt(0).toUpperCase() + speciesId.slice(1).replace(/-/g, ' ');
  var year = new Date().getFullYear();
  var journal = getJurnalEntries();

  // Filtreaza: intrari din an curent, pentru specia activa SAU generale (fara specie specificata)
  var entries = journal.filter(function(e) {
    if (!e.date || !e.date.startsWith(String(year))) return false;
    if (!e.species) return true;
    return e.species === speciesId || e.species.toLowerCase() === speciesLabel.toLowerCase();
  }).sort(function(a, b) { return a.date.localeCompare(b.date); });

  var totalKg = 0, stropiri = 0, tunderi = 0;
  entries.forEach(function(e) {
    var t = (e.type || '').toLowerCase();
    if (t.indexOf('recolt') >= 0) {
      var m = (e.note || '').match(/(\d+(?:[.,]\d+)?)\s*kg/i);
      if (m) totalKg += parseFloat(m[1].replace(',', '.'));
    }
    if (t.indexOf('stropire') >= 0 || t.indexOf('tratament') >= 0) stropiri++;
    if (t.indexOf('taiere') >= 0 || t.indexOf('tundere') >= 0) tunderi++;
  });

  var dateGenerat = new Date().toLocaleDateString('ro-RO', { day:'2-digit', month:'2-digit', year:'numeric' });

  var html = '<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8">' +
    '<title>Fisa Cultura ' + speciesLabel + ' ' + year + '</title><style>' +
    'body{font-family:Arial,sans-serif;font-size:11pt;color:#222;margin:20mm;}' +
    'h1{font-size:16pt;border-bottom:2px solid #2d8a2d;padding-bottom:6px;color:#1a5f1a;}' +
    'h2{font-size:12pt;color:#2d8a2d;margin-top:16px;}' +
    '.box{background:#f0f9f0;border:1px solid #b8d8b8;border-radius:4px;padding:10px 14px;margin:10px 0;}' +
    '.stats{display:flex;gap:20px;flex-wrap:wrap;}' +
    '.stat{text-align:center;padding:8px 16px;background:#e8f5e8;border-radius:6px;}' +
    '.stat .val{font-size:1.4rem;font-weight:700;color:#1a5f1a;}' +
    '.stat .lbl{font-size:0.8rem;color:#555;}' +
    'table{width:100%;border-collapse:collapse;margin-top:8px;page-break-inside:auto;}' +
    'th{background:#e8f5e8;padding:6px 8px;text-align:left;border:1px solid #b8d8b8;font-size:10pt;}' +
    'td{padding:5px 8px;border:1px solid #d8e8d8;font-size:10pt;vertical-align:top;}' +
    'tr:nth-child(even){background:#f8fdf8;}' +
    '.footer{margin-top:20px;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:8px;}' +
    '@media print{body{margin:15mm}.no-print{display:none!important}}' +
    '</style></head><body>' +
    '<h1>Fisa Cultura — ' + speciesLabel + ' | ' + year + '</h1>' +
    '<p><strong>Proprietar:</strong> Roland Petrila &nbsp;|&nbsp; <strong>Locatie:</strong> Nadlac, jud. Arad ' +
    '&nbsp;|&nbsp; <strong>Generat:</strong> ' + dateGenerat + '</p>' +
    '<div class="box stats">' +
    '<div class="stat"><div class="val">' + entries.length + '</div><div class="lbl">Interventii</div></div>' +
    '<div class="stat"><div class="val">' + stropiri + '</div><div class="lbl">Tratamente</div></div>' +
    (tunderi > 0 ? '<div class="stat"><div class="val">' + tunderi + '</div><div class="lbl">Tunderi</div></div>' : '') +
    (totalKg > 0 ? '<div class="stat"><div class="val">' + totalKg.toFixed(1) + ' kg</div><div class="lbl">Recolta</div></div>' : '') +
    '</div>';

  if (entries.length > 0) {
    html += '<h2>Registru Interventii ' + year + '</h2>' +
      '<table><tr><th>Data</th><th>Tip</th><th>Nota</th></tr>';
    entries.forEach(function(e) {
      html += '<tr><td style="white-space:nowrap;">' + e.date + '</td><td>' +
        escapeHtml(e.type || '—') + '</td><td>' + escapeHtml(e.note || '—') + '</td></tr>';
    });
    html += '</table>';
  } else {
    html += '<p style="color:#888;">Nicio interventie inregistrata in jurnal pentru ' + speciesLabel + ' in ' + year + '.</p>';
  }

  html += '<div class="footer">Generat de Livada Mea Dashboard (livada-mea-psi.vercel.app) pe ' +
    dateGenerat + ' &nbsp;|&nbsp; Date din jurnalul personal de cultura &nbsp;|&nbsp; Roland Petrila</div>' +
    '<script>window.print();window.onafterprint=function(){window.close();};<\/script>' +
    '</body></html>';

  var popup = window.open('', '_blank', 'width=800,height=600');
  if (!popup) {
    showToast('Popup blocat! Permite popup-uri pentru livada-mea-psi.vercel.app in browser.', 'error');
    return;
  }
  popup.document.write(html);
  popup.document.close();
}
```

**Integrare:** Adauga butonul in fiecare tab de specie, langa butonul `printFisa()` existent:
```html
<button onclick="printSpeciesReport(activeTab)"
  style="font-size:0.8rem;padding:8px 14px;" class="btn btn-secondary">
  🖨️ Raport Cultura
</button>
```

---

## SUMAR PRIORITATI — Runda 9

| Prioritate | # | Nume | Complexitate | Impact | Categorie |
|---|---|---|---|---|---|
| **P1 — IMPORTANT** | N8 | GDD Calculator — predictie fenologica | Medie | Maxim | Feature |
| **P1 — IMPORTANT** | N9 | Planner Saptamanal 7 zile | Medie | Mare | UX/Feature |
| **P1 — IMPORTANT** | N10 | Risc boala per specie specific | Mica | Mare | Feature |
| **P2 — VALOROS** | N11 | Chill Hours Tracker | Medie | Mare | Feature |
| **P2 — VALOROS** | N12 | Jurnal Vocal — Web Speech API | Mica | Mediu | UX |
| **P2 — VALOROS** | N15 | Note per pom individual | Mica | Mediu-Mare | Feature |
| **P2 — VALOROS** | N16 | Tura saptamanala checklist | Medie | Mare | Feature |
| **P2 — VALOROS** | N17 | Raport printabil per specie | Mica | Mare | Feature |
| **P3 — STRATEGIC** | N13 | Comparator specii calendare | Mica | Mediu | UX/Feature |
| **P3 — STRATEGIC** | N14 | Harta livada vizuala — grid 100+ pomi | Mare | Mare | Feature |

---

## NOTE IMPLEMENTARE — Runda 9

1. **Date disponibile ACUM:** N8 (GDD) si N11 (Chill Hours) folosesc `livada-meteo-history` deja in localStorage — zero API nou. Necesita `loadMeteoHistory()` apelat la init (deja exista).

2. **Toate frontend-only:** Niciun feature din runda 9 nu necesita API route nou. N10 poate beneficia optional de un update in `meteo-cron.js` pentru mai multa precizie, dar functioneaza si fara.

3. **Dependente intre features:**
   - N15 (note per pom) si N14 (harta) partajeaza `livada-trees` / `livada-tree-map` — implementeaza N15 primul
   - N8 (GDD) + N11 (Chill Hours) → acelasi helper `loadMeteoHistory()` — implementeaza impreuna
   - N16 (tura) → finalizeaza adaugand in jurnal → integrat cu N12 (vocal)

4. **Ordine recomandata implementare:** N17 (30 min) → N12 (30 min) → N10 (45 min) → N15 (1h) → N9 (2h) → N8+N11 (2h) → N16 (2h) → N13 (1h) → N14 (4h+)

5. **GDD milestones:** Valorile sunt orientative pentru clima Nadlac/Arad. Calibreaza dupa observatii reale din primele sezoane de utilizare.

6. **Chill Hours (N11):** Estimarea din date zilnice are ±20% eroare. Suficienta pentru alerte timpurii. Precizie mai buna necesita date hourly (update `meteo-cron.js`).

7. **Jurnal Vocal (N12):** Testeaza pe Android Chrome — Web Speech API nu functioneaza offline (necesita conexiune pentru recunoastere Google). Afiseaza butonul conditionat cu verificare suport.

8. **Ce NU se schimba:** Arhitectura Edge Runtime, stack Groq+Gemini, API routes existente, structura localStorage existenta (`livada-jurnal`, `livada-theme`, etc.), layout general HTML, single-file constraint.
