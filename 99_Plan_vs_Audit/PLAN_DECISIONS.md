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
