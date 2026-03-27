# LIVADA MEA — Specificații Dashboard
# Document de referință pentru implementare Claude Code
# Generat: 26 martie 2026

---

## 1. CONTEXT PROIECT

### Ce este
Un **fișier HTML unic (single-file)** care servește ca centru de documentație pentru o livadă semi-comercială din zona Nădlac/Arad, România. Conține ghiduri detaliate de îngrijire pentru fiecare specie/soi de pom fructifer și arbust din livadă.

### Proprietar
Roland — profesor de matematică, zona Nădlac, Arad. Livadă cu 100+ pomi, 4–7 ani, abordare mixtă (bio + chimic la nevoie), semi-comercială.

### Echipamente disponibile
- Atomizor / vermorel
- Motocoasă
- Foarfece de tundere
- Fierăstrău de tundere

---

## 2. CERINȚE TEHNICE

### Arhitectură
- **Un singur fișier HTML** — fără server, fără framework extern, fără Vercel
- Tot CSS-ul și JS-ul inline în fișier
- Se deschide direct din browser (laptop sau Android)
- **PWA** — instalabil pe Android din browser, funcționează offline
- Service Worker inline (blob URL)
- Manifest inline (data URI base64)

### Compatibilitate
- Chrome Android (prioritar)
- Chrome/Edge desktop
- Safari iOS (secundar)
- **Testat obligatoriu pe ecran 360px lățime (Android mic)**

### Design
- Temă întunecată verde-livadă (vezi variabilele CSS din model)
- Font: Google Fonts — Playfair Display (titluri) + Source Sans 3 (body)
- Responsive — tabele cu scroll orizontal pe mobil
- Taburi scrollabile orizontal pe mobil
- Animații subtile la schimbare tab (fadeIn)

### Performanță
- Fișierul va fi mare (~300-500KB). Acceptabil pentru uz local.
- NU se face lazy loading — totul e în DOM, doar se afișează/ascunde cu display:none/block
- Căutare rapidă client-side (filter pe conținut) — opțional, poate fi adăugat ulterior

---

## 3. LISTA COMPLETĂ SPECII/SOIURI (17 tab-uri + 1 general)

### Tab-uri individuale (câte un tab per specie/soi):

| # | Tab ID | Nume tab | Emoji | Categorie |
|---|--------|----------|-------|-----------|
| 1 | rodiu | Rodiu | 🌿 | Exotic |
| 2 | cires | Cireș | 🍒 | Sâmburoase |
| 3 | visin | Vișin | 🫒 | Sâmburoase |
| 4 | cais | Cais | 🟠 | Sâmburoase |
| 5 | piersic | Piersic | 🍑 | Sâmburoase |
| 6 | prun | Prun | 🫐 | Sâmburoase |
| 7 | migdal | Migdal | 🥜 | Sâmburoase |
| 8 | par-clapp | Păr Favorita lui Clapp | 🍐 | Semințoase |
| 9 | par-williams | Păr Williams | 🍐 | Semințoase |
| 10 | par-hosui | Păr Hosui | 🍐 | Semințoase |
| 11 | par-napoca | Păr Napoca | 🍐 | Semințoase |
| 12 | mar-florina | Măr Florina (spalier + vas) | 🍎 | Semințoase |
| 13 | mar-golden-spur | Măr Golden Spur | 🍏 | Semințoase |
| 14 | alun | Alun Tufă | 🌰 | Nuci/alune |
| 15 | zmeur | Zmeur | 🔴 | Arbuști fructiferi |
| 16 | mur | Mur | ⚫ | Arbuști fructiferi |
| 17 | afin | Afin | 🔵 | Arbuști fructiferi |

### Tab special:
| # | Tab ID | Nume tab | Emoji |
|---|--------|----------|-------|
| 18 | plan-livada | Plan Livadă (General) | 📋 |

