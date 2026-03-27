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

## 2026-03-27 T1 Sesiunea 2 — Cercetare directa (fara web search)
**Decizie:** Cercetarea A-G scrisa direct din cunostinte agronomice, fara web search extern
**Motiv:** Eficienta (11 specii in o sesiune), cunostinte suficient de profunde pentru nivel incepator. Sursele citate sunt reale dar neverificate in timp real.

## 2026-03-27 T1 Sesiunea 2 — Mar Florina dubla sectiune C1/C2
**Decizie:** Sectiunea C (Tundere) impartita in C1 (Spalier) si C2 (Vas) — doua sectiuni separate in acelasi tab
**Alternativa respinsa:** Tab separat pentru spalier vs vas — ar fi aglomerat tab bar-ul
**Motiv:** Roland a cerut documentatie dubla. Cele doua forme au portaltoi, distante si tehnici complet diferite.

## 2026-03-27 T1 Sesiunea 2 — Afin sectiune speciala acidifiere
**Decizie:** Sectiune SUPLIMENTARA dedicata acidifierii solului, intercalata intre A si B
**Motiv:** Solul din Nadlac e alcalin (pH 7-8), afinul moare fara acidifiere (pH 4-5.5). Este informatia cea mai critica pentru aceasta specie.

## 2026-03-27 T1 Sesiunea 2 — Flux executie paralel
**Decizie:** Agenti paraleli pentru MD files + integrare HTML secventiala de catre T1 principal
**Motiv:** Maximizare eficienta. MD files sunt independente (un agent per specie). HTML integration e secventiala (un fisier). API overload gestionat cu retry.

## 2026-03-27 T1 Sesiunea 3 — Node.js runtime (nu Edge)
**Decizie:** Toate API routes pe Node.js runtime, nu Edge Runtime
**Alternativa respinsa:** Edge Runtime — incompatibil cu undici (transitive dep din @vercel/blob si @upstash/redis)
**Motiv:** Edge nu suporta node:stream, net, http, tls. Node.js runtime e 100% compatibil. Cold start ~200ms e acceptabil pt dashboard personal.

## 2026-03-27 T1 Sesiunea 3 — @upstash/redis (nu @vercel/kv)
**Decizie:** Folosit @upstash/redis in loc de @vercel/kv
**Motiv:** @vercel/kv e deprecated oficial. Upstash Redis e replacement-ul recomandat. Env vars: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.

## 2026-03-27 T1 Sesiunea 3 — Species tools bar injectat dinamic
**Decizie:** Butoanele AI (Diagnostic, Intreaba, Galerie) sunt injectate dinamic in fiecare tab de specie la activare
**Alternativa respinsa:** HTML static in toate 17 tab-uri (ar fi adaugat ~500 linii repetitive)
**Motiv:** Un singur bloc JS care injecteaza la tab switch. Curat, DRY, usor de modificat.

## 2026-03-27 T1 Sesiunea 3 — Gemini 2.0 Flash pt diagnostic
**Decizie:** Model gemini-2.0-flash pentru diagnostic foto (nu gemini-pro-vision)
**Motiv:** Rapid, capabil multimodal, gratuit in limita free tier. Prompt structurat: diagnostic + severitate + tratament + preventie + urgenta.

## 2026-03-27 T1 Sesiunea 3 — Groq Llama 3.3 70B pt AI text
**Decizie:** Model llama-3.3-70b-versatile pe Groq pentru intrebari AI si raport anual
**Motiv:** Rapid (Groq = inferenta rapida), 70B calitate buna, gratuit pe free tier. Context din tab trimis de frontend (max 3000 chars).

## 2026-03-27 T1 Sesiunea 3 — KV/Blob necesita provisionare manuala
**Decizie:** Vercel KV (Upstash) si Vercel Blob se provisioneaza manual din Vercel Dashboard → Storage
**Impact:** Fara KV: sync jurnal/meteo/alerte nu functioneaza (features locale OK). Fara Blob: galerie foto nu functioneaza.
**Pasi:** Dashboard → Storage → Create Database (Redis) + Create Blob Store → Connect to livada-mea

## 2026-03-27 T1 Sesiunea 3 — Securitate API (post-audit T2)
**Decizie:** Token auth (LIVADA_API_TOKEN) + CORS restrict + rate limiting 10 req/min
**Alternativa respinsa:** OAuth/JWT — overkill pt single-user dashboard
**Motiv:** T2 a identificat CRITIC-3 (API publice fara auth). Token simplu blocheaza abuz automat. CORS restrict blocheaza cross-origin. Rate limit protejaza free tier.

## 2026-03-27 T1 Sesiunea 3 — XSS sanitize AI responses (post-audit T2)
**Decizie:** sanitizeAI() — escape HTML inainte de markdown formatting
**Motiv:** T2 a identificat CRITIC-4. Raspunsuri AI pot contine HTML via prompt injection. Escape text INAINTE de replace markdown previne executie cod.

## 2026-03-27 T1 Sesiunea 3 — SW cache v3 (post-audit T2)
**Decizie:** Cache bumped la livada-v3, Google Fonts cached in SW separat (livada-fonts-v1)
**Motiv:** T2 a identificat IMP-10 (users vechi nu vad features noi) si IMP-1 (Google Fonts offline). Activate event sterge cache-uri vechi automat.
