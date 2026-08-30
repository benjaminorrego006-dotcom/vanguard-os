// Vista de solo lectura del árbol de progresión. El dato (progresiones.js)
// es unificado — cubre gym/calistenia/hiit y no sabe de "modalidades", solo
// de patronMovimiento — pero cada modalidad necesita ver SU propio árbol:
// mostrar "Dominadas" (gym) como tarjeta suelta dentro de la vista de
// Calistenia era confuso. El filtro por modalidad vive acá, en la vista,
// nunca en progresiones.js: el generador de rutinas (Etapa 4) necesita leer
// el árbol completo sin filtrar para poder cruzar prerrequisitos entre
// modalidades (ej. el camino a Front Lever pasa por Dominadas de gym).
//
// Vive dentro de la ruta Entreno, así que hereda el theming MK III de
// html.mk3-entreno en components.css sin CSS propio: .card ya sale con
// chaflán (clip-path, sin border-radius), sin box-shadow y en monoespaciada;
// var(--accent-teal) ya está redefinida a var(--cy) en ese contexto. No hay
// nada de esto que declarar acá, solo respetarlo (no usar border-radius,
// box-shadow ni otra tipografía inline que lo pise).
//
// Sin XP, sin niveles, sin tiers, sin copy de "desbloqueaste X": un nodo
// bloqueado se ve atenuado y muestra qué le falta; uno disponible se ve
// igual que cualquier otro contenido de la app. El árbol informa, no
// premia — no hay confetti ni mensaje de felicitación en ningún lado acá.
import { db } from '../core/db.js';
import { ARBOL_PROGRESIONES, RAMA_ORDEN, RAMA_LABELS, profundidadNodo, estaDesbloqueado, getPrerrequisitos } from '../core/progresiones.js';
import { getEjercicioPorId } from '../core/ejercicios-catalogo.js';

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
  const items = prereqs.map(p => {
    const cruzaModalidad = !modalidadesDe(p.id).has(categoria);
    const cruzaRama = p.rama !== nodo.rama;
    const partes = [];
    if (cruzaModalidad) partes.push(MODALIDAD_LABELS[getEjercicioPorId(p.id)?.categoria] || '');
    if (cruzaRama) partes.push(RAMA_LABELS[p.rama]);
    const etiqueta = partes.length ? ` <span style="color: var(--text-disabled); font-weight: 500;">(${partes.join(' · ')})</span>` : '';
    return `<li>${p.nombre}${etiqueta} — ${formatObjetivo(p.objetivo)}</li>`;
  }).join('');
  return `
    <div style="margin-top: 8px; font-size: 11px; color: var(--text-secondary);">
      <div style="text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px; color: var(--text-disabled);">Requiere</div>
      <ul style="margin: 0; padding-left: 16px; line-height: 1.6;">${items}</ul>
    </div>
  `;
}

function renderNodo(nodoId, bloqueado, categoria) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  const esRaiz = nodo.requiere.length === 0;
  const prereqs = getPrerrequisitos(nodoId);

  return `
    <div class="card" style="padding: 14px 16px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 2px; border-left: 3px solid ${bloqueado ? 'var(--surface-border)' : 'var(--accent-teal)'}; opacity: ${bloqueado ? '0.45' : '1'};">
      <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
        <span style="font-size: 14px; font-weight: 700; color: ${bloqueado ? 'var(--text-disabled)' : 'var(--text-primary)'};">${nodo.nombre}</span>
        <span style="font-size: 11px; color: var(--text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap;">${formatObjetivo(nodo.objetivo)}</span>
      </div>
      ${esRaiz
        ? `<div style="font-size: 10.5px; color: var(--text-disabled); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Punto de partida</div>`
        : bloqueado ? renderPrerrequisitos(nodoId, prereqs, categoria) : ''}
    </div>
  `;
}

const porProfundidad = (a, b) =>
  profundidadNodo(a) - profundidadNodo(b) || ARBOL_PROGRESIONES[a].nombre.localeCompare(ARBOL_PROGRESIONES[b].nombre);

function renderRama(rama, historialPorNombre, categoria) {
  const idsRama = Object.keys(ARBOL_PROGRESIONES)
    .filter(id => ARBOL_PROGRESIONES[id].rama === rama)
    .filter(id => modalidadesDe(id).has(categoria));
  const normales = idsRama.filter(id => !NODOS_ESTATICOS.has(id)).sort(porProfundidad);
  const estaticos = idsRama.filter(id => NODOS_ESTATICOS.has(id)).sort(porProfundidad);
  if (normales.length === 0 && estaticos.length === 0) return '';

  const nodosNormalesHtml = normales.map(id => renderNodo(id, !estaDesbloqueado(id, historialPorNombre), categoria)).join('');
  const nodosEstaticosHtml = estaticos.length === 0 ? '' : `
    <div style="font-size: 10.5px; font-weight: 700; color: var(--text-disabled); text-transform: uppercase; letter-spacing: 1px; margin: 12px 0 8px 0;">Estáticos</div>
    ${estaticos.map(id => renderNodo(id, !estaDesbloqueado(id, historialPorNombre), categoria)).join('')}
  `;

  return `
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 13px; font-weight: 700; color: var(--accent-teal); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">${RAMA_LABELS[rama]}</h3>
      ${nodosNormalesHtml}
      ${nodosEstaticosHtml}
    </div>
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

  return `
    <div>
      <h2 style="font-size: 21px; font-weight: 800; margin: 0 0 4px 0; color: var(--text-primary);">Árbol de Progresión · ${MODALIDAD_LABELS[categoria] || ''}</h2>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 4px 0; line-height: 1.5;">Qué entrenar después. Un paso se habilita cuando el historial registra series limpias del paso anterior.</p>
      <p style="font-size: 11px; color: var(--text-disabled); margin: 0 0 20px 0; line-height: 1.5; font-style: italic;">Es una referencia de la comunidad, no un veredicto sobre tu cuerpo — progresa al ritmo que te funcione.</p>
      ${RAMA_ORDEN.map(rama => renderRama(rama, historialPorNombre, categoria)).join('')}
    </div>
  `;
}
