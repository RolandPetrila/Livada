# LOG DECIZII — Livada Mea Dashboard

---

## 2026-03-27 — Decizia initiala cercetare
**Context:** Test comparativ Cais (Claude Code vs Claude.ai deep research)
**Variante:** V1 Claude Code face tot, V2 Claude.ai face tot, V3 Mixt
**Decizie:** V1 — Claude Code face TOATA cercetarea, imbogatita cu stil Claude.ai
**Motiv:** Claude Code e mai profund tehnic, iar lipsa soiurilor locale si limbajul se pot compensa.
**Sursa:** Comparatie directa Cercetare_Cais_ClaudeCode.md vs Cercetare_Cais_ClaudeResearch.md

## 2026-03-27 — Arhitectura
**Decizie:** Single HTML (frontend offline) + Vercel API routes (backend)
**Motiv:** Roland vrea fisier simplu, robust. Features avansate (AI, sync) prin Vercel.

## 2026-03-27 — Hosting
**Decizie:** Vercel (nu GitHub Pages)
**Motiv:** Necesita API routes (Edge Runtime), cron jobs, KV, Blob. GitHub Pages = doar static.

## 2026-03-27 — Mod executie
**Decizie:** AUTONOM (nu pas cu pas)
**Motiv:** Roland prefera executie rapida, intervine doar la decizii majore.

## 2026-03-27 — Deploy
**Decizie:** AUTO (commit + push + vercel --prod dupa fiecare sprint)

## 2026-03-27 — Buget
**Decizie:** ZERO costuri — toate serviciile pe plan gratuit

## 2026-03-27 — Prioritati UX
**Decizie:** Android-first + Offline-first + Romana 100%
**Detalii:** Tab structure regandita pt incepatori, selectii clare si vizibile, touch-first.

## 2026-03-27 T1 — Structura tools (Calculator/Jurnal/Calendar/Meteo)
**Decizie:** Bottom bar cu 5 butoane care deschid modal panels (slide-up)
**Alternativa respinsa:** Tab-uri separate pentru tools — ar fi aglomerat tab bar-ul
**Motiv:** UX Android-native, nu interfereaza cu navigarea pe specii, acces rapid la orice tool.

## 2026-03-27 T1 — Service Worker si Manifest
**Decizie:** Fisiere separate (public/sw.js, public/manifest.json) in loc de inline blob URL
**Motiv:** Suntem pe Vercel, nu single-file local. SW separat e mai fiabil cross-browser.

## 2026-03-27 T1 — Export PDF
**Decizie:** window.print() cu @media print CSS
**Alternativa respinsa:** Biblioteca jsPDF (adauga ~200KB, dependinta externa)
**Motiv:** Zero dependente externe. Print nativ functioneaza pe toate browserele.

## 2026-03-27 T1 — Meteo API Key
**Decizie:** API key salvat in localStorage cu prompt de setup
**Motiv:** Nu expunem chei in cod sursa. Utilizatorul introduce propria cheie gratuita.

## 2026-03-27 T1 — Dark/Light mode
**Decizie:** CSS variables override pe body.light-mode, persisted in localStorage
**Motiv:** Simplu, instant, fara flash la reload.

## 2026-03-27 T1 — Vercel project name
**Decizie:** livada-mea (URL: livada-mea-psi.vercel.app)
**Motiv:** Nume scurt, descriptiv. URL poate fi schimbat ulterior cu custom domain.
