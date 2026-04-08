#!/usr/bin/env python3
"""
Implementare features N8-N17 in public/index.html
Runda 9 — Livada Mea Dashboard
"""
import re

HTML_PATH = r'C:/Proiecte/Livada/public/index.html'

with open(HTML_PATH, 'rb') as f:
    raw = f.read()
content = raw.decode('utf-8', errors='replace')
# Normalize line endings (file has \r\r\n which breaks pattern matching)
content = content.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')

original_len = len(content)
print(f"Fisier incarcat: {len(content)} caractere, {content.count(chr(10))} linii")

# ============================================================
# CHANGE 1: Voice button in journal modal (N12)
# ============================================================
OLD_TEXTAREA = '      <label for="jurnalNote">Descriere</label>\n      <textarea id="jurnalNote" placeholder="Ce ai f&#259;cut, la ce specii, produse folosite..."></textarea>'
NEW_TEXTAREA = '''      <label for="jurnalNote">Descriere</label>
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <textarea id="jurnalNote" placeholder="Ce ai f&#259;cut, la ce specii, produse folosite..." style="flex:1;resize:vertical;"></textarea>
        <button id="voiceDictateBtn" onclick="startVoiceInput('jurnalNote')" title="Dicteaz&#259; nota (Chrome/Android)" aria-label="Dicteaz&#259; nota vocal&#259;" style="padding:10px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:0.9rem;min-height:44px;min-width:44px;color:var(--text);transition:background 0.2s;flex-shrink:0;">&#127908;</button>
      </div>'''

if OLD_TEXTAREA in content:
    content = content.replace(OLD_TEXTAREA, NEW_TEXTAREA, 1)
    print("[OK] Change 1: Voice button adaugat in modal jurnal")
else:
    print("[FAIL] Change 1: Pattern textarea jurnal negasit!")

# ============================================================
# CHANGE 2: New modals before DOMPurify script (N9, N13, N14, N16)
# ============================================================
NEW_MODALS = '''
<!-- ====== MODAL: PLANNER 7 ZILE (N9) ====== -->
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-planner">
  <div class="modal">
    <div class="modal-header">
      <h2>&#128197; Planner 7 Zile</h2>
      <button class="modal-close" aria-label="Inchide" onclick="closeModal('planner')">&#10005;</button>
    </div>
    <div class="modal-body" id="plannerBody">
      <p style="color:var(--text-dim);text-align:center;">Se &#238;ncarc&#259;...</p>
    </div>
  </div>
</div>

<!-- ====== MODAL: COMPARATOR SPECII (N13) ====== -->
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-comparator">
  <div class="modal">
    <div class="modal-header">
      <h2>&#128260; Comparator Specii</h2>
      <button class="modal-close" aria-label="Inchide" onclick="closeModal('comparator')">&#10005;</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <select id="compSp1" onchange="renderSpeciesComparator()" style="flex:1;padding:8px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);">
          <option value="">Specia 1...</option>
          <option value="cais">Cais</option><option value="piersic">Piersic</option>
          <option value="cires">Cire&#537;</option><option value="visin">Vi&#537;in</option>
          <option value="mar-florina">M&#259;r Florina</option><option value="mar-golden">M&#259;r Golden</option>
          <option value="par-clapp">P&#259;r Clapp</option><option value="par-williams">P&#259;r Williams</option>
          <option value="prun">Prun</option><option value="migdal">Migdal</option>
        </select>
        <select id="compSp2" onchange="renderSpeciesComparator()" style="flex:1;padding:8px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);">
          <option value="">Specia 2...</option>
          <option value="cais">Cais</option><option value="piersic">Piersic</option>
          <option value="cires">Cire&#537;</option><option value="visin">Vi&#537;in</option>
          <option value="mar-florina">M&#259;r Florina</option><option value="mar-golden">M&#259;r Golden</option>
          <option value="par-clapp">P&#259;r Clapp</option><option value="par-williams">P&#259;r Williams</option>
          <option value="prun">Prun</option><option value="migdal">Migdal</option>
        </select>
      </div>
      <div id="comparatorResult"><p style="color:var(--text-dim);text-align:center;">Selecteaz&#259; dou&#259; specii diferite.</p></div>
    </div>
  </div>
</div>

<!-- ====== MODAL: HARTA LIVADA (N14) ====== -->
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-treemap">
  <div class="modal" style="max-width:520px;">
    <div class="modal-header">
      <h2>&#128508;&#65039; Hart&#259; Livad&#259;</h2>
      <button class="modal-close" aria-label="Inchide" onclick="closeModal('treemap')">&#10005;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:0.78rem;color:var(--text-dim);margin-bottom:10px;">Click pe celul&#259; pentru a ad&#259;uga/edita un pom. Chenar colorat = stare s&#259;n&#259;tate.</p>
      <div id="treemapGrid" style="margin-bottom:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;"></div>
      <div id="treemapDetailPanel" style="display:none;border-top:1px solid var(--border);padding-top:12px;">
        <strong id="treemapDetailTitle" style="display:block;margin-bottom:8px;font-size:0.9rem;">Detalii pom</strong>
        <input type="hidden" id="treeCellKey">
        <input id="treeCellName" placeholder="Nume (ex: Cais #3)" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);">
        <select id="treeCellSpecies" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);">
          <option value="">Specia...</option>
          <option value="cais">Cais</option><option value="piersic">Piersic</option>
          <option value="cires">Cire&#537;</option><option value="visin">Vi&#537;in</option>
          <option value="prun">Prun</option><option value="mar-florina">M&#259;r Florina</option>
          <option value="mar-golden">M&#259;r Golden</option><option value="par-clapp">P&#259;r Clapp</option>
          <option value="par-williams">P&#259;r Williams</option><option value="par-hosui">P&#259;r Hosui</option>
          <option value="par-napoca">P&#259;r Napoca</option><option value="migdal">Migdal</option>
          <option value="rodiu">Rodiu</option><option value="kaki">Kaki</option>
          <option value="afin">Afin</option><option value="zmeur">Zmeur</option>
          <option value="mur">Mur</option><option value="alun">Alun</option>
        </select>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <input id="treeCellPlanted" type="number" min="1990" max="2030" placeholder="An plantat" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);">
          <select id="treeCellStatus" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);">
            <option value="ok">&#10003; S&#259;n&#259;tos</option>
            <option value="warning">&#9888; Aten&#539;ie</option>
            <option value="sick">&#128308; Bolnav</option>
          </select>
        </div>
        <textarea id="treeCellNotes" rows="2" placeholder="Note (ex: monilioz&#259; 2024, produc&#539;ie slab&#259;)" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface);color:var(--text);resize:vertical;"></textarea>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" style="flex:1;" onclick="saveTreeCell()">Salveaz&#259;</button>
          <button onclick="clearTreeCell()" style="padding:8px 14px;background:var(--bg-surface);border:1px solid var(--danger);border-radius:8px;cursor:pointer;color:var(--danger);font-size:0.82rem;">&#128465;</button>
          <button onclick="document.getElementById('treemapDetailPanel').style.display='none'" style="padding:8px 14px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text-dim);font-size:0.82rem;">&#10005;</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ====== MODAL: TURA SAPTAMANALA (N16) ====== -->
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-inspection">
  <div class="modal">
    <div class="modal-header">
      <h2>&#128269; Tur&#259; S&#259;pt&#259;m&#226;nal&#259;</h2>
      <button class="modal-close" aria-label="Inchide" onclick="closeModal('inspection')">&#10005;</button>
    </div>
    <div class="modal-body" id="inspectionBody">
      <p style="color:var(--text-dim);text-align:center;">Se genereaz&#259;...</p>
    </div>
  </div>
</div>

'''

INSERT_BEFORE = '<script defer src="https://cdn.jsdelivr.net/npm/dompurify@3.3.3/dist/purify.min.js"></script>'
if INSERT_BEFORE in content:
    content = content.replace(INSERT_BEFORE, NEW_MODALS + INSERT_BEFORE, 1)
    print("[OK] Change 2: Modals noi adaugate (Planner, Comparator, Harta, Tura)")
