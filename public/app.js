// ====== GLOBALS ======
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ====== HELPERS ======
function todayLocal() {
  var d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function debounceBtn(btn, duration) {
  if (!btn || btn.disabled) return false;
  btn.disabled = true;
  setTimeout(function () {
    btn.disabled = false;
  }, duration || 3000);
  return true;
}

// ====== CONSTANTS ======
var DEBOUNCE_SEARCH_MS = 300;
var TOAST_DURATION_MS = 4000;
var INIT_ALERTS_DELAY_MS = 1500;
var INIT_SYNC_DELAY_MS = 3000;
var MODAL_FOCUS_DELAY_MS = 100;
var CAL_NAV_DEBOUNCE_MS = 80;
var LIVADA_LAT = 46.17;
var LIVADA_LON = 20.75;

// ====== TAB SWITCHING ======
$$(".tab[data-tab]").forEach(function (tab) {
  tab.setAttribute("role", "tab");
  tab.setAttribute(
    "aria-selected",
    tab.classList.contains("active") ? "true" : "false",
  );
  tab.setAttribute("tabindex", tab.classList.contains("active") ? "0" : "-1");
  tab.addEventListener("click", function () {
    try {
      $$(".tab").forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
        t.setAttribute("tabindex", "-1");
      });
      $$(".tab-content").forEach(function (tc) {
        tc.classList.remove("active");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      tab.setAttribute("tabindex", "0");
      var target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
      tab.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      try {
        injectSpeciesTools(tab.dataset.tab);
      } catch (e) {
        livadaLog("ERR", "injectSpeciesTools", "FAIL", e.message);
      }
      if (searchInput.value.trim().length >= 2)
        highlightInActiveTab(searchInput.value.trim());
      livadaLog("NAV", tab.dataset.tab, "OK");
    } catch (e) {
      livadaLog("ERR", "tab-switch", "FAIL", e.message);
    }
  });
});
$$(".tab-content").forEach(function (tc) {
  tc.setAttribute("role", "tabpanel");
});

// ====== COLLAPSIBLE SECTIONS ======
$$(".section-title").forEach((title) => {
  title.addEventListener("click", () => {
    title.classList.toggle("collapsed");
    const body = title.nextElementSibling;
    if (body && body.classList.contains("section-body")) {
      body.classList.toggle("collapsed");
    }
  });
});

// ====== DARK/LIGHT TOGGLE ======
const btnTheme = $("#btnTheme");
function setTheme(mode) {
  var isLight;
  if (mode === "auto") {
    isLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    btnTheme.textContent = "\u2699";
    btnTheme.title = "Tema: Auto";
  } else {
    isLight = mode === "light";
    btnTheme.textContent = isLight ? "\u2600" : "\u263E";
    btnTheme.title = isLight ? "Tema: Luminos" : "Tema: \u00CEntunecat";
  }
  document.body.classList.toggle("light-mode", isLight);
  localStorage.setItem("livada-theme", mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = isLight ? "#f4f7f4" : "#1a2e1a";
}
btnTheme.addEventListener("click", function () {
  var current = localStorage.getItem("livada-theme") || "dark";
  var next =
    current === "dark" ? "light" : current === "light" ? "auto" : "dark";
  setTheme(next);
});
window
  .matchMedia("(prefers-color-scheme: light)")
  .addEventListener("change", function () {
    if (localStorage.getItem("livada-theme") === "auto") setTheme("auto");
  });
// Restore theme
var savedTheme = localStorage.getItem("livada-theme") || "dark";
setTheme(savedTheme);

// ====== SEARCH ======
const btnSearch = $("#btnSearch");
const searchPanel = $("#searchPanel");
const searchInput = $("#searchInput");
const searchCount = $("#searchCount");

btnSearch.addEventListener("click", () => {
  searchPanel.classList.toggle("open");
  if (searchPanel.classList.contains("open")) {
    searchInput.focus();
  } else {
    clearSearch();
  }
});

let searchTimeout;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(doSearch, DEBOUNCE_SEARCH_MS);
  showSuggestions(searchInput.value.trim());
});

function clearSearchHighlights() {
  $$("mark.search-hl").forEach(function (m) {
    var p = m.parentNode;
    p.replaceChild(document.createTextNode(m.textContent), m);
    p.normalize();
  });
}
// Search cache — pre-calculated at DOMContentLoaded for fast search
var _tabSearchCache = {};
function buildSearchCache() {
  $$(".tab-content").forEach(function (tc) {
    _tabSearchCache[tc.id] = tc.textContent.toLowerCase();
  });
}
function highlightInActiveTab(query) {
  clearSearchHighlights();
  if (!query || query.length < 2) return 0;
  var active = document.querySelector(".tab-content.active");
  if (!active) return 0;
  var walker = document.createTreeWalker(active, NodeFilter.SHOW_TEXT);
  var toReplace = [];
  var lowerQ = query.toLowerCase();
  while (walker.nextNode()) {
    var node = walker.currentNode;
    var text = node.textContent.toLowerCase();
    var idx = 0;
    while ((idx = text.indexOf(lowerQ, idx)) >= 0) {
      toReplace.push({ node: node, index: idx, length: query.length });
      idx += query.length;
    }
  }
  // Process in reverse order to avoid offset shifts
  toReplace.reverse().forEach(function (item) {
    try {
      var mark = document.createElement("mark");
      mark.className = "search-hl";
      var range = document.createRange();
      range.setStart(item.node, item.index);
      range.setEnd(item.node, item.index + item.length);
      range.surroundContents(mark);
    } catch (e) {
      /* skip nodes split by other replacements */
    }
  });
  var allMarks = active.querySelectorAll("mark.search-hl");
  if (allMarks.length > 0)
    allMarks[0].scrollIntoView({ behavior: "smooth", block: "center" });
  return allMarks.length;
}
function doSearch() {
  var q = searchInput.value.trim().toLowerCase();
  clearSearchHighlights();
  $$(".tab").forEach(function (t) {
    t.classList.remove("search-match");
  });
  if (q.length < 2) {
    searchCount.textContent = "";
    return;
  }
  var totalMatches = 0;
  $$(".tab-content").forEach(function (tc) {
    var cached = _tabSearchCache[tc.id] || tc.textContent.toLowerCase();
    if (cached.includes(q)) {
      totalMatches++;
      var tabBtn = document.querySelector('.tab[data-tab="' + tc.id + '"]');
      if (tabBtn) tabBtn.classList.add("search-match");
    }
  });
  var inTab = highlightInActiveTab(q);
  searchCount.textContent =
    totalMatches > 0
      ? totalMatches +
        " tab" +
        (totalMatches > 1 ? "uri" : "") +
        (inTab > 0 ? " (" + inTab + " rezultate)" : "")
      : "Nimic gasit";
}
function clearSearch() {
  searchInput.value = "";
  searchCount.textContent = "";
  $$(".tab").forEach(function (t) {
    t.classList.remove("search-match");
  });
  clearSearchHighlights();
  var sug = document.getElementById("searchSuggestions");
  if (sug) sug.style.display = "none";
}

// ====== SEARCH AUTOCOMPLETE ======
var _searchIndex = [];
var _suggFocusIdx = -1;

function buildSearchIndex() {
  _searchIndex = [];
  $$(".tab[data-tab]").forEach(function (tab) {
    var tabId = tab.dataset.tab;
    var iconEl = tab.querySelector(".tab-icon");
    var icon = iconEl ? iconEl.textContent : "";
    var tabName = tab.textContent.replace(icon, "").trim();
    _searchIndex.push({
      text: tabName,
      tabId: tabId,
      type: "Specie",
      el: null,
      icon: icon,
    });
    var content = document.getElementById(tabId);
    if (!content) return;
    content.querySelectorAll("h2, h3").forEach(function (h) {
      var t = h.textContent
        .trim()
        .replace(/^[▸►▼▶⮞\s]+/, "")
        .trim();
      if (t.length >= 4 && t.length < 95) {
        _searchIndex.push({
          text: t,
          tabId: tabId,
          type: "Sec\u021biune",
          el: h,
          icon: icon,
        });
      }
    });
  });
}

function showSuggestions(q) {
  var box = document.getElementById("searchSuggestions");
  if (!box) return;
  if (!q || q.length < 2) {
    box.style.display = "none";
    return;
  }
  var ql = q.toLowerCase();
  var results = _searchIndex
    .filter(function (s) {
      return s.text.toLowerCase().includes(ql);
    })
    .slice(0, 10);
  if (!results.length) {
    box.style.display = "none";
    return;
  }
  _suggFocusIdx = -1;
  box._results = results;
  var html = results
    .map(function (r, i) {
      var tabEl = document.querySelector('.tab[data-tab="' + r.tabId + '"]');
      var tabIcon = tabEl
        ? tabEl.querySelector(".tab-icon")
          ? tabEl.querySelector(".tab-icon").textContent
          : ""
        : "";
      var tabLabel = tabEl
        ? tabEl.textContent.replace(tabIcon, "").trim()
        : r.tabId;
      return (
        '<div class="search-suggestion" onclick="pickSuggestion(' +
        i +
        ')">' +
        '<span class="sg-type">' +
        r.type +
        "</span>" +
        '<span class="sg-text">' +
        r.text +
        "</span>" +
        (r.type !== "Specie"
          ? '<span class="sg-tab">' + tabIcon + "\u00a0" + tabLabel + "</span>"
          : "") +
        "</div>"
      );
    })
    .join("");
  box.innerHTML = html;
  box.style.display = "block";
}

function pickSuggestion(idx) {
  var box = document.getElementById("searchSuggestions");
  if (!box || !box._results) return;
  var item = box._results[idx];
  if (!item) return;
  box.style.display = "none";
  searchInput.value = "";
  searchCount.textContent = "";
  // Switch tab
  var tabBtn = document.querySelector('.tab[data-tab="' + item.tabId + '"]');
  if (tabBtn) tabBtn.click();
  // Scroll to element after tab switch
  if (item.el) {
    setTimeout(function () {
      item.el.scrollIntoView({ behavior: "smooth", block: "center" });
      var prev = item.el.style.background;
      item.el.style.transition = "background 0.4s";
      item.el.style.background = "rgba(106,191,105,0.28)";
      setTimeout(function () {
        item.el.style.transition = "background 1.2s";
        item.el.style.background = prev;
      }, 2200);
    }, 350);
  }
}

// Keyboard navigation in suggestions
searchInput.addEventListener("keydown", function (e) {
  var box = document.getElementById("searchSuggestions");
  if (!box || box.style.display === "none") return;
  var items = box.querySelectorAll(".search-suggestion");
  if (!items.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    _suggFocusIdx = Math.min(_suggFocusIdx + 1, items.length - 1);
    items.forEach(function (el, i) {
      el.classList.toggle("sug-focused", i === _suggFocusIdx);
    });
    if (items[_suggFocusIdx])
      items[_suggFocusIdx].scrollIntoView({ block: "nearest" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    _suggFocusIdx = Math.max(_suggFocusIdx - 1, 0);
    items.forEach(function (el, i) {
      el.classList.toggle("sug-focused", i === _suggFocusIdx);
    });
  } else if (e.key === "Enter" && _suggFocusIdx >= 0) {
    e.preventDefault();
    pickSuggestion(_suggFocusIdx);
  } else if (e.key === "Escape") {
    box.style.display = "none";
  }
});

// Hide suggestions on outside click
document.addEventListener("click", function (e) {
  var box = document.getElementById("searchSuggestions");
  if (box && !box.contains(e.target) && e.target !== searchInput) {
    box.style.display = "none";
  }
});

// ====== COPY TEXT ELEMENT ======
function copyTextEl(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var text = el.tagName === "TEXTAREA" ? el.value : el.innerText;
  if (!text || !text.trim()) {
    showToast("Nimic de copiat.");
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(function () {
        showToast("\u2705 Copiat \u00een clipboard!");
      })
      .catch(function () {
        _fallbackCopy(text);
      });
  } else {
    _fallbackCopy(text);
  }
}
function copyText(text) {
  if (!text || !text.trim()) {
    showToast("Nimic de copiat.");
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(function () {
        showToast("\u2705 Copiat \u00een clipboard!");
      })
      .catch(function () {
        _fallbackCopy(text);
      });
  } else {
    _fallbackCopy(text);
  }
}
function _fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast("\u2705 Copiat!");
  } catch (e) {
    showToast("Copiere e\u015fuat\u0103.");
  }
  document.body.removeChild(ta);
}

// ====== MODALS ======
var _lastFocused = null;
function openModal(name) {
  const overlay = document.getElementById("modal-" + name);
  if (overlay) {
    _lastFocused = document.activeElement;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    if (name === "jurnal") {
      renderJurnal();
      syncJournal();
    }
    if (name === "calendar") {
      renderCalendar();
      enhanceCalendarWithMeteo();
    }
    if (name === "meteo") {
      initMeteo();
      loadMeteoHistory();
    }
    var first = overlay.querySelector(
      'button, input, textarea, select, [tabindex="0"]',
    );
    if (first)
      setTimeout(function () {
        first.focus();
      }, 100);
  }
}
function closeModal(name) {
  const overlay = document.getElementById("modal-" + name);
  if (overlay) {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    if (_lastFocused) {
      _lastFocused.focus();
      _lastFocused = null;
    }
  }
}
// Close modal on overlay click
$$(".modal-overlay").forEach((ov) => {
  ov.addEventListener("click", (e) => {
    if (e.target === ov) {
      ov.classList.remove("open");
      document.body.style.overflow = "";
    }
  });
});

// ====== CALCULATOR ======
// Descrieri produse — explicate pe intelesul unui incepator
var CALC_PROD_DESC = {
  "Zeam\u0103 bordalez\u0103 3%":
    "<strong>Fungicid preventiv natural pe baz\u0103 de cupru.</strong> \u00CEmpiedicic\u0103 aparitia ciupercilor pe toate speciile. Se aplic\u0103 iarna sau toamna, dup\u0103 c\u0103derea frunzelor, c\u00e2nd pomii sunt goi. NU se aplic\u0103 \u00een c\u0103ldur\u0103 sau pe frunze. <em>Pauz\u0103 recoltare: 35 zile.</em> Alternativ\u0103 ecologic\u0103.",
  "Funguran OH 0.3%":
    "<strong>Fungicid pe baz\u0103 de hidroxid de cupru.</strong> Protectie \u00eempotriva r\u0103p\u0103nului (mar/par), moniliozei, ciupercilor diverse. Mai pu\u021bin vizibil pe frunze. <em>Pauz\u0103: 21 zile.</em>",
  "Cuproxat SC 0.3%":
    "<strong>Fungicid lichid pe baz\u0103 de sulfat de cupru.</strong> Alternativ\u0103 mai u\u015For de dizolvat fat\u0103 de zeama bordalez\u0103. Eficient preventiv contra b\u0103\u0219ic\u0103rii frunzelor (piersic), rapan, cilindrosporioz\u0103. <em>Pauz\u0103: 21 zile.</em>",
  "Score 250 EC 0.02%":
    "<strong>Fungicid sistemic triazol — curativ \u0219i preventiv.</strong> Opre\u015fte ciuperca deja instalat\u0103 (rapan la mar/par, ciuruirea frunzelor la piersic, monilioz\u0103). P\u0103trunde \u00een plant\u0103. <em>Pauz\u0103: 14 zile.</em>",
  "Difcor 250 EC 0.02%":
    "<strong>Fungicid sistemic triazol — similar cu Score.</strong> Eficient contra rapanului, f\u0103in\u0103rii, moniliozei. <em>Pauz\u0103: 14 zile.</em>",
  "Topsin 70 WDG 0.07%":
    "<strong>Fungicid sistemic benzimidazol.</strong> Impotriva r\u0103p\u0103nului, putregaiului fructelor, moniliozei. P\u0103trunde \u00een plant\u0103. Atentie: alterneaz\u0103 cu alte fungicide (risc rezistent\u0103). <em>Pauz\u0103: 14 zile.</em>",
  "Luna Experience 400 SC 0.05%":
    "<strong>Fungicid modern SDHI+triazol — spectru larg, pauz\u0103 scurt\u0103.</strong> Dubla actiune contra moniliozei, r\u0103p\u0103nului, f\u0103in\u0103rii. Ideal la fructe aproape de maturitate. <em>Pauz\u0103: 7 zile.</em>",
  "Nativo 75 WG 0.015%":
    "<strong>Fungicid modern cu spectru larg (trifloxystrobin+tebuconazol).</strong> Functioneaz\u0103 preventiv \u0219i curativ. Eficient contra r\u0103p\u0103nului, f\u0103in\u0103rii, moniliozei, ruginii. Rezistent\u0103 bun\u0103 la ploaie. <em>Pauz\u0103: 7 zile.</em>",
  "Folicur Solo 250 EW 0.025%":
    "<strong>Fungicid sistemic triazol (tebuconazol).</strong> Impotriva f\u0103in\u0103rii, ruginii, moniliozei la diverse specii. P\u0103trunde ad\u00e2nc \u00een plant\u0103. <em>Pauz\u0103: 14 zile.</em>",
  "Captadin 80 WDG 0.2%":
    "<strong>Fungicid de contact (captan) — strat protector pe frunze \u0219i fructe.</strong> Eficient preventiv contra r\u0103p\u0103nului, moniliozei, putregaiului fructelor. NU curativ. <em>Pauz\u0103: 7 zile.</em>",
  "Merpan 80 WDG 0.15%":
    "<strong>Fungicid de contact (captan) — similar Captadin.</strong> Impotriva r\u0103p\u0103nului la mar/par, putregaiului fructelor. Preventiv. <em>Pauz\u0103: 7 zile.</em>",
  "Dithane M-45 0.2%":
    "<strong>Fungicid de contact (mancozeb) — spectru larg.</strong> Impotriva r\u0103p\u0103nului, manei, alternariozei, antracnozei. Preventiv, se spal\u0103 la ploaie. Contine Mn \u0219i Zn (micro-nutritie bonus). <em>Pauz\u0103: 21 zile.</em>",
  "Thiovit Jet 80 WG 0.5% (sulf)":
    "<strong>Fungicid \u0219i acaricid pe baz\u0103 de sulf.</strong> Impotriva f\u0103in\u0103rii, acarienilor ro\u015cii. NU aplica la temperaturi peste 30\u00b0C (arzi frunzele). NU se combin\u0103 cu uleiuri (Oleomin). <em>Pauz\u0103: 3 zile.</em>",
  "Microthiol Special 0.4% (sulf)":
    "<strong>Sulf micronizat — alternativ\u0103 mai fin\u0103 la Thiovit.</strong> Particule mai mici, acoperire mai bun\u0103. Acelea\u015fi reguli: evit\u0103 c\u0103ldura \u0219i uleiul. <em>Pauz\u0103: 3 zile.</em>",
  "Chorus 50 WG 0.03%":
    "<strong>Fungicid special pentru TEMPERATURI SC\u0102ZUTE (2-25\u00b0C).</strong> Singurul eficient contra moniliozei la cais/piersic/cires \u00een timpul infloritului, c\u00e2nd alte fungicide nu functioneaz\u0103. Indispensabil la c\u00e2nd florile sunt deschise! <em>Pauz\u0103: 7 zile.</em>",
  "Switch 62.5 WG 0.1%":
    "<strong>Fungicid combinat contact+sistemic contra moniliozei \u0219i botrytis.</strong> Impotriva moniliozei la fructe (cais, piersic, cire\u015f), putregaiului cenusiu la zmeur/mur/afin. Dubla actiune. <em>Pauz\u0103: 7 zile.</em>",
  "Bellis 38 WG 0.08%":
    "<strong>Fungicid modern (boscalid+pyraclostrobin) pentru par, mar, cais.</strong> Impotriva r\u0103p\u0103nului, f\u0103in\u0103rii, moniliozei. Actiune dual\u0103 contact+sistemic. <em>Pauz\u0103: 7 zile.</em>",
  "Syllit 400 SC 0.1%":
    "<strong>Fungicid SPECIFIC cilindrosporiozei la cire\u015f \u0219i vi\u015fen.</strong> Boala care face g\u0103uri \u00een frunze \u0219i le face s\u0103 cad\u0103 vara. Aplica dup\u0103 \u00eenflorit \u0219i repetat la 14-21 zile \u00een perioade umede. <em>Pauz\u0103: 7 zile.</em>",
  "Signum 33 WG 0.15%":
    "<strong>Fungicid ESENTIAL pentru zmeur, mur, afin — contra putregaiului cenusiu (botrytis).</strong> Botrytis face fructele s\u0103 se umple de mucegai \u0219i s\u0103 se strice rapid. Aplica cu 7-10 zile \u00eenainte de recoltare. <em>Pauz\u0103: 7 zile.</em>",
  "Rovral 500 SC 0.1%":
    "<strong>Fungicid contra putregaiului cenusiu (botrytis) — zmeur, mur, afin.</strong> Preventiv \u00een perioadele ploioase. Efiicient dac\u0103 aplici \u00eenainte de aparitia semnelor. <em>Pauz\u0103: 7 zile.</em>",
  "Oleomin / Confidor Oil 1%":
    "<strong>Insecticid pe baz\u0103 de ulei parafinic — omor\u0103 ou\u0103le \u0219i larvele de iarn\u0103.</strong> Sufoc\u0103 insectele iernate pe ramuri (p\u0103duchi testo\u015fa, ou\u0103 afide, acarieni). Se aplic\u0103 iarna-primavara devreme, pe lemn gol. NU la sub 4\u00b0C sau peste 20\u00b0C. Ecologic.",
  "Mospilan 20 SG 0.03%":
    "<strong>Insecticid sistemic (acetamiprid) contra afidelor \u0219i purici verzi.</strong> P\u0103trunde \u00een plant\u0103, eficient \u0219i pe fata inferioar\u0103 a frunzei. Pericol albine — aplic\u0103 seara. <em>Pauz\u0103: 7 zile.</em>",
  "Calypso 480 SC 0.02%":
    "<strong>Insecticid sistemic (thiacloprid) cu toxicitate redus\u0103 pentru albine.</strong> Contra viermilor fructelor, afidelor. Poate fi aplicat \u00een aproprierea infloritului (cu precautie). <em>Pauz\u0103: 7 zile.</em>",
  "Teppeki 50 WG 0.015%":
    "<strong>Aficid modern extrem de selectiv (flonicamid) — NU omoar\u0103 albinele.</strong> Actioneaz\u0103 EXCLUSIV contra afidelor, l\u0103s\u00e2nd nev\u0103t\u0103mate insectele benefice. Actiune lent\u0103 (2-3 zile) dar efect lung. <em>Pauz\u0103: 7 zile.</em>",
  "Actara 25 WG 0.02%":
    "<strong>Insecticid sistemic (thiamethoxam) contra afidelor \u0219i insectelor sugatoare.</strong> P\u0103trunde \u00een plant\u0103, protejeaz\u0103 inclusiv frunzele noi. Eficient pe vreme r\u0103coroas\u0103. Pericol albine. <em>Pauz\u0103: 7 zile.</em>",
  "Movento 100 SC 0.1%":
    "<strong>Insecticid sistemic bidir\u0229c\u021bional (spirotetramat) contra afidelor rezistente.</strong> Unic avantaj: se misc\u0103 \u00een ambele directii \u00een plant\u0103 (sus \u0219i jos). Actiune lent\u0103 (5-7 zile) dar efect de durat\u0103. <em>Pauz\u0103: 7 zile.</em>",
  "Mavrik 2F 0.02% (sigur albine)":
    "<strong>Insecticid piretroid SIGUR pentru albine.</strong> Contra g\u0103rg\u0103rit\u0259ei florilor, tripshilor, afidelor. Unul dintre putinele insecticide aplicabile \u00een perioada infloritului. <em>Pauz\u0103: 7 zile.</em>",
  "Decis 25 WG 0.003%":
    "<strong>Insecticid piretroid rapid — efect de \u015eoc.</strong> Contra omizilor, insectelor daunatoare. Insectele mor \u00een c\u00e2teva ore. Pericol albine — NU \u00een timpul infloritului. <em>Pauz\u0103: 7 zile.</em>",
  "Karate Zeon 5 CS 0.015%":
    "<strong>Insecticid piretroid rapid (lambda-cyhalothrin).</strong> Contra omizilor, mu\u015etii cire\u015eelor, g\u0103rg\u0103ri\u021bei. Actiune rapid\u0103 de \u015eoc. Pericol albine — NU pe timp de v\u00e2nt. <em>Pauz\u0103: 7 zile.</em>",
  "Pirimor 50 WG 0.05% (anti-afide)":
    "<strong>Aficid selectiv (pirimicarb) — NU omoar\u0103 albinele \u0219i insectele benefice.</strong> Actioneaz\u0103 EXCLUSIV contra afidelor (rapid, 2-3 ore). Sigur de folosit chiar \u0219i \u00een apropierea infloritului. <em>Pauz\u0103: 7 zile.</em>",
  "Coragen 20 SC 0.0175%":
    "<strong>Insecticid biologic (clorantraniliprol) — selectiv \u0219i sigur.</strong> Contra viermilor fructelor, omizilor. Nu afecteaz\u0103 albinele. Actiune lent\u0103 (24-48h) dar efect lung. <em>Pauz\u0103: 7 zile.</em>",
  "Laser 240 SC 0.04% (spinosad)":
    "<strong>Insecticid biologic (spinosad) contra mu\u015etii cire\u015eelor \u0219i Drosophilei.</strong> Derivat natural din bacterii de sol. Eficient contra mu\u015ecu\u021bei de o\u021bet (Drosophila suzukii) care atac\u0103 zmeurul, murul, afinul. Sigur dup\u0103 uscare. <em>Pauz\u0103: 3-7 zile.</em>",
  "Bicarbonat sodiu 0.5% (anti-fainare)":
    "<strong>Fungicid bio — bicarbonat de sodiu din buc\u0103t\u0103rie!</strong> Concentratie: 5g (o lingurit\u0103) la 1L ap\u0103. Preventiv contra f\u0103in\u0103rii \u0219i mucegaiurilor superficiale. Sigur, f\u0103r\u0103 timp de pauz\u0103, ieftin. Bun pentru zmeur, mur, afin \u00een agricultur\u0103 bio.",
  "Serenade ASO 0.04% (Bacillus subtilis)":
    "<strong>Fungicid \u0219i bactericid BIO (Bacillus subtilis).</strong> Derivat natural din bacterii de sol. Impotriva putregaiului cenusiu (botrytis), moniliozei, bacteriozelor. Sigur pentru oameni, albine, mediu. Fara pauz\u0103 recoltare. Ideal pentru afin, zmeur, mur. Eficacitate mai mic\u0103 dec\u00e2t chimicalele dar perfect ca alternativ\u0103 bio.",
  "Chelatii fier EDDHA 0.2% (pentru afin)":
    "<strong>Corector de carent\u0103 de fier — ESENTIAL pentru afin pe sol alcalin!</strong> Afinul pe sol cu pH peste 6.0 nu poate absorbi fierul \u0219i \u00eeng\u0103lbene\u015fte (cloroz\u0103 ferica). Chelatii EDDHA sunt singura form\u0103 de fier absorbit la pH ridicat. Aplicare: udare la r\u0103d\u0103cin\u0103 (20-30g/plant\u0103). NU substitut pentru acidifierea solului!",
  "Zeama sulfocalcica 2% (repaus vegetativ)":
    "<strong>Insecto-fungicid natural (polisulfuri de calciu) — tratament de iarn\u0103.</strong> Omorar\u0103 ou\u0103le de acarieni, cochenil\u0103, p\u0103duchele din San Jose. Eficient \u0219i contra ciupercilor de scoart\u0103. Se aplic\u0103 NUMAI \u00een repaus total (feb-mar, \u00eenainte de umflarea mugurilor). La temperaturi pozitive, pe lemn gol. Pauza: nu se aplic\u0103 \u00een sezon.",
  "Delan 700 WDG 0.05% (rapan mar/par)":
    "<strong>Fungicid de contact (ditianon) specific contra r\u0103p\u0103nului la m\u0103r \u0219i par.</strong> Formeaz\u0103 un strat protector de lung\u0103 durat\u0103, rezistent la ploaie. Ideal \u00een combina\u021Bie cu fungicide sistemice (Score, Topsin). Eficient preventiv. <em>Pauz\u0103: 14 zile.</em>",
};

function updateCalcConc() {
  const sel = $("#calcProduct");
  const opt = sel.options[sel.selectedIndex];
  if (opt.value) {
    $("#calcConc").value = opt.value;
  }
  // Show product description
  var descEl = document.getElementById("prodDesc");
  if (descEl) {
    var key = opt.text ? opt.text.trim() : "";
    var desc = CALC_PROD_DESC[key] || "";
    if (desc) {
      descEl.innerHTML = desc;
      descEl.classList.add("visible");
    } else {
      descEl.innerHTML = "";
      descEl.classList.remove("visible");
    }
  }
}
function calculateDose() {
  const conc = parseFloat($("#calcConc").value);
  const vol = parseFloat($("#calcVolume").value);
  if (isNaN(conc) || isNaN(vol) || conc <= 0 || vol <= 0) return;

  const dose = conc * vol * 10;
  const sel = $("#calcProduct");
  const opt = sel.options[sel.selectedIndex];
  const unit = opt.dataset.unit || "g/ml";

  const result = $("#calcResult");
  result.style.display = "block";
  $("#calcDose").textContent =
    dose < 1 ? dose.toFixed(2) : dose < 10 ? dose.toFixed(1) : Math.round(dose);
  $("#calcUnit").textContent = `${unit} la ${vol}L apa`;

  // Total per numar pomi
  var nPomi = parseInt(document.getElementById("calcPomi")?.value) || 0;
  var lPerPom = parseFloat(document.getElementById("calcLPerPom")?.value) || 5;
  var totalEl = document.getElementById("calcTotal");
  if (nPomi > 0) {
    var totalVol = nPomi * lPerPom;
    var totalDose = conc * totalVol * 10;
    var doseStr = totalDose < 10 ? totalDose.toFixed(1) : Math.round(totalDose);
    if (!totalEl) {
      totalEl = document.createElement("div");
      totalEl.id = "calcTotal";
      totalEl.style.cssText =
        "margin-top:12px;padding:12px;background:var(--bg-surface);border-radius:8px;font-size:0.85rem;";
      result.parentNode.insertBefore(totalEl, result.nextSibling);
    }
    totalEl.innerHTML =
      "<strong>Pentru " +
      nPomi +
      " pomi \u00D7 " +
      lPerPom +
      "L:</strong><br>" +
      totalVol +
      " L solu\u021Bie total\u0103, " +
      doseStr +
      " " +
      unit +
      " produs total";
    totalEl.style.display = "block";
  } else if (totalEl) {
    totalEl.style.display = "none";
  }
}

// ====== JURNAL ======
function getJurnalEntries() {
  try {
    return JSON.parse(localStorage.getItem("livada-jurnal") || "[]");
  } catch {
    return [];
  }
}
function saveJurnalEntries(entries) {
  localStorage.setItem("livada-jurnal", JSON.stringify(entries));
}

// ====== F6.2: JURNAL OFFLINE IndexedDB ======
var _idb = null;
function openLivadaIDB() {
  return new Promise(function (resolve, reject) {
    if (_idb) return resolve(_idb);
    if (!window.indexedDB) return reject(new Error("IndexedDB indisponibil"));
    var req = indexedDB.open("livada-jurnal", 1);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "id" });
      }
    };
    req.onsuccess = function () {
      _idb = req.result;
      resolve(_idb);
    };
    req.onerror = function () {
      reject(req.error);
    };
  });
}

function saveOfflineEntry(entry) {
  return openLivadaIDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("pending", "readwrite");
      tx.objectStore("pending").put(entry);
      tx.oncomplete = function () {
        livadaLog("SYNC", "offline-save", "OK", "entry " + entry.id);
        showToast("Salvat local \u2014 va fi sincronizat online");
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error);
      };
    });
  });
}

function getPendingOfflineEntries() {
  return openLivadaIDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("pending", "readonly");
      var req = tx.objectStore("pending").getAll();
      req.onsuccess = function () {
        resolve(req.result || []);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  });
}

function clearPendingOfflineEntries() {
  return openLivadaIDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("pending", "readwrite");
      tx.objectStore("pending").clear();
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error);
      };
    });
  });
}

// Sync offline entries la revenire online
function syncOfflineJournal() {
  if (!navigator.onLine) return Promise.resolve();
  return getPendingOfflineEntries()
    .then(function (pending) {
      if (!pending.length) return;
      // Merge pending into localStorage
      var entries = getJurnalEntries();
      var existingIds = {};
      entries.forEach(function (e) {
        existingIds[e.id] = true;
      });
      var added = 0;
      pending.forEach(function (p) {
        if (!existingIds[p.id]) {
          entries.unshift(p);
          added++;
        }
      });
      if (added > 0) {
        saveJurnalEntries(entries);
        renderJurnal();
      }
      return clearPendingOfflineEntries().then(function () {
        if (added > 0) {
          livadaLog("SYNC", "offline-merge", "OK", added + " intrari");
          showToast(
            "\u2705 " + added + " interven\u021Bii sincronizate din offline",
          );
          return syncJournal().catch(function () {});
        }
      });
    })
    .catch(function (e) {
      livadaLog("ERR", "syncOfflineJournal", "FAIL", e.message);
    });
}

// Auto-sync la revenirea online
window.addEventListener("online", function () {
  syncOfflineJournal();
});
// Toggle recolta fields
document.getElementById("jurnalType")?.addEventListener("change", function () {
  var rf = document.getElementById("recoltaFields");
  if (rf) rf.style.display = this.value === "recoltare" ? "block" : "none";
});
// Istoric conversatii chat diagnostic (per prefix: 'diag' | 'aiGenDiag')
var _diagChatHistory = {};

// N1: PHI Calculator — pauze de securitate (zile) per produs fitosanitar
var PHI_DAYS = {
  dithane: 28,
  mancozeb: 28,
  captan: 7,
  folpan: 7,
  score: 14,
  systhane: 14,
  topas: 14,
  folicur: 14,
  chorus: 7,
  switch: 7,
  teldor: 7,
  signum: 7,
  calypso: 14,
  actara: 7,
  mospilan: 7,
  confidor: 14,
  decis: 7,
  karate: 7,
  fastac: 7,
  laser: 1,
  delegate: 7,
  coragen: 7,
  affirm: 7,
};

