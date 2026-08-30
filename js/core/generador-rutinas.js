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
async function barrerHistorialCompleto() {
  const nombres = [...new Set(Object.values(CATALOGO_EJERCICIOS).map(e => e.nombre))];
  const historiales = await Promise.all(nombres.map(nombre => db.getHistorialEjercicio(nombre)));
  return Object.fromEntries(nombres.map((nombre, i) => [nombre, historiales[i]]));
}

// Nivel por cada una de las 8 ramas, ya combinado con Estándares de Fuerza
// donde aplica y ajustado por inactividad prolongada.
export async function calcularNivelPorRama(historialPorNombre) {
  const [prs, profile] = await Promise.all([db.getPRs(), db.getProfile()]);
  const pesoKg = Number(profile?.pesoKg) || 0;
  const sexo = profile?.sexo === 'F' ? 'F' : 'M';

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

    const ultima = ultimaFechaEnRama(rama, historialPorNombre);
    const diasSinEntrenar = ultima ? Math.round((Date.now() - ultima.getTime()) / 86400000) : null;
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

const EMPUJE = ['empuje-horizontal', 'empuje-vertical'];
const TRACCION = ['traccion-horizontal', 'traccion-vertical'];
const PIERNA = ['rodilla', 'cadera'];

// Orden alternado empuje/tracción primero (regla dura: "equilibrio
// empuje/tracción, es el error clásico de las rutinas autogeneradas") y
// pierna antes que core, para que un presupuesto de ejercicios ajustado
// (sesión corta) siga cubriendo lo esencial antes que lo accesorio.
const PATRONES_FULL_BODY = ['empuje-horizontal', 'traccion-horizontal', 'empuje-vertical', 'traccion-vertical', 'rodilla', 'cadera', 'core'];

function elegirSplit(diasSemana) {
  if (diasSemana <= 3) {
    return Array.from({ length: diasSemana }, (_, i) => ({
      nombre: diasSemana === 1 ? 'Full Body' : `Full Body ${String.fromCharCode(65 + i)}`,
      patrones: PATRONES_FULL_BODY
    }));
  }
  if (diasSemana === 4) {
    return [
      { nombre: 'Upper A', patrones: [...EMPUJE, ...TRACCION] },
      { nombre: 'Lower A', patrones: [...PIERNA, 'core'] },
      { nombre: 'Upper B', patrones: [...TRACCION, ...EMPUJE] },
      { nombre: 'Lower B', patrones: ['core', ...PIERNA] }
    ];
  }
  const base = [
    { nombre: 'Push', patrones: EMPUJE },
    { nombre: 'Pull', patrones: TRACCION },
    { nombre: 'Legs', patrones: [...PIERNA, 'core'] }
  ];
  return Array.from({ length: diasSemana }, (_, i) => {
    const d = base[i % 3];
    const vuelta = Math.floor(i / 3) + 1;
    return { nombre: vuelta > 1 ? `${d.nombre} ${vuelta}` : d.nombre, patrones: d.patrones };
  });
}

// --- Selección de ejercicios -----------------------------------------------

// Si termina sin candidatos, distingue POR QUÉ (regla dura: "no generar en
// silencio") en vez de un aviso genérico: puede ser que no haya ningún
// ejercicio de esta modalidad/nivel con el equipo declarado, o puede ser
// que sí exista pero esté bloqueado por prerrequisitos sin cumplir todavía
// (ej. Tracción Vertical en calistenia sin ningún historial: Dead Hang
// requiere Remo Invertido antes, no es un problema de equipo). Son avisos
// distintos y accionables de forma distinta.
function candidatosPara(patron, categoria, nivelRama, equipoDisponible, historialPorNombre) {
  const nivelesAIntentar = nivelRama === 'avanzado' ? ['avanzado', 'intermedio', 'principiante']
    : nivelRama === 'intermedio' ? ['intermedio', 'principiante']
    : ['principiante'];

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
    if (pool.length > 0) return { pool, relajado: nivelIntento !== nivelRama, nivelUsado: nivelIntento, razon: null };

    if (sinEquipoNiPrereq.length === 0) sinEquipoNiPrereq = Object.values(CATALOGO_EJERCICIOS).filter(baseFiltro);
  }
  return { pool: [], relajado: false, nivelUsado: null, razon: sinEquipoNiPrereq.length > 0 ? 'bloqueado-prerrequisitos' : 'sin-equipo' };
}

