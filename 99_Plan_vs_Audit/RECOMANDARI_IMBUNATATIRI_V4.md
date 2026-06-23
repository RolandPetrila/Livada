# RECOMANDARI_IMBUNATATIRI_V4.md

## Plan Strategic Imbunatatiri & Functii Noi — Livada Mea Dashboard

**Versiune:** 4.0
**Data generare:** 2026-06-23
**Generat de:** Claude Opus 4.8 (1M ctx) via `/imbunatatiri` mode `complet`
**Bazat pe:** verificare directa a codului (inventar 180+ functii `app.js`, 17 rute API, chei localStorage) + reconciliere status V3 (36 recomandari, 2026-04-15)
**Nota metoda:** Cei 2 agenti de discovery web au atins limita de sesiune (reset 05:50). Acest document e fundamentat pe **dovezi din cod verificate direct** (grep functii + citire semnaturi), NU pe presupuneri. Itemii marcati `[neverificat functional]` au functia definita dar nu am rulat fluxul.

---

## DESCOPERIRE MAJORA: V3 e in mare parte IMPLEMENTAT

> **ERRATA 2026-06-23 (post-executie):** Verificat live cu `vercel env ls` — **TOATE** env vars (inclusiv VAPID) sunt deja in Vercel production (~61 zile). Deci **T4 Web Push e complet activat la nivel env**, nu „pending". Iar **R1 (alerta expirare stoc) e deja implementat** in `renderStoc` (borduri + badge EXPIRAT/exp.curand + toast). Ambele scoase din lista de actiuni. Livrate azi: **I1** (unificare cost jurnal+tracker), CSP hardening, cache `app.js`, CI teste, `.editorconfig`, `test:coverage`.

Fata de snapshot-ul V3 (2026-04-15), proiectul a avansat substantial. Verificand prezenta functiilor + cheile localStorage, **majoritatea recomandarilor P0-P1 din V3 sunt acum in cod**. In plus, exista functii NOI care nici nu erau in V3.

### Reconciliere status V3 (dovezi din cod)

| V3  | Titlu                                    | Status         | Dovada in cod                                                                                                       |
| --- | ---------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| E1  | Calculator doze: volum tank configurabil | ✅ **DONE**    | `getSavedTankVolume`/`saveTankVolume`/`initTankVolumePersistence` (app.js:631-651) + cheie `livada:tank-volume`     |
| E2  | Search continut text (nu doar titluri)   | ✅ **DONE**    | `buildSearchIndex`/`buildSearchCache`/`highlightInActiveTab`/`showSuggestions` (197-364)                            |
| E4  | Cost agregat tratamente                  | ✅ **DONE+**   | subsistem complet: `openCostTracker`/`getCostEntries`/`addCostEntry`/`renderCostStats`/`exportCostsCSV` (8185-8426) |
| E6  | Timeline specie editabil                 | ✅ **DONE**    | `renderSpeciesTimeline` (2553) + `editJurnalEntry`/`deleteJurnalEntry`                                              |
| E7  | Sync conflict-aware                      | 🟡 **PARTIAL** | `syncJournal`/`syncDeleteJournal`/`syncOfflineJournal` exista; semantica tombstone neconfirmata                     |
| E8  | Backup automat IndexedDB                 | 🟡 **PARTIAL** | `backupData`/`restoreData`/`checkBackupReminder`/`openLivadaIDB` exista; rolling 7-zile auto neconfirmat            |
| N1  | Voice input jurnal                       | ✅ **DONE**    | `startVoiceInput` (6969)                                                                                            |
| N3  | GDD + Chill Hours                        | ✅ **DONE**    | `calculateGDD`/`renderGDDWidget`/`calculateChillHours`/`estimateChillHours`/`renderChillHoursWidget` (6253-6374)    |
| N4  | TTS alerte + AI in RO                    | ✅ **DONE**    | `isTtsSupported`/`pickRomanianVoice`/`speakText`/`speakAllActiveAlerts` (6842-6936)                                 |
| N7  | Harta livada interactiva                 | ✅ **DONE+**   | `getTreeMap`/`renderTreeMap`/`openTreeCell` + inventar pom: `getTrees`/`renderTreePanel`/`addTreeNote` (7252-7459)  |
| T4  | Web Push VAPID                           | ✅ **DONE**    | `livadaEnsurePushSubscription`/`urlBase64ToUint8Array` (5883) + rute push-\*; **pending: VAPID env vars in Vercel** |
| E3  | Calendar view saptamanal + zi            | ❌ **PENDING** | doar `renderCalendar` (luna) + rezumat meteo saptamanal; fara `renderCalWeek`/`calView`                             |
| E5  | Galerie tag-uri + filtrare + per-pom     | ❌ **PENDING** | `loadGallery`/`uploadPhoto` basic; fara filtre/tag-uri/treeId in galerie                                            |
| N2  | EPPO API (date oficiale boli EU)         | ❌ **PENDING** | inlocuit partial de model JS `assessDiseaseRisks` (6587); fara integrare EPPO oficiala                              |
| N5  | Fruit counting Gemini (estimare recolta) | ❌ **PENDING** | niciun `fruitCount`/`countFruit`                                                                                    |
| N6  | Comparator AI 2 modele paralel           | 🟡 **ALTFEL**  | exista `renderSpeciesComparator` (comparator date specii), NU comparator 2-modele AI                                |