### Organizare tab-uri (ordine afișare):
Grupate vizual cu separatoare sau culori diferite:
1. **Plan general** — Plan Livadă
2. **Sâmburoase** — Cireș, Vișin, Cais, Piersic, Prun, Migdal
3. **Semințoase** — Păr Clapp, Păr Williams, Păr Hosui, Păr Napoca, Măr Florina, Măr Golden Spur
4. **Arbuști** — Zmeur, Mur, Afin
5. **Altele** — Alun Tufă, Rodiu

---

## 4. STRUCTURA CONȚINUT PER TAB

Fiecare tab de specie/soi conține **exact aceeași structură** (secțiuni):

### Secțiunea A — Cercetare completă (Research)
- Titlu: „Ghid complet [SPECIE] — Cercetare detaliată"
- Subtitlu cu sursele utilizate
- **Conținut generat de Claude.ai** (deep research tradus în română)
- Include: descriere generală, cerințe climatice, sol, expunere
- Specific zona Arad/Nădlac unde e relevant

### Secțiunea B — Calendar Tratamente Specific
- Tabel cu coloanele: Perioadă | Fază fenologică | Fungicid | Insecticid | Note
- **Specific acestei specii** (nu generic pentru toată livada)
- Doze ca concentrație % la 10L apă
- Marcaj special pentru tratamentele BIO vs chimice

### Secțiunea C — Ghid Tundere
- Forma de coroană recomandată (cu explicație)
- Tundere de formare (an cu an, primii 4-5 ani)
- Tundere de rodire (din anul 5+)
- Tundere în verde (vară)
- Rărire fructe (dacă se aplică)
- Greșeli frecvente de evitat

### Secțiunea D — Boli și Dăunători
- Lista bolilor principale cu simptome
- Lista dăunătorilor principali
- Metode de combatere (bio + chimic)
- **Alert boxes colorate** pentru amenințările critice

### Secțiunea E — Soiuri Recomandate (dacă e relevant)
- Tabel cu soiuri, caracteristici, rezistență
- Specific pentru zona de vest a României

### Secțiunea F — Protecție de Iarnă
- Specificități pentru zona Arad (continental)
- Metode de protecție adaptate speciei

### Secțiunea G — Note Practice
- Fertilizare specifică speciei
- Irigare
- Recoltare și păstrare
- Sfaturi de la sursele românești

---

## 5. STRUCTURA TAB „PLAN LIVADĂ" (GENERAL)

Acest tab conține informațiile transversale, valabile pentru toate speciile:

### Secțiunea I — Calendar Tratamente General
- Tabelul cu 11 perioade de stropire (feb–nov)
- Reguli importante (alternare substanțe, pauză securitate, etc.)
- Bolile principale pe specii (rezumat)

### Secțiunea II — Ghid Tundere General
- Principii generale valabile la toate speciile
- Tabel comparativ forme coroană pe specii
- Detalii per categorie (sâmburoase, semințoase)

### Secțiunea III — Plan Anual
- Calendar lunar de lucrări (12 luni)
- Fertilizare generală
- Irigare
- Protecție iarnă
- Cosit și întreținere sol

### Secțiunea IV — Surse și Referințe
- Lista surselor utilizate cu link-uri

---

## 6. COMPONENTE UI

### Header fix (sticky)
```
🌳 Livada Mea — Ghid Complet
100+ pomi • 17 specii/soiuri • Zona Nădlac/Arad • 2026
```

### Bara de taburi (sticky, sub header)
- Scrollabilă orizontal pe mobil
- Tab activ = verde accent + border bottom
- Grupare vizuală pe categorii (separatoare subtile sau culori diferite ale emoji)

### Secțiuni colapsabile (opțional)
- Fiecare secțiune majoră (A–G) poate fi colapsabilă cu click pe titlu
- Stare implicită: deschisă

### Alert boxes (4 tipuri)
- ✅ **success** (verde) — verdict pozitiv, sfat bun
- ⚠️ **warning** (galben) — atenționare
- 🚫 **danger** (roșu) — greșeală gravă, interdicție
- ℹ️ **info** (albastru) — informație utilă

