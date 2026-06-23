# PLAN_I2_I3_INTEGRARE — Handoff pentru sesiune noua

**Creat:** 2026-06-23 de Claude Opus 4.8 (1M) | **Status:** READY TO EXECUTE
**Obiectiv:** Implementeaza **I2** (decrement stoc fitosanitar la tratament) + **I3** (legare jurnal/diagnostic/galerie de pom prin `treeId`) din `RECOMANDARI_IMBUNATATIRI_V4.md`, cu **QA pe preview deploy** inainte de promovare la productie.

> Acesta e fisierul de continuare cerut de Roland. Citeste-l INTEGRAL inainte sa incepi. Dupa `/onboard`, executa exact pasii de mai jos.

---

## 0. CE S-A FACUT DEJA (baseline — 2026-06-23, nu reface)

Commit-uri pe `main` (prod LIVE, verde): `a28a036` (I1 + CSP + cache + CI) + `1ab7b5b` (docs V4).

- **I1 DONE** — `renderCostStats` (app.js ~8270) include deja `entry.cost` din jurnal. NU reface.
- **CSP hardening + cache app.js** — in `vercel.json`, LIVE verificat.
- **CI teste** — `.github/workflows/test.yml`, ruleaza vitest pe push (verde).
- **Vercel env** — TOATE cheile prezente in production (inclusiv VAPID → Web Push activ). NIMIC de adaugat.
- **R1 (alerta expirare stoc)** — deja implementat in `renderStoc` (app.js ~7854). NU reface.
- Teste: **189/189 pass**. Deps: toate latest, 0 CVE.

**Baseline rollback (daca strici prod):** prod curent = commit `1ab7b5b`. Rollback: `git revert <sha>` + push, SAU Vercel dashboard → Deployments → Promote deploy-ul anterior (Ready, ~20s).

---

## 1. CONSTRANGERI DURE (din CLAUDE.md — respecta-le sau strici proiectul)

- **Vanilla JS, single-file** — fara framework/bundler. Cod in stilul existent (`var`, functii globale, `escapeHtml`, `showToast`, `livadaLog`).
- **Backwards-compatible OBLIGATORIU** — `treeId` si campurile de stoc sunt **OPTIONALE**. Intrari vechi fara ele trebuie sa functioneze identic.
- **NU atinge** logica de siguranta alimentara din `addJurnalEntry` (verificari PHI + interval minim tratamente, app.js ~874-957) — e critica.
- **NU strica jurnalul** — e functia centrala, folosita de parintii lui Roland prin **voice input**. Testeaza ca voice + add entry merg.
- **Offline-first, RO 100% UI, Android-first** (touch 44px, font 16px+), **zero costuri**.
- Persistenta: `localStorage` cheie `livada-*` + (unde relevant) Redis prin rute existente. Galeria foto = `api/photos.js` (Node runtime) + Vercel Blob.

---

## 2. FORMA DATELOR (verificat in cod 2026-06-23)

```js
// Pom — localStorage "livada-trees" (app.js:7358 getTrees, 7444 addTreeNote)
{ id: "cires-1750000000000", species: "cires", label: "Cires #1",
  notes: "", status: "ok"|"warning"|"sick", planted: "2018", updatedAt: "2026-06-23" }
// getTrees(species?) → filtreaza pe species daca dat; saveAllTrees(list)

// Stoc — localStorage STOC_KEY (app.js:7812 getStoc, 7822 addStocProdus)
{ id: 1750000000000, name: "Confidor", cantitate: 250, unitate: "ml", dataExpirare: "2027-03-01" }
// getStoc() / saveStoc(stoc) / renderStoc()

// Jurnal — localStorage "livada-jurnal" (app.js:862 addJurnalEntry, 704 getJurnalEntries)
{ id: Date.now(), date, type, note, cost?, species?, kg? }  // <-- adauga treeId? + (I2) consum stoc
// type relevante: "fitosanitar" | "tratament" | "recoltare" | ...
```

`SPECIES` = obiect global id→nume RO. `todayLocal()` = data curenta "YYYY-MM-DD".

---

## 3. TASK I2 — Decrement stoc la tratament

**Scop:** cand loghezi un tratament `fitosanitar`/`tratament`, scade cantitatea folosita din `livada-trees`… nu — din **stoc** (`getStoc`). Inchide bucla calculator→aplicare→stoc.

### Pasi

1. **Helper** (adauga langa `saveStoc`, app.js ~7821):

