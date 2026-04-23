# AUDIT — Sistem Alarme & Notificari Meteo / Inghet

**Data:** 2026-04-22
**Scop:** Audit complet al sistemului de detectie + notificare alerte meteo (inghet, boli, grindina, vant, canicula, ploaie, seceta).
**Trigger:** Cerere explicita Roland — "cum functioneaza sistemul de alarma si notificare din aplicatie pt meteo, ingheturi. auditeaza acest aspect"
**Branch la audit:** `main` @ commit `3345bc4` (fix(meteo): null guard G2 + elimin paranteze imbricate G6)

---

## 1. ARHITECTURA — Flux Date

```
[Open-Meteo + Yr.no/met.no]
        ↓
[2 CRON-uri redundante]
  • Vercel Cron: 0 2 * * *      (1x/zi, 02:00) — vercel.json
  • GitHub Actions: 5 * * * *   (24x/zi, minut 5) — .github/workflows/meteo-cron.yml
        ↓ Bearer CRON_SECRET (sincronizat in ambele locuri — vezi project_cron_secret_sync_20260414.md)
[meteo-cron.js — Edge Runtime]
  • Calcul 7 alerte: frost, disease, hail, wind, heat, rain, drought
  • Multi-model consensus (ICON-EU + ECMWF + GFS) pt frost
  • Yr.no comparison pt divergenta >2°C
  • Salvare batch Redis (8 chei + jurnal rolling 50 entries)
        ↓
[Redis Upstash]
  livada:frost-alert | disease-risk | alert-{hail,wind,heat,rain,drought}
  livada:alert-journal | cron:last-run | meteo:divergenta
        ↓
[GET /api/frost-alert] (timeout 5s, cache 5min, Edge Runtime)
        ↓
[Frontend app.js: checkAlerts()]
  • Cache localStorage "livada-alerts-cache"
  • applyAlertBanner() x 7 tipuri → banner UI in pagina (.alert-banner.active)
  • sendLivadaNotification() → Notification API browser
  • renderAlertJournal() → istoric ultimele alerte
```

**Fisiere implicate:**

- `api/meteo-cron.js` — generator alerte (632 linii)
- `api/frost-alert.js` — citire alerte din Redis pentru frontend
- `api/meteo-refresh.js` — proxy manual user-triggered (ascunde CRON_SECRET)
- `api/meteo-history.js` — istoric 30 zile
- `api/ping.js` — health check + cron staleness in body
- `public/app.js:4042-4307` — toata logica frontend alerte/notificari
- `public/index.html:61-115` — banner-ele (7 tipuri)
- `public/sw.js:138-156` — Push handler (DECLARAT, NEFOLOSIT)
- `vercel.json:4-9` — Vercel Cron
- `.github/workflows/meteo-cron.yml` — GitHub Actions Cron

---

## 2. LOGICA FROST — Praguri Dinamice (G6, commit a0aa022)

| Sezon            | Luni              | Prag apparent | Conditii suplimentare               |
| ---------------- | ----------------- | ------------- | ----------------------------------- |
| **Activ**        | Mar-Mai + Sep-Nov | < 3.5°C       | SAU dew_point < 0 (bruma radiativa) |
| **Iarna severa** | Dec-Feb           | < −10°C       | Doar pt rodiu+kaki (dormancy)       |
| **Vara**         | Iun-Aug           | — (off)       | Corect, nu se calculeaza frost      |

**Multi-model:** 3/3 = "cert", 2/3 = "probabil", 1/3 = "posibil" — eticheta atasata in mesaj.

**Microclimat Mures:** prag 3.5°C ajustat +1.5°C fata de prognoza generica (livada la ~270m de Mures, umiditate ridicata — vezi project_localizare_livada.md).

**Output frost alert (exemplu):**

```js
{
  active: true,
  minTemp: -3,
  date: "2026-04-23",
  frostHour: "2026-04-23T05:00",
  message: "Inghet prognozat: -3°C (perceput) pe 2026-04-23 la ~05:00 — cer senin, risc de bruma! Punct de roua: -5.2°C (bruma sigura). Protejeaza pomii sensibili (piersic, cais, migdal, rodiu)! [PROBABIL — 2/3 modele]",
  consecutiveMsg: "ATENTIE: 3 nopti consecutive cu risc (...)",
  frostNights: ["2026-04-23", "2026-04-24", "2026-04-25"],
  severeDays: [],  // < 0°C apparent_min
  confidence: "probabil",
  modelsAgree: 2,
  updatedAt: "2026-04-22T14:23:01Z"
}
```

