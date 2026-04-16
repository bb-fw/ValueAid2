// ═══════════════════════════════════════════════════════════════
//  ValueAid — Editor Notes
//  Note tag rendering and the note editor bottom sheet
// ═══════════════════════════════════════════════════════════════
'use strict';

function refreshNoteTag(elId, note, onClickStr) {
  const el=document.getElementById(elId); if(!el) return;
  el.innerHTML = note ? `<span class="note-tag" onclick="${onClickStr||''}">&#128221; ${VA.esc(note)}</span>` : '';
}

let _noteType=null, _noteCi=-1, _noteLi=-1;

function openNoteEditor(type, ci, li) {
  const _p=gP(); if(_p&&_p.archived){toast('Project is archived');return;}
  _noteType=type; _noteCi=ci; _noteLi=li;
  const p=gP(); if(!p) return;
  let cur='';
  if(type==='cat') cur=p.cats[ci]?.notes||'';
  else if(type==='level') cur=p.levels[li]?.notes||'';
  else if(type==='ucat'){
    const _uu=p.levels[li];
    const _uc=(_uu?.cats||p.cats)[ci];
    const _ud=_uu?.catData&&_uu.catData[catKey(_uc)]?_uu.catData[catKey(_uc)]:{};
    cur=_ud?.notes||'';
  }
  else if(type==='unit') cur=p.levels[li]?.notes||'';
  const ta=document.getElementById('note-ta'); if(ta)ta.value=cur;
  openOv('note-ov'); ta?.focus();
}

function saveNote() {
  const _p=gP(); if(_p&&_p.archived) return;
  const p=gP(); if(!p) return;
  const v=(document.getElementById('note-ta')?.value||'').trim();
  if(_noteType==='cat'){
    if(p.cats[_noteCi])p.cats[_noteCi].notes=v;
    refreshNoteTag('cat-note-'+_noteCi,v,`openNoteEditor('cat',${_noteCi},-1)`);
  } else if(_noteType==='level'){
    if(p.levels[_noteLi])p.levels[_noteLi].notes=v;
    refreshNoteTag('lv-note-'+_noteLi,v,`openNoteEditor('level',-1,${_noteLi})`);
  } else if(_noteType==='ucat'){
    const _nu=p.levels[_noteLi];
    const _ncat=(_nu?.cats||p.cats)[_noteCi];
    if(!_nu.catData)_nu.catData={};
    const _nck=catKey(_ncat);
    if(!_nu.catData[_nck])_nu.catData[_nck]={items:VA.mkCats([_ncat])[0].items,notes:''};
    _nu.catData[_nck].notes=v;
    refreshNoteTag(`ucatnote-${_noteLi}-${_noteCi}`,v,`openNoteEditor('ucat',${_noteCi},${_noteLi})`);
  } else if(_noteType==='unit'){
    if(p.levels[_noteLi])p.levels[_noteLi].notes=v;
    refreshNoteTag('unitnote-'+_noteLi,v,`openNoteEditor('unit',-1,${_noteLi})`);
  }
  VA.save(); closeOv('note-ov');
}