function addJurnalEntry() {
  var btn = document.getElementById("btnAddJurnal");
  if (btn && btn.disabled) return;
  debounceBtn(btn, 2000);
  try {
    var date = document.getElementById("jurnalDate").value;
    var type = document.getElementById("jurnalType").value;
    var note = document.getElementById("jurnalNote").value.trim();
    if (!date || !note) {
      showToast("Completeaza data si nota.");
      return;
    }
    // V4: Warning interval minim intre tratamente fitosanitare
    if (type === "fitosanitar" || type === "tratament") {
      var prevTreatments = getJurnalEntries().filter(function (e) {
        return (
          (e.type === "fitosanitar" || e.type === "tratament") &&
          new Date(e.date + "T12:00") < new Date(date + "T12:00")
        );
      });
      if (prevTreatments.length > 0) {
        var lastTr = prevTreatments[0];
        var daysDiff = Math.floor(
          (new Date(date + "T12:00") - new Date(lastTr.date + "T12:00")) /
            86400000,
        );
        if (daysDiff < 7) {
          var ok = confirm(
            "Atentie: Ultimul tratament a fost pe " +
              lastTr.date +
              " (" +
              daysDiff +
              " zile).\nInterval recomandat intre tratamente fitosanitare: minim 7-10 zile.\nContinui inregistrarea?",
          );
          if (!ok) {
            debounceBtn(btn, 0);
            return;
          }
        }
      }
    }
    var entry = { id: Date.now(), date: date, type: type, note: note };
    // N4: Cost per tratament
    var entryCost =
      parseFloat(document.getElementById("jurnalCost")?.value) || 0;
    if (entryCost > 0) {
      entry.cost = entryCost;
      document.getElementById("jurnalCost").value = "";
    }
    if (type === "recoltare") {
      var sp = document.getElementById("jurnalSpecie")?.value;
      var kg = parseFloat(document.getElementById("jurnalKg")?.value) || 0;
      if (sp) entry.species = sp;
      if (kg > 0) entry.kg = kg;
      var recoltareDate = new Date(date + "T12:00");
      var recentEntries = getJurnalEntries().filter(function (e) {
        return (
          (e.type === "fitosanitar" || e.type === "tratament") &&
          Date.now() - new Date(e.date + "T12:00") < 40 * 86400000
        );
      });
      var violations = [];
      recentEntries.forEach(function (e) {
        var noteLower = (e.note || "").toLowerCase();
        Object.keys(PHI_DAYS).forEach(function (prod) {
          if (noteLower.includes(prod)) {
            var treatDate = new Date(e.date + "T12:00");
            var daysDiff = Math.round((recoltareDate - treatDate) / 86400000);
            if (daysDiff >= 0 && daysDiff < PHI_DAYS[prod]) {
              violations.push(
                prod.charAt(0).toUpperCase() +
                  prod.slice(1) +
                  ": tratament pe " +
                  e.date +
                  " (pauza: " +
                  PHI_DAYS[prod] +
                  " zile, au trecut: " +
                  daysDiff +
                  " zile)",
              );
            }
          }
        });
      });
      if (violations.length > 0) {
        var ok = confirm(
          "\u26A0\uFE0F ATENTIE PAUZA DE SECURITATE!\n\nUrmatoarele produse nu au respectat intervalul minim:\n\n" +
            violations.join("\n") +
            "\n\nContinui inregistrarea recoltei?",
        );
        if (!ok) {
          debounceBtn(btn, 0);
          return;
        }
      }
    }
    var entries = getJurnalEntries();
    entries.unshift(entry);
    saveJurnalEntries(entries);
    document.getElementById("jurnalNote").value = "";
    if (document.getElementById("jurnalKg"))
      document.getElementById("jurnalKg").value = "";
    renderJurnal();
    livadaLog("NAV", "add-jurnal", "OK", type);
    if (navigator.onLine) {
      syncJournal().catch(function (e) {
        console.error("syncJournal:", e);
      });
    } else {
      // F6.2 — Salvare offline in IndexedDB
      saveOfflineEntry(entry).catch(function (e) {
        console.error("saveOfflineEntry:", e);
      });
    }
  } catch (err) {
    showToast("Eroare la salvare: " + err.message);
    livadaLog("ERR", "addJurnalEntry", "FAIL", err.message);
  }
}
function deleteJurnalEntry(id) {
  try {
    var entries = getJurnalEntries().filter(function (e) {
      return e.id !== id;
    });
    saveJurnalEntries(entries);
    renderJurnal();
    syncDeleteJournal(id);
  } catch (err) {
    showToast("Eroare la stergere: " + err.message);
  }
}
var jurnalPage = 0;
var JURNAL_PER_PAGE = 15;
function renderJurnal() {
  var list = document.getElementById("jurnalList");
  var pager = document.getElementById("jurnalPager");
  var filter = document.getElementById("jurnalFilter");
  var filterVal = filter ? filter.value : "";
  var specieFilterVal =
    document.getElementById("jurnalSpecieFilter")?.value || "";
  var all = getJurnalEntries();
  var entries = filterVal
    ? all.filter(function (e) {
        return e.type === filterVal;
      })
    : all;
  if (specieFilterVal)
    entries = entries.filter(function (e) {
      return (
        (e.species || "") === specieFilterVal ||
        (e.note || "").toLowerCase().includes(specieFilterVal)
      );
    });
  var searchVal = (document.getElementById("jurnalSearch")?.value || "")
    .toLowerCase()
    .trim();
  var dateFrom = document.getElementById("jurnalDateFrom")?.value || "";
  var dateTo = document.getElementById("jurnalDateTo")?.value || "";
  if (searchVal)
    entries = entries.filter(function (e) {
      return (e.note || "").toLowerCase().includes(searchVal);
    });
  if (dateFrom)
    entries = entries.filter(function (e) {
      return e.date >= dateFrom;
    });
  if (dateTo)
    entries = entries.filter(function (e) {
      return e.date <= dateTo;
    });
  if (entries.length === 0) {
    list.innerHTML =
      '<div class="jurnal-empty">Nicio interventie' +
      (filterVal ? " de acest tip" : "") +
      (specieFilterVal ? " pentru aceasta specie" : "") +
      ".</div>";
    if (pager) pager.innerHTML = "";
    return;
  }
  var typeLabels = {
    tratament: "\uD83D\uDCA7 Tratament",
    tundere: "\u2702\uFE0F Tundere",
    fertilizare: "\uD83C\uDF31 Fertilizare",
    irigare: "\uD83D\uDCA7 Irigare",
    recoltare: "\uD83C\uDF4E Recoltare",
    observatie: "\uD83D\uDC41\uFE0F Observatie",
    altele: "\uD83D\uDCCC Altele",
  };
  var pages = Math.ceil(entries.length / JURNAL_PER_PAGE);
  if (jurnalPage >= pages) jurnalPage = pages - 1;
  var start = jurnalPage * JURNAL_PER_PAGE;
  var slice = entries.slice(start, start + JURNAL_PER_PAGE);
  list.innerHTML = slice
    .map(function (e) {
      return (
        '<div class="jurnal-entry" data-id="' +
        e.id +
        '">' +
        '<span class="je-date">' +
        escapeHtml(e.date) +
        "</span>" +
        '<span class="je-type">' +
        (typeLabels[e.type] || e.type) +
        "</span>" +
        '<div class="je-text">' +
        escapeHtml(e.note) +
        "</div>" +
        '<div class="je-actions">' +
        '<button class="btn btn-secondary" style="padding:3px 10px;font-size:0.72rem;" onclick="editJurnalEntry(' +
        e.id +
        ')">Edit</button> ' +
        '<button class="btn btn-danger" style="padding:3px 10px;font-size:0.72rem;" onclick="deleteJurnalEntry(' +
        e.id +
        ')">Sterge</button>' +
        "</div></div>"
      );
    })
    .join("");
  // Pager
  if (pager && pages > 1) {
    var ph = "";
    if (jurnalPage > 0)
      ph +=
        '<button class="btn btn-secondary" style="padding:4px 10px;font-size:0.75rem;" onclick="jurnalPage--;renderJurnal();">\u2190</button>';
    ph +=
      '<span style="font-size:0.75rem;color:var(--text-dim);padding:4px 8px;">' +
      (jurnalPage + 1) +
      "/" +
      pages +
      " (" +
      entries.length +
      ")</span>";
    if (jurnalPage < pages - 1)
      ph +=
        '<button class="btn btn-secondary" style="padding:4px 10px;font-size:0.75rem;" onclick="jurnalPage++;renderJurnal();">\u2192</button>';
    pager.innerHTML = ph;
  } else if (pager) {
    pager.innerHTML = "";
  }
}
function editJurnalEntry(id) {
  var entries = getJurnalEntries();
  var e = entries.find(function (x) {
    return x.id === id;
  });
  if (!e) return;
  var entryEl = document.querySelector('.jurnal-entry[data-id="' + id + '"]');
  if (!entryEl) return;
  var textEl = entryEl.querySelector(".je-text");
  if (!textEl || textEl.dataset.editing) return;
  textEl.dataset.editing = "true";
  var types = [
    "tratament",
    "tundere",
    "fertilizare",
    "irigare",
    "recoltare",
    "observatie",
    "altele",
  ];
  var opts = types
    .map(function (t) {
      return (
        '<option value="' +
        t +
        '"' +
        (t === e.type ? " selected" : "") +
        ">" +
        t +
        "</option>"
      );
    })
    .join("");
  entryEl.querySelector(".je-date").innerHTML =
    '<input type="date" class="je-edit-date" value="' +
    escapeHtml(e.date || "") +
    '" style="font-size:0.78rem;padding:2px 4px;background:var(--bg-surface);color:var(--text);border:1px solid var(--border);border-radius:4px;">';
  entryEl.querySelector(".je-type").innerHTML =
    '<select class="je-edit-type" style="font-size:0.72rem;padding:2px 4px;background:var(--bg-surface);color:var(--text);border:1px solid var(--border);border-radius:4px;">' +
    opts +
    "</select>";
  textEl.innerHTML =
    '<textarea class="je-edit-area" rows="3">' +
    escapeHtml(e.note) +
    "</textarea>" +
    '<div style="display:flex;gap:6px;margin-top:6px;">' +
    '<button class="btn btn-primary" style="padding:4px 12px;font-size:0.75rem;" onclick="saveJurnalEdit(' +
    id +
    ')">Salveaz\u0103</button>' +
    '<button class="btn btn-secondary" style="padding:4px 12px;font-size:0.75rem;" onclick="renderJurnal()">Anuleaz\u0103</button></div>';
  textEl.querySelector("textarea").focus();
}
function saveJurnalEdit(id) {
  var entryEl = document.querySelector('.jurnal-entry[data-id="' + id + '"]');
  if (!entryEl) return;
  var ta = entryEl.querySelector(".je-edit-area");
  var dateInput = entryEl.querySelector(".je-edit-date");
  var typeSelect = entryEl.querySelector(".je-edit-type");
  if (!ta || !ta.value.trim()) return;
  var entries = getJurnalEntries();
  var e = entries.find(function (x) {
    return x.id === id;
  });
  if (e) {
    e.note = ta.value.trim();
    if (dateInput && dateInput.value) e.date = dateInput.value;
    if (typeSelect) e.type = typeSelect.value;
    saveJurnalEntries(entries);
    syncJournal();
  }
  renderJurnal();
}
function exportJurnalCSV() {
  var entries = getJurnalEntries();
  if (!entries.length) {
    alert("Jurnal gol.");
    return;
  }
  var bom = "\uFEFF";
  var csv =
    bom +
    "Data,Tip,Nota,Specie,Kg\n" +
    entries
      .map(function (e) {
        var sp = e.species ? SPECIES[e.species] || e.species : "";
        var kg = e.kg ? e.kg : "";
        return (
          e.date +
          "," +
          (e.type || "") +
          ',"' +
          (e.note || "").replace(/"/g, '""') +
          '",' +
          sp +
          "," +
          kg
        );
      })
      .join("\n");
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jurnal-livada-" + todayLocal() + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
  livadaLog("NAV", "export-csv", "OK", entries.length + " intrari");
}
function copyJurnalClipboard() {
  var entries = getJurnalEntries();
  if (!entries.length) {
    alert("Jurnal gol.");
    return;
  }
  var text = entries
    .map(function (e) {
      return e.date + " [" + e.type + "] " + e.note;
    })
    .join("\n");
  navigator.clipboard
    .writeText(text)
    .then(function () {
      alert("Copiat!");
    })
    .catch(function () {
      alert("Eroare la copiere.");
    });
}
// Set today as default date + build search cache + search index
document.addEventListener("DOMContentLoaded", () => {
  const today = todayLocal();
  $("#jurnalDate").value = today;
  buildSearchCache();
  buildSearchIndex();
});

// ====== CALENDAR ======
const MONTHS_RO = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];
const DAYS_RO = ["Lu", "Ma", "Mi", "Jo", "Vi", "S\u00E2", "Du"];
const TREATMENTS_CAL = [
  {
    m1: 2,
    m2: 3,
    label: "Repaus vegetativ",
    desc: "Zeama bordelez\u0103 3% / Funguran OH + Oleomin",
    color: "var(--accent)",
  },
  {
    m1: 3,
    m2: 3,
    d1: 15,
    label: "Dezmugurire",
    desc: "Score 0.02% + Mospilan 0.03%",
    color: "var(--info)",
  },
  {
    m1: 4,
    m2: 4,
    d2: 10,
    label: "Buton floral",
    desc: "Chorus + Captadin + Mavrik",
    color: "var(--warning)",
  },
  {
    m1: 4,
    m2: 4,
    d1: 10,
    d2: 25,
    label: "Primele flori",
    desc: "Score 0.02% + Decis. NU stropiti cu albine!",
    color: "var(--danger)",
  },
  {
    m1: 4,
    m2: 5,
    d1: 25,
    d2: 5,
    label: "Sc\u0103derea petalelor",
    desc: "Switch/Topsin + Calypso",
    color: "var(--accent)",
  },
  {
    m1: 5,
    m2: 5,
    label: "Fruct mic",
    desc: "Merpan + Thiovit Jet + Teppeki. R\u0103rire fructe!",
    color: "var(--info)",
  },
  {
    m1: 6,
    m2: 6,
    label: "Fruct \u00een cre\u0219tere",
    desc: "Luna Experience/Topsin + Coragen",
    color: "var(--warning)",
  },
  {
    m1: 7,
    m2: 7,
    label: "Fruct p\u00e2rg\u0103",
    desc: "Switch/Dithane + Karate Zeon. Recoltat cais.",
    color: "var(--accent)",
  },
  {
    m1: 8,
    m2: 8,
    label: "Dup\u0103 recolt\u0103",
    desc: "Topsin + Captadin + Karate Zeon. T\u0103ieri verde.",
    color: "var(--info)",
  },
  {
    m1: 9,
    m2: 10,
    label: "Fructe m\u0103r/p\u0103r",
    desc: "Dithane 0.2%. Respect\u0103 pauza!",
    color: "var(--warning)",
  },
  {
    m1: 11,
    m2: 11,
    label: "Dup\u0103 c\u0103derea frunzelor",
    desc: "Sulfat cupru 1-3%. Cur\u0103\u021benie livad\u0103.",
    color: "var(--accent)",
  },
];

let calMonth, calYear;
function initCalendarDate() {
  const now = new Date();
  calMonth = now.getMonth(); // 0-indexed
  calYear = now.getFullYear();
}
initCalendarDate();

function renderCalendar() {
  const title = $("#calTitle");
  const grid = $("#calGrid");
  const events = $("#calEvents");
  title.textContent = `${MONTHS_RO[calMonth]} ${calYear}`;

  // Days of week header
  let html = DAYS_RO.map((d) => `<div class="cal-day-name">${d}</div>`).join(
    "",
  );

  // First day of month (0=Sun, adjust to Mon=0)
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();

  // Empty cells
  for (let i = 0; i < startOffset; i++)
    html += '<div class="cal-day empty"></div>';

  // Journal entries for this month
  var jEntries = getJurnalEntries();
  var yearMonth = calYear + "-" + String(calMonth + 1).padStart(2, "0");
  var jByDay = {};
  jEntries.forEach(function (e) {
    if (e.date && e.date.startsWith(yearMonth)) {
      var day = parseInt(e.date.split("-")[2]);
      if (!jByDay[day]) jByDay[day] = [];
      jByDay[day].push(e);
    }
  });

  // Day cells
  const monthNum = calMonth + 1;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      d === today.getDate() &&
      calMonth === today.getMonth() &&
      calYear === today.getFullYear();
    const hasEvent = TREATMENTS_CAL.some((t) => {
      const from = t.m1,
        to = t.m2;
      if (monthNum < from || monthNum > to) return false;
      if (monthNum === from && t.d1 && d < t.d1) return false;
      if (monthNum === to && t.d2 && d > t.d2) return false;
      return true;
    });
    var hasJ = !!jByDay[d];
    // V7: dot colorat per tip interventie
    var dotHtml = "";
    if (hasJ) {
      var types = jByDay[d].map(function (e) {
        return e.type;
      });
      var dotColor = types.some(function (t) {
        return t === "tratament" || t === "fitosanitar";
      })
        ? "var(--danger)"
        : types.some(function (t) {
              return t === "recoltare";
            })
          ? "var(--accent)"
          : types.some(function (t) {
                return t === "fertilizare";
              })
            ? "#3b82f6"
            : "var(--warning)";
      var cnt = jByDay[d].length;
      dotHtml =
        '<span class="cal-j-dot" style="background:' +
        dotColor +
        ';">' +
        (cnt > 1
          ? '<span style="font-size:0.5rem;color:#fff;line-height:1;">' +
            cnt +
            "</span>"
          : "") +
        "</span>";
    }
    html +=
      '<div class="cal-day' +
      (isToday ? " today" : "") +
      (hasEvent ? " has-event" : "") +
      '"' +
      (hasJ ? ' onclick="showDayJournal(' + d + ')"' : "") +
      ">" +
      d +
      dotHtml +
      "</div>";
  }
  grid.innerHTML = html;

  // Events for this month
  const monthEvents = TREATMENTS_CAL.filter(
    (t) => monthNum >= t.m1 && monthNum <= t.m2,
  );
  if (monthEvents.length > 0) {
    events.innerHTML =
      '<h4 style="color:var(--accent);margin-bottom:8px;">Tratamente luna aceasta:</h4>' +
      monthEvents
        .map(
          (t) =>
            `<div class="cal-event-item" style="border-color:${t.color}"><strong>${t.label}</strong><br>${t.desc}</div>`,
        )
        .join("");
  } else {
    events.innerHTML =
      '<p style="color:var(--text-dim);text-align:center;padding:20px;">Niciun tratament planificat luna aceasta.</p>';
  }
}
var _calNavTimer;
function calNav(dir) {
  clearTimeout(_calNavTimer);
  _calNavTimer = setTimeout(function () {
    calMonth += dir;
    if (calMonth < 0) {
      calMonth = 11;
      calYear--;
    }
    if (calMonth > 11) {
      calMonth = 0;
      calYear++;
    }
    renderCalendar();
  }, CAL_NAV_DEBOUNCE_MS);
}

// ====== RECOLTA SUMMARY ======
function renderRecoltaSummary(selectedYear) {
  var el = document.getElementById("recoltaSummary");
  if (!el) return;
  var currentYear = new Date().getFullYear();
  if (!selectedYear)
    selectedYear = parseInt(
      localStorage.getItem("livada-recolta-year") || currentYear,
    );
  localStorage.setItem("livada-recolta-year", selectedYear);
  var years = [currentYear, currentYear - 1, currentYear - 2];
  var yearBtns = years
    .map(function (y) {
      var isActive = y === selectedYear;
      return (
        '<button onclick="renderRecoltaSummary(' +
        y +
        ')" style="' +
        (isActive
          ? "background:var(--accent);color:#fff;"
          : "background:var(--bg-surface);color:var(--text-dim);") +
        'border:1px solid var(--border);border-radius:12px;padding:2px 12px;font-size:0.75rem;cursor:pointer;">' +
        y +
        "</button>"
      );
    })
    .join("");
  var yearSelectorHtml =
    '<div style="display:flex;gap:6px;justify-content:center;margin-bottom:12px;">' +
    yearBtns +
    "</div>";
  var entries = getJurnalEntries().filter(function (e) {
    return (
      e.type === "recoltare" &&
      e.date &&
      e.date.startsWith(String(selectedYear)) &&
      e.kg > 0
    );
  });
  if (entries.length === 0) {
    el.innerHTML =
      yearSelectorHtml +
      '<p style="color:var(--text-dim);text-align:center;padding:16px;">Nicio recolt\u0103 \u00EEnregistrat\u0103 \u00EEn ' +
      selectedYear +
      ". Adaug\u0103 din Jurnal (tip: Recoltare).</p>";
    return;
  }
  var bySpecies = {};
  entries.forEach(function (e) {
    var sp = e.species || "necunoscut";
    if (!bySpecies[sp]) bySpecies[sp] = { kg: 0, count: 0 };
    bySpecies[sp].kg += e.kg;
    bySpecies[sp].count++;
  });
  var totalKg = 0;
  var rows = Object.entries(bySpecies)
    .sort(function (a, b) {
      return b[1].kg - a[1].kg;
    })
    .map(function (p) {
      totalKg += p[1].kg;
      var name = SPECIES[p[0]] || p[0].charAt(0).toUpperCase() + p[0].slice(1);
      return (
        "<tr><td>" +
        escapeHtml(name) +
        '</td><td style="text-align:right;">' +
        p[1].kg.toFixed(1) +
        '</td><td style="text-align:right;">' +
        p[1].count +
        "</td></tr>"
      );
    })
    .join("");
  el.innerHTML =
    yearSelectorHtml +
    '<div class="table-wrap"><table><tr><th>Specie</th><th style="text-align:right;">Kg total</th><th style="text-align:right;">Recolt\u0103ri</th></tr>' +
    rows +
    '<tr style="font-weight:700;border-top:2px solid var(--accent);"><td>TOTAL ' +
    selectedYear +
    '</td><td style="text-align:right;">' +
    totalKg.toFixed(1) +
    ' kg</td><td style="text-align:right;">' +
    entries.length +
    "</td></tr></table></div>";
}

// ====== CALENDAR JOURNAL OVERLAY ======
function showDayJournal(day) {
  var monthStr = String(calMonth + 1).padStart(2, "0");
  var dateStr = calYear + "-" + monthStr + "-" + String(day).padStart(2, "0");
  var entries = getJurnalEntries().filter(function (e) {
    return e.date === dateStr;
  });
  var events = document.getElementById("calEvents");
  if (!events || entries.length === 0) return;
  var typeLabels = {
    tratament: "\uD83D\uDCA7",
    tundere: "\u2702\uFE0F",
    fertilizare: "\uD83C\uDF31",
    irigare: "\uD83D\uDCA7",
    recoltare: "\uD83C\uDF4E",
    observatie: "\uD83D\uDC41\uFE0F",
    altele: "\uD83D\uDCCC",
  };
  events.innerHTML +=
    '<h4 style="color:var(--warning);margin:16px 0 8px;">\uD83D\uDCDD Interven\u021Bii pe ' +
    dateStr +
    ":</h4>" +
    entries
      .map(function (e) {
        return (
          '<div class="cal-event-item" style="border-color:var(--warning);"><strong>' +
          (typeLabels[e.type] || "\uD83D\uDCCC") +
          " " +
          escapeHtml(e.type) +
          "</strong><br>" +
          escapeHtml(e.note) +
          "</div>"
        );
      })
      .join("");
}

// ====== WMO CODES (Open-Meteo) ======
var WMO_CODES = {
  0: "Cer senin",
  1: "Predominant senin",
  2: "Partial innorat",
  3: "Innorat",
  45: "Ceata",
  48: "Ceata cu chiciura",
  51: "Burinta usoara",
  53: "Burinta moderata",
  55: "Burinta densa",
  61: "Ploaie usoara",
  63: "Ploaie moderata",
  65: "Ploaie puternica",
  66: "Ploaie inghetata usoara",
  67: "Ploaie inghetata puternica",
  71: "Ninsoare usoara",
  73: "Ninsoare moderata",
  75: "Ninsoare puternica",
  77: "Granule de zapada",
  80: "Averse usoare",
  81: "Averse moderate",
  82: "Averse violente",
  85: "Ninsoare usoara",
  86: "Ninsoare puternica",
  95: "Furtuna",
  96: "Furtuna cu grindina",
  99: "Furtuna cu grindina",
};
function wmoEmoji(code) {
  if (code === 0) return "\u2600\uFE0F";
  if (code <= 3) return "\u26C5";
  if (code <= 48) return "\uD83C\uDF2B\uFE0F";
  if (code <= 55) return "\uD83C\uDF26\uFE0F";
  if (code <= 67) return "\uD83C\uDF27\uFE0F";
  if (code <= 77) return "\uD83C\uDF28\uFE0F";
  if (code <= 82) return "\uD83C\uDF27\uFE0F";
  if (code >= 95) return "\u26C8\uFE0F";
  return "\uD83C\uDF24\uFE0F";
}

// ====== METEO (Open-Meteo — gratuit, fara API key) ======
// T8: cache in-memory 5 minute pentru deduplicare request-uri
var _meteoCache = null,
  _meteoCacheTs = 0;
var METEO_URL_FULL =
  "https://api.open-meteo.com/v1/forecast?latitude=" +
  LIVADA_LAT +
  "&longitude=" +
  LIVADA_LON +
  "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean,weather_code&timezone=Europe/Bucharest&forecast_days=5";
var METEO_URL_FAST =
  "https://api.open-meteo.com/v1/forecast?latitude=" +
  LIVADA_LAT +
  "&longitude=" +
  LIVADA_LON +
  "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean,weather_code&timezone=Europe/Bucharest&forecast_days=3";
async function fetchMeteoData(full) {
  var now = Date.now();
  if (_meteoCache && now - _meteoCacheTs < 300000) return _meteoCache;
  var url = full ? METEO_URL_FULL : METEO_URL_FAST;
  var res = await fetchWithTimeout(url, {}, 10000);
  if (!res.ok) throw new Error("Open-Meteo error " + res.status);
  _meteoCache = await res.json();
  _meteoCacheTs = now;
  return _meteoCache;
}

function initMeteo() {
  fetchMeteo();
  // F1.5 — Verifica ultima rulare cron meteo
  checkCronMeteoStatus();
}

async function checkCronMeteoStatus() {
  try {
    var res = await fetch("/api/meteo-history?days=2");
    if (!res.ok) return;
    var data = await res.json();
    var entries = Object.entries(data || {});
    if (!entries.length) return;
    var lastDate = entries
      .sort(function (a, b) {
        return a[0].localeCompare(b[0]);
      })
      .pop()[0];
    var lastTs = new Date(lastDate + "T23:59:59").getTime();
    var now = Date.now();
    if (now - lastTs > 26 * 3600 * 1000) {
      // Salvam timestamp pentru debug panel
      localStorage.setItem("livada:cron:last-run-ts", String(lastTs));
      var el = document.getElementById("meteoData");
      if (el) {
        var warn = document.createElement("div");
        warn.className = "alert alert-warning";
        warn.style.cssText = "font-size:0.8rem;margin-bottom:8px;";
        warn.innerHTML =
          "\u26A0 Date meteo posibil dep\u0103\u0219ite \u2014 ultima actualizare: " +
          lastDate;
        el.prepend(warn);
      }
      livadaLog("METEO", "cron-check", "STALE", lastDate);
    } else {
      localStorage.setItem("livada:cron:last-run-ts", String(lastTs));
      livadaLog("METEO", "cron-check", "OK", lastDate);
    }
  } catch (e) {
    livadaLog("ERR", "checkCronMeteoStatus", "FAIL", e.message);
  }
}

async function fetchMeteo() {
  var el = document.getElementById("meteoData");
  el.innerHTML =
    '<p style="text-align:center;color:var(--text-dim);">Se \u00eencarc\u0103...</p>';
  try {
    var d = await fetchMeteoData(true);
    var c = d.current;
    var code = c.weather_code;
    var desc = WMO_CODES[code] || "Necunoscut";
    var emoji = wmoEmoji(code);
    var alertHtml =
      c.temperature_2m <= 0
        ? '<div class="alert alert-danger meteo-alert"><strong>\u26A0\uFE0F Temperaturi negative!</strong> Verific\u0103 protec\u021bia pomilor sensibili.</div>'
        : c.temperature_2m >= 30
          ? '<div class="alert alert-warning meteo-alert"><strong>\u2600\uFE0F C\u0103ldur\u0103 excesiv\u0103!</strong> Verific\u0103 irigarea.</div>'
          : "";

    el.innerHTML =
      '<div class="meteo-card">' +
      '<div style="font-size:60px;line-height:1;">' +
      emoji +
      "</div>" +
      '<div class="meteo-temp">' +
      Math.round(c.temperature_2m) +
      "\u00B0C</div>" +
      '<div class="meteo-desc">' +
      escapeHtml(desc) +
      "</div>" +
      '<div class="meteo-details">' +
      "<span>\uD83C\uDF21\uFE0F Sim\u021bit: " +
      Math.round(c.apparent_temperature) +
      "\u00B0C</span>" +
      "<span>\uD83D\uDCA7 Umiditate: " +
      c.relative_humidity_2m +
      "%</span>" +
      "<span>\uD83C\uDF2C\uFE0F V\u00E2nt: " +
      Math.round(c.wind_speed_10m) +
      " km/h</span>" +
      (c.precipitation > 0
        ? "<span>\uD83C\uDF27\uFE0F Precipita\u021Bii: " +
          c.precipitation +
          " mm</span>"
        : "") +
      "</div></div>" +
      alertHtml +
      '<p style="margin-top:12px;font-size:0.78rem;color:var(--text-dim);text-align:center;">N\u0103dlac, Arad \u2022 Actualizat: ' +
      new Date().toLocaleTimeString("ro-RO") +
      "</p>" +
      '<button class="btn btn-secondary" style="width:100%;margin-top:12px;" onclick="_meteoCacheTs=0;fetchMeteo()">Re\u00eencarc\u0103 meteo</button>';
    // B1: Prognoza 5 zile
    if (d.daily && d.daily.time) {
      var ZILE = ["Du", "Lu", "Ma", "Mi", "Jo", "Vi", "S\u00E2"];
      var fc = "";
      for (var i = 0; i < d.daily.time.length; i++) {
        var dt = new Date(d.daily.time[i] + "T12:00");
        var zi = ZILE[dt.getDay()];
        var tMax = Math.round(d.daily.temperature_2m_max[i]);
        var tMin = Math.round(d.daily.temperature_2m_min[i]);
        var prec = d.daily.precipitation_sum[i];
        var wc = d.daily.weather_code[i];
        var frost = tMin < 0 ? "border:2px solid var(--info);" : "";
        fc +=
          '<div class="mf-day" style="' +
          frost +
          '">' +
          '<div style="font-size:0.75rem;color:var(--text-dim);">' +
          zi +
          "</div>" +
          '<div style="font-size:1.4rem;">' +
          wmoEmoji(wc) +
          "</div>" +
          '<div style="font-size:0.85rem;font-weight:600;">' +
          tMax +
          "\u00B0</div>" +
          '<div style="font-size:0.75rem;color:var(--text-dim);">' +
          tMin +
          "\u00B0</div>" +
          (prec > 0
            ? '<div style="font-size:0.65rem;color:var(--info);">' +
              prec +
              "mm</div>"
            : "") +
          "</div>";
      }
      el.innerHTML +=
        '<div style="margin-top:16px;"><h4 style="color:var(--accent);margin-bottom:8px;">Prognoza 5 zile</h4><div class="meteo-forecast">' +
        fc +
        "</div></div>";
    }
  } catch (err) {
    el.innerHTML =
      '<div class="alert alert-danger"><strong>Eroare meteo:</strong> ' +
      escapeHtml(err.message) +
      "</div>" +
      '<button class="btn btn-secondary" style="width:100%;margin-top:12px;" onclick="fetchMeteo()">Re\u00eencarc\u0103</button>';
  }
}

// ====== EXPORT PDF ======
function exportPDF() {
  document.body.classList.add("print-all");
  window.print();
  document.body.classList.remove("print-all");
}

// ====== PWA ======
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("#installBanner").classList.add("show");
});
$("#installBtn").addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("#installBanner").classList.remove("show");
  }
});
$("#dismissBtn").addEventListener("click", () => {
  $("#installBanner").classList.remove("show");
});

// ====== VERSIUNE + SERVICE WORKER ======
// DEPLOY_DATE + DEPLOY_TIME: actualizat la fiecare push (hardcodat = fiabil pe orice CDN)
const DEPLOY_DATE = "2026-04-11";
const DEPLOY_TIME = "02:17";
const DEPLOY_INFO =
  "chore: bump deploy date to 2026-04-11 + sw cache invalidation";

const APP_BUILD = DEPLOY_DATE;

(function () {
  var el = document.getElementById("appVersionBadge");
  if (el) {
    el.textContent = "actualizat " + DEPLOY_DATE + " " + DEPLOY_TIME;
    el.title =
      "Ultima actualizare: " +
      DEPLOY_DATE +
      " " +
      DEPLOY_TIME +
      " — " +
      DEPLOY_INFO;
  }
})();

function showAppInfo() {
  alert(
    "\uD83C\uDF3F Livada Mea Dashboard\n" +
      "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
      "Ultima actualizare: " +
      DEPLOY_DATE +
      " " +
      DEPLOY_TIME +
      "\n" +
      "Ce s-a adaugat: " +
      DEPLOY_INFO +
      "\n\n" +
      "Deploy: Vercel (livada-mea-psi.vercel.app)\n" +
      "AI: Groq llama-4-scout + Gemini 2.5-flash\n" +
      "Meteo: Open-Meteo + Yr.no (comparare)\n" +
      "Documentatie: 20 specii \xd7 25 sectiuni (A-Y)",
  );
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", {
      updateViaCache: "none", // browserul NU foloseste HTTP cache pt sw.js — verifica intotdeauna
    })
    .then(function (reg) {
      reg.update().catch(function () {});
    })
    .catch(function () {});

  // Notificare versiune noua (trimisa de SW la activate) — F5.2
  navigator.serviceWorker.addEventListener("message", function (event) {
    if (event.data && event.data.type === "SW_UPDATED") {
      livadaLog("SW", "update", "AVAILABLE", event.data.version || "noua");
      var toastEl = document.createElement("div");
      toastEl.style.cssText =
        "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;padding:10px 18px;border-radius:10px;font-size:0.85rem;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.25);display:flex;align-items:center;gap:12px;max-width:340px;";
      toastEl.innerHTML =
        '<span>&#128260; Versiune nou&#259; disponibil&#259;</span><button onclick="location.reload()" style="background:#fff;color:var(--accent);border:none;border-radius:6px;padding:3px 12px;font-size:0.8rem;cursor:pointer;font-weight:600;">Reîncarc&#259;</button>';
      document.body.appendChild(toastEl);
      setTimeout(function () {
        if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      }, 12000);
    }
  });
}

