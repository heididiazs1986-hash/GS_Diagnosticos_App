/* lock.js · bloqueo de la app: clave + huella (WebAuthn, autenticador de la plataforma).
   Es una puerta de acceso a la app en este dispositivo; los datos locales no se cifran. */
(function (G) {
  const { $, esc, icon } = G;
  const KEY = 'gsd_lock', MAXFAIL = 5;
  const rd = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const wr = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { } };
  const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function hash(clave, salt, iter) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: iter }, k, 256));
  }
  const L = { unlocked: false, hiddenAt: 0, idleT: null };
  L.state = () => { const s = rd(); return { configured: !!(s && s.hash), skipped: !!(s && s.skipped), auto: s?.auto ?? 5, bio: !!(s && s.bio) }; };
  L.bioSupported = async () => { try { return !!(window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; } };

  async function setClave(clave) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16))), iter = 150000, s = rd() || {};
    wr({ ...s, skipped: false, salt, iter, hash: await hash(clave, salt, iter), auto: s.auto ?? 5, fails: 0, until: 0 });
  }
  async function check(clave) { const s = rd(); if (!s?.hash) return true; return (await hash(clave, s.salt, s.iter)) === s.hash; }
  L.check = check; L.setClave = setClave;
  L.setAuto = m => { const s = rd() || {}; wr({ ...s, auto: m }); armIdle(); };
  L.remove = () => { wr({ skipped: true }); };

  L.enableBio = async () => {
    try {
      const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'GS Diagnósticos' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'gestora', displayName: 'Gestora' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000 } });
      const s = rd() || {}; wr({ ...s, bio: b64(cred.rawId) }); return true;
    } catch (e) { return false; }
  };
  L.disableBio = () => { const s = rd() || {}; delete s.bio; wr(s); };
  async function bioUnlock() {
    const s = rd(); if (!s?.bio) return false;
    try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(s.bio) }], userVerification: 'required', timeout: 60000 } }); return true; } catch { return false; }
  }

  /* ---------- UI ---------- */
  function box(html) { const el = $('#lock'); el.innerHTML = `<div class="lockbox">${html}</div>`; el.classList.add('show'); return el; }
  function hide() { $('#lock').classList.remove('show'); $('#lock').innerHTML = ''; L.unlocked = true; armIdle(); }

  function showSetup(resolve) {
    const el = box(`<div class="mark">${icon('lock')}</div><h1>Protege GS Diagnósticos</h1><p class="muted" style="margin:0">Crea una clave de al menos 6 caracteres. Después puedes activar la huella.</p>
      <div class="field"><input type="password" id="lk1" placeholder="Clave nueva" autocomplete="new-password"></div>
      <div class="field"><input type="password" id="lk2" placeholder="Repite la clave" autocomplete="new-password"></div>
      <div class="err" id="lkErr"></div>
      <button class="btn primary block" id="lkOk">Crear clave</button><button class="btn ghost block" id="lkSkip">Ahora no</button>`);
    $('#lkOk', el).onclick = async () => {
      const a = $('#lk1', el).value, b = $('#lk2', el).value, er = $('#lkErr', el);
      if (a.length < 6) return er.textContent = 'La clave debe tener al menos 6 caracteres.';
      if (a !== b) return er.textContent = 'Las claves no coinciden.';
      await setClave(a); L.unlocked = true;
      if (await L.bioSupported()) {
        box(`<div class="mark">${icon('finger')}</div><h1>¿Usar tu huella?</h1><p class="muted" style="margin:0">Podrás abrir la app con la huella o el desbloqueo del teléfono. La clave sigue siendo el respaldo.</p>
          <button class="btn primary block" id="bioY">Activar huella</button><button class="btn ghost block" id="bioN">Más tarde</button>`);
        $('#bioY').onclick = async () => { const ok = await L.enableBio(); G.toast(ok ? 'Huella activada' : 'No se pudo activar la huella en este dispositivo'); hide(); resolve(); };
        $('#bioN').onclick = () => { hide(); resolve(); };
      } else { hide(); resolve(); }
    };
    $('#lkSkip', el).onclick = () => { if (!L.state().configured) wr({ skipped: true }); hide(); resolve(); };
  }

  function showUnlock(resolve) {
    const s = rd(); const hasBio = !!s?.bio;
    const el = box(`<img class="mark img" src="img/icon-192.png" alt=""><h1>GS Diagnósticos</h1><p class="muted" style="margin:0">Ingresa tu clave</p>
      <div class="field"><input type="password" id="lkP" placeholder="Clave" autocomplete="current-password"></div>
      <div class="err" id="lkErr"></div>
      <button class="btn primary block" id="lkOk">Entrar</button>
      ${hasBio ? `<button class="btn block" id="lkBio">${icon('finger')} Usar huella</button>` : ''}`);
    const er = $('#lkErr', el);
    const tick = () => { const u = (rd()?.until || 0) - Date.now(); if (u > 0) { er.textContent = `Demasiados intentos. Espera ${Math.ceil(u / 1000)} s.`; setTimeout(tick, 500); } else if (er.textContent.startsWith('Demasiados')) er.textContent = ''; };
    tick();
    const go = async () => {
      const cur = rd(); if ((cur.until || 0) > Date.now()) return tick();
      if (await check($('#lkP', el).value)) { wr({ ...cur, fails: 0, until: 0 }); hide(); resolve(); }
      else { const f = (cur.fails || 0) + 1; const wait = f >= MAXFAIL ? Math.min(300, 15 * 2 ** (f - MAXFAIL)) * 1000 : 0; wr({ ...cur, fails: f, until: wait ? Date.now() + wait : 0 }); er.textContent = wait ? '' : 'Clave incorrecta.'; $('#lkP', el).value = ''; tick(); }
    };
    $('#lkOk', el).onclick = go; $('#lkP', el).onkeydown = e => { if (e.key === 'Enter') go(); };
    if (hasBio) { const b = async () => { if (await bioUnlock()) { const c = rd(); wr({ ...c, fails: 0, until: 0 }); hide(); resolve(); } }; $('#lkBio', el).onclick = b; setTimeout(b, 250); }
    else setTimeout(() => $('#lkP', el)?.focus(), 100);
  }

  L.init = () => new Promise(resolve => {
    const st = L.state();
    if (!st.configured && st.skipped) { L.unlocked = true; return resolve(); }
    if (!st.configured) return showSetup(resolve);
    showUnlock(resolve);
    L._resolve = resolve;
  });
  L.lockNow = () => { if (!L.state().configured) return G.toast('Aún no tienes clave. Créala en Ajustes.'); L.unlocked = false; clearTimeout(L.idleT); showUnlock(() => { }); };
  L.createNow = () => new Promise(res => showSetup(res));

  /* auto-bloqueo por inactividad y al volver de segundo plano */
  function armIdle() {
    clearTimeout(L.idleT); const st = L.state(); if (!st.configured || !st.auto) return;
    L.idleT = setTimeout(() => { if (L.unlocked && !document.querySelector('.scrim')) L.lockNow(); else armIdle(); }, st.auto * 60000);
  }
  ['pointerdown', 'keydown', 'scroll'].forEach(ev => document.addEventListener(ev, () => { if (L.unlocked) armIdle(); }, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    const st = L.state(); if (!st.configured) return;
    if (document.hidden) L.hiddenAt = Date.now();
    else if (L.unlocked && st.auto && Date.now() - L.hiddenAt > st.auto * 60000) L.lockNow();
  });
  G.lock = L;
})(window.GS);
