# ValueAid — Project Context for Claude

## What this is
A Progressive Web App (PWA) for property valuers in Singapore. It manages inspection projects, a case tracker pipeline, travel logging, and a calendar. Built as a fully offline-capable static site with no backend — all data lives in `localStorage` under the key `valueaid_v5`.

## Deployment
- **Repo:** https://github.com/bb-fw/ValueAid
- **Live:** https://value-aid2.vercel.app
- **Current version:** v1.3.0 (sw.js cache key `valueaid-v1.3.0`)
- Versioning: `v1.x.y` — minor version for new features, patch for fixes. Bump sw.js cache key on every release.

---

## File structure

```
valueaid/
├── index.html          — Inspection project list + new project sheet
├── editor.html         — Inspection project editor (thin shell, loads JS modules)
├── tracker.html        — Case Tracker overview list
├── case-editor.html    — Case detail editor
├── travel.html         — Travel log
├── calendar.html       — Schedule/calendar
├── settings.html       — All configuration
├── sw.js               — Service worker
├── manifest.json
├── CLAUDE.md           — This file
├── css/
│   ├── styles.css      — Shared styles (all pages)
│   └── editor.css      — Editor-specific styles
└── js/
    ├── db.js           — Data store, VA object, all persistence (data model v5)
    ├── ui.js           — Shared UI utilities (pageInit, toast, overlays, location dropdown)
    ├── picker.js       — Unified VA_PICKER (openMulti / openSingle)
    ├── export.js       — PDF export (jsPDF via cdnjs)
    ├── editor-core.js  — Project form, autoSave, HDB toggle, archive/delete actions, ⋮ menu
    ├── editor-findings.js — Standard + per-unit layout, category management, room picker
    ├── editor-notes.js — Note editor overlay
    └── editor-camera.js — Camera tagger, photo management
```

---

## Data model (localStorage key: `valueaid_v5`)

```js
db.projects[]     // Inspection projects
  { id, layout('A'|'B'), ref, date, time, valuer, ptype, source, storeys, occ, addr,
    cond, remarks, cats[], roomSnapshot[], levels[], createdAt,
    caseId,       // links to a case record (optional)
    archived,     // boolean — read-only sparse snapshot when true
    isHDB, recess, orientation, mup, sai, unitLocation }

db.cases[]        // Case Tracker records
  { id, ref, addr, client, phone, ptype, source, inspDate, inspTime,
    createdAt, deadline, stage, delayed, notes,
    checklistId, checklistSnapshot[], projectId }

db.checklists[]   // Progress marker sets for cases
  { id, name, stages[] }

db.categories[]   // Global inspection item categories
  { id, name, items[], deleted? }

db.roomLists[]    // Named room lists
  { id, name, rooms[] }

db.templates[]    // Inspection templates (combine categories + room list)
  { name, categoryIds[], roomListId }

db.travels[]      // Travel log entries
db.valuers[]      // Valuer name strings
db.propertyTypes[] // Property type strings
db.levelNames[]   // Level/floor name strings
db.savedLocations[] // Saved location strings for travel dropdown
db.settings       { theme: 'light'|'dark' }
```

**Key constants in db.js:**
- `BUILTIN_STAGES = ['Assigned','Inspection Booked','Inspection Completed','Case Complete']`
- `SOURCE_OPTIONS` (hardcoded in case-editor and index): DBS-LO, OCBC, Maybank, HSBC, DBS, UOB, RHB, CIMB, SBI, External, Others
- `DEFAULT_TPL = 'Default'`

---

## Architecture decisions

**Cases and projects are separate records** linked by `caseId` / `projectId`. They share four synced fields: ref, addr, inspDate/date, inspTime/time. Source field is case-only (not synced). This was a deliberate choice to avoid corrupting existing project data when the Case Tracker was added. Do not refactor to a unified model — the risk of data corruption is not worth it.

**Snapshot model:** Each project stores a full copy of its categories at creation time (`p.cats`). This means editing master categories in Settings never retroactively changes existing projects. The snapshot is self-contained.

**Archive = sparse snapshot:** When a project is archived (`p.archived = true`), `trimCats()` in db.js strips all items where `sel === false` AND `notes` is empty. Selected items and noted items are preserved. The archived project is read-only. All editor write functions guard against `p.archived` at the function level (not just UI disable).

**Archive functions must be inside the IIFE in db.js.** `trimCats`, `archiveProject`, and `unarchiveProject` must be defined before the `return { }` export block inside the `(() => { ... })()` wrapper. If placed outside the IIFE they will be `undefined` on `VA`.