// ====== F1.2 — DEBUG PANEL ======
(function () {
  var _badgeTaps = 0,
    _badgeTapTimer;
  var badge = document.getElementById("appVersionBadge");
  if (badge) {
    badge.addEventListener("click", function () {
      _badgeTaps++;
      clearTimeout(_badgeTapTimer);
      _badgeTapTimer = setTimeout(function () {
        _badgeTaps = 0;
      }, 600);
      if (_badgeTaps >= 3) {
        _badgeTaps = 0;
        openDebugPanel();
      }
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === "L") openDebugPanel();
  });
})();

function openDebugPanel() {
  var panel = document.getElementById("debugPanel");
  if (!panel) return;
  var log = getLivadaLog();
  var last50 = log.slice(-50).reverse();

  // Verifica ultima rulare cron
  var cronWarn = "";
  try {
    var cronData = null;
    fetch("/api/ping")
      .then(function () {})
      .catch(function () {});
    var storedCron = localStorage.getItem("livada:cron:last-run-ts");
    if (storedCron) {
      var cronTs = parseInt(storedCron);
      if (Date.now() - cronTs > 26 * 3600 * 1000) {
        cronWarn =
          '<div style="color:#f59e0b;margin-bottom:8px;">\u26A0 Date meteo posibil dep\u0103\u0219it\u0103 (ultima rulare cron > 26h)</div>';
      }
    }
  } catch (e) {}

  document.getElementById("debugLogContent").innerHTML =
    cronWarn +
    (last50.length
      ? last50
          .map(function (e) {
            return (
              '<div style="border-bottom:1px solid var(--border);padding:3px 0;font-size:0.72rem;word-break:break-all;">' +
              escapeHtml(e) +
              "</div>"
            );
          })
          .join("")
      : '<div style="color:var(--text-dim);text-align:center;">Log gol</div>');
  panel.style.display = "flex";
}

function closeDebugPanel() {
  var panel = document.getElementById("debugPanel");
  if (panel) panel.style.display = "none";
}

function copyDebugLog() {
  var log = getLivadaLog();
  var text = log.join("\n");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(function () {
        showToast("\u2705 Log copiat!");
      })
      .catch(function () {
        showToast("Eroare copiere log");
      });
  } else {
    showToast("Clipboard indisponibil");
  }
}

// Auto-refresh dashboard dupa revenire din background (I1)
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") {
    var last = parseInt(
      localStorage.getItem("livada-last-dashboard-refresh") || "0",
    );
    var now = Date.now();
    if (now - last > 30 * 60 * 1000) {
      // 30 minute
      var activeTab = document.querySelector(".tab-content.active");
      if (activeTab && activeTab.id === "azi") {
        initDashboardAzi();
        localStorage.setItem("livada-last-dashboard-refresh", String(now));
      }
    }
  }
});

// iOS PWA Install Instructions (IMP-6)
(function () {
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var isStandalone = window.navigator.standalone === true;
  if (isIOS && !isStandalone) {
    var banner = document.getElementById("installBanner");
    if (banner) {
      banner.querySelector("p").innerHTML =
        "\uD83D\uDCF1 Instaleaz\u0103 <strong>Livada Mea</strong>: apas\u0103 <strong>Partajeaz\u0103</strong> (\u2191) \u2192 <strong>Ad\u0103ugare pe ecranul principal</strong>";
      var installBtn = document.getElementById("installBtn");
      if (installBtn) installBtn.style.display = "none";
      banner.classList.add("show");
    }
  }
})();

// ====== F1.1 — LIVADA LOG ENGINE ======
var LIVADA_LOG_KEY = "livada:log";
var LIVADA_LOG_MAX = 100;

function livadaLog(module, action, status, detail, ms) {
  var ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  var entry =
    "[" +
    ts +
    "] [" +
    module +
    "] " +
    action +
    (status ? " \u2192 " + status : "") +
    (detail ? " \u2192 " + detail : "") +
    (ms !== undefined ? " \u2192 " + ms + "ms" : "");
  try {
    var log = JSON.parse(localStorage.getItem(LIVADA_LOG_KEY) || "[]");
    log.push(entry);
    if (log.length > LIVADA_LOG_MAX) log = log.slice(-LIVADA_LOG_MAX);
    localStorage.setItem(LIVADA_LOG_KEY, JSON.stringify(log));
  } catch (e) {}
}

function getLivadaLog() {
  try {
    return JSON.parse(localStorage.getItem(LIVADA_LOG_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function clearLivadaLog() {
  try {
    localStorage.removeItem(LIVADA_LOG_KEY);
  } catch (e) {}
}

// ====== FETCH WITH TIMEOUT ======
async function fetchWithTimeout(url, opts, ms) {
  ms = ms || 10000;
  var ctrl = new AbortController();
  var timer = setTimeout(function () {
    ctrl.abort();
  }, ms);
  try {
    opts = opts || {};
    opts.signal = ctrl.signal;
    return await fetch(url, opts);
  } finally {
    clearTimeout(timer);
  }
}

// ====== AUTH TOKEN ======
// M1: sessionStorage in loc de localStorage — token nu persista intre sesiuni (XSS mitigation)
// Migrare automata: daca tokenul e in localStorage (sesiuni vechi), il muta in sessionStorage
function getLivadaToken() {
  return (
    sessionStorage.getItem("livada-api-token") ||
    localStorage.getItem("livada-api-token") ||
    ""
  );
}
function setLivadaToken(t) {
  sessionStorage.setItem("livada-api-token", t);
  localStorage.removeItem("livada-api-token");
}
function authHeaders(extra) {
  var h = { "x-livada-token": getLivadaToken() };
  if (extra) for (var k in extra) h[k] = extra[k];
  return h;
}
// ====== AI STATUS PANEL ======
// F2.1 — AI_PANEL_CONFIG extins cu frost
var AI_PANEL_CONFIG = {
  ask: [
    { name: "Groq llama-4-scout", key: "groq", role: "primar" },
    { name: "Groq llama-3.3-70b", key: "groq", role: "rezerva" },
    { name: "Cerebras llama-3.3-70b", key: "cerebras", role: "rezerva" },
  ],
  diagnose: [
    { name: "Gemini 2.5-flash", key: "gemini", role: "primar" },
    { name: "GPT-4.1", key: "github_models", role: "paralel" },
    { name: "Plant.id v3", key: "plant_id", role: "bonus" },
  ],
  identify: [
    { name: "PlantNet", key: "plantnet", role: "primar" },
    { name: "Gemini 2.5-flash", key: "gemini", role: "paralel" },
    { name: "GPT-4.1", key: "github_models", role: "paralel" },
  ],
  report: [
    { name: "Groq llama-4-scout", key: "groq", role: "primar" },
    { name: "Groq llama-3.3-70b", key: "groq", role: "rezerva" },
    { name: "Cerebras llama-3.3-70b", key: "cerebras", role: "rezerva" },
  ],
  frost: [
    { name: "Open-Meteo", key: "meteo", role: "sursa" },
    { name: "Yr.no", key: "meteo", role: "comparare" },
  ],
};

// F1.3 — Wrapper logging AI calls
async function aiCallWithLog(label, fn) {
  var t0 = Date.now();
  try {
    var result = await fn();
    var ms = Date.now() - t0;
    var model =
      result && result._fallbackModel
        ? result._fallbackModel
        : result && result._model
          ? result._model
          : "primar";
    var status = result && result._fallback ? "FALLBACK:" + model : "OK";
    livadaLog("AI", label, status, model, ms);
    return result;
  } catch (e) {
    livadaLog("AI", label, "ERR", e.message, Date.now() - t0);
    throw e;
  }
}

// F2.2 — Indicator model post-raspuns
function renderModelIndicator(containerId, modelName, isFallback, ms) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var old = el.querySelector(".model-indicator");
  if (old) old.remove();
  var icon = isFallback ? "\u21A9" : "\u2713";
  var label = isFallback ? modelName + " [fallback]" : modelName;
  var msStr = ms !== undefined ? " \u2022 " + (ms / 1000).toFixed(1) + "s" : "";
  var div = document.createElement("div");
  div.className = "model-indicator";
  div.style.cssText =
    "font-size:0.72rem;color:var(--text-dim);border-top:1px solid var(--border);" +
    "margin-top:10px;padding-top:6px;display:flex;align-items:center;gap:4px;";
  div.innerHTML =
    '<span style="font-weight:600;color:' +
    (isFallback ? "#f59e0b" : "#22c55e") +
    ';">' +
    icon +
    "</span> " +
    escapeHtml(label) +
    msStr;
  el.appendChild(div);
}

var _aiStatus = null,
  _aiStatusTs = 0;

function loadAiStatus() {
  if (_aiStatus && Date.now() - _aiStatusTs < 600000)
    return Promise.resolve(_aiStatus);
  return fetch("/api/ai-status")
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (data && data.status) {
        _aiStatus = data.status;
        _aiStatusTs = Date.now();
      }
      return _aiStatus || {};
    })
    .catch(function (e) {
      console.warn("[ai-status]", e.message);
      return {};
    });
}

function renderAiStatusPanel(tabName, anchorId, position) {
  // position: "beforebegin" | "afterbegin" | "beforeend" | "afterend" (default: "beforebegin")
  var anchor = document.getElementById(anchorId);
  if (!anchor) return;
  // Sterge panelul existent daca exista
  var existing = document.getElementById("ai-panel-" + tabName);
  if (existing) existing.remove();

  loadAiStatus().then(function (status) {
    var config = AI_PANEL_CONFIG[tabName] || [];
    if (!config.length) return;
    var html =
      '<div id="ai-panel-' +
      tabName +
      '" style="' +
      "display:flex;flex-wrap:wrap;gap:5px;align-items:center;" +
      "margin:0 0 10px;padding:6px 10px;background:var(--bg-surface);" +
      'border-radius:8px;border:1px solid var(--border);font-size:0.72rem;">' +
      '<span style="color:var(--text-dim);font-weight:600;margin-right:2px;flex-shrink:0;">AI:</span>';
    config.forEach(function (ai) {
      var active = status[ai.key] !== false;
      html +=
        '<span style="display:flex;align-items:center;gap:3px;opacity:' +
        (active ? "1" : "0.5") +
        ";" +
        'background:var(--bg);padding:2px 7px;border-radius:12px;border:1px solid var(--border);">' +
        '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;' +
        "background:" +
        (active ? "#22c55e" : "#ef4444") +
        ';" title="' +
        (active ? "Activ" : "Cheie lipsa") +
        '"></span>' +
        escapeHtml(ai.name) +
        '<span style="color:var(--text-dim);margin-left:2px;font-size:0.68rem;">[' +
        ai.role +
        "]</span>" +
        "</span>";
    });
    // Buton refresh status AI (sugestia 3)
    html +=
      "<button onclick=\"refreshAiStatus('" +
      tabName +
      "','" +
      anchorId +
      "','" +
      (position || "beforebegin") +
      "')\" " +
      'title="Reincarca status AI" style="background:none;border:none;cursor:pointer;color:var(--text-dim);' +
      'font-size:0.8rem;padding:0 4px;margin-left:auto;flex-shrink:0;">&#8635;</button>';
    html += "</div>";
    anchor.insertAdjacentHTML(position || "beforebegin", html);
  });
}

function refreshAiStatus(tabName, anchorId, position) {
  _aiStatus = null;
  _aiStatusTs = 0;
  renderAiStatusPanel(tabName, anchorId, position);
}

async function authFetch(url, opts, ms) {
  ms = ms || 15000;
  opts = opts || {};
  var delays = [0, 2000, 5000];
  for (var i = 0; i < delays.length; i++) {
    if (i > 0)
      await new Promise(function (r) {
        setTimeout(r, delays[i]);
      });
    try {
      var res = await fetchWithTimeout(
        url,
        Object.assign({}, opts, {
          headers: authHeaders(opts.headers || {}),
        }),
        ms,
      );
      if (
        (res.status === 429 || res.status === 503 || res.status === 504) &&
        i < delays.length - 1
      )
        continue;
      return res;
    } catch (e) {
      if (i === delays.length - 1) throw e;
    }
  }
}

// ====== HTML ESCAPE + SANITIZE AI (anti-XSS) ======
function escapeHtml(s) {
  var d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function sanitizeAI(text) {
  var md = text
    .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^[\-\*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
    .replace(/\n/g, "<br>");
  md = md.replace(/<br>(<h[34]>)/g, "$1").replace(/(<\/h[34]>)<br>/g, "$1");
  md = md.replace(/<br>(<ul>)/g, "$1").replace(/(<\/ul>)<br>/g, "$1");
  if (typeof DOMPurify !== "undefined") {
    return DOMPurify.sanitize(md, {
      ALLOWED_TAGS: ["strong", "em", "br", "p", "ul", "ol", "li", "h3", "h4"],
      ALLOWED_ATTR: [],
    });
  }
  // H6: DOMPurify indisponibil — arata eroare vizibila in loc de raspuns gol
  console.error("[SECURITATE] DOMPurify indisponibil — raspuns AI blocat");
  return '<p style="color:var(--error,red)">Eroare: biblioteca securitate indisponibila. Reincarca pagina.</p>';
}

// ====== SPECIES MAP ======
const SPECIES = {
  cires: "Cire\u0219",
  visin: "Vi\u0219in",
  cais: "Cais",
  piersic: "Piersic",
  prun: "Prun",
  migdal: "Migdal",
  "par-clapp": "P\u0103r Clapp",
  "par-williams": "P\u0103r Williams",
  "par-hosui": "P\u0103r Hosui",
  "par-napoca": "P\u0103r Napoca",
  "mar-florina": "M\u0103r Florina",
  "mar-golden": "M\u0103r Golden Spur",
  zmeur: "Zmeur",
  "zmeur-galben": "Zmeur Galben",
  mur: "Mur",
  "mur-copac": "Mur Copac",
  afin: "Afin",
  alun: "Alun Tuf\u0103",
  rodiu: "Rodiu",
  kaki: "Kaki Rojo Brillante",
};
let activeSpeciesId = "plan-livada";

// ====== INJECT SPECIES TOOLS ======
function injectSpeciesTools(tabId) {
  const prev = document.getElementById("sp-tools-section");
  if (prev) prev.remove();
  activeSpeciesId = tabId;

  if (tabId === "plan-livada") {
    injectReportButton();
    renderRecoltaSummary();
    injectStatsSection();
    injectStocSection();
    return;
  }
  if (!SPECIES[tabId]) return;

  const tc = document.getElementById(tabId);
  if (!tc) return;
  const div = document.createElement("div");
  div.id = "sp-tools-section";
  div.innerHTML =
    '<div class="sp-tools">' +
    '<button class="sp-tool-btn" data-needs-online="true" onclick="openDiagnoseModal()"><span class="sti">\uD83D\uDCF8</span> Diagnostic AI</button>' +
    '<button class="sp-tool-btn" data-needs-online="true" onclick="openAskModal()"><span class="sti">\uD83D\uDCAC</span> \u00CEntreab\u0103 AI</button>' +
    '<button class="sp-tool-btn" onclick="openGalleryModal()"><span class="sti">\uD83D\uDDBC\uFE0F</span> Galerie foto</button>' +
    '<button class="sp-tool-btn" onclick="openChecklist()"><span class="sti">\u2705</span> Checklist stropire</button>' +
    '<button class="sp-tool-btn" onclick="printFisa()"><span class="sti">\uD83D\uDDA8\uFE0F</span> Print fi\u0219a</button>' +
    '<button class="sp-tool-btn" onclick="printSpeciesReport(activeSpeciesId)"><span class="sti">\uD83D\uDDC3\uFE0F</span> Raport cultur\u0103</button>' +
    '<button class="sp-tool-btn" onclick="openWeeklyPlanner()"><span class="sti">\uD83D\uDCC5</span> Planner 7 zile</button>' +
    '<button class="sp-tool-btn" onclick="openInspectionChecklist()"><span class="sti">\uD83D\uDD0D</span> Tur\u0103 inspec\u021Bie</button>' +
    '<button class="sp-tool-btn" onclick="openTreePanel(activeSpeciesId)"><span class="sti">\uD83C\uDF33</span> Pomi</button>' +
    "</div>";
  tc.insertBefore(div, tc.firstChild);
  // N15: Tree notes panel (hidden by default, toggle via button)
  if (!document.getElementById("treePanel-" + tabId)) {
    var tpDiv = document.createElement("div");
    tpDiv.id = "treePanel-" + tabId;
    tpDiv.style.display = "none";
    tpDiv.style.cssText =
      "padding:10px 12px;margin:6px 0;background:var(--bg-card);border-radius:10px;border:1px solid var(--border);";
    tc.insertBefore(tpDiv, tc.children[1] || null);
  }
  injectSeasonalTip(tabId, tc);
  // II-8: inject species journal history
  injectSpeciesHistory(tabId, tc);
  // N5: timeline cronologic per specie
  renderSpeciesTimeline(tabId, tc);
}

// ====== N5: TIMELINE SPECIE ======
function renderSpeciesTimeline(speciesId, container) {
  var prev = document.getElementById("sp-timeline");
  if (prev) prev.remove();
  var spName = (SPECIES[speciesId] || "").toLowerCase();
  if (!spName) return;

  var journalItems = getJurnalEntries()
    .filter(function (e) {
      return (
        (e.note || "").toLowerCase().includes(spName) || e.species === speciesId
      );
    })
    .map(function (e) {
      var icon =
        e.type === "tratament" || e.type === "fitosanitar"
          ? "💊"
          : e.type === "recolta"
            ? "🍎"
            : e.type === "tundere"
              ? "✂️"
              : e.type === "fertilizare"
                ? "🌿"
                : "📋";
      return {
        date: e.date,
        type: "jurnal",
        icon: icon,
        label: e.type || "interventie",
        desc: e.note,
        cost: e.cost,
      };
    });

  var allItems = journalItems.sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });
  if (allItems.length === 0) return;

  var div = document.createElement("div");
  div.id = "sp-timeline";
  div.className = "section";
  div.style.marginTop = "12px";
  div.innerHTML =
    '<h2 class="section-title" style="cursor:default;">🕐 Timeline ' +
    escapeHtml(SPECIES[speciesId] || speciesId) +
    "</h2>" +
    '<div class="section-body">' +
    allItems
      .map(function (item) {
        return (
          '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">' +
          '<div style="font-size:1.2rem;flex-shrink:0;">' +
          item.icon +
          "</div>" +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:0.72rem;color:var(--text-dim);">' +
          escapeHtml(item.date) +
          " · " +
          escapeHtml(item.label) +
          (item.cost ? " · " + item.cost + " RON" : "") +
          "</div>" +
          '<div style="font-size:0.82rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          escapeHtml((item.desc || "").substring(0, 100)) +
          "</div>" +
          "</div></div>"
        );
      })
      .join("") +
    "</div>";
  container.appendChild(div);
}

function injectReportButton() {
  if (document.getElementById("report-section")) return;
  const tc = document.getElementById("plan-livada");
  if (!tc) return;
  const div = document.createElement("div");
  div.id = "report-section";
  div.className = "section";
  div.style.marginTop = "16px";
  div.innerHTML =
    '<h2 class="section-title" style="cursor:default;">\uD83D\uDCCA Raport Anual AI</h2>' +
    '<div class="section-body">' +
    '<div id="ai-panel-report-anchor"></div>' +
    "<p>Genereaz\u0103 un raport anual bazat pe jurnalul de interven\u021Bii \u0219i datele meteo.</p>" +
    '<button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="generateReport()" id="reportBtn">Genereaz\u0103 Raport ' +
    new Date().getFullYear() +
    "</button>" +
    '<div id="reportLoading" class="ai-load" style="display:none;"><div class="ai-spin"></div><br>Se genereaz\u0103 raportul...</div>' +
    '<div id="reportResult" class="report-box" style="display:none;"></div>' +
    "</div>";
  tc.appendChild(div);
  renderAiStatusPanel("report", "ai-panel-report-anchor", "afterend");
}

// ====== II-2: STATISTICI INTERVENTII ======
function renderStats(selectedYear) {
  var entries = getJurnalEntries();
  var currentYear = new Date().getFullYear();
  if (!selectedYear)
    selectedYear = parseInt(
      localStorage.getItem("livada-stats-year") || currentYear,
    );
  localStorage.setItem("livada-stats-year", selectedYear);
  var years = [currentYear, currentYear - 1, currentYear - 2];
  var yearBtns = years
    .map(function (y) {
      var isActive = y === selectedYear;
      return (
        "<button onclick=\"var s=document.getElementById('stats-section');if(s)s.querySelector('.section-body').innerHTML=renderStats(" +
        y +
        ');" style="' +
        (isActive
          ? "background:var(--accent);color:#fff;"
          : "background:var(--bg-surface);color:var(--text-dim);") +
        'border:1px solid var(--border);border-radius:12px;padding:2px 10px;font-size:0.72rem;cursor:pointer;">' +
        y +
        "</button>"
      );
    })
    .join("");
  var yearSelectorHtml =
    '<div style="display:flex;gap:6px;justify-content:center;margin-bottom:12px;">' +
    yearBtns +
    "</div>";
  var yearEntries = entries.filter(function (e) {
    return e.date && e.date.startsWith(String(selectedYear));
  });
  if (yearEntries.length === 0)
    return (
      yearSelectorHtml +
      '<p style="color:var(--text-dim);text-align:center;padding:12px;">Nicio interventie \u00EEnregistrat\u0103 \u00EEn ' +
      selectedYear +
      ".</p>"
    );
  var byType = {};
  yearEntries.forEach(function (e) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  });
  var maxType = Math.max.apply(null, Object.values(byType).concat([1]));
  var typeHTML = Object.entries(byType)
    .sort(function (a, b) {
      return b[1] - a[1];
    })
    .map(function (p) {
      var pct = Math.round((p[1] / maxType) * 100);
      return (
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">' +
        '<span style="min-width:90px;font-size:0.78rem;color:var(--text-dim);">' +
        p[0] +
        "</span>" +
        '<div style="flex:1;height:16px;background:var(--bg-surface);border-radius:4px;overflow:hidden;">' +
        '<div style="width:' +
        pct +
        '%;height:100%;background:var(--accent);border-radius:4px;transition:width 0.4s;"></div></div>' +
        '<span style="font-size:0.78rem;font-weight:700;min-width:22px;text-align:right;">' +
        p[1] +
        "</span></div>"
      );
    })
    .join("");
  var byMonth = {};
  yearEntries.forEach(function (e) {
    var m = parseInt((e.date || "").split("-")[1]);
    if (m) byMonth[m] = (byMonth[m] || 0) + 1;
  });
  var recoltaKg = yearEntries
    .filter(function (e) {
      return e.type === "recoltare" && e.kg > 0;
    })
    .reduce(function (sum, e) {
      return sum + (e.kg || 0);
    }, 0);
  var monthNames = [
    "",
    "Ian",
    "Feb",
    "Mar",
    "Apr",
    "Mai",
    "Iun",
    "Iul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  var maxMonth = Math.max.apply(null, Object.values(byMonth).concat([1]));
  var monthHTML = "";
  for (var m = 1; m <= 12; m++) {
    var count = byMonth[m] || 0;
    var pct = Math.round((count / maxMonth) * 100);
    monthHTML +=
      '<div style="text-align:center;">' +
      '<div style="height:48px;display:flex;align-items:flex-end;justify-content:center;">' +
      '<div style="width:18px;height:' +
      pct +
      "%;background:var(--accent);border-radius:3px 3px 0 0;min-height:" +
      (count > 0 ? "3" : "0") +
      'px;"></div></div>' +
      '<div style="font-size:0.58rem;color:var(--text-dim);margin-top:2px;">' +
      monthNames[m] +
      "</div>" +
      (count > 0
        ? '<div style="font-size:0.6rem;font-weight:700;">' + count + "</div>"
        : "") +
      "</div>";
  }
  var kgLine =
    recoltaKg > 0
      ? " \u2022 Recolt\u0103: <strong>" + recoltaKg.toFixed(1) + " kg</strong>"
      : "";
  // V1: Per-species kg breakdown
  var bySpecies = {};
  yearEntries
    .filter(function (e) {
      return e.type === "recoltare" && e.kg > 0 && e.species;
    })
    .forEach(function (e) {
      bySpecies[e.species] = (bySpecies[e.species] || 0) + (e.kg || 0);
    });
  var speciesKgHtml = "";
  if (Object.keys(bySpecies).length > 0) {
    var maxKg = Math.max.apply(null, Object.values(bySpecies).concat([1]));
    speciesKgHtml =
      '<h3 style="margin:14px 0 8px;font-size:0.9rem;">\uD83C\uDF4E Recolt\u0103 per specie</h3>' +
      Object.entries(bySpecies)
        .sort(function (a, b) {
          return b[1] - a[1];
        })
        .map(function (p) {
          var pct = Math.round((p[1] / maxKg) * 100);
          var name = (typeof SPECIES !== "undefined" && SPECIES[p[0]]) || p[0];
          return (
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">' +
            '<span style="min-width:90px;font-size:0.78rem;color:var(--text-dim);">' +
            escapeHtml(name) +
            "</span>" +
            '<div style="flex:1;height:16px;background:var(--bg-surface);border-radius:4px;overflow:hidden;">' +
            '<div style="width:' +
            pct +
            '%;height:100%;background:#e67e22;border-radius:4px;transition:width 0.4s;"></div></div>' +
            '<span style="font-size:0.78rem;font-weight:700;min-width:40px;text-align:right;">' +
            p[1].toFixed(1) +
            "kg</span></div>"
          );
        })
        .join("");
  }
  // N4: Sumar cheltuieli per tip interventie
  var totalCost = yearEntries.reduce(function (s, e) {
    return s + (e.cost || 0);
  }, 0);
  var costByType = {};
  yearEntries
    .filter(function (e) {
      return e.cost > 0;
    })
    .forEach(function (e) {
      costByType[e.type] = (costByType[e.type] || 0) + e.cost;
    });
  var costHtml =
    totalCost > 0
      ? '<h3 style="margin:14px 0 8px;font-size:0.9rem;">💰 Cheltuieli (' +
        selectedYear +
        ")</h3>" +
        Object.entries(costByType)
          .sort(function (a, b) {
            return b[1] - a[1];
          })
          .map(function (p) {
            return (
              '<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:3px 0;border-bottom:1px solid var(--border);">' +
              "<span>" +
              escapeHtml(p[0]) +
              '</span><span style="color:var(--accent);font-weight:700;">' +
              p[1].toFixed(2) +
              " RON</span></div>"
            );
          })
          .join("") +
        '<div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:700;margin-top:6px;padding-top:6px;border-top:2px solid var(--border);">' +
        '<span>TOTAL</span><span style="color:var(--accent);">' +
        totalCost.toFixed(2) +
        " RON</span></div>"
      : "";
  return (
    yearSelectorHtml +
    '<h3 style="margin-bottom:8px;font-size:0.9rem;">Per tip (' +
    selectedYear +
    ")</h3>" +
    typeHTML +
    '<h3 style="margin:14px 0 8px;font-size:0.9rem;">Per lun\u0103</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:2px;">' +
    monthHTML +
    "</div>" +
    speciesKgHtml +
    '<p style="font-size:0.72rem;color:var(--text-dim);margin-top:8px;">Total: <strong>' +
    yearEntries.length +
    "</strong> interven\u021Bii" +
    kgLine +
    "</p>" +
    costHtml
  );
}
function injectStatsSection() {
  if (document.getElementById("stats-section")) {
    document
      .getElementById("stats-section")
      .querySelector(".section-body").innerHTML = renderStats();
    return;
  }
  var tc = document.getElementById("plan-livada");
  if (!tc) return;
  var div = document.createElement("div");
  div.id = "stats-section";
  div.className = "section";
  div.style.marginTop = "16px";
  div.innerHTML =
    '<h2 class="section-title" style="cursor:default;">\uD83D\uDCCA Statistici Interven\u021Bii</h2>' +
    '<div class="section-body">' +
    renderStats() +
    "</div>";
  tc.appendChild(div);
}

// ====== II-8: SPECIES JOURNAL HISTORY ======
function injectSpeciesHistory(speciesId, container) {
  var prev = document.getElementById("sp-history-section");
  if (prev) prev.remove();
  var name = (SPECIES[speciesId] || "").toLowerCase();
  if (!name) return;
  var history = getJurnalEntries()
    .filter(function (e) {
      return (
        (e.note || "").toLowerCase().includes(name) ||
        (e.species && e.species === speciesId)
      );
    })
    .slice(0, 8);
  if (history.length === 0) return;
  // V2: interval de la ultimul tratament fitosanitar
  var treatments = history.filter(function (e) {
    return e.type === "fitosanitar" || e.type === "tratament";
  });
  var intervalHtml = "";
  if (treatments.length > 0) {
    var lastT = treatments[0]; // sorted desc
    var daysSince = Math.floor(
      (Date.now() - new Date(lastT.date + "T12:00")) / 86400000,
    );
    var iCls =
      daysSince < 7
        ? "diag-interval-danger"
        : daysSince < 11
          ? "diag-interval-warn"
          : "diag-interval-ok";
    var iMsg =
      daysSince < 7
        ? "\u26A0\uFE0F Atentie: " +
          daysSince +
          " zile de la ultimul tratament (interval minim 7 zile)"
        : "\u2705 Ultimul tratament: acum " + daysSince + " zile";
    intervalHtml =
      '<div class="diag-interval-badge ' + iCls + '">' + iMsg + "</div>";
  }
  var div = document.createElement("div");
  div.id = "sp-history-section";
  div.className = "section";
  div.style.marginTop = "12px";
  var spName = SPECIES[speciesId] || speciesId;
  div.innerHTML =
    '<h2 class="section-title" style="cursor:default;">\uD83D\uDCCB Ultimele interven\u021Bii</h2>' +
    '<div class="section-body">' +
    intervalHtml +
    history
      .map(function (e) {
        return (
          '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">' +
          '<span style="color:var(--accent);font-weight:700;">' +
          escapeHtml(e.date || "") +
          "</span> " +
          '<span style="color:var(--text-dim);">[' +
          escapeHtml(e.type || "") +
          "]</span> " +
          escapeHtml(e.note || "") +
          "</div>"
        );
      })
      .join("") +
    '<div style="margin-top:10px;text-align:center;"><button class="btn btn-primary" style="font-size:0.8rem;padding:6px 18px;" onclick="openModal(\'jurnal\')">+ Adaug\u0103 interven\u021Bie</button></div>' +
    "</div>";
  container.appendChild(div);
}

// ====== GALLERY FUNCTIONS ======
function openGalleryModal() {
  document.getElementById("galSpecies").textContent =
    SPECIES[activeSpeciesId] || activeSpeciesId;
  openModal("gallery");
  loadGallery();
}
async function loadGallery() {
  const grid = document.getElementById("galGrid");
  const empty = document.getElementById("galEmpty");
  const loading = document.getElementById("galLoading");
  grid.innerHTML = "";
  empty.style.display = "none";
  loading.style.display = "block";
  try {
    const res = await authFetch("/api/photos?species=" + activeSpeciesId);
    if (!res.ok) throw new Error("Eroare server (" + res.status + ")");
    const photos = await res.json();
    loading.style.display = "none";
    if (Array.isArray(photos) && photos.length > 0) {
      // V6: Sortare cronologica (newest first)
      photos.sort(function (a, b) {
        return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
      });
      grid.innerHTML = photos
        .map(function (p) {
          var dateStr = p.uploadedAt
            ? new Date(p.uploadedAt).toLocaleDateString("ro-RO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "";
          var dateBadge = dateStr
            ? '<span style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.55);color:#fff;font-size:0.6rem;padding:2px 4px;text-align:center;border-radius:0 0 6px 6px;">' +
              dateStr +
              "</span>"
            : "";
          return (
            '<div class="gal-item" style="position:relative;"><img src="' +
            escapeHtml(p.url) +
            '" alt="Foto livada" loading="lazy">' +
            dateBadge +
            '<button class="gal-del" data-url="' +
            escapeHtml(p.url) +
            '">&#10005;</button></div>'
          );
        })
        .join("");
      grid.onclick = function (e) {
        var btn = e.target.closest(".gal-del");
        if (btn) {
          deletePhoto(btn.dataset.url);
          return;
        }
        var img = e.target.closest("img");
        if (img) {
          var allImgs = Array.from(grid.querySelectorAll("img"));
          var idx = allImgs.indexOf(img);
          var urls = allImgs.map(function (i) {
            return i.src;
          });
          openLightbox(img.src, urls, idx);
        }
      };
    } else {
      empty.style.display = "block";
    }
  } catch (e) {
    loading.style.display = "none";
    empty.textContent = e.message || "Nu s-au putut \u00EEnc\u0103rca pozele.";
    empty.style.display = "block";
  }
}
var _lbUrls = [];
var _lbIdx = 0;
function openLightbox(src, urls, idx) {
  _lbUrls = urls && urls.length ? urls : [src];
  _lbIdx = idx !== undefined && idx >= 0 ? idx : 0;
  var overlay = document.getElementById("lightbox-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "lightbox-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:400;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML =
      '<button id="lb-prev" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:2.2rem;width:44px;height:44px;border-radius:50%;cursor:pointer;display:none;">&#8249;</button>' +
      '<img id="lightbox-img" style="max-width:88vw;max-height:90vh;object-fit:contain;border-radius:8px;cursor:zoom-out;">' +
      '<button id="lb-next" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:2.2rem;width:44px;height:44px;border-radius:50%;cursor:pointer;display:none;">&#8250;</button>' +
      '<button id="lb-close" style="position:absolute;top:12px;right:14px;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:1.3rem;width:36px;height:36px;border-radius:50%;cursor:pointer;">&#10005;</button>' +
      '<div id="lb-counter" style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.65);font-size:0.8rem;pointer-events:none;"></div>';
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.style.display = "none";
    });
    overlay.querySelector("#lb-close").addEventListener("click", function () {
      overlay.style.display = "none";
    });
    overlay.querySelector("#lb-prev").addEventListener("click", function (e) {
      e.stopPropagation();
      _lbNav(-1);
    });
    overlay.querySelector("#lb-next").addEventListener("click", function (e) {
      e.stopPropagation();
      _lbNav(1);
    });
    var _swX = null;
    overlay.addEventListener(
      "touchstart",
      function (e) {
        _swX = e.touches[0].clientX;
      },
      { passive: true },
    );
    overlay.addEventListener(
      "touchend",
      function (e) {
        if (_swX === null) return;
        var dx = e.changedTouches[0].clientX - _swX;
        _swX = null;
        if (Math.abs(dx) > 40) _lbNav(dx < 0 ? 1 : -1);
      },
      { passive: true },
    );
    document.addEventListener("keydown", function (e) {
      if (!overlay || overlay.style.display === "none") return;
      if (e.key === "ArrowLeft") _lbNav(-1);
      else if (e.key === "ArrowRight") _lbNav(1);
      else if (e.key === "Escape") overlay.style.display = "none";
    });
    document.body.appendChild(overlay);
  }
  _lbShow();
  overlay.style.display = "flex";
}
function _lbNav(dir) {
  if (_lbUrls.length <= 1) return;
  _lbIdx = (_lbIdx + dir + _lbUrls.length) % _lbUrls.length;
  _lbShow();
}
function _lbShow() {
  var overlay = document.getElementById("lightbox-overlay");
  if (!overlay) return;
  overlay.querySelector("#lightbox-img").src = _lbUrls[_lbIdx];
  var multi = _lbUrls.length > 1;
  overlay.querySelector("#lb-prev").style.display = multi ? "flex" : "none";
  overlay.querySelector("#lb-next").style.display = multi ? "flex" : "none";
  overlay.querySelector("#lb-counter").textContent = multi
    ? _lbIdx + 1 + " / " + _lbUrls.length
    : "";
}
function compressImage(file, maxPx, quality) {
  return new Promise(function (resolve) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var w = img.width,
        h = img.height;
      if (w <= maxPx && h <= maxPx && file.type === "image/jpeg") {
        resolve(file);
        return;
      }
      var scale = Math.min(maxPx / w, maxPx / h, 1);
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        function (blob) {
          resolve(blob || file);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
async function uploadPhoto(input) {
  var file = input.files[0];
  if (!file) return;
  document.getElementById("galLoading").style.display = "block";
  try {
    var compressed = await compressImage(file, 1200, 0.82);
    var uploadFile = new File(
      [compressed],
      file.name.replace(/\.[^.]+$/, ".jpg"),
      { type: "image/jpeg" },
    );
    var fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("species", activeSpeciesId);
    var res = await authFetch("/api/photos", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Eroare server (" + res.status + ")");
    var data = await res.json();
    if (data.error) throw new Error(data.error);
    document.getElementById("galLoading").style.display = "none";
    loadGallery();
  } catch (e) {
    document.getElementById("galLoading").style.display = "none";
    alert("Eroare la \u00EEnc\u0103rcare: " + e.message);
  }
  input.value = "";
}
async function deletePhoto(url) {
  if (!confirm("\u0218tergi aceast\u0103 poz\u0103?")) return;
  try {
    await authFetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url }),
    });
    loadGallery();
  } catch (e) {
    alert("Eroare: " + e.message);
  }
}

