# RECOMANDARI IMBUNATATIRI v2 — Livada Mea Dashboard

**Data:** 2026-03-28
**Versiune:** 2.0 (inlocuieste v1 din 2026-03-27)
**Analizat:** Codebase complet post-Sesiunea 8 (7062 linii HTML, 9 API routes, PWA)
**Metoda:** Citire cod real, gap analysis, web research, comparatie cu v1

---

## CONTEXT ACTUALIZAT

Fata de analiza v1:
- **Implementate din v1:** Dashboard Azi (#11), Alerte per specie (#9), Jurnal editare+filtre (#3), Export CSV/text (#10), Backup/Restore (#14), Checklist stropire (#17), Print fisa (#16), Tracking recolta (#18)
- **Migrat:** OpenWeatherMap → Open-Meteo (gratuit permanent, fara API key)
- **Fix-at:** AI timeout chain (Backend 25s → Vercel 60s → Frontend 65s)
- **Model stabil:** Groq llama-3.3-70b-versatile (revert de la llama-4-scout)
- **HTML:** 7062 linii / ~490KB
- **Redis:** Neprovizionat (actiune manuala Roland)

---

## PARTEA I — IMBUNATATIRI FUNCTII EXISTENTE

---

### 1. `fetchMeteo()` — Adauga prognoza 5 zile

**Fisier:** `public/index.html` — linia ~6357
**Problema actuala:** Afiseaza doar conditiile CURENTE (temperatura, umiditate, vant). Open-Meteo ofera gratuit prognoza 16 zile, dar nu e folosita in frontend. `meteo-cron.js` deja cere `forecast_days=5` dar datele daily nu ajung la utilizator.

**Imbunatatire propusa:**
- Adauga `daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` la fetch-ul frontend
- Afiseaza sub meteo curent: 5 carduri orizontale cu zi/temp_min/temp_max/emoji
- Highlight zile cu inghet (temp_min < 0) sau ploaie (precipitation > 5mm)

**Exemplu implementare:**
```javascript
async function fetchMeteo() {
  var el = document.getElementById('meteoData');
  el.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Se incarca...</p>';
  try {
    var res = await fetchWithTimeout(
      'https://api.open-meteo.com/v1/forecast?latitude=46.17&longitude=20.75' +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code' +
      '&timezone=Europe/Bucharest&forecast_days=5', {}, 10000);
    if (!res.ok) throw new Error('Open-Meteo error ' + res.status);
    var d = await res.json();
    var c = d.current;
    // ... cod existent pentru current ...

    // Prognoza 5 zile
    var forecastHtml = '<div class="meteo-forecast">';
    var DAYS_SHORT = ['Du','Lu','Ma','Mi','Jo','Vi','Sa'];
    for (var i = 0; i < d.daily.time.length; i++) {
      var dt = new Date(d.daily.time[i] + 'T12:00');
      var dayName = i === 0 ? 'Azi' : DAYS_SHORT[dt.getDay()];
      var tMin = Math.round(d.daily.temperature_2m_min[i]);
      var tMax = Math.round(d.daily.temperature_2m_max[i]);
      var rain = d.daily.precipitation_sum[i];
      var wcode = d.daily.weather_code[i];
      var cls = tMin < 0 ? ' frost' : rain > 5 ? ' rainy' : '';
      forecastHtml += '<div class="mf-day' + cls + '">' +
        '<div class="mf-name">' + dayName + '</div>' +
        '<div class="mf-icon">' + wmoEmoji(wcode) + '</div>' +
        '<div class="mf-temps">' + tMax + '°/' + tMin + '°</div>' +
        (rain > 0 ? '<div class="mf-rain">' + rain.toFixed(1) + '</div>' : '') +
        '</div>';
    }
    forecastHtml += '</div>';
    el.innerHTML += forecastHtml;
  } catch (err) { /* existent */ }
}
```

```css
.meteo-forecast { display:flex; gap:6px; margin-top:16px; overflow-x:auto; padding-bottom:4px; }
.mf-day { flex:0 0 auto; min-width:64px; text-align:center; padding:8px 6px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border); }
.mf-day.frost { border-color:var(--info); background:rgba(90,159,212,0.1); }
.mf-day.rainy { border-color:var(--warning); }
.mf-name { font-size:0.72rem; font-weight:700; color:var(--text-dim); }
.mf-icon { font-size:1.4rem; margin:4px 0; }
.mf-temps { font-size:0.78rem; font-weight:600; }
.mf-rain { font-size:0.65rem; color:var(--info); }
```

**Complexitate:** Mica | **Impact:** Mare
**Nota:** Datele sunt DEJA disponibile gratuit, doar nu sunt afisate. ROI maxim.

---

### 2. `doSearch()` — Cautare cu highlight in text si navigare la rezultat

**Fisier:** `public/index.html` — linia ~6042
**Problema actuala:** Cautarea marcheaza doar TAB-URILE cu match, dar nu evidentiaza textul gasit IN CONTINUT. Utilizatorul gaseste tab-ul dar trebuie sa caute manual in pagina. Functia `mark.search-hl` e definita in CSS dar nu e folosita efectiv.

**Imbunatatire propusa:**
- La click pe tab cu match, evidentiaza termenul cautat in continut cu `<mark>`
- Scroll automat la primul match
- Afiseaza numarul de match-uri per tab

**Exemplu implementare:**
```javascript
function highlightInActiveTab(query) {
  if (!query || query.length < 2) return;
  clearSearchHighlights();
  var active = document.querySelector('.tab-content.active');
  if (!active) return;
  var walker = document.createTreeWalker(active, NodeFilter.SHOW_TEXT);
  var toReplace = [];
  while (walker.nextNode()) {
    var node = walker.currentNode;
    var idx = node.textContent.toLowerCase().indexOf(query.toLowerCase());
    if (idx >= 0) toReplace.push({ node: node, index: idx, length: query.length });
  }
  toReplace.reverse().forEach(function(item) {
    var mark = document.createElement('mark');
    mark.className = 'search-hl';
    var range = document.createRange();
    range.setStart(item.node, item.index);
    range.setEnd(item.node, item.index + item.length);
    range.surroundContents(mark);
  });
  var first = active.querySelector('mark.search-hl');
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

**Complexitate:** Medie | **Impact:** Mare
**Nota:** CSS pentru `mark.search-hl` exista, dar logica de highlight nu e activa.

---

### 3. `editJurnalEntry()` — Editare inline in loc de `prompt()`

**Fisier:** `public/index.html` — linia ~6217
**Problema actuala:** Editarea foloseste `prompt()` nativ — popup urit, nu se vede textul lung, nu are multi-line. Pe Android e si mai rau.

**Imbunatatire propusa:**
- Inlocuieste `prompt()` cu editare inline: click pe nota → textarea editabila
- Buton Salveaza/Anuleaza sub textarea

**Exemplu implementare:**
```javascript
function editJurnalEntry(id) {
  var entries = getJurnalEntries();
  var e = entries.find(function(x) { return x.id === id; });
  if (!e) return;
  var entryEl = document.querySelector('.jurnal-entry[data-id="' + id + '"]');
  if (!entryEl) return;
  var textEl = entryEl.querySelector('.je-text');
  if (!textEl || textEl.dataset.editing) return;
  textEl.dataset.editing = 'true';
  textEl.innerHTML = '<textarea class="je-edit-area" rows="3">' + escapeHtml(e.note) + '</textarea>' +
    '<div style="display:flex;gap:6px;margin-top:6px;">' +
    '<button class="btn btn-primary" style="padding:4px 12px;font-size:0.75rem;" onclick="saveJurnalEdit(' + id + ')">Salveaza</button>' +
    '<button class="btn btn-secondary" style="padding:4px 12px;font-size:0.75rem;" onclick="renderJurnal()">Anuleaza</button></div>';
  textEl.querySelector('textarea').focus();
}
function saveJurnalEdit(id) {
  var ta = document.querySelector('.jurnal-entry[data-id="' + id + '"] .je-edit-area');
  if (!ta || !ta.value.trim()) return;
  var entries = getJurnalEntries();
  var e = entries.find(function(x) { return x.id === id; });
  if (e) { e.note = ta.value.trim(); saveJurnalEntries(entries); syncJournal(); }
  renderJurnal();
}
```

```css
.je-edit-area { width:100%; padding:8px; border-radius:6px; background:var(--bg-card); border:1px solid var(--accent); color:var(--text); font-size:0.85rem; font-family:inherit; resize:vertical; }
```

**Complexitate:** Mica | **Impact:** Mediu

---

### 4. `renderCalendar()` — Calendar cu evenimente din jurnal

**Fisier:** `public/index.html` — linia ~6282
**Problema actuala:** Calendarul afiseaza doar 11 perioade de tratament HARDCODED. Nu arata interventiile din jurnal, nu diferentiaza intre specii.

**Imbunatatire propusa:**
- Overlay interventii din jurnal pe zilele calendarului (puncte colorate)
- Click pe zi → afiseaza interventiile din acea zi

**Exemplu implementare:**
```javascript
// In renderCalendar(), dupa generarea zilelor:
var jEntries = getJurnalEntries();
var yearMonth = calYear + '-' + String(calMonth + 1).padStart(2, '0');
var jByDay = {};
jEntries.forEach(function(e) {
  if (e.date && e.date.startsWith(yearMonth)) {
    var day = parseInt(e.date.split('-')[2]);
    if (!jByDay[day]) jByDay[day] = [];
    jByDay[day].push(e);
  }
});
// Adauga dot pe zilele cu interventii
// Click pe zi => afiseaza detaliile in calEvents
```

```css
.cal-j-dot { display:block; width:4px; height:4px; background:var(--warning); border-radius:50%; margin:2px auto 0; }
```

**Complexitate:** Medie | **Impact:** Mare

---

### 5. `sanitizeAI()` — Fix timing DOMPurify

**Fisier:** `public/index.html` — linia ~6470 si ~7059
**Problema actuala:** DOMPurify se incarca cu `defer` DUPA `</body>` (linia 7059), dar `sanitizeAI()` e definita in scriptul inline. La prima utilizare, DOMPurify poate fi `undefined` si se foloseste fallback-ul care nu e la fel de sigur.

**Imbunatatire propusa:**
- Muta tag-ul `<script src="dompurify">` INAINTE de `<script>` inline principal
- SAU: schimba `defer` in `async` si adauga check mai robust in sanitizeAI

**Complexitate:** Mica | **Impact:** Mediu (Securitate)

---

### 6. `escapeHtml()` — Elimina definitia dubla

**Fisier:** `public/index.html` — linia ~6246 si ~6465
**Problema actuala:** Definita de 2 ori. A doua o suprascrie pe prima. Cod duplicat.

**Imbunatatire propusa:** Sterge prima definitie (6246-6250).

**Complexitate:** Mica | **Impact:** Mic (Calitate cod)

---

### 7. `initDashboardAzi()` — Prognoza 3 zile + spray score + urmatorul tratament

**Fisier:** `public/index.html` — linia ~6893
**Problema actuala:** Dashboard-ul are sfat generic per luna, alerte si meteo curent. Nu ofera PROGNOZA, nu sugereaza ziua optima de stropire, nu spune ce tratament urmeaza.

**Imbunatatire propusa:**
- Sectiune "Urmatoarele 3 zile" cu temperaturi, precipitatii, si spray score
- Sectiune "Urmatorul tratament" din TREATMENTS_CAL cu countdown
- Fetch-uri paralele (nu secventiale) cu Promise.allSettled

**Exemplu implementare:**
```javascript
function calculateSprayScore(temp, wind, rain, humidity) {
  var score = 100;
  if (temp < 5 || temp > 30) return 0;
  if (wind > 15) return 0;
  if (rain > 2) return 0;
  if (temp < 10) score -= (10 - temp) * 5;
  if (temp > 25) score -= (temp - 25) * 8;
  if (wind > 10) score -= (wind - 10) * 4;
  if (rain > 0) score -= rain * 15;
  if (humidity > 90) score -= 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getNextTreatment() {
  var now = new Date(), month = now.getMonth() + 1, day = now.getDate();
  for (var i = 0; i < TREATMENTS_CAL.length; i++) {
    var t = TREATMENTS_CAL[i];
    var sM = t.m1, sD = t.d1 || 1, eM = t.m2, eD = t.d2 || 28;
    if (month < sM || (month === sM && day < sD)) {
      var target = new Date(now.getFullYear(), sM - 1, sD);
      return { treatment: t, daysUntil: Math.ceil((target - now) / 86400000), status: 'upcoming' };
    }
    if ((month > sM || (month === sM && day >= sD)) && (month < eM || (month === eM && day <= eD))) {
      return { treatment: t, daysUntil: 0, status: 'active' };
    }
  }
  return null;
}
```

**Complexitate:** Medie | **Impact:** Maxim
**Nota:** Combina #16 (Spray Score) si #19 (Urmatorul tratament) direct in dashboard.

---

### 8. `openModal()` / `closeModal()` — Escape key + focus trap

**Fisier:** `public/index.html` — linia ~6080
**Problema actuala:** Escape nu inchide modalul. Tab navigheaza in afara modalului.

**Exemplu implementare:**
```javascript
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var open = document.querySelector('.modal-overlay.open');
    if (open) closeModal(open.id.replace('modal-', ''));
  }
  if (e.key === 'Tab') {
    var modal = document.querySelector('.modal-overlay.open .modal');
    if (!modal) return;
    var focusable = modal.querySelectorAll('button, input, textarea, select, [tabindex="0"]');
    if (!focusable.length) return;
    if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable[focusable.length-1].focus(); }
    else if (!e.shiftKey && document.activeElement === focusable[focusable.length-1]) { e.preventDefault(); focusable[0].focus(); }
  }
});
```

**Complexitate:** Mica | **Impact:** Mediu (Accesibilitate)

---

### 9. `backupData()` — Auto-backup reminder

**Fisier:** `public/index.html` — linia ~6948
**Problema actuala:** Backup complet manual. Fara reminder, daca telefonul se strica, tot jurnalul e pierdut.

**Imbunatatire propusa:**
- La fiecare 7 zile sau 10+ interventii noi, afiseaza banner "Nu ai facut backup de X zile"
- Include metadata in backup (data, versiune, numar intrari)

**Complexitate:** Mica | **Impact:** Mediu

---

### 10. `printFisa()` — Curatare HTML pentru print

**Fisier:** `public/index.html` — linia ~7027
**Problema actuala:** Copiaza innerHTML brut — include butoane interactive, CSS inline incomplet.

**Imbunatatire propusa:**
- Clone + sterge `.sp-tools, button, input, select` din output
- CSS print dedicat mai complet
- Header cu data, specie, locatie

**Complexitate:** Mica | **Impact:** Mediu

---

### 11. `syncJournal()` — Timestamp ultima sincronizare

**Fisier:** `public/index.html` — linia ~6667
**Problema actuala:** Badge-ul arata "Sincronizat" dar nu spune CAND.

**Imbunatatire propusa:**
- Salveaza timestamp in localStorage la sync reusit
- Afiseaza "Sincronizat acum 2h" in badge

**Complexitate:** Mica | **Impact:** Mic

---

### 12. `calculateDose()` — Volum total per numar de pomi

**Fisier:** `public/index.html` — linia ~6119
**Problema actuala:** Arata doar doza/litru. Roland trebuie sa calculeze manual cata solutie ii trebuie pentru 100 pomi.

**Imbunatatire propusa:**
- Camp optional "Numar pomi" + "Litri per pom" (default 5L)
- Calculeaza: volum total solutie + cantitate totala produs

**Complexitate:** Mica | **Impact:** Mare
**Nota:** Raspunde la intrebarea reala: "Cat produs cumpar pentru toata livada?"

---

### 13. Recolta — Vizualizare sumar per specie

**Fisier:** `public/index.html` — tracking in jurnal (linia ~6148)
**Problema actuala:** Campurile specie + kg exista la tip "recoltare", dar datele NU sunt vizualizate. Recolta e ingropata in jurnal.

**Imbunatatire propusa:**
- Sectiune in tab "Plan Livada": tabel specie | kg total | nr recoltari
- Selector an pentru comparatie

**Complexitate:** Mica | **Impact:** Mediu

---

### 14. `rateLimit()` — Rate limiter persistent cu Redis

**Fisier:** `api/_auth.js` — linia ~43
**Problema actuala:** Map() in memorie, se reseteaza la fiecare cold start serverless. Rate limiting-ul NU functioneaza.

**Imbunatatire propusa:** Redis counter per IP cu TTL 60s. Fallback pe Map.

**Complexitate:** Medie | **Impact:** Mediu (Securitate)
**Nota:** Necesita Redis provizionat.

---

### 15. Service Worker — Update notification

**Fisier:** `public/sw.js` + `public/index.html`
**Problema actuala:** SW se actualizeaza silent, utilizatorul nu stie ca exista versiune noua.

**Imbunatatire propusa:** Banner "Versiune noua disponibila — Reincarca" la `updatefound`.

**Complexitate:** Mica | **Impact:** Mediu

---

## PARTEA II — FUNCTII NOI

---

### 16. Spray Window Score — Fereastra optima de stropire

**Descriere:** Scor 0-100 per zi bazat pe: temp 10-25°C, vant < 15 km/h, fara ploaie, umiditate < 80%. Afiseaza in Dashboard Azi si Meteo.

**De ce e util:** Timing-ul e TOTUL in pomicultura. Un scor automat economiseste produse si creste eficacitatea tratamentelor.

**Complexitate:** Medie | **Impact:** Maxim

---

### 17. Offline Indicator

**Descriere:** Banner cand e offline. Dezactiveaza vizual butoanele care necesita internet (AI, Sync, Meteo). La revenire online, re-activeaza automat.

**De ce e util:** Roland e IN LIVADA cu semnal slab. Stie instant ce poate si ce nu poate face.

**Complexitate:** Mica | **Impact:** Mare

**Exemplu implementare:**
```javascript
function updateOnlineStatus() {
  var banner = document.getElementById('offlineBanner');
  if (banner) banner.style.display = navigator.onLine ? 'none' : 'block';
  document.querySelectorAll('[data-needs-online]').forEach(function(btn) {
    btn.disabled = !navigator.onLine;
    btn.style.opacity = navigator.onLine ? '1' : '0.4';
  });
}
window.addEventListener('online', function() { updateOnlineStatus(); syncJournal(); checkAlerts(); });
window.addEventListener('offline', updateOnlineStatus);
```

---

### 18. Istoric conversatii AI salvate

**Descriere:** Buton "Salveaza raspunsul" sub raspuns AI. Salvat in localStorage (max 20). Vizibil per specie.

**De ce e util:** Intrebarile se repeta sezonier. Raspunsuri salvate = 0 Groq credits + functioneaza offline.

**Complexitate:** Medie | **Impact:** Mediu

---

### 19. Sugestie urmatorul tratament

**Descriere:** In Dashboard Azi, afiseaza automat urmatorul tratament din TREATMENTS_CAL cu countdown "peste X zile".

**De ce e util:** Roland nu deschide calendarul zilnic. Informatia vine la el automat.

**Complexitate:** Mica | **Impact:** Mare

**Nota:** Combinat cu #7 in aceeasi sectiune Dashboard.

---

### 20. Foto Before/After per specie

**Descriere:** In galerie, marcheaza poze ca "before"/"after" pentru a vedea evolutia boli/tratament.

**De ce e util:** Confirma vizual daca tratamentul functioneaza.

**Complexitate:** Medie | **Impact:** Mediu

---

### 21. Notificari browser — Reminder tratament

**Descriere:** Notification API pe Android PWA. Reminder cand se apropie o perioada de tratament si conditiile meteo sunt favorabile.

**De ce e util:** Roland uita sa verifice app-ul. O notificare "Maine e ideal pentru stropire!" il ajuta.

**Complexitate:** Mare | **Impact:** Mare
**Nota:** Functioneaza doar cu app-ul instalat (PWA). Push Notifications necesita service worker + push server = viitor.

---

### 22. Monitorizare localStorage

**Descriere:** Calculeaza dimensiunea folosita si avertizeaza la > 80% din 5MB.

**De ce e util:** Cu jurnalul crescand, localStorage se poate umple. Pierdere date fara avertizare = catastrofa.

**Complexitate:** Mica | **Impact:** Mediu

---

### 23. CSP header in vercel.json

**Descriere:** Content-Security-Policy header pentru protectie XSS suplimentara.

**De ce e util:** Layer de securitate zero-cost. Previne executia de scripturi externe neautorizate.

**Complexitate:** Mica | **Impact:** Mediu (Securitate)

**Exemplu implementare:**
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https://*.public.blob.vercel-storage.com data:; connect-src 'self' https://api.open-meteo.com https://api.groq.com https://generativelanguage.googleapis.com"
}
```

