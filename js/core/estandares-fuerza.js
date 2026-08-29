// Estándares de fuerza para los 4 levantamientos principales de GYM, como
// múltiplo del 1RM estimado sobre el peso corporal. Fuente:
// strengthlevel.com (tabla 2026), verificada a mano dividiendo peso
// levantado ÷ peso corporal fila por fila de la tabla real — no el
// resumen de "ratio plano" que trae la página, que no coincidía con esos
// números. Ratios tomados de la fila más cercana a un peso corporal
// adulto típico: ~82kg hombres, ~64kg mujeres. El ratio real de la fuente
// varía un poco con el peso corporal real de cada persona (alguien mucho
// más liviano o más pesado que la referencia corre de nivel ~5-10%);
// tradeoff aceptado a cambio de no mantener una tabla completa por rango
// de peso.
//
// La fuente tiene 5 niveles (Beginner/Novice/Intermediate/Advanced/
// Elite); acá se usan los 4 que pidió el producto: "Beginner" no es un
// corte propio (cualquiera por debajo de Novato es "Principiante") y
// "Elite" queda dentro de "Avanzado" (sin techo separado).
export const LEVANTAMIENTOS_ID = ['sentadilla', 'press de banca', 'peso muerto', 'press militar'];

const RATIOS = {
  'sentadilla': {
    M: { novato: 1.27, intermedio: 1.66, avanzado: 2.09 },
    F: { novato: 0.81, intermedio: 1.18, avanzado: 1.61 }
  },
  'press de banca': {
    M: { novato: 0.94, intermedio: 1.22, avanzado: 1.54 },
    F: { novato: 0.51, intermedio: 0.77, avanzado: 1.09 }
  },
  'peso muerto': {
    M: { novato: 1.49, intermedio: 1.93, avanzado: 2.43 },
    F: { novato: 0.99, intermedio: 1.40, avanzado: 1.89 }
  },
  'press militar': {
    M: { novato: 0.59, intermedio: 0.78, avanzado: 0.99 },
    F: { novato: 0.36, intermedio: 0.51, avanzado: 0.69 }
  }
};

const NIVEL_LABELS = { principiante: 'Principiante', novato: 'Novato', intermedio: 'Intermedio', avanzado: 'Avanzado' };

// ratio = 1RM estimado / peso corporal, misma unidad en ambos lados (kg
// entre kg) así que el resultado es el múltiplo directamente, sin
// necesidad de convertir nada — los ratios de la fuente son igual de
// válidos calculados en kg que en lb.
export function getNivel(levantamientoId, sexo, ratio) {
  const r = RATIOS[levantamientoId]?.[sexo === 'F' ? 'F' : 'M'];
  if (!r) return null;

  if (ratio >= r.avanzado) return { nivel: 'avanzado', label: NIVEL_LABELS.avanzado, siguienteNivel: null, siguienteRatio: null };
  if (ratio >= r.intermedio) return { nivel: 'intermedio', label: NIVEL_LABELS.intermedio, siguienteNivel: 'avanzado', siguienteLabel: NIVEL_LABELS.avanzado, siguienteRatio: r.avanzado };
  if (ratio >= r.novato) return { nivel: 'novato', label: NIVEL_LABELS.novato, siguienteNivel: 'intermedio', siguienteLabel: NIVEL_LABELS.intermedio, siguienteRatio: r.intermedio };
  return { nivel: 'principiante', label: NIVEL_LABELS.principiante, siguienteNivel: 'novato', siguienteLabel: NIVEL_LABELS.novato, siguienteRatio: r.novato };
}
