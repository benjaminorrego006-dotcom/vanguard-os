// Auto-detección de progreso y sugerencia de avance de nivel
// (PROMPT-NIVEL-FILTRADO.md, paso 4/e). Compara el nivel DECLARADO por el
// usuario para cada rama (lo que confirmó en el onboarding o en una
// sugerencia previa — lo que se muestra como "tu perfil") contra evidencia
// real de que ya lo superó:
//   - Calistenia: reps máximas en una sola serie limpia (tipo 'normal', sin
//     fallo/dropset/calentamiento) de los ejercicios ancla de cada rama.
//   - GYM: los mismos Estándares de Fuerza que ya usa calcularNivelPorRama()
//     en generador-rutinas.js para elegir dificultad — NO una tabla de
//     umbrales propia. Tener dos tablas distintas para la misma pregunta
//     sería inconsistente (decisión confirmada por el usuario).
//
// Esto es DISTINTO de calcularNivelPorRama(): esa función ya combina
// Estándares de Fuerza en silencio para elegir qué ejercicio prescribir
// dentro del generador, sin pedir confirmación (es una decisión de
// dificultad, no un cambio de identidad). Este módulo, en cambio, decide
// cuándo el "perfil" que el usuario ve y declaró (nivelEntrenamiento) debería
// avanzar — y eso SIEMPRE requiere que el usuario lo confirme (ver e: "No
// subirlo automáticamente. Sugerir.").
import { db } from './db.js';
import { getNivel } from './estandares-fuerza.js';
import { getEjercicioPorId } from './ejercicios-catalogo.js';
import { RAMA_ORDEN, RAMA_LABELS } from './progresiones.js';

const NIVEL_RANGO = { principiante: 0, intermedio: 1, avanzado: 2 };

// Mismo mapeo tiempo→nivel que TIEMPO_A_NIVEL_PISO en generador-rutinas.js.
// Se repite acá (en vez de importarse) porque ahí es una constante interna
// sin exportar y es dato de catálogo estable, no lógica que pueda
// desincronizarse.
const TIEMPO_A_NIVEL = { 'menos-1': 'principiante', '1-3': 'intermedio', 'mas-3': 'avanzado' };

// Ejercicio ancla de calistenia por rama + umbrales de reps máximas en una
// sola serie limpia para pasar a intermedio / avanzado. Solo 3 de las 8
// ramas tienen un criterio de calistenia definido en el prompt.
const UMBRALES_CALISTENIA = {
  'empuje-horizontal': { nombre: 'Flexiones (Push-up)', intermedio: 15, avanzado: 25 },
  'traccion-vertical': { nombre: 'Dominadas', intermedio: 5, avanzado: 10 }
};

// Rodilla es un caso especial: el paso a intermedio es por reps (20
// sentadillas con peso corporal en una serie), pero el paso a avanzado del
// prompt ("negativas de pistol squat registradas") no es un umbral de reps
// sino evidencia de que el usuario ya está entrenando ese movimiento. El
// catálogo no tiene un nodo "Negativas de Pistol Squat"; el equivalente más
// cercano registrable es Pistol Squat Asistida, así que cualquier serie
// real registrada ahí cuenta como el disparador de avanzado.
const RODILLA_NOMBRE_INTERMEDIO = 'Sentadilla con Peso Corporal';
const RODILLA_REPS_INTERMEDIO = 20;
const RODILLA_NOMBRE_AVANZADO = 'Pistol Squat Asistida';

// Levantamiento de Estándares de Fuerza asociado a cada rama con umbral
// GYM — mismo mapeo que LEVANTAMIENTO_POR_RAMA en generador-rutinas.js.
const LEVANTAMIENTO_POR_RAMA = {
  rodilla: 'sentadilla',
  cadera: 'peso muerto',
  'empuje-horizontal': 'press de banca',
  'empuje-vertical': 'press militar'
};

function maxRepsEnUnaSerieLimpia(historial) {
  let max = 0;
  (historial || []).forEach(sesion => {
    (sesion.seriesDetalle || []).forEach(serie => {
      const esLimpia = !serie.tipo || serie.tipo === 'normal';
      if (esLimpia && serie.reps > max) max = serie.reps;
    });
  });
  return max;
}

function tieneAlgunaSerieRegistrada(historial) {
  return (historial || []).some(sesion => (sesion.seriesDetalle || []).length > 0);
}

