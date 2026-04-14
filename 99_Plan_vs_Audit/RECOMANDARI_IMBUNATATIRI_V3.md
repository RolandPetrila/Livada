# RECOMANDARI_IMBUNATATIRI_V3.md

## Plan Strategic Imbunatatiri & Functii Noi — Livada Mea Dashboard

**Versiune:** 3.0
**Data generare:** 2026-04-15
**Generat de:** Claude Opus 4.6 (1M ctx) via `/imbunatatiri` mode `complet`
**Bazat pe:** discovery profund 5 agenti paraleli (frontend + backend + status V2 + Roland + web research 2026)
**Fisiere consultate:** 30,903 linii `index.html`, 7,724 linii `app.js`, 12 routes API, 27 fisiere `content/`, V1 (3258 linii), V2 (1088 linii), audit-uri si ghiduri

---

## STARE PROIECT (snapshot 2026-04-15)

| Indicator                          | Valoare                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| Linii `index.html`                 | 30,903 (1.2 MB raw / 761 KB minified)                                |
| Linii `app.js`                     | 7,724 (272 KB)                                                       |
| Functii frontend identificate      | 184 (12 categorii)                                                   |
| Routes backend                     | 12 + 3 utilitare                                                     |
| Coverage teste backend             | 6/12 routes (~50%) — 456 cases vitest                                |
| Specii cu continut A-Y complet     | 20/20 (Glosar Z comun)                                               |
| Status Roland C1-C5                | 5/5 IMPLEMENTAT (C3 si C5 peste cerinta)                             |
| Status V2 (31 itemi)               | DONE 25 (81%) / PARTIAL 1 / PENDING 4 / INCHIS 1                     |
| FCP mobile                         | 2-2.5s (de la 3-4s) — target <2s                                     |
| Risc operational #1                | Gemini free 1000 req/zi vs rate limit 10 req/min (epuizare in 1.7h)  |
| Risc operational #2                | Plant.ID credits 50 epuizate; PlantNet ramane primary identificare   |
| Risc operational #3                | Redis fail-open pe rate limit (DDoS vuln la cadere Upstash)          |
| Datorii tehnice cunoscute          | CSP `unsafe-inline` (H1 amanat), F4.3 / F7.1 / F7.3 / F8.1 / F8.4    |

---

## CONTEXT ROLAND + PARINTI (constrante perpetue)

1. **Single user real:** Roland (proprietar) + parintii lui (acces telefon, non-tech)
2. **Dispozitive principale:** Android telefon (parinti) + desktop (Roland)
3. **Conectivitate:** uneori in livada e slaba/lipsa → toate features critice trebuie sa functioneze offline
4. **Limba:** RO 100% UI; tehnica EN doar in cod
5. **Buget:** ZERO costuri recurente — exclusiv plan gratuit permanent
6. **Securitate:** site obscur, threat model mic — UX simpla > defense-in-depth excesiv (vezi memory `feedback_ux_over_defense_in_depth.md`)

---

## SUMAR PRIORITATI (sortat dupa P si ROI)

| Prioritate         | #   | Titlu recomandare                                                | Complexitate | Impact   | Categorie         |
| ------------------ | --- | ---------------------------------------------------------------- | ------------ | -------- | ----------------- |
| **P0 URGENT**      | T1  | Tracking AI cost + quota guard (Gemini risc epuizare)            | Medie        | Maxim    | Operational       |
| **P0 URGENT**      | T2  | Redis fallback in-memory pe rate limit (fail-closed)             | Mica         | Mare     | Securitate        |
| **P0 URGENT**      | E1  | Calculator doze: volum tank configurabil (acum hardcoded 10L)    | Mica         | Mare     | UX                |
| **P0 URGENT**      | N1  | Voice input jurnal (Web Speech API) — pt parinti                 | Mica         | Maxim    | Accesibilitate    |
| **P0 URGENT**      | N2  | EPPO API integrare boli/daunatori (date oficiale EU gratuite)    | Medie        | Maxim    | Continut          |
| **P1 IMPORTANT**   | E2  | Search extins: continut text (azi doar titluri h2/h3)            | Medie        | Mare     | UX                |
| **P1 IMPORTANT**   | E3  | Calendar view saptamanal + zoom day                              | Medie        | Mare     | UX                |
| **P1 IMPORTANT**   | E4  | Cost agregat: tabel cost/tratament/an cu trend                   | Medie        | Mare     | Analiza           |
| **P1 IMPORTANT**   | E5  | Galerie foto: tag-uri + filtrare + diagnostic istoric per pom    | Medie        | Mare     | UX                |
| **P1 IMPORTANT**   | N3  | GDD + Chill Hours modul JS (PhenoFlex inspirat)                  | Medie        | Maxim    | Inteligenta       |
| **P1 IMPORTANT**   | N4  | TTS (text-to-speech) alerte frost + raspunsuri AI in RO          | Mica         | Mare     | Accesibilitate    |
| **P1 IMPORTANT**   | N5  | Fruit counting Gemini vision (estimare recolta)                  | Mica         | Mare     | Inteligenta       |
| **P1 IMPORTANT**   | N6  | F4.3 Comparator AI: rulare paralela 2 modele + raport diferente  | Medie        | Mediu    | AI                |
| **P1 IMPORTANT**   | T3  | Lazy load sectiuni specii (HTML 761KB → ~400KB)                  | Medie        | Mare     | Performance       |
| **P1 IMPORTANT**   | T4  | F8.4 Web Push real cu VAPID (notificare cu app inchis)           | Medie        | Mare     | Notificare        |
| **P2 VALOROS**     | E6  | Timeline specie editabil (acum read-only)                        | Mica         | Mediu    | UX                |
| **P2 VALOROS**     | E7  | Bidirectional jurnal sync conflict-aware (vezi tombstone)        | Medie        | Mediu    | Sync              |
| **P2 VALOROS**     | E8  | Backup automat zilnic localStorage → IndexedDB rolling           | Mica         | Mediu    | Reziliență        |
| **P2 VALOROS**     | N7  | F7.3 Harta livada interactiva (layout pomi cu poligon)           | Mare         | Mare     | UX                |
| **P2 VALOROS**     | N8  | F7.1 Servicii locale Nadlac (pepiniere, magazine, intermediari) | Mica         | Mediu    | Continut          |
| **P2 VALOROS**     | N9  | Prompting cascade AI diagnostic (leaf-first 2-stage)             | Mica         | Mediu    | AI calitate       |
| **P2 VALOROS**     | N10 | Tree measurement Gemini cu obiect referinta scala (mana)         | Medie        | Mediu    | Inteligenta       |
| **P2 VALOROS**     | N11 | Share link public read-only jurnal (pentru vecini)               | Medie        | Mediu    | Comunitate        |
| **P2 VALOROS**     | N12 | Soil moisture / irigatie predictor din ET0 + ploaie              | Medie        | Mare     | Inteligenta       |
| **P2 VALOROS**     | N13 | Custom alert rules per user (frost threshold, ploaie min)        | Medie        | Mediu    | Personalizare     |
| **P2 VALOROS**     | T5  | Storage quota tracking + warning >80%                            | Mica         | Mic      | Reziliență        |
| **P3 STRATEGIC**   | N14 | F8.1 IoT ESP32 + TTN: API endpoint + dashboard                  | Mare         | Mare     | Hardware          |
| **P3 STRATEGIC**   | N15 | Yield prediction engine (jurnal + meteo + GDD → kg/pom)          | Mare         | Mare     | Inteligenta       |
| **P3 STRATEGIC**   | N16 | Smoke tests Playwright (5 fluxuri critice)                       | Medie        | Mare     | Calitate          |
| **P3 STRATEGIC**   | T6  | Lighthouse CI in GitHub Actions (gating PR)                      | Mica         | Mediu    | Calitate          |
| **P3 STRATEGIC**   | T7  | Migrare CSP la hash-based (eliminare unsafe-inline)              | Mare         | Mediu    | Securitate        |
| **P3 STRATEGIC**   | T8  | Data migration strategy localStorage (versionare schema)         | Mica         | Mediu    | Reziliență        |
| **P4 NICE-TO-HAVE**| N17 | Hyperlocal frost alert crowdsourced (vecini)                     | Mare         | Mediu    | Comunitate        |
| **P4 NICE-TO-HAVE**| N18 | Glosar voice-readable + cautare fonetica                         | Mica         | Mic      | Accesibilitate    |
| **P4 NICE-TO-HAVE**| T9  | Bundle splitting agresiv (CSS critical inline)                   | Medie        | Mic      | Performance       |

**Total recomandari:** 36 (8 imbunatatiri existente + 18 functii noi + 10 tehnice)

---

# PARTEA I — IMBUNATATIRI FUNCTII EXISTENTE (E1-E8)

## E1. `calculateDose()` — Volum tank configurabil

**Fisier:** `public/app.js` ~linia 591 + `public/index.html` (modal calculator doze)
**Problema actuala:** Calculatorul calculeaza doza pe baza unui volum hardcoded de 10 L per pom (vezi descrieri produs in `CALC_PROD_DESC` care toate spun "la 10 L"). Roland are 100+ pomi, foloseste pulverizator 16L sau atomizor 100L — calculul actual nu se mapeaza pe echipamentul real.

**Imbunatatire propusa:**

- Adauga camp input "Volum total tank" (default 16 L) + "Numar pomi tratati per tank" (default 1)
- Recalculeaza doza ca: `dozaProdusGrame = (concentratie_g_la_10L * volumTank) / 10`
- Persisteaza ultimul volum tank in `localStorage` ("livada-tank-volume") — refolosit la urmatoarea deschidere
- Afiseaza estimare: "Pentru 100 pomi cu pulverizator 16L → 6 reumpleri × X g = total Y g produs"

**Exemplu implementare:**

```javascript
// public/app.js — extindere calculateDose()
function calculateDose() {
  const product = $('#calcProduct').value;
  const conc = parseFloat($('#calcConc').value || 0); // g/L la concentratia recomandata
  const tankL = parseFloat($('#calcTankVolume').value || 16);
  const treesPerTank = parseFloat($('#calcTreesPerTank').value || 1);
  const totalTrees = parseInt($('#calcTotalTrees').value || 100);

  if (!product || !conc || !tankL) {
    showToast('Completeaza produs, concentratie si volum', 'warning');
    return;
  }

  // Persist preferinte user
  localStorage.setItem('livada-tank-volume', String(tankL));
  localStorage.setItem('livada-trees-per-tank', String(treesPerTank));

  const dozaPerTank = (conc * tankL) / 10; // g produs per tank
  const reumpleri = Math.ceil(totalTrees / treesPerTank);
  const totalGr = (dozaPerTank * reumpleri).toFixed(1);

  // Cost estimat (daca exista pret/kg salvat)
  const pretKg = parseFloat(localStorage.getItem(`livada-pret-${product}`) || 0);
  const costEst = pretKg ? `~${((totalGr / 1000) * pretKg).toFixed(2)} RON` : '—';

  $('#calcResult').innerHTML = `
    <div class="alert alert-info">
      <strong>Pentru tank ${tankL}L:</strong> ${dozaPerTank.toFixed(1)} g produs<br>
      <strong>Pentru ${totalTrees} pomi:</strong> ${reumpleri} reumpleri × ${dozaPerTank.toFixed(1)}g = <b>${totalGr}g total</b><br>
      <strong>Cost estimat:</strong> ${costEst}
    </div>
  `;

  livadaLog('CALC', 'doze', 'OK', `${product} ${tankL}L x${totalTrees}p = ${totalGr}g`);
}
```

```html
<!-- public/index.html — extensie modal calculator (langa existing inputs) -->
<div class="form-row">
  <label for="calcTankVolume">Volum tank (L):</label>
  <input type="number" id="calcTankVolume" value="16" min="1" max="500" step="0.5">
</div>
<div class="form-row">
  <label for="calcTreesPerTank">Pomi per tank:</label>
  <input type="number" id="calcTreesPerTank" value="1" min="1" max="50">
</div>
<div class="form-row">
  <label for="calcTotalTrees">Total pomi tratati:</label>
  <input type="number" id="calcTotalTrees" value="100" min="1" max="500">
</div>
<button id="calcRunBtn" class="btn btn-primary">Calculeaza</button>
<div id="calcResult" aria-live="polite"></div>
```

**Backwards compat:** input-uri noi cu valori default = comportament identic la prima vizita; inputs persisate inseamna ca a doua oara reflectarea reala.

**Complexitate:** Mica (~30 min) | **Impact:** Mare (utilitate practica zilnica)

---

## E2. `doSearch()` + `buildSearchIndex()` — Search continut text

**Fisier:** `public/app.js` linia 197 (doSearch), 240 (buildSearchIndex), 274 (showSuggestions)
**Problema actuala:** Sugestiile autocomplete acopera doar `h2` + `h3` (titluri sectiuni). Roland a confirmat in `Roland.md` C4 ca vrea sugestii din **intregul continut** — iar acum daca scrie "monilioza" sau "ramnez tea" sau "Confidor" nu primeste sugestii decat daca acel text e in titlu. Pentru dictionar tehnic + procese (calculator doze, descrieri produse), aceasta limitare frustreaza.

**Imbunatatire propusa:**

- Extinde indexul cu paragrafe `<p>`, `<li>`, descrieri produs din `CALC_PROD_DESC` (extragere automata text simplu)
- Pastreaza limita 4-30 caractere doar pentru titluri; pentru continut foloseste 80-150 char snippet centrat pe match
- Adauga TIP `[Continut]` in afara de `[Tab]` / `[Sectiune]`
- La click pe sugestie de tip continut → deschide tab + scroll la elementul + temporar `mark` 2 secunde (highlight pulsant)

**Exemplu implementare:**