// V3: Diagnostic → Adauga tratament in jurnal
function openJurnalFromDiag() {
  var today = new Date().toISOString().slice(0, 10);
  openModal("jurnal");
  setTimeout(function () {
    var typeEl = document.getElementById("jurnalType");
    var dateEl = document.getElementById("jurnalDate");
    var noteEl = document.getElementById("jurnalNote");
    if (typeEl) {
      typeEl.value = "fitosanitar";
      typeEl.dispatchEvent(new Event("change"));
    }
    if (dateEl) dateEl.value = today;
    if (noteEl)
      noteEl.value =
        (SPECIES[activeSpeciesId] ? SPECIES[activeSpeciesId] + " — " : "") +
        "Tratament conform diagnostic AI: ";
    if (noteEl) {
      noteEl.focus();
      noteEl.setSelectionRange(noteEl.value.length, noteEl.value.length);
    }
  }, 150);
}

// ====== DIAGNOSE FUNCTIONS ======
function openDiagnoseModal() {
  document.getElementById("diagSpecies").textContent =
    SPECIES[activeSpeciesId] || activeSpeciesId;
  document.getElementById("diagResult").style.display = "none";
  document.getElementById("diagPreview").style.display = "none";
  document.getElementById("diagLoading").style.display = "none";
  document.getElementById("diagCopyRow").style.display = "none";
  document.getElementById("diagChatSection").style.display = "none";
  document.getElementById("diagChatMessages").innerHTML = "";
  _diagChatHistory["diag"] = [];
  renderAiStatusPanel("diagnose", "diagModalBody", "afterbegin");
  openModal("diagnose");
}
// Comprimare robusta pentru diagnoza — foloseste toDataURL (synchronous, functioneaza pe orice browser/telefon)
// Reduce dimensiunea si calitatea pana cand fisierul incape sub limita
function compressDiagnoseImage(file) {
  return new Promise(function (resolve, reject) {
    var MAX_BYTES = 600 * 1024; // 600KB — upload rapid chiar si pe conexiune lenta
    // Foloseste FileReader + data: URL — evita blob: URL blocat de CSP
    var reader = new FileReader();
    reader.onerror = function () {
      reject(new Error("Nu am putut citi imaginea."));
    };
    reader.onload = function (ev) {
      var img = new Image();
      img.onerror = function () {
        reject(new Error("Format imagine invalid. Foloseste JPEG sau PNG."));
      };
      img.onload = function () {
        var origW = img.naturalWidth || img.width;
        var origH = img.naturalHeight || img.height;
        var attempts = [
          { px: 1200, q: 0.82 },
          { px: 1024, q: 0.75 },
          { px: 800, q: 0.7 },
          { px: 640, q: 0.65 },
          { px: 512, q: 0.6 },
        ];
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        var blob, pxLabel;
        for (var i = 0; i < attempts.length; i++) {
          var a = attempts[i];
          var scale = Math.min(a.px / origW, a.px / origH, 1);
          canvas.width = Math.max(1, Math.round(origW * scale));
          canvas.height = Math.max(1, Math.round(origH * scale));
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          var dataUrl = canvas.toDataURL("image/jpeg", a.q);
          var b64 = dataUrl.split(",")[1];
          var byteStr = atob(b64);
          var bytes = new Uint8Array(byteStr.length);
          for (var j = 0; j < byteStr.length; j++)
            bytes[j] = byteStr.charCodeAt(j);
          blob = new Blob([bytes], { type: "image/jpeg" });
          pxLabel = canvas.width + "x" + canvas.height;
          if (blob.size <= MAX_BYTES) break;
        }
        resolve({ blob: blob, size: blob.size, px: pxLabel, base64: b64 });
      };
      img.src = ev.target.result; // data: URL — permis de CSP
    };
    reader.readAsDataURL(file);
  });
}

// Functie unificata pentru diagnostic foto — folosita de modal specie si tab AI General
async function runDiagnose(input, species, prefix) {
  var file = input.files[0];
  if (!file) return;
  var _t0Diag = Date.now();
  var g = function (id) {
    return document.getElementById(id);
  };
  var copyRowDisplay = prefix === "diag" ? "flex" : "block";

  g(prefix + "Loading").style.display = "block";
  g(prefix + "Result").style.display = "none";
  g(prefix + "CopyRow").style.display = "none";

  var reader = new FileReader();
  reader.onload = function (e) {
    g(prefix + "Img").src = e.target.result;
    g(prefix + "Preview").style.display = "block";
  };
  reader.readAsDataURL(file);

  try {
    var result = await compressDiagnoseImage(file);
    var uploadSize = result.blob.size;
    var res = await authFetch(
      "/api/diagnose",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: result.base64,
          mimeType: "image/jpeg",
          species: species,
        }),
      },
      65000,
    );
    var rawText = await res.text();
    var data;
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      throw new Error("Eroare server (" + res.status + ")");
    }
    if (!res.ok)
      throw new Error(data.error || "Eroare server (" + res.status + ")");
    g(prefix + "Loading").style.display = "none";
    var resultEl = g(prefix + "Result");
    var sizeInfo =
      '<p style="font-size:0.8em;opacity:0.6;margin:0 0 8px">Poza comprimata: ' +
      (uploadSize / 1024).toFixed(0) +
      "KB (" +
      result.px +
      ")</p>";
    if (data.error) {
      resultEl.textContent = "Eroare: " + data.error;
      showAiError(data.error);
      livadaLog("AI", "diagnose", "ERR", data.error);
    } else {
      if (data._fallback) showAiFallback(data._fallbackModel || "gemini");
      resultEl.innerHTML = sizeInfo + sanitizeAI(data.diagnosis || "");
      // F1.3+F2.2 — log + model indicator
      var _diagModel =
        data._model || (data._fallback ? "GPT-4.1" : "Gemini 2.5-flash");
      livadaLog(
        "AI",
        "diagnose",
        data._fallback ? "FALLBACK" : "OK",
        _diagModel,
        Date.now() - _t0Diag,
      );
      renderModelIndicator(
        prefix + "Result",
        _diagModel,
        !!data._fallback,
        Date.now() - _t0Diag,
      );
    }
    resultEl.style.display = "block";
    g(prefix + "CopyRow").style.display = copyRowDisplay;
    if (!data.error) {
      g(prefix + "ChatSection").style.display = "block";
      g(prefix + "ChatMessages").innerHTML = "";
      _diagChatHistory[prefix] = [];
      // V3: Buton "Adauga tratament in jurnal" post-diagnostic
      var addTreatBtn = document.getElementById(prefix + "AddTreatment");
      if (!addTreatBtn) {
        addTreatBtn = document.createElement("div");
        addTreatBtn.id = prefix + "AddTreatment";
        addTreatBtn.style.cssText = "margin-top:8px;text-align:right;";
        g(prefix + "CopyRow").parentNode.appendChild(addTreatBtn);
      }
      var diagText = (resultEl.textContent || "")
        .split("\n")[0]
        .substring(0, 120);
      var diagNote = "Tratament dupa diagnostic AI: " + diagText;
      addTreatBtn.innerHTML =
        "<button class='btn btn-primary' style='font-size:0.8rem;padding:6px 14px;' " +
        "data-note='" +
        escapeHtml(diagNote).replace(/'/g, "'") +
        "'>" +
        "+ Adauga tratament in jurnal</button>";
      addTreatBtn.style.display = "block";
      addTreatBtn
        .querySelector("button")
        .addEventListener("click", function () {
          if (prefix === "diag") closeModal("diagnose");
          var savedNote = this.dataset.note;
          setTimeout(
            function () {
              openModal("jurnal");
              setTimeout(function () {
                var noteEl = document.getElementById("jurnalNote");
                var typeEl = document.getElementById("jurnalType");
                if (noteEl) noteEl.value = savedNote || "";
                if (typeEl) typeEl.value = "tratament";
              }, 150);
            },
            prefix === "diag" ? 200 : 50,
          );
        });
    }
  } catch (e) {
    g(prefix + "Loading").style.display = "none";
    var r = g(prefix + "Result");
    var msg =
      e.name === "AbortError"
        ? "Serviciul AI r\u0103spunde lent. \u00CEncearc\u0103 din nou."
        : navigator.onLine
          ? "Eroare: " + e.message
          : "Necesit\u0103 conexiune la internet.";
    r.textContent = msg;
    showAiError(msg);
    r.style.display = "block";
    g(prefix + "CopyRow").style.display = copyRowDisplay;
  }
  input.value = "";
}

function submitDiagnose(input) {
  return runDiagnose(
    input,
    SPECIES[activeSpeciesId] || activeSpeciesId,
    "diag",
  );
}

// ====== ASK AI FUNCTIONS ======
function openAskModal() {
  document.getElementById("askSpecies").textContent =
    SPECIES[activeSpeciesId] || activeSpeciesId;
  document.getElementById("askResult").style.display = "none";
  document.getElementById("askLoading").style.display = "none";
  document.getElementById("askCopyRow").style.display = "none";
  document.getElementById("askInput").value = "";
  renderAiStatusPanel("ask", "askModalBody", "afterbegin");
  openModal("ask");
}
async function submitAsk() {
  var question = document.getElementById("askInput").value.trim();
  if (!question) return;
  if (!navigator.onLine) {
    alert(
      "Offline! Folose\u0219te c\u0103utarea din header (\uD83D\uDD0D) pentru c\u0103utare local\u0103.",
    );
    return;
  }
  document.getElementById("askLoading").style.display = "block";
  document.getElementById("askResult").style.display = "none";
  var tc = document.getElementById(activeSpeciesId);
  var context = tc ? tc.textContent.substring(0, 3000) : "";
  var _t0Ask = Date.now();
  try {
    var res = await authFetch(
      "/api/ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          species: SPECIES[activeSpeciesId] || activeSpeciesId,
          context: context,
        }),
      },
      65000,
    );
    var data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Eroare server (" + res.status + ")");
    document.getElementById("askLoading").style.display = "none";
    var r = document.getElementById("askResult");
    if (data.error) {
      r.textContent = "Eroare: " + data.error;
      showAiError(data.error);
      livadaLog("AI", "ask", "ERR", data.error);
    } else {
      if (data._fallback)
        showAiFallback(data._fallbackModel || "llama-3.3-70b-versatile");
      r.innerHTML = sanitizeAI(data.answer || "");
      // F1.3+F2.2 — log + model indicator
      var _askModel =
        data._model ||
        (data._fallback ? data._fallbackModel : "Groq llama-4-scout");
      livadaLog(
        "AI",
        "ask",
        data._fallback ? "FALLBACK" : "OK",
        _askModel,
        Date.now() - _t0Ask,
      );
      renderModelIndicator(
        "askResult",
        _askModel,
        !!data._fallback,
        Date.now() - _t0Ask,
      );
    }
    r.style.display = "block";
    document.getElementById("askCopyRow").style.display = "block";
    // F4.2 — Buton "Cere parerea Cerebras" (doar daca raspunsul e de la Groq)
    if (!data._fallback || (data._model && !data._model.includes("cerebras"))) {
      var altRow = document.getElementById("askAltRow");
      if (!altRow) {
        altRow = document.createElement("div");
        altRow.id = "askAltRow";
        altRow.style.cssText = "margin-top:8px;text-align:center;";
        document.getElementById("askCopyRow").parentNode.appendChild(altRow);
      }
      altRow.innerHTML =
        '<button class="btn btn-secondary" style="font-size:0.8rem;width:100%;" onclick="askAlternative()">' +
        "\uD83D\uDD04 Cere p\u0103rerea Cerebras</button>";
    }
  } catch (e) {
    document.getElementById("askLoading").style.display = "none";
    var r2 = document.getElementById("askResult");
    var askMsg =
      e.name === "AbortError"
        ? "Serviciul AI r\u0103spunde lent. \u00CEncearc\u0103 din nou."
        : "Eroare: " + e.message;
    r2.textContent = askMsg;
    showAiError(askMsg);
    r2.style.display = "block";
    document.getElementById("askCopyRow").style.display = "block";
    livadaLog("AI", "ask", "ERR", e.message, Date.now() - _t0Ask);
  }
}

// F4.2 — Cere alternativa Cerebras
async function askAlternative() {
  var question = document.getElementById("askInput").value.trim();
  if (!question) return;
  var altRow = document.getElementById("askAltRow");
  if (altRow)
    altRow.innerHTML =
      '<div class="ai-load" style="display:block;"><div class="ai-load-spinner"></div> Se \u00eentreab\u0103 Cerebras...</div>';
  var tc = document.getElementById(activeSpeciesId);
  var context = tc ? tc.textContent.substring(0, 3000) : "";
  var _t0Alt = Date.now();
  try {
    var res = await authFetch(
      "/api/ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          species: SPECIES[activeSpeciesId] || activeSpeciesId,
          context: context,
          preferModel: "cerebras",
        }),
      },
      65000,
    );
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || "Eroare server");
    if (altRow) {
      altRow.innerHTML =
        '<div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:10px;">' +
        '<div style="font-size:0.78rem;color:var(--text-dim);font-weight:600;margin-bottom:6px;">Cerebras llama-3.3-70b:</div>' +
        sanitizeAI(data.answer || "") +
        "</div>";
      renderModelIndicator(
        "askAltRow",
        data._model || "cerebras-llama-3.3-70b",
        false,
        Date.now() - _t0Alt,
      );
    }
    livadaLog("AI", "ask-alt", "OK", "cerebras", Date.now() - _t0Alt);
  } catch (e) {
    if (altRow)
      altRow.innerHTML =
        '<div style="color:#ef4444;font-size:0.85rem;">Cerebras indisponibil: ' +
        escapeHtml(e.message) +
        "</div>";
    livadaLog("AI", "ask-alt", "ERR", e.message, Date.now() - _t0Alt);
  }
}

// ====== AI GENERAL TAB ======
async function submitAiIdent(input) {
  var file = input.files[0];
  if (!file) return;
  document.getElementById("aiIdentLoading").style.display = "block";
  document.getElementById("aiIdentResult").style.display = "none";
  try {
    var result = await compressDiagnoseImage(file);
    var res = await authFetch(
      "/api/identify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: result.base64,
          mimeType: "image/jpeg",
          organ: "auto",
        }),
      },
      35000,
    );
    var data = await res.json();
    document.getElementById("aiIdentLoading").style.display = "none";
    var el = document.getElementById("aiIdentResult");
    if (!res.ok || data.error) {
      el.innerHTML =
        '<p style="color:var(--error);">' +
        (data.error || "Eroare identificare.") +
        "</p>";
    } else {
      var html = "";

      // ── Sectiunea Pl@ntNet ──────────────────────────────────────────────────
      if (data.results && data.results.length) {
        html +=
          '<div style="background:var(--bg-surface);border-radius:10px;padding:12px;border:1px solid var(--border);margin-bottom:12px;">';
        html +=
          '<p style="font-size:0.75rem;font-weight:700;color:var(--accent);margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">&#127807; Pl@ntNet — Identificare specie</p>';
        data.results.forEach(function (r, i) {
          // H4: escapeHtml pe date API — prevenire XSS prin innerHTML
          var names =
            r.commonNames && r.commonNames.length
              ? r.commonNames.join(", ")
              : "";
          html +=
            '<div style="' +
            (i > 0
              ? "margin-top:10px;padding-top:10px;border-top:1px solid var(--border);"
              : "") +
            '">';
          html +=
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">';
          html +=
            '<span style="font-weight:700;font-size:0.88rem;font-style:italic;">' +
            escapeHtml(r.scientificName || "") +
            "</span>";
          html +=
            '<span style="font-size:0.82rem;color:var(--accent);font-weight:700;white-space:nowrap;">' +
            escapeHtml(String(r.score || "")) +
            "%</span>";
          html += "</div>";
          if (names)
            html +=
              '<div style="font-size:0.82rem;color:var(--text-dim);margin-top:2px;">' +
              escapeHtml(names) +
              "</div>";
          if (r.family)
            html +=
              '<div style="font-size:0.75rem;color:var(--text-dim);">Familia: ' +
              escapeHtml(r.family) +
              "</div>";
          // C1+M7: data-species in loc de onclick inline — previne XSS, adauga aria-label
          var speciesForDiag =
            r.commonNames && r.commonNames[0]
              ? r.commonNames[0]
              : r.scientificName;
          html +=
            '<button class="use-for-diag-btn" data-species="' +
            escapeHtml(speciesForDiag || "") +
            '" ';
          html +=
            'aria-label="Foloseste ' +
            escapeHtml(speciesForDiag || "") +
            ' la diagnostic" ';
          html +=
            'style="margin-top:6px;padding:5px 12px;font-size:0.75rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;transition:background 0.2s;">Foloseste la diagnostic \uD83D\uDCF8</button>';
          html += "</div>";
        });
        html += "</div>";
      }

      // ── Sectiunea AI (Gemini/fallback) ─────────────────────────────────────
      if (data.ai && data.ai.text) {
        html +=
          '<div style="background:var(--bg-surface);border-radius:10px;padding:12px;border:1px solid var(--border);">';
        html +=
          '<p style="font-size:0.75rem;font-weight:700;color:var(--accent);margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">&#129302; AI — Analiza detaliata</p>';
        if (data.ai.model && data.ai.model !== "gemini-2.5-flash") {
          html +=
            '<p style="font-size:0.72rem;color:var(--text-dim);margin:0 0 6px;">Model: ' +
            data.ai.model +
            "</p>";
        }
        html +=
          '<div class="ai-res" style="display:block;margin:0;">' +
          sanitizeAI(data.ai.text) +
          "</div>";
        // Extrage denumire comuna din textul AI (pentru butonul "Diagnostic foto")
        var aiSpeciesMatch = data.ai.text.match(
          /Denumire comun[aă]\s+(?:in|în)\s+roman[aă]\s*[:\-]?\s*\*?\*?([^\n\*]+)/i,
        );
        var aiSpeciesName = aiSpeciesMatch ? aiSpeciesMatch[1].trim() : "";
        // Butoane actiuni
        html +=
          '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-top:8px;">';
        // Buton: trimite specia AI la sectiunea Diagnostic foto
        if (aiSpeciesName) {
          html +=
            '<button class="use-for-diag-btn" data-species="' +
            escapeHtml(aiSpeciesName) +
            '" ';
          html +=
            'aria-label="Diagnostic foto ' + escapeHtml(aiSpeciesName) + '" ';
          html +=
            'style="padding:5px 12px;font-size:0.75rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;">Diagnostic foto \uD83D\uDCF8</button>';
        }
        // C2: data-* + event listener in loc de onclick inline — previne XSS
        html +=
          '<button class="copy-btn ai-copy-btn" aria-label="Copiaza raspuns AI">&#128203; Copiaza</button>';
        html += "</div>";
        html += "</div>";
      }

      if (!html)
        html =
          '<p style="color:var(--text-dim);">Niciun rezultat. Incearca o poza mai clara.</p>';
      el.innerHTML = html;
      // C1: event listeners pentru butoanele "Foloseste la diagnostic" (inlocuiesc onclick inline)
      el.querySelectorAll(".use-for-diag-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          document.getElementById("aiGenDiagSpecies").value =
            this.dataset.species;
          this.innerHTML = "&#10003; Copiat";
          this.style.background = "#4a9a48";
        });
      });
      // C2: event listener pentru butonul "Copiaza" (inlocuieste onclick inline)
      var aiCopyBtn = el.querySelector(".ai-copy-btn");
      if (aiCopyBtn && data.ai && data.ai.text) {
        var _aiText = data.ai.text;
        aiCopyBtn.addEventListener("click", function () {
          copyText(_aiText.substring(0, 200));
        });
      }
    }
    el.style.display = "block";
  } catch (e) {
    document.getElementById("aiIdentLoading").style.display = "none";
    var el2 = document.getElementById("aiIdentResult");
    el2.innerHTML =
      '<p style="color:var(--error);">' +
      (e.name === "AbortError"
        ? "Prea lent. Incearca din nou."
        : "Eroare: " + e.message) +
      "</p>";
    el2.style.display = "block";
  }
  input.value = "";
}

async function submitAiGenAsk() {
  var question = document.getElementById("aiGenAskInput").value.trim();
  if (!question) return;
  if (!navigator.onLine) {
    alert("Offline! Necesit\u0103 conexiune la internet.");
    return;
  }
  var species =
    document.getElementById("aiGenSpeciesInput").value.trim() || "general";
  document.getElementById("aiGenAskLoading").style.display = "block";
  document.getElementById("aiGenAskResult").style.display = "none";
  document.getElementById("aiGenAskCopyRow").style.display = "none";
  try {
    var res = await authFetch(
      "/api/ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          species: species,
          context: "",
        }),
      },
      65000,
    );
    var data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Eroare server (" + res.status + ")");
    document.getElementById("aiGenAskLoading").style.display = "none";
    var r = document.getElementById("aiGenAskResult");
    if (data.error) {
      r.textContent = "Eroare: " + data.error;
      showAiError(data.error);
    } else {
      if (data._fallback)
        showAiFallback(data._fallbackModel || "llama-3.3-70b-versatile");
      r.innerHTML = sanitizeAI(data.answer || "");
    }
    r.style.display = "block";
    document.getElementById("aiGenAskCopyRow").style.display = "block";
  } catch (e) {
    document.getElementById("aiGenAskLoading").style.display = "none";
    var r2 = document.getElementById("aiGenAskResult");
    var msg =
      e.name === "AbortError"
        ? "Serviciul AI r\u0103spunde lent. \u00CEncearc\u0103 din nou."
        : "Eroare: " + e.message;
    r2.textContent = msg;
    showAiError(msg);
    r2.style.display = "block";
    document.getElementById("aiGenAskCopyRow").style.display = "block";
  }
}

function submitAiGenDiagnose(input) {
  var species = (
    document.getElementById("aiGenDiagSpecies").value.trim() || "necunoscut"
  )
    .replace(/[^a-zA-ZăâîșțĂÂÎȘȚ0-9\s_-]/g, "")
    .substring(0, 100);
  return runDiagnose(input, species, "aiGenDiag");
}

// ====== DIAGNOSTIC CHAT ======
async function sendDiagChat(prefix) {
  var inputId = prefix + "ChatInput";
  var messagesId = prefix + "ChatMessages";
  var loadingId = prefix + "ChatLoading";

  var inputEl = document.getElementById(inputId);
  var question = (inputEl.value || "").trim();
  if (!question) return;

  // Get diagnosis context
  var diagResultId = prefix === "diag" ? "diagResult" : "aiGenDiagResult";
  var diagContext = (
    document.getElementById(diagResultId).innerText || ""
  ).substring(0, 1200);

  // Get species
  var species = "necunoscut";
  if (prefix === "diag") {
    species = SPECIES[activeSpeciesId] || activeSpeciesId || "necunoscut";
  } else {
    var sp = document.getElementById("aiGenDiagSpecies");
    if (sp) species = (sp.value.trim() || "necunoscut").substring(0, 80);
  }

  // Init history
  if (!_diagChatHistory[prefix]) _diagChatHistory[prefix] = [];

  var history = _diagChatHistory[prefix];
  var msgsEl = document.getElementById(messagesId);
  var loadEl = document.getElementById(loadingId);

  // Render user bubble
  var userBubble = document.createElement("div");
  userBubble.className = "chat-bubble-user";
  userBubble.textContent = question;
  msgsEl.appendChild(userBubble);
  msgsEl.scrollTop = msgsEl.scrollHeight;

  inputEl.value = "";
  loadEl.style.display = "block";

  // Build prompt — first message includes full diagnosis, subsequent include last 2 Q&A pairs
  var fullQuestion;
  if (history.length === 0) {
    fullQuestion =
      'Diagnostic AI primit:\n"""\n' +
      diagContext +
      '\n"""\n\nSpecia analizata: ' +
      species +
      "\n\nIntrebare: " +
      question;
  } else {
    var recentHistory = history.slice(-4); // max 4 entries = 2 Q&A pairs
    var contextLines = recentHistory.map(function (e) {
      return (
        (e.role === "user" ? "Utilizator" : "AI") +
        ": " +
        e.content.substring(0, 350)
      );
    });
    fullQuestion =
      "Context conversatie (diagnostic " +
      species +
      "):\n" +
      contextLines.join("\n") +
      "\n\nIntrebare noua: " +
      question;
  }

  // Store CLEAN question in history (not context-enriched)
  history.push({ role: "user", content: question });

  try {
    var res = await authFetch(
      "/api/ask",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: fullQuestion, species: species }),
      },
      30000,
    );
    var data = await res.json();
    loadEl.style.display = "none";
    var answer = data.answer || data.error || "Eroare.";

    history.push({ role: "assistant", content: answer });

    var aiBubble = document.createElement("div");
    aiBubble.className = "chat-bubble-ai";
    aiBubble.innerHTML = sanitizeAI(answer);
    msgsEl.appendChild(aiBubble);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  } catch (e) {
    loadEl.style.display = "none";
    var errBubble = document.createElement("div");
    errBubble.className = "chat-bubble-err";
    errBubble.textContent =
      e.name === "AbortError"
        ? "R\u0103spuns lent. \u00CEncearc\u0103 din nou."
        : "Eroare: " + e.message;
    msgsEl.appendChild(errBubble);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    history.pop(); // remove failed user message
  }
}

// Enter key in chat inputs
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    var t = e.target;
    if (t.id === "diagChatInput") {
      e.preventDefault();
      sendDiagChat("diag");
    }
    if (t.id === "aiGenDiagChatInput") {
      e.preventDefault();
      sendDiagChat("aiGenDiag");
    }
  }
});

// ====== TOAST NOTIFICATIONS ======
function showToast(msg, type) {
  var container = document.getElementById("livada-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "livada-toast-container";
    container.style.cssText =
      "position:fixed;bottom:72px;right:12px;z-index:9999;display:flex;flex-direction:column;gap:6px;max-width:300px;pointer-events:none;";
    document.body.appendChild(container);
    var s = document.createElement("style");
    s.textContent =
      ".lv-toast{padding:9px 13px;border-radius:8px;font-size:0.8rem;line-height:1.4;color:#fff;box-shadow:0 3px 12px rgba(0,0,0,0.35);animation:lvToastIn 0.25s ease;pointer-events:auto;}" +
      ".lv-toast.err{background:rgba(211,47,47,0.96);}" +
      ".lv-toast.warn{background:rgba(245,124,0,0.96);}" +
      ".lv-toast.info{background:rgba(25,118,210,0.92);}" +
      "@keyframes lvToastIn{from{opacity:0;transform:translateX(30px);}to{opacity:1;transform:translateX(0);}}";
    document.head.appendChild(s);
  }
  var t = document.createElement("div");
  t.className =
    "lv-toast " +
    (type === "error" ? "err" : type === "warning" ? "warn" : "info");
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(function () {
    t.style.cssText += "opacity:0;transition:opacity 0.4s;";
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 420);
  }, 6000);
}
function showAiError(msg) {
  showToast("\u26A0\uFE0F AI: " + msg, "error");
}
function showAiFallback(model) {
  showToast("\u2139\uFE0F Model rezerv\u0103 activ: " + model, "warning");
}

// ====== JOURNAL SYNC ======
var jSyncStatus = "idle";
var _isSyncing = false;
var _pendingSync = false;
var SYNC_MAX_RETRIES = 3;
var SYNC_BACKOFF = [2000, 5000, 15000];
async function syncJournal(retryCount) {
  if (_isSyncing) {
    _pendingSync = true;
    return;
  }
  _isSyncing = true;
  retryCount = retryCount || 0;
  if (!navigator.onLine) {
    _isSyncing = false;
    return;
  }
  try {
    jSyncStatus = "syncing";
    updateSyncBadge();
    var local = getJurnalEntries();
    var res = await authFetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(local),
    });
    if (!res.ok) throw new Error("sync fail");
    var pullRes = await authFetch("/api/journal");
    if (pullRes.ok) {
      var remote = await pullRes.json();
      if (Array.isArray(remote) && remote.length > 0) {
        var map = new Map();
        local.forEach(function (e) {
          map.set(e.id, e);
        });
        remote.forEach(function (e) {
          map.set(e.id, e);
        });
        var merged = Array.from(map.values()).sort(function (a, b) {
          return b.id - a.id;
        });
        saveJurnalEntries(merged);
        if (document.getElementById("modal-jurnal").classList.contains("open"))
          renderJurnal();
      }
    }
    jSyncStatus = "synced";
    localStorage.setItem("livada-last-sync", Date.now());
    updateSyncBadge();
  } catch (e) {
    if (retryCount < SYNC_MAX_RETRIES) {
      jSyncStatus = "retrying";
      updateSyncBadge("Retry " + (retryCount + 1) + "/" + SYNC_MAX_RETRIES);
      setTimeout(function () {
        _isSyncing = false;
        syncJournal(retryCount + 1);
      }, SYNC_BACKOFF[retryCount]);
      return;
    }
    jSyncStatus = "error";
    updateSyncBadge();
  }
  _isSyncing = false;
  if (_pendingSync) {
    _pendingSync = false;
    setTimeout(function () {
      syncJournal();
    }, 500);
  }
}
function updateSyncBadge(customLabel) {
  var badge = document.getElementById("syncBadge");
  if (!badge) return;
  var syncedLabel = "\u2713 Sincronizat";
  if (jSyncStatus === "synced") {
    var lastSync = parseInt(localStorage.getItem("livada-last-sync") || "0");
    if (lastSync) {
      var ago = Math.round((Date.now() - lastSync) / 60000);
      if (ago < 1) syncedLabel = "\u2713 Sincronizat acum";
      else if (ago === 1) syncedLabel = "\u2713 Sincronizat acum 1 min";
      else syncedLabel = "\u2713 Sincronizat acum " + ago + " min";
    }
  }
  var labels = {
    idle: "",
    syncing: "\u21BB Sincronizare...",
    synced: syncedLabel,
    error: "\u2717 Eroare sync",
    retrying: "\u21BB ",
  };
  var cls = { idle: "", syncing: "", synced: "ok", error: "err", retrying: "" };
  badge.className = "sync-badge " + (cls[jSyncStatus] || "");
  badge.innerHTML =
    '<span class="sd"></span> ' + (customLabel || labels[jSyncStatus] || "");
}
async function syncDeleteJournal(id) {
  if (!navigator.onLine) return;
  try {
    await authFetch("/api/journal", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    });
  } catch (e) {}
}

// ====== FROST & DISEASE ALERTS ======
var ALERTS_CACHE_KEY = "livada-alerts-cache";

// F8.2: Verifica daca o alerta e stale (trecuta).
// Varianta A: daca are frostHour/alertHour, compara cu ora curenta + 2h buffer.
// Fallback: comparatie la nivel de zi (backward compat).
function isAlertStale(alert) {
  if (!alert || !alert.active) return true;
  if (!alert.date) return false; // fara data → tratam ca relevant (backward compat)
  var alertTime = alert.frostHour || alert.alertHour;
  if (alertTime) {
    var alertMs = new Date(alertTime).getTime();
    if (!isNaN(alertMs)) {
      return Date.now() > alertMs + 2 * 60 * 60 * 1000; // 2h buffer
    }
  }
  return alert.date < todayLocal();
}
var isFrostAlertStale = isAlertStale; // backward compat

function applyAlertBanner(alertData, textId, bannerId, title, key) {
  if (alertData && alertData.active && !isAlertStale(alertData)) {
    var t = document.getElementById(textId);
    var b = document.getElementById(bannerId);
    if (t) t.textContent = alertData.message;
    if (b) b.classList.add("active");
    sendLivadaNotification(title, alertData.message || title, key);
  } else {
    var bh = document.getElementById(bannerId);
    if (bh) bh.classList.remove("active");
  }
}

