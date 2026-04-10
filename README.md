# Livada Mea Dashboard

Dashboard PWA pentru livada semi-comerciala din Nadlac, judetul Arad.
100+ pomi, 20 specii/soiuri. Proprietar: Roland Petrila.

**Live:** https://livada-mea-psi.vercel.app

## Features

- Documentatie completa A-Z per specie (cercetare, calendar tratamente, ghid tundere, boli, soiuri, protectie iarna, irigare, polenizare, recoltare, rentabilitate, fenologie Nadlac, inmultire, sol, clima, asocieri, echipamente, procesare, vanzare legala, fauna, ROI, recuperare dupa evenimente extreme, traditii locale, resurse Arad, glosar)
- Dashboard "Ce fac azi?" cu spray score, prognoza meteo, urmatorul tratament
- Jurnal interventii cu sync cross-device (Upstash Redis) + modul offline + export CSV
- Diagnostic foto AI — Gemini 2.5-pro→flash + Plant.id + GPT-4.1 (GitHub Models) rulate in paralel
- Intreaba expertul — Groq llama-4-scout → llama-3.3-70b → Cerebras llama-3.3-70b fallback
- Calendar tratamente cu overlay interventii jurnal + calendar predictiv multianual
- Raport anual generat AI din jurnal + meteo (Groq / Cerebras, cache 1h)
- Galerie foto per specie (Vercel Blob)
- Alerte inghet (apparent_temp + cloud_cover + dew_point) + push notifications
- Comparare meteo Open-Meteo vs Yr.no pentru validare prognoza
- Debug panel + logging engine (livadaLog) pentru instrumentare
- PWA offline-first, dark/light mode, print fisa teren, Android-first

## Stack

- **Frontend:** Single HTML (inline CSS + JS minified), vanilla JavaScript, zero dependinte runtime (except DOMPurify @3.3.3 via CDN)
- **Backend:** Vercel API routes — Edge Runtime pe 12/13 routes (exceptie: `photos.js` ramane Node.js pt @vercel/blob care foloseste undici, incompatibil cu V8 isolate)
- **AI diagnostic foto:** Google Gemini 2.5-pro → 2.5-flash fallback + Plant.id v3→v2 + GPT-4.1 (GitHub Models gratuit) rulate `Promise.allSettled`
- **AI text:** Groq llama-4-scout-17b-16e primary + llama-3.3-70b-versatile fallback 1 + Cerebras llama-3.3-70b fallback 2 (toate gratuit)
- **Storage:** Upstash Redis (jurnal, meteo history 90 zile, raport cache, rate limit) + Vercel Blob (foto)
- **Meteo:** Open-Meteo API (gratuit, fara API key) + Yr.no/met.no (comparare)
- **Hosting:** Vercel Hobby (auto-deploy la push pe main) — toate serviciile gratuit permanent

## Setup local

```bash
npm install
vercel dev
```

## Deploy

```bash
git push origin main
# Auto-deploy pe Vercel (main branch → production)
```

## Performance (baseline 2026-04-10)

- HTML: 1.2 MB → 761 KB (-36%) dupa minify inline CSS/JS
- Gzip: 217 KB
- FCP (5G mobile): 3–4s → 2–2.5s
- API journal POST: 200–550ms → 100–300ms (Redis batch writes)
- Diagnose fallback: 20s max → 15s max (Gemini pro timeout 10s → 5s)

## Structura

```
public/          Frontend (index.html minified + app.js + sw.js + PWA assets)
api/             Vercel API routes (13 routes, 12 Edge + 1 Node)
content/         Cercetare MD per specie (A-Z structurat)
scripts/         Tools build (minify-html.js)
tools/           Utilitare Python one-shot
99_Plan_vs_Audit/  Planuri, audituri, regulamente
99_Blueprints/   Blueprint-uri universale reusabile
.claude/         Skills + hooks + settings Claude Code (local)
```

## Documentatie

- `CLAUDE.md` — sursa de adevar pentru arhitectura, rute API, variabile de mediu, roadmap
- `Roland.md` — cerintele originale (C1-C5, toate implementate)
- `.claude-outputs/audit/` — audituri trecute si score evolution
