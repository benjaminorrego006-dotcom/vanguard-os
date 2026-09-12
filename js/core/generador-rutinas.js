// Generador de rutinas (Etapa 4a). Sustituye la elección manual de una
// plantilla fija por una rutina armada según dónde está el usuario en cada
// patrón de movimiento — pero no reemplaza la creación/edición manual: lo
// que produce es una rutina normal (mismo shape que db.crearRutina), así
// que una vez guardada se edita, se borra o se ignora exactamente igual
// que cualquier otra.
//
// NADA de esto es una caja negra: cada ejercicio elegido lleva su propio
// `motivo` (por qué se eligió, no solo qué se eligió) y cualquier patrón
// que no se pudo cubrir queda en `avisos`, nunca se omite en silencio.
import { db } from './db.js';
import { ARBOL_PROGRESIONES, RAMA_ORDEN, RAMA_LABELS, profundidadNodo, estaDesbloqueado, contarSeriesLimpias } from './progresiones.js';
import { CATALOGO_EJERCICIOS, getEjercicioPorId } from './ejercicios-catalogo.js';
import { getNivel } from './estandares-fuerza.js';

const NIVEL_RANGO = { principiante: 0, intermedio: 1, avanzado: 2 };
const NIVEL_DESDE_RANGO = ['principiante', 'intermedio', 'avanzado'];

// La rama gateada por un levantamiento canónico de gym (Etapa 5): combina
// el nivel derivado del árbol con el nivel de Estándares de Fuerza cuando
// el usuario tiene un PR cargado para ese levantamiento — gana el que sea
// más alto, porque cualquiera de los dos caminos demuestra capacidad real
// en ese patrón de movimiento.
const LEVANTAMIENTO_POR_RAMA = { rodilla: 'sentadilla', cadera: 'peso muerto', 'empuje-horizontal': 'press de banca', 'empuje-vertical': 'press militar' };

// --- Nivel por rama (patrón de movimiento) --------------------------------

// nivel: 'todos' (la carga define la dificultad, no el movimiento) no sirve
// para clasificar "qué tan difícil es esto" — se aproxima con el nivel de
// su propio predecesor en la progresión; si no tiene predecesor útil, se
// asume 'principiante' (no 'intermedio'): sin evidencia real de que el
// usuario ya progresó, "todos" significa "accesible en cualquier nivel
// ajustando la carga", no "asumí que ya es intermedio". Juicio explícito,
// no un dato medido.
function normalizarNivel(nivelCatalogo, progresionDeId, visitados = new Set()) {
  if (nivelCatalogo === 'principiante' || nivelCatalogo === 'intermedio' || nivelCatalogo === 'avanzado') return nivelCatalogo;
  if (progresionDeId && !visitados.has(progresionDeId)) {
    visitados.add(progresionDeId);
    const prev = getEjercicioPorId(progresionDeId);
    if (prev) return normalizarNivel(prev.nivel, prev.progresionDe, visitados);
  }
  return 'principiante';
}

function esDominado(nodoId, historialPorNombre) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  if (!nodo || !nodo.objetivo) return false;
  return contarSeriesLimpias(historialPorNombre[nodo.nombre], nodo.objetivo);
}

// A diferencia de estaDesbloqueado() (progresiones.js), que trata un
// prerrequisito tipo 'ratio' como siempre satisfecho para no bloquear su
// variante GYM — correcto para elegir ejercicios o pintar el árbol — acá
// esa misma permisividad sería un bug: un nodo cuyo único prerrequisito es
// un levantamiento de ratio sin evidencia real (sentadilla, press de banca,
// peso muerto, press militar) NO demuestra progreso medido por "series
// limpias", así que no puede contar como frontera para derivar el nivel de
// un principiante. La fuerza real en esos levantamientos se suma aparte,
// vía Estándares de Fuerza, más abajo en calcularNivelPorRama().
function desbloqueadoParaFrontera(nodoId, historialPorNombre) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  if (!nodo) return false;
  return nodo.requiere.every(reqId => {
    const req = ARBOL_PROGRESIONES[reqId];
    if (!req) return true;
    if (!req.objetivo) return false;
    return contarSeriesLimpias(historialPorNombre[req.nombre], req.objetivo);
  });
}

function tieneIntentos(nodoId, historialPorNombre) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  return !!nodo && (historialPorNombre[nodo.nombre] || []).length > 0;
}