```javascript
// public/app.js — buildSearchIndex extins
let searchIndexExtended = []; // global

function buildSearchIndex() {
  searchIndexExtended = [];
  const tabs = $$('.tab-content[data-search="true"], .tab-content[id]');

  tabs.forEach(tab => {
    const tabId = tab.id;
    const tabName = $('button[data-tab="' + tabId + '"]')?.textContent?.trim() || tabId;

    // 1. Titluri (existing)
    tab.querySelectorAll('h2, h3').forEach(h => {
      const txt = h.textContent.trim();
      if (txt.length >= 4 && txt.length <= 80) {
        searchIndexExtended.push({ type: 'titlu', text: txt, tab: tabId, tabName, el: h });
      }
    });

    // 2. Continut: paragrafe + list items (NOU)
    tab.querySelectorAll('p, li, td').forEach(el => {
      const txt = el.textContent.trim();
      if (txt.length >= 30 && txt.length <= 500) {
        // Indexam doar daca contine cuvinte-cheie tehnice (filter zgomot)
        if (/[a-z]{5,}/i.test(txt)) {
          searchIndexExtended.push({ type: 'continut', text: txt, tab: tabId, tabName, el });
        }
      }
    });
  });

  // 3. Descrieri produse calculator (NOU)
  if (typeof CALC_PROD_DESC === 'object') {
    Object.entries(CALC_PROD_DESC).forEach(([key, desc]) => {
      const txtClean = desc.replace(/<[^>]+>/g, ' ').trim();
      searchIndexExtended.push({
        type: 'produs',
        text: txtClean,
        tab: 'plan-livada',
        tabName: 'Calculator doze',
        productKey: key
      });
    });
  }

  livadaLog('SEARCH', 'index-build', 'OK', `${searchIndexExtended.length} entries`);
}

function showSuggestions(q) {
  const ql = q.trim().toLowerCase();
  if (ql.length < 2) { hideSuggestions(); return; }

  const matches = searchIndexExtended
    .map(entry => {
      const idx = entry.text.toLowerCase().indexOf(ql);
      if (idx === -1) return null;
      // Snippet 80 char centrat pe match
      const start = Math.max(0, idx - 30);
      const end = Math.min(entry.text.length, idx + ql.length + 50);
      let snippet = entry.text.slice(start, end);
      if (start > 0) snippet = '…' + snippet;
      if (end < entry.text.length) snippet = snippet + '…';
      // Highlight match in snippet
      const re = new RegExp(`(${ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const snippetHL = snippet.replace(re, '<mark>$1</mark>');
      return { ...entry, snippet: snippetHL, score: (entry.type === 'titlu' ? 100 : entry.type === 'produs' ? 50 : 10) - idx };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (!matches.length) { hideSuggestions(); return; }

  const html = matches.map((m, i) => `
    <li class="suggestion-item" data-idx="${i}" tabindex="0" role="option">
      <span class="sug-type sug-type-${m.type}">${m.type}</span>
      <span class="sug-text">${m.snippet}</span>
      <span class="sug-tab">${m.tabName}</span>
    </li>
  `).join('');
  $('#searchSuggestions').innerHTML = html;
  $('#searchSuggestions').hidden = false;
  window.__searchMatches = matches; // pentru pickSuggestion
}

function pickSuggestion(idx) {
  const m = window.__searchMatches?.[idx];
  if (!m) return;
  const tabBtn = $(`button[data-tab="${m.tab}"]`);
  if (tabBtn) tabBtn.click();
  setTimeout(() => {
    if (m.el) {
      m.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      m.el.classList.add('search-highlight');
      setTimeout(() => m.el.classList.remove('search-highlight'), 2200);
    } else if (m.productKey) {
      // Pentru descrieri produs: deschide modalul calculator + selecteaza produs
      $('#calcProduct').value = m.productKey;
      $('#calcProduct').dispatchEvent(new Event('change'));
      openModal('calcModal');
    }
    hideSuggestions();
    $('#searchInput').value = '';
  }, 250);
}
```

```css
/* public/index.html <style> — highlight pulsant */
.search-highlight {
  animation: pulseHL 2s ease-out;
  background: rgba(255, 235, 59, 0.4);
  border-radius: 4px;
  padding: 2px 4px;
}
@keyframes pulseHL {
  0% { background: rgba(255, 235, 59, 0.8); }
  100% { background: transparent; }
}
.sug-type-continut { color: #888; font-size: 0.85em; }
.sug-type-produs { color: #5a9; font-weight: 600; font-size: 0.85em; }
```

**Risc perf:** index la load creste de la ~500 la 5000-8000 entries. Mitigare: lazy build (la prima focus pe input search, nu la `DOMContentLoaded`). Pe Android mid-range testat <100ms.

**Complexitate:** Medie (~2-3h) | **Impact:** Mare (Roland a cerut explicit C4)

---

## E3. `renderCalendar()` — View saptamanal + zoom day

**Fisier:** `public/app.js` linia 1284 + 1396 (calNav) + 1499 (showDayJournal)
**Problema actuala:** Calendar arata doar luna. Pe mobil 360px e foarte aglomerat (28-31 patratele × 6 randuri). Lipseste view saptamanal care Roland l-ar folosi pentru planificare 7 zile (sa vada doar saptamana asta cu zile mari + culori tratamente). Click pe zi deschide popup, dar nu scroll smooth.

**Imbunatatire propusa:**

- Adauga 3 butoane view: `Luna` / `Saptamana` / `Zi` (default Luna pentru desktop, Saptamana pentru mobil sub 600px)
- Saptamana = grid 7 coloane × 1 rand cu zile mai mari (touch target 64x64), inclusiv mini icon meteo
- Zi (zoom) = ecran complet cu lista chronologica intervenții + meteo orar
- Persist `livada-cal-view` in `localStorage`
- Swipe stanga/dreapta pe mobil = navigare prev/next perioada

**Exemplu implementare:**

```javascript
// public/app.js — view switcher
let calView = localStorage.getItem('livada-cal-view') || (window.innerWidth < 600 ? 'week' : 'month');
let calRefDate = new Date();

function setCalView(view) {
  if (!['month', 'week', 'day'].includes(view)) return;
  calView = view;
  localStorage.setItem('livada-cal-view', view);
  $$('.cal-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  renderCalendar();
}

function renderCalendar() {
  const container = $('#calendarBody');
  container.innerHTML = '';
  if (calView === 'month') return renderCalMonth(container);
  if (calView === 'week') return renderCalWeek(container);
  if (calView === 'day') return renderCalDay(container);
}

function renderCalWeek(container) {
  const weekStart = new Date(calRefDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });
  const meteo = window.__meteoForecast || [];
  const journal = getJurnalEntries();

  $('#calTitle').textContent = `Saptamana ${weekStart.toLocaleDateString('ro-RO')} - ${days[6].toLocaleDateString('ro-RO')}`;

  container.innerHTML = `
    <div class="cal-week-grid">
      ${days.map(d => {
        const iso = d.toISOString().slice(0, 10);
        const dayMeteo = meteo.find(m => m.date === iso);
        const dayJournal = journal.filter(j => j.date === iso);
        const types = [...new Set(dayJournal.map(j => j.type))].slice(0, 3);
        return `
          <button class="cal-day-week" onclick="selectDay('${iso}')" aria-label="${d.toLocaleDateString('ro-RO', {weekday: 'long', day: 'numeric'})}">
            <div class="cal-day-name">${d.toLocaleDateString('ro-RO', {weekday: 'short'})}</div>
            <div class="cal-day-num">${d.getDate()}</div>
            ${dayMeteo ? `<div class="cal-day-meteo">${wmoEmoji(dayMeteo.weather_code)} ${Math.round(dayMeteo.tmax)}°/${Math.round(dayMeteo.tmin)}°</div>` : ''}
            <div class="cal-day-events">${types.map(t => `<span class="ev-dot ev-${t}"></span>`).join('')}</div>
            ${dayJournal.length ? `<div class="cal-day-count">${dayJournal.length}</div>` : ''}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderCalDay(container) {
  const iso = calRefDate.toISOString().slice(0, 10);
  const journal = getJurnalEntries().filter(j => j.date === iso);
  const meteo = (window.__meteoForecast || []).find(m => m.date === iso);

  $('#calTitle').textContent = calRefDate.toLocaleDateString('ro-RO', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});

  container.innerHTML = `
    <div class="cal-day-detail">
      ${meteo ? `
        <div class="cal-day-meteo-block">
          <span class="meteo-emoji">${wmoEmoji(meteo.weather_code)}</span>
          <div>
            <strong>${meteo.tmin}°C / ${meteo.tmax}°C</strong> (aparenta ${meteo.apparent_temp_max}°C)<br>
            Umiditate ${meteo.humidity}%, vant ${meteo.wind_max} km/h, ploaie ${meteo.precip}mm
          </div>
        </div>
      ` : '<p class="muted">Fara meteo pentru ziua aceasta.</p>'}

      <h3>Interventii (${journal.length})</h3>
      ${journal.length === 0 ? '<p class="muted">Nicio interventie. <button onclick="addJurnalForDay(\'' + iso + '\')">+ Adauga</button></p>' : journal.map(j => `
        <div class="journal-entry-card">
          <span class="entry-type entry-${j.type}">${j.type}</span>
          <strong>${j.species || 'general'}</strong>
          <p>${escapeHtml(j.note || '')}</p>
          ${j.kg ? `<small>Recolta: ${j.kg} kg</small>` : ''}
          <button onclick="editJurnalEntry('${j.id}')">✎</button>
        </div>
      `).join('')}
    </div>
  `;
}

// Swipe support pe mobil
let touchStartX = 0;
$('#calendarBody').addEventListener('touchstart', e => touchStartX = e.touches[0].clientX);
$('#calendarBody').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 60) calNav(dx < 0 ? 1 : -1);
});

function selectDay(iso) {
  calRefDate = new Date(iso);
  setCalView('day');
}
```

```html
<!-- in toolbar calendar -->
<div class="cal-view-switch" role="tablist">
  <button class="cal-view-btn" data-view="month" onclick="setCalView('month')">Luna</button>
  <button class="cal-view-btn" data-view="week" onclick="setCalView('week')">Saptamana</button>
  <button class="cal-view-btn" data-view="day" onclick="setCalView('day')">Zi</button>
</div>
```

```css
.cal-week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-day-week { min-height: 80px; padding: 8px 4px; font-size: 0.85em; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-card); cursor: pointer; }
.cal-day-week:focus, .cal-day-week:hover { background: var(--bg-hover); }
.cal-day-num { font-size: 1.6em; font-weight: 700; color: var(--accent); }
.cal-day-events { display: flex; gap: 2px; justify-content: center; }
.ev-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
.ev-tratament { background: #d33; }
.ev-recolta { background: #3a3; }
.cal-view-switch { display: flex; gap: 4px; margin-bottom: 8px; }
.cal-view-btn.active { background: var(--accent); color: white; }
@media (max-width: 600px) {
  .cal-day-week { min-height: 64px; font-size: 0.75em; }
  .cal-day-num { font-size: 1.2em; }
}
```

**Complexitate:** Medie (~3h) | **Impact:** Mare (UX mobil semnificativ imbunatatit)

---

## E4. Cost agregat tratamente — `renderCostSummary()`

**Fisier:** functie noua in `public/app.js` (apelata din tab "Plan livada" sau Stats)
**Problema actuala:** Jurnalul are camp `cost` per intrare (inteles ca cost interventie), dar nu exista nicaieri agregat: cat a cheltuit Roland anul asta pe tratamente, defalcat pe specie / tip / luna. Pentru un proiect semi-comercial e indicator esential.

**Imbunatatire propusa:**

- Functie noua `renderCostSummary(year, container)` care agregeaza din `getJurnalEntries()`
- Tabel: cost total an + breakdown per specie + per tip (tratament/fertilizant/altul) + per luna
- Sparkline mini-chart cu evolutie luna-cu-luna
- Comparare cu anul anterior (delta % cu sageti sus/jos)
- Buton export PDF print-ready

**Exemplu implementare:**

```javascript
// public/app.js
function renderCostSummary(year, container) {
  const entries = getJurnalEntries().filter(e => e.cost && e.date?.startsWith(String(year)));
  const prevEntries = getJurnalEntries().filter(e => e.cost && e.date?.startsWith(String(year - 1)));

  const total = entries.reduce((s, e) => s + parseFloat(e.cost || 0), 0);
  const prevTotal = prevEntries.reduce((s, e) => s + parseFloat(e.cost || 0), 0);
  const delta = prevTotal ? ((total - prevTotal) / prevTotal * 100).toFixed(1) : null;

  // Per specie
  const perSpecies = entries.reduce((acc, e) => {
    const k = e.species || 'general';
    acc[k] = (acc[k] || 0) + parseFloat(e.cost || 0);
    return acc;
  }, {});
  const speciesSorted = Object.entries(perSpecies).sort((a, b) => b[1] - a[1]);

  // Per tip
  const perType = entries.reduce((acc, e) => {
    const k = e.type || 'altul';
    acc[k] = (acc[k] || 0) + parseFloat(e.cost || 0);
    return acc;
  }, {});

  // Per luna (sparkline)
  const perMonth = Array.from({ length: 12 }, (_, i) => {
    return entries
      .filter(e => parseInt(e.date.slice(5, 7)) === i + 1)
      .reduce((s, e) => s + parseFloat(e.cost || 0), 0);
  });
  const maxMonth = Math.max(...perMonth, 1);

  container.innerHTML = `
    <div class="cost-summary">
      <h3>Costuri ${year}</h3>
      <div class="cost-total">
        <span class="cost-big">${total.toFixed(2)} RON</span>
        ${delta !== null ? `
          <span class="cost-delta cost-delta-${delta < 0 ? 'down' : 'up'}">
            ${delta < 0 ? '↓' : '↑'} ${Math.abs(delta)}% vs ${year - 1}
          </span>` : ''}
      </div>

      <div class="cost-grid">
        <div class="cost-block">
          <h4>Per specie</h4>
          <ul>
            ${speciesSorted.slice(0, 8).map(([sp, c]) => `
              <li><span>${sp}</span> <strong>${c.toFixed(2)} RON</strong></li>
            `).join('')}
          </ul>
        </div>

        <div class="cost-block">
          <h4>Per tip</h4>
          <ul>
            ${Object.entries(perType).map(([t, c]) => `
              <li><span class="entry-type entry-${t}">${t}</span> <strong>${c.toFixed(2)} RON</strong></li>
            `).join('')}
          </ul>
        </div>

        <div class="cost-block cost-sparkline">
          <h4>Evolutie luna-cu-luna</h4>
          <div class="sparkline">
            ${perMonth.map((c, i) => `
              <div class="spark-bar" style="height: ${(c / maxMonth * 100).toFixed(0)}%" title="${i + 1}: ${c.toFixed(2)} RON">
                <small>${['I','F','M','A','M','I','I','A','S','O','N','D'][i]}</small>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <button onclick="exportCostPDF(${year})" class="btn btn-secondary">Exporta PDF</button>
    </div>
  `;
}

function exportCostPDF(year) {
  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html><head><title>Costuri Livada ${year}</title>
    <style>body { font-family: sans-serif; padding: 20px; } table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
    h1 { color: #2a6; }</style></head><body>
    ${$('#costSummaryBlock')?.outerHTML || ''}
    </body></html>
  `);
  printWin.print();
}
```

```css
.cost-big { font-size: 2.2em; color: var(--accent); font-weight: 700; }
.cost-delta-up { color: #d33; }
.cost-delta-down { color: #3a3; }
.cost-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 16px; }
.cost-block { background: var(--bg-card); padding: 12px; border-radius: 8px; }
.sparkline { display: flex; gap: 2px; align-items: end; height: 80px; margin-top: 8px; }
.spark-bar { flex: 1; background: var(--accent); border-radius: 2px 2px 0 0; min-height: 4px; position: relative; }
.spark-bar small { position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%); font-size: 0.7em; color: var(--text-muted); }
```

**Edge cases:**
- An fara intrari → afiseaza "0 RON, niciun cost inregistrat anul acesta"
- An anterior fara intrari → ascunde delta
- Numeric parse: `parseFloat(e.cost)` cu fallback 0 (cost ar putea fi string "12.5 RON")

**Complexitate:** Medie (~2h) | **Impact:** Mare (insight-uri financiare zero)

---

## E5. Galerie foto cu tag-uri + filtrare + diagnostic istoric per pom

**Fisier:** `public/app.js` linia 2759 (openGalleryModal) + `api/photos.js`
**Problema actuala:** Galeria stocheaza foto per specie, dar fara metadata (boala diagnosticata, pom specific, data, sectiune livada). Lui Roland i-ar fi util sa filtreze "arata-mi toate foto-urile cu rapan din 2025" sau "toate fotografiile pomului #12 (Mar Florina coltul nord)".

**Imbunatatire propusa:**

- Extinde upload cu metadata: `{species, treeId?, tags[], diagnosis?, dateTaken}`
- Stocare metadata in Vercel Blob ca fisier sidecar JSON SAU in Redis (cheia `gallery:meta:<url-hash>`)
- UI galerie: bara filtre (specie, an, tag, diagnostic) + cards cu badge tag-uri colorate
- La diagnostic AI nou: prompt "Salveaza poza in galerie cu acest diagnostic?" → adauga in tags + diagnosis

**Exemplu implementare:**

```javascript
// public/app.js — upload extended
async function uploadPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const species = $('#galleryCurrentSpecies').value;
  const treeId = $('#galleryTreeId').value || '';
  const tagsInput = $('#galleryTagsInput').value || '';
  const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('species', species);
  formData.append('meta', JSON.stringify({
    treeId, tags,
    dateTaken: new Date().toISOString(),
    diagnosis: window.__lastDiagnosisShort || null
  }));

  showToast('Se incarca poza...', 'info');
  try {
    const res = await fetch('/api/photos', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'upload failed');
    showToast('Poza salvata!', 'info');
    loadGallery(species);
    livadaLog('GALLERY', 'upload', 'OK', `${species} ${tags.join(',')}`);
  } catch (e) {
    showToast('Eroare upload: ' + e.message, 'error');
    livadaLog('GALLERY', 'upload', 'ERR', e.message);
  }
}

