// Dificultad de las tareas de Lista (docs/PLAN-DIFICULTAD-FOCO.md). Una tarea
// sin el campo se lee como 'media' al calcular (sin migrar ni escribir nada).
// Peso para métricas ("puntos"): fácil 1, media 2, difícil 3.
import { escapeHtml } from './escape.js';

export const PESO_DIFICULTAD = { facil: 1, media: 2, dificil: 3 };
const ETIQUETA = { facil: 'Fácil', media: 'Media', dificil: 'Difícil' };

export const dificultadDe = (tarea) => (tarea && PESO_DIFICULTAD[tarea.dificultad] ? tarea.dificultad : 'media');
export const pesoDificultad = (tarea) => PESO_DIFICULTAD[dificultadDe(tarea)];
export const etiquetaDificultad = (tarea) => ETIQUETA[dificultadDe(tarea)];

// Marca chica solo para fácil y difícil (la media no se marca, para no meter
// ruido). `letra`: "F" / "D" (columnas de Semana, donde el texto no entra),
// con el nombre completo en title y aria-label.
export function marcaDificultad(tarea, { letra = false } = {}) {
  const d = tarea && tarea.dificultad;
  if (d !== 'facil' && d !== 'dificil') return '';
  const nombre = ETIQUETA[d];
  const texto = letra ? nombre[0] : nombre.toUpperCase();
  return `<span class="dif-marca num${letra ? ' dif-marca--letra' : ''}" title="${escapeHtml(nombre)}" aria-label="${escapeHtml(nombre)}">${texto}</span>`;
}
