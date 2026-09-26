// Auto-detección de progreso y sugerencia de avance de nivel
// (PROMPT-NIVEL-FILTRADO.md, paso 4/e). Compara el nivel DECLARADO por el
// usuario para cada rama (lo que confirmó en el onboarding o en una
// sugerencia previa — lo que se muestra como "tu perfil") contra evidencia
// real de que ya dominó el ejercicio con el que está entrenando esa rama,
// medida con el `criterioAvance` del propio catálogo (ver detectarSugerencias).
//
// Esto es DISTINTO de calcularNivelPorRama() en generador-rutinas.js: esa
// función ya combina Estándares de Fuerza en silencio para elegir qué
// ejercicio prescribir dentro del generador, sin pedir confirmación (es una
// decisión de dificultad, no un cambio de identidad). Este módulo, en
// cambio, decide cuándo el "perfil" que el usuario ve y declaró
// (nivelEntrenamiento) debería avanzar — y eso SIEMPRE requiere que el
// usuario lo confirme (ver e: "No subirlo automáticamente. Sugerir.").
import { db } from './db.js';
import { getNivel } from './estandares-fuerza.js';
import { CATALOGO_EJERCICIOS, getEjercicioPorId, getEjercicioMetadata, getIdPorNombreExacto } from './ejercicios-catalogo.js';
import { RAMA_ORDEN, RAMA_LABELS, ARBOL_PROGRESIONES, profundidadNodo, contarSeriesLimpias } from './progresiones.js';
import { diaKeyDe, diasEntre, claveDiaDe } from '../utils/fecha.js';

const NIVEL_RANGO = { principiante: 0, intermedio: 1, avanzado: 2 };
const NIVEL_DESDE_RANGO = ['principiante', 'intermedio', 'avanzado'];

// Rango de los niveles de Estándares de Fuerza (4, no 3): el criterio
// 'ratio' del catálogo pide un nivel de esa escala ("intermedio").
const RANGO_FUERZA = { principiante: 0, novato: 1, intermedio: 2, avanzado: 3 };

// Mismo mapeo tiempo→nivel que TIEMPO_A_NIVEL_PISO en generador-rutinas.js.
// Se repite acá (en vez de importarse) porque ahí es una constante interna
// sin exportar y es dato de catálogo estable, no lógica que pueda
// desincronizarse.
const TIEMPO_A_NIVEL = { 'menos-1': 'principiante', '1-3': 'intermedio', 'mas-3': 'avanzado' };

const VENTANA_DIAS = 28; // últimas 4 semanas, en días de calendario (diasEntre)
const SESIONES_A_MIRAR = 3;
const SESIONES_MINIMAS_QUE_CUMPLEN = 2;
const DIAS_AHORA_NO = 7; // cuánto dura un "Ahora no" antes de poder volver a sugerir

// Id de catálogo de una entrada de ejercicio de sesión: el ejercicioId
// guardado; si es null (ejercicio escrito a mano), por nombre — exacto
// primero y después el mismo fuzzy match que usa el mapa muscular
// (getEjercicioMetadata). Sin match devuelve null.
function idDeEntrada(ej) {
  if (ej.ejercicioId) return ej.ejercicioId;
  const exacto = getIdPorNombreExacto(ej.nombre);
  if (exacto) return exacto;
  return getEjercicioMetadata(ej.nombre).id || null;
}

// Nivel efectivo de un ejercicio del catálogo: 'todos' no clasifica
// dificultad (la carga la define), así que se aproxima con el de su
// predecesor en la cadena de progresión, o 'principiante' si no tiene.
function nivelEfectivo(entry, visitados = new Set()) {
  if (NIVEL_RANGO[entry.nivel] !== undefined) return entry.nivel;
  if (entry.progresionDe && !visitados.has(entry.progresionDe)) {
    visitados.add(entry.progresionDe);
    const previo = getEjercicioPorId(entry.progresionDe);
    if (previo) return nivelEfectivo(previo, visitados);
  }
  return 'principiante';
}

