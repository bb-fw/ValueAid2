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
    <div class="info-box">${isB?'&#127968; Per-Unit':'&#128196; Standard'} layout &bull; ${VA.esc(p.addr||'')}</div>
    <div class="sectlbl">1. Project Information</div>
    <div class="fg"><label class="fl">Reference No.</label><input type="text" id="ed-ref" value="${VA.esc(p.ref||'')}" oninput="autoSave()"></div>
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
    <div class="r2">
      <div class="fg"><label class="fl">No. of Storeys</label><input type="number" id="ed-storeys" value="${p.storeys||''}" min="1" oninput="autoSave()"></div>
      <div class="fg"><label class="fl">Occupancy</label>
        <select id="ed-occ" onchange="autoSave()"><option value="">— Select —</option>
        ${['Owner-Occupied','Tenanted','Vacant','Partially Owner-Occupied & Tenanted','Partially Owner-Occupied & Vacant','Partially Tenanted & Vacant','N.A.'].map(o=>`<option${p.occ===o?' selected':''}>${VA.esc(o)}</option>`).join('')}
        </select>
      </div>
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
}

// ── Valuer / property type inline managers ────────────────────
function refreshValuerDrop(){const s=document.getElementById('ed-valuer');if(!s)return;const c=s.value;s.innerHTML='<option value="">— Select —</option>'+VA.db.valuers.map(v=>`<option${v===c?' selected':''}>${VA.esc(v)}</option>`).join('');}
function refreshPtypeDrop(){const s=document.getElementById('ed-ptype');if(!s)return;const c=s.value;s.innerHTML='<option value="">— Select —</option>'+VA.db.propertyTypes.map(t=>`<option${t===c?' selected':''}>${VA.esc(t)}</option>`).join('');}
function openValuerMgr(){openInlineMgr('Manage Valuers',()=>VA.db.valuers,v=>{if(!VA.db.valuers.includes(v)){VA.db.valuers.push(v);VA.save();}},i=>{VA.db.valuers.splice(i,1);VA.save();},()=>refreshValuerDrop());}
function openPtypeMgr(){openInlineMgr('Property Types',()=>VA.db.propertyTypes,v=>{if(!VA.db.propertyTypes.includes(v)){VA.db.propertyTypes.push(v);VA.save();}},i=>{VA.db.propertyTypes.splice(i,1);VA.save();},()=>refreshPtypeDrop());}

// ── HDB toggle ────────────────────────────────────────────────
function toggleHDB() {
  const p=gP(); if(!p) return;
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
function autoSave(){ const p=readEd(); if(p) VA.save(); }
function saveClose(){ autoSave(); location.href='index.html'; }
function doExportPDF(){ const p=readEd(); if(p){ VA.save(); exportProjectPDF(p); } }

function rebuildFindings(p) {
  const scrollY = window.scrollY;
  buildEditor(p);
  requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

function confirmDelete() {
  const p=gP();
  document.getElementById('conf-msg').textContent=`Delete "${p?.addr||'this project'}"? Cannot be undone.`;
  document.getElementById('conf-btn').onclick=()=>{
    VA.db.projects=VA.db.projects.filter(x=>x.id!==pid);
    VA.save(); closeOv('ov-conf'); toast('Deleted');
    setTimeout(()=>location.href='index.html',400);
  };
  openOv('ov-conf');
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