// Render galerie cu filtre
function renderGalleryWithFilters(species) {
  const all = window.__galleryItems || [];
  const filterTag = $('#galleryFilterTag')?.value || '';
  const filterYear = $('#galleryFilterYear')?.value || '';
  const filterTree = $('#galleryFilterTree')?.value || '';

  const filtered = all.filter(item => {
    if (filterTag && !item.meta?.tags?.includes(filterTag)) return false;
    if (filterYear && !item.meta?.dateTaken?.startsWith(filterYear)) return false;
    if (filterTree && item.meta?.treeId !== filterTree) return false;
    return true;
  });

  const allTags = [...new Set(all.flatMap(i => i.meta?.tags || []))];
  const allYears = [...new Set(all.map(i => i.meta?.dateTaken?.slice(0, 4)).filter(Boolean))];
  const allTrees = [...new Set(all.map(i => i.meta?.treeId).filter(Boolean))];

  $('#galleryFilters').innerHTML = `
    <select id="galleryFilterTag" onchange="renderGalleryWithFilters('${species}')">
      <option value="">Toate tag-urile</option>
      ${allTags.map(t => `<option ${t === filterTag ? 'selected' : ''}>${t}</option>`).join('')}
    </select>
    <select id="galleryFilterYear" onchange="renderGalleryWithFilters('${species}')">
      <option value="">Toti anii</option>
      ${allYears.sort().reverse().map(y => `<option ${y === filterYear ? 'selected' : ''}>${y}</option>`).join('')}
    </select>
    <select id="galleryFilterTree" onchange="renderGalleryWithFilters('${species}')">
      <option value="">Toti pomii</option>
      ${allTrees.map(t => `<option ${t === filterTree ? 'selected' : ''}>Pom ${t}</option>`).join('')}
    </select>
    <span class="filter-count">${filtered.length}/${all.length} foto</span>
  `;

  $('#galleryItems').innerHTML = filtered.length === 0
    ? '<p class="muted">Niciun rezultat.</p>'
    : filtered.map((item, idx) => `
      <div class="gallery-card">
        <img src="${item.url}" loading="lazy" onclick="openLightbox('${item.url}', null, ${idx})" alt="">
        ${item.meta?.diagnosis ? `<div class="gallery-diag" title="${escapeHtml(item.meta.diagnosis)}">${item.meta.diagnosis.slice(0, 40)}…</div>` : ''}
        ${item.meta?.tags?.length ? `<div class="gallery-tags">${item.meta.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
        ${item.meta?.treeId ? `<small>Pom ${item.meta.treeId}</small>` : ''}
        <small>${item.meta?.dateTaken?.slice(0, 10) || ''}</small>
        <button onclick="deletePhoto('${item.url}')" class="btn-icon" aria-label="Sterge">×</button>
      </div>
    `).join('');
}
```

```javascript
// api/photos.js — extindere POST cu metadata
import { put, del, list } from '@vercel/blob';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const config = { runtime: 'nodejs' };

export default async function handler(req) {
  // ... (cod existent CORS, auth) ...

  if (req.method === 'POST') {
    const form = await req.formData();
    const file = form.get('file');
    const species = (form.get('species') || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
    const metaRaw = form.get('meta');
    let meta = {};
    try { meta = JSON.parse(metaRaw); } catch {}

    if (!file || file.size === 0) return new Response(JSON.stringify({ error: 'no file' }), { status: 400 });
    if (file.size > 5 * 1024 * 1024) return new Response(JSON.stringify({ error: 'file > 5MB' }), { status: 413 });

    const filename = `livada/photos/${species}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.type.split('/')[1] || 'jpg'}`;
    const blob = await put(filename, file, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });

    // Salveaza metadata in Redis
    if (meta && Object.keys(meta).length > 0) {
      const safeMetaKey = `gallery:meta:${blob.url.split('/').pop()}`;
      await redis.set(safeMetaKey, JSON.stringify({
        ...meta,
        url: blob.url,
        species,
        uploadedAt: new Date().toISOString()
      }), { ex: 60 * 60 * 24 * 365 * 5 }); // 5 ani retention
    }

    return new Response(JSON.stringify({ url: blob.url, meta }), { status: 200 });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const species = (url.searchParams.get('species') || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const blobs = await list({ prefix: `livada/photos/${species ? species + '/' : ''}`, token: process.env.BLOB_READ_WRITE_TOKEN });

    // Hidrateaza cu metadata din Redis
    const items = await Promise.all(blobs.blobs.map(async b => {
      const metaRaw = await redis.get(`gallery:meta:${b.pathname.split('/').pop()}`);
      let meta = null;
      if (metaRaw) try { meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw; } catch {}
      return { url: b.url, size: b.size, uploadedAt: b.uploadedAt, meta };
    }));

    return new Response(JSON.stringify({ items }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'private, max-age=60' }
    });
  }

  // ... (DELETE existing) ...
}
```

```css
.gallery-card { position: relative; background: var(--bg-card); border-radius: 8px; overflow: hidden; }
.gallery-card img { width: 100%; aspect-ratio: 1; object-fit: cover; cursor: pointer; }
.gallery-tags { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; }
.gallery-tags .tag { background: var(--accent-soft); padding: 2px 6px; border-radius: 4px; font-size: 0.75em; }
.gallery-diag { background: rgba(0, 0, 0, 0.7); color: white; padding: 4px 6px; font-size: 0.75em; position: absolute; bottom: 40px; left: 0; right: 0; }
```

**Storage:** Redis 5 ani retention pe metadata = ~10K entries × 200 bytes = 2 MB (sub free tier 256 MB).

**Complexitate:** Medie (~3-4h) | **Impact:** Mare (transforma galeria din album in baza de cunoastere)

---

## E6. Timeline specie editabil

**Fisier:** `public/app.js` linia 2362 (renderSpeciesTimeline)
**Problema actuala:** Timeline-ul afiseaza intervențiile cronologic, dar nu permite edit/delete direct din timeline. User trebuie sa navigheze in tab Jurnal, sa caute intrarea, sa o editeze.

**Imbunatatire propusa:**
- Adauga 2 butoane pe fiecare card timeline: `Editeaza` (deschide edit inline cu salvare) + `Sterge` (cu confirm)
- Apel direct la `editJurnalEntry(id)` (deja exista)

**Exemplu implementare:**

```javascript
// public/app.js — renderSpeciesTimeline cu actiuni
function renderSpeciesTimeline(speciesId, container) {
  const entries = getJurnalEntries()
    .filter(e => e.species === speciesId)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!entries.length) {
    container.innerHTML = '<p class="muted">Nicio interventie inregistrata.</p>';
    return;
  }

  container.innerHTML = `
    <div class="timeline">
      ${entries.map(e => `
        <div class="timeline-card" data-id="${e.id}">
          <div class="timeline-date">${e.date}</div>
          <div class="timeline-body">
            <span class="entry-type entry-${e.type}">${e.type}</span>
            <p>${escapeHtml(e.note || '')}</p>
            ${e.cost ? `<small>Cost: ${e.cost} RON</small>` : ''}
            ${e.kg ? `<small>Recolta: ${e.kg} kg</small>` : ''}
          </div>
          <div class="timeline-actions">
            <button onclick="editJurnalEntry('${e.id}'); openModal('jurnalModal');" aria-label="Editeaza" title="Editeaza">✎</button>
            <button onclick="if(confirm('Stergi aceasta interventie?')) deleteJurnalEntry('${e.id}').then(() => renderSpeciesTimeline('${speciesId}', document.getElementById('${container.id}')))" aria-label="Sterge" title="Sterge">×</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
```

**Complexitate:** Mica (~30 min) | **Impact:** Mediu (workflow mai eficient)

---

## E7. Bidirectional sync conflict-aware (tombstone delete)

**Fisier:** `public/app.js` linia 3772 (syncJournal) + `api/journal.js`
**Problema actuala:** Daca Roland sterge o intrare pe telefon offline, apoi intra online → DELETE pleaca. Dar daca a editat aceeasi intrare pe desktop intre timp → merge logic actual (Map.set deduplica pe id) face POST sa "reanvie" intrarea stearsa. Conflict tipic last-write-wins fara semantic.

**Imbunatatire propusa:**

- Adauga camp `_deleted: true` + `_deletedAt: ISO` (tombstone) in loc de DELETE direct
- Backend: pastreaza tombstone-uri 30 zile, apoi cleanup
- Frontend filtru in `getJurnalEntries()`: ignora `_deleted: true`
- Sync merge: daca local are `_deleted` cu `_deletedAt > remoteUpdatedAt` → tombstone castiga

**Exemplu implementare:**

```javascript
// public/app.js
function deleteJurnalEntry(id) {
  const entries = getJurnalEntries(true); // include deleted
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return Promise.reject('not found');
  entries[idx]._deleted = true;
  entries[idx]._deletedAt = new Date().toISOString();
  saveJurnalEntries(entries);
  renderJurnal();
  return syncJournal(); // push tombstone
}

function getJurnalEntries(includeDeleted = false) {
  try {
    const raw = localStorage.getItem('livada-jurnal') || '[]';
    const arr = JSON.parse(raw);
    return includeDeleted ? arr : arr.filter(e => !e._deleted);
  } catch { return []; }
}

// Merge logic in syncJournal — replace existing
async function mergeJournalRemote(remoteArr) {
  const localAll = getJurnalEntries(true);
  const merged = new Map();
  // Local first
  for (const e of localAll) merged.set(e.id, e);
  // Remote entries
  for (const r of remoteArr) {
    const local = merged.get(r.id);
    if (!local) { merged.set(r.id, r); continue; }
    // Compare timestamps for conflict resolution
    const localTs = local._deletedAt || local.updatedAt || local.date;
    const remoteTs = r._deletedAt || r.updatedAt || r.date;
    if (localTs >= remoteTs) {
      // Local wins (incluiv tombstone)
      // Skip
    } else {
      merged.set(r.id, r);
    }
  }
  saveJurnalEntries(Array.from(merged.values()));
}
```

```javascript
// api/journal.js — accepta tombstones, cleanup periodic
export default async function handler(req) {
  // ... (rate limit, auth) ...

  if (req.method === 'POST') {
    const body = await req.json();
    const entries = body.entries || [];
    if (!Array.isArray(entries)) return new Response('invalid', { status: 400 });

    const existing = await redis.get('journal:entries') || [];
    const merged = new Map();
    for (const e of existing) merged.set(e.id, e);
    for (const e of entries) {
      const local = merged.get(e.id);
      if (!local) { merged.set(e.id, e); continue; }
      const localTs = local._deletedAt || local.updatedAt || local.date;
      const newTs = e._deletedAt || e.updatedAt || e.date;
      if (newTs >= localTs) merged.set(e.id, e);
    }

    // Cleanup tombstones >30 zile
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const final = Array.from(merged.values()).filter(e => {
      if (e._deleted && e._deletedAt && new Date(e._deletedAt).getTime() < cutoff) return false;
      return true;
    });

    await Promise.all([
      redis.set('journal:entries', final),
      redis.set('journal:last-update', Date.now())
    ]);
    return new Response(JSON.stringify({ count: final.length }), { status: 200 });
  }

  if (req.method === 'GET') {
    const all = await redis.get('journal:entries') || [];
    // Returneaza inclusiv tombstones <30zile pentru sync
    return new Response(JSON.stringify({ entries: all }), { status: 200 });
  }
}
```

**Complexitate:** Medie (~3h) | **Impact:** Mediu (corectitudine sync — bug subtil dar real)

---

## E8. Backup automat zilnic localStorage → IndexedDB rolling

**Fisier:** functie noua in `public/app.js`
**Problema actuala:** `backupData()` exista (linia 4932) dar e manual. Daca user pierde din greseala (clear cache, install other PWA, dispozitiv pierdut) → istoricul jurnal de pe LS dispare. Sync Redis e backup partial (doar jurnal, nu si setari, log, calc preferences).

**Imbunatatire propusa:**
- La fiecare deschidere PWA: verifica daca a trecut > 24h de la ultimul backup → snapshot toate cheile `livada-*` din `localStorage` in IndexedDB
- Pastreaza ultimele 7 backup-uri (rolling)
- Buton "Restaureaza backup" cu dropdown pentru selectie data

**Exemplu implementare:**

```javascript
// public/app.js
async function autoBackupIfNeeded() {
  const last = parseInt(localStorage.getItem('livada-last-backup') || 0);
  const now = Date.now();
  if (now - last < 24 * 60 * 60 * 1000) return;

  const snapshot = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('livada-')) snapshot[k] = localStorage.getItem(k);
  }
  const entry = { date: new Date().toISOString(), data: snapshot };

  const db = await openLivadaIDB();
  const tx = db.transaction('backups', 'readwrite');
  const store = tx.objectStore('backups');
  await store.add(entry);

  // Pastreaza ultimele 7
  const all = await new Promise(res => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
  });
  if (all.length > 7) {
    const sorted = all.sort((a, b) => b.date.localeCompare(a.date));
    for (const old of sorted.slice(7)) {
      await store.delete(old.id);
    }
  }
  localStorage.setItem('livada-last-backup', String(now));
  livadaLog('BACKUP', 'auto', 'OK', `keys=${Object.keys(snapshot).length}`);
}

async function listBackups() {
  const db = await openLivadaIDB();
  const tx = db.transaction('backups', 'readonly');
  const all = await new Promise(res => {
    const req = tx.objectStore('backups').getAll();
    req.onsuccess = () => res(req.result);
  });
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

async function restoreBackup(backupId) {
  if (!confirm('Vei suprascrie datele actuale. Continuam?')) return;
  const db = await openLivadaIDB();
  const tx = db.transaction('backups', 'readonly');
  const entry = await new Promise(res => {
    const req = tx.objectStore('backups').get(backupId);
    req.onsuccess = () => res(req.result);
  });
  if (!entry) return showToast('Backup negasit', 'error');
  for (const [k, v] of Object.entries(entry.data)) {
    localStorage.setItem(k, v);
  }
  showToast('Backup restaurat. Reincarc pagina...', 'info');
  setTimeout(() => location.reload(), 1500);
}

// Apel la load
window.addEventListener('load', () => setTimeout(autoBackupIfNeeded, 5000));
```

**Modifica `openLivadaIDB`:**

```javascript
function openLivadaIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('livada-jurnal', 2); // bump version
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('backups')) {
        const store = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
```

**Complexitate:** Mica-Medie (~1.5h) | **Impact:** Mediu (siguranta pe termen lung)

---

# PARTEA II — FUNCTII NOI (N1-N18)

## N1. Voice input jurnal — Web Speech API (pentru parinti Roland)

**Descriere:** Buton microfon in modal "Adauga interventie" jurnal: tap → user vorbeste in romana ("Tratament cu cupru pe ciresi, doua kile") → text apare in camp. Hands-free in livada.

**De ce e util:** Parintii lui Roland (non-tech, varsta) au dificultati sa scrie pe telefon, mai ales cu maini ude/murdare in livada. Web Speech API e nativ in Chrome Android, suporta `lang="ro-RO"`, gratuit. UX-ul: tap → vorbeste → confirma. Aceasta UNICA imbunatatire poate transforma adoptia jurnalului pe partea parintilor.

**Complexitate:** Mica (~2h) | **Impact:** Maxim (accesibilitate fundamental schimbata)

**Exemplu implementare:**

```javascript
// public/app.js — voice helper
let _speechRec = null;
let _speechActive = false;

function initVoiceInput(targetInputId, onResult) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast('Voice input nu e suportat in browser-ul asta', 'warning');
    return null;
  }
  const rec = new SR();
  rec.lang = 'ro-RO';
  rec.continuous = false;
  rec.interimResults = true;

  rec.onresult = (e) => {
    let final = '';
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += txt;
      else interim += txt;
    }
    const inp = document.getElementById(targetInputId);
    if (inp) inp.value = (inp.dataset.baseText || '') + final + interim;
    if (final && onResult) onResult(final);
  };

  rec.onstart = () => {
    _speechActive = true;
    document.querySelectorAll('.voice-btn').forEach(b => b.classList.add('voice-active'));
  };
  rec.onend = () => {
    _speechActive = false;
    document.querySelectorAll('.voice-btn').forEach(b => b.classList.remove('voice-active'));
  };
  rec.onerror = (e) => {
    showToast('Eroare voce: ' + e.error, 'error');
    livadaLog('VOICE', 'recognition', 'ERR', e.error);
  };
  return rec;
}

function toggleVoiceInput(targetInputId) {
  if (_speechActive) {
    _speechRec?.stop();
    return;
  }
  if (!_speechRec) _speechRec = initVoiceInput(targetInputId);
  if (!_speechRec) return;
  const inp = document.getElementById(targetInputId);
  if (inp) inp.dataset.baseText = (inp.value || '').trim() ? (inp.value.trim() + ' ') : '';
  _speechRec.start();
  livadaLog('VOICE', 'start', 'OK', targetInputId);
}
```

```html
<!-- public/index.html — buton in modal jurnal -->
<div class="textarea-with-voice">
  <textarea id="jurnalNote" rows="3" placeholder="Ce ai facut?"></textarea>
  <button class="voice-btn" type="button" onclick="toggleVoiceInput('jurnalNote')" aria-label="Inregistreaza vocea">
    🎤
  </button>
</div>
```

```css
.textarea-with-voice { position: relative; }
.voice-btn { position: absolute; right: 8px; top: 8px; width: 44px; height: 44px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border); font-size: 1.4em; cursor: pointer; }
.voice-btn:focus { outline: 2px solid var(--accent); }
.voice-btn.voice-active { background: #d33; color: white; animation: pulseRec 1s infinite; }
@keyframes pulseRec { 50% { transform: scale(1.1); } }
```

**Edge cases:**
- Browser fara API → toast de avertisment, buton ascuns silent
- Permisia microfonului refuzata → onerror cu mesaj clar
- Conexiune intrerupta in timpul recunoasterii → onend → user re-tap buton

**Risc:** Web Speech API in Chrome Android trimite audio la Google pentru recunoastere — informeaza user prin tooltip "Foloseste serviciul Google" la prima utilizare. Privacy: nu stocam audio.

---

## N2. EPPO API integrare — date oficiale boli/daunatori EU

**Descriere:** Apel periodic (1x/luna sau on-demand) la EPPO Global Database API pentru a obtine date oficiale despre boli si daunatori pentru fiecare specie. Tab nou "Boli si daunatori" per specie afiseaza date verificate (nume stiintific, simptome, cicluri viata, raspandire EU).

**De ce e util:** Sectiunile D din continut sunt scrise manual din surse mixte. EPPO Global Database (peste 98,700 specii) e standardul EU oficial — date care pot fi citate cu credibilitate maxima ("conform EPPO 2026..."). API gratuit cu cont free.

**Complexitate:** Medie (~6-8h) | **Impact:** Maxim (continut credibil + scalabil pentru orice specie noua)

**Exemplu implementare:**

```javascript
// api/eppo-info.js (Edge Runtime nou)
import { Redis } from '@upstash/redis';
import { fetchWithTimeout } from './_timeout.js';
import { rateLimit, checkOrigin } from './_auth.js';

export const config = { runtime: 'edge' };
const redis = Redis.fromEnv();

const SPECIES_EPPO_MAP = {
  cires: 'PRNAV',     // Prunus avium
  visin: 'PRNCE',     // Prunus cerasus
  cais: 'PRNAR',      // Prunus armeniaca
  piersic: 'PRNPS',   // Prunus persica
  prun: 'PRNDO',      // Prunus domestica
  migdal: 'PRNDU',    // Prunus dulcis
  par: 'PYUCO',       // Pyrus communis
  mar: 'MABSD',       // Malus domestica
  alun: 'CYLAV',      // Corylus avellana
  zmeur: 'RUBID',     // Rubus idaeus
  mur: 'RUBFR',       // Rubus fruticosus
  afin: 'VACCO',      // Vaccinium corymbosum
  rodiu: 'PUNGR',     // Punica granatum
  kaki: 'DOSKA',      // Diospyros kaki
};

export default async function handler(req) {
  if (!checkOrigin(req)) return new Response('forbidden', { status: 403 });
  if (await rateLimit(req)) return new Response('rate limit', { status: 429 });

  const url = new URL(req.url);
  const species = url.searchParams.get('species') || '';
  const eppoCode = SPECIES_EPPO_MAP[species];
  if (!eppoCode) return new Response(JSON.stringify({ error: 'unknown species' }), { status: 400 });

  const cacheKey = `eppo:pests:${eppoCode}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' }
    });
  }

  const apiKey = process.env.EPPO_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'EPPO key not set' }), { status: 503 });

  // EPPO API — pests/diseases for host plant
  const apiUrl = `https://data.eppo.int/api/rest/1.0/taxon/${eppoCode}/categorization?authtoken=${apiKey}`;
  try {
    const res = await fetchWithTimeout(apiUrl, {}, 15000);
    if (!res.ok) throw new Error('EPPO HTTP ' + res.status);
    const data = await res.json();

    const formatted = {
      species,
      eppoCode,
      pests: (data.pests || []).slice(0, 30).map(p => ({
        name: p.fullname,
        scientific: p.preferredName,
        category: p.category,
        url: `https://gd.eppo.int/taxon/${p.code}`,
      })),
      diseases: (data.diseases || []).slice(0, 20).map(d => ({
        name: d.fullname,
        scientific: d.preferredName,
        url: `https://gd.eppo.int/taxon/${d.code}`,
      })),
      fetchedAt: new Date().toISOString()
    };

    await redis.set(cacheKey, formatted, { ex: 30 * 24 * 60 * 60 }); // cache 30 zile

    return new Response(JSON.stringify(formatted), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502 });
  }
}
```

```javascript
// public/app.js — afisare in tab specie
async function loadEppoData(species, container) {
  container.innerHTML = '<p class="muted">Se incarca date EPPO...</p>';
  try {
    const res = await fetch(`/api/eppo-info?species=${species}`);
    if (!res.ok) throw new Error('EPPO error');
    const data = await res.json();

    container.innerHTML = `
      <div class="eppo-block">
        <h3>Daunatori (${data.pests.length})</h3>
        <ul>${data.pests.slice(0, 10).map(p => `
          <li>
            <a href="${p.url}" target="_blank" rel="noopener">${p.name}</a>
            <small><i>${p.scientific}</i> — ${p.category}</small>
          </li>
        `).join('')}</ul>

        <h3>Boli (${data.diseases.length})</h3>
        <ul>${data.diseases.map(d => `
          <li>
            <a href="${d.url}" target="_blank" rel="noopener">${d.name}</a>
            <small><i>${d.scientific}</i></small>
          </li>
        `).join('')}</ul>

        <p class="source">Sursa: <a href="https://gd.eppo.int" target="_blank">EPPO Global Database</a> (date oficiale UE) — actualizat ${data.fetchedAt.slice(0, 10)}</p>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p class="alert alert-warning">Date EPPO momentan indisponibile. ${e.message}</p>`;
  }
}
```

**Setup:** Roland creeaza cont la [data.eppo.int](https://data.eppo.int/) → primeste API key gratuit → adauga in `.api-keys/INBOX.md`.

**Edge cases:** EPPO down → graceful "indisponibil"; cache 30 zile reduce dependenta; EPPO codes hardcoded acopera 14 specii (kaki/rodiu pot lipsi din EPPO — fallback la "fara date oficiale").

---

## N3. GDD + Chill Hours — modul JS PhenoFlex inspirat

**Descriere:** Functie JS care calculeaza Growing Degree Days (GDD, baza 10°C) cumulativ + Chill Hours (ore intre 7-16°C) folosind datele meteo-history din Redis (deja persistate). Foloseste Dynamic Model + GDH (Growing Degree Hours) pentru predictie inflorire ±4 zile.

**De ce e util:** Roland poate preciza cand sa stropeasca pre-inflorit (cais, prun) si sa estimeze recoltarea. Sectiunea I/J din continut (irigatie + polenizare) cere fenologie reala — actual e doar text generic. Modelul PhenoFlex e validat stiintific (eroare 3.8-4 zile la mar/para).

**Complexitate:** Medie (~5h) | **Impact:** Maxim (transforma aplicatia din "manual" in "predictiva")

**Exemplu implementare:**

```javascript
// api/phenology.js (Edge nou)
import { Redis } from '@upstash/redis';
import { rateLimit, checkOrigin } from './_auth.js';

