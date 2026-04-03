# GHID UTILIZARE — Sistem Multi-Terminal Livada Mea Dashboard

---

## 1. ARHITECTURA SISTEM

```
    ROLAND (tu)
    ┌─────┴──────┐
    │            │
    ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│   T1   │  │   T2   │  │   T3   │
│ EXECUTIE│  │ AUDIT  │  │ ORCH.  │
│        │  │        │  │        │
│ Scrie  │  │ Citeste│  │ Ajuta  │
│ cod    │  │ cod    │  │ decizii│
│ Deploy │  │ Feedback│ │ Reguli │
└───┬────┘  └───┬────┘  └───┬────┘
    │           │            │
    ▼           ▼            ▼
  RUNDA_     AUDIT_      ORCHESTRATOR_
  CURENTA   FEEDBACK     STATUS
    .md       .md          .md
```

---

## 2. COMENZI RAPIDE

| Comanda | Unde o scrii | Ce face |
|---------|-------------|---------|
| `t1` | In T1 | T1 citeste feedback T2 + decizii/cerinte T3 + stare plan, apoi executa |
| `t2` | In T2 | T2 auditeaza tot si scrie feedback |
| `t3` | In T3 | T3 ajuta cu decizii si coordonare |

---

## 3. TEXTE DE INITIALIZARE (copiaza in fiecare terminal)

### TERMINAL 1 — Executie
```
Citeste urmatoarele fisiere si urmeaza regulamentul:
1. 99_Plan_vs_Audit/T1_REGULAMENT.md
2. 99_Plan_vs_Audit/info.md
3. 99_Plan_vs_Audit/PLAN_v3.md
4. 99_Plan_vs_Audit/RUNDA_CURENTA.md
5. 99_Plan_vs_Audit/PLAN_DECISIONS.md

Esti T1 — terminalul de PLAN si EXECUTIE. Rolul tau: implementezi features, scrii cod, faci deploy.
Mod executie: AUTONOM — implementeaza conform planului, intreaba doar la decizii majore.
Prioritati: Android-first, offline-first, romana 100%, zero costuri.

Incepe cu ce scrie in RUNDA_CURENTA.md.
Dupa initializare, comanda "t1" = sync cu T2/T3 + executie.
```

### TERMINAL 2 — Audit
```
Citeste urmatoarele fisiere si urmeaza regulamentul:
1. 99_Plan_vs_Audit/T2_REGULAMENT.md
2. 99_Plan_vs_Audit/info.md
3. 99_Plan_vs_Audit/PLAN_v3.md

Esti T2 — terminalul de AUDIT. Rolul tau: analizezi tot ce face T1, scrii feedback structurat.
NU modifici cod. NU faci commit. Scrii DOAR in AUDIT_FEEDBACK.md.

Cand iti scriu "t2", executa auditul complet pe 7 axe (vezi regulament).
```

### TERMINAL 3 — Orchestrator
```
Citeste urmatoarele fisiere si urmeaza regulamentul:
1. 99_Plan_vs_Audit/T3_REGULAMENT.md
2. 99_Plan_vs_Audit/info.md
3. 99_Plan_vs_Audit/PLAN_v3.md
4. 99_Plan_vs_Audit/ORCHESTRATOR_STATUS.md

Esti T3 — ORCHESTRATORUL. Rolul tau: ajuti utilizatorul sa ia decizii, coordonezi T1 si T2.
NU scrii cod. Poti edita regulamente si info.md.

Cand iti scriu "t3", citeste RUNDA_CURENTA.md si ajuta cu deciziile deschise.
```

---

## 4. CICLUL DE LUCRU

