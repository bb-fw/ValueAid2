// ═══════════════════════════════════════════════════════════════
//  ValueAid — Unified Picker
//  Single implementation used by editor.html, settings.html,
//  index.html. Replaces three divergent picker implementations.
//
//  HTML required on any page using this:
//  <div class="overlay" id="va-picker-ov">
//    <div class="sheet" style="display:flex;flex-direction:column;max-height:88vh">
//      <div id="va-pk-list" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 16px"></div>
//      <div style="flex-shrink:0;padding:12px 16px;border-top:1px solid var(--bd);background:var(--sf)">
//        <div id="va-pk-custom-row" style="display:none;gap:6px;margin-bottom:8px">
//          <input type="text" id="va-pk-custom-inp" style="flex:1">
//          <button class="btn bp bsm" onclick="VA_PICKER.addCustom()">Add</button>
//        </div>
//        <div style="position:relative;margin-bottom:10px">
//          <input type="text" id="va-pk-search" placeholder="Search..."
//                 style="padding-left:32px" oninput="VA_PICKER._onSearch(this.value)">
//          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
//                color:var(--txmt);font-size:15px;pointer-events:none">⌕</span>
//        </div>
//        <div style="display:flex;align-items:center;justify-content:space-between">
//          <span id="va-pk-title" style="font-size:15px;font-weight:600"></span>
//          <button class="btn bp bsm" id="va-pk-done">Done</button>
//        </div>
//      </div>
//    </div>
//  </div>
// ═══════════════════════════════════════════════════════════════

const VA_PICKER = (() => {
  let _title = '';
  let _items = [];
  let _selSet = null;        // Set of selected item strings (for multi-select)
  let _onToggle = null;      // (item, nowSelected) => void
  let _onCustomAdd = null;   // (itemName) => void  — null hides custom row
  let _onDone = null;        // () => void
  let _singleSelect = false; // true = pick one item and close immediately

  // ── Public API ──────────────────────────────────────────────

  /**
   * Open as a multi-select picker (checkboxes).
   * @param {string} title
   * @param {string[]} items
   * @param {Set} selSet - mutable set of currently selected items
   * @param {function} onToggle - called on each toggle
   * @param {function|null} onCustomAdd - if provided, shows custom-add row
   * @param {function} onDone - called when Done is tapped
   */
  function openMulti(title, items, selSet, onToggle, onCustomAdd, onDone) {
    _title = title;
    _items = [...items]; // copy so addCustom doesn't mutate caller's array
    _selSet = selSet;
    _onToggle = onToggle;
    _onCustomAdd = onCustomAdd;
    _onDone = onDone;
    _singleSelect = false;
    _open();
  }

  /**
   * Open as a single-select picker (tap to pick and close).
   * @param {string} title
   * @param {string[]} items
   * @param {function} onSelect - (itemName) => void
   * @param {function|null} onCustomAdd - if provided, shows custom-add row
   */
  function openSingle(title, items, onSelect, onCustomAdd) {
    _title = title;
    _items = [...items]; // copy so addCustom doesn't mutate caller's array
    _selSet = null;
    _onToggle = null;
    _onCustomAdd = onCustomAdd;
    _onDone = null;
    _singleSelect = true;
    // Wrap onSelect so single pick closes immediately
    _onToggle = (item) => { closeOv('va-picker-ov'); if (onSelect) onSelect(item); };
    _open();
  }

  function _open() {
    const title = document.getElementById('va-pk-title');
    const search = document.getElementById('va-pk-search');
    const customRow = document.getElementById('va-pk-custom-row');
    const customInp = document.getElementById('va-pk-custom-inp');
    const doneBtn = document.getElementById('va-pk-done');

    if (title) title.textContent = _title;
    if (search) search.value = '';
    const clrBtn = document.getElementById('va-pk-clear');
    if (clrBtn) clrBtn.style.display = 'none';
    if (customRow) customRow.style.display = _onCustomAdd ? 'flex' : 'none';
    if (customInp) { customInp.value = ''; customInp.placeholder = 'Add custom...'; }
    if (doneBtn) {
      doneBtn.textContent = _singleSelect ? 'Cancel' : 'Done';
      doneBtn.onclick = () => { closeOv('va-picker-ov'); if (_onDone) _onDone(); };
    }

    _render('');
    openOv('va-picker-ov');
  }

  function _render(q) {
    const el = document.getElementById('va-pk-list'); if (!el) return;
    const query = (q || '').toLowerCase();
    const filtered = _items.filter(i => !query || i.toLowerCase().includes(query));
    el.innerHTML = '';
    filtered.forEach(item => {
      const sel = _selSet ? _selSet.has(item) : false;
      const div = document.createElement('div');
      div.className = 'picker-item' + (sel ? ' selected' : '') + (_singleSelect ? ' single-sel' : '');
      const chk = document.createElement('div');
      chk.className = 'picker-check';
      chk.textContent = sel ? '✓' : '';
      const txt = document.createElement('span');
      txt.textContent = item;
      div.appendChild(chk); div.appendChild(txt);
      div.addEventListener('click', () => {
        if (_singleSelect) {
          if (_onToggle) _onToggle(item);
          return;
        }
        const was = div.classList.contains('selected');
        div.classList.toggle('selected');
        chk.textContent = div.classList.contains('selected') ? '✓' : '';
        if (_selSet) { if (was) _selSet.delete(item); else _selSet.add(item); }
        if (_onToggle) _onToggle(item, !was);
      });
      el.appendChild(div);
    });
    if (!filtered.length) {
      el.innerHTML = '<p style="padding:14px 16px;font-size:13px;color:var(--txmt);font-style:italic">No results.</p>';
    }
  }

  function _onSearch(q) {
    _render(q);
    const btn = document.getElementById('va-pk-clear');
    if (btn) btn.style.display = q ? 'block' : 'none';
  }
  function clearSearch() {
    const inp = document.getElementById('va-pk-search');
    const btn = document.getElementById('va-pk-clear');
    if (inp) { inp.value = ''; inp.focus(); }
    if (btn) btn.style.display = 'none';
    _render('');
  }

  function addCustom() {
    const inp = document.getElementById('va-pk-custom-inp');
    const v = (inp?.value || '').trim(); if (!v) return;
    if (_singleSelect) {
      // Single-select: close then call custom handler (mirrors tap-to-pick behaviour)
      closeOv('va-picker-ov');
      if (_onCustomAdd) _onCustomAdd(v);
      return;
    }
    // Multi-select: add to list and re-render
    if (_onCustomAdd) _onCustomAdd(v);
    inp.value = '';
    if (!_items.includes(v)) _items.push(v);
    if (_selSet) _selSet.add(v);
    _render(document.getElementById('va-pk-search')?.value || '');
    toast('Added: ' + v);
  }

  return { openMulti, openSingle, addCustom, _onSearch, clearSearch };
})();
