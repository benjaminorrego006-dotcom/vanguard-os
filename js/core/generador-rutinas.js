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

// El "nodo frontera" de una rama: el más profundo que ya está desbloqueado
// pero todavía no dominado — lo próximo que le toca al usuario. Si no hay
// ninguno (dominó todo lo que el árbol conoce en esa rama), la rama queda
// al tope: 'avanzado' directo, sin depender del campo `nivel` del nodo más
// profundo (que puede no ser informativo, ej. 'todos'). En empate de
// profundidad se prefiere el candidato de nivel más bajo — el más
// conservador y honesto cuando no hay forma de distinguir cuál intentó
// primero el usuario.
function fronteraDeRama(rama, historialPorNombre) {
  const idsRama = Object.keys(ARBOL_PROGRESIONES).filter(id => ARBOL_PROGRESIONES[id].rama === rama);
  if (idsRama.length === 0) return null;

  const candidatos = idsRama.filter(id => desbloqueadoParaFrontera(id, historialPorNombre) && !esDominado(id, historialPorNombre));
  if (candidatos.length === 0) return { nodoId: null, nivel: 'avanzado', maxeada: true };

  const conNivel = candidatos.map(id => {
    const entry = getEjercicioPorId(id);
    return { id, profundidad: profundidadNodo(id), nivel: normalizarNivel(entry.nivel, entry.progresionDe) };
  });
  conNivel.sort((a, b) => b.profundidad - a.profundidad || NIVEL_RANGO[a.nivel] - NIVEL_RANGO[b.nivel] || a.id.localeCompare(b.id));

  return { nodoId: conNivel[0].id, nivel: conNivel[0].nivel, maxeada: false };
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
    let fuente = !frontera ? 'sin datos'
      : frontera.maxeada ? 'árbol de progresión (al tope)'
      : `árbol de progresión · próximo paso: ${getEjercicioPorId(frontera.nodoId)?.nombre || ''}`;

    const liftId = LEVANTAMIENTO_POR_RAMA[rama];
    if (liftId && pesoKg > 0) {
      const pr = prs[getEjercicioPorId(liftId).nombre.toLowerCase().trim()];
      if (pr && pr.pesoMax > 0) {
        const oneRM = db.estimar1RM(pr.pesoMax, pr.repsMax);
        const ratio = oneRM / pesoKg;
        const nivelInfo = getNivel(liftId, sexo, ratio);
        const nivelRatio = nivelInfo.nivel === 'avanzado' ? 'avanzado' : nivelInfo.nivel === 'intermedio' ? 'intermedio' : 'principiante';
        if (NIVEL_RANGO[nivelRatio] > NIVEL_RANGO[nivel]) { nivel = nivelRatio; fuente = `Estándares de Fuerza (${nivelInfo.label})`; }
      }
    }

    const ultima = ultimaFechaEnRama(rama, historialPorNombre);
    const diasSinEntrenar = ultima ? Math.round((Date.now() - ultima.getTime()) / 86400000) : null;
    let bajadoPorInactividad = false;
    if (diasSinEntrenar != null && diasSinEntrenar > 30 && NIVEL_RANGO[nivel] > 0) {
      nivel = NIVEL_DESDE_RANGO[NIVEL_RANGO[nivel] - 1];
      bajadoPorInactividad = true;
    }

    resultado[rama] = { nivel, fuente, bajadoPorInactividad, diasSinEntrenar };
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

function motivoPara(patron, nivelInfo, relajado, nivelUsado) {
  const ramaLabel = RAMA_LABELS[patron];
  if (relajado) {
    return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel}, pero no hay opciones a ese nivel con el equipo que declaraste — un paso ${nivelUsado} en su lugar.`;
  }
  if (nivelInfo.bajadoPorInactividad) {
    return `Hace ${nivelInfo.diasSinEntrenar} días que no entrenás ${ramaLabel} — bajamos la exigencia un escalón para retomar con cuidado.`;
  }
  return `Tu nivel en ${ramaLabel} es ${nivelInfo.nivel} (${nivelInfo.fuente}).`;
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
      motivo: motivoPara(patron, nivelInfo, relajado, nivelUsado)
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