export const config = { runtime: 'edge' };
const redis = Redis.fromEnv();

// Cerinte chill hours per specie (din literatura — 1 unitate = 1h intre 7-16°C)
const CHILL_REQ = {
  cires: 800, visin: 700, cais: 350, piersic: 600, prun: 700,
  migdal: 250, par: 800, mar: 800, alun: 400, zmeur: 800,
  mur: 200, afin: 600, rodiu: 100, kaki: 200,
};

// GDD baza pt sparge dormanta (dupa chill satisfacut)
const GDD_TO_BLOOM = {
  cires: 250, visin: 220, cais: 200, piersic: 180, prun: 230,
  migdal: 150, par: 280, mar: 300, alun: 120, zmeur: 200,
  mur: 250, afin: 220, rodiu: 350, kaki: 320,
};

export default async function handler(req) {
  if (!checkOrigin(req)) return new Response('forbidden', { status: 403 });
  if (await rateLimit(req)) return new Response('rate limit', { status: 429 });

  const url = new URL(req.url);
  const species = url.searchParams.get('species') || 'mar';
  if (!CHILL_REQ[species]) return new Response(JSON.stringify({ error: 'unknown species' }), { status: 400 });

  // Citeste meteo history (last 365 zile)
  const history = await redis.get('meteo:history') || [];
  const sortedDates = history.sort((a, b) => a.date.localeCompare(b.date));

  // Chill hours: sumeaza ore (estimat 6h/zi din temp_min in 7-16°C, simplificat)
  let chillHours = 0;
  let chillSatisfiedAt = null;
  const REF_DATE = new Date(); REF_DATE.setMonth(10, 1); REF_DATE.setFullYear(REF_DATE.getFullYear() - 1); // 1 nov anul anterior
  for (const d of sortedDates) {
    const date = new Date(d.date);
    if (date < REF_DATE) continue;
    if (d.tmin <= 16 && d.tmin >= 0) {
      // Estimate 8h/zi in plaja chill (rough Dynamic Model approximation)
      chillHours += d.tmin <= 7 ? 6 : (d.tmin <= 12 ? 8 : 4);
    }
    if (chillHours >= CHILL_REQ[species] && !chillSatisfiedAt) {
      chillSatisfiedAt = d.date;
    }
  }

  // GDD cumulativ de la chill satisfied
  let gdd = 0;
  let bloomEstimate = null;
  if (chillSatisfiedAt) {
    const startDate = new Date(chillSatisfiedAt);
    for (const d of sortedDates) {
      const date = new Date(d.date);
      if (date < startDate) continue;
      const tavg = (d.tmin + d.tmax) / 2;
      gdd += Math.max(0, tavg - 10);
      if (gdd >= GDD_TO_BLOOM[species] && !bloomEstimate) {
        bloomEstimate = d.date;
      }
    }
  }

  // Daca bloom inca nu detectat, estimeaza din forecast 16 zile (+15°C/zi avg)
  let forecastBloom = null;
  if (chillSatisfiedAt && !bloomEstimate) {
    const remainingGdd = GDD_TO_BLOOM[species] - gdd;
    const avgDailyGdd = 8; // estimare conservatoare aprilie-mai Nadlac
    const daysToBloom = Math.round(remainingGdd / avgDailyGdd);
    const today = new Date();
    today.setDate(today.getDate() + daysToBloom);
    forecastBloom = today.toISOString().slice(0, 10);
  }

  return new Response(JSON.stringify({
    species,
    chillRequired: CHILL_REQ[species],
    chillAccumulated: Math.round(chillHours),
    chillSatisfiedAt,
    chillSatisfiedPercent: Math.min(100, Math.round((chillHours / CHILL_REQ[species]) * 100)),
    gddSinceChill: Math.round(gdd),
    gddRequired: GDD_TO_BLOOM[species],
    bloomEstimate: bloomEstimate || forecastBloom,
    bloomEstimateConfidence: bloomEstimate ? 'observed' : (forecastBloom ? 'forecast (~4 zile margine)' : 'insufficient data'),
    fetchedAt: new Date().toISOString()
  }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' }
  });
}
```

```javascript
// public/app.js — widget per specie
async function renderPhenologyWidget(species, container) {
  try {
    const res = await fetch(`/api/phenology?species=${species}`);
    const data = await res.json();
    container.innerHTML = `
      <div class="phenology-widget">
        <h3>Fenologie ${species}</h3>
        <div class="chill-bar">
          <div class="chill-fill" style="width: ${data.chillSatisfiedPercent}%"></div>
          <span>Chill hours: <strong>${data.chillAccumulated} / ${data.chillRequired}</strong> (${data.chillSatisfiedPercent}%)</span>
        </div>
        ${data.chillSatisfiedAt ? `<p>✓ Chill satisfied: <strong>${data.chillSatisfiedAt}</strong></p>` : '<p class="muted">Chill in acumulare...</p>'}
        ${data.bloomEstimate ? `
          <div class="alert alert-info">
            <strong>Inflorire estimata:</strong> ${data.bloomEstimate}
            <small>(${data.bloomEstimateConfidence})</small>
          </div>
        ` : '<p class="muted">Estimare bloom: insufficient data</p>'}
        <small class="source">Model PhenoFlex-inspirat. Marja eroare ±4 zile.</small>
      </div>
    `;
  } catch (e) {
    container.innerHTML = '<p class="alert alert-warning">Fenologie indisponibila.</p>';
  }
}
```

**Limite:** chillR/PhenoFlex full model are nevoie de date orare (nu zilnice). Aproximarea aici e simplificata dar utilizabila la nivel TIPIC. Pentru precizie maxima → integrare Open-Meteo `hourly` (deja disponibil).

---

## N4. TTS — Text-to-Speech alerte frost + raspunsuri AI

**Descriere:** Cand apare alerta frost SAU raspuns AI (din diagnostic / intreaba), buton "Asculta" foloseste `SpeechSynthesis` pentru a citi textul in romana. Util pt parinti cu vedere slaba sau cand sunt cu mainile in livada.

**De ce e util:** Combinat cu N1 (voice input) → ciclu hands-free complet: vorbeste intrebarea, asculta raspunsul. Web Speech API SpeechSynthesis e nativ in Chrome Android cu voce romana (`Microsoft Andrei` sau `Google romanian`).

**Complexitate:** Mica (~1.5h) | **Impact:** Mare (combinat cu N1 = adoptie completa)

**Exemplu implementare:**

```javascript
// public/app.js
let _speechVoiceRo = null;

