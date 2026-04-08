#!/usr/bin/env python3
"""
Implementare II2: Push Notifications inghet + boli
Adauga Notification API in applyAlerts + buton enable in bannerul de alerte
"""
HTML_PATH = r'C:/Proiecte/Livada/public/index.html'

with open(HTML_PATH, 'rb') as f:
    raw = f.read()
c = raw.decode('utf-8', errors='replace')
c = c.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')
print(f"Fisier incarcat: {len(c)} chars, {c.count(chr(10))} linii")

# ============================================================
# CHANGE 1: Extend applyAlerts to send browser notification
# ============================================================
OLD_APPLY = """function applyAlerts(data) {
  if (data.frost && data.frost.active) {
    var ft = document.getElementById('frostText');
    var fb = document.getElementById('frostBanner');
    if (ft) ft.textContent = data.frost.message;
    if (fb) fb.classList.add('active');
  }
  if (data.disease && data.disease.active) {
    var dt = document.getElementById('diseaseText');
    var db = document.getElementById('diseaseBanner');
    if (dt) dt.textContent = data.disease.message;
    if (db) db.classList.add('active');
  }
}"""

NEW_APPLY = """function applyAlerts(data) {
  if (data.frost && data.frost.active) {
    var ft = document.getElementById('frostText');
    var fb = document.getElementById('frostBanner');
    if (ft) ft.textContent = data.frost.message;
    if (fb) fb.classList.add('active');
    // II2: Push notification inghet
    sendLivadaNotification('Alerta inghet', data.frost.message || 'Risc de inghet in zona Nadlac!', 'frost');
  }
  if (data.disease && data.disease.active) {
    var dt = document.getElementById('diseaseText');
    var db = document.getElementById('diseaseBanner');
    if (dt) dt.textContent = data.disease.message;
    if (db) db.classList.add('active');
    // II2: Push notification boala
    sendLivadaNotification('Alerta boala', data.disease.message || 'Conditii favorabile pentru boli fungice!', 'disease');
  }
}

// II2: Notification API helper
var _notifSentKeys = {};
function sendLivadaNotification(title, body, key) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (localStorage.getItem('livada-notif-disabled') === '1') return;
  // Evita spam: trimite o singura notificare per tip per sesiune
  if (_notifSentKeys[key]) return;
  _notifSentKeys[key] = true;
  try {
    new Notification(title, {
      body: body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'livada-' + key,
      renotify: false,
      silent: false,
    });
  } catch(e) { /* iOS Safari poate arunca erori */ }
}

function requestLivadaNotifPermission() {
  if (!('Notification' in window)) {
    showToast('Notificarile nu sunt suportate in acest browser.');
    return;
  }
  if (Notification.permission === 'granted') {
    localStorage.removeItem('livada-notif-disabled');
    showToast('Notificari activate!');
    updateNotifBtn();
    return;
  }
  if (Notification.permission === 'denied') {
    showToast('Notificarile sunt blocate. Activeaza din setarile browserului.');
    return;
  }
  Notification.requestPermission().then(function(perm) {
    if (perm === 'granted') {
      localStorage.removeItem('livada-notif-disabled');
      showToast('Notificari activate! Vei primi alerte de inghet si boli.');
      updateNotifBtn();
    } else {
      showToast('Notificari refuzate. Poti activa mai tarziu din setarile browserului.');
    }
  });
}

function toggleLivadaNotif() {
  if (localStorage.getItem('livada-notif-disabled') === '1') {
    localStorage.removeItem('livada-notif-disabled');
    showToast('Notificari activate!');
  } else {
    localStorage.setItem('livada-notif-disabled', '1');
    showToast('Notificari dezactivate.');
  }
  updateNotifBtn();
}

function updateNotifBtn() {
  var btn = document.getElementById('notifToggleBtn');
  if (!btn) return;
  var isDisabled = localStorage.getItem('livada-notif-disabled') === '1';
  var perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  if (perm === 'unsupported') { btn.style.display = 'none'; return; }
  if (perm === 'granted') {
    btn.textContent = isDisabled ? '\uD83D\uDD14 Activeaza notificari' : '\uD83D\uDD15 Dezactiveaza notificari';
    btn.onclick = toggleLivadaNotif;
  } else {
    btn.textContent = '\uD83D\uDD14 Activeaza notificari alerte';
    btn.onclick = requestLivadaNotifPermission;
  }
}"""

