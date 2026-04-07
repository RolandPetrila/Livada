var fs = require('fs');
var content = fs.readFileSync('C:/Proiecte/Livada/public/app.js', 'utf8');

// Step 1: Add costHtml variable before the return statement in renderStats()
var returnMarker = '  return (\n    yearSelectorHtml +\n    \'<h3 style="margin-bottom:8px;font-size:0.9rem;">Per tip (\'';
if (!content.includes(returnMarker)) {
  console.log('returnMarker NOT FOUND');
  process.exit(1);
}

var costVarCode = '  // N4: Sumar cheltuieli per tip interventie\n' +
  '  var totalCost = yearEntries.reduce(function(s, e) { return s + (e.cost || 0); }, 0);\n' +
  '  var costByType = {};\n' +
  '  yearEntries.filter(function(e){ return e.cost > 0; }).forEach(function(e){\n' +
  '    costByType[e.type] = (costByType[e.type] || 0) + e.cost;\n' +
  '  });\n' +
  '  var costHtml = totalCost > 0\n' +
  '    ? \'<h3 style="margin:14px 0 8px;font-size:0.9rem;">\uD83D\uDCB0 Cheltuieli (\' + selectedYear + \')</h3>\' +\n' +
  '      Object.entries(costByType).sort(function(a,b){ return b[1]-a[1]; }).map(function(p){\n' +
  '        return \'<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:3px 0;border-bottom:1px solid var(--border);">\' +\n' +
  '          \'<span>\' + escapeHtml(p[0]) + \'</span><span style="color:var(--accent);font-weight:700;">\' + p[1].toFixed(2) + \' RON</span></div>\';\n' +
  '      }).join(\'\') +\n' +
  '      \'<div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:700;margin-top:6px;padding-top:6px;border-top:2px solid var(--border);">\' +\n' +
  '      \'<span>TOTAL</span><span style="color:var(--accent);">\' + totalCost.toFixed(2) + \' RON</span></div>\'\n' +
  '    : \'\';\n' +
  '  return (\n' +
  '    yearSelectorHtml +\n' +
  '    \'<h3 style="margin-bottom:8px;font-size:0.9rem;">Per tip (\'';

content = content.replace(returnMarker, costVarCode);

// Step 2: Add costHtml to the return string (append after kgLine)
var kgLineMarker = 'kgLine +\n    "</p>"\n  );\n}\nfunction injectStatsSec';
if (!content.includes(kgLineMarker)) {
  console.log('kgLineMarker NOT FOUND');
  process.exit(1);
}
content = content.replace(kgLineMarker,
  'kgLine +\n    "</p>" +\n    costHtml\n  );\n}\nfunction injectStatsSec');

fs.writeFileSync('C:/Proiecte/Livada/public/app.js', content, 'utf8');
console.log('N4 renderStats OK');