### Functii NOI implementate (nu erau in V3)

- **Stoc fitosanitar:** `getStoc`/`addStocProdus`/`renderStoc`/`deleteStocProdus` (7812-7907) — inventar produse cu expirare
- **Import CSV jurnal:** `importJurnalCSV`/`parseCSVLine`/`normalizeDate`/`normalizeType` (7952-8041)
- **Cost tracker dedicat:** `openCostTracker` + `livada-costs` (separat de `entry.cost` din jurnal — vezi I1)
- **Inspectie/checklist:** `openInspectionChecklist`/`renderInspectionChecklist`/`finishInspection` (7606-7672) + `openChecklist`/`startStropire`/`confirmStropire`
- **Model risc boli + calendar predictiv:** `assessDiseaseRisks`/`renderPredictiveCalendar` (6587-6730)
- **Planificator saptamanal:** `openWeeklyPlanner` (6426)
- **Spray window scoring:** `calculateSprayScore`/`sprayLabel`/`getNextTreatment` (4848-4896)
- **Siguranta alimentara:** verificare PHI (pauza la recolta) + interval minim intre tratamente, deja in `addJurnalEntry` (874-957) — **excelent pentru semi-comercial**
- **Print fise:** `printSpeciesReport`/`printFisa`/`exportPDF`

**Concluzie:** Aplicatia a depasit cu mult planul V3. Restul acestui document NU repeta ce e facut — se concentreaza pe **(A) gap-uri de INTEGRARE intre subsistemele noi** (cea mai mare valoare acum), **(B) itemii V3 ramasi**, **(C) robustete pe functiile noi**.

---

## STARE PROIECT (snapshot 2026-06-23)

| Indicator            | Valoare                                                 |
| -------------------- | ------------------------------------------------------- |
| Linii `index.html`   | 30,981 (1.2 MB raw / 760 KB minified)                   |
| Linii `app.js`       | 8,455 (292 KB)                                          |
| Functii frontend     | ~180                                                    |
| Rute backend         | 17 + 4 utilitare                                        |
| Teste                | 189/189 pass (13 fisiere)                               |
| Deps                 | toate latest stabil, 0 CVE (vezi `/improve` 2026-06-23) |
| Status V3 (36 itemi) | ~22 DONE / 2 PARTIAL / ~12 PENDING                      |

---

## SUMAR PRIORITATI V4

