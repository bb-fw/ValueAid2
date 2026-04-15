// ─── Bump this version string on every release ───────────────
// The cache name change triggers automatic old-cache deletion
// and forces fresh files to be fetched from the server.
// localStorage (app data) is never touched by this process.
const CACHE = 'valueaid-v1.1.6';

const ASSETS = [
  './', './index.html', './editor.html', './tracker.html', './case-editor.html', './travel.html',
  './calendar.html', './settings.html',
  './css/styles.css', './js/db.js', './js/ui.js', './js/picker.js', './js/editor-core.js', './js/editor-findings.js', './js/editor-notes.js', './js/editor-camera.js', './css/editor.css',
  './js/export.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
];

// Install: cache all app files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// Activate: delete any cache with a different name (i.e. old versions)
// localStorage is completely separate and unaffected
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
// Uses cache-first strategy so app works offline
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
