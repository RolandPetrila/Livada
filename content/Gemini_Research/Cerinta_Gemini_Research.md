# CERINTA GEMINI CLI — Cercetare Completa Sectiuni I-Z per Specie

# Proiect: Livada Mea Dashboard — Nadlac, jud. Arad

---

## INSTRUCTIUNE DE EXECUTIE

Citeste acest fisier complet inainte de a incepe orice actiune.
Executa toate fazele in ordine. Nu sari niciun pas.
Livreaza TOATE fisierele in folderul: `c:\Proiecte\Livada\content\Gemini_Research\`
NU modifica, NU sterge, NU atinge fisierele din `c:\Proiecte\Livada\content\` (cele fara prefix `Gemini_`).

---

> **Important instructions before you start:**
>
> - All information must be based on real, verifiable sources (scientific literature, agricultural extension services, Romanian pomiculture research, INCDP Pitesti-Maracineni publications, FAO data, peer-reviewed studies).
> - Do NOT invent data, dates, prices, or quantities. If you are uncertain about a specific value, mark it explicitly as **[ESTIMAT - necesita verificare]** and explain why.
> - For phenology dates specific to Nadlac/western Romania plain, use data from the closest meteorological stations (Arad, Timisoara) or interpolate from known data — never fabricate.
> - For prices (Section L), use only real market data from Romania 2024-2025. If unavailable, mark **[PRET NECUNOSCUT - cerceteaza piata locala]**.
> - **Depth over speed:** it is better to deliver one complete, accurate species file than five shallow ones.
> - If you cannot find reliable data for a subsection, write: **[DATE INSUFICIENTE — recomandat cercetare suplimentara]** and move on.

> **Format output obligatoriu — NU include urmatoarele (se aplica la TOATE fisierele livrate):**
>
> - NU adauga header cu titlul speciei, zona, data generarii, status DRAFT sau fisier sursa la inceputul fisierului
> - NU adauga linii de tip `_DRAFT generat de Gemini CLI_`, `_Nu integra direct_` sau orice avertisment de validare
> - NU adauga linii de tip `> **Revizuit Faza X:**` sau orice meta-informatie despre executie
> - NU adauga intro generic ("Cireșul este o specie importantă...") inainte de prima sectiune — incepe direct cu `## I.`
> - NU duplica informatii deja prezente in sectiunile A-H ale fisierului sursa
> - Fisierul livrat trebuie sa inceapa direct cu prima sectiune: `## I. IRIGARE SI NECESAR DE APA — SPECIFIC NADLAC`
> - Fisierul livrat trebuie sa se termine cu ultima sectiune `## Y.` fara footer, fara semnatura, fara nota finala

---

## CONTEXT PROIECT

**Proprietar:** Roland Petrila
**Livada:** Semi-comerciala, 100+ pomi, 20 specii/soiuri
**Locatie:** Nadlac, judetul Arad, Romania
**Coordonate zona:**

- Altitudine: 88 metri
- Relief: Campia de Vest (teren complet plat, fara denivelari)
- Climat: Continental cu influente pannonice (vecin cu Ungaria)
- Precipitatii medii: ~540 mm/an, distributie inegala (mai-iunie umede, iulie-august secetoase)
- Temperatura: ierni moderate (-10 la -15°C ocazional, rar sub -18°C), veri calde (35°C frecvent)
- Sol: Cernoziom (sol negru, fertil, drenaj bun) — specific Campia de Vest
- Vant: frecvent, campie deschisa fara protectie naturala
- Primavara: cu 1-2 saptamani mai devreme decat media nationala (Cluj, Iasi)
- Piata locala: Nadlac + Arad + zona de frontiera Ungaria

**Nivel utilizator:** Incepator-mediu in pomicultura. Limbaj accesibil, concret, practic.
**Scopul documentatiei:** Sa fie utila pe teren, pe telefon, in timp real — nu un tratat academic.

---

## FISIERE DE REFERINTA (citeste-le inainte de a scrie)

Inainte de a genera cercetarea pentru o specie, citeste fisierul ei existent:

- `c:\Proiecte\Livada\content\[Specie].md` — contine sectiunile A-H deja scrise
- Sectiunile I-Z pe care le generezi trebuie sa fie COERENTE cu ce e scris in A-H
- De exemplu: daca sectiunea E mentioneaza soiurile din livada, sectiunea J trebuie sa le foloseasca

---

## SARCINA

Genereaza **18 sectiuni (I pana la Z, exclusiv Z)** pentru fiecare din cele **20 de specii** de mai jos.
**Sectiunea Z (Glosar)** este comuna — un singur fisier pentru toate speciile.

Livreaza in `c:\Proiecte\Livada\content\Gemini_Research\`.
Daca exista deja un fisier `Gemini_[Specie]_IZ.md` — actualizeaza-l, nu-l suprascrie cu continut mai putin complet.

**Nume fisiere output:**

```
Gemini_Afin_IZ.md
Gemini_Alun_IZ.md
Gemini_Cais_IZ.md
Gemini_Cires_IZ.md
Gemini_Kaki_IZ.md
Gemini_Mar_Florina_IZ.md
Gemini_Mar_Golden_Spur_IZ.md
Gemini_Migdal_IZ.md
Gemini_Mur_IZ.md
Gemini_Mur_Copac_IZ.md
Gemini_Par_Clapp_IZ.md
Gemini_Par_Hosui_IZ.md
Gemini_Par_Napoca_IZ.md
Gemini_Par_Williams_IZ.md
Gemini_Piersic_IZ.md
Gemini_Prun_IZ.md
Gemini_Rodiu_IZ.md
Gemini_Visin_IZ.md
Gemini_Zmeur_IZ.md
Gemini_Zmeur_Galben_Remontant_IZ.md
Gemini_Glosar_Pomicol_Z.md
```

---

## LISTA SPECII

1. Afin (Vaccinium corymbosum)
2. Alun (Corylus avellana)
3. Cais (Prunus armeniaca)
4. Cires (Prunus avium)
5. Kaki Rojo Brillante (Diospyros kaki cv. Rojo Brillante)
6. Mar Florina (Malus domestica cv. Florina)
7. Mar Golden Spur (Malus domestica cv. Golden Spur)
8. Migdal (Prunus dulcis)
9. Mur (Rubus fruticosus — forma tufar)
10. Mur Copac (Rubus fruticosus — forma arbore/standard)
11. Par Clapp (Pyrus communis cv. Clapp's Favorite)
12. Par Hosui (Pyrus pyrifolia cv. Hosui — par asiatic/nashi)
13. Par Napoca (Pyrus communis cv. Napoca)
14. Par Williams (Pyrus communis cv. Williams Bon Chretien)
15. Piersic (Prunus persica)
16. Prun (Prunus domestica)
17. Rodiu (Punica granatum)
18. Visin (Prunus cerasus)
19. Zmeur (Rubus idaeus — soi standard, o recolta/an)
20. Zmeur Galben Remontant (Rubus idaeus cv. galben — doua recolte/an)

---

## STRUCTURA OBLIGATORIE A FIECARUI FISIER OUTPUT

```markdown
# [DENUMIRE SPECIE] ([Denumire stiintifica]) — Sectiuni I-Z

