# RUNDA CURENTA — Livada Mea Dashboard

**Data:** 2026-03-27
**Faza:** Faza 1.5 in curs (11 specii ramase)
**Status:** SESIUNEA 1 COMPLETA — asteapta Roland pentru Sesiunea 2

## Ce s-a realizat in Sesiunea 1

### BLOC 1 — Faza 0: Infrastructura ✅
- Git init + remote add origin (repo existent)
- Structura: public/, api/, content/, tools/
- HTML model copiat in public/index.html
- DOCX-uri extrase: Plan_Complet_Livada.md, Rodiu_Ghid_Tundere.md
- Config: vercel.json, package.json, .gitignore
- CLAUDE.md per-proiect creat
- Vercel: proiect livada-mea creat + primul deploy
- URL productie: https://livada-mea-psi.vercel.app

### BLOC 2 — Faza 1: MVP Static ✅
- 18 taburi Android-first cu categorii vizuale (separatoare: Samburoase/Semintoase/Arbusti/Altele)
- Dark/Light mode cu persistenta localStorage
- Cautare globala (evidentiaza tab-uri cu match)
- Calculator doze: 20 produse presetate, formula concentratie × volum × 10
- Jurnal interventii: CRUD complet, 7 tipuri, localStorage
- PWA: sw.js (cache-first static, network-first API), manifest.json, icon.svg, install banner
- Calendar interactiv: 11 perioade tratament, navigare lunara, evenimente pe luna
- Export PDF: window.print() cu @media print
- Meteo Nadlac: OpenWeatherMap cu API key in localStorage + alerte temp
- Bottom bar cu 5 tools (modal slide-up panels)
- Touch targets 44x44px, font 16px+, responsive 360px

### BLOC 3 — Faza 1.5 partial: 6 specii ✅
Cercetare completa A-G pentru: Cais, Rodiu, Piersic, Prun, Cires, Visin
- MD files in content/ (3000-5000 cuvinte fiecare)
- Convertite in HTML cu tools/md_to_html.py
- Integrate in public/index.html (293KB, 4255 linii)
- Deploy productie

## Statistici Sesiunea 1
- 3 commits + push + 3 deploy-uri Vercel
- 6 fisiere cercetare: ~25,000 cuvinte total
- HTML final: 293KB (in spec 300-500KB)
- URL live: https://livada-mea-psi.vercel.app

## SESIUNEA 2 (lansata de Roland) — CE RAMANE

### 11 specii de completat (cercetare A-G + integrare HTML):
1. Mar Florina (spalier + vas — documentatie DUBLA)
2. Mar Golden Spur
3. Par Favorita lui Clapp
4. Par Williams
5. Par Hosui (soi japonez)
6. Par Napoca (soi romanesc)
7. Migdal (exotic pt Romania)
8. Zmeur
9. Mur
10. Afin (sol acid — specific)
11. Alun tufa

### Ordine recomandata:
- Pari (4 soiuri) — pot partaja structura comuna
- Meri (2 soiuri, Florina necesita documentatie dubla)
- Arbusti (Zmeur, Mur, Afin) — mai simpli
- Altele (Alun, Migdal) — speciale

### La final sesiunea 2:
- Integrare 11 specii in HTML
- Commit + push + vercel --prod
- Actualizare PLAN_v3.md (bifeaza tot)
- Opcional: review UX, bugfix-uri minore

## Blocaje intalnite (Sesiunea 1)
- `vercel link --yes --scope` nu functioneaza in mod non-interactive
  - **Rezolvare:** vercel project add + creare manuala .vercel/project.json
  - **Impact:** 0 (rezolvat in 2 minute)

## Decizii de luat (deschise) — pt Sesiunea 2
- Structura tab-uri par: 4 tab-uri separate SAU 1 tab cu sub-sectiuni? (T1 alege separat — mai clar)
- Mar Florina dubla documentatie: 2 sectiuni in acelasi tab (spalier + vas)
- Afin: sectiune speciala acidifiere sol (diferita de restul speciilor)
