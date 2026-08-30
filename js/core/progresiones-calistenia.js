// Árbol de progresión de calistenia. Cada nodo declara explícitamente de
// qué paso(s) depende (`requiere`, array de ids) en vez de vivir en una
// posición implícita dentro de una lista — así una rama puede bifurcarse
// (ej. después de la dominada estricta, el camino a la dominada a una mano
// y el camino a la dominada lastrada son prerrequisitos distintos que
// comparten el mismo padre) o incluso cruzar ramas: el muscle-up (rama
// "estaticos") requiere un nodo de "dominadas" Y uno de "fondos" a la vez,
// y el front lever tuck requiere un nodo de "dominadas" Y uno de "core" —
// algo que una lista lineal por familia no puede expresar.
//
// `nombre` tiene que ser el nombre EXACTO (no substring) de
// ejercicios-catalogo.js: rutinas.js resuelve cada ejercicio de plantilla
// como getEjercicioPorId(id).nombre, y ese es el string que termina
// guardado en cada sesión — es la única fuente de verdad para lo que
// getProgressionLevel() puede llegar a matchear. Un nombre inventado acá
// nunca resuelve porque ninguna sesión real lo va a producir jamás.
//
// `objetivo` es el criterio de "graduado" de ESE nodo: cuántas series
// limpias y de cuántas reps (o segundos, para estáticos) hacen falta para
// considerar el paso dominado. Es independiente de cuántas series prescriba
// una plantilla puntual — ver contarSeriesLimpias() más abajo para el
// criterio completo.
export const ARBOL_PROGRESIONES = {
  // --- FLEXIONES (empuje horizontal) ---
  'flexion-pared': { nombre: 'Flexiones en Pared', rama: 'flexiones', requiere: [], objetivo: { series: 3, reps: 15 } },
  'flexion-inclinada': { nombre: 'Flexiones Inclinadas', rama: 'flexiones', requiere: ['flexion-pared'], objetivo: { series: 3, reps: 12 } },
  'flexion-rodillas': { nombre: 'Flexiones con Rodillas', rama: 'flexiones', requiere: ['flexion-inclinada'], objetivo: { series: 3, reps: 10 } },
  'flexion-estricta': { nombre: 'Flexiones (Push-up)', rama: 'flexiones', requiere: ['flexion-rodillas'], objetivo: { series: 3, reps: 12 } },
  'flexion-declinada': { nombre: 'Flexiones Declinadas', rama: 'flexiones', requiere: ['flexion-estricta'], objetivo: { series: 3, reps: 10 } },
  // Bifurcación: diamante (fuerza de tríceps) y arquero (camino hacia una
  // mano) son dos direcciones distintas desde el mismo padre, no dos pasos
  // de la misma escalera.
  'flexion-diamante': { nombre: 'Flexiones Diamante', rama: 'flexiones', requiere: ['flexion-declinada'], objetivo: { series: 3, reps: 10 } },
  'flexion-arquero': { nombre: 'Flexiones de Arquero', rama: 'flexiones', requiere: ['flexion-declinada'], objetivo: { series: 3, reps: 6 } },
  'flexion-una-mano-asistida': { nombre: 'Flexiones a Una Mano Asistidas', rama: 'flexiones', requiere: ['flexion-arquero'], objetivo: { series: 3, reps: 5 } },
  'flexion-una-mano': { nombre: 'Flexiones a Una Mano', rama: 'flexiones', requiere: ['flexion-una-mano-asistida'], objetivo: { series: 2, reps: 3 } },

  // --- DOMINADAS (tracción vertical) ---
  'remo-invertido': { nombre: 'Remo Invertido', rama: 'dominadas', requiere: [], objetivo: { series: 3, reps: 10 } },
  'dead-hang': { nombre: 'Dead Hang', rama: 'dominadas', requiere: ['remo-invertido'], objetivo: { series: 3, segundos: 20 } },
  // Sostener arriba (fuerza de tracción real) es un escalón propio, distinto
  // del dead hang (cuelgue pasivo, casi sin tracción) — entre ambos y las
  // negativas.
  'dominada-isometrica': { nombre: 'Dominadas Isométricas', rama: 'dominadas', requiere: ['dead-hang'], objetivo: { series: 3, segundos: 10 } },
  'dominada-negativa': { nombre: 'Negativas de Dominada', rama: 'dominadas', requiere: ['dominada-isometrica'], objetivo: { series: 3, reps: 5 } },
  'dominada-asistida': { nombre: 'Dominada Asistida con Banda', rama: 'dominadas', requiere: ['dominada-negativa'], objetivo: { series: 3, reps: 6 } },
  'dominada-estricta': { nombre: 'Dominadas', rama: 'dominadas', requiere: ['dominada-asistida'], objetivo: { series: 3, reps: 8 } },
  // Bifurcación explícita que pidió la Fase 5: lastrada (fuerza pura) y
  // arquero->una mano (habilidad unilateral) son caminos distintos, ambos
  // parten de la dominada estricta.
  'dominada-lastrada': { nombre: 'Dominadas Lastradas', rama: 'dominadas', requiere: ['dominada-estricta'], objetivo: { series: 3, reps: 5 } },
  'dominada-arquero': { nombre: 'Dominada de Arquero', rama: 'dominadas', requiere: ['dominada-estricta'], objetivo: { series: 3, reps: 5 } },
  'dominada-una-mano-asistida': { nombre: 'Dominada a Una Mano Asistida', rama: 'dominadas', requiere: ['dominada-arquero'], objetivo: { series: 3, reps: 3 } },
  'dominada-una-mano': { nombre: 'Dominada a Una Mano', rama: 'dominadas', requiere: ['dominada-una-mano-asistida'], objetivo: { series: 2, reps: 1 } },

  // --- FONDOS (empuje vertical) ---
  'fondo-banco': { nombre: 'Fondos en Banco', rama: 'fondos', requiere: [], objetivo: { series: 3, reps: 10 } },
  'fondo-asistido': { nombre: 'Fondos Asistidos con Banda', rama: 'fondos', requiere: ['fondo-banco'], objetivo: { series: 3, reps: 8 } },
  'fondo-paralelas': { nombre: 'Fondos en Paralelas', rama: 'fondos', requiere: ['fondo-asistido'], objetivo: { series: 3, reps: 8 } },
  // Bifurcación: anillas (estabilidad) y lastrados (fuerza pura) son dos
  // variantes avanzadas reales, no un mismo escalón con nombre distinto.
  'fondo-anillas': { nombre: 'Fondos en Anillas', rama: 'fondos', requiere: ['fondo-paralelas'], objetivo: { series: 3, reps: 8 } },
  'fondo-lastrado': { nombre: 'Fondos Lastrados', rama: 'fondos', requiere: ['fondo-paralelas'], objetivo: { series: 3, reps: 5 } },

  // --- SENTADILLAS (piernas, unilateral progresivo) ---
  'sentadilla-asistida': { nombre: 'Sentadilla Asistida', rama: 'sentadillas', requiere: [], objetivo: { series: 3, reps: 12 } },
  'sentadilla-bodyweight': { nombre: 'Sentadilla con Peso Corporal', rama: 'sentadillas', requiere: ['sentadilla-asistida'], objetivo: { series: 3, reps: 15 } },
  'zancadas': { nombre: 'Zancadas', rama: 'sentadillas', requiere: ['sentadilla-bodyweight'], objetivo: { series: 3, reps: 12 } },
  'sentadilla-bulgara': { nombre: 'Sentadilla Búlgara', rama: 'sentadillas', requiere: ['zancadas'], objetivo: { series: 3, reps: 10 } },
  'pistol-asistida': { nombre: 'Pistol Squat Asistida', rama: 'sentadillas', requiere: ['sentadilla-bulgara'], objetivo: { series: 3, reps: 6 } },
  'pistol': { nombre: 'Pistol Squat (progresión)', rama: 'sentadillas', requiere: ['pistol-asistida'], objetivo: { series: 2, reps: 5 } },

  // --- CORE: la razón por la que casi todo lo demás se sostiene. Lineal,
  // sin bifurcación — hollow body -> plancha -> L-sit es la progresión de
  // control de cadera/columna estándar, y no hay dos caminos razonables
  // distintos acá como sí los hay en empuje/tracción/piernas. ---
  'hollow-body': { nombre: 'Hollow Body Hold', rama: 'core', requiere: [], objetivo: { series: 3, segundos: 20 } },
  'plancha-core': { nombre: 'Plancha (Plank)', rama: 'core', requiere: ['hollow-body'], objetivo: { series: 3, segundos: 40 } },
  'l-sit': { nombre: 'L-Sit', rama: 'core', requiere: ['plancha-core'], objetivo: { series: 3, segundos: 10 } },

  // --- ESTÁTICOS: varias líneas de habilidad independientes bajo la misma
  // rama, no una escalera única (handstand no lleva a front lever). Front
  // lever, muscle-up, back lever y bandera humana son los nodos que de
  // verdad exigen el árbol en vez de listas: sus prerrequisitos viven en
  // OTRAS ramas.
  //
  // Cadena real de handstand (Etapa 2c, EJERCICIOS-NIVELES.md): crow pose
  // -> handstand contra pared -> handstand de cara a la pared -> handstand
  // libre. Crow pose aporta equilibrio/control de core; pike push-up aporta
  // la fuerza de empuje — handstand contra pared exige las dos cosas a la
  // vez, así que tiene dos prerrequisitos en paralelo, no uno solo.
  'crow-pose': { nombre: 'Crow Pose', rama: 'estaticos', requiere: [], objetivo: { series: 3, segundos: 10 } },
  'pike-pushup': { nombre: 'Pike Push-up', rama: 'estaticos', requiere: [], objetivo: { series: 3, reps: 8 } },
  'handstand-pared': { nombre: 'Handstand contra Pared', rama: 'estaticos', requiere: ['pike-pushup', 'crow-pose'], objetivo: { series: 3, segundos: 20 } },
  'handstand-cara-pared': { nombre: 'Handstand de Cara a la Pared', rama: 'estaticos', requiere: ['handstand-pared'], objetivo: { series: 3, segundos: 10 } },
  'handstand-libre': { nombre: 'Handstand (Libre)', rama: 'estaticos', requiere: ['handstand-cara-pared'], objetivo: { series: 3, segundos: 10 } },

  // Requiere fuerza de tracción (dominada-estricta, rama "dominadas") Y
  // control de core (hollow-body, rama "core") a la vez — un AND real
  // entre dos ramas, no una posición en una lista. 4 pasos (Etapa 2c
  // agregó el straddle que faltaba entre el tuck avanzado y el completo).
  'front-lever-tuck': { nombre: 'Front Lever Tuck', rama: 'estaticos', requiere: ['dominada-estricta', 'hollow-body'], objetivo: { series: 3, segundos: 10 } },
  'front-lever-avanzado': { nombre: 'Front Lever Avanzado (Tuck Avanzado)', rama: 'estaticos', requiere: ['front-lever-tuck'], objetivo: { series: 3, segundos: 8 } },
  'front-lever-straddle': { nombre: 'Straddle Front Lever', rama: 'estaticos', requiere: ['front-lever-avanzado'], objetivo: { series: 3, segundos: 10 } },
  'front-lever': { nombre: 'Front Lever', rama: 'estaticos', requiere: ['front-lever-straddle'], objetivo: { series: 2, segundos: 5 } },

  // Requiere dominada-estricta (rama "dominadas") Y fondo-paralelas (rama
  // "fondos") — la tracción para llegar arriba de la barra y el empuje
  // para completar la transición son fuerzas distintas, entrenadas en
  // ramas distintas.
  'muscle-up': { nombre: 'Muscle-up', rama: 'estaticos', requiere: ['dominada-estricta', 'fondo-paralelas'], objetivo: { series: 2, reps: 3 } },

  // Back lever y bandera humana: más accesibles que el front lever pero
  // construidos sobre la misma base de tracción (dominada-estricta).
  'back-lever': { nombre: 'Back Lever', rama: 'estaticos', requiere: ['dominada-estricta'], objetivo: { series: 3, segundos: 10 } },
  'bandera-humana': { nombre: 'Bandera Humana', rama: 'estaticos', requiere: ['dominada-estricta'], objetivo: { series: 3, segundos: 10 } },

  // Dragon flag: control de core de cuerpo completo, construido sobre
  // hollow body.
  'dragon-flag': { nombre: 'Dragon Flag', rama: 'estaticos', requiere: ['hollow-body'], objetivo: { series: 3, segundos: 10 } },

  // Planche: cinco pasos, con el acondicionamiento de muñeca como
  // prerrequisito explícito de toda la línea — 2+ meses de preparación
  // antes de trabajo serio, es la causa más común de lesión temprana. El
  // tuck avanzado exige más (12-15s) que el resto de estáticos: es donde
  // más gente se estanca, porque la espalda plana (en vez de redondeada)
  // aleja el centro de masa de las manos y sube la demanda de hombro.
  'muñeca-acondicionamiento': { nombre: 'Acondicionamiento de Muñeca', rama: 'estaticos', requiere: [], objetivo: { series: 3, segundos: 10 } },
  'plancha-lean': { nombre: 'Plancha Lean', rama: 'estaticos', requiere: ['muñeca-acondicionamiento'], objetivo: { series: 3, segundos: 10 } },
  'plancha-tuck': { nombre: 'Tuck Planche', rama: 'estaticos', requiere: ['plancha-lean'], objetivo: { series: 3, segundos: 10 } },
  'plancha-tuck-avanzado': { nombre: 'Tuck Avanzado Planche', rama: 'estaticos', requiere: ['plancha-tuck'], objetivo: { series: 3, segundos: 15 } },
  'plancha-straddle': { nombre: 'Straddle Planche', rama: 'estaticos', requiere: ['plancha-tuck-avanzado'], objetivo: { series: 3, segundos: 10 } },
  'plancha-completa': { nombre: 'Planche', rama: 'estaticos', requiere: ['plancha-straddle'], objetivo: { series: 2, segundos: 10 } }
};

