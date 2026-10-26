# PLAN — Remediere AI + cron meteo (2026-10-27)

> Sursa problemelor: `ISSUES.md` (13 itemi, dovezi live). Status: ✅ DONE 2026-10-27 (commit 01eab00). Decizii Roland: D1 Gemini 3.5 Flash-Lite · D2 Vercel Cron ×12 + GitHub reactivat · D3 Roland.md restaurat.
> Risc global: **MEDIUM** (schimba comportamentul functional al tuturor rutelor AI; reversibil prin rollback Vercel + git revert).

## Reguli de siguranta
- Zero servicii platite (regula proiect). Nu se atinge `GOOGLE_AI_API_KEY_TRADUCERI_PAID`.
- Nicio valoare de cheie in cod/chat/git. Cheile raman in Vercel env + Windows env vars.
- Edge Runtime ramane pe rutele existente (regula CLAUDE.md). Excepție neschimbata: `photos.js`, `push-broadcast.js` (Node).
- QA: preview NU are `GROQ_API_KEY` / `GOOGLE_AI_API_KEY` / `CRON_SECRET` → testare **locala** a handler-elor (import direct in Node cu `Request` + env vars Windows) + smoke test pe **productie** cu rollback pregatit (`vercel rollback`).
- Testele vitest se actualizeaza in ACELASI commit (CI activ pe push).

## Decizii (confirmate de Roland 2026-10-27)
- **D1** — a doua parere: Gemini 3.5 Flash-Lite
- **D2** — cron: 12 Vercel Cron zilnice + GitHub Actions reactivat
- **D3** — `Roland.md` restaurat (C1–C5)

## Checklist

### A. Text AI (Intreaba + chat + Raport) — #1, #2
- [x] A1 `api/_ai.js`: constante centralizate modele (GROQ_PRIMARY `openai/gpt-oss-120b`, GROQ_FALLBACK `qwen/qwen3.8-27b`) + helper text Gemini
- [x] A2 `api/ask.js`: lant Groq gpt-oss-120b → Groq qwen3.8 → Gemini (text) ; ramura `preferModel` → furnizorul ales la D1
- [x] A3 `api/report.js`: acelasi lant
- [x] A4 a doua parere = `/api/ask` cu `preferModel:"second"` (Gemini 3.5 Flash-Lite); `api/cerebras-opinion.js` sters

### B. Vision AI (Diagnostic + Identificare) — #3–#6, #11
- [x] B1 `api/diagnose.js`: raspuns in flux (keep-alive spatii + JSON final, status 200, erorile in `{error}`) — Edge permite streaming pana la 300 s dupa primul byte (docs Vercel 2026-08-03)
- [x] B2 `diagnose.js`: scos apelul mort `gemini-2.5-pro-preview-03-25` si GitHub Models; `thinkingBudget: 0`; buget global de timp (~50 s) pt lant: Gemini 2.5-flash key1 → Gemini 3.5-flash-lite key1 → Gemini 2.5-flash key2 → Pixtral-12B → Grok-4.3
- [x] B3 `diagnose.js`: Plant.id doar ca rezerva cand AI-ul vision pica (economisire 21 credite ramase); Pl@ntNet ramane in paralel
- [x] B4 `api/identify.js`: scos GitHub Models, xAI → `grok-4.3`, `thinkingBudget: 0`, rezerva `gemini-3.5-flash-lite`

### C. Status AI real — #8
- [x] C1 `api/_quota.js`: scos `cerebras`/`github_models`; adaugat `mistral`, `xai`, `gemini_lite`; `recordAiCalls(attempts)` → Redis `ai-health:<provider>` + cota (ultimul OK/eroare + timestamp)
- [x] C2 rutele AI apeleaza `recordAiCalls` (1 pipeline, timeout 1,5 s, inainte de JSON-ul final)
- [x] C3 `api/ai-status.js`: intoarce cheie prezenta + ultima stare reala per furnizor
- [x] C4 `public/app.js`: lista furnizori (2445–2462), etichete hardcodate (3660, 3791, 3798, 3826–3980, 4194, 5137), buton „a doua parere” redenumit

### D. Cron meteo — #7
- [x] D1 12 Vercel Cron zilnice (`/api/meteo-cron?slot=HH`) + `gh workflow enable`

### E. Teste + deploy + documentatie — #9, #10, #12, #13
- [x] E1 actualizare teste vitest (modele, endpoint-uri, streaming diagnose) → `npm test` verde
- [x] E2 test local handler-e cu chei reale (ask, a doua parere, report, diagnose, identify + fallback-uri fortate cu chei invalide)
- [x] E3 commit + push + `vercel --prod` → smoke test productie pe toate 5 rutele AI
- [x] E4 `Roland.md` conform D3
- [x] E5 `CLAUDE.md` (tabel API, env vars, dependente) + memory (Cerebras/GitHub Models/Groq) + `ISSUES.md` jurnal

## Jurnal executie
- 2026-10-27 — investigatie completa, ISSUES.md creat, plan scris.
- 2026-10-27 — implementat tot; A4 realizat ca ruta unica `/api/ask` (preferModel=second) in loc de ruta separata; 263/263 teste; deploy prod + smoke test e2e (ask, a doua parere, diagnose 9,5 s, identify, report, ai-status, cron) + test UI Playwright.