// El "nodo frontera" de una rama: lo próximo que le toca al usuario. Si no
// hay ninguno desbloqueado-y-no-dominado (dominó todo lo que el árbol
// conoce en esa rama), la rama queda al tope: 'avanzado' directo, sin
// depender del campo `nivel` del nodo más profundo (que puede no ser
// informativo, ej. 'todos').
//
// Entre los candidatos, prioriza el que el usuario YA INTENTÓ (tiene
// historial real) sobre uno que nunca tocó, aunque este último esté más
// profundo en la cadena. Sin esto, un prerrequisito cruzado de OTRA rama
// (ej. "Dead Hang" en Tracción Vertical se desbloquea con "Remo Invertido",
// que vive en Tracción Horizontal) podía ganarle a un nodo que el usuario
// sí viene intentando, solo por quedar más profundo en el árbol — el
// resultado era "tu próximo paso es Dead Hang" para alguien que nunca hizo
// una sola dominada, mientras el ejercicio que de verdad probó y abandonó
// (Jalón al Pecho) quedaba invisible. Recién en empate de "intentado"
// desempata la profundidad, y por último el nivel más bajo (el más
// conservador cuando tampoco hay forma de distinguir cuál intentó primero).
function fronteraDeRama(rama, historialPorNombre) {
  const idsRama = Object.keys(ARBOL_PROGRESIONES).filter(id => ARBOL_PROGRESIONES[id].rama === rama);
  if (idsRama.length === 0) return null;

  // Los nodos tipo 'ratio' (objetivo === null) nunca cuentan como frontera:
  // como esDominado() los descarta siempre (no hay "series limpias" que
  // contar), un levantamiento que el usuario SÍ entrena cada semana
  // (ej. Press de Banca) quedaría eternamente "intentado y no dominado" y,
  // con la prioridad de intentados de arriba, le ganaría para siempre a
  // cualquier progresión real de la rama. Esos levantamientos ya se miden
  // aparte, vía Estándares de Fuerza, más abajo en calcularNivelPorRama().
  const candidatos = idsRama.filter(id =>
    ARBOL_PROGRESIONES[id].objetivo &&
    desbloqueadoParaFrontera(id, historialPorNombre) &&
    !esDominado(id, historialPorNombre)
  );
  if (candidatos.length === 0) {
    // Sin candidatos no siempre significa "dominaste todo lo que esta rama
    // tiene para ofrecer" — puede ser que lo que sigue esté BLOQUEADO por un
    // prerrequisito de OTRA rama (ej. Empuje Vertical: una vez dominado Pike
    // Push-up, Handstand contra Pared sigue sin poder tocarse porque
    // requiere Crow Pose, que vive en Core). Declarar "avanzado" ahí
    // sobreclama: el usuario no dominó la rama, solo agotó lo poco que
    // podía alcanzar sin entrenar otro patrón primero. Solo es "maxeada" de
    // verdad cuando NO queda ningún nodo real (con objetivo) sin dominar en
    // toda la rama, ni siquiera uno bloqueado.
    const idsConObjetivo = idsRama.filter(id => ARBOL_PROGRESIONES[id].objetivo);
    const quedaAlgoSinDominar = idsConObjetivo.some(id => !esDominado(id, historialPorNombre));
    if (!quedaAlgoSinDominar) return { nodoId: null, nivel: 'avanzado', maxeada: true, bloqueo: null };

    const dominado = nodoDominadoMasProfundo(rama, historialPorNombre);
    const bloqueo = nodoBloqueadoMasCercano(rama, historialPorNombre);
    return { nodoId: null, nivel: dominado ? dominado.nivel : 'principiante', maxeada: false, bloqueo };
  }

  const conNivel = candidatos.map(id => {
    const entry = getEjercicioPorId(id);
    return {
      id,
      intentado: tieneIntentos(id, historialPorNombre),
      profundidad: profundidadNodo(id),
      nivel: normalizarNivel(entry.nivel, entry.progresionDe)
    };
  });
  conNivel.sort((a, b) =>
    (b.intentado - a.intentado) ||
    (b.profundidad - a.profundidad) ||
    (NIVEL_RANGO[a.nivel] - NIVEL_RANGO[b.nivel]) ||
    a.id.localeCompare(b.id)
  );

  return { nodoId: conNivel[0].id, nivel: conNivel[0].nivel, maxeada: false, bloqueo: null };
}

// El nodo bloqueado más cercano (menos profundo) de una rama: el primer
// "siguiente paso real" que existe en el árbol pero que un prerrequisito de
// OTRA rama todavía no deja tocar. Identifica también cuál es ese
// prerrequisito faltante, para poder decirle al usuario adónde ir a
// destrabarlo en vez de solo declarar la rama "avanzada" sin más.
function nodoBloqueadoMasCercano(rama, historialPorNombre) {
  const idsRama = Object.keys(ARBOL_PROGRESIONES).filter(id => ARBOL_PROGRESIONES[id].rama === rama && ARBOL_PROGRESIONES[id].objetivo);
  const bloqueados = idsRama.filter(id => !desbloqueadoParaFrontera(id, historialPorNombre) && !esDominado(id, historialPorNombre));
  if (bloqueados.length === 0) return null;

  bloqueados.sort((a, b) => profundidadNodo(a) - profundidadNodo(b) || a.localeCompare(b));
  const nodo = ARBOL_PROGRESIONES[bloqueados[0]];
  const faltanteId = nodo.requiere.find(reqId => {
    const req = ARBOL_PROGRESIONES[reqId];
    return !req || !req.objetivo || !contarSeriesLimpias(historialPorNombre[req.nombre], req.objetivo);
  });
  const faltante = faltanteId ? ARBOL_PROGRESIONES[faltanteId] : null;
  return {
    nombre: nodo.nombre,
    faltanteNombre: faltante ? faltante.nombre : null,
    faltanteRama: faltante ? faltante.rama : null
  };
}

// El nodo dominado más profundo de una rama, o null si no hay ninguno.
// Sirve para detectar el caso "dominaste algo real, pero la frontera
// reportada es una raíz independiente que nunca tocaste" (ej. graduaste
// Remo Invertido y Remo en Máquina, otra raíz de la misma rama sin
// relación con esa, queda como "próximo paso" sin más contexto) — ver uso
// en calcularNivelPorRama().
function nodoDominadoMasProfundo(rama, historialPorNombre) {
  const idsRama = Object.keys(ARBOL_PROGRESIONES).filter(id => ARBOL_PROGRESIONES[id].rama === rama);
  const dominados = idsRama.filter(id => esDominado(id, historialPorNombre));
  if (dominados.length === 0) return null;
  dominados.sort((a, b) => profundidadNodo(b) - profundidadNodo(a));
  const entry = getEjercicioPorId(dominados[0]);
  if (!entry) return null;
  return { nombre: entry.nombre, nivel: normalizarNivel(entry.nivel, entry.progresionDe) };
}

