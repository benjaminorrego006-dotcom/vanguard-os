import { getEjercicioMetadata, GRUPO_MUSCULAR_ORDEN } from './ejercicios-catalogo.js';
import * as idb from './idb.js';

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const DEFAULT_TX_SHAPE = {
  id: '',
  date: '',
  goalId: null,
  envelopeId: null, // NEW: Vinculación con Sobres
  type: 'Gasto',
  category: 'Needs',
  label: '',
  amount: 0
};

const DEFAULT_GOAL_SHAPE = {
  id: '',
  name: 'Meta',
  targetAmount: 0,
  currentAmount: 0,
  icon: 'shield',
  completed: false,
  dominio: 'finanzas',   // 'finanzas' | 'entreno'
  tipo: 'dinero',        // 'dinero' | 'sesiones' | 'km' | 'personalizado'
  unidad: '',            // texto a mostrar junto al número (sesiones, km...); dinero usa formatCurrency
  deadline: null,
  autoTrack: false,      // true solo en metas tipo 'sesiones': se incrementan solas al registrar una sesión
  rutinaCategoriaFiltro: null // opcional: limita el auto-track a 'gym'/'calistenia'/'hiit'
};

const DEFAULT_SETTINGS_SHAPE = {
  allocationRule: { needs: 0.5, wants: 0.3, savings: 0.2 },
  restTimerSecs: 90
};

const DEFAULT_ENVELOPES = [
  { id: 'env_1', name: 'Supermercado', category: 'Needs', icon: 'shopping-cart' },
  { id: 'env_2', name: 'Servicios', category: 'Needs', icon: 'zap' },
  { id: 'env_3', name: 'Transporte', category: 'Needs', icon: 'car' },
  { id: 'env_4', name: 'Arriendo', category: 'Needs', icon: 'home' },
  { id: 'env_5', name: 'Salidas y Ocio', category: 'Wants', icon: 'coffee' },
  { id: 'env_6', name: 'Suscripciones', category: 'Wants', icon: 'tv' }
];

// --- Puente hacia IndexedDB -------------------------------------------
// Cada store de entidad se comporta como el viejo array-en-localStorage:
// se lee completo y se reescribe completo. Es menos "idiomático" que hacer
// put/delete de una sola fila, pero preserva 1:1 el patrón de lectura-
// modificación-escritura que ya usaba cada método de abajo, minimizando el
// riesgo de la migración.
async function idbGetArray(store) {
  try { return await idb.getAll(store); }
  catch (e) { console.error(`[Vanguard OS] Error leyendo IndexedDB store "${store}"`, e); return []; }
}
async function idbSetArray(store, arr) {
  try { await idb.putAllReplacing(store, arr); }
  catch (e) { console.error(`[Vanguard OS] Error escribiendo IndexedDB store "${store}"`, e); }
}
async function idbGetSingleton(key, defaultValue) {
  try {
    const row = await idb.getOne('singletons', key);
    return row ? row.value : defaultValue;
  } catch (e) {
    console.error(`[Vanguard OS] Error leyendo singleton "${key}"`, e);
    return defaultValue;
  }
}
async function idbSetSingleton(key, value) {
  try { await idb.put('singletons', { key, value }); }
  catch (e) { console.error(`[Vanguard OS] Error escribiendo singleton "${key}"`, e); }
}

