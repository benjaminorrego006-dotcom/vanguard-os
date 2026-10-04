// Punto de entrada público del catálogo de ejercicios. Los datos en sí
// viven en ejercicios-catalogo-gym.js / -calistenia.js / -hiit.js (el
// archivo único pasó de 54 a 100+ entradas, ~89KB). Este archivo combina
// los tres y expone exactamente la misma forma pública que antes de la
// división — getEjercicioMetadata() se mantiene acá para resolver por
// nombre (fuzzy match) los ejercicios que el usuario escribe a mano en
// una sesión libre, ya que esos no tienen id.
import { CATALOGO_GYM } from './ejercicios-catalogo-gym.js';
import { CATALOGO_CALISTENIA } from './ejercicios-catalogo-calistenia.js';
import { CATALOGO_HIIT } from './ejercicios-catalogo-hiit.js';

export const CATALOGO_EJERCICIOS = { ...CATALOGO_GYM, ...CATALOGO_CALISTENIA, ...CATALOGO_HIIT };

export function getEjercicioPorId(id) {
  return CATALOGO_EJERCICIOS[id] || null;
}

export function getEjercicioMetadata(nombre) {
  const fallback = { grupoMuscular: 'otro', patron: 'otro', categoria: null, posturaInicial: '', pasosEjecucion: [], erroresComunes: [], musculoSecundario: '' };
  if (!nombre) return fallback;
  const nomClean = nombre.toLowerCase().trim();

  // 1. Exact match
  if (CATALOGO_EJERCICIOS[nomClean]) return CATALOGO_EJERCICIOS[nomClean];

  // 2. Fuzzy match
  for (const key of Object.keys(CATALOGO_EJERCICIOS)) {
    if (nomClean.includes(key)) {
      return CATALOGO_EJERCICIOS[key];
    }
  }

  // Fallback if no match
  return fallback;
}

// Índice inverso nombre -> id, construido una sola vez al cargar el módulo.
// A diferencia de getEjercicioMetadata() (fuzzy: hace match por substring
// para resolver texto libre que el usuario tipeó a mano), esto es SOLO
// coincidencia exacta — lo usa db.js para vincular una sesión al
// ejercicioId estable del catálogo (Fase "Etapa 1"). Un falso positivo acá
// vincularía el historial de dos ejercicios distintos para siempre, así
// que no vale correr el riesgo del fuzzy match en este camino.
const NOMBRE_A_ID = new Map(
  Object.values(CATALOGO_EJERCICIOS).map(e => [e.nombre.toLowerCase().trim(), e.id])
);

// Devuelve el id de catálogo cuyo `nombre` coincide EXACTO (case-insensitive,
// trim) con `nombre`, o null si no hay coincidencia — típicamente un
// ejercicio que el usuario escribió a mano y no está en el catálogo. null
// es una respuesta válida y esperada, no un error.
export function getIdPorNombreExacto(nombre) {
  if (!nombre) return null;
  return NOMBRE_A_ID.get(nombre.toLowerCase().trim()) || null;
}

