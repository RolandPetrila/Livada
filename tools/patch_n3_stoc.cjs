var fs = require('fs');
var content = fs.readFileSync('C:/Proiecte/Livada/public/app.js', 'utf8');

// ─── N3: Stoc Produse Fitosanitare functions ───
var stocCode = `
// ====== N3: STOC PRODUSE FITOSANITARE ======
var STOC_KEY = "livada-stoc-produse";

function getStoc() {
  try { return JSON.parse(localStorage.getItem(STOC_KEY) || "[]"); } catch(e) { return []; }
}
function saveStoc(stoc) {
  localStorage.setItem(STOC_KEY, JSON.stringify(stoc));
}
function addStocProdus() {
  var name = (document.getElementById("stocName")?.value || "").trim();
  var cant = parseFloat(document.getElementById("stocCant")?.value) || 0;
  var unit = document.getElementById("stocUnit")?.value || "ml";
  var exp = document.getElementById("stocExp")?.value || "";
  if (!name) { showToast("Introdu numele produsului.", "warning"); return; }
  var stoc = getStoc();
  stoc.push({ id: Date.now(), name: name, cantitate: cant, unitate: unit, dataExpirare: exp });
  saveStoc(stoc);
  document.getElementById("stocName").value = "";
  document.getElementById("stocCant").value = "";
  document.getElementById("stocExp").value = "";
  renderStoc();
  showToast("Produs adaugat in stoc.");
}
function deleteStocProdus(id) {
  saveStoc(getStoc().filter(function(p){ return p.id !== id; }));
  renderStoc();
}
function renderStoc() {
  var container = document.getElementById("stocList");
  if (!container) return;
  var stoc = getStoc();
  if (stoc.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim);font-size:0.82rem;padding:8px 0;">Niciun produs adaugat.</p>';
    return;
  }
  var today = new Date();
  var expiredCount = 0;
  container.innerHTML = stoc.map(function(p) {
    var expired = p.dataExpirare && new Date(p.dataExpirare) < today;
    var expSoon = p.dataExpirare && !expired && (new Date(p.dataExpirare) - today) < 30 * 86400000;
    if (expired) expiredCount++;
    var bc = expired ? "var(--danger)" : expSoon ? "var(--warning)" : "var(--border)";
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid ' + bc + ';border-radius:8px;margin-bottom:6px;">' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(p.name) + '</div>' +
        '<div style="font-size:0.75rem;color:var(--text-dim);">' +
          (p.cantitate ? p.cantitate + ' ' + (p.unitate || '') : '') +
          (p.dataExpirare ? ' &middot; Exp: ' + p.dataExpirare : '') +
          (expired ? ' <strong style="color:var(--danger);">EXPIRAT</strong>' : '') +
          (expSoon && !expired ? ' <strong style="color:var(--warning);">exp. curand</strong>' : '') +
        '</div>' +
      '</div>' +
      '<button onclick="deleteStocProdus(' + p.id + ')" style="background:none;border:none;color:var(--danger);font-size:1.1rem;cursor:pointer;padding:4px;min-width:36px;min-height:36px;">&#10005;</button>' +
    '</div>';
  }).join('');
  if (expiredCount > 0) showToast(expiredCount + ' produse din stoc au expirat!', 'warning');
}
function injectStocSection() {
  if (document.getElementById("stoc-section")) {
    renderStoc();
    return;
  }
  var tc = document.getElementById("plan-livada");
  if (!tc) return;
  var div = document.createElement("div");
  div.id = "stoc-section";
  div.className = "section";
  div.style.marginTop = "16px";
  div.innerHTML =
    '<h2 class="section-title" style="cursor:default;">\uD83E\uDEA3 Stoc Produse Fitosanitare</h2>' +
    '<div class="section-body">' +
      '<p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px;">Inventar produse fitosanitare. Alerta automata la produse expirate sau apropiate de expirare.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 80px 70px;gap:6px;margin-bottom:8px;">' +
        '<input id="stocName" type="text" placeholder="Nume produs (ex: Dithane M-45)" style="padding:7px 10px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
        '<input id="stocCant" type="number" placeholder="Cant." min="0" step="0.1" style="padding:7px 8px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
        '<select id="stocUnit" style="padding:7px 6px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
          '<option value="ml">ml</option><option value="L">L</option><option value="g">g</option><option value="kg">kg</option><option value="buc">buc</option>' +
        '</select>' +
      '</div>' +
      '<div style="display:flex;gap:6px;margin-bottom:10px;">' +
        '<input id="stocExp" type="date" style="flex:1;padding:7px 10px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
        '<button class="btn btn-primary" onclick="addStocProdus()" style="padding:7px 14px;font-size:0.82rem;">+ Adauga</button>' +
      '</div>' +
      '<div id="stocList"></div>' +
    '</div>';
  tc.appendChild(div);
  renderStoc();
}
`;

// Insert before the closing of the file (before the last DOMContentLoaded)
var insertMarker = '// Initializare voice button (ascunde daca nu e suportat)';
if (!content.includes(insertMarker)) {
  console.log('marker NOT FOUND');
  process.exit(1);
}
content = content.replace(insertMarker, stocCode + '\n' + insertMarker);

// Also call injectStocSection() when plan-livada tab is opened
var tabMarker = '    injectReportButton();\n    renderRecoltaSummary();\n    injectStatsSection();';
if (!content.includes(tabMarker)) {
  console.log('tab marker NOT FOUND');
  process.exit(1);
}
content = content.replace(tabMarker,
  '    injectReportButton();\n    renderRecoltaSummary();\n    injectStatsSection();\n    injectStocSection();');

fs.writeFileSync('C:/Proiecte/Livada/public/app.js', content, 'utf8');
console.log('N3 OK');