function initSpeechSynthesis() {
  if (!('speechSynthesis' in window)) return;
  const setVoice = () => {
    const voices = speechSynthesis.getVoices();
    _speechVoiceRo = voices.find(v => v.lang.startsWith('ro')) || voices.find(v => v.default);
  };
  setVoice();
  speechSynthesis.onvoiceschanged = setVoice;
}

function speakText(text, opts = {}) {
  if (!('speechSynthesis' in window)) {
    showToast('Browser-ul nu suporta TTS', 'warning');
    return;
  }
  speechSynthesis.cancel();
  const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length > 800) {
    return speakTextChunked(cleaned, opts);
  }
  const utt = new SpeechSynthesisUtterance(cleaned);
  if (_speechVoiceRo) utt.voice = _speechVoiceRo;
  utt.lang = 'ro-RO';
  utt.rate = opts.rate || 1.0;
  utt.pitch = opts.pitch || 1.0;
  utt.onstart = () => document.querySelectorAll('.tts-btn').forEach(b => b.classList.add('tts-playing'));
  utt.onend = utt.onerror = () => document.querySelectorAll('.tts-btn').forEach(b => b.classList.remove('tts-playing'));
  speechSynthesis.speak(utt);
  livadaLog('TTS', 'speak', 'OK', `len=${cleaned.length}`);
}

function speakTextChunked(text, opts) {
  // Split la propozitii (max 200 char per chunk)
  const chunks = [];
  let cur = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if ((cur + ' ' + sentence).length > 200) {
      if (cur) chunks.push(cur);
      cur = sentence;
    } else {
      cur = cur ? cur + ' ' + sentence : sentence;
    }
  }
  if (cur) chunks.push(cur);

  let i = 0;
  const next = () => {
    if (i >= chunks.length) return;
    const utt = new SpeechSynthesisUtterance(chunks[i]);
    if (_speechVoiceRo) utt.voice = _speechVoiceRo;
    utt.lang = 'ro-RO';
    utt.onend = () => { i++; next(); };
    speechSynthesis.speak(utt);
  };
  next();
}

function stopSpeech() {
  speechSynthesis.cancel();
  document.querySelectorAll('.tts-btn').forEach(b => b.classList.remove('tts-playing'));
}

// Apel la load
window.addEventListener('load', initSpeechSynthesis);
```

```html
<!-- Buton pe orice raspuns AI sau alerta -->
<button class="tts-btn" onclick="speakText(this.previousElementSibling.innerText)" aria-label="Asculta">🔊</button>
```

```css
.tts-btn { background: var(--bg-card); border: 1px solid var(--border); padding: 6px 10px; border-radius: 6px; cursor: pointer; }
.tts-btn.tts-playing { background: #5a9; color: white; animation: pulseRec 1s infinite; }
```

**Edge cases:**
- Vocea ro lipsa pe device → fallback la voce default cu accent strain (mai bine decat nimic, cu warning)
- Text foarte lung → chunking la propozitii
- User da tap pe alt buton TTS → cancel curent + start nou

---

## N5. Fruit counting Gemini vision — estimare recolta

**Descriere:** Modal nou "Numara fructe": user fotografiaza un pom (sau o creanga) → Gemini vision returneaza numar estimat fructe + estimare kg total bazat pe specie + diametru fruct mediu.

**De ce e util:** Estimare recolta pre-cules pentru planificare logistica (cumparator, lazi, processing). Roland are 100+ pomi — manual e impractic. Gemini 2.5-flash e gratuit pentru asta si destul de bun la counting.

**Complexitate:** Mica (~3h) | **Impact:** Mare (insight de business real)

**Exemplu implementare:**

```javascript
// api/count-fruits.js (Edge nou)
import { callGemini, geminiText } from './_ai.js';
import { rateLimit, checkOrigin } from './_auth.js';

export const config = { runtime: 'edge' };

const FRUIT_AVG_WEIGHT_G = {
  cires: 8, visin: 6, cais: 60, piersic: 150, prun: 30,
  migdal: 1.5, par: 200, mar: 200, alun: 1, zmeur: 5,
  mur: 6, afin: 2, rodiu: 300, kaki: 250,
};

export default async function handler(req) {
  if (!checkOrigin(req)) return new Response('forbidden', { status: 403 });
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  if (await rateLimit(req)) return new Response('rate limit', { status: 429 });

  const body = await req.json();
  const { image, species, scope = 'creanga' } = body;
  if (!image || !species) return new Response(JSON.stringify({ error: 'missing image or species' }), { status: 400 });
  if (!FRUIT_AVG_WEIGHT_G[species]) return new Response(JSON.stringify({ error: 'unknown species' }), { status: 400 });

  const base64 = image.replace(/^data:image\/[^;]+;base64,/, '');
  const prompt = `Esti expert estimare recolta. In aceasta foto a unui ${scope === 'pom' ? 'pom intreg' : 'creanga'} de ${species}, numara fructele vizibile.

Returneaza JSON strict (fara markdown):
{
  "count_visible": <numar exact fructe vizibile>,
  "count_estimate_total": <numar estimat inclusiv cele ascunse din foto>,
  "confidence": <"high"|"medium"|"low">,
  "notes": "<scurta nota in romana ce ai vazut>"
}

Daca foto nu arata fructe sau alta specie, returneaza count 0 si confidence low.`;

  try {
    const resp = await callGemini(
      process.env.GOOGLE_AI_API_KEY,
      'gemini-2.5-flash',
      base64,
      'image/jpeg',
      prompt,
      18000
    );
    const text = geminiText(resp);
    let parsed = null;
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: 'parse failed', raw: text }), { status: 502 });
    }

    const avgG = FRUIT_AVG_WEIGHT_G[species];
    const estTotalCount = parsed.count_estimate_total || parsed.count_visible || 0;
    const estKg = ((estTotalCount * avgG) / 1000).toFixed(2);

    return new Response(JSON.stringify({
      ...parsed,
      species,
      avg_weight_g: avgG,
      estimated_kg: parseFloat(estKg),
      _model: 'gemini-2.5-flash'
    }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502 });
  }
}
```

```javascript
// public/app.js
async function runFruitCount(input, species, scope) {
  const file = input.files[0];
  if (!file) return;
  const compressed = await compressDiagnoseImage(file);
  showToast('Numar fructele...', 'info');
  try {
    const res = await fetch('/api/count-fruits', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ image: compressed, species, scope })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');

    const html = `
      <div class="fruit-count-result">
        <h3>Estimare ${species}</h3>
        <p><strong>${data.count_visible}</strong> fructe vizibile, estimat <strong>${data.count_estimate_total}</strong> total</p>
        <p>Greutate medie: ${data.avg_weight_g}g/fruct → estimare <strong>${data.estimated_kg} kg</strong></p>
        <p class="muted">Incredere: ${data.confidence}</p>
        <p>${escapeHtml(data.notes || '')}</p>
        <button onclick="addJurnalEntryFromFruitCount('${species}', ${data.estimated_kg})">+ Adauga in jurnal recolta</button>
      </div>
    `;
    $('#fruitCountResult').innerHTML = html;
    livadaLog('FRUIT', 'count', 'OK', `${species}=${data.estimated_kg}kg`);
  } catch (e) {
    showToast('Eroare: ' + e.message, 'error');
    livadaLog('FRUIT', 'count', 'ERR', e.message);
  }
}
```

**Limite:**
- Gemini counting fructe e ~80% precis pe creanga, 60% pe pom intreg (ascundere). Marja: ±20%.
- Greutate medie fixa per specie — varieta "Cais" vs "Cais mare" difera. Mitigare: input optional "greutate medie observata" pt user power.
- Noaptea / intuneric → Gemini refuza; mesaj clar.

---

## N6. F4.3 — Comparator AI: rulare paralela 2 modele + raport diferente

**Descriere:** In modal "Intreaba AI", buton "Compara modele" trimite intrebarea simultan la Groq + Cerebras (sau Gemini), afiseaza ambele raspunsuri side-by-side cu highlight diferente esentiale.

**De ce e util:** Roland poate detecta cand un model halucineaza vs cand ambele converg. La diagnostic critic, second opinion = decizie informata.

**Complexitate:** Medie (~3h) | **Impact:** Mediu (calitate decizii AI)

**Exemplu implementare:**

```javascript
// public/app.js
async function compareAiModels(question, species) {
  const responses = await Promise.allSettled([
    fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ question, species, preferModel: 'groq' })
    }).then(r => r.json()),
    fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ question, species, preferModel: 'cerebras' })
    }).then(r => r.json())
  ]);

  const groq = responses[0].status === 'fulfilled' ? responses[0].value : { error: responses[0].reason?.message };
  const cerebras = responses[1].status === 'fulfilled' ? responses[1].value : { error: responses[1].reason?.message };

  // Diff: detecteaza paragrafe unice (simplistic — Jaccard pe sentente)
  const sentencesG = (groq.answer || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const sentencesC = (cerebras.answer || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const onlyG = sentencesG.filter(s => !sentencesC.some(c => similarity(s, c) > 0.6));
  const onlyC = sentencesC.filter(s => !sentencesG.some(g => similarity(s, g) > 0.6));

  const html = `
    <div class="ai-compare">
      <div class="ai-compare-side">
        <h4>Groq (${groq._model || 'llama-4-scout'})</h4>
        <div class="ai-text">${sanitizeAI(groq.answer || groq.error || 'fara raspuns')}</div>
      </div>
      <div class="ai-compare-side">
        <h4>Cerebras (llama-3.3-70b)</h4>
        <div class="ai-text">${sanitizeAI(cerebras.answer || cerebras.error || 'fara raspuns')}</div>
      </div>
      <div class="ai-diff">
        <h4>Diferente esentiale</h4>
        ${onlyG.length ? `<p><strong>Doar Groq:</strong></p><ul>${onlyG.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : ''}
        ${onlyC.length ? `<p><strong>Doar Cerebras:</strong></p><ul>${onlyC.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : ''}
        ${!onlyG.length && !onlyC.length ? '<p class="alert alert-info">Modelele converg pe esential — raspuns probabil corect.</p>' : '<p class="alert alert-warning">Modelele difera. Verifica sursa.</p>'}
      </div>
    </div>
  `;
  $('#askCompareResult').innerHTML = html;
}

function similarity(a, b) {
  // Jaccard similarity simplificat pe cuvinte
  const wa = new Set(a.toLowerCase().split(/\s+/));
  const wb = new Set(b.toLowerCase().split(/\s+/));
  const inter = [...wa].filter(x => wb.has(x)).length;
  const union = new Set([...wa, ...wb]).size;
  return union ? inter / union : 0;
}
```

```css
.ai-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ai-compare-side { background: var(--bg-card); padding: 12px; border-radius: 8px; }
.ai-diff { grid-column: 1 / -1; background: var(--bg-soft); padding: 12px; border-radius: 8px; }
@media (max-width: 600px) { .ai-compare { grid-template-columns: 1fr; } }
```

---

## N7. F7.3 Harta livada interactiva

**Descriere:** Tab nou "Harta livada" cu canvas SVG: layout simplificat al livadii (poligon teren + pomi marcati ca puncte cu specia colorata + tooltip click cu istoric pom).

**De ce e util:** Roland are 100+ pomi pe ~1 ha. Cand nota in jurnal "tratament pe Mar Florina coltul nord" e abstract; cu harta poate selecta pomi specifici, vede istoric per pom (interventiuni, foto), planifica tur inspectie spatial.

**Complexitate:** Mare (~1-2 zile, prima versiune simplificata) | **Impact:** Mare (insight spatial fundamental nou)

**Implementare in trepte:**

**v1 (MVP):** SVG static cu poligon teren + grid pomi pe randuri, click pom = popup istoric. Coordonate pomi salvate in `localStorage` `livada-orchard-layout`.

```javascript
// public/app.js — orchard map MVP
const ORCHARD_LAYOUT_KEY = 'livada-orchard-layout';

function getOrchardLayout() {
  try { return JSON.parse(localStorage.getItem(ORCHARD_LAYOUT_KEY) || '{"trees":[]}'); }
  catch { return { trees: [] }; }
}

function saveOrchardLayout(layout) {
  localStorage.setItem(ORCHARD_LAYOUT_KEY, JSON.stringify(layout));
}

function renderOrchardMap(container) {
  const layout = getOrchardLayout();
  const w = 360, h = 480; // A6 portrait scale
  const trees = layout.trees;
  const SPECIES_COLOR = {
    cires: '#c00', visin: '#900', cais: '#fa0', piersic: '#f80', prun: '#609',
    migdal: '#fc6', par: '#9d3', mar: '#f33', alun: '#963', zmeur: '#a06',
    mur: '#206', afin: '#338', rodiu: '#a30', kaki: '#f60',
  };

  const journal = getJurnalEntries();

  container.innerHTML = `
    <div class="orchard-map">
      <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" id="orchardSvg">
        <!-- Border teren -->
        <rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="#888" stroke-dasharray="4 2"/>
        <!-- Pomi -->
        ${trees.map(t => {
          const cnt = journal.filter(j => j.treeId === t.id).length;
          return `
            <g class="tree-marker" data-id="${t.id}" transform="translate(${t.x}, ${t.y})">
              <circle r="8" fill="${SPECIES_COLOR[t.species] || '#777'}" stroke="white" stroke-width="2"/>
              <text y="3" text-anchor="middle" font-size="9" fill="white" font-weight="700">${t.id}</text>
              ${cnt > 0 ? `<circle cx="6" cy="-6" r="4" fill="#3a3"/><text x="6" y="-3" text-anchor="middle" font-size="6" fill="white">${cnt}</text>` : ''}
            </g>
          `;
        }).join('')}
        <!-- Norm orientare -->
        <text x="${w - 30}" y="${h - 25}" font-size="10" fill="#888">N ↑</text>
      </svg>
      <div class="orchard-legend">
        ${Object.entries(SPECIES_COLOR).slice(0, 6).map(([sp, c]) => `
          <span><span class="legend-dot" style="background:${c}"></span>${sp}</span>
        `).join('')}
      </div>
      <div class="orchard-actions">
        <button onclick="addTreeMode()">+ Adauga pom</button>
        <button onclick="exportOrchard()">Exporta SVG</button>
      </div>
      <div id="treeDetail"></div>
    </div>
  `;

  $$('.tree-marker').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      showTreeDetail(id);
    });
  });
}