# Zona: Nadlac, jud. Arad, 88m, Campia de Vest

# Generat: [data] | Status: DRAFT — necesita validare Claude Code

# Fisier sursa citit: c:\Proiecte\Livada\content\[Specie].md

---
```

Urmat de sectiunile I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y in ordine.

---

## DEFINITII COMPLETE ALE SECTIUNILOR

---

### SECTIUNEA I — Irigare si Necesar de Apa (SPECIFIC NADLAC)

**Scop:** Sa spuna exact cat si cand se uda aceasta specie la Nadlac, in contextul secetei de vara.

**Continut obligatoriu:**

1. **Clasificare generala a speciei la seceta:** (toleranta / moderata / pretentioasa) + justificare bazata pe surse

2. **Tabel necesar de apa:**

| Perioada    | Fenofaza   | Frecventa udare | Litri/pom/udare | Importanta           |
| ----------- | ---------- | --------------- | --------------- | -------------------- |
| [luna-luna] | [fenofaza] | [x/saptamana]   | [X litri]       | [CRITICA/MEDIE/MICA] |

- Acoperire obligatorie: Aprilie — Octombrie
- Marcheaza EXPLICIT perioadele CRITICE
- Marcheaza EXPLICIT perioadele cand NU se uda si de ce

3. **Perioade critice detaliate** (minim 2) — consecinte concrete, cu sursa daca posibil

4. **Metoda recomandata la Nadlac** (teren plat, fara panta):
   - Picurare vs aspersiune vs irigare la baza — argumentat
   - Consideratii specifice Campiei de Vest (vant, evapotranspiratie mare vara)

5. **Semne vizuale de stres hidric** — descriere concreta, vizuala:
   - Sete: ce vezi pe frunze, fructe, lastari
   - Exces de apa: ce vezi (atentie — simptomele se confunda cu carenta de azot)

6. **Referinta contextuala Nadlac:** precipitatii ~540mm/an, seceta iulie-august, cernoziom drenaj bun

---

### SECTIUNEA J — Polenizare si Soiuri Compatibile

**Scop:** Sa clarifice exact daca specia produce singura sau are nevoie de ajutor, si de la cine.

**Continut obligatoriu:**

1. **Statut autofertilitate** (scrie clar):
   - AUTOFERTILA / PARTIAL AUTOFERTILA (cu X% diferenta) / AUTOSTERILA

2. **Daca autosterila sau partial autofertila:**

| Soi polenizator | Compatibil cu | Inflorire | Disponibil Romania? |
| --------------- | ------------- | --------- | ------------------- |

- Verifica compatibilitatea dintre soiurile din livada Roland:
  - Peri: Par Clapp, Par Williams, Par Hosui, Par Napoca
  - Meri: Mar Florina, Mar Golden Spur
  - Ciresi: soiuri multiple (citeste Cires.md)
- Mentioneaza incompatibilitatile cunoscute cu sursa

3. **Grupe de incompatibilitate** — fii precis cu DA/NU (important la Par si Cires)

4. **Distanta maxima eficienta de polenizare:** X metri (cu sursa)

5. **Perioada de inflorire la Nadlac** — calibrata pentru 88m, Campia de Vest:
   - Se suprapune cu soiurile polenizatoare?

6. **Polenizatori naturali** in zona: albine, bondari, vant

7. **Sfat practic** pentru situatia "am un singur pom autosteril" — minim 2 optiuni concrete

---

### SECTIUNEA K — Recoltare, Conditionare si Depozitare

**Scop:** De la "fructul e pe pom" la "fructul e vandut sau depozitat corect."

**Continut obligatoriu:**

1. **Indicatori de maturitate COMERCIALA** (nu biologica):
   - Culoare, fermitate, desprindere, aroma — descrieri vizuale/tactile concrete

2. **Tabel destinatii recoltare:**

| Destinatie               | Maturitate la recoltare | Observatii |
| ------------------------ | ----------------------- | ---------- |
| Consum imediat           | [%]                     |            |
| Piata locala (2-3 zile)  | [%]                     |            |
| Depozitare 1-2 saptamani | [%]                     |            |
| Procesare                | [%]                     |            |

3. **Tehnica de recoltare** specifica — miscarea corecta, ce se deterioreaza daca gresesti, dimineata vs seara

4. **Depozitare** — durate REALISTE (nu valori de laborator):

| Conditii            | Temperatura | Durata realista | Note |
| ------------------- | ----------- | --------------- | ---- |
| Temperatura camerei | 20°C        | [X zile]        |      |
| Pivnita             | 10-15°C     | [X zile/sapt]   |      |
| Frigider            | 2-4°C       | [X sapt]        |      |
| Congelator          | -18°C       | [X luni]        |      |

5. **Transport:** Suporta 30-40 km pana la piata Arad? DA / NU / Cu conditii
6. **Conditionare pentru piata:** spalare (da/nu/cand), ambalare, cantitate per ambalaj
7. **Semne de deteriorare:** ce nu mai e vandabil dar merge la procesare

---

### SECTIUNEA L — Rentabilitate si Piata Locala Nadlac

**Scop:** Valoarea comerciala a speciei si ce face Roland cu productia.

**Continut obligatoriu:**

1. **Preturi orientative piata Arad/Romania 2024-2025** — NUMAI date reale:

| Forma                  | Pret orientativ | Unitate      | Sursa                     |
| ---------------------- | --------------- | ------------ | ------------------------- |
| Proaspat (piata)       | X-Y lei         | /kg          | [CERT/ESTIMAT/NECUNOSCUT] |
| Dulceata artizanala    | X lei           | /borcan 400g |                           |
| Uscat/deshidratat      | X lei           | /kg          |                           |
| [Alta forma relevanta] |                 |              |                           |

2. **Productivitate realista per pom** — valori practice (ingrijire medie, nu maxim teoretic):
   - Pom tanar 3-5 ani: X-Y kg
   - Pom adult 6-10 ani: X-Y kg
   - Pom matur 10+ ani: X-Y kg

3. **Analiza valorificare:** Proaspat vs procesat — care aduce mai mult venit net si de ce

4. **Pozitionare piata locala Nadlac/Arad:**
   - Cerere: MARE / MEDIE / MICA
   - Concurenta: MULTA / MODERATA / PUTINA
   - Specie rara local? DA (potential premium) / NU
   - Cerere transfrontaliera Ungaria: DA / NU / POSIBIL

5. **Cost orientativ tratamente anuale:** X-Y lei/pom/an (produse standard Romania)
6. **Recomandare strategica:** Merita extins numarul de pomi? Argumentat.

---

### SECTIUNEA M — Fenologie Calibrata Nadlac

**Scop:** Date REALE de inflorire/recoltare pentru Nadlac (88m, Campia de Vest).

**Surse acceptate:** Date meteorologice statia Arad sau Timisoara; publicatii INCDP Pitesti-Maracineni; date fenologice din studii pentru zona de campie vestică.

**Continut obligatoriu:**

1. **Tabel fenologic calibrat pentru Nadlac:**

| Fenofaza              | Data medie Nadlac        | Variatie normala | Fata de media nationala |
| --------------------- | ------------------------ | ---------------- | ----------------------- |
| Umflarea mugurilor    | [data]                   | ± X zile         | cu X zile mai devreme   |
| Inflorire inceput     | [data]                   | ± X zile         |                         |
| Inflorire deplina     | [data]                   | ± X zile         |                         |
| Sfarsit inflorire     | [data]                   | ± X zile         |                         |
| Legarea fructului     | [data]                   | ± X zile         |                         |
| Crestere activa fruct | [perioada]               |                  |                         |
| Incepere coacere      | [data]                   | ± X zile         |                         |
| Maturitate comerciala | [data]                   | ± X zile         |                         |
| Recoltare (interval)  | [data inceput — sfarsit] |                  |                         |
| Cadere frunze         | [data]                   | ± X zile         |                         |

- Nadlac este cu ~1-2 saptamani mai devreme decat Cluj/Iasi
- Daca nu ai date exacte pentru Nadlac: foloseste date Arad/Timisoara si marcheaza [APROXIMAT zona similara]
- NICIODATA nu fabrica date fenologice

2. **Risc inghet primavara la Nadlac:**
   - Probabilitate estimata de inghet dupa inflorire (sursa: date climatice zona)
   - Temperatura critica pentru mugurii de floare: [X°C] (cu sursa)
   - Ultimul inghet de primavara mediu la Nadlac: [data]

3. **Implicatii pentru tratamente:**
   - Cu cat mai devreme fata de calendarul national standard
   - Exemple concrete cu date ajustate

4. **Termometru biologic** — minim 2 indicatori naturali specifici zonei de campie

5. **Ajustare pentru ani atipici:**
   - Primavara timpurie (>10°C in februarie): ce adaptezi
   - Primavara tarzie (ger persistent in aprilie): ce masuri iei

---

### SECTIUNEA N — Inmultire si Propagare

**Scop:** Cum inmulteste Roland singur pomii/tufele pentru extinderea livezii.

**Continut obligatoriu:**

1. **Tabel metode de inmultire:**

| Metoda                   | Dificultate       | Rata succes | Cel mai bun moment | Echipament necesar |
| ------------------------ | ----------------- | ----------- | ------------------ | ------------------ |
| Altoire                  | [Mica/Medie/Mare] | [X]%        | [luna]             |                    |
| Butasi lignificati       |                   |             |                    |                    |
| Butasi verzi             |                   |             |                    |                    |
| Marcotaj                 |                   |             |                    |                    |
| Drajoni (daca aplicabil) |                   |             |                    |                    |
| Seminte (franc)          |                   |             |                    |                    |

2. **Metoda RECOMANDATA pentru Roland** — pas cu pas, cu greseli frecvente

3. **Altoire** (daca aplicabila):
   - Tipul recomandat (copulatie, despicatura, chip budding etc.)
   - Portaltoi compatibili disponibili in Romania
   - Avantaje semipitic vs franc pentru 100 pomi
   - Momentul exact la Nadlac (primavara timpurie)

4. **Durata pana la prima productie** — planta inmultita acasa vs cumparata din pepiniera

5. **Soiuri protejate (PVP):** exista in lista livadei Roland soiuri care nu pot fi inmultite fara licenta? Care anume?

---

### SECTIUNEA O — Managementul Solului si Erbicidare

**Scop:** Cum mentine Roland solul sanatos pe cernoziom plat la Nadlac.

**Continut obligatoriu:**

1. **Cernoziomul Nadlac si aceasta specie:**
   - pH optim al speciei vs pH tipic cernoziom (~7.0-7.8)
   - Necesita amendamente? (sulf pentru afin, var pentru altele)
   - Textura sol recomandata vs ce are Nadlac

2. **Gestionarea ierbii si buruienilor:**

| Metoda                          | Aplicabilitate | Pro | Contra |
| ------------------------------- | -------------- | --- | ------ |
| Cosit mecanic                   |                |     |        |
| Mulci organic (paie, scoarta)   |                |     |        |
| Mulci textil (agrotextil negru) |                |     |        |
| Cover crop                      |                |     |        |
| Erbicide selective              |                |     |        |
| Cultivare mecanica (freza)      |                |     |        |

3. **Cover crops recomandate** intre randuri — ce planta, ce eviti (alelopatice negative), impactul pe umiditate

4. **Mulcire:**
   - Material recomandat, grosime, raza in jurul pomului
   - Cand SE aplica si cand NU (ex: nu mulci tarziu toamna daca favorizeaza soarecii)

5. **Fertilizarea solului pe termen lung:**
   - Rotatie ingrasamant organic — la cati ani, cat cantitate
   - Analize de sol: ce parametri, cat de des, unde face Roland analiza in zona Arad

6. **Semne vizuale de sol obosit** pentru aceasta specie

---

### SECTIUNEA P — Adaptare la Schimbari Climatice

**Scop:** Cum va fi afectata specia in urmatorii 10-20 ani la Nadlac.

**Surse obligatorii:** Date IPCC pentru Europa Centrala, rapoarte ANPM Romania, publicatii climatice pentru Campia Panonica.

**Continut obligatoriu:**

1. **Tendinte climatice confirmate pentru Campia de Vest** (date reale, cu sursa):
   - Temperatura medie: tendinta masurata
   - Precipitatii: tendinta
   - Fenomene extreme: frecventa modificata

2. **Impact specific pe aceasta specie la Nadlac:**

| Schimbare climatica    | Impact concret | Gravitate        | Orizont |
| ---------------------- | -------------- | ---------------- | ------- |
| Ierni mai calde        |                | [Mic/Mediu/Mare] | [ani]   |
| Veri mai secetoase     |                |                  |         |
| Primaveri mai timpurii |                |                  |         |
| Ploi torentiale        |                |                  |         |
| Grindina mai frecventa |                |                  |         |

3. **Oportunitati:** specii/soiuri noi care devin fezabile la Nadlac in urmatorii 20 ani

4. **Adaptari recomandate ACUM** — actiuni concrete cu justificare

5. **Resurse de monitorizare** climatica gratuite pentru Romania (site-uri reale, verificate)

---

### SECTIUNEA Q — Combinatii, Asocieri si Layout in Livada

**Scop:** Cum integreaza Roland aceasta specie optim in livada de 100+ pomi.

**Continut obligatoriu:**

1. **Specii BENEFICE in vecinatate:**

| Specie vecina | Beneficiu concret | Distanta recomandata |
| ------------- | ----------------- | -------------------- |

2. **Specii DE EVITAT:**

| Specie vecina | Problema concreta | Distanta minima |
| ------------- | ----------------- | --------------- |

3. **Plante de insotire benefice** — flori pentru polenizatori, ierburi care resping daunatori, ce NU planta la baza

4. **Pozitionare optima la Nadlac** (teren plat, vant din vest):
   - Orientare rand: Nord-Sud vs Est-Vest — argumentat pentru aceasta specie
   - Distante intra-rand si inter-rand recomandate
   - Pozitia fata de perdea de vant

5. **Compatibilitate sisteme mixte:**
   - Gaini libere sub pomi: beneficiu/risc pentru aceasta specie
   - Apicultura integrata: necesita precautii speciale la tratamente?

---

### SECTIUNEA R — Echipamente si Unelte

**Scop:** Ce are nevoie Roland concret pentru ingrijirea corecta la 100+ pomi.

**Continut obligatoriu:**

1. **Toolkit minim obligatoriu:**

| Unealta | Utilizare | Cost orientativ (lei) | Prioritate                  |
| ------- | --------- | --------------------- | --------------------------- |
|         |           |                       | [OBLIGATORIU/UTIL/OPTIONAL] |

2. **Echipament SPECIFIC acestei specii** — ce nu e necesar la alte specii si de ce

3. **Scalare la 100+ pomi:**
   - Ce operatii devin problematice manual
   - Ce echipamente se justifica (atomizor, scuturator, coser mecanic)
   - Ce se inchiriaza vs cumpara

4. **Intretinere unelte** — dezinfectie (obligatorie la cires/migdal), ascutire, depozitare

5. **Alternative DIY** pentru unelte scumpe

---

### SECTIUNEA S — Procesare Detaliata si Retete

**Scop:** Cum transforma Roland productia in produse cu valoare adaugata.

**Continut obligatoriu:**

1. **Tabel produse posibile:**

| Produs                    | Dificultate | Echipament | Valoare adaugata | Recomandat? |
| ------------------------- | ----------- | ---------- | ---------------- | ----------- |
| Consum proaspat           | Mica        | —          | Mica             | DA          |
| Dulceata                  |             |            |                  |             |
| Compot                    |             |            |                  |             |
| Uscare/deshidratare       |             |            |                  |             |
| Congelare                 |             |            |                  |             |
| Suc/nectar                |             |            |                  |             |
| Lichior/distilat          |             |            |                  |             |
| [Produs specific speciei] |             |            |                  |             |

2. **Reteta detaliata pentru FIECARE produs recomandat** (format obligatoriu):

```
### [Produs] din [Specie]