---

## PARTEA III — IMBUNATATIRI TEHNICE

---

### 24. Eliminare cod duplicat escapeHtml

**Problema:** Definita de 2 ori (linia ~6246 si ~6465).
**Solutie:** Sterge prima definitie.
**Complexitate:** Mica | **Impact:** Calitate cod

---

### 25. Global error handler

**Problema:** Erori JS async sunt silentioase — feature-ul nu functioneaza, utilizatorul nu stie de ce.
**Solutie:** `unhandledrejection` handler + toast discret.
**Complexitate:** Mica | **Impact:** Mentenanta

```javascript
window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled:', e.reason);
  showToast('Eroare: ' + (e.reason?.message || 'ceva nu a functionat'));
});
function showToast(msg) {
  var t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 4000);
}
```

---

### 26. Lazy init modals

**Problema:** Toate 7 modalele in DOM la load = ~300 noduri inutile.
**Solutie:** Creeaza la prima deschidere (pattern-ul exista deja la checklist).
**Complexitate:** Medie | **Impact:** Performanta (minor)

---

### 27. Cron health check in Dashboard

**Problema:** Daca meteo-cron nu ruleaza, alertele si istoricul sunt goale. Nimeni nu stie.
**Solutie:** Verifica varsta ultimei inregistrari. Daca > 48h, afiseaza avertizare.
**Complexitate:** Mica | **Impact:** Mentenanta

