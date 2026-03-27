# PLAN v3 — Livada Mea Dashboard
# Adaptat din planul aprobat jazzy-twirling-sky.md | 2026-03-27

---

## FAZA 0 — Pregatire Infrastructura ✅ COMPLET

- [x] 0.1 Creare repo GitHub (https://github.com/RolandPetrila/Livada.git)
- [x] 0.2 Structura directoare (public/, api/, content/, tools/)
- [x] 0.3 Mutare HTML → public/index.html
- [x] 0.4 Extragere DOCX-uri cu python-docx → MD referinta
- [x] 0.5 Creare vercel.json, package.json, .gitignore
- [x] 0.6 vercel link + vercel deploy (primul deploy) — livada-mea-psi.vercel.app
- [x] 0.7 Creare CLAUDE.md per-proiect
- [x] 0.8 Commit initial + push

## FAZA 1 — MVP Static ✅ COMPLET

- [x] 1.1 Restructurare taburi (18 tab-uri, UX Android-first, categorii vizuale cu separatoare)
- [x] 1.2 Integrare continut existent (Plan Livada + Rodiu)
- [x] 1.3 Dark/Light mode toggle (persistat localStorage)
- [x] 1.4 Cautare globala in continut (evidentiaza tab-uri cu match)
- [x] 1.5 Calculator doze tratamente (20 produse presetate, formula concentratie%)
- [x] 1.6 Jurnal interventii (localStorage CRUD, 7 tipuri interventie)
- [x] 1.7 PWA complet (sw.js, manifest.json, icon.svg, install banner)
- [x] 1.8 Calendar interactiv cu alerte vizuale (11 perioade tratament, navigare lunara)
- [x] 1.9 Export PDF (window.print() cu @media print)
- [x] 1.10 Meteo Nadlac live (OpenWeatherMap, API key in localStorage)

## FAZA 1.5 — Populare Continut (paralel, iterativ)

### Sesiunea 1 — COMPLETATE ✅
- [x] Cais — cercetare completa A-G, integrat in HTML (accent: inghet tarziu, monilioza, soiuri inflorire tarzie)
- [x] Rodiu — cercetare completa A-G, integrat in HTML (accent: forma tufa obligatorie, protectie iarna critica)
- [x] Piersic — cercetare completa A-G, integrat in HTML (accent: basicarea frunzelor, rarire fructe)
- [x] Prun — cercetare completa A-G, integrat in HTML (accent: rezistenta frig, viermele prunelor)
- [x] Cires — cercetare completa A-G, integrat in HTML (accent: polenizare incrucisata, musca cireselor)
- [x] Visin — cercetare completa A-G, integrat in HTML (accent: autofertil, fructifica lemn 1 an)

### Sesiunea 2 — COMPLETATE ✅
- [x] Mar Florina — cercetare completa A-G, DUBLA documentatie spalier+vas, integrat in HTML (accent: rezistenta rapan Vf, program tratamente REDUS)
- [x] Mar Golden Spur — cercetare completa A-G, integrat in HTML (accent: program intensiv anti-rapan, alternanta, rarire obligatorie)
- [x] Par Favorita lui Clapp — cercetare completa A-G, integrat in HTML (accent: focul bacterian CRITIC, recoltare INAINTE de maturitate)
- [x] Par Williams — cercetare completa A-G, integrat in HTML (accent: irigare critica, oportunitate palinca pere premium)
- [x] Par Hosui — cercetare completa A-G, integrat in HTML (accent: nashi ≠ par european, recoltare la maturitate deplina)
- [x] Par Napoca — cercetare completa A-G, integrat in HTML (accent: soi romanesc SCDP Cluj, rezistenta superioara boli)
- [x] Migdal — cercetare completa A-G, integrat in HTML (accent: specie EXOTICA, protectie inghet critica, soiuri inflorire tarzie)
- [x] Zmeur — cercetare completa A-G, integrat in HTML (accent: soiuri clasice vs remontante, tundere diferita)
- [x] Mur — cercetare completa A-G, integrat in HTML (accent: palisat obligatoriu, soiuri fara spini)
- [x] Afin — cercetare completa A-G + SECTIUNE SPECIALA acidifiere sol, integrat in HTML (accent: pH 4.0-5.5 obligatoriu!)
- [x] Alun tufa — cercetare completa A-G, integrat in HTML (accent: polenizare eoliana, minim 2 soiuri)

## FAZA 2 — Vercel Backend ✅ COMPLET

- [x] 2.1 Configurare Vercel (env vars pe Vercel: OPENWEATHER_API_KEY, GOOGLE_AI_API_KEY, GROQ_API_KEY. Deps: @upstash/redis + @vercel/blob)
- [x] 2.2 Sincronizare jurnal (Upstash Redis via api/journal.js, merge by timestamp, sync la online)
- [x] 2.3 Istoric meteo + cron zilnic (api/meteo-cron.js cron 0 6 * * * + api/meteo-history.js, grafic 30 zile)
- [x] 2.4 Alerta ingheturi automate (api/frost-alert.js, banner rosu in header, detectie temp<0 in mar-mai + risc boli fungice)
- [x] 2.5 Galerie foto (Vercel Blob, api/photos.js, upload/list/delete per specie, grid in modal)
- [ ] 2.6 Notificari push (optional — SARIT, nu complica excesiv)

## FAZA 3 — AI Features ✅ COMPLET

- [x] 3.1 Identificare boli din poza — Gemini Vision (api/diagnose.js, Node.js runtime, prompt structurat cu diagnostic+tratament+urgenta)
- [x] 3.2 Cautare inteligenta per tab — Groq Llama 3.3 70B (api/ask.js, context extras din tab activ, intrebari in limbaj natural)
- [x] 3.3 Calendar inteligent cu meteo (enhanceCalendarWithMeteo: overlay temp pe zile, alerte inghet/boli fungice in calendar)
- [x] 3.4 Raport anual (api/report.js, Groq, combina jurnal+meteo, genereaza raport structurat)
- [ ] 3.5 Multi-user (optional — SARIT)

### API Keys Faza 3 (setate ca env vars pe Vercel):
- Gemini Vision: GOOGLE_AI_API_KEY
- Groq (text/rezumate): GROQ_API_KEY
- Meteo: OPENWEATHER_API_KEY

---

## RAPOARTE EXECUTIE

### Sesiunea 1 (2026-03-27 noapte) — T1 autonom

**Faza 0:** COMPLET in ~15 min. Git init, structura, config, primul deploy Vercel.
**Faza 1:** COMPLET. MVP cu 18 taburi, dark/light, cautare, calculator, jurnal, calendar, meteo, PWA, export PDF.
**Faza 1.5 partial:** 6/17 specii completate (Cais, Rodiu, Piersic, Prun, Cires, Visin).
- Fiecare specie: cercetare completa A-G (3000-5000 cuvinte), MD in content/, integrat in HTML
- Fisier HTML final: 293KB, 4255 linii
- Deploy productie: https://livada-mea-psi.vercel.app

**Decizii T1:** vezi PLAN_DECISIONS.md (7 decizii noi)
**Blocaje:** vercel link non-interactive (rezolvat cu project add manual + project.json)

### Sesiunea 2 (2026-03-27) — T1 autonom

**Faza 1.5 COMPLETATA:** Toate 17/17 specii cu cercetare completa A-G, integrate in HTML.
- 11 specii noi: Mar Florina (dubla doc spalier+vas), Mar Golden Spur, Par Clapp, Par Williams, Par Hosui, Par Napoca, Migdal, Zmeur, Mur, Afin (sectiune acidifiere), Alun tufa
- 3 commits intermediare + deploy-uri Vercel
- Fisier HTML final: ~6123 linii
- 22 fisiere cercetare MD in content/
- Deploy productie: https://livada-mea-psi.vercel.app

**Decizii T1 Sesiunea 2:** vezi PLAN_DECISIONS.md
**Blocaje:** Niciun blocaj semnificativ. API overload la agenti (rezolvat cu retry + paralel)

### Sesiunea 3 (2026-03-27) — T1 autonom

**Faza 2 COMPLETATA:** Backend Vercel complet.
- 8 API routes (Node.js runtime): journal, meteo-cron, meteo-history, frost-alert, photos, diagnose, ask, report
- 3 env vars setate pe Vercel (OPENWEATHER_API_KEY, GOOGLE_AI_API_KEY, GROQ_API_KEY)
- Cron zilnic 06:00 UTC: salveaza meteo + detecteaza inghet + risc boli
- @upstash/redis (KV) + @vercel/blob (photos)
- Sync jurnal intre dispozitive cu merge by timestamp

**Faza 3 COMPLETATA:** AI Features integrate.
- Diagnostic foto: Gemini 2.0 Flash, prompt structurat, base64 upload
- Cautare AI: Groq Llama 3.3 70B, context din tab activ (3000 chars)
- Calendar inteligent: overlay meteo, alerte inghet si boli fungice
- Raport anual: Groq, combina jurnal+meteo, raport structurat
- Galerie foto per specie: Vercel Blob, upload/list/delete

**Frontend:** +508 linii (6123→6631). Species tools bar injectat dinamic, 3 modale noi, CSS complet, offline fallback.
**Decizii T1 Sesiunea 3:** vezi PLAN_DECISIONS.md
**Blocaje:** Edge Runtime incompatibil cu undici (rezolvat cu Node.js runtime). KV/Blob necesita provisionare manuala din Vercel Dashboard.
**Deploy:** https://livada-mea-psi.vercel.app
