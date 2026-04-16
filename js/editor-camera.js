// ═══════════════════════════════════════════════════════════════
//  ValueAid — Editor Camera Tagger
//  Photo tagging with sticky context, filename generation,
//  and multi-shot flow
// ═══════════════════════════════════════════════════════════════
'use strict';

const CAM_STICKY_KEY = 'va_cam_sticky';
let camSticky = {};
let camSel = { level:'', room:'', catId:'', item:'' };

function loadCamSticky() {
  try { camSticky = JSON.parse(sessionStorage.getItem(CAM_STICKY_KEY)||'{}'); } catch(e){ camSticky={}; }
}
function saveCamSticky() {
  try { sessionStorage.setItem(CAM_STICKY_KEY, JSON.stringify(camSticky)); } catch(e){}
}
function getStickyForProject() { return camSticky[pid] || {}; }
function setStickyForProject(s) { camSticky[pid] = s; saveCamSticky(); }

function openCameraTag() {
  const _p=gP(); if(_p&&_p.archived){toast('Project is archived — cannot add photos');return;}
  const p = gP(); if(!p) return;
  const sticky = getStickyForProject();
  camSel = { level:sticky.level||'', room:sticky.room||'', catId:sticky.catId||'', item:sticky.item||'' };
  // Validate: clear if item no longer exists
  if (camSel.catId || camSel.item) {
    const allItems = p.layout==='B' ? gatherItemsForUnit(p,null) : gatherItemsFromCats(p);
    if (!allItems.some(x=>x.catId===camSel.catId&&x.item===camSel.item)) {
      camSel.catId=''; camSel.item='';
    }
  }
  renderCamSheet(p);
  openOv('cam-ov');
}

function camClose() {
  setStickyForProject({ level:camSel.level, room:camSel.room, catId:camSel.catId, item:camSel.item });
  closeOv('cam-ov');
}

function camClearAll() {
  camSel = { level:'', room:'', catId:'', item:'' };
  setStickyForProject({ level:'', room:'', catId:'', item:'' });
  const p=gP(); if(p) renderCamSheet(p);
}

function renderCamSheet(p) {
  const isB = p.layout === 'B';
  const body = document.getElementById('cam-body');
  const sticky = getStickyForProject();
  const hasSticky = sticky.level||sticky.room||sticky.catId||sticky.item;
  const fn = buildFilename(p);
  let html = '';

  if (hasSticky) {
    const parts = [sticky.level,sticky.room,sticky.item].filter(Boolean);
    html += `<div class="cam-sticky-banner">
      <span style="flex:1">&#128204; Last used: ${parts.join(' &rsaquo; ')||'(none)'}</span>
      <button class="btn bs bsm" style="font-size:12px;padding:4px 8px" onclick="camLoadSticky()">Restore</button>
    </div>`;
  }

  const hasSelItems = isB ? gatherItemsForUnit(p,null).length>0 : gatherItemsFromCats(p).length>0;
  if (!hasSelItems) {
    html += `<div style="background:var(--ambg);border-radius:var(--r);padding:9px 11px;margin-bottom:10px;font-size:12px;color:var(--am)">&#128161; No inspection items selected yet — select items in the findings section to enable item tagging here.</div>`;
  }

  html += `<div class="cam-preview-bar">Filename: <b id="cam-fn-preview">${fn}</b></div>`;

  if (!sessionStorage.getItem('va_cam_ios_hint')) {
    html += `<p style="font-size:11px;color:var(--txmt);font-style:italic;margin-bottom:10px;line-height:1.5">&#8505;&#65039; On iPhone: after taking the photo, tap <b>Save to Files</b> or <b>Save Image</b> in the Share Sheet.</p>`;
  }

  if (isB) {
    html += _camStep('Unit / Room', 'level', (p.levels||[]).map(u=>u.name), camSel.level);
    const selUnit = camSel.level ? (p.levels||[]).find(u=>u.name===camSel.level) : null;
    const catItems = gatherItemsForUnit(p, selUnit);
    if (catItems.length) html += _camCatItems(catItems);
  } else {
    html += _camStep('Level', 'level', (p.levels||[]).map(lv=>lv.name), camSel.level);
    const selLevel = camSel.level ? (p.levels||[]).find(lv=>lv.name===camSel.level) : null;
    const allRooms = selLevel
      ? (selLevel.rooms||[])
      : [...new Set((p.levels||[]).flatMap(lv=>lv.rooms||[]))];
    if (allRooms.length) html += _camStep('Room / Space', 'room', allRooms, camSel.room);
    const catItems = gatherItemsFromCats(p);
    if (catItems.length) html += _camCatItems(catItems);
  }

  body.innerHTML = html;

  body.querySelectorAll('.cam-tag[data-field]').forEach(tag => {
    tag.addEventListener('click', () => {
      const field=tag.dataset.field, val=tag.dataset.val;
      if (camSel[field]===val) {
        camSel[field]='';
        if(field==='level'){camSel.room='';camSel.catId='';camSel.item='';}
        if(field==='room'){camSel.catId='';camSel.item='';}
      } else {
        camSel[field]=val;
        if(field==='level'){camSel.room='';camSel.catId='';camSel.item='';}
        if(field==='room'){camSel.catId='';camSel.item='';}
      }
      const p2=gP(); if(p2) renderCamSheet(p2);
    });
  });
  body.querySelectorAll('.cam-tag[data-catid]').forEach(tag => {
    tag.addEventListener('click', () => {
      const catId=tag.dataset.catid, item=tag.dataset.val;
      if(camSel.catId===catId&&camSel.item===item){camSel.catId='';camSel.item='';}
      else{camSel.catId=catId;camSel.item=item;}
      const p2=gP(); if(p2) renderCamSheet(p2);
    });
  });

  const fnEl=document.getElementById('cam-fn-preview');
  if(fnEl) fnEl.textContent=buildFilename(p);
}