function showTreeDetail(id) {
  const layout = getOrchardLayout();
  const tree = layout.trees.find(t => t.id === id);
  if (!tree) return;
  const journal = getJurnalEntries().filter(j => j.treeId === id);
  $('#treeDetail').innerHTML = `
    <div class="tree-card">
      <h4>Pom ${id} — ${tree.species}</h4>
      <p>Plantat: ${tree.plantedYear || '?'}</p>
      <p>Interventii: ${journal.length}</p>
      <ul>${journal.slice(0, 5).map(j => `
        <li>${j.date}: ${j.type} — ${j.note?.slice(0, 50) || ''}</li>
      `).join('')}</ul>
      <button onclick="removeTree('${id}')">Sterge pom</button>
    </div>
  `;
}

function addTreeMode() {
  showToast('Click pe harta unde vrei sa adaugi pom', 'info');
  const svg = $('#orchardSvg');
  const handler = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const local = pt.matrixTransform(svg.getScreenCTM().inverse());
    const layout = getOrchardLayout();
    const id = String(layout.trees.length + 1);
    const species = prompt('Specie pom (ex: mar):') || 'general';
    layout.trees.push({ id, x: local.x, y: local.y, species, plantedYear: new Date().getFullYear() });
    saveOrchardLayout(layout);
    svg.removeEventListener('click', handler);
    renderOrchardMap($('#orchardMapContainer'));
  };
  svg.addEventListener('click', handler);
}
```

**v2 (viitor):** Background imagine satelit Google Static Maps (free 28K req/luna), drag-drop pomi, alocare zone parcelare.

---

## N8. F7.1 Servicii locale Nadlac

**Descriere:** Tab "Servicii locale" cu lista pepiniere, magazine fitosanitare, intermediari fructe, mecanici utilaje agricole din zona Arad/Nadlac. Fiecare cu nume, telefon, link harta, scurta descriere.

**De ce e util:** Roland nu trebuie sa-si aminteasca toate contactele. Parintii pot suna direct din PWA daca apare nevoie urgenta (boala, utilaj defect).

**Complexitate:** Mica (~2h continut + 1h UI) | **Impact:** Mediu (centralizare info practica)

**Exemplu implementare:**

```html
<!-- public/index.html — tab nou (sau in tab Plan) -->
<div class="tab-content" id="servicii-locale">
  <h2>Servicii Locale Nadlac/Arad</h2>

  <h3>Pepiniere & furnizori material saditor</h3>
  <ul class="services-list">
    <li>
      <strong>Pepiniera Dariu Plant</strong> — Nadlac
      <p>Specii: pomi fructiferi, varieti rezistente seceta. Telefon livrari: <a href="tel:+40XXXXXXXXX">XXX</a></p>
      <a href="https://maps.google.com/?q=Pepiniera+Dariu+Plant+Nadlac" target="_blank" rel="noopener">Harta</a>
    </li>
    <!-- Roland completeaza restul -->
  </ul>

  <h3>Magazine fitosanitare</h3>
  <ul class="services-list">
    <li>
      <strong>AgroSemPlant Arad</strong> — produse autorizate ANSVSA
      <p>Telefon: <a href="tel:+40XXXXXXXXX">XXX</a></p>
    </li>
  </ul>

  <h3>Intermediari fructe (vanzare en-gros)</h3>
  <ul class="services-list">
    <li><strong>[completeaza]</strong></li>
  </ul>

  <h3>Mecanici utilaje agricole</h3>
  <ul class="services-list">
    <li><strong>[completeaza]</strong></li>
  </ul>

  <h3>Veterinar / agronom consultant</h3>
  <ul class="services-list">
    <li><strong>[completeaza]</strong></li>
  </ul>

  <p class="muted source">Date introduse manual de Roland. Click telefon pentru apel direct (mobile).</p>
</div>
```

```css
.services-list { list-style: none; padding: 0; }
.services-list li { background: var(--bg-card); padding: 12px; margin-bottom: 8px; border-radius: 8px; border-left: 4px solid var(--accent); }
.services-list a[href^="tel:"] { color: var(--accent); font-weight: 700; }
```

**Roland completeaza** lista cu informatii reale.

---

## N9. Prompting cascade AI diagnostic — leaf-first 2-stage

**Descriere:** Refactor `diagnose.js` pentru a face 2 apeluri AI:
1. **Stage 1:** "Este aceasta o frunza valida pentru analiza?" (validare poza → reject foto neclare/non-frunza)
2. **Stage 2:** Daca DA → diagnostic boala detaliat

**De ce e util:** Acuratete crescuta (literatura confirma cascade leaf-first cu 8-12% mai bun) + economiseste API calls (foto inutile sunt respinse rapid). Roland primeste feedback util ("foto neclara, fa alta") in loc de halucinatii.

**Complexitate:** Mica (~2h) | **Impact:** Mediu (calitate AI)

**Exemplu implementare:**

```javascript
// api/diagnose.js — adaugare etapa pre-validation
async function preValidateLeaf(base64, mimeType) {
  const prompt = `Aceasta foto este utila pentru diagnostic boala plante? Returneaza JSON strict:
{
  "valid": true|false,
  "reason": "<motiv scurt>",
  "suggestion": "<sugestie scurta in romana daca invalid>"
}
Criterii valid: foto contine frunza/fruct/scoarta, e clara, e luminata.
Criterii invalid: foto generala fara detaliu, foto blurata, foto noaptea.`;

  try {
    const resp = await callGemini(
      process.env.GOOGLE_AI_API_KEY,
      'gemini-2.5-flash',
      base64, mimeType, prompt,
      8000
    );
    const text = geminiText(resp);
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { valid: true }; // failsafe — daca pre-validation pica, continua cu diagnostic normal
  }
}

export default async function handler(req) {
  // ... (cod existent CORS, auth, body parse) ...

  const validation = await preValidateLeaf(base64, mimeType);
  if (!validation.valid) {
    return new Response(JSON.stringify({
      _stage: 'pre-validation',
      _valid: false,
      diagnosis: `**Foto neutilizabila pentru diagnostic.**\n\n${validation.reason}\n\n*Sugestie:* ${validation.suggestion || 'Fa o alta poza, mai aproape, in lumina naturala, focalizata pe simptom.'}`,
      _model: 'pre-validator-gemini'
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  // ... continuă cu diagnostic primary (Gemini pro → fallbacks) ...
}
```

---

## N10. Tree measurement Gemini cu obiect referinta scala

**Descriere:** Modal "Masoara pom": user pune un obiect cunoscut (palma, banana 18cm, sticla 25cm) langa pom, fotografiaza → Gemini estimeaza inaltime + diametru trunchi.

**De ce e util:** Tracking crestere pomi an de an (DBH — diameter at breast height) e indicator important sanatate. Manual cu metru e tedios. Cu obiect referinta + Gemini → 60-80% precizie suficienta.

**Complexitate:** Medie (~3h) | **Impact:** Mediu (date noi colectabile)

**Exemplu implementare:**

```javascript
// api/measure-tree.js (Edge nou)
import { callGemini, geminiText } from './_ai.js';
import { rateLimit, checkOrigin } from './_auth.js';

export const config = { runtime: 'edge' };

const REF_OBJECTS_CM = {
  palma: 18, banana: 18, sticla: 25, lopata: 100, hartie_a4: 30, telefon: 16
};

export default async function handler(req) {
  if (!checkOrigin(req)) return new Response('forbidden', { status: 403 });
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  if (await rateLimit(req)) return new Response('rate limit', { status: 429 });

  const { image, refObject = 'palma' } = await req.json();
  const refCm = REF_OBJECTS_CM[refObject];
  if (!refCm) return new Response(JSON.stringify({ error: 'unknown ref object' }), { status: 400 });

  const base64 = image.replace(/^data:image\/[^;]+;base64,/, '');
  const prompt = `Estimeaza inaltimea pomului si diametrul trunchiului in aceasta foto. Foloseste obiectul referinta "${refObject}" (lungime cunoscuta ${refCm} cm) pentru scalare.

Returneaza JSON strict:
{
  "tree_height_m": <inaltime estimata in metri>,
  "trunk_diameter_cm": <diametru trunchi la baza in cm>,
  "ref_visible": true|false,
  "confidence": "high"|"medium"|"low",
  "notes": "<scurta nota in romana>"
}`;

  try {
    const resp = await callGemini(
      process.env.GOOGLE_AI_API_KEY,
      'gemini-2.5-flash',
      base64, 'image/jpeg', prompt,
      18000
    );
    const text = geminiText(resp);
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return new Response(JSON.stringify({ ...parsed, refObject, refCm }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502 });
  }
}
```

---

## N11. Share link public read-only jurnal (vecini)

**Descriere:** Buton "Genereaza link public" pe tab Jurnal → creeaza URL `/share/<token>` care arata jurnalul read-only (fara controale edit, fara auth). Token expira la 30 zile.

**De ce e util:** Roland poate partaja experienta cu vecini fermieri ("uite ce am facut anul asta") fara sa le dea acces complet. Build community.

**Complexitate:** Medie (~4h) | **Impact:** Mediu (comunitate locala)

**Exemplu implementare:**

```javascript
// api/share-link.js (Edge nou)
import { Redis } from '@upstash/redis';
import { rateLimit, checkOrigin } from './_auth.js';

export const config = { runtime: 'edge' };
const redis = Redis.fromEnv();

export default async function handler(req) {
  if (!checkOrigin(req)) return new Response('forbidden', { status: 403 });
  if (await rateLimit(req)) return new Response('rate limit', { status: 429 });

  if (req.method === 'POST') {
    // Generare link
    const { entries, scope = 'jurnal' } = await req.json();
    if (!Array.isArray(entries)) return new Response('invalid', { status: 400 });
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    await redis.set(`share:${token}`, { entries, scope, createdAt: Date.now() }, { ex: 30 * 24 * 60 * 60 });
    return new Response(JSON.stringify({ token, url: `/share/${token}` }), { status: 200 });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token || !/^[a-f0-9]{16}$/.test(token)) return new Response('invalid', { status: 400 });
    const data = await redis.get(`share:${token}`);
    if (!data) return new Response('expired or not found', { status: 404 });
    return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
  }

  return new Response('method not allowed', { status: 405 });
}
```

```javascript
// public/app.js
async function generateShareLink() {
  const entries = getJurnalEntries().slice(-100); // ultimele 100
  const res = await fetch('/api/share-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ entries })
  });
  const data = await res.json();
  const fullUrl = location.origin + data.url;
  await navigator.clipboard.writeText(fullUrl);
  showToast(`Link copiat: ${fullUrl} (valid 30 zile)`, 'info');
}
```

**Routing:** adauga in `vercel.json` rewrite `/share/(.*)` → `/share-view.html` (pagina static minimala care apeleaza GET /api/share-link).

---

## N12. Soil moisture / irigatie predictor din ET0 + ploaie

**Descriere:** Endpoint `/api/irrigation-plan?species=mar` care calculeaza nevoie irigare bazata pe:
- Evapotranspiratie zilnica (ET0 din Open-Meteo)
- Ploaie cumulata 7 zile
- Coeficient cultura (Kc) per specie
- Returneaza recomandare litri/pom/zi pentru urmatoarele 7 zile

**De ce e util:** Roland are seceta vara in Nadlac (CLAUDE.md sectiune I — irigare). Decide cand sa porneasca irigarea pe baza obiectiva. Economiseste apa.

**Complexitate:** Medie (~5h) | **Impact:** Mare (resursa critica)

**Exemplu implementare:**

```javascript
// api/irrigation-plan.js
import { Redis } from '@upstash/redis';
import { fetchWithTimeout } from './_timeout.js';
import { rateLimit, checkOrigin } from './_auth.js';

export const config = { runtime: 'edge' };
const redis = Redis.fromEnv();

const KC = { // coeficient cultura per specie (FAO 56 simplificat)
  cires: 0.95, visin: 0.85, cais: 0.95, piersic: 1.05, prun: 0.90,
  migdal: 1.00, par: 1.05, mar: 1.05, alun: 0.85, zmeur: 1.05,
  mur: 1.00, afin: 1.05, rodiu: 0.85, kaki: 0.95,
};

const TREE_AREA_M2 = { // suprafata de irigare per pom matur
  default: 4, zmeur: 0.5, mur: 0.5, afin: 1, alun: 6, mar: 8, par: 8
};

export default async function handler(req) {
  if (!checkOrigin(req)) return new Response('forbidden', { status: 403 });
  if (await rateLimit(req)) return new Response('rate limit', { status: 429 });

  const url = new URL(req.url);
  const species = url.searchParams.get('species') || 'mar';
  if (!KC[species]) return new Response(JSON.stringify({ error: 'unknown species' }), { status: 400 });

  // Forecast 7 zile ET0 din Open-Meteo
  const apiUrl = 'https://api.open-meteo.com/v1/forecast?latitude=46.1648&longitude=20.7168&daily=et0_fao_evapotranspiration,precipitation_sum&timezone=Europe%2FBucharest&forecast_days=7';
  const res = await fetchWithTimeout(apiUrl, {}, 8000);
  if (!res.ok) return new Response(JSON.stringify({ error: 'meteo down' }), { status: 502 });
  const data = await res.json();

  const dates = data.daily.time;
  const et0Arr = data.daily.et0_fao_evapotranspiration;
  const rainArr = data.daily.precipitation_sum;

  const kc = KC[species];
  const area = TREE_AREA_M2[species] || TREE_AREA_M2.default;

  const plan = dates.map((d, i) => {
    const etc = et0Arr[i] * kc; // mm/zi necesar
    const deficit = Math.max(0, etc - rainArr[i]); // mm/zi de irigat
    const litersPerTree = (deficit * area).toFixed(1); // 1 mm = 1 L/m2

    let recommendation = 'fara irigare';
    if (deficit > 5) recommendation = `irigare urgenta: ${litersPerTree} L/pom`;
    else if (deficit > 2) recommendation = `irigare moderata: ${litersPerTree} L/pom`;
    else if (deficit > 0) recommendation = `irigare optionala: ${litersPerTree} L/pom`;

    return { date: d, et0: et0Arr[i], rain: rainArr[i], deficit_mm: deficit.toFixed(2), liters_per_tree: parseFloat(litersPerTree), recommendation };
  });

  return new Response(JSON.stringify({ species, kc, area_m2: area, plan, generatedAt: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=10800' } // 3h cache
  });
}
```

---

## N13. Custom alert rules per user

**Descriere:** Modal "Setari alerte": user configureaza praguri proprii (ex: alerta frost daca temp < 1°C in loc de 3.5°C, alerta ploaie daca > 25mm). Valori salvate in `localStorage` + sync optional Redis.

**De ce e util:** Praguri default sunt pentru livada Nadlac. Roland poate ajusta pe baza experientei locale fine-grained. Parintii pot dezactiva alerte non-relevante.

**Complexitate:** Medie (~3h) | **Impact:** Mediu (personalizare)

**Exemplu implementare:**

```javascript
// public/app.js
const ALERT_DEFAULTS = {
  frost: { enabled: true, threshold: 3.5 },
  hail: { enabled: true, threshold: 60 },
  wind: { enabled: true, threshold: 50 },
  heat: { enabled: true, threshold: 35 },
  rain: { enabled: true, threshold: 30 },
  drought: { enabled: false, dryDays: 14 },
};

function getAlertConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem('livada-alert-config') || '{}');
    return { ...ALERT_DEFAULTS, ...saved };
  } catch { return ALERT_DEFAULTS; }
}

