// js/core/diagnostico-push.js
// Diagnóstico de Recordatorios (docs/PLAN-CIERRE-OCT.md, P2). Recordatorios
// está en pausa porque en el teléfono de Benjamin los avisos no llegan y no
// se sabe en qué paso falla: esto solo LEE el estado del navegador, del
// service worker, de la suscripción y del servidor, para que se pueda
// copiar y mandar. No cambia nada y no muestra claves, tokens ni el correo
// completo.
//
// No importa push.js a propósito: push.js importa registrarErrorRecordatorios
// de acá, y así no se arma un import circular (la app carga sus módulos como
// Blob con un grafo armado a mano, ver loadModuleGraph en index.html).
import { cargarSupabase, getSupabase } from './supabase-client.js';
import { formatFechaHora, formatFechaHoraChile } from '../utils/fecha.js';

const CLAVE_ERROR = 'vg-recordatorios-ultimo-error';
let ultimoError = null;

const mensajeDe = (err) => String((err && err.message) || err || 'Error desconocido').slice(0, 300);

// El último error al activar los avisos o al subirlos: en memoria y en
// localStorage (si está bloqueado, queda solo en memoria).
export function registrarErrorRecordatorios(origen, err) {
  ultimoError = { origen, mensaje: mensajeDe(err), en: new Date().toISOString() };
  try { localStorage.setItem(CLAVE_ERROR, JSON.stringify(ultimoError)); } catch (e) { /* sin localStorage */ }
}

export function leerUltimoErrorRecordatorios() {
  if (ultimoError) return ultimoError;
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_ERROR) || 'null');
    if (guardado && guardado.mensaje) return guardado;
  } catch (e) { /* sin localStorage o dato roto */ }
  return null;
}

// "Android 14 · Chrome 129", "iOS 17.5 · Safari 17.5". Sin el user agent completo.
function descripcionNavegador() {
  const ua = navigator.userAgent || '';
  const de = (re) => { const r = re.exec(ua); return r ? r[1] : ''; };
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const so = /Android/.test(ua) ? `Android ${de(/Android ([\d.]+)/)}`.trim()
    : ios ? `iOS ${de(/OS (\d+(?:_\d+)*) like Mac/).replace(/_/g, '.')}`.trim()
    : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Otro';
  const nav = /Edg\//.test(ua) ? `Edge ${de(/Edg\/(\d+)/)}`
    : /SamsungBrowser\//.test(ua) ? `Samsung Internet ${de(/SamsungBrowser\/(\d+)/)}`
    : /Firefox\//.test(ua) ? `Firefox ${de(/Firefox\/(\d+)/)}`
    : /CriOS\//.test(ua) ? `Chrome ${de(/CriOS\/(\d+)/)}`
    : /Chrome\//.test(ua) ? `Chrome ${de(/Chrome\/(\d+)/)}`
    : /Safari\//.test(ua) ? `Safari ${de(/Version\/([\d.]+)/)}`.trim()
    : 'Navegador';
  return `${so} · ${nav}`;
}

// "b•••@gmail.com": se reconoce la cuenta sin mostrar el correo completo.
function enmascararCorreo(correo) {
  if (!correo || !correo.includes('@')) return null;
  const [usuario, dominio] = correo.split('@');
  return `${usuario.charAt(0)}•••@${dominio}`;
}

