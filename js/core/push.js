// js/core/push.js
// Suscripción push de este dispositivo (docs/RECORDATORIOS-PLAN.md, F2).
// Requiere sesión iniciada: la suscripción se guarda en la tabla
// push_suscripciones del usuario, y la Edge Function enviar-recordatorios
// manda ahí los avisos vencidos. La clave VAPID pública puede estar en el
// código; la privada vive solo en los secretos de Supabase.
import { cargarSupabase, isSupabaseConfigured, getSupabase } from './supabase-client.js';

export const VAPID_PUBLICA = 'BBKGgbN60jDdkTovkN_z1hdjJU9qm2SlSE9_fbMP6QXz1YBQbluhi1DXZaASW-x1FbTAKjVefzoYVbhm6Hv0MEA';

export async function sesionActual() {
  await cargarSupabase();
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: { session } } = await getSupabase().auth.getSession();
    return session || null;
  } catch (e) { return null; }
}

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const soportaPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// "Android · Chrome", "iPhone · Safari": para reconocer el dispositivo en la
// tabla, sin guardar el user agent completo.
function dispositivo() {
  const ua = navigator.userAgent;
  const so = /Android/.test(ua) ? 'Android' : esIOS() ? 'iPhone' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Otro';
  const nav = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  return `${so} · ${nav}${instalada() ? ' · app instalada' : ''}`;
}

function claveDesdeBase64Url(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function suscripcionActual() {
  if (!soportaPush()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// 'sin-sesion' | 'requiere-instalar' (iPhone fuera de la pantalla de inicio)
// | 'sin-soporte' | 'bloqueado' (permiso negado) | 'desactivado' | 'activado'.
export async function estadoPush() {
  if (!(await sesionActual())) return 'sin-sesion';
  if (esIOS() && !instalada()) return 'requiere-instalar';
  if (!soportaPush()) return 'sin-soporte';
  if (Notification.permission === 'denied') return 'bloqueado';
  if (Notification.permission !== 'granted') return 'desactivado';
  try { return (await suscripcionActual()) ? 'activado' : 'desactivado'; }
  catch (e) { return 'desactivado'; }
}

async function guardarSuscripcion(session, sub) {
  const j = sub.toJSON();
  const { error } = await getSupabase().from('push_suscripciones').upsert({
    user_id: session.user.id,
    endpoint: j.endpoint,
    p256dh: j.keys && j.keys.p256dh,
    auth: j.keys && j.keys.auth,
    dispositivo: dispositivo()
  }, { onConflict: 'user_id,endpoint' });
  if (error) {
    // El error completo (código, detalle, pista) a la consola; el mensaje al aviso.
    console.error('[push] Supabase no guardó la suscripción:', error);
    throw new Error(`${error.message}${error.code ? ` (${error.code})` : ''}`);
  }
}

// Pide el permiso de notificaciones. Hay que llamarla de forma síncrona en
// el click, antes de cualquier await: si antes se espera algo (cargar
// Supabase, la sesión), Chrome en Android ya no lo toma como acción del
// usuario y descarta el pedido en silencio o lo manda a la interfaz
// silenciosa. Devuelve la promesa del resultado ('granted' | 'denied' |
// 'default').
export function pedirPermisoNotificaciones() {
  if (!('Notification' in window)) return Promise.resolve('denied');
  try {
    const r = Notification.requestPermission();
    if (r && typeof r.then === 'function') return r;
  } catch (e) { /* Safari viejo: solo acepta callback */ }
  return new Promise(res => Notification.requestPermission(res));
}

// Con el permiso ya pedido (`pedido` = pedirPermisoNotificaciones() del
// click): si se concedió, carga la sesión, crea la suscripción y la guarda.
// 'activado' | 'bloqueado' (negado) | 'sin-respuesta' (se cerró o quedó
// silenciado) | 'sin-sesion' | 'sin-soporte'. Si falla al guardar en
// Supabase, lanza el error real.
export async function activarPush(pedido) {
  const permiso = await (pedido || pedirPermisoNotificaciones());
  if (permiso === 'denied') return 'bloqueado';
  if (permiso !== 'granted') return 'sin-respuesta';
  if (!soportaPush()) return 'sin-soporte';
  const session = await sesionActual();
  if (!session) return 'sin-sesion';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveDesdeBase64Url(VAPID_PUBLICA) });
  await guardarSuscripcion(session, sub);
  return 'activado';
}

export async function desactivarPush() {
  const session = await sesionActual();
  const sub = await suscripcionActual().catch(() => null);
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    if (session) await getSupabase().from('push_suscripciones').delete().eq('user_id', session.user.id).eq('endpoint', endpoint);
  }
  return 'desactivado';
}

// Al abrir la app: si ya estaba activado, vuelve a guardar la suscripción
// (el navegador puede renovar el endpoint). Sin sesión o sin permiso, nada.
export async function refrescarSuscripcion() {
  try {
    if (!soportaPush() || Notification.permission !== 'granted') return;
    const session = await sesionActual();
    const sub = session && await suscripcionActual();
    if (sub) await guardarSuscripcion(session, sub);
  } catch (e) { console.warn('[push] No se pudo refrescar la suscripción', e); }
}

// Un aviso para dentro de un minuto (lo manda el cron del servidor).
export async function enviarAvisoPrueba() {
  const session = await sesionActual();
  if (!session) throw new Error('Inicia sesión para recibir avisos.');
  const { error } = await getSupabase().from('recordatorios').upsert({
    user_id: session.user.id,
    id: `prueba:${Date.now()}`,
    envia_en: new Date(Date.now() + 60 * 1000).toISOString(),
    titulo: 'Aviso de prueba',
    cuerpo: 'Si ves esto, los recordatorios llegan a este dispositivo.',
    url: './#configuracion',
    enviado_en: null
  }, { onConflict: 'user_id,id' });
  if (error) throw new Error(error.message);
}
