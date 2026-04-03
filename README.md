# Livada Mea Dashboard

Dashboard PWA pentru livada semi-comerciala din Nadlac, judetul Arad.
100+ pomi, 17 specii/soiuri. Proprietar: Roland Petrila.

**Live:** https://livada-mea-psi.vercel.app

## Features

- Documentatie completa A-G per specie (cercetare, calendar tratamente, ghid tundere, boli, soiuri, protectie iarna, note practice)
- Dashboard "Ce fac azi?" cu spray score, prognoza meteo, urmatorul tratament
- Jurnal interventii cu sync cross-device (Upstash Redis)
- Diagnostic foto AI (Google Gemini) + Intreaba expertul (Groq Llama)
- Calendar tratamente cu overlay interventii jurnal
- Raport anual generat AI din jurnal + meteo
- Galerie foto per specie (Vercel Blob)
- Alerte inghet + tracking recolta
- PWA offline-first, dark/light mode, print fisa teren

## Stack

- **Frontend:** Single HTML (inline CSS + JS), vanilla JavaScript, zero dependinte
- **Backend:** Vercel API routes (Node.js runtime)
- **AI:** Google Gemini 2.5 Flash (diagnostic foto) + Groq Llama 3.3 70B (intrebari + raport)
- **Storage:** Upstash Redis (jurnal, meteo) + Vercel Blob (foto)
- **Meteo:** Open-Meteo API (gratuit, fara API key)
- **Hosting:** Vercel (auto-deploy la push)

## Setup local

```bash
npm install
vercel dev
```

## Deploy

```bash
git push origin main
# Auto-deploy pe Vercel
```

## Structura

```
public/          Frontend (index.html + PWA assets)
api/             Vercel API routes
content/         Cercetare MD per specie
99_Plan_vs_Audit/ Planuri, audituri, regulamente
```