| Prioritate          | #    | Titlu                                                              | Complexitate | Impact | Categorie         |
| ------------------- | ---- | ------------------------------------------------------------------ | ------------ | ------ | ----------------- |
| **P0 URGENT**       | I1   | Unifica costurile: jurnal `entry.cost` + cost-tracker (2 silozuri) | Mica         | Mare   | Integrare/Date    |
| **P0 URGENT**       | T4\* | Activeaza Web Push: VAPID env vars in Vercel (cod gata)            | Mica         | Maxim  | Operational       |
| **P1 IMPORTANT**    | I2   | Tratament → decrementare stoc fitosanitar automat                  | Medie        | Mare   | Integrare         |
| **P1 IMPORTANT**    | I3   | Leaga jurnal/diagnostic/galerie de pom (treeId)                    | Medie        | Mare   | Integrare         |
| **P1 IMPORTANT**    | E3   | Calendar view saptamanal + zi (mobil)                              | Medie        | Mare   | UX                |
| **P1 IMPORTANT**    | R1   | Alerta expirare produse din stoc                                   | Mica         | Mare   | Robustete         |
| **P2 VALOROS**      | I4   | Diagnostic AI → salvare automata in istoric specie/pom             | Mica         | Mediu  | Integrare         |
| **P2 VALOROS**      | E5   | Galerie: tag-uri + filtrare + link diagnostic/pom                  | Medie        | Mare   | UX                |
| **P2 VALOROS**      | R2   | Validare model risc boli cu stadiu fenologic (BBCH)                | Medie        | Mediu  | Calitate continut |
| **P2 VALOROS**      | N5   | Fruit counting Gemini (estimare recolta din poza)                  | Mica         | Mediu  | Inteligenta       |
| **P3 STRATEGIC**    | N2   | EPPO API — date oficiale boli care sustin `assessDiseaseRisks`     | Medie        | Mediu  | Continut          |
| **P3 STRATEGIC**    | R3   | Smoke tests pe 7 rutele fara teste (vezi /improve DX)              | Medie        | Mare   | Calitate          |
| **P3 STRATEGIC**    | N11  | Share link public read-only (vecini/intermediari)                  | Medie        | Mediu  | Comunitate        |
| **P4 NICE-TO-HAVE** | R4   | „Mod simplu parinti" — UI redus la 4 actiuni mari                  | Medie        | Mediu  | Accesibilitate    |

> **Tehnic (perf/securitate/DX):** vezi documentul complementar `/improve` — `.claude-outputs/improve/2026-06-23_035045/improve_report.md` (content-visibility, cache headers, CSP hardening, CI teste, 7 rute fara teste). NU le repet aici.

---

# PARTEA I — INTEGRARE INTRE SUBSISTEME (cea mai mare valoare)

> Aplicatia a crescut organic: jurnal, cost-tracker, stoc, inventar pomi, diagnostic, galerie — fiecare in silozul lui. Cele mai mari castiguri acum NU sunt functii noi, ci **conectarea** lor.

## I1. Unifica costurile — jurnal `entry.cost` + cost-tracker sunt 2 silozuri

**Fisiere:** `app.js` — `addJurnalEntry` (905-910, salveaza `entry.cost`) + `renderCostStats` (8270, citeste DOAR `livada-costs`)
**Problema actuala (verificata in cod):** Exista DOUA sisteme de cost paralele care nu se vad:

1. In jurnal, fiecare intrare poate avea `entry.cost` (un numar), setat din `#jurnalCost`.
2. Cost-tracker separat (`livada-costs`) cu `{date, category, product, qty, unit, pricePerUnit}`, agregat de `renderCostStats`.

Un tratament logat in jurnal cu cost **nu apare** in statisticile cost-tracker, si invers. Roland nu vede niciodata costul real total — fragmentat in 2 locuri. Pentru un proiect semi-comercial, asta e un indicator financiar rupt.

**Imbunatatire propusa:**

- Functie `getAllCosts(year)` care **uneste** ambele surse intr-un model normalizat
- `renderCostStats` foloseste uniunea (read-only — fara dubla-inregistrare)
- Marcheaza sursa (`jurnal` vs `manual`) ca user-ul sa stie de unde vine

**Exemplu implementare (fundamentat pe semnaturile reale):**

```javascript
// public/app.js — sursa unica de adevar pentru costuri
function getAllCosts(year) {
  var out = [];
  // 1. Cost-tracker dedicat (livada-costs) — are deja qty*price
  getCostEntries().forEach(function (e) {
    if (year && !String(e.date).startsWith(String(year))) return;
    out.push({
      date: e.date,
      amount: (parseFloat(e.qty) || 0) * (parseFloat(e.pricePerUnit) || 0),
      label: e.product,
      category: e.category || "consumabil",
      source: "manual",
    });
  });
  // 2. Costuri inline din jurnal (entry.cost pe tratamente/recoltari)
  getJurnalEntries().forEach(function (e) {
    var c = parseFloat(e.cost) || 0;
    if (c <= 0) return;
    if (year && !String(e.date).startsWith(String(year))) return;
    out.push({
      date: e.date,
      amount: c,
      label: (e.note || "").slice(0, 40) || e.type,
      category: e.type || "interventie",
      source: "jurnal",
    });
  });
  return out.sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });
}

// in renderCostStats(), inlocuieste `getCostEntries()` cu agregarea unificata:
function renderCostTotalsUnified(year) {
  var rows = getAllCosts(year);
  var total = rows.reduce(function (s, r) {
    return s + r.amount;
  }, 0);
  var fromJurnal = rows
    .filter(function (r) {
      return r.source === "jurnal";
    })
    .reduce(function (s, r) {
      return s + r.amount;
    }, 0);
  return {
    total: total,
    fromJurnal: fromJurnal,
    fromManual: total - fromJurnal,
    rows: rows,
  };
}
```