function repsDe(serie) {
  const m = String(serie.reps).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

// Serie válida para el criterio 'ratio': tipo normal (una sesión vieja sin
// `tipo` cuenta como normal) y marcada como hecha. Los criterios de
// reps/segundos NO usan esto: usan la definición de "serie limpia" del árbol
// de progresión (ver evaluarPorSeries).
function serieValida(serie) {
  return (!serie.tipo || serie.tipo === 'normal') && serie.checked === true;
}

// Sesiones (de más reciente a más antigua) donde apareció el ejercicio, con
// sus series. `sesiones` viene ordenado desc por db.getSesiones().
function sesionesDelEjercicio(sesiones, ejercicioId) {
  const salida = [];
  sesiones.forEach(s => {
    const entradas = (s.ejercicios || []).filter(ej => idDeEntrada(ej) === ejercicioId);
    if (entradas.length === 0) return;
    salida.push({ fecha: s.fecha, series: entradas.flatMap(ej => ej.series || []) });
  });
  return salida;
}

// 'reps' / 'segundos' (los segundos se registran en el campo reps): en al
// menos 2 de las últimas 3 sesiones del ejercicio hubo >= `series` series
// limpias con >= `valor`. "Limpia" es EXACTAMENTE la del árbol de
// progresión (contarSeriesLimpias: tipo normal, reps/segundos suficientes y,
// si hay RPE registrado, <= 8) más estar marcada como hecha — así una
// sugerencia nunca se basa en series que el árbol no daría por buenas (que
// dejarían el ejercicio siguiente bloqueado). Devuelve la evidencia o null.
function evaluarPorSeries(entry, sesiones) {
  const { tipo, valor, series } = entry.criterioAvance;
  const objetivo = ARBOL_PROGRESIONES[entry.id]?.objetivo || null;
  const ultimas = sesionesDelEjercicio(sesiones, entry.id).slice(0, SESIONES_A_MIRAR);
  const cumplen = ultimas.filter(s => contarSeriesLimpias(
    [{ seriesDetalle: s.series.filter(sr => sr.checked === true).map(sr => ({ ...sr, reps: repsDe(sr) })) }],
    objetivo
  ));
  if (cumplen.length < SESIONES_MINIMAS_QUE_CUMPLEN) return null;
  const unidad = tipo === 'segundos' ? ' s' : '';
  return `${cumplen.length} de tus últimas ${ultimas.length} sesiones con ${series}×${valor}${unidad} de ${entry.nombre.toLowerCase()}.`;
}

// ¿Sigue vigente el "Ahora no" de esta rama para el nivel sugerido? Vigente
// = se rechazó ese nivel (o uno mayor) hace menos de DIAS_AHORA_NO días. Una
// entrada vieja (texto sin fecha) cuenta como vencida.
function ahoraNoVigente(entrada, nivelSugerido, hoyClave) {
  if (!entrada) return false;
  const nivel = typeof entrada === 'string' ? entrada : entrada.nivel;
  const fecha = typeof entrada === 'string' ? null : entrada.fecha;
  if (!fecha) return false;
  if (NIVEL_RANGO[nivel] < NIVEL_RANGO[nivelSugerido]) return false;
  return diasEntre(fecha, hoyClave) < DIAS_AHORA_NO;
}

// 'ratio': Estándares de Fuerza existentes (mismo cálculo que
// calcularNivelPorRama), pero con el mejor 1RM estimado de las series
// limpias de las últimas 4 semanas, no con el PR histórico: un récord de
// hace un año no dice nada del nivel de hoy. Cumplido si el nivel de fuerza
// calculado >= valor.
function evaluarPorRatio(entry, sesiones, desde, pesoKg, sexo) {
  if (pesoKg <= 0) return null;
  let mejor1RM = 0;
  sesionesDelEjercicio(sesiones, entry.id).forEach(s => {
    const ts = new Date(s.fecha).getTime();
    if (isNaN(ts) || ts < desde) return;
    s.series.filter(serieValida).forEach(sr => {
      const peso = Number(sr.peso) || 0;
      const reps = repsDe(sr);
      if (peso > 0 && reps > 0) mejor1RM = Math.max(mejor1RM, db.estimar1RM(peso, reps));
    });
  });
  if (mejor1RM <= 0) return null;
  const ratio = mejor1RM / pesoKg;
  const nivelInfo = getNivel(entry.id, sexo, ratio);
  if (!nivelInfo) return null;
  if (RANGO_FUERZA[nivelInfo.nivel] < RANGO_FUERZA[entry.criterioAvance.valor]) return null;
  return `Tu ${entry.nombre.toLowerCase()} está en ${nivelInfo.label} (${ratio.toFixed(2)}× tu peso corporal, en las últimas 4 semanas).`;
}

// Siguiente ejercicio de la cadena: algún hijo por progresionDe. Si hay
// varios, el de la misma categoría y con equipo disponible primero.
function elegirSiguiente(actual, equipoDisponible) {
  const hijos = Object.values(CATALOGO_EJERCICIOS).filter(e => e.progresionDe === actual.id);
  if (hijos.length === 0) return null;
  const conEquipo = e => e.equipo === 'ninguno' || equipoDisponible.includes(e.equipo);
  const puntaje = e => (e.categoria === actual.categoria ? 2 : 0) + (conEquipo(e) ? 1 : 0);
  // sort estable: a igual puntaje se mantiene el orden del catálogo
  return [...hijos].sort((a, b) => puntaje(b) - puntaje(a))[0];
}

// Todas las ramas (patronMovimiento) con evidencia de que el usuario ya
// dominó el ejercicio de mayor nivel que entrenó en las últimas 4 semanas,
// según su criterioAvance. Cada elemento:
//   { rama, ramaLabel, nivelActual, nivelSugerido, ejercicioActual,
//     ejercicioSiguiente, evidencia, detalle }
// (`detalle` = `evidencia`, el nombre que ya lee la UI actual.)
//
// Solo propone lo accionable: nivelActual es el nivel DECLARADO de la rama
// (override confirmado o piso por tiempo entrenando), la sugerencia es el
// siguiente, y se descarta si (a) el ejercicio de mayor nivel que entrena
// está por debajo de ese nivel, (b) no tiene un siguiente en la cadena de
// progresión (un accesorio suelto que cumple su criterio no es señal de
// avance), o (c) el usuario dijo "Ahora no" a ese nivel (o a uno mayor)
// hace menos de 7 días. `hoy` solo existe para poder simular la fecha.
export async function detectarSugerencias({ hoy = new Date() } = {}) {
  const [nivelDeclarado, config, profile, sesiones] = await Promise.all([
    db.getNivelEntrenamiento(),
    db.getGeneradorConfig(),
    db.getProfile(),
    db.getSesiones()
  ]);
  const hoyClave = diaKeyDe(hoy);
  const pesoKg = Number(profile?.pesoKg) || 0;
  const sexo = profile?.sexo === 'F' ? 'F' : 'M';
  const equipoDisponible = config?.equipoDisponible || [];
  const pisoDeclarado = TIEMPO_A_NIVEL[nivelDeclarado?.tiempoEntrenando] || 'principiante';
  const overrides = nivelDeclarado?.overridesPorRama || {};
  const descartadas = nivelDeclarado?.sugerenciasDescartadas || {};

  // Ejercicios entrenados en las últimas 4 semanas, con la fecha de la más
  // reciente, agrupados por rama.
  const recientes = new Map(); // ejercicioId -> ts de su sesión más reciente
  sesiones.forEach(s => {
    const ts = new Date(s.fecha).getTime();
    if (isNaN(ts) || diasEntre(claveDiaDe(s.fecha), hoyClave) >= VENTANA_DIAS) return;
    (s.ejercicios || []).forEach(ej => {
      const id = idDeEntrada(ej);
      if (!id || !getEjercicioPorId(id)) return;
      if (!recientes.has(id) || ts > recientes.get(id)) recientes.set(id, ts);
    });
  });

  const sugerencias = [];
  for (const rama of RAMA_ORDEN) {
    const delaRama = [...recientes.entries()]
      .map(([id, ts]) => ({ entry: getEjercicioPorId(id), ts }))
      .filter(x => x.entry.patronMovimiento === rama);
    if (delaRama.length === 0) continue;

    // El de mayor nivel; a igual nivel el más profundo en la cadena de
    // progresión, y después el más reciente.
    delaRama.sort((a, b) =>
      (NIVEL_RANGO[nivelEfectivo(b.entry)] - NIVEL_RANGO[nivelEfectivo(a.entry)]) ||
      (profundidadNodo(b.entry.id) - profundidadNodo(a.entry.id)) ||
      (b.ts - a.ts)
    );
    const actual = delaRama[0].entry;

    const nivelActual = overrides[rama] && NIVEL_RANGO[overrides[rama]] > NIVEL_RANGO[pisoDeclarado] ? overrides[rama] : pisoDeclarado;
    if (NIVEL_RANGO[nivelActual] >= NIVEL_DESDE_RANGO.length - 1) continue; // ya en el tope
    if (NIVEL_RANGO[nivelEfectivo(actual)] < NIVEL_RANGO[nivelActual]) continue;

    const evidencia = actual.criterioAvance.tipo === 'ratio'
      ? evaluarPorRatio(actual, sesiones, desde, pesoKg, sexo)
      : evaluarPorSeries(actual, sesiones);
    if (!evidencia) continue;

    const siguiente = elegirSiguiente(actual, equipoDisponible);
    if (!siguiente) continue;

    const nivelSugerido = NIVEL_DESDE_RANGO[NIVEL_RANGO[nivelActual] + 1];
    if (ahoraNoVigente(descartadas[rama], nivelSugerido, hoyClave)) continue;

    sugerencias.push({
      rama,
      ramaLabel: RAMA_LABELS[rama],
      nivelActual,
      nivelSugerido,
      ejercicioActual: { id: actual.id, nombre: actual.nombre },
      ejercicioSiguiente: { id: siguiente.id, nombre: siguiente.nombre },
      evidencia,
      detalle: evidencia
    });
  }
  return sugerencias;
}

// Compatibilidad con la UI actual (banner de Entreno): devuelve la primera
// sugerencia de detectarSugerencias() o null. Se llama al entrar a la vista
// de Entrenamiento, no en cada render: es lectura de IndexedDB, no algo para
// recalcular en cada repintado.
export async function detectarSugerenciaPendiente() {
  const sugerencias = await detectarSugerencias();
  return sugerencias[0] || null;
}
