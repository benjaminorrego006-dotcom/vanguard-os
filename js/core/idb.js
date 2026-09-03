// js/core/idb.js
// Capa mínima sobre IndexedDB: reemplaza a localStorage como motor de
// persistencia (localStorage es síncrono y tiene un límite práctico de
// ~5MB; con historial de sesiones y movimientos financieros lo superamos).
//
// Cada "entidad" (sesiones, rutinas, metas, transacciones, etc.) vive en su
// propio object store, una fila por registro, igual que antes vivía como un
// array dentro de una key de localStorage. El store `events` es el log de
// eventos central: cada acción del usuario en cualquier módulo agrega ahí
// una fila inmutable (nunca se edita ni se borra), usado para derivar racha,
// heatmap, insignias y bitácora de una entidad puntual en vez de guardar
// esos agregados como campos aparte.

const DB_NAME = 'vanguard_os';
// v3: se agrega el store 'habitos' (módulo Hábitos, complementa a Tareas
// sin reemplazarlo). Solo se agrega una entrada a STORE_DEFS — no hay
// nada que migrar ni borrar, así que onupgradeneeded no necesita un caso
// especial más allá de crear el store nuevo (ya lo hace el loop de abajo).
const DB_VERSION = 3;

// keyPath por store. `events` además indexa por ts/modulo+ts/entidadId/tipo
// para poder consultar por rango cronológico o por entidad sin leer todo el
// store (hoy los métodos de alto nivel igual usan getAll+filter por
// simplicidad — los índices quedan listos para cuando el volumen lo pida).
const STORE_DEFS = {
  events: {
    keyPath: 'id',
    indexes: [
      { name: 'ts', keyPath: 'ts' },
      { name: 'modulo_ts', keyPath: ['modulo', 'ts'] },
      { name: 'entidadId', keyPath: 'entidadId' },
      { name: 'tipo', keyPath: 'tipo' }
    ]
  },
  sesiones: { keyPath: 'id' },
  rutinas: { keyPath: 'id' },
  goals: { keyPath: 'id' },
  transacciones: { keyPath: 'id' },
  envelopes: { keyPath: 'id' },
  recurrentes: { keyPath: 'id' },
  tareas: { keyPath: 'id' },
  tareas_recurrentes: { keyPath: 'id' },
  habitos: { keyPath: 'id' },
  // Singletons de app (perfil, ajustes, favoritos de PR): una sola fila por
  // `key`, con el valor completo en `value`. Evita inventar un keyPath
  // artificial para datos que siempre fueron un único objeto/array.
  singletons: { keyPath: 'key' }
};

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      Object.entries(STORE_DEFS).forEach(([name, cfg]) => {
        if (database.objectStoreNames.contains(name)) return;
        const store = database.createObjectStore(name, { keyPath: cfg.keyPath });
        (cfg.indexes || []).forEach(idx => store.createIndex(idx.name, idx.keyPath));
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function runTx(storeNames, mode, fn) {
  return openDatabase().then(database => new Promise((resolve, reject) => {
    const t = database.transaction(storeNames, mode);
    const storeOrStores = Array.isArray(storeNames)
      ? Object.fromEntries(storeNames.map(n => [n, t.objectStore(n)]))
      : t.objectStore(storeNames);

    let result;
    let settled = false;
    Promise.resolve(fn(storeOrStores, t))
      .then(r => { result = r; })
      .catch(err => { settled = true; reject(err); });

    t.oncomplete = () => { if (!settled) resolve(result); };
    t.onerror = () => { settled = true; reject(t.error); };
    t.onabort = () => { settled = true; reject(t.error || new Error('IndexedDB transaction aborted')); };
  }));
}

export async function getAll(storeName) {
  return runTx(storeName, 'readonly', (store) => reqToPromise(store.getAll()));
}

export async function getOne(storeName, key) {
  return runTx(storeName, 'readonly', (store) => reqToPromise(store.get(key)));
}

export async function put(storeName, value) {
  return runTx(storeName, 'readwrite', (store) => reqToPromise(store.put(value)));
}

export async function remove(storeName, key) {
  return runTx(storeName, 'readwrite', (store) => reqToPromise(store.delete(key)));
}

// Reemplaza el contenido completo de un store por `values` — mismo
// comportamiento que el viejo `safeSetItem(key, JSON.stringify(array))`, que
// siempre reescribía el array entero. Se usa en los métodos migrados
// mecánicamente desde localStorage para minimizar el riesgo de cambiar
// lógica de negocio durante la migración.
export async function putAllReplacing(storeName, values) {
  return runTx(storeName, 'readwrite', (store) => {
    store.clear();
    values.forEach(v => store.put(v));
  });
}

export async function clearStore(storeName) {
  return runTx(storeName, 'readwrite', (store) => reqToPromise(store.clear()));
}

export async function getAllByIndex(storeName, indexName, query) {
  return runTx(storeName, 'readonly', (store) => reqToPromise(store.index(indexName).getAll(query)));
}

// Usado por "Olvidaste tu PIN" (wipeAllLocalData): borra la base entera.
// Cierra la conexión abierta primero para que deleteDatabase no quede
// bloqueada esperando a que se cierre sola.
export async function deleteDatabase() {
  const existing = dbPromise;
  dbPromise = null;
  if (existing) {
    try { (await existing).close(); } catch (e) { /* ya pudo estar cerrada */ }
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
