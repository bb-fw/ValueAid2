// ═══════════════════════════════════════════════════════════════
//  ValueAid — Editor Findings
//  Standard layout (Layout A): categories + accommodations
//  Per-unit layout (Layout B): units with per-unit categories
// ═══════════════════════════════════════════════════════════════
'use strict';

// ══════════════════════════════════════════════════════════════
//  LAYOUT A — Standard
// ══════════════════════════════════════════════════════════════
function buildFA(p) {
  let h = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <span class="sectlbl" style="margin:0">2. Inspection Findings</span>
    <button class="btn bs bsm" onclick="openAddCatToProject()">+ Add Category</button>
  </div>`;
  (p.cats||[]).forEach((cat, ci) => {
    h += `<div class="flat-sec">
      <div class="flat-hdr cat-hdr-wrap">
        <h4 style="flex:1">${VA.esc(cat.name)}</h4>
        <button class="btn bs bsm" onclick="openCatPicker(${ci})">Edit Items</button>
        <button class="btn bs bsm" id="catmenu-btn-${ci}" onclick="toggleCatMenu(${ci},event)" style="padding:6px 9px;font-size:16px;line-height:1">&#8942;</button>
        <div class="cat-menu" id="catmenu-${ci}">
          <div class="cat-menu-item" onclick="closeCatMenu();moveProjCat(${ci},-1)" ${ci===0?'style="opacity:.4;pointer-events:none"':''}>&#8593; Move Up</div>
          <div class="cat-menu-item" onclick="closeCatMenu();moveProjCat(${ci},1)" ${ci===(p.cats.length-1)?'style="opacity:.4;pointer-events:none"':''}>&#8595; Move Down</div>
          <div class="cat-menu-item" onclick="closeCatMenu();openNoteEditor('cat',${ci},-1)">&#128221; Add / Edit Note</div>
          <div class="cat-menu-item" onclick="closeCatMenu();saveCatToSettings(${ci})">&#128190; Save to Settings</div>
          <div class="cat-menu-item danger" onclick="closeCatMenu();removeProjCat(${ci})">&#10005; Remove from Project</div>
        </div>
      </div>
      <div class="flat-body">
        <div class="sel-preview" id="cat-prev-${ci}"></div>
        <div id="cat-note-${ci}"></div>
      </div>
    </div>`;
  });
  h += `<div class="divider"></div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <span class="sectlbl" style="margin:0">3. Accommodations</span>
    <button class="btn bs bsm" onclick="openAddLevel()">+ Add Level</button>
  </div>
  <p class="hint mb8">Add levels, then tap Edit Rooms within each level.</p>
  <div id="ac-lvls"></div>`;
  return h;
}

function refreshCatPrev(p, ci) {
  const el = document.getElementById('cat-prev-' + ci); if (!el) return;
  const sel = (p.cats[ci].items||[]).filter(i=>i.sel).map(i=>i.name);
  el.innerHTML = sel.length
    ? sel.map(n=>`<span class="sel-tag">${VA.esc(n)}</span>`).join('')
    : '<span style="font-size:12px;color:var(--txmt);font-style:italic">None selected</span>';
  refreshNoteTag('cat-note-'+ci, p.cats[ci].notes, `openNoteEditor('cat',${ci},-1)`);
}

function openCatPicker(ci) {
  const p=gP(); if(!p) return;
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const cat = p.cats[ci];
  const allItems = (cat.items||[]).map(i=>i.name);
  const selSet = new Set((cat.items||[]).filter(i=>i.sel).map(i=>i.name));
  VA_PICKER.openMulti(cat.name, allItems, selSet,
    (item,nowSel) => { const ii=(cat.items||[]).findIndex(i=>i.name===item); if(ii>=0) p.cats[ci].items[ii].sel=nowSel; },
    (cn) => { if(!cat.items.find(i=>i.name===cn)) cat.items.push({name:cn,sel:true}); },
    () => { refreshCatPrev(p,ci); VA.save(); }
  );
}

function moveProjCat(ci, dir) {
  const p=gP(); if(!p) return;
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const cats=p.cats; if(ci+dir<0||ci+dir>=cats.length) return;
  [cats[ci],cats[ci+dir]]=[cats[ci+dir],cats[ci]];
  VA.save(); rebuildFindings(p);
}

function removeProjCat(ci) {
  const p=gP();
  if(gP()&&gP().archived){toast('Project is archived');return;} if(!p) return;
  const cat=p.cats[ci];
  const hasSelected=(cat.items||[]).some(i=>i.sel);
  if(hasSelected && !confirm(`Remove "${cat.name}" from this project? It has selected items that will be lost.`)) return;
  if(!hasSelected && !confirm(`Remove "${cat.name}" from this project?`)) return;
  p.cats.splice(ci,1); VA.save(); rebuildFindings(p);
}

function openAddCatToProject() {
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const p=gP(); if(!p) return;
  const existingIds=new Set((p.cats||[]).map(c=>c.id).filter(Boolean));
  const existingNames=new Set((p.cats||[]).map(c=>c.name.toLowerCase()));
  const available=VA.activeCats().filter(c=>!existingIds.has(c.id)&&!existingNames.has(c.name.toLowerCase()));
  VA_PICKER.openSingle(
    'Add Category',
    available.map(c=>c.name+' ('+c.items.length+' items)'),
    (label) => {
      const name = label.replace(/ \(\d+ items\)$/, '');
      const cat = available.find(c=>c.name===name);
      if (cat) { addCatToProject(cat.id, cat.name, cat.items); return; }
      addCatToProject(null, name, []);
    },
    (name) => {
      const existing=VA.activeCats().find(c=>c.name.toLowerCase()===name.toLowerCase());
      if(existing&&!existingIds.has(existing.id)){
        addCatToProject(existing.id, existing.name, existing.items);
        toast('Added: '+existing.name);
      } else {
        addCatToProject(null, name, []);
        toast('Added project-only: '+name);
      }
    }
  );
}

function addCatToProject(globalId, name, items) {
  const p=gP(); if(!p) return;
  p.cats.push({
    id: globalId||null, name,
    items: items.map(it=>({name:typeof it==='string'?it:it.name, sel:false})),
    notes:''
  });
  VA.save(); rebuildFindings(p);
}

function saveCatToSettings(ci) {
  const p=gP(); if(!p) return;
  const cat=p.cats[ci];
  const items=cat.items.map(i=>i.name);
  const sameNameCat=VA.activeCats().find(c=>c.name.toLowerCase()===cat.name.toLowerCase()&&c.id!==cat.id);
  if(sameNameCat){
    if(!confirm(`A category named "${sameNameCat.name}" already exists in your library.\nReplace its item list?\n\nProject: "${cat.name}" (${items.length} items)\nLibrary: "${sameNameCat.name}" (${sameNameCat.items.length} items)`)) return;
    sameNameCat.items=[...items]; cat.id=sameNameCat.id; VA.save(); toast('Library category updated'); return;
  }
  if(cat.id){const gc=VA.catById(cat.id);if(gc){gc.items=[...items];VA.save();toast('Library category updated');return;}}
  const newId=VA.uid();
  VA.db.categories.push({id:newId,name:cat.name,items:[...items]});
  cat.id=newId; VA.save(); toast('Saved "'+cat.name+'" to Settings');
}

// ── Accommodations ────────────────────────────────────────────
function renderLevels(p) {
  const el = document.getElementById('ac-lvls'); if (!el) return;
  if (!p.levels||!p.levels.length) { el.innerHTML='<p class="hint">No levels added. Tap + Add Level above.</p>'; return; }
  el.innerHTML = p.levels.map((lv,li) => {
    const rv = (lv.rooms||[]).length
      ? (lv.rooms||[]).map(r=>`<span class="sel-tag">${VA.esc(r)}</span>`).join('')
      : '<span style="font-size:12px;color:var(--txmt);font-style:italic">No rooms selected</span>';
    return `<div class="flat-sec">
      <div class="flat-hdr cat-hdr-wrap">
        <h4 style="flex:1">${VA.esc(lv.name)}</h4>
        <button class="btn bs bsm" onclick="openRoomPicker(${li})">Edit Rooms</button>
        <button class="btn bs bsm" id="lvmenu-btn-${li}" onclick="toggleCatMenu('lv${li}',event)" style="padding:6px 9px;font-size:16px;line-height:1">&#8942;</button>
        <div class="cat-menu" id="catmenu-lv${li}">
          <div class="cat-menu-item" onclick="closeCatMenu();moveLv(${li},-1)" ${li===0?'style="opacity:.4;pointer-events:none"':''}>&#8593; Move Up</div>
          <div class="cat-menu-item" onclick="closeCatMenu();moveLv(${li},1)" ${li===p.levels.length-1?'style="opacity:.4;pointer-events:none"':''}>&#8595; Move Down</div>
          <div class="cat-menu-item" onclick="closeCatMenu();openNoteEditor('level',-1,${li})">&#128221; Add / Edit Note</div>
          <div class="cat-menu-item danger" onclick="closeCatMenu();removeLevel(${li})">&#10005; Remove Level</div>
        </div>
      </div>
      <div class="flat-body">
        <div class="sel-preview" id="rooms-prev-${li}">${rv}</div>
        <div id="lv-note-${li}">${lv.notes?`<span class="note-tag" onclick="openNoteEditor('level',-1,${li})">&#128221; ${VA.esc(lv.notes)}</span>`:''}</div>
      </div>
    </div>`;
  }).join('');
}

function moveLv(li, dir) {
  const p=gP(); if(!p) return;
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const lvs=p.levels; if(li+dir<0||li+dir>=lvs.length) return;
  [lvs[li],lvs[li+dir]]=[lvs[li+dir],lvs[li]];
  VA.save(); renderLevels(p);
}

function openAddLevel() {
  const p=gP(); if(!p) return;
  VA_PICKER.openSingle(
    'Add Level',
    VA.db.levelNames,
    (name) => { addLevelNamed(name); },
    (name) => { addLevelNamed(name); }
  );
}

function addLevelNamed(name) {
  const p=gP(); if(!p) return;
  p.levels.push({id:VA.uid(),name,rooms:[],notes:''});
  VA.save(); renderLevels(p);
}

function openRoomPicker(li) {
  const p=gP(); if(!p||!p.levels[li]) return;
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const rooms = p.roomSnapshot && p.roomSnapshot.length ? p.roomSnapshot : VA.getActiveRooms();
  const extra = (p.levels[li].rooms||[]).filter(r=>!rooms.includes(r));
  const allItems = [...rooms,...extra];
  const selSet = new Set(p.levels[li].rooms||[]);
  VA_PICKER.openMulti(p.levels[li].name+' — Rooms', allItems, selSet,
    (room,nowSel) => {
      if(!p.levels[li].rooms) p.levels[li].rooms=[];
      if(nowSel){if(!p.levels[li].rooms.includes(room))p.levels[li].rooms.push(room);}
      else{p.levels[li].rooms=p.levels[li].rooms.filter(x=>x!==room);}
    },
    (cr) => { if(!p.levels[li].rooms)p.levels[li].rooms=[]; if(!p.levels[li].rooms.includes(cr))p.levels[li].rooms.push(cr); },
    () => {
      // Re-sort selected rooms to match the master list order
      const ordered = allItems.filter(r => (p.levels[li].rooms||[]).includes(r));
      const custom = (p.levels[li].rooms||[]).filter(r => !allItems.includes(r));
      p.levels[li].rooms = [...ordered, ...custom];
      const el=document.getElementById('rooms-prev-'+li);
      if(el){const rv=p.levels[li].rooms;el.innerHTML=rv.length?rv.map(r=>`<span class="sel-tag">${VA.esc(r)}</span>`).join(''):'<span style="font-size:12px;color:var(--txmt);font-style:italic">No rooms selected</span>';}
      VA.save();
    }
  );
}

function removeLevel(li){const p=gP();if(!p)return;
  if(gP()&&gP().archived){toast('Project is archived');return;}if(!confirm('Remove this level?'))return;p.levels.splice(li,1);VA.save();renderLevels(p);}

// ══════════════════════════════════════════════════════════════
//  LAYOUT B — Per-unit
// ══════════════════════════════════════════════════════════════
function buildFB(p) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <span class="sectlbl" style="margin:0">2. Findings Per Unit / Room</span>
    <button class="btn bs bsm" onclick="openAddUnitPicker()">+ Add Unit / Room</button>
  </div>
  <p class="hint mb8">Tap a unit to expand and record findings. Each unit has its own category list.</p>
  <div id="units-list"></div>`;
}

