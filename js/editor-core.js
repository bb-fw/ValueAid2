// ═══════════════════════════════════════════════════════════════
//  ValueAid — Editor Core
//  Project info form, auto-save, read/write, delete, PDF export
// ═══════════════════════════════════════════════════════════════
'use strict';

let pid = null;
const gP = () => VA.db.projects.find(x => x.id === pid);
const catKey = (cat) => cat.id || cat.name;

// ── Build editor ──────────────────────────────────────────────
function buildEditor(p) {
  const isB = p.layout === 'B';
  document.getElementById('ed-body').innerHTML = `
    ${p.archived ? '<div class="info-box" style="background:var(--ambg);color:var(--am);border-color:var(--am);display:flex;align-items:center;gap:8px"><span>&#128274;</span><span style="flex:1"><b>Archived</b> — this project is read-only</span></div>' : ''}
    <div class="info-box">${isB?'&#127968; Per-Unit':'&#128196; Standard'} layout &bull; ${VA.esc(p.addr||'')}</div>
    <div class="sectlbl">1. Project Information</div>
    <div class="fg">
      <label class="fl" style="display:flex;align-items:center;justify-content:space-between">
        <span>Reference No.</span>
        ${p.caseId
          ? '<span style="font-size:11px;color:var(--gn);font-weight:600;cursor:pointer" onclick="viewLinkedCase()">&#128279; Linked to Case</span>'
          : '<button class="btn bs" style="font-size:11px;padding:2px 8px" onclick="createCaseFromProject()">&#128203; Create Case</button>'
        }
      </label>
      <input type="text" id="ed-ref" inputmode="numeric" maxlength="6" placeholder="e.g. 240123"
             value="${VA.esc(p.ref||'')}" oninput="edRefInput(this.value)">
      <div id="ed-ref-warn" style="font-size:11px;color:var(--am);margin-top:3px;display:none">
        &#9888; Ref no. should be exactly 6 digits
      </div>
    </div>
    <div class="r2">
      <div class="fg"><label class="fl">Date of Inspection</label><input type="date" id="ed-date" value="${p.date||''}" onchange="autoSave()"></div>
      <div class="fg"><label class="fl">Time</label><input type="time" id="ed-time" value="${p.time||''}" onchange="autoSave()"></div>
    </div>
    <div class="fg"><label class="fl">Valuer-in-Charge</label>
      <div style="display:flex;gap:6px"><select id="ed-valuer" style="flex:1" onchange="autoSave()"></select><button class="btn bs bsm" onclick="openValuerMgr()">Edit</button></div>
    </div>
    <div class="fg"><label class="fl">Property Type</label>
      <div style="display:flex;gap:6px"><select id="ed-ptype" style="flex:1" onchange="autoSave()"></select><button class="btn bs bsm" onclick="openPtypeMgr()">Edit</button></div>
    </div>
    <div class="fg"><label class="fl">Occupancy</label>
      <select id="ed-occ" onchange="autoSave()"><option value="">— Select —</option>
      ${['Owner-Occupied','Tenanted','Vacant','Partially Owner-Occupied & Tenanted','Partially Owner-Occupied & Vacant','Partially Tenanted & Vacant','N.A.'].map(o=>`<option${p.occ===o?' selected':''}>${VA.esc(o)}</option>`).join('')}
      </select>
    </div>
    <div class="fg"><label class="fl">Property Address</label><input type="text" id="ed-addr" value="${VA.esc(p.addr||'')}" oninput="autoSave()"></div>
    <div class="fg"><label class="fl">Condition</label>
      <select id="ed-cond" onchange="autoSave()"><option value="">— Select —</option>
      ${['New','Very Good','Good','Above Average','Average','Below Average','Fair','Poor','Under Construction'].map(c=>`<option${p.cond===c?' selected':''}>${VA.esc(c)}</option>`).join('')}
      </select>
    </div>
    <div class="fg" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);margin-top:4px">
      <span style="flex:1;font-size:14px;font-weight:500">Use HDB Settings</span>
      <button id="hdb-tog" class="toggle${p.isHDB?' on':''}" onclick="toggleHDB()" style="flex-shrink:0"></button>
    </div>
    <div id="hdb-fields" style="display:${p.isHDB?'block':'none'}">
      <div class="fg mt8"><label class="fl">No. of Storeys</label><input type="number" id="ed-storeys" value="${p.storeys||''}" min="1" oninput="autoSave()"></div>
      <div class="r2 mt8">
        <div class="fg"><label class="fl">Recess Area (m²)</label><input type="number" id="ed-recess" oninput="autoSave()" value="${VA.esc(p.recess||'')}" min="0" step="0.1" placeholder="e.g. 2.5"></div>
        <div class="fg">
          <label class="fl" title="Living area faces this direction">Orientation &#9432;</label>
          <select id="ed-orient" onchange="autoSave()">
            <option value="">— Select —</option>
            ${['North','North-East','East','South-East','South','South-West','West','North-West'].map(d=>`<option${p.orientation===d?' selected':''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="r2">
        <div class="fg"><label class="fl">MUP</label>
          <select id="ed-mup" onchange="autoSave()">
            <option value="">— Select —</option>
            <option${p.mup==='Yes'?' selected':''}>Yes</option>
            <option${p.mup==='No'?' selected':''}>No</option>
          </select>
        </div>
        <div class="fg"><label class="fl">SAI</label><input type="text" id="ed-sai" oninput="autoSave()" value="${VA.esc(p.sai||'')}" placeholder="e.g. 12A"></div>
      </div>
      <div class="fg"><label class="fl">Location of Unit</label>
        <select id="ed-uloc" onchange="autoSave()">
          <option value="">— Select —</option>
          ${['Corridor','End','Corner','Door to Door','Point Block'].map(l=>`<option${p.unitLocation===l?' selected':''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="divider"></div>
    ${isB ? buildFB(p) : buildFA(p)}
    <div class="divider"></div>
    <div class="sectlbl">${isB?'3':'4'}. General Remarks</div>
    <div class="fg"><textarea id="ed-remarks" rows="4" placeholder="Overall assessment and remarks..." oninput="autoSave()">${VA.esc(p.remarks||'')}</textarea></div>
  `;
  const vs = document.getElementById('ed-valuer');
  vs.innerHTML = '<option value="">— Select —</option>' + VA.db.valuers.map(v=>`<option${p.valuer===v?' selected':''}>${VA.esc(v)}</option>`).join('');
  const ps = document.getElementById('ed-ptype');
  ps.innerHTML = '<option value="">— Select —</option>' + VA.db.propertyTypes.map(t=>`<option${p.ptype===t?' selected':''}>${VA.esc(t)}</option>`).join('');
  if (!isB) { (p.cats||[]).forEach((_,ci) => refreshCatPrev(p,ci)); renderLevels(p); }
  else renderUnits(p);
  // Disable all editing controls when archived
  if (p.archived) {
    const body = document.getElementById('ed-body');
    if (body) {
      body.querySelectorAll('input,select,textarea').forEach(el => { el.disabled = true; });
      body.querySelectorAll('button').forEach(el => { el.disabled = true; el.style.opacity = '0.4'; el.style.pointerEvents = 'none'; });
    }
  }
}

// ── Valuer / property type inline managers ────────────────────
function refreshValuerDrop(){const s=document.getElementById('ed-valuer');if(!s)return;const c=s.value;s.innerHTML='<option value="">— Select —</option>'+VA.db.valuers.map(v=>`<option${v===c?' selected':''}>${VA.esc(v)}</option>`).join('');}
function refreshPtypeDrop(){const s=document.getElementById('ed-ptype');if(!s)return;const c=s.value;s.innerHTML='<option value="">— Select —</option>'+VA.db.propertyTypes.map(t=>`<option${t===c?' selected':''}>${VA.esc(t)}</option>`).join('');}
function openValuerMgr(){openInlineMgr('Manage Valuers',()=>VA.db.valuers,v=>{if(!VA.db.valuers.includes(v)){VA.db.valuers.push(v);VA.save();}},i=>{VA.db.valuers.splice(i,1);VA.save();},()=>refreshValuerDrop());}
function openPtypeMgr(){openInlineMgr('Property Types',()=>VA.db.propertyTypes,v=>{if(!VA.db.propertyTypes.includes(v)){VA.db.propertyTypes.push(v);VA.save();}},i=>{VA.db.propertyTypes.splice(i,1);VA.save();},()=>refreshPtypeDrop());}

// ── HDB toggle ────────────────────────────────────────────────
function toggleHDB() {
  const p=gP(); if(!p) return;
  if(p.archived) return;
  p.isHDB = !p.isHDB;
  document.getElementById('hdb-tog')?.classList.toggle('on', p.isHDB);
  document.getElementById('hdb-fields').style.display = p.isHDB ? 'block' : 'none';
  VA.save();
}

// ── Auto-save & close ─────────────────────────────────────────
function readEd() {
  const p=gP(); if(!p) return p;
  const v = id => { const el=document.getElementById(id); return el ? el.value : undefined; };
  const vt = id => { const el=document.getElementById(id); return el ? el.value.trim() : undefined; };
  if(vt('ed-ref')!==undefined) p.ref=vt('ed-ref');
  if(v('ed-date')!==undefined) p.date=v('ed-date');
  if(v('ed-time')!==undefined) p.time=v('ed-time');
  if(v('ed-valuer')!==undefined) p.valuer=v('ed-valuer');
  if(v('ed-ptype')!==undefined) p.ptype=v('ed-ptype');
  if(v('ed-storeys')!==undefined) p.storeys=v('ed-storeys');
  if(v('ed-occ')!==undefined) p.occ=v('ed-occ');
  if(vt('ed-addr')!==undefined) p.addr=vt('ed-addr');
  if(v('ed-cond')!==undefined) p.cond=v('ed-cond');
  if(v('ed-remarks')!==undefined) p.remarks=v('ed-remarks');
  if (p.isHDB) {
    if(v('ed-recess')!==undefined) p.recess=v('ed-recess');
    if(v('ed-orient')!==undefined) p.orientation=v('ed-orient');
    if(v('ed-mup')!==undefined) p.mup=v('ed-mup');
    if(vt('ed-sai')!==undefined) p.sai=vt('ed-sai');
    if(v('ed-uloc')!==undefined) p.unitLocation=v('ed-uloc');
  }
  return p;
}
function edRefInput(val) {
  const warn = document.getElementById('ed-ref-warn');
  if (warn) warn.style.display = (val.length > 0 && !/^\d{6}$/.test(val)) ? 'block' : 'none';
  autoSave();
}

function createCaseFromProject() {
  const p = gP(); if (!p) return;
  autoSave(); // flush current editor state first
  const defaultCl = (VA.db.checklists||[])[0];
  const _d = new Date(); const _iso = _d.getFullYear()+'-'+String(_d.getMonth()+1).padStart(2,'0')+'-'+String(_d.getDate()).padStart(2,'0');
  const newCase = {
    id: VA.uid(),
    ref: p.ref||'', addr: p.addr||'', client:'', phone:'',
    ptype: p.ptype||'', source: p.source||'',
    inspDate: p.date||'', inspTime: p.time||'',
    createdAt: _iso, deadline:'',
    stage: defaultCl ? defaultCl.stages[0] : VA.BUILTIN_STAGES[0],
    delayed: false, notes:'',
    checklistId: defaultCl ? defaultCl.id : '',
    checklistSnapshot: defaultCl ? [...defaultCl.stages] : [...VA.BUILTIN_STAGES],
    projectId: p.id
  };
  p.caseId = newCase.id;
  if (!VA.db.cases) VA.db.cases = [];
  VA.db.cases.push(newCase);
  VA.save();
  buildEditor(p);
  toast('Case created — tap to open');
}

function viewLinkedCase() {
  const p = gP(); if (!p || !p.caseId) return;
  autoSave(); location.href = 'case-editor.html?id=' + p.caseId;
}

function autoSave() {
  const p = readEd(); if (!p) return;
  if (p.archived) return; // read-only — no writes
  // Sync shared fields to linked case
  if (p.caseId) {
    const c = (VA.db.cases||[]).find(x => x.id === p.caseId);
    if (c) {
      // Only sync non-empty values — prevents clearing case data when project field is blank
      if (p.ref)  c.ref = p.ref;
      if (p.addr) c.addr = p.addr;
      if (p.date) c.inspDate = p.date;
      if (p.time) c.inspTime = p.time;
    }
  }
  VA.save();
}
function saveClose(){ autoSave(); location.href='index.html'; }
function doExportPDF(){ const p=gP(); if(!p) return; if(!p.archived){ const r=readEd(); if(!r) return; VA.save(); } exportProjectPDF(p); }

function rebuildFindings(p) {
  const scrollY = window.scrollY;
  buildEditor(p);
  requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

// Delete moved to index.html card ⋮ menu

// ── Editor ⋮ menu (sticky bar) ────────────────────────────────
function toggleEditorMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('ed-more-menu');
  if (!menu) return;
  const p = gP();
  const archiveItem = document.getElementById('ed-archive-item');
  if (archiveItem) archiveItem.textContent = (p && p.archived) ? '\uD83D\uDD13 Unarchive' : '\uD83D\uDD12 Archive';
  const wasOpen = menu.classList.contains('open');
  closeEditorMenu();
  if (!wasOpen) {
    // Position above the button
    const rect = e.currentTarget.getBoundingClientRect();
    const menuH = 96; // approximate: 2 items × 48px
    menu.style.left = Math.max(8, rect.left) + 'px';
    menu.style.top  = (rect.top - menuH - 4) + 'px';
    menu.classList.add('open');
  }
}
function closeEditorMenu() {
  document.getElementById('ed-more-menu')?.classList.remove('open');
}
document.addEventListener('click', () => closeEditorMenu());

function editorArchiveAction() {
  const p = gP(); if (!p) return;
  if (p.archived) {
    if (!confirm('Unarchive this project? It will become editable again.')) return;
    VA.unarchiveProject(p.id);
    buildEditor(p);
    toast('Project unarchived');
  } else {
    const catCount = (p.cats||[]).reduce((n,c)=>(c.items||[]).length+n, 0);
    const selCount  = (p.cats||[]).reduce((n,c)=>(c.items||[]).filter(i=>i.sel||(i.notes&&i.notes.trim())).length+n, 0);
    const trimmed = catCount - selCount;
    const msg = `Archive "${p.addr||'this project'}"?\n\nThis will:\n• Make it read-only\n• Remove ${trimmed} unselected blank items to save space\n\nYou can unarchive later, but the removed items cannot be recovered.`;
    if (!confirm(msg)) return;
    VA.archiveProject(p.id);
    buildEditor(p);
    toast('Project archived');
  }
}

function editorDeleteAction() {
  const p = gP(); if (!p) return;
  if (!confirm(`Delete "${p.addr||'this project'}"? This cannot be undone.`)) return;
  if (p.caseId) { const c=(VA.db.cases||[]).find(x=>x.id===p.caseId); if(c) delete c.projectId; }
  VA.db.projects = VA.db.projects.filter(x => x.id !== p.id);
  VA.save(); toast('Deleted');
  setTimeout(() => location.href='index.html', 300);
}

// ── Category ⋮ menu ───────────────────────────────────────────
let _openCatMenu = null;
function toggleCatMenu(id, e) {
  e.stopPropagation();
  const menu = document.getElementById('catmenu-' + id);
  if (!menu) return;
  const wasOpen = menu.classList.contains('open');
  closeCatMenu();
  if (!wasOpen) {
    const rect = e.currentTarget.getBoundingClientRect();
    menu.style.top = (rect.bottom + 4) + 'px';
    const menuW = 180;
    const left = Math.min(rect.right - menuW, window.innerWidth - menuW - 8);
    menu.style.left = Math.max(8, left) + 'px';
    menu.classList.add('open');
    _openCatMenu = id;
  }
}
function closeCatMenu() {
  if (_openCatMenu !== null) {
    document.getElementById('catmenu-' + _openCatMenu)?.classList.remove('open');
    _openCatMenu = null;
  }
}
document.addEventListener('click', () => closeCatMenu());

// ── Init ──────────────────────────────────────────────────────
function editorInit() {
  pageInit();
  loadCamSticky();
  document.querySelectorAll('.overlay').forEach(el => {
    if (el.id === 'cam-ov') {
      el.addEventListener('click', e => { if (e.target === el) camClose(); });
    } else {
      el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
    }
  });
  const params = new URLSearchParams(location.search);
  pid = params.get('id');
  const proj = gP();
  if (proj) {
    document.getElementById('ed-title').textContent = proj.addr || 'Edit Project';
    buildEditor(proj);
  } else {
    document.getElementById('ed-body').innerHTML =
      '<p style="padding:20px;text-align:center;color:var(--txmt)">Project not found. <a href="index.html">Go back</a></p>';
  }
}