### Tabele
- Header verde închis cu text alb
- Scroll orizontal pe mobil
- Hover pe rânduri
- Prima coloană bold + accent color

### Footer (la sfârșitul fiecărui tab)
- Surse utilizate (italic, gri)
- Disclaimer: „Consultă un specialist agronom pentru cazul tău specific"

---

## 7. CSS VARIABLES (TEMĂ)

```css
:root {
  --bg-deep: #0f1a0f;
  --bg-card: #1a2e1a;
  --bg-card-alt: #1f3520;
  --bg-surface: #243b24;
  --accent: #6abf69;
  --accent-dim: #3d7a3d;
  --accent-glow: #8adf89;
  --text: #d4e4d4;
  --text-dim: #8aaa8a;
  --text-bright: #eaf5ea;
  --warning: #e8a838;
  --danger: #d4534a;
  --info: #5a9fd4;
  --border: #2a4a2a;
  --radius: 12px;
}
```

---

## 8. CONȚINUT DEJA GENERAT (GATA DE INTEGRARE)

### 8.1 Tab Rodiu — COMPLET ✅

#### Cercetare (Rodiu_Research.md — în engleză, de tradus)
Fișier atașat: `Rodiu_Research.md`
- Sursă: deep research Claude.ai, 201 surse, 5m 51s
- Conține: bush form vs single trunk, pruning year-by-year, timing, 5 mistakes, sucker management, climate-adapted care, varieties
- **TREBUIE TRADUS ÎN ROMÂNĂ** și integrat ca Secțiunea A a tab-ului Rodiu

#### Rezumat/Ghid (Rodiu_Ghid_Tundere.docx — în română)
Fișier atașat: `Rodiu_Ghid_Tundere.docx`
- Conține: evaluare pom, formă tufă, pași tundere, când să tunzi (tabel), 5 greșeli, protecție iarnă, soiuri recomandate
- **GATA DE INTEGRARE** ca parte a tab-ului Rodiu

### 8.2 Tab Plan Livadă — COMPLET ✅

#### Plan Complet (Plan_Complet_Livada.docx — în română)
Fișier atașat: `Plan_Complet_Livada.docx`
Conține:
- Partea I: Calendar tratamente (11 perioade, tabel cu fungicid/insecticid/doze)
- Partea II: Ghid tundere pe specii (tabel comparativ + detalii per specie)
- Partea III: Plan anual (calendar lunar, fertilizare, irigare, protecție iarnă, cosit)
- Surse și referințe
- **GATA DE INTEGRARE**

### 8.3 Restul tab-urilor — DE GENERAT 🔄

Cercetarea pentru celelalte 16 specii/soiuri va fi generată de Claude.ai în conversații separate și livrată ca fișiere MD structurate.

**Ordinea prioritară de generare:**
1. Piersic (cel mai complex, bășicarea frunzelor)
2. Cais (monilioza — critic)
3. Prun
4. Cireș
5. Vișin
6. Măr Florina (spalier + vas — specific)
7. Măr Golden Spur
8. Păr Favorita lui Clapp
9. Păr Williams
10. Păr Hosui (soi japonez — specific)
11. Păr Napoca (soi românesc — specific)
12. Migdal (exotic pt România)
13. Zmeur
14. Mur
15. Afin (sol acid — specific)
16. Alun tufă

---

## 9. FIȘIERE DE INTRARE (ATAȘATE)

| Fișier | Conținut | Limbă | Status |
|--------|----------|-------|--------|
| `Rodiu_Research.md` | Cercetare completă rodiu | EN | De tradus RO |
| `Rodiu_Ghid_Tundere.docx` | Ghid tundere rodiu rezumat | RO | Gata |
| `Plan_Complet_Livada.docx` | Plan complet toate speciile | RO | Gata |
| `Import_Claude_Chat.md` | Transcript conversație Claude | RO | Referință |
| `Livada_Mea_Dashboard.html` | Model/simulare HTML | RO | Model de referință |
| `Rodiu.png` | Screenshot tab Rodiu | — | Referință vizuală |
| `Livada.png` | Fotografie livadă | — | Referință |