if OLD_APPLY in c:
    c = c.replace(OLD_APPLY, NEW_APPLY, 1)
    print('[OK] Change 1: applyAlerts extinsa cu Notification API')
else:
    print('[FAIL] Change 1: pattern applyAlerts negasit')

# ============================================================
# CHANGE 2: Add notification toggle button in frost banner
# ============================================================
# Find the frost banner HTML
OLD_FROST_BANNER = """<div id="frostBanner" class="alert alert-danger" style="display:none;">
        <span>&#10052;&#65039; <strong>Alerta inghet:</strong> <span id="frostText"></span></span>
      </div>"""

NEW_FROST_BANNER = """<div id="frostBanner" class="alert alert-danger" style="display:none;">
        <span>&#10052;&#65039; <strong>Alerta inghet:</strong> <span id="frostText"></span></span>
      </div>"""

# Actually let's find a less exact pattern — search for the alerts area
idx_notif = c.find('id="frostBanner"')
if idx_notif >= 0:
    # Find alert-section or the alerts container to add the button after
    # Look for a good spot: after the alerts block
    # Search for the alerts rendering function call or the section body end
    pass

# Better: find the Actiuni rapide section and add a notification button there
OLD_ACTIUNI = 'id="planActiuni"'
idx_act = c.find(OLD_ACTIUNI)
if idx_act >= 0:
    # Find the section body div after planActiuni header
    # Look for a button group near planActiuni
    chunk = c[idx_act:idx_act+3000]
    # Find where buttons are (there should be quick action buttons)
    btn_idx = chunk.find('<button')
    if btn_idx >= 0:
        print(f'[INFO] planActiuni section found at {idx_act}, first button at +{btn_idx}')

# Simplest: inject notification button in the "Alerte active" section header
OLD_ALERTE_SECTION = '>&#9888;&#65039; Alerte active</h2>'
NEW_ALERTE_SECTION = '>&#9888;&#65039; Alerte active</h2>'
idx_alerte = c.find(OLD_ALERTE_SECTION)
print(f'[INFO] Alerte section at: {idx_alerte}')

# Find the section body after alerte title
if idx_alerte >= 0:
    # Look for section-body div right after
    after = c[idx_alerte:idx_alerte+500]
    sb_idx = after.find('section-body')
    if sb_idx >= 0:
        insert_pos = idx_alerte + sb_idx + after[sb_idx:].find('>') + 1
        notif_btn_html = '\n        <div style="text-align:right;margin-bottom:8px;"><button id="notifToggleBtn" onclick="requestLivadaNotifPermission()" style="background:none;border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:0.75rem;cursor:pointer;color:var(--text-dim);">\uD83D\uDD14 Activeaza notificari</button></div>'
        c = c[:insert_pos] + notif_btn_html + c[insert_pos:]
        print('[OK] Change 2: Buton notificari adaugat in sectiunea Alerte active')
    else:
        print('[FAIL] Change 2: section-body negasit dupa alerte header')
else:
    print('[FAIL] Change 2: sectiunea Alerte active negasita')

# ============================================================
# CHANGE 3: Init notification button state on page load
# ============================================================
OLD_INIT = 'function initDashboardAzi() {'
idx_init = c.find(OLD_INIT)
if idx_init >= 0:
    # Find where the function body starts
    body_start = c.find('\n', idx_init) + 1
    # Find the first statement
    first_stmt = c.find('  ', body_start)
    insert_after = c.find('\n', first_stmt) + 1
    c = c[:insert_after] + '  updateNotifBtn();\n' + c[insert_after:]
    print('[OK] Change 3: updateNotifBtn() apelat la initDashboardAzi')
else:
    print('[FAIL] Change 3: initDashboardAzi negasit')

# ============================================================
# SAVE
# ============================================================
print(f"\nRezultat final: {len(c)} chars, {c.count(chr(10))} linii")
with open(HTML_PATH, 'w', encoding='utf-8', errors='replace') as f:
    f.write(c)
print('[OK] Fisier salvat')

# Verify
with open(HTML_PATH, encoding='utf-8', errors='replace') as f:
    cv = f.read()
checks = [
    ('sendLivadaNotification', 'Notification helper'),
    ('requestLivadaNotifPermission', 'Permission request'),
    ('toggleLivadaNotif', 'Toggle function'),
    ('updateNotifBtn', 'Button updater'),
    ('notifToggleBtn', 'Button in HTML'),
]
for pat, name in checks:
    print(f'  {name}: {pat in cv}')
