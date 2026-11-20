// Offline cache so the checker works without signal after the first visit.
const VERSION = 'npw-v6';
const FILES = ['./', 'index.html', 'taskpane.html', 'css/app.css', 'js/app.js', 'js/word.js', 'js/gdocs.js', 'js/ui.js', 'js/engine.js', 'js/rules.js', 'js/care.js', 'js/voice.js', 'js/scicomm.js', 'js/saa.js', 'js/guides.js', 'js/passive.js', 'js/store.js',
  'harper/index.js', 'harper/binary.js', 'harper/BinaryModule-DMhzYB6c.js', 'harper/harper_wasm_bg.wasm',
  'data/nepa-vocabulary.txt', 'data/personal-dictionary.txt', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-64.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Network first for the small files (so updates arrive), cache first for the large engine file.
  if (url.pathname.endsWith('.wasm')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  } else {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
  }
});
