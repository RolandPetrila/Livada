#!/usr/bin/env python3
"""
II1 — Cost Tracker implementation for Livada Mea Dashboard
Injects: modal HTML, button in Actiuni rapide, JS functions
"""

import sys

HTML_PATH = r'C:\Proiecte\Livada\public\index.html'

# --- Read and normalize line endings ---
with open(HTML_PATH, 'rb') as f:
    raw = f.read()

c = raw.decode('utf-8', errors='replace')
c = c.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')

print(f"File loaded: {len(c)} chars, {c.count(chr(10))} lines")

# =====================================================================
# 1. MODAL HTML — insert before DOMPurify script tag
# =====================================================================

MODAL_ANCHOR = '<script defer src="https://cdn.jsdelivr.net/npm/dompurify@3.3.3/dist/purify.min.js"></script>'

MODAL_HTML = '''<!-- ====== MODAL: COST TRACKER (II1) ====== -->
<div class="modal-overlay" role="dialog" aria-modal="true" id="modal-costs">
  <div class="modal" style="max-height:90vh;display:flex;flex-direction:column;">
    <div class="modal-header">
      <h2>&#128176; Costuri Sezon</h2>
      <button class="modal-close" aria-label="Inchide" onclick="closeModal('costs')">&#10005;</button>
    </div>
    <div class="modal-body" id="costsBody" style="overflow-y:auto;flex:1;">

      <!-- Formular adaugare -->
      <div id="costsForm" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px;">
        <h3 style="margin:0 0 12px;font-size:0.95rem;">&#10133; Adaug&#259; cheltuial&#259;</h3>
        <label for="costDate">Data *</label>
        <input type="date" id="costDate" style="width:100%;box-sizing:border-box;min-height:44px;" />

        <label for="costCategory">Categorie *</label>
        <select id="costCategory" style="width:100%;box-sizing:border-box;min-height:44px;">
          <option value="Fungicide">&#129440; Fungicide</option>
          <option value="Insecticide">&#128027; Insecticide</option>
          <option value="Fertilizant">&#127807; Fertilizant</option>
          <option value="Irigare">&#128167; Irigare</option>
          <option value="Echipament">&#128295; Echipament</option>
          <option value="Altele">&#128717; Altele</option>
        </select>

        <label for="costProduct">Produs *</label>
        <input type="text" id="costProduct" placeholder="ex: Merpan 80 WG" style="width:100%;box-sizing:border-box;min-height:44px;" />

        <div style="display:grid;grid-template-columns:1fr 80px;gap:8px;">
          <div>
            <label for="costQty">Cantitate *</label>
            <input type="number" id="costQty" min="0" step="0.01" placeholder="ex: 2.5" style="width:100%;box-sizing:border-box;min-height:44px;" />
          </div>
          <div>
            <label for="costUnit">UM</label>
            <select id="costUnit" style="width:100%;box-sizing:border-box;min-height:44px;">
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="buc">buc</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
            </select>
          </div>
        </div>

        <label for="costPrice">Pre&#539; / unitate (RON) *</label>
        <input type="number" id="costPrice" min="0" step="0.01" placeholder="ex: 45.00" style="width:100%;box-sizing:border-box;min-height:44px;" />

        <button class="btn btn-primary" style="width:100%;margin-top:14px;min-height:44px;" onclick="addCostEntry()">
          &#10133; Adaug&#259; cheltuial&#259;
        </button>
      </div>

      <!-- Stats + lista -->
      <div id="costsStats"></div>

    </div>
  </div>
</div>

'''

if MODAL_ANCHOR in c:
    c = c.replace(MODAL_ANCHOR, MODAL_HTML + MODAL_ANCHOR)
    print("OK: Modal HTML injected before DOMPurify script tag")
else:
    print("ERROR: DOMPurify anchor not found!")
    sys.exit(1)

# =====================================================================
# 2. BUTTON in "Actiuni rapide" section — add after the 2x2 grid
# =====================================================================

BUTTON_ANCHOR = '''      <button class="sp-tool-btn" style="justify-content:center;" onclick="openModal('calculator')"><span class="sti">&#129518;</span> Calculator doze</button>
    </div>'''

BUTTON_HTML = '''      <button class="sp-tool-btn" style="justify-content:center;" onclick="openCostTracker()"><span class="sti">&#128176;</span> Costuri</button>
    </div>'''

if BUTTON_ANCHOR in c:
    c = c.replace(BUTTON_ANCHOR, BUTTON_HTML)
    print("OK: Costuri button injected in Actiuni rapide grid")