// Fecha más reciente en la que el usuario entrenó CUALQUIER nodo de una
// rama, o null si nunca. Usada para bajar la exigencia si hace más de un
// mes que no se toca ese patrón — regla explícita de la Etapa 4a: "no
// ignorar lo que no se entrena hace un mes".
function ultimaFechaEnRama(rama, historialPorNombre) {
  let ultima = null;
  Object.values(ARBOL_PROGRESIONES).forEach(nodo => {
    if (nodo.rama !== rama) return;
    (historialPorNombre[nodo.nombre] || []).forEach(h => {
      const f = new Date(h.fecha);
      if (!ultima || f > ultima) ultima = f;
    });
  });
  return ultima;
}

// Barrido de historial sobre TODO el catálogo (no solo los 77 nodos del
// árbol) — el generador puede elegir cualquier entrada del catálogo, no
// solo las que participan de una cadena de prerrequisitos, así que necesita
// saber cuándo se entrenó por última vez cualquiera de ellas para la regla
// de "no repetir lo entrenado hace poco".
export async function barrerHistorialCompleto() {
  const nombres = [...new Set(Object.values(CATALOGO_EJERCICIOS).map(e => e.nombre))];
  const historiales = await Promise.all(nombres.map(nombre => db.getHistorialEjercicio(nombre)));
  return Object.fromEntries(nombres.map((nombre, i) => [nombre, historiales[i]]));
}

// Piso de nivel por tiempo autodeclarado (PROMPT-NIVEL-FILTRADO.md, paso
// 3): "el nivel declarado por tiempo no es suficiente" para alguien que YA
// demuestra más con su historial real, pero SÍ sirve de piso razonable
// para una rama que el usuario todavía no tocó en la app — alguien que
// declara 3 años entrenando no debería arrancar viendo Flexiones en Pared
// como cualquier principiante en un patrón que simplemente no registró
// todavía. Se aplica solo cuando no hay ningún historial real en esa rama
// (diasSinEntrenar === null, ver más abajo); en cuanto hay una sola sesión
// real, el dato real manda y este piso deja de aplicarse.
const TIEMPO_A_NIVEL_PISO = { 'menos-1': 'principiante', '1-3': 'intermedio', 'mas-3': 'avanzado' };

// Nivel por cada una de las 8 ramas, ya combinado con Estándares de Fuerza
// donde aplica y ajustado por inactividad prolongada.
export async function calcularNivelPorRama(historialPorNombre) {
  const [prs, profile, nivelDeclarado] = await Promise.all([db.getPRs(), db.getProfile(), db.getNivelEntrenamiento()]);
  const pesoKg = Number(profile?.pesoKg) || 0;
  const sexo = profile?.sexo === 'F' ? 'F' : 'M';
  const nivelPiso = TIEMPO_A_NIVEL_PISO[nivelDeclarado?.tiempoEntrenando] || null;

  const resultado = {};
  RAMA_ORDEN.forEach(rama => {
    const frontera = fronteraDeRama(rama, historialPorNombre);
    let nivel = frontera ? frontera.nivel : 'principiante';
    // origen + frontierNombre quedan SEPARADOS del texto armado (fuente):
    // motivoPara() necesita comparar frontierNombre contra el ejercicio que
    // realmente se eligió para decidir si tiene sentido decir "es tu
    // próximo paso" — normalmente NO es el mismo, porque casi siempre hay
    // más de un candidato válido al mismo nivel dentro de una modalidad.
    let origen = !frontera ? 'sin-datos'
      : frontera.maxeada ? 'arbol-maxeada'
      : frontera.nodoId === null ? 'arbol-bloqueada'
      : 'arbol';
    let frontierNombre = (origen === 'arbol') ? (getEjercicioPorId(frontera.nodoId)?.nombre || null) : null;
    let fuente = origen === 'sin-datos' ? 'sin datos'
      : origen === 'arbol-maxeada' ? 'árbol de progresión (al tope)'
      : origen === 'arbol-bloqueada'
        ? (frontera.bloqueo
          ? `árbol de progresión (siguiente paso bloqueado: ${frontera.bloqueo.nombre}, requiere ${frontera.bloqueo.faltanteNombre} de ${RAMA_LABELS[frontera.bloqueo.faltanteRama]})`
          : 'árbol de progresión (siguiente paso bloqueado)')
      : `árbol de progresión · próximo paso: ${frontierNombre}`;

    // Caso "logro huérfano": la frontera reportada es una raíz (no depende
    // de nada) mientras el usuario ya domina otro nodo real de la MISMA
    // rama — normalmente porque esa rama tiene más de una raíz
    // independiente (ej. Tracción Horizontal: Remo Invertido y Remo en
    // Máquina no se conectan entre sí). El nivel no sube — el catálogo
    // clasifica ambos como el mismo nivel de entrada, no hay con qué
    // justificar subirlo — pero el motivo debe reconocer el trabajo real
    // en vez de ignorarlo silenciosamente, para no sonar a "no progresaste
    // nada" cuando sí progresaste, solo que por un camino que no siguió.
    let notaDominado = null;
    if (origen === 'arbol' && ARBOL_PROGRESIONES[frontera.nodoId].requiere.length === 0) {
      notaDominado = nodoDominadoMasProfundo(rama, historialPorNombre)?.nombre || null;
    }
    let bloqueo = origen === 'arbol-bloqueada' ? frontera.bloqueo : null;

    const liftId = LEVANTAMIENTO_POR_RAMA[rama];
    if (liftId && pesoKg > 0) {
      const pr = prs[getEjercicioPorId(liftId).nombre.toLowerCase().trim()];
      if (pr && pr.pesoMax > 0) {
        const oneRM = db.estimar1RM(pr.pesoMax, pr.repsMax);
        const ratio = oneRM / pesoKg;
        const nivelInfo = getNivel(liftId, sexo, ratio);
        const nivelRatio = nivelInfo.nivel === 'avanzado' ? 'avanzado' : nivelInfo.nivel === 'intermedio' ? 'intermedio' : 'principiante';
        if (NIVEL_RANGO[nivelRatio] > NIVEL_RANGO[nivel]) {
          nivel = nivelRatio;
          origen = 'estandares';
          frontierNombre = null;
          notaDominado = null;
          bloqueo = null;
          fuente = `Estándares de Fuerza (${nivelInfo.label})`;
        }
      }
    }

    // Override confirmado (paso 4: el usuario aceptó una sugerencia de
    // avance para ESTA rama) — a diferencia del piso por tiempo declarado
    // de abajo, esto es evidencia real que la propia app detectó y el
    // usuario confirmó, así que se aplica siempre, no solo cuando falta
    // historial.
    const nivelOverride = nivelDeclarado?.overridesPorRama?.[rama] || null;
    if (nivelOverride && NIVEL_RANGO[nivelOverride] > NIVEL_RANGO[nivel]) {
      nivel = nivelOverride;
      origen = 'confirmado';
      frontierNombre = null;
      notaDominado = null;
      bloqueo = null;
      fuente = 'nivel confirmado por ti a partir de una sugerencia de avance';
    }

    const ultima = ultimaFechaEnRama(rama, historialPorNombre);
    const diasSinEntrenar = ultima ? Math.round((Date.now() - ultima.getTime()) / 86400000) : null;

    if (diasSinEntrenar === null && nivelPiso && NIVEL_RANGO[nivelPiso] > NIVEL_RANGO[nivel]) {
      nivel = nivelPiso;
      origen = 'declarado';
      frontierNombre = null;
      notaDominado = null;
      bloqueo = null;
      fuente = `nivel declarado (todavía sin historial en este patrón)`;
    }

    let bajadoPorInactividad = false;
    if (diasSinEntrenar != null && diasSinEntrenar > 30 && NIVEL_RANGO[nivel] > 0) {
      nivel = NIVEL_DESDE_RANGO[NIVEL_RANGO[nivel] - 1];
      bajadoPorInactividad = true;
    }

    resultado[rama] = { nivel, origen, frontierNombre, notaDominado, bloqueo, fuente, bajadoPorInactividad, diasSinEntrenar };
  });

  return resultado;
}

