// Vista de solo lectura del árbol de progresión. El dato (progresiones.js)
// es unificado — cubre gym/calistenia/hiit y no sabe de "modalidades", solo
// de patronMovimiento — pero cada modalidad necesita ver SU propio árbol:
// mostrar "Dominadas" (gym) como tarjeta suelta dentro de la vista de
// Calistenia era confuso. El filtro por modalidad vive acá, en la vista,
// nunca en progresiones.js: el generador de rutinas (Etapa 4) necesita leer
// el árbol completo sin filtrar para poder cruzar prerrequisitos entre
// modalidades (ej. el camino a Front Lever pasa por Dominadas de gym).
//
// Órbita (Fase 9c): estilos en css/entreno.css (.o-ent-arbol, .o-ent-nodo);
// data-foto: lo que lee tools/verificar/foto-progreso.mjs. Un nodo
// bloqueado se marca con borde punteado y el rótulo «Requiere» (no solo
// con color ni con opacidad, que bajaría el contraste del texto).
//
// Sin XP, sin niveles, sin tiers, sin copy de "desbloqueaste X": un nodo
// bloqueado se ve atenuado y muestra qué le falta; uno disponible se ve
// igual que cualquier otro contenido de la app. El árbol informa, no
// premia — no hay confetti ni mensaje de felicitación en ningún lado acá.
import { db } from '../core/db.js';
import { ARBOL_PROGRESIONES, RAMA_ORDEN, RAMA_LABELS, profundidadNodo, estaDesbloqueado, getPrerrequisitos, getPrerrequisitosAlternativos } from '../core/progresiones.js';
import { getEjercicioPorId } from '../core/ejercicios-catalogo.js';
import { calcularNivelPorRama } from '../core/generador-rutinas.js';

const MODALIDAD_LABELS = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };

// Todas las modalidades a las que pertenece un nodo: su categoria principal
// más cualquier tambienEn (ej. "Zancadas Saltadas" es calistenia Y hiit).
function modalidadesDe(id) {
  const e = getEjercicioPorId(id);
  return new Set(e ? [e.categoria, ...(e.tambienEn || [])] : []);
}

// Clustering PURAMENTE de presentación: estos ids son nodos de "habilidad"
// (front lever, planche, handstand, muscle-up, etc.) que el catálogo
// clasifica con su patronMovimiento REAL (empuje-vertical, traccion-vertical,
// core...) porque ese campo lo lee el futuro generador de rutinas para
// balancear empuje/tracción — no se toca. Acá, dentro de cada rama real, se
// separan en una subsección "Estáticos" solo para que la lista sea legible;
// el dato de rama de cada nodo no cambia por estar en este Set.
const NODOS_ESTATICOS = new Set([
  'crow pose', 'pike push-up',
  'handstand contra pared', 'handstand de cara a la pared', 'handstand (libre)',
  'front lever tuck', 'front lever avanzado', 'front lever straddle', 'front lever',
  'muscle-up', 'back lever', 'bandera humana', 'dragon flag',
  'acondicionamiento de muñeca', 'plancha lean', 'tuck planche', 'tuck avanzado planche',
  'straddle planche', 'planche'
]);

const formatObjetivo = (objetivo) => {
  if (!objetivo) return 'Nivel de fuerza (ver Estándares de Fuerza)';
  return objetivo.segundos != null
    ? `${objetivo.series} × ${objetivo.segundos}s`
    : `${objetivo.series} × ${objetivo.reps} reps`;
};

// Un prerrequisito puede vivir en otra rama, otra modalidad, o ambas — un
// nodo de Calistenia bloqueado por "Dominadas" (gym, rama Tracción Vertical)
// necesita las dos etiquetas para que quede claro DÓNDE ir a trabajar eso,
// ya que "Dominadas" no tiene tarjeta propia dentro de esta vista filtrada.
function renderPrerrequisitos(nodoId, prereqs, categoria) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  const alternativos = getPrerrequisitosAlternativos(nodoId);
  const item = p => {
    const cruzaModalidad = !modalidadesDe(p.id).has(categoria);
    const cruzaRama = p.rama !== nodo.rama;
    const partes = [];
    if (cruzaModalidad) partes.push(MODALIDAD_LABELS[getEjercicioPorId(p.id)?.categoria] || '');
    if (cruzaRama) partes.push(RAMA_LABELS[p.rama]);
    const etiqueta = partes.length ? ` <span class="o-ent-req-donde">(${partes.join(' · ')})</span>` : '';
    return `<li>${p.nombre}${etiqueta} — <span class="o-num">${formatObjetivo(p.objetivo)}</span></li>`;
  };
  const items = prereqs.map(item).join('');
  const itemsAlternativos = alternativos.length === 0 ? '' : `
      <p class="o-rotulo">Uno de estos</p>
      <ul class="o-ent-req-lista" data-foto="req-alt">${alternativos.map(item).join('')}</ul>`;
  return `
    <div class="o-ent-req">
      <p class="o-rotulo">Requiere</p>
      <ul class="o-ent-req-lista" data-foto="req">${items}</ul>${itemsAlternativos}
    </div>
  `;
}

