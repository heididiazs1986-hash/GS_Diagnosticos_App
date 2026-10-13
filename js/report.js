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
  const cellText = (d, text, o = {}) => new d.TableCell({ width: o.width ? { size: Math.round(o.width / 100 * 10606), type: d.WidthType.DXA } : undefined, shading: o.fill ? { type: d.ShadingType.CLEAR, fill: o.fill } : undefined, verticalAlign: d.VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 70, right: 70 }, children: [new d.Paragraph({ alignment: o.center ? d.AlignmentType.CENTER : d.AlignmentType.LEFT, children: [new d.TextRun({ text: smart(String(text ?? '')), bold: !!o.bold, color: o.color || '000000', size: o.size || 17, font: 'Arial' })] })] });
  const tbl = (d, rows, fixed, widths) => new d.Table({ width: widths ? { size: 10606, type: d.WidthType.DXA } : { size: 100, type: d.WidthType.PERCENTAGE }, layout: fixed ? d.TableLayoutType.FIXED : undefined, columnWidths: widths ? widths.map(x => Math.round(x / 100 * 10606)) : undefined, rows });
  const head = (d, labels, widths) => new d.TableRow({ tableHeader: true, children: labels.map((x, i) => cellText(d, x, { width: widths?.[i], fill: DARK, color: 'FFFFFF', bold: true, center: true, size: 15 })) });
  const kpi = (d, items) => tbl(d, [new d.TableRow({ children: items.map(([label, value, sub]) => new d.TableCell({ shading: { type: d.ShadingType.CLEAR, fill: 'F4F6F8' }, margins: { top: 90, bottom: 90, left: 60, right: 60 }, children: [new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: String(value), bold: true, color: '111111', size: 34, font: 'Arial' })] }), new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: label, bold: true, color: NAVY, size: 16, font: 'Arial' })] }), new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: sub || '', color: NAVY, size: 13, font: 'Arial' })] })] })) })]);

  Rep.build = async (v, recs, opts = {}) => {
    if (!window.docx) throw new Error('No se pudo cargar el generador de Word');
    const d = window.docx, { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, PageNumber, PageBreak, ShadingType, BorderStyle, AlignmentType, Table, TableRow, TableCell, WidthType, TableLayoutType } = d;
    const st = Rep.stats(v, recs), set = G.settings.get(), kids = [];
    const fetchAB = async u => (await fetch(u)).arrayBuffer();
    const inmel = await fetchAB('img/inmel-logo.png'), gs = await fetchAB('img/gs-process-logo.png');
    const place = N.visitPlace(v), areas = (v.areas || []).map(a => `${a.type} ${a.name}`).join(', ');
    const P = (text, o = {}) => new Paragraph({ alignment: o.al || AlignmentType.JUSTIFIED, spacing: o.sp || { after: 140, line: 280 }, border: o.border, keepNext: o.keepNext, children: [new TextRun({ text: o.raw ? text : smart(text), size: o.size || 20, bold: o.bold, color: o.color, font: 'Arial' })] });
    const title = (n, t) => kids.push(new Paragraph({ keepNext: true, spacing: { before: 240, after: 100 }, children: [new TextRun({ text: ` ${n} `, bold: true, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, fill: DARK }, size: 20, font: 'Arial' }), new TextRun({ text: `  ${t}`, bold: true, color: DARK, size: 24, font: 'Arial' })] }));
    const para = t => kids.push(P(t));

    kids.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ data: inmel, transformation: { width: 150, height: 47 } })] }),
      new Paragraph({ spacing: { before: 900 }, children: [new TextRun({ text: 'GESTIÓN SOCIAL', bold: true, color: DARK, size: 32, font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 220 }, children: [new TextRun({ text: 'INFORME DE', size: 22, color: DARK, font: 'Arial' })] }),
      new Paragraph({ children: [new TextRun({ text: 'DIAGNÓSTICO', bold: true, color: DARK, size: 54, font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: 'TÉCNICO - SOCIAL', bold: true, color: DARK, size: 32, font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 260 }, children: [new TextRun({ text: `Bogotá D. C.${place ? ' · ' + place : ''}${areas ? ' · ' + areas : ''}`, color: '667085', size: 22, font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 2200 }, border: { top: { color: ACC, style: BorderStyle.SINGLE, size: 24 } }, children: [new TextRun({ text: `ID: ${v.id}     Fecha: ${G.fmtDate(v.date)}     Zona: ${v.zona || ''}${set.autor ? '     Elaboró: ' + set.autor : ''}`, size: 20, color: DARK, font: 'Arial' })] }),
      new Paragraph({ children: [new PageBreak()] }));

    const secs = Object.fromEntries(Rep.sections(v, st).map(s => [s[0], s[2]]));
    title(1, 'Objeto de la visita'); para(secs.objective);
    title(2, 'Caracterización general del territorio'); para(secs.territory);
    title(3, 'Indicadores de caracterización');
    kids.push(kpi(d, [['CD EVALUADOS', (v.cds || []).length, 'Centros de distribución'], ['PREDIOS UNC', st.unc + st.susp, 'Usuarios por normalizar'], ['CLIENTES', st.clients, 'Predios con medidor'], ['kWh/mes', N.energy(st).toLocaleString('es-CO'), 'Consumo proyectado a recuperar']]));
    kids.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
    kids.push(kpi(d, [['ESTRUCTURAS', st.estructuras, 'Nodos levantados'], ['UNC', st.unc, 'Usuarios no cliente'], ['SUSPENSIONES', st.susp, 'Predios para suspensión'], ['BALDÍOS', st.baldios, 'Predios sin habitabilidad plena']]));
    title(4, 'Diagnóstico de infraestructura');
    const w = [10, 11, 6, 10, 6, 6, 6, 6, 11, 28], lab = ['Orden de servicio', 'CD', 'kVA', 'Propiedad', 'Clientes', 'UNC', 'Susp.', 'Baldíos', 'Estado', 'Descripción de infraestructura'];
    kids.push(tbl(d, [head(d, lab, w), ...((v.cds || []).length ? v.cds : [{}]).map(c => {
      const s = c.validatedState || c.suggestedState || 'No evaluado', n = st.per[c.code] || { E: 0, C: 0, U: 0, S: 0, B: 0 };
      return new TableRow({ children: [cellText(d, c.os || '', { width: w[0], center: true }), cellText(d, c.code || 'No registrado', { width: w[1], center: true, bold: true }), cellText(d, c.kva || 'N.V.', { width: w[2], center: true }), cellText(d, c.property || '', { width: w[3], center: true }), cellText(d, n.C, { width: w[4], center: true }), cellText(d, n.U, { width: w[5], center: true }), cellText(d, n.S, { width: w[6], center: true }), cellText(d, n.B, { width: w[7], center: true }), cellText(d, (s === 'Favorable' ? '✓ ' : s === 'Crítico' ? '⚠ ' : '▲ ') + s, { width: w[8], fill: s === 'Favorable' ? 'DFF4E5' : s === 'Crítico' ? 'FFE1E1' : 'FFF0C9', bold: true, center: true }), cellText(d, c.nitsDescription || N.describeInfra(c), { width: w[9] })] });
    })], true, w));
    title(5, 'Hallazgos identificados');
    kids.push(tbl(d, [head(d, ['Sector', 'Categoría', 'Hallazgo']), ...((v.findings || []).length ? v.findings : [{}]).map(f => new TableRow({ children: [cellText(d, f.areaLabel || 'No registrado'), cellText(d, f.category || '', { center: true }), cellText(d, f.nitsText || f.obs || '')] }))]));
    title(6, 'Gestión social desarrollada'); para(secs.management);
    const people = (v.people || []).filter(p => p.name);
    if (people.length) para('Actores comunitarios e institucionales contactados: ' + people.map(p => `${p.name}${p.role ? ' (' + p.role + ')' : ''}`).join('; ') + '.');
    title(7, 'Pendientes y próxima gestión');
    kids.push(tbl(d, [head(d, ['Pendiente', 'Responsable', 'Estado', 'Fecha']), ...((v.pendings || []).length ? v.pendings : [{}]).map(p => new TableRow({ children: [cellText(d, p.text || 'No se registraron pendientes'), cellText(d, p.responsible || '', { center: true }), cellText(d, p.status || '', { center: true }), cellText(d, G.fmtDate(p.date), { center: true })] }))]));
    title(8, 'Conclusiones'); para(secs.conclusion);
    title(9, 'Recomendaciones'); para(secs.recommendation);

    /* registro fotográfico: hallazgos (+ opcional una foto por registro de campo) */
    const photos = (v.findings || []).flatMap(f => (f.photos || []).map(p => ({ ...p, cap: p.caption || f.areaLabel })));
    if (opts.recPhotos) st.records.forEach(r => { const p = (r.Fotos || [])[0]; if (p) photos.push({ ...p, cap: `${G.rec.TYPES[r.type].name} · CD ${r.Transformador} · ${r.PuntoFisico || ''}` }); });
    if (photos.length) {
      kids.push(new Paragraph({ children: [new PageBreak()] })); title(10, 'Registro fotográfico');
      for (let i = 0; i < photos.length; i += 4) {
        const group = photos.slice(i, i + 4), cells = [];
        for (let j = 0; j < 4; j++) {
          const p = group[j]; if (!p) { cells.push(new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [] })] })); continue; }
          const im = await G.loadImg(p.dataURL), s = Math.min(145 / im.width, 105 / im.height);
          cells.push(new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, margins: { top: 80, bottom: 80, left: 60, right: 60 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: G.dataURLtoU8(p.dataURL), transformation: { width: Math.round(im.width * s), height: Math.round(im.height * s) } })] }), new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: smart(p.cap || 'Registro fotográfico'), size: 15, font: 'Arial' })] })] }));
        }
        kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, rows: [new TableRow({ cantSplit: true, children: cells })] }));
      }
    }
    title(11, 'Glosario');
    kids.push(tbl(d, N.glossaryFor(v).map(([k, t]) => new TableRow({ children: [cellText(d, k, { width: 20, fill: DARK, color: 'FFFFFF', bold: true }), cellText(d, t, { width: 80 })] })), true, [20, 80]));
    kids.push(new Paragraph({ spacing: { before: 500 }, children: [new TextRun({ text: 'Elaboró: ' + (set.autor || '________________________________'), size: 20, font: 'Arial' })] }));

    const header = new Header({ children: [new Paragraph({ border: { bottom: { color: ACC, style: BorderStyle.SINGLE, size: 10 } }, children: [new ImageRun({ data: gs, transformation: { width: 170, height: 26 } })] })] });
    const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Visita ${v.id} · Página `, size: 16, color: '667085', font: 'Arial' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '667085', font: 'Arial' }), new TextRun({ text: ' de ', size: 16, color: '667085', font: 'Arial' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '667085', font: 'Arial' })] })] });
    const doc = new Document({ styles: { default: { document: { run: { font: 'Arial', size: 20 }, paragraph: { alignment: AlignmentType.JUSTIFIED } } } }, sections: [{ properties: { titlePage: true, page: { margin: { top: 650, right: 650, bottom: 650, left: 650 } } }, headers: { first: new Header({ children: [] }), default: header }, footers: { default: footer }, children: kids }] });
    const blob = await Packer.toBlob(doc);
    const slug = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'SinNombre';
    return { blob, name: `${v.id}_${slug(place || 'Bogota')}_${slug(v.areas?.[0]?.name || 'Visita')}.docx` };
  };
  G.report = Rep;
})(window.GS);