Cantitate: X kg fructe → Y borcane/kg produs final
Moment optim: [relatie cu recoltarea]
Durabilitate: [cat se pastreaza]

Ingrediente: [lista completa cu cantitati]
Echipament: [ce ai nevoie]

Procedura pas cu pas:
1. [pas]
2. [pas]

Semne de reusita: [cum stii ca a iesit bine]
Greseli frecvente: [ce strica reteta]
```

3. **Procesare la scara semi-comerciala** — ce se schimba la 50kg vs 5kg, echipament necesar, timp estimat

---

### SECTIUNEA T — Vanzare Legala si Certificare in Romania

**Scop:** Ce trebuie sa stie Roland ca sa vanda legal.

**Surse:** Legislatie Romania actualizata 2024-2025, site ANSVSA, APIA, MADR.

**Continut obligatoriu:**

1. **Forme legale de vanzare pentru producator individual Romania:**

| Forma                              | Ce permite | Ce necesita | Cost aproximativ |
| ---------------------------------- | ---------- | ----------- | ---------------- |
| Vanzare directa la poarta/livada   |            |             |                  |
| Stand la piata Arad                |            |             |                  |
| Catre procesatori/fabrici          |            |             |                  |
| Magazine/restaurante               |            |             |                  |
| Online (OLX, Facebook Marketplace) |            |             |                  |

2. **Documente necesare** — carnet de producator, fisa ANSVSA, ce e obligatoriu vs recomandat, unde se obtine, cost, valabilitate

3. **Etichetare obligatorie** pentru aceasta specie — informatii obligatorii, mentiuni speciale (alergeni la alune/migdale)

4. **Certificare bio:** fezabila pentru Roland?
   - Organisme de certificare Romania, costuri reale, durata conversie
   - Pret premium obtinut: merita la 100 pomi?
   - Alternativa "fara chimie" fara certificat — cum comercializezi legal

5. **Legislatie specifica** acestei specii (distilat alcool, material saditor, etc.)

---

### SECTIUNEA U — Interactiuni cu Fauna

**Scop:** Ce animale si insecte afecteaza aceasta specie la Nadlac si cum gestionezi echilibrul.

**Continut obligatoriu:**

1. **Fauna BENEFICA:**

| Animal/Insecta | Beneficiu concret | Cum atragi prezenta |
| -------------- | ----------------- | ------------------- |

2. **Fauna DAUNATOARE** (specifica acestei specii la Nadlac):

| Animal | Dauna concreta | Amploare | Metode non-chimice | Metode chimice |
| ------ | -------------- | -------- | ------------------ | -------------- |

3. **Pasari** (detaliat — major issue la cires, afin, zmeur):
   - Ce specii ataca la Nadlac/Arad
   - Solutii non-letale: plasa, reflectoare, sunet — eficienta REALA pe termen lung

4. **Rozatoare** — daune caracteristice, sezon de risc, protectie mecanica (tip, material, inaltime)

5. **Insecte polenizatoare** — conditii pentru polenizatori la Nadlac, impact tratamente chimice

6. **Fauna de sol** — ramelele si fauna benefica, cum le protejezi

---

### SECTIUNEA V — Plan Multianual si Calendar de Investitii

**Scop:** Ce face Roland an de an de la plantare pana la ROI.

**Continut obligatoriu:**

1. **Cronologia plantat → productie plina:**

| An       | Varsta  | Activitati principale | Productie estimata     | Investitie estimata (lei/pom) |
| -------- | ------- | --------------------- | ---------------------- | ----------------------------- |
| Anul 1   | Plantat |                       | 0                      |                               |
| Anul 2   | 1 an    |                       | 0/mica                 |                               |
| Anul 3   | 2 ani   |                       | mica                   |                               |
| Anul 4   | 3 ani   |                       | medie                  |                               |
| Anul 5   | 4 ani   |                       | medie-mare             |                               |
| Ani 6-10 | Matur   |                       | plina                  |                               |
| Ani 10+  | Batran  |                       | stabila/descrescatoare |                               |

2. **Punctul de recuperare investitiei (ROI):**
   - Cost total pana la productie plina: X lei/pom [ESTIMAT]
   - Venit anual la productie plina: Y lei/pom [ESTIMAT]
   - Ani pana la ROI: Z ani

3. **Reinoire livada** — la ce varsta plantezi pomi noi, cum gestionezi tranzitia

4. **Calendar investitii majore** (la 5-10 ani): retundere de regenerare, sistem irigare, tratamente speciale sol

5. **Riscuri financiare principale** la Nadlac — ce eveniment poate anula investitia, probabilitate, asigurare agricola Romania

---

### SECTIUNEA W — Recuperare dupa Evenimente Extreme

**Scop:** Ce face Roland concret dupa un eveniment extrem.

**Continut obligatoriu:**

1. **Recuperare dupa INGHET EXTREM de iarna** (sub -20°C):
   - Evaluare supravietuire: testul stratului verde
   - Primavara: cand si cum taieri de salvare
   - Decizie: salvez pomul sau replantez?

2. **Recuperare dupa INGHET DE PRIMAVARA** (dupa inflorire):
   - Evaluare daune: cum stii procentul pierdut
   - Tratamente imediate dupa
   - Productie partiala posibila in acelasi an?

3. **Recuperare dupa SECETA SEVERA** (iulie-august fara precipitatii):
   - Simptome stres sever vs seceta normala
   - Protocol rehidratare (nu uda brusc cantitati mari — explica de ce)
   - Daune permanente vs temporare

4. **Recuperare dupa GRINDINA:**
   - Evaluare daune fructe/frunze/scoarta/lemn
   - Tratamente obligatorii post-grindina (cupru)
   - Fructele ranite: pot fi procesate? In cat timp?

5. **Recuperare dupa ATAC MASIV BOLI/DAUNATORI:**
   - Semne ca atacul a depasit pragul economic
   - Protocol interventie de urgenta specific acestei specii

---

### SECTIUNEA X — Istorie, Traditii si Valoare Culturala Locala

**Scop:** Context cultural si marketing autentic pentru livada Roland.

**Surse:** Monografii locale, publicatii istorice agricole zona Arad/Banat, arhive etnografice.

**Continut obligatoriu:**

1. **Istoria cultivarii** in zona Arad/Banat/Campia de Vest — de cand, soiuri traditionale locale

2. **Utilizari traditionale romanesti** ale acestei specii:
   - Retete traditionale regionale (nu generice nationale)
   - Utilizari medicinale traditionale — marcat [TRADITIONAL, nu sfat medical]
   - Utilizari non-alimentare

3. **Valoare culturala pentru marketing:**
   - Cum foloseste Roland autenticitatea locala in vanzare
   - "Povestea produsului" — ce face produsul din Nadlac special
   - Diferentiere fata de import supermarket

4. **Soiuri locale de patrimoniu** (daca exista in zona Arad):
   - Denumiri locale, caracteristici, unde se mai gasesc, potential comercial premium

5. **Legaturi cu piata maghiara** (zona de frontiera Nadlac):
   - Denumirea speciei in maghiara
   - Traditii maghiare de procesare relevante
   - Cerere specifica in Ungaria pentru aceasta specie

---

### SECTIUNEA Y — Resurse, Furnizori si Retea de Suport Locala

**Scop:** Unde gaseste Roland concret ce are nevoie in zona Arad.

**Surse:** Informatii verificabile, nu inventate. Daca nu stii o pepiniera anume — spune ca nu stii si da criterii de cautare.

**Continut obligatoriu:**

1. **Pepiniere recomandate zona Arad/Timis/Bihor** pentru aceasta specie:
   - Nume si locatie (daca verificabile) — marcheaza [VERIFICAT] / [DE CAUTAT LOCAL]
   - Pepiniere online Romania cu livrare nationala (reale, active)

2. **Furnizori produse fitosanitare si ingrasaminte zona Arad:**
   - Unde gaseste produsele din calendarele B si G
   - Produse bio disponibile real in Romania
   - Unde gaseste produse rare (chelatii fier, stimulatori inradacinare)

3. **Asociatii si grupuri pomicultori** relevante:
   - Asociatii pomicole judet Arad (daca exista — nu inventa)
   - Grupuri Facebook active de pomicultori romani (denumiri reale, active 2024-2025)
   - Forumuri romanesti recomandate

4. **Institutii si expertiza locala:**
   - Statiunea de cercetare pomicola cea mai apropiata de Nadlac
   - Directia Agricola Judeteana Arad — servicii pentru producatori mici
   - Consilier agricol APIA

5. **Subventii si programe** pentru aceasta specie Romania 2024-2025:
   - APIA: platile directe pentru livezi (aceasta specie se califica?)
   - Programe PNDR/AFIR pentru livezi mici
   - Conditii eligibilitate pentru Roland

---

### SECTIUNEA Z — Glosar Pomicol (FISIER COMUN)

**Fisier:** `Gemini_Glosar_Pomicol_Z.md`
**Scop:** Dictionar de termeni tehnici pomicoli explicati simplu.

**Continut obligatoriu:**

Minim 80 termeni, organizati alfabetic:

- **Termenul** (+ varianta engleza/latina daca relevant)
- **Explicatie simpla** — maxim 3 randuri, limbaj incepator
- **Exemplu practic** din livada Roland

**Categorii obligatorii:**

- Tundere: coroana, lastar, mugur, ramura de rod, lacom, pinching etc.
- Boli: patogen, fungi, bacterie, nematod, spor, incubatie etc.
- Fertilizare: macronutrienti, micronutrienti, pH, chelat, NPK etc.
- Fenologie: dezmugurire, buton floral, anteza, fenofaza, dormanta etc.
- Comercial/legal: carnet producator, lot, trasabilitate, PVP etc.
- Altoire: portaltoi, altoi, copulatie, despicatura, cambiu, calusare etc.
- Sol: cernoziom, pH, humus, CEC, permeabilitate, textura etc.
- Abrevieri produse: WP, SC, EC, SL, WG, PPM, ppm, a.i. etc.

---

## REGULI DE CALITATE — OBLIGATORII

Inainte de a livra fiecare fisier:

- [ ] Informatiile sunt bazate pe surse reale — nu inventate
- [ ] Datele incerte sunt marcate [ESTIMAT - necesita verificare] cu explicatie
- [ ] Datele fenologice M sunt calibrate pentru Campia de Vest, nu inventate
- [ ] Preturile L sunt marcate [CERT] / [ESTIMAT] / [PRET NECUNOSCUT - cerceteaza piata locala]
- [ ] Duratele depozitare K sunt REALISTE, nu valori de laborator
- [ ] Sectiunea S contine retete cu cantitati reale
- [ ] Sectiunea T contine legislatie Romania 2024-2025 verificabila
- [ ] Sectiunea Y nu contine resurse inventate — marcheaza [DE CAUTAT LOCAL] daca nu stii
- [ ] Limbaj accesibil, fara jargon neexplicat
- [ ] Fisierul incepe cu antetul standard
- [ ] NU ai atins fisierele din `c:\Proiecte\Livada\content\`

---

## ORDINEA DE EXECUTIE

**Batch 1 — Comerciale principale (prioritate maxima):**

1. Cires — J critica (autosteril, polenizator obligatoriu)
2. Cais — I critica (seceta vara), L importanta
3. Piersic — I critica (irigare iulie-august), K importanta
4. Prun — L importanta (tuica, prune uscate, piata sigura)

**Batch 2 — Pomi mari:** 5. Par Clapp — J critica (verifica incompatibilitate cu Williams!) 6. Par Williams — J critica 7. Par Hosui 8. Par Napoca 9. Mar Florina 10. Mar Golden Spur

**Batch 3 — Specii speciale:** 11. Kaki Rojo Brillante — L importanta (pret premium, specie rara) 12. Rodiu 13. Migdal — J critica, M critica (inflorire timpurie = risc ger) 14. Visin

**Batch 4 — Fructe de padure:** 15. Afin — I CRITICA (cel mai pretentios la apa) 16. Zmeur 17. Zmeur Galben Remontant 18. Mur 19. Mur Copac 20. Alun — J importanta (polenizare prin vant)

**Final:** `Gemini_Glosar_Pomicol_Z.md`

---

## FORMAT FINAL FISIER OUTPUT

```markdown
# [SPECIE] ([Denumire stiintifica]) — Sectiuni I-Z