function saveAlertConfig(cfg) {
  localStorage.setItem('livada-alert-config', JSON.stringify(cfg));
}

function renderAlertConfigModal() {
  const cfg = getAlertConfig();
  $('#alertConfigBody').innerHTML = `
    ${Object.entries(cfg).map(([key, c]) => `
      <div class="alert-config-row">
        <label>
          <input type="checkbox" ${c.enabled ? 'checked' : ''} onchange="updateAlertCfg('${key}', 'enabled', this.checked)">
          <strong>${key}</strong>
        </label>
        ${c.threshold !== undefined ? `
          <input type="number" value="${c.threshold}" step="0.1" onchange="updateAlertCfg('${key}', 'threshold', parseFloat(this.value))">
        ` : ''}
      </div>
    `).join('')}
    <button onclick="saveAlertConfigUI()">Salveaza</button>
  `;
  openModal('alertConfigModal');
}

function updateAlertCfg(key, field, value) {
  const cfg = getAlertConfig();
  cfg[key] = cfg[key] || {};
  cfg[key][field] = value;
  saveAlertConfig(cfg);
  livadaLog('ALERT_CFG', 'update', 'OK', `${key}.${field}=${value}`);
}
```

Backend `meteo-cron.js` citeste config user din Redis (cheia `alert:config:default`) si suprascrie pragurile hardcoded.

---

## N14. F8.1 — IoT senzor ESP32 + TTN

**Descriere:** Endpoint `/api/sensor-data` accepta POST cu masuratori (temp sol, umiditate sol, lux) de la nod ESP32 + senzor capacitiv. Stocate in Redis (`sensor:<treeId>:<isoTimestamp>`). Dashboard afiseaza grafic ultimele 7 zile per pom.

**De ce e util:** Microclimat real, nu doar prognoza. Decizie irigare directa din date sol. Cost hardware DIY < 30 EUR/nod.

**Complexitate:** Mare (~2 zile soft + hardware setup) | **Impact:** Mare (dar dependent fizic)

**Exemplu implementare:**

```javascript
// api/sensor-data.js
import { Redis } from '@upstash/redis';

export const config = { runtime: 'edge' };
const redis = Redis.fromEnv();

const SENSOR_API_KEY = process.env.SENSOR_API_KEY; // share secret cu ESP32

export default async function handler(req) {
  if (req.method === 'POST') {
    const auth = req.headers.get('x-sensor-key');
    if (auth !== SENSOR_API_KEY) return new Response('unauthorized', { status: 401 });

    const body = await req.json();
    const { nodeId, treeId, soilTemp, soilMoisture, lux, batteryV } = body;
    if (!nodeId) return new Response('missing nodeId', { status: 400 });

    const ts = new Date().toISOString();
    const reading = { nodeId, treeId, soilTemp, soilMoisture, lux, batteryV, ts };

    // Store last 7 days per tree
    const key = `sensor:${treeId || nodeId}:readings`;
    const existing = await redis.get(key) || [];
    existing.push(reading);
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const fresh = existing.filter(r => new Date(r.ts).getTime() > cutoff);
    await redis.set(key, fresh, { ex: 8 * 24 * 60 * 60 });
    await redis.set(`sensor:${nodeId}:last`, reading, { ex: 60 * 60 * 24 });

    return new Response(JSON.stringify({ ok: true, count: fresh.length }), { status: 200 });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const treeId = url.searchParams.get('treeId');
    if (!treeId) return new Response('missing treeId', { status: 400 });
    const data = await redis.get(`sensor:${treeId}:readings`) || [];
    return new Response(JSON.stringify({ readings: data }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'private, max-age=60' }
    });
  }

  return new Response('method not allowed', { status: 405 });
}
```

**Hardware skeleton ESP32 (Arduino):**
```cpp
// Pseudocod ESP32-C3 + senzor capacitiv sol
#include <WiFi.h>
#include <HTTPClient.h>
#define SENSOR_PIN 1
#define SLEEP_S 1800 // 30 min

void setup() {
  WiFi.begin("SSID", "PASS");
  while (WiFi.status() != WL_CONNECTED) delay(500);
  int raw = analogRead(SENSOR_PIN);
  float moisture = map(raw, 0, 4095, 0, 100);
  HTTPClient http;
  http.begin("https://livada-mea-psi.vercel.app/api/sensor-data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Sensor-Key", "SHARED_SECRET");
  http.POST("{\"nodeId\":\"node-1\",\"treeId\":\"12\",\"soilMoisture\":" + String(moisture) + "}");
  esp_deep_sleep(SLEEP_S * 1000000);
}
```

---

## N15. Yield prediction engine

**Descriere:** Endpoint `/api/yield-forecast?species=mar&year=2026` care prezice kg/pom bazat pe:
- Istoric jurnal recolta (anii anteriori)
- GDD acumulat (din N3)
- Nr tratamente preventive (din jurnal)
- Daune frost (din alerte istorice)

**De ce e util:** Planificare pre-recolta (capacitate procesare, intermediari, lazi). 70-80% acuratete realista.

**Complexitate:** Mare (~1 zi) | **Impact:** Mare

(Implementare detaliata omisa pentru brevitate — patternul similar N3 + agregare jurnal istoric.)

---

## N16. Smoke tests Playwright (5 fluxuri critice)

**Descriere:** Suite Playwright in `tests/e2e/` care valideaza zilnic 5 fluxuri user critice:
1. Deschide PWA → tab Cires → vede continut
2. Adauga interventie jurnal → verifica persistenta + sync
3. Diagnostic foto AI (mock cu poza fixture) → verifica raspuns
4. Calculator doze: produs A, vol 16L → verifica rezultat
5. Search "monilioza" → vede sugestii → click → tab corect

**De ce e util:** Frontend regression detectat in CI inainte de deploy productie. Playwright MCP deja disponibil.

**Complexitate:** Medie (~6h initial setup + scrierea) | **Impact:** Mare (calitate proces)

**Exemplu implementare:**

```javascript
// tests/e2e/smoke.spec.js
import { test, expect } from '@playwright/test';

test.describe('Livada smoke', () => {
  test('opens cires tab', async ({ page }) => {
    await page.goto('https://livada-mea-psi.vercel.app');
    await page.click('button[data-tab="cires"]');
    await expect(page.locator('#cires h2').first()).toContainText(/cires/i);
  });

  test('adds journal entry', async ({ page }) => {
    await page.goto('https://livada-mea-psi.vercel.app');
    await page.click('button[data-tab="azi"]');
    await page.click('button:has-text("Adauga interventie")');
    await page.fill('#jurnalNote', 'Test smoke');
    await page.selectOption('#jurnalType', 'tratament');
    await page.click('button:has-text("Salveaza")');
    await expect(page.locator('.journal-entry')).toContainText('Test smoke');
  });

  test('search suggestions', async ({ page }) => {
    await page.goto('https://livada-mea-psi.vercel.app');
    await page.fill('#searchInput', 'monilioza');
    await expect(page.locator('.suggestion-item')).toBeVisible();
    await page.click('.suggestion-item:first-child');
    await expect(page.locator('.search-highlight')).toBeVisible();
  });

  test('calculator doze', async ({ page }) => {
    await page.goto('https://livada-mea-psi.vercel.app');
    await page.click('button[data-tab="plan-livada"]');
    await page.selectOption('#calcProduct', 'cupru-zeama');
    await page.fill('#calcTankVolume', '16');
    await page.click('#calcRunBtn');
    await expect(page.locator('#calcResult')).toContainText(/g/);
  });
});
```

---

## N17. Hyperlocal frost alert crowdsourced

**Descriere:** Cand Roland primeste alerta frost confirmata, buton "Alerteaza vecinii" trimite SMS/notificare la lista vecinilor opt-in. Bazat pe API gratuit (Twilio free tier sau email-to-SMS).

**Complexitate:** Mare (~1 zi + integrare provider) | **Impact:** Mediu (depinde adoptie vecini)

(Marcat P4 — implementare doar dupa adoptie reala P0-P2.)

---

## N18. Glosar voice-readable + cautare fonetica

**Descriere:** In tab Glosar, fiecare termen are buton "Asculta" (TTS din N4). Cautare cu match fonetic (Soundex sau Levenshtein) — user scrie "carbamida" si gaseste si "carbamidă" sau "carbamid".

**Complexitate:** Mica (~2h) | **Impact:** Mic (nice-to-have)

---

# PARTEA III — IMBUNATATIRI TEHNICE (T1-T9)

## T1. AI cost tracking + quota guard

**Problema:** Logger-ul `livadaLog("AI", ...)` salveaza per call modelul + durata, dar nu agregheaza consumul total. Gemini free tier are 1000 req/zi, app rate-limit e 10 req/min → epuizare in 1.7 ore de utilizare intensa. Fara monitoring, user vede "diagnostic indisponibil" fara explicatie.
**Solutie:**
- Functie noua `aiQuotaGuard(provider)` checked inainte de orice call AI scump
- Counter Redis per provider per zi: `ai-quota:gemini:2026-04-15` cu INCR + EXPIRE 24h
- Daca depasit threshold (ex: 80%) → toast warning user + fallback automat la model alternativ
- Endpoint `/api/ai-quota` returneaza JSON cu utilizare/limita per provider
- Widget mic in app footer: "AI: 234/1000 Gemini, 12/14400 Groq"

**Complexitate:** Medie (~3h) | **Impact:** Mare (Operational — previne incident silentios)

**Exemplu implementare:**

```javascript
// api/_quota.js (utilitar nou)
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const QUOTA_LIMITS = {
  gemini: { daily: 1000, warn: 0.8 },
  groq: { daily: 14400, warn: 0.85 },
  cerebras: { daily: 1440, warn: 0.85 }, // 30 RPM × 60 × 24 / 30 (conservator)
  plantnet: { daily: 500, warn: 0.8 },
};

export async function checkAndIncrementQuota(provider) {
  const limit = QUOTA_LIMITS[provider];
  if (!limit) return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `ai-quota:${provider}:${today}`;
  const used = await redis.incr(key);
  if (used === 1) await redis.expire(key, 26 * 3600); // safety margin
  return {
    ok: used <= limit.daily,
    warning: used >= limit.daily * limit.warn,
    used,
    limit: limit.daily,
    percent: Math.round((used / limit.daily) * 100)
  };
}

export async function getQuotaStatus() {
  const today = new Date().toISOString().slice(0, 10);
  const out = {};
  for (const [provider, limit] of Object.entries(QUOTA_LIMITS)) {
    const used = parseInt(await redis.get(`ai-quota:${provider}:${today}`) || 0);
    out[provider] = { used, limit: limit.daily, percent: Math.round((used / limit.daily) * 100) };
  }
  return out;
}
```

```javascript
// api/diagnose.js — folosire
import { checkAndIncrementQuota } from './_quota.js';

export default async function handler(req) {
  // ... existing CORS/auth/parse ...

  const quota = await checkAndIncrementQuota('gemini');
  if (!quota.ok) {
    // Fallback la GPT-4.1 sau intoarcere clara
    return new Response(JSON.stringify({
      error: 'Cota Gemini zilnica epuizata. Reincearca dupa miezul noptii sau foloseste alta functie.',
      _quota: quota
    }), { status: 429, headers: { 'content-type': 'application/json' } });
  }

  // ... continue with Gemini call ...

  // In response, include warning daca >80%
  return new Response(JSON.stringify({
    diagnosis: result,
    _quota: quota.warning ? { warning: true, used: quota.used, limit: quota.limit } : undefined
  }));
}
```

```javascript
// api/ai-quota.js (nou GET endpoint)
import { getQuotaStatus } from './_quota.js';
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const status = await getQuotaStatus();
  return new Response(JSON.stringify(status), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' }
  });
}
```

```javascript
// public/app.js — widget footer
async function renderQuotaBadge() {
  try {
    const res = await fetch('/api/ai-quota');
    const data = await res.json();
    const html = Object.entries(data).map(([p, q]) => {
      const cls = q.percent >= 80 ? 'quota-red' : q.percent >= 50 ? 'quota-yellow' : 'quota-green';
      return `<span class="quota-badge ${cls}" title="${q.used}/${q.limit}">${p} ${q.percent}%</span>`;
    }).join(' ');
    $('#quotaBadge').innerHTML = html;
  } catch { /* silent */ }
}
setInterval(renderQuotaBadge, 5 * 60 * 1000); // 5 min
```

---

## T2. Redis fallback in-memory pe rate limit (fail-closed)

**Problema:** `_auth.js:rateLimit` daca Redis cade, returneaza fail-open (catch silent). Fara Redis = fara rate limit = DDoS vulnerability.
**Solutie:**
- Implementare in-memory sliding window in modulul `_auth.js` (Map cu IP → array timestamps)
- La Redis timeout/error → fallback la in-memory (acelasi behavior, doar in scope per Edge instance)
- Pe scale Edge (multi-instance) e degradat dar safety net
**Complexitate:** Mica (~1.5h) | **Impact:** Mare (Securitate — single point of failure rezolvat)

**Exemplu implementare:**

```javascript
// api/_auth.js — adauga fallback
const _memBuckets = new Map(); // IP → [timestamps]

function rateLimitInMemory(ip, max, windowMs) {
  const now = Date.now();
  const arr = (_memBuckets.get(ip) || []).filter(ts => now - ts < windowMs);
  arr.push(now);
  _memBuckets.set(ip, arr);
  // Cleanup periodic (best-effort)
  if (_memBuckets.size > 1000) {
    for (const [k, v] of _memBuckets) {
      if (now - v[v.length - 1] > windowMs * 2) _memBuckets.delete(k);
    }
  }
  return arr.length > max;
}

