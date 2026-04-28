// ─── Bump this version string on every release ───────────────
const CACHE = 'valueaid-v1.3.21';

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

const LIB_ASSETS = [
  './js/jspdf.umd.min.js',
  './js/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(CORE_ASSETS).then(() =>
        Promise.all(
          LIB_ASSETS.map(url => cache.add(url).catch(() =>
            console.warn('[SW] Library not cached:', url)
          ))
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
    // ignoreSearch: true — strips ?id=xxx so editor.html?id=abc matches cached editor.html
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Progressively cache library files on first successful fetch
        if (response.ok && LIB_ASSETS.some(url => e.request.url.endsWith(url.replace('./', '')))) {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => {
        // Only fall back to index.html for page navigation (mode === 'navigate')
        // NOT for all text/html requests — that's too broad and causes wrong-page fallbacks
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// Cache status reporting for Settings page
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'CACHE_STATUS') {
    caches.open(CACHE).then(cache =>
      Promise.all([
        Promise.all(CORE_ASSETS.map(url => cache.match(url).then(r => !!r))),
        Promise.all(LIB_ASSETS.map(url => cache.match(url).then(r => !!r)))
      ])
    ).then(([coreResults, libResults]) => {
      e.source.postMessage({
        type: 'CACHE_STATUS_RESULT',
        core: { cached: coreResults.filter(Boolean).length, total: CORE_ASSETS.length },
        libs: { cached: libResults.filter(Boolean).length,  total: LIB_ASSETS.length  }
      });
    });
  }
});
