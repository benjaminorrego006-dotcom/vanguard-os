// js/core/recordatorios.js
// Subida de los avisos (docs/RECORDATORIOS-PLAN.md, F3). El teléfono calcula
// (core/recordatorios-calculo.js) y el servidor solo envía: acá se suben los
// avisos de los próximos 7 días a la tabla `recordatorios` (upsert por id
// estable) y se borran los pendientes que ya no corresponden (un hábito
// marcado, una tarea completada, un tipo apagado). Solo se tocan los ids con
// prefijo de recordatorio: los "prueba:" del botón de prueba quedan.
//
// Disparadores: al abrir la app, cuando cambia algo que afecta un aviso
// (eventos de tareas, hábitos, recurrentes o configuración, ver
// 'vg-event-logged' en db.js) y después de cada sync. Sin sesión o sin
// conexión no hace nada: se vuelve a intentar con el próximo disparador.
import { db } from './db.js';
import { getSupabase } from './supabase-client.js';
import { sesionActual } from './push.js';
import { calcularRecordatorios, PREFIJOS_RECORDATORIO } from './recordatorios-calculo.js';

export { calcularRecordatorios };

const DIAS = 7;
const TIPOS_QUE_AFECTAN = /^(tarea_|habito_|recurrente_|configuracion_actualizada$)/;

let enCurso = null;
let otraVez = false;
let temporizador = null;

async function sincronizar() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { omitido: 'sin-conexion' };
  const session = await sesionActual();
  if (!session) return { omitido: 'sin-sesion' };
  const [habitos, tareas, recurrentes, prefs] = await Promise.all([db.getHabitos(), db.getTasks(), db.getRecurring(), db.getPrefsRecordatorios()]);
  const ahora = new Date();
  const lista = calcularRecordatorios({ habitos, tareas, recurrentes }, prefs, ahora, new Date(ahora.getTime() + DIAS * 24 * 60 * 60 * 1000));
  const sb = getSupabase();
  const uid = session.user.id;

  const { data: pendientes, error: errLeer } = await sb.from('recordatorios').select('id').eq('user_id', uid).is('enviado_en', null);
  if (errLeer) throw new Error(errLeer.message);

  if (lista.length) {
    const { error } = await sb.from('recordatorios').upsert(lista.map(r => ({ user_id: uid, ...r, enviado_en: null })), { onConflict: 'user_id,id' });
    if (error) throw new Error(error.message);
  }
  const vigentes = new Set(lista.map(r => r.id));
  const sobran = (pendientes || []).map(r => r.id).filter(id => PREFIJOS_RECORDATORIO.some(p => id.startsWith(p)) && !vigentes.has(id));
  if (sobran.length) {
    const { error } = await sb.from('recordatorios').delete().eq('user_id', uid).is('enviado_en', null).in('id', sobran);
    if (error) throw new Error(error.message);
  }
  return { subidos: lista.length, borrados: sobran.length };
}

// De a una: si llega otro pedido mientras corre, se repite al terminar.
export function sincronizarRecordatorios() {
  if (enCurso) { otraVez = true; return enCurso; }
  enCurso = sincronizar()
    .catch(err => { console.warn('[recordatorios] No se pudieron subir los avisos', err); return { error: err.message }; })
    .finally(() => {
      enCurso = null;
      if (otraVez) { otraVez = false; programarSincronizacion(500); }
    });
  return enCurso;
}

// Junta varios cambios seguidos (marcar tres hábitos) en una sola subida.
export function programarSincronizacion(ms = 1500) {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { sincronizarRecordatorios(); }, ms);
}

let iniciado = false;
export function initRecordatorios() {
  if (iniciado) return;
  iniciado = true;
  programarSincronizacion(3000);
  window.addEventListener('vg-event-logged', (e) => {
    const tipo = e.detail && e.detail.tipo;
    if (tipo && TIPOS_QUE_AFECTAN.test(tipo)) programarSincronizacion();
  });
  window.addEventListener('vg-synced', () => programarSincronizacion());
  window.addEventListener('online', () => programarSincronizacion());
}
