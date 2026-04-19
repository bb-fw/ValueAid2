// ═══════════════════════════════════════════════════════════════
//  ValueAid — Shared UI utilities
// ═══════════════════════════════════════════════════════════════
function openInMaps(addr) {
  if (!addr) return;
  const q = encodeURIComponent(addr);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.open(isIOS ? 'https://maps.apple.com/?q=' + q : 'geo:0,0?q=' + q);
}


let _toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  VA.db.settings.theme = t;
  VA.save();
  const tog = document.getElementById('dark-toggle');
  if (tog) tog.classList.toggle('on', t === 'dark');
}
function toggleTheme() { applyTheme(VA.db.settings.theme === 'dark' ? 'light' : 'dark'); }

function openOv(id) { document.getElementById(id)?.classList.add('open'); }
function closeOv(id) { document.getElementById(id)?.classList.remove('open'); }
function initOverlayClose() {
  document.querySelectorAll('.overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  });
}

function toggleSection(hdr) {
  const body = hdr.nextElementSibling;
  const chev = hdr.querySelector('.chev');
  body.classList.toggle('open');
  if (chev) chev.classList.toggle('open');
}
function toggleCard(hdr) { toggleSection(hdr); }
function toggleLvBody(btn) {
  const body = btn.closest('.lvc').querySelector('.lv-body');
  body.classList.toggle('open');
  btn.innerHTML = body.classList.contains('open') ? '&#9650;' : '&#9660;';
}
function filterChips(gridId, q) {
  q = (q || '').toLowerCase();
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.querySelectorAll('.chip').forEach(c => {
    c.style.display = (!q || c.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}

function updateBanner() {
  const banner = document.getElementById('travel-banner');
  if (!banner) return;
  const active = VA.db.travels.find(t => !t.endTime);
  if (active) {
    banner.classList.add('visible');
    const txt = document.getElementById('banner-txt');
    if (txt) txt.textContent = 'Travelling from ' + active.from + (active.startTime ? ' — ' + VA.fmtTime(new Date(active.startTime)) : '');
  } else {
    banner.classList.remove('visible');
  }
}

function buildLocOpts(inputId, listId) {
  const list = document.getElementById(listId);
  if (!list) return;
  const saved = VA.db.savedLocations;
  const todayStr = (()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
  const proj = [...new Set(VA.db.projects
    .filter(p => !p.date || p.date >= todayStr)
    .map(p => p.addr).filter(a => a && !saved.includes(a)))];
  let h = '';
  if (saved.length) h += '<div class="lo lo-group">Saved</div>' + saved.map(l => `<div class="lo" data-val="${VA.esc(l)}">${VA.esc(l)}</div>`).join('');
  if (proj.length) h += '<div class="lo lo-group">From Projects</div>' + proj.map(l => `<div class="lo" data-val="${VA.esc(l)}">${VA.esc(l)}</div>`).join('');
  list.innerHTML = h;
  list.querySelectorAll('.lo:not(.lo-group)').forEach(el => {
    el.addEventListener('click', () => {
      const inp = document.getElementById(inputId);
      if (inp) inp.value = el.dataset.val;
      list.classList.remove('open');
    });
  });
}
function toggleLocDrop(inputId, listId) {
  buildLocOpts(inputId, listId);
  document.getElementById(listId)?.classList.toggle('open');
}
function initLocClose() {
  document.addEventListener('click', e => {
    if (!e.target.closest('.loc-wrap')) {
      document.querySelectorAll('.loc-opts').forEach(el => el.classList.remove('open'));
    }
  });
}

function highlightNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.ni').forEach(el => {
    const href = (el.getAttribute('href') || '').split('/').pop();
    el.classList.toggle('active', href === path || (path === '' && href === 'index.html'));
  });
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// context: 'start' | 'end' | 'edit'
function buildMethodChecks(containerId, selected, context) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = VA.TMETH.map(m => `
    <div class="mchk ${selected && selected.includes(m) ? 'on' : ''}" data-method="${VA.esc(m)}">${VA.esc(m)}</div>
  `).join('');
  el.querySelectorAll('.mchk').forEach(chip => {
    chip.addEventListener('click', function() {
      this.classList.toggle('on');
      _updateMethodRows(containerId, context);
    });
  });
  _updateMethodRows(containerId, context);
}
function _updateMethodRows(containerId, context) {
  const el = document.getElementById(containerId); if (!el) return;
  const meths = [...el.querySelectorAll('.mchk.on')].map(x => x.dataset.method);
  const hasDriving = meths.includes('Driving');
  const hasTaxi = meths.includes('Taxi / Grab');
  // Distance row — shown at START when driving
  const distRow = document.getElementById('dist-row');
  if (distRow) distRow.style.display = (hasDriving && context === 'start') ? 'block' : 'none';
  // Edit distance row
  const eDistRow = document.getElementById('edist-row');
  if (eDistRow) eDistRow.style.display = hasDriving ? 'block' : 'none';
  // Parking row — shown at END and EDIT when driving (not start)
  const parkRow = document.getElementById('park-row');
  if (parkRow) parkRow.style.display = (hasDriving && context === 'end') ? 'block' : 'none';
  const eparkRow = document.getElementById('epark-row');
  if (eparkRow) eparkRow.style.display = hasDriving ? 'block' : 'none';
  // ERP row — shown at END when driving
  const erpRow = document.getElementById('erp-row');
  if (erpRow) erpRow.style.display = (hasDriving && context === 'end') ? 'block' : 'none';
  const eErpRow = document.getElementById('eerp-row');
  if (eErpRow) eErpRow.style.display = hasDriving ? 'block' : 'none';
  // Taxi fee row — shown at END when taxi
  const taxiRow = document.getElementById('taxi-row');
  if (taxiRow) taxiRow.style.display = (hasTaxi && context === 'end') ? 'block' : 'none';
  const eTaxiRow = document.getElementById('etaxi-row');
  if (eTaxiRow) eTaxiRow.style.display = hasTaxi ? 'block' : 'none';
}
function getSelectedMethods(containerId) {
  return [...document.querySelectorAll(`#${containerId} .mchk.on`)].map(x => x.dataset.method);
}

// ── PICKER SHEET ─────────────────────────────────────────────────
// A bottom-sheet for picking items from a list with search + add custom
// All item names are stored in data attributes — no inline JS strings — safe for apostrophes
let _pickerToggle = null;
let _pickerAddCustom = null;
// ── INLINE MANAGER SHEET ─────────────────────────────────────────
// For editing valuers/property types inline without leaving the page
let _mgrOnDone = null;

function openInlineMgr(title, getItems, onAdd, onRemove, onDone) {
  const sheet = document.getElementById('mgr-sheet');
  if (!sheet) { if (onDone) onDone(); return; }
  _mgrOnDone = onDone;
  document.getElementById('mgr-title').textContent = title;
  const inp = document.getElementById('mgr-inp');
  if (inp) inp.value = '';

  function refresh() {
    const items = getItems();
    const list = document.getElementById('mgr-list');
    if (!list) return;
    if (!items.length) { list.innerHTML = '<p class="hint">None added yet.</p>'; return; }
    list.innerHTML = '';
    items.forEach((item, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd);gap:8px';
      row.innerHTML = `<span style="flex:1;font-size:14px">${VA.esc(item)}</span>`;
      const btn = document.createElement('button');
      btn.className = 'btn bxs brd';
      btn.textContent = 'Remove';
      btn.addEventListener('click', () => { onRemove(i); refresh(); });
      row.appendChild(btn);
      list.appendChild(row);
    });
  }
  refresh();

  const addBtn = document.getElementById('mgr-add-btn');
  if (addBtn) addBtn.onclick = () => {
    const val = inp?.value.trim(); if (!val) return;
    onAdd(val); inp.value = ''; refresh();
  };
  if (inp) inp.onkeydown = e => { if (e.key === 'Enter') addBtn?.click(); };

  const doneBtn = document.getElementById('mgr-done-btn');
  if (doneBtn) doneBtn.onclick = () => { closeOv('mgr-sheet'); if (_mgrOnDone) _mgrOnDone(); };

  openOv('mgr-sheet');
}

function pageInit() {
  VA.load();
  applyTheme(VA.db.settings.theme || 'light');
  updateBanner();
  initOverlayClose();
  initLocClose();
  highlightNav();
}
