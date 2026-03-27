# RUNDA CURENTA — Livada Mea Dashboard

**Data:** 2026-03-27 (SESIUNEA 1 din 2 — noapte, executie fara intreruperi)
**Faza:** Faza 0 → Faza 1 → Faza 1.5 partial (primele 6 specii)
**Status:** EXECUTIE AUTONOMA TOTALA — Roland doarme, nu intreba nimic

## Ce s-a decis
- Arhitectura: Single HTML + Vercel API routes
- Cercetare: Claude Code face tot, imbogatit cu stil Claude.ai
- Executie: AUTONOMA TOTALA (zero intreruperi)
- Deploy: AUTO
- UX: Android-first, offline-first, romana 100%
- Terminale: 3 (T1 executie, T2 audit, T3 orchestrator)
- **Repo GitHub:** https://github.com/RolandPetrila/Livada.git (EXISTENT)
- **Vercel:** creeaza automat in Faza 0 (vercel link + vercel deploy)

## SESIUNEA 1 (noaptea asta) — ORDINE EXECUTIE

### BLOC 1 — Faza 0: Infrastructura
1. git init + remote add origin https://github.com/RolandPetrila/Livada.git
2. Structura directoare (public/, api/, content/, tools/)
3. Mutare Livada_Mea_Dashboard.html → public/index.html
4. Extragere DOCX-uri cu python-docx → MD in content/
5. Creare vercel.json, package.json, .gitignore
6. vercel link + vercel deploy (primul deploy)
7. Creare CLAUDE.md per-proiect
8. Commit initial + push

### BLOC 2 — Faza 1: MVP Static
1. Restructurare 18 taburi (UX Android-first, categorii vizuale)
2. Dark/Light mode toggle
3. Cautare globala in continut
4. Calculator doze tratamente
5. Jurnal interventii (localStorage)
6. PWA complet (service worker, manifest, iOS)
7. Calendar interactiv cu alerte vizuale
8. Export PDF
9. Meteo Nadlac live (OpenWeatherMap — gratuit)
10. Commit + push + vercel --prod

### BLOC 3 — Faza 1.5 partial: Primele 6 specii (cele mai complexe)
Cercetare completa per specie (structura A-G, limbaj accesibil, soiuri locale, TOP greseli, calendar lunar, semne carenta, bio alternativa, doze la 10L).
IMPORTANT: Fiecare specie primeste cercetare COMPLETA in format MD in content/, apoi se integreaza in HTML. Inclusiv speciile care au deja material partial (Rodiu, Cais) — se refac complet in aceeasi structura A-G.
Ordinea SESIUNEA 1:
1. Cais (combina Cercetare_Cais_ClaudeCode.md + Cercetare_Cais_ClaudeResearch.md → cercetare completa A-G)
2. Rodiu (combina Rodiu_Research.md + Rodiu_Ghid_Tundere.docx → cercetare completa A-G, tradus RO)
3. Piersic (prioritate — basicarea frunzelor)
4. Prun
5. Cires
6. Visin
7. Integrare cele 6 specii in HTML
8. Commit + push + vercel --prod

### STOP SESIUNEA 1 — Actualizeaza PLAN_v3.md si RUNDA_CURENTA.md cu ce s-a facut

## SESIUNEA 2 (maine — lansata de Roland) — CE RAMANE
11 specii ramase:
1. Mar Florina (spalier + vas — dubla documentatie)
2. Mar Golden Spur
3. Par Favorita lui Clapp
4. Par Williams
5. Par Hosui (soi japonez)
6. Par Napoca (soi romanesc)
7. Migdal (exotic pt Romania)
8. Zmeur
9. Mur
10. Afin (sol acid)
11. Alun tufa
+ Integrare in HTML + commit final + vercel --prod

## Decizii de luat (deschise) — T1 decide singur
- Structura taburi: alege cea mai buna varianta Android-first
- Combinare cercetari Cais: unifica cele 2 documente, pastreaza ce e mai bun din fiecare
- La orice alta decizie: alege varianta cea mai sigura, logheaza in PLAN_DECISIONS.md

## Blocaje
*(T1 completeaza aici daca intalneste probleme)*