// Junta todo. Nunca lanza: lo que no se puede leer queda con su error.
export async function recolectarDiagnostico() {
  const d = { generado: new Date().toISOString() };
  d.navegador = descripcionNavegador();
  d.instalada = !!((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true);
  d.soporte = { serviceWorker: 'serviceWorker' in navigator, pushManager: 'PushManager' in window, notification: 'Notification' in window };
  d.permiso = d.soporte.notification ? Notification.permission : null;

  d.sw = { registrado: false, estado: null, controla: false, error: null };
  let reg = null;
  if (d.soporte.serviceWorker) {
    try { reg = (await navigator.serviceWorker.getRegistration()) || null; } catch (e) { d.sw.error = mensajeDe(e); }
    d.sw.registrado = !!reg;
    d.sw.estado = reg && reg.active ? reg.active.state : null;
    d.sw.controla = !!navigator.serviceWorker.controller;
  }

  d.suscripcion = { existe: false, final: null, error: null };
  let endpoint = null;
  if (reg && reg.pushManager) {
    try {
      const sub = await reg.pushManager.getSubscription();
      if (sub && sub.endpoint) { endpoint = sub.endpoint; d.suscripcion.existe = true; d.suscripcion.final = endpoint.slice(-12); }
    } catch (e) { d.suscripcion.error = mensajeDe(e); }
  }

  d.sesion = { activa: false, correo: null, error: null };
  d.fila = { estado: 'sin-sesion', error: null };          // 'si' | 'no' | 'sin-sesion' | 'sin-suscripcion' | 'error'
  d.pendientes = { cantidad: null, proximo: null, error: null };
  try {
    if (!(await cargarSupabase())) throw new Error('Supabase no está disponible en esta sesión');
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    if (session) {
      d.sesion.activa = true;
      d.sesion.correo = enmascararCorreo(session.user && session.user.email);
      const uid = session.user.id;
      if (!endpoint) d.fila.estado = 'sin-suscripcion';
      else {
        const { data: filas, error } = await sb.from('push_suscripciones').select('endpoint').eq('user_id', uid).eq('endpoint', endpoint);
        if (error) { d.fila.estado = 'error'; d.fila.error = mensajeDe(error); }
        else d.fila.estado = (filas || []).length > 0 ? 'si' : 'no';
      }
      // Pendientes = sin enviado_en. Se cuentan acá: son pocos (7 días).
      const { data: pend, error } = await sb.from('recordatorios').select('id, envia_en').eq('user_id', uid).is('enviado_en', null);
      if (error) d.pendientes.error = mensajeDe(error);
      else {
        const lista = (pend || []).filter(r => r.envia_en).sort((a, b) => new Date(a.envia_en) - new Date(b.envia_en));
        d.pendientes.cantidad = (pend || []).length;
        d.pendientes.proximo = lista.length ? lista[0].envia_en : null;
      }
    }
  } catch (e) {
    d.sesion.error = mensajeDe(e);
  }

  d.ultimoError = leerUltimoErrorRecordatorios();
  return d;
}

const siNo = (v) => (v ? 'sí' : 'no');
const PERMISO = { granted: 'concedido', denied: 'negado', default: 'sin decidir' };

// Filas [rótulo, valor] para la pantalla y para copiar.
export function filasDiagnostico(d) {
  const sw = !d.soporte.serviceWorker ? 'sin soporte'
    : d.sw.error ? `no se pudo leer (${d.sw.error})`
    : `registrado ${siNo(d.sw.registrado)} · activo ${siNo(d.sw.estado === 'activated')}${d.sw.estado && d.sw.estado !== 'activated' ? ` (${d.sw.estado})` : ''} · controla la página ${siNo(d.sw.controla)}`;
  const suscripcion = d.suscripcion.error ? `no se pudo leer (${d.suscripcion.error})`
    : d.suscripcion.existe ? `sí (termina en …${d.suscripcion.final})` : 'no';
  const sesion = d.sesion.activa ? `sí${d.sesion.correo ? ` (${d.sesion.correo})` : ''}`
    : d.sesion.error ? `no (${d.sesion.error})` : 'no';
  const fila = { si: 'sí', no: 'no', 'sin-sesion': 'no se puede saber (sin sesión)', 'sin-suscripcion': 'no se puede saber (sin suscripción en el navegador)', error: `no se pudo consultar (${d.fila.error})` }[d.fila.estado];
  const pendientes = !d.sesion.activa ? 'no se puede saber (sin sesión)'
    : d.pendientes.error ? `no se pudo consultar (${d.pendientes.error})`
    : d.pendientes.cantidad === 0 ? '0'
    : `${d.pendientes.cantidad}${d.pendientes.proximo ? ` · el próximo: ${formatFechaHoraChile(d.pendientes.proximo)} (hora de Chile)` : ''}`;
  const error = d.ultimoError ? `${formatFechaHora(d.ultimoError.en)} · ${d.ultimoError.origen}: ${d.ultimoError.mensaje}` : 'ninguno';
  return [
    ['Navegador', d.navegador],
    ['App instalada', d.instalada ? 'sí' : 'no (abierta en el navegador)'],
    ['Soporte', `serviceWorker ${siNo(d.soporte.serviceWorker)} · PushManager ${siNo(d.soporte.pushManager)} · Notification ${siNo(d.soporte.notification)}`],
    ['Permiso de notificaciones', d.permiso ? `${PERMISO[d.permiso] || d.permiso} (${d.permiso})` : 'sin soporte'],
    ['Service worker', sw],
    ['Suscripción push', suscripcion],
    ['Sesión de Supabase', sesion],
    ['Fila en push_suscripciones', fila],
    ['Recordatorios pendientes', pendientes],
    ['Último error', error]
  ];
}

export function textoDiagnostico(d) {
  return [`Diagnóstico de Recordatorios · ${formatFechaHora(d.generado)}`, ...filasDiagnostico(d).map(([r, v]) => `${r}: ${v}`)].join('\n');
}
