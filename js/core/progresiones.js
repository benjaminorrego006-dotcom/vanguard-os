// Árbol de progresión, derivado del catálogo (Etapa 3) — ya no se mantiene
// a mano acá: ARBOL_PROGRESIONES se calcula desde CATALOGO_EJERCICIOS al
// cargar el módulo, leyendo `prerequisitos`/`criterioAvance`/`patronMovimiento`
// (Etapa 2a-2d). Mantener el árbol sincronizado con el catálogo dejó de ser
// un problema: agregar un ejercicio con `prerequisitos` al catálogo lo suma
// al árbol automáticamente, sin tocar este archivo.
//
// Nodo = id de catálogo (no un id de árbol aparte): como `prerequisitos` ya
// guarda ids de catálogo, no hace falta un espacio de ids paralelo ni un
// mapa nombre->id — getIdPorNombreExacto() de ejercicios-catalogo.js ya
// resuelve nombres a ids.
//
// Filtro "en cadena": participan del árbol solo las entradas que tienen
// prerequisitos O que son prerequisito de otra entrada. Un accesorio
// aislado (ej. "Curl de Bíceps") no aporta información como paso de
// progresión — mostrarle un chip "Nv.1/1" sería ruido, no señal.
//
// Rama = patronMovimiento real del catálogo (8 valores: empuje-horizontal,
// empuje-vertical, traccion-horizontal, traccion-vertical, rodilla, cadera,
// core, locomocion) — NO se inventa un valor "estaticos" acá: ese campo lo
// va a leer el generador de rutinas de la Etapa 4 para balancear
// empuje/tracción, y un valor falso ahí rompería esa lectura. La vista del
// árbol (arbol-progresion.js) es libre de agrupar visualmente los nodos de
// habilidad (front lever, planche, etc.) dentro de su rama real; ese
// agrupamiento es puramente de presentación y vive en ese componente, nunca
// acá.
//
// Caso especial: 4 entradas GYM (sentadilla, press de banca, peso muerto,
// press militar) tienen criterioAvance.tipo === 'ratio' — se gradúan por
// tabla de estándares de fuerza (peso/peso-corporal, estandares-fuerza.js),
// no por "series limpias" de reps/segundos. Entran al árbol igual (son
// prerequisito de sus variantes: sentadilla frontal, press inclinado, peso
// muerto rumano, press arnold) pero con objetivo: null — estaDesbloqueado()
// las trata como siempre satisfechas, porque bloquear una variante de
// press hasta alcanzar un nivel de fuerza específico en el básico excede lo
// que este árbol de "series limpias" está diseñado para verificar.
import { CATALOGO_EJERCICIOS } from './ejercicios-catalogo.js';

function criterioAObjetivo(criterioAvance) {
  if (!criterioAvance || criterioAvance.tipo === 'ratio') return null;
  return criterioAvance.tipo === 'segundos'
    ? { series: criterioAvance.series, segundos: criterioAvance.valor }
    : { series: criterioAvance.series, reps: criterioAvance.valor };
}

function construirArbol() {
  const entradas = Object.values(CATALOGO_EJERCICIOS);
  const referenciados = new Set();
  entradas.forEach(e => (e.prerequisitos || []).forEach(id => referenciados.add(id)));

  const arbol = {};
  entradas.forEach(e => {
    const enCadena = (e.prerequisitos || []).length > 0 || referenciados.has(e.id);
    if (!enCadena) return;
    arbol[e.id] = {
      nombre: e.nombre,
      rama: e.patronMovimiento,
      requiere: e.prerequisitos || [],
      objetivo: criterioAObjetivo(e.criterioAvance)
    };
  });
  return arbol;
}

export const ARBOL_PROGRESIONES = construirArbol();

// Orden y etiquetas de rama para la vista del árbol — los 8 patrones de
// movimiento reales del catálogo (Etapa 3, Opción A confirmada).
export const RAMA_ORDEN = [
  'empuje-horizontal', 'empuje-vertical',
  'traccion-horizontal', 'traccion-vertical',
  'rodilla', 'cadera', 'core', 'locomocion'
];
export const RAMA_LABELS = {
  'empuje-horizontal': 'Empuje Horizontal',
  'empuje-vertical': 'Empuje Vertical',
  'traccion-horizontal': 'Tracción Horizontal',
  'traccion-vertical': 'Tracción Vertical',
  rodilla: 'Rodilla',
  cadera: 'Cadera',
  core: 'Core',
  locomocion: 'Locomoción'
};

