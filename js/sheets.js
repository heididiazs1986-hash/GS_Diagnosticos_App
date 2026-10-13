/* sheets.js · hojas de captura del Recorrido: visita, área, CD, hallazgo, persona, pendiente */
(function (G) {
  const { $, $$, esc, icon, C, db, nits: N } = G;
  const A = () => G.app;
  const SH = {};
  const areaLabel = a => a ? `${a.type || 'Área'} ${a.name || 'sin nombre'}${a.localidad ? ' · ' + a.localidad : ''}` : 'Sin área';
  G.areaLabel = areaLabel;
  const opt = (list, cur, ph) => (ph ? `<option value="">${ph}</option>` : '') + list.map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const field = (label, inner, req) => `<div class="field"><label class="l">${label}${req ? ' <span class="req">*</span>' : ''}</label>${inner}</div>`;
  const cg = (key, title, items, sel) => `<div class="cg"><h4>${esc(title)}</h4><div class="checks c2">${items.map(x => `<label class="chk"><input type="checkbox" data-g="${key}" value="${esc(x)}" ${sel?.includes(x) ? 'checked' : ''}> <span>${esc(x)}</span></label>`).join('')}</div></div>`;
  const grab = (root, key) => $$(`[data-g="${key}"]:checked`, root).map(x => x.value);

  /* ---------- nueva visita ---------- */
  SH.newVisit = () => {
    let loc = '';
    const s = G.sheet({
      title: 'Nueva visita', body: `${field('Localidad', `<select id="nvLoc">${opt(C.LOCALIDADES, '', 'Selecciona…')}</select>`, 1)}
      ${field('Barrio donde empiezas', `<input id="nvBar" list="nvDl" autocomplete="off" placeholder="Escribe el barrio"><datalist id="nvDl"></datalist>`, 1)}
      ${field('Zona', `<div class="seg" id="nvZ"><button type="button" data-z="Urbana" class="on">Urbana</button><button type="button" data-z="Rural">Rural</button></div>`)}
      <p class="muted small" style="margin:0">Podrás agregar más barrios o sectores sobre la marcha y crear los CD que vayas encontrando.</p>`,
      footer: `<button class="btn" data-x2>Cancelar</button><button class="btn primary" id="nvOk">Empezar recorrido</button>`
    });
    let zona = 'Urbana';
    $('#nvLoc', s.el).onchange = e => { loc = e.target.value; $('#nvDl', s.el).innerHTML = N.barrios(loc).map(b => `<option value="${esc(b)}">`).join(''); if (loc === 'Sumapaz') { zona = 'Rural'; $$('#nvZ button', s.el).forEach(b => b.classList.toggle('on', b.dataset.z === 'Rural')); } };
    $$('#nvZ button', s.el).forEach(b => b.onclick = () => { zona = b.dataset.z; $$('#nvZ button', s.el).forEach(x => x.classList.toggle('on', x === b)); });
    $('[data-x2]', s.el).onclick = () => s.close();
    $('#nvOk', s.el).onclick = async () => {
      const bar = $('#nvBar', s.el).value.trim(); if (!loc) return G.toast('Elige la localidad'); if (!bar) return G.toast('Escribe el barrio');
      const id = await db.nextVisitId(), area = { id: G.uid(), type: 'Barrio', name: bar, sector: '', localidad: loc, lat: '', lon: '', acc: '', createdAt: new Date().toISOString() };
      const v = G.blankVisit(id, { localidad: loc, zona, areas: [area], activeAreaId: area.id });
      await db.put('visits', v); N.learnBarrio(loc, bar); s.close(true); await A().openVisit(id);
      G.gps({ timeout: 9000 }).then(r => { Object.assign(area, { lat: String(r.lat), lon: String(r.lon), acc: String(r.acc) }); A().save(); A().refresh(); }).catch(() => { });
    };
  };

  /* ---------- área (barrio / sector) ---------- */
  SH.area = (a) => {
    const v = A().visit(), isNew = !a;
    const it = a ? { ...a } : { id: G.uid(), type: 'Barrio', name: '', sector: '', localidad: A().area()?.localidad || v.localidad || '', lat: '', lon: '', acc: '', createdAt: new Date().toISOString() };
    const s = G.sheet({
      title: isNew ? 'Nuevo barrio o sector' : 'Editar área', body: `<div class="g2">${field('Tipo', `<select id="arT">${opt(C.AREA_TYPES, it.type)}</select>`)}${field('Localidad', `<select id="arL">${opt(C.LOCALIDADES, it.localidad, 'Selecciona…')}</select>`, 1)}</div>
      ${field('Nombre del barrio / sector', `<input id="arN" list="arDl" value="${esc(it.name)}" autocomplete="off"><datalist id="arDl"></datalist>`, 1)}
      ${field('Sector (opcional)', `<input id="arS" value="${esc(it.sector)}" autocomplete="off" placeholder="Ej.: parte alta, manzana 4">`)}
      <div class="gps" id="arGps"><span class="dot"></span><div class="grow"><b id="arGt">${it.lat ? it.lat + ', ' + it.lon : 'Sin ubicación'}</b><small>${it.acc ? '±' + it.acc + ' m' : 'Se captura al guardar'}</small></div><button class="btn sm" id="arGb">${icon('pin')} Capturar</button></div>`,
      footer: `${isNew ? '' : '<button class="btn danger" id="arDel">Eliminar</button>'}<button class="btn primary" id="arOk">${isNew ? 'Agregar y activar' : 'Guardar'}</button>`
    });
    const fillDl = () => { $('#arDl', s.el).innerHTML = N.barrios($('#arL', s.el).value).map(b => `<option value="${esc(b)}">`).join(''); }; fillDl(); $('#arL', s.el).onchange = fillDl;
    const cap = async () => { $('#arGps', s.el).classList.add('wait'); $('#arGt').textContent = 'Buscando señal…'; try { const r = await G.gps({ timeout: 10000 }); Object.assign(it, { lat: String(r.lat), lon: String(r.lon), acc: String(r.acc) }); $('#arGt').textContent = `${it.lat}, ${it.lon}`; $('#arGps small', s.el).textContent = `±${it.acc} m`; $('#arGps', s.el).className = 'gps ok'; } catch (e) { G.toast(e.message); $('#arGps', s.el).classList.remove('wait'); $('#arGt').textContent = 'Sin ubicación'; } };
    $('#arGb', s.el).onclick = cap; if (isNew) cap();
    if ($('#arDel', s.el)) $('#arDel', s.el).onclick = async () => { if (v.areas.length < 2) return G.toast('La visita necesita al menos un área'); if (await G.confirmBox('¿Eliminar esta área? Los registros conservan su texto.', { danger: true, ok: 'Eliminar' })) { v.areas = v.areas.filter(x => x.id !== it.id); if (v.activeAreaId === it.id) v.activeAreaId = v.areas[0].id; A().save(); A().refresh(); s.close(true); } };
    $('#arOk', s.el).onclick = () => {
      Object.assign(it, { type: $('#arT', s.el).value, localidad: $('#arL', s.el).value, name: $('#arN', s.el).value.trim(), sector: $('#arS', s.el).value.trim() });
      if (!it.localidad) return G.toast('Elige la localidad'); if (!it.name) return G.toast('Escribe el nombre del barrio o sector');
      if (isNew) v.areas.push(it); else Object.assign(a, it);
      v.activeAreaId = it.id; if (!v.localidad) v.localidad = it.localidad; N.learnBarrio(it.localidad, it.name);
      A().save(); A().refresh(); s.close(true); G.toast(isNew ? `Ahora estás en ${it.name}` : 'Área guardada');
    };
  };

  /* ---------- CD nuevo ---------- */
  SH.cdNew = () => new Promise(res => {
    const v = A().visit(); let done = false;
    const s = G.sheet({
      title: 'Nuevo CD / transformador', onClose: () => { if (!done) res(null); },
      body: `${field('Código del CD', `<input id="cnC" autocapitalize="characters" autocomplete="off" placeholder="Ej.: E23456TR1">`, 1)}
      <div class="g2">${field('kVA', `<select id="cnK">${opt([...C.KVA, 'N.V.'], '', 'Selecciona…')}</select>`, 1)}${field('Propiedad', `<select id="cnP">${opt(C.CD_PROPIEDAD, 'ENEL')}</select>`)}</div>
      ${field('Orden de servicio (opcional)', `<input id="cnO" autocomplete="off" placeholder="OS asociada">`)}
      <p class="muted small" style="margin:0">Solo letras y números en mayúscula. Al guardar, este CD queda activo para registrar estructuras, clientes, UNC y baldíos.</p>`,
      footer: `<button class="btn" data-x2>Cancelar</button><button class="btn primary" id="cnOk">Guardar y registrar</button>`
    });
    $('#cnC', s.el).oninput = e => { e.target.value = G.upperCode(e.target.value); };
    $('[data-x2]', s.el).onclick = () => s.close();
    $('#cnOk', s.el).onclick = () => {
      const code = G.upperCode($('#cnC', s.el).value), kva = $('#cnK', s.el).value;
      if (!code) return G.toast('Escribe el código del CD'); if (!kva) return G.toast('Elige los kVA');
      if (v.cds.some(c => c.code === code)) return G.toast('Ese CD ya está en esta visita');
      const c = G.cdOf(code, kva); c.property = $('#cnP', s.el).value; c.os = $('#cnO', s.el).value.trim(); c.areaId = v.activeAreaId;
      G.gps({ timeout: 9000 }).then(r => { c.lat = String(r.lat); c.lon = String(r.lon); c.acc = String(r.acc); A().save(); }).catch(() => { });
      v.cds.push(c); v.activeCdId = c.id; done = true; A().save(); A().refresh(); s.close(true); G.toast(`CD ${code} activo`); res(c);
    };
  });

  /* ---------- elegir / cambiar CD ---------- */
  SH.cdPick = async () => {
    const v = A().visit(), recs = A().recs();
    const rows = v.cds.map(c => { const r = recs.filter(x => x.Transformador === c.code); const pend = r.filter(x => !x.borrador && !x.exportado).length; return `<button class="li" data-cd="${c.id}"><span class="cdbadge" style="width:40px;height:40px;font-size:20px">${icon('zap')}</span><span class="grow"><span class="t">${esc(c.code)} ${c.id === v.activeCdId ? '<span class="chip p">Activo</span>' : ''}</span><br><span class="d">${esc(c.kva)} kVA · ${esc(c.property)} · ${r.length} registro(s)${pend ? ` · <b style="color:var(--primary-ink)">${pend} sin exportar</b>` : ''}</span></span>${icon('chev')}</button>`; }).join('');
    const s = G.sheet({ title: 'Cambiar de CD', body: `${rows || '<div class="empty">Aún no hay CD en esta visita.</div>'}<button class="btn primary block" id="cpNew">${icon('plus')} Nuevo CD</button>` });
    $$('[data-cd]', s.el).forEach(b => b.onclick = () => { const prev = A().cd(); const pend = prev ? recs.filter(x => x.Transformador === prev.code && !x.borrador && !x.exportado).length : 0; v.activeCdId = b.dataset.cd; A().save(); A().refresh(); s.close(true); if (pend && prev.id !== b.dataset.cd) G.toast(`${prev.code} queda con ${pend} registro(s) por exportar`); });
    $('#cpNew', s.el).onclick = async () => { s.close(true); await SH.cdNew(); };
  };

  /* ---------- ficha técnica del CD ---------- */
  SH.cd = (c) => {
    const v = A().visit(); const it = JSON.parse(JSON.stringify(c)); let descEdited = !!it.descEdited, genDesc = '';
    const groups = Object.entries(C.techGroups).map(([k, g]) => cg(k, g.title, g.items, it[k])).join('');
    const s = G.sheet({
      title: `Ficha técnica · ${it.code}`,
      body: `<div class="g2">${field('kVA', `<select id="cdK">${opt([...C.KVA, 'N.V.'], it.kva)}</select>`)}${field('Propiedad', `<select id="cdP">${opt(C.CD_PROPIEDAD, it.property)}</select>`)}</div>
      ${field('Orden de servicio', `<input id="cdO" value="${esc(it.os || '')}" autocomplete="off">`)}
      <div class="gps"><span class="dot"></span><div class="grow"><b id="cdGt">${it.lat ? it.lat + ', ' + it.lon : 'Sin ubicación'}</b><small>${it.acc ? '±' + it.acc + ' m' : ''}</small></div><button class="btn sm" id="cdGb">${icon('pin')} Capturar</button></div>
      <div id="cdNits"></div>${groups}
      ${field('Observaciones técnicas', G.dictField('cdObs', it.obs || '', 'Describe la infraestructura con tus palabras…'))}
      ${field('Descripción para el informe (NITS)', G.dictField('cdDesc', it.nitsDescription || '', 'NITS la redacta con lo que marcaste'))}`,
      footer: `<button class="btn danger" id="cdDel">${icon('trash')}</button><button class="btn primary" id="cdOk">Guardar ficha</button>`
    });
    const read = () => { it.kva = $('#cdK', s.el).value; it.property = $('#cdP', s.el).value; it.os = $('#cdO', s.el).value.trim(); it.obs = $('#cdObs', s.el).value; Object.keys(C.techGroups).forEach(k => it[k] = grab(s.el, k)); };
    const paint = () => {
      read(); const sg = N.suggestState(it); it.suggestedState = sg.state;
      const cur = it.validatedState;
      $('#cdNits', s.el).innerHTML = `<div class="nits"><div class="h">${icon('spark')} NITS · estado sugerido</div>
        <div class="row wrap">${sg.state ? `<span class="chip ${sg.state === 'Favorable' ? 'ok' : sg.state === 'Crítico' ? 'bad' : 'warn'}">${sg.state}</span>` : '<span class="chip">Sin evaluar</span>'}${cur ? `<span class="chip t">Confirmado: ${esc(cur)}</span>` : '<span class="muted small">Tú lo confirmas o lo cambias</span>'}</div>
        <ul style="margin:0;padding-left:18px;font-size:13px">${sg.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
        <div class="seg">${['Favorable', 'Medio', 'Crítico'].map(x => `<button type="button" data-vs="${x}" class="${cur === x ? 'on' : ''}">${x}</button>`).join('')}</div>
        ${sg.state && cur !== sg.state ? `<button type="button" class="btn sm tert" data-conf>Confirmar ${sg.state}</button>` : ''}</div>`;
      $$('[data-vs]', s.el).forEach(b => b.onclick = () => { it.validatedState = b.dataset.vs; paint(); });
      const cf = $('[data-conf]', s.el); if (cf) cf.onclick = () => { it.validatedState = sg.state; paint(); };
      if (!descEdited) { genDesc = N.describeInfra(it); $('#cdDesc', s.el).value = genDesc; }
    };
    s.el.addEventListener('change', e => { if (e.target.dataset.g || e.target.id === 'cdP' || e.target.id === 'cdK') paint(); });
    $('#cdObs', s.el).addEventListener('input', () => { if (!descEdited) paint(); });
    $('#cdDesc', s.el).addEventListener('input', () => { descEdited = true; });
    $('#cdGb', s.el).onclick = async () => { $('#cdGt').textContent = 'Buscando señal…'; try { const r = await G.gps({ timeout: 10000 }); Object.assign(it, { lat: String(r.lat), lon: String(r.lon), acc: String(r.acc) }); $('#cdGt').textContent = `${it.lat}, ${it.lon}`; } catch (e) { G.toast(e.message); $('#cdGt').textContent = it.lat || 'Sin ubicación'; } };
    paint();
    $('#cdDel', s.el).onclick = async () => {
      const n = A().recs().filter(r => r.Transformador === c.code).length;
      if (!await G.confirmBox(n ? `Este CD tiene ${n} registro(s). Si lo eliminas de la visita, los registros se conservan pero quedan sin ficha. ¿Continuar?` : '¿Eliminar este CD?', { danger: true, ok: 'Eliminar' })) return;
      v.cds = v.cds.filter(x => x.id !== c.id); if (v.activeCdId === c.id) v.activeCdId = v.cds[0]?.id || null; A().save(); A().refresh(); s.close(true);
    };
    $('#cdOk', s.el).onclick = () => {
      read(); const finalDesc = $('#cdDesc', s.el).value.trim();
      if (descEdited && genDesc && finalDesc !== genDesc) N.learnText('cd-desc', genDesc, finalDesc);
      it.nitsDescription = finalDesc; it.descEdited = descEdited;
      if (it.validatedState) N.learnState(it, it.validatedState);
      Object.assign(c, it); A().save(); A().refresh(); s.close(true); G.toast('Ficha guardada');
    };
  };

  /* ---------- hallazgo ---------- */
  SH.finding = (f, opts = {}) => {
    const v = A().visit(), a = A().area(), isNew = !f;
    const it = f ? JSON.parse(JSON.stringify(f)) : { id: G.uid(), areaId: a?.id || '', areaLabel: areaLabel(a), obs: '', category: '', nitsText: '', photos: [], createdAt: new Date().toISOString(), lat: '', lon: '', acc: '' };
    let moreCats = false, edited = !!f && !!f.nitsText && f.textEdited, chosen = f?.catChosen || null, gen = '', predicted = '';
    const phs = () => it.photos.map((p, i) => `<div class="stack" style="gap:6px"><div class="ph" style="aspect-ratio:4/3"><img src="${p.dataURL}" alt=""><button class="ed" data-fe="${i}" aria-label="Marcar">${icon('pencil')}</button><button data-fr="${i}" aria-label="Quitar">${icon('x')}</button></div><input data-fc="${i}" placeholder="Pie de foto" value="${esc(p.caption || '')}"></div>`).join('');
    const s = G.sheet({
      title: isNew ? 'Nuevo hallazgo' : 'Editar hallazgo',
      body: `${field('Sector', `<select id="fiA">${v.areas.map(x => `<option value="${x.id}" ${x.id === it.areaId ? 'selected' : ''}>${esc(areaLabel(x))}</option>`).join('')}</select>`)}
      ${field('Lo que observaste o te dijeron', G.dictField('fiO', it.obs, 'Escribe o dicta…'))}<div class="sugs" id="fiSg"></div>
      <div class="field"><label class="l">Fotos</label><div class="g2" id="fiPh">${phs()}</div><button type="button" class="btn block" id="fiAdd">${icon('camera')} Agregar foto</button></div>
      <div class="nits"><div class="h">${icon('spark')} NITS · clasificación y redacción</div><div class="sugs" id="fiCat"></div>${G.dictField('fiT', it.nitsText, 'El texto del informe aparece aquí; puedes editarlo')}<span class="muted small">Si lo corriges, NITS aprende cómo redactas.</span></div>
      <div class="row"><span class="chip t" id="fiGps">${it.lat ? `${icon('pin')} ±${it.acc} m` : 'Ubicación pendiente'}</span></div>`,
      footer: `${isNew ? '' : '<button class="btn danger" id="fiDel">' + icon('trash') + '</button>'}<button class="btn primary" id="fiOk">Guardar hallazgo</button>`,
      beforeClose: async () => true
    });
    const O = $('#fiO', s.el), T = $('#fiT', s.el);
    const cats = () => { const r = N.classify(O.value); predicted = r.category; const sel = it.category || r.category; const list = moreCats ? [...new Set([...r.ranked, sel, ...C.HALLAZGO_CATS])] : [...new Set([sel, ...r.ranked])].slice(0, 3);
      $('#fiCat', s.el).innerHTML = list.map(c => `<button type="button" data-cat="${esc(c)}" style="${c === sel ? 'background:var(--tertiary);border-color:var(--tertiary);color:#00263A' : ''}">${esc(c)}</button>`).join('') + (moreCats ? '' : '<button type="button" data-more>Otra categoría…</button>'); };
    const run = () => {
      const r = N.classify(O.value); predicted = r.category; if (!chosen) it.category = r.category; else it.category = chosen;
      if (!edited) { gen = N.narrate(O.value, it.category); T.value = O.value.trim() ? gen : ''; }
      cats(); const sg = N.suggest(O.value); $('#fiSg', s.el).innerHTML = sg.map((x, i) => `<button type="button" data-sg="${i}">+ ${esc(x.full)}</button>`).join(''); $$('[data-sg]', s.el).forEach(b => b.onclick = () => { O.value = O.value.replace(/\s*$/, ' ') + sg[+b.dataset.sg].full + ' '; run(); });
    };
    O.addEventListener('input', run); T.addEventListener('input', () => { edited = true; });
    s.el.addEventListener('click', async e => {
      if (e.target.closest('[data-more]')) { moreCats = true; return cats(); }
      const c = e.target.closest('[data-cat]'); if (c) { chosen = it.category = c.dataset.cat; if (!edited) T.value = O.value.trim() ? (gen = N.narrate(O.value, it.category)) : ''; cats(); return; }
      const fr = e.target.closest('[data-fr]'); if (fr) { it.photos.splice(+fr.dataset.fr, 1); $('#fiPh', s.el).innerHTML = phs(); G.hydrate(s.el); return; }
      const fe = e.target.closest('[data-fe]'); if (fe) { await G.editPhoto(it.photos[+fe.dataset.fe]); $('#fiPh', s.el).innerHTML = phs(); G.hydrate(s.el); }
    });
    s.el.addEventListener('input', e => { const i = e.target.dataset.fc; if (i !== undefined) it.photos[+i].caption = e.target.value; });
    const addPhoto = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.setAttribute('capture', 'environment'); inp.onchange = async () => { for (const f2 of inp.files) { try { it.photos.push(await G.compress(f2, 1400, .78)); } catch { G.toast('No se pudo leer una foto'); } } $('#fiPh', s.el).innerHTML = phs(); G.hydrate(s.el); }; inp.click(); };
    $('#fiAdd', s.el).onclick = addPhoto; if (opts.camera) setTimeout(addPhoto, 250);
    if (isNew) G.gps({ timeout: 8000 }).then(r => { Object.assign(it, { lat: String(r.lat), lon: String(r.lon), acc: String(r.acc) }); const g = $('#fiGps', s.el); if (g) g.innerHTML = `${icon('pin')} ±${r.acc} m`; }).catch(() => { });
    run();
    if ($('#fiDel', s.el)) $('#fiDel', s.el).onclick = async () => { if (await G.confirmBox('¿Eliminar este hallazgo?', { danger: true, ok: 'Eliminar' })) { v.findings = v.findings.filter(x => x.id !== f.id); A().save(); A().refresh(); s.close(true); } };
    $('#fiOk', s.el).onclick = () => {
      it.obs = O.value.trim(); if (!it.obs && !it.photos.length) return G.toast('Escribe lo observado o agrega una foto');
      const ar = v.areas.find(x => x.id === $('#fiA', s.el).value); it.areaId = ar?.id || ''; it.areaLabel = areaLabel(ar);
      const final = T.value.trim() || N.narrate(it.obs, it.category); it.nitsText = final; it.textEdited = edited; it.catChosen = chosen;
      N.learnCategory(it.obs, it.category, predicted); if (edited && gen && final !== gen) N.learnText('hallazgo', gen, final); else N.learnPhrases(it.obs);
      if (isNew) v.findings.push(it); else Object.assign(f, it);
      A().save(); A().refresh(); s.close(true); G.toast(`NITS lo clasificó: ${it.category}`);
    };
  };

  /* ---------- persona ---------- */
  SH.person = (p) => {
    const v = A().visit(), a = A().area(), isNew = !p;
    const it = p ? { ...p } : { id: G.uid(), areaId: a?.id || '', areaLabel: areaLabel(a), name: '', role: '', phone: '', notes: '', createdAt: new Date().toISOString() };
    const s = G.sheet({
      title: isNew ? 'Nuevo contacto' : 'Editar contacto',
      body: `${field('Nombre', `<input id="peN" value="${esc(it.name)}" autocomplete="off">`, 1)}<div class="g2">${field('Rol o relación', `<input id="peR" value="${esc(it.role)}" placeholder="Presidencia JAC, líder, vecino…">`)}${field('Teléfono', `<input id="peT" inputmode="tel" value="${esc(it.phone)}">`)}</div>${field('Observaciones', G.dictField('peO', it.notes))}`,
      footer: `${isNew ? '' : '<button class="btn danger" id="peDel">' + icon('trash') + '</button>'}<button class="btn primary" id="peOk">Guardar contacto</button>`
    });
    if ($('#peDel', s.el)) $('#peDel', s.el).onclick = async () => { if (await G.confirmBox('¿Eliminar este contacto?', { danger: true, ok: 'Eliminar' })) { v.people = v.people.filter(x => x.id !== p.id); A().save(); A().refresh(); s.close(true); } };
    $('#peOk', s.el).onclick = () => {
      it.name = $('#peN', s.el).value.trim(); if (!it.name) return G.toast('Escribe el nombre');
      Object.assign(it, { role: $('#peR', s.el).value.trim(), phone: $('#peT', s.el).value.trim(), notes: $('#peO', s.el).value.trim(), areaId: a?.id || it.areaId, areaLabel: areaLabel(a) });
      if (isNew) v.people.push(it); else Object.assign(p, it); A().save(); A().refresh(); s.close(true); G.toast('Contacto guardado');
    };
  };

  /* ---------- pendiente ---------- */
  SH.pending = (p) => {
    const v = A().visit(), a = A().area(), isNew = !p;
    const it = p ? { ...p } : { id: G.uid(), areaId: a?.id || '', areaLabel: areaLabel(a), text: '', responsible: 'ENEL', status: 'Abierto', date: '', createdAt: new Date().toISOString() };
    const s = G.sheet({
      title: isNew ? 'Nuevo pendiente' : 'Editar pendiente',
      body: `${field('Pendiente', G.dictField('pdT', it.text, 'Ej.: Programar reunión de gestión documental…'), 1)}<div class="g2">${field('Responsable', `<select id="pdR">${opt(C.RESPONSABLES, it.responsible)}</select>`)}${field('Estado', `<select id="pdS">${opt(C.PEND_ESTADOS, it.status)}</select>`)}</div>${field('Fecha de alerta (opcional)', `<input type="date" id="pdD" value="${esc(it.date)}">`)}`,
      footer: `${isNew ? '' : '<button class="btn danger" id="pdDel">' + icon('trash') + '</button>'}<button class="btn primary" id="pdOk">Guardar pendiente</button>`
    });
    if ($('#pdDel', s.el)) $('#pdDel', s.el).onclick = async () => { if (await G.confirmBox('¿Eliminar este pendiente?', { danger: true, ok: 'Eliminar' })) { v.pendings = v.pendings.filter(x => x.id !== p.id); A().save(); A().refresh(); s.close(true); } };
    $('#pdOk', s.el).onclick = () => {
      it.text = $('#pdT', s.el).value.trim(); if (!it.text) return G.toast('Escribe el pendiente');
      Object.assign(it, { responsible: $('#pdR', s.el).value, status: $('#pdS', s.el).value, date: $('#pdD', s.el).value });
      N.learnPhrases(it.text); if (isNew) v.pendings.push(it); else Object.assign(p, it); A().save(); A().refresh(); s.close(true); G.toast('Pendiente guardado');
    };
  };
  G.sh = SH;
})(window.GS);
