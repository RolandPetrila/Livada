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
- ⬜ **V1** renderStats() — Recolta kg per specie vizuala + comparatie ani
- ⬜ **V2** injectSpeciesHistory() — Interval de la ultimul tratament + warning
- ⬜ **V3** submitDiagnose() — Buton "Calculeaza doza" post-diagnostic
- ⬜ **V4** addJurnalEntry() — Warning interval minim intre tratamente
- ⬜ **V5** generateReport() — Invalidare cache la adaugare jurnal
- ⬜ **V6** loadGallery() — Data upload vizibila + sortare cronologica
- ⬜ **N1** PHI Calculator — Alerta pauza securitate inainte de recoltare
- ⬜ **N2** Spray Window 7 zile — Calendar cu zile optime stropire din prognoza
- ⬜ **N3** Stoc Produse — Inventar produse fitosanitare cu cantitati
- ⬜ **N4** Cost per tratament — Camp cost in jurnal + sumar cheltuieli
- ⬜ **N5** Timeline Specie — Vedere cronologica integrata foto+jurnal+diagnose
- ⬜ **N6** Import CSV Jurnal — Import din Excel/CSV
- ⬜ **N7** Push Notifications — Inghet + tratamente (iOS 16.4+)
- ⬜ **T6** Groq Llama 4 upgrade — Scout/Maverick mai rapid
- ⬜ **T7** Report cache invalidation — Reset TTL la jurnal nou
- ⬜ **T8** Meteo deduplicare request — Nu refetch < 5 min
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