function applyAlerts(data) {
  applyAlertBanner(
    data.frost,
    "frostText",
    "frostBanner",
    "Alerta inghet",
    "frost",
  );
  applyAlertBanner(
    data.disease,
    "diseaseText",
    "diseaseBanner",
    "Alerta boala",
    "disease",
  );
  applyAlertBanner(data.wind, "windText", "windBanner", "Alerta vant", "wind");
  applyAlertBanner(
    data.heat,
    "heatText",
    "heatBanner",
    "Alerta canicula",
    "heat",
  );
  applyAlertBanner(
    data.rain,
    "rainText",
    "rainBanner",
    "Alerta ploaie",
    "rain",
  );
  applyAlertBanner(
    data.drought,
    "droughtText",
    "droughtBanner",
    "Alerta seceta",
    "drought",
  );
}

// II2: Notification API helper
var _notifSentKeys = {};
function sendLivadaNotification(title, body, key) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (localStorage.getItem("livada-notif-disabled") === "1") return;
  // Evita spam: trimite o singura notificare per tip per sesiune
  if (_notifSentKeys[key]) return;
  _notifSentKeys[key] = true;
  try {
    new Notification(title, {
      body: body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "livada-" + key,
      renotify: false,
      silent: false,
    });
  } catch (e) {
    /* iOS Safari poate arunca erori */
  }
}

function requestLivadaNotifPermission() {
  if (!("Notification" in window)) {
    showToast("Notificarile nu sunt suportate in acest browser.");
    return;
  }
  if (Notification.permission === "granted") {
    localStorage.removeItem("livada-notif-disabled");
    showToast("Notificari activate!");
    updateNotifBtn();
    return;
  }
  if (Notification.permission === "denied") {
    showToast("Notificarile sunt blocate. Activeaza din setarile browserului.");
    return;
  }
  Notification.requestPermission().then(function (perm) {
    if (perm === "granted") {
      localStorage.removeItem("livada-notif-disabled");
      showToast("Notificari activate! Vei primi alerte de inghet si boli.");
      updateNotifBtn();
    } else {
      showToast(
        "Notificari refuzate. Poti activa mai tarziu din setarile browserului.",
      );
    }
  });
}

function toggleLivadaNotif() {
  if (localStorage.getItem("livada-notif-disabled") === "1") {
    localStorage.removeItem("livada-notif-disabled");
    showToast("Notificari activate!");
  } else {
    localStorage.setItem("livada-notif-disabled", "1");
    showToast("Notificari dezactivate.");
  }
  updateNotifBtn();
}

function updateNotifBtn() {
  var btn = document.getElementById("notifToggleBtn");
  if (!btn) return;
  var isDisabled = localStorage.getItem("livada-notif-disabled") === "1";
  var perm = "Notification" in window ? Notification.permission : "unsupported";
  if (perm === "unsupported") {
    btn.style.display = "none";
    return;
  }
  if (perm === "granted") {
    btn.textContent = isDisabled
      ? "🔔 Activeaza notificari"
      : "🔕 Dezactiveaza notificari";
    btn.onclick = toggleLivadaNotif;
  } else {
    btn.textContent = "🔔 Activeaza notificari alerte";
    btn.onclick = requestLivadaNotifPermission;
  }
}

async function checkAlerts() {
  // Afiseaza cache-ul existent imediat (vizibil chiar offline)
  try {
    var cached = JSON.parse(localStorage.getItem(ALERTS_CACHE_KEY) || "null");
    if (cached) applyAlerts(cached);
  } catch (e) {}

  if (!navigator.onLine) return;
  try {
    var res = await fetchWithTimeout("/api/frost-alert", {}, 5000);
    if (!res.ok) return;
    var data = await res.json();
    localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(data));
    applyAlerts(data);
  } catch (e) {}
}

// ====== METEO HISTORY ======
async function loadMeteoHistory() {
  if (!navigator.onLine) return;
  var container = document.getElementById("meteoHistory");
  if (!container) return;
  try {
    var res = await fetchWithTimeout("/api/meteo-history?days=30", {}, 10000);
    if (!res.ok) throw new Error("Server " + res.status);
    var data = await res.json();
    if (data.error || Object.keys(data).length === 0) {
      container.innerHTML =
        '<p style="font-size:0.8rem;color:var(--text-dim);text-align:center;padding:12px;">Nu exist\u0103 date istorice. Cron-ul zilnic le va ad\u0103uga automat.</p>';
      return;
    }
    var entries = Object.entries(data).sort(function (a, b) {
      return a[0].localeCompare(b[0]);
    });
    var temps = entries.map(function (e) {
      return e[1].temp;
    });
    var minT = Math.min.apply(null, temps);
    var maxT = Math.max.apply(null, temps);
    var range = Math.max(maxT - minT, 1);
    var bars = entries
      .map(function (e) {
        var date = e[0],
          d = e[1];
        var h = Math.max(5, ((d.temp - minT) / range) * 90);
        var cls = d.temp < 0 ? "cold" : d.temp > 30 ? "hot" : "warm";
        return (
          '<div class="m-bar ' +
          cls +
          '" style="height:' +
          h +
          'px"><div class="m-bar-tip">' +
          date.slice(5) +
          ": " +
          d.temp +
          "\u00B0C " +
          d.description +
          "</div></div>"
        );
      })
      .join("");
    // Calculeaza risc micoze dupa zile consecutive cu precipitatii
    var rainyStreak = 0,
      maxRainyStreak = 0;
    entries.forEach(function (e) {
      var desc = (e[1].description || "").toLowerCase();
      if (
        desc.includes("ploaie") ||
        desc.includes("averse") ||
        desc.includes("burinta") ||
        desc.includes("ninsoare")
      ) {
        rainyStreak++;
        if (rainyStreak > maxRainyStreak) maxRainyStreak = rainyStreak;
      } else {
        rainyStreak = 0;
      }
    });
    var riskNote = "";
    if (maxRainyStreak >= 3) {
      riskNote =
        '<div class="alert" style="margin-top:8px;font-size:0.78rem;">\u26A0\uFE0F <strong>Risc micoze:</strong> ' +
        maxRainyStreak +
        " zile consecutive cu precipita\u021Bii. Verific\u0103 necesitatea unui tratament fungicid preventiv.</div>";
    }
    container.innerHTML =
      '<div class="m-chart"><h4>Istoric temperaturi \u2014 ultimele ' +
      entries.length +
      " zile</h4>" +
      '<div class="m-chart-wrap">' +
      bars +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-dim);margin-top:4px;">' +
      "<span>" +
      (entries[0] ? entries[0][0].slice(5) : "") +
      "</span>" +
      "<span>Min: " +
      Math.round(minT) +
      "\u00B0 / Max: " +
      Math.round(maxT) +
      "\u00B0</span>" +
      "<span>" +
      (entries[entries.length - 1]
        ? entries[entries.length - 1][0].slice(5)
        : "") +
      "</span>" +
      "</div></div>" +
      riskNote;
  } catch (e) {
    container.innerHTML = "";
  }
}

// ====== TOKEN SETUP UI ======
function showTokenSetup() {
  var token = getLivadaToken();
  var val = prompt(
    "Introdu token-ul API (din Vercel env LIVADA_API_TOKEN).\nLasa gol pentru a sterge.",
    token || "",
  );
  if (val === null) return;
  if (val && val.trim().length < 16) {
    alert("Token invalid — minim 16 caractere.");
    return;
  }
  setLivadaToken(val.trim());
  alert(val ? "Token salvat!" : "Token sters.");
}

// ====== SMART CALENDAR ENHANCEMENT ======
var calendarMeteoData = null;
async function enhanceCalendarWithMeteo() {
  if (!navigator.onLine) return;
  if (!calendarMeteoData) {
    try {
      var res = await fetchWithTimeout("/api/meteo-history?days=90", {}, 10000);
      if (res.ok) calendarMeteoData = await res.json();
    } catch (e) {
      return;
    }
  }
  if (!calendarMeteoData || Object.keys(calendarMeteoData).length === 0) return;
  // Add weather icons to past calendar days
  var calGrid = document.getElementById("calGrid");
  if (!calGrid) return;
  var days = calGrid.querySelectorAll(".cal-day:not(.empty)");
  days.forEach(function (dayEl) {
    var dayNum = parseInt(dayEl.textContent);
    if (isNaN(dayNum)) return;
    var dateStr =
      calYear +
      "-" +
      String(calMonth + 1).padStart(2, "0") +
      "-" +
      String(dayNum).padStart(2, "0");
    var meteo = calendarMeteoData[dateStr];
    if (meteo) {
      dayEl.title = meteo.temp + "\u00B0C, " + meteo.description;
      if (meteo.temp < 0) dayEl.style.borderBottom = "2px solid var(--info)";
      else if (meteo.temp > 30)
        dayEl.style.borderBottom = "2px solid var(--danger)";
    }
  });
  // Show frost/disease warnings in calendar events
  var events = document.getElementById("calEvents");
  if (events) {
    var monthNum = calMonth + 1;
    if (monthNum >= 3 && monthNum <= 5) {
      var frostDays = Object.entries(calendarMeteoData).filter(function (e) {
        return (
          e[0].startsWith(calYear + "-" + String(monthNum).padStart(2, "0")) &&
          e[1].temp < 0
        );
      });
      if (frostDays.length > 0) {
        events.innerHTML +=
          '<div class="cal-event-item" style="border-color:var(--danger);margin-top:12px;">' +
          "<strong>\u2744\uFE0F Zile cu \u00EEnghe\u021B luna aceasta: " +
          frostDays.length +
          "</strong><br>" +
          "Protejeaz\u0103 pomii sensibili (piersic, cais, migdal, rodiu). Verific\u0103 protec\u021Bia de iarn\u0103.</div>";
      }
    }
    // Rain + warm = disease risk
    var rainyWarm = Object.entries(calendarMeteoData).filter(function (e) {
      return (
        e[0].startsWith(calYear + "-" + String(monthNum).padStart(2, "0")) &&
        e[1].rain > 0 &&
        e[1].temp >= 10 &&
        e[1].temp <= 25
      );
    });
    if (rainyWarm.length >= 3) {
      events.innerHTML +=
        '<div class="cal-event-item" style="border-color:var(--warning);margin-top:8px;">' +
        "<strong>\u26A0\uFE0F " +
        rainyWarm.length +
        " zile cu ploi \u0219i temperaturi optime pt boli fungice</strong><br>" +
        "Verific\u0103 r\u0103p\u0103nul la m\u0103r/p\u0103r \u0219i monilioza la cais/piersic.</div>";
    }
  }
}

// ====== JURNAL EXPORT (IMP-8) ======
function exportJurnal() {
  var entries = getJurnalEntries();
  if (entries.length === 0) {
    alert("Jurnalul este gol.");
    return;
  }
  var data = JSON.stringify(entries, null, 2);
  var blob = new Blob([data], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jurnal-livada-" + todayLocal() + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ====== REPORT GENERATION ======
async function generateReport() {
  if (
    !confirm(
      "Datele din jurnal vor fi trimise la un serviciu AI extern (Groq) pentru analiz\u0103. Continu\u0103?",
    )
  )
    return;
  var btn = document.getElementById("reportBtn");
  var loading = document.getElementById("reportLoading");
  var result = document.getElementById("reportResult");
  btn.disabled = true;
  loading.style.display = "block";
  result.style.display = "none";
  var localJournal = getJurnalEntries()
    .map(function (e) {
      return e.date + ": [" + e.type + "] " + e.note;
    })
    .join("\n");
  try {
    var res = await authFetch(
      "/api/report",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localJournal: localJournal }),
      },
      65000,
    );
    if (!res.ok) throw new Error("Eroare server (" + res.status + ")");
    var data = await res.json();
    loading.style.display = "none";
    btn.disabled = false;
    if (data.error) {
      result.textContent = "Eroare: " + data.error;
      showAiError(data.error);
    } else {
      if (data._fallback)
        showAiFallback(data._fallbackModel || "llama-3.3-70b-versatile");
      result.innerHTML =
        '<div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:8px;">Bazat pe ' +
        data.journalCount +
        " interven\u021Bii \u0219i " +
        data.meteoDays +
        " zile meteo</div>" +
        sanitizeAI(data.report || "") +
        '<div style="display:flex;gap:8px;margin-top:12px;">' +
        '<button class="btn btn-secondary" style="flex:1;font-size:0.8rem;" onclick="copyTextEl(\'reportResult\')">&#128203; Copiaz\u0103 raport</button>' +
        '<button class="btn btn-secondary" style="flex:1;font-size:0.8rem;" onclick="window.print()">&#128424;&#65039; Printeaz\u0103</button>' +
        "</div>";
    }
    result.style.display = "block";
  } catch (e) {
    loading.style.display = "none";
    btn.disabled = false;
    var repMsg =
      e.name === "AbortError"
        ? "Serviciul AI r\u0103spunde lent. \u00CEncearc\u0103 din nou."
        : navigator.onLine
          ? "Eroare: " + e.message
          : "Necesit\u0103 conexiune la internet.";
    result.textContent = repMsg;
    showAiError(repMsg);
    result.style.display = "block";
  }
}

// ====== FROST SENSITIVITY (B2) ======
var FROST_SENSITIVITY = {
  cais: { limit: -1, label: "Foarte sensibil" },
  piersic: { limit: -1, label: "Foarte sensibil" },
  migdal: { limit: -2, label: "Foarte sensibil" },
  rodiu: { limit: -5, label: "Extrem de sensibil" },
  cires: { limit: -3, label: "Sensibil" },
  visin: { limit: -4, label: "Moderat sensibil" },
  prun: { limit: -4, label: "Moderat sensibil" },
  "par-clapp": { limit: -4, label: "Moderat sensibil" },
  "par-williams": { limit: -4, label: "Moderat sensibil" },
  "par-hosui": { limit: -4, label: "Moderat sensibil" },
  "par-napoca": { limit: -4, label: "Moderat sensibil" },
  "mar-florina": { limit: -5, label: "Moderat rezistent" },
  "mar-golden": { limit: -5, label: "Moderat rezistent" },
  zmeur: { limit: -6, label: "Rezistent" },
  mur: { limit: -6, label: "Rezistent" },
  afin: { limit: -8, label: "Rezistent" },
  alun: { limit: -10, label: "Foarte rezistent" },
  kaki: { limit: -5, label: "Extrem de sensibil" },
  "zmeur-galben": { limit: -6, label: "Rezistent" },
  "mur-copac": { limit: -6, label: "Rezistent" },
};

// ====== SFATUL LUNII (B1-A) ======
var SFAT_LUNA = [
  "Repaus vegetativ. Verific\u0103 protec\u021Bia la \u00EEnghe\u021B, planific\u0103 t\u0103ierile.",
  "Repaus vegetativ. Verific\u0103 protec\u021Bia la \u00EEnghe\u021B, planific\u0103 t\u0103ierile.",
  "\u00CEncepe sezonul! Tundere, primul tratament cu cupru.",
  "Aten\u021Bie \u00EEnghe\u021B t\u00E2rziu! NU stropi pe flori deschise.",
  "Tratamente post-\u00EEnflorire. R\u0103rire fructe.",
  "Stropiri preventive. Irigare. Monitorizare boli.",
  "Stropiri preventive. Irigare. Monitorizare boli.",
  "Recolt\u0103! Preg\u0103tire tratamente de toamn\u0103.",
  "Recolt\u0103! Preg\u0103tire tratamente de toamn\u0103.",
  "Tratament cupru dup\u0103 c\u0103derea frunzelor. Protec\u021Bie iarn\u0103.",
  "Tratament cupru dup\u0103 c\u0103derea frunzelor. Protec\u021Bie iarn\u0103.",
  "Repaus. Comand\u0103 produse pentru prim\u0103var\u0103.",
];

// ====== SPRAY SCORE ======
function calculateSprayScore(temp, wind, rain, humidity, uvIndex) {
  if (temp < 5 || temp > 30 || wind > 15 || rain > 2) return 0;
  var score = 100;
  if (temp < 10) score -= (10 - temp) * 8;
  if (temp > 25) score -= (temp - 25) * 8;
  if (wind > 10) score -= (wind - 10) * 10;
  if (rain > 0) score -= rain * 20;
  if (humidity > 80) score -= (humidity - 80) * 2;
  // T10: UV index ridicat (>7) + temperatura >20 grad = risc fitotoxicitate la stropire in amiaza
  if (uvIndex && uvIndex > 7 && temp > 20) score -= (uvIndex - 7) * 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}
function sprayLabel(s) {
  if (s >= 80) return { text: "Excelent", cls: "spray-good" };
  if (s >= 50) return { text: "Acceptabil", cls: "spray-ok" };
  if (s > 0) return { text: "Nerecomand.", cls: "spray-bad" };
  return { text: "Interzis", cls: "spray-no" };
}
function getNextTreatment() {
  var now = new Date();
  var m = now.getMonth() + 1,
    d = now.getDate();
  for (var i = 0; i < TREATMENTS_CAL.length; i++) {
    var t = TREATMENTS_CAL[i];
    var from = t.m1,
      to = t.m2,
      d1 = t.d1 || 1,
      d2 = t.d2 || 31;
    if (m > to || (m === to && d > d2)) continue;
    if (m >= from && m <= to)
      return {
        label: t.label,
        desc: t.desc,
        status: "ACTIV ACUM",
        color: t.color,
      };
    var daysTo = (new Date(now.getFullYear(), from - 1, d1) - now) / 86400000;
    return {
      label: t.label,
      desc: t.desc,
      status: "peste " + Math.ceil(daysTo) + " zile",
      color: t.color,
    };
  }
  return null;
}

// ====== DASHBOARD AZI ======
async function initDashboardAzi() {
  // A. Sfatul lunii
  updateNotifBtn();
  var m = new Date().getMonth();
  var sfat = document.getElementById("sfatulLunii");
  if (sfat)
    sfat.innerHTML = '<p style="font-size:0.92rem;">' + SFAT_LUNA[m] + "</p>";

  // Next treatment
  var nt = getNextTreatment();
  if (nt && sfat) {
    sfat.innerHTML +=
      '<div class="alert alert-info" style="margin-top:10px;"><strong>' +
      escapeHtml(nt.label) +
      "</strong> — " +
      nt.status +
      '<br><span style="font-size:0.82rem;">' +
      escapeHtml(nt.desc) +
      "</span></div>";
  }

  var alerteEl = document.getElementById("alerteAzi");
  var meteoEl = document.getElementById("meteoAzi");

  // B3: Fetch-uri PARALELE — meteo foloseste cache-ul in-memory (T8)
  var [alertRes, meteoRes] = await Promise.allSettled([
    navigator.onLine
      ? fetchWithTimeout("/api/frost-alert", {}, 5000)
      : Promise.reject("offline"),
    navigator.onLine ? fetchMeteoData(false) : Promise.reject("offline"),
  ]);

  // B. Alerte
  var _frostDataForCalendar = null; // refolosit in F6.1
  if (alerteEl) {
    var html = "";
    if (alertRes.status === "fulfilled" && alertRes.value.ok) {
      var data = await alertRes.value.json();
      _frostDataForCalendar = data;
      var frostRelevant =
        data.frost && data.frost.active && !isAlertStale(data.frost);
      if (frostRelevant) {
        html +=
          '<div class="alert alert-danger">\u2744\uFE0F ' +
          escapeHtml(data.frost.message) +
          "</div>";
        var affected = [];
        for (var sp in FROST_SENSITIVITY) {
          if (data.frost.minTemp <= FROST_SENSITIVITY[sp].limit)
            affected.push(
              SPECIES[sp] + " (" + FROST_SENSITIVITY[sp].limit + "\u00B0C)",
            );
        }
        if (affected.length)
          html +=
            '<div class="alert alert-warning" style="margin-top:8px;">\uD83C\uDF3F <strong>Specii afectate:</strong> ' +
            affected.join(", ") +
            "</div>";
      }
      if (data.disease && data.disease.active)
        html +=
          '<div class="alert alert-warning" style="margin-top:8px;">\u26A0\uFE0F ' +
          escapeHtml(data.disease.message) +
          "</div>";
      if (data.wind && data.wind.active && !isAlertStale(data.wind))
        html +=
          '<div class="alert alert-info" style="margin-top:8px;">\uD83D\uDCA8 ' +
          escapeHtml(data.wind.message) +
          "</div>";
      if (data.heat && data.heat.active && !isAlertStale(data.heat))
        html +=
          '<div class="alert alert-danger" style="margin-top:8px;">\uD83C\uDF21\uFE0F ' +
          escapeHtml(data.heat.message) +
          "</div>";
      if (data.rain && data.rain.active && !isAlertStale(data.rain))
        html +=
          '<div class="alert alert-info" style="margin-top:8px;">\uD83C\uDF27\uFE0F ' +
          escapeHtml(data.rain.message) +
          "</div>";
      if (data.drought && data.drought.active && !isAlertStale(data.drought))
        html +=
          '<div class="alert alert-warning" style="margin-top:8px;">\u2600\uFE0F ' +
          escapeHtml(data.drought.message) +
          "</div>";
      var anyActive =
        frostRelevant ||
        data.disease?.active ||
        (data.wind?.active && !isAlertStale(data.wind)) ||
        (data.heat?.active && !isAlertStale(data.heat)) ||
        (data.rain?.active && !isAlertStale(data.rain)) ||
        (data.drought?.active && !isAlertStale(data.drought));
      if (!anyActive)
        html =
          '<p style="color:var(--accent);">\u2705 Nicio alert\u0103. Totul e \u00EEn regul\u0103!</p>';
    } else {
      html =
        '<p style="color:var(--text-dim);">Alertele necesit\u0103 conexiune.</p>';
    }
    alerteEl.innerHTML = html;
  }

  // C. Meteo rapid + prognoza 3 zile cu spray score
  if (meteoEl) {
    if (
      meteoRes.status === "fulfilled" &&
      meteoRes.value &&
      meteoRes.value.current
    ) {
      var md = meteoRes.value; // fetchMeteoData returneaza JSON direct
      var cc = md.current;
      var score = calculateSprayScore(
        cc.temperature_2m,
        cc.wind_speed_10m,
        cc.precipitation,
        cc.relative_humidity_2m,
      );
      var sl = sprayLabel(score);
      meteoEl.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
        '<span style="font-size:36px;">' +
        wmoEmoji(cc.weather_code) +
        "</span>" +
        '<span style="font-size:1.4rem;font-weight:600;">' +
        Math.round(cc.temperature_2m) +
        "\u00B0C</span>" +
        '<span style="color:var(--text-dim);">' +
        (WMO_CODES[cc.weather_code] || "") +
        " \u2022 " +
        Math.round(cc.wind_speed_10m) +
        " km/h</span>" +
        '<span class="' +
        sl.cls +
        '" style="font-weight:600;">Stropire: ' +
        sl.text +
        " (" +
        score +
        ")</span>" +
        "</div>";
      // Prognoza 3 zile cu spray score
      if (md.daily && md.daily.time) {
        var ZILE = ["Du", "Lu", "Ma", "Mi", "Jo", "Vi", "S\u00E2"];
        var fc = "";
        for (var i = 0; i < md.daily.time.length; i++) {
          var dt = new Date(md.daily.time[i] + "T12:00");
          var tMax = Math.round(md.daily.temperature_2m_max[i]);
          var tMin = Math.round(md.daily.temperature_2m_min[i]);
          var prec = md.daily.precipitation_sum[i];
          var wMax = md.daily.wind_speed_10m_max
            ? Math.round(md.daily.wind_speed_10m_max[i])
            : 0;
          var hum = md.daily.relative_humidity_2m_mean
            ? Math.round(md.daily.relative_humidity_2m_mean[i])
            : 60;
          var ds = calculateSprayScore((tMax + tMin) / 2, wMax, prec, hum);
          var dsl = sprayLabel(ds);
          fc +=
            '<div class="mf-day"><div style="font-size:0.75rem;color:var(--text-dim);">' +
            ZILE[dt.getDay()] +
            "</div>" +
            '<div style="font-size:1.2rem;">' +
            wmoEmoji(md.daily.weather_code[i]) +
            "</div>" +
            '<div style="font-size:0.82rem;">' +
            tMax +
            "\u00B0/" +
            tMin +
            "\u00B0</div>" +
            '<div class="' +
            dsl.cls +
            '" style="font-size:0.72rem;font-weight:600;">' +
            dsl.text +
            "</div>" +
            "</div>";
        }
        meteoEl.innerHTML +=
          '<div class="meteo-forecast" style="margin-top:10px;">' +
          fc +
          "</div>";
      }
    } else {
      meteoEl.innerHTML = '<p style="color:var(--text-dim);">Offline</p>';
    }
  }
  // Backup reminder
  checkBackupReminder();

  // N8 + N11: GDD Calculator + Chill Hours (date meteo history)
  var aziContainer = document.getElementById("sfatulLunii");
  if (aziContainer && aziContainer.parentElement) {
    loadMeteoHistoryForWidgets()
      .then(function (hist) {
        renderChillHoursWidget(aziContainer.parentElement, hist);
        renderGDDWidget(aziContainer.parentElement, hist);
      })
      .catch(function () {});
  }

  // N2: Spray window 7 zile
  renderSprayWindow();

  // N10: Disease risk per species (din datele meteo deja incarcate)
  if (
    meteoRes.status === "fulfilled" &&
    meteoRes.value &&
    meteoRes.value.daily
  ) {
    var risks = assessDiseaseRisks(meteoRes.value.daily);
    if (risks.length > 0 && alerteEl) {
      var riskHtml = '<div style="margin-top:8px;">';
      risks.forEach(function (r) {
        riskHtml +=
          '<div style="margin:4px 0;padding:8px 12px;background:var(--bg-surface);' +
          "border-left:3px solid " +
          r.levelColor +
          ';border-radius:0 8px 8px 0;">' +
          '<div style="font-weight:700;font-size:0.82rem;color:' +
          r.levelColor +
          ';">' +
          r.label +
          " — RISC " +
          r.level +
          "</div>" +
          '<div style="font-size:0.78rem;color:var(--text-dim);">Specii: ' +
          r.species +
          "</div>" +
          '<div style="font-size:0.78rem;">💊 ' +
          r.treatment +
          "</div>" +
          "</div>";
      });
      riskHtml += "</div>";
      alerteEl.innerHTML += riskHtml;
    }
  }

  // F3.2 — Nopti consecutive cu frost — UI indicator
  if (alertRes.status === "fulfilled" && alertRes.value) {
    try {
      // Re-read — alertRes.value a fost deja consumat prin .json(), dar datele sunt in 'data' de mai sus
    } catch (e) {}
  }

  // F6.4 — Rezumat meteo saptamanal (date din meteo-history Redis)
  renderWeeklySummary(aziContainer);

  // F6.1 — Calendar tratamente predictiv (bazat pe GDD + meteo + jurnal)
  if (aziContainer && aziContainer.parentElement) {
    try {
      var histForCal = await loadMeteoHistoryForWidgets();
      renderPredictiveCalendar(
        aziContainer.parentElement,
        histForCal,
        _frostDataForCalendar,
      );
    } catch (e) {
      livadaLog("ERR", "predictiveCalendar", "FAIL", e.message);
    }
  }

  // F6.5 — Notificare locala frost (daca alerta e activa + permisiune acordata)
  if (alertRes.status === "fulfilled" && alertRes.value) {
    try {
      // Verificam din DOM — alerta a fost deja randata
      var frostEl = document.querySelector(".alert-danger");
      if (
        frostEl &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        var frostMsg = frostEl.textContent || "Risc de inghet detectat";
        new Notification("Alerta Livada \u2014 Inghet!", {
          body: frostMsg.substring(0, 150),
          icon: "/icon-192.png",
        });
        livadaLog("FROST", "push-notification", "SENT");
      }
    } catch (e) {
      livadaLog("ERR", "frost-notification", "FAIL", e.message);
    }
  }
}

// F6.4 — Rezumat meteo saptamanal din history
async function renderWeeklySummary(container) {
  if (!container || !container.parentElement) return;
  try {
    var hist = await loadMeteoHistoryForWidgets();
    if (!hist || typeof hist !== "object") return;
    var dates = Object.keys(hist).sort().slice(-7);
    if (dates.length < 3) return; // prea putine date

    var totalRain = 0,
      totalGdd = 0,
      frostDays = 0,
      hotDays = 0,
      sumHum = 0;
    dates.forEach(function (d) {
      var h = hist[d];
      totalRain += h.rain || 0;
      var tMin = h.temp_min ?? h.temp;
      var tMax = h.temp_max ?? h.temp;
      var tAvg = (tMin + tMax) / 2;
      totalGdd += Math.max(0, tAvg - 10);
      if (tMin < 0) frostDays++;
      if (tMax > 25) hotDays++;
      sumHum += h.humidity || 60;
    });
    var avgHum = Math.round(sumHum / dates.length);

    var el = document.getElementById("weeklySummaryWidget");
    if (!el) {
      el = document.createElement("div");
      el.id = "weeklySummaryWidget";
      el.style.cssText =
        "background:var(--bg-surface);border-radius:12px;padding:14px;margin-top:16px;border:1px solid var(--border);";
      container.parentElement.appendChild(el);
    }
    el.innerHTML =
      '<h4 style="margin:0 0 8px;font-size:0.92rem;color:var(--accent);">\uD83D\uDCC5 S\u0103pt\u0103m\u00E2na \u00EEn rezumat (' +
      dates[0] +
      " \u2014 " +
      dates[dates.length - 1] +
      ")</h4>" +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;font-size:0.82rem;">' +
      "<div>GDD acumulat: <strong>+" +
      Math.round(totalGdd) +
      "</strong></div>" +
      "<div>Ploaie total\u0103: <strong>" +
      Math.round(totalRain * 10) / 10 +
      "mm</strong></div>" +
      "<div>Zile \u00EEnghe\u021B: <strong>" +
      frostDays +
      "</strong></div>" +
      "<div>Zile >25\u00B0C: <strong>" +
      hotDays +
      "</strong></div>" +
      "<div>Umiditate medie: <strong>" +
      avgHum +
      "%</strong></div>" +
      "</div>";
  } catch (e) {
    livadaLog("ERR", "renderWeeklySummary", "FAIL", e.message);
  }
}

// ====== N2: SPRAY WINDOW 7 ZILE ======
async function renderSprayWindow() {
  var container = document.getElementById("sprayWindow");
  if (!container) return;
  if (!navigator.onLine) {
    container.innerHTML =
      '<p style="font-size:0.78rem;color:var(--text-dim);">Indisponibil offline</p>';
    return;
  }
  try {
    var res = await fetchWithTimeout(
      "https://api.open-meteo.com/v1/forecast?latitude=" +
        LIVADA_LAT +
        "&longitude=" +
        LIVADA_LON +
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean,weather_code" +
        "&timezone=Europe/Bucharest&forecast_days=7",
      {},
      8000,
    );
    if (!res.ok) throw new Error("meteo " + res.status);
    var d = await res.json();
    var ZILE = ["Du", "Lu", "Ma", "Mi", "Jo", "Vi", "Sâ"];
    var todayStr = new Date().toISOString().split("T")[0];
    var html =
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">';
    for (var i = 0; i < 7; i++) {
      var dt = new Date(d.daily.time[i] + "T12:00");
      var tMax = d.daily.temperature_2m_max[i];
      var tMin = d.daily.temperature_2m_min[i];
      var prec = d.daily.precipitation_sum[i];
      var wind = d.daily.wind_speed_10m_max[i];
      var hum = d.daily.relative_humidity_2m_mean
        ? d.daily.relative_humidity_2m_mean[i]
        : 60;
      var score = calculateSprayScore((tMax + tMin) / 2, wind, prec, hum);
      var sl = sprayLabel(score);
      var isToday = d.daily.time[i] === todayStr;
      html +=
        '<div style="text-align:center;padding:6px 2px;border-radius:8px;' +
        (score >= 80
          ? "background:rgba(106,191,105,0.15);border:1px solid var(--accent);"
          : score >= 50
            ? "background:var(--bg-surface);border:1px solid transparent;"
            : "opacity:0.55;border:1px solid transparent;") +
        (isToday ? "outline:2px solid var(--accent);" : "") +
        '">' +
        '<div style="font-size:0.65rem;color:var(--text-dim);">' +
        ZILE[dt.getDay()] +
        "</div>" +
        '<div style="font-size:1rem;">' +
        wmoEmoji(d.daily.weather_code[i]) +
        "</div>" +
        '<div style="font-size:0.7rem;">' +
        Math.round(tMax) +
        "°</div>" +
        '<div class="' +
        sl.cls +
        '" style="font-size:0.6rem;font-weight:700;margin-top:2px;">' +
        score +
        "</div>" +
        "</div>";
    }
    html +=
      '</div><p style="font-size:0.68rem;color:var(--text-dim);margin-top:6px;">Scor stropire 0-100 (verde=ideal, gri=evita)</p>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML =
      '<p style="font-size:0.78rem;color:var(--text-dim);">Indisponibil offline</p>';
  }
}

// ====== BACKUP & RESTORE (B3) ======
function backupData() {
  var backup = {};
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k.startsWith("livada-") && !k.includes("token") && !k.includes("key")) {
      backup[k] = localStorage.getItem(k);
    }
  }
  var blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "livada-backup-" + todayLocal() + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
  localStorage.setItem("livada-last-backup", String(Date.now()));
  localStorage.setItem(
    "livada-entries-at-backup",
    String(getJurnalEntries().length),
  );
}
function checkBackupReminder() {
  var lastBackup = parseInt(localStorage.getItem("livada-last-backup") || "0");
  var entriesAtBackup = parseInt(
    localStorage.getItem("livada-entries-at-backup") || "0",
  );
  var currentEntries = getJurnalEntries().length;
  var daysSince = lastBackup
    ? Math.floor((Date.now() - lastBackup) / 86400000)
    : 999;
  var newEntries = currentEntries - entriesAtBackup;
  if (daysSince > 7 || newEntries >= 10) {
    var el = document.getElementById("backupReminder");
    if (el) {
      var msg =
        daysSince > 30
          ? "Nu ai f\u0103cut niciodat\u0103 backup!"
          : "Ultimul backup: acum " +
            daysSince +
            " zile" +
            (newEntries > 0
              ? " (" + newEntries + " interven\u021Bii noi)"
              : "");
      el.innerHTML =
        '<div class="alert alert-warning"><strong>\uD83D\uDCBE Backup recomandat</strong> ' +
        msg +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
        '<button class="btn btn-primary" style="padding:4px 12px;font-size:0.75rem;" onclick="backupData();this.closest(\'.alert\').style.display=\'none\';">Backup acum</button>' +
        '<button class="btn btn-secondary" style="padding:4px 12px;font-size:0.75rem;" onclick="this.closest(\'.alert\').style.display=\'none\';">Mai t\u00E2rziu</button></div></div>';
    }
  }
}
function restoreData(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);
      var RESTORE_SAFE_KEYS = [
        "livada-jurnal",
        "livada-theme",
        "livada-last-backup",
        "livada-costs",
        "livada-checklist",
        "livada-backup-reminder",
      ];
      var keys = Object.keys(data).filter(function (k) {
        return RESTORE_SAFE_KEYS.includes(k);
      });
      if (keys.length === 0) {
        alert("Fisier invalid.");
        return;
      }
      if (
        !confirm(
          "Restaurez " +
            keys.length +
            " chei? Datele curente vor fi suprascrise.",
        )
      )
        return;
      keys.forEach(function (k) {
        localStorage.setItem(k, data[k]);
      });
      alert("Restaurare completa! " + keys.length + " chei restaurate.");
      location.reload();
    } catch (err) {
      alert("Eroare: fisier JSON invalid.");
    }
  };
  reader.readAsText(file);
  input.value = "";
}

