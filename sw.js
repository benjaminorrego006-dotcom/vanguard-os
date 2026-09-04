const CACHE_NAME = 'vanguard-os-v67';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './css/variables.css',
  './css/layout.css',
  './css/components.css',
  './js/core/app.js',
  './js/core/db.js',
  './js/core/idb.js',
  './js/core/lock.js',
  './js/core/history.js',
  './js/core/audio.js',
  './js/core/ejercicios-catalogo.js',
  './js/core/ejercicios-catalogo-gym.js',
  './js/core/ejercicios-catalogo-calistenia.js',
  './js/core/ejercicios-catalogo-hiit.js',
  './js/core/progresiones.js',
  './js/core/generador-rutinas.js',
  './js/core/estandares-fuerza.js',
  './js/core/sugerencias-nivel.js',
  './js/core/plantillas.js',
  './js/core/trainingConfig.js',
  './js/utils/states.js',
  './js/utils/animate.js',
  './js/utils/donut.js',
  './js/utils/progressRing.js',
  './js/utils/currency.js',
  './js/utils/backup.js',
  './js/utils/escape.js',
  './js/utils/fecha.js',
  './js/utils/bodyMetrics.js',
  './js/utils/charts.js',
  './js/vendor/chart.js',
  './js/views/dashboard.js',
  './js/views/entrenamiento.js',
  './js/views/finanzas.js',
  './js/views/tareas.js',
  './js/views/habitos.js',
  './js/views/analisis.js',
  './js/components/activity-heatmap.js',
  './js/components/arbol-progresion.js',
  './js/components/estandares-fuerza.js',
  './js/components/donut-chart.js',
  './js/components/rutina-session.js',
  './js/components/rutinas-lista.js',
  './js/components/generador-rutina-form.js',
  './js/components/nivel-onboarding-form.js',
  './js/components/mini-chart.js',
  './js/components/NumericKeypad.js',
  './js/components/ejercicio-detalle.js',
  './js/components/plate-calculator.js',
  './js/components/hiit-timer.js',
  './js/components/hiit-rutina-form.js',
  './js/components/rutina-form.js',
  './js/components/IngresoForm.js',
  './js/components/GastoForm.js',
  './js/components/AhorroForm.js',
  './js/components/EnvelopeForm.js',
  './js/components/TransferForm.js',
  './js/components/RecurringForm.js',
  './js/components/task-form.js',
  './js/components/habito-form.js',
  './js/components/recurring-task-form.js',
  './js/components/profile-form.js',
  './js/components/session-summary-form.js',
  './js/components/goal-card.js',
  './js/components/goal-form.js'
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
  // Cache-first: todo lo que sirve este SW es estático (JS/CSS/Chart.js) y
  // no cambia dentro de la misma versión de deploy, así que responder desde
  // caché es instantáneo y evita un round-trip de red en cada carga. La
  // forma en que una actualización real llega es el propio versionado de
  // CACHE_NAME (arriba) — un deploy nuevo cambia el contenido de sw.js, el
  // navegador detecta el Service Worker distinto, lo instala, y "activate"
  // purga el caché viejo. No hace falta pegarle a la red en cada fetch solo
  // para no quedar sirviendo algo desactualizado; ese chequeo ya lo hace el
  // ciclo de vida del propio SW.
  //
  // IndexedDB (donde vive todo el dato del usuario: sesiones, tareas,
  // transacciones, log de eventos) nunca pasa por acá — no es una petición
  // de red, es una API del navegador aparte que el evento 'fetch' jamás
  // intercepta. No hay forma de que este caché sirva datos del usuario
  // desactualizados porque nunca los toca.
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
        }
        return response;
      });
    }).catch(() => caches.match(req))
  );
});
