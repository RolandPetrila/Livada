var fs = require('fs');
var content = fs.readFileSync('C:/Proiecte/Livada/public/app.js', 'utf8');

// ─── N5: Timeline Specie ───
var timelineCode = `
// ====== N5: TIMELINE SPECIE ======
function renderSpeciesTimeline(speciesId, container) {
  var prev = document.getElementById("sp-timeline");
  if (prev) prev.remove();
  var spName = (SPECIES[speciesId] || "").toLowerCase();
  if (!spName) return;

  var journalItems = getJurnalEntries()
    .filter(function(e) {
      return (e.note || "").toLowerCase().includes(spName) || e.species === speciesId;
    })
    .map(function(e) {
      var icon = e.type === "tratament" || e.type === "fitosanitar" ? "\uD83D\uDC8A"
               : e.type === "recolta" ? "\uD83C\uDF4E"
               : e.type === "tundere" ? "\u2702\uFE0F"
               : e.type === "fertilizare" ? "\uD83C\uDF3F"
               : "\uD83D\uDCCB";
      return {
        date: e.date,
        type: "jurnal",
        icon: icon,
        label: e.type || "interventie",
        desc: e.note,
        cost: e.cost
      };
    });

  var allItems = journalItems.sort(function(a, b) { return b.date.localeCompare(a.date); });
  if (allItems.length === 0) return;

  var div = document.createElement("div");
  div.id = "sp-timeline";
  div.className = "section";
  div.style.marginTop = "12px";
  div.innerHTML =
    '<h2 class="section-title" style="cursor:default;">\uD83D\uDD50 Timeline ' + escapeHtml(SPECIES[speciesId] || speciesId) + '</h2>' +
    '<div class="section-body">' +
    allItems.map(function(item) {
      return (
        '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">' +
        '<div style="font-size:1.2rem;flex-shrink:0;">' + item.icon + '</div>' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:0.72rem;color:var(--text-dim);">' +
          escapeHtml(item.date) + ' \u00B7 ' + escapeHtml(item.label) +
          (item.cost ? ' \u00B7 ' + item.cost + ' RON' : '') +
        '</div>' +
        '<div style="font-size:0.82rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          escapeHtml((item.desc || "").substring(0, 100)) +
        '</div>' +
        '</div></div>'
      );
    }).join('') +
    '</div>';
  container.appendChild(div);
}
`;

var n5Marker = '  injectSeasonalTip(tabId, tc);\n  // II-8: inject species journal history\n  injectSpeciesHistory(tabId, tc);\n}';
if (!content.includes(n5Marker)) {
  console.log('N5 marker NOT FOUND'); process.exit(1);
}
// Add renderSpeciesTimeline() function before injectReportButton
var beforeReport = 'function injectReportButton()';
if (!content.includes(beforeReport)) {
  console.log('injectReportButton NOT FOUND'); process.exit(1);
}
content = content.replace(beforeReport, timelineCode + '\n' + beforeReport);

// Call renderSpeciesTimeline from injectSpeciesTools after injectSpeciesHistory
content = content.replace(
  n5Marker,
  '  injectSeasonalTip(tabId, tc);\n  // II-8: inject species journal history\n  injectSpeciesHistory(tabId, tc);\n  // N5: timeline cronologic per specie\n  renderSpeciesTimeline(tabId, tc);\n}'
);

// ─── N2: Spray Window 7 zile ───
var sprayWindowCode = `
// ====== N2: SPRAY WINDOW 7 ZILE ======
async function renderSprayWindow() {
  var container = document.getElementById("sprayWindow");
  if (!container) return;
  if (!navigator.onLine) {
    container.innerHTML = '<p style="font-size:0.78rem;color:var(--text-dim);">Indisponibil offline</p>';
    return;
  }
  try {
    var res = await fetchWithTimeout(
      "https://api.open-meteo.com/v1/forecast?latitude=" + LIVADA_LAT +
      "&longitude=" + LIVADA_LON +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean,weather_code" +
      "&timezone=Europe/Bucharest&forecast_days=7",
      {}, 8000
    );
    if (!res.ok) throw new Error("meteo " + res.status);
    var d = await res.json();
    var ZILE = ["Du", "Lu", "Ma", "Mi", "Jo", "Vi", "S\u00E2"];
    var todayStr = new Date().toISOString().split("T")[0];
    var html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">';
    for (var i = 0; i < 7; i++) {
      var dt = new Date(d.daily.time[i] + "T12:00");
      var tMax = d.daily.temperature_2m_max[i];
      var tMin = d.daily.temperature_2m_min[i];
      var prec = d.daily.precipitation_sum[i];
      var wind = d.daily.wind_speed_10m_max[i];
      var hum = d.daily.relative_humidity_2m_mean ? d.daily.relative_humidity_2m_mean[i] : 60;
      var score = calculateSprayScore((tMax + tMin) / 2, wind, prec, hum);
      var sl = sprayLabel(score);
      var isToday = d.daily.time[i] === todayStr;
      html +=
        '<div style="text-align:center;padding:6px 2px;border-radius:8px;' +
        (score >= 80 ? "background:rgba(106,191,105,0.15);border:1px solid var(--accent);"
          : score >= 50 ? "background:var(--bg-surface);border:1px solid transparent;"
          : "opacity:0.55;border:1px solid transparent;") +
        (isToday ? "outline:2px solid var(--accent);" : "") + '">' +
        '<div style="font-size:0.65rem;color:var(--text-dim);">' + ZILE[dt.getDay()] + '</div>' +
        '<div style="font-size:1rem;">' + wmoEmoji(d.daily.weather_code[i]) + '</div>' +
        '<div style="font-size:0.7rem;">' + Math.round(tMax) + '\u00B0</div>' +
        '<div class="' + sl.cls + '" style="font-size:0.6rem;font-weight:700;margin-top:2px;">' + score + '</div>' +
        '</div>';
    }
    html += '</div><p style="font-size:0.68rem;color:var(--text-dim);margin-top:6px;">Scor stropire 0-100 (verde=ideal, gri=evita)</p>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<p style="font-size:0.78rem;color:var(--text-dim);">Indisponibil offline</p>';
  }
}
`;

// Insert before backupData
var beforeBackup = '// ====== BACKUP & RESTORE (B3) ======';
if (!content.includes(beforeBackup)) {
  console.log('backup marker NOT FOUND'); process.exit(1);
}
content = content.replace(beforeBackup, sprayWindowCode + '\n' + beforeBackup);

// Call renderSprayWindow() at the end of initDashboardAzi, before the closing brace
// Marker: the closing of initDashboardAzi which ends at the N10 disease risk block
var aziEndMarker = '  // N10: Disease risk per species (din datele meteo deja incarcate)';
if (!content.includes(aziEndMarker)) {
  console.log('azi end marker NOT FOUND'); process.exit(1);
}
content = content.replace(
  aziEndMarker,
  '  // N2: Spray window 7 zile\n  renderSprayWindow();\n\n  // N10: Disease risk per species (din datele meteo deja incarcate)'
);

fs.writeFileSync('C:/Proiecte/Livada/public/app.js', content, 'utf8');
console.log('N5 + N2 OK');