// Orden y etiquetas de rama para la vista del árbol (Fase 5d) — las cuatro
// familias originales primero, core después (todo lo demás se apoya en
// ella) y estáticos al final (son la combinación de las otras).
export const RAMA_ORDEN = ['flexiones', 'dominadas', 'fondos', 'sentadillas', 'core', 'estaticos'];
export const RAMA_LABELS = {
  flexiones: 'Flexiones',
  dominadas: 'Dominadas',
  fondos: 'Fondos',
  sentadillas: 'Sentadillas',
  core: 'Core',
  estaticos: 'Estáticos'
};

// Profundidad de un nodo = 1 (raíz) o 1 + la profundidad máxima entre sus
// prerrequisitos. Con bifurcaciones, dos nodos pueden compartir profundidad
// (dominada-lastrada y dominada-arquero son ambos "nivel 6") — es correcto,
// están al mismo nivel de exigencia aunque sean caminos distintos.
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

// Índice nombre-lowercase -> id de nodo, para resolver getProgressionLevel
// en O(1) por igualdad exacta (no por substring: eso es lo que hacía que la
// versión anterior matcheara pasos equivocados — ver nota en Fase 5).
const NOMBRE_A_ID = Object.fromEntries(
  Object.entries(ARBOL_PROGRESIONES).map(([id, nodo]) => [nodo.nombre.toLowerCase(), id])
);

