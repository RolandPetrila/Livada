# RECOMANDARI_IMBUNATATIRI_V2.md

## Plan de Executie pe Faze — Livada Mea Dashboard

**Versiune:** 2.0
**Data:** 2026-04-09
**Generat de:** Claude Sonnet 4.6 (T1) + analiza Gemini CLI (read-only)
**Bazat pe:** sesiune chat confirmata Roland + MASTER_REPORT 08-apr + MASTER_REPORT 09-apr + info.md + RECOMANDARI_IMBUNATATIRI.md

---

## STARE PROIECT LA DATA GENERARII

| Indicator                  | Valoare                                             |
| -------------------------- | --------------------------------------------------- |
| Scor global (Gemini audit) | 85/100 (+3 fata de 08 apr)                          |
| Scor securitate            | 77/100                                              |
| Linii index.html           | ~32.000                                             |
| Dimensiune app.js          | ~240KB                                              |
| Faze implementate          | S1-S17 + Runda 9+10 (140+ items)                    |
| Ramase din plan anterior   | Faza 7 strategica (II3, V3, harta)                  |
| Vulnerabilitate activa     | Auth bypass `api/_auth.js` (MEDIUM, nerezolvata)    |
| CRON_SECRET                | Lipsa din Vercel env — cron meteo esueaza silentios |

---

## REGULI DE EXECUTIE (obligatorii pentru toate fazele)