---

### 28. Fetch-uri paralele in Dashboard Azi

**Problema:** `initDashboardAzi()` face 2 fetch-uri secventiale. Total: ~3-6s pe conexiune lenta.
**Solutie:** `Promise.allSettled()` pentru fetch-uri independente.
**Complexitate:** Mica | **Impact:** Performanta

---

### 29. Calendar keyboard navigation

**Problema:** Calendarul nu e navigabil cu tastatura. Zilele sunt div fara tabindex.
**Solutie:** `role="grid"`, `role="gridcell"`, arrow key navigation.
**Complexitate:** Medie | **Impact:** Accesibilitate

---

### 30. aria-live pentru continut dinamic

**Problema:** Screen readere nu anunta cand AI raspunde, meteo se incarca, alerte apar.
**Solutie:** `aria-live="polite"` pe containere dinamice.
**Complexitate:** Mica | **Impact:** Accesibilitate

---

### 31. Memoizare context AI

**Problema:** La fiecare submitAsk(), DOM-ul tab-ului e parsat complet (3000 chars). 3 intrebari = 3 parsari identice.
**Solutie:** Cache context per species ID, invalidare la tab switch.
**Complexitate:** Mica | **Impact:** Performanta (minor)

---

## SUMAR PRIORITATI

| Prioritate | # | Nume | Complexitate | Impact | Categorie |
|---|---|---|---|---|---|
| **P0 — URGENT** | 5 | Fix DOMPurify timing | Mica | Mediu | Securitate |
| **P0 — URGENT** | 6 | Elimina escapeHtml dublu | Mica | Mic | Calitate cod |
| **P0 — URGENT** | 23 | CSP header | Mica | Mediu | Securitate |
| **P1 — IMPORTANT** | 1 | Prognoza 5 zile meteo | Mica | Mare | UX |
| **P1 — IMPORTANT** | 7 | Dashboard spray score + prognoza + next treatment | Medie | Maxim | UX |
| **P1 — IMPORTANT** | 17 | Offline indicator | Mica | Mare | UX |
| **P1 — IMPORTANT** | 28 | Fetch-uri paralele Dashboard | Mica | Mediu | Performanta |
| **P2 — VALOROS** | 2 | Cautare cu highlight | Medie | Mare | UX |
| **P2 — VALOROS** | 3 | Jurnal editare inline | Mica | Mediu | UX |
| **P2 — VALOROS** | 4 | Calendar cu jurnal overlay | Medie | Mare | UX |
| **P2 — VALOROS** | 8 | Modal Escape + focus trap | Mica | Mediu | Accesibilitate |
| **P2 — VALOROS** | 12 | Calculator per nr pomi | Mica | Mare | UX |
| **P2 — VALOROS** | 13 | Recolta sumar vizual | Mica | Mediu | UX |
| **P2 — VALOROS** | 25 | Global error handler | Mica | Mediu | Mentenanta |
| **P3 — STRATEGIC** | 9 | Auto-backup reminder | Mica | Mediu | UX |
| **P3 — STRATEGIC** | 10 | Print curatare HTML | Mica | Mediu | UX |
| **P3 — STRATEGIC** | 11 | Sync timestamp | Mica | Mic | UX |
| **P3 — STRATEGIC** | 14 | Rate limiter Redis | Medie | Mediu | Securitate |
| **P3 — STRATEGIC** | 15 | SW update notification | Mica | Mediu | UX |
| **P3 — STRATEGIC** | 18 | Istoric AI salvat | Medie | Mediu | Feature nou |
| **P3 — STRATEGIC** | 21 | Notificari browser | Mare | Mare | Feature nou |
| **P3 — STRATEGIC** | 22 | Monitorizare localStorage | Mica | Mediu | Mentenanta |
| **P3 — STRATEGIC** | 27 | Cron health check | Mica | Mediu | Mentenanta |
| **P4 — NICE-TO-HAVE** | 20 | Foto before/after | Medie | Mediu | Feature nou |
| **P4 — NICE-TO-HAVE** | 24 | Cod duplicat cleanup | Mica | Mic | Calitate cod |
| **P4 — NICE-TO-HAVE** | 26 | Lazy init modals | Medie | Mic | Performanta |
| **P4 — NICE-TO-HAVE** | 29 | Calendar keyboard nav | Medie | Mediu | Accesibilitate |
| **P4 — NICE-TO-HAVE** | 30 | aria-live regions | Mica | Mediu | Accesibilitate |
| **P4 — NICE-TO-HAVE** | 31 | Memoizare context AI | Mica | Mic | Performanta |

