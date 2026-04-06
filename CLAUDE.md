# Livada Mea Dashboard — CLAUDE.md

## Proiect
Dashboard PWA (Progressive Web App) pentru livada semi-comerciala din Nadlac, judetul Arad.
100+ pomi, 20 specii/soiuri, proprietar Roland Petrila.

**Status sesiuni:** S1-S17 complete + Runda 9+10 (N8-N17, II1/II2/II4, T9, S10) | **HTML:** ~13,150 linii | **API:** 11 routes
**Ultima actualizare:** 2026-04-07

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

## Specii (20 + 1 general)
Cires, Visin, Cais, Piersic, Prun, Migdal, Par Clapp, Par Williams,
Par Hosui, Par Napoca, Mar Florina, Mar Golden Spur, Alun, Zmeur, Zmeur Galben Remontant,
Mur, Mur Copac, Afin, Rodiu, Kaki Rojo Brillante
+ Plan Livada (general)

## API Routes — Status Runtime
| Route | Runtime | Timeout | Serviciu extern |
|-------|---------|---------|-----------------|
| ask.js | Edge | 28s | Groq |
| diagnose.js | Edge | 22s | Gemini 2.5-flash (fallback: 2.5-flash-lite) |
| diagnose-test.js | Edge | 12s | Gemini |
| frost-alert.js | Edge | 5s | Redis |
| journal.js | Edge | 5s | Redis |
| meteo-cron.js | Edge | 25s | Open-Meteo + Redis |
| meteo-history.js | Edge | 5s | Redis |
| photos.js | Edge | 28s | Vercel Blob |
| ping.js | Edge | — | — |
| report.js | Edge | 25s | Redis + Groq |
| _auth.js | Utility | — | — |

## Variabile de mediu (Vercel Dashboard)
- `LIVADA_API_TOKEN` — autentificare API (dezactivata momentan, rate limit activ)
- `GROQ_API_KEY` — AI ask + raport (llama-4-maverick primary, llama-3.3-70b-versatile fallback)
- `GOOGLE_AI_API_KEY` — AI diagnostic foto (Gemini 2.5-flash, fallback 2.0-flash)
- `UPSTASH_REDIS_REST_URL` — Redis cache meteo + jurnal sync
- `UPSTASH_REDIS_REST_TOKEN` — Redis auth
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob galerie foto
- `CRON_SECRET` — autentificare cron job meteo-cron (*enforce non-empty necesar*)

## Dependente externe
- Groq API (llama-3.3-70b-versatile) — raspunsuri AI intrebari + rapoarte
- Google Gemini (gemini-2.5-flash, fallback gemini-2.5-flash-lite) — diagnostic foto AI
- Open-Meteo (gratuit, fara API key) — date meteo curente + prognoza 5 zile
- Upstash Redis (@upstash/redis 1.37.0) — persistenta jurnal + meteo history cache
- Vercel Blob (@vercel/blob 2.3.2) — stocare fotografii galerie
- DOMPurify @3 (cdn.jsdelivr.net) — sanitizare HTML raspunsuri AI (*pin la @3.3.3 necesar*)

## Continut per specie — Structura A-H
A. Cercetare completa | B. Calendar tratamente | C. Ghid tundere
D. Boli si daunatori | E. Soiuri recomandate | F. Protectie iarna | G. Note practice
H. Sfaturi Practice pentru Incepatori (adaugat S15)

## Imbunatatiri pendinte
Vezi `99_Plan_vs_Audit/RECOMANDARI_IMBUNATATIRI.md` — checklist complet pe faze.
**Faze 1-6 + Runda 9+10 implementate (140+ items total).** Ramase: Faza 7 (strategic: II3 servicii locale, V3 doza calculator, harta livada extindere).