# Zona: Nadlac, jud. Arad, 88m, Campia de Vest

# Generat: [data] | Status: DRAFT — necesita validare Claude Code

# Fisier sursa citit: c:\Proiecte\Livada\content\[Specie].md

---

## I. IRIGARE SI NECESAR DE APA — SPECIFIC NADLAC

[continut complet]

---

## J. POLENIZARE SI SOIURI COMPATIBILE

[continut complet]

---

## K. RECOLTARE, CONDITIONARE SI DEPOZITARE

[continut complet]

---

## L. RENTABILITATE SI PIATA LOCALA NADLAC

[continut complet]

---

## M. FENOLOGIE CALIBRATA NADLAC

[continut complet]

---

## N. INMULTIRE SI PROPAGARE

[continut complet]

---

## O. MANAGEMENTUL SOLULUI SI ERBICIDARE

[continut complet]

---

## P. ADAPTARE LA SCHIMBARI CLIMATICE

[continut complet]

---

## Q. COMBINATII, ASOCIERI SI LAYOUT IN LIVADA

[continut complet]

---

## R. ECHIPAMENTE SI UNELTE

[continut complet]

---

## S. PROCESARE DETALIATA SI RETETE

[continut complet]

---

## T. VANZARE LEGALA SI CERTIFICARE IN ROMANIA