**Backwards compat:** citire pura, nu muta date. Ambele UI-uri raman; doar statisticile devin complete.
**Edge cases:** `cost` poate fi string ("12.5") → `parseFloat`; an fara intrari → total 0.
**Complexitate:** Mica (~1h) | **Impact:** Mare (primul indicator financiar real corect)

---

## I2. Tratament fitosanitar → decrementare automata din stoc

**Fisiere:** `app.js` — `addJurnalEntry` (862) + `getStoc`/`saveStoc` (7812-7821) + calculator doze (`calculateDose` 651)
**Problema actuala:** Stocul de produse (`getStoc`: `{name, cantitate, unitate, dataExpirare}`) si calculatorul de doze (care stie cate grame folosesti) exista, dar cand loghezi un tratament, **stocul nu scade niciodata**. Roland trebuie sa-l ajusteze manual → in practica nu o face → stocul devine fictiv.

**Imbunatatire propusa:**

- La logarea unui tratament `fitosanitar`/`tratament`, daca nota mentioneaza un produs din stoc (sau printr-un select optional), ofera scaderea cantitatii folosite
- Reutilizeaza rezultatul calculatorului de doze (`totalGr`) ca valoare implicita

**Exemplu implementare:**

```javascript
// public/app.js
function decrementStoc(productName, qtyUsed, unit) {
  if (!productName || !(qtyUsed > 0)) return false;
  var stoc = getStoc();
  var p = stoc.find(function (x) {
    return x.name.toLowerCase() === productName.toLowerCase();
  });
  if (!p) return false;
  p.cantitate = Math.max(0, (parseFloat(p.cantitate) || 0) - qtyUsed);
  saveStoc(stoc);
  renderStoc();
  if (p.cantitate <= 0) {
    showToast(
      'Stoc epuizat: "' + p.name + '". Adauga la lista de cumparaturi.',
      "warning",
    );
  }
  livadaLog("STOC", "decrement", "OK", p.name + " -" + qtyUsed + (unit || ""));
  return true;
}

// Hook in addJurnalEntry, dupa `saveJurnalEntries(entries);` pentru tratamente:
// (adauga un <select id="jurnalStocProdus"> optional in modalul jurnal)
if (type === "fitosanitar" || type === "tratament") {
  var prodSel = document.getElementById("jurnalStocProdus");
  var qtyUsed =
    parseFloat(document.getElementById("jurnalStocQty")?.value) || 0;
  if (prodSel && prodSel.value && qtyUsed > 0) {
    decrementStoc(prodSel.value, qtyUsed, prodSel.dataset.unit);
  }
}
```

**De ce conteaza:** inchide bucla calculator→aplicare→stoc; transforma stocul intr-un inventar real + avertisment „cumpara".
**Complexitate:** Medie (~2h, include UI select in modal) | **Impact:** Mare

---

## I3. Leaga jurnal / diagnostic / galerie de pomul din inventar (`treeId`)

**Fisiere:** `app.js` — inventar pom (`getTrees` 7358, `addTreeNote` 7440) + `addJurnalEntry` (903) + `uploadPhoto` (3132) + `runDiagnose` (3364)
**Problema actuala:** Exista inventar de pomi (`livada-trees`) cu note per-pom, dar **intrarile de jurnal, diagnozele AI si pozele nu au `treeId`**. Nu poti raspunde la „arata-mi tot istoricul pomului #12 (Mar Florina, coltul nord)" — desi ai toate datele, sunt nelegate. Cu 100+ pomi, asta e diferenta intre un album si o fisa medicala per pom.

**Imbunatatire propusa:**

- Adauga un `<select id="...TreePicker">` OPTIONAL (populat din `getTrees()`) in: modal jurnal, modal diagnostic, upload galerie
- Salveaza `entry.treeId` / `meta.treeId` / `photo.treeId`
- In panoul pomului (`renderTreePanel`), agrega: note + intrari jurnal + diagnoze + poze cu acel `treeId`