---

## 3. CANALE NOTIFICARE

| Canal                               | Status                                         | Trigger                                                             |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| **Banner UI** (`#frostBanner` etc.) | ✅ Functional                                  | Render la `checkAlerts()`                                           |
| **Notification API browser**        | ⚠️ Functional doar in foreground               | `sendLivadaNotification()` din `applyAlertBanner`                   |
| **Service Worker Push (VAPID)**     | ❌ **HANDLER EXISTA, INFRASTRUCTURA LIPSESTE** | sw.js:139 listener `push` declarat, dar nimeni nu trimite push real |
| **Toast UI**                        | ✅ La actiuni manuale                          | `showToast()`                                                       |
| **Calendar predictiv**              | ✅ Border albastru pe `apparent_min < 3.5`     | Render-time                                                         |

---

## 4. POLLING / FRECVENTA

`checkAlerts()` ruleaza in 3 cazuri:

- Init load (delay `INIT_ALERTS_DELAY_MS = 1500`)
- Click manual `🔄 Actualizeaza acum` (`triggerMeteoRefresh`)
- Switch tab `Azi` (din `initDashboardAzi`)

**❌ NU exista `setInterval` pe alerts** → daca tab-ul ramane deschis 24h fara interactiune, banner-ele raman cu date vechi pana refresh manual.

**Cron backend:** ~25 actualizari/zi (1 Vercel + 24 GitHub Actions) × 4 fetch-uri per run (Open-Meteo forecast + multi-model + Yr.no) ≈ 100 req/zi → safe pentru Open-Meteo free tier (10K/zi).

---

## 5. FINDINGS — Severitate

### 🔴 CRITICE (P0)

**C1 — Alertele NU ajung la user cand app-ul e inchis** (anuleaza scopul)

- `sw.js:139` are listener `push` dar **fara endpoint VAPID + server push**
- La 04:00 dimineata, frost de −3°C → user afla doar dimineata cand vede pomii distrusi
- **Fix:** Web Push VAPID end-to-end (T4 din V3) — esential pt frost alert real

**C2 — Dedupe notificari DOAR per sesiune** (`_notifSentKeys` reset la reload)

- `app.js:4185` — variabila in memorie, fara persistenta
- 5 reload-uri/zi → 5 notificari identice pt aceeasi alerta
- **Fix:** persistenta `localStorage` cu cheie `(type + date)` + TTL 24h

### 🟠 MAJORE (P1)

**M1 — Polling absent in foreground** (24h tab open = date stale)

- **Fix:** `setInterval(checkAlerts, 30 * 60 * 1000)` (30 min) cand `document.visibilityState === "visible"`

**M2 — Periodic Background Sync absent** (PWA capabil, nefolosit)

- Service Worker poate face periodicSync la 6h chiar cu app inchis
- **Fix:** `registration.periodicSync.register("alerts-check", { minInterval: 6*3600*1000 })`

**M3 — Dismiss banner non-persistent** (UI inchis cu X, reapare la refresh)

- `index.html:66` — `classList.remove("active")` doar in DOM
- User dismiss frost ziua 1 → revede banner ziua 2 same alert
- **Fix:** salvare `livada-dismissed-{key}-{date}` in `localStorage`

**M4 — Tranzitie sezoniera brusca prag frost** (3.5°C → −10°C peste noapte 28 Feb → 1 Mar)

- Frost −8°C in **27 Feb** → silentios (sub prag −10°C in iarna)
- Frost −8°C in **1 Mar** → alerta plina
- Pomii nu citesc calendarul; in martie devreme rodiu/kaki inca dormante
- **Fix:** interpolare graduala SAU sub-praguri "frost informational" pt iarna (−5°C)

### 🟡 MEDII (P2)

**Md1 — Indicator vizibil "cron stale"** lipseste din UI

- `ping.js` returneaza `cronStale: true`, dar nimic nu o citeste in frontend
- **Fix:** badge mic "Cron OK / STALE 3h" in header

**Md2 — Notification body trunchiat pe mobil** (~250 caractere → 100-150 vizibili)

- Mesajul frost contine info critica la coada (`speciesHint`)
- **Fix:** prioritizare info: `"-3°C la 05:00 — protejeaza piersic, cais"` (scurt, actionable)

**Md3 — Lipsa `severity` flag in obj alerta** (frost −1° vs −8° la fel)

- **Fix:** `severity: "warning" | "critical"` in obj → CSS distinct