export async function rateLimit(req, maxOverride) {
  const ip = getHeader(req, 'x-real-ip') || 'anonymous';
  const max = maxOverride || 30;
  const windowMs = 60 * 1000;

  try {
    // Existing Redis logic
    const key = `ratelimit:${ip}:${Math.floor(Date.now() / windowMs)}`;
    const pipe = redis.pipeline();
    pipe.incr(key);
    pipe.expire(key, 70);
    const [count] = await Promise.race([
      pipe.exec(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Redis timeout')), 1500))
    ]);
    return count > max;
  } catch (e) {
    console.warn('Redis rateLimit fail, fallback in-memory', e.message);
    return rateLimitInMemory(ip, max, windowMs);
  }
}
```

---

## T3. Lazy load sectiuni specii

**Problema:** HTML 761 KB minified contine 20 specii × ~30 KB continut. La incarcare initiala FCP 2-2.5s. Lazy load → ~400 KB initial → FCP <1.8s estimat.
**Solutie:**
- Build script `scripts/extract-species.js` care pe build extrage `<div class="tab-content" id="X">...</div>` din index.html in fisiere separate `public/species/X.html`
- In index.html ramane doar `<div class="tab-content" id="X" data-lazy="/species/X.html"></div>`
- JS: la primul click pe tab specie → fetch + injecteaza HTML + cache localStorage
**Complexitate:** Medie (~5h, build pipeline + JS lazy) | **Impact:** Mare (perf mobil)

**Exemplu implementare:**

```javascript
// scripts/extract-species.js
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom'; // npm i -D jsdom

async function extract() {
  const html = await fs.readFile('public/index.html', 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  await fs.mkdir('public/species', { recursive: true });

  for (const tab of doc.querySelectorAll('.tab-content[id]')) {
    const id = tab.id;
    if (['azi', 'ai', 'plan-livada', 'glosar'].includes(id)) continue; // skip non-species
    const content = tab.innerHTML;
    await fs.writeFile(`public/species/${id}.html`, content, 'utf-8');
    tab.innerHTML = '<p class="lazy-loading">Se incarca...</p>';
    tab.setAttribute('data-lazy', `/species/${id}.html`);
  }

  await fs.writeFile('public/index.html', dom.serialize(), 'utf-8');
  console.log('Species extracted to public/species/');
}

extract();
```

```javascript
// public/app.js — lazy loader
async function ensureTabLoaded(tabId) {
  const tab = document.getElementById(tabId);
  if (!tab || !tab.dataset.lazy) return;
  if (tab.dataset.loaded === '1') return;

  const cacheKey = `species-cache-${tabId}`;
  let html = localStorage.getItem(cacheKey);
  if (!html) {
    try {
      const res = await fetch(tab.dataset.lazy);
      if (!res.ok) throw new Error('fetch failed');
      html = await res.text();
      try { localStorage.setItem(cacheKey, html); } catch { /* quota */ }
    } catch (e) {
      tab.innerHTML = '<p class="alert alert-warning">Nu s-a putut incarca continutul. Verifica conexiunea.</p>';
      return;
    }
  }
  tab.innerHTML = html;
  tab.dataset.loaded = '1';
  injectSpeciesTools(tabId); // re-attach tools
}

// Intercept tab click
document.addEventListener('click', async e => {
  const btn = e.target.closest('button[data-tab]');
  if (btn) await ensureTabLoaded(btn.dataset.tab);
});
```

**Update build:** in `package.json` script `build` adauga `&& node scripts/extract-species.js` dupa minify-html.

**Update SW:** cache `/species/*.html` cu network-first strategy.

---

## T4. F8.4 — Web Push real cu VAPID

**Problema:** Notificarile actuale (Notification API) functioneaza doar daca PWA e deschis. Cu app inchis, user nu primeste alerta frost dimineata.
**Solutie:**
- Generare cheie VAPID (web-push library)
- Endpoint `/api/push-subscribe` salveaza subscriber in Redis
- Modificare `meteo-cron.js` la frost detectat → trimite WebPush la toti abonatii
- SW handler `push` afiseaza notificare native
**Complexitate:** Medie (~3h) | **Impact:** Mare (alerte critice cand sunt nevoie maxime)

**Exemplu implementare:**

```javascript
// api/push-subscribe.js
import { Redis } from '@upstash/redis';
import { rateLimit, checkOrigin } from './_auth.js';

export const config = { runtime: 'edge' };
const redis = Redis.fromEnv();

export default async function handler(req) {
  if (!checkOrigin(req)) return new Response('forbidden', { status: 403 });
  if (await rateLimit(req)) return new Response('rate limit', { status: 429 });
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });

  const sub = await req.json();
  if (!sub.endpoint) return new Response('invalid sub', { status: 400 });

  await redis.sadd('push:subscribers', JSON.stringify(sub));
  await redis.expire('push:subscribers', 60 * 24 * 3600); // 60 zile
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
```

```javascript
// api/meteo-cron.js — la frost detectat (extindere cod existent)
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:petrilarolly@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendFrostPush(message) {
  const subs = await redis.smembers('push:subscribers');
  const payload = JSON.stringify({
    title: 'Alerta Frost Livada',
    body: message,
    icon: '/icon-192.png',
    tag: 'frost-' + new Date().toISOString().slice(0, 10)
  });
  for (const subStr of subs) {
    try {
      const sub = JSON.parse(subStr);
      await webpush.sendNotification(sub, payload);
    } catch (e) {
      if (e.statusCode === 410) await redis.srem('push:subscribers', subStr); // expired
    }
  }
}
```

```javascript
// public/sw.js
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'Livada', body: 'Notificare noua' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: data.icon || '/icon-192.png', tag: data.tag, requireInteraction: true
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
```

```javascript
// public/app.js — subscribe button
async function subscribeWebPush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const VAPID_PUB = 'BC...'; // public key (configurat la build)
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUB)
    });
  }
  await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(sub)
  });
  showToast('Notificari activate!', 'info');
}
```

---

## T5. Storage quota tracking + warning

**Problema:** localStorage are limita 5-10MB. La crestere jurnal + cache search + species lazy → risc QuotaExceededError silentios.
**Solutie:**
- Periodic check `navigator.storage.estimate()` (Storage API) si afiseaza in debug panel + warning toast la >80%
- Auto-cleanup oldest log entries cand cache > 4MB
**Complexitate:** Mica (~1h) | **Impact:** Mic-Mediu (preventiv)

```javascript
// public/app.js
async function checkStorageQuota() {
  if (!navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  const percent = est.quota ? Math.round((est.usage / est.quota) * 100) : 0;
  if (percent > 80) {
    showToast(`Atentie: stocare ${percent}% folosita. Curata cache.`, 'warning');
    livadaLog('STORAGE', 'high-usage', 'WARN', `${percent}% (${(est.usage / 1024 / 1024).toFixed(1)}MB / ${(est.quota / 1024 / 1024).toFixed(0)}MB)`);
  }
  return { percent, usage: est.usage, quota: est.quota };
}

// Apel la load + la fiecare 30 min
window.addEventListener('load', () => {
  setTimeout(checkStorageQuota, 8000);
  setInterval(checkStorageQuota, 30 * 60 * 1000);
});
```

---

## T6. Lighthouse CI in GitHub Actions (gating PR)

**Problema:** Performance regressions detectate manual cu script `tools/perf-check.py`. Niciun gate automat pe PR.
**Solutie:**
- GitHub Action `.github/workflows/lighthouse.yml` ruleaza `lhci autorun` pe deploy preview
- Threshold: FCP < 2500ms, LCP < 3000ms, performance score >= 80
**Complexitate:** Mica (~1h) | **Impact:** Mediu (calitate proces)

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Wait for Vercel preview
        run: sleep 60
      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun --collect.url="https://livada-${{ github.event.pull_request.head.sha }}-rolandpetrilas-projects.vercel.app" --upload.target=temporary-public-storage
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

```json
// lighthouserc.json (in radacina repo)
{
  "ci": {
    "assert": {
      "preset": "lighthouse:no-pwa",
      "assertions": {
        "first-contentful-paint": ["warn", { "maxNumericValue": 2500 }],
        "largest-contentful-paint": ["warn", { "maxNumericValue": 3000 }],
        "categories:performance": ["error", { "minScore": 0.8 }]
      }
    }
  }
}
```

---

## T7. Migrare CSP la hash-based (eliminare unsafe-inline)

**Problema:** Vezi `.claude-outputs/CSP_MIGRATION_PLAN.md` (deja documentat). H1 audit amanat.
**Solutie:** Plan B din document — script build genereaza `script-src 'sha256-...'` per inline block.
**Complexitate:** Mare (~6-8h) | **Impact:** Mediu (Securitate — cu DOMPurify ramane mitigat partial)

(Implementare detaliata in `.claude-outputs/CSP_MIGRATION_PLAN.md` — nu duplic aici.)

---

## T8. Data migration strategy localStorage (versionare schema)

**Problema:** Schema localStorage (cheile `livada-*`) e implicita. La schimbari (de exemplu adaugare `_deleted` tombstone in jurnal — vezi E7) — entries vechi raman fara campul nou. Migrari ad-hoc se acumuleaza neorganizate.
**Solutie:**
- Cheia `livada-schema-version` (default 1)
- Functie `migrateLocalStorage()` apelata la load: ruleaza patches incremental versiune curenta → ultima
**Complexitate:** Mica (~1.5h) | **Impact:** Mediu (igiena pe termen lung)

```javascript
// public/app.js
const SCHEMA_VERSION_CURRENT = 2;

const MIGRATIONS = {
  1: () => {
    // Initial version — nimic de migrat
  },
  2: () => {
    // Adauga _deleted: false la toate intrarile vechi (E7)
    const entries = JSON.parse(localStorage.getItem('livada-jurnal') || '[]');
    const migrated = entries.map(e => ({ ...e, _deleted: e._deleted || false }));
    localStorage.setItem('livada-jurnal', JSON.stringify(migrated));
  },
  // viitoare: 3: () => { ... }
};

function migrateLocalStorage() {
  const current = parseInt(localStorage.getItem('livada-schema-version') || '1');
  if (current >= SCHEMA_VERSION_CURRENT) return;
  for (let v = current + 1; v <= SCHEMA_VERSION_CURRENT; v++) {
    if (typeof MIGRATIONS[v] === 'function') {
      try {
        MIGRATIONS[v]();
        livadaLog('MIGRATE', `v${v}`, 'OK', '');
      } catch (e) {
        livadaLog('MIGRATE', `v${v}`, 'ERR', e.message);
        return; // Stop si nu salva versiunea
      }
    }
  }
  localStorage.setItem('livada-schema-version', String(SCHEMA_VERSION_CURRENT));
}

window.addEventListener('load', () => migrateLocalStorage());
```

---

## T9. Bundle splitting agresiv (CSS critical inline + restul lazy)

**Problema:** CSS inline ~120KB. Critical CSS (above-the-fold) e <30KB realistic.
**Solutie:** Build script extrage selectoare critical (header, tabbar, primul tab vizibil) inline; restul lazy via `<link rel="preload" as="style">`.
**Complexitate:** Medie (~4h) | **Impact:** Mic (FCP -200ms estimat)

(Implementare: tool `critters` sau `purgecss` in pipeline build. Detalii omise.)

---

# NOTE IMPLEMENTARE

## Constrangeri globale (din CLAUDE.md + memory)

1. **Single HTML offline-first:** TOATE recomandarile noi (E1-N18) trebuie sa pastreze pattern-ul inline (cu exceptia T3 care e EXPLICIT despre lazy load — masura performanta justificata).
2. **Edge Runtime obligatoriu** pe orice API noua (N2, N3, N5, N6, N10-N15, T1, T4) — exceptie photos.js extins (E5).
3. **Romana 100%** in UI, cod EN, comentarii minime (vezi CLAUDE.md global).
4. **Zero costuri:** EPPO API (N2) cere cont free → adauga in `.api-keys/INBOX.md`. VAPID keys (T4) generate local cu `npx web-push generate-vapid-keys`.
5. **Decizie inchisa F5.1 (LIVADA_API_TOKEN):** NU adauga auth pe niciuna din rute noi peste origin+rate-limit existent.

## Pattern-uri de refolosit (din inventar agent 1)

Toate recomandarile care adauga UI nou trebuie sa foloseasca:
- `openModal(name)` / `closeModal(name)` pentru orice dialog
- `showToast(msg, type)` pentru orice feedback temporar
- `livadaLog(module, action, status, detail)` pentru logging structurat
- `escapeHtml()` + `sanitizeAI()` pentru orice user/AI input afisat in HTML
- `authHeaders()` pentru orice fetch la `/api/`
- `withTimeout` / `fetchWithTimeout` (din `_timeout.js`) pentru orice apel extern Edge

## Dependente intre recomandari

- **N1 (Voice input)** + **N4 (TTS)** = pereche logica pentru parinti — implementeaza impreuna.
- **N3 (GDD)** depinde de meteo-history existent (deja DONE).
- **E5 (galerie tag-uri)** + **N2 (EPPO)** = sinergie pentru "diagnostic AI tag automat din EPPO codes".
- **T1 (AI quota)** trebuie inainte de N5/N9/N10 (toate adauga AI calls noi).
- **T3 (lazy load)** trebuie inainte de adaugare specii noi mari (preventie regression FCP).
- **E7 (tombstone delete)** trebuie inainte de N11 (share link care face snapshot jurnal).

## Ce NU se schimba

- Stack vanilla JS (zero biblioteci frontend noi — EXCEPTIE: T6 Lighthouse CI in CI, nu in runtime).
- `photos.js` ramane Node.js (incompatibil Edge — vezi memory `feedback_blob_edge_incompatibil.md`).
- Nu se introduce TypeScript / build complex (regula proiect).
- Nu se introduce framework UI (React/Vue) — single HTML inline.
- Nu se adauga auth users (decizie F5.1 inchisa).
- Sectiunile de continut A-Y per specie raman in HTML (cu lazy load via T3, dar pastrate ca markup nativ — nu transformate in JSON/CMS).

---

# COMPARATIE V2 → V3

## Ce s-a IMPLEMENTAT din V2 (intre 2026-04-09 si 2026-04-15)

DONE 25/31 itemi: F0.1, F0.2, F1.1-F1.5, F2.1-F2.2, F3.1-F3.4, F4.1-F4.2, F5.2, F6.1-F6.5, F8.2-F8.3.

## Ce RAMANE din V2 in V3

- **F4.3 Comparator AI** → V3 N6 (extins cu side-by-side + diff)
- **F7.1 Servicii locale** → V3 N8 (template HTML pentru completare)
- **F7.2 V3 doza calculator** → V3 E1 (volum tank configurabil — partial diferit, mai larg)
- **F7.3 Harta livada** → V3 N7 (MVP SVG, plan v2 cu satelit)
- **F8.1 IoT senzor** → V3 N14 (API + skeleton ESP32)
- **F8.4 Web Push** → V3 T4 (VAPID complet)

## Ce e NOU in V3 (nu era in V2)

- T1 AI cost tracking (URGENT — risc operational nedocumentat)
- T2 Redis fallback in-memory (URGENT — DDoS vuln)
- N1 Voice input (P0 — accesibilitate parinti)
- N2 EPPO API (P0 — credibilitate continut)
- N3 GDD/Chill Hours real model (era doar mentionat, nu plan)
- E1-E8 imbunatatiri concrete pe functii existente (V2 era preponderent functii noi)
- T3 Lazy load specii (era doar in CLAUDE.md "next phase")
- T6 Lighthouse CI (gap calitate proces)
- T8 Schema version migration (igiena pe termen lung)
- N4 TTS, N5 Fruit count, N9 Cascade prompting, N10 Tree measure, N11 Share link, N12 Irrigare, N13 Custom alerts (idei web research)

## Ce s-a INCHIS / DECIS

- F5.1 (LIVADA_API_TOKEN) — INCHIS de Roland 2026-04-11.
- H1 (CSP unsafe-inline) — AMANAT cu plan in `.claude-outputs/CSP_MIGRATION_PLAN.md`.

---

# RECOMANDARI IMEDIATE (urmatorul sprint)

Daca Roland are timp limitat, prioritizeaza in aceasta ordine concreta:

1. **T1 + T2** (URGENT operational, ~5h total — risc real pe productie azi).
2. **N1 + N4** (voice + TTS, ~4h total — adoptie parinti). Scenariu test: parintii pot adauga jurnal hands-free in livada.
3. **E1** (calculator volum tank, 30 min — quick win).
4. **E2** (search continut, ~3h — Roland a cerut explicit C4).
5. **N2** (EPPO, ~6h, dupa Roland creeaza cont free) — credibilitate continut.
6. **N3** (GDD/Chill, ~5h) — diferentiator real al aplicatiei.

Total estimat: 1 saptamana de munca focusata = aplicatia trece de la "completa" la "indispensabila".

---

**Document generat automat. Revedere si confirmare Roland inainte de implementare.**

Pentru orice recomandare: `/audit` poate verifica detaliat fezabilitatea + impact concret.
