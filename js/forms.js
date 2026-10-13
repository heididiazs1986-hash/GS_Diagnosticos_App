/* forms.js · registros de campo de GS DX (Estructura, Cliente, UNC / Predio para suspensión, Baldío) con sus reglas */
(function (G) {
  const { $, $$, esc, icon, C, db, nits: N } = G;
  const R = {};
  R.TYPES = {
    E: { name: 'Estructura', plural: 'Estructuras', icon: 'pole', sheet: 'ESTRUCTURAS' },
    C: { name: 'Cliente', plural: 'Clientes', icon: 'gauge', sheet: 'CLIENTES' },
    U: { name: 'UNC', plural: 'UNC', icon: 'home', sheet: 'UNC' },
    S: { name: 'Predio para suspensión', plural: 'Suspensiones', icon: 'ban', sheet: 'SUSPENSIONES' },
    B: { name: 'Baldío', plural: 'Baldíos', icon: 'lot', sheet: 'BALDIOS' }
  };
  const MINF = 3, MAXF = 7;
  R.title = r => {
    const pf = r.PuntoFisico ? `PF ${r.PuntoFisico}` : 'Sin punto físico';
    return ({ E: `${r.PuntoFisico || 'Estructura sin PF'}`, C: `Serie ${r.SerieMedidor || '—'}`, U: `${r.Nombres || 'UNC sin nombre'}`, S: `${pf}`, B: `${pf}` })[r.type] || pf;
  };
  R.summary = r => ({
    E: [r.TipoNodo, r.MaterialNodo, r.CaracteristicasNodo, r.TipoRedBT && `Red ${r.TipoRedBT}`].filter(Boolean).join(' · '),
    C: [r.PuntoFisico && `PF ${r.PuntoFisico}`, r.MarcaMedidor, r.Fases, r.ReqInspeccion === 'Sí' && 'Requiere inspección'].filter(Boolean).join(' · '),
    U: [r.PuntoFisico && `PF ${r.PuntoFisico}`, r.Estado].filter(Boolean).join(' · '),
    S: r.Motivo || '', B: r.Estado || ''
  })[r.type] || '';

  R.forCd = async (cd, type) => (await db.all('records')).filter(r => r.Transformador === cd && (!type || r.type === type));
  const pfList = async cd => [...new Set((await R.forCd(cd, 'E')).filter(r => !r.borrador && r.PuntoFisico).map(r => r.PuntoFisico))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  async function nodeLen(d) {
    if (!d.Latitud || !d.Longitud || !d.PuntoFisico) return '';
    const e = (await R.forCd(d.Transformador, 'E')).find(r => r.PuntoFisico === d.PuntoFisico && r.Latitud && r.Longitud && r.id !== d.id);
    if (!e) return '';
    return String(Math.round(G.haversine(+e.Latitud, +e.Longitud, +d.Latitud, +d.Longitud) * 10) / 10);
  }

  /* ---- validación (reglas de GS DX) ---- */
  R.validate = async (d, { skipPhotos } = {}) => {
    const er = [], need = (k, label) => { if (!String(d[k] ?? '').trim()) er.push({ k, label, msg: 'Falta ' + label.toLowerCase() }); };
    const t = d.type;
    if (!d.Transformador) er.push({ k: 'cd', label: 'CD', msg: 'No hay CD activo' });
    if (t === 'E') { need('TipoNodo', 'Tipo de nodo'); need('MaterialNodo', 'Material'); need('CaracteristicasNodo', 'Características'); need('PuntoFisico', 'Punto físico'); need('TipoRedBT', 'Tipo de red BT'); }
    if (t === 'U') { ['PuntoFisico:Punto físico', 'Nombres:Nombres', 'Identificacion:Identificación', 'Contacto:Contacto', 'Localidad:Localidad', 'Barrio:Barrio', 'Direccion:Dirección', 'TipoZona:Tipo de zona', 'TipoMaterial:Tipo de material', 'Estado:Estado', 'DocPropiedad:Documento de propiedad'].forEach(x => need(...x.split(':'))); }
    if (t === 'C') { ['PuntoFisico:Punto físico', 'SerieMedidor:Serie del medidor', 'MarcaMedidor:Marca', 'Fases:Fases', 'EstadoMedidor:Estado del medidor'].forEach(x => need(...x.split(':'))); }
    if (t === 'S') { need('PuntoFisico', 'Punto físico'); need('Motivo', 'Motivo'); }
    if (t === 'B') { need('PuntoFisico', 'Punto físico'); need('Estado', 'Estado'); }
    if (!d.Latitud || !d.Longitud) er.push({ k: 'gps', label: 'Coordenadas', msg: 'Faltan coordenadas GPS' });
    if (!skipPhotos) { const n = (d.Fotos || []).length; if (n < MINF) er.push({ k: 'fotos', label: 'Fotos', msg: `Mínimo ${MINF} fotos (hay ${n})` }); }
    /* duplicados */
    const all = await db.all('records');
    if (t === 'C' && d.SerieMedidor) { const x = all.find(r => r.type === 'C' && r.id !== d.id && r.SerieMedidor === d.SerieMedidor); if (x) er.push({ k: 'SerieMedidor', label: 'Serie', msg: `La serie ${d.SerieMedidor} ya existe (CD ${x.Transformador}, ítem ${x.item ?? 'borrador'})` }); }
    if (t === 'E' && d.PuntoFisico) { const x = all.find(r => r.type === 'E' && r.id !== d.id && r.Transformador === d.Transformador && r.PuntoFisico === d.PuntoFisico); if (x) er.push({ k: 'PuntoFisico', label: 'Punto físico', msg: `Ya existe una estructura ${d.PuntoFisico} en el CD ${d.Transformador}` }); }
    return er;
  };

  R.save = async (d, { draft = false } = {}) => {
    const rec = { ...d }; delete rec._obsAuto; delete rec._obsTouched;
    rec.PuntoFisico = G.upperAlnum(rec.PuntoFisico || '');
    if (rec.Nombres) rec.Nombres = G.upperAlnum(rec.Nombres);
    if (rec.Direccion) rec.Direccion = G.upperText(rec.Direccion);
    if (rec.Barrio) rec.Barrio = G.upperText(rec.Barrio);
    if (rec.Observaciones) rec.Observaciones = G.upperAlnum(rec.Observaciones);
    rec.borrador = !!draft;
    if (!draft && !rec.item) rec.item = await db.seq(rec.type === 'S' ? 'S' : rec.type);
    rec.updatedAt = new Date().toISOString();
    await db.put('records', rec);
    if (rec.Barrio) N.learnBarrio(rec.Localidad || '', rec.Barrio);
    N.learnPhrases(rec.Observaciones || '');
    return rec;
  };

  /* ---- formulario ---- */
  R.open = function (type, existing, ctx) {
    return new Promise(async resolve => {
      const cd = ctx.cd; if (!cd && !existing) { G.toast('Primero crea o elige el CD'); return resolve(null); }
      const area = ctx.area || {}, v = ctx.visit || {};
      const last = (await R.forCd(existing ? existing.Transformador : cd.code, type === 'S' ? 'S' : type)).filter(r => !r.borrador).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
      let d = existing ? JSON.parse(JSON.stringify(existing)) : {
        id: G.uid(), type, visitId: v.id, areaId: area.id || '', createdAt: new Date().toISOString(), fechaISO: new Date().toISOString(),
        Transformador: cd.code, Capacidad_kVA: cd.kva || '', Localidad: area.localidad || v.localidad || '', Barrio: area.name || '', TipoZona: v.zona || '',
        Fotos: [], Observaciones: '', exportado: false, Exportado: 'No'
      };
      if (!existing && last) { // repetir lo último que ya llenaste
        if (type === 'E') ['TipoNodo', 'MaterialNodo', 'CaracteristicasNodo', 'TipoRedBT'].forEach(k => d[k] = last[k] || '');
        if (type === 'C') ['MarcaMedidor', 'Fases'].forEach(k => d[k] = last[k] || '');
        if (type === 'U') ['TipoZona', 'TipoMaterial', 'Direccion'].forEach(k => { if (last[k] && k !== 'Direccion') d[k] = last[k]; });
      }
      if (type === 'E' && !existing) d.Luminarias = '0';
      if (d.type === 'U') { C.UNC_DOCS.concat(C.UNC_REQ).forEach(x => d[x[0]] = d[x[0]] || 'No'); }
      d._obsTouched = !!existing && !!existing.Observaciones;
      const original = JSON.stringify(d); let pfs = await pfList(d.Transformador); let lenManual = !!existing && !!existing.LongitudNodo; let saved = false;
      const kind = () => d.type;

      /* piezas de UI */
      const fld = (k, label, inner, { req, hint } = {}) => `<div class="field" data-k="${k}"><label class="l">${label}${req ? ' <span class="req">*</span>' : ''}</label>${inner}<div class="hint">${hint || ''}</div></div>`;
      const sel = (k, label, opts, o = {}) => fld(k, label, `<select data-f="${k}"><option value="">Selecciona…</option>${opts.map(x => `<option ${d[k] === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`, o);
      const txt = (k, label, o = {}) => fld(k, label, `<input data-f="${k}" value="${esc(d[k] || '')}" ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.up ? 'autocapitalize="characters"' : ''} autocomplete="off" placeholder="${esc(o.ph || '')}">`, o);
      const chk = (k, label, extra = '') => `<label class="chk"><input type="checkbox" data-c="${k}" ${d[k] === 'Sí' ? 'checked' : ''}> <span>${label}</span></label>`;
      const pfField = () => {
        if (kind() === 'E') return txt('PuntoFisico', 'Punto físico (nodo)', { req: true, up: true, ph: 'Ej.: 123456 o P-12' });
        if (d.__newPf || !pfs.length) return fld('PuntoFisico', 'Punto físico', `<input data-f="PuntoFisico" value="${esc(d.PuntoFisico || '')}" autocapitalize="characters" placeholder="Escribe el punto físico">`, { req: true, hint: pfs.length ? '<a href="#" data-pfback>Elegir de las estructuras del CD</a>' : 'Este CD aún no tiene estructuras: se guardará el texto, sin calcular la longitud al nodo.' });
        return fld('PuntoFisico', 'Punto físico (de las estructuras del CD)', `<select data-f="PuntoFisico"><option value="">Selecciona…</option>${pfs.map(x => `<option ${d.PuntoFisico === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}<option value="__new">＋ Otro punto físico…</option></select>`, { req: true });
      };
      const gpsHtml = () => {
        const has = d.Latitud && d.Longitud, a = +d.Precision || 0, cls = !has ? '' : a <= 15 ? 'ok' : 'mid';
        return `<div class="gps ${G_wait ? 'wait' : cls}" id="gpsBox"><span class="dot"></span><div class="grow"><b>${has ? `${d.Latitud}, ${d.Longitud}` : G_wait ? 'Buscando señal…' : 'Sin coordenadas'}</b><small>${G_wait ? G_msg : has ? `Precisión ±${d.Precision} m · ${G.fmtTimeISO(d.gpsISO)}` : 'Se captura sola al abrir; toca para reintentar'}</small></div><button type="button" class="btn sm" id="gpsBtn">${icon('pin')} ${has ? 'Mejorar' : 'Capturar'}</button></div>`;
      };
      let G_wait = false, G_msg = '';
      const photosHtml = () => `<div class="photos">${(d.Fotos || []).map((p, i) => `<div class="ph"><img src="${p.dataURL}" alt="Foto ${i + 1}"><button class="ed" data-pe="${i}" aria-label="Marcar">${icon('pencil')}</button><button data-pr="${i}" aria-label="Quitar">${icon('x')}</button></div>`).join('')}${(d.Fotos || []).length < MAXF ? `<button type="button" class="addph" data-pa>${icon('camera')}</button>` : ''}</div>`;

      const body = () => {
        const t = kind(); let h = '';
        if (t === 'U' || t === 'S') h += `<div class="seg" id="claseSeg"><button type="button" data-cl="U" class="${t === 'U' ? 'on' : ''}">UNC</button><button type="button" data-cl="S" class="${t === 'S' ? 'on' : ''}">Predio para suspensión</button></div>`;
        h += `<div class="row wrap"><span class="chip p">${icon('zap')} CD ${esc(d.Transformador)}${d.Capacidad_kVA ? ' · ' + esc(d.Capacidad_kVA) + ' kVA' : ''}</span><span class="chip t">${icon('pin')} ${esc([d.Localidad, d.Barrio].filter(Boolean).join(' · ') || 'Sin área')}</span></div>`;
        h += '<div class="stack">';
        if (t === 'E') {
          h += `<div class="g2">${sel('TipoNodo', 'Tipo de nodo', C.TIPO_NODO, { req: 1 })}${sel('MaterialNodo', 'Material', C.MATERIAL, { req: 1 })}</div>`;
          h += sel('CaracteristicasNodo', 'Características', C.CARACT[(d.TipoNodo || '') + '|' + (d.MaterialNodo || '')] || [], { req: 1, hint: d.TipoNodo && d.MaterialNodo ? '' : 'Elige tipo y material primero' });
          h += pfField();
          h += `<div class="g2">${sel('TipoRedBT', 'Tipo de red BT', C.TIPO_RED_BT, { req: 1 })}${txt('Luminarias', 'Luminarias (AP)', { mode: 'numeric' })}</div>`;
        }
        if (t === 'C') {
          h += pfField() + txt('SerieMedidor', 'Serie del medidor', { req: 1, mode: 'numeric' });
          h += `<div class="g2">${sel('MarcaMedidor', 'Marca', C.MARCAS, { req: 1 })}${sel('Fases', 'No. de fases', C.FASES, { req: 1 })}</div>`;
          const es = (d.EstadoMedidor || '').split('; ').filter(Boolean);
          h += `<div class="field" data-k="EstadoMedidor"><label class="l">Estado del medidor <span class="req">*</span></label><div class="checks">${C.MEDIDOR_ESTADOS.map(x => `<label class="chk"><input type="checkbox" data-em="${esc(x)}" ${es.includes(x) ? 'checked' : ''}> <span>${esc(x)}</span></label>`).join('')}</div><div class="hint"></div></div>`;
          h += `<div class="row"><span class="chip ${d.ReqInspeccion === 'Sí' ? 'warn' : 'ok'}">${d.ReqInspeccion === 'Sí' ? 'Requiere inspección / cambio' : 'No requiere inspección'}</span></div>`;
        }
        if (t === 'U') {
          h += pfField() + txt('Nombres', 'Nombres', { req: 1, up: 1 });
          h += `<div class="g2">${txt('Identificacion', 'Identificación', { req: 1, mode: 'numeric' })}${txt('Contacto', 'Contacto', { req: 1, mode: 'tel' })}</div>`;
          h += `<div class="g2">${sel('Localidad', 'Localidad', C.LOCALIDADES, { req: 1 })}${fld('Barrio', 'Barrio', `<input data-f="Barrio" list="dlBarrios" value="${esc(d.Barrio || '')}" autocomplete="off" placeholder="Escribe el barrio"><datalist id="dlBarrios">${N.barrios(d.Localidad || '').map(b => `<option value="${esc(b)}">`).join('')}</datalist>`, { req: 1 })}</div>`;
          h += txt('Direccion', 'Dirección', { req: 1, up: 1, ph: 'Ej.: KR 12 # 34-56 SUR' });
          h += `<div class="g2">${sel('TipoZona', 'Tipo de zona', C.TIPO_ZONA, { req: 1 })}${sel('TipoMaterial', 'Tipo de material', C.TIPO_MATERIAL, { req: 1 })}</div>`;
          h += sel('TipoPoblacion', 'Tipo de población', C.TIPO_POBLACION);
          h += sel('Estado', 'Estado', C.UNC_ESTADO, { req: 1 }) + sel('DocPropiedad', 'Documento de propiedad', C.DOC_PROP, { req: 1 });
          h += `<div class="cg"><h4>Predio</h4><div class="checks">${`<label class="chk"><input type="checkbox" data-hab ${d.Habitable ? 'checked' : ''}> <span>Predio habitable</span></label>`}</div></div>`;
          h += `<div class="cg"><h4>Documentos</h4><div class="checks c2">${C.UNC_DOCS.map(x => chk(x[0], x[1])).join('')}</div></div>`;
          h += `<div class="cg"><h4>Según la norma técnica requiere</h4><div class="checks c2">${C.UNC_REQ.map(x => chk(x[0], x[1])).join('')}</div></div>`;
        }
        if (t === 'S') h += pfField() + sel('Motivo', 'Motivo de suspensión', C.SUSP_MOTIVO, { req: 1 });
        if (t === 'B') h += pfField() + sel('Estado', 'Estado del predio', C.BALDIO_ESTADO, { req: 1 });
        h += '</div>';
        h += `<div class="cg"><h4>Ubicación</h4><div class="stack" id="gpsWrap">${gpsHtml()}</div></div>`;
        if (t !== 'E') h += fld('LongitudNodo', 'Longitud al nodo (m)', `<input data-f="LongitudNodo" inputmode="decimal" value="${esc(d.LongitudNodo || '')}" placeholder="Se calcula con el GPS y el punto físico">`, { hint: 'Distancia a la estructura del punto físico. Puedes corregirla a mano.' });
        h += `<div class="field" data-k="fotos"><label class="l">Fotos <span class="req">*</span> <span class="muted">(mín. ${MINF}, máx. ${MAXF})</span></label><div id="phWrap">${photosHtml()}</div><div class="hint"></div></div>`;
        h += `<div class="field" data-k="Observaciones"><label class="l">Observaciones</label>${G.dictField('obsTa', d.Observaciones || '', 'Opcional')}<div class="sugs" id="obsSugs"></div><div class="row wrap" style="margin-top:6px"><button type="button" class="btn sm" id="obsAuto">${icon('spark')} Redactar con NITS</button></div></div>`;
        h += `<div id="errBox"></div>`;
        return h;
      };
      const foot = `<button class="btn" data-cancel>Cancelar</button><button class="btn primary" data-save>${existing && !existing.borrador ? 'Guardar cambios' : 'Guardar registro'}</button>`;

      const dirty = () => JSON.stringify(d) !== original;
      const sh = G.sheet({
        title: existing ? `Editar ${R.TYPES[d.type].name.toLowerCase()}` : `Nuevo · ${R.TYPES[d.type].name}`, body: body(), footer: foot,
        beforeClose: async () => {
          if (saved || !dirty()) return true;
          const c = await G.choose('Tienes cambios sin guardar', [{ label: 'Guardar como borrador', sub: 'Lo completas después; no se exporta hasta terminarlo', value: 'draft', icon: 'file', primary: true }, { label: 'Descartar', value: 'drop', icon: 'trash' }, { label: 'Seguir editando', value: 'stay', icon: 'pencil' }]);
          if (c === 'draft') { await doSave(true); return true; } return c === 'drop';
        },
        onClose: () => { if (!saved) resolve(null); }
      });
      const root = sh.el;

      /* helpers de refresco */
      const rerender = () => { const sc = sh.body.scrollTop; sh.body.innerHTML = body(); G.hydrate(sh.el); wireStatic(); sh.body.scrollTop = sc; refreshObs(); suggest(); };
      const refreshObs = () => {
        if (kind() === 'E' && !d._obsAuto) return;
        const ta = $('#obsTa', root); if (!ta || d._obsTouched) return;
        d.Observaciones = N.obsFor(kind(), d); d._obsAuto = d.Observaciones; ta.value = d.Observaciones;
      };
      const suggest = () => {
        const ta = $('#obsTa', root), box = $('#obsSugs', root); if (!ta || !box) return;
        const s = N.suggest(ta.value); box.innerHTML = s.map((x, i) => `<button type="button" data-sg="${i}">+ ${esc(x.full)}</button>`).join('');
        $$('[data-sg]', box).forEach(b => b.onclick = () => { const it = s[+b.dataset.sg]; ta.value = (ta.value.replace(/\s*$/, ' ') + it.full).replace(/\s+/g, ' ') + ' '; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus(); });
      };
      const recalcLen = async () => { if (kind() === 'E' || lenManual) return; const l = await nodeLen(d); d.LongitudNodo = l; const el = $('[data-f="LongitudNodo"]', root); if (el) el.value = l; refreshObs(); };
      const setGps = () => { $('#gpsWrap', root).innerHTML = gpsHtml(); wireGps(); };
      const captureGps = async () => {
        G_wait = true; G_msg = 'Mejorando precisión…'; setGps();
        try {
          const r = await G.gps({ onProgress: b => { G_msg = `Mejor precisión hasta ahora: ±${b.acc} m`; const s = $('#gpsBox small', root); if (s) s.textContent = G_msg; } });
          if (!d.Precision || r.acc <= +d.Precision || !d.Latitud || !d.gpsISO) { d.Latitud = String(r.lat); d.Longitud = String(r.lon); d.Precision = String(r.acc); d.gpsISO = r.ts; }
        } catch (e) { G.toast(e.message); }
        G_wait = false; setGps(); await recalcLen();
      };
      const wireGps = () => { const b = $('#gpsBtn', root); if (b) b.onclick = captureGps; };

      /* eventos */
      const setVal = (k, val) => { d[k] = val; };
      const onField = e => {
        const el = e.target.closest('[data-f]'); if (!el) return;
        const k = el.dataset.f; let val = el.value;
        if (el.tagName === 'SELECT') {
          if (k === 'PuntoFisico' && val === '__new') { d.__newPf = true; d.PuntoFisico = ''; return rerender(); }
          setVal(k, val);
          if (k === 'TipoNodo' || k === 'MaterialNodo') { const ok = (C.CARACT[(d.TipoNodo || '') + '|' + (d.MaterialNodo || '')] || []); if (!ok.includes(d.CaracteristicasNodo)) d.CaracteristicasNodo = ''; }
          if (k === 'Localidad') { /* sugerencias de barrio */ }
          if (k === 'PuntoFisico') { lenManual = false; recalcLen(); }
          rerender(); return;
        }
        if (k === 'LongitudNodo') { lenManual = true; setVal(k, val.replace(',', '.').replace(/[^\d.]/g, '')); return; }
        if (k === 'Identificacion' || k === 'Contacto' || k === 'SerieMedidor' || k === 'Luminarias') val = G.onlyDigits(val);
        setVal(k, val); if (val !== el.value) el.value = val;
        if (k === 'PuntoFisico') { lenManual = false; recalcLen(); }
        refreshObs();
      };
      root.addEventListener('input', e => {
        if (e.target.id === 'obsTa') { d.Observaciones = e.target.value; d._obsTouched = true; suggest(); return; }
        onField(e);
      });
      root.addEventListener('change', e => { if (e.target.tagName === 'SELECT') onField(e); });
      root.addEventListener('focusout', e => {
        const el = e.target.closest?.('[data-f]'); if (!el || el.tagName === 'SELECT') return;
        const k = el.dataset.f; let v = el.value;
        if (k === 'PuntoFisico' || k === 'Nombres') v = G.upperAlnum(v); if (k === 'Direccion' || k === 'Barrio') v = G.upperText(v);
        if (v !== el.value) { el.value = v; d[k] = v; refreshObs(); }
      });
      root.addEventListener('click', async e => {
        const t = e.target;
        const cl = t.closest('[data-cl]'); if (cl) { const nt = cl.dataset.cl; if (nt !== d.type) { d.type = nt; if (nt === 'U') C.UNC_DOCS.concat(C.UNC_REQ).forEach(x => d[x[0]] = d[x[0]] || 'No'); d._obsTouched = false; sh.setTitle('Nuevo · ' + R.TYPES[nt].name); rerender(); } return; }
        if (t.closest('[data-pfback]')) { e.preventDefault(); d.__newPf = false; d.PuntoFisico = ''; return rerender(); }
        if (t.closest('#obsAuto')) { d._obsTouched = false; d._obsAuto = ''; kind() === 'E' ? (d._obsAuto = 'x') : 0; refreshObs(); suggest(); return; }
        const pa = t.closest('[data-pa]'); if (pa) return pickPhoto();
        const pr = t.closest('[data-pr]'); if (pr) { d.Fotos.splice(+pr.dataset.pr, 1); $('#phWrap', root).innerHTML = photosHtml(); G.hydrate(root); return; }
        const pe = t.closest('[data-pe]'); if (pe) { const ph = d.Fotos[+pe.dataset.pe]; const r = await G.editPhoto(ph); if (r) { $('#phWrap', root).innerHTML = photosHtml(); G.hydrate(root); } return; }
        if (t.closest('[data-cancel]')) return sh.close();
        if (t.closest('[data-save]')) return doSave(false);
      });
      root.addEventListener('change', e => {
        const t = e.target;
        if (t.dataset.c) { d[t.dataset.c] = t.checked ? 'Sí' : 'No'; if (t.dataset.c === 'ECPart' && t.checked) d.ECInmel = 'No'; if (t.dataset.c === 'ECInmel' && t.checked) d.ECPart = 'No'; rerender(); }
        else if (t.dataset.hab !== undefined) { d.Habitable = t.checked; refreshObs(); }
        else if (t.dataset.em !== undefined) {
          let es = (d.EstadoMedidor || '').split('; ').filter(Boolean); const v = t.dataset.em;
          if (t.checked) { es = v === C.MEDIDOR_BUENO ? [v] : [...es.filter(x => x !== C.MEDIDOR_BUENO), v]; } else es = es.filter(x => x !== v);
          d.EstadoMedidor = es.join('; '); d.ReqInspeccion = es.length && es.some(x => x !== C.MEDIDOR_BUENO) ? 'Sí' : 'No'; rerender();
        }
      });
      /* fotos */
      function pickPhoto() {
        const left = MAXF - (d.Fotos || []).length; if (left <= 0) return;
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.setAttribute('capture', 'environment');
        inp.onchange = async () => { const files = [...inp.files].slice(0, left); for (const f of files) { try { d.Fotos.push(await G.compress(f)); } catch { G.toast('No se pudo leer una foto'); } } $('#phWrap', root).innerHTML = photosHtml(); G.hydrate(root); };
        inp.click();
      }
      function wireStatic() { wireGps(); }
      wireStatic();

      const showErrors = errs => {
        $$('.field.err', root).forEach(f => { f.classList.remove('err'); const h = $('.hint', f); if (h && h.dataset.err) { h.textContent = ''; delete h.dataset.err; } });
        errs.forEach(x => { const f = $(`.field[data-k="${x.k}"]`, root) || (x.k === 'gps' ? $('#gpsWrap', root) : null); if (f) { f.classList.add('err'); const h = $('.hint', f); if (h) { h.textContent = x.msg; h.dataset.err = 1; } } });
        const eb = $('#errBox', root);
        eb.innerHTML = errs.length ? `<div class="card flat" style="border-color:var(--bad)"><b style="color:var(--bad)">Falta para completar el registro</b><ul style="margin:4px 0 0;padding-left:18px">${errs.map(x => `<li>${esc(x.msg)}</li>`).join('')}</ul></div>` : '';
        const first = $('.field.err', root); if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      };
      async function doSave(asDraft) {
        d.PuntoFisico = G.upperAlnum(d.PuntoFisico || '');
        if (!asDraft) {
          const errs = await R.validate(d); showErrors(errs);
          if (errs.length) {
            const c = await G.choose('Aún hay datos pendientes', [{ label: 'Guardar como borrador', sub: 'Sigue luego; no se exportará hasta completarlo', value: 'draft', icon: 'file', primary: true }, { label: 'Completar ahora', value: 'stay', icon: 'pencil' }]);
            if (c !== 'draft') return false; asDraft = true;
          }
        }
        if (!d.Observaciones && kind() !== 'E') { d._obsTouched = false; refreshObs(); }
        if (d._obsAuto && d._obsAuto !== 'x' && d.Observaciones !== d._obsAuto) N.learnText('obs-' + d.type, d._obsAuto, d.Observaciones);
        const rec = await R.save(d, { draft: asDraft });
        saved = true; sh.close(true); G.toast(asDraft ? 'Guardado como borrador' : `${R.TYPES[rec.type].name} guardado · ítem ${rec.item}`); resolve(rec); return true;
      }
      /* arranque: GPS automático en registros nuevos y observación inicial */
      refreshObs(); suggest();
      if (!existing) captureGps();
      else if (existing && !existing.Latitud) captureGps();
    });
  };
  G.rec = R;
})(window.GS);