1. **Android-first** — viewport 360px, touch targets 44x44px, font min 16px
2. **Offline-first** — orice feature functioneaza 100% fara internet (documentatia)
3. **Single HTML** — tot continutul ramane inline in `public/index.html` (NU se fragmenteaza — regula arhitecturala intentionata pentru offline/PWA)
4. **Zero costuri** — exclusiv servicii/API gratuite permanent
5. **Romana 100%** — tot UI-ul in romana; cod in engleza
6. **Edge Runtime** — orice API route noua cu I/O extern primeste `export const config = { runtime: "edge" }`
7. **Exceptie Edge** — `photos.js` ramane Node.js (incompatibilitate `@vercel/blob`)
8. **Gemini_Documentatie/** — NU se adauga niciodata in git; consultat doar la cerere Roland
9. **Confirmare Roland** — nicio implementare fara aprobare explicita

---

## FAZA 0 — Quick Wins (implementare imediata dupa confirmare)

### F0.1 — Ora in header badge

**Descriere:** Adauga ora commitului in indicatorul din header.
**De la:** `actualizat 2026-04-08`
**La:** `actualizat 2026-04-08 17:27`

**Implementare:**

- `public/app.js`: adauga `const DEPLOY_TIME = "17:27";`
- Modifica badge: `el.textContent = "actualizat " + DEPLOY_DATE + " " + DEPLOY_TIME;`
- La fiecare push: actualizat manual odata cu DEPLOY_DATE (acelasi workflow)
- `showAppInfo()`: include ora in dialog

**Fisiere afectate:** `public/app.js` (2 linii)
**Efort:** XS — 10 minute
**Prioritate:** INALTA
**Status:** PLANIFICAT

---

### F0.2 — Badge-uri AI vizibile in Diagnostic si Intreaba

**Descriere:** Badge-urile AI pentru diagnostic foto si intreaba orice sunt inserate in DOM dar nu sunt vizibile fara scroll pe mobil. Muta-le la TOP-ul fiecarui modal.

**Problema identificata:** `renderAiStatusPanel("diagnose", "diagLoading", "beforebegin")` insereaza panelul DUPA butoanele Camera/Galerie (80px fiecare) — pe mobil 360px necesita scroll.

**Implementare:**

- `public/index.html`: adauga `id="diagModalBody"` pe `<div class="modal-body">` din modal diagnose
- `public/index.html`: adauga `id="askModalBody"` pe `<div class="modal-body">` din modal ask
- `public/app.js` linia 2618: schimba in `renderAiStatusPanel("diagnose", "diagModalBody", "afterbegin")`
- `public/app.js` linia 2811: schimba in `renderAiStatusPanel("ask", "askModalBody", "afterbegin")`

**Verificare:** La deschidere modal, badge-ul AI apare ca primul element vizibil, deasupra oricarui buton.

**Fisiere afectate:** `public/index.html` (2 atribute id), `public/app.js` (2 linii)
**Efort:** XS — 15 minute
**Prioritate:** INALTA
**Status:** PLANIFICAT

---

## FAZA 1 — Sistem Monitoring & Logging Structurat

**Principiu:** Zero costuri, zero servicii externe. Tot in localStorage + Vercel logs existente.

**Acoperire dupa implementare:**

| Scenariu rulare      | Acoperire                               |
| -------------------- | --------------------------------------- |
| Browser desktop      | localStorage circular log + Vercel logs |
| Browser mobil        | localStorage persistent intre sesiuni   |
| PWA instalat Android | Idem mobil + SW events logate           |
| Offline (in livada)  | Buffer local — trimis la sync online    |
| Vercel Edge API      | Console structurat → Vercel dashboard   |

---

### F1.1 — Event Log Engine

**Descriere:** Motor de logging circular in localStorage (ultimele 100 evenimente). Fara dependente externe.

**Format eveniment:**

```
[2026-04-09 17:23:41] [AI] ask → Groq llama-4-scout → OK → 2.3s
[2026-04-09 17:23:55] [AI] diagnose → Gemini 2.5-flash → FALLBACK GPT-4.1 → 8.1s
[2026-04-09 17:24:10] [METEO] fetch → Open-Meteo → OK → 0.4s
[2026-04-09 17:24:15] [FROST] alert triggered → apparent -1C → 10 Apr
[2026-04-09 17:25:00] [ERR] submitAsk → TypeError: null → line 2814
[2026-04-09 17:25:05] [SW] cache hit → /index.html
```

**Implementare in app.js:**

```javascript
// ====== LIVADA LOG ENGINE ======
var LIVADA_LOG_KEY = "livada:log";
var LIVADA_LOG_MAX = 100;

function livadaLog(module, action, status, detail, ms) {
  var ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  var entry =
    "[" +
    ts +
    "] [" +
    module +
    "] " +
    action +
    (status ? " → " + status : "") +
    (detail ? " → " + detail : "") +
    (ms !== undefined ? " → " + ms + "ms" : "");
  try {
    var log = JSON.parse(localStorage.getItem(LIVADA_LOG_KEY) || "[]");
    log.push(entry);
    if (log.length > LIVADA_LOG_MAX) log = log.slice(-LIVADA_LOG_MAX);
    localStorage.setItem(LIVADA_LOG_KEY, JSON.stringify(log));
  } catch (e) {}
}

function getLivadaLog() {
  try {
    return JSON.parse(localStorage.getItem(LIVADA_LOG_KEY) || "[]");
  } catch (e) {
    return [];
  }
}
```

**Module de logat:**

- `[AI]` — orice apel AI (model, durata, fallback)
- `[METEO]` — fetch meteo, cron status
- `[FROST]` — triggere alerte inghet/boala
- `[SYNC]` — sincronizare jurnal Redis
- `[ERR]` — erori capturate
- `[SW]` — service worker events
- `[NAV]` — navigare tab-uri (pentru debug UX)

**Fisiere afectate:** `public/app.js` (functie noua ~30 linii)
**Efort:** S — 1 ora
**Prioritate:** INALTA
**Status:** PLANIFICAT

---

### F1.2 — Debug Panel (UI ascuns)

**Descriere:** Panel de debug accesibil prin triplu-tap pe badge-ul "actualizat" sau `Ctrl+Shift+L`. Vizibil doar utilizatorului, nu arata in UI normal.

**Continut panel:**

- Ultimele 50 evenimente din log (scroll)
- Status: Redis OK/FAIL, AI keys OK/FAIL, CRON ultima rulare
- Avertizare daca `cron:last-run` > 26h: `⚠ Date meteo posibil depasita`
- Avertizare daca `CRON_SECRET` lipseste (detectat din raspuns `/api/ping` extins)
- Buton "Copiaza log" — clipboard pentru debug rapid
- Buton "Sterge log" — reseteaza localStorage log

**Trigger implementare in app.js:**

```javascript
// Triplu-tap pe badge
var _badgeTaps = 0,
  _badgeTapTimer;
document
  .getElementById("appVersionBadge")
  .addEventListener("click", function () {
    _badgeTaps++;
    clearTimeout(_badgeTapTimer);
    _badgeTapTimer = setTimeout(function () {
      _badgeTaps = 0;
    }, 600);
    if (_badgeTaps >= 3) {
      _badgeTaps = 0;
      openDebugPanel();
    }
  });
// Keyboard shortcut
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.shiftKey && e.key === "L") openDebugPanel();
});
```

**Fisiere afectate:** `public/index.html` (modal nou debug), `public/app.js` (~80 linii)
**Efort:** M — 2 ore
**Prioritate:** MEDIE
**Status:** PLANIFICAT
**Dependenta:** F1.1

---

### F1.3 — Instrumentare AI completa

**Descriere:** Wrapper care logheaza automat fiecare apel AI — model intentionat, model real folosit, durata, fallback.

**Implementare — wrapper in app.js:**

```javascript
async function aiCallWithLog(label, fn) {
  var t0 = Date.now();
  try {
    var result = await fn();
    var ms = Date.now() - t0;
    var model = result._fallbackModel || "primar";
    var status = result._fallback ? "FALLBACK:" + model : "OK";
    livadaLog("AI", label, status, model, ms);
    return result;
  } catch (e) {
    livadaLog("AI", label, "ERR", e.message, Date.now() - t0);
    throw e;
  }
}
```

**Puncte de instrumentare:**

- `submitAsk()` → `aiCallWithLog("ask", ...)`
- `submitDiagnose()` → `aiCallWithLog("diagnose", ...)`
- `submitAiIdent()` → `aiCallWithLog("identify", ...)`
- `generateReport()` → `aiCallWithLog("report", ...)`

**Backend — imbunatatire raspuns:**

- `ask.js`: adauga `_model: modelUsed` in raspuns (model efectiv folosit)
- `diagnose.js`: adauga `_model: "gemini-2.5-flash"` sau `"gpt-4.1"` in raspuns
- `identify.js`: `ai.model` deja exista in raspuns — folosit direct

**Fisiere afectate:** `public/app.js` (wrapper + 4 puncte), `api/ask.js`, `api/diagnose.js`
**Efort:** M — 2 ore
**Prioritate:** INALTA
**Status:** PLANIFICAT
**Dependenta:** F1.1

---

### F1.4 — Error handling pe functii fara protectie

**Descriere:** Functii identificate fara try-catch → adauga protectie + log.

**Functii de protejat (identificate in audit):**

- Tab switching: `$$(".tab[data-tab]").forEach(...)` — eroare in handler silentioasa
- Seasonal tips injection: `SEASONAL_TIPS[...]` — daca specia lipseste, crash
- Calendar rendering: `renderCalendar()` — daca datele meteo sunt malformate
- Cautare live: `filterGlosar()` — daca DOM-ul e partial incarcat
- `copyTextEl()` — clipboard API poate esua pe iOS

**Pattern uniform:**

```javascript
try {
  // cod existent
} catch (e) {
  livadaLog("ERR", "numeFunctie", "FAIL", e.message);
  // nu arunca mai departe — fail silentios cu log
}
```

**Fisiere afectate:** `public/app.js` (~8 locatii)
**Efort:** S — 1 ora
**Prioritate:** MEDIE
**Status:** PLANIFICAT
**Dependenta:** F1.1

---

### F1.5 — Monitorizare cron meteo

**Descriere:** La deschiderea tab-ului "Azi", verifica ultima rulare cron. Alerteaza vizual daca datele sunt depasita.

**Implementare:**

- Extinde `/api/ping` sau creeaza `/api/health` (Edge, fara I/O): returneaza status simplu
- Alternativ: `meteo-history` deja returneaza date — verifica data ultimei intrari
- In `initMeteo()`: daca ultima data din history < azi-1 → toast avertizare + log

**Avertizare vizuala:**

```
⚠ Date meteo posibil depasita — ultima actualizare: 2026-04-08
```

**Nota critica:** `CRON_SECRET` lipseste din Vercel env conform audit → cron-ul esueaza la fiecare rulare cu eroare 500. Aceasta e cauza principala a datelor potentiel depasita. Trebuie adaugat in Vercel Dashboard → Settings → Environment Variables.

**Fisiere afectate:** `public/app.js` (~20 linii in `initMeteo`)
**Efort:** S — 45 minute
**Prioritate:** CRITICA (CRON_SECRET) / MEDIE (indicator UI)
**Status:** PLANIFICAT

---

## FAZA 2 — Badge-uri AI Complete + Model Indicator

### F2.1 — Badge in toate zonele cu AI

**Descriere:** Extinde sistemul de badge-uri la toate sectiunile care primesc raspunsuri AI.

**Harta completa badge-uri:**

| Zona                | Pozitie badge               | Model indicator post-raspuns                         |
| ------------------- | --------------------------- | ---------------------------------------------------- |
| Identificare specie | TOP sectiune (existent, OK) | + "PlantNet + Gemini • 4.1s"                         |
| Diagnostic foto     | TOP modal (F0.2)            | + "Gemini 2.5-flash • 6.2s" sau "GPT-4.1 [fallback]" |
| Intreaba orice      | TOP modal (F0.2)            | + "Groq llama-4-scout • 2.1s"                        |
| Raport Anual        | Verificare pozitie          | + "Groq • din cache" sau "Groq • 4.8s"               |
| Frost Alert banner  | Badge minimal               | "Sursa: Open-Meteo • [ora cron]"                     |
| GDD/Chill widgets   | Tooltip                     | "Date: 30 zile Redis"                                |

**Implementare AI_PANEL_CONFIG extins:**

```javascript
var AI_PANEL_CONFIG = {
  ask: [
    { name: "Groq llama-4-scout", key: "groq", role: "primar" },
    { name: "Groq llama-3.3-70b", key: "groq", role: "rezerva" },
    { name: "Cerebras llama-3.3-70b", key: "cerebras", role: "rezerva" },
  ],
  diagnose: [
    { name: "Gemini 2.5-flash", key: "gemini", role: "primar" },
    { name: "GPT-4.1", key: "github_models", role: "paralel" },
    { name: "Plant.id v3", key: "plant_id", role: "bonus" },
  ],
  identify: [
    { name: "PlantNet", key: "plantnet", role: "primar" },
    { name: "Gemini 2.5-flash", key: "gemini", role: "paralel" },
    { name: "GPT-4.1", key: "github_models", role: "paralel" },
  ],
  report: [
    { name: "Groq llama-4-scout", key: "groq", role: "primar" },
    { name: "Groq llama-3.3-70b", key: "groq", role: "rezerva" },
    { name: "Cerebras llama-3.3-70b", key: "cerebras", role: "rezerva" },
  ],
  // NOU
  frost: [{ name: "Open-Meteo", key: "meteo", role: "sursa" }],
};
```

**Fisiere afectate:** `public/app.js`, `public/index.html`
**Efort:** S — 1 ora
**Prioritate:** INALTA
**Status:** PLANIFICAT
**Dependenta:** F0.2

---

### F2.2 — Model indicator post-raspuns

**Descriere:** Dupa fiecare raspuns AI, un tag mic arata modelul real folosit si durata.

**UI:**

```
[Continut raspuns AI...]
━━━━━━━━━━━━━━━━━━━━━━
✓ Groq llama-4-scout • 2.3s     [sau]
↩ Groq llama-3.3-70b [fallback] • 6.1s     [sau]
✓ Gemini 2.5-flash • 4.8s
```

**Implementare:**

- Functie `renderModelIndicator(containerId, modelName, isFallback, ms)`
- Apelata dupa afisarea fiecarui raspuns AI
- Foloseste `_model` si `_fallback` din raspunsul API (F1.3)
- CSS: font-size 0.72rem, color var(--text-dim), border-top subtle

**Fisiere afectate:** `public/app.js` (~40 linii)
**Efort:** S — 45 minute
**Prioritate:** INALTA
**Status:** PLANIFICAT
**Dependenta:** F1.3, F2.1

---

## FAZA 3 — Alertare Meteo Imbunatatita

**Urgenta:** Prognoza 09-11 apr 2026 arata 0°C cu vant nordic (RealFeel -1°C). Sistemul actual foloseste `temperature_2m` nu `apparent_temperature` → poate rata alertarea!

### F3.1 — Folosire completa Open-Meteo (fara API key nou)

**Descriere:** Open-Meteo furnizeaza deja date suplimentare neutilizate in alerte. Zero modificari la API key sau costuri.

**Parametri adaugati in `meteo-cron.js` si frontend:**

| Camp Open-Meteo             | Disponibil acum | Utilizat in alerte | Actiune                                          |
| --------------------------- | --------------- | ------------------ | ------------------------------------------------ |
| `apparent_temperature`      | DA              | NU                 | Folosit in loc de `temperature_2m` pentru frost  |
| `precipitation_probability` | DA              | NU                 | Adaugat in disease risk (prob > 60%)             |
| `wind_speed_10m`            | DA              | NU                 | Inclus in mesaj alerta frost                     |
| `cloud_cover`               | DA              | NU                 | Factor inghet radiant (cer senin = mai sever)    |
| `dew_point_2m`              | DA              | NU                 | Indicator bruma (dew point < 0°C = bruma sigura) |

**Implementare `api/meteo-cron.js`:**

```javascript
// INAINTE (frost trigger):
if (h.temperature < 0) { frostActive = true; ... }

// DUPA (foloseste apparent_temperature):
var apparentTemp = h.apparent_temperature ?? h.temperature;
var isCloudless = (h.cloud_cover ?? 100) < 20; // cer senin = risc mai mare
var dewPoint = h.dew_point_2m ?? null;
var frostRisk = apparentTemp < 2 || (dewPoint !== null && dewPoint < 0);
if (frostRisk) {
  frostActive = true;
  frostMsg = "Inghet prognozat: " + apparentTemp + "°C (perceput) pe " + date +
    (isCloudless ? " — cer senin, risc de bruma!" : "") +
    ". Protejeaza pomii sensibili (piersic, cais, migdal, rodiu)!";
}
```

**Implementare `api/meteo-cron.js` — disease risk:**

```javascript
// Adauga probability check
var precipProb = h.precipitation_probability ?? 100;
if (
  rainHours >= 4 &&
  avgTemp >= 10 &&
  avgTemp <= 25 &&
  avgHumidity > 70 &&
  precipProb > 50
) {
  diseaseActive = true;
}
```

**Fisiere afectate:** `api/meteo-cron.js`, `public/app.js` (frontend alerts)
**Efort:** M — 2 ore
**Prioritate:** CRITICA (inghet activ azi-noapte)
**Status:** PLANIFICAT

---

### F3.2 — Alert multi-noapte consecutive

**Descriere:** Daca 2+ nopti consecutive au `apparent_temperature < 2°C`, alerteaza escaldat.

**Logica in `meteo-cron.js`:**

```javascript
var frostNights = [];
// parcurge prognoza zilnica
dailyTemps.forEach(function (day) {
  if (day.apparent_temp_min < 2) frostNights.push(day.date);
});

var consecutiveMsg = "";
if (frostNights.length >= 2) {
  consecutiveMsg =
    "ATENTIE: " +
    frostNights.length +
    " nopti consecutive cu risc (" +
    frostNights[0] +
    " - " +
    frostNights[frostNights.length - 1] +
    ")";
}
```

**UI frontend — banda colorata pe prognoza 5 zile:**

- Zilele cu `apparent_temp_min < 2°C` primesc border portocaliu/rosu
- Zilele cu `apparent_temp_min < 0°C` primesc fundal rosu subtil + icon ❄

**Fisiere afectate:** `api/meteo-cron.js`, `public/app.js`
**Efort:** M — 1.5 ore
**Prioritate:** INALTA (urgenta azi)
**Status:** PLANIFICAT
**Dependenta:** F3.1

---

### F3.3 — Sursa meteo secundara: Yr.no (optional, fara API key)

**Descriere:** Yr.no (met.no, Norvegia) ofera API JSON gratuit fara autentificare. Compara cu Open-Meteo si alerteaza la divergente mari.

**Endpoint:**

```
https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=46.17&lon=20.75
```

**Cerinta:** Header `User-Agent` obligatoriu (identificare aplicatie)

**Implementare in `meteo-cron.js`:**

```javascript
// Apel paralel Open-Meteo + Yr.no
var [openMeteoData, yrnoData] = await Promise.allSettled([
  fetchOpenMeteo(),
  fetch(
    "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=46.17&lon=20.75",
    {
      headers: { "User-Agent": "LivadaMea/2.0 (petrilarolly@gmail.com)" },
    },
  ).then((r) => r.json()),
]);

// Compara minimele pentru urmatoarea noapte
if (openMeteoData.status === "fulfilled" && yrnoData.status === "fulfilled") {
  var diffTemp = Math.abs(openMeteoMin - yrnoMin);
  if (diffTemp > 2) {
    // Stocheaza avertizare divergenta in Redis
    await redis.set(
      "livada:meteo:divergenta",
      "Prognoze divergente: Open-Meteo " +
        openMeteoMin +
        "°C vs Yr.no " +
        yrnoMin +
        "°C — verifica manual!",
    );
  }
}
```

**Nota:** Yr.no date sunt folosite DOAR pentru comparare/avertizare, nu inlocuiesc Open-Meteo ca sursa principala.

**Fisiere afectate:** `api/meteo-cron.js`
**Efort:** M — 2 ore
**Prioritate:** MEDIE
**Status:** PLANIFICAT
**Dependenta:** F3.1

---

### F3.4 — CRON_SECRET — remediere urgenta

**Descriere:** `CRON_SECRET` lipseste din Vercel env. Cron-ul `/api/meteo-cron` returneaza eroare 500 la fiecare rulare → datele meteo nu se actualizeaza.

**Pasi remediere:**

1. Genereaza un secret puternic (min 32 chars): `openssl rand -hex 32`
2. Adauga in Vercel Dashboard → Project → Settings → Environment Variables:
   - Key: `CRON_SECRET`
   - Value: secretul generat
   - Environment: Production + Preview + Development
3. Verifica in Vercel → Deployments → Functions → meteo-cron ca ruleaza cu succes

**Fisiere afectate:** NICIUN fisier de cod — doar configurare Vercel Dashboard
**Efort:** XS — 5 minute
**Prioritate:** CRITICA (blochează meteo history, GDD, Chill Hours, frost alert)
**Status:** ACTIUNE MANUALA ROLAND

---

## FAZA 4 — AI Comparator & Alternative

### F4.1 — Backend: parametru model explicit

**Descriere:** Permite frontend-ului sa ceara un model specific, in loc de ordinea de fallback implicita.

**`api/ask.js` — adauga `preferModel`:**

```javascript
const { question, species, context, preferModel } = await req.json();

// Daca preferModel === "cerebras" → sari direct la Cerebras
const providers =
  preferModel === "cerebras"
    ? [{ fn: callCerebras, name: "Cerebras llama-3.3-70b" }]
    : defaultProviders; // ordinea normala
```

**`api/diagnose.js` — adauga `returnBoth`:**

```javascript
const { base64, mimeType, species, returnBoth } = await req.json();

if (returnBoth) {
  // Ruleaza Gemini si GPT-4.1 in paralel (deja fac asta)
  // Returneaza ambele raspunsuri separat
  return Response.json({
    gemini: geminiDiagnosis,
    gpt4: gpt4Diagnosis,
    plantid: plantidResult,
    _both: true,
  });
} else {
  // comportament actual — un singur raspuns combinat
}
```

**Fisiere afectate:** `api/ask.js`, `api/diagnose.js`
**Efort:** M — 2 ore
**Prioritate:** MEDIE
**Status:** PLANIFICAT

---

### F4.2 — „Cere alternativa" button

**Descriere:** Dupa fiecare raspuns AI, un buton permite cererea raspunsului de la modelul alternativ.

**UI dupa raspuns:**

```
[Continut raspuns Groq...]
✓ Groq llama-4-scout • 2.3s
[📋 Copiaza]  [🔄 Cere parerea Cerebras]
```

**La click „Cere Cerebras":**

- Trimite aceeasi intrebare cu `preferModel: "cerebras"`
- Afiseaza al doilea raspuns dedesubt intr-un bloc distinct (fundal diferit)
- Butonul devine „[⚖ Compara raspunsurile]"

**Fisiere afectate:** `public/app.js` (~60 linii), `public/index.html` (buton nou)
**Efort:** M — 2 ore
**Prioritate:** MEDIE
**Status:** PLANIFICAT
**Dependenta:** F4.1

---

### F4.3 — View comparatie + raport diferente

**Descriere:** Cand exista 2 raspunsuri, afiseaza comparatie side-by-side si genereaza raport diferente.

**Layout comparatie:**

```
+---------------------------+---------------------------+
| Groq llama-4-scout        | Cerebras llama-3.3-70b   |
| [Raspuns A...]            | [Raspuns B...]            |
+---------------------------+---------------------------+
[⚖ Genereaza raport diferente]
```

**Raport diferente:**

- Trimite ambele raspunsuri la `ask.js` cu prompt:
  ```
  Compara aceste doua raspunsuri AI despre [specia/tema]:
  RASPUNS A (Groq): ...
  RASPUNS B (Cerebras): ...
  Spune-mi: ce diferente exista, care e mai complet, ce recomanda fiecare specific.
  ```
- Afiseaza raportul intr-un bloc separat

**Fisiere afectate:** `public/app.js` (~100 linii), `public/index.html`
**Efort:** L — 3 ore
**Prioritate:** SCAZUTA (feature avansat)
**Status:** PLANIFICAT
**Dependenta:** F4.2

---

## FAZA 5 — Securitate & Stabilitate

### F5.1 — Auth bypass fix [MEDIUM security — nerezolvat de 2 sesiuni]

**Descriere:** `api/_auth.js` permite accesul fara token daca `LIVADA_API_TOKEN` lipseste sau are sub 16 caractere. Identificat in ambele rapoarte Gemini (08 si 09 apr).

**Cod actual problematic (aproximativ):**

```javascript
// PERICULOS — permite bypass in prod daca env var lipseste
if (!expected || expected.length < 16) {
  return true; // skip auth
}
```

**Fix:**

```javascript
// SECURE — in productie, token lipsa = eroare server, nu bypass
if (!expected || expected.length < 16) {
  console.error(
    "[auth] LIVADA_API_TOKEN neconfigurat sau prea scurt in productie!",
  );
  // Returneaza 500 — configurare server incorecta, nu bypass
  return new Response(
    JSON.stringify({ error: "Configurare server incorecta" }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}
```

**Nota:** Verifica mai intai ca `LIVADA_API_TOKEN` este setat in Vercel env (vezi F3.4 pentru procedura similara cu CRON_SECRET).

**Fisiere afectate:** `api/_auth.js`
**Efort:** XS — 20 minute
**Prioritate:** INALTA (securitate)
**Status:** PLANIFICAT

---

### F5.2 — Imbunatatire Service Worker + notificare update

**Descriere:** Cand este disponibila o versiune noua a aplicatiei, SW-ul o detecteaza dar nu notifica utilizatorul. Adauga notificare non-intrusiva.

**Implementare in `public/sw.js` (mesaj catre client) + `public/app.js` (handler):**

```javascript
// app.js — handler mesaj SW
navigator.serviceWorker.addEventListener("message", function (e) {
  if (e.data && e.data.type === "SW_UPDATE_AVAILABLE") {
    showToast(
      "Versiune noua disponibila — reincarca pagina pentru update.",
      8000,
      function () {
        window.location.reload();
      },
    );
    livadaLog("SW", "update", "AVAILABLE", e.data.version);
  }
});
```

**Fisiere afectate:** `public/sw.js`, `public/app.js`
**Efort:** S — 1 ora
**Prioritate:** SCAZUTA
**Status:** PLANIFICAT

---

## FAZA 6 — Features Strategice

### F6.1 — Calendar tratamente predictiv

**Descriere:** Combina datele existente (jurnal + meteo + GDD/Chill) cu fenofazele per specie pentru recomandari proactive. Identificat ca „CERT" in auditul Gemini — valoare inalta.

**Logica:**

```
Daca:
  - specia activa = Cires
  - GDD acumulat = 85 (fenofaza: boboc alb)
  - Prognoza next 48h: <2°C apparent_temperature
  - In jurnal: nicio interventie in ultimele 7 zile
Atunci:
  → Alerta: "Cires in faza boboc alb + inghet prognozat →
     Aplica protectie anti-inghet (aspersie sau agrotextil) pana maine!"
```

**Date necesare (toate existente in proiect):**

- `GDD acumulat` → din F4.892-4.990 in app.js (deja implementat)
- `Prognoza meteo` → `fetchMeteoData()` (deja implementat)
- `Jurnal interventii` → `getJurnalEntries()` (deja implementat)
- `Fenofaze per specie` → date hardcodate per specie (adaugat)

**Fisiere afectate:** `public/app.js` (~150 linii), `public/index.html` (sectiune noua in tab Azi)
**Efort:** L — 4 ore
**Prioritate:** INALTA (valoare practica directa)
**Status:** PLANIFICAT
**Dependenta:** F3.1, F3.2

---

### F6.2 — Jurnal offline cu IndexedDB

**Descriere:** Inregistrarile in jurnal salvate in IndexedDB cand offline → sincronizate cu Redis cand revine online. Util direct in livada fara semnal.

**Flux:**

```
Utilizator in livada (offline)
→ Adauga interventie in jurnal
→ Salvata in IndexedDB local
→ Toast: "Salvat local — va fi sincronizat online"
→ La revenire online: sync automat catre Redis
→ Toast: "X interventii sincronizate"
```

**Implementare:**

- `indexedDB.open("livada-jurnal", 1)` cu object store `interventii`
- In `addJurnalEntry()`: daca offline → salveaza in IndexedDB, nu in localStorage
- In `syncJournal()`: merge IndexedDB pending → Redis, sterge local dupa confirmare

**Fisiere afectate:** `public/app.js` (~120 linii)
**Efort:** L — 4 ore
**Prioritate:** MEDIE
**Status:** PLANIFICAT

---

### F6.3 — Export jurnal CSV (fara server)

**Descriere:** Buton „Exporta jurnal CSV" genereaza fisier downloadabil direct din browser. Util pentru evidenta APIA/subventii.

**Implementare:**

```javascript
function exportJurnalCSV() {
  var entries = getJurnalEntries();
  var csv = "Data,Tip,Specie,Nota,Cost\n";
  entries.forEach(function (e) {
    csv +=
      [
        e.date,
        e.type,
        e.species || "",
        '"' + escapeCSV(e.note) + '"',
        e.cost || 0,
      ].join(",") + "\n";
  });
  var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "jurnal-livada-" + todayLocal() + ".csv";
  a.click();
  URL.revokeObjectURL(url);
  livadaLog("NAV", "export-csv", "OK", entries.length + " intrari");
}
```

**Fisiere afectate:** `public/app.js` (~25 linii), `public/index.html` (buton in tab Jurnal)
**Efort:** S — 45 minute
**Prioritate:** MEDIE
**Status:** PLANIFICAT

---

### F6.4 — Rezumat meteo saptamanal automat

**Descriere:** In tab „Azi", bloc „Saptamana in rezumat" calculat din meteo-history Redis. Zero AI call, pur calcul local.

**Continut bloc:**

```
Saptamana 31 mar - 06 apr:
GDD acumulat: +43 (total sezon: 312)    Ploaie totala: 28mm
Zile inghet: 0    Zile >25°C: 2    Umiditate medie: 68%
```

**Implementare:** Calcul din `loadMeteoHistory()` (deja existent) — extrage ultimele 7 zile si agrupa.

**Fisiere afectate:** `public/app.js` (~40 linii), `public/index.html` (bloc in tab Azi)
**Efort:** S — 1 ora
**Prioritate:** MEDIE
**Status:** PLANIFICAT
**Dependenta:** F3.4 (CRON_SECRET setat corect)

---

### F6.5 — Notificari Push pentru alerta inghet (PWA)

**Descriere:** Cand `frost-alert` devine activ, trimite notificare push pe dispozitivele cu PWA instalat.

**Nota:** Necesita service push server (complicat pe Vercel gratuit) SAU varianta simplificata: notificare locala prin `Notification API` la deschiderea aplicatiei cand alerta e activa.

**Varianta fezabila (fara server push):**

```javascript
// La initializare, daca frost alert activ + permisiune notificari acordata
if (Notification.permission === "granted" && frostData.frost?.active) {
  new Notification("Alerta Livada — Inghet!", {
    body: frostData.frost.message,
    icon: "/icon-192.png",
  });
}
```

**Fisiere afectate:** `public/app.js` (~30 linii)
**Efort:** S — 45 minute
**Prioritate:** SCAZUTA
**Status:** PLANIFICAT

---

## FAZA 7 — Items Anteriori Neimplementati (din CLAUDE.md)

Conform CLAUDE.md: „Ramase: Faza 7 (strategic: II3 servicii locale, V3 doza calculator, harta livada extindere)"

### F7.1 — II3: Servicii locale Nadlac/Arad

**Descriere:** Sectiune cu contacte/resurse locale utile (pepiniere, furnizori pesticide, APIA Arad).
**Status:** DE DISCUTAT cu Roland — continut specific local
**Efort:** M

### F7.2 — V3: Calculator doza tratamente

**Descriere:** Calculator interactiv: suprafata (mp) → doza produs (litri/grame) bazat pe fisa tehnica produs.
**Status:** PLANIFICAT
**Efort:** M

### F7.3 — Harta livada extindere

**Descriere:** Harta vizuala a loturilor cu pomi, pozitii, soiuri.
**Status:** COMPLEX — necesita input date Roland (layout real livada)
**Efort:** L

---

## MATRICE PRIORITATI SI EFORT

| ID   | Descriere                       | Prioritate  | Efort | Dependente | Urgenta            |
| ---- | ------------------------------- | ----------- | ----- | ---------- | ------------------ |
| F3.4 | CRON_SECRET in Vercel           | CRITICA     | XS    | —          | Azi                |
| F3.1 | Frost alert cu apparent_temp    | CRITICA     | M     | —          | Azi-noapte         |
| F0.1 | Ora in header                   | INALTA      | XS    | —          | Imediat            |
| F0.2 | Badge-uri vizibile diagnose/ask | INALTA      | XS    | —          | Imediat            |
| F5.1 | Auth bypass fix                 | INALTA      | XS    | —          | Imediat            |
| F1.1 | Event Log Engine                | INALTA      | S     | —          | Sesiunea urm       |
| F1.3 | Instrumentare AI                | INALTA      | M     | F1.1       | Sesiunea urm       |
| F2.1 | Badge-uri complete              | INALTA      | S     | F0.2       | Sesiunea urm       |
| F2.2 | Model indicator post-raspuns    | INALTA      | S     | F1.3       | Sesiunea urm       |
| F3.2 | Alert multi-noapte consecutive  | INALTA      | M     | F3.1       | Sesiunea urm       |
| F6.1 | Calendar tratamente predictiv   | INALTA      | L     | F3.1       | Planificat         |
| F1.2 | Debug Panel                     | MEDIE       | M     | F1.1       | Planificat         |
| F1.4 | Error handling functii          | MEDIE       | S     | F1.1       | Planificat         |
| F1.5 | Monitor cron meteo UI           | MEDIE       | S     | —          | Planificat         |
| F3.3 | Yr.no sursa secundara           | MEDIE       | M     | F3.1       | Planificat         |
| F4.1 | preferModel backend             | MEDIE       | M     | —          | Planificat         |
| F4.2 | Cere alternativa button         | MEDIE       | M     | F4.1       | Planificat         |
| F6.2 | Jurnal offline IndexedDB        | MEDIE       | L     | —          | Planificat         |
| F6.3 | Export CSV jurnal               | MEDIE       | S     | —          | Planificat         |
| F6.4 | Rezumat meteo saptamanal        | MEDIE       | S     | F3.4       | Planificat         |
| F5.2 | SW update notification          | SCAZUTA     | S     | —          | Planificat         |
| F4.3 | Comparator + raport diferente   | SCAZUTA     | L     | F4.2       | Planificat         |
| F6.5 | Notificari Push frost           | SCAZUTA     | S     | —          | Planificat         |
| F7.1 | Servicii locale Nadlac          | DE DISCUTAT | M     | —          | Planificat         |
| F7.2 | Calculator doza tratamente      | PLANIFICAT  | M     | —          | Planificat         |
| F7.3 | Harta livada                    | PLANIFICAT  | L     | —          | Planificat         |
| F8.1 | Senzor IoT local livada         | TODO        | L     | Hardware   | Pending            |
| F8.2 | Sistem alerte complet v2        | CONFIRMAT   | L     | F8.3       | Urmatoarea sesiune |
| F8.3 | Coordonate exacte + multi-model | CONFIRMAT   | S     | —          | Urmatoarea sesiune |

---

## FAZA 8 — Sistem Alerte v2 + Localizare Exacta + IoT (confirmat Roland 2026-04-12)

### F8.1 — Senzor Local IoT (TODO / PENDING)

**Descriere:** Instalare senzor de temperatura si umiditate direct in livada pentru date meteo REALE, nu prognozate. Cel mai precis mod de detectare frost, compensand limitarile prognozei (~1-7km rezolutie grid).

**Context:** Livada este la ~270m de raul Mures (coordonate GPS verificate). Microclima de lunca poate diferi cu 2-4°C fata de prognoza generica. Un senzor local elimina aceasta incertitudine.

**Optiuni hardware (de evaluat):**

| Optiune                                     | Cost estimat | Comunicare               | Autonomie             |
| ------------------------------------------- | ------------ | ------------------------ | --------------------- |
| Xiaomi Temp & Humidity Sensor + Gateway BLE | ~50-80 lei   | Bluetooth/WiFi → cloud   | Baterie CR2032, ~1 an |
| ESP32 + DHT22 (DIY)                         | ~30-50 lei   | WiFi direct → API custom | Alimentare USB/solar  |
| Senzor LoRaWAN + Gateway                    | ~150-300 lei | Radio lung → TTN/Helium  | Baterie, 2+ ani       |
| Statie meteo WiFi (ex: Ecowitt)             | ~200-400 lei | WiFi → ecowitt.net API   | Alimentare solara     |

**Integrare cu dashboard-ul:**

- API endpoint nou: `/api/sensor-data` — citeste ultimele valori de la senzor
- Afisare in tab "Azi": temperatura REALA vs prognoza
- Alerte bazate pe date REALE, nu prognozate — precizie maxima
- Fallback pe prognoza Open-Meteo daca senzorul e offline

**Status:** TODO — necesita achizitie hardware + decizie Roland pe optiune
**Efort:** L (hardware setup + software integration)
**Prioritate:** PENDING — proiect separat, se poate face oricand independent de F8.2/F8.3

---

### F8.2 — Sistem Alerte Complet v2

**Descriere:** Upgrade complet al sistemului de alerte: fix stale alerts + alerte noi (vant, canicula, ploaie, seceta) + afisare ora + offset microclimat Mures.

**Componente confirmate Roland (2026-04-12):**

1. **Fix alerte stale (Varianta A):** filtrare ore trecute in cron + expiry pe ora in frontend
2. **Alerte noi:** vant puternic, canicula, ploaie torentiala, seceta (din date Open-Meteo existente)
3. **Ora in alerta:** afisare ora aproximativa a pericolului
4. **Offset microclimat Mures:** corectie -1.5°C prag frost (livada la 270m de rau, zona lunca)

**Fisiere afectate:** `api/meteo-cron.js`, `public/app.js`, `public/index.html`
**Efort:** L
**Dependente:** F8.3 (coordonate corecte)
**Status:** CONFIRMAT — implementare in urmatoarea sesiune

---

### F8.3 — Coordonate Exacte + Multi-Model Meteo

**Descriere:** Actualizare coordonate GPS la locatia reala a livezii + activare multi-model (3 modele meteo = prognoza mai fiabila).

**Date GPS (confirmate Roland 2026-04-12):**

| Locatie                         | Latitudine | Longitudine | Elevatie |
| ------------------------------- | ---------- | ----------- | -------- |
| Livada (ACTUAL)                 | 46.164779  | 20.716786   | 89m      |
| Livada (VECHI — centrul Nadlac) | 46.17      | 20.75       | ~88m     |
| Mures (cel mai apropiat punct)  | 46.162820  | 20.714802   | 88m      |

**Diferenta fata de coordonatele vechi:** ~2.6 km vest — semnificativ la rezolutia gridului meteo.
**Distanta livada→Mures:** ~270m (calculat GPS, nu 500m cum se estima initial).
**Elevatie:** Livada +1m fata de Mures (grid 90m DEM). In realitate probabil +3-5m (livada pe teren usor mai ridicat decat lunca).

**Multi-model:** Open-Meteo permite cererea simultana de la 3 modele (ICON-EU, ECMWF IFS, GFS). Daca 2/3 indica frost → alerta certa. Daca 1/3 → alerta cu mentiunea "incert".

**Fisiere afectate:** `api/meteo-cron.js` (coordonate + URL API multi-model)
**Efort:** S
**Status:** CONFIRMAT

---

## RECOMANDARI EXCLUSE (incompatibile cu regulile proiectului)

| Recomandare Gemini                     | Motiv excludere                                                       |
| -------------------------------------- | --------------------------------------------------------------------- |
| Fragmentare `index.html` in componente | Contravine regulii „Single HTML" din CLAUDE.md (offline-first, PWA)   |
| Migrare la TypeScript                  | Zero biblioteci — proiectul foloseste vanilla JS intentionat          |
| ERP local (stoc, vanzari)              | Out of scope sesiune curenta, necesita decizie arhitecturala separata |
| ~~IoT sensors (Zigbee/LoRaWAN)~~       | **Mutat la F8.1 — TODO/PENDING (decizie Roland 2026-04-12)**          |

---

## WORKFLOW IMPLEMENTARE

```
Pentru fiecare item:
1. Claude citeste fisierul INAINTE de modificare (R6)
2. Declara nivel risc: LOW / MEDIUM / HIGH (R-RISK)
3. Implementeaza complet, functional, cu error handling (R4)
4. Ruleaza node --check pe orice fisier JS modificat
5. Roland confirma vizual pe localhost sau deploy preview
6. git add [fisiere specifice] — NICIODATA git add . sau git add -A
7. git commit -m "feat/fix: ..." && git push origin main
8. Vercel auto-deploy ~60s
9. Actualizeaza CLAUDE.md + DEPLOY_DATE + DEPLOY_TIME
```

---

## NOTE FINALE

- **Gemini_Documentatie/** ramane exclusiv local — NU se adauga in git, consultat doar la cerere Roland
- **CRON_SECRET** trebuie adaugat manual in Vercel Dashboard (actiune Roland, 5 minute)
- **Prognoza inghet 9-11 apr:** F3.1 + F3.2 sunt urgente — implementare prioritara inaintea oricarui alt item
- **Scor proiect evolutiv:** 85/100 → tinta V2: 90+/100 dupa implementarea fazelor 0-3

---

_Document generat: 2026-04-09 | Claude Sonnet 4.6 (T1) | Confirmat Roland Petrila_
_Surse: sesiune chat confirmata + MASTER_REPORT 08-apr + MASTER_REPORT 09-apr + info.md meteo + audit securitate_