// --- Split según días por semana ------------------------------------------
// Reemplazo completo según spec-generador-rutinas.md, Paso 1: Full Body
// queda excluido del generador para siempre, sin importar nivel, categoría
// ni cantidad de días — el peso corporal cubre Upper/Lower igual que las
// pesas (ver candidatosPara: un ejercicio con equipo:'ninguno' siempre
// entra en el pool, así que "sin equipo" nunca fue una razón real para
// aislar todo en una sola sesión).

const EMPUJE = ['empuje-horizontal', 'empuje-vertical'];
const TRACCION = ['traccion-horizontal', 'traccion-vertical'];
const PIERNA = ['rodilla', 'cadera'];
const UPPER = [...EMPUJE, ...TRACCION];
const LOWER = [...PIERNA, 'core'];
const PATRONES_FUERZA = [...EMPUJE, ...TRACCION, ...PIERNA, 'core'];

// Push (pecho/tríceps) - Pull (espalda/bíceps) - Legs (pierna). Rota en
// round-robin y numera la vuelta (Push 2, Pull 2...) una vez que el split
// necesita más de 3 días (6 días = PPL x2).
const SPLIT_PPL = [
  { nombre: 'Push', patrones: EMPUJE },
  { nombre: 'Pull', patrones: TRACCION },
  { nombre: 'Legs', patrones: LOWER }
];

function elegirSplitPPL(diasSemana) {
  return Array.from({ length: diasSemana }, (_, i) => {
    const d = SPLIT_PPL[i % 3];
    const vuelta = Math.floor(i / 3) + 1;
    return { nombre: vuelta > 1 ? `${d.nombre} ${vuelta}` : d.nombre, patrones: d.patrones };
  });
}

// Caso especial de 1 día/semana (Paso 1): una sola sesión no puede cubrir
// bien todo el cuerpo, así que el generador rota el énfasis semana a
// semana en vez de intentarlo todo junto. Lee cuál fue el énfasis de la
// última rutina generada para esta categoría (por nombre) y alterna —
// nunca el mismo dos semanas seguidas. Sin historial previo, arranca en
// Upper (decisión arbitraria pero estable: no afecta la alternancia futura).
async function elegirEnfasisRotacion(categoria) {
  const rutinas = await db.getRutinas(categoria);
  const ultima = rutinas[rutinas.length - 1];
  if (!ultima) return 'Upper';
  return /^lower/i.test(ultima.nombre || '') ? 'Upper' : 'Lower';
}

