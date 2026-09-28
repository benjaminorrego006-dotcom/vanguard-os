// Estado de las sesiones de Entreno a partir del log de eventos. Lo usan
// db.js (lo derivado: racha, actividad, últimos pesos) y sync.js (el replay
// del store `sesiones`), así los dos siguen exactamente la misma regla.
//
// Eventos de una sesión: sesion_registrada (creación), sesion_editada (la
// sesión completa, última versión), sesion_eliminada (lápida) y
// sesion_restaurada (deshacer; la sesión completa). Se aplican en orden por
// momento del evento (ts) y, si empatan, por id del evento: el resultado no
// depende del orden en que lleguen, así dos dispositivos quedan idénticos y
// una eliminación gana aunque llegue antes que la creación.
export const TIPOS_EVENTO_SESION = new Set(['sesion_registrada', 'sesion_editada', 'sesion_eliminada', 'sesion_restaurada']);

const ordenEventos = (a, b) => (a.ts - b.ts) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// { sesion, vigente }: `sesion` es la última versión conocida (aunque esté
// eliminada, para poder restaurarla); `vigente` es false si la última palabra
// fue una eliminación.
export function estadoNetoSesion(eventos) {
  let sesion = null;
  let eliminada = false;
  eventos.filter(e => TIPOS_EVENTO_SESION.has(e.tipo)).sort(ordenEventos).forEach(e => {
    if (e.tipo === 'sesion_eliminada') {
      eliminada = true;
      return;
    }
    if (e.tipo === 'sesion_restaurada') eliminada = false;
    if (e.payload && e.payload.fecha) sesion = { ...e.payload, id: e.entidadId };
  });
  return { sesion, vigente: !!sesion && !eliminada };
}

// Sesiones vigentes (última versión, sin las eliminadas) según el log.
// Memoizado por arreglo de eventos: con leerEventosCompartido (db.js) hay
// una sola lectura de events por render y el cálculo se hace una vez; un
// logEvent entrega un arreglo nuevo y lo invalida.
const cachePorEventos = new WeakMap();
export function sesionesVigentesDesdeEventos(eventos) {
  const cacheado = cachePorEventos.get(eventos);
  if (cacheado) return cacheado;
  const porSesion = new Map();
  eventos.forEach(e => {
    if (!TIPOS_EVENTO_SESION.has(e.tipo) || !e.entidadId) return;
    if (!porSesion.has(e.entidadId)) porSesion.set(e.entidadId, []);
    porSesion.get(e.entidadId).push(e);
  });
  const vigentes = [];
  porSesion.forEach(evs => {
    const { sesion, vigente } = estadoNetoSesion(evs);
    if (vigente) vigentes.push(sesion);
  });
  cachePorEventos.set(eventos, vigentes);
  return vigentes;
}
