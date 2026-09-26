// js/core/supabase-client.js
// Cliente de Supabase desde una copia LOCAL de @supabase/supabase-js
// (js/vendor/supabase-js-2.116.0.js, bundle ESM único, precacheado por el
// service worker). Antes se importaba de forma estática desde esm.sh: con
// ese CDN caído la app entera mostraba "No se pudo cargar la aplicación",
// y el SW nunca lo cacheaba (solo guarda respuestas same-origin). Ahora
// este archivo NO importa nada de forma estática: el bundle se carga con
// import() dinámico en cargarSupabase() — la llama initSync (sync.js), en
// paralelo al arranque, y la sección Cuenta de Configuración — así que
// ningún import estático arrastra Supabase al arranque, y si el bundle no
// carga la sync queda desactivada sin afectar al resto de la app.
//
// SUPABASE_ANON_KEY es pública a propósito: la seguridad real la da Row
// Level Security en las tablas de Supabase, no el secreto de esta key.
// La `service_role` key, en cambio, NUNCA debe vivir en este archivo ni
// en ningún archivo que se sirva al cliente.

const SUPABASE_URL = 'https://dgnjoawfaizmbrekxauq.supabase.co';
// Publishable key (formato nuevo de Supabase, reemplaza a la anon key JWT
// pero cumple el mismo rol): pública a propósito, misma seguridad que la
// anon key — la protección real la da Row Level Security en las tablas.
const SUPABASE_ANON_KEY = 'sb_publishable_M0Zsy0vy3oZxG9Mqo1vH2g_fZjrUnuo';

// Ruta del bundle relativa a la página (no a este módulo): la app corre sus
// módulos como Blob URL (ver loadModuleGraph en index.html/app.js) y un
// import() relativo al módulo no resolvería — mismo criterio que usa
// app.js para importar las vistas.
const VENDOR_SUPABASE = 'js/vendor/supabase-js-2.116.0.js';

const CONFIGURED = !SUPABASE_URL.includes('TU-PROYECTO') && !SUPABASE_ANON_KEY.includes('TU-ANON-KEY');

let client = null;
let carga = null;          // promesa única de carga del bundle
let noDisponible = false;  // el bundle no se pudo cargar en esta sesión

// Carga el bundle y crea el cliente una sola vez. Nunca lanza: devuelve
// true si Supabase quedó listo, false si no está configurado o no cargó.
export function cargarSupabase() {
  if (!CONFIGURED) return Promise.resolve(false);
  if (!carga) {
    carga = (async () => {
      try {
        const { createClient } = await import(new URL(VENDOR_SUPABASE, location.href).href);
        client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
      } catch (err) {
        noDisponible = true;
        console.warn('[sync] Supabase no disponible: la sincronización queda desactivada en esta sesión.', err);
        return false;
      }
    })();
  }
  return carga;
}

// 'no-configurado' | 'no-disponible' (el bundle no cargó) | 'cargando' | 'listo'
export function estadoSupabase() {
  if (!CONFIGURED) return 'no-configurado';
  if (noDisponible) return 'no-disponible';
  return client ? 'listo' : 'cargando';
}

// true solo con el cliente ya creado: es la guarda que usan sync.js y la
// sección Cuenta antes de tocar Supabase (sin cliente, no hay sync).
export function isSupabaseConfigured() {
  return CONFIGURED && client !== null;
}

export function getSupabase() {
  if (!client) throw new Error('Supabase no está disponible (sin configurar o el bundle no cargó)');
  return client;
}
