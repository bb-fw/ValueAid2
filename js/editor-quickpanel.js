// ═══════════════════════════════════════════════════════════════
//  ValueAid — Quick Add / Remove Panel
//  Single searchable list to toggle all project items at once.
//  Standard layout: section A = cat×item, section B = level×room
//  Per-unit layout: section A = unit×cat×item
// ═══════════════════════════════════════════════════════════════
'use strict';

let _qpRows = [];   // flat array of row descriptors built on open
let _qpDirty = false;

// ── Public entry ──────────────────────────────────────────────
function openQuickPanel() {
  const p = gP(); if (!p) return;
  if (p.archived) { toast('Project is archived'); return; }
  _qpDirty = false;
  _qpRows = buildQpRows(p);
  renderQpList(_qpRows);
  document.getElementById('qp-search').value = '';
  openOv('qp-ov');
  document.getElementById('qp-search').focus();
}

function qpDone() {
  if (_qpDirty) {
    const p = gP();
    VA.save();
    if (p) rebuildFindings(p);
  }
  closeOv('qp-ov');
}

function qpFilter(q) {
  const lq = q.trim().toLowerCase();
  if (!lq) { renderQpList(_qpRows); return; }
  // Positional split on ' - ' or ' x '
  const delim = lq.includes(' - ') ? ' - ' : lq.includes(' x ') ? ' x ' : null;
  let filtered;
  if (delim) {
    const parts = lq.split(delim).map(p => p.trim()).filter(Boolean);
    const left = parts[0] || '';
    const right = parts[1] || '';
    filtered = _qpRows.filter(r => {
      const lbl = r.labelRaw.toLowerCase();
      const dashIdx = lbl.indexOf(' - ');
      const prefix = dashIdx >= 0 ? lbl.slice(0, dashIdx) : lbl;
      const suffix = dashIdx >= 0 ? lbl.slice(dashIdx + 3) : lbl;
      return (!left || prefix.includes(left)) && (!right || suffix.includes(right));
    });
  } else {
    filtered = _qpRows.filter(r => r.labelRaw.toLowerCase().includes(lq));
  }
  renderQpList(filtered);
}

// ── Build the flat row list ────────────────────────────────────
function buildQpRows(p) {
  const rows = [];
  if (p.layout === 'B') {
    // Per-unit: unit × cat × item
    (p.levels||[]).forEach((u, ui) => {
      const uCats = u.cats || p.cats || [];
      uCats.forEach((cat, uci) => {
        const ck = catKey(cat);
        const ud = (u.catData && u.catData[ck]) ? u.catData[ck] : { items: VA.mkCats([cat])[0].items };
        (ud.items||[]).forEach((item, ii) => {
          rows.push({
            section: 'unit',
            label: `${VA.esc(u.name||'Unit')} - ${VA.esc(cat.name)} - ${VA.esc(item.name)}`,
            labelRaw: `${u.name||'Unit'} - ${cat.name} - ${item.name}`,
            sel: !!item.sel,
            toggle() {
              // Re-resolve live references each time (avoids stale closure)
              const pp = gP(); if (!pp) return;
              const uu = pp.levels[ui]; if (!uu) return;
              const cc = (uu.cats||pp.cats||[])[uci]; if (!cc) return;
              const ck2 = catKey(cc);
              if (!uu.catData) uu.catData = {};
              if (!uu.catData[ck2]) uu.catData[ck2] = { items: VA.mkCats([cc])[0].items, notes: '' };
              const itm = uu.catData[ck2].items[ii]; if (!itm) return;
              itm.sel = !itm.sel;
              this.sel = itm.sel;
              _qpDirty = true;
            }
          });
        });
      });
    });
  } else {
    // Standard — section A: cat × item (findings)
    (p.cats||[]).forEach((cat, ci) => {
      (cat.items||[]).forEach((item, ii) => {
        rows.push({
          section: 'findings',
          label: `${VA.esc(cat.name)} - ${VA.esc(item.name)}`,
          labelRaw: `${cat.name} - ${item.name}`,
          sel: !!item.sel,
          toggle() {
            const pp = gP(); if (!pp) return;
            const itm = pp.cats[ci]?.items[ii]; if (!itm) return;
            itm.sel = !itm.sel;
            this.sel = itm.sel;
            _qpDirty = true;
          }
        });
      });
    });
    // Standard — section B: level × room (accommodations)
    (p.levels||[]).forEach((lv, li) => {
      // Each possible room for this level comes from the master room list
      // We show every room that the project knows about (from the level's rooms array
      // plus any rooms from VA master lists that could be added)
      const allRooms = [...new Set([
        ...(lv.rooms||[]),
        ...VA.getActiveRooms()
      ])];
      allRooms.forEach(room => {
        const inLevel = (lv.rooms||[]).includes(room);
        rows.push({
          section: 'accom',
          label: `${VA.esc(lv.name)} - ${VA.esc(room)}`,
          labelRaw: `${lv.name} - ${room}`,
          sel: inLevel,
          toggle() {
            const pp = gP(); if (!pp) return;
            const llv = pp.levels[li]; if (!llv) return;
            if (!llv.rooms) llv.rooms = [];
            const idx = llv.rooms.indexOf(room);
            if (idx >= 0) llv.rooms.splice(idx, 1);
            else llv.rooms.push(room);
            this.sel = llv.rooms.includes(room);
            _qpDirty = true;
          }
        });
      });
    });
  }
  return rows;
}

// ── Render ─────────────────────────────────────────────────────
function renderQpList(rows) {
  const el = document.getElementById('qp-list'); if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<p style="padding:20px;text-align:center;color:var(--txmt);font-size:13px">No items match.</p>';
    return;
  }

  // Group by section
  const sections = {};
  rows.forEach(r => {
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push(r);
  });

  const sectionLabels = {
    findings: 'Inspection Findings',
    accom: 'Accommodations',
    unit: 'Unit Items'
  };
  const sectionColors = {
    findings: 'var(--bl)',
    accom: 'var(--gn)',
    unit: 'var(--bl)'
  };

  let html = '';
  Object.entries(sections).forEach(([sec, secRows]) => {
    html += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;
      color:var(--txmt);padding:10px 16px 4px;position:sticky;top:0;background:var(--sf);z-index:1;
      border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:6px">
      <span style="width:6px;height:6px;border-radius:50%;background:${sectionColors[sec]};display:inline-block"></span>
      ${sectionLabels[sec]||sec} <span style="font-weight:400">(${secRows.length})</span>
    </div>`;
    secRows.forEach((r, idx) => {
      // Use index into _qpRows as stable identifier
      const globalIdx = _qpRows.indexOf(r);
      html += `<div class="picker-item qp-row ${r.sel?'selected':''}" data-idx="${globalIdx}" onclick="qpToggle(${globalIdx},this)">
        <div class="picker-check">${r.sel?'&#10003;':''}</div>
        <span class="qp-label">${r.label}</span>
      </div>`;
    });
  });
  el.innerHTML = html;
}

function qpToggle(idx, el) {
  const r = _qpRows[idx]; if (!r) return;
  r.toggle();
  el.classList.toggle('selected', r.sel);
  const chk = el.querySelector('.picker-check');
  if (chk) chk.innerHTML = r.sel ? '&#10003;' : '';
}
