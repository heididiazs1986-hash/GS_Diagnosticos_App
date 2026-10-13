/* util.js · utilidades, iconos, hojas modales, GPS, imágenes, ZIP */
window.GS = window.GS || {};
(function (G) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const z = n => String(n).padStart(2, '0');
  const dateLocal = (d = new Date()) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  const timeLocal = (d = new Date()) => `${z(d.getHours())}:${z(d.getMinutes())}`;
  const stamp = (d = new Date()) => `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}`;
  const fmtDate = s => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
  const fmtTimeISO = iso => { try { return timeLocal(new Date(iso)); } catch { return ''; } };
  const onlyDigits = s => String(s || '').replace(/\D+/g, '');
  const upperAlnum = s => String(s || '').toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÜÑ\-\/ .,#°]/g, '').replace(/\s+/g, ' ').trim();
  const upperCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const upperText = s => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const safeName = s => String(s || '').trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  const joinNatural = a => !a.length ? '' : a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' Y ' + a.at(-1);

  /* ---------- iconos ---------- */
  const P = {
    plus: '<path d="M5 12h14M12 5v14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
    chev: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>', back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    finger: '<path d="M12 11a3 3 0 0 0-3 3c0 2 .4 3.6 1.4 5.4M12 7a7 7 0 0 0-7 7c0 1.6.2 2.9.6 4M12 3a11 11 0 0 1 9 11c0 1.3-.1 2.4-.4 3.4M15 14c0 2.6-.5 4.2-1.5 6M5.5 8A9 9 0 0 1 12 3M19 7A9 9 0 0 0 12 3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    download: '<path d="M12 15V3M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5"/>',
    upload: '<path d="M12 15V3M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5"/>',
    sliders: '<path d="M10 5H3M12 19H3M14 3v4M16 17v4M21 12h-9M21 19h-5M21 5h-7M8 10v4M8 12H3"/>',
    spark: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>',
    mic: '<rect width="6" height="12" x="9" y="2" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
    bell: '<path d="M10.3 21a2 2 0 0 0 3.4 0M3.3 15.3A1 1 0 0 0 4 17h16a1 1 0 0 0 .7-1.7C19.4 14 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.4 6-2.7 7.3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
    lot: '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3.5 3.5"/>',
    pole: '<path d="M12 2v20M4 7h16M7 7v3M17 7v3M8 22h8"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3zM12 9v4M12 17h.01"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>'
  };
  const icon = (n, size) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"${size ? ` style="font-size:${size}px"` : ''}>${P[n] || ''}</svg>`;
  const hydrate = (root = document) => $$('[data-i]', root).forEach(el => { if (!el.dataset.ih) { el.insertAdjacentHTML('afterbegin', icon(el.dataset.i)); el.dataset.ih = 1; } });

  /* ---------- toast ---------- */
  let tt;
  const toast = msg => { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- hojas (modales) ---------- */
  const stack = [];
  function sheet({ title, body, footer, onMount, onClose, beforeClose }) {
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-h"><h2>${esc(title || '')}</h2><button class="iconbtn" data-x aria-label="Cerrar">${icon('x')}</button></div><div class="sheet-b">${body || ''}</div>${footer ? `<div class="sheet-f">${footer}</div>` : ''}</div>`;
    document.body.appendChild(scrim);
    const api = { el: scrim, body: $('.sheet-b', scrim), foot: $('.sheet-f', scrim), closed: false,
      async close(force) { if (api.closed) return; if (!force && beforeClose && (await beforeClose()) === false) return; api.closed = true; scrim.remove(); stack.splice(stack.indexOf(api), 1); onClose && onClose(); },
      setTitle(t) { $('h2', scrim).textContent = t; } };
    $('[data-x]', scrim).onclick = () => api.close();
    scrim.addEventListener('mousedown', e => { if (e.target === scrim) api.close(); });
    stack.push(api); hydrate(scrim); onMount && onMount(api);
    return api;
  }
  function confirmBox(msg, { ok = 'Aceptar', cancel = 'Cancelar', danger = false, title = '' } = {}) {
    return new Promise(res => {
      const s = sheet({ title: title || 'Confirma', body: `<p style="margin:0;font-size:15.5px">${esc(msg).replace(/\n/g, '<br>')}</p>`,
        footer: `<button class="btn" data-c>${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-o>${esc(ok)}</button>`,
        onClose: () => res(false) });
      $('[data-c]', s.el).onclick = () => { res(false); s.close(true); };
      $('[data-o]', s.el).onclick = () => { res(true); s.close(true); };
    });
  }
  /* elegir entre varias opciones */
  function choose(title, options) {
    return new Promise(res => {
      const s = sheet({ title, body: options.map((o, i) => `<button class="out ${o.primary ? 'p' : ''}" data-k="${i}">${o.icon ? `<span class="ic2">${icon(o.icon)}</span>` : ''}<span><b>${esc(o.label)}</b>${o.sub ? `<span class="s">${esc(o.sub)}</span>` : ''}</span></button>`).join(''),
        onClose: () => res(null) });
      $$('[data-k]', s.el).forEach(b => b.onclick = () => { res(options[+b.dataset.k].value); s.close(true); });
    });
  }

  /* ---------- GPS ---------- */
  function gps({ timeout = 12000, target = 12, onProgress } = {}) {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error('Este dispositivo no tiene GPS disponible'));
      let best = null, done = false, wid, t;
      const fin = () => { if (done) return; done = true; try { navigator.geolocation.clearWatch(wid); } catch { } clearTimeout(t); best ? res(best) : rej(new Error('Sin señal GPS. Sal a cielo abierto e intenta de nuevo')); };
      t = setTimeout(fin, timeout);
      wid = navigator.geolocation.watchPosition(p => {
        const c = p.coords;
        if (!best || c.accuracy < best.acc) best = { lat: +c.latitude.toFixed(7), lon: +c.longitude.toFixed(7), acc: Math.round(c.accuracy), ts: new Date().toISOString() };
        onProgress && onProgress(best);
        if (best.acc <= target) fin();
      }, () => fin(), { enableHighAccuracy: true, maximumAge: 0, timeout });
    });
  }
  const haversine = (a, b, c, d) => {
    const R = 6371000, r = x => x * Math.PI / 180, dLa = r(c - a), dLo = r(d - b);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  /* ---------- imágenes ---------- */
  const fileToDataURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function compress(file, max = 1280, q = 0.72) {
    const img = await loadImg(await fileToDataURL(file));
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    return { id: uid(), dataURL: c.toDataURL('image/jpeg', q), caption: '' };
  }
  const dataURLtoU8 = d => { const b = atob(d.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

  /* editor de marcas sobre la foto (rayar) */
  function editPhoto(photo) {
    return new Promise(async res => {
      const img = await loadImg(photo.dataURL);
      const s = sheet({ title: 'Marcar foto', body: `<canvas id="edc" style="width:100%;border-radius:10px;touch-action:none;background:#000"></canvas><div class="row"><span class="l" style="margin:0">Grosor</span><input type="range" id="edw" min="3" max="18" value="7" style="flex:1"></div>`,
        footer: `<button class="btn" data-u>Deshacer todo</button><button class="btn primary" data-s>Guardar</button>`, onClose: () => res(null) });
      const c = $('#edc', s.el), ctx = c.getContext('2d'); c.width = img.width; c.height = img.height; ctx.drawImage(img, 0, 0);
      let down = false, last;
      const pos = e => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height }; };
      c.onpointerdown = e => { down = true; last = pos(e); c.setPointerCapture(e.pointerId); };
      c.onpointermove = e => { if (!down) return; const q = pos(e); ctx.strokeStyle = '#FF2D2D'; ctx.lineWidth = +$('#edw', s.el).value * c.width / 600; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(q.x, q.y); ctx.stroke(); last = q; };
      c.onpointerup = () => down = false;
      $('[data-u]', s.el).onclick = () => ctx.drawImage(img, 0, 0);
      $('[data-s]', s.el).onclick = () => { photo.dataURL = c.toDataURL('image/jpeg', .78); res(photo); s.close(true); };
    });
  }

  /* ---------- dictado ---------- */
  let rec = null;
  function dictate(ta, btn) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('El dictado no está disponible en este navegador');
    if (rec) { rec.stop(); return; }
    const r = rec = new SR(); r.lang = 'es-CO'; r.continuous = true; r.interimResults = false;
    r.onstart = () => { btn && btn.classList.add('live'); toast('Escuchando… toca de nuevo para parar'); };
    r.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) { ta.value = (ta.value ? ta.value + ' ' : '') + e.results[i][0].transcript.trim(); ta.dispatchEvent(new Event('input', { bubbles: true })); } };
    r.onerror = () => toast('No fue posible usar el dictado');
    r.onend = () => { rec = null; btn && btn.classList.remove('live'); };
    r.start();
  }
  const dictField = (id, value = '', ph = '') => `<div class="dict"><textarea id="${id}" placeholder="${esc(ph)}">${esc(value)}</textarea><button type="button" class="mic" data-mic="${id}" aria-label="Dictar">${icon('mic')}</button></div>`;
  document.addEventListener('click', e => { const b = e.target.closest('[data-mic]'); if (b) { const ta = document.getElementById(b.dataset.mic); ta && dictate(ta, b); } });

  /* ---------- descarga / compartir ---------- */
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); }
  async function shareFile(blob, name) {
    try { const f = new File([blob], name, { type: blob.type }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return true; } } catch (e) { if (e.name === 'AbortError') return true; }
    return false;
  }

  /* ---------- ZIP (sin compresión) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function makeZip(files) { // files: [{name, data:Uint8Array}]
    const enc = new TextEncoder(), parts = [], cent = []; let off = 0;
    const dt = new Date(), dosT = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1), dosD = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
    for (const f of files) {
      const nm = enc.encode(f.name.replace(/\\/g, '/')), crc = crc32(f.data), sz = f.data.length;
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, dosT, true); lh.setUint16(12, dosD, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nm, f.data);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dosT, true); ch.setUint16(14, dosD, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
      cent.push(new Uint8Array(ch.buffer), nm);
      off += 30 + nm.length + sz;
    }
    const cl = cent.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cl, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...cent, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  Object.assign(G, { $, $$, esc, uid, dateLocal, timeLocal, stamp, fmtDate, fmtTimeISO, onlyDigits, upperAlnum, upperCode, upperText, safeName, joinNatural,
    icon, hydrate, toast, sheet, confirmBox, choose, gps, haversine, compress, loadImg, dataURLtoU8, editPhoto, dictate, dictField, download, shareFile, makeZip });
})(window.GS);
