// js/core/sync.js
// Fase 3 del plan de sincronización: sube/baja la tabla `events` de
// Supabase y replica cada evento remoto nuevo sobre los stores derivados
// de IndexedDB — el resto de la app sigue leyendo esos stores igual que
// siempre, sin saber que existe sync. Cero cambios de esquema fuera de
// `events`: los otros 13 stores solo se tocan porque este archivo replica
// en ellos exactamente lo que ya hace cada mutación local en db.js.
//
// Idempotencia: un evento remoto SOLO se aplica si su `id` todavía no
// existe en el store local `events` (chequeo antes de todo). Esto es lo
// que de verdad garantiza que un evento no se aplique dos veces — no el
// cursor de ts (que es solo una optimización para no re-escanear toda la
// tabla remota en cada sync). Es imprescindible: `sobre_transferencia` y
// el revert de `movimiento_eliminado` aplican un DELTA sobre el saldo de
// un sobre, no un valor absoluto — reaplicarlos dos veces corrompería el
// saldo.
import * as idb from './idb.js';
import { getSupabase, isSupabaseConfigured } from './supabase-client.js';

const SYNC_META_KEY = 'syncMeta';

async function getSyncMeta() {
  const row = await idb.getOne('singletons', SYNC_META_KEY);
  return row?.value || { lastPulledTs: 0, lastPushedTs: 0 };
}
async function setSyncMeta(meta) {
  await idb.put('singletons', { key: SYNC_META_KEY, value: meta });
}

async function mergeRow(store, id, patch) {
  const existing = await idb.getOne(store, id);
  await idb.put(store, { ...(existing || {}), ...patch, id });
}

async function setPlanificadorHecha(id, hecha) {
  const row = await idb.getOne('planificador', id);
  if (!row) return;
  await idb.put('planificador', { ...row, hecha });
}

async function mergeSingleton(key, patch, defaultValue) {
  const row = await idb.getOne('singletons', key);
  const current = row ? row.value : defaultValue;
  await idb.put('singletons', { key, value: { ...current, ...patch } });
}