else:
    print("ERROR: Button anchor not found! Trying alternative...")
    # Try without exact whitespace
    alt_anchor = 'openModal(\'calculator\')"><span class="sti">&#129518;</span> Calculator doze</button>\n    </div>'
    if alt_anchor in c:
        c = c.replace(alt_anchor, alt_anchor + '\n      <button class="sp-tool-btn" style="justify-content:center;" onclick="openCostTracker()"><span class="sti">&#128176;</span> Costuri</button>')
        print("OK: Button injected via alternative anchor")
    else:
        print("ERROR: Alternative button anchor also not found!")
        sys.exit(1)

# =====================================================================
# 3. JS FUNCTIONS — insert before </script> before speed-insights
# =====================================================================

JS_ANCHOR = '<script defer src="https://va.vercel-scripts.com/v1/speed-insights/script.js"></script>'

JS_CODE = '''
// ====== II1: COST TRACKER ======

function getCostEntries() {
  try {
    var data = localStorage.getItem('livada-costs');
    return data ? JSON.parse(data) : [];
  } catch(e) { return []; }
}

function saveCostEntries(entries) {
  localStorage.setItem('livada-costs', JSON.stringify(entries));
}

function openCostTracker() {
  var dateInput = document.getElementById('costDate');
  if (dateInput && !dateInput.value) dateInput.value = todayLocal();
  renderCostStats();
  openModal('costs');
}

function addCostEntry() {
  var date     = (document.getElementById('costDate')     || {}).value || '';
  var category = (document.getElementById('costCategory') || {}).value || '';
  var product  = ((document.getElementById('costProduct') || {}).value || '').trim();
  var qty      = parseFloat((document.getElementById('costQty')   || {}).value || '0');
  var unit     = (document.getElementById('costUnit')    || {}).value || 'buc';
  var price    = parseFloat((document.getElementById('costPrice') || {}).value || '0');

  // Validation
  if (!date) { alert('Data este obligatorie.'); return; }
  if (!product) { alert('Produsul este obligatoriu.'); return; }
  if (isNaN(price) || price <= 0) { alert('Pretul trebuie sa fie mai mare ca 0.'); return; }
  if (isNaN(qty) || qty <= 0) { alert('Cantitatea trebuie sa fie mai mare ca 0.'); return; }

  var entries = getCostEntries();
  var entry = {
    id: Date.now(),
    date: date,
    category: category,
    product: product,
    qty: qty,
    unit: unit,
    pricePerUnit: price
  };
  entries.push(entry);
  entries.sort(function(a, b) { return b.date.localeCompare(a.date); });
  saveCostEntries(entries);

  // Reset form fields (keep date and category)
  var pEl = document.getElementById('costProduct'); if (pEl) pEl.value = '';
  var qEl = document.getElementById('costQty');     if (qEl) qEl.value = '';
  var prEl = document.getElementById('costPrice');  if (prEl) prEl.value = '';

  renderCostStats();
}

function deleteCostEntry(id) {
  var entries = getCostEntries().filter(function(e) { return e.id !== id; });
  saveCostEntries(entries);
  renderCostStats();
}

function renderCostStats() {
  var container = document.getElementById('costsStats');
  if (!container) return;

  var allEntries = getCostEntries();
  var currentYear = new Date().getFullYear();
  // Filter current season (current year)
  var entries = allEntries.filter(function(e) {
    return e.date && e.date.startsWith(String(currentYear));
  });

  if (entries.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:16px;">Nicio cheltuial\u0103 \u00EEnregistrat\u0103 \u00EEn ' + currentYear + '.</p>';
    return;
  }

  // Total general
  var total = entries.reduce(function(sum, e) {
    return sum + (e.qty * e.pricePerUnit);
  }, 0);

  // Per categorie
  var byCategory = {};
  entries.forEach(function(e) {
    var t = e.qty * e.pricePerUnit;
    byCategory[e.category] = (byCategory[e.category] || 0) + t;
  });
  var maxCat = Math.max.apply(null, Object.values(byCategory).concat([1]));

  var catHTML = Object.entries(byCategory)
    .sort(function(a, b) { return b[1] - a[1]; })
    .map(function(p) {
      var pct = Math.round(p[1] / maxCat * 100);
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">' +
        '<span style="min-width:90px;font-size:0.78rem;color:var(--text-dim);">' + escapeHtml(p[0]) + '</span>' +
        '<div style="flex:1;height:16px;background:var(--bg-surface);border-radius:4px;overflow:hidden;">' +
        '<div style="width:' + pct + '%;height:100%;background:var(--accent);border-radius:4px;transition:width 0.4s;"></div></div>' +
        '<span style="font-size:0.78rem;font-weight:700;min-width:60px;text-align:right;">' + p[1].toFixed(2) + ' RON</span></div>';
    }).join('');

  // Lista intrari
  var listHTML = entries.map(function(e) {
    var entryTotal = (e.qty * e.pricePerUnit).toFixed(2);
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:0.82rem;font-weight:600;">' + escapeHtml(e.product) + '</div>' +
      '<div style="font-size:0.72rem;color:var(--text-dim);">' +
        escapeHtml(e.category) + ' \u2022 ' + e.date + ' \u2022 ' +
        e.qty + ' ' + escapeHtml(e.unit) + ' \u00D7 ' + e.pricePerUnit.toFixed(2) + ' RON' +
      '</div></div>' +
      '<div style="font-size:0.85rem;font-weight:700;white-space:nowrap;">' + entryTotal + ' RON</div>' +
      '<button onclick="deleteCostEntry(' + e.id + ')" style="background:none;border:none;color:var(--text-dim);font-size:1rem;cursor:pointer;padding:4px 8px;min-height:36px;" aria-label="Sterge">\u2715</button>' +
    '</div>';
  }).join('');

  container.innerHTML =
    '<h3 style="margin:0 0 8px;font-size:0.9rem;">&#128200; Total pe categorie (' + currentYear + ')</h3>' +
    catHTML +
    '<p style="font-size:0.85rem;font-weight:700;text-align:right;margin:10px 0 16px;padding-top:8px;border-top:2px solid var(--border);">' +
      'Total sezon: ' + total.toFixed(2) + ' RON' +
    '</p>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
      '<h3 style="margin:0;font-size:0.9rem;">&#128221; Cheltuieli (' + entries.length + ')</h3>' +
      '<button onclick="exportCostsCSV()" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:6px 12px;font-size:0.75rem;cursor:pointer;min-height:36px;">' +
        '&#128196; Export CSV' +
      '</button>' +
    '</div>' +
    '<div>' + listHTML + '</div>';
}

function exportCostsCSV() {
  var entries = getCostEntries();
  var currentYear = new Date().getFullYear();
  var yearEntries = entries.filter(function(e) {
    return e.date && e.date.startsWith(String(currentYear));
  });

  if (yearEntries.length === 0) {
    alert('Nu exista cheltuieli de exportat pentru ' + currentYear + '.');
    return;
  }

  var lines = ['Data,Categorie,Produs,Cantitate,UM,Pret/UM (RON),Total (RON)'];
  yearEntries.forEach(function(e) {
    var total = (e.qty * e.pricePerUnit).toFixed(2);
    lines.push([
      e.date,
      '"' + e.category.replace(/"/g, '""') + '"',
      '"' + e.product.replace(/"/g, '""') + '"',
      e.qty,
      e.unit,
      e.pricePerUnit.toFixed(2),
      total
    ].join(','));
  });

  var csv = lines.join('\\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(csv).then(function() {
      alert('CSV copiat in clipboard! (' + yearEntries.length + ' randuri)');
    }).catch(function() {
      prompt('Copiaza CSV-ul manual:', csv);
    });
  } else {
    prompt('Copiaza CSV-ul manual:', csv);
  }
}

// ====== END II1: COST TRACKER ======

'''

