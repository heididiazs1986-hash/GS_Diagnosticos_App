/* db.js · IndexedDB (visits, records, meta) + ajustes locales */
(function (G) {
  const NAME = 'gs_diagnosticos_db', VER = 1; let db;
  const open = () => new Promise((res, rej) => {
    if (db) return res(db);
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('visits')) d.createObjectStore('visits', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('records')) { const s = d.createObjectStore('records', { keyPath: 'id' }); s.createIndex('visitId', 'visitId'); s.createIndex('cd', 'Transformador'); }
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => { db = r.result; res(db); };
    r.onerror = () => rej(r.error);
  });
  const rq = (store, mode, fn) => open().then(d => new Promise((res, rej) => {
    const t = d.transaction(store, mode), s = t.objectStore(store), q = fn(s);
    t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }));
  const D = {
    open,
    get: (st, k) => rq(st, 'readonly', s => s.get(k)),
    put: (st, v) => rq(st, 'readwrite', s => s.put(v)).then(() => v),
    del: (st, k) => rq(st, 'readwrite', s => s.delete(k)),
    all: st => rq(st, 'readonly', s => s.getAll()).then(r => r || []),
    byIndex: (st, ix, v) => rq(st, 'readonly', s => s.index(ix).getAll(v)).then(r => r || []),
    clear: st => rq(st, 'readwrite', s => s.clear()),
    async meta(key, def = null) { const r = await D.get('meta', key); return r ? r.value : def; },
    setMeta: (key, value) => D.put('meta', { key, value }),
    async seq(key) { const n = (await D.meta('seq_' + key, 0)) + 1; await D.setMeta('seq_' + key, n); return n; },
    async bumpSeq(key, min) { const n = await D.meta('seq_' + key, 0); if (min > n) await D.setMeta('seq_' + key, min); }
  };
  /* ID de visita AAAAMMDD0001 */
  D.nextVisitId = async () => { const day = G.dateLocal().replaceAll('-', ''); const n = await D.seq('visit_' + day); return day + String(n).padStart(4, '0'); };

  /* ajustes (localStorage, tolerante a fallos) */
  const SKEY = 'gsd_settings';
  const defs = { locFmt: 'combo', theme: 'auto', sede: 'BOGOTÁ', municipio: 'BOGOTÁ' };
  const S = {
    get() { try { return { ...defs, ...JSON.parse(localStorage.getItem(SKEY) || '{}') }; } catch { return { ...defs }; } },
    set(p) { try { localStorage.setItem(SKEY, JSON.stringify({ ...S.get(), ...p })); } catch { } }
  };
  G.db = D; G.settings = S;
})(window.GS);
