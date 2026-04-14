// ═══════════════════════════════════════════════════════════════
//  ValueAid — Data Store v5
//  Global categories + room lists; templates reference by ID;
//  projects are fully independent snapshots.
// ═══════════════════════════════════════════════════════════════
const VA = (() => {

const DB_KEY = 'valueaid_v5';
const DEFAULT_TPL = 'Default';

// ── Built-in factory defaults (hardcoded, never stored as user data) ──
const BUILTIN_CATS = [
  {id:'b_doors',   name:'Doors',          items:['Timber','Timber with Glass Infill','Aluminium Framed','Glass','PVC','Metal','Metal Sheet','Roller Shutter','Roller Shutters']},
  {id:'b_gates',   name:'Gates',          items:['Nil','Mild Steel','Metal','Wrought Iron','Stainless Steel','Aluminium','Collapsible']},
  {id:'b_windows', name:'Windows',        items:['Aluminium Grilles','Wrought Iron Grilles','Mild Steel Grilles','Stainless Steel Grilles','Invisible Grilles','Metal Grilles','Aluminium Framed','Mild Steel Framed','Timber Framed','Louvred']},
  {id:'b_floors',  name:'Floors',         items:['Raised Timber Platform','Timber Decks','Timber','Laminated Floorboards','Marble','Broken Marble','Compressed Marble','Granite','Polished Homogenous Tiles','Homogenous Tiles','Ceramic Tiles','Porcelain Tiles','Mosaic','Terrazzo','Slate Tiles','Terracotta','Cement Screed','Epoxy Cement','Linoleum','Vinyl Tiles','Vinyl Planks','Vinyl Flooring','Wash Pebbles','Pebble Stones','Carpet','Carpet Grass','Insulated Panels']},
  {id:'b_iwalls',  name:'Internal Walls', items:['Plaster and Paint','Textured','Wallpaper','Marble','Compressed Marble','Granite','Trimmings','Glass Blocks','Timber Panels','Fixed Glass Panels','Internal Partitions','Insulated Panels','Acoustic Panels','Polished Homogenous Tiles','Homogenous Tiles','Ceramic Tiles','Glazed Tiles','Mosaic','Porcelain Tiles','Bricks','Slate Tiles']},
  {id:'b_ceiling', name:'Ceiling',        items:['Plaster and Paint','False Ceiling','Exposed Concrete Ceiling','Timber Ceiling','Boarded Ceiling','Ceiling Boards','Cornices','Light Holders','Downlights','Concealed Lights','Skylight','Awnings','Decorative Timber Beams','Trellis','Glass Panels']},
  {id:'b_fixtures',name:'Fixtures & Fittings', items:[
    'Split Unit Air-Conditioning System','Cassette Unit Air-Conditioning System','Centralised Air-Conditioning System','Ducted Air-Conditioning System',
    'CCTV System','Ceiling Fan','Ceiling Fans','Wall Fan','Wall Fans','Ventilation Fan','Ventilation Fans',
    'Cabinet','Cabinets','Shelf','Shelves','Shoe Cabinet','Shoe Cabinets','Wardrobe','Wardrobes',
    'Dressing Table','Dressing Table with Mirror','Headboard','Side Table','Side Tables',
    'Bed Platform','Bed Platform with Storage','Raised Timber Platform','Murphy Bed',
    'Study Table','Study Tables','Glass Writing Board','Glass Writing Boards',
    'Settee','Settees','Bay Window Settee','Feature Wall','Feature Walls','TV Console','TV Panel',
    'High and Low Level Kitchen Cabinet','Low Level Kitchen Cabinet','High Level Kitchen Cabinet',
    'Worktop','Solid Worktop','Marble Worktop','Granite Worktop','Stainless Steel Worktop',
    'Cooker Hob','Induction Hob','Cooker Hood','Exhaust Hood',
    'Backsplash','Tempered Glass Backsplash','Stainless Steel Backsplash',
    'Servery Counter','Island Counter','Bar Counter','Breakfast Counter',
    'Oven','Microwave','Microwave Oven','Built-In Fridge','Built-In Water Dispenser','Wine Chiller','Dishwasher','Grease Trap',
    'Retractable Laundry Rack','Hot Water Supply','Instant Hot Water Heater','Centralised Hot Water System','Gas Water Heater',
    'Vanity Top','Vanity Tops','Vanity Top with Undercounter Cabinet','Vanity Tops with Undercounter Cabinets',
    'Vanity Cabinet','Vanity Cabinets','Vanity Cabinet with Mirror','Vanity Cabinets with Mirrors',
    'Mirror Panel','Mirror Panels','Shower Screen','Shower Screens','Long Bath','Long Baths',
    'Sunken Bath Tub','Jacuzzi','Shower Bench','Wall Niche','Wall Niches',
    'Intercom System','Cashier Counter','Reception Counter',
    'High and Low Level Pantry Cabinet','Low Level Pantry Cabinet','High Level Pantry Cabinet',
    'Upholstery Panel','Timber Wall Panel','Decorative Wall Dividers'
  ]}
];

const BUILTIN_ROOMS = [
  'Private Lift Lobby','Balcony','Balconies','Living','Dining',
  'Master Bedroom','Master Bathroom','1 Other Bedroom','2 Other Bedrooms','3 Other Bedrooms','4 Other Bedrooms',
  'Study Room','Common Bathroom','Dry/Wet Kitchen','Kitchen','Yard','Utility','Household Shelter',
  'Store','Toilet','Powder Room','Family Room','Guest Room','Gymnasium Room',
  "Maid's Bathroom","Maid's Room",'Roof Terrace','Car Porch','Covered Terrace',
  'General Office Area','Partitioned Room','Partitioned Rooms','Kitchenette',
  'Bathroom','Service Balcony','General Factory Area','Partitioned Office Room','Workshop','General Storage Area'
];

const DLVN = [
  'Accommodation','Basement','1st Storey','2nd Storey','3rd Storey','4th Storey','5th Storey',
  'Attic','Roof','Level 1','Level 2','Level 3','Level 4','Level 5',
  'Upper Level','Lower Level','Mezzanine Level','Basement 1','Basement 2'
];

const DPT = [
  'Residential — HDB Flat','Residential — Condominium / Apartment',
  'Residential — Landed (Terrace)','Residential — Landed (Semi-Detached)','Residential — Landed (Bungalow)',
  'Commercial — Shophouse','Commercial — Office','Commercial — Retail / Shop',
  'Industrial — Factory','Industrial — Warehouse','Mixed Development','Land (Vacant)','Others'
];

const TMETH = ['MRT / LRT','Bus','Driving','Taxi / Grab'];

// Built-in case pipeline stages
const BUILTIN_STAGES = ['Assigned','Inspection Booked','Inspection Completed','Case Complete'];

// ── In-memory state ────────────────────────────────────────────
let db = {
  // v5 global registries
  categories: [],    // { id, name, items[], deleted? }
  roomLists: [],     // { id, name, rooms[] }
  // templates now reference IDs
  templates: [],     // { name, categoryIds[], roomListId }
  // unchanged
  cases: [],        // { id, ref, addr, client, phone, inspDate, inspTime, createdAt, deadline, stage, delayed, notes, checklistId, checklistSnapshot[], projectId }
  checklists: [],   // { id, name, stages[] } — pipeline stage templates
  projects: [], travels: [], valuers: [],
  propertyTypes: [...DPT],
  levelNames: [...DLVN],
  savedLocations: ['Office','Home'],
  settings: { theme: 'light' }
};

// ── Persistence ───────────────────────────────────────────────
function load() {
  try {
    const r = localStorage.getItem(DB_KEY);
    if (r) db = Object.assign(db, JSON.parse(r));
  } catch(e) {}
  // Ensure new collections always exist even if missing from old saved data
  if (!Array.isArray(db.cases))      db.cases = [];
  if (!Array.isArray(db.checklists)) db.checklists = [];
  // Migrate: ensure case refs are strings
  (db.cases||[]).forEach(c => { if(c.ref) c.ref=String(c.ref); });
  // Migrate: normalise any old project cats that still have string items
  (db.projects||[]).forEach(p => {
    if(p.cats) p.cats = normCats(p.cats);
    // Also normalise per-unit cats stored on each level
    (p.levels||[]).forEach(u => { if(u.cats) u.cats = normCats(u.cats); });
  });
  seed();
}

function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch(e) {
    // Surface storage quota errors to the user
    if (e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)) {
      // Use a global toast if available, fallback to alert
      if (typeof toast === 'function') {
        toast('Storage full — export and clear old data to free space');
      } else {
        alert('Storage full — please export your data to free up space');
      }
    }
  }
}

