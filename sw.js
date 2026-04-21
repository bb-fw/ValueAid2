// ─── Bump this version string on every release ───────────────
const CACHE = 'valueaid-v1.3.8';

const ASSETS = [
  './', './index.html', './editor.html', './tracker.html', './case-editor.html', './travel.html',
  './calendar.html', './settings.html',
  './css/styles.css', './css/editor.css',
  './js/db.js', './js/ui.js', './js/picker.js',
  './js/editor-core.js', './js/editor-findings.js', './js/editor-notes.js', './js/editor-camera.js', './js/editor-quickpanel.js',
  './js/export.js',
  './js/jspdf.umd.min.js',
  './js/xlsx.full.min.js',
  './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())  // only skip waiting AFTER cache is complete
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
