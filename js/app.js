/* app.js · pantallas: Inicio, Visita (Recorrido · Registros · Gestión · Salidas) y Ajustes */
(function (G) {
  const { $, $$, esc, icon, C, db, nits: N, rec: R, exp: X, report: Rep, sh: SH } = G;
  const S = { visit: null, recs: [], tab: 'rec', reg: { type: 'E', cd: 'active', st: 'all', q: '' }, tlMax: 40 };
  const A = {};
  G.app = A;
  const areaLabel = G.areaLabel;
  const KIND = { E: ['pole', 'Estructura'], C: ['gauge', 'Cliente'], U: ['home', 'UNC'], S: ['ban', 'Suspensión'], B: ['lot', 'Baldío'], H: ['search', 'Hallazgo'], P: ['user', 'Contacto'], T: ['bell', 'Pendiente'], CD: ['zap', 'CD'], A: ['pin', 'Sector'] };

  /* ---------- estado de la visita ---------- */
  A.visit = () => S.visit; A.recs = () => S.recs;
  A.area = () => S.visit?.areas.find(a => a.id === S.visit.activeAreaId) || S.visit?.areas[0] || null;
  A.cd = () => S.visit?.cds.find(c => c.id === S.visit.activeCdId) || null;
  let saveT;
  A.save = () => { clearTimeout(saveT); if (!S.visit) return; S.visit.updatedAt = new Date().toISOString(); saveT = setTimeout(() => db.put('visits', S.visit), 200); };
  A.saveNow = async () => { clearTimeout(saveT); if (S.visit) { S.visit.updatedAt = new Date().toISOString(); await db.put('visits', S.visit); } };
  A.refresh = async () => { if (!S.visit) return; S.recs = await db.byIndex('records', 'visitId', S.visit.id); renderVisit(); };
  const ctx = () => ({ visit: S.visit, cd: A.cd(), area: A.area() });
  const cdCounts = code => { const o = { E: 0, C: 0, U: 0, S: 0, B: 0, pend: 0, draft: 0 }; S.recs.filter(r => r.Transformador === code).forEach(r => { if (r.borrador) o.draft++; else { o[r.type]++; if (!r.exportado) o.pend++; } }); return o; };
  const pendingOpen = v => (v.pendings || []).filter(p => !['Cumplido', 'Cerrado'].includes(p.status)).length;

  /* ---------- tema ---------- */
  const applyTheme = () => { const t = G.settings.get().theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t; const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#FEFEFF'; };
  const isDark = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme:dark)').matches);
  const toggleTheme = () => { G.settings.set({ theme: isDark() ? 'light' : 'dark' }); applyTheme(); renderTop(); };
  function renderTop() { $$('[data-themebtn]').forEach(b => b.innerHTML = icon(isDark() ? 'sun' : 'moon')); }

  /* ---------- navegación ---------- */
  function show(name) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === 's-' + name)); scrollTo(0, 0); }
  A.openVisit = async id => {
    const v = await db.get('visits', id); if (!v) return;
    ['areas', 'cds', 'findings', 'people', 'pendings'].forEach(k => v[k] ||= []); v.territory ||= {}; v.management ||= { topics: [], obs: '', nextAction: '', meeting: 'No' };
    if (!v.activeAreaId && v.areas[0]) v.activeAreaId = v.areas[0].id; if (!v.activeCdId && v.cds[0]) v.activeCdId = v.cds[0].id;
    S.visit = v; S.tab = 'rec'; S.tlMax = 40; S.reg = { type: 'E', cd: 'active', st: 'all', q: '' };
    S.recs = await db.byIndex('records', 'visitId', id); history.pushState({ s: 'visit' }, ''); renderVisit(); show('visit');
  };
  A.closeVisit = async () => { await A.saveNow(); S.visit = null; await renderHome(); show('home'); };
  window.addEventListener('popstate', async () => { if ($('#s-settings').classList.contains('active')) { await renderHome(); show(S.visit ? 'visit' : 'home'); return; } if (S.visit) A.closeVisit(); });

  /* ================= INICIO ================= */
  async function renderHome() {
    const visits = (await db.all('visits')).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    const recs = await db.all('records');
    const pend = recs.filter(r => !r.borrador && !r.exportado).length, drafts = recs.filter(r => r.borrador).length;
    const open = visits.reduce((n, v) => n + pendingOpen(v), 0);
    const cur = visits.find(v => !v.reportGenerated);
    const cnt = v => { const o = { E: 0, C: 0, U: 0, S: 0, B: 0 }; recs.filter(r => r.visitId === v.id && !r.borrador).forEach(r => o[r.type]++); return o; };
    const place = v => `${esc(N.visitPlace(v) || v.localidad || 'Sin localidad')}${v.areas?.[0]?.name ? ' · ' + esc(v.areas[0].name) : ''}`;
    $('#s-home').innerHTML = `<div class="topbar"><div class="brand"><span class="mark">${icon('zap')}</span><h1>GS Diagnósticos</h1></div><button class="iconbtn" data-themebtn aria-label="Tema"></button><button class="iconbtn" data-act="lock" aria-label="Bloquear">${icon('lock')}</button><button class="iconbtn" data-act="settings" aria-label="Ajustes">${icon('sliders')}</button></div>
    <div class="content">
      <div class="banner"><div class="bt"><h2>Camina el sector.<br>Registra al paso.</h2><p>Recorrido, estructuras, predios y NITS en un solo lugar.</p></div></div>
      ${cur ? `<button class="card accent" data-act="open:${cur.id}" style="text-align:left;width:100%"><div class="eyebrow">Recorrido en curso</div><h3 style="font-size:18px">${place(cur)}</h3><div class="row wrap"><span class="chip">ID ${cur.id}</span><span class="chip">${cur.cds?.length || 0} CD</span>${(() => { const k = cnt(cur); return `<span class="chip">${k.E + k.C + k.U + k.S + k.B} registros</span>`; })()}</div><span class="btn primary block">${icon('route')} Continuar recorrido</span></button>` : ''}
      <button class="btn ${cur ? '' : 'primary'} block" data-act="newvisit" style="min-height:54px">${icon('plus')} Nueva visita</button>
      <div class="kpis k3"><div class="kpi ${pend ? 'on' : ''}"><b>${pend}</b><span>Por exportar</span></div><div class="kpi"><b>${drafts}</b><span>Borradores</span></div><div class="kpi"><b>${open}</b><span>Pendientes</span></div></div>
      <div class="eyebrow" style="margin-top:4px">Visitas</div>
      ${visits.length ? visits.map(v => { const k = cnt(v); return `<div class="card flat"><div class="row"><button class="grow" data-act="open:${v.id}" style="text-align:left;background:none;border:0;padding:0"><h3 style="font-size:16px">${place(v)}</h3><div class="muted small">ID ${v.id} · ${G.fmtDate(v.date)} · ${v.reportGenerated ? 'Informe generado' : 'En progreso'}</div></button><button class="iconbtn" data-act="vmenu:${v.id}" aria-label="Opciones">${icon('chev')}</button></div><div class="row wrap"><span class="chip">${icon('pole')} ${k.E}</span><span class="chip">${icon('gauge')} ${k.C}</span><span class="chip p">${icon('home')} ${k.U}</span><span class="chip bad">${icon('ban')} ${k.S}</span><span class="chip warn">${icon('lot')} ${k.B}</span><span class="chip">${icon('zap')} ${v.cds?.length || 0} CD</span></div></div>`; }).join('') : '<div class="empty">Aún no hay visitas. Crea la primera para empezar a recorrer.</div>'}
    </div>`;
    G.hydrate($('#s-home')); renderTop();
  }

  /* ================= VISITA ================= */
  function renderVisit() {
    const v = S.visit; if (!v) return;
    const a = A.area(), pend = S.recs.filter(r => !r.borrador && !r.exportado).length;
    const tabs = [['rec', 'route', 'Recorrido'], ['reg', 'list', 'Registros'], ['ges', 'users', 'Gestión'], ['out', 'download', 'Salidas']];
    $('#s-visit').innerHTML = `<div class="topbar"><button class="iconbtn" data-act="back" aria-label="Volver">${icon('back')}</button><h1>${esc(a?.localidad || v.localidad || 'Visita')}${a ? ' · ' + esc(a.name) : ''}<span class="sub">ID ${v.id} · ${G.fmtDate(v.date)}</span></h1><button class="iconbtn" data-themebtn aria-label="Tema"></button><button class="iconbtn" data-act="lock" aria-label="Bloquear">${icon('lock')}</button></div>
    <div class="content" id="vc">${({ rec: tabRec, reg: tabReg, ges: tabGes, out: tabOut })[S.tab]()}</div>
    ${(S.tab === 'rec' || S.tab === 'reg') ? `<button class="fab" data-act="quick">${icon('plus')} Registrar</button>` : ''}
    <nav class="nav">${tabs.map(([k, i, l]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${icon(i)}${l}${k === 'out' && pend ? `<span class="badge">${pend}</span>` : ''}</button>`).join('')}</nav>`;
    G.hydrate($('#s-visit')); renderTop();
  }

  /* ---- Recorrido ---- */
  function tabRec() {
    const v = S.visit, cd = A.cd(), a = A.area();
    const chips = v.areas.map(x => `<button class="achip ${x.id === a?.id ? 'on' : ''}" data-act="area:${x.id}">${icon('pin')} ${esc(x.name)}${x.id === a?.id ? ` <span data-act="areaedit:${x.id}" style="margin-left:4px">${icon('pencil')}</span>` : ''}</button>`).join('') + `<button class="achip add" data-act="newarea">${icon('plus')} Barrio / sector</button>`;
    const k = cd ? cdCounts(cd.code) : null;
    const st = cd?.validatedState || cd?.suggestedState;
    const old = S.recs.filter(r => !r.borrador && !r.exportado && (r.createdAt || '').slice(0, 10) < G.dateLocal(new Date())).length;
    return `<div class="stack" style="gap:10px"><div class="eyebrow">Dónde estás</div><div class="chips-scroll">${chips}</div></div>
    ${old ? `<button class="card flat" data-act="gout" style="border-color:var(--primary);text-align:left"><div class="row"><span class="chip p">${icon('alert')}</span><div class="grow"><b>${old} registro(s) de días anteriores sin exportar</b><div class="muted small">Toca para ir a Salidas y exportarlos.</div></div></div></button>` : ''}
    ${cd ? `<div class="card cdcard accent"><div class="cdhead"><span class="cdbadge">${icon('zap')}</span><div class="grow"><div class="eyebrow">CD activo</div><h3>${esc(cd.code)}</h3><div class="muted small">${esc(cd.kva)} kVA · ${esc(cd.property)}${cd.os ? ' · OS ' + esc(cd.os) : ''}</div></div>${st ? `<span class="chip ${st === 'Favorable' ? 'ok' : st === 'Crítico' ? 'bad' : 'warn'}">${st}${cd.validatedState ? '' : '?'}</span>` : ''}</div>
      <div class="kpis">${['E', 'C', 'U', 'S', 'B'].map(t => `<button class="kpi ${S.reg.type === t && false ? 'on' : ''}" data-act="goreg:${t}"><b>${k[t]}</b><span>${({ E: 'Estr.', C: 'Cli.', U: 'UNC', S: 'Susp.', B: 'Bald.' })[t]}</span></button>`).join('')}</div>
      ${k.pend ? `<div class="muted small">${k.pend} sin exportar${k.draft ? ` · ${k.draft} borrador(es)` : ''}</div>` : k.draft ? `<div class="muted small">${k.draft} borrador(es)</div>` : ''}
      <div class="btns"><button class="btn sm" data-act="cdficha">${icon('file')} Ficha técnica</button><button class="btn sm" data-act="cdpick">${icon('undo')} Cambiar CD</button></div></div>`
      : `<div class="card"><div class="cdhead none"><span class="cdbadge">${icon('zap')}</span><div class="grow"><h3>Aún no hay CD</h3><div class="muted small">Crea el CD que encontraste para registrar sus estructuras y predios.</div></div></div><button class="btn primary block" data-act="cdnew">${icon('plus')} Nuevo CD</button></div>`}
    <details class="card flat acc" ${S.recs.length > 1 ? '' : ''}><summary>${icon('route')} Mapa del recorrido <span class="chev">${icon('chev')}</span></summary><div>${routeMap()}</div></details>
    <div class="row between"><div class="eyebrow">Línea de tiempo</div><span class="muted small">${timeline().length} ${timeline().length === 1 ? 'evento' : 'eventos'}</span></div>
    ${timelineHtml()}`;
  }
  const tlItems = () => {
    const v = S.visit, out = [], cdS = c => c.validatedState || c.suggestedState;
    v.areas.forEach((x, i) => out.push({ ts: x.createdAt || v.createdAt, kind: 'A', t: i ? `Llegada a ${x.name}` : `Inicio en ${x.name}`, d: areaLabel(x), m: [x.acc && `GPS ±${x.acc} m`], act: `areaedit:${x.id}` }));
    v.cds.forEach(c => out.push({ ts: c.createdAt || v.createdAt, kind: 'CD', t: `CD ${c.code}`, d: `${c.kva} kVA · ${c.property}${c.nitsDescription ? ' · ' + c.nitsDescription : ''}`, chips: cdS(c) ? [[cdS(c), cdS(c) === 'Favorable' ? 'ok' : cdS(c) === 'Crítico' ? 'bad' : 'warn']] : [], act: `cdedit:${c.id}` }));
    S.recs.forEach(r => out.push({ ts: r.createdAt, kind: r.type, t: R.title(r), d: R.summary(r), m: [`CD ${r.Transformador}`, r.item && `Ítem ${r.item}`, r.Precision && `±${r.Precision} m`, (r.Fotos || []).length && `${r.Fotos.length} fotos`], chips: [r.borrador ? ['Borrador', 'warn'] : r.exportado ? ['Exportado', 'ok'] : ['Pendiente', 'p']], act: `rec:${r.id}` }));
    v.findings.forEach(f => out.push({ ts: f.createdAt, kind: 'H', t: f.category || 'Hallazgo', d: f.nitsText || f.obs, m: [(f.photos || []).length && `${f.photos.length} fotos`, f.areaLabel], act: `find:${f.id}` }));
    v.people.forEach(p => out.push({ ts: p.createdAt, kind: 'P', t: p.name, d: [p.role, p.notes].filter(Boolean).join(' · '), act: `person:${p.id}` }));
    v.pendings.forEach(p => out.push({ ts: p.createdAt, kind: 'T', t: p.text, d: `${p.responsible} · ${p.status}${p.date ? ' · ' + G.fmtDate(p.date) : ''}`, act: `pend:${p.id}` }));
    return out.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  };
  const timeline = tlItems;
  function timelineHtml() {
    const it = tlItems(); if (!it.length) return '<div class="empty">Tu recorrido empezará a aparecer aquí.</div>';
    const shown = it.slice(0, S.tlMax);
    return `<div class="tl">${shown.map(x => `<div class="tl-i"><span class="tl-dot ${x.kind}">${icon(KIND[x.kind][0])}</span><button class="tl-b" data-act="${x.act}"><div class="t">${esc(x.t)} ${(x.chips || []).map(c => `<span class="chip ${c[1]}">${esc(c[0])}</span>`).join('')}</div>${x.d ? `<div class="d">${esc(x.d)}</div>` : ''}<div class="m"><span>${KIND[x.kind][1]}</span><span>${G.fmtTimeISO(x.ts)}</span>${(x.m || []).filter(Boolean).map(s => `<span>${esc(s)}</span>`).join('')}</div></button></div>`).join('')}</div>${it.length > shown.length ? `<button class="btn block" data-act="tlmore">Ver los ${it.length - shown.length} anteriores</button>` : ''}`;
  }
  function routeMap() {
    const v = S.visit, pts = [];
    const add = (ts, lat, lon, kind) => { lat = +lat; lon = +lon; if (lat && lon && isFinite(lat) && isFinite(lon)) pts.push({ ts: ts || '', lat, lon, kind }); };
    v.areas.forEach(x => add(x.createdAt, x.lat, x.lon, 'A')); v.cds.forEach(c => add(c.createdAt, c.lat, c.lon, 'CD'));
    S.recs.forEach(r => add(r.createdAt, r.Latitud, r.Longitud, r.type)); v.findings.forEach(f => add(f.createdAt, f.lat, f.lon, 'H'));
    pts.sort((a, b) => a.ts.localeCompare(b.ts));
    if (!pts.length) return '<div class="empty" style="padding:14px">Aún no hay puntos con GPS. Cada registro guarda su ubicación y aquí verás el camino que vas haciendo.</div>';
    const W = 600, H = 300, p = 34, lat0 = pts.reduce((s, q) => s + q.lat, 0) / pts.length, k = Math.cos(lat0 * Math.PI / 180);
    const xs = pts.map(q => q.lon * k), ys = pts.map(q => -q.lat), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const dx = maxX - minX || 1e-6, dy = maxY - minY || 1e-6, sc = Math.min((W - 2 * p) / dx, (H - 2 * p) / dy), ox = (W - dx * sc) / 2, oy = (H - dy * sc) / 2;
    const P = pts.map((q, i) => [ox + (xs[i] - minX) * sc, oy + (ys[i] - minY) * sc, q.kind]);
    const col = { E: '#2F6FB5', C: 'var(--ok)', U: 'var(--primary)', S: 'var(--bad)', B: 'var(--warn)', H: 'var(--tertiary)', CD: 'var(--ink)', A: 'var(--ink-3)' };
    const mt = Math.max(dx * sc / k, 1); const metersW = Math.max(...pts.map(q => q.lon)) - Math.min(...pts.map(q => q.lon)), approx = Math.round(G.haversine(Math.min(...pts.map(q => q.lat)), Math.min(...pts.map(q => q.lon)), Math.max(...pts.map(q => q.lat)), Math.max(...pts.map(q => q.lon))));
    return `<svg id="routeMap" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa del recorrido"><polyline points="${P.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" fill="none" style="stroke:var(--tertiary)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="1 7"/>${P.map(q => `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${q[2] === 'CD' ? 9 : 6}" style="fill:${col[q[2]]};stroke:var(--surface)" stroke-width="2"/>`).join('')}<circle cx="${P.at(-1)[0].toFixed(1)}" cy="${P.at(-1)[1].toFixed(1)}" r="13" fill="none" style="stroke:var(--primary)" stroke-width="3"/><text x="${W - 10}" y="${H - 10}" text-anchor="end" font-size="14" style="fill:var(--ink-2);font-family:var(--f-body);font-weight:700">${pts.length} puntos · ~${approx} m de extremo a extremo</text></svg>`;
  }

  /* ---- Registros ---- */
  function tabReg() {
    const v = S.visit, f = S.reg, cd = A.cd();
    const list = S.recs.filter(r => r.type === f.type && (f.cd === 'all' || r.Transformador === (f.cd === 'active' ? cd?.code : f.cd)) &&
      (f.st === 'all' || (f.st === 'draft' ? r.borrador : f.st === 'exp' ? !r.borrador && r.exportado : !r.borrador && !r.exportado)) &&
      (!f.q || JSON.stringify([r.PuntoFisico, r.Nombres, r.SerieMedidor, r.Identificacion, r.Observaciones, r.Direccion]).toLowerCase().includes(f.q.toLowerCase()))).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const tot = t => S.recs.filter(r => r.type === t).length;
    return `<div class="seg scroll">${['E', 'C', 'U', 'S', 'B'].map(t => `<button data-rt="${t}" class="${f.type === t ? 'on' : ''}">${R.TYPES[t].plural} ${tot(t)}</button>`).join('')}</div>
    <div class="g2"><div><select id="rfCd"><option value="active" ${f.cd === 'active' ? 'selected' : ''}>CD activo</option><option value="all" ${f.cd === 'all' ? 'selected' : ''}>Todos los CD</option>${v.cds.map(c => `<option value="${esc(c.code)}" ${f.cd === c.code ? 'selected' : ''}>${esc(c.code)}</option>`).join('')}</select></div><div><select id="rfSt">${[['all', 'Todos'], ['pend', 'Por exportar'], ['exp', 'Exportados'], ['draft', 'Borradores']].map(x => `<option value="${x[0]}" ${f.st === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div></div>
    <input id="rfQ" type="text" placeholder="Buscar por punto físico, nombre, serie…" value="${esc(f.q)}">
    ${list.length ? list.map(r => `<div class="li"><button class="grow" data-act="rec:${r.id}" style="text-align:left;background:none;border:0;padding:0"><div class="t">${esc(R.title(r))} ${r.borrador ? '<span class="chip warn">Borrador</span>' : r.exportado ? '<span class="chip ok">Exportado</span>' : '<span class="chip p">Pendiente</span>'}</div><div class="d">${esc(R.summary(r))}</div><div class="muted small">CD ${esc(r.Transformador)}${r.item ? ' · Ítem ' + r.item : ''} · ${(r.Fotos || []).length} fotos${r.Precision ? ' · ±' + r.Precision + ' m' : ''}</div></button><button class="iconbtn" data-act="recdel:${r.id}" aria-label="Eliminar">${icon('trash')}</button></div>`).join('') : `<div class="empty">No hay ${R.TYPES[f.type].plural.toLowerCase()} con este filtro.</div>`}`;
  }

  /* ---- Gestión ---- */
  function tabGes() {
    const v = S.visit, t = v.territory, m = v.management;
    const chk = (key, title, items, sel, pre) => `<div class="cg"><h4>${esc(title)}</h4><div class="checks c2">${items.map(x => `<label class="chk"><input type="checkbox" data-cg="${pre}:${key}" value="${esc(x)}" ${sel?.includes(x) ? 'checked' : ''}> <span>${esc(x)}</span></label>`).join('')}</div></div>`;
    const list = (arr, fn, act) => arr.length ? arr.map(x => `<button class="li" data-act="${act}:${x.id}">${fn(x)}${icon('chev')}</button>`).join('') : '';
    return `<details class="card acc" open><summary>${icon('search')} Hallazgos <span class="chip">${v.findings.length}</span><span class="chev">${icon('chev')}</span></summary><div>${list(v.findings, f => `<span class="grow"><span class="t">${esc(f.category)}</span><br><span class="d">${esc((f.nitsText || f.obs || '').slice(0, 110))}</span></span>`, 'find') || '<div class="empty">Sin hallazgos todavía.</div>'}<button class="btn block" data-act="newfind">${icon('plus')} Agregar hallazgo</button></div></details>
    <details class="card acc"><summary>${icon('pin')} Territorio <span class="chev">${icon('chev')}</span></summary><div>${Object.entries(C.territoryGroups).map(([k, g]) => chk(k, g.title, g.items, t[k], 't')).join('')}<div class="field"><label class="l">Observaciones del territorio</label>${G.dictField('terObs', v.territoryObs || '')}</div></div></details>
    <details class="card acc"><summary>${icon('users')} Gestión social <span class="chev">${icon('chev')}</span></summary><div>${chk('topics', 'Temas socializados', C.managementTopics, m.topics, 'm')}<div class="field"><label class="l">¿Hubo reunión con la comunidad?</label><div class="seg" id="mtSeg"><button data-mt="Sí" class="${m.meeting === 'Sí' ? 'on' : ''}">Sí</button><button data-mt="No" class="${m.meeting !== 'Sí' ? 'on' : ''}">No</button></div></div><div class="field"><label class="l">Observaciones de la gestión</label>${G.dictField('mgObs', m.obs || '')}</div><div class="field"><label class="l">Próxima gestión</label><input id="mgNext" value="${esc(m.nextAction || '')}"></div></div></details>
    <details class="card acc"><summary>${icon('user')} Contactos <span class="chip">${v.people.length}</span><span class="chev">${icon('chev')}</span></summary><div>${list(v.people, p => `<span class="grow"><span class="t">${esc(p.name)}</span><br><span class="d">${esc([p.role, p.phone].filter(Boolean).join(' · '))}</span></span>`, 'person') || '<div class="empty">Sin contactos.</div>'}<button class="btn block" data-act="newperson">${icon('plus')} Agregar contacto</button></div></details>
    <details class="card acc"><summary>${icon('bell')} Pendientes <span class="chip">${pendingOpen(v)}</span><span class="chev">${icon('chev')}</span></summary><div>${list(v.pendings, p => `<span class="grow"><span class="t">${esc(p.text)}</span><br><span class="d">${esc(p.responsible)} · ${esc(p.status)}${p.date ? ' · ' + G.fmtDate(p.date) : ''}</span></span>`, 'pend') || '<div class="empty">Sin pendientes.</div>'}<button class="btn block" data-act="newpend">${icon('plus')} Agregar pendiente</button></div></details>`;
  }

  /* ---- Salidas ---- */
  function tabOut() {
    const v = S.visit, st = Rep.stats(v, S.recs), pendAll = S.recs.filter(r => !r.borrador && !r.exportado).length, drafts = S.recs.filter(r => r.borrador).length;
    const checks = Rep.checks(v, st, pendAll);
    const codes = [...new Set([...v.cds.map(c => c.code), ...S.recs.map(r => r.Transformador)])];
    return `<div class="card"><h3>Revisión antes del informe</h3>${checks.map(c => `<div class="ck"><i class="${c.ok ? 'ok' : 'w'}">${c.ok ? '✓' : '!'}</i>${esc(c.text)}${c.ok ? '' : `<span class="r">${esc(c.r)}</span>`}</div>`).join('')}${drafts ? `<div class="ck"><i class="w">!</i>Registros en borrador<span class="r">${drafts}</span></div>` : ''}</div>
    <div class="eyebrow">Excel y ZIP de fotos (formato GS DX)</div>
    ${codes.length ? codes.map(code => { const n = cdCounts(code); return `<div class="card ${n.pend ? 'accent' : 'flat'}"><div class="row"><span class="cdbadge" style="width:40px;height:40px;font-size:20px">${icon('zap')}</span><div class="grow"><h3>CD ${esc(code)}</h3><div class="muted small">${n.pend} por exportar · ${n.E + n.C + n.U + n.S + n.B} en total${n.draft ? ` · ${n.draft} borrador(es) no salen` : ''}</div></div></div><div class="btns"><button class="btn sm primary" data-act="xp:${esc(code)}" ${n.pend ? '' : 'disabled'}>${icon('download')} Pendientes</button><button class="btn sm" data-act="xh:${esc(code)}">Histórico</button></div></div>`; }).join('') : '<div class="empty">Aún no hay CD con registros.</div>'}
    <div class="eyebrow">Informe y respaldos</div>
    <button class="out p" data-act="report"><span class="ic2">${icon('file')}</span><span class="grow"><b>Informe Word</b><span class="s">Revisar textos y generar · ${st.unc + st.susp} predios UNC, ${st.clients} clientes</span></span>${icon('chev')}</button>
    <button class="out" data-act="backupv"><span class="ic2">${icon('shield')}</span><span class="grow"><b>Respaldo de esta visita</b><span class="s">Archivo JSON con registros y fotos</span></span>${icon('chev')}</button>
    <button class="out" data-act="ics"><span class="ic2">${icon('bell')}</span><span class="grow"><b>Pendientes al calendario</b><span class="s">${v.pendings.filter(p => p.date).length} con fecha · archivo .ics</span></span>${icon('chev')}</button>`;
  }

  /* ================= acciones ================= */
  async function addRecord(type) {
    if (!A.cd()) { const c = await SH.cdNew(); if (!c) return; }
    const r = await R.open(type, null, ctx()); if (r) await A.refresh();
  }
  async function quick() {
    const tiles = [['E', 'pole', 'Estructura', 'Poste o nodo'], ['C', 'gauge', 'Cliente', 'Medidor'], ['U', 'home', 'UNC / Susp.', 'Predio'], ['B', 'lot', 'Baldío', 'Sin servicio'], ['H', 'search', 'Hallazgo', 'Social o territorio'], ['F', 'camera', 'Foto rápida', 'Con nota'], ['P', 'user', 'Contacto', 'Persona'], ['T', 'bell', 'Pendiente', 'Alerta'], ['A', 'pin', 'Sector', 'Nuevo barrio'], ['CD', 'zap', 'Nuevo CD', 'Transformador']];
    const s = G.sheet({ title: '¿Qué encontraste?', body: `<div class="tiles">${tiles.map(t => `<button class="tile ${['E', 'C', 'U'].includes(t[0]) ? '' : ''}" data-q="${t[0]}">${icon(t[1])}${t[2]}<small>${t[3]}</small></button>`).join('')}</div>${A.cd() ? `<div class="muted small" style="text-align:center">Registrando en CD <b>${esc(A.cd().code)}</b> · ${esc(A.area()?.name || '')}</div>` : ''}` });
    $$('[data-q]', s.el).forEach(b => b.onclick = async () => {
      const k = b.dataset.q; s.close(true);
      if (['E', 'C', 'U', 'B'].includes(k)) return addRecord(k);
      if (k === 'H') return SH.finding(); if (k === 'F') return SH.finding(null, { camera: true });
      if (k === 'P') return SH.person(); if (k === 'T') return SH.pending(); if (k === 'A') return SH.area(); if (k === 'CD') return SH.cdNew();
    });
  }
  async function openRec(id) {
    const r = S.recs.find(x => x.id === id); if (!r) return;
    if (r.exportado && !await G.confirmBox('Este registro ya se exportó. Si lo modificas volverá a quedar pendiente y saldrá otra vez en el próximo Excel. ¿Continuar?', { ok: 'Editar' })) return;
    const saved = await R.open(r.type, r, ctx());
    if (saved && r.exportado && !saved.borrador) { saved.exportado = false; saved.Exportado = 'No'; await db.put('records', saved); }
    await A.refresh();
  }
  async function delRec(id) {
    const r = S.recs.find(x => x.id === id); if (!r) return;
    if (await G.confirmBox(`¿Eliminar este registro (${R.TYPES[r.type].name}${r.item ? ' ítem ' + r.item : ''})?${r.exportado ? '\nYa fue exportado.' : ''}`, { danger: true, ok: 'Eliminar' })) { await db.del('records', id); await A.refresh(); G.toast('Registro eliminado'); }
  }

  async function exportSheet(code, mode) {
    const res = await X.build(code, mode, { mark: false });
    if (!res) return G.toast(mode === 'pend' ? 'No hay registros pendientes en este CD' : 'Este CD no tiene registros');
    const names = { E: 'estructuras', C: 'clientes', U: 'UNC', S: 'suspensiones', B: 'baldíos' };
    const s = G.sheet({ title: `Exportar CD ${code}`, body: `<div class="kpis">${['E', 'C', 'U', 'S', 'B'].map(t => `<div class="kpi"><b>${res.counts[t]}</b><span>${({ E: 'Estr.', C: 'Cli.', U: 'UNC', S: 'Susp.', B: 'Bald.' })[t]}</span></div>`).join('')}</div>
      <p style="margin:0">Se genera un ZIP con el Excel (<b>${mode === 'pend' ? 'PENDIENTE' : 'HISTÓRICO'}</b>) y las fotos en carpetas, igual que GS DX.</p><p class="muted small" style="margin:0">${res.name} · ${(res.blob.size / 1048576).toFixed(1)} MB${mode === 'pend' ? '<br>Al descargar o compartir, estos registros se marcan como exportados.' : ''}</p>`,
      footer: `<button class="btn" id="xsh">${icon('share')} Compartir</button><button class="btn primary" id="xdl">${icon('download')} Descargar</button>` });
    const done = async () => { if (mode === 'pend') { await res.commit(); await A.refresh(); } };
    $('#xdl', s.el).onclick = async () => { G.download(res.blob, res.name); await done(); s.close(true); G.toast('ZIP descargado'); };
    $('#xsh', s.el).onclick = async () => { if (await G.shareFile(res.blob, res.name)) { await done(); s.close(true); } else G.toast('Compartir no está disponible aquí: usa Descargar'); };
  }
  async function reportSheet() {
    const v = S.visit, st = Rep.stats(v, S.recs), secs = Rep.sections(v, st), auto = Object.fromEntries(secs.map(x => [x[0], x[2]]));
    const dr = secs.map(([k, t, text]) => `<div class="field"><label class="l">${esc(t)}</label>${G.dictField('rp_' + k, text)}</div>`).join('');
    const s = G.sheet({ title: 'Informe Word', body: `<div class="nits"><div class="h">${icon('spark')} NITS redactó estas secciones con tus registros</div><span class="small">Revísalas y corrígelas: lo que cambies sirve para que NITS aprenda a redactar como tú.</span></div>${dr}
      <label class="chk"><input type="checkbox" id="rpPh"> <span>Incluir una foto de cada registro de campo (el informe será más pesado)</span></label>
      <div class="field"><label class="l">Elaboró (aparece en portada y firma)</label><input id="rpAu" value="${esc(G.settings.get().autor || '')}" placeholder="Nombre de la gestora"></div>`,
      footer: `<button class="btn primary" id="rpGo">${icon('file')} Generar Word</button>` });
    $('#rpGo', s.el).onclick = async () => {
      const b = $('#rpGo', s.el); b.disabled = true; b.textContent = 'Generando…'; v.report = v.report || {};
      for (const k of Object.keys(auto)) { const val = $('#rp_' + k, s.el).value.trim(); if (val !== auto[k]) { v.report[k] = val; N.learnText('informe-' + k, auto[k], val); } else delete v.report[k]; }
      G.settings.set({ autor: $('#rpAu', s.el).value.trim() });
      try { const r = await Rep.build(v, S.recs, { recPhotos: $('#rpPh', s.el).checked }); G.download(r.blob, r.name); v.reportGenerated = true; v.reportDate = G.dateLocal(); A.save(); s.close(true); await A.refresh(); G.toast('Informe generado'); }
      catch (e) { G.toast('No se pudo generar: ' + e.message); b.disabled = false; b.innerHTML = `${icon('file')} Generar Word`; }
    };
  }

  /* ================= AJUSTES ================= */
  async function renderSettings() {
    const set = G.settings.get(), lk = G.lock.state(), prof = N.summary(), bio = await G.lock.bioSupported();
    $('#s-settings').innerHTML = `<div class="topbar"><button class="iconbtn" data-act="sback" aria-label="Volver">${icon('back')}</button><h1>Ajustes</h1></div><div class="content">
    <div class="card"><h3>${icon('lock')} Seguridad</h3>
      ${lk.configured ? `<div class="row wrap"><span class="chip ok">Clave activa</span>${lk.bio ? '<span class="chip t">Huella activa</span>' : ''}</div>
      <div class="field"><label class="l">Bloqueo automático</label><select id="stAuto">${[[1, '1 minuto'], [5, '5 minutos'], [15, '15 minutos'], [30, '30 minutos'], [0, 'Nunca']].map(x => `<option value="${x[0]}" ${lk.auto === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
      <div class="btns"><button class="btn" data-act="stclave">Cambiar clave</button>${bio ? (lk.bio ? '<button class="btn" data-act="stbiooff">Quitar huella</button>' : '<button class="btn" data-act="stbio">' + icon('finger') + ' Activar huella</button>') : ''}</div><div class="btns"><button class="btn primary" data-act="lock">Bloquear ahora</button><button class="btn danger" data-act="stlockoff">Quitar bloqueo</button></div>`
      : `<p class="muted" style="margin:0">La app no tiene clave. Protégela con una clave y, si tu teléfono lo permite, con la huella.</p><button class="btn primary block" data-act="stcreate">Crear clave</button>`}
      <p class="muted small" style="margin:0">El bloqueo evita que otra persona abra la app en este equipo. Los datos no se cifran en el dispositivo.</p></div>
    <div class="card"><h3>Apariencia</h3><div class="seg" id="stTheme">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(x => `<button data-th="${x[0]}" class="${set.theme === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div></div>
    <div class="card"><h3>Excel y informe</h3>
      <div class="field"><label class="l">Columna «Localidad» del Excel UNC</label><select id="stLoc"><option value="combo" ${set.locFmt === 'combo' ? 'selected' : ''}>LOCALIDAD - BARRIO</option><option value="solo" ${set.locFmt === 'solo' ? 'selected' : ''}>Solo la localidad</option></select></div>
      <div class="g2"><div class="field"><label class="l">Sede (Excel UNC)</label><input id="stSede" value="${esc(set.sede)}"></div><div class="field"><label class="l">Municipio (Excel UNC)</label><input id="stMun" value="${esc(set.municipio)}"></div></div>
      <div class="field"><label class="l">Elaboró (informe Word)</label><input id="stAutor" value="${esc(set.autor || '')}"></div></div>
    <div class="card"><h3>${icon('spark')} NITS · lo que ha aprendido de ti</h3>
      <div class="kpis k4"><div class="kpi"><b>${prof.correcciones}</b><span>Correcc.</span></div><div class="kpi"><b>${prof.palabras}</b><span>Palabras</span></div><div class="kpi"><b>${prof.frases}</b><span>Frases</span></div><div class="kpi"><b>${prof.barrios}</b><span>Barrios</span></div></div>
      <p class="muted small" style="margin:0">NITS aprende de forma local: cuando corriges un texto, una categoría o un estado de CD, lo recuerda para la próxima vez. No es un modelo entrenado y nada sale de este dispositivo.</p>
      <div class="btns"><button class="btn" data-act="nitsx">${icon('download')} Exportar perfil</button><button class="btn" data-act="nitsi">${icon('upload')} Importar perfil</button></div><button class="btn danger block" data-act="nitsr">Olvidar lo aprendido</button></div>
    <div class="card"><h3>Datos</h3><div class="btns"><button class="btn" data-act="backupall">${icon('shield')} Respaldo total</button><button class="btn" data-act="import">${icon('upload')} Importar respaldo</button></div><p class="muted small" style="margin:0">Importa respaldos de GS Diagnósticos, el respaldo total de GS DX o una visita de GS Asistente.</p></div>
    <div class="card flat"><div class="muted small">GS Diagnósticos v1.0 · unifica GS DX y GS Asistente · Bogotá D. C.</div></div></div>`;
    G.hydrate($('#s-settings'));
  }
  const pickFile = (accept, fn) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = async () => { if (i.files[0]) { try { await fn(i.files[0]); } catch (e) { G.toast(e.message || 'No se pudo leer el archivo'); } } }; i.click(); };

  /* ================= eventos ================= */
  document.addEventListener('click', async e => {
    const tab = e.target.closest('[data-tab]'); if (tab) { S.tab = tab.dataset.tab; S.tlMax = 40; renderVisit(); scrollTo(0, 0); return; }
    const rt = e.target.closest('[data-rt]'); if (rt) { S.reg.type = rt.dataset.rt; renderVisit(); return; }
    if (e.target.closest('[data-themebtn]')) return toggleTheme();
    const m = e.target.closest('[data-mt]'); if (m) { S.visit.management.meeting = m.dataset.mt; A.save(); $$('#mtSeg button').forEach(b => b.classList.toggle('on', b === m)); return; }
    const th = e.target.closest('[data-th]'); if (th) { G.settings.set({ theme: th.dataset.th }); applyTheme(); renderSettings(); renderTop(); return; }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const [act, ...rest] = el.dataset.act.split(':'), arg = rest.join(':');
    switch (act) {
      case 'open': return A.openVisit(arg);
      case 'newvisit': return SH.newVisit();
      case 'settings': await renderSettings(); show('settings'); history.pushState({ s: 'set' }, ''); return;
      case 'sback': history.back(); return;
      case 'lock': return G.lock.lockNow();
      case 'back': history.back(); return;
      case 'vmenu': { const id = arg; const c = await G.choose('Visita ' + id, [{ label: 'Abrir', icon: 'route', value: 'o', primary: true }, { label: 'Respaldo (JSON)', icon: 'shield', value: 'b' }, { label: 'Eliminar visita', sub: 'Borra también sus registros', icon: 'trash', value: 'd' }]); if (c === 'o') return A.openVisit(id); if (c === 'b') { const r = await X.backup(id); G.download(r.blob, r.name); } if (c === 'd' && await G.confirmBox('¿Eliminar esta visita y todos sus registros? No se puede deshacer.', { danger: true, ok: 'Eliminar' })) { for (const r of await db.byIndex('records', 'visitId', id)) await db.del('records', r.id); await db.del('visits', id); await renderHome(); G.toast('Visita eliminada'); } return; }
      case 'quick': return quick();
      case 'area': { S.visit.activeAreaId = arg; A.save(); renderVisit(); return; }
      case 'areaedit': { e.stopPropagation(); return SH.area(S.visit.areas.find(x => x.id === arg)); }
      case 'newarea': return SH.area();
      case 'cdnew': return SH.cdNew();
      case 'cdpick': return SH.cdPick();
      case 'cdficha': return SH.cd(A.cd());
      case 'cdedit': return SH.cd(S.visit.cds.find(c => c.id === arg));
      case 'goreg': S.reg.type = arg; S.reg.cd = 'active'; S.reg.st = 'all'; S.tab = 'reg'; renderVisit(); return;
      case 'gout': S.tab = 'out'; renderVisit(); return;
      case 'tlmore': S.tlMax += 400; renderVisit(); return;
      case 'rec': return openRec(arg);
      case 'recdel': return delRec(arg);
      case 'find': return SH.finding(S.visit.findings.find(x => x.id === arg));
      case 'person': return SH.person(S.visit.people.find(x => x.id === arg));
      case 'pend': return SH.pending(S.visit.pendings.find(x => x.id === arg));
      case 'newfind': return SH.finding();
      case 'newperson': return SH.person();
      case 'newpend': return SH.pending();
      case 'xp': return exportSheet(arg, 'pend');
      case 'xh': return exportSheet(arg, 'hist');
      case 'report': return reportSheet();
      case 'backupv': { const r = await X.backup(S.visit.id); G.download(r.blob, r.name); return; }
      case 'ics': { const b = X.ics(S.visit, S.visit.pendings); if (!b) return G.toast('Ningún pendiente tiene fecha de alerta'); G.download(b, `Pendientes_${S.visit.id}.ics`); return; }
      case 'backupall': { const r = await X.backup(); G.download(r.blob, r.name); return; }
      case 'import': return pickFile('.json,application/json', async f => { G.toast(await X.importFile(f)); await renderHome(); await renderSettings(); });
      case 'stclave': { if (!await G.lock.createNow()) { } await renderSettings(); return; }
      case 'stcreate': await G.lock.createNow(); await renderSettings(); return;
      case 'stbio': G.toast((await G.lock.enableBio()) ? 'Huella activada' : 'No se pudo activar la huella'); return renderSettings();
      case 'stbiooff': G.lock.disableBio(); return renderSettings();
      case 'stlockoff': if (await G.confirmBox('¿Quitar el bloqueo de la app?', { danger: true, ok: 'Quitar' })) { G.lock.remove(); renderSettings(); } return;
      case 'nitsx': { const b = new Blob([JSON.stringify(N.profile())], { type: 'application/json' }); G.download(b, `NITS_perfil_${G.stamp()}.json`); return; }
      case 'nitsi': return pickFile('.json', async f => { await N.setProfile(JSON.parse(await f.text())); G.toast('Perfil de NITS importado'); renderSettings(); });
      case 'nitsr': if (await G.confirmBox('NITS olvidará tus correcciones, frases y barrios. ¿Continuar?', { danger: true, ok: 'Olvidar' })) { await N.reset(); renderSettings(); } return;
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.cg) { const [grp, key] = t.dataset.cg.split(':'); const root = grp === 't' ? S.visit.territory : S.visit.management; root[key] = $$(`[data-cg="${t.dataset.cg}"]:checked`).map(x => x.value); A.save(); return; }
    if (t.id === 'rfCd') { S.reg.cd = t.value; renderVisit(); } else if (t.id === 'rfSt') { S.reg.st = t.value; renderVisit(); }
    else if (t.id === 'stAuto') G.lock.setAuto(+t.value);
    else if (t.id === 'stLoc') G.settings.set({ locFmt: t.value });
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'terObs') { S.visit.territoryObs = t.value; A.save(); } else if (t.id === 'mgObs') { S.visit.management.obs = t.value; A.save(); } else if (t.id === 'mgNext') { S.visit.management.nextAction = t.value; A.save(); }
    else if (t.id === 'rfQ') { S.reg.q = t.value; clearTimeout(A._q); A._q = setTimeout(() => { renderVisit(); const q = $('#rfQ'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
    else if (t.id === 'stSede') G.settings.set({ sede: G.upperAlnum(t.value) }); else if (t.id === 'stMun') G.settings.set({ municipio: G.upperAlnum(t.value) }); else if (t.id === 'stAutor') G.settings.set({ autor: t.value });
  });

  /* ================= arranque ================= */
  async function init() {
    try {
      await db.open(); applyTheme(); await N.load(); await G.lock.init(); await renderHome(); show('home'); renderTop();
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
    } catch (e) { document.body.insertAdjacentHTML('beforeend', `<pre style="padding:16px;color:#BA1A1A">No se pudo iniciar la app: ${esc(e.message)}</pre>`); console.error(e); }
  }
  A.init = init;
  window.addEventListener('DOMContentLoaded', init);
})(window.GS);