// Nombre a id del catálogo AL LEER (no se guarda nada): reconoce el nombre
// del catálogo y también su clave, sin distinguir mayúsculas, tildes ni
// espacios de más. La clave es el id y, con mayúscula inicial, el nombre que
// guardaba el buscador viejo de la sesión en vivo ("Peso Muerto" por "Peso
// Muerto Convencional"): esas entradas quedaron con ejercicioId null.
// getIdPorNombreExacto (arriba) sigue siendo lo que se usa al GUARDAR y en
// la migración perezosa, así ninguna sesión guardada se reescribe.
export function normalizarNombreEjercicio(nombre) {
  return String(nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
const NOMBRE_O_CLAVE_A_ID = new Map();
Object.values(CATALOGO_EJERCICIOS).forEach(e => {
  NOMBRE_O_CLAVE_A_ID.set(normalizarNombreEjercicio(e.nombre), e.id);
});
// Las claves después: si una clave coincidiera con el nombre de otro
// ejercicio, gana el nombre.
Object.entries(CATALOGO_EJERCICIOS).forEach(([clave, e]) => {
  const k = normalizarNombreEjercicio(clave);
  if (!NOMBRE_O_CLAVE_A_ID.has(k)) NOMBRE_O_CLAVE_A_ID.set(k, e.id);
});
export function idCatalogoPorNombre(nombre) {
  if (!nombre) return null;
  return NOMBRE_O_CLAVE_A_ID.get(normalizarNombreEjercicio(nombre)) || null;
}

// Id de catálogo de una entrada de ejercicio de sesión: el ejercicioId
// guardado o, si no tiene (null/undefined), el que sale de su nombre. null
// para un ejercicio libre. Lo comparten récords, historial, nivel,
// sugerencias y mapa muscular.
export function idDeEntradaEjercicio(ej) {
  if (!ej) return null;
  return ej.ejercicioId || idCatalogoPorNombre(ej.nombre);
}

// Metadata (grupo muscular, etc.) por id —el guardado o el que sale del
// nombre— y, si no hay, la búsqueda aproximada de siempre.
export function metadataDeEjercicio(nombre, ejercicioId = null) {
  return getEjercicioPorId(ejercicioId || idCatalogoPorNombre(nombre)) || getEjercicioMetadata(nombre);
}

// Orden lógico y etiquetas para agrupar ejercicios por grupo muscular
// dentro de una rutina/plantilla. 'otro' cubre ejercicios sueltos que el
// usuario escribe a mano y no matchean el catálogo.
export const GRUPO_MUSCULAR_ORDEN = ['piernas', 'espalda', 'pecho', 'hombros', 'brazos', 'core', 'cardio', 'otro'];
export const GRUPO_MUSCULAR_LABELS = {
  piernas: 'Piernas',
  espalda: 'Espalda',
  pecho: 'Pecho',
  hombros: 'Hombros',
  brazos: 'Brazos',
  core: 'Core',
  cardio: 'Cardio',
  otro: 'Otros'
};

// grupoMuscular real del catálogo (gym/calistenia) -> clave que usa
// GRUPOS_MUSCULARES del mapa muscular MK III (mk3-muscle-map-data.js).
// Vive acá y no en el componente del mapa porque este archivo es el dueño
// de la semántica de grupoMuscular — el mapa no debería depender del
// catálogo, así que la normalización va en esta dirección. "cardio" no
// tiene una zona clara del cuerpo (podría ser cualquier músculo según el
// ejercicio) y "otro" es el cajón de sastre de getVolumenPorGrupo — ninguno
// de los dos ilumina nada en el mapa. "Cabeza y cuello" y "Manos y pies"
// del mapa quedan siempre neutras a propósito: ningún ejercicio de
// GYM/Calistenia entrena esas zonas específicamente.
export const GRUPO_MUSCULAR_A_MAPA = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  brazos: 'Brazos',
  piernas: 'Piernas',
  core: 'Abdomen',
};

export function grupoMuscularParaMapa(grupoMuscular) {
  return GRUPO_MUSCULAR_A_MAPA[grupoMuscular] || null;
}

// Agrupa `items` por grupo muscular (según `getGrupo(item)`) preservando el
// orden original DENTRO de cada grupo, y devuelve los grupos en el orden
// lógico de entrenamiento (Piernas -> Espalda -> Pecho -> Hombros -> Brazos
// -> Core -> Cardio -> Otros), omitiendo los grupos sin ejercicios.
export function agruparPorGrupoMuscular(items, getGrupo) {
  const buckets = {};
  items.forEach(item => {
    const g = getGrupo(item) || 'otro';
    if (!buckets[g]) buckets[g] = [];
    buckets[g].push(item);
  });
  return GRUPO_MUSCULAR_ORDEN
    .filter(g => buckets[g] && buckets[g].length > 0)
    .map(g => ({ grupo: g, label: GRUPO_MUSCULAR_LABELS[g], items: buckets[g] }));
}