async function evidenciaCalistenia(rama) {
  if (rama === 'rodilla') {
    const [histAvanzado, histIntermedio] = await Promise.all([
      db.getHistorialEjercicio(RODILLA_NOMBRE_AVANZADO),
      db.getHistorialEjercicio(RODILLA_NOMBRE_INTERMEDIO)
    ]);
    if (tieneAlgunaSerieRegistrada(histAvanzado)) {
      return { nivel: 'avanzado', detalle: `Registraste series de ${RODILLA_NOMBRE_AVANZADO}.` };
    }
    const reps = maxRepsEnUnaSerieLimpia(histIntermedio);
    if (reps >= RODILLA_REPS_INTERMEDIO) {
      return { nivel: 'intermedio', detalle: `Registraste ${reps} ${RODILLA_NOMBRE_INTERMEDIO.toLowerCase()} en una sola serie.` };
    }
    return null;
  }

  const umbral = UMBRALES_CALISTENIA[rama];
  if (!umbral) return null;
  const historial = await db.getHistorialEjercicio(umbral.nombre);
  const reps = maxRepsEnUnaSerieLimpia(historial);
  if (reps >= umbral.avanzado) return { nivel: 'avanzado', detalle: `Registraste ${reps} ${umbral.nombre.toLowerCase()} en una sola serie.` };
  if (reps >= umbral.intermedio) return { nivel: 'intermedio', detalle: `Registraste ${reps} ${umbral.nombre.toLowerCase()} en una sola serie.` };
  return null;
}

// Reutiliza exactamente los mismos Estándares de Fuerza que
// calcularNivelPorRama() (misma fuente, no una tabla propia).
function evidenciaGym(rama, prs, pesoKg, sexo) {
  const liftId = LEVANTAMIENTO_POR_RAMA[rama];
  if (!liftId || pesoKg <= 0) return null;
  const pr = prs[getEjercicioPorId(liftId).nombre.toLowerCase().trim()];
  if (!pr || pr.pesoMax <= 0) return null;
  const oneRM = db.estimar1RM(pr.pesoMax, pr.repsMax);
  const ratio = oneRM / pesoKg;
  const nivelInfo = getNivel(liftId, sexo, ratio);
  if (!nivelInfo) return null;
  const nivel = nivelInfo.nivel === 'avanzado' ? 'avanzado' : nivelInfo.nivel === 'intermedio' ? 'intermedio' : null;
  if (!nivel) return null;
  return { nivel, detalle: `Tu ${getEjercicioPorId(liftId).nombre.toLowerCase()} está en ${nivelInfo.label} (${ratio.toFixed(2)}× tu peso corporal).` };
}

// Punto de entrada único: evalúa las 8 ramas y devuelve como mucho UNA
// sugerencia pendiente — la primera en RAMA_ORDEN que supera el nivel
// declarado y no fue descartada a ese mismo nivel o uno mayor — o null si
// no hay ninguna. Se llama al entrar a la vista de Entrenamiento, no en
// cada render: es lectura de IndexedDB, no algo para recalcular en cada
// repintado.
export async function detectarSugerenciaPendiente() {
  const [nivelDeclarado, prs, profile] = await Promise.all([
    db.getNivelEntrenamiento(),
    db.getPRs(),
    db.getProfile()
  ]);
  const pesoKg = Number(profile?.pesoKg) || 0;
  const sexo = profile?.sexo === 'F' ? 'F' : 'M';
  const pisoDeclarado = TIEMPO_A_NIVEL[nivelDeclarado?.tiempoEntrenando] || 'principiante';
  const overrides = nivelDeclarado?.overridesPorRama || {};
  const descartadas = nivelDeclarado?.sugerenciasDescartadas || {};

  for (const rama of RAMA_ORDEN) {
    const calistenia = await evidenciaCalistenia(rama);
    const gym = evidenciaGym(rama, prs, pesoKg, sexo);
    let mejor = null;
    [calistenia, gym].forEach(ev => {
      if (ev && (!mejor || NIVEL_RANGO[ev.nivel] > NIVEL_RANGO[mejor.nivel])) mejor = ev;
    });
    if (!mejor) continue;

    const nivelDeclaradoRama = overrides[rama] || pisoDeclarado;
    const yaDescartada = descartadas[rama] && NIVEL_RANGO[descartadas[rama]] >= NIVEL_RANGO[mejor.nivel];
    if (NIVEL_RANGO[mejor.nivel] > NIVEL_RANGO[nivelDeclaradoRama] && !yaDescartada) {
      return { rama, ramaLabel: RAMA_LABELS[rama], nivelSugerido: mejor.nivel, detalle: mejor.detalle };
    }
  }
  return null;
}