// ====== CHECKLIST PRE-STROPIRE (B5) ======
function openChecklist() {
  var overlay = document.getElementById("modal-checklist");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "modal-checklist";
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<div class="modal"><div class="modal-header">' +
      "<h2>\u2705 Checklist pre-stropire</h2>" +
      '<button class="modal-close" aria-label="Inchide" onclick="closeModal(\'checklist\')">\u2715</button></div>' +
      '<div class="modal-body">' +
      '<p style="margin-bottom:12px;color:var(--text-dim);">Verific\u0103 toate punctele \u00EEnainte de stropire:</p>' +
      '<label class="ck-item"><input type="checkbox" class="ck-box"> Meteo verificat (f\u0103r\u0103 ploaie 4-6h)</label>' +
      '<label class="ck-item"><input type="checkbox" class="ck-box"> V\u00E2nt sub 15 km/h</label>' +
      '<label class="ck-item"><input type="checkbox" class="ck-box"> Echipament protec\u021Bie (m\u0103nu\u0219i, masc\u0103, ochelari)</label>' +
      '<label class="ck-item"><input type="checkbox" class="ck-box"> Doze calculate corect (folosit calculatorul)</label>' +
      '<label class="ck-item"><input type="checkbox" class="ck-box"> Pomii nu au flori deschise (dac\u0103 e primavar\u0103)</label>' +
      '<label class="ck-item"><input type="checkbox" class="ck-box"> Solu\u021Bie preparat\u0103 corect (\u00EEn ordinea indicat\u0103)</label>' +
      '<button class="btn btn-primary" id="ckStartBtn" style="width:100%;margin-top:16px;" disabled onclick="startStropire()">Toate bifate \u2192 \u00CEncepe stropirea</button>' +
      "</div></div>";
    document.body.appendChild(overlay);
    overlay.querySelectorAll(".ck-box").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var all = overlay.querySelectorAll(".ck-box");
        var allChecked = Array.from(all).every(function (c) {
          return c.checked;
        });
        document.getElementById("ckStartBtn").disabled = !allChecked;
      });
    });
  }
  overlay.querySelectorAll(".ck-box").forEach(function (cb) {
    cb.checked = false;
  });
  document.getElementById("ckStartBtn").disabled = true;
  openModal("checklist");
}
function startStropire() {
  var ckBody = document.querySelector("#modal-checklist .modal-body");
  var existing = document.getElementById("ck-note-area");
  if (existing) {
    existing.querySelector("textarea").focus();
    return;
  }
  var div = document.createElement("div");
  div.id = "ck-note-area";
  div.style.marginTop = "16px";
  div.innerHTML =
    '<label style="font-size:0.85rem;color:var(--text-dim);">Ce tratament aplici?</label>' +
    '<textarea id="ckNote" rows="3" placeholder="Produse, doze, specii..." style="width:100%;padding:10px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-family:inherit;margin-top:4px;box-sizing:border-box;"></textarea>' +
    '<div style="display:flex;gap:8px;margin-top:8px;">' +
    '<button class="btn btn-primary" style="flex:1;" onclick="confirmStropire()">&#128393; \u00CEnregistreaz\u0103</button>' +
    '<button class="btn btn-secondary" onclick="document.getElementById(\'ck-note-area\').remove();">Anuleaz\u0103</button></div>';
  if (ckBody) ckBody.appendChild(div);
  div.querySelector("textarea").focus();
}
function confirmStropire() {
  var note = document.getElementById("ckNote").value.trim();
  if (!note) {
    showToast("Completeaz\u0103 ce tratament aplici.");
    return;
  }
  var entries = getJurnalEntries();
  entries.unshift({
    id: Date.now(),
    date: todayLocal(),
    type: "tratament",
    note: note,
  });
  saveJurnalEntries(entries);
  syncJournal();
  closeModal("checklist");
  showToast("Tratament \u00EEnregistrat \u00EEn jurnal!");
}

// ====== PRINT FISA TEREN (B4) ======
// ====== QUICK-ADD JURNAL ======
function quickAddJurnal() {
  var container = document.getElementById("quickAddArea");
  if (container.style.display === "block") {
    container.style.display = "none";
    return;
  }
  container.style.display = "block";
  container.innerHTML =
    '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:end;">' +
    '<select id="qaType" style="padding:8px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
    '<option value="tratament">Tratament</option><option value="tundere">Tundere</option>' +
    '<option value="fertilizare">Fertilizare</option><option value="irigare">Irigare</option>' +
    '<option value="recoltare">Recoltare</option><option value="observatie">Observatie</option></select>' +
    '<input id="qaNote" type="text" placeholder="Ce ai facut?" style="flex:1;min-width:150px;padding:8px 10px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.85rem;">' +
    '<button class="btn btn-primary" style="padding:8px 14px;" onclick="submitQuickAdd()">+</button></div>';
  container.querySelector("#qaNote").focus();
}
function submitQuickAdd() {
  var note = document.getElementById("qaNote").value.trim();
  if (!note) return;
  var type = document.getElementById("qaType").value;
  var entries = getJurnalEntries();
  entries.unshift({
    id: Date.now(),
    date: todayLocal(),
    type: type,
    note: note,
  });
  saveJurnalEntries(entries);
  syncJournal();
  document.getElementById("quickAddArea").style.display = "none";
  showToast("Adaugat in jurnal!");
}

function printFisa() {
  var name = SPECIES[activeSpeciesId] || "Plan Livada";
  var content = document.getElementById(activeSpeciesId);
  if (!content) return;
  var clone = content.cloneNode(true);
  clone
    .querySelectorAll(
      "#sp-tools-section, #report-section, .sp-tools, button, input, select, textarea, .ai-load, .ai-res, .gal-upload, .gal-grid, .sync-badge, [onclick]",
    )
    .forEach(function (el) {
      el.remove();
    });
  var win = window.open("", "", "width=800,height=600");
  if (!win) {
    showToast("Deblocheaza popup-urile pentru print.");
    return;
  }
  win.document.write(
    "<!DOCTYPE html><html><head><title>Fi\u0219a " +
      escapeHtml(name) +
      "</title>" +
      "<style>body{font-family:Arial,Helvetica,sans-serif;padding:24px;font-size:12px;line-height:1.6;color:#222;}" +
      "h1{color:#2d5016;font-size:18px;border-bottom:2px solid #2d5016;padding-bottom:6px;margin-bottom:4px;}" +
      ".print-meta{color:#666;font-size:10px;margin-bottom:20px;border-bottom:1px solid #ddd;padding-bottom:8px;}" +
      "h2{color:#2d5016;font-size:14px;margin-top:18px;border-bottom:1px solid #ccc;padding-bottom:4px;}" +
      "h3{color:#3a7a3a;font-size:12px;margin-top:14px;}table{width:100%;border-collapse:collapse;margin:8px 0;page-break-inside:avoid;}" +
      "th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;font-size:10px;}th{background:#e8e8e8;}" +
      "tr:nth-child(even) td{background:#f8f8f8;}.alert{border:1px solid #ccc;padding:8px;margin:8px 0;border-radius:4px;font-size:11px;background:#f5f5f5;}" +
      "strong{color:#2d5016;}@media print{body{padding:10px;}}</style></head><body>" +
      "<h1>Fi\u0219a Teren: " +
      escapeHtml(name) +
      "</h1>" +
      '<div class="print-meta">Data: ' +
      new Date().toLocaleDateString("ro-RO") +
      " \u2022 Loca\u021Bie: N\u0103dlac, jud. Arad \u2022 Livada Mea Dashboard</div>" +
      clone.innerHTML +
      "</body></html>",
  );
  win.document.close();
  setTimeout(function () {
    win.print();
  }, 300);
}

// ====== OFFLINE INDICATOR (C1) ======
function updateOnlineStatus() {
  var banner = document.getElementById("offlineBanner");
  if (banner) banner.classList.toggle("active", !navigator.onLine);
  $$("[data-needs-online]").forEach(function (el) {
    el.style.opacity = navigator.onLine ? "1" : "0.4";
    el.disabled = !navigator.onLine;
  });
}
window.addEventListener("online", function () {
  updateOnlineStatus();
  syncJournal();
  checkAlerts();
});
window.addEventListener("offline", updateOnlineStatus);

// ====== MODAL ESCAPE + FOCUS TRAP (C2) ======
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    var open = document.querySelector(".modal-overlay.open");
    if (open) {
      open.classList.remove("open");
      document.body.style.overflow = "";
      if (_lastFocused) {
        _lastFocused.focus();
        _lastFocused = null;
      }
    }
  }
  if (e.key === "Tab") {
    var modal = document.querySelector(".modal-overlay.open .modal");
    if (!modal) return;
    var focusable = modal.querySelectorAll(
      'button, input, textarea, select, [tabindex="0"]',
    );
    if (!focusable.length) return;
    var first = focusable[0],
      last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

// ====== GLOBAL ERROR HANDLER (C4) ======
window.addEventListener("unhandledrejection", function (e) {
  console.error("Unhandled:", e.reason);
  if (e.reason?.name !== "AbortError")
    showToast("Eroare: " + (e.reason?.message || "necunoscut\u0103"));
});

// ====== MOD ACCESIBIL (text mare) ======
function toggleTextSize() {
  var isLarge = document.body.classList.toggle("text-large");
  localStorage.setItem("livada-text-large", isLarge ? "1" : "0");
  var lbl = document.getElementById("textSizeLabel");
  if (lbl) lbl.textContent = isLarge ? "Text normal" : "Text mai mare";
}
(function initTextSize() {
  if (localStorage.getItem("livada-text-large") === "1") {
    document.body.classList.add("text-large");
    var lbl = document.getElementById("textSizeLabel");
    if (lbl) lbl.textContent = "Text normal";
  }
})();

// ====== RECENT SEARCHES ======
var MAX_RECENT = 6;
function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem("livada-recent-search") || "[]");
  } catch {
    return [];
  }
}
function saveRecentSearch(q) {
  if (!q || q.length < 2) return;
  var list = getRecentSearches().filter(function (s) {
    return s !== q;
  });
  list.unshift(q);
  list = list.slice(0, MAX_RECENT);
  localStorage.setItem("livada-recent-search", JSON.stringify(list));
}
function renderRecentSearches() {
  var panel = document.getElementById("recentSearchPanel");
  var pills = document.getElementById("recentPills");
  if (!panel || !pills) return;
  var list = getRecentSearches();
  if (!list.length) {
    panel.style.display = "none";
    return;
  }
  pills.innerHTML = list
    .map(function (s) {
      return (
        '<span class="rs-pill" onclick="applyRecentSearch(\'' +
        s.replace(/'/g, "\\'") +
        "')\">&#128269; " +
        s +
        "</span>"
      );
    })
    .join("");
  panel.style.display = "block";
}
function applyRecentSearch(q) {
  searchInput.value = q;
  document.getElementById("recentSearchPanel").style.display = "none";
  doSearch();
  showSuggestions(q);
}
// Show recent searches when search opens empty
var _origSearchOpen = btnSearch.addEventListener;
btnSearch.addEventListener("click", function () {
  setTimeout(function () {
    if (searchPanel.classList.contains("open") && !searchInput.value.trim()) {
      renderRecentSearches();
    } else {
      var rp = document.getElementById("recentSearchPanel");
      if (rp) rp.style.display = "none";
    }
  }, 50);
});
// Save search when Enter pressed or suggestion picked
searchInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && searchInput.value.trim().length >= 2) {
    saveRecentSearch(searchInput.value.trim());
    var rp = document.getElementById("recentSearchPanel");
    if (rp) rp.style.display = "none";
  }
});
// Also hide recent searches when typing
searchInput.addEventListener("input", function () {
  var rp = document.getElementById("recentSearchPanel");
  if (rp && searchInput.value.trim().length > 0) rp.style.display = "none";
});

// ====== SFAT SEZONIER PER SPECIE ======
var SEASONAL_TIPS = {
  cires: {
    3: "\uD83C\uDF38 Preg\u0103te\u015fte <strong>Chorus 50 WG</strong> \u2014 singurul fungicid eficient la frig contra moniliozei la \u00eenflorit.",
    4: "\uD83D\uDEA8 Florile sunt deschise! Aplic\u0103 <strong>Chorus</strong> anti-monilioz\u0103. Evit\u0103 insecticidele c\u00e2nd sunt albine.",
    5: "\uD83C\uDF3F Dup\u0103 petale: tratament <strong>anti-cilindrosporioz\u0103 (Syllit 400 SC)</strong> \u2014 boala care face g\u0103uri \u00een frunze.",
    6: "\u26A0\uFE0F <strong>Musca cire\u015felor</strong> atac\u0103 acum! Capcane galbene + Karate Zeon dac\u0103 e necesar.",
    7: "\uD83C\uDF52 Recoltare! Cules diminea\u021Ba, f\u0103r\u0103 cozit\u0103 dac\u0103 merge la industrie.",
  },
  visin: {
    4: "\uD83C\uDF38 Aplic\u0103 <strong>Chorus</strong> la \u00eenflorit contra moniliozei.",
    5: "\u26A0\uFE0F <strong>Cilindrosporioza</strong> atac\u0103 acum! Aplic\u0103 Syllit 400 SC preventiv \u2014 frunzele fac g\u0103uri \u015fi cad.",
    7: "\uD83C\uDF52 Recoltare vi\u015fine! Culege r\u0103b\u0103d\u0103tor — se strică rapid dup\u0103 cules.",
    8: "\uD83C\uDF3F Post-recoltare: tratament <strong>anti-cilindrosporioz\u0103</strong> oblig. \u2014 f\u0103r\u0103 el frunzele cad prematur.",
  },
  cais: {
    3: "\uD83D\uDEA8 OBLIGATORIU: tratament <strong>anti-monilioz\u0103 la \u00eenflorit</strong> cu Chorus. Monilioza caisului este devastatoare!",
    4: "\uD83C\uDF38 Florile deschise — aplic\u0103 <strong>Chorus 50 WG</strong> (eficient la frig). Monitorizez\u0103 \u015fi anti-p\u0103duche verde.",
    7: "\uD83C\uDF51 Recoltare aproape! Respect\u0103 pauz\u0103 tratament (\u21927 zile). Culege \u00eenainte de ploaie.",
  },
  piersic: {
    2: "\uD83D\uDEA8 TRATAMENT OBLIGATORIU \u00eenainte de dezmugurire: <strong>anti-b\u0103\u015ficare</strong> (Score 0.02% sau Funguran OH). F\u0103r\u0103 el pierzi frunzele!",
    3: "\u26A0\uFE0F Mugurii umfl\u0103\u021bi? Aplic\u0103 ACUM anti-b\u0103\u015ficare dac\u0103 nu ai f\u0103cut \u00een feb. E ultima \u015fans\u0103!",
    4: "\uD83C\uDF38 \u00CEnflorit piersic! Aplic\u0103 <strong>Chorus</strong> contra moniliozei. F\u0103r\u0103 insecticide pe timp cu albine.",
    8: "\uD83C\uDF51 Recoltare piersici! Culege la primele semne de coacere \u2014 se \u00eenmoaie rapid pe pom.",
  },
  prun: {
    3: "\uD83C\uDF38 Preg\u0103te\u015fte tratament <strong>anti-monilioz\u0103</strong> pentru \u00eenflorit (Chorus sau Switch).",
    9: "\uD83C\uDF51 Recoltare prune! Las\u0103-le cu pruin\u0103 (pojghi\u021b\u0103 alb\u0103) \u2014 semn de \u00eencredere calitate.",
  },
  migdal: {
    2: "\u2744\uFE0F ATEN\u021EIE INGHET! Migdalul \u00eenfloreste primul (feb-mar). La prognoz\u0103 sub -2\u00b0C \u2014 acoper\u0103 cu agrotextil!",
    3: "\uD83C\uDF38 Migdalul e \u00een floare! Protejeaz\u0103 la inghe\u021b. Aplic\u0103 <strong>Chorus</strong> anti-monilioz\u0103.",
  },
  "par-clapp": {
    4: "\uD83C\uDF37 Sezonul <strong>rap\u0103nului</strong> a \u00eenceput! Aplic\u0103 Score sau Captadin. R\u0103p\u0103nul e boala nr.1 a p\u0103rului.",
    7: "\uD83C\uDF50 IMPORTANT: Clapp se recolteaz\u0103 <strong>\u00eenainte de coacere complet\u0103</strong>! L\u0103sat pe pom se f\u0103r\u00e2mi\u021beaz\u0103 (brunificare intern\u0103).",
    8: "\uD83C\uDF50 Recoltare Clapp! Culege c\u00e2nd se \u00eenmoaie u\u015for la ap\u0103sare. NU a\u015ftepta s\u0103 fie galben complet pe pom.",
  },
  "par-williams": {
    4: "\uD83C\uDF37 Protejeaz\u0103 \u00eempotriva <strong>focului bacterian</strong> (Blight). La semne de ramuri \u201ears\u0103\u201d \u2014 taie imediat la 30cm sub infec\u021bie!",
    8: "\uD83C\uDF50 Williams e copt! Culege c\u00e2nd e \u00eenc\u0103 verde-g\u0103lbui. Coace \u00een cas\u0103 3-5 zile \u2014 perfect aromat.",
  },
  "par-hosui": {
    4: "\uD83D\uDD25 Hosui (nas hi) se recolteaz\u0103 LA MATURITATE DEPLIN\u0102 pe pom \u2014 exact invers fa\u021b\u0103 de perii europeni! Nu culege verde.",
    5: "\u2744\uFE0F ATEN\u021EIE: Hosui e mai sensibil la frig dec\u00e2t perii europeni! La prognoz\u0103 sub -20\u00b0C \u2014 protejeaz\u0103 trunchiul.",
  },
  "par-napoca": {
    10: "\uD83C\uDF50 P\u0103r Napoca: recoltare toamn\u0103! Avantaj major \u2014 se p\u0103streaz\u0103 2-4 luni la rece (cel mai bine dintre to\u021bi perii t\u0103i).",
  },
  "mar-florina": {
    4: "\u2705 Florina are <strong>rezisten\u021b\u0103 genetic\u0103 la r\u0103p\u0103n</strong> (gena Vf). Ai nevoie de mai pu\u021bine stropiri dec\u00e2t la alte soiuri de m\u0103r!",
    9: "\uD83C\uDF4E Florina e gata la recoltare! Culege la verdele-ro\u015fcat specific \u2014 nu a\u015ftepta s\u0103 fie ro\u015fu aprins.",
  },
  "mar-golden": {
    4: "\uD83C\uDF37 Golden pe portaltoi M9: r\u0103d\u0103cinile sunt superficiale! Mul\u010be\u015fte obligatoriu la 10-15cm grosime contra gerului.",
    9: "\uD83C\uDF4E Golden Spur: recoltare sept-oct. Culege c\u00e2nd se desprinde u\u015for \u2014 f\u0103r\u0103 s\u0103 tragi.",
  },
  zmeur: {
    5: "\uD83C\uDF31 Zmeur: verific\u0103 lstarii tineri! Dac\u0103 v\u00e2rfurile se usuc\u0103 \u2014 viermele lujerilor (Agrilus). Taie \u015fi arde.",
    7: "\uD83D\uDC9A Recoltare zmeur\u0103! Culege la 1-2 zile \u2014 se stric\u0103 rapid. Capcane anti-Drosophila suzukii obligatorii.",
    2: "\u2702\uFE0F Tundere zmeur! Taie la sol to\u021bi lastarii care au rodit anul trecut (cei lemnificati, maro).",
  },
  "zmeur-galben": {
    7: "\uD83D\uDC9B Zmeur galben remontant: prima recolt\u0103 acum! A doua recolt\u0103 septembrie-octombrie.",
    11: "\u2702\uFE0F Tundere total\u0103 la sol! Taie to\u021bi lastarii \u2014 varianta simpl\u0103 \u015fi eficient\u0103 pentru \u00eencep\u0103tori.",
  },
  mur: {
    5: "\uD83C\uDF31 Cre\u015ftere rapid\u0103 mur! Dac\u0103 nu ai palisa\u021b \u2014 a\u015feaz\u0103 lstarii pe sp\u0103lier acum c\u00e2t sunt flexibili.",
    8: "\u26AB Recoltare mur! Culege c\u00e2nd e complet negru \u015fi se desprinde u\u015for. Atent la Drosophila.",
  },
  "mur-copac": {
    8: "\uD83C\uDF33 Mur copac \u2014 recoltare! Fructele se desprind u\u015for la coacere. Nu necesit\u0103 s\u0103ptur\u0103.",
  },
  afin: {
    4: "\uD83D\uDEA8 CRITIC: Verific\u0103 pH-ul solului! Afinul necesit\u0103 pH 4.0-5.5. La Nadlac solul e alcalin (7.0-8.0). F\u0103r\u0103 acidifiere, afinul moare!",
    6: "\uD83D\uDC99 Recoltare afine \u2014 \u00eenceput! Culege c\u00e2nd au pruin\u0103 alb\u0103-albstruie. Delicat, m\u00e2n\u0103 \u00een bol.",
    5: "\uD83C\uDF27 Afin \u00een floare! Polenizare de albine. Adaug\u0103 stup \u00een apropriere dac\u0103 poti.",
  },
  alun: {
    2: "\uD83C\uDF3F Alunul \u00eenfloreste iarna! Zorn\u0103ie ramurile pe vreme cu v\u00e2nt s\u0103 se distribuie polenul galben.",
    9: "\uD83C\uDF30 Recoltare alune! Culege c\u00e2nd cad singure sau la scuturare u\u015foar\u0103. Usuc\u0103 \u00een strat sub\u021bire.",
  },
  rodiu: {
    2: "\u2702\uFE0F Tundere rodiu: <strong>NUMAI iarna</strong> (ian-feb) sau primavara devreme. Tunderea de var\u0103 = nu roade\u015fte!",
    4: "\uD83C\uDF38 Rodiu \u00eenfloreste mai-iunie. Florile ro\u015fii spectaculoase! Prim\u0103vara devreme nu e rodire, e \u00eenflorire.",
    10: "\uD83C\uDF4F Recoltare rodiu! Rodiu NU se \u00eenmoaie la coacere (ca piersica). Culege c\u00e2nd coaja s-a \u00eent\u0103rit \u015fi are culoare intens\u0103.",
    12: "\u2744\uFE0F Protejeaz\u0103 rodiu la inghet! Mu\u015furoi la baz\u0103 + agrotextil la tulpin\u0103. La Nadlac iernile pot fi periculoase.",
  },
  kaki: {
    4: "\uD83D\uDCA1 Kaki Rojo Brillante se recolteaz\u0103 <strong>\u00eenainte de coacere</strong> (fruct tare, astringent). Postmaturare dup\u0103 recoltare!",
    11: "\u2744\uFE0F ATEN\u021EIE INGHE\u021E: Kaki e sensibil la frig extrem! Protejeaz\u0103 trunchiul cu agrotextil. Hibridul Rosseyanka rezist\u0103 mai bine.",
    10: "\uD83C\uDF6D Recoltare kaki! Culege \u00eenainte de primele \u00eenghe\u021buri serioase. Postmaturare: pune-l cu mere sau banane.",
  },
};

function injectSeasonalTip(tabId, container) {
  var m = new Date().getMonth() + 1; // 1-12
  var tip = SEASONAL_TIPS[tabId] && SEASONAL_TIPS[tabId][m];
  var prev = document.getElementById("seasonal-tip-" + tabId);
  if (prev) prev.remove();
  if (!tip) return;
  var div = document.createElement("div");
  div.id = "seasonal-tip-" + tabId;
  div.className = "seasonal-tip";
  div.innerHTML =
    "<strong>\uD83D\uDCC5 Sfat pentru luna aceasta:</strong> " + tip;
  container.insertBefore(div, container.firstChild);
}

// ====== INIT NEW FEATURES ======
(function initNewFeatures() {
  // Init
  injectSpeciesTools("azi");
  initDashboardAzi();
  updateOnlineStatus();

  // Tab switch — also init Azi when switching to it
  document.addEventListener("click", function (e) {
    var tab = e.target.closest('.tab[data-tab="azi"]');
    if (tab) setTimeout(initDashboardAzi, 50);
  });
  // Check alerts
  setTimeout(function () {
    checkAlerts().catch(function (e) {
      console.error("checkAlerts init:", e);
    });
  }, INIT_ALERTS_DELAY_MS);
  // Sync journal after short delay
  setTimeout(function () {
    syncJournal().catch(function (e) {
      console.error("syncJournal init:", e);
    });
  }, INIT_SYNC_DELAY_MS);
})();

// ====== KEYBOARD SHORTCUTS (P3-6) ======
(function () {
  var SHORTCUTS = {
    j: function () {
      openModal("jurnal");
    },
    c: function () {
      openModal("calendar");
    },
    m: function () {
      openModal("meteo");
    },
    a: function () {
      var tab = document.querySelector('[data-tab="ai-general"]');
      if (tab) tab.click();
    },
    k: function () {
      // Deschide prima sectiune vizibila de specii sau tab-ul azi
      var tab = document.querySelector('[data-tab="azi"]');
      if (tab) tab.click();
    },
    "/": function () {
      // Focus pe search global daca exista, altfel jurnal
      var s = document.getElementById("jurnalSearch");
      if (s) {
        openModal("jurnal");
        setTimeout(function () {
          s.focus();
        }, 200);
      }
    },
    Escape: function () {
      // Inchide orice modal deschis
      var open = document.querySelector(".modal-overlay.open");
      if (open) {
        open.classList.remove("open");
        document.body.style.overflow = "";
      }
      var overlay = document.getElementById("kbHelpOverlay");
      if (overlay) overlay.remove();
    },
    "?": function () {
      toggleKbHelp();
    },
  };

  function toggleKbHelp() {
    var existing = document.getElementById("kbHelpOverlay");
    if (existing) {
      existing.remove();
      return;
    }
    var overlay = document.createElement("div");
    overlay.id = "kbHelpOverlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML =
      '<div style="background:var(--bg-surface);border-radius:12px;padding:24px 28px;max-width:320px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.4);">' +
      '<h3 style="margin:0 0 16px;color:var(--accent);">&#9001; Comenzi rapide</h3>' +
      '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;">' +
      '<tr><td style="padding:4px 0;color:var(--text-dim);width:40px;"><kbd style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;">J</kbd></td><td>Jurnal</td></tr>' +
      '<tr><td><kbd style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;">C</kbd></td><td>Calendar tratamente</td></tr>' +
      '<tr><td><kbd style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;">M</kbd></td><td>Meteo</td></tr>' +
      '<tr><td><kbd style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;">A</kbd></td><td>Tab AI General</td></tr>' +
      '<tr><td><kbd style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;">K</kbd></td><td>Tab Azi</td></tr>' +
      '<tr><td><kbd style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;">/</kbd></td><td>Cauta in jurnal</td></tr>' +
      '<tr><td><kbd style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;">Esc</kbd></td><td>Inchide</td></tr>' +
      '<tr><td><kbd style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;">?</kbd></td><td>Aceasta fereastra</td></tr>' +
      "</table>" +
      '<button onclick="document.getElementById(\'kbHelpOverlay\').remove()" style="margin-top:16px;width:100%;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;">Inchide</button>' +
      "</div>";
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  document.addEventListener("keydown", function (e) {
    // Ignora cand se scrie intr-un input/textarea/select
    var tag = (e.target.tagName || "").toLowerCase();
    if (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      e.target.isContentEditable
    )
      return;
    // Ignora modificatori
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var key = e.key;
    if (SHORTCUTS[key]) {
      e.preventDefault();
      SHORTCUTS[key]();
    }
    if (SHORTCUTS[key.toLowerCase()]) {
      e.preventDefault();
      SHORTCUTS[key.toLowerCase()]();
    }
  });
})();

// ====== LOCALSTORAGE QUOTA MONITOR (P3-7) ======
(function () {
  function checkLocalStorageQuota() {
    try {
      var used = 0;
      for (var k in localStorage) {
        if (!localStorage.hasOwnProperty(k)) continue;
        used += (localStorage.getItem(k) || "").length + k.length;
      }
      // localStorage maxim ~5MB = 5242880 chars (fiecare char = 2 bytes in UTF-16)
      var MAX_CHARS = 2621440; // conservativ: 2.5MB in chars
      var pct = Math.round((used / MAX_CHARS) * 100);
      if (pct >= 90) {
        showToast(
          "\u26A0\uFE0F localStorage " +
            pct +
            "% plin! Exporta jurnalul si sterge date vechi.",
        );
      } else if (pct >= 80) {
        showToast(
          "\uD83D\uDCBE Spatiu local " +
            pct +
            "% ocupat. Considera export jurnal.",
        );
      }
    } catch (e) {}
  }
  // Verifica la start si dupa fiecare adaugare in jurnal
  setTimeout(checkLocalStorageQuota, 3000);
  document.addEventListener("livada-journal-updated", checkLocalStorageQuota);
})();

// ====== N8: GDD CALCULATOR — Caldura acumulata + predictie fenologica ======
var GDD_BASE_TEMP = 10;
var GDD_MILESTONES = {
  cais: [
    { gdd: 80, label: "Dezmugurit", icon: "🌱" },
    { gdd: 120, label: "Inflorire", icon: "🌸" },
    { gdd: 170, label: "Cadere petale", icon: "🌿" },
    { gdd: 230, label: "Legare fructe", icon: "🍏" },
    { gdd: 700, label: "Recolta posibila", icon: "📦" },
  ],
  piersic: [
    { gdd: 100, label: "Dezmugurit", icon: "🌱" },
    { gdd: 150, label: "Inflorire", icon: "🌸" },
    { gdd: 210, label: "Cadere petale", icon: "🌿" },
    { gdd: 280, label: "Legare fructe", icon: "🍏" },
    { gdd: 1050, label: "Recolta posibila", icon: "📦" },
  ],
  cires: [
    { gdd: 70, label: "Dezmugurit", icon: "🌱" },
    { gdd: 100, label: "Inflorire", icon: "🌸" },
    { gdd: 150, label: "Cadere petale", icon: "🌿" },
    { gdd: 600, label: "Recolta posibila", icon: "📦" },
  ],
  visin: [
    { gdd: 80, label: "Dezmugurit", icon: "🌱" },
    { gdd: 120, label: "Inflorire", icon: "🌸" },
    { gdd: 700, label: "Recolta posibila", icon: "📦" },
  ],
  "par-clapp": [
    { gdd: 130, label: "Dezmugurit", icon: "🌱" },
    { gdd: 180, label: "Inflorire", icon: "🌸" },
    { gdd: 250, label: "Legare fructe", icon: "🍏" },
    { gdd: 1100, label: "Recolta posibila", icon: "📦" },
  ],
  "par-williams": [
    { gdd: 130, label: "Dezmugurit", icon: "🌱" },
    { gdd: 185, label: "Inflorire", icon: "🌸" },
    { gdd: 1150, label: "Recolta posibila", icon: "📦" },
  ],
  "par-hosui": [
    { gdd: 140, label: "Dezmugurit", icon: "🌱" },
    { gdd: 190, label: "Inflorire", icon: "🌸" },
    { gdd: 1200, label: "Recolta posibila", icon: "📦" },
  ],
  "par-napoca": [
    { gdd: 135, label: "Dezmugurit", icon: "🌱" },
    { gdd: 185, label: "Inflorire", icon: "🌸" },
    { gdd: 1250, label: "Recolta posibila", icon: "📦" },
  ],
  "mar-florina": [
    { gdd: 150, label: "Dezmugurit", icon: "🌱" },
    { gdd: 200, label: "Inflorire", icon: "🌸" },
    { gdd: 270, label: "Legare fructe", icon: "🍏" },
    { gdd: 1300, label: "Recolta posibila", icon: "📦" },
  ],
  "mar-golden": [
    { gdd: 145, label: "Dezmugurit", icon: "🌱" },
    { gdd: 195, label: "Inflorire", icon: "🌸" },
    { gdd: 1250, label: "Recolta posibila", icon: "📦" },
  ],
  prun: [
    { gdd: 100, label: "Dezmugurit", icon: "🌱" },
    { gdd: 140, label: "Inflorire", icon: "🌸" },
    { gdd: 900, label: "Recolta posibila", icon: "📦" },
  ],
  migdal: [
    { gdd: 60, label: "Dezmugurit (TIMPURIU!)", icon: "⚠️" },
    { gdd: 90, label: "Inflorire", icon: "🌸" },
    { gdd: 800, label: "Recolta posibila", icon: "📦" },
  ],
};

async function loadMeteoHistoryForWidgets() {
  var CACHE_KEY = "livada-meteo-hist-w",
    TS_KEY = "livada-meteo-hist-w-ts";
  var cached = localStorage.getItem(CACHE_KEY);
  var cacheTs = parseInt(localStorage.getItem(TS_KEY) || "0");
  if (cached && Date.now() - cacheTs < 3600000) return JSON.parse(cached);
  if (!navigator.onLine) return cached ? JSON.parse(cached) : {};
  try {
    var res = await fetchWithTimeout("/api/meteo-history?days=90", {}, 8000);
    if (!res.ok) return cached ? JSON.parse(cached) : {};
    var data = await res.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(TS_KEY, String(Date.now()));
    return data;
  } catch (e) {
    return cached ? JSON.parse(cached) : {};
  }
}

function calculateGDD(meteoHistory) {
  var year = new Date().getFullYear();
  var startDate = year + "-03-01";
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
  var speciesId =
    activeSpeciesId && GDD_MILESTONES[activeSpeciesId] ? activeSpeciesId : null;
  var milestones = speciesId ? GDD_MILESTONES[speciesId] : null;
  var currentStage = null,
    nextStage = null;
  if (milestones) {
    for (var i = 0; i < milestones.length; i++) {
      if (gdd >= milestones[i].gdd) currentStage = milestones[i];
      else {
        nextStage = milestones[i];
        break;
      }
    }
  }
  var progressPct = nextStage
    ? Math.min(100, Math.round((gdd / nextStage.gdd) * 100))
    : 100;
  var el = document.createElement("div");
  el.id = "gdd-widget";
  el.className = "alert alert-info";
  el.style.cssText = "margin:10px 0;padding:10px 14px;cursor:pointer;";
  el.setAttribute("title", "GDD acumulate din 1 martie — click pentru detalii");
  el.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    "<strong>🌡️ Căldură acumulată (GDD)</strong>" +
    '<span style="font-size:1.05rem;font-weight:700;color:var(--accent);">' +
    Math.round(gdd) +
    " GDD</span>" +
    "</div>" +
    (currentStage
      ? '<div style="font-size:0.82rem;margin-bottom:3px;">' +
        currentStage.icon +
        " " +
        currentStage.label +
        "</div>"
      : "") +
    (nextStage
      ? '<div style="font-size:0.78rem;color:var(--text-dim);">Următor: ' +
        nextStage.icon +
        " " +
        nextStage.label +
        " (" +
        (nextStage.gdd - Math.round(gdd)) +
        " GDD)</div>"
      : '<div style="font-size:0.78rem;color:var(--accent);">✅ Toate stadiile atinse</div>') +
    '<div style="margin-top:6px;height:4px;background:var(--bg-surface);border-radius:2px;">' +
    '<div style="height:4px;background:var(--accent);border-radius:2px;width:' +
    progressPct +
    '%;transition:width 0.5s;"></div>' +
    "</div>";
  var existing = containerEl.querySelector("#gdd-widget");
  if (existing) existing.replaceWith(el);
  else containerEl.insertBefore(el, containerEl.firstChild);
}

// ====== N11: CHILL HOURS TRACKER ======
var CHILL_REQUIREMENTS = {
  cais: { min: 400, max: 800, label: "Cais" },
  piersic: { min: 600, max: 1200, label: "Piersic" },
  migdal: { min: 300, max: 600, label: "Migdal" },
  cires: { min: 800, max: 1200, label: "Cireş" },
  visin: { min: 600, max: 1000, label: "Vişin" },
  prun: { min: 700, max: 1200, label: "Prun" },
  "par-clapp": { min: 900, max: 1500, label: "Păr Clapp" },
  "par-williams": { min: 800, max: 1400, label: "Păr Williams" },
  "par-hosui": { min: 700, max: 1300, label: "Păr Hosui" },
  "par-napoca": { min: 800, max: 1400, label: "Păr Napoca" },
  "mar-florina": { min: 900, max: 1500, label: "Măr Florina" },
  "mar-golden": { min: 800, max: 1400, label: "Măr Golden" },
  kaki: { min: 200, max: 500, label: "Kaki Rojo" },
  rodiu: { min: 100, max: 300, label: "Rodiu" },
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
  var startDate = year - 1 + "-11-01";
  var total = 0;
  var dates = Object.keys(meteoHistory).sort();
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i];
    if (d < startDate) continue;
    var month = parseInt(d.split("-")[1]);
    if (month >= 4 && d.startsWith(String(year))) continue;
    var m = meteoHistory[d];
    if (!m || m.temp_min == null) continue;
    total += estimateChillHours(
      parseFloat(m.temp_min),
      parseFloat(m.temp_max || m.temp_min + 10),
    );
  }
  return total;
}