else:
    print("[FAIL] Change 2: Pattern DOMPurify script negasit!")

# ============================================================
# CHANGE 3: New sp-tools buttons (N9, N14, N15, N16, N17)
# ============================================================
OLD_TOOLS = """    '<button class="sp-tool-btn" onclick="printFisa()"><span class="sti">\\uD83D\\uDDA8\\uFE0F</span> Print fi\\u0219a</button>' +
    '</div>';"""

NEW_TOOLS = """    '<button class="sp-tool-btn" onclick="printFisa()"><span class="sti">\\uD83D\\uDDA8\\uFE0F</span> Print fi\\u0219a</button>' +
    '<button class="sp-tool-btn" onclick="printSpeciesReport(activeSpeciesId)"><span class="sti">\\uD83D\\uDDC3\\uFE0F</span> Raport cultur\\u0103</button>' +
    '<button class="sp-tool-btn" onclick="openWeeklyPlanner()"><span class="sti">\\uD83D\\uDCC5</span> Planner 7 zile</button>' +
    '<button class="sp-tool-btn" onclick="openInspectionChecklist()"><span class="sti">\\uD83D\\uDD0D</span> Tur\\u0103 inspec\\u021Bie</button>' +
    '<button class="sp-tool-btn" onclick="openTreePanel(activeSpeciesId)"><span class="sti">\\uD83C\\uDF33</span> Pomi</button>' +
    '</div>';"""

if OLD_TOOLS in content:
    content = content.replace(OLD_TOOLS, NEW_TOOLS, 1)
    print("[OK] Change 3: Butoane noi adaugate in sp-tools (N9/N16/N17/N15)")
else:
    print("[FAIL] Change 3: Pattern sp-tools negasit!")

# ============================================================
# CHANGE 4: GDD + Chill Hours + Disease Risk in initDashboardAzi (N8, N10, N11)
# ============================================================
OLD_DASH_END = '''  // Backup reminder
  checkBackupReminder();
}'''

NEW_DASH_END = '''  // Backup reminder
  checkBackupReminder();

  // N8 + N11: GDD Calculator + Chill Hours (date meteo history)
  var aziContainer = document.getElementById('sfatulLunii');
  if (aziContainer && aziContainer.parentElement) {
    loadMeteoHistoryForWidgets().then(function(hist) {
      renderChillHoursWidget(aziContainer.parentElement, hist);
      renderGDDWidget(aziContainer.parentElement, hist);
    }).catch(function() {});
  }

  // N10: Disease risk per species (din datele meteo deja incarcate)
  if (meteoRes.status === 'fulfilled' && meteoRes.value && meteoRes.value.daily) {
    var risks = assessDiseaseRisks(meteoRes.value.daily);
    if (risks.length > 0 && alerteEl) {
      var riskHtml = '<div style="margin-top:8px;">';
      risks.forEach(function(r) {
        riskHtml += '<div style="margin:4px 0;padding:8px 12px;background:var(--bg-surface);' +
          'border-left:3px solid ' + r.levelColor + ';border-radius:0 8px 8px 0;">' +
          '<div style="font-weight:700;font-size:0.82rem;color:' + r.levelColor + ';">' +
          r.label + ' \u2014 RISC ' + r.level + '</div>' +
          '<div style="font-size:0.78rem;color:var(--text-dim);">Specii: ' + r.species + '</div>' +
          '<div style="font-size:0.78rem;">\uD83E\uDDEA ' + r.treatment + '</div>' +
          '</div>';
      });
      riskHtml += '</div>';
      alerteEl.innerHTML += riskHtml;
    }
  }
}'''

if OLD_DASH_END in content:
    content = content.replace(OLD_DASH_END, NEW_DASH_END, 1)
    print("[OK] Change 4: GDD + ChillHours + DiseaseRisk integrate in initDashboardAzi")
else:
    print("[FAIL] Change 4: Pattern initDashboardAzi end negasit!")

