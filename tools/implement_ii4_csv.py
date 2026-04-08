#!/usr/bin/env python3
"""
II4 — Import CSV Jurnal
Adauga functionalitate Import CSV in jurnalul din Livada Mea Dashboard.
"""

import os
import sys
import re

HTML_PATH = r'C:\Proiecte\Livada\public\index.html'

def main():
    print(f"[1] Citire fisier: {HTML_PATH}")
    with open(HTML_PATH, 'rb') as f:
        raw = f.read()

    c = raw.decode('utf-8', errors='replace')
    # Normalizeaza line endings
    c = c.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')
    original_len = len(c.splitlines())
    print(f"    Linii originale: {original_len}")

    # =========================================================
    # MODIFICARE 1: Adauga butonul Import CSV si file input
    # in randul cu butoanele JSON/CSV/Copiaza
    # =========================================================
    OLD_BUTTONS_ROW = '''        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.72rem;" onclick="exportJurnal()">JSON</button>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.72rem;" onclick="exportJurnalCSV()">CSV</button>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.72rem;" onclick="copyJurnalClipboard()">&#128203; Copiaz&#259;</button>
        </div>'''

    NEW_BUTTONS_ROW = '''        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.72rem;" onclick="exportJurnal()">JSON</button>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.72rem;" onclick="exportJurnalCSV()">&#128228; CSV</button>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.72rem;" onclick="triggerImportCSV()">&#128229; Import CSV</button>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.72rem;" onclick="copyJurnalClipboard()">&#128203; Copiaz&#259;</button>
        </div>
        <input type="file" id="jurnalCSVInput" accept=".csv,text/csv" style="display:none;" onchange="importJurnalCSV(this)">'''

    if OLD_BUTTONS_ROW not in c:
        print("[EROARE] Pattern butoane export negasit! Verificati manual.")
        sys.exit(1)

    c = c.replace(OLD_BUTTONS_ROW, NEW_BUTTONS_ROW, 1)
    print("[2] Buton 'Import CSV' adaugat in rand cu butoanele export.")

    # =========================================================
    # MODIFICARE 2: Adauga functia importJurnalCSV + triggerImportCSV
    # inainte de </script> final (inainte de vercel speed-insights)
    # =========================================================
    JS_INSERT_MARKER = '''// Initializare voice button (ascunde daca nu e suportat)
document.addEventListener('DOMContentLoaded', function() {
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
    var btn = document.getElementById('voiceDictateBtn');
    if (btn) btn.style.display = 'none';
  }
});
</script>'''

    NEW_JS = '''// Initializare voice button (ascunde daca nu e suportat)
document.addEventListener('DOMContentLoaded', function() {
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
    var btn = document.getElementById('voiceDictateBtn');
    if (btn) btn.style.display = 'none';
  }
});

// ====== II4: IMPORT CSV JURNAL ======
function triggerImportCSV() {
  var inp = document.getElementById('jurnalCSVInput');
  if (inp) { inp.value = ''; inp.click(); }
}

function parseCSVLine(line, delim) {
  // Parses a single CSV line respecting quoted fields
  var result = [];
  var inQuote = false;
  var cur = '';
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === delim && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function normalizeDate(raw) {
  // Accepts YYYY-MM-DD or DD.MM.YYYY or DD/MM/YYYY
  var s = (raw || '').trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD.MM.YYYY or DD/MM/YYYY
  var m = s.match(/^(\d{1,2})[.\\/](\d{1,2})[.\\/](\d{4})$/);
  if (m) {
    var d = m[1].padStart(2,'0');
    var mo = m[2].padStart(2,'0');
    var y = m[3];
    return y + '-' + mo + '-' + d;
  }
  return null;
}

var JURNAL_TYPE_MAP = {
  'fitosanitar': 'fitosanitar', 'fito': 'fitosanitar', 'tratament': 'tratament',
  'tundere': 'tundere', 'taiere': 'tundere', 'tuns': 'tundere',
  'fertilizare': 'fertilizare', 'fertiliz': 'fertilizare', 'ingrasamant': 'fertilizare',
  'irigare': 'irigare', 'iriga': 'irigare', 'udare': 'irigare', 'udat': 'irigare',
  'recoltare': 'recoltare', 'recolta': 'recoltare', 'cules': 'recoltare',
  'observatie': 'observatie', 'obs': 'observatie', 'nota': 'observatie',
  'altele': 'altele', 'altul': 'altele', 'other': 'altele', 'general': 'altele'
};

function normalizeType(raw) {
  var s = (raw || '').toLowerCase().trim();
  if (!s) return 'altele';
  // exact match first
  if (JURNAL_TYPE_MAP[s]) return JURNAL_TYPE_MAP[s];
  // partial match
  var keys = Object.keys(JURNAL_TYPE_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (s.includes(keys[i]) || keys[i].includes(s)) return JURNAL_TYPE_MAP[keys[i]];
  }
  return 'altele';
}

function importJurnalCSV(inputEl) {
  var file = inputEl.files && inputEl.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Fisier prea mare. Maxim 2MB.', 'error');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var text = ev.target.result;
      // Elimina BOM UTF-8 daca exista
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      var lines = text.split(/\r?\n/).filter(function(l){ return l.trim().length > 0; });
      if (lines.length === 0) { showToast('Fisier CSV gol.', 'error'); return; }

      // Auto-detect delimiter: numara ; vs , in prima linie
      var firstLine = lines[0];
      var delim = (firstLine.split(';').length >= firstLine.split(',').length) ? ';' : ',';

      // Detecteaza daca prima linie e header
      var startIdx = 0;
      var firstCols = parseCSVLine(lines[0], delim);
      var firstColLower = (firstCols[0] || '').toLowerCase().trim();
      if (firstColLower === 'data' || firstColLower === 'date' || firstColLower === 'dat\u0103') {
        startIdx = 1; // skip header
      }

      var existing = getJurnalEntries();
      // Construieste set de duplicate pentru comparatie rapida
      var dupSet = {};
      existing.forEach(function(e) {
        var key = (e.date||'') + '|' + (e.type||'') + '|' + (e.note||'').trim().toLowerCase();
        dupSet[key] = true;
      });

      var imported = [];
      var skippedEmpty = 0;
      var skippedDup = 0;
      var errors = [];

      for (var i = startIdx; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var cols = parseCSVLine(line, delim);
        // Coloane: data, tip, nota, specie, kg
        var rawDate = cols[0] || '';
        var rawType = cols[1] || '';
        var rawNote = (cols[2] || '').trim();
        var rawSpecie = (cols[3] || '').trim().toLowerCase();
        var rawKg = cols[4] || '';

        var date = normalizeDate(rawDate);
        if (!date) { skippedEmpty++; errors.push('Linia ' + (i+1) + ': data invalida (' + rawDate + ')'); continue; }
        if (!rawNote) { skippedEmpty++; errors.push('Linia ' + (i+1) + ': nota lipsa'); continue; }

        var type = normalizeType(rawType);
        var key = date + '|' + type + '|' + rawNote.toLowerCase();
        if (dupSet[key]) { skippedDup++; continue; }

        var entry = { id: Date.now() + i, date: date, type: type, note: rawNote };
        if (rawSpecie) entry.species = rawSpecie;
        var kg = parseFloat(rawKg.replace(',', '.'));
        if (kg > 0) entry.kg = kg;

        imported.push(entry);
        dupSet[key] = true; // prevent intra-file duplicates
      }

      if (imported.length === 0 && skippedDup === 0) {
        var errMsg = 'Nicio intrare valida gasita.';
        if (errors.length > 0) errMsg += '\n\nErori:\n' + errors.slice(0,5).join('\n');
        alert(errMsg);
        return;
      }

      // Mesaj confirmare
      var msg = imported.length + ' intrari de importat';
      if (skippedDup > 0) msg += ', ' + skippedDup + ' duplicate sarite';
      if (skippedEmpty > 0) msg += ', ' + skippedEmpty + ' linii invalide';
      msg += '.\n\nContinui importul?';

      if (imported.length > 0 && !confirm(msg)) return;

      if (imported.length > 0) {
        // Adauga intrari noi la inceput (sorted by date desc)
        imported.sort(function(a,b){ return b.date.localeCompare(a.date); });
        var newEntries = imported.concat(existing);
        saveJurnalEntries(newEntries);
        renderJurnal();
        syncJournal().catch(function(e){ console.error('syncJournal:', e); });
        showToast('\u2705 ' + imported.length + ' intrari importate cu succes!');
      } else {
        showToast('Toate intrarile din CSV sunt deja in jurnal.');
      }
    } catch(err) {
      showToast('Eroare import CSV: ' + err.message, 'error');
    }
  };
  reader.onerror = function() { showToast('Eroare la citirea fisierului.', 'error'); };
  reader.readAsText(file, 'UTF-8');
}
// ====== END II4 ======
</script>'''

    if JS_INSERT_MARKER not in c:
        print("[EROARE] Marker JS insert negasit! Verificati manual.")
        sys.exit(1)

    c = c.replace(JS_INSERT_MARKER, NEW_JS, 1)
    print("[3] Functiile importJurnalCSV() si triggerImportCSV() adaugate.")

    # =========================================================
    # SCRIERE FISIER
    # =========================================================
    with open(HTML_PATH, 'w', encoding='utf-8', errors='replace', newline='\n') as f:
        f.write(c)

    new_len = len(c.splitlines())
    print(f"[4] Fisier salvat. Linii noi: {new_len} (adaugate: {new_len - original_len})")

    # =========================================================
    # VERIFICARE
    # =========================================================
    print("\n[5] Verificare pattern-uri...")
    with open(HTML_PATH, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    checks = [
        ('importJurnalCSV', 'function importJurnalCSV'),
        ('triggerImportCSV', 'function triggerImportCSV'),
        ('jurnalCSVInput file input', 'id="jurnalCSVInput"'),
        ('Import CSV button', 'triggerImportCSV()'),
        ('Export CSV button (existent)', 'exportJurnalCSV()'),
        ('parseCSVLine helper', 'function parseCSVLine'),
        ('normalizeDate helper', 'function normalizeDate'),
        ('normalizeType helper', 'function normalizeType'),
        ('II4 comment marker', 'II4: IMPORT CSV JURNAL'),
    ]

    all_ok = True
    for label, pattern in checks:
        found = pattern in content
        status = 'OK' if found else 'LIPSA'
        if not found: all_ok = False
        print(f"    [{status}] {label}: '{pattern}'")

    print()
    if all_ok:
        print("[SUCCESS] Toate verificarile au trecut. II4 implementat cu succes!")
    else:
        print("[ATENTIE] Unele verificari au esuat. Verificati manual.")

    return 0 if all_ok else 1

if __name__ == '__main__':
    sys.exit(main())
