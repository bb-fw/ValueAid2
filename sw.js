// ─── Bump this version string on every release ───────────────
const CACHE = 'valueaid-v1.3.17';

// Core assets — small, essential for app to function offline.
// Cached atomically: all must succeed or install fails.
const CORE_ASSETS = [
  './', './index.html', './editor.html', './tracker.html', './case-editor.html', './travel.html',
  './calendar.html', './settings.html',
  './css/styles.css', './css/editor.css',
  './js/db.js', './js/ui.js', './js/picker.js',
  './js/editor-core.js', './js/editor-findings.js', './js/editor-notes.js', './js/editor-camera.js',
  './js/editor-quickpanel.js', './js/export.js',
  './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
];

// Library assets — large, needed only for export features (~1.2MB).
// Cached individually so a failure here never breaks core app caching.
const LIB_ASSETS = [
  './js/jspdf.umd.min.js',
  './js/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // Step 1: cache core assets atomically — this must fully succeed
      cache.addAll(CORE_ASSETS).then(() =>
        // Step 2: cache library files individually — failures are silently ignored
        Promise.all(
          LIB_ASSETS.map(url =>
            cache.add(url).catch(() => {
              console.warn('[SW] Library not cached (will retry on next fetch):', url);
            })
          )
        )
      )
    ).then(() => self.skipWaiting())
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
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // Not in cache — try network
      return fetch(e.request).then(response => {
        // Cache library files on first successful fetch (progressive caching)
        if (response.ok && LIB_ASSETS.some(url => e.request.url.endsWith(url.replace('./', '')))) {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => {
        // Network failed — only fall back to index.html for page navigation requests
        const isNav = e.request.mode === 'navigate' ||
          (e.request.headers.get('accept') || '').includes('text/html');
        if (isNav) return caches.match('./index.html');
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// ── Cache status reporting ────────────────────────────────────
// Responds to a postMessage({ type: 'CACHE_STATUS' }) from the page
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'CACHE_STATUS') {
    caches.open(CACHE).then(cache =>
      Promise.all([
        Promise.all(CORE_ASSETS.map(url => cache.match(url).then(r => !!r))),
        Promise.all(LIB_ASSETS.map(url => cache.match(url).then(r => !!r)))
      ])
    ).then(([coreResults, libResults]) => {
      const coreTotal = CORE_ASSETS.length, coreCached = coreResults.filter(Boolean).length;
      const libTotal  = LIB_ASSETS.length,  libCached  = libResults.filter(Boolean).length;
      e.source.postMessage({
        type: 'CACHE_STATUS_RESULT',
        core: { cached: coreCached, total: coreTotal },
        libs: { cached: libCached,  total: libTotal  }
      });
    });
  }
});
