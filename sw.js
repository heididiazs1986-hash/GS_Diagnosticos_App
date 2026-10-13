/* GS Diagnósticos · service worker: red primero, caché de respaldo (funciona sin conexión) */
const CACHE = 'gsd-v2';
const CORE = ['./', 'index.html', 'styles.css?v=2', 'manifest.json', 'img/icon.svg', 'img/banner.jpg', 'img/hero.jpg', 'img/gs-process-logo.png', 'img/applus-logo.png', 'img/icon-192.png',
  'js/util.js?v=2', 'js/db.js?v=2', 'js/catalogs.js?v=2', 'js/nits.js?v=2', 'js/lock.js?v=2', 'js/forms.js?v=2', 'js/export.js?v=2', 'js/report.js?v=2', 'js/sheets.js?v=2', 'js/vendor-docx.js?v=2', 'js/app.js?v=2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => { })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url), fonts = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin !== location.origin && !fonts) return;
  e.respondWith(fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
