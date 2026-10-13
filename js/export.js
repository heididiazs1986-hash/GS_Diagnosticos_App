/* export.js · Excel (SpreadsheetML .xls) + ZIP de fotos con el mismo formato de GS DX; respaldos e importación */
(function (G) {
  const { esc, db, rec: R } = G;
  const X = {};
  const H = {
    E: ['Ítem', 'Transformador (CD)', 'Capacidad CD (kVA)', 'Tipo Nodo', 'Material Nodo', 'Características Nodo', 'Punto Físico', 'Tipo de Redes BT', 'Luminarias (AP)', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones'],
    U: ['Ítem', 'Transformador (CD)', 'Punto Físico', 'Longitud al nodo (m)', 'Nombres', 'Identificación', 'Contacto', 'Sede', 'Municipio', 'Dirección', 'Localidad', 'Tipo Zona', 'Tipo material', 'Tipo de población', 'Para servicio requiere ampliación de redes', 'Documento de propiedad', 'Formato E1', 'AR', 'DJ', 'E6', 'EC Particular', 'Doc. electricista', 'RETIE', 'EC Inmel', 'Estado', '¿Requiere muro?', '¿Requiere uso de arriostre?', 'Acometida', 'Ducto 1" Galv.', 'Celda', 'Interruptor', 'SPT (Tierra)', 'Instalación interna', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones'],
    C: ['Ítem', 'Transformador (CD)', 'Punto Físico', 'Longitud al nodo (m)', 'Serie de medidor', 'Marca de medidor', 'No. Fases', 'Estado de medidor', '¿Requiere inspección/Cambio?', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones'],
    S: ['Ítem', 'Transformador (CD)', 'Punto Físico', 'Longitud al nodo (m)', 'Motivo de suspensión', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones'],
    B: ['Ítem', 'Transformador (CD)', 'Punto Físico', 'Longitud al nodo (m)', 'Estado', 'Latitud (Y)', 'Longitud (X)', 'Precisión (m)', 'FECHA_HORA', 'GPS_HORA', 'Observaciones']
  };
  const tail = x => ({ 'Latitud (Y)': x.Latitud, 'Longitud (X)': x.Longitud, 'Precisión (m)': x.Precision || '', FECHA_HORA: x.fechaISO || '', GPS_HORA: x.gpsISO || '', Observaciones: x.Observaciones || '' });
  const loc = x => { const s = G.settings.get(); const l = String(x.Localidad || '').toUpperCase(), b = String(x.Barrio || '').toUpperCase(); return s.locFmt === 'solo' ? l : [l, b].filter(Boolean).join(' - '); };
  const ROW = {
    E: x => ({ 'Ítem': x.item, 'Transformador (CD)': x.Transformador, 'Capacidad CD (kVA)': x.Capacidad_kVA || '', 'Tipo Nodo': x.TipoNodo, 'Material Nodo': x.MaterialNodo, 'Características Nodo': x.CaracteristicasNodo, 'Punto Físico': x.PuntoFisico, 'Tipo de Redes BT': x.TipoRedBT, 'Luminarias (AP)': x.Luminarias, ...tail(x) }),
    U: x => { const s = G.settings.get(); return { 'Ítem': x.item, 'Transformador (CD)': x.Transformador, 'Punto Físico': x.PuntoFisico || '', 'Longitud al nodo (m)': x.LongitudNodo || '', Nombres: x.Nombres, 'Identificación': x.Identificacion, Contacto: x.Contacto, Sede: s.sede, Municipio: s.municipio, 'Dirección': x.Direccion, Localidad: loc(x), 'Tipo Zona': x.TipoZona, 'Tipo material': x.TipoMaterial, 'Tipo de población': x.TipoPoblacion || '', 'Para servicio requiere ampliación de redes': x.AmpliacionRedes, 'Documento de propiedad': x.DocPropiedad, 'Formato E1': x.E1, AR: x.AR, DJ: x.DJ, E6: x.E6, 'EC Particular': x.ECPart, 'Doc. electricista': x.DocElectricista, RETIE: x.RETIE, 'EC Inmel': x.ECInmel, Estado: x.Estado, '¿Requiere muro?': x.RequiereMuro, '¿Requiere uso de arriostre?': x.RequiereArriostre, Acometida: x.Acometida, 'Ducto 1" Galv.': x.Ducto, Celda: x.Celda, Interruptor: x.Interruptor, 'SPT (Tierra)': x.SPT, 'Instalación interna': x.InstalacionInterna, ...tail(x) }; },
    C: x => ({ 'Ítem': x.item, 'Transformador (CD)': x.Transformador, 'Punto Físico': x.PuntoFisico || '', 'Longitud al nodo (m)': x.LongitudNodo || '', 'Serie de medidor': x.SerieMedidor, 'Marca de medidor': x.MarcaMedidor, 'No. Fases': x.Fases, 'Estado de medidor': x.EstadoMedidor, '¿Requiere inspección/Cambio?': x.ReqInspeccion, ...tail(x) }),
    S: x => ({ 'Ítem': x.item, 'Transformador (CD)': x.Transformador, 'Punto Físico': x.PuntoFisico || '', 'Longitud al nodo (m)': x.LongitudNodo || '', 'Motivo de suspensión': x.Motivo, ...tail(x) }),
    B: x => ({ 'Ítem': x.item, 'Transformador (CD)': x.Transformador, 'Punto Físico': x.PuntoFisico || '', 'Longitud al nodo (m)': x.LongitudNodo || '', Estado: x.Estado, ...tail(x) })
  };
  const ex = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const cell = v => `<Cell><Data ss:Type="String">${ex(v)}</Data></Cell>`;
  const sheet = (name, hs, rows) => `<Worksheet ss:Name="${ex(name)}"><Table><Row>${hs.map(cell).join('')}</Row>${rows.map(r => '<Row>' + hs.map(h => cell(r[h] ?? '')).join('') + '</Row>').join('')}</Table></Worksheet>`;
  X.buildXls = by => new TextEncoder().encode(`<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">\n${['E', 'U', 'C', 'S', 'B'].map(t => sheet(R.TYPES[t].sheet, H[t], (by[t] || []).map(ROW[t]))).join('\n')}\n</Workbook>`);

  const sn = G.safeName;
  const folder = r => ({ E: `${r.Transformador}_${r.PuntoFisico}`, U: `${r.Transformador}_${r.PuntoFisico}_${r.Identificacion || ''}`, C: `${r.Transformador}_${r.SerieMedidor}`, S: `${r.Transformador}_${r.PuntoFisico}`, B: `${r.Transformador}_${r.PuntoFisico}_BALDIO_${r.item}` })[r.type];
  const GROUP = { E: 'ESTRUCTURAS', U: 'UNC', C: 'CLIENTES', S: 'SUSPENSIONES', B: 'BALDIOS' };

  /* pendientes / histórico de un CD (los borradores nunca salen) */
  X.collect = async (cd, mode) => {
    const all = (await R.forCd(cd)).filter(r => !r.borrador);
    const set = mode === 'pend' ? all.filter(r => !r.exportado) : all;
    const by = { E: [], U: [], C: [], S: [], B: [] };
    set.sort((a, b) => (a.item || 0) - (b.item || 0)).forEach(r => by[r.type]?.push(r));
    return { by, set, drafts: (await R.forCd(cd)).filter(r => r.borrador).length };
  };
  X.build = async (cd, mode, { mark = true } = {}) => {
    const { by, set } = await X.collect(cd, mode);
    if (!set.length) return null;
    const now = new Date(), st = G.stamp(now);
    const files = [{ name: `GS_Diagnostico_${cd}_${mode === 'pend' ? 'PENDIENTE' : 'HISTORICO'}_${st}.xls`, data: X.buildXls(by) }];
    const used = new Set();
    for (const t of ['E', 'U', 'C', 'S', 'B']) for (const r of by[t]) {
      let f = sn(folder(r)) || `${t}_${r.item}`; const key = GROUP[t] + '/' + f; if (used.has(key)) f += '_' + r.item; used.add(GROUP[t] + '/' + f);
      (r.Fotos || []).forEach((p, i) => files.push({ name: `FOTOS/${GROUP[t]}/${f}/foto_${i + 1}.jpg`, data: G.dataURLtoU8(p.dataURL) }));
    }
    const blob = G.makeZip(files), name = `GS_Diagnostico_${cd}_${mode === 'pend' ? 'PENDIENTE' : 'HISTORICO'}_${st}.zip`;
    const counts = Object.fromEntries(['E', 'U', 'C', 'S', 'B'].map(t => [t, by[t].length]));
    const commit = async () => { if (mode !== 'pend') return; for (const r of set) { r.exportado = true; r.Exportado = 'Sí'; r.exportBatch = st; r.fechaExportacion = now.toISOString(); await db.put('records', r); } };
    if (mark) await commit();
    return { blob, name, counts, total: set.length, commit };
  };
  X.pendingByCd = async () => { const m = {}; (await db.all('records')).filter(r => !r.borrador && !r.exportado).forEach(r => m[r.Transformador] = (m[r.Transformador] || 0) + 1); return m; };

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