// Profundidad de un nodo = 1 (raíz) o 1 + la profundidad máxima entre sus
// prerrequisitos. Con bifurcaciones, dos nodos pueden compartir profundidad
// — es correcto, están al mismo nivel de exigencia aunque sean caminos
// distintos.
export function profundidadNodo(id, memo = new Map()) {
  if (memo.has(id)) return memo.get(id);
  const nodo = ARBOL_PROGRESIONES[id];
  if (!nodo || nodo.requiere.length === 0) { memo.set(id, 1); return 1; }
  const d = 1 + Math.max(...nodo.requiere.map(reqId => profundidadNodo(reqId, memo)));
  memo.set(id, d);
  return d;
}

// Profundidad máxima alcanzada dentro de una rama (el nodo hoja más
// profundo), usada como "nivelTotal" para el chip de rutina-session.js —
// con bifurcaciones no hay un único "final" de la rama, así que se toma el
// camino más largo como referencia.
function profundidadMaximaRama(rama) {
  const ids = Object.keys(ARBOL_PROGRESIONES).filter(id => ARBOL_PROGRESIONES[id].rama === rama);
  return Math.max(...ids.map(id => profundidadNodo(id)));
}

// Firma y forma de retorno sin cambios respecto a versiones anteriores
// (familia, nivelActual, nivelTotal, nombrePaso) — rutina-session.js sigue
// funcionando sin tocarlo.
export function getProgressionLevel(ejercicioNombre) {
  const nombreClean = ejercicioNombre.toLowerCase().trim();
  const id = Object.keys(ARBOL_PROGRESIONES).find(
    nodoId => ARBOL_PROGRESIONES[nodoId].nombre.toLowerCase().trim() === nombreClean
  );
  if (!id) return null;
  const nodo = ARBOL_PROGRESIONES[id];
  return {
    familia: nodo.rama,
    nivelActual: profundidadNodo(id),
    nivelTotal: profundidadMaximaRama(nodo.rama),
    nombrePaso: nodo.nombre,
    nodoId: id
  };
}

// --- Criterio de avance ------------------------------------------------
//
// "Serie limpia" = tipo 'normal' (calentamiento/fallo/dropset no cuentan
// como evidencia de dominar el paso) + reps u segundos >= objetivo del
// nodo + si hay RPE cargado, <= 8 (deja margen: completar al límite una
// vez no es lo mismo que dominarlo). Una sesión vieja sin `tipo` guardado
// se trata como serie normal (retrocompatibilidad).
//
// El requisito son N series limpias EN LA MISMA sesión (no acumuladas
// entre sesiones), y una vez lograda una sesión con N series limpias el
// paso queda graduado para siempre — no se re-evalúa contra la sesión más
// reciente, así un mal día no vuelve a bloquear un paso ya demostrado.
function esSerieLimpia(serie, objetivo) {
  const tipo = serie.tipo || 'normal';
  if (tipo !== 'normal') return false;
  const target = objetivo.segundos ?? objetivo.reps;
  if (serie.reps < target) return false;
  if (serie.rpe != null && serie.rpe > 8) return false;
  return true;
}

// historial: salida de db.getHistorialEjercicio(nodo.nombre) — cada fila ya
// trae `seriesDetalle` (tipo/reps/rpe por serie) desde esa sesión. objetivo
// === null (las 4 entradas GYM tipo 'ratio') no tiene "series limpias" que
// contar — ver estaDesbloqueado() para cómo se trata ese caso.
export function contarSeriesLimpias(historial, objetivo) {
  if (!objetivo) return false;
  return (historial || []).some(sesion =>
    (sesion.seriesDetalle || []).filter(s => esSerieLimpia(s, objetivo)).length >= objetivo.series
  );
}

// historialPorNombre: { [nombreDeEjercicio]: historial } para todos los
// nombres involucrados — el caller (la vista del árbol) hace un solo
// barrido de db.getHistorialEjercicio por nodo relevante y arma este mapa
// una vez. Un nodo raíz (sin prerrequisitos) siempre está desbloqueado.
// Un prerrequisito con objetivo === null (tipo 'ratio': sentadilla, press
// de banca, peso muerto, press militar) se gradúa por tabla de estándares
// de fuerza, no por "series limpias" — acá se trata como siempre
// satisfecho para no bloquear su variante GYM sobre un criterio que este
// árbol no evalúa.
export function estaDesbloqueado(nodoId, historialPorNombre) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  if (!nodo) return false;
  return nodo.requiere.every(reqId => {
    const req = ARBOL_PROGRESIONES[reqId];
    if (!req || !req.objetivo) return true;
    return contarSeriesLimpias(historialPorNombre[req.nombre], req.objetivo);
  });
}

// Nodos de prerrequisito directo de `nodoId`, resueltos a su info completa
// — para que la vista pueda mostrar "te falta: X, Y" sin tener que resolver
// ids a mano.
export function getPrerrequisitos(nodoId) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  if (!nodo) return [];
  return nodo.requiere.map(id => ({ id, ...ARBOL_PROGRESIONES[id] }));
}