// localStorage síncrono, usado SOLO para: (a) leer los datos legacy durante
// la migración a IndexedDB, y (b) el puñado de claves que a propósito se
// quedan fuera de IndexedDB (ver más abajo). Ya no es el motor de
// persistencia principal de la app.
const safeGetItem = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Base de datos corrupta en la clave: ${key}. Restaurando valor por defecto.`);
    return defaultValue;
  }
};

// --- Almacenamiento persistente -----------------------------------------
// iOS Safari puede borrar el IndexedDB de una PWA no instalada tras ~7 días
// sin uso, y Chrome desaloja datos bajo presión de espacio, salvo que el
// origen tenga concedido "almacenamiento persistente". Se pide una sola vez
// al arrancar (persisted() primero, para no re-pedir si ya estaba
// concedido) y el resultado queda guardado para poder mostrarlo en Ajustes.
// El navegador decide según heurísticas propias (app instalada, engagement
// del usuario) — nunca asumir que persist() devuelve true, sobre todo en
// iOS, donde el soporte es más débil y por eso el riesgo es mayor.
async function solicitarAlmacenamientoPersistente() {
  if (!(navigator.storage && navigator.storage.persist && navigator.storage.persisted)) return;

  let concedido = await navigator.storage.persisted();
  if (!concedido) {
    concedido = await navigator.storage.persist();
  }
  await idbSetSingleton('storagePersistente', { concedido, verificadoEn: new Date().toISOString() });
}

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
};

// --- Racha de días consecutivos: algoritmo compartido ------------------
// getRachaHiit, getRachaGeneral y getRachaTareas calculaban cada una por
// su cuenta "cuántos días seguidos hay actividad" a partir de timestamps
// de medianoche — mismo algoritmo, tres copias. Ahora es una función pura
// que solo necesita la lista de días únicos (ya ordenada de más reciente a
// más antiguo); de dónde salen esos días (eventos, sesiones, lo que sea)
// lo decide cada caller.
function calcularRachaDesdeDias(sortedDays) {
  if (sortedDays.length === 0) return { actual: 0, mejor: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  let actual = 0;
  if (sortedDays[0] === todayTime || sortedDays[0] === todayTime - 86400000) {
    let checkTime = sortedDays[0];
    let index = 0;
    while (index < sortedDays.length && sortedDays[index] === checkTime) {
      actual++;
      checkTime -= 86400000;
      index++;
    }
  }

  let mejor = 1;
  let tempMejor = 1;
  for (let i = 0; i < sortedDays.length - 1; i++) {
    if (sortedDays[i] - sortedDays[i + 1] === 86400000) {
      tempMejor++;
      if (tempMejor > mejor) mejor = tempMejor;
    } else {
      tempMejor = 1;
    }
  }

  return { actual, mejor };
}

// Timestamps de medianoche (uno por día con al menos un evento), de más
// reciente a más antiguo — la forma que espera calcularRachaDesdeDias.
function diasUnicosDesdeEventos(eventos) {
  const uniqueDays = new Set();
  eventos.forEach(e => {
    const d = new Date(e.ts);
    d.setHours(0, 0, 0, 0);
    uniqueDays.add(d.getTime());
  });
  return Array.from(uniqueDays).sort((a, b) => b - a);
}

// --- Log de eventos central --------------------------------------------
// Cada mutación de cualquier módulo (entreno/finanzas/tareas) agrega acá
// una fila inmutable: nunca se edita ni se borra un evento existente. Sirve
// como fuente para derivar racha global, heatmap de actividad, insignias
// desbloqueadas y la bitácora de una entidad puntual, en vez de guardar
// esos agregados como campos aparte que podrían desincronizarse.
async function logEvent({ modulo, tipo, entidadId = null, payload = {}, ts = null }) {
  const event = {
    id: generateId(),
    ts: (typeof ts === 'number' && !isNaN(ts)) ? ts : Date.now(),
    modulo,
    tipo,
    entidadId,
    payload,
    schemaVersion: 1
  };
  try { await idb.put('events', event); }
  catch (e) { console.error('[Vanguard OS] Error registrando evento', tipo, e); }
  memoCache.clear(); // ver nota sobre memoize() más abajo: un evento nuevo invalida todo lo cacheado.
  return event;
}

// --- Memoización de agregaciones caras sobre el log de eventos -----------
// getBadges(), las rachas, los heatmaps y las pestañas de Análisis
// recalculan todo desde cero en cada render — por diseño, para que nunca
// quede un agregado guardado que se desincronice del dato real. El costo es
// que un solo render termina pidiendo lo mismo varias veces (ej. Dashboard
// hace Promise.all de ~8 llamadas; getBadges() sola dispara 6 getBudget()
// internos por getMesesSinExceder). Se cachea el resultado hasta que: (a)
// logEvent() confirma que algo realmente cambió (arriba), o (b) pasan
// MEMO_TTL_MS — esto último es solo una red de seguridad para el caso
// límite en que nada dispare un logEvent() mientras tanto (ej. un
// recurrente que se volvió "vencido" por el simple paso del tiempo, sin
// que el usuario haya tocado nada); tolerar unos segundos de esa clase de
// desactualización es imperceptible, no vale la pena resolverlo con más
// cuidado. Deliberadamente NO se usa para getBudget() ni para ningún
// método con efectos secundarios (ej. processRecurringTransactions puede
// escribir), ni para los getters simples de un solo store (ya son baratos
// y algunos flujos de mutación dependen de leerlos frescos).
const MEMO_TTL_MS = 5000;
const memoCache = new Map();

function memoize(fn) {
  return function (...args) {
    const key = fn.name + '|' + JSON.stringify(args);
    const cached = memoCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.promise;
    const promise = Promise.resolve(fn.apply(this, args));
    memoCache.set(key, { promise, expiresAt: Date.now() + MEMO_TTL_MS });
    promise.catch(() => memoCache.delete(key));
    return promise;
  };
}

// Ordena por fecha de creación ascendente (más viejo primero), igual que el
// orden de inserción que tenían los arrays de localStorage. IndexedDB
// getAll() devuelve las filas ordenadas por su keyPath (un uuid), no por
// orden de inserción, así que hace falta este sort explícito para no
// alterar el orden en que las listas se mostraban antes.
function sortByCreatedAt(arr) {
  return [...arr].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

// --- Migración desde localStorage ---------------------------------------
// Corre una sola vez (marcada con 'vg_migrated_to_idb'): copia cada array
// legacy a su store de IndexedDB — aplicando la misma normalización
// defensiva que antes corría en cada boot vía migrateAllStoredData() — y
// reconstruye el log de eventos a partir del historial existente, usando
// la fecha real de cada registro para que racha/heatmap/insignias no
// arranquen en cero justo después de migrar.
//
// Rutinas, metas y sobres no tenían un campo de fecha de creación antes de
// esta migración, así que no se les inventa un evento retroactivo (sí se
// les asigna un `createdAt` sintético, espaciado según su posición original
// en el array, solo para preservar el orden en que se mostraban en las
// listas). Desde ahora en más, toda mutación nueva sí queda en el log.
async function migrateFromLocalStorageIfNeeded() {
  if (localStorage.getItem('vg_migrated_to_idb') === 'true') return;

  const isNumericLabel = (label) => /^\d+$/.test((label || '').trim());

  let rawTxs = [];
  try { rawTxs = JSON.parse(localStorage.getItem('vg_transactions') || 'null') || []; } catch (e) { rawTxs = []; }
  const txs = (Array.isArray(rawTxs) ? rawTxs : []).map(tx => {
    let merged = { ...DEFAULT_TX_SHAPE, ...tx, amount: toSafeNumber(tx.amount) };
    if (isNumericLabel(merged.label)) {
      merged.label = merged.type === 'Ingreso' ? 'Ingreso' : (merged.category === 'Savings' ? 'Ahorro' : (merged.category === 'Needs' ? 'Necesidades' : 'Deseos'));
    }
    return merged;
  });
  if (txs.length) await idbSetArray('transacciones', txs);

  let rawGoals = [];
  try { rawGoals = JSON.parse(localStorage.getItem('vg_savings_goals') || 'null') || []; } catch (e) { rawGoals = []; }
  const goalsBase = Array.isArray(rawGoals) ? rawGoals : [];
  const goals = goalsBase.map((g, i) => ({
    ...DEFAULT_GOAL_SHAPE, ...g,
    targetAmount: toSafeNumber(g.targetAmount),
    currentAmount: toSafeNumber(g.currentAmount),
    createdAt: g.createdAt || new Date(Date.now() - (goalsBase.length - i) * 1000).toISOString()
  }));
  if (goals.length) await idbSetArray('goals', goals);

  let rawSettings = null;
  try { rawSettings = JSON.parse(localStorage.getItem('vg_settings') || 'null'); } catch (e) { rawSettings = null; }
  let settings = { ...DEFAULT_SETTINGS_SHAPE };
  if (rawSettings && typeof rawSettings === 'object') {
    settings = { ...DEFAULT_SETTINGS_SHAPE, ...rawSettings };
    if (!settings.allocationRule || typeof settings.allocationRule !== 'object') settings.allocationRule = DEFAULT_SETTINGS_SHAPE.allocationRule;
  }
  await idbSetSingleton('settings', settings);

  let rawEnvelopes = null;
  try { rawEnvelopes = JSON.parse(localStorage.getItem('vg_envelopes') || 'null'); } catch (e) { rawEnvelopes = null; }
  const envelopesBase = (Array.isArray(rawEnvelopes) && rawEnvelopes.length > 0) ? rawEnvelopes : DEFAULT_ENVELOPES;
  const envelopes = envelopesBase.map((e, i) => ({
    ...e,
    createdAt: e.createdAt || new Date(Date.now() - (envelopesBase.length - i) * 1000).toISOString()
  }));
  await idbSetArray('envelopes', envelopes);

  const rawRecurring = safeGetItem('vg_recurring', []);
  if (rawRecurring.length) await idbSetArray('recurrentes', rawRecurring);

  let rawRutinas = safeGetItem('vg_routines', []);
  rawRutinas = rawRutinas.map((r, i) => ({
    ...r,
    createdAt: r.createdAt || new Date(Date.now() - (rawRutinas.length - i) * 1000).toISOString()
  }));
  if (rawRutinas.length) await idbSetArray('rutinas', rawRutinas);

  const rawSesiones = safeGetItem('vg_sessions', []);
  if (rawSesiones.length) await idbSetArray('sesiones', rawSesiones);

  const rawTareas = safeGetItem('vg_tasks', []);
  if (rawTareas.length) await idbSetArray('tareas', rawTareas);

  const rawProfile = safeGetItem('vg_profile', null);
  if (rawProfile) await idbSetSingleton('profile', rawProfile);

  const rawFavoritos = safeGetItem('vg_pr_favoritos', []);
  if (rawFavoritos.length) await idbSetSingleton('prFavoritos', rawFavoritos);

  // Backfill del log de eventos a partir del historial real.
  const backfill = [];
  txs.forEach(t => {
    const ts = new Date(t.date).getTime();
    backfill.push({ modulo: 'finanzas', tipo: 'movimiento_registrado', entidadId: t.id, payload: t, ts: isNaN(ts) ? Date.now() : ts });
  });
  rawSesiones.forEach(s => {
    const ts = new Date(s.fecha).getTime();
    backfill.push({ modulo: 'entreno', tipo: 'sesion_registrada', entidadId: s.id, payload: s, ts: isNaN(ts) ? Date.now() : ts });
  });
  rawTareas.forEach(t => {
    const createdTs = t.createdAt ? new Date(t.createdAt).getTime() : Date.now();
    backfill.push({ modulo: 'tareas', tipo: 'tarea_creada', entidadId: t.id, payload: t, ts: isNaN(createdTs) ? Date.now() : createdTs });
    if (t.completedAt) {
      const doneTs = new Date(t.completedAt).getTime();
      if (!isNaN(doneTs)) backfill.push({ modulo: 'tareas', tipo: 'tarea_completada', entidadId: t.id, payload: t, ts: doneTs });
    }
  });

  for (const ev of backfill) {
    await logEvent(ev);
  }

  localStorage.setItem('vg_migrated_to_idb', 'true');
}

// Hash del PIN de bloqueo. Usa claves con prefijo "vglock_" (NO "vg_") a
// propósito, para que exportAllData/importAllData (que solo copian claves
// "vg_"/"vanguard:") nunca muevan el PIN entre dispositivos ni lo metan en
// un respaldo: el PIN es 100% local a este navegador. Por la misma razón
// se queda en localStorage y no migra a IndexedDB: el candado de la app
// tiene que poder consultarse de forma inmediata al arrancar, antes de que
// la conexión a IndexedDB (y su eventual migración) haya terminado.
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const db = {
  async getDashboardStats() {
    const sesiones = await idbGetArray('sesiones');
    if (!sesiones.length) return { sesionesSemana: 0, rachaSemanas: 0 };

    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - distanceToMonday);
    startOfThisWeek.setHours(0,0,0,0);

    let sesionesSemana = 0;
    const weekIds = new Set();
    const knownMonday = new Date('2024-01-01T00:00:00Z'); // A Monday

    sesiones.forEach(s => {
      const sDate = new Date(s.fecha);
      if (sDate >= startOfThisWeek) sesionesSemana++;

      const diffTime = sDate - knownMonday;
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      weekIds.add(diffWeeks);
    });

    const currentWeekDiff = Math.floor((now - knownMonday) / (1000 * 60 * 60 * 24 * 7));
    let racha = 0;
    let checkWeek = currentWeekDiff;

    if (!weekIds.has(checkWeek) && weekIds.has(checkWeek - 1)) {
        checkWeek--;
    }

    while (weekIds.has(checkWeek)) {
      racha++;
      checkWeek--;
    }

    return { sesionesSemana, rachaSemanas: racha };
  },
  _triggerUpdate() { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('budget-updated')); },

  async init() {
    try {
      await migrateFromLocalStorageIfNeeded();
    } catch (e) {
      console.error('[Vanguard OS] Error migrando datos a IndexedDB', e);
    }
    try {
      await solicitarAlmacenamientoPersistente();
    } catch (e) {
      console.error('[Vanguard OS] Error solicitando almacenamiento persistente', e);
    }
  },

  // Estado de almacenamiento para mostrar en Ajustes: si el navegador
  // concedió persistencia (ver solicitarAlmacenamientoPersistente arriba) y,
  // cuando el navegador lo soporta, cuánto espacio se está usando.
  async getEstadoAlmacenamiento() {
    const persistencia = await idbGetSingleton('storagePersistente', null);
    let estimacion = null;
    if (navigator.storage && navigator.storage.estimate) {
      try { estimacion = await navigator.storage.estimate(); }
      catch (e) { estimacion = null; }
    }
    return { persistencia, estimacion };
  },

  async getAllocationRule() {
    const settings = await idbGetSingleton('settings', DEFAULT_SETTINGS_SHAPE);
    return settings.allocationRule || DEFAULT_SETTINGS_SHAPE.allocationRule;
  },

  async setAllocationRule(rule) {
    const settings = await idbGetSingleton('settings', { ...DEFAULT_SETTINGS_SHAPE });
    settings.allocationRule = rule;
    await idbSetSingleton('settings', settings); this._triggerUpdate();
    await logEvent({ modulo: 'finanzas', tipo: 'configuracion_actualizada', payload: { allocationRule: rule } });
  },

  async getRestTimerSecs() {
    const settings = await idbGetSingleton('settings', DEFAULT_SETTINGS_SHAPE);
    return settings.restTimerSecs || DEFAULT_SETTINGS_SHAPE.restTimerSecs;
  },

  async setRestTimerSecs(secs) {
    const settings = await idbGetSingleton('settings', { ...DEFAULT_SETTINGS_SHAPE });
    settings.restTimerSecs = Math.max(15, toSafeNumber(secs));
    await idbSetSingleton('settings', settings); this._triggerUpdate();
    await logEvent({ modulo: 'entreno', tipo: 'configuracion_actualizada', payload: { restTimerSecs: settings.restTimerSecs } });
  },

  // --- PIN de acceso (100% local, ver nota sobre "vglock_" en sha256Hex) ---
  // OJO: a propósito NO son async (salvo las que ya lo eran por el hash) —
  // isPinEnabled() se usa de forma síncrona para decidir en el primer
  // render si hay que mostrar el candado (app.js) y dentro de un template
  // string síncrono (renderPinSecuritySection en finanzas.js). Como el PIN
  // vive en localStorage (no en IndexedDB), no hay ninguna razón real para
  // volverlas async.
  isPinEnabled() {
    return localStorage.getItem('vglock_enabled') === 'true' && !!localStorage.getItem('vglock_hash');
  },
  async setPin(pin) {
    const hash = await sha256Hex(pin);
    localStorage.setItem('vglock_hash', hash);
    localStorage.setItem('vglock_enabled', 'true');
  },
  async verifyPin(pin) {
    const hash = await sha256Hex(pin);
    return hash === localStorage.getItem('vglock_hash');
  },
  disablePin() {
    localStorage.removeItem('vglock_hash');
    localStorage.removeItem('vglock_enabled');
  },
  // Único mecanismo de recuperación: borra TODOS los datos locales (no solo
  // el PIN), por diseño — si el reset fuera gratis, el PIN no protegería
  // nada. Por eso activar el PIN exige antes exportar un respaldo (ver
  // btn-enable-pin en finanzas.js), para que esto sea recuperable. Ahora
  // también borra la base de IndexedDB completa (ahí vive todo salvo el
  // propio PIN y un par de preferencias sueltas).
  async wipeAllLocalData() {
    localStorage.clear();
    await idb.deleteDatabase();
  },

  // --- Envelopes API ---
  async createEnvelope(data) {
    let envs = await this.getEnvelopes();
    const newEnv = { id: generateId(), createdAt: new Date().toISOString(), ...data };
    envs.push(newEnv);
    await idbSetArray('envelopes', envs); this._triggerUpdate();
    await logEvent({ modulo: 'finanzas', tipo: 'sobre_creado', entidadId: newEnv.id, payload: newEnv });
    return newEnv;
  },
  async updateEnvelope(id, data) {
    let envs = await this.getEnvelopes();
    const idx = envs.findIndex(e => e.id === id);
    if(idx > -1) {
      envs[idx] = { ...envs[idx], ...data };
      await idbSetArray('envelopes', envs); this._triggerUpdate();
      await logEvent({ modulo: 'finanzas', tipo: 'sobre_actualizado', entidadId: id, payload: envs[idx] });
    }
  },
  async deleteEnvelope(id) {
    let envs = await this.getEnvelopes();
    envs = envs.filter(e => e.id !== id);
    await idbSetArray('envelopes', envs); this._triggerUpdate();
    await logEvent({ modulo: 'finanzas', tipo: 'sobre_eliminado', entidadId: id, payload: {} });
  },
  async transferEnvelopeFunds(fromId, toId, amount) {
    let envs = await this.getEnvelopes();
    const fromIdx = envs.findIndex(e => e.id === fromId);
    const toIdx = envs.findIndex(e => e.id === toId);

    if (fromIdx > -1 && toIdx > -1) {
      envs[fromIdx].assignedAmount = (Number(envs[fromIdx].assignedAmount) || 0) - amount;
      envs[toIdx].assignedAmount = (Number(envs[toIdx].assignedAmount) || 0) + amount;
      await idbSetArray('envelopes', envs);
      this._triggerUpdate();
      await logEvent({ modulo: 'finanzas', tipo: 'sobre_transferencia', payload: { fromId, toId, amount } });

      let txs = await idbGetArray('transacciones');
      const transferTx = {
        id: generateId(),
        date: new Date().toISOString(),
        type: 'Transfer',
        amount: amount,
        label: 'Transferencia entre sobres',
        fromEnvelopeId: fromId,
        toEnvelopeId: toId
      };
      txs.push(transferTx);
      await idbSetArray('transacciones', txs);
      this._triggerUpdate();
      await logEvent({ modulo: 'finanzas', tipo: 'movimiento_registrado', entidadId: transferTx.id, payload: transferTx });
    }
  },

  // --- Recurring Expenses API ---
  async getRecurring() {
    return sortByCreatedAt(await idbGetArray('recurrentes'));
  },
  async createRecurring(data) {
    let all = await this.getRecurring();
    const newItem = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      lastProcessed: null,
      ...data
    };
    all.push(newItem);
    await idbSetArray('recurrentes', all); this._triggerUpdate();
    await logEvent({ modulo: 'finanzas', tipo: 'recurrente_creado', entidadId: newItem.id, payload: newItem });
    return newItem;
  },
  async deleteRecurring(id) {
    let all = await this.getRecurring();
    all = all.filter(r => r.id !== id);
    await idbSetArray('recurrentes', all); this._triggerUpdate();
    await logEvent({ modulo: 'finanzas', tipo: 'recurrente_eliminado', entidadId: id, payload: {} });
  },
  async processRecurringTransactions() {
    let recurring = await this.getRecurring();
    if (recurring.length === 0) return false;

    let txs = await idbGetArray('transacciones');
    let envelopes = await this.getEnvelopes();
    let updated = false;
    const generatedTxs = [];

    const today = new Date();
    today.setHours(0,0,0,0);

    recurring.forEach(req => {
      let lastDate = req.lastProcessed ? new Date(req.lastProcessed) : new Date(req.createdAt);

      let nextTarget = new Date(lastDate.getFullYear(), lastDate.getMonth(), req.dayOfMonth);
      // Evitar overflow de meses (ej. 31 de Febrero) limitando el dayOfMonth a 28 en UI.

      if (lastDate >= nextTarget || req.lastProcessed) {
        nextTarget.setMonth(nextTarget.getMonth() + 1);
      }

      while (today >= nextTarget) {
        const env = envelopes.find(e => e.id === req.envelopeId);
        const cat = env ? env.category : 'Needs';

        const newTx = {
          id: generateId(),
          date: nextTarget.toISOString(),
          type: 'Gasto',
          category: cat,
          label: req.label + ' (Auto)',
          amount: req.amount,
          goalId: null,
          envelopeId: req.envelopeId
        };
        txs.push(newTx);
        generatedTxs.push(newTx);

        req.lastProcessed = nextTarget.toISOString();
        updated = true;
        nextTarget.setMonth(nextTarget.getMonth() + 1);
      }
    });

    if (updated) {
      await idbSetArray('recurrentes', recurring);
      await idbSetArray('transacciones', txs); this._triggerUpdate();
      for (const tx of generatedTxs) {
        await logEvent({ modulo: 'finanzas', tipo: 'movimiento_registrado', entidadId: tx.id, payload: tx, ts: new Date(tx.date).getTime() });
      }
      return true;
    }
    return false;
  },

  async getEnvelopes() {
    return sortByCreatedAt(await idbGetArray('envelopes'));
  },

  // --------------------------

  async addTransaction(tx) {
    const prevBudget = await this.getBudget();

    const txs = await idbGetArray('transacciones');
    const now = new Date();
    const dateStr = tx.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const newTx = { id: generateId(), date: dateStr, goalId: null, envelopeId: null, ...tx };
    txs.push(newTx);
    await idbSetArray('transacciones', txs); this._triggerUpdate();
    await logEvent({ modulo: 'finanzas', tipo: 'movimiento_registrado', entidadId: newTx.id, payload: newTx });

    const newBudget = await this.getBudget();
    let triggerAlert = null;
    if (prevBudget.alertLevel !== newBudget.alertLevel && (newBudget.alertLevel === 'warning' || newBudget.alertLevel === 'exceeded')) {
      const prevLvl = prevBudget.alertLevel === 'none' ? 0 : (prevBudget.alertLevel === 'ok' ? 1 : (prevBudget.alertLevel === 'warning' ? 2 : 3));
      const newLvl = newBudget.alertLevel === 'warning' ? 2 : 3;
      if (newLvl > prevLvl) triggerAlert = newBudget.alertLevel;
    }
    return { triggerAlert, excessAmount: newBudget.expenses + newBudget.savedThisMonth - newBudget.budgeted };
  },

  async updateTransaction(id, data) {
    const prevBudget = await this.getBudget();
    let txs = await idbGetArray('transacciones');
    const idx = txs.findIndex(t => t.id === id);
    if(idx > -1) {
      txs[idx] = { ...txs[idx], ...data };
      await idbSetArray('transacciones', txs); this._triggerUpdate();
      await logEvent({ modulo: 'finanzas', tipo: 'movimiento_actualizado', entidadId: id, payload: txs[idx] });
    }
    const newBudget = await this.getBudget();
    let triggerAlert = null;
    if (prevBudget.alertLevel !== newBudget.alertLevel && (newBudget.alertLevel === 'warning' || newBudget.alertLevel === 'exceeded')) {
      const prevLvl = prevBudget.alertLevel === 'none' ? 0 : (prevBudget.alertLevel === 'ok' ? 1 : (prevBudget.alertLevel === 'warning' ? 2 : 3));
      const newLvl = newBudget.alertLevel === 'warning' ? 2 : 3;
      if (newLvl > prevLvl) triggerAlert = newBudget.alertLevel;
    }
    return { triggerAlert, excessAmount: newBudget.expenses + newBudget.savedThisMonth - newBudget.budgeted };
  },

  async deleteTransaction(id) {
    let txs = await idbGetArray('transacciones');
    const tx = txs.find(t => t.id === id);
    if (!tx) return {};

    txs = txs.filter(t => t.id !== id);
    await idbSetArray('transacciones', txs); this._triggerUpdate();
    await logEvent({ modulo: 'finanzas', tipo: 'movimiento_eliminado', entidadId: id, payload: tx });

    // Revertir transferencia manualmente
    if (tx.type === 'Transfer') {
      let envs = await this.getEnvelopes();
      let fromIdx = envs.findIndex(e => e.id === tx.fromEnvelopeId);
      let toIdx = envs.findIndex(e => e.id === tx.toEnvelopeId);
      if (fromIdx > -1) envs[fromIdx].assignedAmount = (Number(envs[fromIdx].assignedAmount) || 0) + Number(tx.amount);
      if (toIdx > -1) envs[toIdx].assignedAmount = (Number(envs[toIdx].assignedAmount) || 0) - Number(tx.amount);
      await idbSetArray('envelopes', envs);
      this._triggerUpdate();
    }

    return {};
  },

  // Metas genéricas: dinero (Finanzas) o sesiones/km/personalizado (Entreno).
  // Mismo store de siempre ('goals') — el nombre queda por compatibilidad
  // conceptual con datos ya guardados, pero ya no es solo de ahorro.
  async getGoals(dominio) {
    const goals = sortByCreatedAt(await idbGetArray('goals'));
    const normalizadas = goals.map(g => {
      const c = Number(g.currentAmount) || 0;
      const t = Number(g.targetAmount) || 0;
      return {
        ...DEFAULT_GOAL_SHAPE,
        ...g,
        currentAmount: c,
        targetAmount: t,
        completed: c >= t && t > 0
      };
    });
    return dominio ? normalizadas.filter(g => g.dominio === dominio) : normalizadas;
  },

  async createGoal(goal) {
    const goals = await idbGetArray('goals');
    const newGoal = { ...DEFAULT_GOAL_SHAPE, id: generateId(), createdAt: new Date().toISOString(), ...goal };
    goals.push(newGoal);
    await idbSetArray('goals', goals); this._triggerUpdate();
    await logEvent({ modulo: newGoal.dominio === 'entreno' ? 'entreno' : 'finanzas', tipo: 'meta_creada', entidadId: newGoal.id, payload: newGoal });
  },

  async updateGoal(id, data) {
    let goals = await idbGetArray('goals');
    const idx = goals.findIndex(g => g.id === id);
    if(idx > -1) {
      goals[idx] = { ...goals[idx], ...data };
      await idbSetArray('goals', goals); this._triggerUpdate();
      await logEvent({ modulo: goals[idx].dominio === 'entreno' ? 'entreno' : 'finanzas', tipo: 'meta_actualizada', entidadId: id, payload: goals[idx] });
    }
  },

  async deleteGoal(id) {
    let goals = await idbGetArray('goals');
    const goal = goals.find(g => g.id === id);
    goals = goals.filter(g => g.id !== id);
    await idbSetArray('goals', goals); this._triggerUpdate();
    await logEvent({ modulo: (goal && goal.dominio === 'entreno') ? 'entreno' : 'finanzas', tipo: 'meta_eliminada', entidadId: id, payload: goal || {} });
  },

  // Abono manual de progreso a una meta. Para metas de dinero (Finanzas)
  // además registra el movimiento y afecta el presupuesto, igual que
  // siempre. Para metas de Entreno (km, personalizado) solo suma progreso.
  async contributeToGoal(goalId, amount, label = '') {
    let goals = await idbGetArray('goals');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return {};

    const esDinero = (goal.dominio || 'finanzas') === 'finanzas';
    const prevBudget = esDinero ? await this.getBudget() : null;

    goal.currentAmount = (Number(goal.currentAmount) || 0) + amount;
    await idbSetArray('goals', goals); this._triggerUpdate();
    await logEvent({ modulo: esDinero ? 'finanzas' : 'entreno', tipo: 'meta_progreso_agregado', entidadId: goalId, payload: { amount, currentAmount: goal.currentAmount } });

    if (!esDinero) return { triggerAlert: null };

    const txs = await idbGetArray('transacciones');
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const newTx = { id: generateId(), date: dateStr, type: 'Gasto', category: 'Savings', label: label || goal.name, amount: amount, goalId: goal.id, envelopeId: null };
    txs.push(newTx);
    await idbSetArray('transacciones', txs); this._triggerUpdate();
    await logEvent({ modulo: 'finanzas', tipo: 'movimiento_registrado', entidadId: newTx.id, payload: newTx });

    const newBudget = await this.getBudget();
    let triggerAlert = null;
    if (prevBudget.alertLevel !== newBudget.alertLevel && (newBudget.alertLevel === 'warning' || newBudget.alertLevel === 'exceeded')) {
      const prevLvl = prevBudget.alertLevel === 'none' ? 0 : (prevBudget.alertLevel === 'ok' ? 1 : (prevBudget.alertLevel === 'warning' ? 2 : 3));
      const newLvl = newBudget.alertLevel === 'warning' ? 2 : 3;
      if (newLvl > prevLvl) triggerAlert = newBudget.alertLevel;
    }
    return { triggerAlert, excessAmount: newBudget.expenses + newBudget.savedThisMonth - newBudget.budgeted };
  },

  async getHistoricalSummaryByEnvelope(envelopeId, monthsBack = 6) {
    const txsAll = await idbGetArray('transacciones');
    let result = [];
    const now = new Date();
    for(let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const txs = txsAll.filter(t => t.date && t.date.startsWith(mStr) && t.envelopeId === envelopeId && t.type === 'Gasto');
      let exp = 0;
      txs.forEach(t => exp += toSafeNumber(t.amount));
      result.push(exp);
    }
    return result;
  },

  async getHistoricalSummary(monthsBack = 6) {
    const txsAll = await idbGetArray('transacciones');
    let result = [];
    const now = new Date();
    let hasDataBeforeCurrent = false;

    for(let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const txs = txsAll.filter(t => t.date && t.date.startsWith(mStr));
      if (i > 0 && txs.length > 0) hasDataBeforeCurrent = true;

      let inc = 0; let exp = 0; let sav = 0;
      txs.forEach(t => {
        const amt = toSafeNumber(t.amount);
        if (t.type === 'Ingreso') inc += amt;
        else if (t.category === 'Savings') sav += amt;
        else exp += amt;
      });
      result.push({ month: mStr, income: inc, expenses: exp, saved: sav });
    }

    return { data: result, hasEnoughData: hasDataBeforeCurrent };
  },

  // --- AGE OF MONEY ---
  async getAgeOfMoney(txsAll) {
    if (!txsAll) txsAll = await idbGetArray('transacciones');

    // Función auxiliar de limpieza robusta (por si hay transacciones viejas mal formadas)
    const safeNum = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    const isValidDate = (d) => {
      const date = new Date(d);
      return date instanceof Date && !isNaN(date);
    };

    const incomes = txsAll
      .filter(t => t.type === 'Ingreso' && isValidDate(t.date))
      .map(t => ({ ...t, amt: safeNum(t.amount) }))
      .filter(t => t.amt > 0)
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    const expenses = txsAll
      .filter(t => t.type === 'Gasto' && t.category !== 'Savings' && isValidDate(t.date))
      .map(t => ({ ...t, amt: safeNum(t.amount) }))
      .filter(t => t.amt > 0)
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    if (incomes.length === 0 || expenses.length === 0) return 0;

    let incomeIdx = 0;
    let ages = [];

    for (let exp of expenses) {
      let remainingExp = exp.amt;
      let expDate = new Date(exp.date);

      while (remainingExp > 0 && incomeIdx < incomes.length) {
        let inc = incomes[incomeIdx];
        let incDate = new Date(inc.date);

        let diffTime = expDate.getTime() - incDate.getTime();
        let diffDays = Math.max(0, Math.floor(diffTime / (1000 * 3600 * 24)));

        if (inc.amt >= remainingExp) {
          inc.amt -= remainingExp;
          ages.push(diffDays);
          remainingExp = 0;
        } else {
          remainingExp -= inc.amt;
          ages.push(diffDays);
          incomeIdx++;
        }
      }
    }

    if (ages.length === 0) return 0;
    // Filtrar por si acaso se nos coló algún NaN en el array
    ages = ages.filter(a => !isNaN(a));
    if (ages.length === 0) return 0;

    const last10 = ages.slice(-10);
    const sum = last10.reduce((a, b) => a + b, 0);
    return Math.round(sum / last10.length);
  },

    // --- ENTRENAMIENTO (RUTINAS Y SESIONES) ---
  async getRutinas(categoria) {
    const rutinas = sortByCreatedAt(await idbGetArray('rutinas'));
    if (!categoria) return rutinas;
    return rutinas.filter(r => r.categoria === categoria);
  },
  async crearRutina(data) {
    const rutinas = await idbGetArray('rutinas');
    const newRutina = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      nombre: data.nombre || 'Rutina Sin Nombre',
      categoria: data.categoria || 'gym', // gym, calistenia, hiit
      ejercicios: data.ejercicios || [], // [{nombre, series: [...]}]
      hiitSettings: data.hiitSettings || null // NUEVO
    };
    rutinas.push(newRutina);
    await idbSetArray('rutinas', rutinas);
    this._triggerUpdate();
    await logEvent({ modulo: 'entreno', tipo: 'rutina_creada', entidadId: newRutina.id, payload: newRutina });
    return newRutina;
  },
  async eliminarRutina(id) {
    let rutinas = await idbGetArray('rutinas');
    rutinas = rutinas.filter(r => r.id !== id);
    await idbSetArray('rutinas', rutinas);
    this._triggerUpdate();
    await logEvent({ modulo: 'entreno', tipo: 'rutina_eliminada', entidadId: id, payload: {} });
  },
  async getSesiones() {
    const sesiones = await idbGetArray('sesiones');
    return sesiones.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  },
  async getUltimoRegistro(ejercicioNombre) {
    const sesiones = (await idbGetArray('sesiones')).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    for (let s of sesiones) {
      if (s.ejercicios) {
        const ej = s.ejercicios.find(e => e.nombre.toLowerCase() === ejercicioNombre.toLowerCase());
        if (ej && ej.series && ej.series.length > 0) {
          return ej;
        }
      }
    }
    return null;
  },
  // Un evento por sesión completa (con las series embebidas en el payload),
  // no uno por serie individual: es como la UI realmente captura el dato
  // (un solo guardado al terminar la sesión).
  async registrarSesion(data) {
    const sesiones = await idbGetArray('sesiones');
    const now = new Date();
    const newSesion = {
      id: generateId(),
      rutinaId: data.rutinaId,
      nombreRutina: data.nombreRutina || 'Entrenamiento',
      fecha: data.fecha || now.toISOString(),
      duracionMin: data.duracionMin || 0,
      completado: data.completado || false,
      ejercicios: data.ejercicios || [], // NUEVO: guardar detalle real
      rpe: data.rpe ?? null, // NUEVO: esfuerzo percibido de toda la sesión (1-10)
      notas: data.notas || '' // NUEVO: notas libres
    };
    sesiones.push(newSesion);
    await idbSetArray('sesiones', sesiones);

    const sesionTs = new Date(newSesion.fecha).getTime();
    await logEvent({ modulo: 'entreno', tipo: 'sesion_registrada', entidadId: newSesion.id, payload: newSesion, ts: isNaN(sesionTs) ? null : sesionTs });

    // Auto-track: las metas de Entreno tipo 'sesiones' suman 1 solas al
    // registrarse una sesión (opcionalmente limitado a una categoría).
    const rutinas = await idbGetArray('rutinas');
    const categoriaSesion = rutinas.find(r => r.id === newSesion.rutinaId)?.categoria || null;
    let goals = await idbGetArray('goals');
    let goalsChanged = false;
    const autoTrackedIds = [];
    goals.forEach(g => {
      if (g.dominio === 'entreno' && g.tipo === 'sesiones' && g.autoTrack) {
        if (!g.rutinaCategoriaFiltro || g.rutinaCategoriaFiltro === categoriaSesion) {
          g.currentAmount = (Number(g.currentAmount) || 0) + 1;
          goalsChanged = true;
          autoTrackedIds.push(g.id);
        }
      }
    });
    if (goalsChanged) {
      await idbSetArray('goals', goals);
      for (const goalId of autoTrackedIds) {
        await logEvent({ modulo: 'entreno', tipo: 'meta_progreso_agregado', entidadId: goalId, payload: { amount: 1, automatico: true, sesionId: newSesion.id }, ts: isNaN(sesionTs) ? null : sesionTs });
      }
    }

    this._triggerUpdate();
    return newSesion;
  },

  // --- PERFIL DE USUARIO ---
  async getProfile() {
    return idbGetSingleton('profile', null);
  },
  async saveProfile(data) {
    const profile = {
      pesoKg: toSafeNumber(data.pesoKg),
      estaturaCm: toSafeNumber(data.estaturaCm),
      edad: toSafeNumber(data.edad),
      sexo: data.sexo === 'F' ? 'F' : 'M',
      nivelActividad: data.nivelActividad || 'sedentario',
      meta: data.meta || 'mantener',
      actualizadoEn: new Date().toISOString()
    };
    await idbSetSingleton('profile', profile);
    this._triggerUpdate();
    await logEvent({ modulo: 'entreno', tipo: 'perfil_actualizado', payload: profile });
    return profile;
  },

  // --- ANALYTICS ENTRENAMIENTO (FASE 1) ---

  async detectarNecesidadDeload(categoria = null) {
    // Calculamos volumen total de las últimas 4 semanas de forma independiente.
    // W1 (más antigua) a W4 (más reciente)
    const sesiones = await idbGetArray('sesiones');
    const rutinas = categoria ? await idbGetArray('rutinas') : null;
    const catMap = {};
    if (rutinas) rutinas.forEach(r => catMap[r.id] = r.categoria);

    const now = new Date();
    const weeks = [0, 0, 0, 0]; // index 3 = current week, index 0 = 3 weeks ago

    sesiones.forEach(s => {
      if (categoria) {
        let cat = catMap[s.rutinaId];
        if (!cat && s.nombreRutina) {
          const n = s.nombreRutina.toLowerCase();
          if (n.includes('tabata') || n.includes('emom') || n.includes('amrap') || n.includes('hiit')) cat = 'hiit';
        }
        if (cat !== categoria) return;
      }
      const sDate = new Date(s.fecha);
      const diffDays = (now - sDate) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays < 28) {
        const weekIndex = 3 - Math.floor(diffDays / 7);
        if (s.ejercicios) {
          s.ejercicios.forEach(ej => {
            ej.series.forEach(serie => {
              const p = Number(serie.peso) || 0;
              const match = String(serie.reps).match(/\d+/);
              const r = match ? parseInt(match[0]) : 0;
              weeks[weekIndex] += (p > 0 ? p * r : r);
            });
          });
        }
      }
    });

    // Validar si subió consecutivamente: W1 < W2 < W3 < W4
    // Solo si hay suficiente volumen como para ser significativo
    if (weeks[0] > 100 && weeks[0] < weeks[1] && weeks[1] < weeks[2] && weeks[2] < weeks[3]) {
      return true;
    }
    return false;
  },

  async sugerirProgresion(ejercicioNombre) {
    const nomClean = ejercicioNombre.toLowerCase().trim();
    const sesiones = (await idbGetArray('sesiones')).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

    for (const s of sesiones) {
      if (!s.ejercicios) continue;
      const ej = s.ejercicios.find(e => e.nombre.toLowerCase().trim() === nomClean);
      if (ej && ej.series && ej.series.length > 0) {
        let isHard = false;
        let pMax = 0;
        let rMax = 0;
        let maxRpe = 0;

        ej.series.forEach(serie => {
          const p = Number(serie.peso) || 0;
          const match = String(serie.reps).match(/\d+/);
          const r = match ? parseInt(match[0]) : 0;
          const rp = serie.rpe ? parseInt(serie.rpe) : 0;

          if (p > pMax) pMax = p;
          if (p === 0 && r > rMax) rMax = r;

          if (rp > maxRpe) maxRpe = rp;
        });

        let increment = 2.5;
        let repsIncr = 1;

        if (maxRpe > 0) {
          if (maxRpe <= 7) { increment = pMax > 0 ? Math.max(2.5, pMax * 0.05) : 0; repsIncr = 2; }
          else if (maxRpe >= 9) { isHard = true; }
        } else {
          isHard = ej.series.some(s => s.tipo === 'fallo' || (s.rpe && parseInt(s.rpe) >= 9));
        }

        if (isHard) {
          return { accion: 'mantener', peso: pMax, reps: rMax };
        } else {
          return { accion: 'aumentar', peso: pMax > 0 ? pMax + increment : 0, reps: pMax === 0 ? rMax + repsIncr : 0 };
        }
      }
    }
    return null;
  },

  estimar1RM(peso, reps) {
    const p = Number(peso) || 0;
    const r = Number(reps) || 0;
    if (p <= 0 || r <= 0) return 0;
    if (r === 1) return p;
    return Math.round(p * (1 + r / 30));
  },

  // Racha de HIIT específicamente: sigue leyendo de las entidades (sesiones
  // + rutinas), no del log de eventos, porque la categoría HIIT de una
  // sesión se resuelve con un heurístico sobre el nombre de rutina que no
  // vale la pena duplicar en cada evento — no es una de las 4 cosas que se
  // pidió derivar explícitamente (racha global, heatmap, insignias,
  // bitácora), así que se deja como estaba salvo el motor de storage.
  async getRachaHiit() {
    const rutinas = await idbGetArray('rutinas');
    const hitIds = rutinas.filter(r => r.categoria === 'hiit').map(r => r.id);
    const sesiones = await idbGetArray('sesiones');
    const sesionesHiit = sesiones.filter(s => hitIds.includes(s.rutinaId) || s.nombreRutina.toLowerCase().includes('hiit') || s.nombreRutina.toLowerCase().includes('tabata'));

    const uniqueDays = new Set();
    sesionesHiit.forEach(s => {
      const d = new Date(s.fecha);
      d.setHours(0, 0, 0, 0);
      uniqueDays.add(d.getTime());
    });
    return calcularRachaDesdeDias(Array.from(uniqueDays).sort((a, b) => b - a));
  },

  // Racha de días consecutivos con al menos una sesión de Entreno, sin
  // filtrar por categoría (a diferencia de getRachaHiit). Se deriva del log
  // de eventos ('sesion_registrada') en vez de leer el store de sesiones
  // directamente — mismo resultado, pero es la fuente que pidió usarse para
  // este tipo de agregado.
  async getRachaGeneral() {
    const eventos = await idb.getAll('events');
    const sesionEventos = eventos.filter(e => e.modulo === 'entreno' && e.tipo === 'sesion_registrada');
    return calcularRachaDesdeDias(diasUnicosDesdeEventos(sesionEventos));
  },

  // Racha de productividad de Tareas: días consecutivos con al menos una
  // tarea completada. Mismo algoritmo que getRachaGeneral, misma fuente
  // (log de eventos) — usada por Análisis > Tareas > Racha.
  async getRachaTareas() {
    const eventos = await idb.getAll('events');
    const tareaEventos = eventos.filter(e => e.modulo === 'tareas' && e.tipo === 'tarea_completada');
    return calcularRachaDesdeDias(diasUnicosDesdeEventos(tareaEventos));
  },

  // Racha global: cuenta un día como "activo" si hubo cualquier evento en
  // Tareas (tarea_completada), Entreno (sesion_registrada) o Finanzas
  // (movimiento_registrado). Distinta de getRachaGeneral(), que es
  // específica de Entreno y se sigue usando ahí — esta es para la tarjeta
  // de racha del Dashboard. Se deriva enteramente del log de eventos: no
  // hay un campo "racha" guardado en ningún lado.
  async getRachaGlobal() {
    const eventos = await idb.getAll('events');
    const relevantes = eventos.filter(e =>
      e.tipo === 'sesion_registrada' || e.tipo === 'movimiento_registrado' || e.tipo === 'tarea_completada'
    );

    const activityByDay = new Map(); // dayTime -> cantidad de eventos
    relevantes.forEach(e => {
      const d = new Date(e.ts);
      d.setHours(0, 0, 0, 0);
      const dayTime = d.getTime();
      activityByDay.set(dayTime, (activityByDay.get(dayTime) || 0) + 1);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Racha de días consecutivos (mismo algoritmo que getRachaHiit/getRachaGeneral).
    const sortedDays = Array.from(activityByDay.keys()).sort((a, b) => b - a);
    let actual = 0;
    if (sortedDays.length > 0 && (sortedDays[0] === todayTime || sortedDays[0] === todayTime - 86400000)) {
      let checkTime = sortedDays[0];
      let index = 0;
      while (index < sortedDays.length && sortedDays[index] === checkTime) {
        actual++;
        checkTime -= 86400000;
        index++;
      }
    }

    // Últimos 7 días (incluye hoy) para el mini-gráfico de línea.
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7.push({ date: d.toISOString().slice(0, 10), count: activityByDay.get(d.getTime()) || 0 });
    }

    return { actual, last7 };
  },

  // Actividad por día de un mes para un módulo+tipo de evento dado — la
  // base de cualquier mapa de calor tipo GitHub derivado del log. Devuelve
  // los payloads crudos agrupados por día (eventsByDay) en vez de un texto
  // ya armado, para que cada módulo arme su propio detalle sin que esta
  // función tenga que conocer la forma de cada payload.
  async getActividadPorDia(modulo, tipo, year, month) {
    const eventos = await idb.getAll('events');
    const countByDay = {};
    const eventsByDay = {};

    eventos
      .filter(e => e.modulo === modulo && e.tipo === tipo)
      .forEach(e => {
        const d = new Date(e.ts);
        if (d.getFullYear() !== year || d.getMonth() !== month) return;
        const day = d.getDate();
        countByDay[day] = (countByDay[day] || 0) + 1;
        if (!eventsByDay[day]) eventsByDay[day] = [];
        eventsByDay[day].push(e.payload || {});
      });

    return { countByDay, eventsByDay };
  },

  // Actividad de Entreno por día de un mes, para el mapa de calor —
  // derivada del log de eventos ('sesion_registrada'), no de iterar el
  // store de sesiones a mano en la vista (como hacía antes entrenamiento.js).
  async getActividadEntrenoPorDia(year, month) {
    const { countByDay, eventsByDay } = await this.getActividadPorDia('entreno', 'sesion_registrada', year, month);
    const CATEGORY_LABELS = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };
    const detailByDay = {};
    Object.keys(eventsByDay).forEach(day => {
      detailByDay[day] = eventsByDay[day].map(s => `${CATEGORY_LABELS[s.categoria] || s.categoria || 'Sesión'}: ${s.nombreRutina || ''}`);
    });
    return { countByDay, detailByDay };
  },

  // Actividad de Tareas por día de un mes (tareas completadas), misma
  // fuente/forma que getActividadEntrenoPorDia — usada por el heatmap de
  // Tareas y por Análisis > Tareas.
  async getActividadTareasPorDia(year, month) {
    const { countByDay, eventsByDay } = await this.getActividadPorDia('tareas', 'tarea_completada', year, month);
    const detailByDay = {};
    Object.keys(eventsByDay).forEach(day => {
      detailByDay[day] = eventsByDay[day].map(t => t.title || 'Tarea completada');
    });
    return { countByDay, detailByDay };
  },

  // Bitácora cronológica de todos los eventos asociados a una entidad
  // puntual (una tarea, una sesión, una meta...) — se deriva del log en vez
  // de guardar un historial aparte por entidad.
  async getBitacoraEntidad(entidadId) {
    const eventos = await idb.getAllByIndex('events', 'entidadId', entidadId);
    return eventos.sort((a, b) => a.ts - b.ts);
  },

  // Meses ANTERIORES al actual (no el que está en curso) donde hubo
  // ingreso y no se llegó a gastar+ahorrar el total disponible. Devuelve la
  // lista completa (no solo si existe alguno) — getBadges() la usa para la
  // insignia, Análisis > Finanzas > Hitos para mostrarlos todos.
  async getMesesSinExceder(n = 6) {
    const now = new Date();
    const meses = [];
    for (let i = 1; i <= n; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const budgetMes = await this.getBudget(monthStr);
      const gastado = budgetMes.expenses + budgetMes.savedThisMonth;
      if (budgetMes.budgeted > 0 && gastado < budgetMes.budgeted) {
        meses.push({ mes: monthStr, disponible: budgetMes.budgeted, gastado });
      }
    }
    return meses;
  },

  // Ahorro guardado (savedThisMonth) de cada uno de los últimos n meses, en
  // orden cronológico (antiguo -> reciente) — la forma que espera
  // renderMiniChart. Usada por Análisis > Finanzas > Hitos.
  async getTendenciaAhorro(n = 6) {
    const now = new Date();
    const meses = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const budgetMes = await this.getBudget(monthStr);
      meses.push(Math.round(budgetMes.savedThisMonth));
    }
    return meses;
  },

  // Categorías (Necesidades/Deseos) que se pasaron de su porcentaje
  // objetivo (allocationRule) en la mitad o más de los últimos n meses con
  // datos — "consistentemente fuera de rango", no un mes suelto.
  async getCategoriasFueraDeRango(n = 6) {
    const rule = await this.getAllocationRule();
    const now = new Date();
    const conteo = { Needs: 0, Wants: 0 };
    let mesesConDatos = 0;
    for (let i = 1; i <= n; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const budgetMes = await this.getBudget(monthStr);
      if (budgetMes.budgeted <= 0) continue;
      mesesConDatos++;
      if (budgetMes.needs > budgetMes.budgeted * rule.needs) conteo.Needs++;
      if (budgetMes.wants > budgetMes.budgeted * rule.wants) conteo.Wants++;
    }
    if (mesesConDatos === 0) return [];
    const labels = { Needs: 'Necesidades', Wants: 'Deseos' };
    return Object.entries(conteo)
      .filter(([, count]) => count / mesesConDatos >= 0.5)
      .map(([cat, count]) => ({ categoria: labels[cat], meses: count, totalMeses: mesesConDatos }));
  },

  // Insignias simples por hito: se recalculan a partir de los datos
  // actuales cada vez que se piden (no se guarda un estado "desbloqueado"
  // aparte, para que nunca queden desincronizadas de los datos reales).
  async getBadges() {
    const eventos = await idb.getAll('events');
    const [racha, goals] = await Promise.all([
      this.getRachaGlobal(),
      this.getGoals()
    ]);

    const primeraMetaCumplida = goals.some(g => g.completed);
    const diezSesiones = eventos.filter(e => e.modulo === 'entreno' && e.tipo === 'sesion_registrada').length >= 10;

    const mesSinExceder = (await this.getMesesSinExceder(6)).length > 0;

    return [
      { id: 'racha_7', label: '7 días de racha', unlocked: racha.actual >= 7 },
      { id: 'primera_meta', label: 'Primera meta cumplida', unlocked: primeraMetaCumplida },
      { id: 'mes_sin_exceder', label: 'Mes de presupuesto sin excederte', unlocked: mesSinExceder },
      { id: 'diez_sesiones', label: '10 sesiones de entrenamiento', unlocked: diezSesiones }
    ];
  },

  // Sesiones completadas esta semana (lunes-domingo) por categoría, para
  // los anillos de progreso semanal en la vista de Entreno.
  async getResumenEntrenoSemanal() {
    const rutinas = await idbGetArray('rutinas');
    const catMap = {};
    rutinas.forEach(r => catMap[r.id] = r.categoria);

    const sesiones = await idbGetArray('sesiones');
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const counts = { gym: 0, calistenia: 0, hiit: 0 };
    sesiones.forEach(s => {
      const sDate = new Date(s.fecha);
      if (sDate < startOfWeek) return;
      let cat = catMap[s.rutinaId];
      if (!cat && s.nombreRutina) {
        const n = s.nombreRutina.toLowerCase();
        if (n.includes('tabata') || n.includes('emom') || n.includes('amrap') || n.includes('hiit')) cat = 'hiit';
      }
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  },

  async getTendenciaSemanal(categoria, semanas = 8) {
    const rutinas = await idbGetArray('rutinas');
    const catMap = {};
    rutinas.forEach(r => catMap[r.id] = r.categoria);

    const sesiones = await idbGetArray('sesiones');
    const now = new Date();
    const volumenPorSemana = Array.from({ length: semanas }, () => 0);
    const minutosPorSemana = Array.from({ length: semanas }, () => 0);

    sesiones.forEach(s => {
      let cat = catMap[s.rutinaId];
      if (!cat && s.nombreRutina) {
        const n = s.nombreRutina.toLowerCase();
        if (n.includes('tabata') || n.includes('emom') || n.includes('amrap') || n.includes('hiit')) cat = 'hiit';
      }
      if (categoria && cat !== categoria) return;

      const sDate = new Date(s.fecha);
      const diffDays = (now - sDate) / (1000 * 60 * 60 * 24);
      const weekIdx = semanas - 1 - Math.floor(diffDays / 7);
      if (weekIdx < 0 || weekIdx >= semanas) return;

      minutosPorSemana[weekIdx] += Number(s.duracionMin) || 0;

      (s.ejercicios || []).forEach(ej => {
        (ej.series || []).forEach(serie => {
          const p = Number(serie.peso) || 0;
          const match = String(serie.reps).match(/\d+/);
          const r = match ? parseInt(match[0]) : 0;
          volumenPorSemana[weekIdx] += (p > 0 ? p * r : r);
        });
      });
    });

    return { volumenPorSemana, minutosPorSemana };
  },

  async getProyeccionRecurrentes() {
    const recurring = await this.getRecurring();
    const envs = await this.getEnvelopes();
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(now.getDate() + 7);

    let alerts = [];

    recurring.forEach(r => {
      if (r.type === 'Gasto' && r.envelopeId) {
        const nextDate = new Date(r.nextDate);
        if (nextDate >= now && nextDate <= in7Days) {
          const env = envs.find(e => e.id === r.envelopeId);
          if (env) {
            const available = env.assignedAmount - env.spent;
            if (r.amount > available) {
              alerts.push({
                name: r.name,
                amount: r.amount,
                date: r.nextDate,
                envelopeName: env.name,
                shortfall: r.amount - available
              });
            }
          }
        }
      }
    });
    return alerts;
  },

  async getVolumenPorGrupo(rangoDias, categoria = null) {
    const sesiones = await idbGetArray('sesiones');
    const rutinas = categoria ? await idbGetArray('rutinas') : null;
    const catMap = {};
    if (rutinas) rutinas.forEach(r => catMap[r.id] = r.categoria);

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - rangoDias);

    const volumen = { pecho: 0, espalda: 0, hombros: 0, piernas: 0, brazos: 0, core: 0, otro: 0 };
    const balance = { empuje: 0, traccion: 0, piernas: 0, core: 0, otro: 0 };

    sesiones.forEach(s => {
      if (categoria) {
        let cat = catMap[s.rutinaId];
        if (!cat && s.nombreRutina) {
          const n = s.nombreRutina.toLowerCase();
          if (n.includes('tabata') || n.includes('emom') || n.includes('amrap') || n.includes('hiit')) cat = 'hiit';
        }
        if (cat !== categoria) return;
      }
      const sDate = new Date(s.fecha);
      if (sDate >= startDate && sDate <= now) {
        if (s.ejercicios) {
          s.ejercicios.forEach(ej => {
            const meta = getEjercicioMetadata(ej.nombre);
            if (volumen[meta.grupoMuscular] !== undefined) volumen[meta.grupoMuscular] += ej.series.length;
            else volumen.otro += ej.series.length;

            if (balance[meta.patron] !== undefined) balance[meta.patron] += ej.series.length;
            else balance.otro += ej.series.length;
          });
        }
      }
    });
    return { volumen, balance };
  },

  // Desglose de entrenamiento por grupo muscular en un rango de fechas
  // (pestaña Desglose de Análisis). A diferencia de getVolumenPorGrupo, que
  // solo cuenta series para el widget de balance de rutinas-lista.js, acá
  // se calculan las 3 métricas seleccionables (series, volumen en kg,
  // repeticiones) más los totales del período.
  async getDesgloseGrupoMuscular(startDate, endDate) {
    const sesiones = await idbGetArray('sesiones');
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);

    const grupos = {};
    GRUPO_MUSCULAR_ORDEN.forEach(g => { grupos[g] = { series: 0, reps: 0, volumen: 0 }; });

    let entrenamientos = 0, seriesTotales = 0, repsTotales = 0, volumenTotal = 0;

    sesiones.forEach(s => {
      const fecha = new Date(s.fecha);
      if (fecha < start || fecha > end) return;
      entrenamientos++;
      (s.ejercicios || []).forEach(ej => {
        const meta = getEjercicioMetadata(ej.nombre);
        const bucket = grupos[meta.grupoMuscular] || grupos.otro;
        (ej.series || []).forEach(serie => {
          const peso = Number(serie.peso) || 0;
          const match = String(serie.reps).match(/\d+/);
          const reps = match ? parseInt(match[0]) : 0;
          const volumen = peso > 0 ? peso * reps : reps;

          bucket.series += 1;
          bucket.reps += reps;
          bucket.volumen += volumen;
          seriesTotales += 1;
          repsTotales += reps;
          volumenTotal += volumen;
        });
      });
    });

    return { grupos, entrenamientos, seriesTotales, repsTotales, volumenTotal };
  },

  // Todos los ejercicios que aparecen alguna vez en el historial de
  // sesiones, con su grupo muscular resuelto — para el selector de la
  // pestaña Ejercicios de Análisis.
  async getListaEjerciciosRegistrados() {
    const sesiones = await idbGetArray('sesiones');
    const map = new Map();
    sesiones.forEach(s => {
      (s.ejercicios || []).forEach(ej => {
        const key = ej.nombre.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, { nombre: ej.nombre.trim(), grupoMuscular: getEjercicioMetadata(ej.nombre).grupoMuscular });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  // Favoritos de récords personales (pestaña Récords de Análisis): solo
  // afectan el orden en que se muestran, se guardan aparte de los PRs
  // porque estos últimos se derivan siempre del store de sesiones.
  async getFavoritosPR() {
    return idbGetSingleton('prFavoritos', []);
  },

  async toggleFavoritoPR(nombre) {
    const key = nombre.toLowerCase().trim();
    let favoritos = await idbGetSingleton('prFavoritos', []);
    if (favoritos.includes(key)) favoritos = favoritos.filter(f => f !== key);
    else favoritos.push(key);
    await idbSetSingleton('prFavoritos', favoritos);
    this._triggerUpdate();
    await logEvent({ modulo: 'entreno', tipo: 'pr_favorito_toggled', entidadId: key, payload: { favorito: favoritos.includes(key) } });
    return favoritos;
  },

  async getPRs() {
    const sesiones = await idbGetArray('sesiones');
    const prs = {};
    const favoritos = await idbGetSingleton('prFavoritos', []);

    sesiones.forEach(s => {
      if (s.ejercicios) {
        s.ejercicios.forEach(ej => {
          const nombre = ej.nombre.toLowerCase().trim();
          if (!prs[nombre]) prs[nombre] = { nombre: ej.nombre.trim(), pesoMax: 0, repsMax: 0, fecha: s.fecha };

          ej.series.forEach(serie => {
            const peso = Number(serie.peso) || 0;
            const repsStr = String(serie.reps).trim();
            const match = repsStr.match(/\d+/);
            const reps = match ? parseInt(match[0]) : 0;

            if (peso > prs[nombre].pesoMax) {
              prs[nombre].pesoMax = peso;
              prs[nombre].repsMax = reps;
              prs[nombre].fecha = s.fecha;
            } else if (peso === prs[nombre].pesoMax && peso > 0) {
               if (reps > prs[nombre].repsMax) {
                 prs[nombre].repsMax = reps;
                 prs[nombre].fecha = s.fecha;
               }
            } else if (peso === 0 && prs[nombre].pesoMax === 0) {
              if (reps > prs[nombre].repsMax) {
                 prs[nombre].repsMax = reps;
                 prs[nombre].fecha = s.fecha;
              }
            }
          });
        });
      }
    });

    Object.keys(prs).forEach(nombre => {
      prs[nombre].grupoMuscular = getEjercicioMetadata(nombre).grupoMuscular;
      prs[nombre].favorito = favoritos.includes(nombre);
    });
    return prs;
  },

  async getMejorAmrap(rutinaId) {
    const sesiones = await idbGetArray('sesiones');
    let maxRondas = 0;

    sesiones.forEach(s => {
      if (s.rutinaId === rutinaId && s.ejercicios && s.ejercicios.length > 0) {
        // En HIIT dummy, guardamos las rondas en reps del primer ejercicio
        const repsVal = s.ejercicios[0].series && s.ejercicios[0].series[0] ? Number(s.ejercicios[0].series[0].reps) : 0;
        if (repsVal > maxRondas) {
          maxRondas = repsVal;
        }
      }
    });

    return maxRondas;
  },

  async getHistorialEjercicio(nombre) {
    const nomClean = nombre.toLowerCase().trim();
    const sesiones = (await idbGetArray('sesiones')).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    const historial = [];

    sesiones.forEach(s => {
      if (s.ejercicios) {
        const ej = s.ejercicios.find(e => e.nombre.toLowerCase().trim() === nomClean);
        if (ej && ej.series && ej.series.length > 0) {
          let pesoMax = -9999;
          let repsEnPesoMax = 0;
          let repsForBodyweight = 0;
          let volumenTotal = 0;

          ej.series.forEach(serie => {
            const peso = Number(serie.peso) || 0;
            const match = String(serie.reps).match(/\d+/);
            const reps = match ? parseInt(match[0]) : 0;

            if (peso > pesoMax) { pesoMax = peso; repsEnPesoMax = reps; }
            else if (peso === pesoMax && reps > repsEnPesoMax) { repsEnPesoMax = reps; }
            if (peso === 0 && reps > repsForBodyweight) repsForBodyweight = reps;
            volumenTotal += (peso > 0 ? peso * reps : reps);
          });

          if (pesoMax === -9999) pesoMax = 0;

          historial.push({
            fecha: s.fecha,
            pesoMax,
            repsEnPesoMax,
            repsMax: repsForBodyweight,
            volumenTotal,
            seriesCount: ej.series.length
          });
        }
      }
    });
    return historial;
  },

  // Estancamiento: true si el 1RM estimado (Epley) de un ejercicio no
  // superó su mejor marca previa en ninguna de sus últimas 3 sesiones con
  // peso registradas. Requiere al menos 4 sesiones con peso (1 de base +
  // 3 a evaluar) para poder afirmarlo con algo de confianza.
  async detectarEstancamiento(nombreEjercicio) {
    const historial = await this.getHistorialEjercicio(nombreEjercicio);
    const conPeso = historial.filter(h => h.pesoMax > 0);
    if (conPeso.length < 4) return false;

    const rms = conPeso.map(h => this.estimar1RM(h.pesoMax, h.repsEnPesoMax || 1));
    const ultimas3 = rms.slice(-3);
    const baseline = Math.max(...rms.slice(0, -3));
    return ultimas3.every(rm => rm <= baseline);
  },

  // --- TAREAS ---
  async getTasks() {
    await this.processRecurringTasks();
    return sortByCreatedAt(await idbGetArray('tareas'));
  },

  // --- Tareas Recurrentes API ---
  // Plantillas que generan una tarea normal (en 'tareas') cada vez que se
  // cumple su frecuencia. Mismo patrón lazy que processRecurringTransactions
  // en Finanzas: no hay timer ni cron, se procesa en cada getTasks().
  async getRecurringTasks() {
    return sortByCreatedAt(await idbGetArray('tareas_recurrentes'));
  },
  async createRecurringTask(data) {
    let all = await this.getRecurringTasks();
    const newItem = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      lastProcessed: null,
      ...data
    };
    all.push(newItem);
    await idbSetArray('tareas_recurrentes', all); this._triggerUpdate();
    await logEvent({ modulo: 'tareas', tipo: 'recurrente_creada', entidadId: newItem.id, payload: newItem });
    return newItem;
  },
  async deleteRecurringTask(id) {
    let all = await this.getRecurringTasks();
    all = all.filter(r => r.id !== id);
    await idbSetArray('tareas_recurrentes', all); this._triggerUpdate();
    await logEvent({ modulo: 'tareas', tipo: 'recurrente_eliminada', entidadId: id, payload: {} });
  },
  // Calcula la próxima ocurrencia estrictamente posterior a `fromDate` (nunca
  // el mismo día) — así crear una recurrente hoy no duplica la tarea que el
  // usuario probablemente ya creó a mano para hoy mismo.
  _nextRecurringTaskDate(fromDate, item) {
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    if (item.frequency === 'daily') {
      d.setDate(d.getDate() + 1);
      return d;
    }
    if (item.frequency === 'weekly') {
      d.setDate(d.getDate() + 1);
      while (d.getDay() !== item.weekday) d.setDate(d.getDate() + 1);
      return d;
    }
    // monthly (dayOfMonth acotado a 1-28 en el formulario, evita overflow de mes)
    const next = new Date(d.getFullYear(), d.getMonth(), item.dayOfMonth);
    if (next <= d) next.setMonth(next.getMonth() + 1);
    return next;
  },
  async processRecurringTasks() {
    const recurring = await this.getRecurringTasks();
    if (recurring.length === 0) return false;

    let tasks = await idbGetArray('tareas');
    let updated = false;
    const generated = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    recurring.forEach(item => {
      let cursor = item.lastProcessed ? new Date(item.lastProcessed) : new Date(item.createdAt);
      let next = this._nextRecurringTaskDate(cursor, item);
      let guard = 0; // tope defensivo: evita un loop largo si la app estuvo mucho tiempo sin abrirse
      while (today >= next && guard < 366) {
        guard++;
        const newTask = {
          id: generateId(),
          createdAt: new Date().toISOString(),
          title: item.title,
          description: item.description || '',
          priority: item.priority || 'medium',
          dueDate: next.toISOString().slice(0, 10),
          project: item.project || '',
          status: 'todo',
          subtasks: [],
          recurringId: item.id
        };
        tasks.push(newTask);
        generated.push(newTask);
        item.lastProcessed = next.toISOString();
        updated = true;
        next = this._nextRecurringTaskDate(next, item);
      }
    });

    if (updated) {
      await idbSetArray('tareas', tasks);
      await idbSetArray('tareas_recurrentes', recurring); this._triggerUpdate();
      for (const t of generated) {
        await logEvent({ modulo: 'tareas', tipo: 'tarea_creada', entidadId: t.id, payload: t, ts: new Date(t.createdAt).getTime() });
      }
      return true;
    }
    return false;
  },

  // % de tareas completadas a tiempo (completedAt <= dueDate) vs vencidas,
  // entre las que tienen fecha límite Y ya están hechas. tasa: null si
  // todavía no hay ninguna tarea completada con fecha límite para medir.
  async getTasaCumplimientoTareas() {
    const tasks = await idbGetArray('tareas');
    const conFecha = tasks.filter(t => t.status === 'done' && t.dueDate && t.completedAt);
    if (conFecha.length === 0) return { aTiempo: 0, vencidas: 0, total: 0, tasa: null };
    let aTiempo = 0;
    conFecha.forEach(t => {
      const due = new Date(t.dueDate + 'T23:59:59');
      if (new Date(t.completedAt) <= due) aTiempo++;
    });
    return { aTiempo, vencidas: conFecha.length - aTiempo, total: conFecha.length, tasa: Math.round((aTiempo / conFecha.length) * 100) };
  },

  // Tareas completadas por semana, últimas `semanas` semanas — mismo
  // patrón que getTendenciaSemanal (Entreno) pero sobre el log de eventos
  // de Tareas ('tarea_completada'). Orden cronológico (antiguo -> reciente).
  async getTendenciaTareasCompletadas(semanas = 8) {
    const eventos = await idb.getAll('events');
    const tareaEventos = eventos.filter(e => e.modulo === 'tareas' && e.tipo === 'tarea_completada');
    const now = new Date();
    const porSemana = Array.from({ length: semanas }, () => 0);
    tareaEventos.forEach(e => {
      const d = new Date(e.ts);
      const diffDays = (now - d) / (1000 * 60 * 60 * 24);
      const weekIdx = semanas - 1 - Math.floor(diffDays / 7);
      if (weekIdx < 0 || weekIdx >= semanas) return;
      porSemana[weekIdx]++;
    });
    return porSemana;
  },

  async saveTask(data) {
    let tasks = await idbGetArray('tareas');
    if (data.id) {
      const idx = tasks.findIndex(t => t.id === data.id);
      if (idx > -1) {
        tasks[idx] = { ...tasks[idx], ...data };
        await idbSetArray('tareas', tasks); this._triggerUpdate();
        await logEvent({ modulo: 'tareas', tipo: 'tarea_actualizada', entidadId: tasks[idx].id, payload: tasks[idx] });
        return tasks[idx];
      }
    }
    const { id: _ignoredId, ...rest } = data;
    const newTask = { createdAt: new Date().toISOString(), ...rest, id: generateId() };
    tasks.push(newTask);
    await idbSetArray('tareas', tasks); this._triggerUpdate();
    await logEvent({ modulo: 'tareas', tipo: 'tarea_creada', entidadId: newTask.id, payload: newTask });
    return newTask;
  },

  async deleteTask(id) {
    let tasks = await idbGetArray('tareas');
    const task = tasks.find(t => t.id === id);
    tasks = tasks.filter(t => t.id !== id);
    await idbSetArray('tareas', tasks); this._triggerUpdate();
    await logEvent({ modulo: 'tareas', tipo: 'tarea_eliminada', entidadId: id, payload: task || {} });
  },

  async updateTaskStatus(id, status) {
    let tasks = await idbGetArray('tareas');
    const idx = tasks.findIndex(t => t.id === id);
    if (idx > -1) {
      tasks[idx].status = status;
      // Se usa para la racha global: solo cuenta el día en que la tarea
      // pasó a 'done'. Si se revierte a otro estado, se limpia.
      tasks[idx].completedAt = status === 'done' ? new Date().toISOString() : null;
      await idbSetArray('tareas', tasks); this._triggerUpdate();
      await logEvent({ modulo: 'tareas', tipo: 'tarea_actualizada', entidadId: id, payload: { status } });
      if (status === 'done') {
        await logEvent({ modulo: 'tareas', tipo: 'tarea_completada', entidadId: id, payload: tasks[idx] });
      }
    }
  },

  // Transacciones dentro de un rango de fechas arbitrario (a diferencia de
  // getBudget, que solo mira un mes calendario) — usada por Análisis >
  // Finanzas > Movimientos para los filtros de trimestre/año/todo.
  // startDate/endDate en formato 'YYYY-MM-DD'; cualquiera de los dos puede
  // omitirse para dejar ese extremo abierto.
  async getTransaccionesEnRango(startDate = null, endDate = null) {
    await this.processRecurringTransactions();
    const txs = await idbGetArray('transacciones');
    const filtered = txs.filter(t => {
      if (!t.date) return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getBudget(monthFilter = null) {
    await this.processRecurringTransactions();
    const txsAll = await idbGetArray('transacciones');

    if (!monthFilter) {
      const now = new Date();
      monthFilter = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const txs = txsAll.filter(t => t.date && t.date.startsWith(monthFilter));

    // Calculate previous month trend
    const [y, m] = monthFilter.split('-');
    let prevDate = new Date(parseInt(y), parseInt(m) - 2);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevTxs = txsAll.filter(t => t.date && t.date.startsWith(prevMonthStr));

    let prevExpenses = 0;
    prevTxs.forEach(t => {
      if(t.type !== 'Ingreso' && t.category !== 'Savings') prevExpenses += toSafeNumber(t.amount);
    });

    let income = 0; let expenses = 0;
    let needs = 0; let wants = 0; let savings = 0;

    const breakdown = [...txs].sort((a,b) => b.date.localeCompare(a.date));

    txs.forEach(t => {
      const amt = toSafeNumber(t.amount);
      if (t.type === 'Ingreso') {
        income += amt;
      } else if (t.category === 'Savings') {
        savings += amt;
      } else {
        expenses += amt;
        if (t.category === 'Needs') needs += amt;
        if (t.category === 'Wants') wants += amt;
      }
    });

    const budgeted = income;
    const savedThisMonth = savings;
    const remaining = budgeted - expenses - savedThisMonth;
    const rule = await this.getAllocationRule();

    const rawEnvelopes = await this.getEnvelopes();
    const envelopes = rawEnvelopes.map(env => {
      const assignedAmount = Number(env.assignedAmount) || 0;
      let spent = 0;
      txs.forEach(t => {
        if (t.envelopeId === env.id && t.type === 'Gasto') spent += toSafeNumber(t.amount);
      });
      return { ...env, assignedAmount, spent, balance: assignedAmount - spent };
    });

    let trend = null;
    if (prevExpenses > 0) {
      const diff = expenses - prevExpenses;
      const pct = Math.round((diff / prevExpenses) * 100);
      trend = { pct: Math.abs(pct), isUp: diff > 0 };
    }

    let alertLevel = 'none';
    if (budgeted > 0) {
      const usedRatio = (expenses + savedThisMonth) / budgeted;
      if (usedRatio >= 1) alertLevel = 'exceeded';
      else if (usedRatio >= 0.8) alertLevel = 'warning';
      else alertLevel = 'ok';
    }

    const goals = await this.getGoals('finanzas');
    const recurring = await this.getRecurring();
    const ageOfMoney = await this.getAgeOfMoney(txsAll);

    return {
      currentMonth: monthFilter,
      alertLevel,
      trend,
      income, expenses, savedThisMonth, budgeted, balance: remaining, remaining, rule,
      goals,
      recurring,
      ageOfMoney,

      envelopes, // NUEVO
      budgetTarget: {
        needs: income * rule.needs,
        wants: income * rule.wants,
        savings: income * rule.savings
      },
      allocations: [
        { category: 'Needs', amount: needs, percent: budgeted ? Math.round((needs/budgeted)*100) : 0 },
        { category: 'Wants', amount: wants, percent: budgeted ? Math.round((wants/budgeted)*100) : 0 },
        { category: 'Savings', amount: savings, percent: budgeted ? Math.round((savings/budgeted)*100) : 0 }
      ],
      breakdown
    };
  }
};

// Envuelve después de definir el objeto para no interrumpir el resto del
// archivo — funciona igual sea que se llame db.xxx() o this.xxx() desde
// otro método, porque memoize() preserva el `this` con el que se invoque.
// Ver la nota junto a memoize()/MEMO_TTL_MS más arriba para qué queda
// afuera y por qué.
[
  'getBadges', 'getRachaGlobal', 'getRachaGeneral', 'getRachaTareas', 'getRachaHiit',
  'getMesesSinExceder', 'getCategoriasFueraDeRango', 'getTendenciaAhorro',
  'getActividadPorDia', 'getDesgloseGrupoMuscular', 'getVolumenPorGrupo',
  'getTendenciaSemanal', 'getResumenEntrenoSemanal', 'detectarNecesidadDeload',
  'getTasaCumplimientoTareas', 'getTendenciaTareasCompletadas'
].forEach(name => { db[name] = memoize(db[name]); });
