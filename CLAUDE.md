# Livada Mea Dashboard — CLAUDE.md

## Proiect

Dashboard PWA (Progressive Web App) pentru livada semi-comerciala din Nadlac, judetul Arad.
100+ pomi, 20 specii/soiuri, proprietar Roland Petrila.

**Status sesiuni:** S1-S17 complete + Runda 9+10 + V2 (F0-F6: logging, meteo apparent_temp, debug panel, AI instrumentare, calendar predictiv, offline jurnal, CSV export) | **HTML:** 12,490 linii (minified, 761 KB) | **API:** 12 routes + 3 utilitare
**Ultima actualizare:** 2026-04-10 | **Performance:** FCP 3–4s → 2–2.5s (−33%), HTML 1.2MB → 761KB (−36%), gzip 217KB

## Arhitectura

- **Frontend**: Single HTML file (`public/index.html`) — tot inline (CSS, JS, date)
- **Backend**: Vercel API routes (`api/`) — Edge Runtime pe toate rutele (exceptie: photos.js)
- **Hosting**: Vercel Hobby (auto-deploy la push)
- **Repo**: https://github.com/RolandPetrila/Livada.git
- **Deploy URL**: https://livada-mea-psi.vercel.app

## Structura

```
public/          — Frontend (index.html + PWA assets + sw.js)
api/             — Vercel API routes (Edge Runtime)
content/         — Cercetare MD per specie (sursa pentru integrare in HTML)
tools/           — Scripturi utilitare
99_Plan_vs_Audit/ — Planuri, audituri, recomandari imbunatatiri
99_Blueprints/   — Blueprint-uri universale
Roland.md        — Cerinte originale Roland (C1-C5, toate implementate)
```

## Reguli

- **Android-first**: viewport 360px prioritar, touch targets 44x44px, font 16px+
- **Offline-first**: documentatia functioneaza 100% fara internet
- **Romana 100%**: tot UI-ul in romana, cod in engleza
- **Zero costuri**: toate serviciile pe plan gratuit
- **Single HTML**: tot continutul inline, fara dependente externe (exceptie: Google Fonts)
- **Edge Runtime OBLIGATORIU** pe orice API route cu I/O extern (Vercel Hobby = 10s limit Node.js)
- **EXCEPTIE Edge Runtime**: `photos.js` ramane Node.js — `@vercel/blob` foloseste `undici` intern, incompatibil cu V8 isolate. Nu schimba la Edge!

## Conventii cod

- HTML semantic: h2 titluri sectiune, h3 subsectiuni
- CSS: variabile CSS pentru culori, fara hardcoded
- JS: vanilla JavaScript, zero biblioteci
- Clase: `.section`, `.alert`, `.tab`, `.tab-content`, `.table-wrap`
- API routes: `export const runtime = 'edge'` sau `export const config = { runtime: 'edge' }`

## Deploy

```bash
git add [fisiere] && git commit -m "feat: ..." && git push origin main && vercel --prod
```

## Autorizari durabile (override comportamente default Claude Code)

**PRE-AUTORIZAT fara confirmare suplimentara (scope: doar acest proiect):**

- `git push origin main` si `git push` pe orice alta branch din acest repo — Roland e unic developer, zero colaboratori, push direct pe main e workflow-ul standard
- `vercel --prod` si `vercel` (preview) — deploy-ul e reversibil prin rollback din Vercel dashboard, risc mic
- `npm install` / `npm install -D` pentru dependente rezonabile (verificate, populare, gratuit, fara CVEs active)

**CONTINUA SA CERI confirmare (nu sunt pre-autorizate):**

- `git push --force` / `git push -f` / force-push pe orice branch
- `git reset --hard`, `git branch -D`, stergeri destructive
- Modificari la `.env`, API keys, secrets
- Instalare dependente platite sau care cer inregistrare
- Schimbari in `vercel.json` care pot rupe routing-ul sau CSP-ul
- Orice `rm -rf` sau stergeri masive de fisiere
- Commit-uri cu `--no-verify` (skip hooks)

## Specii (20 + 1 general)

Cires, Visin, Cais, Piersic, Prun, Migdal, Par Clapp, Par Williams,
Par Hosui, Par Napoca, Mar Florina, Mar Golden Spur, Alun, Zmeur, Zmeur Galben Remontant,
Mur, Mur Copac, Afin, Rodiu, Kaki Rojo Brillante

- Plan Livada (general)

## API Routes — Status Runtime