# ============================================================
# CHANGE 5: All new JS functions before </script> (N8-N17)
# ============================================================
NEW_JS_FUNCTIONS = '''
// ====== N8: GDD CALCULATOR — Caldura acumulata + predictie fenologica ======
var GDD_BASE_TEMP = 10;
var GDD_MILESTONES = {
  cais:[{gdd:80,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:120,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:170,label:'Cadere petale',icon:'\uD83C\uDF43'},{gdd:230,label:'Legare fructe',icon:'\uD83D\uDD35'},{gdd:700,label:'Recolta posibila',icon:'\uD83C\uDF51'}],
  piersic:[{gdd:100,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:150,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:210,label:'Cadere petale',icon:'\uD83C\uDF43'},{gdd:280,label:'Legare fructe',icon:'\uD83D\uDD35'},{gdd:1050,label:'Recolta posibila',icon:'\uD83C\uDF51'}],
  cires:[{gdd:70,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:100,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:150,label:'Cadere petale',icon:'\uD83C\uDF43'},{gdd:600,label:'Recolta posibila',icon:'\uD83C\uDF52'}],
  visin:[{gdd:80,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:120,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:700,label:'Recolta posibila',icon:'\uD83C\uDF52'}],
  'par-clapp':[{gdd:130,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:180,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:250,label:'Legare fructe',icon:'\uD83D\uDD35'},{gdd:1100,label:'Recolta posibila',icon:'\uD83C\uDF50'}],
  'par-williams':[{gdd:130,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:185,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:1150,label:'Recolta posibila',icon:'\uD83C\uDF50'}],
  'par-hosui':[{gdd:140,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:190,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:1200,label:'Recolta posibila',icon:'\uD83C\uDF50'}],
  'par-napoca':[{gdd:135,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:185,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:1250,label:'Recolta posibila',icon:'\uD83C\uDF50'}],
  'mar-florina':[{gdd:150,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:200,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:270,label:'Legare fructe',icon:'\uD83D\uDD35'},{gdd:1300,label:'Recolta posibila',icon:'\uD83C\uDF4E'}],
  'mar-golden':[{gdd:145,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:195,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:1250,label:'Recolta posibila',icon:'\uD83C\uDF4E'}],
  prun:[{gdd:100,label:'Dezmugurit',icon:'\uD83C\uDF31'},{gdd:140,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:900,label:'Recolta posibila',icon:'\uD83E\uDED0'}],
  migdal:[{gdd:60,label:'Dezmugurit (TIMPURIU!)',icon:'\u26A0\uFE0F'},{gdd:90,label:'Inflorire',icon:'\uD83C\uDF38'},{gdd:800,label:'Recolta posibila',icon:'\uD83C\uDF30'}],
};

async function loadMeteoHistoryForWidgets() {
  var CACHE_KEY = 'livada-meteo-hist-w', TS_KEY = 'livada-meteo-hist-w-ts';
  var cached = localStorage.getItem(CACHE_KEY);
  var cacheTs = parseInt(localStorage.getItem(TS_KEY) || '0');
  if (cached && (Date.now() - cacheTs) < 3600000) return JSON.parse(cached);
  if (!navigator.onLine) return cached ? JSON.parse(cached) : {};
  try {
    var res = await fetchWithTimeout('/api/meteo-history?days=90', {}, 8000);
    if (!res.ok) return cached ? JSON.parse(cached) : {};
    var data = await res.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(TS_KEY, String(Date.now()));
    return data;
  } catch(e) { return cached ? JSON.parse(cached) : {}; }
}

function calculateGDD(meteoHistory) {
  var year = new Date().getFullYear();
  var startDate = year + '-03-01';
  var total = 0;
  var dates = Object.keys(meteoHistory).sort();
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i];
    if (d < startDate) continue;
    var m = meteoHistory[d];
    if (!m || m.temp_min == null || m.temp_max == null) continue;
    var avg = (parseFloat(m.temp_min) + parseFloat(m.temp_max)) / 2;
    total += Math.max(0, avg - GDD_BASE_TEMP);
  }
  return Math.round(total * 10) / 10;
}

function renderGDDWidget(containerEl, meteoHistory) {
  if (!meteoHistory || !Object.keys(meteoHistory).length) return;
  var gdd = calculateGDD(meteoHistory);
  if (gdd <= 0) return;
  var speciesId = activeSpeciesId && GDD_MILESTONES[activeSpeciesId] ? activeSpeciesId : null;
  var milestones = speciesId ? GDD_MILESTONES[speciesId] : null;
  var currentStage = null, nextStage = null;
  if (milestones) {
    for (var i = 0; i < milestones.length; i++) {
      if (gdd >= milestones[i].gdd) currentStage = milestones[i];
      else { nextStage = milestones[i]; break; }
    }
  }
  var progressPct = nextStage ? Math.min(100, Math.round((gdd / nextStage.gdd) * 100)) : 100;
  var el = document.createElement('div');
  el.id = 'gdd-widget';
  el.className = 'alert alert-info';
  el.style.cssText = 'margin:10px 0;padding:10px 14px;cursor:pointer;';
  el.setAttribute('title', 'GDD acumulate din 1 martie — click pentru detalii');
  el.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    '<strong>\uD83C\uDF21\uFE0F C\u0103ldur\u0103 acumulat\u0103 (GDD)</strong>' +
    '<span style="font-size:1.05rem;font-weight:700;color:var(--accent);">' + Math.round(gdd) + ' GDD</span>' +
    '</div>' +
    (currentStage ? '<div style="font-size:0.82rem;margin-bottom:3px;">' + currentStage.icon + ' ' + currentStage.label + '</div>' : '') +
    (nextStage ? '<div style="font-size:0.78rem;color:var(--text-dim);">Urm\u0103tor: ' + nextStage.icon + ' ' + nextStage.label + ' (' + (nextStage.gdd - Math.round(gdd)) + ' GDD)</div>' : '<div style="font-size:0.78rem;color:var(--accent);">\u2705 Toate stadiile atinse</div>') +
    '<div style="margin-top:6px;height:4px;background:var(--bg-surface);border-radius:2px;">' +
    '<div style="height:4px;background:var(--accent);border-radius:2px;width:' + progressPct + '%;transition:width 0.5s;"></div>' +
    '</div>';
  var existing = containerEl.querySelector('#gdd-widget');
  if (existing) existing.replaceWith(el);
  else containerEl.insertBefore(el, containerEl.firstChild);
}

// ====== N11: CHILL HOURS TRACKER ======
var CHILL_REQUIREMENTS = {
  cais:{min:400,max:800,label:'Cais'},
  piersic:{min:600,max:1200,label:'Piersic'},
  migdal:{min:300,max:600,label:'Migdal'},
  cires:{min:800,max:1200,label:'Cire\u015F'},
  visin:{min:600,max:1000,label:'Vi\u015Fin'},
  prun:{min:700,max:1200,label:'Prun'},
  'par-clapp':{min:900,max:1500,label:'P\u0103r Clapp'},
  'par-williams':{min:800,max:1400,label:'P\u0103r Williams'},
  'par-hosui':{min:700,max:1300,label:'P\u0103r Hosui'},
  'par-napoca':{min:800,max:1400,label:'P\u0103r Napoca'},
  'mar-florina':{min:900,max:1500,label:'M\u0103r Florina'},
  'mar-golden':{min:800,max:1400,label:'M\u0103r Golden'},
  kaki:{min:200,max:500,label:'Kaki Rojo'},
  rodiu:{min:100,max:300,label:'Rodiu'},
};

function estimateChillHours(tempMin, tempMax) {
  if (tempMin >= 7) return 0;
  if (tempMax <= 7) return 24;
  var range = tempMax - tempMin;
  if (range <= 0) return 12;
  return Math.round(Math.min(24, ((7 - tempMin) / range) * 24 * 0.75));
}

function calculateChillHours(meteoHistory) {
  var year = new Date().getFullYear();
  var startDate = (year - 1) + '-11-01';
  var total = 0;
  var dates = Object.keys(meteoHistory).sort();
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i];
    if (d < startDate) continue;
    var month = parseInt(d.split('-')[1]);
    if (month >= 4 && d.startsWith(String(year))) continue;
    var m = meteoHistory[d];
    if (!m || m.temp_min == null) continue;
    total += estimateChillHours(parseFloat(m.temp_min), parseFloat(m.temp_max || m.temp_min + 10));
  }
  return total;
}

function renderChillHoursWidget(containerEl, meteoHistory) {
  var month = new Date().getMonth() + 1;
  if (month >= 4 && month <= 10) return;
  if (!meteoHistory || !Object.keys(meteoHistory).length) return;
  var chillH = calculateChillHours(meteoHistory);
  var html = '<div id="chill-widget" style="margin:10px 0;padding:10px 14px;background:var(--bg-surface);border-radius:10px;border-left:3px solid var(--info);">' +
    '<div style="font-weight:700;margin-bottom:6px;">\u2744\uFE0F Ore de frig: <span style="color:var(--info);">' + chillH + 'h</span> <span style="font-size:0.72rem;color:var(--text-dim);">(din 1 nov, estimat)</span></div>';
  Object.entries(CHILL_REQUIREMENTS).forEach(function(entry) {
    var id = entry[0], req = entry[1];
    var pct = Math.min(100, Math.round((chillH / req.min) * 100));
    var barColor = pct >= 100 ? 'var(--accent)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)';
    var status = pct >= 100 ? '\u2705' : pct >= 70 ? '\uD83D\uDFE1' : '\uD83D\uDD34';
    html += '<div style="margin:4px 0;">' +
      '<div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:2px;">' +
      '<span>' + status + ' ' + req.label + '</span><span style="color:var(--text-dim);">' + pct + '% din ' + req.min + 'h</span></div>' +
      '<div style="height:3px;background:var(--border);border-radius:2px;">' +
      '<div style="height:3px;background:' + barColor + ';border-radius:2px;width:' + pct + '%;"></div></div></div>';
  });
  if (chillH < 500) html += '<div style="margin-top:6px;font-size:0.78rem;color:var(--warning);">\u26A0\uFE0F Iarn\u0103 cald\u0103! Piersicul \u015Fi caisul pot inflori neregulat.</div>';
  html += '</div>';
  var existing = containerEl.querySelector('#chill-widget');
  var el = document.createElement('div');
  el.innerHTML = html;
  if (existing) existing.replaceWith(el.firstChild);
  else containerEl.insertBefore(el.firstChild, containerEl.firstChild);
}

// ====== N9: PLANNER SAPTAMANAL ======
async function openWeeklyPlanner() {
  openModal('planner');
  var body = document.getElementById('plannerBody');
  body.innerHTML = '<div class="ai-load"><div class="ai-spin"></div><br>Se \u00eencarc\u0103 prognoza...</div>';
  try {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + LIVADA_LAT + '&longitude=' + LIVADA_LON +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_max,weather_code' +
      '&timezone=Europe%2FBucharest&forecast_days=7';
    var res = await fetchWithTimeout(url, {}, 10000);
    var data = await res.json();
    var journal = getJurnalEntries();
    var today = todayLocal();
    var html = '<p style="font-size:0.75rem;color:var(--text-dim);margin-bottom:10px;">' +
      'Scor spray: <span style="color:var(--accent-glow)">\u226570% ideal</span> | ' +
      '<span style="color:var(--warning)">40-69% acceptabil</span> | ' +
      '<span style="color:var(--danger)">&lt;40% evit\u0103</span></p>';
    for (var i = 0; i < 7; i++) {
      var dateStr = data.daily.time[i];
      var tmax = data.daily.temperature_2m_max[i];
      var tmin = data.daily.temperature_2m_min[i];
      var rain = data.daily.precipitation_sum[i] || 0;
      var wind = data.daily.wind_speed_10m_max[i] || 0;
      var hum = data.daily.relative_humidity_2m_max[i] || 60;
      var score = calculateSprayScore(tmax, wind, rain, hum);
      var scoreColor = score >= 70 ? 'color:var(--accent-glow)' : score >= 40 ? 'color:var(--warning)' : 'color:var(--danger)';
      var jEntries = journal.filter(function(e) { return e.date === dateStr; });
      var isToday = dateStr === today;
      var dateObj = new Date(dateStr + 'T12:00:00');
      var dayName = ['\uD83D\uDD35Du','\uD83D\uDFE2Lu','\uD83D\uDFE2Ma','\uD83D\uDFE2Mi','\uD83D\uDFE2Jo','\uD83D\uDFE2Vi','\uD83D\uDD35S\u00e2'][dateObj.getDay()];
      var dayNum = dateObj.getDate() + '.' + String(dateObj.getMonth() + 1).padStart(2, '0');
      html += '<div style="padding:9px 0;border-bottom:1px solid var(--border);' +
        (isToday ? 'background:rgba(106,191,105,0.06);padding:9px 8px;margin:1px 0;border-radius:8px;' : '') + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">' +
        '<div><span style="font-size:0.78rem;">' + dayName + '</span> ' +
        '<strong style="' + (isToday ? 'color:var(--accent-glow)' : '') + '">' + (isToday ? '\uD83D\uDCCD ' : '') + dayNum + '</strong>' +
        '<span style="font-size:0.72rem;color:var(--text-dim);margin-left:5px;">' +
        Math.round(tmin) + '\u00b0/' + Math.round(tmax) + '\u00b0' +
        (rain > 0 ? ' \uD83C\uDF27 ' + Math.round(rain * 10) / 10 + 'mm' : '') +
        ' \uD83D\uDCA8 ' + Math.round(wind) + 'km/h</span></div>' +
        '<span style="font-size:0.82rem;font-weight:700;' + scoreColor + '">Spray ' + score + '%</span>' +
        '</div>';
      if (jEntries.length > 0) {
        html += '<div style="font-size:0.75rem;color:var(--accent);margin-top:2px;">\uD83D\uDCDD ' +
          jEntries.map(function(e) {
            return '[' + e.type + '] ' + (e.note ? e.note.substring(0, 40) + (e.note.length > 40 ? '\u2026' : '') : '');
          }).join(' | ') + '</div>';
      }
      html += '</div>';
    }
    body.innerHTML = html;
  } catch(e) {
    body.innerHTML = '<p style="color:var(--danger);">Eroare la \u00eencarcare prognoz\u0103. Verific\u0103 conexiunea.</p>';
  }
}

// ====== N10: RISC BOALA PER SPECIE ======
var DISEASE_RULES = [
  {id:'monilioza',label:'Monilioz\u0103 (putregai brun)',species:'Cais, Piersic, Cire\u015F, Vi\u015Fin, Prun',
    condition:function(t,h,r){return t>=15&&t<=28&&r>=3&&h>=75;},
    isHigh:function(t,h,r){return t>=18&&r>=5&&h>=80;},
    treatment:'Teldor 500 SC (1g/L) sau Switch 62.5 WG (0.8g/L)',timing:'24-48h dup\u0103 ploaie'},
  {id:'rapan',label:'R\u0103pan (Venturia)',species:'M\u0103r, P\u0103r',
    condition:function(t,h,r){return t>=8&&t<=22&&r>=3&&h>=78;},
    isHigh:function(t,h,r){return t>=12&&r>=5&&h>=85;},
    treatment:'Captan 80 WG (2g/L) sau Merpan 80 WDG (2g/L)',timing:'INAINTE de ploaie (preventiv!) sau max 24h dup\u0103'},
  {id:'fainare',label:'F\u0103inare (Podosphaera)',species:'M\u0103r, P\u0103r, Piersic, Cire\u015F',
    condition:function(t,h,r){return t>=18&&t<=28&&h>=50&&h<=75&&r<2;},
    isHigh:function(t,h,r){return t>=22&&h>=55&&r===0;},
    treatment:'Topas 100 EC (0.4ml/L) sau sulf muiabil 0.3%',timing:'Timp uscat, diminea\u021Ba devreme'},
  {id:'patarea',label:'P\u0103tarea frunzelor (Blumeriella)',species:'Vi\u015Fin, Cire\u015F',
    condition:function(t,h,r){return t>=16&&r>=2&&h>=76;},
    isHigh:function(t,h,r){return t>=20&&r>=4;},
    treatment:'Merpan 80 WDG (2g/L) sau zeam\u0103 bordelez\u0103 0.5%',timing:'24h dup\u0103 ploaie continu\u0103'},
];

function assessDiseaseRisks(dailyData) {
  if (!dailyData || !dailyData.time) return [];
  var n = Math.min(3, dailyData.time.length);
  if (n === 0) return [];
  var sumT = 0, totalRain = 0, maxHum = 0;
  for (var i = 0; i < n; i++) {
    sumT += (dailyData.temperature_2m_max[i] + dailyData.temperature_2m_min[i]) / 2;
    totalRain += dailyData.precipitation_sum[i] || 0;
    if (dailyData.relative_humidity_2m_mean) maxHum = Math.max(maxHum, dailyData.relative_humidity_2m_mean[i] || 0);
  }
  var avgT = sumT / n;
  if (maxHum === 0) maxHum = 70;
  var rainyH = Math.min(24, (totalRain / n) * 4);
  return DISEASE_RULES.filter(function(r) { return r.condition(avgT, maxHum, rainyH); })
    .map(function(r) {
      var high = r.isHigh(avgT, maxHum, rainyH);
      return {label:r.label, level:high?'MARE':'MEDIU', levelColor:high?'var(--danger)':'var(--warning)', species:r.species, treatment:r.treatment, timing:r.timing};
    });
}

// ====== N12: JURNAL VOCAL (Web Speech API) ======
var _voiceRec = null;
function startVoiceInput(targetId) {
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var btn = document.getElementById('voiceDictateBtn');
  if (!SpeechRec) {
    showToast('Dictarea vocal\u0103 nu este suportat\u0103. Foloseste Chrome pe Android.', 'warning');
    if (btn) btn.style.display = 'none';
    return;
  }
  if (_voiceRec) { try { _voiceRec.stop(); } catch(e) {} _voiceRec = null; return; }
  var inputEl = document.getElementById(targetId);
  if (!inputEl) return;
  _voiceRec = new SpeechRec();
  _voiceRec.lang = 'ro-RO';
  _voiceRec.interimResults = false;
  _voiceRec.maxAlternatives = 1;
  if (btn) { btn.textContent = '\uD83C\uDF99\uFE0F Ascult\u2026'; btn.style.background = 'rgba(212,83,74,0.3)'; }
  _voiceRec.onresult = function(e) {
    var text = e.results[0][0].transcript;
    inputEl.value = (inputEl.value ? inputEl.value.trim() + '. ' : '') + text.charAt(0).toUpperCase() + text.slice(1);
  };
  _voiceRec.onend = function() {
    _voiceRec = null;
    if (btn) { btn.textContent = '\uD83C\uDFA4'; btn.style.background = ''; }
  };
  _voiceRec.onerror = function(e) {
    _voiceRec = null;
    if (btn) { btn.textContent = '\uD83C\uDFA4'; btn.style.background = ''; }
    var msgs = {'not-allowed':'Permisiune microfon refuzat\u0103.','no-speech':'Nicio voce detectat\u0103.','network':'Eroare re\u021Bea.'};
    showToast(msgs[e.error] || 'Eroare dictare: ' + e.error, 'error');
  };
  _voiceRec.start();
}

// ====== N13: COMPARATOR SPECII — Calendare tratamente aliniate ======
var SPECIES_TREATMENTS_MONTHLY = {
  cais:{2:['Zeam\u0103 bordelez\u0103 1%'],3:['Zeam\u0103 bordelez\u0103 1%','Topas 0.4ml/L la inflorire'],4:['Switch 10g/10L post-inflorire'],5:['Teldor 1g/L preventiv'],6:['Switch la nevoie dupa ploaie'],9:['Zeam\u0103 bordelez\u0103 0.5% post-frunze'],11:['Zeam\u0103 bordelez\u0103 1.5% toamna']},
  piersic:{2:['Zeam\u0103 bordelez\u0103 1%','Dithan M-45 anti-basculare'],3:['Topas 0.4ml/L la inflorire'],4:['Confidor 0.5ml/L afide'],5:['Switch monilioz\u0103'],6:['Topas fainare la nevoie'],9:['Zeam\u0103 bordelez\u0103 0.5%'],11:['Zeam\u0103 bordelez\u0103 1%']},
  cires:{2:['Zeam\u0103 bordelez\u0103 1%'],3:['Zeam\u0103 bordelez\u0103 1%'],4:['Switch monilioz\u0103 florilor'],5:['Merpan 2g/L preventiv'],6:['Capcane musca'],9:['Merpan 2g/L'],11:['Zeam\u0103 bordelez\u0103 1%']},
  visin:{2:['Zeam\u0103 bordelez\u0103 1%'],3:['Zeam\u0103 bordelez\u0103 1%'],4:['Merpan 2g/L p\u0103tare frunze'],5:['Merpan 2g/L'],6:['Switch la nevoie'],9:['Zeam\u0103 bordelez\u0103 0.5%'],11:['Zeam\u0103 bordelez\u0103 1%']},
  'mar-florina':{2:['Zeam\u0103 bordelez\u0103 1.5%'],3:['Captan 2g/L pre-inflorire'],4:['Captan 2g/L post-inflorire','Topas fainare'],5:['Captan sau Merpan preventiv'],6:['Score 2ml/L la nevoie'],9:['Zeam\u0103 bordelez\u0103 0.5%'],11:['Zeam\u0103 bordelez\u0103 1%']},
  'mar-golden':{2:['Zeam\u0103 bordelez\u0103 1.5%'],3:['Captan 2g/L'],4:['Captan 2g/L','Topas fainare'],5:['Merpan preventiv'],9:['Zeam\u0103 bordelez\u0103 0.5%'],11:['Zeam\u0103 bordelez\u0103 1%']},
  'par-clapp':{2:['Zeam\u0103 bordelez\u0103 1.5%'],3:['Captan 2g/L'],4:['Captan 2g/L post-inflorire'],5:['Merpan preventiv'],6:['Score la nevoie'],9:['Zeam\u0103 bordelez\u0103 0.5%'],11:['Zeam\u0103 bordelez\u0103 1%']},
  'par-williams':{2:['Zeam\u0103 bordelez\u0103 1.5%'],3:['Captan 2g/L'],4:['Captan post-inflorire'],5:['Merpan preventiv'],9:['Zeam\u0103 bordelez\u0103 0.5%'],11:['Zeam\u0103 bordelez\u0103 1%']},
  prun:{2:['Zeam\u0103 bordelez\u0103 1%'],3:['Zeam\u0103 bordelez\u0103 1%'],4:['Topas 0.4ml/L'],5:['Topas la nevoie'],9:['Zeam\u0103 bordelez\u0103 0.5%'],11:['Zeam\u0103 bordelez\u0103 1%']},
  migdal:{1:['Zeam\u0103 bordelez\u0103 1% pana la dezmugurit'],2:['Topas la inflorire timpurie'],3:['Zeam\u0103 bordelez\u0103 0.5% dupa inflorire'],11:['Zeam\u0103 bordelez\u0103 1%']},
};

function renderSpeciesComparator() {
  var sel1 = document.getElementById('compSp1') ? document.getElementById('compSp1').value : '';
  var sel2 = document.getElementById('compSp2') ? document.getElementById('compSp2').value : '';
  var res = document.getElementById('comparatorResult');
  if (!res) return;
  if (!sel1 || !sel2 || sel1 === sel2) {
    res.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:12px;">Selecteaz\u0103 dou\u0103 specii diferite.</p>';
    return;
  }
  var MONTHS = ['','Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec'];
  var t1 = SPECIES_TREATMENTS_MONTHLY[sel1] || {}, t2 = SPECIES_TREATMENTS_MONTHLY[sel2] || {};
  var currentMonth = new Date().getMonth() + 1;
  var html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.78rem;">' +
    '<tr><th style="padding:5px 8px;border:1px solid var(--border);">Luna</th>' +
    '<th style="padding:5px 8px;border:1px solid var(--border);color:var(--accent);">' + sel1.replace('-',' ').toUpperCase() + '</th>' +
    '<th style="padding:5px 8px;border:1px solid var(--border);color:var(--info);">' + sel2.replace('-',' ').toUpperCase() + '</th>' +
    '<th style="padding:5px 8px;border:1px solid var(--border);">Combin</th></tr>';
  for (var m = 1; m <= 12; m++) {
    var tr1 = t1[m] || [], tr2 = t2[m] || [];
    var hasBoth = tr1.length > 0 && tr2.length > 0;
    var bg = m === currentMonth ? 'background:rgba(106,191,105,0.08);' : m % 2 === 0 ? 'background:var(--bg-surface);' : '';
    html += '<tr style="' + bg + (m === currentMonth ? 'font-weight:700;' : '') + '">' +
      '<td style="padding:5px 8px;border:1px solid var(--border);">' + (m === currentMonth ? '\uD83D\uDCCD ' : '') + MONTHS[m] + '</td>' +
      '<td style="padding:5px 8px;border:1px solid var(--border);color:var(--accent-dim);font-size:0.75rem;">' + (tr1.length ? tr1.join('<br>') : '<span style="opacity:0.3">\u2014</span>') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid var(--border);color:var(--info);font-size:0.75rem;">' + (tr2.length ? tr2.join('<br>') : '<span style="opacity:0.3">\u2014</span>') + '</td>' +
      '<td style="padding:5px 8px;border:1px solid var(--border);text-align:center;">' + (hasBoth ? '<span style="color:var(--accent);">\u2713</span>' : '') + '</td></tr>';
  }
  html += '</table></div><p style="font-size:0.72rem;color:var(--text-dim);margin-top:6px;">\u2713 = luni cu tratamente la ambele \u2014 combin\u0103 ntr-o singur\u0103 tur\u0103 (verific\u0103 compatibilitatea produselor).</p>';
  res.innerHTML = html;
}

// ====== N14: HARTA LIVADA VIZUALA ======
var TREE_ICONS = {cais:'\uD83C\uDF51',piersic:'\uD83C\uDF51',cires:'\uD83C\uDF52',visin:'\uD83C\uDF52',prun:'\uD83E\uDED0','mar-florina':'\uD83C\uDF4E','mar-golden':'\uD83C\uDF4E','par-clapp':'\uD83C\uDF50','par-williams':'\uD83C\uDF50','par-hosui':'\uD83C\uDF50','par-napoca':'\uD83C\uDF50',migdal:'\uD83C\uDF30',rodiu:'\uD83E\uDEB7',kaki:'\uD83D\uDFE0',afin:'\uD83E\uDED0',zmeur:'\uD83C\uDF53','zmeur-galben':'\uD83C\uDF53',mur:'\u26AB','mur-copac':'\u26AB',alun:'\uD83C\uDF30'};
var TREE_STATUS_COLORS = {ok:'var(--accent)',warning:'var(--warning)',sick:'var(--danger)'};
function getTreeMap() { return JSON.parse(localStorage.getItem('livada-tree-map') || '{}'); }
function saveTreeMap(map) { localStorage.setItem('livada-tree-map', JSON.stringify(map)); }

function openTreeMapModal() {
  openModal('treemap');
  renderTreeMap();
}

function renderTreeMap() {
  var map = getTreeMap();
  var ROWS = 10, COLS = 12;
  var container = document.getElementById('treemapGrid');
  if (!container) return;
  var html = '<div style="display:grid;grid-template-columns:repeat(' + COLS + ',1fr);gap:3px;min-width:' + (COLS * 38) + 'px;">';
  for (var r = 1; r <= ROWS; r++) {
    for (var c = 1; c <= COLS; c++) {
      var key = 'r' + r + 'c' + c;
      var tree = map[key];
      var icon = tree ? (TREE_ICONS[tree.species] || '\uD83C\uDF33') : '+';
      var border = tree ? ('2px solid ' + (TREE_STATUS_COLORS[tree.status || 'ok'])) : '1px dashed var(--border)';
      html += '<button onclick="openTreeCell(\'' + key + '\')" title="' +
        (tree ? escapeHtml(tree.name || key) : 'Liber R' + r + 'C' + c) + '" ' +
        'style="aspect-ratio:1;border:' + border + ';border-radius:6px;background:' +
        (tree ? 'rgba(106,191,105,0.06)' : 'transparent') + ';cursor:pointer;font-size:' +
        (tree ? '1rem' : '0.75rem') + ';min-height:32px;padding:0;color:' +
        (tree ? 'inherit' : 'var(--border)') + ';">' + icon + '</button>';
    }
  }
  html += '</div>';
  container.innerHTML = html;
  document.getElementById('treemapDetailPanel').style.display = 'none';
}

function openTreeCell(key) {
  var map = getTreeMap();
  var t = map[key] || {};
  document.getElementById('treeCellKey').value = key;
  document.getElementById('treeCellName').value = t.name || '';
  document.getElementById('treeCellSpecies').value = t.species || '';
  document.getElementById('treeCellPlanted').value = t.planted || '';
  document.getElementById('treeCellStatus').value = t.status || 'ok';
  document.getElementById('treeCellNotes').value = t.notes || '';
  var panel = document.getElementById('treemapDetailPanel');
  var title = document.getElementById('treemapDetailTitle');
  if (title) title.textContent = 'Pom: ' + key + (t.name ? ' \u2014 ' + t.name : '');
  if (panel) panel.style.display = 'block';
}

function saveTreeCell() {
  var key = document.getElementById('treeCellKey').value;
  var map = getTreeMap();
  var species = document.getElementById('treeCellSpecies').value;
  var name = document.getElementById('treeCellName').value.trim();
  if (!species && !name) { delete map[key]; }
  else {
    map[key] = {species:species, name:name, planted:document.getElementById('treeCellPlanted').value,
      notes:document.getElementById('treeCellNotes').value.trim(),
      status:document.getElementById('treeCellStatus').value, updatedAt:todayLocal()};
  }
  saveTreeMap(map);
  renderTreeMap();
  document.getElementById('treemapDetailPanel').style.display = 'none';
  showToast(name ? 'Pom "' + name + '" salvat.' : 'Celul\u0103 cur\u0103\u021Bat\u0103.');
}

function clearTreeCell() {
  if (!confirm('Stergi datele acestui pom?')) return;
  var key = document.getElementById('treeCellKey').value;
  var map = getTreeMap();
  delete map[key];
  saveTreeMap(map);
  renderTreeMap();
  document.getElementById('treemapDetailPanel').style.display = 'none';
  showToast('Pom eliminat din hart\u0103.');
}

// ====== N15: NOTE PER POM INDIVIDUAL ======
function getTrees(species) {
  var all = JSON.parse(localStorage.getItem('livada-trees') || '[]');
  return species ? all.filter(function(t) { return t.species === species; }) : all;
}
function saveAllTrees(list) { localStorage.setItem('livada-trees', JSON.stringify(list)); }

function openTreePanel(speciesId) {
  var panel = document.getElementById('treePanel-' + speciesId);
  if (!panel) return;
  var isVisible = panel.style.display !== 'none' && panel.style.display !== '';
  if (isVisible) { panel.style.display = 'none'; return; }
  renderTreePanel(speciesId);
  panel.style.display = 'block';
}

function renderTreePanel(speciesId) {
  var panel = document.getElementById('treePanel-' + speciesId);
  if (!panel) return;
  var trees = getTrees(speciesId);
  var label = (SPECIES[speciesId] || speciesId);
  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
    '<strong style="font-size:0.85rem;">\uD83C\uDF33 Pomi ' + escapeHtml(label) + ': ' + trees.length + '</strong>' +
    '<button class="btn btn-primary" style="font-size:0.75rem;padding:5px 10px;" onclick="addTreeNote(\'' + speciesId + '\')">+ Pom nou</button></div>';
  if (trees.length === 0) {
    html += '<p style="color:var(--text-dim);font-size:0.82rem;text-align:center;padding:12px 0;">Niciun pom \u00EEnregistrat. Adaug\u0103 primul pentru tracking individual.</p>';
  } else {
    trees.forEach(function(t) {
      var sc = {ok:'var(--accent)',warning:'var(--warning)',sick:'var(--danger)'}[t.status || 'ok'];
      var age = t.planted ? (' \u2022 ' + (new Date().getFullYear() - parseInt(t.planted)) + ' ani') : '';
      html += '<div style="padding:8px 10px;margin:4px 0;background:var(--bg-surface);border-radius:8px;border-left:3px solid ' + sc + ';">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
        '<strong style="font-size:0.85rem;">' + escapeHtml(t.label || t.id) + '</strong>' +
        '<button onclick="editTreeNote(\'' + t.id + '\',\'' + speciesId + '\')" style="font-size:0.7rem;padding:3px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text);">\u270F\uFE0F Edit</button></div>' +
        (t.planted ? '<div style="font-size:0.72rem;color:var(--text-dim);">Plantat: ' + t.planted + age + '</div>' : '') +
        (t.notes ? '<div style="font-size:0.82rem;margin-top:3px;">' + escapeHtml(t.notes) + '</div>' : '') +
        '</div>';
    });
  }
  panel.innerHTML = html;
}

function addTreeNote(speciesId) {
  var trees = getTrees();
  var num = getTrees(speciesId).length + 1;
  var label = (SPECIES[speciesId] || speciesId) + ' #' + num;
  var newTree = {id:speciesId + '-' + Date.now(), species:speciesId, label:label, notes:'', status:'ok', planted:'', updatedAt:todayLocal()};
  trees.push(newTree);
  saveAllTrees(trees);
  renderTreePanel(speciesId);
  editTreeNote(newTree.id, speciesId);
}

function editTreeNote(treeId, speciesId) {
  var trees = getTrees();
  var t = trees.find(function(x) { return x.id === treeId; });
  if (!t) return;
  var labelHtml = prompt('Nume pom:', t.label || '');
  if (labelHtml === null) return;
  var notesHtml = prompt('Note (boli, productie, observatii):', t.notes || '');
  var status = prompt('Status (ok / warning / sick):', t.status || 'ok') || 'ok';
  var planted = prompt('An plantat (ex: 2018):', t.planted || '') || '';
  t.label = labelHtml.trim() || t.label;
  t.notes = notesHtml !== null ? notesHtml : t.notes;
  t.status = ['ok','warning','sick'].includes(status) ? status : 'ok';
  t.planted = planted;
  t.updatedAt = todayLocal();
  saveAllTrees(trees);
  renderTreePanel(speciesId);
  showToast('Pom "' + t.label + '" actualizat.');
}

// ====== N16: TURA SAPTAMANALA — Checklist ghidat ======
var INSPECTION_GUIDE = {
  2:{general:['Ultima sansa pentru taieri de iarna inainte de dezmugurit','Zeama bordelez\u0103 preventiv\u0103 la specii sensibile'],migdal:['Dezmugurit timpuriu posibil \u2014 verific\u0103 zilnic, protejeaz\u0103 la inghet cu agrotextil'],piersic:['Muguri umfla\u021Bi, ro\u015Fietici, deforma\u021Bi = basculare! Dithan M-45 urgent']},
  3:{general:['INGHE\u021C tarziu posibil! Verific\u0103 prognoza zilnic \u2014 -2\u00B0C la inflorire = pierdere total\u0103','Prima stropire preventiv\u0103: zeam\u0103 bordelez\u0103 1% la umezire mugure'],cais:['Inflorescente cu muguri negri = Monilinia! Taie \u015Fi arde IMEDIAT','Scurgeri de gum\u0103 (gomoz\u0103) pe ramuri = ciuperci sau soc mecanic'],piersic:['Frunze umflate, ro\u015Fietice, deformate = basculare activ\u0103 = Dithan M-45 URGENT'],'mar-florina':['Pete mici uleiose pe l\u0103stari noi = rapan! Captan 2g/L preventiv']},
  4:{general:['S\u0103pt\u0103m\u00E2nal \u00EEn livad\u0103 obligatoriu \u2014 evolu\u021Bie rapid\u0103','Irigat dac\u0103 nu a plouat 10+ zile'],cais:['Monilioz\u0103 fructe verzi (dup\u0103 ploaie+c\u0103ldur\u0103): Switch 10g/10L urgent'],'mar-florina':['R\u0103pan activ! Verific\u0103 fa\u021Ba INFERIOAR\u0103 a frunzelor \u2014 pete brune-cenu\u015Fii'],piersic:['Afide pe l\u0103stari noi = s\u0103pun potasic 2% sau Confidor 0.5ml/L'],cires:['Monilioz\u0103 flori: flori \u00EEng\u0103lbenite, ramuri uscate = Switch urgent']},
  5:{general:['Nu stropi c\u00E2nd albinele sunt active (strope\u015Fte la 6-8 sau dup\u0103 19)','Scor spray sub 40%: evit\u0103 tratamentele \u2014 risc fitotoxicitate'],cais:['Fructe verzi: monilioz\u0103 posibil\u0103 dup\u0103 ploaie. Teldor 1g/L preventiv'],cires:['Musca cire\u015Fului activ\u0103! Instaleaz\u0103 capcane cromotrope galbene ACUM'],piersic:['R\u0103rit fructe dac\u0103 sunt prea dese (>5cm \u00EEntre fructe)']},
  6:{general:['Canicular\u0103 posibil\u0103: nu stropi \u00EEntre 10-18 (fitotoxicitate)','Verific\u0103 integritatea plasei anti-p\u0103s\u0103ri'],cires:['RECOLT\u0102 CIRe\u015E \u2014 verific\u0103 zilnic. Cr\u0103p\u0103turi = recoltare prea t\u00E2rzie'],cais:['RECOLT\u0102 CAIS \u2014 monilioz\u0103 rapid\u0103 pe fructe coapte dup\u0103 ploaie'],visin:['RECOLT\u0102 VI\u015eIN + capcane Drosophila suzukii verificate s\u0103pt\u0103m\u00E2nal']},
  7:{general:['Temperaturi ridicate \u2014 nu stropi \u00EEntre 10-18','Irigat regulat dac\u0103 nu plou\u0103'],piersic:['RECOLT\u0102 PIERSIC TIMPURIU \u2014 verific\u0103 coloratia'],'par-clapp':['RECOLT\u0102 P\u0102R CLAPP \u2014 \u00EEnainte de maturare complet\u0103 (se p\u0103streaz\u0103 la rece)'],zmeur:['RECOLT\u0102 ZMEUR \u2014 culege la 2-3 zile']},
  8:{general:['Ploile de august = risc boli dup\u0103 canicula','Preg\u0103tire toamn\u0103: verificare tutori'],piersic:['RECOLT\u0102 PIERSIC T\u0102RDIV'],'par-williams':['RECOLT\u0102 P\u0102R WILLIAMS'],mur:['RECOLT\u0102 MUR \u2014 culege c\u00E2nd fructele sunt negre-lucioase']},
  9:{general:['Tratamente fitosanitare de toamn\u0103 \u2014 zeam\u0103 bordelez\u0103 1% preventiv','Recoltare nuci \u015Fi alune'],'mar-florina':['RECOLT\u0102 M\u0102R FLORINA \u2014 sept-oct. Verific\u0103 fermitatea'],alun:['RECOLT\u0102 ALUN \u2014 scutur\u0103 c\u00E2nd \u00EEncep s\u0103 cad\u0103 singure'],prun:['RECOLT\u0102 PRUN T\u0102RDIV']},
  10:{general:['Toamn\u0103: verific\u0103 starea scoar\u021Bei (fisuri, leziuni)','Zeam\u0103 bordelez\u0103 1% preventiv pe toate speciile'],kaki:['RECOLT\u0102 KAKI dup\u0103 primul ger u\u015Bor (sub 5\u00B0C noaptea)'],rodiu:['RECOLT\u0102 RODIU \u2014 c\u00E2nd coaja devine ro\u015Fie-\u00EEnchis\u0103 \u015Fi fructele \u00EEncep s\u0103 crap\u0103']},
  11:{general:['R\u0103stringe frunze c\u0103zute (focare boli)','Ultima stropire zeam\u0103 bordelez\u0103 dup\u0103 c\u0103derea frunzelor'],afin:['Verificare pH sol \u2014 ideal 4.5-5.5. Acidifiere toamn\u0103 dac\u0103 pH>5.5'],zmeur:['Taiere tulpini vechi (care au rodit) p\u00E2n\u0103 la p\u0103m\u00E2nt']},
  12:{general:['Planificare cump\u0103r\u0103ri produse fitosanitare pentru sezonul urm\u0103tor','T\u0103ieri de iarn\u0103 la specii rezistente (m\u0103r, p\u0103r, prun) p\u00E2n\u0103 la -5\u00B0C']},
};

function openInspectionChecklist() {
  openModal('inspection');
  renderInspectionChecklist();
}

function renderInspectionChecklist() {
  var month = new Date().getMonth() + 1;
  var guide = INSPECTION_GUIDE[month];
  var MONTHS = ['','Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
  var body = document.getElementById('inspectionBody');
  if (!body) return;
  if (!guide) {
    body.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:20px;">Ghid de inspec\u021Bie disponibil pentru lunile Februarie\u2014Noiembrie.<br>Consult\u0103 calendarul tratamente din tab-ul speciei.</p>';
    return;
  }
  var items = [];
  Object.keys(guide).forEach(function(key) {
    (guide[key] || []).forEach(function(text) {
      items.push({text:text, cat: key === 'general' ? 'GENERAL' : key.toUpperCase().replace(/-/g, ' ')});
    });
  });
  var html = '<p style="font-size:0.82rem;color:var(--text-dim);margin-bottom:10px;">' +
    MONTHS[month] + ' \u2014 ' + items.length + ' puncte de verificat</p>';
  items.forEach(function(item, idx) {
    html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;">' +
      '<input type="checkbox" id="insp-' + idx + '" style="margin-top:3px;min-width:18px;height:18px;">' +
      '<div><div style="font-size:0.68rem;color:var(--accent-dim);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">' + escapeHtml(item.cat) + '</div>' +
      '<div style="font-size:0.85rem;line-height:1.4;">' + escapeHtml(item.text) + '</div></div></label>';
  });
  html += '<button class="btn btn-primary" style="width:100%;margin-top:14px;" onclick="finishInspection(' + items.length + ')">\u2713 Finalizeaz\u0103 tura \u2014 adaug\u0103 \u00EEn jurnal</button>';
  body.innerHTML = html;
}

function finishInspection(total) {
  var done = 0;
  for (var i = 0; i < (total || 0); i++) {
    var cb = document.getElementById('insp-' + i);
    if (cb && cb.checked) done++;
  }
  var note = 'Tur\u0103 inspec\u021Bie: ' + done + '/' + (total || '?') + ' puncte verificate.';
  var jNote = document.getElementById('jurnalNote');
  if (jNote) jNote.value = note;
  closeModal('inspection');
  openModal('jurnal');
  showToast('Tur\u0103 finalizat\u0103! Adaug\u0103 observa\u021Bii \u00EEn jurnal.');
}

// ====== N17: RAPORT PRINTABIL PER SPECIE ======
function printSpeciesReport(speciesId) {
  var speciesLabel = SPECIES[speciesId] || speciesId;
  var year = new Date().getFullYear();
  var journal = getJurnalEntries();
  var entries = journal.filter(function(e) {
    if (!e.date || !e.date.startsWith(String(year))) return false;
    if (!e.species) return true;
    return e.species === speciesId || e.species.toLowerCase() === speciesLabel.toLowerCase();
  }).sort(function(a, b) { return a.date.localeCompare(b.date); });
  var totalKg = 0, stropiri = 0, tunderi = 0;
  entries.forEach(function(e) {
    var t = (e.type || '').toLowerCase();
    if (t.indexOf('recolt') >= 0) {
      var m = (e.note || '').match(/(\\d+(?:[.,]\\d+)?)\\s*kg/i);
      if (m) totalKg += parseFloat(m[1].replace(',', '.'));
    }
    if (t.indexOf('tratament') >= 0 || t.indexOf('stropire') >= 0) stropiri++;
    if (t.indexOf('tundere') >= 0 || t.indexOf('taiere') >= 0) tunderi++;
  });
  var dateGen = new Date().toLocaleDateString('ro-RO', {day:'2-digit',month:'2-digit',year:'numeric'});
  var html = '<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"><title>Fi\\u015F\\u0103 Cultur\\u0103 ' + speciesLabel + ' ' + year + '</title>' +
    '<style>body{font-family:Arial,sans-serif;font-size:11pt;color:#222;margin:20mm;}' +
    'h1{font-size:16pt;border-bottom:2px solid #2d8a2d;padding-bottom:6px;color:#1a5f1a;}' +
    'h2{font-size:12pt;color:#2d8a2d;margin-top:16px;}' +
    '.box{background:#f0f9f0;border:1px solid #b8d8b8;border-radius:4px;padding:10px 14px;margin:10px 0;display:flex;gap:16px;flex-wrap:wrap;}' +
    '.stat{text-align:center;padding:6px 12px;background:#e8f5e8;border-radius:6px;}' +
    '.stat .val{font-size:1.3rem;font-weight:700;color:#1a5f1a;}.stat .lbl{font-size:0.8rem;color:#555;}' +
    'table{width:100%;border-collapse:collapse;margin-top:8px;}' +
    'th{background:#e8f5e8;padding:6px 8px;text-align:left;border:1px solid #b8d8b8;font-size:10pt;}' +
    'td{padding:5px 8px;border:1px solid #d8e8d8;font-size:10pt;vertical-align:top;}' +
    'tr:nth-child(even){background:#f8fdf8;}' +
    '.footer{margin-top:20px;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:8px;}' +
    '@media print{body{margin:15mm}}</style></head><body>' +
    '<h1>Fi\\u015F\\u0103 Cultur\\u0103 \\u2014 ' + speciesLabel + ' | ' + year + '</h1>' +
    '<p><strong>Proprietar:</strong> Roland Petrila &nbsp;|&nbsp; <strong>Loca\\u021Bie:</strong> Nadlac, jud. Arad &nbsp;|&nbsp; <strong>Generat:</strong> ' + dateGen + '</p>' +
    '<div class="box">' +
    '<div class="stat"><div class="val">' + entries.length + '</div><div class="lbl">Interven\\u021Bii</div></div>' +
    '<div class="stat"><div class="val">' + stropiri + '</div><div class="lbl">Tratamente</div></div>' +
    (tunderi > 0 ? '<div class="stat"><div class="val">' + tunderi + '</div><div class="lbl">T\\u0103ieri</div></div>' : '') +
    (totalKg > 0 ? '<div class="stat"><div class="val">' + totalKg.toFixed(1) + ' kg</div><div class="lbl">Recolt\\u0103</div></div>' : '') +
    '</div>';
  if (entries.length > 0) {
    html += '<h2>Registru Interven\\u021Bii ' + year + '</h2>' +
      '<table><tr><th>Data</th><th>Tip</th><th>Not\\u0103</th></tr>';
    entries.forEach(function(e) {
      html += '<tr><td style="white-space:nowrap;">' + e.date + '</td><td>' + escapeHtml(e.type || '\\u2014') + '</td><td>' + escapeHtml(e.note || '\\u2014') + '</td></tr>';
    });
    html += '</table>';
  } else {
    html += '<p style="color:#888;">Nicio interven\\u021Bie \\u00EEnregistrat\\u0103 \\u00EEn jurnal pentru ' + speciesLabel + ' \\u00EEn ' + year + '.</p>';
  }
  html += '<div class="footer">Generat de Livada Mea Dashboard (livada-mea-psi.vercel.app) pe ' + dateGen + '</div>' +
    '<scr' + 'ipt>window.print();window.onafterprint=function(){window.close()};<\\/scr' + 'ipt></body></html>';
  var popup = window.open('', '_blank', 'width=820,height=640');
  if (!popup) { showToast('Popup blocat! Permite popup-uri pentru livada-mea-psi.vercel.app.', 'error'); return; }
  popup.document.write(html);
  popup.document.close();
}

// Initializare voice button (ascunde daca nu e suportat)
document.addEventListener('DOMContentLoaded', function() {
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
    var btn = document.getElementById('voiceDictateBtn');
    if (btn) btn.style.display = 'none';
  }
});
'''

