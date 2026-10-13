/* nits.js · NITS unificado: redacta, clasifica, sugiere el estado del CD y APRENDE de tus correcciones.
   Aprendizaje 100 % local (reglas adaptativas, no un modelo entrenado): vive en este dispositivo y se puede exportar. */
(function (G) {
  const { C, upperText } = G;
  const N = {};
  let P = null, saveT;
  const blank = () => ({ v: 1, stats: { corr: 0, cat: 0, state: 0, saved: 0 }, kw: {}, phrases: {}, rep: {}, condState: {}, barrios: {}, recent: [] });
  N.load = async () => { P = (await G.db.meta('nits_profile')) || blank(); P = { ...blank(), ...P }; return P; };
  N.profile = () => P || blank();
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => G.db.setMeta('nits_profile', P), 400); };
  N.setProfile = async p => { P = { ...blank(), ...p }; await G.db.setMeta('nits_profile', P); };
  N.reset = async () => { P = blank(); await G.db.setMeta('nits_profile', P); };
  N.summary = () => { const p = N.profile(); return { correcciones: p.stats.corr, categorias: p.stats.cat, estados: p.stats.state, palabras: Object.keys(p.kw).length, frases: Object.keys(p.phrases).length, reemplazos: Object.values(p.rep).filter(m => Object.values(m).some(n => n >= 2)).length, barrios: Object.keys(p.barrios).length }; };

  /* ---------- texto ---------- */
  const STOP = new Set('para como pero porque cuando donde esto esta este esos estas desde hasta entre sobre tiene tienen hay del los las una unos unas por con sin que muy más mas ser fue son está están también tambien'.split(' '));
  const toks = s => (String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zñ0-9]{4,}/g) || []).filter(w => !STOP.has(w));
  const words = s => String(s || '').trim().split(/\s+/).filter(Boolean);
  const lc = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  N.smartText = (s = '') => String(s || '').trim().replace(/\b(mt|bt|cd|unc|jac|gps|kva|enel|inmel|dps|upz)\b/gi, m => m.toUpperCase()).replace(/(^|[.!?]\s+)([a-záéíóúüñ])/g, (m, p, c) => p + c.toUpperCase());
  N.improve = (t = '') => { let s = String(t).trim().replace(/\s+/g, ' ').replace(/\.{2,}/g, '.'); if (!s) return ''; s = cap(s); s = N.applyRep(s); return /[.!?]$/.test(s) ? s : s + '.'; };
  const listSentence = a => { a = (a || []).filter(Boolean).map(x => x.toLowerCase()); return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a.at(-1); };
  N.listSentence = listSentence;

  /* reemplazos aprendidos (misma corrección ≥ 2 veces) */
  N.applyRep = s => {
    const rep = N.profile().rep; let out = s;
    for (const [from, m] of Object.entries(rep)) {
      const best = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] >= 2) out = out.replace(new RegExp('(?<![\\p{L}\\p{N}])' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}])', 'giu'), best[0]);
    }
    return out;
  };
  /* tono de campo (MAYÚSCULAS) */
  N.field = s => upperText(N.applyRep(String(s || '')));

  /* ---------- aprendizaje ---------- */
  N.learnText = (ctx, generated, final) => {
    if (!P) return; generated = (generated || '').trim(); final = (final || '').trim();
    if (!final) return;
    N.learnPhrases(final);
    if (generated && generated !== final) {
      P.stats.corr++;
      P.recent.unshift({ ctx, from: generated.slice(0, 400), to: final.slice(0, 400), ts: Date.now() }); P.recent.length = Math.min(P.recent.length, 40);
      const norm = w => w.replace(/[.,;:]+$/g, ''), a = words(generated).map(norm), b = words(final).map(norm);
      let i = 0; while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++;
      let ja = a.length, jb = b.length; while (ja > i && jb > i && a[ja - 1].toLowerCase() === b[jb - 1].toLowerCase()) { ja--; jb--; }
      const from = a.slice(i, ja).join(' '), to = b.slice(i, jb).join(' ');
      if (from && to && from.length > 2 && ja - i <= 3 && jb - i <= 4) { const m = (P.rep[from] = P.rep[from] || {}); m[to] = (m[to] || 0) + 1; }
    }
    persist();
  };
  N.learnPhrases = text => {
    if (!P) return; const w = words(String(text).toLowerCase().replace(/[.,;:()]/g, ' ')).filter(x => x.length > 1);
    for (const n of [2, 3, 4]) for (let i = 0; i + n <= w.length; i++) { const ph = w.slice(i, i + n).join(' '); if (ph.length < 9) continue; P.phrases[ph] = (P.phrases[ph] || 0) + 1; }
    const ks = Object.keys(P.phrases); if (ks.length > 900) { ks.sort((a, b) => P.phrases[a] - P.phrases[b]).slice(0, 250).forEach(k => delete P.phrases[k]); }
    persist();
  };
  N.learnCategory = (text, cat, predicted) => {
    if (!P || !cat) return; const wgt = predicted && predicted !== cat ? 3 : 1;
    toks(text).forEach(t => { const m = (P.kw[t] = P.kw[t] || {}); m[cat] = (m[cat] || 0) + wgt; });
    if (predicted && predicted !== cat) P.stats.cat++;
    const ks = Object.keys(P.kw); if (ks.length > 1500) ks.slice(0, 300).forEach(k => delete P.kw[k]);
    persist();
  };
  N.learnBarrio = (loc, barrio) => { if (!P || !barrio) return; const k = loc + '|' + barrio.trim(); P.barrios[k] = (P.barrios[k] || 0) + 1; persist(); };
  N.barrios = loc => Object.entries(N.profile().barrios).filter(([k]) => k.startsWith(loc + '|')).sort((a, b) => b[1] - a[1]).map(([k]) => k.split('|')[1]);
  /* autocompletar con tus frases habituales */
  N.suggest = (text) => {
    const p = N.profile().phrases; if (!text) return [];
    const lowerAll = text.toLowerCase(); const w = words(lowerAll); if (!w.length) return [];
    const endsSpace = /\s$/.test(text); const last = endsSpace ? '' : w.at(-1); const prev = endsSpace ? w : w.slice(0, -1);
    const out = [];
    for (const [ph, n] of Object.entries(p)) {
      if (n < 2) continue; const pw = ph.split(' ');
      for (let k = Math.min(2, prev.length); k >= 0; k--) {
        const ctxw = prev.slice(prev.length - k);
        if (ctxw.join(' ') === pw.slice(0, k).join(' ') && pw.length > k && pw[k].startsWith(last) && (k > 0 || last.length >= 2) && pw.slice(k).join(' ') !== last) { out.push({ add: (last ? pw[k].slice(last.length) + ' ' : pw[k] + ' ') + pw.slice(k + 1).join(' '), full: pw.slice(k).join(' '), n: n * (k + 1) }); break; }
      }
    }
    const seen = new Set(); return out.sort((a, b) => b.n - a.n).filter(o => !seen.has(o.full) && seen.add(o.full)).slice(0, 3);
  };

  /* ---------- clasificación de hallazgos ---------- */
  const RX = [
    ['Acceso y movilidad', /v[ií]a|acceso|placa huella|barro|piedra|banca|carretera|camino|sendero|veh[ií]culo|moto|a pie|trocha|pendiente|calle|andén|anden/],
    ['Predial', /predio|propiedad|posesi[oó]n|invasi[oó]n|lote|escritura|titular|fiscal|due[ñn]o|arrendat|ocupaci[oó]n/],
    ['Ambiental / Riesgo no eléctrico', /desliz|inund|erosi[oó]n|ronda h[ií]drica|quebrada|ambient|reserva|remoci[oó]n|geol[oó]g|roca|canal|r[ií]o/],
    ['Institucional', /alcald[ií]a|planeaci[oó]n|entidad|instituci[oó]n|enel|inmel|redes|secretar[ií]a|curadur/],
    ['Documental', /document|certificado|c[eé]dula|recibo t[eé]cnico|carpeta|formato|firma/],
    ['Social / Población prioritaria', /ind[ií]gen|afro|migrante|v[ií]ctima|discapacidad|tecnodepend|adulto mayor|ni[ñn]|embarazad|oxigeno/],
    ['Infraestructura eléctrica', /transformador|poste|cable|empalme|luminaria|medidor|cortocircuito|conductor|acometida|\bcd\b/],
    ['Seguridad / Orden público', /orden p[uú]blico|robo|inseguridad|amenaza|ri[ñn]a|pandill|hurto|agresi[oó]n/]
  ];
  N.classify = (text = '') => {
    const t = text.toLowerCase(); const score = {};
    RX.forEach(([c, r]) => { const m = t.match(new RegExp(r.source, 'g')); if (m) score[c] = (score[c] || 0) + 2 * Math.min(m.length, 3); });
    const kw = N.profile().kw; toks(text).forEach(w => { const m = kw[w]; if (m) for (const [c, n] of Object.entries(m)) score[c] = (score[c] || 0) + Math.min(n, 6) * 1.2; });
    const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const category = ranked[0] || 'Social / Comunitario';
    return { category, ranked: ranked.length ? ranked.slice(0, 3) : [category], text: N.narrate(text, category) };
  };
  N.narrate = (text, category) => {
    let s = String(text || '').trim().replace(/\s+/g, ' '); if (!s) return 'Hallazgo soportado mediante registro fotográfico.';
    s = cap(s).replace(/\b(dicen|dice)\b/gi, 'manifestó');
    if (category === 'Acceso y movilidad' && !/^Durante/.test(s)) s = 'Durante el recorrido se identificó que ' + lc(s);
    else if (category === 'Predial' && !/^Se /.test(s)) s = 'Se registró que ' + lc(s);
    else if (category.startsWith('Ambiental') && !/^Se /.test(s)) s = 'Se identificó que ' + lc(s);
    s = /[.!?]$/.test(s) ? s : s + '.';
    return N.applyRep(s);
  };

  /* ---------- estado del CD con razones ---------- */
  const CRIT = ['Fugas de aceite', 'Ruido anormal', 'Conductores deteriorados', 'Riesgo de contacto', 'Requiere mantenimiento correctivo', 'Requiere reemplazo', 'Base socavada', 'Construcción artesanal'];
  const MED = ['Requiere mantenimiento preventivo', 'Empalmes visibles', 'Flecha excesiva', 'Baja altura', 'Vegetación cercana', 'Cruce por predios privados', 'Construcción parcialmente normalizada', 'Requiere extensión BT', 'Requiere normalización', 'Inclinados', 'Fisuras', 'Corrosión'];
  const LV = { Favorable: 0, Medio: 1, 'Crítico': 2 }, NM = ['Favorable', 'Medio', 'Crítico'];
  const condsOf = c => [...(c.networkState || []), ...(c.poleState || []), ...(c.transformerState || []), ...(c.construction || []), ...(c.coverage || [])];
  N.suggestState = c => {
    const all = condsOf(c), reasons = []; let lvl = 0;
    if (!all.length) return { state: '', reasons: ['Marca el estado de redes, postes o transformador para que NITS pueda evaluar.'] };
    const learned = N.profile().condState;
    const lv = x => { let base = CRIT.includes(x) ? 2 : MED.includes(x) ? 1 : 0; const L = learned[x]; if (L) { const tot = L.Favorable + L.Medio + L['Crítico']; if (tot >= 3) { const best = NM.map(s => [s, L[s]]).sort((a, b) => b[1] - a[1])[0]; if (best[1] / tot >= 0.7 && LV[best[0]] !== base) { reasons.push(`Antes ajustaste «${x}» hacia ${best[0]} (${best[1]} de ${tot} veces).`); return LV[best[0]]; } } } return base; };
    const hits = all.map(x => [x, lv(x)]);
    const crit = hits.filter(h => h[1] === 2).map(h => h[0]), med = hits.filter(h => h[1] === 1).map(h => h[0]);
    if (crit.length) { lvl = 2; reasons.unshift('Condición crítica: ' + crit.join(', ') + '.'); }
    if (med.length) { lvl = Math.max(lvl, 1); reasons.push('Requiere seguimiento: ' + med.join(', ') + '.'); }
    if (c.property && c.property !== 'ENEL') { if (lvl < 1) lvl = 1; reasons.push(`La propiedad del CD es «${c.property}», no ENEL: el máximo posible es Medio.`); if (lvl === 2 && !crit.length) lvl = 1; }
    if (!crit.length && !med.length && (!c.property || c.property === 'ENEL')) reasons.push('Sin condiciones críticas ni de seguimiento marcadas, y la infraestructura es ENEL.');
    return { state: NM[lvl], reasons };
  };
  N.learnState = (c, finalState) => {
    if (!P || !finalState) return; const sug = N.suggestState(c).state; if (sug && sug !== finalState) P.stats.state++;
    condsOf(c).forEach(x => { const o = (P.condState[x] = P.condState[x] || { Favorable: 0, Medio: 0, 'Crítico': 0 }); o[finalState]++; });
    persist();
  };

  /* ---------- redacción de infraestructura / territorio / informe ---------- */
  N.describeInfra = c => {
    const parts = [];
    if (c.mt?.length && !c.mt.includes('No aplica')) parts.push(`La red de media tensión presenta configuración ${listSentence(c.mt.filter(x => !x.startsWith('No ')).map(x => x.replace(/^MT /, '')))}`);
    if (c.bt?.length && !c.bt.includes('No aplica')) parts.push(`la red de baja tensión es ${listSentence(c.bt.filter(x => !x.startsWith('No ')).map(x => x.replace(/^BT /, '')))}`);
    if (c.poleType?.length) parts.push(`se encuentra soportada en postería de ${listSentence(c.poleType)}`);
    if (c.equipment?.length && !c.equipment.includes('No se identifican')) parts.push(`se identificaron ${listSentence(c.equipment)}`);
    if (c.networkState?.length) parts.push(`respecto al estado de las redes, se observaron condiciones como ${listSentence(c.networkState)}`);
    if (c.poleState?.length) parts.push(`la postería presenta ${listSentence(c.poleState)}`);
    if (c.transformerState?.length) parts.push(`el transformador presenta ${listSentence(c.transformerState)}`);
    if (c.construction?.length) parts.push(`la condición constructiva corresponde a ${listSentence(c.construction)}`);
    if (c.coverage?.length) parts.push(`en materia de cobertura e intervención, se identificó ${listSentence(c.coverage)}`);
    let out = parts.map(cap).join('. '); if (c.obs) out += (out ? '. ' : '') + N.improve(c.obs);
    return out ? out.replace(/\bmt\b/gi, 'MT').replace(/\bbt\b/gi, 'BT').replace(/\.?$/, '.') : 'No se registró información técnica suficiente para describir la infraestructura.';
  };
  N.territory = v => {
    const t = v.territory || {}, parts = [];
    if (t.community?.length) parts.push(`La comunidad presenta características como ${listSentence(t.community)}`);
    if (t.priority?.length) parts.push(`se identificaron grupos de atención prioritaria, entre ellos ${listSentence(t.priority)}`);
    if (t.property?.length) parts.push(`en relación con la ocupación y la propiedad del suelo, se registraron condiciones de ${listSentence(t.property)}`);
    if (t.risks?.length) parts.push(`el territorio presenta factores de riesgo no eléctrico asociados a ${listSentence(t.risks)}`);
    if (t.access?.length) parts.push(`el acceso se realiza mediante ${listSentence(t.access)}`);
    if (t.road?.length) parts.push(`las vías presentan ${listSentence(t.road)}`);
    let s = parts.map(cap).join('. '); if (v.territoryObs) s += (s ? '. ' : '') + N.improve(v.territoryObs);
    return s ? s.replace(/\.?$/, '.') : 'No se registraron elementos suficientes para elaborar una caracterización general del territorio.';
  };
  N.management = v => {
    const m = v.management || {}, parts = [];
    if (m.topics?.length) parts.push(`Durante la gestión social se abordaron temas relacionados con ${listSentence(m.topics)}`);
    if (m.obs) parts.push(N.improve(m.obs));
    if (m.nextAction) parts.push(`Como próxima gestión prevista se registró: ${m.nextAction}`);
    return parts.length ? parts.join('. ').replace(/\.\./g, '.').replace(/\.?$/, '.') : 'No se registró una jornada formal de socialización o reunión con la comunidad.';
  };
  N.energy = a => (a.unc + a.susp) * 150;
  const mode = arr => { const m = {}; arr.filter(Boolean).forEach(x => m[x] = (m[x] || 0) + 1); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0]; };
  N.visitPlace = v => { const locs = [...new Set((v.areas || []).map(a => a.localidad).filter(Boolean))]; return locs.length ? locs.join(', ') : v.localidad || ''; };
  N.objective = (v, a) => {
    const acts = [];
    if (v.cds?.length) acts.push('reconocimiento general de la infraestructura eléctrica');
    if (v.management?.meeting === 'Sí' || v.management?.topics?.length) acts.push('gestión y socialización con la comunidad');
    if (v.findings?.length) acts.push('identificación de condiciones sociales y territoriales');
    if (!acts.length) acts.push('reconocimiento preliminar del territorio');
    const loc = N.visitPlace(v);
    return `Se realizó visita de Gestión Social en ${loc ? 'la localidad de ' + loc + ', ' : ''}Bogotá D. C., con el propósito de efectuar ${listSentence(acts)}. El recorrido comprendió ${v.areas?.length || 'las'} área(s), cuya información fue organizada para apoyar la toma de decisiones y las gestiones posteriores.`;
  };
  N.conclusion = (v, a) => {
    const states = (v.cds || []).map(c => c.validatedState || c.suggestedState), parts = [];
    if (v.cds?.length) parts.push(`Se identificaron ${v.cds.length} Centro(s) de Distribución, con predominio de clasificación ${mode(states) || 'no evaluada'}`);
    if (a.unc + a.susp) parts.push(`se registró un universo potencial de ${a.unc + a.susp} usuarios entre UNC y predios para suspensión`);
    if (a.clients) parts.push(`se caracterizaron ${a.clients} cliente(s) con medidor`);
    if (v.findings?.length) parts.push(`los hallazgos sociales y territoriales se concentraron en ${[...new Set(v.findings.map(f => f.category))].join(', ')}`);
    const open = (v.pendings || []).filter(p => !['Cumplido', 'Cerrado'].includes(p.status)).length;
    if (v.pendings?.length) parts.push(`quedaron ${open} pendientes abiertos o en seguimiento`);
    return parts.length ? parts.join('. ') + '.' : 'La información recopilada constituye una base preliminar para definir las gestiones posteriores en el territorio.';
  };
  N.recommendation = v => {
    const rec = [];
    if ((v.cds || []).some(c => ['Crítico', 'Medio'].includes(c.validatedState || c.suggestedState))) rec.push('realizar la revisión técnica de los CD que presentan requerimientos de intervención o validación');
    if ((v.pendings || []).some(p => p.responsible === 'ENEL' || p.responsible === 'Redes')) rec.push('dar seguimiento institucional a las gestiones pendientes asignadas a ENEL o al componente de Redes');
    if (v.management?.nextAction) rec.push(v.management.nextAction.toLowerCase());
    if ((v.findings || []).some(f => f.category === 'Predial')) rec.push('validar las condiciones prediales antes de avanzar con actuaciones que requieran soporte documental');
    return rec.length ? `Se recomienda ${listSentence(rec)}.` : 'Se recomienda conservar el seguimiento del territorio y actualizar la información cuando se realicen nuevas visitas.';
  };
  N.glossaryFor = v => { const txt = JSON.stringify(v).toLowerCase(); return Object.entries(C.glossary).filter(([k]) => txt.includes(k.toLowerCase()) || ['UNC', 'BT', 'MT', 'CD', 'Favorable', 'Medio'].includes(k)); };

  /* ---------- observaciones de campo por tipo de registro (MAYÚSCULAS, formato DX) ---------- */
  const J = G.joinNatural;
  N.obsFor = (type, d) => {
    const pf = d.PuntoFisico, f = [];
    if (type === 'U') {
      const docs = C.UNC_DOCS.filter(x => d[x[0]] === 'Sí').map(x => x[2]), req = C.UNC_REQ.filter(x => d[x[0]] === 'Sí').map(x => x[2]);
      f.push(`DURANTE LA VISITA SE CARACTERIZA USUARIO NO CLIENTE${pf ? ' ASOCIADO AL PUNTO FÍSICO ' + pf : ''}.`);
      if (d.Estado) f.push(`CONDICIÓN IDENTIFICADA: ${d.Estado}.`);
      if (d.TipoZona || d.TipoMaterial) f.push(`EL PREDIO SE UBICA EN ZONA ${d.TipoZona || 'NO REPORTADA'} Y PRESENTA MATERIALIDAD ${d.TipoMaterial || 'NO REPORTADA'}.`);
      f.push(d.Habitable ? 'SE EVIDENCIA PREDIO HABITABLE.' : 'NO SE MARCA PREDIO HABITABLE DURANTE EL REGISTRO.');
      if (d.DocPropiedad) f.push(`DOCUMENTO DE SOPORTE REPORTADO: ${d.DocPropiedad}.`);
      if (docs.length) f.push(`DOCUMENTOS REQUERIDOS: ${J(docs)}.`);
      if (req.length) f.push(`SEGÚN REVISIÓN DE NORMA TÉCNICA, SE REQUIERE ${J(req)}.`);
    } else if (type === 'C') {
      const est = d.EstadoMedidor ? d.EstadoMedidor.split('; ').filter(Boolean) : [];
      f.push(`DURANTE LA VISITA SE REGISTRA CLIENTE${pf ? ' ASOCIADO AL PUNTO FÍSICO ' + pf : ''}${d.SerieMedidor ? ', CON MEDIDOR SERIE ' + d.SerieMedidor : ''}.`);
      if (d.MarcaMedidor || d.Fases) f.push(`MEDIDOR ${d.MarcaMedidor || 'SIN MARCA REPORTADA'} DE CONFIGURACIÓN ${d.Fases || 'NO REPORTADA'}.`);
      if (est.length) f.push(`ESTADO DE MEDIDOR: ${J(est)}.`);
      if (d.ReqInspeccion === 'Sí') f.push('SE REQUIERE INSPECCIÓN Y/O CAMBIO DEL EQUIPO DE MEDIDA, SEGÚN CONDICIÓN REGISTRADA EN CAMPO.');
      else if (est.length) f.push('NO SE MARCA REQUERIMIENTO DE INSPECCIÓN O CAMBIO AL MOMENTO DEL REGISTRO.');
    } else if (type === 'S') {
      f.push(`DURANTE LA VISITA SE REGISTRA PREDIO PARA GESTIÓN DE SUSPENSIÓN${pf ? ' ASOCIADO AL PUNTO FÍSICO ' + pf : ''}.`);
      if (d.Motivo) f.push(`MOTIVO REPORTADO: ${d.Motivo}.`);
      if (d.LongitudNodo) f.push(`LONGITUD APROXIMADA AL NODO AMARRADO: ${d.LongitudNodo} M.`);
      f.push('SE DEJA REGISTRO FOTOGRÁFICO Y GEOREFERENCIADO COMO SOPORTE DE LA GESTIÓN EN CAMPO.');
    } else if (type === 'B') {
      f.push(`DURANTE LA VISITA SE REGISTRA PREDIO BALDÍO O SIN HABITABILIDAD PLENA${pf ? ' ASOCIADO AL PUNTO FÍSICO ' + pf : ''}.`);
      if (d.Estado) f.push(`CONDICIÓN IDENTIFICADA: ${d.Estado}.`);
      if (d.LongitudNodo) f.push(`LONGITUD APROXIMADA AL NODO AMARRADO: ${d.LongitudNodo} M.`);
      f.push('SE CONSERVA EVIDENCIA FOTOGRÁFICA Y COORDENADA PARA TRAZABILIDAD DEL DIAGNÓSTICO.');
    } else if (type === 'E') {
      f.push(`ESTRUCTURA ${d.TipoNodo || ''} ${d.MaterialNodo || ''} ${d.CaracteristicasNodo || ''}${pf ? ', PUNTO FÍSICO ' + pf : ''}.`.replace(/\s+/g, ' ').replace(' ,', ','));
      if (d.TipoRedBT) f.push(`RED BT ${String(d.TipoRedBT).toUpperCase()}.`);
      if (+d.Luminarias > 0) f.push(`${d.Luminarias} LUMINARIA(S) DE ALUMBRADO PÚBLICO.`);
    }
    return N.field(f.join(' '));
  };
  G.nits = N;
})(window.GS);
