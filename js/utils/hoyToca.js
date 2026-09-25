// js/utils/hoyToca.js
// "Hoy toca": sugiere la categoría (y su primera rutina guardada) que
// lleva MÁS TIEMPO sin entrenarse — una rotación real (si hay una rutina
// por categoría tipo Push/Pull/Legs, esto las va turnando solas) sin
// necesitar todavía el sistema de nivel/split del backlog. Solo mira
// categorías donde el usuario ya tiene al menos una rutina guardada — no
// tiene sentido sugerir "hoy toca HIIT" si ni siquiera hay una rutina de
// HIIT creada.
//
// Vive acá (y no dentro de views/entrenamiento.js) porque lo usan Entreno
// y la tarjeta contextual de Inicio, y importar la vista entera de Entreno
// solo por esto arrastraría todo su grafo de módulos al arranque de Inicio.
import { db } from '../core/db.js';

export async function calcularHoyToca(sesiones) {
  const rutinas = await db.getRutinas();
  if (rutinas.length === 0) return null;

  const rutinasPorId = {};
  rutinas.forEach(r => { rutinasPorId[r.id] = r; });

  const ultimaPorCategoria = {};
  sesiones.forEach(s => {
    const cat = rutinasPorId[s.rutinaId]?.categoria;
    if (!cat) return;
    if (!ultimaPorCategoria[cat] || new Date(s.fecha) > new Date(ultimaPorCategoria[cat])) {
      ultimaPorCategoria[cat] = s.fecha;
    }
  });

  const categoriasConRutina = [...new Set(rutinas.map(r => r.categoria))];
  const categoriaSugerida = categoriasConRutina.sort((a, b) => {
    const fa = ultimaPorCategoria[a] ? new Date(ultimaPorCategoria[a]).getTime() : 0;
    const fb = ultimaPorCategoria[b] ? new Date(ultimaPorCategoria[b]).getTime() : 0;
    return fa - fb;
  })[0];

  return rutinas.find(r => r.categoria === categoriaSugerida) || null;
}
