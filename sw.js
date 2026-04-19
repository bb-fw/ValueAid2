// ─── Bump this version string on every release ───────────────
// The cache name change triggers automatic old-cache deletion
// and forces fresh files to be fetched from the server.
// localStorage (app data) is never touched by this process.
const CACHE = 'valueaid-v1.3.1';

// Core assets — all must exist. addAll is atomic: if any 404s, install fails.
const ASSETS = [
  './', './index.html', './editor.html', './tracker.html', './case-editor.html', './travel.html',
  './calendar.html', './settings.html',
  './css/styles.css', './js/db.js', './js/ui.js', './js/picker.js', './js/editor-core.js', './js/editor-findings.js', './js/editor-notes.js', './js/editor-camera.js', './css/editor.css',
  './js/export.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
];

// Optional assets — cached individually if available, silently skipped if missing.
// Once js/jspdf.umd.min.js and js/xlsx.full.min.js are pushed to the repo,
// they will be picked up automatically on next install without changing this file.
const OPTIONAL_ASSETS = [
  './js/jspdf.umd.min.js',
  './js/xlsx.full.min.js'
];

// Install: cache core files atomically, then try optional files individually.
// A missing optional file never breaks the install or the offline capability.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(ASSETS).then(() =>
        Promise.all(
          OPTIONAL_ASSETS.map(url =>
            fetch(url).then(r => { if (r.ok) cache.put(url, r); }).catch(() => {})
          )
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: delete any cache with a different name (i.e. old versions)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
