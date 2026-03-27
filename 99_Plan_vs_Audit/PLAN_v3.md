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

### Sesiunea 2 — RAMAS (11 specii)
- [ ] Mar Florina (spalier + vas — dubla documentatie)
- [ ] Mar Golden Spur
- [ ] Par Favorita lui Clapp
- [ ] Par Williams
- [ ] Par Hosui (soi japonez)
- [ ] Par Napoca (soi romanesc)
- [ ] Migdal (exotic pt Romania)
- [ ] Zmeur
- [ ] Mur
- [ ] Afin (sol acid)
- [ ] Alun tufa

## FAZA 2 — Vercel Backend

- [ ] 2.1 Configurare Vercel (env vars, KV, Blob)
- [ ] 2.2 Sincronizare jurnal (Vercel KV)
- [ ] 2.3 Istoric meteo + cron zilnic
- [ ] 2.4 Alerta ingheturi automate
- [ ] 2.5 Galerie foto (Vercel Blob)
- [ ] 2.6 Notificari push (optional)

## FAZA 3 — AI Features

- [ ] 3.1 Identificare boli din poza (Edge Runtime + streaming)
- [ ] 3.2 Calendar inteligent cu meteo
- [ ] 3.3 Raport anual
- [ ] 3.4 Multi-user (optional)

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
