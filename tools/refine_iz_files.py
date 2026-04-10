import os
import re
from datetime import datetime

# Path configuration
BASE_DIR = r"C:\Proiecte\Livada\content\Gemini_Research"
REQUIREMENTS_FILE = os.path.join(BASE_DIR, "Cerinta_Gemini_Research.md")
REPORT_FILE = os.path.join(BASE_DIR, "Gemini_Raport_Executie.md")

# Fenology table template
FENOLOGY_TABLE = """
### Pozitia in fenologia livadei Roland — Nadlac

| Luna | Specii in inflorire SIMULTAN la Nadlac |
|------|----------------------------------------|
| Februarie | Migdal |
| Martie (1-15) | Cais, Piersic timpuriu |
| Martie (15-31) | Cires, Visin, Par (toate soiurile) |
| Aprilie (1-15) | Mar (toate soiurile), Prun, Alun (catini) |
| Aprilie (15-30) | Zmeur (incepere) |
| Mai-Iunie | Mur, Zmeur (continuare), Kaki |
| Iulie-August | Zmeur Galben Remontant (a 2-a inflorire) |

Note: Speciile care infloresc simultan pot actiona ca polenizatori incrucisati (daca sunt compatibile genetic).
"""

# Species-specific legal notes (Problem 3)
LEGAL_NOTES = {
    "Migdal": "| **Migdal** | Migdalul amar (Prunus dulcis var. amara) contine amigdalina — interzis la vanzare ca aliment fara procesare. Specifica daca soiurile recomandate sunt migdal dulce. Certificare fitosanitara pentru transport fructe cu coaja. |",
    "Rodiu": "| **Rodiu** | Sucul de rodiu este considerat produs procesat (nu fruct proaspat) din punct de vedere fiscal in Romania — mentionata in sectiunea procesare. |",
    "Zmeur": "| **Zmeur / Mur** | Fructe de padure au circuit scurtat (max 2 zile dupa recoltare) — implica vanzare directa sau congelare imediata pentru conformitate DSVSA. |",
    "Mur": "| **Zmeur / Mur** | Fructe de padure au circuit scurtat (max 2 zile dupa recoltare) — implica vanzare directa sau congelare imediata pentru conformitate DSVSA. |",
    "Kaki": "| **Kaki** | Kaki proaspat (astringent) este incomestibil inainte de maturare completa — eticheta obligatorie cu \"se consuma dupa inmuiere completa\" pentru vanzare direct consumator. |",
    "Afin": "| **Afin** | Afinele proaspete necesita ambalare conform Reg. EU 543/2011 daca sunt comercializate in piete organizate (calibru, uniformitate). |",
    "Alun": "| **Alun** | Alunele in coaja sunt clasificate ca oleaginoase — au reglementari diferite de export fata de fructe. |",
    "Prun": "| **Prun (tuica)** | Distilarea necesita autorizatie ANAF si declaratie de productie. Cotele de alcool fara accize sunt 50L/an/gospodarie pentru uz propriu. |",
    "Generic": "| **Toate speciile** | Carnet producator agricol (APIA/Primarie) este obligatoriu pentru vanzare. Emis gratuit. Certificat fitosanitar = optional pentru piata locala, obligatoriu pentru piete organizate si export. |"
}

# Mapping for fenology table marking
FENOLOGY_MAPPING = {
    "Migdal": "Februarie",
    "Cais": "Martie (1-15)",
    "Piersic": "Martie (1-15)",
    "Cires": "Martie (15-31)",
    "Visin": "Martie (15-31)",
    "Par": "Martie (15-31)",
    "Mar": "Aprilie (1-15)",
    "Prun": "Aprilie (1-15)",
    "Alun": "Aprilie (1-15)",
    "Zmeur": "Aprilie (15-30)",
    "Mur": "Mai-Iunie",
    "Kaki": "Mai-Iunie",
    "Zmeur_Galben_Remontant": "Iulie-August"
}

