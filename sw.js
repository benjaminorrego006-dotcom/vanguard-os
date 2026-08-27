const CACHE_NAME = 'vanguard-os-v13';
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/variables.css',
  './css/layout.css',
  './css/components.css',
  './js/core/app.js',
  './js/core/db.js',
  './js/core/audio.js',
  './js/core/ejercicios-catalogo.js',
  './js/core/progresiones-calistenia.js',
  './js/utils/states.js',
  './js/utils/animate.js',
  './js/utils/donut.js',
  './js/utils/currency.js',
  './js/utils/backup.js',
  './js/views/dashboard.js',
  './js/views/entrenamiento.js',
  './js/views/finanzas.js',
  './js/views/tareas.js',
  './js/components/rutina-session.js',
  './js/components/rutinas-lista.js',
  './js/components/mini-chart.js',
  './js/components/NumericKeypad.js',
  './js/components/ejercicio-detalle.js',
  './js/components/plate-calculator.js',
  './js/components/hiit-timer.js',
  './js/components/rutina-form.js',
  './js/components/IngresoForm.js',
  './js/components/GastoForm.js',
  './js/components/AhorroForm.js',
  './js/components/EnvelopeForm.js',
  './js/components/TransferForm.js',
  './js/components/RecurringForm.js',
  './js/components/task-form.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // cache.addAll() es atómico: si UNA sola URL falla, toda la instalación
      // falla y el SW queda atascado sirviendo una versión vieja/incompleta.
      // Cacheamos cada URL por separado para que un fallo puntual no rompa el resto.
      return Promise.all(
        PRECACHE_URLS.map(url => cache.add(url).catch(err => {
          console.warn('[SW] No se pudo precachear:', url, err);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME).map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network-first: siempre intenta traer la versión más reciente del archivo.
  // Si la red falla (offline), recién ahí cae al caché como respaldo.
  // Esto evita quedar sirviendo indefinidamente una copia vieja o rota.
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic' && event.request.url.startsWith('http')) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});