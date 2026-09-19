// js/core/error-tracking.js
// Reporte de errores a Sentry. Sin esto, un error de JavaScript en el
// celular real solo deja rastro en una consola que nadie tiene abierta.
//
// Cómo está pensado, por ser una PWA offline-first sin bundler:
//  - El SDK NO va en un <script> de index.html: se inyecta recién acá, sin
//    bloquear el arranque, y solo si hay DSN, el usuario no lo apagó y hay
//    conexión. Sin conexión no pasa nada (se reintenta al volver online).
//  - Es un script de terceros con acceso a toda la página, así que se
//    fija a UNA versión exacta con hash SRI: si el CDN sirviera otro
//    archivo, el navegador lo rechaza en vez de ejecutarlo.
//  - Se apagan las integraciones que enviarían de más (breadcrumbs y
//    sesiones) y beforeSend limpia la URL: al confirmar el email la URL
//    lleva #access_token=... y no puede salir de este dispositivo.
//
// Para activarlo: pegá el DSN de tu proyecto de Sentry (tipo "Browser
// JavaScript") en SENTRY_DSN. El DSN es público por diseño, va en el
// cliente. Vacío = todo esto queda inerte.
const SENTRY_DSN = '';

const SDK_URL = 'https://browser.sentry-cdn.com/10.75.0/bundle.min.js';
const SDK_INTEGRITY = 'sha384-Yht61aP1Ubz8hWtSUlosvg1lra1xK9MDSRBygQambdRN1t3T2DMVvIHYAhm1kzt7';

const PREF_KEY = 'vg_error_reporting'; // 'off' = apagado; ausente = prendido
const MAX_EVENTS_POR_SESION = 25; // tope duro, también protege la cuota gratuita

let dsn = SENTRY_DSN;
let sdkPromise = null;
let sdkListo = false;
let enviados = 0;
const vistos = new Set();

export function isErrorTrackingConfigured() {
  return !!dsn;
}

export function isErrorReportingEnabled() {
  try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch { return true; }
}

export function setErrorReportingEnabled(on) {
  try {
    if (on) localStorage.removeItem(PREF_KEY);
    else localStorage.setItem(PREF_KEY, 'off');
  } catch { /* sin storage: queda el valor por defecto */ }
  if (on) initErrorTracking();
}

function aError(error, tag) {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    // Errores de Supabase/PostgREST: objetos planos {code, message, ...}
    const e = new Error(`${tag}: ${error.code ? error.code + ' ' : ''}${error.message}`);
    e.name = 'SupabaseError';
    return e;
  }
  return new Error(`${tag}: ${String(error)}`);
}

// Errores que ocurrieron antes de que el SDK esté listo (los globales de
// index.html y los reportError() tempranos) esperan acá. Se descarta si el
// reporte está apagado: lo que pasó antes de que el usuario lo prenda no
// se manda retroactivamente.
function encolar(item) {
  const q = window.__vgEarlyErrors;
  if (Array.isArray(q) && q.length < 20) q.push(item);
}

export function reportError(error, tag = 'app') {
  if (!dsn || !isErrorReportingEnabled()) return;
  if (!sdkListo) { encolar({ error, tag }); return; }
  capturar(error, tag);
}

// Sentry agrupa por stack trace, y todos los errores que pasan por acá
// comparten el mismo stack (el de esta función) — sin un fingerprint
// explícito, un 403 de RLS y un error de red caerían en el mismo grupo.
function capturar(error, tag) {
  const err = aError(error, tag);
  window.Sentry.withScope(scope => {
    scope.setTag('origen', tag);
    scope.setFingerprint([tag, err.name, err.message]);
    window.Sentry.captureException(err);
  });
}

function sinHash(url) {
  return typeof url === 'string' ? url.split('#')[0] : url;
}

function limpiarEvento(event) {
  if (!isErrorReportingEnabled()) return null;

  const ex = event.exception?.values?.[0];
  const huella = `${ex?.type || ''}|${ex?.value || event.message || ''}`;
  if (vistos.has(huella) || enviados >= MAX_EVENTS_POR_SESION) return null;
  vistos.add(huella);
  enviados++;

  delete event.user;
  event.breadcrumbs = [];
  if (event.request) {
    event.request.url = sinHash(event.request.url);
    delete event.request.cookies;
    if (event.request.headers?.Referer) event.request.headers.Referer = sinHash(event.request.headers.Referer);
  }
  return event;
}

function cargarSdk() {
  if (window.Sentry?.init) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.integrity = SDK_INTEGRITY;
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { s.remove(); reject(new Error('No se pudo cargar el SDK de Sentry')); };
    document.head.appendChild(s);
  });
}

// `opts.dsn` existe solo para poder probar el circuito contra un servidor
// de ingesta local sin tocar la constante de arriba.
export async function initErrorTracking(opts = {}) {
  if (opts.dsn) dsn = opts.dsn;
  if (!dsn) { window.__vgEarlyErrors = null; return false; }
  if (!isErrorReportingEnabled()) { window.__vgEarlyErrors = null; return false; }
  if (sdkListo) return true;
  if (!navigator.onLine) return false; // se reintenta con el evento 'online'

  if (!sdkPromise) {
    sdkPromise = cargarSdk().then(() => {
      window.Sentry.init({
        dsn,
        environment: location.hostname.endsWith('github.io') ? 'production' : 'development',
        sendDefaultPii: false,
        maxBreadcrumbs: 0,
        integrations: (defaults) => defaults.filter(i => i.name !== 'Breadcrumbs' && i.name !== 'BrowserSession'),
        ignoreErrors: [/ResizeObserver loop/, /Failed to fetch/, /NetworkError when attempting to fetch/, /Load failed/],
        beforeSend: limpiarEvento
      });
      sdkListo = true;
      const pendientes = Array.isArray(window.__vgEarlyErrors) ? window.__vgEarlyErrors : [];
      window.__vgEarlyErrors = null; // desde acá los globales los captura el propio SDK
      pendientes.forEach(p => capturar(p.error, p.tag));
    }).catch(err => {
      sdkPromise = null; // permite reintentar (ej. al volver la conexión)
      console.warn('[error-tracking]', err.message);
    });
  }
  await sdkPromise;
  return sdkListo;
}

window.addEventListener('online', () => { initErrorTracking(); });