**Schita (adapteaza la semnatura `getTrees()`):**

```javascript
// helper comun pentru a popula orice select de pomi
function fillTreePicker(selectEl) {
  if (!selectEl) return;
  var trees = getTrees(); // [{id, species, label/pozitie, ...}]
  selectEl.innerHTML =
    '<option value="">— fara pom anume —</option>' +
    trees
      .map(function (t) {
        return (
          '<option value="' +
          t.id +
          '">' +
          (t.label || t.species || "Pom " + t.id) +
          "</option>"
        );
      })
      .join("");
}

// in addJurnalEntry, la construirea entry:
var tId = document.getElementById("jurnalTree")?.value;
if (tId) entry.treeId = tId;

// in renderTreePanel(treeId), agrega istoricul complet:
function getTreeHistory(treeId) {
  return {
    jurnal: getJurnalEntries().filter(function (e) {
      return e.treeId === treeId;
    }),
    note:
      (
        getTrees().find(function (t) {
          return t.id === treeId;
        }) || {}
      ).notes || [],
    // poze/diagnoze: dupa ce uploadPhoto/runDiagnose salveaza treeId
  };
}
```

**Backwards compat:** `treeId` optional → intrarile vechi fara pom raman „generale".
**Complexitate:** Medie (~3h, atinge 3 fluxuri) | **Impact:** Mare (fisa per pom — valoare semi-comerciala mare)

---

## I4. Diagnostic AI → salvare automata in istoric specie/pom

**Fisiere:** `app.js` — `runDiagnose` (3364) + `openJurnalFromDiag` (3173) + `injectSpeciesHistory` (2881)
**Problema actuala:** Dupa un diagnostic AI, `openJurnalFromDiag` permite crearea MANUALA a unei intrari. Dar majoritatea diagnozelor se pierd — nu raman intr-un istoric. `injectSpeciesHistory` exista (afiseaza istoric) dar diagnozele nu sunt persistate automat acolo.

**Imbunatatire propusa:** dupa un diagnostic reusit, prompt discret „Salvezi in istoric?" → scrie `{date, species, treeId?, diagnosisShort, photoUrl?}` intr-o cheie `livada-diag-history` (sau ca intrare jurnal `type:'diagnostic'`). Reutilizeaza I3 pentru `treeId`.
**Complexitate:** Mica (~1.5h) | **Impact:** Mediu (transforma diagnosticul din one-shot in baza de cunoastere)

---

# PARTEA II — ITEMI V3 RAMASI (re-prioritizati)

## E3. Calendar view saptamanal + zi (mobil) — **inca PENDING**

Calendarul e doar lunar; pe 360px e aglomerat. View saptamanal (7 zile mari, touch 64px) + zi (zoom cu interventii + meteo orar) raman valoroase. **Cod complet in V3 §E3** (`renderCalWeek`/`renderCalDay`/`setCalView` + CSS + swipe). Complexitate Medie ~3h, Impact Mare.

## E5. Galerie: tag-uri + filtrare + link diagnostic/pom — **inca PENDING, acum mai valoros**

Cu inventarul de pomi (N7 DONE) si I3, galeria filtrabila pe `treeId`/tag/an/diagnostic devine „fisa foto per pom". **Cod complet in V3 §E5** (`renderGalleryWithFilters` + `api/photos.js` metadata sidecar). Complexitate Medie ~3-4h, Impact Mare.

## N5. Fruit counting Gemini — **inca PENDING**

Estimare numar fructe dintr-o poza (Gemini vision deja integrat) → input pentru estimare recolta. Complexitate Mica (reutilizeaza pipeline `runDiagnose`), Impact Mediu.

## N2. EPPO API — **inca PENDING (acum sustine modelul de risc)**

`assessDiseaseRisks` (NOU, model JS euristic) ar castiga credibilitate cu date oficiale EPPO (nume stiintific, cicluri, raspandire EU). **Cod schelet in V3 §N2** (`api/eppo-info.js` + `SPECIES_EPPO_MAP`). Marcheaza datele „conform EPPO 2026". Complexitate Medie ~6h, Impact Mediu.

_(Itemii V3 P3-P4 ramasi — N11 share link, N12 irigatie ET0, N13 alert rules custom, N14 IoT, N15 yield engine, N16 Playwright, T5-T9 — raman valabili ca in V3; vezi documentul V3 pentru cod.)_

