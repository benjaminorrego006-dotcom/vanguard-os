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