---

## 10. INSTRUCȚIUNI PENTRU CLAUDE CODE

### Pas 1: Creare structură HTML
- Copiază structura din `Livada_Mea_Dashboard.html` (model)
- Extinde la 18 tab-uri conform listei din Secțiunea 3
- Păstrează CSS variables, design, fonturi, responsive

### Pas 2: Integrare conținut existent
- Tab Rodiu: integrează conținutul din `Rodiu_Research.md` (TRADUS în română) + `Rodiu_Ghid_Tundere.docx`
- Tab Plan Livadă: integrează conținutul din `Plan_Complet_Livada.docx`

### Pas 3: Placeholder-uri pentru restul
- Fiecare tab necompletat primește un placeholder cu:
  - Emoji + numele speciei
  - Mesaj „Documentația detaliată va fi adăugată"
  - Lista secțiunilor planificate (A–G)
  - Alert box info cu conținutul planificat specific speciei

### Pas 4: PWA
- Service Worker inline (blob URL)
- Manifest inline (data URI base64)
- Banner instalare la prima vizită

### Pas 5: Funcționalități
- Tab switching cu JavaScript vanilla
- Scroll to top la schimbare tab
- Secțiuni colapsabile (opțional)
- Funcție de căutare în conținut (opțional, poate fi adăugată ulterior)

---

## 11. CONVENȚII DE COD

- **HTML semantic**: h2 pentru titluri secțiune, h3 pentru subsecțiuni, h4 pentru sub-subsecțiuni
- **CSS**: variabile CSS pentru toate culorile, fără culori hardcoded în HTML
- **JS**: vanilla JavaScript, fără biblioteci externe
- **Clase CSS standardizate**:
  - `.section` — container secțiune
  - `.section-title` — titlu secțiune (h2)
  - `.table-wrap` — wrapper tabel cu overflow
  - `.alert`, `.alert-success`, `.alert-warning`, `.alert-danger`, `.alert-info`
  - `.tab`, `.tab.active`
  - `.tab-content`, `.tab-content.active`
  - `.placeholder` — conținut placeholder

---

## 12. FLUX DE LUCRU VIITOR

```
Pas 1 (ACUM): Claude Code implementează structura + conținut existent
    ↓
Pas 2: Roland verifică și aprobă structura
    ↓
Pas 3: Claude.ai generează cercetare per specie (câte 1-2 pe conversație)
    ↓
Pas 4: Roland livrează fișierele MD către Claude Code
    ↓
Pas 5: Claude Code integrează conținutul în HTML
    ↓
Pas 6: Iterare până la completare (17 specii)
```

---

## 13. NOTE IMPORTANTE

1. **Cercetarea este făcută EXCLUSIV de Claude.ai** (deep research cu 100-200+ surse). Claude Code nu face cercetare — doar implementare.

2. **Limba**: Tot conținutul final trebuie să fie în **română**. Cercetarea în engleză se traduce.

3. **Single-file HTML**: TOTUL într-un singur fișier. Fără fișiere externe, fără assets separate, fără CDN-uri (cu excepția Google Fonts care e OK).

4. **Offline**: Odată încărcat, trebuie să funcționeze fără internet (PWA + toate datele inline).

5. **Doze tratamente**: Sunt orientative. Se include întotdeauna disclaimer-ul „Consultă eticheta produsului și un specialist agronom".

6. **Soiuri specifice** (Florina, Golden Spur, Clapp, Williams, Hosui, Napoca): Cercetarea va include informații specifice soiului, nu doar ale speciei. De ex. Măr Florina are rezistență naturală la rapăn — acest lucru schimbă schema de tratamente.

7. **Forme de conducere specifice**: Măr Florina va avea documentație DUBLĂ — atât pentru spalier cât și pentru vas, conform cerințelor lui Roland.

---

*Document generat de Claude.ai, 26 martie 2026*
*Pentru uz intern — proiect Livada Mea Dashboard*