function renderChillHoursWidget(containerEl, meteoHistory) {
  var month = new Date().getMonth() + 1;
  if (month >= 4 && month <= 10) return;
  if (!meteoHistory || !Object.keys(meteoHistory).length) return;
  var chillH = calculateChillHours(meteoHistory);
  var html =
    '<div id="chill-widget" style="margin:10px 0;padding:10px 14px;background:var(--bg-surface);border-radius:10px;border-left:3px solid var(--info);">' +
    '<div style="font-weight:700;margin-bottom:6px;">❄️ Ore de frig: <span style="color:var(--info);">' +
    chillH +
    'h</span> <span style="font-size:0.72rem;color:var(--text-dim);">(din 1 nov, estimat)</span></div>';
  Object.entries(CHILL_REQUIREMENTS).forEach(function (entry) {
    var id = entry[0],
      req = entry[1];
    var pct = Math.min(100, Math.round((chillH / req.min) * 100));
    var barColor =
      pct >= 100
        ? "var(--accent)"
        : pct >= 70
          ? "var(--warning)"
          : "var(--danger)";
    var status = pct >= 100 ? "✅" : pct >= 70 ? "⚠️" : "❌";
    html +=
      '<div style="margin:4px 0;">' +
      '<div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:2px;">' +
      "<span>" +
      status +
      " " +
      req.label +
      '</span><span style="color:var(--text-dim);">' +
      pct +
      "% din " +
      req.min +
      "h</span></div>" +
      '<div style="height:3px;background:var(--border);border-radius:2px;">' +
      '<div style="height:3px;background:' +
      barColor +
      ";border-radius:2px;width:" +
      pct +
      '%;"></div></div></div>';
  });
  if (chillH < 500)
    html +=
      '<div style="margin-top:6px;font-size:0.78rem;color:var(--warning);">⚠️ Iarnă caldă! Piersicul şi caisul pot inflori neregulat.</div>';
  html += "</div>";
  var existing = containerEl.querySelector("#chill-widget");
  var el = document.createElement("div");
  el.innerHTML = html;
  if (existing) existing.replaceWith(el.firstChild);
  else containerEl.insertBefore(el.firstChild, containerEl.firstChild);
}

// ====== N9: PLANNER SAPTAMANAL ======
async function openWeeklyPlanner() {
  openModal("planner");
  var body = document.getElementById("plannerBody");
  body.innerHTML =
    '<div class="ai-load"><div class="ai-spin"></div><br>Se încarcă prognoza...</div>';
  try {
    var url =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      LIVADA_LAT +
      "&longitude=" +
      LIVADA_LON +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_max,weather_code" +
      "&timezone=Europe%2FBucharest&forecast_days=7";
    var res = await fetchWithTimeout(url, {}, 10000);
    var data = await res.json();
    var journal = getJurnalEntries();
    var today = todayLocal();
    var html =
      '<p style="font-size:0.75rem;color:var(--text-dim);margin-bottom:10px;">' +
      'Scor spray: <span style="color:var(--accent-glow)">≥70% ideal</span> | ' +
      '<span style="color:var(--warning)">40-69% acceptabil</span> | ' +
      '<span style="color:var(--danger)">&lt;40% evită</span></p>';
    for (var i = 0; i < 7; i++) {
      var dateStr = data.daily.time[i];
      var tmax = data.daily.temperature_2m_max[i];
      var tmin = data.daily.temperature_2m_min[i];
      var rain = data.daily.precipitation_sum[i] || 0;
      var wind = data.daily.wind_speed_10m_max[i] || 0;
      var hum = data.daily.relative_humidity_2m_max[i] || 60;
      var score = calculateSprayScore(tmax, wind, rain, hum);
      var scoreColor =
        score >= 70
          ? "color:var(--accent-glow)"
          : score >= 40
            ? "color:var(--warning)"
            : "color:var(--danger)";
      var jEntries = journal.filter(function (e) {
        return e.date === dateStr;
      });
      var isToday = dateStr === today;
      var dateObj = new Date(dateStr + "T12:00:00");
      var dayName = ["Du", "Lu", "Ma", "Mi", "Jo", "Vi", "Sâ"][
        dateObj.getDay()
      ];
      var dayNum =
        dateObj.getDate() +
        "." +
        String(dateObj.getMonth() + 1).padStart(2, "0");
      html +=
        '<div style="padding:9px 0;border-bottom:1px solid var(--border);' +
        (isToday
          ? "background:rgba(106,191,105,0.06);padding:9px 8px;margin:1px 0;border-radius:8px;"
          : "") +
        '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">' +
        '<div><span style="font-size:0.78rem;">' +
        dayName +
        "</span> " +
        '<strong style="' +
        (isToday ? "color:var(--accent-glow)" : "") +
        '">' +
        (isToday ? "📍 " : "") +
        dayNum +
        "</strong>" +
        '<span style="font-size:0.72rem;color:var(--text-dim);margin-left:5px;">' +
        Math.round(tmin) +
        "°/" +
        Math.round(tmax) +
        "°" +
        (rain > 0 ? " 🌧️ " + Math.round(rain * 10) / 10 + "mm" : "") +
        " 💨 " +
        Math.round(wind) +
        "km/h</span></div>" +
        '<span style="font-size:0.82rem;font-weight:700;' +
        scoreColor +
        '">Spray ' +
        score +
        "%</span>" +
        "</div>";
      if (jEntries.length > 0) {
        html +=
          '<div style="font-size:0.75rem;color:var(--accent);margin-top:2px;">📋 ' +
          jEntries
            .map(function (e) {
              return (
                "[" +
                e.type +
                "] " +
                (e.note
                  ? e.note.substring(0, 40) + (e.note.length > 40 ? "…" : "")
                  : "")
              );
            })
            .join(" | ") +
          "</div>";
      }
      html += "</div>";
    }
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML =
      '<p style="color:var(--danger);">Eroare la încarcare prognoză. Verifică conexiunea.</p>';
  }
}

// ====== N10: RISC BOALA PER SPECIE ======
var DISEASE_RULES = [
  {
    id: "monilioza",
    label: "Monilioză (putregai brun)",
    species: "Cais, Piersic, Cireş, Vişin, Prun",
    condition: function (t, h, r) {
      return t >= 15 && t <= 28 && r >= 3 && h >= 75;
    },
    isHigh: function (t, h, r) {
      return t >= 18 && r >= 5 && h >= 80;
    },
    treatment: "Teldor 500 SC (1g/L) sau Switch 62.5 WG (0.8g/L)",
    timing: "24-48h după ploaie",
  },
  {
    id: "rapan",
    label: "Răpan (Venturia)",
    species: "Măr, Păr",
    condition: function (t, h, r) {
      return t >= 8 && t <= 22 && r >= 3 && h >= 78;
    },
    isHigh: function (t, h, r) {
      return t >= 12 && r >= 5 && h >= 85;
    },
    treatment: "Captan 80 WG (2g/L) sau Merpan 80 WDG (2g/L)",
    timing: "INAINTE de ploaie (preventiv!) sau max 24h după",
  },
  {
    id: "fainare",
    label: "Făinare (Podosphaera)",
    species: "Măr, Păr, Piersic, Cireş",
    condition: function (t, h, r) {
      return t >= 18 && t <= 28 && h >= 50 && h <= 75 && r < 2;
    },
    isHigh: function (t, h, r) {
      return t >= 22 && h >= 55 && r === 0;
    },
    treatment: "Topas 100 EC (0.4ml/L) sau sulf muiabil 0.3%",
    timing: "Timp uscat, dimineața devreme",
  },
  {
    id: "patarea",
    label: "Pătarea frunzelor (Blumeriella)",
    species: "Vişin, Cireş",
    condition: function (t, h, r) {
      return t >= 16 && r >= 2 && h >= 76;
    },
    isHigh: function (t, h, r) {
      return t >= 20 && r >= 4;
    },
    treatment: "Merpan 80 WDG (2g/L) sau zeamă bordeleză 0.5%",
    timing: "24h după ploaie continuă",
  },
];

function assessDiseaseRisks(dailyData) {
  if (!dailyData || !dailyData.time) return [];
  var n = Math.min(3, dailyData.time.length);
  if (n === 0) return [];
  var sumT = 0,
    totalRain = 0,
    maxHum = 0;
  for (var i = 0; i < n; i++) {
    sumT +=
      (dailyData.temperature_2m_max[i] + dailyData.temperature_2m_min[i]) / 2;
    totalRain += dailyData.precipitation_sum[i] || 0;
    if (dailyData.relative_humidity_2m_mean)
      maxHum = Math.max(maxHum, dailyData.relative_humidity_2m_mean[i] || 0);
  }
  var avgT = sumT / n;
  if (maxHum === 0) maxHum = 70;
  var rainyH = Math.min(24, (totalRain / n) * 4);
  return DISEASE_RULES.filter(function (r) {
    return r.condition(avgT, maxHum, rainyH);
  }).map(function (r) {
    var high = r.isHigh(avgT, maxHum, rainyH);
    return {
      label: r.label,
      level: high ? "MARE" : "MEDIU",
      levelColor: high ? "var(--danger)" : "var(--warning)",
      species: r.species,
      treatment: r.treatment,
      timing: r.timing,
    };
  });
}

// ====== F6.1: CALENDAR TRATAMENTE PREDICTIV ======
// Fenofaze per specie (GDD thresholds orientative zona Nadlac, Campia de Vest)
var PHENOPHASE_DATA = {
  cires: [
    { gdd: 50, phase: "Boboc inchis", action: "Tratament cupru preventiv" },
    {
      gdd: 85,
      phase: "Boboc alb",
      action: "Protectie anti-inghet daca T < 0\u00B0C",
    },
    {
      gdd: 120,
      phase: "Inflorire plina",
      action: "NU aplica insecticide! Protejeaza albinele",
    },
    {
      gdd: 200,
      phase: "Cadere petale",
      action: "Tratament anti-monilia (Signum/Switch)",
    },
    { gdd: 400, phase: "Fructe 1cm", action: "Tratament anti-musca ciresului" },
  ],
  cais: [
    { gdd: 30, phase: "Boboc roz", action: "Tratament cupru (Bordolez 1%)" },
    {
      gdd: 60,
      phase: "Inflorire",
      action: "NU trata! Protectie anti-inghet la T < -1\u00B0C",
    },
    {
      gdd: 150,
      phase: "Cadere petale",
      action: "Tratament anti-monilia + anti-afide",
    },
    {
      gdd: 350,
      phase: "Fructe verzi",
      action: "Tratament contra viermilor (Coragen)",
    },
  ],
  piersic: [
    {
      gdd: 40,
      phase: "Boboc roz",
      action: "Tratament anti-clasterosporiu (cupru)",
    },
    {
      gdd: 70,
      phase: "Inflorire",
      action: "NU trata! Protectie inghet la T < -1\u00B0C",
    },
    {
      gdd: 160,
      phase: "Cadere petale",
      action: "Tratament anti-monilia + anti-afide verzi",
    },
    {
      gdd: 300,
      phase: "Fructe 2cm",
      action: "Tratament Topsin/Score anti-putregai",
    },
  ],
  prun: [
    { gdd: 60, phase: "Boboc alb", action: "Tratament cupru preventiv" },
    {
      gdd: 100,
      phase: "Inflorire",
      action: "NU trata! Protejeaza polenizatorii",
    },
    {
      gdd: 200,
      phase: "Cadere petale",
      action: "Tratament anti-sfarma (viermele prunului)",
    },
    {
      gdd: 500,
      phase: "Fructe virate",
      action: "Ultimul tratament inainte de PHI",
    },
  ],
  "mar-florina": [
    {
      gdd: 70,
      phase: "Boboc roz",
      action: "Tratament anti-rapan (Delan/Captan)",
    },
    { gdd: 120, phase: "Inflorire", action: "NU aplica insecticide!" },
    { gdd: 200, phase: "Cadere petale", action: "Anti-rapan + anti-paduchi" },
    {
      gdd: 400,
      phase: "Fructe aluna",
      action: "Tratament anti-viermele merelor (Coragen)",
    },
  ],
  "mar-golden": [
    {
      gdd: 70,
      phase: "Boboc roz",
      action: "Tratament anti-rapan (Delan/Captan)",
    },
    { gdd: 120, phase: "Inflorire", action: "NU aplica insecticide!" },
    { gdd: 200, phase: "Cadere petale", action: "Anti-rapan + anti-paduchi" },
    {
      gdd: 400,
      phase: "Fructe aluna",
      action: "Tratament anti-viermele merelor (Coragen)",
    },
  ],
};

// Render calendar predictiv in tab Azi
function renderPredictiveCalendar(containerEl, meteoHistory, frostData) {
  if (!containerEl || !meteoHistory) return;
  var speciesId = activeSpeciesId;
  var phases = PHENOPHASE_DATA[speciesId];
  if (!phases) return; // doar pentru specii cu date fenofaze

  var gdd = calculateGDD(meteoHistory);
  var currentPhase = null,
    nextPhase = null;
  for (var i = 0; i < phases.length; i++) {
    if (gdd >= phases[i].gdd) currentPhase = phases[i];
    else {
      nextPhase = phases[i];
      break;
    }
  }
  if (!currentPhase && !nextPhase) return;

  // Verifica jurnal — ultima interventie
  var jurnalEntries = getJurnalEntries();
  var lastAction = null;
  for (var j = jurnalEntries.length - 1; j >= 0; j--) {
    if (
      jurnalEntries[j].type === "tratament" ||
      jurnalEntries[j].type === "stropire"
    ) {
      lastAction = jurnalEntries[j];
      break;
    }
  }
  var daysSinceLast = lastAction
    ? Math.floor((Date.now() - new Date(lastAction.date).getTime()) / 86400000)
    : null;

  // Frost risk din prognoza
  var frostRisk = frostData && frostData.frost && frostData.frost.active;

  var el = document.getElementById("predictive-calendar");
  if (!el) {
    el = document.createElement("div");
    el.id = "predictive-calendar";
    el.style.cssText =
      "background:var(--bg-surface);border-radius:12px;padding:14px;margin-top:16px;border:1px solid var(--accent);";
    containerEl.appendChild(el);
  }

  var speciesName = SPECIES[speciesId] || speciesId;
  var html =
    '<h4 style="margin:0 0 8px;font-size:0.92rem;color:var(--accent);">\uD83D\uDCC6 Calendar Predictiv \u2014 ' +
    escapeHtml(speciesName) +
    "</h4>";

  if (currentPhase) {
    html +=
      '<div style="padding:8px;background:var(--bg);border-radius:8px;margin-bottom:8px;">' +
      '<div style="font-weight:600;font-size:0.85rem;">\uD83C\uDF3F Fenofaz\u0103 curent\u0103: ' +
      escapeHtml(currentPhase.phase) +
      " (" +
      Math.round(gdd) +
      " GDD)</div>" +
      '<div style="font-size:0.82rem;margin-top:4px;color:var(--text);">\u27A1 ' +
      escapeHtml(currentPhase.action) +
      "</div></div>";
  }

  if (nextPhase) {
    var gddRemaining = nextPhase.gdd - Math.round(gdd);
    html +=
      '<div style="font-size:0.82rem;color:var(--text-dim);margin-bottom:6px;">' +
      "Urm\u0103toare: " +
      escapeHtml(nextPhase.phase) +
      " (peste ~" +
      gddRemaining +
      " GDD)" +
      "</div>";
  }

  // Avertizari contextuale
  if (
    frostRisk &&
    currentPhase &&
    (currentPhase.phase.includes("Boboc") ||
      currentPhase.phase.includes("Inflorire"))
  ) {
    html +=
      '<div class="alert alert-danger" style="margin-top:8px;font-size:0.82rem;">' +
      "\u26A0 <strong>URGENT:</strong> " +
      escapeHtml(speciesName) +
      " \u00EEn faza " +
      escapeHtml(currentPhase.phase) +
      " + \u00EEnghe\u021B prognozat! Aplic\u0103 protec\u021Bie anti-\u00EEnghe\u021B (aspersie/agrotextil) p\u00E2n\u0103 disear\u0103!</div>";
  }

  if (daysSinceLast !== null && daysSinceLast > 14) {
    html +=
      '<div class="alert alert-warning" style="margin-top:8px;font-size:0.82rem;">' +
      "\u26A0 Ultima interven\u021Bie: acum " +
      daysSinceLast +
      " zile. Verific\u0103 dac\u0103 e momentul unui tratament.</div>";
  } else if (daysSinceLast === null) {
    html +=
      '<div style="font-size:0.78rem;color:var(--text-dim);margin-top:4px;">Nicio interven\u021Bie \u00EEn jurnal. Adaug\u0103 tratamentele pentru recomand\u0103ri mai bune.</div>';
  }

  el.innerHTML = html;
}

// ====== N12: JURNAL VOCAL (Web Speech API) ======
var _voiceRec = null;
function startVoiceInput(targetId) {
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var btn = document.getElementById("voiceDictateBtn");
  if (!SpeechRec) {
    showToast(
      "Dictarea vocală nu este suportată. Foloseste Chrome pe Android.",
      "warning",
    );
    if (btn) btn.style.display = "none";
    return;
  }
  if (_voiceRec) {
    try {
      _voiceRec.stop();
    } catch (e) {}
    _voiceRec = null;
    return;
  }
  var inputEl = document.getElementById(targetId);
  if (!inputEl) return;
  _voiceRec = new SpeechRec();
  _voiceRec.lang = "ro-RO";
  _voiceRec.interimResults = false;
  _voiceRec.maxAlternatives = 1;
  if (btn) {
    btn.textContent = "🎤 Ascult…";
    btn.style.background = "rgba(212,83,74,0.3)";
  }
  _voiceRec.onresult = function (e) {
    var text = e.results[0][0].transcript;
    inputEl.value =
      (inputEl.value ? inputEl.value.trim() + ". " : "") +
      text.charAt(0).toUpperCase() +
      text.slice(1);
  };
  _voiceRec.onend = function () {
    _voiceRec = null;
    if (btn) {
      btn.textContent = "🎤";
      btn.style.background = "";
    }
  };
  _voiceRec.onerror = function (e) {
    _voiceRec = null;
    if (btn) {
      btn.textContent = "🎤";
      btn.style.background = "";
    }
    var msgs = {
      "not-allowed": "Permisiune microfon refuzată.",
      "no-speech": "Nicio voce detectată.",
      network: "Eroare rețea.",
    };
    showToast(msgs[e.error] || "Eroare dictare: " + e.error, "error");
  };
  _voiceRec.start();
}

// ====== N13: COMPARATOR SPECII — Calendare tratamente aliniate ======
var SPECIES_TREATMENTS_MONTHLY = {
  cais: {
    2: ["Zeamă bordeleză 1%"],
    3: ["Zeamă bordeleză 1%", "Topas 0.4ml/L la inflorire"],
    4: ["Switch 10g/10L post-inflorire"],
    5: ["Teldor 1g/L preventiv"],
    6: ["Switch la nevoie dupa ploaie"],
    9: ["Zeamă bordeleză 0.5% post-frunze"],
    11: ["Zeamă bordeleză 1.5% toamna"],
  },
  piersic: {
    2: ["Zeamă bordeleză 1%", "Dithan M-45 anti-basculare"],
    3: ["Topas 0.4ml/L la inflorire"],
    4: ["Confidor 0.5ml/L afide"],
    5: ["Switch monilioză"],
    6: ["Topas fainare la nevoie"],
    9: ["Zeamă bordeleză 0.5%"],
    11: ["Zeamă bordeleză 1%"],
  },
  cires: {
    2: ["Zeamă bordeleză 1%"],
    3: ["Zeamă bordeleză 1%"],
    4: ["Switch monilioză florilor"],
    5: ["Merpan 2g/L preventiv"],
    6: ["Capcane musca"],
    9: ["Merpan 2g/L"],
    11: ["Zeamă bordeleză 1%"],
  },
  visin: {
    2: ["Zeamă bordeleză 1%"],
    3: ["Zeamă bordeleză 1%"],
    4: ["Merpan 2g/L pătare frunze"],
    5: ["Merpan 2g/L"],
    6: ["Switch la nevoie"],
    9: ["Zeamă bordeleză 0.5%"],
    11: ["Zeamă bordeleză 1%"],
  },
  "mar-florina": {
    2: ["Zeamă bordeleză 1.5%"],
    3: ["Captan 2g/L pre-inflorire"],
    4: ["Captan 2g/L post-inflorire", "Topas fainare"],
    5: ["Captan sau Merpan preventiv"],
    6: ["Score 2ml/L la nevoie"],
    9: ["Zeamă bordeleză 0.5%"],
    11: ["Zeamă bordeleză 1%"],
  },
  "mar-golden": {
    2: ["Zeamă bordeleză 1.5%"],
    3: ["Captan 2g/L"],
    4: ["Captan 2g/L", "Topas fainare"],
    5: ["Merpan preventiv"],
    9: ["Zeamă bordeleză 0.5%"],
    11: ["Zeamă bordeleză 1%"],
  },
  "par-clapp": {
    2: ["Zeamă bordeleză 1.5%"],
    3: ["Captan 2g/L"],
    4: ["Captan 2g/L post-inflorire"],
    5: ["Merpan preventiv"],
    6: ["Score la nevoie"],
    9: ["Zeamă bordeleză 0.5%"],
    11: ["Zeamă bordeleză 1%"],
  },
  "par-williams": {
    2: ["Zeamă bordeleză 1.5%"],
    3: ["Captan 2g/L"],
    4: ["Captan post-inflorire"],
    5: ["Merpan preventiv"],
    9: ["Zeamă bordeleză 0.5%"],
    11: ["Zeamă bordeleză 1%"],
  },
  prun: {
    2: ["Zeamă bordeleză 1%"],
    3: ["Zeamă bordeleză 1%"],
    4: ["Topas 0.4ml/L"],
    5: ["Topas la nevoie"],
    9: ["Zeamă bordeleză 0.5%"],
    11: ["Zeamă bordeleză 1%"],
  },
  migdal: {
    1: ["Zeamă bordeleză 1% pana la dezmugurit"],
    2: ["Topas la inflorire timpurie"],
    3: ["Zeamă bordeleză 0.5% dupa inflorire"],
    11: ["Zeamă bordeleză 1%"],
  },
};

