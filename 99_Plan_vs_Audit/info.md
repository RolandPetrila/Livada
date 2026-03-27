# VIZIUNEA PROIECTULUI — Livada Mea Dashboard

## CE CONSTRUIM
Un dashboard PWA (Progressive Web App) care centralizeaza TOATA documentatia si uneltele practice pentru o livada semi-comerciala din Nadlac, judetul Arad.

## PENTRU CINE
Roland Petrila — profesor de matematica, livada cu 100+ pomi, 17 specii/soiuri, 4-7 ani.
Nivel pomicultura: intermediar. Nivel tech: avansat (Claude MAX, Vercel, GitHub).
Dashboard-ul trebuie sa fie inteles si de un INCEPATOR ABSOLUT in pomicultura.

## CERINTE CHEIE
- **Android-first**: Prioritate maxima pentru utilizare pe telefon Android
- **Offline-first**: Documentatia functioneaza 100% fara internet
- **Limba 100% romana**: Tot UI-ul, mesajele, alertele
- **Zero costuri**: Toate serviciile pe plan gratuit
- **PWA instalabil**: Se instaleaza ca aplicatie pe Android din browser

## ARHITECTURA
- **Frontend**: Single HTML file cu tot inline (CSS, JS, date) — functioneaza offline
- **Backend**: Vercel API routes (Edge Runtime) — doar pentru features avansate (AI, sync, push)
- **Hosting**: Vercel (cont existent, CLI instalat)
- **Repo**: GitHub — https://github.com/RolandPetrila/Livada.git

## SPECII (17 + 1 tab general)
Cires, Visin, Cais, Piersic, Prun, Migdal, Par Clapp, Par Williams, Par Hosui, Par Napoca,
Mar Florina (spalier+vas), Mar Golden Spur, Alun tufa, Zmeur, Mur, Afin, Rodiu.
+ Tab Plan Livada (general, transversal)

## FEATURES (3 niveluri)
**Nivel 1 (static)**: PWA, calendar alerte, calculator doze, cautare, jurnal local, meteo, dark/light, export PDF
**Nivel 2 (Vercel API)**: Sync dispozitive, push notifications, galerie foto, istoric meteo, alerta ingheturi
**Nivel 3 (AI)**: Identificare boli din poza (Claude Vision/Gemini Vision), calendar inteligent, raport anual

## CONTINUT DISPONIBIL
- Rodiu: cercetare EN (de tradus) + ghid RO
- Plan Livada: complet RO (calendar tratamente + tundere + plan anual)
- Cais: doua cercetari (Claude Code + Claude.ai) — de combinat
- Prototip HTML: 7 taburi, design verde-livada, PWA basic

## DECIZIE CERCETARE
Claude Code face TOATA cercetarea pentru cele 16 specii ramase, imbogatita cu:
limbaj accesibil, soiuri locale, TOP greseli, calendar lunar, semne carenta.

## DEPLOY
Auto: commit + push + vercel --prod dupa fiecare sprint finalizat.

## PLAN DETALIAT
Vezi: PLAN_v3.md (adaptat din planul aprobat jazzy-twirling-sky.md)