// --- El reducer: un evento remoto -> la misma mutación que ya hizo el
// dispositivo de origen sobre sus stores derivados. Cada caso replica
// línea por línea la función correspondiente en db.js (ver comentario ahí
// si hace falta comparar). No vuelve a llamar logEvent: el evento ya
// existe, viene de afuera.
export async function applyRemoteEvent(event) {
  const { modulo, tipo, entidadId, payload, ts } = event;
  try {
    switch (tipo) {
      // --- Finanzas: sobres ---
      case 'sobre_creado':
      case 'sobre_actualizado':
        await idb.put('envelopes', { ...payload, id: entidadId });
        break;
      case 'sobre_eliminado':
        await idb.remove('envelopes', entidadId);
        break;
      case 'sobre_transferencia': {
        const { fromId, toId, amount } = payload;
        const from = await idb.getOne('envelopes', fromId);
        const to = await idb.getOne('envelopes', toId);
        if (from) await idb.put('envelopes', { ...from, assignedAmount: (Number(from.assignedAmount) || 0) - amount });
        if (to) await idb.put('envelopes', { ...to, assignedAmount: (Number(to.assignedAmount) || 0) + amount });
        break;
      }

      // --- Finanzas: gastos recurrentes ---
      case 'recurrente_creado':
        await idb.put('recurrentes', { ...payload, id: entidadId });
        break;
      case 'recurrente_eliminado':
        await idb.remove('recurrentes', entidadId);
        break;
      case 'recurrente_procesado': {
        const rec = await idb.getOne('recurrentes', entidadId);
        if (rec) await idb.put('recurrentes', { ...rec, lastProcessed: payload.lastProcessed });
        break;
      }

      // --- Finanzas: transacciones ---
      case 'movimiento_registrado':
      case 'movimiento_actualizado':
        await idb.put('transacciones', { ...payload, id: entidadId });
        break;
      case 'movimiento_eliminado': {
        await idb.remove('transacciones', entidadId);
        if (payload.type === 'Transfer') {
          const from = await idb.getOne('envelopes', payload.fromEnvelopeId);
          const to = await idb.getOne('envelopes', payload.toEnvelopeId);
          if (from) await idb.put('envelopes', { ...from, assignedAmount: (Number(from.assignedAmount) || 0) + Number(payload.amount) });
          if (to) await idb.put('envelopes', { ...to, assignedAmount: (Number(to.assignedAmount) || 0) - Number(payload.amount) });
        }
        break;
      }

      // --- Metas (Finanzas y Entreno comparten el store 'goals') ---
      case 'meta_creada':
      case 'meta_actualizada':
        await idb.put('goals', { ...payload, id: entidadId });
        break;
      case 'meta_eliminada':
        await idb.remove('goals', entidadId);
        break;
      case 'meta_progreso_agregado': {
        // payload.currentAmount ya es el valor absoluto resultante (no un
        // delta) tal como lo calculó el dispositivo de origen — replicar
        // ese valor en vez de volver a sumar payload.amount es lo que hace
        // este caso seguro de reaplicar.
        const goal = await idb.getOne('goals', entidadId);
        if (goal) await idb.put('goals', { ...goal, currentAmount: payload.currentAmount });
        break;
      }

      // --- Configuración (singleton 'settings', compartido Finanzas/Entreno) ---
      case 'configuracion_actualizada':
        await mergeSingleton('settings', payload, { allocationRule: { needs: 0.5, wants: 0.3, savings: 0.2 }, restTimerSecs: 90 });
        break;
      case 'onboarding_inicial_completado':
        await idb.put('singletons', { key: 'onboardingInicialCompletado', value: true });
        break;

      // --- Entreno: rutinas y sesiones ---
      case 'rutina_creada':
        await idb.put('rutinas', { ...payload, id: entidadId });
        break;
      case 'rutina_generada':
        break; // solo auditoría (spec-generador-rutinas.md) — no toca ningún store derivado
      case 'rutina_eliminada':
        await idb.remove('rutinas', entidadId);
        break;
      case 'sesion_registrada':
        await idb.put('sesiones', { ...payload, id: entidadId });
        break;

      // --- Entreno: singletons ---
      case 'perfil_actualizado':
        await idb.put('singletons', { key: 'profile', value: payload });
        break;
      case 'generador_config_actualizada':
        await idb.put('singletons', { key: 'entrenoGeneradorConfig', value: payload });
        break;
      case 'nivel_entrenamiento_actualizado':
        await idb.put('singletons', { key: 'nivelEntrenamiento', value: payload });
        break;
      case 'sugerencia_nivel_confirmada': {
        const row = await idb.getOne('singletons', 'nivelEntrenamiento');
        const nivel = row?.value || { tiempoEntrenando: 'menos-1', overridesPorRama: {}, sugerenciasDescartadas: {} };
        const overridesPorRama = { ...nivel.overridesPorRama, [payload.rama]: payload.nivelSugerido };
        const sugerenciasDescartadas = { ...nivel.sugerenciasDescartadas };
        delete sugerenciasDescartadas[payload.rama];
        await idb.put('singletons', { key: 'nivelEntrenamiento', value: { ...nivel, overridesPorRama, sugerenciasDescartadas } });
        break;
      }
      case 'sugerencia_nivel_descartada': {
        const row = await idb.getOne('singletons', 'nivelEntrenamiento');
        const nivel = row?.value || { tiempoEntrenando: 'menos-1', overridesPorRama: {}, sugerenciasDescartadas: {} };
        await idb.put('singletons', { key: 'nivelEntrenamiento', value: { ...nivel, sugerenciasDescartadas: { ...nivel.sugerenciasDescartadas, [payload.rama]: payload.nivelSugerido } } });
        break;
      }
      case 'pr_favorito_toggled': {
        const row = await idb.getOne('singletons', 'prFavoritos');
        let favoritos = row?.value || [];
        const has = favoritos.includes(entidadId);
        if (payload.favorito && !has) favoritos = [...favoritos, entidadId];
        else if (!payload.favorito && has) favoritos = favoritos.filter(f => f !== entidadId);
        await idb.put('singletons', { key: 'prFavoritos', value: favoritos });
        break;
      }

      // --- Tareas (kanban) y Planificador semanal: mismos `tipo`, store
      // distinto según `modulo` — ver PENDIENTES-CODE-REVIEW o db.js si hace
      // falta releer por qué comparten nombre de evento.
      case 'tarea_creada':
        await idb.put(modulo === 'planificador' ? 'planificador' : 'tareas', { ...payload, id: entidadId });
        break;
      case 'tarea_actualizada':
        await mergeRow('tareas', entidadId, payload);
        break;
      case 'tarea_completada':
        if (modulo === 'planificador') await setPlanificadorHecha(entidadId, true);
        else await mergeRow('tareas', entidadId, payload); // payload es la fila completa (incluye completedAt)
        break;
      case 'tarea_descompletada':
        await setPlanificadorHecha(entidadId, false);
        break;
      case 'tarea_eliminada':
        await idb.remove(modulo === 'planificador' ? 'planificador' : 'tareas', entidadId);
        break;

      // --- Hábitos ---
      case 'habito_creado': {
        // El payload solo trae `nombre` (ver comentario en db.js) — createdAt
        // se reconstruye desde el ts del evento, que es efectivamente cuándo
        // se creó.
        const existing = await idb.getOne('habitos', entidadId);
        await idb.put('habitos', {
          id: entidadId,
          nombre: payload.nombre,
          createdAt: existing?.createdAt || new Date(ts).toISOString(),
          marcas: existing?.marcas || {}
        });
        break;
      }
      case 'habito_renombrado':
        await mergeRow('habitos', entidadId, { nombre: payload.nombre });
        break;
      case 'habito_eliminado':
        await idb.remove('habitos', entidadId);
        break;
      case 'habito_marcado':
      case 'habito_desmarcado': {
        const row = await idb.getOne('habitos', entidadId);
        if (!row) break;
        const marcas = { ...(row.marcas || {}) };
        if (tipo === 'habito_marcado') marcas[payload.fecha] = true;
        else delete marcas[payload.fecha];
        await idb.put('habitos', { ...row, marcas });
        break;
      }

      // --- Ritual matutino (una fila por día, keyPath = fecha) ---
      case 'ritual_iniciado':
      case 'ritual_actualizado': {
        const fecha = entidadId;
        const row = (await idb.getOne('ritual', fecha)) || { fecha, mision: '', proyecto: '', pilar: '', servir: '', gratitud: '', energia: null };
        row[payload.campo] = payload.valor;
        await idb.put('ritual', row);
        break;
      }

      // --- Anotaciones ---
      case 'categoria_creada':
        await idb.put('notas_categorias', { ...payload, id: entidadId });
        break;
      case 'categoria_eliminada': {
        await idb.remove('notas_categorias', entidadId);
        const notas = await idb.getAll('notas');
        for (const n of notas.filter(n => n.catId === entidadId)) await idb.remove('notas', n.id);
        break;
      }
      case 'nota_creada': {
        const existing = await idb.getOne('notas', entidadId);
        await idb.put('notas', {
          id: entidadId,
          catId: payload.catId,
          titulo: payload.titulo,
          texto: payload.texto || '',
          createdAt: existing?.createdAt || new Date(ts).toISOString()
        });
        break;
      }
      case 'nota_eliminada':
        await idb.remove('notas', entidadId);
        break;

      default:
        console.warn('[sync] Tipo de evento sin handler de replay:', tipo);
    }
  } catch (e) {
    console.error('[sync] Error aplicando evento remoto', tipo, e);
  }
}

