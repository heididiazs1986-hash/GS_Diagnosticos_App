/* export.js · Excel (SpreadsheetML .xls) + ZIP de fotos con el mismo formato de GS DX; respaldos e importación */
(function (G) {
  const { esc, db, rec: R } = G;
  const X = {};
  const H = {
    E: ['Ítem', 'Transformador (CD)', 'OS', 'Capacidad CD (kVA)', 'Tipo Nodo', 'Material Nodo', 'Características Nodo', 'Punto Físico', 'Tipo de Redes BT', 'Luminarias (AP)', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones'],
    U: ['Ítem', 'Transformador (CD)', 'OS', 'Punto Físico', 'Longitud al nodo (m)', 'Nombres', 'Identificación', 'Contacto', 'Sede', 'Municipio', 'Dirección', 'Localidad', 'Tipo Zona', 'Tipo material', 'Tipo de población', 'Para servicio requiere ampliación de redes', 'Documento de propiedad', 'Formato E1', 'AR', 'DJ', 'E6', 'EC Particular', 'Doc. electricista', 'RETIE', 'EC Inmel', 'Estado', '¿Requiere muro?', '¿Requiere uso de arriostre?', 'Acometida', 'Ducto 1" Galv.', 'Celda', 'Interruptor', 'SPT (Tierra)', 'Instalación interna', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones'],
    C: ['Ítem', 'Transformador (CD)', 'OS', 'Punto Físico', 'Longitud al nodo (m)', 'Serie de medidor', 'Marca de medidor', 'No. Fases', 'Estado de medidor', '¿Requiere inspección/Cambio?', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones'],
    S: ['Ítem', 'Transformador (CD)', 'OS', 'Punto Físico', 'Longitud al nodo (m)', 'Motivo de suspensión', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones'],
    B: ['Ítem', 'Transformador (CD)', 'OS', 'Punto Físico', 'Longitud al nodo (m)', 'Estado', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones']
  };
  const tail = x => ({ 'Latitud (Y)': x.Latitud, 'Longitud (X)': x.Longitud, 'Precisión (m)': x.Precision || '', FECHA_HORA: x.fechaISO || '', GPS_HORA: x.gpsISO || '', Observaciones: x.Observaciones || '' });
  const loc = x => { const s = G.settings.get(); const l = String(x.Localidad || '').toUpperCase(), b = String(x.Barrio || '').toUpperCase(); return s.locFmt === 'solo' ? l : [l, b].filter(Boolean).join(' - '); };
  const ROW = {
    E: x => ({ 'Ítem': x.item, 'Transformador (CD)': x.Transformador, OS: x._os || '', 'Capacidad CD (kVA)': x.Capacidad_kVA || '', 'Tipo Nodo': x.TipoNodo, 'Material Nodo': x.MaterialNodo, 'Características Nodo': x.CaracteristicasNodo, 'Punto Físico': x.PuntoFisico, 'Tipo de Redes BT': x.TipoRedBT, 'Luminarias (AP)': x.Luminarias, ...tail(x) }),
    U: x => { const s = G.settings.get(); return { 'Ítem': x.item, 'Transformador (CD)': x.Transformador, OS: x._os || '', 'Punto Físico': x.PuntoFisico || '', 'Longitud al nodo (m)': x.LongitudNodo || '', Nombres: x.Nombres, 'Identificación': x.Identificacion, Contacto: x.Contacto, Sede: s.sede, Municipio: s.municipio, 'Dirección': x.Direccion, Localidad: loc(x), 'Tipo Zona': x.TipoZona, 'Tipo material': x.TipoMaterial, 'Tipo de población': x.TipoPoblacion || '', 'Para servicio requiere ampliación de redes': x.AmpliacionRedes, 'Documento de propiedad': x.DocPropiedad, 'Formato E1': x.E1, AR: x.AR, DJ: x.DJ, E6: x.E6, 'EC Particular': x.ECPart, 'Doc. electricista': x.DocElectricista, RETIE: x.RETIE, 'EC Inmel': x.ECInmel, Estado: x.Estado, '¿Requiere muro?': x.RequiereMuro, '¿Requiere uso de arriostre?': x.RequiereArriostre, Acometida: x.Acometida, 'Ducto 1" Galv.': x.Ducto, Celda: x.Celda, Interruptor: x.Interruptor, 'SPT (Tierra)': x.SPT, 'Instalación interna': x.InstalacionInterna, ...tail(x) }; },
    C: x => ({ 'Ítem': x.item, 'Transformador (CD)': x.Transformador, OS: x._os || '', 'Punto Físico': x.PuntoFisico || '', 'Longitud al nodo (m)': x.LongitudNodo || '', 'Serie de medidor': x.SerieMedidor, 'Marca de medidor': x.MarcaMedidor, 'No. Fases': x.Fases, 'Estado de medidor': x.EstadoMedidor, '¿Requiere inspección/Cambio?': x.ReqInspeccion, ...tail(x) }),
    S: x => ({ 'Ítem': x.item, 'Transformador (CD)': x.Transformador, OS: x._os || '', 'Punto Físico': x.PuntoFisico || '', 'Longitud al nodo (m)': x.LongitudNodo || '', 'Motivo de suspensión': x.Motivo, ...tail(x) }),
    B: x => ({ 'Ítem': x.item, 'Transformador (CD)': x.Transformador, OS: x._os || '', 'Punto Físico': x.PuntoFisico || '', 'Longitud al nodo (m)': x.LongitudNodo || '', Estado: x.Estado, ...tail(x) })
  };
  /* ---------- exportación por SECTOR (barrio / vereda): un solo Excel + ZIP de fotos ---------- */
  const TIPOS = ['E', 'C', 'U', 'S', 'B'], GROUP = { E: 'ESTRUCTURAS', U: 'UNC', C: 'CLIENTES', S: 'SUSPENSIONES', B: 'BALDIOS' };
  const sn = G.safeName;
  const folder = r => ({ E: `${r.Transformador}_${r.PuntoFisico}`, U: `${r.Transformador}_${r.PuntoFisico}_${r.Identificacion || ''}`, C: `${r.Transformador}_${r.SerieMedidor}`, S: `${r.Transformador}_${r.PuntoFisico}`, B: `${r.Transformador}_${r.PuntoFisico}_BALDIO_${r.item}` })[r.type];
  const ex = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const cell = v => `<Cell><Data ss:Type="String">${ex(v)}</Data></Cell>`;
  const sheetXml = (name, hs, rows) => `<Worksheet ss:Name="${ex(name)}"><Table><Row>${hs.map(cell).join('')}</Row>${rows.map(r => '<Row>' + hs.map(h => cell(r[h] ?? '')).join('') + '</Row>').join('')}</Table></Worksheet>`;
  const book = sheets => new TextEncoder().encode(`<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">\n${sheets.join('\n')}\n</Workbook>`);

  /* órdenes de servicio por CD (acepta el campo antiguo cd.os) */
  X.orders = cd => Array.isArray(cd.orders) ? cd.orders : (cd.os ? [String(cd.os)] : []);
  const validArea = (v, id) => !!id && v.areas.some(a => a.id === id);
  const sectorOf = (v, r) => validArea(v, r.areaId) ? r.areaId : (() => { const c = v.cds.find(c => c.code === r.Transformador); return validArea(v, c?.areaId) ? c.areaId : ''; })();
  const sectorOfItem = (v, x) => validArea(v, x.areaId) ? x.areaId : '';

  /* sectores de la visita con su contenido y estado de exportación */
  X.sectors = (v, recs) => {
    const ids = [...v.areas.map(a => a.id), ''];
    return ids.map(id => {
      const area = v.areas.find(a => a.id === id) || null;
      const all = recs.filter(r => sectorOf(v, r) === id);
      const done = all.filter(r => !r.borrador), drafts = all.length - done.length;
      const finds = v.findings.filter(f => sectorOfItem(v, f) === id), people = v.people.filter(p => sectorOfItem(v, p) === id), pends = v.pendings.filter(p => sectorOfItem(v, p) === id);
      const codes = [...new Set([...done.map(r => r.Transformador), ...v.cds.filter(c => (validArea(v, c.areaId) ? c.areaId : '') === id).map(c => c.code)])].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
      const pendR = done.filter(r => !r.exportado), sentR = done.filter(r => r.exportado && !r.recibido), gotR = done.filter(r => r.recibido);
      const pendF = finds.filter(f => !f.exportado), sentF = finds.filter(f => f.exportado && !f.recibido);
      return { id, area, name: area ? `${area.type || 'Sector'} ${area.name || ''}`.trim() : 'Sin sector asignado', loc: area?.localidad || v.localidad || '', all, done, drafts, finds, people, pends, codes, pendR, sentR, gotR, pendF, sentF,
        pend: pendR.length + pendF.length, sent: sentR.length + sentF.length, got: gotR.length, empty: !all.length && !finds.length && !people.length && !pends.length && !codes.length };
    }).filter(x => !x.empty);
  };
  /* CD del sector (crea la ficha si el CD solo existe en registros importados) */
  X.sectorCds = (v, sec, codes) => codes.map(code => { let c = v.cds.find(c => c.code === code); if (!c) { const r = sec.all.find(r => r.Transformador === code); c = G.cdOf(code, r?.Capacidad_kVA || ''); c.areaId = sec.id; v.cds.push(c); } return c; });

  X.collect = (v, sec, withSent) => {
    const set = sec.done.filter(r => withSent || !r.exportado).sort((a, b) => (a.item || 0) - (b.item || 0));
    const finds = sec.finds.filter(f => withSent || !f.exportado);
    return { set, finds, codes: [...new Set(set.map(r => r.Transformador))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })) };
  };

  const join = a => (a || []).join('; ');
  X.build = async (v, sec, { withSent = false } = {}) => {
    const { set, finds, codes } = X.collect(v, sec, withSent);
    if (!set.length && !finds.length) return null;
    const cds = X.sectorCds(v, sec, codes), osOf = code => X.orders(cds.find(c => c.code === code) || {}).join(' / ');
    const by = Object.fromEntries(TIPOS.map(t => [t, []])); set.forEach(r => by[r.type]?.push({ ...r, _os: osOf(r.Transformador) }));
    const now = new Date(), st = G.stamp(now), nm = sn([sec.loc, sec.area?.name || 'SIN_SECTOR'].filter(Boolean).join('_')).replace(/ /g, '_') || 'SECTOR';
    const cnt = Object.fromEntries(TIPOS.map(t => [t, by[t].length]));
    const names = { E: 'Estructuras', C: 'Clientes', U: 'UNC', S: 'Suspensiones', B: 'Baldíos' };
    const tg = G.C.techGroups, tr = G.C.territoryGroups;
    const sheets = [];
    sheets.push(sheetXml('Resumen', ['Concepto', 'Valor'], [
      ['Visita', v.id], ['Fecha de la visita', G.fmtDate(v.date)], ['Localidad', sec.loc], ['Sector', sec.name], ['Exportado', now.toLocaleString('es-CO')],
      ...TIPOS.map(t => [names[t], cnt[t]]), ['Hallazgos y fotos rápidas', finds.length], ['Contactos', sec.people.length], ['Pendientes', sec.pends.length],
      ['CD incluidos', codes.length], ['Órdenes de servicio', cds.reduce((n, c) => n + X.orders(c).length, 0)]].map(([a, b]) => ({ Concepto: a, Valor: b }))));
    const HCD = ['CD', 'OS', 'kVA', 'Propiedad', 'Estado del CD', 'Estr.', 'Cli.', 'UNC', 'Susp.', 'Bald.', ...Object.values(tg).map(g => g.title), 'Observaciones técnicas', 'Descripción'];
    sheets.push(sheetXml('CD y OS', HCD, cds.flatMap(c => (X.orders(c).length ? X.orders(c) : ['']).map(os => ({ CD: c.code, OS: os, kVA: c.kva, Propiedad: c.property, 'Estado del CD': c.validatedState || c.suggestedState || '', 'Estr.': by.E.filter(r => r.Transformador === c.code).length, 'Cli.': by.C.filter(r => r.Transformador === c.code).length, UNC: by.U.filter(r => r.Transformador === c.code).length, 'Susp.': by.S.filter(r => r.Transformador === c.code).length, 'Bald.': by.B.filter(r => r.Transformador === c.code).length, ...Object.fromEntries(Object.entries(tg).map(([k, g]) => [g.title, join(c[k])])), 'Observaciones técnicas': c.obs || '', Descripción: c.nitsDescription || '' })))));
    for (const t of TIPOS) if (by[t].length) sheets.push(sheetXml(R.TYPES[t].sheet, H[t], by[t].map(ROW[t])));
    if (finds.length) sheets.push(sheetXml('Hallazgos', ['Categoría', 'Sector', 'Hallazgo', 'Fotos', 'Fecha'], finds.map(f => ({ Categoría: f.category || '', Sector: f.areaLabel || sec.name, Hallazgo: f.nitsText || f.obs || '', Fotos: (f.photos || []).length, Fecha: f.createdAt ? new Date(f.createdAt).toLocaleString('es-CO') : '' }))));
    if (sec.people.length) sheets.push(sheetXml('Contactos', ['Nombre', 'Rol', 'Teléfono', 'Notas'], sec.people.map(p => ({ Nombre: p.name, Rol: p.role, 'Teléfono': p.phone, Notas: p.notes }))));
    if (sec.pends.length) sheets.push(sheetXml('Pendientes', ['Pendiente', 'Responsable', 'Estado', 'Fecha'], sec.pends.map(p => ({ Pendiente: p.text, Responsable: p.responsible, Estado: p.status, Fecha: p.date || '' }))));
    const tg2 = [...Object.entries(tr).map(([k, g]) => [g.title, join(v.territory?.[k])]), ['Observaciones del territorio', v.territoryObs || ''], ['Temas socializados', join(v.management?.topics)], ['Reunión con la comunidad', v.management?.meeting || ''], ['Observaciones de gestión', v.management?.obs || ''], ['Próxima gestión', v.management?.nextAction || '']].filter(x => x[1]);
    if (tg2.length) sheets.push(sheetXml('Territorio y gestión', ['Concepto', 'Detalle'], tg2.map(([a, b]) => ({ Concepto: a, Detalle: b }))));
    const files = [{ name: `GS_Diagnostico_${nm}_${st}.xls`, data: book(sheets) }], used = new Set();
    for (const t of TIPOS) for (const r of by[t]) {
      let f = sn(folder(r)) || `${t}_${r.item}`; const key = GROUP[t] + '/' + f; if (used.has(key)) f += '_' + r.item; used.add(GROUP[t] + '/' + f);
      (r.Fotos || []).forEach((p, i) => files.push({ name: `FOTOS/${GROUP[t]}/${f}/foto_${i + 1}.jpg`, data: G.dataURLtoU8(p.dataURL) }));
    }
    finds.forEach((f, n) => { const d = sn(`${n + 1}_${f.category || 'Hallazgo'}`).replace(/ /g, '_'); (f.photos || []).forEach((p, i) => files.push({ name: `FOTOS/HALLAZGOS/${d}/foto_${i + 1}.jpg`, data: G.dataURLtoU8(p.dataURL) })); });
    const commit = async () => {
      for (const r of set) { r.exportado = true; r.Exportado = 'Sí'; r.recibido = false; r.exportBatch = st; r.fechaExportacion = now.toISOString(); await db.put('records', r); }
      finds.forEach(f => { f.exportado = true; f.recibido = false; f.exportBatch = st; });
    };
    return { blob: G.makeZip(files), name: `GS_Diagnostico_${nm}_${st}.zip`, counts: cnt, finds: finds.length, total: set.length + finds.length, commit, cds };
  };
  /* el sector confirma recibido: lo exportado queda "recibido" */
  X.confirmReceived = async (v, sec) => {
    for (const r of sec.sentR) { r.recibido = true; r.fechaRecibido = new Date().toISOString(); await db.put('records', r); }
    sec.sentF.forEach(f => { f.recibido = true; });
  };
  /* limpia del dispositivo solo lo que ya se confirmó recibido */
  X.clean = async (v, sec) => {
    for (const r of sec.gotR.concat(sec.sentR.filter(r => r.recibido))) await db.del('records', r.id);
    v.findings = v.findings.filter(f => !(sectorOfItem(v, f) === sec.id && f.recibido));
    v.people = v.people.filter(p => sectorOfItem(v, p) !== sec.id);
    v.pendings = v.pendings.filter(p => !(sectorOfItem(v, p) === sec.id && ['Cumplido', 'Cerrado'].includes(p.status)));
    const left = new Set((await db.byIndex('records', 'visitId', v.id)).map(r => r.Transformador));
    v.cds = v.cds.filter(c => (validArea(v, c.areaId) ? c.areaId : '') !== sec.id || left.has(c.code));
    if (!v.cds.some(c => c.id === v.activeCdId)) v.activeCdId = v.cds[0]?.id || null;
    await db.put('visits', v);
  };

  /* ---------- respaldos ---------- */
  X.backup = async (visitId) => {
    const visits = await db.all('visits'), records = await db.all('records');
    const vs = visitId ? visits.filter(v => v.id === visitId) : visits;
    const ids = new Set(vs.map(v => v.id));
    const out = { format: 'gs-diagnosticos', version: 1, exportedAt: new Date().toISOString(), visits: vs, records: visitId ? records.filter(r => ids.has(r.visitId)) : records, nits: visitId ? undefined : G.nits.profile(), settings: visitId ? undefined : G.settings.get() };
    return { blob: new Blob([JSON.stringify(out)], { type: 'application/json' }), name: visitId ? `Respaldo_GSD_${visitId}.json` : `Respaldo_GSD_TOTAL_${G.stamp()}.json` };
  };
  const blankVisit = (id, extra) => ({ id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), date: G.dateLocal(), start: G.timeLocal(), localidad: '', zona: '', status: 'En progreso', activeAreaId: null, activeCdId: null, areas: [], cds: [], territory: {}, territoryObs: '', management: { topics: [], obs: '', nextAction: '', meeting: 'No' }, findings: [], people: [], pendings: [], reportGenerated: false, ...extra });
  const cdOf = (code, kva) => ({ id: G.uid(), code, kva: kva || '', property: 'ENEL', mt: [], bt: [], equipment: [], networkState: [], poleType: [], poleState: [], transformerState: [], construction: [], coverage: [], obs: '', suggestedState: '', validatedState: '', createdAt: new Date().toISOString() });
  X.importFile = async file => {
    const j = JSON.parse(await file.text()); let msg = '';
    if (j.format === 'gs-diagnosticos') {
      for (const v of j.visits || []) await db.put('visits', v);
      for (const r of j.records || []) await db.put('records', r);
      if (j.nits && !Object.keys(G.nits.profile().kw).length) await G.nits.setProfile(j.nits);
      return `Respaldo importado: ${(j.visits || []).length} visita(s), ${(j.records || []).length} registro(s).`;
    }
    const dx = j.indexedDB && (j.indexedDB.gs_dx_db_v1 || Object.values(j.indexedDB).find(o => o && (o.estructuras || o.unc)));
    if (dx) { // respaldo total de GS DX
      const id = await db.nextVisitId(), v = blankVisit(id, { legacy: 'GS DX', note: 'Importado de GS DX' });
      const map = { estructuras: 'E', unc: 'U', clientes: 'C', susp: 'S', baldios: 'B' }; let n = 0, mx = {};
      const cds = new Map();
      for (const [store, t] of Object.entries(map)) for (const row of dx[store] || []) {
        const r = { ...row, id: G.uid(), type: t, visitId: id, createdAt: row.fechaISO || new Date().toISOString(), borrador: false, exportado: !!row.exportado, Localidad: row.Localidad || '', Barrio: '' };
        if (r.Transformador && !cds.has(r.Transformador)) cds.set(r.Transformador, cdOf(r.Transformador, row.Capacidad_kVA));
        mx[t] = Math.max(mx[t] || 0, +r.item || 0); await db.put('records', r); n++;
      }
      v.cds = [...cds.values()]; v.activeCdId = v.cds[0]?.id || null; await db.put('visits', v);
      for (const [t, m] of Object.entries(mx)) await db.bumpSeq(t, m);
      return `GS DX importado: ${n} registro(s) en una visita nueva (${v.cds.length} CD).`;
    }
    if (j.id && (j.areas || j.cds)) { // visita de GS Asistente
      const id = (await db.get('visits', j.id)) ? await db.nextVisitId() : j.id;
      const v = blankVisit(id, { ...j, id, legacy: 'GS Asistente', areas: (j.areas || []).map(a => ({ id: a.id, type: a.type || 'Barrio', name: a.name || '', sector: a.sector || '', localidad: '', lat: a.lat || '', lon: a.lng || '', gpsStatus: a.gpsStatus })), cds: (j.cds || []).map(c => ({ ...cdOf(c.code, c.kva), ...c, id: c.id || G.uid() })), localidad: '' });
      v.areas.forEach(a => { if (!a.localidad) a.localidad = ''; }); v.activeCdId = v.cds[0]?.id || null;
      await db.put('visits', v);
      return 'Visita del Asistente importada. Asigna la localidad de cada área para completar el informe.';
    }
    throw new Error('El archivo no parece un respaldo de GS Diagnósticos, GS DX o GS Asistente.');
  };

  /* ---------- calendario ---------- */
  X.ics = (visit, items) => {
    const ev = items.filter(p => p.date).map(p => `BEGIN:VEVENT\r\nUID:${p.id}@gsdiagnosticos\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, '')}\r\nDTSTART:${p.date.replaceAll('-', '')}T130000\r\nSUMMARY:${String(p.text).replace(/[,;\n]/g, ' ')}\r\nDESCRIPTION:Visita ${visit.id} · ${p.areaLabel || ''}\r\nBEGIN:VALARM\r\nTRIGGER:-PT60M\r\nACTION:DISPLAY\r\nDESCRIPTION:Recordatorio GS Diagnósticos\r\nEND:VALARM\r\nEND:VEVENT`).join('\r\n');
    return ev ? new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GS Diagnosticos//ES\r\n${ev}\r\nEND:VCALENDAR`], { type: 'text/calendar' }) : null;
  };
  G.exp = X; G.blankVisit = blankVisit; G.cdOf = cdOf;
})(window.GS);