// dias 1-7 según la tabla de spec-generador-rutinas.md, Paso 1. El nivel del
// usuario no cambia la estructura del split (mismo split para principiante,
// intermedio o avanzado), solo qué ejercicios entran en cada bloque —eso
// pasa en candidatosPara. GYM y calistenia comparten esta tabla; HIIT sigue
// su propio split de circuito (ver elegirSplitHiit más abajo), que la spec
// no cubre.
async function elegirSplit(diasSemana, categoria) {
  if (diasSemana === 1) {
    const enfasis = await elegirEnfasisRotacion(categoria);
    return [{ nombre: enfasis, patrones: enfasis === 'Upper' ? UPPER : LOWER }];
  }
  if (diasSemana === 2) return [{ nombre: 'Upper', patrones: UPPER }, { nombre: 'Lower', patrones: LOWER }];
  if (diasSemana === 3) return elegirSplitPPL(3);
  if (diasSemana === 4) {
    return [
      { nombre: 'Upper A', patrones: UPPER },
      { nombre: 'Lower A', patrones: LOWER },
      { nombre: 'Upper B', patrones: [...TRACCION, ...EMPUJE] },
      { nombre: 'Lower B', patrones: ['core', ...PIERNA] }
    ];
  }
  if (diasSemana === 5) return [...elegirSplitPPL(3), { nombre: 'Upper', patrones: UPPER }, { nombre: 'Lower', patrones: LOWER }];
  // 6 y 7 días: PPL x2 (6 sesiones duras). El día 7 se arma aparte en
  // generarPlan() a partir de las series ya acumuladas en la semana (Paso 7).
  return elegirSplitPPL(6);
}

// --- Selección de ejercicios -----------------------------------------------

// Si termina sin candidatos, distingue POR QUÉ (regla dura: "no generar en
// silencio") en vez de un aviso genérico: puede ser que no haya ningún
// ejercicio de esta modalidad/nivel con el equipo declarado, o puede ser
// que sí exista pero esté bloqueado por prerrequisitos sin cumplir todavía
// (ej. Tracción Vertical en calistenia sin ningún historial: Dead Hang
// requiere Remo Invertido antes, no es un problema de equipo). Son avisos
// distintos y accionables de forma distinta.
// Orden de niveles a probar, más cercano al nivel real primero, pero SIN
// quedarse corto: antes esto solo bajaba (avanzado->intermedio->
// principiante), así que un principiante con la rama en 'traccion-vertical'
// nunca llegaba a ver Dominadas (nivel intermedio, solo pide una barra) si
// el único ejercicio principiante del patrón (Jalón al Pecho) pedía una
// máquina que no declaró — "no hay ejercicios con el equipo que declaraste"
// aun cuando SÍ había uno, un nivel más arriba. Bug real, no solo de
// Tracción Vertical: cualquier patrón donde el ejercicio del nivel de
// arranque pida un equipo distinto al del siguiente nivel puede pisarlo.
const ORDEN_NIVELES = ['principiante', 'intermedio', 'avanzado'];
function nivelesAIntentarPara(nivelRama) {
  const idx = ORDEN_NIVELES.indexOf(nivelRama);
  if (idx === -1) return ['principiante'];
  const resto = ORDEN_NIVELES.filter((_, i) => i !== idx)
    .sort((a, b) => Math.abs(ORDEN_NIVELES.indexOf(a) - idx) - Math.abs(ORDEN_NIVELES.indexOf(b) - idx));
  return [nivelRama, ...resto];
}

// preferirTipo: 'compuesto' | 'aislamiento' | null — a diferencia del viejo
// booleano priorizarCompuestos (todo o nada para el día completo), esto se
// llama una vez por slot para poder repartir el ratio multiarticular/
// aislación de la Sección 5 dentro del mismo día. Nota sobre equipo: un
// ejercicio con equipo:'ninguno' (peso corporal) ya entra siempre en el
// pool sin importar qué declaró el usuario — la "degradación de equipo" del
// Paso 3 de la spec ya está cubierta por esto, no hace falta un paso
// aparte; lo único que de verdad hay que degradar acá es el nivel.
function candidatosPara(patron, categoria, nivelRama, equipoDisponible, historialPorNombre, preferirTipo) {
  const nivelesAIntentar = nivelesAIntentarPara(nivelRama);

  let sinEquipoNiPrereq = [];
  for (const nivelIntento of nivelesAIntentar) {
    const baseFiltro = e =>
      e.patronMovimiento === patron &&
      (e.categoria === categoria || (e.tambienEn || []).includes(categoria)) &&
      (e.equipo === 'ninguno' || equipoDisponible.includes(e.equipo)) &&
      (e.nivel === 'todos' || e.nivel === nivelIntento);

    const pool = Object.values(CATALOGO_EJERCICIOS).filter(e =>
      baseFiltro(e) && ((e.prerequisitos || []).length === 0 || estaDesbloqueado(e.id, historialPorNombre))
    );
    if (pool.length > 0) {
      // "Prioriza", no "elimina": si en este patrón/nivel solo hay del
      // otro tipo, se usa igual antes que dejar el patrón sin cubrir.
      const preferidos = preferirTipo ? pool.filter(e => e.tipoMovimiento === preferirTipo) : [];
      const poolFinal = preferidos.length > 0 ? preferidos : pool;
      return { pool: poolFinal, relajado: nivelIntento !== nivelRama, nivelUsado: nivelIntento, razon: null };
    }

    if (sinEquipoNiPrereq.length === 0) sinEquipoNiPrereq = Object.values(CATALOGO_EJERCICIOS).filter(baseFiltro);
  }
  return { pool: [], relajado: false, nivelUsado: null, razon: sinEquipoNiPrereq.length > 0 ? 'bloqueado-prerrequisitos' : 'sin-equipo' };
}