function renderSpeciesComparator() {
  var sel1 = document.getElementById("compSp1")
    ? document.getElementById("compSp1").value
    : "";
  var sel2 = document.getElementById("compSp2")
    ? document.getElementById("compSp2").value
    : "";
  var res = document.getElementById("comparatorResult");
  if (!res) return;
  if (!sel1 || !sel2 || sel1 === sel2) {
    res.innerHTML =
      '<p style="color:var(--text-dim);text-align:center;padding:12px;">Selectează două specii diferite.</p>';
    return;
  }
  var MONTHS = [
    "",
    "Ian",
    "Feb",
    "Mar",
    "Apr",
    "Mai",
    "Iun",
    "Iul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  var t1 = SPECIES_TREATMENTS_MONTHLY[sel1] || {},
    t2 = SPECIES_TREATMENTS_MONTHLY[sel2] || {};
  var currentMonth = new Date().getMonth() + 1;
  var html =
    '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.78rem;">' +
    '<tr><th style="padding:5px 8px;border:1px solid var(--border);">Luna</th>' +
    '<th style="padding:5px 8px;border:1px solid var(--border);color:var(--accent);">' +
    sel1.replace("-", " ").toUpperCase() +
    "</th>" +
    '<th style="padding:5px 8px;border:1px solid var(--border);color:var(--info);">' +
    sel2.replace("-", " ").toUpperCase() +
    "</th>" +
    '<th style="padding:5px 8px;border:1px solid var(--border);">Combin</th></tr>';
  for (var m = 1; m <= 12; m++) {
    var tr1 = t1[m] || [],
      tr2 = t2[m] || [];
    var hasBoth = tr1.length > 0 && tr2.length > 0;
    var bg =
      m === currentMonth
        ? "background:rgba(106,191,105,0.08);"
        : m % 2 === 0
          ? "background:var(--bg-surface);"
          : "";
    html +=
      '<tr style="' +
      bg +
      (m === currentMonth ? "font-weight:700;" : "") +
      '">' +
      '<td style="padding:5px 8px;border:1px solid var(--border);">' +
      (m === currentMonth ? "📍 " : "") +
      MONTHS[m] +
      "</td>" +
      '<td style="padding:5px 8px;border:1px solid var(--border);color:var(--accent-dim);font-size:0.75rem;">' +
      (tr1.length ? tr1.join("<br>") : '<span style="opacity:0.3">—</span>') +
      "</td>" +
      '<td style="padding:5px 8px;border:1px solid var(--border);color:var(--info);font-size:0.75rem;">' +
      (tr2.length ? tr2.join("<br>") : '<span style="opacity:0.3">—</span>') +
      "</td>" +
      '<td style="padding:5px 8px;border:1px solid var(--border);text-align:center;">' +
      (hasBoth ? '<span style="color:var(--accent);">✓</span>' : "") +
      "</td></tr>";
  }
  html +=
    '</table></div><p style="font-size:0.72rem;color:var(--text-dim);margin-top:6px;">✓ = luni cu tratamente la ambele — combină ntr-o singură tură (verifică compatibilitatea produselor).</p>';
  res.innerHTML = html;
}

// ====== N14: HARTA LIVADA VIZUALA ======
var TREE_ICONS = {
  cais: "🍑",
  piersic: "🍑",
  cires: "🍒",
  visin: "🍒",
  prun: "🟣",
  "mar-florina": "🍎",
  "mar-golden": "🍎",
  "par-clapp": "🍐",
  "par-williams": "🍐",
  "par-hosui": "🍐",
  "par-napoca": "🍐",
  migdal: "🌰",
  rodiu: "🔴",
  kaki: "🟠",
  afin: "🫐",
  zmeur: "🍓",
  "zmeur-galben": "🌻",
  mur: "⚫",
  "mur-copac": "⚫",
  alun: "🌰",
};
var TREE_STATUS_COLORS = {
  ok: "var(--accent)",
  warning: "var(--warning)",
  sick: "var(--danger)",
};
function getTreeMap() {
  return JSON.parse(localStorage.getItem("livada-tree-map") || "{}");
}
function saveTreeMap(map) {
  localStorage.setItem("livada-tree-map", JSON.stringify(map));
}

function openTreeMapModal() {
  openModal("treemap");
  renderTreeMap();
}

function renderTreeMap() {
  var map = getTreeMap();
  var ROWS = 10,
    COLS = 12;
  var container = document.getElementById("treemapGrid");
  if (!container) return;
  var html =
    '<div style="display:grid;grid-template-columns:repeat(' +
    COLS +
    ",1fr);gap:3px;min-width:" +
    COLS * 38 +
    'px;">';
  for (var r = 1; r <= ROWS; r++) {
    for (var c = 1; c <= COLS; c++) {
      var key = "r" + r + "c" + c;
      var tree = map[key];
      var icon = tree ? TREE_ICONS[tree.species] || "🌳" : "+";
      var border = tree
        ? "2px solid " + TREE_STATUS_COLORS[tree.status || "ok"]
        : "1px dashed var(--border)";
      html +=
        "<button onclick=\"openTreeCell('" +
        key +
        '\')" title="' +
        (tree ? escapeHtml(tree.name || key) : "Liber R" + r + "C" + c) +
        '" ' +
        'style="aspect-ratio:1;border:' +
        border +
        ";border-radius:6px;background:" +
        (tree ? "rgba(106,191,105,0.06)" : "transparent") +
        ";cursor:pointer;font-size:" +
        (tree ? "1rem" : "0.75rem") +
        ";min-height:32px;padding:0;color:" +
        (tree ? "inherit" : "var(--border)") +
        ';">' +
        icon +
        "</button>";
    }
  }
  html += "</div>";
  container.innerHTML = html;
  document.getElementById("treemapDetailPanel").style.display = "none";
}

function openTreeCell(key) {
  var map = getTreeMap();
  var t = map[key] || {};
  document.getElementById("treeCellKey").value = key;
  document.getElementById("treeCellName").value = t.name || "";
  document.getElementById("treeCellSpecies").value = t.species || "";
  document.getElementById("treeCellPlanted").value = t.planted || "";
  document.getElementById("treeCellStatus").value = t.status || "ok";
  document.getElementById("treeCellNotes").value = t.notes || "";
  var panel = document.getElementById("treemapDetailPanel");
  var title = document.getElementById("treemapDetailTitle");
  if (title) title.textContent = "Pom: " + key + (t.name ? " — " + t.name : "");
  if (panel) panel.style.display = "block";
}

function saveTreeCell() {
  var key = document.getElementById("treeCellKey").value;
  var map = getTreeMap();
  var species = document.getElementById("treeCellSpecies").value;
  var name = document.getElementById("treeCellName").value.trim();
  if (!species && !name) {
    delete map[key];
  } else {
    map[key] = {
      species: species,
      name: name,
      planted: document.getElementById("treeCellPlanted").value,
      notes: document.getElementById("treeCellNotes").value.trim(),
      status: document.getElementById("treeCellStatus").value,
      updatedAt: todayLocal(),
    };
  }
  saveTreeMap(map);
  renderTreeMap();
  document.getElementById("treemapDetailPanel").style.display = "none";
  showToast(name ? 'Pom "' + name + '" salvat.' : "Celulă curățată.");
}

function clearTreeCell() {
  if (!confirm("Stergi datele acestui pom?")) return;
  var key = document.getElementById("treeCellKey").value;
  var map = getTreeMap();
  delete map[key];
  saveTreeMap(map);
  renderTreeMap();
  document.getElementById("treemapDetailPanel").style.display = "none";
  showToast("Pom eliminat din hartă.");
}

// ====== N15: NOTE PER POM INDIVIDUAL ======
function getTrees(species) {
  var all = JSON.parse(localStorage.getItem("livada-trees") || "[]");
  return species
    ? all.filter(function (t) {
        return t.species === species;
      })
    : all;
}
function saveAllTrees(list) {
  localStorage.setItem("livada-trees", JSON.stringify(list));
}

function openTreePanel(speciesId) {
  var panel = document.getElementById("treePanel-" + speciesId);
  if (!panel) return;
  var isVisible = panel.style.display !== "none" && panel.style.display !== "";
  if (isVisible) {
    panel.style.display = "none";
    return;
  }
  renderTreePanel(speciesId);
  panel.style.display = "block";
}

function renderTreePanel(speciesId) {
  var panel = document.getElementById("treePanel-" + speciesId);
  if (!panel) return;
  var trees = getTrees(speciesId);
  var label = SPECIES[speciesId] || speciesId;
  var html =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
    '<strong style="font-size:0.85rem;">🌳 Pomi ' +
    escapeHtml(label) +
    ": " +
    trees.length +
    "</strong>" +
    '<button class="btn btn-primary" style="font-size:0.75rem;padding:5px 10px;" onclick="addTreeNote(\'' +
    speciesId +
    "')\">+ Pom nou</button></div>";
  if (trees.length === 0) {
    html +=
      '<p style="color:var(--text-dim);font-size:0.82rem;text-align:center;padding:12px 0;">Niciun pom înregistrat. Adaugă primul pentru tracking individual.</p>';
  } else {
    trees.forEach(function (t) {
      var sc = {
        ok: "var(--accent)",
        warning: "var(--warning)",
        sick: "var(--danger)",
      }[t.status || "ok"];
      var age = t.planted
        ? " • " + (new Date().getFullYear() - parseInt(t.planted)) + " ani"
        : "";
      html +=
        '<div style="padding:8px 10px;margin:4px 0;background:var(--bg-surface);border-radius:8px;border-left:3px solid ' +
        sc +
        ';">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
        '<strong style="font-size:0.85rem;">' +
        escapeHtml(t.label || t.id) +
        "</strong>" +
        "<button onclick=\"editTreeNote('" +
        t.id +
        "','" +
        speciesId +
        '\')" style="font-size:0.7rem;padding:3px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text);">✏️ Edit</button></div>' +
        (t.planted
          ? '<div style="font-size:0.72rem;color:var(--text-dim);">Plantat: ' +
            escapeHtml(t.planted) +
            age +
            "</div>"
          : "") +
        (t.notes
          ? '<div style="font-size:0.82rem;margin-top:3px;">' +
            escapeHtml(t.notes) +
            "</div>"
          : "") +
        "</div>";
    });
  }
  panel.innerHTML = html;
}

function addTreeNote(speciesId) {
  var trees = getTrees();
  var num = getTrees(speciesId).length + 1;
  var label = (SPECIES[speciesId] || speciesId) + " #" + num;
  var newTree = {
    id: speciesId + "-" + Date.now(),
    species: speciesId,
    label: label,
    notes: "",
    status: "ok",
    planted: "",
    updatedAt: todayLocal(),
  };
  trees.push(newTree);
  saveAllTrees(trees);
  renderTreePanel(speciesId);
  editTreeNote(newTree.id, speciesId);
}

function editTreeNote(treeId, speciesId) {
  var trees = getTrees();
  var t = trees.find(function (x) {
    return x.id === treeId;
  });
  if (!t) return;
  var labelHtml = prompt("Nume pom:", t.label || "");
  if (labelHtml === null) return;
  var notesHtml = prompt("Note (boli, productie, observatii):", t.notes || "");
  var status =
    prompt("Status (ok / warning / sick):", t.status || "ok") || "ok";
  var planted = prompt("An plantat (ex: 2018):", t.planted || "") || "";
  t.label = labelHtml.trim() || t.label;
  t.notes = notesHtml !== null ? notesHtml : t.notes;
  t.status = ["ok", "warning", "sick"].includes(status) ? status : "ok";
  t.planted = planted;
  t.updatedAt = todayLocal();
  saveAllTrees(trees);
  renderTreePanel(speciesId);
  showToast('Pom "' + t.label + '" actualizat.');
}

// ====== N16: TURA SAPTAMANALA — Checklist ghidat ======
var INSPECTION_GUIDE = {
  2: {
    general: [
      "Ultima sansa pentru taieri de iarna inainte de dezmugurit",
      "Zeama bordeleză preventivă la specii sensibile",
    ],
    migdal: [
      "Dezmugurit timpuriu posibil — verifică zilnic, protejează la inghet cu agrotextil",
    ],
    piersic: [
      "Muguri umflați, roşietici, deformați = basculare! Dithan M-45 urgent",
    ],
  },
  3: {
    general: [
      "INGHEȜ tarziu posibil! Verifică prognoza zilnic — -2°C la inflorire = pierdere totală",
      "Prima stropire preventivă: zeamă bordeleză 1% la umezire mugure",
    ],
    cais: [
      "Inflorescente cu muguri negri = Monilinia! Taie şi arde IMEDIAT",
      "Scurgeri de gumă (gomoză) pe ramuri = ciuperci sau soc mecanic",
    ],
    piersic: [
      "Frunze umflate, roşietice, deformate = basculare activă = Dithan M-45 URGENT",
    ],
    "mar-florina": [
      "Pete mici uleiose pe lăstari noi = rapan! Captan 2g/L preventiv",
    ],
  },
  4: {
    general: [
      "Săptămânal în livadă obligatoriu — evoluție rapidă",
      "Irigat dacă nu a plouat 10+ zile",
    ],
    cais: [
      "Monilioză fructe verzi (după ploaie+căldură): Switch 10g/10L urgent",
    ],
    "mar-florina": [
      "Răpan activ! Verifică fața INFERIOARă a frunzelor — pete brune-cenuşii",
    ],
    piersic: ["Afide pe lăstari noi = săpun potasic 2% sau Confidor 0.5ml/L"],
    cires: [
      "Monilioză flori: flori îngălbenite, ramuri uscate = Switch urgent",
    ],
  },
  5: {
    general: [
      "Nu stropi când albinele sunt active (stropeşte la 6-8 sau după 19)",
      "Scor spray sub 40%: evită tratamentele — risc fitotoxicitate",
    ],
    cais: [
      "Fructe verzi: monilioză posibilă după ploaie. Teldor 1g/L preventiv",
    ],
    cires: [
      "Musca cireşului activă! Instalează capcane cromotrope galbene ACUM",
    ],
    piersic: ["Rărit fructe dacă sunt prea dese (>5cm între fructe)"],
  },
  6: {
    general: [
      "Caniculară posibilă: nu stropi între 10-18 (fitotoxicitate)",
      "Verifică integritatea plasei anti-păsări",
    ],
    cires: [
      "RECOLTĂ CIReŞ — verifică zilnic. Crăpături = recoltare prea târzie",
    ],
    cais: ["RECOLTĂ CAIS — monilioză rapidă pe fructe coapte după ploaie"],
    visin: ["RECOLTĂ VIŞIN + capcane Drosophila suzukii verificate săptămânal"],
  },
  7: {
    general: [
      "Temperaturi ridicate — nu stropi între 10-18",
      "Irigat regulat dacă nu plouă",
    ],
    piersic: ["RECOLTĂ PIERSIC TIMPURIU — verifică coloratia"],
    "par-clapp": [
      "RECOLTĂ PĂR CLAPP — înainte de maturare completă (se păstrează la rece)",
    ],
    zmeur: ["RECOLTĂ ZMEUR — culege la 2-3 zile"],
  },
  8: {
    general: [
      "Ploile de august = risc boli după canicula",
      "Pregătire toamnă: verificare tutori",
    ],
    piersic: ["RECOLTĂ PIERSIC TĂRDIV"],
    "par-williams": ["RECOLTĂ PĂR WILLIAMS"],
    mur: ["RECOLTĂ MUR — culege când fructele sunt negre-lucioase"],
  },
  9: {
    general: [
      "Tratamente fitosanitare de toamnă — zeamă bordeleză 1% preventiv",
      "Recoltare nuci şi alune",
    ],
    "mar-florina": ["RECOLTĂ MĂR FLORINA — sept-oct. Verifică fermitatea"],
    alun: ["RECOLTĂ ALUN — scutură când încep să cadă singure"],
    prun: ["RECOLTĂ PRUN TĂRDIV"],
  },
  10: {
    general: [
      "Toamnă: verifică starea scoarței (fisuri, leziuni)",
      "Zeamă bordeleză 1% preventiv pe toate speciile",
    ],
    kaki: ["RECOLTĂ KAKI după primul ger uśor (sub 5°C noaptea)"],
    rodiu: [
      "RECOLTĂ RODIU — când coaja devine roşie-închisă şi fructele încep să crapă",
    ],
  },
  11: {
    general: [
      "Răstringe frunze căzute (focare boli)",
      "Ultima stropire zeamă bordeleză după căderea frunzelor",
    ],
    afin: ["Verificare pH sol — ideal 4.5-5.5. Acidifiere toamnă dacă pH>5.5"],
    zmeur: ["Taiere tulpini vechi (care au rodit) până la pământ"],
  },
  12: {
    general: [
      "Planificare cumpărări produse fitosanitare pentru sezonul următor",
      "Tăieri de iarnă la specii rezistente (măr, păr, prun) până la -5°C",
    ],
  },
};

function openInspectionChecklist() {
  openModal("inspection");
  renderInspectionChecklist();
}

function renderInspectionChecklist() {
  var month = new Date().getMonth() + 1;
  var guide = INSPECTION_GUIDE[month];
  var MONTHS = [
    "",
    "Ianuarie",
    "Februarie",
    "Martie",
    "Aprilie",
    "Mai",
    "Iunie",
    "Iulie",
    "August",
    "Septembrie",
    "Octombrie",
    "Noiembrie",
    "Decembrie",
  ];
  var body = document.getElementById("inspectionBody");
  if (!body) return;
  if (!guide) {
    body.innerHTML =
      '<p style="color:var(--text-dim);text-align:center;padding:20px;">Ghid de inspecție disponibil pentru lunile Februarie—Noiembrie.<br>Consultă calendarul tratamente din tab-ul speciei.</p>';
    return;
  }
  var items = [];
  Object.keys(guide).forEach(function (key) {
    (guide[key] || []).forEach(function (text) {
      items.push({
        text: text,
        cat:
          key === "general" ? "GENERAL" : key.toUpperCase().replace(/-/g, " "),
      });
    });
  });
  var html =
    '<p style="font-size:0.82rem;color:var(--text-dim);margin-bottom:10px;">' +
    MONTHS[month] +
    " — " +
    items.length +
    " puncte de verificat</p>";
  items.forEach(function (item, idx) {
    html +=
      '<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;">' +
      '<input type="checkbox" id="insp-' +
      idx +
      '" style="margin-top:3px;min-width:18px;height:18px;">' +
      '<div><div style="font-size:0.68rem;color:var(--accent-dim);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">' +
      escapeHtml(item.cat) +
      "</div>" +
      '<div style="font-size:0.85rem;line-height:1.4;">' +
      escapeHtml(item.text) +
      "</div></div></label>";
  });
  html +=
    '<button class="btn btn-primary" style="width:100%;margin-top:14px;" onclick="finishInspection(' +
    items.length +
    ')">✓ Finalizează tura — adaugă în jurnal</button>';
  body.innerHTML = html;
}

function finishInspection(total) {
  var done = 0;
  for (var i = 0; i < (total || 0); i++) {
    var cb = document.getElementById("insp-" + i);
    if (cb && cb.checked) done++;
  }
  var note =
    "Tură inspecție: " + done + "/" + (total || "?") + " puncte verificate.";
  var jNote = document.getElementById("jurnalNote");
  if (jNote) jNote.value = note;
  closeModal("inspection");
  openModal("jurnal");
  showToast("Tură finalizată! Adaugă observații în jurnal.");
}

// ====== N17: RAPORT PRINTABIL PER SPECIE ======
function printSpeciesReport(speciesId) {
  var speciesLabel = SPECIES[speciesId] || speciesId;
  var year = new Date().getFullYear();
  var journal = getJurnalEntries();
  var entries = journal
    .filter(function (e) {
      if (!e.date || !e.date.startsWith(String(year))) return false;
      if (!e.species) return true;
      return (
        e.species === speciesId ||
        e.species.toLowerCase() === speciesLabel.toLowerCase()
      );
    })
    .sort(function (a, b) {
      return a.date.localeCompare(b.date);
    });
  var totalKg = 0,
    stropiri = 0,
    tunderi = 0;
  entries.forEach(function (e) {
    var t = (e.type || "").toLowerCase();
    if (t.indexOf("recolt") >= 0) {
      var m = (e.note || "").match(/(\d+(?:[.,]\d+)?)\s*kg/i);
      if (m) totalKg += parseFloat(m[1].replace(",", "."));
    }
    if (t.indexOf("tratament") >= 0 || t.indexOf("stropire") >= 0) stropiri++;
    if (t.indexOf("tundere") >= 0 || t.indexOf("taiere") >= 0) tunderi++;
  });
  var dateGen = new Date().toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  var html =
    '<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"><title>Fi\u015F\u0103 Cultur\u0103 ' +
    speciesLabel +
    " " +
    year +
    "</title>" +
    "<style>body{font-family:Arial,sans-serif;font-size:11pt;color:#222;margin:20mm;}" +
    "h1{font-size:16pt;border-bottom:2px solid #2d8a2d;padding-bottom:6px;color:#1a5f1a;}" +
    "h2{font-size:12pt;color:#2d8a2d;margin-top:16px;}" +
    ".box{background:#f0f9f0;border:1px solid #b8d8b8;border-radius:4px;padding:10px 14px;margin:10px 0;display:flex;gap:16px;flex-wrap:wrap;}" +
    ".stat{text-align:center;padding:6px 12px;background:#e8f5e8;border-radius:6px;}" +
    ".stat .val{font-size:1.3rem;font-weight:700;color:#1a5f1a;}.stat .lbl{font-size:0.8rem;color:#555;}" +
    "table{width:100%;border-collapse:collapse;margin-top:8px;}" +
    "th{background:#e8f5e8;padding:6px 8px;text-align:left;border:1px solid #b8d8b8;font-size:10pt;}" +
    "td{padding:5px 8px;border:1px solid #d8e8d8;font-size:10pt;vertical-align:top;}" +
    "tr:nth-child(even){background:#f8fdf8;}" +
    ".footer{margin-top:20px;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:8px;}" +
    "@media print{body{margin:15mm}}</style></head><body>" +
    "<h1>Fi\u015F\u0103 Cultur\u0103 \u2014 " +
    speciesLabel +
    " | " +
    year +
    "</h1>" +
    "<p><strong>Proprietar:</strong> Roland Petrila &nbsp;|&nbsp; <strong>Loca\u021Bie:</strong> Nadlac, jud. Arad &nbsp;|&nbsp; <strong>Generat:</strong> " +
    dateGen +
    "</p>" +
    '<div class="box">' +
    '<div class="stat"><div class="val">' +
    entries.length +
    '</div><div class="lbl">Interven\u021Bii</div></div>' +
    '<div class="stat"><div class="val">' +
    stropiri +
    '</div><div class="lbl">Tratamente</div></div>' +
    (tunderi > 0
      ? '<div class="stat"><div class="val">' +
        tunderi +
        '</div><div class="lbl">T\u0103ieri</div></div>'
      : "") +
    (totalKg > 0
      ? '<div class="stat"><div class="val">' +
        totalKg.toFixed(1) +
        ' kg</div><div class="lbl">Recolt\u0103</div></div>'
      : "") +
    "</div>";
  if (entries.length > 0) {
    html +=
      "<h2>Registru Interven\u021Bii " +
      year +
      "</h2>" +
      "<table><tr><th>Data</th><th>Tip</th><th>Not\u0103</th></tr>";
    entries.forEach(function (e) {
      html +=
        '<tr><td style="white-space:nowrap;">' +
        e.date +
        "</td><td>" +
        escapeHtml(e.type || "\u2014") +
        "</td><td>" +
        escapeHtml(e.note || "\u2014") +
        "</td></tr>";
    });
    html += "</table>";
  } else {
    html +=
      '<p style="color:#888;">Nicio interven\u021Bie \u00EEnregistrat\u0103 \u00EEn jurnal pentru ' +
      speciesLabel +
      " \u00EEn " +
      year +
      ".</p>";
  }
  html +=
    '<div class="footer">Generat de Livada Mea Dashboard (livada-mea-psi.vercel.app) pe ' +
    dateGen +
    "</div>" +
    "<scr" +
    "ipt>window.print();window.onafterprint=function(){window.close()};<\/scr" +
    "ipt></body></html>";
  var popup = window.open("", "_blank", "width=820,height=640");
  if (!popup) {
    showToast(
      "Popup blocat! Permite popup-uri pentru livada-mea-psi.vercel.app.",
      "error",
    );
    return;
  }
  popup.document.write(html);
  popup.document.close();
}

// ====== N3: STOC PRODUSE FITOSANITARE ======
var STOC_KEY = "livada-stoc-produse";

function getStoc() {
  try {
    return JSON.parse(localStorage.getItem(STOC_KEY) || "[]");
  } catch (e) {
    return [];
  }
}
function saveStoc(stoc) {
  localStorage.setItem(STOC_KEY, JSON.stringify(stoc));
}
function addStocProdus() {
  var name = (document.getElementById("stocName")?.value || "").trim();
  var cant = parseFloat(document.getElementById("stocCant")?.value) || 0;
  var unit = document.getElementById("stocUnit")?.value || "ml";
  var exp = document.getElementById("stocExp")?.value || "";
  if (!name) {
    showToast("Introdu numele produsului.", "warning");
    return;
  }
  var stoc = getStoc();
  stoc.push({
    id: Date.now(),
    name: name,
    cantitate: cant,
    unitate: unit,
    dataExpirare: exp,
  });
  saveStoc(stoc);
  document.getElementById("stocName").value = "";
  document.getElementById("stocCant").value = "";
  document.getElementById("stocExp").value = "";
  renderStoc();
  showToast("Produs adaugat in stoc.");
}
function deleteStocProdus(id) {
  saveStoc(
    getStoc().filter(function (p) {
      return p.id !== id;
    }),
  );
  renderStoc();
}
function renderStoc() {
  var container = document.getElementById("stocList");
  if (!container) return;
  var stoc = getStoc();
  if (stoc.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-dim);font-size:0.82rem;padding:8px 0;">Niciun produs adaugat.</p>';
    return;
  }
  var today = new Date();
  var expiredCount = 0;
  container.innerHTML = stoc
    .map(function (p) {
      var expired = p.dataExpirare && new Date(p.dataExpirare) < today;
      var expSoon =
        p.dataExpirare &&
        !expired &&
        new Date(p.dataExpirare) - today < 30 * 86400000;
      if (expired) expiredCount++;
      var bc = expired
        ? "var(--danger)"
        : expSoon
          ? "var(--warning)"
          : "var(--border)";
      return (
        '<div style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid ' +
        bc +
        ';border-radius:8px;margin-bottom:6px;">' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
        escapeHtml(p.name) +
        "</div>" +
        '<div style="font-size:0.75rem;color:var(--text-dim);">' +
        (p.cantitate ? p.cantitate + " " + (p.unitate || "") : "") +
        (p.dataExpirare ? " &middot; Exp: " + p.dataExpirare : "") +
        (expired
          ? ' <strong style="color:var(--danger);">EXPIRAT</strong>'
          : "") +
        (expSoon && !expired
          ? ' <strong style="color:var(--warning);">exp. curand</strong>'
          : "") +
        "</div>" +
        "</div>" +
        '<button onclick="deleteStocProdus(' +
        p.id +
        ')" style="background:none;border:none;color:var(--danger);font-size:1.1rem;cursor:pointer;padding:4px;min-width:36px;min-height:36px;">&#10005;</button>' +
        "</div>"
      );
    })
    .join("");
  if (expiredCount > 0)
    showToast(expiredCount + " produse din stoc au expirat!", "warning");
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
    '<h2 class="section-title" style="cursor:default;">🪣 Stoc Produse Fitosanitare</h2>' +
    '<div class="section-body">' +
    '<p style="font-size:0.8rem;color:var(--text-dim);margin-bottom:10px;">Inventar produse fitosanitare. Alerta automata la produse expirate sau apropiate de expirare.</p>' +
    '<div style="display:grid;grid-template-columns:1fr 80px 70px;gap:6px;margin-bottom:8px;">' +
    '<input id="stocName" type="text" placeholder="Nume produs (ex: Dithane M-45)" style="padding:7px 10px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
    '<input id="stocCant" type="number" placeholder="Cant." min="0" step="0.1" style="padding:7px 8px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
    '<select id="stocUnit" style="padding:7px 6px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
    '<option value="ml">ml</option><option value="L">L</option><option value="g">g</option><option value="kg">kg</option><option value="buc">buc</option>' +
    "</select>" +
    "</div>" +
    '<div style="display:flex;gap:6px;margin-bottom:10px;">' +
    '<input id="stocExp" type="date" style="flex:1;padding:7px 10px;border-radius:8px;background:var(--bg-surface);border:1px solid var(--border);color:var(--text);font-size:0.82rem;">' +
    '<button class="btn btn-primary" onclick="addStocProdus()" style="padding:7px 14px;font-size:0.82rem;">+ Adauga</button>' +
    "</div>" +
    '<div id="stocList"></div>' +
    "</div>";
  tc.appendChild(div);
  renderStoc();
}

// Initializare voice button (ascunde daca nu e suportat)
document.addEventListener("DOMContentLoaded", function () {
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
    var btn = document.getElementById("voiceDictateBtn");
    if (btn) btn.style.display = "none";
  }
  // Panel AI Status pe sectiunea Identificare specie (statica in HTML)
  renderAiStatusPanel("identify", "aiIdentLoading", "beforebegin");
});

// ====== II4: IMPORT CSV JURNAL ======
function triggerImportCSV() {
  var inp = document.getElementById("jurnalCSVInput");
  if (inp) {
    inp.value = "";
    inp.click();
  }
}

function parseCSVLine(line, delim) {
  // Parses a single CSV line respecting quoted fields
  var result = [];
  var inQuote = false;
  var cur = "";
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === delim && !inQuote) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function normalizeDate(raw) {
  // Accepts YYYY-MM-DD or DD.MM.YYYY or DD/MM/YYYY
  var s = (raw || "").trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD.MM.YYYY or DD/MM/YYYY
  var m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
  if (m) {
    var d = m[1].padStart(2, "0");
    var mo = m[2].padStart(2, "0");
    var y = m[3];
    return y + "-" + mo + "-" + d;
  }
  return null;
}

var JURNAL_TYPE_MAP = {
  fitosanitar: "fitosanitar",
  fito: "fitosanitar",
  tratament: "tratament",
  tundere: "tundere",
  taiere: "tundere",
  tuns: "tundere",
  fertilizare: "fertilizare",
  fertiliz: "fertilizare",
  ingrasamant: "fertilizare",
  irigare: "irigare",
  iriga: "irigare",
  udare: "irigare",
  udat: "irigare",
  recoltare: "recoltare",
  recolta: "recoltare",
  cules: "recoltare",
  observatie: "observatie",
  obs: "observatie",
  nota: "observatie",
  altele: "altele",
  altul: "altele",
  other: "altele",
  general: "altele",
};

function normalizeType(raw) {
  var s = (raw || "").toLowerCase().trim();
  if (!s) return "altele";
  // exact match first
  if (JURNAL_TYPE_MAP[s]) return JURNAL_TYPE_MAP[s];
  // partial match
  var keys = Object.keys(JURNAL_TYPE_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (s.includes(keys[i]) || keys[i].includes(s))
      return JURNAL_TYPE_MAP[keys[i]];
  }
  return "altele";
}

function importJurnalCSV(inputEl) {
  var file = inputEl.files && inputEl.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast("Fisier prea mare. Maxim 2MB.", "error");
    return;
  }
  var reader = new FileReader();
  reader.onload = function (ev) {
    try {
      var text = ev.target.result;
      // Elimina BOM UTF-8 daca exista
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      var lines = text.split(/\r?\n/).filter(function (l) {
        return l.trim().length > 0;
      });
      if (lines.length === 0) {
        showToast("Fisier CSV gol.", "error");
        return;
      }

      // Auto-detect delimiter: numara ; vs , in prima linie
      var firstLine = lines[0];
      var delim =
        firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";

      // Detecteaza daca prima linie e header
      var startIdx = 0;
      var firstCols = parseCSVLine(lines[0], delim);
      var firstColLower = (firstCols[0] || "").toLowerCase().trim();
      if (
        firstColLower === "data" ||
        firstColLower === "date" ||
        firstColLower === "dată"
      ) {
        startIdx = 1; // skip header
      }

      var existing = getJurnalEntries();
      // Construieste set de duplicate pentru comparatie rapida
      var dupSet = {};
      existing.forEach(function (e) {
        var key =
          (e.date || "") +
          "|" +
          (e.type || "") +
          "|" +
          (e.note || "").trim().toLowerCase();
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
        var rawDate = cols[0] || "";
        var rawType = cols[1] || "";
        var rawNote = (cols[2] || "").trim();
        var rawSpecie = (cols[3] || "").trim().toLowerCase();
        var rawKg = cols[4] || "";

        var date = normalizeDate(rawDate);
        if (!date) {
          skippedEmpty++;
          errors.push("Linia " + (i + 1) + ": data invalida (" + rawDate + ")");
          continue;
        }
        if (!rawNote) {
          skippedEmpty++;
          errors.push("Linia " + (i + 1) + ": nota lipsa");
          continue;
        }

        var type = normalizeType(rawType);
        var key = date + "|" + type + "|" + rawNote.toLowerCase();
        if (dupSet[key]) {
          skippedDup++;
          continue;
        }

        var entry = {
          id: Date.now() + i,
          date: date,
          type: type,
          note: rawNote,
        };
        if (rawSpecie) entry.species = rawSpecie;
        var kg = parseFloat(rawKg.replace(",", "."));
        if (kg > 0) entry.kg = kg;

        imported.push(entry);
        dupSet[key] = true; // prevent intra-file duplicates
      }

      if (imported.length === 0 && skippedDup === 0) {
        var errMsg = "Nicio intrare valida gasita.";
        if (errors.length > 0)
          errMsg += "\n\nErori:\n" + errors.slice(0, 5).join("\n");
        alert(errMsg);
        return;
      }

      // Mesaj confirmare
      var msg = imported.length + " intrari de importat";
      if (skippedDup > 0) msg += ", " + skippedDup + " duplicate sarite";
      if (skippedEmpty > 0) msg += ", " + skippedEmpty + " linii invalide";
      msg += ".\n\nContinui importul?";

      if (imported.length > 0 && !confirm(msg)) return;

      if (imported.length > 0) {
        // Adauga intrari noi la inceput (sorted by date desc)
        imported.sort(function (a, b) {
          return b.date.localeCompare(a.date);
        });
        var newEntries = imported.concat(existing);
        saveJurnalEntries(newEntries);
        renderJurnal();
        syncJournal().catch(function (e) {
          console.error("syncJournal:", e);
        });
        showToast("✅ " + imported.length + " intrari importate cu succes!");
      } else {
        showToast("Toate intrarile din CSV sunt deja in jurnal.");
      }
    } catch (err) {
      showToast("Eroare import CSV: " + err.message, "error");
    }
  };
  reader.onerror = function () {
    showToast("Eroare la citirea fisierului.", "error");
  };
  reader.readAsText(file, "UTF-8");
}
// ====== END II4 ======

// ====== II1: COST TRACKER ======

function getCostEntries() {
  try {
    var data = localStorage.getItem("livada-costs");
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveCostEntries(entries) {
  localStorage.setItem("livada-costs", JSON.stringify(entries));
}

function openCostTracker() {
  var dateInput = document.getElementById("costDate");
  if (dateInput && !dateInput.value) dateInput.value = todayLocal();
  renderCostStats();
  openModal("costs");
}

function addCostEntry() {
  var date = (document.getElementById("costDate") || {}).value || "";
  var category = (document.getElementById("costCategory") || {}).value || "";
  var product = (
    (document.getElementById("costProduct") || {}).value || ""
  ).trim();
  var qty = parseFloat((document.getElementById("costQty") || {}).value || "0");
  var unit = (document.getElementById("costUnit") || {}).value || "buc";
  var price = parseFloat(
    (document.getElementById("costPrice") || {}).value || "0",
  );

  // Validation
  if (!date) {
    alert("Data este obligatorie.");
    return;
  }
  if (!product) {
    alert("Produsul este obligatoriu.");
    return;
  }
  if (isNaN(price) || price <= 0) {
    alert("Pretul trebuie sa fie mai mare ca 0.");
    return;
  }
  if (isNaN(qty) || qty <= 0) {
    alert("Cantitatea trebuie sa fie mai mare ca 0.");
    return;
  }

  var entries = getCostEntries();
  var entry = {
    id: Date.now(),
    date: date,
    category: category,
    product: product,
    qty: qty,
    unit: unit,
    pricePerUnit: price,
  };
  entries.push(entry);
  entries.sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });
  saveCostEntries(entries);

  // Reset form fields (keep date and category)
  var pEl = document.getElementById("costProduct");
  if (pEl) pEl.value = "";
  var qEl = document.getElementById("costQty");
  if (qEl) qEl.value = "";
  var prEl = document.getElementById("costPrice");
  if (prEl) prEl.value = "";

  renderCostStats();
}

function deleteCostEntry(id) {
  var entries = getCostEntries().filter(function (e) {
    return e.id !== id;
  });
  saveCostEntries(entries);
  renderCostStats();
}

function renderCostStats() {
  var container = document.getElementById("costsStats");
  if (!container) return;

  var allEntries = getCostEntries();
  var currentYear = new Date().getFullYear();
  // Filter current season (current year)
  var entries = allEntries.filter(function (e) {
    return e.date && e.date.startsWith(String(currentYear));
  });

  if (entries.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-dim);text-align:center;padding:16px;">Nicio cheltuială înregistrată în ' +
      currentYear +
      ".</p>";
    return;
  }

  // Total general
  var total = entries.reduce(function (sum, e) {
    return sum + e.qty * e.pricePerUnit;
  }, 0);

  // Per categorie
  var byCategory = {};
  entries.forEach(function (e) {
    var t = e.qty * e.pricePerUnit;
    byCategory[e.category] = (byCategory[e.category] || 0) + t;
  });
  var maxCat = Math.max.apply(null, Object.values(byCategory).concat([1]));

  var catHTML = Object.entries(byCategory)
    .sort(function (a, b) {
      return b[1] - a[1];
    })
    .map(function (p) {
      var pct = Math.round((p[1] / maxCat) * 100);
      return (
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">' +
        '<span style="min-width:90px;font-size:0.78rem;color:var(--text-dim);">' +
        escapeHtml(p[0]) +
        "</span>" +
        '<div style="flex:1;height:16px;background:var(--bg-surface);border-radius:4px;overflow:hidden;">' +
        '<div style="width:' +
        pct +
        '%;height:100%;background:var(--accent);border-radius:4px;transition:width 0.4s;"></div></div>' +
        '<span style="font-size:0.78rem;font-weight:700;min-width:60px;text-align:right;">' +
        p[1].toFixed(2) +
        " RON</span></div>"
      );
    })
    .join("");

  // Lista intrari
  var listHTML = entries
    .map(function (e) {
      var entryTotal = (e.qty * e.pricePerUnit).toFixed(2);
      return (
        '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:0.82rem;font-weight:600;">' +
        escapeHtml(e.product) +
        "</div>" +
        '<div style="font-size:0.72rem;color:var(--text-dim);">' +
        escapeHtml(e.category) +
        " • " +
        e.date +
        " • " +
        e.qty +
        " " +
        escapeHtml(e.unit) +
        " × " +
        e.pricePerUnit.toFixed(2) +
        " RON" +
        "</div></div>" +
        '<div style="font-size:0.85rem;font-weight:700;white-space:nowrap;">' +
        entryTotal +
        " RON</div>" +
        '<button onclick="deleteCostEntry(' +
        e.id +
        ')" style="background:none;border:none;color:var(--text-dim);font-size:1rem;cursor:pointer;padding:4px 8px;min-height:36px;" aria-label="Sterge">✕</button>' +
        "</div>"
      );
    })
    .join("");

  container.innerHTML =
    '<h3 style="margin:0 0 8px;font-size:0.9rem;">&#128200; Total pe categorie (' +
    currentYear +
    ")</h3>" +
    catHTML +
    '<p style="font-size:0.85rem;font-weight:700;text-align:right;margin:10px 0 16px;padding-top:8px;border-top:2px solid var(--border);">' +
    "Total sezon: " +
    total.toFixed(2) +
    " RON" +
    "</p>" +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
    '<h3 style="margin:0;font-size:0.9rem;">&#128221; Cheltuieli (' +
    entries.length +
    ")</h3>" +
    '<button onclick="exportCostsCSV()" style="background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:6px 12px;font-size:0.75rem;cursor:pointer;min-height:36px;">' +
    "&#128196; Export CSV" +
    "</button>" +
    "</div>" +
    "<div>" +
    listHTML +
    "</div>";
}

function exportCostsCSV() {
  var entries = getCostEntries();
  var currentYear = new Date().getFullYear();
  var yearEntries = entries.filter(function (e) {
    return e.date && e.date.startsWith(String(currentYear));
  });

  if (yearEntries.length === 0) {
    alert("Nu exista cheltuieli de exportat pentru " + currentYear + ".");
    return;
  }

  var lines = ["Data,Categorie,Produs,Cantitate,UM,Pret/UM (RON),Total (RON)"];
  yearEntries.forEach(function (e) {
    var total = (e.qty * e.pricePerUnit).toFixed(2);
    lines.push(
      [
        e.date,
        '"' + e.category.replace(/"/g, '""') + '"',
        '"' + e.product.replace(/"/g, '""') + '"',
        e.qty,
        e.unit,
        e.pricePerUnit.toFixed(2),
        total,
      ].join(","),
    );
  });

  var csv = lines.join("\n");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(csv)
      .then(function () {
        alert("CSV copiat in clipboard! (" + yearEntries.length + " randuri)");
      })
      .catch(function () {
        prompt("Copiaza CSV-ul manual:", csv);
      });
  } else {
    prompt("Copiaza CSV-ul manual:", csv);
  }
}

// ====== END II1: COST TRACKER ======

// ====== GLOSAR POMICOL: FILTRARE ======
function filterGlosar(q) {
  try {
    q = q.toLowerCase().trim();
    var terms = document.querySelectorAll(".glosar-term");
    var cats = document.querySelectorAll("[data-glosar-cat]");
    var visible = 0;
    terms.forEach(function (t) {
      var match =
        !q ||
        (t.dataset.term || "").includes(q) ||
        (t.dataset.def || "").includes(q) ||
        t.textContent.toLowerCase().includes(q);
      t.classList.toggle("hidden", !match);
      if (match) visible++;
    });
    cats.forEach(function (c) {
      var hasVisible =
        c.querySelectorAll(".glosar-term:not(.hidden)").length > 0;
      c.style.display = hasVisible ? "" : "none";
    });
    var el = document.getElementById("glosarCount");
    if (el)
      el.textContent = q
        ? visible + ' rezultate pentru "' + q + '"'
        : "114 termeni in 9 categorii";
  } catch (e) {
    livadaLog("ERR", "filterGlosar", "FAIL", e.message);
  }
}
// ====== END GLOSAR POMICOL ======
