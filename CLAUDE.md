# Livada Mea Dashboard — CLAUDE.md

## Proiect
Dashboard PWA (Progressive Web App) pentru livada semi-comerciala din Nadlac, judetul Arad.
100+ pomi, 20 specii/soiuri, proprietar Roland Petrila.

## Arhitectura
- **Frontend**: Single HTML file (`public/index.html`) — tot inline (CSS, JS, date)
- **Backend**: Vercel API routes (`api/`) — Full features Faza 5 (Dashboard, AI, Monitoring)
- **Hosting**: Vercel (auto-deploy la push)
- **Repo**: https://github.com/RolandPetrila/Livada.git

## Structura
```
public/          — Frontend (index.html + PWA assets)
api/             — Vercel API routes (Edge Runtime)
content/         — Cercetare MD per specie (sursa pentru integrare in HTML)
tools/           — Scripturi utilitare
99_Plan_vs_Audit/ — Planuri, audituri, regulamente
99_Blueprints/   — Blueprint-uri universale
```

## Reguli
- **Android-first**: viewport 360px prioritar, touch targets 44x44px, font 16px+
- **Offline-first**: documentatia functioneaza 100% fara internet
- **Romana 100%**: tot UI-ul in romana, cod in engleza
- **Zero costuri**: toate serviciile pe plan gratuit
- **Single HTML**: tot continutul inline, fara dependente externe (exceptie: Google Fonts)

## Conventii cod
- HTML semantic: h2 titluri sectiune, h3 subsectiuni
- CSS: variabile CSS pentru culori, fara hardcoded
- JS: vanilla JavaScript, zero biblioteci
- Clase: `.section`, `.alert`, `.tab`, `.tab-content`, `.table-wrap`

## Deploy
```bash
git add [fisiere] && git commit -m "feat: ..." && git push origin main && vercel --prod
```

## Specii (20 + 1 general)
Cires, Visin, Cais, Piersic, Prun, Migdal, Par Clapp, Par Williams,
Par Hosui, Par Napoca, Mar Florina, Mar Golden Spur, Alun, Zmeur, Zmeur Galben Remontant,
Mur, Mur Copac, Afin, Rodiu, Kaki Rojo Brillante
+ Plan Livada (general)

## Variabile de mediu (Vercel Dashboard)
- `LIVADA_API_TOKEN` — autentificare API (toate rutele)
- `GROQ_API_KEY` — AI ask + raport (llama-3.3-70b-versatile)
- `GOOGLE_AI_API_KEY` — AI diagnostic foto (Gemini 2.5-flash)
- `UPSTASH_REDIS_REST_URL` — Redis cache meteo + jurnal sync
- `UPSTASH_REDIS_REST_TOKEN` — Redis auth
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob galerie foto
- `CRON_SECRET` — autentificare cron job meteo-cron

## Dependente externe
- Groq API (llama-3.3-70b-versatile) — raspunsuri AI intrebari + rapoarte
- Google Gemini (gemini-2.5-flash) — diagnostic foto AI
- Open-Meteo (gratuit, fara API key) — date meteo curente + prognoza 5 zile
- Upstash Redis — persistenta jurnal + meteo history cache
- Vercel Blob — stocare fotografii galerie
- DOMPurify (cdn.jsdelivr.net) — sanitizare HTML raspunsuri AI

## Continut per specie — Structura A-G
A. Cercetare completa | B. Calendar tratamente | C. Ghid tundere
D. Boli si daunatori | E. Soiuri recomandate | F. Protectie iarna | G. Note practice