// Entre los candidatos válidos: preferir el que hace más días que no se
// entrena (regla de "no repetir lo mismo") y, en empate, el que todavía no
// se usó en este mismo plan semanal. Desempate final determinístico por id
// para que el resultado sea reproducible.
function elegirDeCandidatos(pool, historialPorNombre, usadosEstaSemana) {
  const conPrioridad = pool.map(e => {
    const hist = historialPorNombre[e.nombre] || [];
    const ultima = hist.length ? new Date(hist[hist.length - 1].fecha) : null;
    const diasDesde = ultima ? (Date.now() - ultima.getTime()) / 86400000 : Infinity;
    return { e, diasDesde, yaUsado: usadosEstaSemana.has(e.id) };
  });
  conPrioridad.sort((a, b) => {
    if (a.yaUsado !== b.yaUsado) return a.yaUsado ? 1 : -1;
    if (a.diasDesde !== b.diasDesde) return b.diasDesde - a.diasDesde;
    return a.e.id.localeCompare(b.e.id);
  });
  return conPrioridad[0].e;
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
    return `Hace ${nivelInfo.diasSinEntrenar} días que no entrenás ${ramaLabel} — bajamos la exigencia un escalón para retomar con cuidado.`;
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
  return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel}.`;
}

// Recorre `patrones` en ronda (round robin) tomando UN ejercicio nuevo por
// vuelta de cada patrón todavía no agotado, hasta llenar `presupuesto` o
// quedarse sin patrones con candidatos. Evita el problema de repartir slots
// fijos por patrón de antemano: si un patrón se queda sin candidatos
// distintos (pool chico), no repite el mismo ejercicio para rellenar su
// cupo — cede el resto de su cupo a otros patrones que todavía tengan
// opciones, y si TODOS se agotan, la sesión sale con menos ejercicios de
// los presupuestados en vez de con líneas duplicadas.
function elegirEjerciciosDelDia(patrones, presupuesto, categoria, nivelPorRama, equipoDisponible, historialPorNombre, usadosEstaSemana, registrarAviso) {
  const elegidosHoy = [];
  const agotados = new Set();
  let i = 0;
  let vueltasSinExito = 0;

  while (elegidosHoy.length < presupuesto && agotados.size < patrones.length && vueltasSinExito < patrones.length) {
    const patron = patrones[i % patrones.length];
    i++;
    if (agotados.has(patron)) continue;

    const nivelInfo = nivelPorRama[patron];
    const { pool, relajado, nivelUsado, razon } = candidatosPara(patron, categoria, nivelInfo.nivel, equipoDisponible, historialPorNombre);
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

    const elegido = elegirDeCandidatos(noUsadosHoy, historialPorNombre, usadosEstaSemana);
    usadosEstaSemana.add(elegido.id);
    elegidosHoy.push({
      ejercicioId: elegido.id,
      nombre: elegido.nombre,
      series: categoria === 'hiit' ? null : seriesDesdeObjetivo(elegido),
      motivo: motivoPara(patron, nivelInfo, relajado, nivelUsado, elegido.nombre)
    });
    vueltasSinExito = 0;
  }

  return elegidosHoy;
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
// que "usar" el plan generado es el mismo flujo que usar una plantilla.
export async function generarPlan({ categoria, diasSemana, duracionSesionMin, equipoDisponible }) {
  const historialPorNombre = await barrerHistorialCompleto();
  const nivelPorRama = await calcularNivelPorRama(historialPorNombre);
  const avisos = [];
  const usadosEstaSemana = new Set();
  const exercisesPerSession = Math.max(3, Math.min(8, Math.round(duracionSesionMin / 9)));

  const splits = categoria === 'hiit' ? elegirSplitHiit(diasSemana) : elegirSplit(diasSemana);
  const nombreCategoria = categoria === 'gym' ? 'GYM' : categoria === 'calistenia' ? 'calistenia' : 'HIIT';

  const registrarAviso = (patron, razon) => {
    const aviso = razon === 'bloqueado-prerrequisitos'
      ? `${RAMA_LABELS[patron]} no se pudo incluir todavía: lo que tenemos de ${nombreCategoria} en este patrón requiere progresar antes en otro (mirá el Árbol de Progresión para ver qué falta).`
      : `${RAMA_LABELS[patron]} no se pudo incluir: no hay ejercicios de ${nombreCategoria} con el equipo que declaraste para ese patrón.`;
    if (!avisos.includes(aviso)) avisos.push(aviso);
  };

  const dias = splits.map(diaDef => {
    const elegidos = elegirEjerciciosDelDia(diaDef.patrones, exercisesPerSession, categoria, nivelPorRama, equipoDisponible, historialPorNombre, usadosEstaSemana, registrarAviso);

    if (categoria === 'hiit') {
      return {
        nombre: diaDef.nombre,
        ejercicioIds: elegidos.map(e => e.ejercicioId),
        motivos: elegidos,
        hiitSettings: { mode: 'free', workSecs: 30, restSecs: 15, totalRounds: Math.max(4, elegidos.length * 3) }
      };
    }
    return { nombre: diaDef.nombre, ejercicios: elegidos };
  });

  return { dias, avisos, nivelPorRama };
}