| Route            | Runtime | Timeout | Serviciu extern                                                             |
| ---------------- | ------- | ------- | --------------------------------------------------------------------------- |
| ai-status.js     | Edge    | —       | Health check servicii AI (boolean, fara call extern)                        |
| ask.js           | Edge    | 28s     | Groq                                                                        |
| diagnose.js      | Edge    | 22s     | Gemini 2.5-flash (fallback: 2.5-flash-lite)                                 |
| diagnose-test.js | Edge    | 12s     | Gemini                                                                      |
| frost-alert.js   | Edge    | 5s      | Redis                                                                       |
| identify.js      | Edge    | 20s     | Gemini (identificare specie din fotografie)                                 |
| journal.js       | Edge    | 5s      | Redis                                                                       |
| meteo-cron.js    | Edge    | 25s     | Open-Meteo + Redis                                                          |
| meteo-history.js | Edge    | 5s      | Redis                                                                       |
| photos.js        | Node.js | 10s     | Vercel Blob (ATENTIE: @vercel/blob incompatibil cu Edge — foloseste undici) |
| ping.js          | Edge    | —       | —                                                                           |
| report.js        | Edge    | 25s     | Redis + Groq                                                                |
| \_auth.js        | Utility | —       | —                                                                           |
| \_ai.js          | Utility | —       | Wrapper comun Gemini + fallback modele                                      |
| \_timeout.js     | Utility | —       | fetchWithTimeout helper                                                     |

## Variabile de mediu (Vercel Dashboard)

- `LIVADA_API_TOKEN` — autentificare API (dezactivata momentan, rate limit activ)
- `GROQ_API_KEY` — AI ask + raport (llama-4-maverick primary, llama-3.3-70b-versatile fallback)
- `GOOGLE_AI_API_KEY` — AI diagnostic foto (Gemini 2.5-flash, fallback 2.0-flash)
- `UPSTASH_REDIS_REST_URL` — Redis cache meteo + jurnal sync
- `UPSTASH_REDIS_REST_TOKEN` — Redis auth
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob galerie foto
- `CRON_SECRET` — autentificare cron job meteo-cron (_enforce non-empty necesar_)

## Dependente externe

- Groq API (llama-4-scout primary, llama-3.3-70b-versatile fallback) — raspunsuri AI intrebari + rapoarte
- Cerebras (llama-3.3-70b, gratuit) — alternativa AI la cerere (F4.2)
- Google Gemini (gemini-2.5-pro → flash fallback) — diagnostic foto AI
- Open-Meteo (gratuit, fara API key) — date meteo curente + prognoza 5 zile (apparent_temp, cloud_cover, dew_point)
- Yr.no / met.no (gratuit, fara API key) — sursa meteo secundara pentru comparare (F3.3)
- Upstash Redis (@upstash/redis 1.37.0) — persistenta jurnal + meteo history cache
- Vercel Blob (@vercel/blob 2.3.2) — stocare fotografii galerie
- DOMPurify @3 (cdn.jsdelivr.net) — sanitizare HTML raspunsuri AI (_pin la @3.3.3 necesar_)

## Continut per specie — Structura A-Z

A. Cercetare completa | B. Calendar tratamente | C. Ghid tundere
D. Boli si daunatori | E. Soiuri recomandate | F. Protectie iarna | G. Note practice
H. Sfaturi Practice pentru Incepatori
I. Irigare si Necesar de Apa — specific Nadlac (seceta vara, necesar per specie, perioade critice)
J. Polenizare si Soiuri Compatibile — grupe incompatibilitate, distante, polenizatori naturali zona
K. Recoltare, Conditionare si Depozitare — maturitate comerciala, temperatura, durata conservare
L. Rentabilitate si Piata Locala Nadlac — preturi orientative, ce se vinde, ce merita procesat
M. Fenologie Calibrata Nadlac — date reale inflorire/recolta la 88m Campia de Vest
N. Inmultire si Propagare — altoire, butasi, marcotaj, soiuri protejate
O. Managementul Solului — cover crops, mulcire, cernoziom, erbicidare bio
P. Adaptare la Schimbari Climatice — tendinte Campia de Vest, adaptari recomandate acum
Q. Combinatii si Asocieri in Livada — alelopatie, layout optim, perdele vant, apicultura
R. Echipamente si Unelte — toolkit minim, scalare 100+ pomi, inchiriere vs cumparare
S. Procesare Detaliata si Retete — dulceata, tuica, uscare, congelare — cantitati reale
T. Vanzare Legala si Certificare — carnet producator, etichetare, bio certificat Romania
U. Interactiuni cu Fauna — pasari, albine, rozatoare, fauna de sol, polenizatori
V. Plan Multianual si Calendar Investitii — ROI, cronologie plantat→productie plina, riscuri
W. Recuperare dupa Evenimente Extreme — inghet, seceta, grindina, atac masiv boli
X. Istorie, Traditii si Valoare Culturala Locala — soiuri patrimoniu, marketing autentic Nadlac
Y. Resurse, Furnizori si Retea de Suport — pepiniere Arad, furnizori, asociatii, subventii APIA
Z. Glosar Pomicol — dictionar 80+ termeni tehnici explicati simplu (fisier comun, nu per specie)

