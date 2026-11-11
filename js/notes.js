/* notes.js · Notas rápidas: un bloc siempre a mano (botón flotante). Local, sin conexión, no se pierde. */
(function (G) {
  const { $, $$, esc, icon, db, toast, sheet, confirmBox } = G;
  const KEY = 'notes', DKEY = 'notes_draft';
  const uid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const load = async () => (await db.meta(KEY, [])) || [];
  const save = list => db.setMeta(KEY, list);
  const fmt = iso => { const d = new Date(iso), t = new Date(); const hm = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }); return d.toDateString() === t.toDateString() ? 'Hoy ' + hm : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) + ' ' + hm; };
  const visitTag = () => { try { const v = G.app && G.app.visit && G.app.visit(); if (!v) return null; const n = G.nits && G.nits.visitPlace && G.nits.visitPlace(v); return { id: v.id, label: n || v.localidad || 'Visita' }; } catch { return null; } };
  const copy = async txt => { try { await navigator.clipboard.writeText(txt); } catch { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch { } ta.remove(); } };
  const sendTxt = txt => { if (navigator.share) navigator.share({ text: txt }).catch(() => { }); else window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank'); };

  async function addNote(text) {
    text = (text || '').trim(); if (!text) return false;
    const list = await load(), tag = visitTag(), now = new Date().toISOString();
    list.push({ id: uid(), text, pinned: false, createdAt: now, updatedAt: now, visitId: tag && tag.id, visitLabel: tag && tag.label });
    await save(list); refreshBadge(); return true;
  }
  async function patch(id, fn) { const list = await load(), n = list.find(x => x.id === id); if (!n) return; fn(n); n.updatedAt = new Date().toISOString(); await save(list); }

  async function open() {
    if ($('.scrim .notes-sheet')) return;
    let q = '', saved = false, root = null;
    const draft0 = await db.meta(DKEY, '') || '';
    sheet({
      title: 'Notas rápidas',
      body: `<div class="notes-sheet">
        <div class="dict"><textarea id="nt-new" rows="3" placeholder="Anota aquí: teléfono, dirección, nombre del líder, lo que te dijeron…">${esc(draft0)}</textarea><button type="button" class="mic" data-mic="nt-new" aria-label="Dictar">${icon('mic')}</button></div>
        <button class="btn primary block" id="nt-save">${icon('plus')} Guardar nota</button>
        <div class="muted small" style="margin:-4px 2px 0">Se guarda en este teléfono y funciona sin internet. Lo que escribas queda aunque cierres.</div>
        <label class="nt-search">${icon('search')}<input id="nt-q" type="search" placeholder="Buscar en mis notas" aria-label="Buscar notas"></label>
        <div id="nt-list" class="nt-list"></div></div>`,
      beforeClose: async () => { const t = root && $('#nt-new', root); if (t && t.value.trim() && !saved) { await addNote(t.value); await db.setMeta(DKEY, ''); toast('Nota guardada'); } },
      onMount: api => {
        root = api.el;
        const ta = $('#nt-new', api.el); let dt;
        ta.addEventListener('input', () => { clearTimeout(dt); dt = setTimeout(() => db.setMeta(DKEY, ta.value), 300); });
        $('#nt-save', api.el).onclick = async () => { if (await addNote(ta.value)) { ta.value = ''; await db.setMeta(DKEY, ''); toast('Nota guardada'); render(); } else ta.focus(); };
        $('#nt-q', api.el).oninput = e => { q = e.target.value.trim().toLowerCase(); render(); };
        render(); setTimeout(() => ta.focus(), 120);
      }
    });
    async function render() {
      const box = root && $('#nt-list', root); if (!box) return;
      const list = (await load()).filter(n => !q || (n.text + ' ' + (n.visitLabel || '')).toLowerCase().includes(q)).sort((a, b) => (b.pinned - a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
      box.innerHTML = list.length ? list.map(n => `<article class="nt ${n.pinned ? 'pin' : ''}" data-id="${n.id}">
        <button class="nt-t" data-a="edit">${esc(n.text)}</button>
        <div class="nt-f"><span class="small muted">${n.pinned ? 'Fijada · ' : ''}${fmt(n.updatedAt)}${n.visitLabel ? ` · <span class="nt-visit">${icon('pin')}${esc(n.visitLabel)}</span>` : ''}</span>
          <span class="nt-b"><button class="iconbtn" data-a="pin" aria-label="Fijar">${icon('flag')}</button><button class="iconbtn" data-a="copy" aria-label="Copiar">${icon('copy')}</button><button class="iconbtn" data-a="send" aria-label="Enviar">${icon('share')}</button><button class="iconbtn" data-a="del" aria-label="Eliminar">${icon('trash')}</button></span></div></article>`).join('')
        : `<div class="muted" style="text-align:center;padding:18px 8px">${q ? 'Sin resultados.' : 'Aún no tienes notas. Lo que anotes aquí queda guardado y a mano, sin tener que mandártelo por WhatsApp.'}</div>`;
      $$('[data-a]', box).forEach(b => b.onclick = async () => {
        const id = b.closest('.nt').dataset.id, n = (await load()).find(x => x.id === id); if (!n) return;
        const a = b.dataset.a;
        if (a === 'copy') { await copy(n.text); toast('Nota copiada'); }
        else if (a === 'send') sendTxt(n.text);
        else if (a === 'pin') { await patch(id, x => { x.pinned = !x.pinned; }); render(); }
        else if (a === 'del') { if (await confirmBox('¿Eliminar esta nota?', { ok: 'Eliminar', danger: true })) { await save((await load()).filter(x => x.id !== id)); refreshBadge(); render(); toast('Nota eliminada'); } }
        else if (a === 'edit') editNote(n, render);
      });
    }
  }
  function editNote(n, done) {
    let eroot = null;
    sheet({ title: 'Nota', body: `<div class="dict"><textarea id="nt-ed" rows="9">${esc(n.text)}</textarea><button type="button" class="mic" data-mic="nt-ed" aria-label="Dictar">${icon('mic')}</button></div>`,
      footer: `<button class="btn" data-x2>Cerrar</button><button class="btn primary" id="nt-ok">Guardar</button>`,
      beforeClose: async () => { const v = eroot ? $('#nt-ed', eroot).value.trim() : ''; if (v && v !== n.text) { await patch(n.id, x => { x.text = v; }); done && done(); } },
      onMount: api => { eroot = api.el; $('#nt-ok', api.el).onclick = () => api.close(); $('[data-x2]', api.el).onclick = () => api.close(); setTimeout(() => $('#nt-ed', api.el).focus(), 100); } });
  }

  /* botón flotante */
  let fab;
  async function refreshBadge() { if (!fab) return; const n = (await load()).length; fab.querySelector('.nfab-n').textContent = n > 0 ? n : ''; fab.querySelector('.nfab-n').style.display = n > 0 ? '' : 'none'; }
  function mount() {
    fab = document.createElement('button'); fab.className = 'nfab'; fab.type = 'button'; fab.setAttribute('aria-label', 'Notas rápidas'); fab.title = 'Notas rápidas';
    fab.innerHTML = `${icon('file')}<span class="nfab-n" style="display:none"></span>`;
    fab.onclick = open; document.body.appendChild(fab); refreshBadge();
  }
  G.notes = { open, add: addNote };
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => setTimeout(mount, 0)); else mount();
})(window.GS);
