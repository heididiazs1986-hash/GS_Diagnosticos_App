/* report.js · Informe Técnico-Social en Word (plantilla del Asistente, revisada) con cifras reales de los registros */
(function (G) {
  const { esc, db, nits: N, C } = G;
  const Rep = {};
  const ACC = 'FF6600', DARK = '2F343A', NAVY = '113954';

  /* conteos reales por CD y totales, solo de esta visita y sin borradores */
  Rep.stats = (v, recs) => {
    const rs = recs.filter(r => r.visitId === v.id && !r.borrador), per = {};
    (v.cds || []).forEach(c => per[c.code] = { E: 0, C: 0, U: 0, S: 0, B: 0 });
    rs.forEach(r => { (per[r.Transformador] = per[r.Transformador] || { E: 0, C: 0, U: 0, S: 0, B: 0 })[r.type]++; });
    const t = { estructuras: 0, clients: 0, unc: 0, susp: 0, baldios: 0 };
    Object.values(per).forEach(x => { t.estructuras += x.E; t.clients += x.C; t.unc += x.U; t.susp += x.S; t.baldios += x.B; });
    return { per, ...t, records: rs };
  };
  Rep.sections = (v, st) => {
    const o = v.report || {};
    return [
      ['objective', 'Objeto de la visita', o.objective || N.objective(v, st)],
      ['territory', 'Caracterización general del territorio', o.territory || N.territory(v)],
      ['management', 'Gestión social desarrollada', o.management || N.management(v)],
      ['conclusion', 'Conclusiones', o.conclusion || N.conclusion(v, st)],
      ['recommendation', 'Recomendaciones', o.recommendation || N.recommendation(v)]
    ];
  };
  /* revisión de completitud antes del Word */
  Rep.checks = (v, st, pendExport) => {
    const out = [], add = (ok, text, r = '') => out.push({ ok, text, r });
    add(!!(v.areas || []).length && (v.areas || []).every(a => a.localidad), 'Áreas con localidad', (v.areas || []).some(a => !a.localidad) ? 'Falta localidad' : '');
    const noState = (v.cds || []).filter(c => !(c.validatedState)).length;
    add(!(v.cds || []).length ? false : noState === 0, 'Estado de cada CD confirmado', !(v.cds || []).length ? 'Sin CD' : noState ? `${noState} de ${v.cds.length}` : '');
    add(!!(v.territoryObs || Object.values(v.territory || {}).some(a => a?.length)), 'Territorio caracterizado', 'Falta');
    add(!!(v.findings || []).length, 'Al menos un hallazgo', 'Falta');
    add(!!(v.management?.topics?.length || v.management?.obs), 'Gestión social descrita', 'Falta');
    const drafts = st.records.length ? 0 : 0;
    add(pendExport === 0, 'Registros de campo exportados a Excel/ZIP', `${pendExport} sin exportar`);
    return out;
  };

  const smart = N.smartText;
  Rep.MAX_PHOTOS = 6;
  const INK = '14181D', TER = '79D1FF';
  const cap = (t, n) => { t = String(t || '').trim(); if (t.length <= n) return t; const cut = t.slice(0, n), k = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; ')); return (k > n * .5 ? cut.slice(0, k + 1) : cut.replace(/\s+\S*$/, '') + '…'); };

  /* ---------- fotos candidatas y elegidas ---------- */
  Rep.photoPool = (v, recs) => {
    const out = [];
    (v.findings || []).forEach(f => (f.photos || []).forEach(p => out.push({ id: 'f:' + f.id + ':' + p.id, src: 'Hallazgos', dataURL: p.dataURL, cap: p.caption || [f.category, f.areaLabel].filter(Boolean).join(' · ') })));
    recs.filter(r => r.visitId === v.id && !r.borrador).forEach(r => (r.Fotos || []).forEach((p, i) => out.push({ id: 'r:' + r.id + ':' + (p.id || i), src: 'Registros', dataURL: p.dataURL, cap: p.caption || [G.rec.TYPES[r.type].name, 'CD ' + r.Transformador, r.PuntoFisico].filter(Boolean).join(' · ') })));
    return out;
  };
  Rep.picked = (v, recs) => {
    const pool = Rep.photoPool(v, recs), by = Object.fromEntries(pool.map(p => [p.id, p]));
    const saved = v.report && v.report.photos;
    const sel = saved ? saved.filter(s => by[s.id]) : pool.filter(p => p.src === 'Hallazgos').slice(0, Rep.MAX_PHOTOS).map(p => ({ id: p.id, cap: p.cap }));
    return sel.slice(0, Rep.MAX_PHOTOS).map(s => ({ ...by[s.id], cap: s.cap || by[s.id].cap }));
  };

  /* ---------- dibujo de portada y gráficos (canvas → PNG) ---------- */
  const FONT = "'Open Sans', Arial, sans-serif";
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.textBaseline = 'alphabetic'; return [c, x]; };
  const png = c => new Promise(r => c.toBlob(b => b.arrayBuffer().then(r), 'image/png'));
  const cover = async (v, set, place, areas) => {
    const W = 1588, H = 2246, [c, x] = mk(W, H); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    const hero = await G.loadImg('img/hero.jpg'), sw = W * .42, k = Math.max(sw / hero.width, H / hero.height);
    x.save(); x.beginPath(); x.rect(0, 0, sw, H); x.clip(); x.drawImage(hero, (sw - hero.width * k) / 2, (H - hero.height * k) / 2, hero.width * k, hero.height * k); x.restore();
    x.fillStyle = '#FF6600'; x.fillRect(sw, 0, 14, H);
    const lg = await G.loadImg('img/applus-logo.png'), L = sw + 110, lw = 440; x.drawImage(lg, L, 130, lw, lw * lg.height / lg.width);
    const wrap = (t, mx, y, lh) => { const ws = t.split(' '); let ln = ''; ws.forEach(w => { if (x.measureText(ln + w).width > mx) { x.fillText(ln.trim(), L, y); y += lh; ln = ''; } ln += w + ' '; }); x.fillText(ln.trim(), L, y); return y + lh; };
    x.fillStyle = '#B34700'; x.font = `700 30px ${FONT}`; x.fillText('I N F O R M E   D E   D I A G N Ó S T I C O', L, 740);
    x.fillStyle = '#14181D'; x.font = `800 88px ${FONT}`; let y = wrap('Energía segura para todos - ESPT', W - L - 60, 850, 104);
    x.fillStyle = '#FF6600'; x.fillRect(L, y - 40, 150, 12);
    x.fillStyle = '#444'; x.font = `500 40px ${FONT}`; y = wrap('Bogotá D. C.' + (place ? ' · ' + place : ''), W - L - 70, y + 50, 56);
    if (areas) { x.font = `500 34px ${FONT}`; y = wrap(areas, W - L - 70, y + 6, 48); }
    x.fillStyle = '#667085'; x.font = `500 32px ${FONT}`; x.fillText('Visita ' + v.id, L, y + 20);
    x.fillStyle = '#14181D'; x.font = `600 32px ${FONT}`; x.fillText(G.fmtDate(v.date), L, H - 330);
    x.font = `500 32px ${FONT}`; x.fillStyle = '#444'; if (set.autor) x.fillText('Elaboró: ' + set.autor, L, H - 282); x.fillText('Gestión Social', L, H - 234);
    const ic = await G.loadImg('img/icon-192.png'); x.drawImage(ic, L, H - 160, 64, 64); x.fillStyle = '#667085'; x.font = `600 28px ${FONT}`; x.fillText('GS Diagnósticos', L + 82, H - 118);
    return png(c);
  };
  const chartRow = async (a, b) => {                                     /* dos gráficos lado a lado, 1800×540 */
    const [c, x] = mk(1800, 540); x.fillStyle = '#fff'; x.fillRect(0, 0, 1800, 540);
    [[a, 0], [b, 900]].forEach(([ch, ox]) => {
      x.save(); x.translate(ox, 0); x.fillStyle = '#F4F6F8'; x.beginPath(); x.roundRect(10, 6, 880, 528, 22); x.fill();
      x.fillStyle = '#B34700'; x.font = `700 28px ${FONT}`; x.fillText(ch.title.toUpperCase(), 44, 56);
      if (!ch.items.some(i => i.v > 0)) { x.fillStyle = '#98A2B3'; x.font = `500 32px ${FONT}`; x.fillText('Sin datos todavía', 44, 280); x.restore(); return; }
      if (ch.kind === 'bars') {
        const n = ch.items.length, mxv = Math.max(...ch.items.map(i => i.v)), bw = Math.min(110, 760 / n * .62), gap = 800 / n;
        ch.items.forEach((i, k) => { const bh = 330 * i.v / mxv, bx = 60 + k * gap + (gap - bw) / 2; x.fillStyle = i.col || '#FF6600'; x.beginPath(); x.roundRect(bx, 440 - bh, bw, Math.max(bh, 6), 8); x.fill(); x.fillStyle = '#14181D'; x.font = `800 34px ${FONT}`; x.textAlign = 'center'; x.fillText(i.v, bx + bw / 2, 430 - bh); x.fillStyle = '#555'; x.font = `500 26px ${FONT}`; x.fillText(i.l.length > 12 ? i.l.slice(0, 11) + '…' : i.l, bx + bw / 2, 482); x.textAlign = 'left'; });
      } else if (ch.kind === 'hbars') {
        const mxv = Math.max(...ch.items.map(i => i.v)), rh = Math.min(86, 420 / ch.items.length);
        ch.items.forEach((i, k) => { const yy = 100 + k * rh; x.fillStyle = '#444'; x.font = `500 27px ${FONT}`; x.fillText(i.l.length > 22 ? i.l.slice(0, 21) + '…' : i.l, 44, yy + 38); x.fillStyle = '#E3E6E9'; x.beginPath(); x.roundRect(330, yy + 12, 470, 34, 17); x.fill(); x.fillStyle = i.col || '#FF6600'; x.beginPath(); x.roundRect(330, yy + 12, Math.max(34, 470 * i.v / mxv), 34, 17); x.fill(); x.fillStyle = '#14181D'; x.font = `800 30px ${FONT}`; x.fillText(i.v, 820, yy + 40); });
      } else {                                                              /* donut */
        const tot = ch.items.reduce((s, i) => s + i.v, 0); let a0 = -Math.PI / 2;
        ch.items.forEach(i => { if (!i.v) return; const a1 = a0 + 2 * Math.PI * i.v / tot; x.beginPath(); x.arc(250, 300, 150, a0, a1); x.lineWidth = 62; x.strokeStyle = i.col; x.stroke(); a0 = a1; });
        x.fillStyle = '#14181D'; x.textAlign = 'center'; x.font = `800 80px ${FONT}`; x.fillText(tot, 250, 310); x.fillStyle = '#667085'; x.font = `500 28px ${FONT}`; x.fillText('CD', 250, 350); x.textAlign = 'left';
        ch.items.filter(i => i.v).forEach((i, k) => { x.fillStyle = i.col; x.beginPath(); x.roundRect(500, 190 + k * 70, 34, 34, 8); x.fill(); x.fillStyle = '#14181D'; x.font = `600 31px ${FONT}`; x.fillText(`${i.v} ${i.l}`, 550, 219 + k * 70); });
      }
      x.restore();
    });
    return png(c);
  };

  /* ---------- tablas y celdas ---------- */
  const NOB = { style: 'none', size: 0, color: 'FFFFFF' };
  const cellText = (d, text, o = {}) => new d.TableCell({ width: o.width ? { size: Math.round(o.width / 100 * 10206), type: d.WidthType.DXA } : undefined, shading: o.fill ? { type: d.ShadingType.CLEAR, fill: o.fill } : undefined, verticalAlign: d.VerticalAlign.CENTER, margins: { top: 60, bottom: 60, left: 70, right: 70 }, children: [new d.Paragraph({ alignment: o.center ? d.AlignmentType.CENTER : d.AlignmentType.LEFT, children: [new d.TextRun({ text: smart(String(text ?? '')), bold: !!o.bold, color: o.color || '000000', size: o.size || 16, font: 'Arial' })] })] });
  const tbl = (d, rows, widths) => new d.Table({ width: { size: 10206, type: d.WidthType.DXA }, layout: d.TableLayoutType.FIXED, columnWidths: widths.map(x => Math.round(x / 100 * 10206)), rows });
  const head = (d, labels, widths) => new d.TableRow({ tableHeader: true, children: labels.map((x, i) => cellText(d, x, { width: widths[i], fill: INK, color: 'FFFFFF', bold: true, center: true, size: 15 })) });
  const kpis = (d, items) => { const w = Math.round(10206 / items.length); return new d.Table({ width: { size: 10206, type: d.WidthType.DXA }, layout: d.TableLayoutType.FIXED, columnWidths: items.map(() => w), rows: [new d.TableRow({ children: items.map(([label, value]) => new d.TableCell({ width: { size: w, type: d.WidthType.DXA }, shading: { type: d.ShadingType.CLEAR, fill: 'F4F6F8' }, borders: { top: { style: 'single', size: 24, color: 'FF6600' }, bottom: NOB, left: { style: 'single', size: 18, color: 'FFFFFF' }, right: { style: 'single', size: 18, color: 'FFFFFF' } }, margins: { top: 100, bottom: 100, left: 60, right: 60 }, children: [new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: String(value), bold: true, color: 'FF6600', size: 42, font: 'Arial' })] }), new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: label, color: '444444', size: 15, font: 'Arial' })] })] })) })] }); };

  Rep.build = async (v, recs) => {
    if (!window.docx) throw new Error('No se pudo cargar el generador de Word');
    const d = window.docx, { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, PageNumber, PageBreak, BorderStyle, AlignmentType, Table, TableRow, TableCell, WidthType, TableLayoutType, TabStopType, SectionType } = d;
    const st = Rep.stats(v, recs), set = G.settings.get(), kids = [];
    const fetchAB = async u => (await fetch(u)).arrayBuffer();
    const place = N.visitPlace(v), areas = (v.areas || []).map(a => `${a.type} ${a.name}`).join(', ');
    const secs = Object.fromEntries(Rep.sections(v, st).map(s => [s[0], s[2]]));
    const P = (text, o = {}) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: o.sp || { after: 90, line: 260 }, keepNext: o.keepNext, children: [new TextRun({ text: o.raw ? text : smart(text), size: o.size || 18, bold: o.bold, italics: o.it, color: o.color, font: 'Arial' })] });
    const H = (n, t) => new Paragraph({ keepNext: true, spacing: { before: 0, after: 140 }, border: { bottom: { color: 'FF6600', style: BorderStyle.SINGLE, size: 14, space: 3 } }, children: [new TextRun({ text: n + '  ', bold: true, color: 'FF6600', size: 30, font: 'Arial' }), new TextRun({ text: t, bold: true, color: INK, size: 28, font: 'Arial' })] });
    const H3 = t => new Paragraph({ keepNext: true, spacing: { before: 170, after: 70 }, children: [new TextRun({ text: t.toUpperCase(), bold: true, color: 'B34700', size: 17, font: 'Arial' })] });
    const bullet = t => new Paragraph({ spacing: { after: 60, line: 250 }, indent: { left: 260, hanging: 200 }, children: [new TextRun({ text: '▪ ', color: 'FF6600', size: 18, font: 'Arial' }), new TextRun({ text: smart(t), size: 18, font: 'Arial' })] });
    const brk = () => new Paragraph({ spacing: { after: 0 }, children: [new PageBreak()] });
    const img = (buf, w, h, al) => new Paragraph({ alignment: al || AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new ImageRun({ data: buf, transformation: { width: w, height: h } })] });

    /* ---- datos derivados ---- */
    const cds = v.cds || [], fnd = v.findings || [], nReg = st.estructuras + st.clients + st.unc + st.susp + st.baldios;
    const stateOf = c => c.validatedState || c.suggestedState || 'No evaluado';
    const cnt = {}; cds.forEach(c => { const s = stateOf(c); cnt[s] = (cnt[s] || 0) + 1; });
    const stateItems = [['Favorable', 'Favorables', '#FF6600'], ['Crítico', 'Críticos', '#14181D']].map(([k, l, col]) => ({ l, v: cnt[k] || 0, col })).concat([{ l: 'Con observación', v: cds.filter(c => !['Favorable', 'Crítico'].includes(stateOf(c))).length, col: '#79D1FF' }]);
    const byCat = {}; fnd.forEach(f => { const k = f.category || 'Sin categoría'; byCat[k] = (byCat[k] || 0) + 1; });
    const catItems = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, n]) => ({ l, v: n }));
    const perCd = cds.map(c => { const n = st.per[c.code] || {}; return { l: c.code || '—', v: (n.E || 0) + (n.C || 0) + (n.U || 0) + (n.S || 0) + (n.B || 0), col: '#79D1FF' }; }).slice(0, 8);

    /* ---- portada (sección propia sin márgenes) ---- */
    const coverPng = await cover(v, set, place, areas);
    const coverSec = { properties: { page: { margin: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0 } } }, children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new ImageRun({ data: coverPng, transformation: { width: 793, height: 1122 } })] })] };

    /* ---- página 2: resumen ejecutivo ---- */
    kids.push(H('1', 'Resumen ejecutivo'), P(cap(secs.objective, 520)));
    kids.push(kpis(d, [['CD evaluados', cds.length], ['Estructuras', st.estructuras], ['Predios UNC', st.unc + st.susp], ['Clientes', st.clients], ['Hallazgos', fnd.length]]));
    kids.push(H3('Lo más importante'));
    kids.push(bullet(`Se recorrieron ${cds.length} CD en ${(v.areas || []).length || 1} sector(es) de ${place || 'Bogotá'}, con ${nReg} registros de campo con GPS y fotografía.`));
    kids.push(bullet(fnd.length ? `Se identificaron ${fnd.length} hallazgos${catItems[0] ? `; el más frecuente es «${catItems[0].l}» (${catItems[0].v})` : ''}.` : 'No se registraron hallazgos en esta visita.'));
    const crit = cds.filter(c => stateOf(c) === 'Crítico').length;
    if (cds.length) kids.push(bullet(crit ? `${crit} de ${cds.length} CD en estado crítico: requieren atención prioritaria.` : `Ningún CD quedó en estado crítico (${cnt['Favorable'] || 0} favorables).`));
    kids.push(bullet(`Gestión social: ${v.management?.meeting === 'Sí' ? 'se realizó reunión con la comunidad' : 'sin reunión con la comunidad'}; ${(v.pendings || []).length} pendiente(s) de seguimiento.`));
    kids.push(img(await chartRow({ title: 'Registros por tipo', kind: 'bars', items: [['Estruct.', st.estructuras], ['UNC', st.unc], ['Clientes', st.clients], ['Susp.', st.susp], ['Baldíos', st.baldios]].map(([l, n]) => ({ l, v: n })) }, { title: 'Estado de los CD', kind: 'donut', items: stateItems }), 672, 202));
    kids.push(img(await chartRow({ title: 'Hallazgos por categoría', kind: 'hbars', items: catItems }, { title: 'Registros por CD', kind: 'bars', items: perCd }), 672, 202));

    /* ---- página 3: infraestructura y territorio ---- */
    kids.push(brk(), H('2', 'Infraestructura y territorio'));
    const w = [10, 10, 6, 12, 8, 7, 7, 12, 28], lab = ['OS', 'CD', 'kVA', 'Propiedad', 'Clientes', 'UNC', 'Susp.', 'Estado', 'Infraestructura'];
    kids.push(tbl(d, [head(d, lab, w), ...(cds.length ? cds.slice(0, 8) : [{}]).map(c => { const s = stateOf(c), n = st.per[c.code] || {}; return new TableRow({ cantSplit: true, children: [cellText(d, c.os || '', { width: w[0], center: true }), cellText(d, c.code || 'No registrado', { width: w[1], center: true, bold: true }), cellText(d, c.kva || 'N.V.', { width: w[2], center: true }), cellText(d, c.property || '', { width: w[3], center: true }), cellText(d, n.C || 0, { width: w[4], center: true }), cellText(d, n.U || 0, { width: w[5], center: true }), cellText(d, n.S || 0, { width: w[6], center: true }), cellText(d, s, { width: w[7], fill: s === 'Favorable' ? 'DFF4E5' : s === 'Crítico' ? 'FFE1E1' : 'FFF0C9', bold: true, center: true }), cellText(d, cap(c.nitsDescription || N.describeInfra(c), 150), { width: w[8], size: 14 })] }); })], w));
    kids.push(H3('Caracterización del territorio'), P(cap(secs.territory, 800)));
    kids.push(H3('Hallazgos identificados'));
    const fw = [22, 18, 60], rows = (fnd.length ? fnd.slice(0, 7) : [{}]);
    kids.push(tbl(d, [head(d, ['Sector', 'Categoría', 'Hallazgo'], fw), ...rows.map(f => new TableRow({ cantSplit: true, children: [cellText(d, f.areaLabel || 'No registrado', { width: fw[0] }), cellText(d, f.category || '', { width: fw[1], center: true }), cellText(d, cap(f.nitsText || f.obs || '', 230), { width: fw[2], size: 15 })] }))], fw));
    if (fnd.length > 7) kids.push(P(`… y ${fnd.length - 7} hallazgos más registrados en la app.`, { it: true, size: 15, sp: { before: 60, after: 0 } }));

    /* ---- página 4: registro fotográfico elegido ---- */
    const pics = Rep.picked(v, recs);
    if (pics.length) {
      kids.push(brk(), H('3', 'Registro fotográfico'));
      const cells = [], BW = 316, BH = 190;
      for (const p of pics) {
        const im = await G.loadImg(p.dataURL), k = Math.min(BW / im.width, BH / im.height);
        cells.push(new TableCell({ width: { size: 5103, type: WidthType.DXA }, margins: { top: 60, bottom: 100, left: 70, right: 70 }, borders: { top: NOB, bottom: NOB, left: NOB, right: NOB }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [new ImageRun({ data: G.dataURLtoU8(p.dataURL), transformation: { width: Math.round(im.width * k), height: Math.round(im.height * k) } })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Foto ${pics.indexOf(p) + 1}. `, bold: true, color: 'B34700', size: 15, font: 'Arial' }), new TextRun({ text: smart(p.cap || 'Registro fotográfico'), italics: true, size: 15, color: '444444', font: 'Arial' })] })] }));
      }
      const trs = []; for (let i = 0; i < cells.length; i += 2) trs.push(new TableRow({ cantSplit: true, children: [cells[i], cells[i + 1] || new TableCell({ width: { size: 5103, type: WidthType.DXA }, borders: { top: NOB, bottom: NOB, left: NOB, right: NOB }, children: [new Paragraph({ children: [] })] })] }));
      kids.push(new Table({ width: { size: 10206, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [5103, 5103], rows: trs }));
    }

    /* ---- página 5: gestión y conclusiones ---- */
    kids.push(brk(), H(pics.length ? '4' : '3', 'Gestión y conclusiones'), P(cap(secs.management, 650)));
    const people = (v.people || []).filter(p => p.name);
    if (people.length) kids.push(P('Actores contactados: ' + people.slice(0, 6).map(p => `${p.name}${p.role ? ' (' + p.role + ')' : ''}`).join('; ') + '.', { size: 16 }));
    kids.push(H3('Pendientes y próxima gestión'));
    const pw = [50, 20, 15, 15];
    kids.push(tbl(d, [head(d, ['Pendiente', 'Responsable', 'Estado', 'Fecha'], pw), ...((v.pendings || []).length ? v.pendings.slice(0, 6) : [{}]).map(p => new TableRow({ cantSplit: true, children: [cellText(d, cap(p.text || 'No se registraron pendientes', 140), { width: pw[0] }), cellText(d, p.responsible || '', { width: pw[1], center: true }), cellText(d, p.status || '', { width: pw[2], center: true }), cellText(d, G.fmtDate(p.date), { width: pw[3], center: true })] }))], pw));
    kids.push(H3('Conclusiones'), P(cap(secs.conclusion, 650)), H3('Recomendaciones'), P(cap(secs.recommendation, 750)));
    kids.push(new Paragraph({ spacing: { before: 700 }, border: { top: { color: '333333', style: BorderStyle.SINGLE, size: 6 } }, tabStops: [{ type: TabStopType.LEFT, position: 5400 }], children: [new TextRun({ text: set.autor || 'Elaboró', bold: true, size: 17, font: 'Arial' }), new TextRun({ text: '\tGestión Social · APPLUS+', size: 16, color: '667085', font: 'Arial' })] }));

    const logo = await fetchAB('img/applus-logo.png');
    const header = new Header({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 10206 }], border: { bottom: { color: 'FF6600', style: BorderStyle.SINGLE, size: 10, space: 4 } }, children: [new TextRun({ text: 'Informe de diagnóstico de gestión social', size: 15, color: '667085', font: 'Arial' }), new TextRun({ text: '\t', size: 15 }), new ImageRun({ data: logo, transformation: { width: 84, height: 26 } })] })] });
    const footer = new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 10206 }], children: [new TextRun({ text: `Visita ${v.id}${place ? ' · ' + place : ''}`, size: 15, color: '667085', font: 'Arial' }), new TextRun({ text: '\tPágina ', size: 15, color: '667085', font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 15, color: '667085', font: 'Arial' }), new TextRun({ text: ' de ', size: 15, color: '667085', font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: '667085', font: 'Arial' })] })] });
    const doc = new Document({ styles: { default: { document: { run: { font: 'Arial', size: 18 } } } }, sections: [coverSec, { properties: { type: SectionType.NEXT_PAGE, page: { margin: { top: 900, right: 850, bottom: 800, left: 850, header: 400, footer: 350 } } }, headers: { default: header }, footers: { default: footer }, children: kids }] });
    const blob = await Packer.toBlob(doc);
    const slug = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'SinNombre';
    return { blob, name: `${v.id}_${slug(place || 'Bogota')}_${slug(v.areas?.[0]?.name || 'Visita')}.docx` };
  };
  G.report = Rep;
})(window.GS);