[continut complet]

---

## U. INTERACTIUNI CU FAUNA

[continut complet]

---

## V. PLAN MULTIANUAL SI CALENDAR DE INVESTITII

[continut complet]

---

## W. RECUPERARE DUPA EVENIMENTE EXTREME

[continut complet]

---

## X. ISTORIE, TRADITII SI VALOARE CULTURALA LOCALA

[continut complet]

---

## Y. RESURSE, FURNIZORI SI RETEA DE SUPORT LOCALA

[continut complet]

---

_DRAFT generat de Gemini CLI | Necesita validare si integrare de catre Claude Code_
_Nu integra direct in documentatia proiectului fara revizuire._
```

---

## RAPORT FINAL OBLIGATORIU

Dupa toate cele 20+1 fisiere, creeaza:
`c:\Proiecte\Livada\content\Gemini_Research\Gemini_Raport_Executie.md`

Continut:

- Lista celor 21 fisiere: ✅ complet / ⚠️ partial / ❌ lipsa
- Sectiunile unde datele au fost insuficiente sau incerte (T, Y in special)
- Incompatibilitatile de polenizare identificate intre soiurile livadei Roland
- Specii cu date fenologice aproximate (nu exacte pentru Nadlac)
- Termeni inclusi in glosarul Z: numar total, categorii acoperite
- Orice inconsistenta detectata fata de sectiunile A-H existente

---

## FAZA 2 — CERINTA REFINEMENT (revizuire fisiere existente)

> **Scop:** Fisierele `_IZ.md` generate in Faza 1 au fost auditate de Claude Code (2026-04-08).
> Au fost identificate 7 probleme concrete care trebuie remediate inainte de integrare.
> **Executa DOAR instructiunile de mai jos — nu regenera sectiunile deja corecte.**

---

### PROBLEMA 1 — Prun: fisier IZ complet lipsa

**Actiune:** Genereaza `Gemini_Prun_IZ.md` complet cu TOATE sectiunile I-Y, identic ca structura cu celelalte specii.
`Gemini_Prun_IM.md` existent acopera doar I-M si trebuie completat cu N-Y.

---

### PROBLEMA 2 — Afin, Sectiunea I: acidulare fara context de cost si viabilitate

**Fisier de modificat:** `Gemini_Afin_IZ.md` — Sectiunea I

**Problema:** Documentul recomanda acidularea apei de irigatii pentru afin (necesar la pH>7.0-7.5) dar NU specifica:

- Costul real al acidularii pentru 5-10 pomi pe perioada iulie-august (acid citric, acid sulfuric diluat)
- Daca aceasta practica este viabila economic pentru o ferma mica la Nadlac

**Ce trebuie adaugat** la inceputul Sectiunii I pentru Afin:

```
### ATENTIE — VIABILITATE LA NADLAC
Apa din panza freatica / put in zona Nadlac are pH tipic 7.0-7.5 (cernoziom).
Afinul necesita pH apa 5.5-6.0. Diferenta este SEMNIFICATIVA si necesita acidulare activa.