// Entre los candidatos válidos (Paso 5 de la spec): 1) preferir el próximo
// paso de progresión pendiente de sugerir (frontierNombre, ya calculado por
// calcularNivelPorRama), 2) preferir el que hace más días que no se entrena,
// 3) no repetir el mismo ejercicio dentro del mismo plan semanal. Desempate
// final: aleatorio entre los que queden empatados en todo lo anterior — a
// propósito NO es determinístico por id: con "nunca entrenado" (diasDesde
// Infinity) siendo el caso más común, un desempate fijo por id siempre
// elegía el mismo ejercicio del catálogo primero, el sesgo por orden de
// inserción que la spec pide evitar explícitamente (casos borde).
function elegirDeCandidatos(pool, historialPorNombre, usadosEstaSemana, frontierNombre) {
  const conPrioridad = pool.map(e => {
    const hist = historialPorNombre[e.nombre] || [];
    const ultima = hist.length ? new Date(hist[hist.length - 1].fecha) : null;
    const diasDesde = ultima ? (Date.now() - ultima.getTime()) / 86400000 : Infinity;
    return { e, diasDesde, yaUsado: usadosEstaSemana.has(e.id), esProgresionPendiente: e.nombre === frontierNombre };
  });
  conPrioridad.sort((a, b) => {
    if (a.yaUsado !== b.yaUsado) return a.yaUsado ? 1 : -1;
    if (a.esProgresionPendiente !== b.esProgresionPendiente) return a.esProgresionPendiente ? -1 : 1;
    return b.diasDesde - a.diasDesde;
  });
  const mejor = conPrioridad[0];
  const empatados = conPrioridad.filter(c =>
    c.yaUsado === mejor.yaUsado && c.esProgresionPendiente === mejor.esProgresionPendiente && c.diasDesde === mejor.diasDesde
  );
  return empatados[Math.floor(Math.random() * empatados.length)].e;
}

function seriesDesdeObjetivo(entry) {
  const c = entry.criterioAvance;
  if (!c || c.tipo === 'ratio') {
    return Array.from({ length: 3 }, () => ({ tipo: 'normal', reps: '6-8', peso: 0 }));
  }
  const reps = c.tipo === 'segundos' ? `${c.valor}s` : String(c.valor);
  return Array.from({ length: c.series || 3 }, () => ({ tipo: 'normal', reps, peso: 0 }));
}

// nombreElegido: el ejercicio que efectivamente se va a prescribir. Casi
// siempre hay más de un candidato válido al mismo nivel dentro de una
// modalidad, así que NO se puede asumir que sea el nodo frontera del árbol
// (el que calcularNivelPorRama usó para fijar el nivel) — decirle al
// usuario "próximo paso: X" cuando en realidad le estamos prescribiendo Y
// es la caja negra que la Etapa 4a pidió evitar. Solo se nombra el nodo
// frontera cuando de verdad es el mismo ejercicio elegido.
function motivoPara(patron, nivelInfo, relajado, nivelUsado, nombreElegido) {
  const ramaLabel = RAMA_LABELS[patron];
  if (relajado) {
    return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel}, pero no hay opciones a ese nivel con el equipo que declaraste — un paso ${nivelUsado} en su lugar.`;
  }
  if (nivelInfo.bajadoPorInactividad) {
    return `Hace ${nivelInfo.diasSinEntrenar} días que no entrenas ${ramaLabel} — bajamos la exigencia un escalón para retomar con cuidado.`;
  }
  const notaDominado = nivelInfo.notaDominado
    ? ` Ya dominaste ${nivelInfo.notaDominado} — no desbloqueó nada más en este patrón porque son caminos independientes dentro de la misma rama.`
    : '';
  if (nivelInfo.origen === 'arbol' && nivelInfo.frontierNombre === nombreElegido) {
    return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel} — es tu próximo paso pendiente en el árbol de progresión.${notaDominado}`;
  }
  if (nivelInfo.origen === 'arbol' && nivelInfo.frontierNombre) {
    return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel} — este ejercicio está a tu nivel (tu próximo paso pendiente en el árbol es ${nivelInfo.frontierNombre}).${notaDominado}`;
  }
  if (nivelInfo.origen === 'arbol-maxeada') {
    return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel} — llegaste al techo de lo que cubre el árbol de progresión en este patrón.`;
  }
  if (nivelInfo.origen === 'arbol-bloqueada') {
    const detalle = nivelInfo.bloqueo
      ? ` El siguiente paso (${nivelInfo.bloqueo.nombre}) todavía requiere ${nivelInfo.bloqueo.faltanteNombre} de ${RAMA_LABELS[nivelInfo.bloqueo.faltanteRama]}.`
      : '';
    return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel} — no es que hayas llegado al techo, es que lo que sigue en el árbol está bloqueado por otro patrón.${detalle}`;
  }
  if (nivelInfo.origen === 'estandares') {
    return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel} (${nivelInfo.fuente}).`;
  }
  if (nivelInfo.origen === 'declarado') {
    return `Todavía no registraste nada en ${ramaLabel} — usamos el nivel que declaraste al empezar. En cuanto entrenes este patrón, tu historial real va a mandar.`;
  }
  if (nivelInfo.origen === 'confirmado') {
    return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel} — confirmaste una sugerencia de avance basada en tu progreso real.`;
  }
  return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel}.`;
}