function renderNodo(nodoId, bloqueado, categoria) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  const esRaiz = nodo.requiere.length === 0 && (nodo.requiereAlternativos || []).length === 0;
  const prereqs = getPrerrequisitos(nodoId);

  return `
    <li class="o-card o-ent-nodo" data-foto="nodo" data-bloqueado="${bloqueado}">
      <div class="o-ent-nodo-cab">
        <b class="o-ent-nodo-nombre" data-foto="nodo-nombre">${nodo.nombre}</b>
        <span class="o-ent-nodo-obj o-num" data-foto="nodo-objetivo">${formatObjetivo(nodo.objetivo)}</span>
      </div>
      ${esRaiz
        ? '<p class="o-rotulo o-ent-nodo-raiz" data-foto="nodo-raiz">Punto de partida</p>'
        : bloqueado ? renderPrerrequisitos(nodoId, prereqs, categoria) : ''}
    </li>
  `;
}

const porProfundidad = (a, b) =>
  profundidadNodo(a) - profundidadNodo(b) || ARBOL_PROGRESIONES[a].nombre.localeCompare(ARBOL_PROGRESIONES[b].nombre);

function renderRama(rama, historialPorNombre, categoria, desbloqueadosManuales, nivelPorRama) {
  const nivelRama = nivelPorRama[rama]?.nivel || null;
  const idsRama = Object.keys(ARBOL_PROGRESIONES)
    .filter(id => ARBOL_PROGRESIONES[id].rama === rama)
    .filter(id => modalidadesDe(id).has(categoria));
  const normales = idsRama.filter(id => !NODOS_ESTATICOS.has(id)).sort(porProfundidad);
  const estaticos = idsRama.filter(id => NODOS_ESTATICOS.has(id)).sort(porProfundidad);
  if (normales.length === 0 && estaticos.length === 0) return '';

  const nodosNormalesHtml = normales.map(id => renderNodo(id, !estaDesbloqueado(id, historialPorNombre, desbloqueadosManuales, nivelRama), categoria)).join('');
  const nodosEstaticosHtml = estaticos.length === 0 ? '' : `
    <h4 class="o-rotulo o-ent-rama-sub">Estáticos</h4>
    <ul class="o-lista" data-foto="rama-estaticos">${estaticos.map(id => renderNodo(id, !estaDesbloqueado(id, historialPorNombre, desbloqueadosManuales, nivelRama), categoria)).join('')}</ul>
  `;

  return `
    <section class="o-ent-rama" data-foto="rama" aria-labelledby="rama-${rama}">
      <h3 class="o-rotulo o-ent-rama-titulo" id="rama-${rama}" data-foto="rama-nombre">${RAMA_LABELS[rama]}</h3>
      ${nodosNormalesHtml ? `<ul class="o-lista">${nodosNormalesHtml}</ul>` : ''}
      ${nodosEstaticosHtml}
    </section>
  `;
}

// categoria: 'gym' | 'calistenia' | 'hiit' — filtra qué nodos tienen tarjeta
// propia en esta vista. El historial se sigue barriendo sobre TODO el árbol
// (no solo los nodos visibles): un prerrequisito de otra modalidad no tiene
// tarjeta acá, pero estaDesbloqueado() igual necesita su historial para
// decidir si el nodo visible que depende de él está desbloqueado.
export async function renderArbolProgresion(categoria) {
  const nombres = [...new Set(Object.values(ARBOL_PROGRESIONES).map(n => n.nombre))];
  const historiales = await Promise.all(nombres.map(nombre => db.getHistorialEjercicio(nombre)));
  const historialPorNombre = Object.fromEntries(nombres.map((nombre, i) => [nombre, historiales[i]]));
  // Ejercicios que el usuario desbloqueó a mano al confirmar una sugerencia
  // de avance (ver db.confirmarSugerenciaNivel): cuentan como desbloqueados.
  // Mismo nivel de rama que usa el generador (historial + declarado + override)
  const nivelPorRama = await calcularNivelPorRama(historialPorNombre);
  const nivelDeclarado = await db.getNivelEntrenamiento();
  const desbloqueadosManuales = new Set(Object.values(nivelDeclarado?.desbloqueadosPorRama || {}).flat().map(d => (typeof d === 'string' ? d : d.id)));

  return `
    <div class="o-ent-arbol">
      <header class="o-ent-sec-cab">
        <h2 class="o-card-titulo" data-foto="arbol-titulo">Árbol de Progresión · ${MODALIDAD_LABELS[categoria] || ''}</h2>
        <p class="o-card-texto">Qué entrenar después. Un paso se habilita cuando el historial registra series limpias del paso anterior.</p>
        <p class="o-card-texto o-ent-nota">Es una referencia de la comunidad, no un veredicto sobre tu cuerpo — progresa al ritmo que te funcione.</p>
      </header>
      ${RAMA_ORDEN.map(rama => renderRama(rama, historialPorNombre, categoria, desbloqueadosManuales, nivelPorRama)).join('')}
    </div>
  `;
}