Cost estimat acidulare (5-10 pomi, 2 udari/saptamana, iulie-august = 8 saptamani):
- Acid citric: ~0.5g/L apa → ~500g/luna → cost ~25-40 lei/luna x 2 luni = 50-80 lei/sezon
- Alternativa sistem picurare cu rezervor acidulat: investitie initiala 300-500 lei, reutilizabil

CONCLUZIE: Economic viabil pentru 5-10 pomi la 50-100 lei/sezon.
NU este viabil fara un sistem de irigare dedicat (aspersiunea alcalizeaza solul).
```

Marcheaza costurile ca [ESTIMAT 2025].

---

### PROBLEMA 3 — Sectiunea T (Vanzare legala): continut identic la toate speciile

**Fisiere de modificat:** TOATE fisierele `_IZ.md`, Sectiunea T

**Problema:** Sectiunea T este clonata — aceleasi documente, aceleasi formulare, pentru toate speciile. Nu are valoare practica.

**Ce trebuie adaugat** — la FIECARE specie, un tabel suplimentar cu note specifice speciei:

| Specie             | Note specifice obligatorii in Sectiunea T                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Migdal**         | Migdalul amar (Prunus dulcis var. amara) contine amigdalina — interzis la vanzare ca aliment fara procesare. Specifica daca soiurile recomandate sunt migdal dulce. Certificare fitosanitara pentru transport fructe cu coaja. |
| **Rodiu**          | Sucul de rodiu este considerat produs procesat (nu fruct proaspat) din punct de vedere fiscal in Romania — mentionata in sectiunea procesare.                                                                                  |
| **Zmeur / Mur**    | Fructe de padure au circuit scurtat (max 2 zile dupa recoltare) — implica vanzare directa sau congelare imediata pentru conformitate DSVSA.                                                                                    |
| **Kaki**           | Kaki proaspat (astringent) este incomestibil inainte de maturare completa — eticheta obligatorie cu "se consuma dupa inmuiere completa" pentru vanzare direct consumator.                                                      |
| **Afin**           | Afinele proaspete necesita ambalare conform Reg. EU 543/2011 daca sunt comercializate in piete organizate (calibru, uniformitate).                                                                                             |
| **Alun**           | Alunele in coaja sunt clasificate ca oleaginoase — au reglementari diferite de export fata de fructe.                                                                                                                          |
| **Prun (tuica)**   | Distilarea necesita autorizatie ANAF si declaratie de productie. Cotele de alcool fara accize sunt 50L/an/gospodarie pentru uz propriu.                                                                                        |
| **Toate speciile** | Carnet producator agricol (APIA/Primarie) este obligatoriu pentru vanzare. Emis gratuit. Certificat fitosanitar = optional pentru piata locala, obligatoriu pentru piete organizate si export.                                 |

---

### PROBLEMA 4 — Par Clapp, Sectiunea J: confuzie polenizare vs incompatibilitate de altoire

**Fisier de modificat:** `Gemini_Par_Clapp_IZ.md` — Sectiunea J

**Problema:** Textul actual creeaza confuzie — vorbeste de "incompatibilitate Par Clapp - Williams" dar aceasta incompatibilitate este LA ALTOIRE pe gutui (portaltoi), NU la polenizare. Un cititor neavizat va crede ca nu trebuie sa planteze Williams langa Clapp pentru polenizare — GRESIT.

**Cum trebuie reformulat:**

```markdown
### CLARIFICARE: "incompatibilitatea" Clapp-Williams