if JS_ANCHOR in c:
    c = c.replace(JS_ANCHOR, JS_CODE + JS_ANCHOR)
    print("OK: JS functions injected before speed-insights script")
else:
    print("ERROR: speed-insights anchor not found!")
    sys.exit(1)

# =====================================================================
# Write output
# =====================================================================
with open(HTML_PATH, 'w', encoding='utf-8', errors='replace') as f:
    f.write(c)

print(f"\nFile written: {len(c)} chars")

# =====================================================================
# Verification
# =====================================================================
print("\n--- VERIFICATION ---")
checks = {
    'modal-costs exists':         'id="modal-costs"' in c,
    'openCostTracker function':   'function openCostTracker()' in c,
    'addCostEntry function':      'function addCostEntry()' in c,
    'renderCostStats function':   'function renderCostStats()' in c,
    'deleteCostEntry function':   'function deleteCostEntry(' in c,
    'exportCostsCSV function':    'function exportCostsCSV()' in c,
    'Costuri button injected':    'openCostTracker()' in c,
    'livada-costs key used':      "livada-costs" in c,
    'modal-body costsBody':       'id="costsBody"' in c,
}

all_ok = True
for name, result in checks.items():
    status = "OK" if result else "FAIL"
    if not result:
        all_ok = False
    print(f"  [{status}] {name}")

print()
if all_ok:
    print("ALL CHECKS PASSED — Cost Tracker implementat cu succes!")
else:
    print("SOME CHECKS FAILED — verificati manual!")
    sys.exit(1)
