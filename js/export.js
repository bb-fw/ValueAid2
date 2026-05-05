// ═══════════════════════════════════════════════════════════════
//  ValueAid — Export: PDF only (jsPDF via cdnjs)
// ═══════════════════════════════════════════════════════════════

function exportProjectPDF(p) {
  if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
    toast('PDF library not loaded — check your connection and retry.'); return;
  }
  const { jsPDF } = window.jspdf || jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, ML = 15, MR = 15, CW = PW - ML - MR;
  let y = 15;
  const np = () => { doc.addPage(); y = 15; };
  const chk = h => { if (y + h > PH - 15) np(); };

  // Title block
  doc.setFillColor(26,58,92);
  doc.rect(0,0,PW,30,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(15); doc.setFont('helvetica','bold');
  const addrLines = doc.splitTextToSize(p.addr || 'Untitled Property', CW - 20);
  doc.text(addrLines, ML, 11);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  const meta = [p.ref ? 'Ref: '+p.ref : '', 'Property Inspection Report'].filter(Boolean).join('   ');
  doc.text(meta, ML, 11 + addrLines.length*5.5 + 1);
  y = 35;

  const infoRows = [
    ['Date of Inspection', (p.date ? VA.fmtDate(p.date) : '—') + (p.time ? '  at  '+p.time : '')],
    ['Valuer-in-Charge', p.valuer || '—'],
    ['Property Type', p.ptype || '—'],
    ['Occupancy', p.occ || '—'],
    ['Condition', p.cond || '—'],
    ...(p.isHDB ? [
      ['No. of Storeys', p.storeys || '—'],
      ['Recess Area (m²)', p.recess || '—'],
      ['Orientation', p.orientation || '—'],
      ['MUP', p.mup || '—'],
      ['SAI', p.sai || '—'],
      ['Location of Unit', p.unitLocation || '—'],
    ] : []),
  ];
  doc.setFontSize(9);
  infoRows.forEach(([k,v],i) => {
    doc.setFillColor(...(i%2===0 ? [245,244,240] : [255,255,255]));
    doc.rect(ML,y,CW,6,'F');
    doc.setTextColor(90,85,78); doc.setFont('helvetica','normal');
    doc.text(k, ML+2, y+4.2);
    doc.setTextColor(28,26,23); doc.setFont('helvetica','bold');
    doc.text(String(v||'—'), ML+68, y+4.2, {maxWidth: CW-70});
    y += 6;
  });
  y += 4;

  const section = (title, rgb) => {
    chk(10);
    doc.setFillColor(...rgb);
    doc.rect(ML,y,CW,7,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text(title, ML+3, y+5);
    y += 14; doc.setTextColor(28,26,23);
  };

  if (p.layout === 'A') {
    section('2. Inspection Findings', [26,58,92]);
    (p.cats||[]).forEach(cat => {
      chk(12);
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(45,90,140);
      doc.text(cat.name+':', ML+2, y); y += 4;
      const sel = (cat.items||[]).filter(i=>i.sel).map(i=>i.name||i);
      doc.setFont('helvetica','normal'); doc.setTextColor(28,26,23);
      if (sel.length) {
        const lines = doc.splitTextToSize(sel.join(', '), CW-6);
        chk(lines.length*4.5+2);
        lines.forEach(l => { doc.text(l,ML+4,y); y+=4.5; });
      } else { doc.setTextColor(138,130,120); doc.text('0 items noted',ML+4,y); doc.setTextColor(28,26,23); y+=4.5; }
      if (cat.notes) { chk(8); doc.setTextColor(90,85,78); doc.setFontSize(8.5); doc.text('Notes: '+cat.notes,ML+4,y,{maxWidth:CW-6}); y+=4.5; doc.setTextColor(28,26,23); }
      y += 6;
    });
    y += 2;
    section('3. Accommodations', [45,90,140]);
    if (p.levels && p.levels.length) {
      p.levels.forEach(lv => {
        chk(10);
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(45,90,140);
        doc.text(lv.name+':', ML+2, y); y += 4;
        doc.setFont('helvetica','normal'); doc.setTextColor(28,26,23);
        if (lv.rooms && lv.rooms.length) {
          const lines = doc.splitTextToSize(lv.rooms.join(', '), CW-6);
          chk(lines.length*4.5+2);
          lines.forEach(l => { doc.text(l,ML+4,y); y+=4.5; });
        } else { doc.setTextColor(138,130,120); doc.text('(no rooms listed)',ML+4,y); doc.setTextColor(28,26,23); y+=4.5; }
        if (lv.notes) { chk(8); doc.setTextColor(90,85,78); doc.setFontSize(8.5); doc.text('Notes: '+lv.notes,ML+4,y,{maxWidth:CW-6}); y+=4.5; doc.setTextColor(28,26,23); }
        y += 6;
      });
    } else { doc.setFontSize(9); doc.text('None recorded.',ML,y); y+=5; }
    y += 2;
    section('4. General Remarks', [26,58,92]);
  } else {
    section('2. Inspection Findings Per Unit', [26,58,92]);
    (p.levels||[]).forEach(u => {
      chk(12);
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(26,58,92);
      doc.text(u.name||'Unit', ML, y); y += 7;
      // Use the unit's own cat list if available, fallback to project cats
      const uCats = u.cats || p.cats || [];
      uCats.forEach(cat => {
        const _ek = cat.id||cat.name;
        const ud = u.catData&&u.catData[_ek] ? u.catData[_ek] : {items:[],notes:''};
        const sel = (ud.items||[]).filter(i=>i.sel).map(i=>i.name||i);
        if (!sel.length && !ud.notes) return;
        chk(8);
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(45,90,140);
        doc.text(cat.name+':', ML+2, y); y+=4;
        doc.setFont('helvetica','normal'); doc.setTextColor(28,26,23);
        if (sel.length) { const lines=doc.splitTextToSize(sel.join(', '),CW-6); chk(lines.length*4.5); lines.forEach(l=>{doc.text(l,ML+4,y);y+=4.5;}); }
        if (ud.notes) { doc.setTextColor(90,85,78); doc.setFontSize(8.5); doc.text('Notes: '+ud.notes,ML+4,y,{maxWidth:CW-6}); y+=4.5; doc.setTextColor(28,26,23); }
      });
      if (u.notes) { chk(8); doc.setTextColor(90,85,78); doc.setFontSize(8.5); doc.text('Unit Remarks: '+u.notes,ML+2,y,{maxWidth:CW-4}); y+=5; doc.setTextColor(28,26,23); }
      y += 3;
    });
    y += 2;
    section('3. General Remarks', [26,58,92]);
  }

  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(28,26,23);
  const rmLines = doc.splitTextToSize(p.remarks||'—', CW-4);
  chk(rmLines.length*4.5+2);
  rmLines.forEach(l => { doc.text(l,ML,y); y+=4.5; });

  const pages = doc.getNumberOfPages();
  for (let i=1;i<=pages;i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(138,130,120);
    doc.text('Generated: '+new Date().toLocaleString('en-SG'), ML, PH-8);
    doc.text('Page '+i+' of '+pages, PW-MR, PH-8, {align:'right'});
  }

  const fn = [(p.ref||'Report'), 'Inspection Sheet'].join('-');
  doc.save(fn+'.pdf');
  toast('PDF exported');
}

// ═══════════════════════════════════════════════════════════════
//  ValueAid — Export: Excel (SheetJS, lazy-loaded)
// ═══════════════════════════════════════════════════════════════

function exportProjectXLSX(p) {
  if (typeof XLSX === 'undefined') { toast('Excel library not available'); return; }
  const wb = XLSX.utils.book_new();
  const isB = p.layout === 'B';
  const fn  = [(p.ref||'Report'), 'Inspection Sheet'].join('-');

  if (isB) {
    _xlsxPerUnit(wb, p);
  } else {
    _xlsxStandardFindings(wb, p);
    _xlsxStandardAccom(wb, p);
  }

  XLSX.writeFile(wb, fn + '.xlsx');
  toast('Excel exported');
}

// ── Standard layout — Sheet 1: Findings ──────────────────────
function _xlsxStandardFindings(wb, p) {
  const rows = [['Category', 'Selected Items', 'Notes']];
  (p.cats||[]).forEach(cat => {
    const sel   = (cat.items||[]).filter(i => i.sel);
    const noted = (cat.items||[]).filter(i => i.notes && i.notes.trim());
    if (!sel.length && !noted.length) return;
    const selNames = sel.map(i => i.name).join(', ');
    const noteStr  = noted.map(i => i.name + ': ' + i.notes.trim()).join('; ');
    rows.push([cat.name, selNames, noteStr]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:22},{wch:42},{wch:50}];
  XLSX.utils.book_append_sheet(wb, ws, 'Findings');
}

// ── Standard layout — Sheet 2: Accommodations ────────────────
function _xlsxStandardAccom(wb, p) {
  if (!(p.levels||[]).length) return;
  const rows = [['Level / Floor', 'Rooms']];
  (p.levels||[]).forEach(lv => {
    rows.push([lv.name||'', (lv.rooms||[]).join(', ')]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:20},{wch:60}];
  XLSX.utils.book_append_sheet(wb, ws, 'Accommodations');
}

// ── Per-unit layout — one matrix sheet ───────────────────────
function _xlsxPerUnit(wb, p) {
  const levels = p.levels || [];
  if (!levels.length) return;

  // Determine all categories from first unit (or p.cats fallback)
  const cats = levels[0]?.cats || p.cats || [];
  if (!cats.length) return;

  const ck = cat => cat.id || cat.name;

  // Build header row: Unit | Cat1 | Cat2 | ...
  const header = ['Unit / Room', ...cats.map(c => c.name)];

  // Build data rows: one per unit
  const dataRows = levels.map(u => {
    const row = [u.name || ''];
    cats.forEach(cat => {
      const ud = u.catData && u.catData[ck(cat)]
        ? u.catData[ck(cat)]
        : { items: [], notes: '' };
      const items = ud.items || [];

      const parts = [];
      // Selected items, with inline note if present
      items.filter(i => i.sel).forEach(i => {
        if (i.notes && i.notes.trim()) {
          parts.push(i.name + ' (' + i.notes.trim() + ')');
        } else {
          parts.push(i.name);
        }
      });
      // Items with notes but not selected
      items.filter(i => !i.sel && i.notes && i.notes.trim()).forEach(i => {
        parts.push(i.name + ' [note: ' + i.notes.trim() + ']');
      });
      // Category-level notes
      if (ud.notes && ud.notes.trim()) parts.push('[' + ud.notes.trim() + ']');

      row.push(parts.join(', '));
    });
    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);

  // Column widths: first col narrow, rest wider for content
  ws['!cols'] = [
    {wch: 20},
    ...cats.map(() => ({wch: 32}))
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Inspection Matrix');
}