function getOpenUnits() {
  const open=new Set();
  document.querySelectorAll('.unit-body.open').forEach(b=>{
    const m=b.id.match(/^ub-(\d+)$/);if(m)open.add(parseInt(m[1]));
  });
  return open;
}

function cntUnitOwn(u) {
  let n=0;
  (u.cats||[]).forEach(cat => {
    const ud=u.catData&&u.catData[catKey(cat)]?u.catData[catKey(cat)]:{items:[]};
    n+=(ud.items||[]).filter(i=>i.sel).length;
  });
  return n;
}

function renderUnits(p, keepOpen) {
  const el=document.getElementById('units-list'); if(!el) return;
  const openSet = keepOpen !== undefined ? keepOpen : getOpenUnits();
  if(!p.levels||!p.levels.length){el.innerHTML='<p class="hint mb8">No units added. Tap + Add Unit / Room above.</p>';return;}
  el.innerHTML = p.levels.map((u,ui) => {
    const unitCats = u.cats || p.cats || [];
    const prevLines = unitCats.map((cat) => {
      const ud=u.catData&&u.catData[catKey(cat)]?u.catData[catKey(cat)]:{items:[]};
      const sel=(ud.items||[]).filter(i=>i.sel).map(i=>i.name);
      return sel.length ? `<b>${VA.esc(cat.name)}:</b> ${VA.esc(sel.join(', '))}` : null;
    }).filter(Boolean);
    return `<div class="unit-card">
      <div class="unit-hdr" style="cursor:default">
        <div style="flex:1;display:flex;align-items:center;gap:8px;cursor:pointer" onclick="toggleUnit(this.closest('.unit-hdr'))">
          <h4 style="margin:0">${VA.esc(u.name||'Unit')}</h4>
          <span style="font-size:12px;color:var(--txmt)">${cntUnitOwn(u)} items</span>
          <span class="chev">&#9660;</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0" onclick="event.stopPropagation()">
          <button class="btn bs bsm" id="unitmenu-btn-${ui}" onclick="toggleCatMenu('unit${ui}',event)" style="padding:6px 9px;font-size:16px;line-height:1">&#8942;</button>
          <div class="cat-menu" id="catmenu-unit${ui}">
            <div class="cat-menu-item" onclick="closeCatMenu();moveUnit(${ui},-1)" ${ui===0?'style="opacity:.4;pointer-events:none"':''}>&#8593; Move Up</div>
            <div class="cat-menu-item" onclick="closeCatMenu();moveUnit(${ui},1)" ${ui===p.levels.length-1?'style="opacity:.4;pointer-events:none"':''}>&#8595; Move Down</div>
            <div class="cat-menu-item" onclick="closeCatMenu();openNoteEditor('unit',-1,${ui})">&#128221; ${u.notes?'Edit':'Add'} Remarks</div>
            <div class="cat-menu-item danger" onclick="closeCatMenu();removeUnit(${ui})">&#10005; Remove Unit</div>
          </div>
        </div>
      </div>
      ${prevLines.length?`<div class="unit-preview">${prevLines.join('<br>')}</div>`:''}
      <div class="unit-body" id="ub-${ui}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--txmt)">Categories</span>
          <button class="btn bs bsm" style="font-size:12px;padding:4px 8px" onclick="openAddCatToUnit(${ui})">+ Add Category</button>
        </div>
        ${unitCats.map((cat,uci)=>{
          const ud=u.catData&&u.catData[catKey(cat)]?u.catData[catKey(cat)]:{items:VA.mkCats([cat])[0].items,notes:''};
          const sel=(ud.items||[]).filter(i=>i.sel).map(i=>i.name);
          return `<div class="flat-sec" style="margin-bottom:7px">
            <div class="flat-hdr cat-hdr-wrap" style="padding:9px 11px">
              <h4 style="font-size:13px;flex:1">${VA.esc(cat.name)}</h4>
              <button class="btn bs bsm" style="font-size:12px;padding:4px 9px" onclick="openUnitCatPicker(${ui},${uci})">Edit</button>
              <button class="btn bs bsm" id="ucatmenu-btn-${ui}-${uci}" onclick="toggleCatMenu('u${ui}_${uci}',event)" style="padding:4px 7px;font-size:14px;line-height:1">&#8942;</button>
              <div class="cat-menu" id="catmenu-u${ui}_${uci}">
                <div class="cat-menu-item" onclick="closeCatMenu();moveUnitCat(${ui},${uci},-1)" ${uci===0?'style="opacity:.4;pointer-events:none"':''}>&#8593; Move Up</div>
                <div class="cat-menu-item" onclick="closeCatMenu();moveUnitCat(${ui},${uci},1)" ${uci===unitCats.length-1?'style="opacity:.4;pointer-events:none"':''}>&#8595; Move Down</div>
                <div class="cat-menu-item" onclick="closeCatMenu();openNoteEditor('ucat',${uci},${ui})">&#128221; Add / Edit Note</div>
                <div class="cat-menu-item" onclick="closeCatMenu();saveUnitCatToSettings(${ui},${uci})">&#128190; Save to Settings</div>
                <div class="cat-menu-item danger" onclick="closeCatMenu();removeUnitCat(${ui},${uci})">&#10005; Remove from Unit</div>
              </div>
            </div>
            <div class="flat-body" style="padding:8px 11px">
              <div class="sel-preview" id="up-${ui}-${uci}">${sel.length?sel.map(n=>`<span class="sel-tag">${VA.esc(n)}</span>`).join(''):'<span style="font-size:12px;color:var(--txmt);font-style:italic">None selected</span>'}</div>
              <div id="ucatnote-${ui}-${uci}">${ud.notes?`<span class="note-tag" onclick="openNoteEditor('ucat',${uci},${ui})">&#128221; ${VA.esc(ud.notes)}</span>`:''}</div>
            </div>
          </div>`;
        }).join('')}
        <div id="unitnote-${ui}" style="margin-top:4px">${u.notes?`<span class="note-tag" onclick="openNoteEditor('unit',-1,${ui})">&#128221; ${VA.esc(u.notes)}</span>`:''}</div>
      </div>
    </div>`;
  }).join('');
  openSet.forEach(ui => {
    const body = document.getElementById('ub-'+ui);
    const chev = body?.closest('.unit-card')?.querySelector('.chev');
    if(body){body.classList.add('open');if(chev)chev.innerHTML='&#9650;';}
  });
}

function toggleUnit(hdr){
  const card=hdr.closest('.unit-card'); if(!card) return;
  const body=card.querySelector('.unit-body');
  const chev=card.querySelector('.chev');
  body.classList.toggle('open');
  if(chev)chev.innerHTML=body.classList.contains('open')?'&#9650;':'&#9660;';
}

function moveUnit(ui, dir) {
  const p=gP(); if(!p) return;
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const lvs=p.levels; if(ui+dir<0||ui+dir>=lvs.length) return;
  const open=getOpenUnits();
  const newOpen=new Set();
  open.forEach(i=>{ if(i===ui)newOpen.add(ui+dir); else if(i===ui+dir)newOpen.add(ui); else newOpen.add(i); });
  [lvs[ui],lvs[ui+dir]]=[lvs[ui+dir],lvs[ui]];
  VA.save(); renderUnits(p, newOpen);
}

function removeUnit(ui) {
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const p=gP(); if(!p) return;
  const u=p.levels[ui];
  const hasData=cntUnitOwn(u)>0;
  if(hasData && !confirm(`Remove "${u.name||'Unit'}"? It has selected items that will be lost.`)) return;
  if(!hasData && !confirm(`Remove "${u.name||'Unit'}"?`)) return;
  const open=getOpenUnits();
  const newOpen=new Set();
  open.forEach(i=>{ if(i<ui) newOpen.add(i); else if(i>ui) newOpen.add(i-1); });
  p.levels.splice(ui,1); VA.save(); renderUnits(p, newOpen);
}

function openAddUnitPicker() {
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const p=gP(); if(!p) return;
  const rooms = (p.roomSnapshot&&p.roomSnapshot.length) ? p.roomSnapshot : VA.getActiveRooms();
  VA_PICKER.openSingle(
    'Add Unit / Room', rooms,
    (name) => { addUnit(name); },
    (name) => { addUnit(name); }
  );
}

function addUnit(name){
  const p=gP(); if(!p) return;
  if(!p.levels)p.levels=[];
  const _open=getOpenUnits();
  p.levels.push({
    id:VA.uid(), name,
    cats: p.cats.map(c=>({id:c.id,name:c.name,items:c.items.map(it=>({name:it.name,sel:false})),notes:''})),
    catData:{}, notes:''
  });
  VA.save(); renderUnits(p,_open); toast('Added: '+name);
}

function moveUnitCat(ui, uci, dir) {
  const p=gP(); if(!p||!p.levels[ui]) return;
  if(p.archived){toast('Project is archived');return;}
  const u=p.levels[ui];
  if(!u.cats) u.cats=[...p.cats];
  const cats=u.cats;
  if(uci+dir<0||uci+dir>=cats.length) return;
  const open=getOpenUnits();
  [cats[uci],cats[uci+dir]]=[cats[uci+dir],cats[uci]];
  VA.save(); renderUnits(p, open);
}

function removeUnitCat(ui, uci) {
  const p=gP(); if(!p||!p.levels[ui]) return;
  if(p.archived){toast('Project is archived');return;}
  const u=p.levels[ui];
  if(!u.cats) u.cats=[...p.cats];
  const cat=u.cats[uci];
  const ud=u.catData&&u.catData[catKey(cat)]?u.catData[catKey(cat)]:{items:[]};
  const hasSelected=(ud.items||[]).some(i=>i.sel);
  if(hasSelected && !confirm(`Remove "${cat.name}" from this unit? Selected items will be lost.`)) return;
  if(!hasSelected && !confirm(`Remove "${cat.name}" from this unit?`)) return;
  const _open=getOpenUnits();
  u.cats.splice(uci,1); VA.save(); renderUnits(p,_open);
}

function openAddCatToUnit(ui) {
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const p=gP(); if(!p||!p.levels[ui]) return;
  const u=p.levels[ui];
  if(!u.cats) u.cats=[...p.cats];
  const existingNames=new Set(u.cats.map(c=>c.name.toLowerCase()));
  const available=VA.activeCats().filter(c=>!existingNames.has(c.name.toLowerCase()));
  VA_PICKER.openSingle(
    'Add Category to '+(u.name||'Unit'),
    available.map(c=>c.name+' ('+c.items.length+' items)'),
    (label) => {
      const name = label.replace(/ \(\d+ items\)$/, '');
      const cat = available.find(c=>c.name===name);
      if (cat) { addCatToUnit(ui,{id:cat.id,name:cat.name,items:cat.items}); return; }
      addCatToUnit(ui,{id:null,name,items:[]});
    },
    (name) => {
      const existing=VA.activeCats().find(c=>c.name.toLowerCase()===name.toLowerCase());
      if(existing&&!existingNames.has(existing.name.toLowerCase())){
        addCatToUnit(ui,{id:existing.id,name:existing.name,items:existing.items});
      } else {
        addCatToUnit(ui,{id:null,name,items:[]});
      }
    }
  );
}

function addCatToUnit(ui, catDef) {
  const p=gP(); if(!p||!p.levels[ui]) return;
  const u=p.levels[ui];
  if(!u.cats) u.cats=[...p.cats];
  u.cats.push({id:catDef.id||null,name:catDef.name,items:catDef.items.map(it=>({name:typeof it==='string'?it:it.name,sel:false})),notes:''});
  const _open=getOpenUnits();
  VA.save(); renderUnits(p,_open); toast('Added: '+catDef.name);
}

function openUnitCatPicker(ui, uci) {
  if(gP()&&gP().archived){toast('Project is archived');return;}
  const p=gP(); if(!p||!p.levels[ui]) return;
  const u=p.levels[ui];
  const unitCats=u.cats||p.cats;
  const cat=unitCats[uci]; if(!cat) return;
  if(!u.catData)u.catData={};
  const _ck=catKey(cat);
  if(!u.catData[_ck])u.catData[_ck]={items:VA.mkCats([cat])[0].items,notes:''};
  const ud=u.catData[_ck];
  const allItems=(ud.items||[]).map(i=>i.name);
  const selSet=new Set((ud.items||[]).filter(i=>i.sel).map(i=>i.name));
  VA_PICKER.openMulti(u.name+' — '+cat.name, allItems, selSet,
    (item,nowSel)=>{const ii=ud.items.findIndex(i=>i.name===item);if(ii>=0)ud.items[ii].sel=nowSel;},
    (cn)=>{if(!ud.items.find(i=>i.name===cn))ud.items.push({name:cn,sel:true});},
    ()=>{
      const el=document.getElementById(`up-${ui}-${uci}`);
      if(el){const sel=(ud.items||[]).filter(i=>i.sel).map(i=>i.name);el.innerHTML=sel.length?sel.map(n=>`<span class="sel-tag">${VA.esc(n)}</span>`).join(''):'<span style="font-size:12px;color:var(--txmt);font-style:italic">None selected</span>';}
      const prevEl=document.querySelector(`#ub-${ui}`)?.closest('.unit-card')?.querySelector('.unit-preview');
      if(prevEl){
        const lines=(u.cats||p.cats).map(c=>{const k2=catKey(c);const ud2=u.catData&&u.catData[k2]?u.catData[k2]:{items:[]};const s2=(ud2.items||[]).filter(i=>i.sel).map(i=>i.name);return s2.length?`<b>${VA.esc(c.name)}:</b> ${VA.esc(s2.join(', '))}`:null;}).filter(Boolean);
        prevEl.innerHTML=lines.join('<br>')||'';
      }
      const cnt=document.querySelector(`#ub-${ui}`)?.closest('.unit-card')?.querySelector('.unit-hdr span');
      if(cnt)cnt.textContent=cntUnitOwn(u)+' items';
      VA.save();
    }
  );
}

function saveUnitCatToSettings(ui, uci) {
  const p=gP(); if(!p||!p.levels[ui]) return;
  const u=p.levels[ui];
  const cat=(u.cats||p.cats)[uci]; if(!cat) return;
  const items=(cat.items||[]).map(i=>i.name||i);
  const sameNameCat=VA.activeCats().find(c=>c.name.toLowerCase()===cat.name.toLowerCase()&&c.id!==cat.id);
  if(sameNameCat){if(!confirm(`A category named "${sameNameCat.name}" already exists in your library.\nReplace its item list?`))return;sameNameCat.items=[...items];cat.id=sameNameCat.id;VA.save();toast('Library updated');return;}
  if(cat.id){const gc=VA.catById(cat.id);if(gc){gc.items=[...items];VA.save();toast('Library category updated');return;}}
  const newId=VA.uid();VA.db.categories.push({id:newId,name:cat.name,items:[...items]});cat.id=newId;VA.save();toast('Saved "'+cat.name+'" to Settings');
}