**Surse cercetare:** Sectiunile A-H scrise direct in Claude Code | I-Z generate de Gemini CLI (DRAFT, validate de Claude Code)
**Workflow specie noua:** vezi memory/reference_gemini_workflow.md
**Cerinta Gemini:** `Gemini_Documentatie/Gemini_Research/Cerinta_Gemini_Research.md` (versiunea 2.0 — unificat I-Z, surse reale)
**IMPORTANT:** `Gemini_Documentatie/` este EXCLUSIV local — niciodata in git/push. Consultat doar la cerere explicita Roland.

## Performance Baseline (2026-04-10)

**Optimizations Applied:**

- Redis write batching (journal.js, meteo-cron.js) — API I/O −50–70%
- Gemini pro timeout reduction (diagnose.js: 10s → 5s) — fallback −25%
- HTML minification (CSS/JS inline) — 1.2MB → 761KB (−36%), gzip 217KB

| Metric                | Before    | After     | Target   |
| --------------------- | --------- | --------- | -------- |
| **HTML Size**         | 1.2 MB    | 761 KB    | < 500 KB |
| **Gzipped**           | ~300 KB   | 217 KB    | < 200 KB |
| **FCP (5G mobile)**   | 3–4s      | 2–2.5s    | < 2s     |
| **API journal POST**  | 200–550ms | 100–300ms | < 300ms  |
| **API meteo-cron**    | 300–700ms | 100–300ms | < 300ms  |
| **Diagnose fallback** | 20s max   | 15s max   | < 15s    |

**Tools:**

- `scripts/minify-html.js` — Minify inline CSS/JS in production (Node.js ESM)

**Commits:**

- `751b7c2` — perf: minify inline CSS/JS (1.2MB → 761KB)
- `df9c5ed` — perf: batch Redis writes + reduce Gemini timeout

**Reports:**

- `.claude-outputs/PERF_REPORT_20260410.md` — Full analysis
- `.claude-outputs/PERF_IMPLEMENTATION_20260410.md` — Implementation details

**Next Phase:**

- [ ] Lazy load species sections (−1–2s FCP additional)
- [ ] Setup Lighthouse CI + Sentry RUM
- [ ] HTTP/2 Server Push for critical CSS

## Imbunatatiri pendinte

Vezi `99_Plan_vs_Audit/RECOMANDARI_IMBUNATATIRI_V2.md` — plan complet V2.
**Faze 1-6 + Runda 9+10 + V2 (F0-F6) implementate (170+ items total).**
V2 implementat: F0.1-F0.2 (header+badges), F1.1-F1.5 (logging+debug+error handling+cron monitor), F2.1-F2.2 (AI badges+model indicator), F3.1-F3.3 (apparent_temp+multi-noapte+Yr.no), F4.1-F4.2 (preferModel+Cerebras alternativa), F5.2 (SW log), F6.1-F6.5 (calendar predictiv+offline journal+CSV+rezumat saptamanal+push frost).
**Ramase:** F4.3 (comparator full, SCAZUTA), F7.1-F7.3 (strategic: II3 servicii locale, V3 doza calculator, harta livada extindere).

**Decizii inchise (2026-04-11):**

- **F5.1 (LIVADA_API_TOKEN) — NU se implementeaza.** Decizie Roland: dashboard-ul e pentru uz personal + parinti pe telefon, prioritate UX simpla fara parole. Origin check + rate limit (30 req/min) + DOMPurify sunt suficiente pentru threat model-ul real (site obscur, fara trafic public). Codul in `_auth.js:59-67` gestioneaza corect cazul "token nesetat" (skip complet, backward compat).
- **F3.4 CRON_SECRET — DEJA enforced** in `meteo-cron.js:72-78` (intoarce 500 daca lipseste env var). Bifat ca rezolvat in audit 2026-04-11.

## Audit findings — actiuni amanate

- **H1 CSP `unsafe-inline`** (audit 2026-04-11, severitate HIGH teoretica) — migrare amanata dupa stabilizare V2. Plan detaliat salvat in `.claude-outputs/CSP_MIGRATION_PLAN.md` (Optiunea B — hash-based CSP, 6–8h implementare). Justificare: DOMPurify e deja strat de protectie activ, risc real mic pentru un site obscur, nu merita introdusa complexitate build pipeline in plin V2 development. A se relua dupa F7 decis.