```js
function decrementStoc(productName, qtyUsed, unit) {
  if (!productName || !(qtyUsed > 0)) return false;
  var stoc = getStoc();
  var p = stoc.find(function (x) {
    return x.name.toLowerCase() === String(productName).toLowerCase();
  });
  if (!p) return false;
  p.cantitate = Math.max(0, (parseFloat(p.cantitate) || 0) - qtyUsed);
  saveStoc(stoc);
  if (typeof renderStoc === "function") renderStoc();
  if (p.cantitate <= 0)
    showToast(
      'Stoc epuizat: "' + p.name + '". Adauga pe lista de cumparaturi.',
      "warning",
    );
  livadaLog("STOC", "decrement", "OK", p.name + " -" + qtyUsed + (unit || ""));
  return true;
}
```

2. **UI in modalul jurnal.** Localizeaza modalul: `grep -n 'id="jurnalNote"' public/index.html`. Adauga (afiseaza-le conditionat doar pt tratamente, sau mereu — optional):

```html
<div class="form-row" id="jurnalStocRow">
  <label for="jurnalStocProdus">Produs din stoc (optional):</label>
  <select id="jurnalStocProdus">
    <option value="">— niciunul —</option>
  </select>
  <input
    type="number"
    id="jurnalStocQty"
    min="0"
    step="0.1"
    placeholder="cantitate folosita"
  />
</div>
```

3. **Populeaza select-ul** cand se deschide modalul jurnal (gaseste functia care deschide modalul / sau `openModal('jurnal...')`). Helper:

```js
function fillStocPicker() {
  var sel = document.getElementById("jurnalStocProdus");
  if (!sel) return;
  var stoc = getStoc();
  sel.innerHTML =
    '<option value="">— niciunul —</option>' +
    stoc
      .map(function (p) {
        return (
          '<option value="' +
          escapeHtml(p.name) +
          '" data-unit="' +
          escapeHtml(p.unitate || "") +
          '">' +
          escapeHtml(p.name) +
          " (" +
          (p.cantitate || 0) +
          " " +
          escapeHtml(p.unitate || "") +
          ")</option>"
        );
      })
      .join("");
}
```

4. **Hook in `addJurnalEntry`** (app.js:862) — dupa `saveJurnalEntries(entries);` (~linia 960), inainte de `renderJurnal()`:

```js
if (type === "fitosanitar" || type === "tratament") {
  var prodSel = document.getElementById("jurnalStocProdus");
  var qtyUsed =
    parseFloat(
      document.getElementById("jurnalStocQty") &&
        document.getElementById("jurnalStocQty").value,
    ) || 0;
  if (prodSel && prodSel.value && qtyUsed > 0) {
    var unit = prodSel.options[prodSel.selectedIndex]
      ? prodSel.options[prodSel.selectedIndex].getAttribute("data-unit")
      : "";
    decrementStoc(prodSel.value, qtyUsed, unit);
    document.getElementById("jurnalStocQty").value = "";
  }
}
```

---

## 4. TASK I3 — Legare jurnal/diagnostic/galerie de pom (`treeId`)

**Scop:** sa poti vedea istoricul complet al unui pom (jurnal + diagnoze + poze). Inventarul de pomi exista deja (`livada-trees`), dar nimic nu refera `treeId`.

### Pasi

1. **Helper picker** (global, langa `getTrees`):

```js
function fillTreePicker(selectEl, species) {
  if (!selectEl) return;
  var trees = getTrees(species || undefined);
  selectEl.innerHTML =
    '<option value="">— fara pom anume —</option>' +
    trees
      .map(function (t) {
        return (
          '<option value="' +
          t.id +
          '">' +
          escapeHtml(t.label || t.id) +
          "</option>"
        );
      })
      .join("");
}
```

2. **Jurnal:** adauga `<select id="jurnalTree">` in modalul jurnal (langa specie). Populeaza la deschidere (`fillTreePicker(document.getElementById('jurnalTree'))`). In `addJurnalEntry`, dupa `var entry = {...}`: `var tId = document.getElementById("jurnalTree") && document.getElementById("jurnalTree").value; if (tId) entry.treeId = tId;`
3. **Diagnostic:** modal diagnose (`grep -n 'openDiagnoseModal\|id="diag' public/index.html` + app.js:3201). Adauga `<select id="diagTree">`. La salvarea diagnozei in jurnal (`openJurnalFromDiag` app.js:3173) propaga `treeId`.
4. **Galerie:** `uploadPhoto` (app.js:3132) — adauga `treeId` in metadata trimisa (`api/photos.js` accepta `meta` JSON; vezi V4 §E5 pt extinderea metadata in Redis sidecar — OPTIONAL acum, minim salveaza treeId in meta).
5. **Afisare istoric per pom** in `renderTreePanel` (app.js:7382) — adauga sub fiecare pom un buton „Istoric" care arata:

```js
function getTreeHistory(treeId) {
  return {
    jurnal: getJurnalEntries().filter(function (e) {
      return e.treeId === treeId;
    }),
  };
  // poze/diagnoze: dupa ce uploadPhoto/diagnose salveaza treeId
}
```

---

## 5. WORKFLOW QA (preview deploy + Playwright) — OBLIGATORIU inainte de prod

> NU face `vercel --prod` direct. Testezi pe **preview** intai.

1. **Local, inainte de orice deploy:**
   - `node --check public/app.js` (sintaxa)
   - `npm test` → trebuie **189/189 pass** (sau mai multe daca adaugi teste)
2. **Preview deploy:**
   - `vercel --token="$VERCEL_API_KEY"` (FARA `--prod`) → copiaza URL-ul de preview returnat.
   - `VERCEL_API_KEY` e deja in env (verificat). Daca nu: e in catalogul `.api-keys` ca `VERCEL_API_KEY`.
3. **QA cu Playwright MCP** pe URL-ul de preview:
   - `browser_navigate` la preview URL.
   - **Smoke jurnal (CRITIC):** deschide modalul jurnal, adauga o intrare `tratament` cu produs din stoc + cantitate → verifica: intrarea apare in lista, stocul scade (deschide tab stoc), `treeId` salvat daca ai ales pom.
   - **Smoke voice:** verifica ca butonul microfon (🎤) inca exista si nu da eroare JS.
   - **Smoke pom:** deschide o specie → panou pomi → adauga pom → leaga o intrare jurnal de el → vezi istoricul.
   - **Smoke general:** schimba 2-3 tab-uri, deschide calendarul, deschide diagnostic. `browser_console_messages` → ZERO erori JS.
   - Pe 360px (mobil): `browser_resize` 360x800, repeta smoke jurnal.
4. **Promovare prod (doar daca QA verde):**
   - `git add -A && git commit -m "feat: I2 decrement stoc + I3 treeId linking (jurnal/diagnostic/galerie)"` (+ Co-Authored-By)
   - `git push origin main` → auto-deploy prod.
   - Verifica: `vercel ls --token="$VERCEL_API_KEY"` (● Ready) + `curl -s -o /dev/null -w "%{http_code}" https://livada-mea-psi.vercel.app/` = 200.

---

## 6. CHECKLIST (bifeaza pe masura ce executi)

- [ ] Citit acest plan + V4 (`RECOMANDARI_IMBUNATATIRI_V4.md`) integral
- [ ] I2: helper `decrementStoc` + `fillStocPicker` adaugate
- [ ] I2: UI stoc in modal jurnal + hook in `addJurnalEntry`
- [ ] I3: helper `fillTreePicker` + `getTreeHistory`
- [ ] I3: `jurnalTree` select + `entry.treeId`
- [ ] I3: `diagTree` + propagare in `openJurnalFromDiag`
- [ ] I3: `treeId` in metadata galerie (`uploadPhoto`)
- [ ] I3: istoric per pom in `renderTreePanel`
- [ ] `node --check` OK + `npm test` 189/189
- [ ] Preview deploy + Playwright QA (jurnal, voice, pom, mobil 360px, console fara erori)
- [ ] Commit + push prod + verificare Ready/200
- [ ] Actualizat acest plan (jurnal executie) + CLAUDE.md/memory daca e cazul

---

## 7. REGULI SIGURANTA

1. **Re-citeste functia dupa fiecare edit critic** (confirma ca edit-ul s-a aplicat corect).
2. **Daca un edit nu se potriveste exact** (text schimbat de lint), grep pentru ancora si reverifica — NU forta.
3. **Nu rula `npm run build` local** — minifica `index.html` + schimba deploy date in working tree (Vercel face build la deploy). Comit doar sursa.
4. **Daca QA pica pe preview** → NU promova; debug pe preview, repeta. Preview-urile sunt gratis si nu afecteaza prod.
5. **MCP necesare:** **Playwright (OBLIGATORIU pt QA)**. Optional: filesystem, github. Daca Playwright lipseste → cere user-ului sa-l activeze inainte de QA, sau fa QA manual cerand user-ului sa testeze preview URL.

---

## 8. JURNAL EXECUTIE (completeaza pe parcurs)

- 2026-06-23: plan creat (sesiune anterioara). I1/CSP/cache/CI deja livrate.
- _(adauga aici ce executi)_