---

# PARTEA III — ROBUSTETE PE FUNCTIILE NOI

## R1. Alerta expirare produse din stoc — **P1, Mica**

**Problema:** `addStocProdus` salveaza `dataExpirare`, dar nu exista avertisment cand un produs e expirat / expira curand. Produse fitosanitare expirate = risc real (ineficiente + ilegale la vanzare cu carnet producator).
**Solutie:** in `renderStoc`, marcheaza rosu produsele expirate + badge „expira in N zile" sub 30 zile; optional, o linie in dashboard „Azi".

```javascript
// in renderStoc(), per produs:
function stocExpiryBadge(dataExpirare) {
  if (!dataExpirare) return "";
  var days = Math.floor((new Date(dataExpirare) - Date.now()) / 86400000);
  if (days < 0) return '<span class="badge badge-danger">EXPIRAT</span>';
  if (days <= 30)
    return '<span class="badge badge-warn">expira in ' + days + " zile</span>";
  return "";
}
```

**Impact:** Mare (siguranta + conformitate).

## R2. Validare model risc boli cu stadiu fenologic (BBCH) — **P2, Medie**

**Problema:** `assessDiseaseRisks` foloseste (probabil) doar meteo. Riscul real depinde de stadiul fenologic (ex: rapanul marului — infectie majora la inflorit/frunza tanara). Fara fenologie, alertele pot fi fals-pozitive.
**Solutie:** incruciseaza riscul meteo cu fereastra fenologica per specie (ai deja date fenologice calibrate Nadlac — sectiunea M din continut + GDD-ul calculat). Mar la „raspan" doar in fereastra inflorit→fruct tanar.
**Impact:** Mediu (mai putine alerte false → incredere).

## R3. Smoke tests pe rutele fara teste — **P3, Medie**

7 rute fara teste (`ai-status`, `diagnose-test`, `identify`, `photos`, `push-broadcast`, `push-public-key`, `push-subscribe`). Detaliu + plan in `/improve` (DX 4.3-4.4). Adauga si `.github/workflows/test.yml` (CI pe push).

## R4. „Mod simplu pentru parinti" — **P4, Medie**

**Problema:** aplicatia a devenit bogata (multe tab-uri/functii). Parintii lui Roland (non-tech) folosesc realist 3-4 actiuni: vezi alerta meteo, adauga interventie (voce), fa o poza diagnostic.
**Solutie:** un toggle „Mod simplu" (cheie `livada-simple-mode`) care ascunde tab-urile avansate si arata un ecran cu 4 butoane mari. Reutilizeaza voice input (N1 DONE) + TTS (N4 DONE) deja existente.
**Impact:** Mediu (adoptie reala pe partea parintilor — exact publicul tinta secundar).

---

## NOTE IMPLEMENTARE

1. **Constrangeri perpetue (din CLAUDE.md + memory):** RO 100% UI, zero costuri (doar free tier), offline-first, Android-first 360px, single-file vanilla JS (fara framework), threat model mic (UX > defense-in-depth — vezi `feedback_ux_over_defense_in_depth`).
2. **Pattern stocare comun:** features noi → `localStorage` cheie `livada-*` + sync Redis prin ruta API existenta unde e relevant. NU introduce store nou fara motiv.
3. **Dependente intre recomandari:** I3 (`treeId`) e fundatia pentru I4 (diagnostic→istoric pom) si E5 (galerie per pom). Fa I3 inainte. I1 (unificare cost) e independent si rapid → primul.
4. **Ce NU se schimba:** logica de siguranta alimentara (PHI/interval tratamente in `addJurnalEntry`) e foarte buna — nu o atinge. Sync-ul, quota guard-ul (T1 DONE), Web Push-ul — raman.
5. **Complementar /improve:** acest doc = FUNCTIONALITATE; `/improve` (2026-06-23) = TEHNIC (perf/securitate/DX). Itemul cu cel mai mare ROI combinat ramane **activarea Web Push (VAPID env vars in Vercel)** — cod gata in ambele analize.

---

**Total recomandari V4:** 14 (4 integrare + 4 V3-ramase reprioritizate + 4 robustete + 2 pointer-tehnic) — proportie adecvata pentru un proiect deja matur (majoritatea V3 livrat).
