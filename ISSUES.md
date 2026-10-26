# ISSUES — Livada Mea Dashboard

> Creat: 2026-10-27 · Sursa: verificare live pe productie (`livada-mea-psi.vercel.app`) + apeluri directe la fiecare furnizor AI + log-uri Vercel.
> Legenda status: 🔴 DESCHIS · 🟡 IN LUCRU · ✅ REZOLVAT · ⏸️ AMANAT (decizie Roland)

## Rezumat

| # | Problema | Severitate | Impact utilizator | Status |
|---|----------|-----------|-------------------|--------|
| 1 | Groq a retras ambele modele Llama folosite | SEV1 | „Întreabă AI”, chat-ul de continuare si „Raport anual” NU merg deloc | ✅ |
| 2 | Cerebras nu mai are plan gratuit (HTTP 402) | SEV1 | Butonul „Cere părerea Cerebras” da eroare; fallback-ul final din Întreabă/Raport e mort | ✅ |
| 3 | Diagnostic foto: `FUNCTION_INVOCATION_TIMEOUT` (504) | SEV1 | „Diagnostic AI” din poza NU merge deloc | ✅ |
| 4 | GitHub Models retras definitiv (30.07.2026) | SEV2 | Modelul paralel GPT-4.1 din Diagnostic + Identificare e mort | ✅ |
| 5 | xAI a retras `grok-2-vision-1212` | SEV2 | Ultimul fallback vision din Diagnostic + Identificare e mort | ✅ |
| 6 | Gemini `2.5-pro-preview-03-25` nu mai exista; `2.5-pro` nu mai e disponibil conturilor noi | SEV3 | Diagnosticul pierde ~0,3 s la fiecare cerere pe un apel garantat esuat | ✅ |
| 7 | Cron meteo orar (GitHub Actions) DEZACTIVAT automat pt inactivitate (60 zile) | SEV1 | Alertele de inghet/vant/canicula + push se actualizeaza doar 1×/zi (02:00) — in plin sezon de inghet de toamna | ✅ |
| 8 | Panou „Status AI” + etichete UI arata furnizori morti ca „verzi” | SEV3 | Informatie falsa: `ai-status` verifica doar existenta cheii, nu functionarea | ✅ |
| 9 | `Roland.md` suprascris (necomis) — cerintele originale C1–C5 sterse | SEV3 | Pierdere documentatie; nota noua contine afirmatii false (vezi #10) | ✅ |
| 10 | Nota HuggingFace din `Roland.md` e falsa | INFO | HF Inference: HTTP 402 „no remaining credits”; modelul de specii: „not supported by provider” | ✅ |
| 11 | Plant.id: 21/50 credite ramase (total, nu lunar) | SEV3 | Se consuma 1 credit la FIECARE diagnostic → ~21 diagnostice pana se epuizeaza (degradare gratioasa, nu crash) | ✅ |
| 12 | Limite quota in `_quota.js` neverificate (Gemini 1000/zi etc.) | INFO | Guard-ul de quota poate fi prea permisiv/restrictiv; documentatia Google nu publica cifrele (doar in AI Studio) | ⏸️ |
| 13 | `CLAUDE.md` invechit (modele, furnizori, „Vercel CLI”) | INFO | Context gresit pentru sesiuni viitoare | ✅ |

---

## Detalii + dovezi

### #1 — Groq: modele retrase [CERT]
- `api/ask.js:187` `meta-llama/llama-4-scout-17b-16e-instruct` → **404 model_not_found**
- `api/ask.js:155,204` + `api/report.js` `llama-3.3-70b-versatile` → **404 model_not_found**
- Productie: `POST /api/ask` → `{"error":"AI indisponibil temporar. Incearca din nou."}` (verificat 2026-10-27)
- Modele Groq disponibile acum (GET /models): `openai/gpt-oss-120b` (1,3 s, raspuns bun RO), `qwen/qwen3.8-27b` (0,5 s), `openai/gpt-oss-20b` (0,9 s)
- **Fix:** primar `openai/gpt-oss-120b` → rezerva `qwen/qwen3.8-27b` → rezerva finala Gemini (text).

### #2 — Cerebras 402 [CERT pe cheie / PROBABIL ca politica]
- `gpt-oss-120b` si `qwen-3.8-27b` → **HTTP 402 payment_required** (local SI productie, `/api/cerebras-opinion`)
- Surse terte: planul gratuit permanent inlocuit in iulie 2026 cu credit trial $5 care cere card → incompatibil cu regula „zero costuri”.
- **Fix:** inlocuire „a doua parere” cu alt furnizor gratuit (decizie Roland — vezi PLAN).

### #3 — Diagnostic foto 504 [CERT]
- Log Vercel 2026-10-27 00:13: `gemini-2.5-pro 404 → flash` · `gemini key1 failed: AbortError t+20241ms` · `gpt-4.1 skip` → apoi fallback-uri SECVENTIALE (key2 20 s, Mistral 20 s, xAI 20 s) → depaseste limita Edge de 25 s pana la primul byte → 504.
- Masurat: Gemini 2.5-flash pe promptul complet de diagnostic = 14–21 s (raspuns lung ~7000 caractere; „thinking” activ adauga ~6 s).
- **Fix:** raspuns in flux (streaming „keep-alive”) ca functia Edge sa nu mai loveasca limita de 25 s + buget global de timp pe lantul de fallback + `thinkingBudget: 0` + scoatere apeluri moarte.

### #4 — GitHub Models retras [CERT]
- Sursa: https://github.blog/changelog/2026-07-30-github-models-is-now-retired/ — API-ul de inferenta nu mai e disponibil nimanui.
- `models.inference.ai.azure.com` → DNS fail; `models.github.ai` → raspunde `text/plain "OK"` la orice prompt (stub).
- **Fix:** eliminare din `diagnose.js`, `identify.js`, `ai-status.js`, `_quota.js`, UI. Variabila `GITHUB_MODELS_TOKEN` din Vercel devine inutila.

### #5 — xAI `grok-2-vision-1212` retras [CERT]
- 404 „model does not exist”. Disponibil: `grok-4.3` (vision OK, 9–17 s), `grok-4.20-0309-non-reasoning` (16 s).
- **Fix:** `grok-4.3` ca ultim fallback vision (lent, deci doar la final, cu bugetul de timp ramas).

### #6 — Gemini pro preview [CERT]
- `gemini-2.5-pro-preview-03-25` → 404; `gemini-2.5-pro` → „no longer available to new users”.
- `gemini-2.5-flash` functioneaza (OK); `gemini-2.5-flash-lite` → indisponibil conturilor noi; `gemini-3.5-flash-lite` → OK, 5 s pe promptul complet.
- **Fix:** primar `gemini-2.5-flash` (thinking 0), rezerva pe aceeasi cheie `gemini-3.5-flash-lite` (alta cota per model).

### #7 — Cron meteo orar oprit [CERT]
- `gh workflow list`: „Meteo Cron - Actualizare alerte orar” = **disabled_inactivity**; ultima rulare 2026-08-23. Repo PUBLIC → GitHub dezactiveaza schedule dupa 60 zile fara activitate in repo.
- Singurul declansator ramas: Vercel Cron `0 2 * * *` (`vercel.json`) → 1×/zi; `/api/ping` raporta `stale:true` (1190 min).
- Vercel Hobby (docs 2026-07-15): max 100 cron-uri/proiect, fiecare max 1×/zi, precizie ±59 min.
- Actiunea „keepalive-workflow” (ocolire inactivitate) a fost blocata de GitHub pt incalcare ToS → NU o folosim.
- **Fix:** (decizie Roland — vezi PLAN).

### #8 — Status AI inselator [CERT]
- `api/ai-status.js` intoarce `true` daca exista cheia → Groq/Cerebras/GitHub apar verzi desi sunt morti. Lipsesc Mistral + xAI din panou.
- `public/app.js:2445-2462, 3660, 3791, 3798, 3826-3980, 4194, 5137` — etichete hardcodate „llama-4-scout”, „Cerebras”, „GPT-4.1”.

### #9 / #10 — `Roland.md` + nota HuggingFace [CERT]
- `git diff Roland.md`: cerintele C1–C5 inlocuite cu o nota „HF Inference 1000 req/zi PERMANENT”.
- Test real 2026-10-27 cu `HF_TOKEN`: `linkanjarad/mobilenet_v2...` → **402 „You have no remaining credits”**; `nsarker/convnext...` → **400 „Model not supported by provider hf-inference”**. Afirmatia din nota e falsa.

### #11 — Plant.id credite [CERT]
- `usage_info`: `total_limit 50`, `used_total 29`, `remaining_total 21`. Limita e TOTALA (nu se reseteaza).

### #12 — Quota neverificate [INCERT]
- https://ai.google.dev/gemini-api/docs/rate-limits nu publica RPD free tier per model („can be viewed in Google AI Studio”).

---

## Jurnal remediere
- **2026-10-27 — commit `01eab00` (prod LIVE, verificat e2e):**
  - #1/#2 Groq → `openai/gpt-oss-120b` → `qwen/qwen3.8-27b` → Gemini 3.5 Flash-Lite; „A doua parere” = Gemini 3.5 Flash-Lite (decizie Roland) prin `/api/ask` cu `preferModel: "second"`; `api/cerebras-opinion.js` sters.
  - #3 Diagnostic: raspuns in flux (`api/_stream.js`) + buget global de timp (`runChain`) + `thinkingBudget: 0`. Prod: 200 in 9,5 s (inainte 504).
  - #4/#5/#6 GitHub Models + grok-2-vision + gemini-2.5-pro-preview scoase; lant vision unic `visionSteps`: 2.5 Flash → 3.5 Flash-Lite → cheia 2 → Pixtral → Grok 4.3.
  - #7 12 Vercel Cron zilnice (verificat: `vercel crons run` → `/api/ping` stale:false) + GitHub workflow reactivat (rulare manuala: success).
  - #8 `ai-status` = stare reala din apeluri (`ai-health:*` in Redis); panou UI verde/portocaliu/rosu; cota numarata pe toti furnizorii.
  - #9/#10 `Roland.md` restaurat din git (decizie Roland); nota HF falsa eliminata.
  - #11 Plant.id apelat doar cand AI vision + Pl@ntNet au picat.
  - #13 `CLAUDE.md` actualizat (tabel API, env vars, cron, verificare modele).
  - Teste: 263/263 (rescrise pe router de fetch). CI GitHub verde. UI verificat cu Playwright (Intreaba + a doua parere, 0 erori consola).
- **Ramas / neverificat:**
  - #12 limite quota reale — doar in Google AI Studio (necesita login Roland). Guard-ul e oricum doar soft: la 429 lantul trece mai departe.
  - Pixtral + Grok 4.3 verificate cu cheile LOCALE (OK), nu cu cheile din Vercel (nu au fost atinse pe prod — apar „inca netestat” in panou pana la primul fallback real).
  - Vercel env `GITHUB_MODELS_TOKEN`, `CEREBRAS_API_KEY` (+ `SCALEWAY_API_KEY`, `OPENWEATHER_API_KEY`, nefolosite in cod) pot fi sterse — necesita confirmare Roland.