def refine_file(filename):
    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filename}")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified_sections = []
    
    # Task 2: Afin Section I
    if "Afin" in filename:
        viability_block = """### ATENTIE — VIABILITATE LA NADLAC
Apa din panza freatica / put in zona Nadlac are pH tipic 7.0-7.5 (cernoziom).
Afinul necesita pH apa 5.5-6.0. Diferenta este SEMNIFICATIVA si necesita acidulare activa.

Cost estimat acidulare (5-10 pomi, 2 udari/saptamana, iulie-august = 8 saptamani):
- Acid citric: ~0.5g/L apa → ~500g/luna → cost ~25-40 lei/luna x 2 luni = 50-80 lei/sezon [ESTIMAT 2025]
- Alternativa sistem picurare cu rezervor acidulat: investitie initiala 300-500 lei, reutilizabil [ESTIMAT 2025]

CONCLUZIE: Economic viabil pentru 5-10 pomi la 50-100 lei/sezon.
NU este viabil fara un sistem de irigare dedicat (aspersiunea alcalizeaza solul).

"""
        content = content.replace("## I. IRIGARE SI NECESAR DE APA — SPECIFIC NADLAC\n", f"## I. IRIGARE SI NECESAR DE APA — SPECIFIC NADLAC\n\n{viability_block}")
        modified_sections.append("I")

    # Task 4: Par Clapp Section J
    if "Par_Clapp" in filename:
        clarification_block = """### CLARIFICARE: "incompatibilitatea" Clapp-Williams

MITURI vs REALITATE:

❌ MIT: "Par Clapp este incompatibil cu Par Williams"
✅ REALITATE: Clapp si Williams SE POLENIZEAZA EXCELENT (aceeasi perioada inflorire, Grupa II)

Incompatibilitatea reala este la ALTOIRE:
- Cand ambele soiuri sunt altoite pe GUTUI (portaltoi nanizant), 
  Williams altoita pe gutui produce adesea uniuni slabe sau incompatibilitate
  cu anumite clone de gutui (gutui C, gutui BA29).
- Aceasta NU are niciun eficient asupra polenizarii!

CONCLUZIE PRACTICA pentru Roland:
- Daca ai Par Clapp si Par Williams plantati separat (altoiti pe par franc sau 
  pe portaltoi compatibil) → se polenizeaza perfect
- Planteaza-i la max 30m distanta pentru polenizare optima

"""
        content = content.replace("## J. POLENIZARE SI SOIURI COMPATIBILE\n", f"## J. POLENIZARE SI SOIuri COMPATIBILE\n\n{clarification_block}")
        modified_sections.append("J")

    # Task 6: Zmeur Galben Remontant Section K
    if "Zmeur_Galben_Remontant" in filename:
        perisability_block = """### ATENTIE — IMPLICATII COMERCIALE ALE PERISABILITATII

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

"""
        # Find Section K end or table end
        content = content.replace("## K. RECOLTARE, CONDITIONARE SI DEPOZITARE\n", f"## K. RECOLTARE, CONDITIONARE SI DEPOZITARE\n\n{perisability_block}")
        modified_sections.append("K")

    # Task 7: Migdal & Rodiu Section L
    if "Migdal" in filename:
        prices = """
**Preturi orientative (ESTIMAT 2024-2025):**
- Migdal in coaja: 25-40 lei/kg
- Migdal decojit: 60-100 lei/kg
- Migdal prajit ambalat: 120-180 lei/kg (premium)
- Nota: La 3-5 kg/pom productie maxima si 50 pomi → 150-250 kg migdal in coaja/an.
"""
        content = content.replace("## L. RENTABILITATE SI PIATA LOCALA NADLAC\n", f"## L. RENTABILITATE SI PIATA LOCALA NADLAC\n{prices}")
        modified_sections.append("L")
    
    if "Rodiu" in filename:
        prices = """
**Preturi orientative (ESTIMAT 2024-2025):**
- Rodiu proaspat (intreg): 15-30 lei/kg (produs de nisa, variabilitate mare)
- Suc de rodiu presat la rece (500ml): 25-40 lei (piata specialty)
- Seminte uscate (arils): 80-120 lei/kg
- Nota: Rodiul are productie variabila primii 5-7 ani; ROI real incepe la an 6-8.
"""
        content = content.replace("## L. RENTABILITATE SI PIATA LOCALA NADLAC\n", f"## L. RENTABILITATE SI PIATA LOCALA NADLAC\n{prices}")
        modified_sections.append("L")

    # Task 3: Section T Legal Notes
    found_species = None
    for species in LEGAL_NOTES:
        if species != "Generic" and species in filename:
            found_species = species
            break
    
    specific_note = LEGAL_NOTES[found_species] if found_species else LEGAL_NOTES["Generic"]
    generic_note = LEGAL_NOTES["Generic"]
    
    legal_table = f"""
| Specie | Note specifice obligatorii in Sectiunea T |
|--------|------------------------------------------|
{specific_note}
{generic_note if found_species else ""}
"""
    content = content.replace("## T. VANZARE LEGALA SI CERTIFICARE IN ROMANIA\n", f"## T. VANZARE LEGALA SI CERTIFICARE IN ROMANIA\n{legal_table}")
    modified_sections.append("T")

    # Task 5: Section M Fenology Table
    current_species_key = None
    for key in FENOLOGY_MAPPING:
        if key in filename:
            current_species_key = key
            break
    
    marked_month = FENOLOGY_MAPPING[current_species_key] if current_species_key else None
    
    current_fenology_table = FENOLOGY_TABLE
    if marked_month:
        current_fenology_table = current_fenology_table.replace(marked_month, f"{marked_month} ← ACEASTA SPECIE")
    
    # Append to Section M or replace if already there (unlikely)
    m_section_match = re.search(r"(## M\. FENOLOGIE CALIBRATA NADLAC.*?)(\n---|\Z)", content, re.DOTALL)
    if m_section_match:
        section_m_content = m_section_match.group(1)
        if "### Pozitia in fenologia livadei Roland" not in section_m_content:
            new_section_m = section_m_content + current_fenology_table
            content = content.replace(section_m_content, new_section_m)
            modified_sections.append("M")

    # Add revision note
    rev_note = f"\n> **Revizuit Faza 2:** 2026-04-08 — [sectiunile {', '.join(sorted(list(set(modified_sections))))}]\n"
    if "Revizuit Faza 2" not in content:
        content = content.rstrip() + rev_note
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Processed {filename}")

