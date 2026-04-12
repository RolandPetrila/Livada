  Acum, părerea mea sinceră despre slăbiciunile sistemului de alerte:

  Ce funcționează bine

  - Multi-model (3 surse) — rar în proiecte personale, dă încredere reală
  - Stale detection pe oră — rezolvat complet
  - 6 tipuri de alerte din aceleași date — zero cost suplimentar
  - Offset microclimat Mureș — diferența față de prognoza generică

  Slăbiciuni reale pe care le văd

  1. Alerta disease (boli fungice) NU are alertHour și NU are stale check

  Boala fungică e calculată pe 48h medii (ploaie + temp + umiditate), dar nu are câmp date sau alertHour. Funcția isAlertStale() primește {active: true,
  message: "..."} fără date → returnează false (backward compat) → alerta rămâne vizibilă la infinit până la următorul cron care o dezactivează. Cu cron orar
  acum e mai puțin grav, dar e inconsistent.

  Fix: adaugă date: today la diseaseRisk — 1 linie.

  2. Alertele de caniculă/ploaie/secetă sunt la nivel de ZI, fără oră

  Frost și vânt au frostHour/alertHour (oră exactă, stale după 2h). Dar caniculă/ploaie/secetă au doar date — persistă toată ziua, chiar dacă ploaia torențială
  era dimineața și acum e seară senină.

  Gravitate: mică — aceste alerte sunt relevante pe toată ziua (caniculă = irigă seara, ploaie = verifică eroziunea, secetă = irigă). Nu e la fel de critic ca
  frost care e un moment precis.

  3. Fără alertă de grindină

  Grindina e cel mai distructiv eveniment pentru o livadă (fructe lovite, crengi rupte). Open-Meteo nu oferă direct "hail probability", dar WMO codes 96 și 99
  indică furtună cu grindină. Deja avem weather_code în date — nu îl verificăm pentru grindină.

  Fix: simplu, 10 linii — verifică weather_code === 96 || weather_code === 99 în hourly forecast.

  4. Fără notificare PUSH reală (background)

  Push notifications funcționează doar când aplicația e deschisă (sendLivadaNotification din applyAlerts). Dacă ai telefon în buzunar și vine frost alert la ora
   3 dimineața de la noul cron orar — nu primești nimic. Ai nevoie de Web Push API cu VAPID keys + endpoint de subscribe, ceea ce e un proiect mai mare.

  Gravitate: medie-mare — tocmai de aceea ai pus cron orar, dar dacă nu deschizi app-ul, nu vezi alerta.

  5. Pragul de vânt (50 km/h) ar putea fi prea mare

  50 km/h e vânt puternic, dar pomi tineri sau spaliere pot fi afectați și la 40 km/h. Depinde de vârsta pomilor tăi.

  Întrebare: Ai pomi tineri (plantați în ultimii 2-3 ani) care ar fi vulnerabili la rafale de 40 km/h?

  ---
  Ce recomand să facem acum (rapid, 15 min):

  ┌─────┬────────────────────────────────┬──────────┬───────────────────────────────────────────┐
  │  #  │              Fix               │  Efort   │                  Impact                   │
  ├─────┼────────────────────────────────┼──────────┼───────────────────────────────────────────┤
  │ 1   │ date: today pe diseaseRisk     │ 1 linie  │ Consistență stale check                   │
  ├─────┼────────────────────────────────┼──────────┼───────────────────────────────────────────┤
  │ 2   │ Alertă grindină (WMO 96/99)    │ 10 linii │ Protecție la cel mai distructiv eveniment │
  ├─────┼────────────────────────────────┼──────────┼───────────────────────────────────────────┤
  │ 3   │ Prag vânt ajustabil (40 km/h?) │ 1 linie  │ Depinde de răspunsul tău                  │
  └─────┴────────────────────────────────┴──────────┴───────────────────────────────────────────┘

  Vrei să le aplicăm?

✻ Baked for 2m 14s

❯ aplicam punctele 1 , 2 si 3 .                                                                                                                                 
  punctul 4 adauga-l in plan ca si todo/pending                                                                                                                 
  punctul 5 - am si poti tineri plantati , modifica la 40 km/h .                                                                                                
                                                                                                                                                                
  Read 1 file (ctrl+o to expand)                                                                                                                                
                                         
● Aplic toate cele 5 modificări simultan.                                                                                                                       
                                   
● Update(api\meteo-cron.js)                                                                                                                                     
  ⎿  Added 1 line                                                                                                                                               
      333        if (rainyH >= 4 && avgT >= 10 && avgT <= 25 && avgH > 70) {                                                                                    
      334          diseaseRisk = {                                                                                                                              
      335            active: true,                                                                                                                              
      336 +          date: today,                                                                                                                        
      337            message: `Risc crescut de boli fungice! Ploaie + ${Math.round(avgT)}°C + umiditate ${Math.round(avgH)}%. Verifica rapanul la mar/par       
            si monilioza la cais/piersic.`,                 
      338            updatedAt: new Date().toISOString(),
      339          };

● Update(api\meteo-cron.js)

✢ Tomfoolering… (45s · ↓ 352 tokens)