INSERT_BEFORE_CLOSE = '</script>\n<script defer src="https://va.vercel-scripts.com/v1/speed-insights/script.js">'
if INSERT_BEFORE_CLOSE in content:
    content = content.replace(INSERT_BEFORE_CLOSE, NEW_JS_FUNCTIONS + INSERT_BEFORE_CLOSE, 1)
    print("[OK] Change 5: Toate functiile JS noi adaugate (N8-N17)")
else:
    print("[FAIL] Change 5: Pattern </script> speed-insights negasit!")

# ============================================================
# CHANGE 6: Add tree panel div in each species tab (N15)
# For simplicity, add it via injectSpeciesTools after the sp-tools div
# ============================================================
OLD_INJECT_END = '''  tc.insertBefore(div, tc.firstChild);
  injectSeasonalTip(tabId, tc);'''
NEW_INJECT_END = '''  tc.insertBefore(div, tc.firstChild);
  // N15: Tree notes panel (hidden by default, toggle via button)
  if (!document.getElementById('treePanel-' + tabId)) {
    var tpDiv = document.createElement('div');
    tpDiv.id = 'treePanel-' + tabId;
    tpDiv.style.display = 'none';
    tpDiv.style.cssText = 'padding:10px 12px;margin:6px 0;background:var(--bg-card);border-radius:10px;border:1px solid var(--border);';
    tc.insertBefore(tpDiv, tc.children[1] || null);
  }
  injectSeasonalTip(tabId, tc);'''