// Firma y forma de retorno sin cambios respecto a la versión de listas
// (familia, nivelActual, nivelTotal, nombrePaso) — rutina-session.js sigue
// funcionando sin tocarlo. nivelActual/nivelTotal ahora sale de la
// profundidad en el árbol en vez de la posición en un array.
export function getProgressionLevel(ejercicioNombre) {
  const id = NOMBRE_A_ID[ejercicioNombre.toLowerCase().trim()];
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

// --- Criterio de avance (Fase 5b) ------------------------------------
//
// "Serie limpia" = tipo 'normal' (calentamiento/fallo/dropset no cuentan
// como evidencia de dominar el paso) + reps u segundos >= objetivo del
// nodo + si hay RPE cargado, <= 8 (deja margen: completar al límite una
// vez no es lo mismo que dominarlo). Una sesión vieja sin `tipo` guardado
// se trata como serie normal (retrocompatibilidad — no penaliza historial
// previo a que existiera el selector de tipo de serie).
//
// El requisito son N=3 series limpias EN LA MISMA sesión (no acumuladas
// entre sesiones): es lo mínimo que ya piden nuestras propias plantillas
// de calistenia, evita inventar una ventana temporal arbitraria para ir
// sumando series sueltas, y una vez lograda una sesión con 3 series
// limpias el paso queda graduado para siempre — no se re-evalúa contra la
// sesión más reciente, así un mal día no vuelve a bloquear un paso ya
// demostrado.
function esSerieLimpia(serie, objetivo) {
  const tipo = serie.tipo || 'normal';
  if (tipo !== 'normal') return false;
  const target = objetivo.segundos ?? objetivo.reps;
  if (serie.reps < target) return false;
  if (serie.rpe != null && serie.rpe > 8) return false;
  return true;
}

// historial: salida de db.getHistorialEjercicio(nodo.nombre) — cada fila ya
// trae `seriesDetalle` (tipo/reps/rpe por serie) desde esa sesión.
export function contarSeriesLimpias(historial, objetivo) {
  return (historial || []).some(sesion =>
    (sesion.seriesDetalle || []).filter(s => esSerieLimpia(s, objetivo)).length >= objetivo.series
  );
}

// historialPorNombre: { [nombreDeEjercicio]: historial } para todos los
// nombres involucrados — el caller (la vista del árbol, Fase 5d) hace un
// solo barrido de db.getHistorialEjercicio por nodo relevante y arma este
// mapa una vez, en vez de que esta función dispare sus propias consultas.
// Un nodo raíz (sin prerrequisitos) siempre está desbloqueado.
export function estaDesbloqueado(nodoId, historialPorNombre) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  if (!nodo) return false;
  return nodo.requiere.every(reqId => {
    const req = ARBOL_PROGRESIONES[reqId];
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