// --- Orquestación: subir eventos locales que falten, bajar eventos
// remotos que falten. No se llama nunca sin sesión ni sin Supabase
// configurado.
function rowToEvent(row) {
  return { id: row.id, ts: row.ts, modulo: row.modulo, tipo: row.tipo, entidadId: row.entidad_id, payload: row.payload, schemaVersion: row.schema_version };
}
function eventToRow(event, userId) {
  return { id: event.id, user_id: userId, ts: event.ts, modulo: event.modulo, tipo: event.tipo, entidad_id: event.entidadId, payload: event.payload, schema_version: event.schemaVersion || 1 };
}

export async function pushLocalEvents() {
  if (!isSupabaseConfigured() || !navigator.onLine) return { pushed: 0 };
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { pushed: 0 };

  const meta = await getSyncMeta();
  const pending = await idb.getAllByIndex('events', 'ts', IDBKeyRange.lowerBound(meta.lastPushedTs));
  if (pending.length === 0) return { pushed: 0 };

  const BATCH = 500;
  let pushed = 0;
  let maxTs = meta.lastPushedTs;
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH).map(e => eventToRow(e, session.user.id));
    const { error } = await supabase.from('events').upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
    if (error) { console.error('[sync] Error subiendo eventos', error); await setSyncMeta({ ...meta, lastPushedTs: maxTs }); return { pushed, error }; }
    pushed += chunk.length;
    maxTs = Math.max(maxTs, ...chunk.map(r => r.ts));
  }
  await setSyncMeta({ ...meta, lastPushedTs: maxTs });
  return { pushed };
}