MITURI vs REALITATE:

❌ MIT: "Par Clapp este incompatibil cu Par Williams"
✅ REALITATE: Clapp si Williams SE POLENIZEAZA EXCELENT (aceeasi perioada inflorire, Grupa II)

Incompatibilitatea reala este la ALTOIRE:

- Cand ambele soiuri sunt altoite pe GUTUI (portaltoi nanizant),
  Williams altoita pe gutui produce adesea uniuni slabe sau incompatibilitate
  cu anumite clone de gutui (gutui C, gutui BA29).
- Aceasta NU are niciun efect asupra polenizarii!

CONCLUZIE PRACTICA pentru Roland:

- Daca ai Par Clapp si Par Williams plantati separat (altoiti pe par franc sau
  pe portaltoi compatibil) → se polenizeaza perfect
- Planteaza-i la max 30m distanta pentru polenizare optima
```

---

### PROBLEMA 5 — Sectiunea M (Fenologie): lipsa cross-validare intre specii

**Fisiere de modificat:** TOATE fisierele `_IZ.md`, adauga la sfarsitul Sectiunii M

**Ce trebuie adaugat** — un tabel comun la FIECARE specie care arata pozitionarea sa in fenologia globala a livadei Roland:

```markdown
### Pozitia in fenologia livadei Roland — Nadlac

| Luna            | Specii in inflorire SIMULTAN la Nadlac    |
| --------------- | ----------------------------------------- |
| Februarie       | Migdal                                    |
| Martie (1-15)   | Cais, Piersic timpuriu                    |
| Martie (15-31)  | Cires, Visin, Par (toate soiurile)        |
| Aprilie (1-15)  | Mar (toate soiurile), Prun, Alun (catini) |
| Aprilie (15-30) | Zmeur (incepere)                          |
| Mai-Iunie       | Mur, Zmeur (continuare), Kaki             |
| Iulie-August    | Zmeur Galben Remontant (a 2-a inflorire)  |
```

**Marcheaza** cu `← ACEASTA SPECIE` randul corespunzator speciei din fisierul respectiv.
Adauga si nota: "Speciile care infloresc simultan pot actiona ca polenizatori incrucisati (daca sunt compatibile genetic)."

---

### PROBLEMA 6 — Zmeur Galben Remontant, Sectiunea K: perisabilitate extrema nedocumentata

**Fisier de modificat:** `Gemini_Zmeur_Galben_Remontant_IZ.md` — Sectiunea K

**Ce trebuie adaugat** dupa tabelul de depozitare, ca bloc separat:

```markdown
### ATENTIE — IMPLICATII COMERCIALE ALE PERISABILITATII

Zmeurul galben remontant are durata de viata comerciala de 4-8 ore la temperatura camerei
si maxim 2 zile la frigider. Aceasta face:

**VIABIL:**

- Vanzare directa din livada / la poarta (culegere dimineata, vanzare pana la pranz)
- Congelare imediata dupa culegere (durata 12 luni, valoare pastrata ~80%)
- Dulceata sau sirop (procesare in aceeasi zi)

**NEVIABIL fara logistica dedicata:**

- Vanzare la piata (necesita cutii cu gel de racire, transport sub 4°C)
- Comercializare in magazine (necesita lant de frig continuu)
- Livrare la distante >50km