// Recorre `patrones` en ronda (round robin) tomando UN ejercicio nuevo por
// vuelta de cada patrón todavía no agotado. A diferencia de la versión
// anterior (todo o nada por día), ahora se llama en dos fases cuando hay
// ratio multiarticular/aislación (Paso 4 de la spec): la fase 1 llena hasta
// el cupo de multiarticular, la fase 2 completa el resto priorizando
// aislación. `agotados` se reinicia entre fases porque un patrón puede
// quedarse sin candidatos MULTIARTICULARES (agotado para la fase 1) y
// todavía tener aislación disponible para la fase 2 — si no se reiniciara,
// candidatosPara() nunca lo volvería a intentar.
// ratioMultiarticular === null → una sola fase sin preferencia de tipo
// (HIIT, y el día 7 dirigido a un único patrón rezagado).
function elegirEjerciciosDelDia(patrones, presupuesto, categoria, nivelPorRama, equipoDisponible, historialPorNombre, usadosEstaSemana, registrarAviso, ratioMultiarticular) {
  const elegidosHoy = [];
  const agotados = new Set();

  function fase(preferirTipo, tope) {
    agotados.clear();
    let i = 0;
    let vueltasSinExito = 0;
    while (elegidosHoy.length < tope && agotados.size < patrones.length && vueltasSinExito < patrones.length) {
      const patron = patrones[i % patrones.length];
      i++;
      if (agotados.has(patron)) continue;

      const nivelInfo = nivelPorRama[patron];
      const { pool, relajado, nivelUsado, razon } = candidatosPara(patron, categoria, nivelInfo.nivel, equipoDisponible, historialPorNombre, preferirTipo);
      if (pool.length === 0) {
        registrarAviso(patron, razon);
        agotados.add(patron);
        vueltasSinExito++;
        continue;
      }

      const noUsadosHoy = pool.filter(e => !elegidosHoy.some(x => x.ejercicioId === e.id));
      if (noUsadosHoy.length === 0) {
        agotados.add(patron);
        vueltasSinExito++;
        continue;
      }

      const elegido = elegirDeCandidatos(noUsadosHoy, historialPorNombre, usadosEstaSemana, nivelInfo.frontierNombre);
      usadosEstaSemana.add(elegido.id);
      elegidosHoy.push({
        ejercicioId: elegido.id,
        nombre: elegido.nombre,
        series: categoria === 'hiit' ? null : seriesDesdeObjetivo(elegido),
        motivo: motivoPara(patron, nivelInfo, relajado, nivelUsado, elegido.nombre)
      });
      vueltasSinExito = 0;
    }
  }

  if (ratioMultiarticular == null) {
    fase(null, presupuesto);
  } else {
    fase('compuesto', Math.round(presupuesto * ratioMultiarticular));
    fase('aislamiento', presupuesto);
  }

  return elegidosHoy;
}

// Sección 5 de la spec: cuántos slots del presupuesto del día se llenan con
// multiarticular antes de pasar a aislación. Menos días → más compuesto
// (cada sesión debe maximizar retorno por ejercicio); más días → la
// frecuencia por patrón ya está cubierta, hay margen para aislación
// dirigida.
function ratioMultiarticularPara(diasSemana) {
  if (diasSemana <= 2) return 0.8;
  if (diasSemana <= 4) return 0.65;
  if (diasSemana <= 6) return 0.55;
  return 0.5;
}

// Series acumuladas por patrón a lo largo de los días ya armados —se
// recalcula a partir de ejercicioId en vez de llevar un contador aparte
// durante la generación, porque tanto el día 7 (Paso 7) como el chequeo de
// volumen semanal (Paso 6) lo necesitan una vez que la semana ya está
// armada, no durante.
function sumarSeriesPorPatron(dias) {
  const acumulado = {};
  PATRONES_FUERZA.forEach(p => { acumulado[p] = 0; });
  dias.forEach(dia => {
    (dia.ejercicios || []).forEach(ej => {
      const entry = getEjercicioPorId(ej.ejercicioId);
      if (!entry) return;
      acumulado[entry.patronMovimiento] = (acumulado[entry.patronMovimiento] || 0) + (ej.series || []).length;
    });
  });
  return acumulado;
}

// Series ya acumuladas en la semana a partir de las cuales un patrón se
// considera "bien cubierto" y el día 7 pasa a ser movilidad en vez de
// apuntar a un patrón puntual (Paso 7: "o se marca como movilidad/cardio
// ligero si todos los patrones ya están bien cubiertos"). No hay un número
// exacto en la spec; 6 series es un piso conservador dentro del rango de
// 10-20/semana que ya usa chequearVolumenSemanal.
const UMBRAL_DIA7_LIGERO = 6;

// Día 7 (solo cuando diasSemana === 7): nunca es una sesión dura más — toma
// el patrón con menos series acumuladas en la semana y arma una sesión
// corta y liviana (2 series por ejercicio, tope de 3 ejercicios), o queda
// como movilidad si ya no hace falta apuntar a nada en particular.
function diaLigero(diasPrevios, categoria, nivelPorRama, equipoDisponible, historialPorNombre, usadosEstaSemana, registrarAviso) {
  const acumulado = sumarSeriesPorPatron(diasPrevios);
  const [patronRezagado, total] = Object.entries(acumulado).sort((a, b) => a[1] - b[1])[0];

  if (total >= UMBRAL_DIA7_LIGERO) {
    return { nombre: 'Día 7 · Movilidad', ejercicios: [] };
  }

  const elegidos = elegirEjerciciosDelDia([patronRezagado], 3, categoria, nivelPorRama, equipoDisponible, historialPorNombre, usadosEstaSemana, registrarAviso, null);
  if (elegidos.length === 0) {
    // El patrón más rezagado no tiene NADA disponible esta semana (ya
    // quedó su propio aviso de "no se pudo incluir" al armar los otros
    // días) — no tiene sentido nombrar un día liviano vacío.
    return { nombre: 'Día 7 · Movilidad', ejercicios: [] };
  }
  elegidos.forEach(e => { if (e.series) e.series = e.series.slice(0, 2); });
  return { nombre: `Día 7 · ${RAMA_LABELS[patronRezagado]} (liviano)`, ejercicios: elegidos };
}