// ── Seed on first load ────────────────────────────────────────
// Creates user-owned categories, room list, and default template
// if the db is empty (fresh install).
function seed() {
  let dirty = false;
  if (!db.categories.length) {
    db.categories = BUILTIN_CATS.map(c => ({
      id: uid(), name: c.name, items: [...c.items]
    }));
    dirty = true;
  }
  if (!db.checklists.length) {
    db.checklists = [{ id: uid(), name: 'Default', stages: [...BUILTIN_STAGES] }];
    dirty = true;
  }
  if (!db.roomLists.length) {
    db.roomLists = [{ id: uid(), name: 'Default Rooms', rooms: [...BUILTIN_ROOMS] }];
    dirty = true;
  }
  if (!db.templates.length) {
    const allCatIds = db.categories.map(c => c.id);
    const rlId = db.roomLists[0]?.id || '';
    db.templates = [{ name: DEFAULT_TPL, categoryIds: allCatIds, roomListId: rlId }];
    dirty = true;
  }
  if (!db.templates.find(t => t.name === DEFAULT_TPL)) {
    db.templates.unshift({
      name: DEFAULT_TPL,
      categoryIds: db.categories.filter(c=>!c.deleted).map(c=>c.id),
      roomListId: db.roomLists[0]?.id || ''
    });
    dirty = true;
  }
  if (dirty) save();
}

