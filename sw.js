/* ============================================
   SIGAJ — Service Worker
   Agenda Judicial Inteligente
   Juzgado 14 Penal Municipal — Ibagué
   ============================================ */

const CACHE_NAME = 'sigaj-v1';
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

/* ── Instalación: cachear archivos esenciales ── */
self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SIGAJ SW] Cacheando archivos esenciales');
      return cache.addAll(ARCHIVOS_CACHE);
    })
  );
  self.skipWaiting();
});

/* ── Activación: limpiar caches antiguos ── */
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(nombres =>
      Promise.all(
        nombres
          .filter(nombre => nombre !== CACHE_NAME)
          .map(nombre => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: cache-first, luego red ── */
self.addEventListener('fetch', evento => {
  evento.respondWith(
    caches.match(evento.request).then(respuesta => {
      return respuesta || fetch(evento.request).then(respRed => {
        // Cachear recursos nuevos dinámicamente
        if (evento.request.method === 'GET') {
          const clon = respRed.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(evento.request, clon));
        }
        return respRed;
      });
    }).catch(() => {
      // Sin conexión y sin cache: retornar la página principal
      if (evento.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