**Timezone:** All date strings use local timezone via `localISO(d)` helper, not `toISOString().slice(0,10)` which returns UTC and causes off-by-one errors in Singapore (UTC+8). `localISO` is defined locally in each file that needs it (tracker, case-editor, calendar, travel, index).

**Picker safety:** `VA_PICKER.openMulti()` and `openSingle()` copy the items array with `[...items]` on open. Never pass a live `VA.db.*` array directly without this copy — addCustom mutates `_items`.

---

## Key UI patterns

**Overlays:** `openOv(id)` / `closeOv(id)` toggle `.open` class. Overlays close on backdrop tap via `el.addEventListener('click', e => { if(e.target===el) el.classList.remove('open') })`.

**Cat menus (⋮ dropdowns):** `position:fixed`, toggled by `toggleCatMenu()`, closed by `document.addEventListener('click', ...)`. Used for category actions in editor and for the editor ⋮ sticky bar menu.

**Sticky bar:** Bottom action bar in editor.html. Contains ⋮ (Archive/Delete), PDF, Camera, Close. Delete and Archive moved here from the project list — project list cards are plain tap-to-open with no per-card controls.

**Section headers:** Consistent pattern across index, tracker, calendar:
```js
`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;
color:var(--txmt);padding:14px 2px 6px;display:flex;align-items:center;gap:6px">
<span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block">
</span>${label}</div>`
```

**localISO helper** (copy into each file that needs local dates):
```js
function localISO(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),
        day=String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
}
```

---

## CSS variables (from styles.css)

```
--nv / --nvl    Navy (primary brand colour)
--bl / --blbg   Blue / blue background
--gn / --gnbg   Green / green background
--rd / --rdbg   Red / red background
--am / --ambg   Amber / amber background
--tx / --txmt   Text / muted text
--sf / --sf2    Surface / surface secondary
--bd            Border
--r / --rs / --rl  Border radius (base / small / large)
--sh            Box shadow
--tr            Transition
--gd            Gradient (used for active travel banner)
```

---

## Known constraints / gotchas

1. **`db.js` is an IIFE** — all helper functions must be defined inside `(() => { ... })()` before the `return { }` block. Functions placed after `})();` are outside scope and will be `undefined` on the `VA` object.

2. **`readEd()` reads disabled inputs as `''`** — for archived projects, never call `readEd()` then `VA.save()`. Use `gP()` directly. `doExportPDF` handles this correctly.

3. **Room ordering** — on picker Done, re-sort selected rooms to match master list order. This is done in the `openRoomPicker` onDone callback in editor-findings.js.

4. **`openNewProjectFromCase` must call `openNewProject()` first** — this populates the valuer and property type dropdowns before trying to set values from the case.

5. **No. of Storeys is HDB-only** — it lives inside the `hdb-fields` div and only appears when `isHDB` is toggled. It is also only included in PDF export inside the `isHDB` conditional block.

6. **Source field** — appears in case editor and new project sheet only. Not in the inspection project editor (removed). Not synced between linked case and project. Not in PDF export.

7. **Travel XLSX export** loads SheetJS from CDN (`cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`) — not cached by sw.js, requires network.

8. **Calendar uses `buildEventMap()`** — called once in `renderCal()` and passed to `renderEvs()`. Do not call it again inside `renderEvs`. Archived projects are excluded. Completed case deadlines are excluded.

9. **Tracker `isCaseComplete`** — defined as a module-level const before `renderStats()`. Both `renderStats` and `renderCases` use it. Do not define it locally inside either function.

10. **Sort preference** persisted in `localStorage` under `va_sort_field` and `va_sort_dir`. Loaded via `loadSortPref()` on page init before first `renderCases()`.

---

## Versioning history (abbreviated)

| Version | Summary |
|---|---|
| v1.1.0 | Case Tracker (tracker.html, case-editor.html, checklists, calendar integration) |
| v1.1.x | Bug fixes: timezone, phone formatting, linking conflicts, import/export |
| v1.2.0 | Source field, travel two-line layout, ERP toggle, storeys under HDB |
| v1.2.1 | Tracker sort order-by, calendar case deadlines, travel Excel export |
| v1.2.2 | Sort preference persistence, PDF filename, order-by layout fix |
| v1.2.3 | Archive system (db.js trimCats, editor read-only, archived section in list) |
| v1.2.4–1.2.6 | Archive write guards (all editor modules), card layout fix |
| v1.2.7 | ⋮ menu moved to editor sticky bar, project list cards restored to original |
| v1.2.8 | Full audit — no bugs found |
| v1.2.9 | Fix: archive functions were outside IIFE in db.js, making VA.archiveProject undefined |
| v1.3.0 | Dead picker removed, tracker shows phone+inspected stat, new project sheet simplified, Create Case from Project |
