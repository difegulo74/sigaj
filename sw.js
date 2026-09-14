/* ============================================
   SIGAJ — Service Worker v3.0
   Agenda Judicial Inteligente
   Juzgado 14 Penal Municipal — Ibagué
   ============================================ */

const CACHE_NAME = 'sigaj-v3-firebase-20260913';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

const FIREBASE_DATA_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com'
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(nombres => Promise.all(
      nombres.filter(nombre => nombre !== CACHE_NAME).map(nombre => caches.delete(nombre))
    ))
  );
  self.clients.claim();
});

function esTraficoFirebaseDatos(url) {
  return FIREBASE_DATA_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host))
    || url.hostname.endsWith('.firebaseapp.com')
    || url.hostname.endsWith('.firebaseio.com');
}

function esFirebaseSDK(url) {
  return url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/12.18.0/');
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const respuesta = await fetch(request);
    if (respuesta && respuesta.ok) await cache.put(request, respuesta.clone());
    return respuesta;
  } catch (error) {
    const cacheada = await cache.match(request);
    if (cacheada) return cacheada;
    if (request.mode === 'navigate') return cache.match('./index.html');
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cacheada = await cache.match(request);
  const red = fetch(request).then(async respuesta => {
    if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
      await cache.put(request, respuesta.clone());
    }
    return respuesta;
  }).catch(() => null);
  return cacheada || red || Response.error();
}

self.addEventListener('fetch', evento => {
  const request = evento.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Firestore y Authentication deben comunicarse siempre con la red/SDK.
  // La persistencia offline de sus datos la gestiona Firestore mediante IndexedDB.
  if (esTraficoFirebaseDatos(url)) return;

  // Navegación y archivos propios: red primero para evitar servir una versión vieja
  // del index.html después de una actualización de SIGAJ.
  if (url.origin === self.location.origin) {
    evento.respondWith(networkFirst(request));
    return;
  }

  // SDK modular de Firebase y fuente Inter: caché estática con revalidación.
  if (esFirebaseSDK(url) || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    evento.respondWith(staleWhileRevalidate(request));
  }
});