// Paso 6: avisa (no bloquea) cuando un patrón queda muy por fuera del rango
// de 10-20 series duras/semana. Patrones en 0 ya tienen su propio aviso de
// "no se pudo incluir" (registrarAviso), así que no se duplican acá.
function chequearVolumenSemanal(dias, avisos) {
  const acumulado = sumarSeriesPorPatron(dias);
  Object.entries(acumulado).forEach(([patron, total]) => {
    if (total === 0) return;
    if (total < 8) avisos.push(`${RAMA_LABELS[patron]} queda con pocas series esta semana (${total}) — el rango recomendado es 10-20 series/semana.`);
    else if (total > 22) avisos.push(`${RAMA_LABELS[patron]} acumula ${total} series esta semana — por arriba del rango recomendado de 10-20.`);
  });
}

// --- Generación de HIIT (circuito, no series/reps) --------------------------

const PATRONES_HIIT = ['locomocion', 'core', ...PIERNA, ...EMPUJE, ...TRACCION];

function elegirSplitHiit(diasSemana) {
  return Array.from({ length: diasSemana }, (_, i) => ({ nombre: diasSemana === 1 ? 'Circuito' : `Circuito ${i + 1}`, patrones: PATRONES_HIIT }));
}

// --- Punto de entrada --------------------------------------------------

// categoria: 'gym' | 'calistenia' | 'hiit'. Devuelve { dias, avisos,
// nivelPorRama } — dias ya tiene el shape que espera db.crearRutina (gym/
// calistenia) o el de una plantilla HIIT (ejercicioIds + hiitSettings), así
// que "usar" el plan generado es el mismo flujo que usar una plantilla (cada
// día se guarda como una rutina independiente, editable por separado, sin
// necesidad de un objeto "semana" nuevo).
export async function generarPlan({ categoria, diasSemana, duracionSesionMin, equipoDisponible }) {
  const historialPorNombre = await barrerHistorialCompleto();
  const nivelPorRama = await calcularNivelPorRama(historialPorNombre);
  const avisos = [];
  const usadosEstaSemana = new Set();
  const exercisesPerSession = Math.max(3, Math.min(8, Math.round(duracionSesionMin / 9)));
  const nombreCategoria = categoria === 'gym' ? 'GYM' : categoria === 'calistenia' ? 'calistenia' : 'HIIT';

  const registrarAviso = (patron, razon) => {
    const aviso = razon === 'bloqueado-prerrequisitos'
      ? `${RAMA_LABELS[patron]} no se pudo incluir todavía: lo que tenemos de ${nombreCategoria} en este patrón requiere progresar antes en otro (mira el Árbol de Progresión para ver qué falta).`
      : `${RAMA_LABELS[patron]} no se pudo incluir: no hay ejercicios de ${nombreCategoria} con el equipo que declaraste para ese patrón.`;
    if (!avisos.includes(aviso)) avisos.push(aviso);
  };

  const resumenPatrones = Object.fromEntries(Object.entries(nivelPorRama).map(([rama, info]) => [rama, info.nivel]));

  if (categoria === 'hiit') {
    const splits = elegirSplitHiit(diasSemana);
    const dias = splits.map(diaDef => {
      const elegidos = elegirEjerciciosDelDia(diaDef.patrones, exercisesPerSession, categoria, nivelPorRama, equipoDisponible, historialPorNombre, usadosEstaSemana, registrarAviso, null);
      return {
        nombre: diaDef.nombre,
        ejercicioIds: elegidos.map(e => e.ejercicioId),
        motivos: elegidos,
        hiitSettings: { mode: 'free', workSecs: 30, restSecs: 15, totalRounds: Math.max(4, elegidos.length * 3) }
      };
    });
    await db.registrarRutinaGenerada({ categoria, diasPorSemana: diasSemana, resumenPatrones });
    return { dias, avisos, nivelPorRama };
  }

  // GYM y calistenia comparten el split de la Sección 2 (Full Body queda
  // excluido para siempre — ver elegirSplit). El día 7, si aplica, no forma
  // parte del split base: se arma aparte en base a lo ya acumulado.
  const diasDelSplit = diasSemana === 7 ? 6 : diasSemana;
  const splits = await elegirSplit(diasDelSplit, categoria);
  const ratio = ratioMultiarticularPara(diasSemana);

  const dias = splits.map(diaDef => {
    const elegidos = elegirEjerciciosDelDia(diaDef.patrones, exercisesPerSession, categoria, nivelPorRama, equipoDisponible, historialPorNombre, usadosEstaSemana, registrarAviso, ratio);
    return { nombre: diaDef.nombre, ejercicios: elegidos };
  });

  if (diasSemana === 7) {
    dias.push(diaLigero(dias, categoria, nivelPorRama, equipoDisponible, historialPorNombre, usadosEstaSemana, registrarAviso));
  }

  chequearVolumenSemanal(dias, avisos);
  await db.registrarRutinaGenerada({ categoria, diasPorSemana: diasSemana, resumenPatrones });
  return { dias, avisos, nivelPorRama };
}