**Recomandare pentru Roland:** Planifica destinatia recoltei INAINTE de culegere,
nu dupa. Zmeurul galben nevalorificat in 24h devine pierdere totala.
```

---

### PROBLEMA 7 — Sectiunea L (Rentabilitate): preturi incomplete la Migdal si Rodiu

**Fisiere de modificat:** `Gemini_Migdal_IZ.md` si `Gemini_Rodiu_IZ.md` — Sectiunea L

**Migdal:** Adauga preturi orientative:

- Migdal in coaja: 25-40 lei/kg [ESTIMAT piata Arad 2024-2025]
- Migdal decojit: 60-100 lei/kg [ESTIMAT]
- Migdal prajit ambalat: 120-180 lei/kg [ESTIMAT premium]
- Clarifica: la 3-5 kg/pom productie maxima si 50 pomi → 150-250 kg migdal in coaja/an

**Rodiu:** Adauga preturi orientative:

- Rodiu proaspat (intreg): 15-30 lei/kg [ESTIMAT - produs de nisa, variabilitate mare]
- Suc de rodiu presat la rece (500ml): 25-40 lei [ESTIMAT piata specialty]
- Seminte uscate (arils): 80-120 lei/kg [ESTIMAT piata nisa]
- Clarifica: rodiul are productie variabila primii 5-7 ani; ROI real incepe la an 6-8

---

### INSTRUCTIUNE DE EXECUTIE FAZA 2

1. Citeste FIECARE problema de mai sus complet
2. Modifica FISIERELE SPECIFICATE — nu regenera intregul fisier, doar sectiunile indicate
3. La fiecare modificare, adauga la finalul fisierului o linie:
   `> **Revizuit Faza 2:** [data] — [sectiunile modificate]`
4. Genereaza `Gemini_Prun_IZ.md` complet (Problema 1)
5. Actualizeaza `Gemini_Raport_Executie.md` cu un paragraf "FAZA 2 — REFINEMENT" care confirma ce s-a modificat

---

## FAZA 3 — COMPLETARE GLOSAR POMICOL (termeni din sectiunile A-H)

> **Scop:** Glosarul existent `Gemini_Glosar_Pomicol_Z.md` acopera termenii din sectiunile I-Y.
> Sectiunile A-H (scrise de Claude Code) contin termeni tehnici suplimentari care nu sunt in glosar.
> Aceasta faza extrage termenii lipsa si completeaza glosarul existent.

### Instructiune

1. **Citeste glosarul existent** `c:\Proiecte\Livada\content\Gemini_Research\Gemini_Glosar_Pomicol_Z.md`
   Retine toti termenii deja definiti — NU ii duplica.

2. **Citeste sectiunile A-H** din urmatoarele 20 fisiere (doar A-H, nu I-Y):
   - `c:\Proiecte\Livada\content\Afin.md`
   - `c:\Proiecte\Livada\content\Alun.md`
   - `c:\Proiecte\Livada\content\Cais.md`
   - `c:\Proiecte\Livada\content\Cires.md`
   - `c:\Proiecte\Livada\content\Kaki.md`
   - `c:\Proiecte\Livada\content\Mar_Florina.md`
   - `c:\Proiecte\Livada\content\Mar_Golden_Spur.md`
   - `c:\Proiecte\Livada\content\Migdal.md`
   - `c:\Proiecte\Livada\content\Mur.md`
   - `c:\Proiecte\Livada\content\Mur_Copac.md`
   - `c:\Proiecte\Livada\content\Par_Clapp.md`
   - `c:\Proiecte\Livada\content\Par_Hosui.md`
   - `c:\Proiecte\Livada\content\Par_Napoca.md`
   - `c:\Proiecte\Livada\content\Par_Williams.md`
   - `c:\Proiecte\Livada\content\Piersic.md`
   - `c:\Proiecte\Livada\content\Prun.md`
   - `c:\Proiecte\Livada\content\Rodiu.md`
   - `c:\Proiecte\Livada\content\Visin.md`
   - `c:\Proiecte\Livada\content\Zmeur.md`
   - `c:\Proiecte\Livada\content\Zmeur_Galben_Remontant.md`

3. **Extrage termenii tehnici noi** din sectiunile A-H care NU sunt deja in glosar.
   Categorii de cautat in mod special:
   - **Produse fitosanitare** (fungicide, insecticide, acaricide): Merpan, Topsin, Karate Zeon, Score, Chorus, Captan, Dithane, Syllit, Calypso etc. — explica ce tip de produs e, ce combate, clasa toxicologitate
   - **Boli specifice** aparute in A-H: monilioza, cilindrosporioza, basicarea frunzelor, rapan, rugina, focul bacterian, cancrul bacterial, Xanthomonas, Pseudomonas, Taphrina etc.
   - **Daunatori specifici**: musca cireselor (Rhagoletis cerasi), paducheii (Aphis, Myzus), acarianul rosu (Panonychus), viermele merelor (Cydia pomonella), Drosophila suzukii etc.
   - **Termeni de tundere** specifici: pincement, ciupire, lastar anticipat, ramura mixta, ramura de rod, pinten, smoc de rod, burjon, arcuire, spalier etc.
   - **Termeni de fertilizare** folositi in A-H: doze NPK, amendamente, calcarare, sulfat de potasiu, superfosfat, uree, humat, biostimulatori etc.
   - **Termeni locali / practici**: vermorel, atomizor, solutie de acoperire, produs de contact vs sistemic, pauza de securitate (PHI), limita maxima de reziduuri (LMR)

4. **Adauga termenii noi in `Gemini_Glosar_Pomicol_Z.md`**:
   - Pastreaza structura existenta si categoriile existente
   - Adauga o sectiune noua: `## Termeni din Sectiunile A-H (tratamente, boli, daunatori)`
   - Format per termen: `**Termen** — definitie clara in 1-3 randuri, limbaj simplu`
   - Daca un termen apartine unei categorii deja existente in glosar, adauga-l acolo
   - Marcheaza termenii nesiguri cu `[ESTIMAT]`

5. **Format output obligatoriu pentru glosar — NU include:**
   - NU adauga titlu nou, header, zona, data sau status la inceputul fisierului
   - NU sterge sau reformata sectiunile deja existente in glosar
   - NU adauga nota finala de tip `_DRAFT_`, avertisment de validare sau semnatura
   - NU adauga `> **Completat Faza 3:**` sau orice alta linie meta
   - Fisierul livrat = glosarul existent + sectiunile noi adaugate la final, nimic altceva

---

### Instructiune de executie Faza 3

Trimite catre Gemini:

```
Please read the section "FAZA 3 — COMPLETARE GLOSAR POMICOL" from:
c:\Proiecte\Livada\content\Gemini_Research\Cerinta_Gemini_Research.md
and execute the task described there.
```

---

## NOTA PENTRU SPECII NOI

Cand Roland adauga o specie noua:

1. Adauga specia in "LISTA SPECII" de mai sus
2. Adauga `Gemini_[NumeSpecie]_IZ.md` in lista de fisiere output
3. Ruleaza: `Please execute the task for [NumeSpecie] only, as described in this file`
4. Gemini livreaza fisierul in `Gemini_Research/`
5. Claude Code valideaza si integreaza in `content/[NumeSpecie].md`

---

_Cerinta intocmita de Claude Code pentru Gemini CLI_
_Proiect: Livada Mea Dashboard | Roland Petrila, Nadlac, jud. Arad_
_Data: 2026-04-08 | Versiunea: 2.0 — unificat I-Z + instructiuni surse reale_