---

## NOTE IMPLEMENTARE

1. **Constrangere dimensiune:** HTML e 7062 linii / ~490KB. Implementarea TUTUROR ar adauga ~1500 linii. Maxim 15-20 per sesiune.

2. **Dependinta Redis:** #14 (rate limiter) si #27 (cron health) necesita Redis provizionat. ACTIUNE MANUALA Roland: Vercel Dashboard → Storage → Create KV.

3. **Dependinte intre recomandari:**
   - #7 incorporeaza #16 (Spray Score) si #19 (Next Treatment) in Dashboard
   - #1 (Prognoza 5 zile) si #7 pot partaja acelasi fetch Open-Meteo → 1 request
   - #17 (Offline) e independent, se poate implementa oricand

4. **Ce NU se schimba:**
   - Structura A-G per specie (content static, complet)
   - Modelele AI (llama-3.3-70b + Gemini 2.5 Flash)
   - Timeout chain (Backend 25s → Vercel 60s → Frontend 65s)
   - Arhitectura single-file

5. **Ordine recomandata:**
   - **Sesiunea 9:** P0 (#5, #6, #23) + P1 (#1, #7, #17, #28) — securitate + spray score + prognoza + offline
   - **Sesiunea 10:** P2 top (#2, #3, #4, #8, #12, #13, #25) — UX improvements
   - **Sesiunea 11:** P3 selectiv (#9, #14, #15, #18) — strategic
   - P4: doar daca mai ramane context

6. **Comparatie v1 → v2:** 8 din 30 v1 implementate. Aceasta v2 propune 31 recomandari noi pe codul actualizat.