export async function pullRemoteEvents() {
  if (!isSupabaseConfigured() || !navigator.onLine) return { pulled: 0 };
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { pulled: 0 };

  const meta = await getSyncMeta();
  const { data, error } = await supabase
    .from('events')
    .select('id, ts, modulo, tipo, entidad_id, payload, schema_version')
    .gte('ts', meta.lastPulledTs)
    .order('ts', { ascending: true });
  if (error) { console.error('[sync] Error bajando eventos remotos', error); return { pulled: 0, error }; }

  let pulled = 0;
  let maxTs = meta.lastPulledTs;
  for (const row of data) {
    if (row.ts > maxTs) maxTs = row.ts;
    const already = await idb.getOne('events', row.id);
    if (already) continue; // ver nota de idempotencia arriba del archivo
    const event = rowToEvent(row);
    await idb.put('events', event);
    await applyRemoteEvent(event);
    pulled++;
  }
  await setSyncMeta({ ...meta, lastPulledTs: maxTs });
  return { pulled };
}

export async function runFullSync() {
  const push = await pushLocalEvents();
  const pull = await pullRemoteEvents();
  if ((push.pushed > 0 || pull.pulled > 0) && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('budget-updated'));
    window.dispatchEvent(new CustomEvent('vg-synced', { detail: { push, pull } }));
  }
  return { push, pull };
}

async function pushSingleEvent(event) {
  if (!isSupabaseConfigured() || !navigator.onLine) return;
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const { error } = await supabase.from('events').upsert([eventToRow(event, session.user.id)], { onConflict: 'id', ignoreDuplicates: true });
  if (error) { console.error('[sync] Error subiendo evento en tiempo real', error); return; }
  const meta = await getSyncMeta();
  if (event.ts > meta.lastPushedTs) await setSyncMeta({ ...meta, lastPushedTs: event.ts });
}

let initialized = false;

// Se llama una sola vez al arrancar la app (ver app.js). No hace nada si
// Supabase no está configurado todavía.
export async function initSync() {
  if (!isSupabaseConfigured() || initialized) return;
  initialized = true;

  window.addEventListener('vg-event-logged', (e) => { pushSingleEvent(e.detail); });
  window.addEventListener('online', () => { runFullSync(); });

  const supabase = getSupabase();
  supabase.auth.onAuthStateChange((eventName) => {
    if (eventName === 'SIGNED_IN') runFullSync();
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (session) runFullSync();
}