```
ETAPA 1: Initializare
Roland copiaza textul de init in T1 → T1 incepe Faza 0/1

ETAPA 2: Executie
T1 implementeaza autonom conform planului
T1 suprascrie RUNDA_CURENTA.md dupa fiecare runda

ETAPA 3: Audit
Roland deschide T2, scrie "t2"
T2 citeste RUNDA_CURENTA.md + cod sursa, scrie AUDIT_FEEDBACK.md

ETAPA 4: Integrare feedback + decizii
Roland merge la T1, scrie "t1"
T1 citeste AUDIT_FEEDBACK.md + RUNDA_CURENTA.md + PLAN_v3.md
T1 integreaza feedback T2 + cerinte/decizii T3, apoi executa

ETAPA 5: Decizii (optional, cand e nevoie)
Roland merge la T3, scrie "t3"
T3 ajuta, scrie decizia/cerinta in RUNDA_CURENTA.md
Roland merge la T1, scrie "t1" → T1 citeste si executa automat

ETAPA 6: Deploy
Dupa fiecare sprint finalizat: T1 face commit + push + vercel --prod
```

---

## 5. SKILLS / TOOLS / MCP DISPONIBILE

| Tool | Terminal | Utilizare |
|------|---------|-----------|
| Firecrawl (scrape/crawl) | T1, T2 | Cercetare web, verificare surse |
| WebSearch | T1, T2 | Cautare informatii |
| Vercel MCP | T1 | Deploy, check status |
| Gmail MCP | T3 | Doar la cerere explicita |
| Google Calendar MCP | T3 | Doar la cerere explicita |

---

## 6. REGULI DE AUR

1. **Un fisier = un singur scriitor.** T1 scrie cod, T2 scrie audit, T3 scrie status.
2. **RUNDA_CURENTA.md elimina copy-paste.** T1 scrie, T2+T3 citesc automat.
3. **Android-first, mereu.** Orice feature se testeaza INTAI pe 360px.
4. **Offline functioneaza mereu.** Documentatia nu depinde de internet.
5. **Zero costuri, fara exceptie.** Daca un serviciu cere plata → cauta alternativa gratuita.
6. **NU declara functional daca ai testat doar cu 1 item.** Testeaza MINIM/TIPIC/MAXIM.

---

## 7. RECOVERY (daca pierzi contextul)

Daca un terminal pierde contextul (sesiune lunga, restart):

**T1 Recovery:**
```
Citeste: T1_REGULAMENT.md, info.md, PLAN_v3.md, RUNDA_CURENTA.md, PLAN_DECISIONS.md.
Continua de unde ai ramas conform PLAN_v3.md (prima sarcina nebifata).
```

**T2 Recovery:**
```
Citeste: T2_REGULAMENT.md, info.md. Apoi scrie "t2" si execut auditul.
```

**T3 Recovery:**
```
Citeste: T3_REGULAMENT.md, info.md, ORCHESTRATOR_STATUS.md. Asteapta instructiuni.
```

---

## 8. BLUEPRINTS

Dupa fiecare modul finalizat, T1 genereaza un blueprint universal in `99_Blueprints/`.
Structura: CE FACE, ARHITECTURA, DEPENDENTE, IMPLEMENTARE PAS CU PAS, TESTARE, EXTENSIBILITATE.
Blueprint-urile sunt sabloane reutilizabile, fara referinte la proiectul curent.

---

## 9. VERIFICARI PERIODICE

| Cand | Ce verifici | Comanda |
|------|------------|---------|
| Dupa fiecare sprint | Audit T2 | Scrie "t2" in T2 |
| Dupa fiecare faza | Status complet | Scrie "t3" in T3 |
| La blocare | Ajutor decizii | Scrie "t3" in T3 |
| Saptamanal | Progres vs plan | Citeste PLAN_v3.md |

---

## 10. TIPS AVANSATE

- **Model recomandat:** Opus 4.6 (1M context) pentru T1 si T3. Sonnet pentru T2 (audit e mai rapid).
- **Extindere:** Poti adauga T4 (cercetare dedicata) daca vrei un terminal doar pentru research.
- **MCP-uri:** Firecrawl e cel mai util pentru cercetare pomicola (scrape surse romanesti).
- **Backup:** 99_Plan_vs_Audit/ se comite in git — backup automat pe GitHub.