if OLD_INJECT_END in content:
    content = content.replace(OLD_INJECT_END, NEW_INJECT_END, 1)
    print("[OK] Change 6: Tree panel div injectat in species tabs (N15)")
else:
    print("[FAIL] Change 6: Pattern insertBefore injectSeasonalTip negasit!")

# ============================================================
# VERIFY and SAVE
# ============================================================
new_lines = content.count(chr(10))
print(f"\nRezultat final: {len(content)} caractere, {new_lines} linii")
print(f"Diferenta: +{len(content) - original_len} caractere, +{new_lines - content[:original_len].count(chr(10))} linii")

with open(HTML_PATH, 'w', encoding='utf-8', errors='replace') as f:
    f.write(content)
print(f"\n[OK] Fisier salvat: {HTML_PATH}")
print("Verificare cheie patterns:")
print("  modal-planner:", 'modal-planner' in content)
print("  modal-comparator:", 'modal-comparator' in content)
print("  modal-treemap:", 'modal-treemap' in content)
print("  modal-inspection:", 'modal-inspection' in content)
print("  voiceDictateBtn:", 'voiceDictateBtn' in content)
print("  startVoiceInput:", 'startVoiceInput' in content)
print("  calculateGDD:", 'calculateGDD' in content)
print("  renderChillHoursWidget:", 'renderChillHoursWidget' in content)
print("  openWeeklyPlanner:", 'openWeeklyPlanner' in content)
print("  assessDiseaseRisks:", 'assessDiseaseRisks' in content)
print("  printSpeciesReport:", 'printSpeciesReport' in content)
print("  openInspectionChecklist:", 'openInspectionChecklist' in content)
print("  renderTreeMap:", 'renderTreeMap' in content)
print("  openTreePanel:", 'openTreePanel' in content)
print("  renderSpeciesComparator:", 'renderSpeciesComparator' in content)
print("  Raport cultura button:", 'Raport cultur' in content)
print("  Planner 7 zile button:", 'Planner 7 zile' in content)