**Md4 — Lipsa retry pe checkAlerts esuat** (timeout 5s → tacere 24h)

- **Fix:** retry o data dupa 10s daca prima esueaza

### 🟢 MINORE (P3)

- **m1** — `Permissions-Policy: microphone=()` in `vercel.json` va bloca N1 (voice input) cand vine implementat
- **m2** — `INIT_ALERTS_DELAY_MS = 1500` fara justificare in comentariu
- **m3** — `_notifSentKeys` nu se cleanup-uieste (mem leak teoretic in sesiune lunga)
- **m4** — Cron dual (Vercel + GH Actions) → safe pt Open-Meteo, dar redundanta neexplicata

---

## 6. CE FUNCTIONEAZA BINE (KEEP)

- ✅ Multi-model consensus (3 modele) → acuratete reala
- ✅ Yr.no comparison divergenta → warning calibrare
- ✅ `isAlertStale()` cu buffer 2h → elimina alerte trecute corect
- ✅ Multi-noapte consecutive (`consecutiveMsg`) → util pt protectie 3-5 zile
- ✅ Edge Runtime peste tot → sub 300ms response
- ✅ Cache `localStorage` → vizibil offline imediat
- ✅ Toggle disable notif (`livada-notif-disabled`) → respect user
- ✅ Jurnal alerte 50 entries → istoric pastrat
- ✅ Pragul 3.5°C ajustat microclimat Mures (+1.5°C) → calibrat realist
- ✅ Fallback graceful Redis indisponibil

---

## 7. SCOR FINAL

| Componenta                     | Scor     | Comentariu                                       |
| ------------------------------ | -------- | ------------------------------------------------ |
| Backend (calcul + persistenta) | **9/10** | Excelent — multi-source, batch writes, robust    |
| Banner UI in pagina            | **8/10** | Bine integrat, lipsa dismiss persistent          |
| Notificari real-world          | **4/10** | **Nu ajung la user cand conteaza** (app inchis)  |
| Reliabilitate cron             | **9/10** | Dual cron + fail-fast secret                     |
| **GLOBAL**                     | **7/10** | Solid, dar handicap critic pe push notifications |

---

## 8. ACTIUNI RECOMANDATE — Prioritizate

| #   | Severitate | Actiune                                                       | Effort | Impact                                                    |
| --- | ---------- | ------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| 1   | 🔴 P0      | Web Push VAPID end-to-end (T4 V3)                             | 4-6h   | TRANSFORMA sistemul de la "informational" la "actionable" |
| 2   | 🔴 P0      | Dedupe notif persistent `localStorage (type+date)` + TTL 24h  | 30min  | Elimina spam la reload-uri                                |
| 3   | 🟠 P1      | `setInterval(checkAlerts, 30min)` cand `visibility=visible`   | 15min  | Tab open = mereu fresh                                    |
| 4   | 🟠 P1      | Dismiss persistent banner (`livada-dismissed-{key}-{date}`)   | 30min  | Respect choice user                                       |
| 5   | 🟠 P1      | Periodic Background Sync (sw.js) la 6h                        | 1h     | Refresh alerte chiar cu app inchis                        |
| 6   | 🟠 P1      | Tranzitie graduala prag iarna (interpolare Feb-Mar / Nov-Dec) | 1h     | Nu rateaza frost intermediar                              |
| 7   | 🟡 P2      | Indicator UI cron stale (citeste `ping.js`)                   | 30min  | User stie daca datele-s actuale                           |
| 8   | 🟡 P2      | Notif body scurt + actionable (prioritizare info)             | 20min  | Vizibil pe mobil                                          |

**Recomandare prioritizare:** Pachet rapid `#2+#3+#4+#7` (~2h, zero costuri) → rezolva 80% din probleme operationale. **`#1` (Web Push VAPID)** ramane cea mai mare valoare adaugata (transforma sistemul), dar are cost mai mare (server-side state, VAPID keys, subscription management) — merita planificat ca sprint dedicat.

---

## 9. URMATOAREA DECIZIE — Asteapta input Roland

Optiuni discutate la finalul sesiunii audit:

- **A.** Implementare imediata pachet rapid (`#2+#3+#4+#7`) — ~2h, fara cost
- **B.** Plan detaliat dedicat in `99_Plan_vs_Audit/` cu toate cele 8 puncte si dependentele
- **C.** Sprint dedicat Web Push VAPID (`#1`) primul — cel mai mare impact

**Status:** Asteapta confirmare Roland pentru directie.
