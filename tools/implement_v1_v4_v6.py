#!/usr/bin/env python3
"""
Implementare imbunatatiri V1, V4, V6 in public/index.html
V1: renderStats - per-species kg breakdown
V4: addJurnalEntry - warning interval minim intre tratamente
V6: loadGallery - data upload vizibila + sortare cronologica
"""

HTML_PATH = r'C:/Proiecte/Livada/public/index.html'

with open(HTML_PATH, 'rb') as f:
    raw = f.read()
c = raw.decode('utf-8', errors='replace')
c = c.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')

original_len = len(c)
print(f"Fisier incarcat: {len(c)} caractere, {c.count(chr(10))} linii")

# ============================================================
# V1: renderStats - per-species kg breakdown
# ============================================================
OLD_STATS = r"""  var kgLine = recoltaKg > 0 ? ' \u2022 Recolt\u0103: <strong>' + recoltaKg.toFixed(1) + ' kg</strong>' : '';
  return yearSelectorHtml +
    '<h3 style="margin-bottom:8px;font-size:0.9rem;">Per tip (' + selectedYear + ')</h3>' + typeHTML +
    '<h3 style="margin:14px 0 8px;font-size:0.9rem;">Per lun\u0103</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:2px;">' + monthHTML + '</div>' +
    '<p style="font-size:0.72rem;color:var(--text-dim);margin-top:8px;">Total: <strong>' + yearEntries.length + '</strong> interven\u021Bii' + kgLine + '</p>';
}"""

NEW_STATS = r"""  var kgLine = recoltaKg > 0 ? ' \u2022 Recolt\u0103: <strong>' + recoltaKg.toFixed(1) + ' kg</strong>' : '';
  // V1: Per-species kg breakdown
  var bySpecies = {};
  yearEntries.filter(function(e){ return e.type === 'recoltare' && e.kg > 0 && e.species; })
    .forEach(function(e){ bySpecies[e.species] = (bySpecies[e.species]||0) + (e.kg||0); });
  var speciesKgHtml = '';
  if (Object.keys(bySpecies).length > 0) {
    var maxKg = Math.max.apply(null, Object.values(bySpecies).concat([1]));
    speciesKgHtml = '<h3 style="margin:14px 0 8px;font-size:0.9rem;">\uD83C\uDF4E Recolt\u0103 per specie</h3>' +
      Object.entries(bySpecies).sort(function(a,b){return b[1]-a[1];}).map(function(p) {
        var pct = Math.round(p[1] / maxKg * 100);
        var name = (typeof SPECIES !== 'undefined' && SPECIES[p[0]]) || p[0];
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">' +
          '<span style="min-width:90px;font-size:0.78rem;color:var(--text-dim);">' + escapeHtml(name) + '</span>' +
          '<div style="flex:1;height:16px;background:var(--bg-surface);border-radius:4px;overflow:hidden;">' +
          '<div style="width:'+pct+'%;height:100%;background:#e67e22;border-radius:4px;transition:width 0.4s;"></div></div>' +
          '<span style="font-size:0.78rem;font-weight:700;min-width:40px;text-align:right;">' + p[1].toFixed(1) + 'kg</span></div>';
      }).join('');
  }
  return yearSelectorHtml +
    '<h3 style="margin-bottom:8px;font-size:0.9rem;">Per tip (' + selectedYear + ')</h3>' + typeHTML +
    '<h3 style="margin:14px 0 8px;font-size:0.9rem;">Per lun\u0103</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:2px;">' + monthHTML + '</div>' +
    speciesKgHtml +
    '<p style="font-size:0.72rem;color:var(--text-dim);margin-top:8px;">Total: <strong>' + yearEntries.length + '</strong> interven\u021Bii' + kgLine + '</p>';
}"""

if OLD_STATS in c:
    c = c.replace(OLD_STATS, NEW_STATS, 1)
    print("[OK] V1: Per-species kg breakdown adaugat in renderStats")