// ── Helpers ───────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function dc(o) { return JSON.parse(JSON.stringify(o)); }
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmtDate(d) {
  if(!d) return '—';
  return new Date(d+'T00:00:00').toLocaleDateString('en-SG',{day:'2-digit',month:'short',year:'numeric'});
}
function fmtDateLong(d) {
  if(!d) return '—';
  return new Date(d+'T00:00:00').toLocaleDateString('en-SG',{weekday:'short',day:'2-digit',month:'long',year:'numeric'});
}
function fmtDateFile(d) { return (d||''); }
function fmtTime(dt) { return dt.toLocaleTimeString('en-SG',{hour:'2-digit',minute:'2-digit',hour12:false}); }

// ── Category helpers ──────────────────────────────────────────
function activeCats() {
  return db.categories.filter(c => !c.deleted);
}
function catById(id) {
  return db.categories.find(c => c.id === id && !c.deleted);
}
function roomListById(id) {
  return db.roomLists.find(r => r.id === id);
}

// ── Project snapshot helpers ──────────────────────────────────
// Build project.cats[] snapshot from a template
function snapshotCats(tpl) {
  return (tpl.categoryIds || [])
    .map(id => catById(id))
    .filter(Boolean)
    .map(c => ({
      id: c.id,
      name: c.name,
      items: c.items.map(it => ({ name: it, sel: false })),
      notes: ''
    }));
}

// Build project.roomSnapshot[] from a template's room list
function snapshotRooms(tpl) {
  const rl = roomListById(tpl.roomListId) || db.roomLists[0];
  return rl ? [...rl.rooms] : [...BUILTIN_ROOMS];
}

// Backwards-compat: convert old project cats (items as strings) to {name,sel}
function normCats(cats) {
  return (cats||[]).map(c => ({
    ...c,
    items: (c.items||[]).map(it => typeof it === 'string' ? {name:it, sel:false} : it)
  }));
}

// ── Public API ────────────────────────────────────────────────
return {
  get db() { return db; },
  load, save, seed, uid, dc, esc,
  fmtDate, fmtDateLong, fmtDateFile, fmtTime,
  activeCats, catById, roomListById,
  snapshotCats, snapshotRooms, normCats,
  // constants (still used by export, camera, etc.)
  BUILTIN_CATS, BUILTIN_ROOMS, DLVN, DPT, TMETH, DEFAULT_TPL, BUILTIN_STAGES,
  // legacy aliases so existing code doesn't break
  get DCATS() { return BUILTIN_CATS; },
  get DROOMS() { return BUILTIN_ROOMS; },
  ensureDefaultTpl() { seed(); },
  getDefaultTpl() {
    const t = db.templates.find(t=>t.name===DEFAULT_TPL);
    if (!t) return { categoryIds: [], roomListId: db.roomLists[0]?.id };
    return t;
  },
  getActiveRooms() {
    const t = db.templates.find(t=>t.name===DEFAULT_TPL);
    const rl = t ? roomListById(t.roomListId) : null;
    return rl ? [...rl.rooms] : [...BUILTIN_ROOMS];
  },
  // mkCats kept for backwards compat with camera tagger etc.
  mkCats(srcCats) {
    return (srcCats||[]).map(c => ({
      id: c.id||null, name: c.name,
      items: (c.items||[]).map(it => ({ name: typeof it==='string'?it:it.name, sel:false })),
      notes: ''
    }));
  }
};
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
