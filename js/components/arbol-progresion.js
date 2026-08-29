// Vista de solo lectura del árbol de progresión de calistenia (Fase 5d).
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
import { ARBOL_PROGRESIONES, RAMA_ORDEN, RAMA_LABELS, profundidadNodo, estaDesbloqueado, getPrerrequisitos } from '../core/progresiones-calistenia.js';

const formatObjetivo = (objetivo) =>
  objetivo.segundos != null
    ? `${objetivo.series} × ${objetivo.segundos}s`
    : `${objetivo.series} × ${objetivo.reps} reps`;

function renderPrerrequisitos(nodoId, prereqs) {
  const nodo = ARBOL_PROGRESIONES[nodoId];
  const items = prereqs.map(p => {
    const cruzaRama = p.rama !== nodo.rama;
    const etiquetaRama = cruzaRama ? ` <span style="color: var(--text-disabled); font-weight: 500;">(${RAMA_LABELS[p.rama]})</span>` : '';
    return `<li>${p.nombre}${etiquetaRama} — ${formatObjetivo(p.objetivo)}</li>`;
  }).join('');
  return `
    <div style="margin-top: 8px; font-size: 11px; color: var(--text-secondary);">
      <div style="text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px; color: var(--text-disabled);">Requiere</div>
      <ul style="margin: 0; padding-left: 16px; line-height: 1.6;">${items}</ul>
    </div>
  `;
}

function renderNodo(nodoId, bloqueado) {
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
        : bloqueado ? renderPrerrequisitos(nodoId, prereqs) : ''}
    </div>
  `;
}

function renderRama(rama, historialPorNombre) {
  const ids = Object.keys(ARBOL_PROGRESIONES)
    .filter(id => ARBOL_PROGRESIONES[id].rama === rama)
    .sort((a, b) => profundidadNodo(a) - profundidadNodo(b) || ARBOL_PROGRESIONES[a].nombre.localeCompare(ARBOL_PROGRESIONES[b].nombre));

  const nodosHtml = ids.map(id => renderNodo(id, !estaDesbloqueado(id, historialPorNombre))).join('');

  return `
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 13px; font-weight: 700; color: var(--accent-teal); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">${RAMA_LABELS[rama]}</h3>
      ${nodosHtml}
    </div>
  `;
}

export async function renderArbolProgresion() {
  // Un solo barrido por ejercicio del árbol (38 nodos), en paralelo — cada
  // uno es una lectura independiente de IndexedDB, no hay razón para
  // serializarlas una por una.
  const nombres = [...new Set(Object.values(ARBOL_PROGRESIONES).map(n => n.nombre))];
  const historiales = await Promise.all(nombres.map(nombre => db.getHistorialEjercicio(nombre)));
  const historialPorNombre = Object.fromEntries(nombres.map((nombre, i) => [nombre, historiales[i]]));

  return `
    <div>
      <h2 style="font-size: 21px; font-weight: 800; margin: 0 0 4px 0; color: var(--text-primary);">Árbol de Progresión</h2>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 20px 0; line-height: 1.5;">Qué entrenar después. Un paso se habilita cuando el historial registra 3 series limpias del paso anterior.</p>
      ${RAMA_ORDEN.map(rama => renderRama(rama, historialPorNombre)).join('')}
    </div>
  `;
}
