// Vista de solo lectura de Estándares de Fuerza (hermana del Árbol de
// Progresión, pero para GYM). Vive dentro de Entreno > GYM, hereda el
// theming MK III de html.mk3-entreno (cian/chaflán/monoespaciada/sin
// sombra vía .card) sin CSS propio, igual que arbol-progresion.js.
//
// En calistenia se progresa cambiando de ejercicio; en gym se progresa
// subiendo el peso del mismo ejercicio — por eso esto no es un árbol de
// prerrequisitos, es una comparación contra estándares documentados
// (ver estandares-fuerza.js para la fuente de los ratios). "Nivel" acá
// es un estándar de fuerza real, no un tier de videojuego.
import { db } from '../core/db.js';
import { getEjercicioPorId } from '../core/ejercicios-catalogo.js';
import { openProfileForm } from './profile-form.js';
import { LEVANTAMIENTOS_ID, getNivel } from '../core/estandares-fuerza.js';

function renderSinDato(nombre) {
  return `
    <div class="card" style="padding: 16px; margin-bottom: 8px; border-left: 3px solid var(--surface-border); opacity: 0.7;">
      <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${nombre}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Sin registros todavía — anotalo en tu próxima sesión de GYM para ver dónde estás.</div>
    </div>
  `;
}

function renderSinPeso(nombre, oneRM) {
  return `
    <div class="card" style="padding: 16px; margin-bottom: 8px; border-left: 3px solid var(--accent-teal);">
      <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
        <span style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${nombre}</span>
        <span style="font-size: 13px; color: var(--text-primary); font-variant-numeric: tabular-nums; white-space: nowrap;">${oneRM} kg · 1RM est.</span>
      </div>
    </div>
  `;
}

const NIVEL_ORDEN_BARRA = ['principiante', 'novato', 'intermedio', 'avanzado'];

// Barra de 4 segmentos ("dónde estás") — puramente visual, el nivel real
// lo decide getNivel() en core/estandares-fuerza.js; esto solo posiciona
// ese resultado en la escala en vez de dejarlo como texto suelto.
function renderBarraNivel(nivelActual) {
  const idx = NIVEL_ORDEN_BARRA.indexOf(nivelActual);
  return `
    <div style="display: flex; gap: 4px; margin-top: 10px;">
      ${NIVEL_ORDEN_BARRA.map((n, i) => `<div style="flex: 1; height: 5px; border-radius: 3px; background: ${i <= idx ? 'var(--state-success)' : 'var(--surface-2)'};"></div>`).join('')}
    </div>
  `;
}

function renderConNivel(nombre, oneRM, ratio, nivelInfo, pesoKg) {
  const gapKg = nivelInfo.siguienteRatio != null ? Math.max(0, Math.round((nivelInfo.siguienteRatio * pesoKg) - oneRM)) : null;
  const gapHtml = gapKg != null
    ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">Te faltan ${gapKg} kg para ${nivelInfo.siguienteLabel}</div>`
    : `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">Tope de esta escala</div>`;

  return `
    <div class="card" style="padding: 16px; margin-bottom: 8px; border-left: 3px solid var(--accent-teal);">
      <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
        <span style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${nombre}</span>
        <span style="font-size: 13px; color: var(--text-primary); font-variant-numeric: tabular-nums; white-space: nowrap;">${oneRM} kg · ${ratio.toFixed(2)}× peso corporal</span>
      </div>
      ${renderBarraNivel(nivelInfo.nivel)}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
        <span class="badge badge--low">${nivelInfo.label}</span>
        ${gapHtml}
      </div>
    </div>
  `;
}

export async function renderEstandaresFuerza() {
  const [prs, profile] = await Promise.all([db.getPRs(), db.getProfile()]);
  const pesoKg = Number(profile?.pesoKg) || 0;
  const sexo = profile?.sexo === 'F' ? 'F' : 'M';
  const tienePeso = pesoKg > 0;

  const filasHtml = LEVANTAMIENTOS_ID.map(id => {
    const meta = getEjercicioPorId(id);
    const nombre = meta.nombre;
    const pr = prs[nombre.toLowerCase().trim()];

    if (!pr || pr.pesoMax <= 0) return renderSinDato(nombre);

    const oneRM = db.estimar1RM(pr.pesoMax, pr.repsMax);
    if (!tienePeso) return renderSinPeso(nombre, oneRM);

    const ratio = oneRM / pesoKg;
    const nivelInfo = getNivel(id, sexo, ratio);
    return renderConNivel(nombre, oneRM, ratio, nivelInfo, pesoKg);
  }).join('');

  // Fix del bug de matching silencioso: prs[] se busca por el nombre EXACTO
  // (minúsculas) del ejercicio tal cual está en el catálogo — un PR
  // cargado como "Bench Press" o "Sentadilla libre" nunca va a matchear
  // "Press de banca"/"Sentadilla" y la tarjeta queda en "Sin registros"
  // sin ningún aviso de por qué. Mientras el matching siga siendo exacto
  // (hacerlo flexible con sinónimos queda pendiente), este aviso fijo le
  // dice al usuario qué nomenclatura tiene que usar al cargar sus series.
  const nombresExactosHtml = `
    <div class="card" style="padding: 14px 16px; margin-bottom: 16px; border-left: 3px solid var(--surface-border);">
      <div style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.5;">Para que tus series cuenten acá, cargalas con estos nombres exactos: <b style="color: var(--text-primary);">${LEVANTAMIENTOS_ID.map(id => getEjercicioPorId(id)?.nombre).filter(Boolean).join(', ')}</b>.</div>
    </div>
  `;

  const bannerPesoHtml = !tienePeso ? `
    <div class="card" style="padding: 16px; margin-bottom: 20px; border-left: 3px solid var(--state-medium); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
      <div style="font-size: 12px; color: var(--text-secondary); flex: 1; min-width: 180px;">Completa tu peso corporal para ver tu nivel y qué te falta.</div>
      <button id="btn-completar-perfil-estandares" class="btn-primary tappable" style="background: var(--accent-teal); color: #000; padding: 8px 16px; font-size: 12px; width: auto;">Completar perfil</button>
    </div>
  ` : '';

  return `
    <div>
      <h2 style="font-size: 21px; font-weight: 800; margin: 0 0 4px 0; color: var(--text-primary);">Estándares de Fuerza</h2>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 20px 0; line-height: 1.5;">Dónde estás y qué falta en cada levantamiento principal, según tu 1RM estimado relativo a tu peso corporal.</p>
      ${nombresExactosHtml}
      ${bannerPesoHtml}
      ${filasHtml}
    </div>
  `;
}

export function initEstandaresFuerzaListeners(signal) {
  const btn = document.getElementById('btn-completar-perfil-estandares');
  if (btn) btn.addEventListener('click', () => openProfileForm(), { signal });
}