function _camStep(label, field, options, selected) {
  if(!options.length) return '';
  const tags=options.map(opt=>{
    const on=selected===opt;
    return `<button class="cam-tag${on?' on':''}" data-field="${VA.esc(field)}" data-val="${VA.esc(opt)}">${VA.esc(opt)}</button>`;
  }).join('');
  return `<div class="cam-step"><div class="cam-step-label">${VA.esc(label)} <span style="font-size:10px;font-weight:400;color:var(--txmt)">(optional)</span></div><div class="cam-tag-grid">${tags}</div></div>`;
}

function _camCatItems(catItems) {
  const byCat={};
  catItems.forEach(ci=>{
    if(!byCat[ci.catId]) byCat[ci.catId]={name:ci.catName,items:[]};
    byCat[ci.catId].items.push(ci.item);
  });
  let html='';
  Object.entries(byCat).forEach(([catId,cat])=>{
    const tags=cat.items.map(item=>{
      const on=camSel.catId===catId&&camSel.item===item;
      return `<button class="cam-tag${on?' cat-on':''}" data-catid="${VA.esc(catId)}" data-val="${VA.esc(item)}">${VA.esc(item)}</button>`;
    }).join('');
    html+=`<div class="cam-step"><div class="cam-step-label">${VA.esc(cat.name)} <span style="font-size:10px;font-weight:400;color:var(--txmt)">(optional)</span></div><div class="cam-tag-grid">${tags}</div></div>`;
  });
  return html;
}

function gatherItemsFromCats(p) {
  const result=[];
  (p.cats||[]).forEach(cat=>{
    (cat.items||[]).filter(i=>i.sel).forEach(item=>{
      result.push({catId:cat.id||cat.name,catName:cat.name,item:item.name});
    });
  });
  return result;
}

function gatherItemsForUnit(p, unit) {
  const result=[], seen=new Set();
  const push=(cat,item)=>{
    const k=(cat.id||cat.name)+'|'+item.name;
    if(!seen.has(k)){seen.add(k);result.push({catId:cat.id||cat.name,catName:cat.name,item:item.name});}
  };
  if(unit){
    (unit.cats||p.cats||[]).forEach(cat=>{
      const ud=unit.catData&&unit.catData[catKey(cat)]?unit.catData[catKey(cat)]:{items:[]};
      (ud.items||[]).filter(i=>i.sel).forEach(item=>push(cat,item));
    });
  } else {
    (p.levels||[]).forEach(u=>{
      (u.cats||p.cats||[]).forEach(cat=>{
        const ud=u.catData&&u.catData[catKey(cat)]?u.catData[catKey(cat)]:{items:[]};
        (ud.items||[]).filter(i=>i.sel).forEach(item=>push(cat,item));
      });
    });
  }
  return result;
}

function camLoadSticky() {
  const sticky=getStickyForProject();
  camSel={level:sticky.level||'',room:sticky.room||'',catId:sticky.catId||'',item:sticky.item||''};
  const p=gP(); if(p) renderCamSheet(p);
}

function buildFilename(p) {
  const ref=(p.ref||(p.addr||'').split(' ')[0]||'photo').replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  const seq=String((p.photoSeq||0)+1).padStart(3,'0');
  const slug=s=>s.replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  const catLabel=(camSel.catId&&camSel.item)?(()=>{
    // Search p.cats first, then all unit cat lists (per-unit layout)
    let cat=(p?.cats||[]).find(c=>(c.id||c.name)===camSel.catId);
    if(!cat)(p?.levels||[]).some(u=>{cat=(u.cats||[]).find(c=>(c.id||c.name)===camSel.catId);return!!cat;});
    return cat?slug(cat.name)+'_'+slug(camSel.item):slug(camSel.item);
  })():'';
  const parts=[ref,camSel.level?slug(camSel.level):'',camSel.room?slug(camSel.room):'',catLabel,seq].filter(Boolean);
  return parts.join('_')+'.jpg';
}

function camShoot() {
  const _p=gP(); if(_p&&_p.archived) return;
  const p=gP(); if(!p) return;
  const filename=buildFilename(p);
  setStickyForProject({level:camSel.level,room:camSel.room,catId:camSel.catId,item:camSel.item});
  try{sessionStorage.setItem('va_cam_ios_hint','1');}catch(e){}
  const inp=document.getElementById('cam-input'); if(!inp) return;
  inp.onchange=function(){
    const file=inp.files[0]; if(!file) return;
    const renamed=new File([file],filename,{type:file.type});
    const url=URL.createObjectURL(renamed);
    const a=document.createElement('a');a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    p.photoSeq=(p.photoSeq||0)+1;
    VA.save();
    inp.value='';
    toast('Saved as '+filename);
    renderCamSheet(p);
    openOv('cam-ov');
  };
  closeOv('cam-ov');
  setTimeout(()=>inp.click(),80);
}