else:
    print("[FAIL] V1: Pattern renderStats kgLine negasit")

# ============================================================
# V4: addJurnalEntry - warning interval minim intre tratamente
# ============================================================
OLD_V4 = """    if (!date || !note) { showToast('Completeaza data si nota.'); return; }
    var entry = { id: Date.now(), date: date, type: type, note: note };"""

NEW_V4 = """    if (!date || !note) { showToast('Completeaza data si nota.'); return; }
    // V4: Warning interval minim intre tratamente fitosanitare
    if (type === 'fitosanitar' || type === 'tratament') {
      var prevTreatments = getJurnalEntries().filter(function(e) {
        return (e.type === 'fitosanitar' || e.type === 'tratament') &&
               new Date(e.date + 'T12:00') < new Date(date + 'T12:00');
      });
      if (prevTreatments.length > 0) {
        var lastTr = prevTreatments[0];
        var daysDiff = Math.floor((new Date(date + 'T12:00') - new Date(lastTr.date + 'T12:00')) / 86400000);
        if (daysDiff < 7) {
          var ok = confirm('\u26A0\uFE0F Atentie: Ultimul tratament a fost pe ' + lastTr.date + ' (' + daysDiff + ' zile).\nInterval recomandat intre tratamente fitosanitare: minim 7-10 zile.\nContinui inregistrarea?');
          if (!ok) { debounceBtn(btn, 0); return; }
        }
      }
    }
    var entry = { id: Date.now(), date: date, type: type, note: note };"""

if OLD_V4 in c:
    c = c.replace(OLD_V4, NEW_V4, 1)
    print("[OK] V4: Warning interval minim tratamente adaugat in addJurnalEntry")
else:
    print("[FAIL] V4: Pattern addJurnalEntry negasit")

# ============================================================
# V6: loadGallery - date vizibila + sortare cronologica
# ============================================================
OLD_GALLERY = """    if (Array.isArray(photos) && photos.length > 0) {
      grid.innerHTML = photos.map(function(p) {
        return '<div class="gal-item"><img src="' + escapeHtml(p.url) + '" alt="Foto livada" loading="lazy">' +
          '<button class="gal-del" data-url="' + escapeHtml(p.url) + '">&#10005;</button></div>';
      }).join('');"""

NEW_GALLERY = """    if (Array.isArray(photos) && photos.length > 0) {
      // V6: Sortare cronologica (newest first)
      photos.sort(function(a,b) { return new Date(b.uploadedAt||0) - new Date(a.uploadedAt||0); });
      grid.innerHTML = photos.map(function(p) {
        var dateStr = p.uploadedAt ? new Date(p.uploadedAt).toLocaleDateString('ro-RO', {day:'2-digit',month:'short',year:'numeric'}) : '';
        var dateBadge = dateStr ? '<span style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.55);color:#fff;font-size:0.6rem;padding:2px 4px;text-align:center;border-radius:0 0 6px 6px;">' + dateStr + '</span>' : '';
        return '<div class="gal-item" style="position:relative;"><img src="' + escapeHtml(p.url) + '" alt="Foto livada" loading="lazy">' +
          dateBadge +
          '<button class="gal-del" data-url="' + escapeHtml(p.url) + '">&#10005;</button></div>';
      }).join('');"""

if OLD_GALLERY in c:
    c = c.replace(OLD_GALLERY, NEW_GALLERY, 1)
    print("[OK] V6: Data upload si sortare cronologica adaugate in loadGallery")
else:
    print("[FAIL] V6: Pattern loadGallery negasit")

# ============================================================
# SAVE
# ============================================================
new_lines = c.count(chr(10))
print(f"\nRezultat final: {len(c)} caractere, {new_lines} linii")
print(f"Diferenta: +{len(c) - original_len} caractere, +{new_lines - original_len//70} linii approx")

with open(HTML_PATH, 'w', encoding='utf-8', errors='replace') as f:
    f.write(c)
print(f"[OK] Fisier salvat: {HTML_PATH}")