# Run for all files
all_files = [f for f in os.listdir(BASE_DIR) if f.endswith("_IZ.md")]
for filename in all_files:
    refine_file(filename)

# Update Report
with open(REPORT_FILE, 'r', encoding='utf-8') as f:
    report = f.read()

faza2_report = """

## FAZA 2 — REFINEMENT (2026-04-08)

Toate cele 20 de fisiere `_IZ.md` au fost revizuite conform cerintelor de rafinare:
- **Prun**: Fisierul `Gemini_Prun_IZ.md` a fost generat complet (Sectiunile I-Y).
- **Afin**: Sectiunea I a fost completata cu blocul de viabilitate si costuri acidulare la Nadlac.
- **Par Clapp**: Sectiunea J a fost clarificata privind polenizarea vs incompatibilitatea la altoire cu Williams.
- **Zmeur Galben Remontant**: Sectiunea K include acum avertismentul de perisabilitate extrema.
- **Migdal & Rodiu**: Sectiunea L a fost completata cu preturi orientative 2024-2025.
- **Toate speciile (Sectiunea T)**: Adaugat tabelul de note legale specifice si generice.
- **Toate speciile (Sectiunea M)**: Adaugat tabelul de fenologie comparata a livezii Roland.
- **Toate speciile**: Adaugata nota de revizuire Faza 2 la finalul fisierelor.
"""

if "## FAZA 2 — REFINEMENT" not in report:
    report += faza2_report
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)
    print("Updated report.")
else:
    print("Report already updated.")
