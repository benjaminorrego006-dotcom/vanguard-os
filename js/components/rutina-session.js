import { db } from '../core/db.js';
import { playBeep } from '../core/audio.js';
import { renderEjercicioDetalle, initEjercicioDetalleChart } from './ejercicio-detalle.js';
import { calcularDiscos, renderPlateCalculatorPopover } from './plate-calculator.js';
import { getProgressionLevel, RAMA_LABELS } from '../core/progresiones.js';
import { metadataDeEjercicio, CATALOGO_EJERCICIOS, grupoMuscularParaMapa, GRUPO_MUSCULAR_LABELS } from '../core/ejercicios-catalogo.js';
import { ConfirmDialog, Toast } from '../utils/states.js';
import { renderSessionSummaryForm, askSessionSummary } from './session-summary-form.js';
import { escapeHtml } from '../utils/escape.js';
import { guardarBorrador, borrarBorrador, esBorradorLargo } from '../utils/sesion-borrador.js';
import { formatFechaCorta } from '../utils/fecha.js';
import { MuscleMap, sumarFatigaPorGrupo, expandirIntensidadPorMusculo, FATIGA_REFERENCIA } from './mk3-muscle-map.js';
import { VISTA, GRUPOS_MUSCULARES } from './mk3-muscle-map-data.js';

const trophySvgSm = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 3px;"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"></path><path d="M7 5H4a2 2 0 0 0 0 4h1M17 5h3a2 2 0 0 1 0 4h-1"></path></svg>`;
const historySvg = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 3px;"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><path d="M12 7v5l4 2"></path></svg>`;
const trendUpSvg = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 3px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`;
const arrowUpSvg = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px;"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
const arrowDownSvg = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px;"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
const clockSvg = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -3px; margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
const warningSvgSm = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 4px; flex-shrink: 0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

let timerInterval = null;
let restTimerInterval = null;
let startTime = null;

let currentPRs = {};
let currentSugerencias = {};
let currentHistorial = {};
let currentEstancamiento = {};
let currentRestTimerSecs = 90;
// HUD: volumen (kg) de la última sesión de esta misma rutina (null si no
// hay) y los récords tal como estaban al abrir la sesión (currentPRs se
// actualiza en vivo al batir uno; para el HUD se compara contra el de antes).
let volumenRutinaPrevio = null;
let prsAlAbrir = {};

// Tipo de serie: color del chip del número en vez de un selector visible
// permanente (por fila casi siempre es "normal", así que mostrarlo
// siempre desperdiciaba una columna entera). El valor real sigue viviendo
// en el <select class="serie-tipo"> oculto, para no tocar la lógica de
// guardado/lectura de series que ya depende de su .value.
export const TIPO_LABELS = { normal: 'Normal', calentamiento: 'Calentamiento', fallo: 'Fallo', dropset: 'Dropset' };
const TIPO_COLORS = {
  normal: { bg: 'var(--surface-1)', border: 'var(--surface-border)', color: 'var(--text-secondary)' },
  calentamiento: { bg: 'rgba(245,158,11,0.15)', border: 'var(--accent-orange)', color: 'var(--accent-orange)' },
  fallo: { bg: 'rgba(239,68,68,0.15)', border: 'var(--state-high)', color: 'var(--state-high)' },
  dropset: { bg: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)', border: 'var(--accent-purple)', color: 'var(--accent-purple)' },
};

// Buscador del catálogo de ejercicios: el de "Añadir ejercicio" de la
// sesión en vivo, compartido con la edición de una sesión del historial
// (sesiones-historial.js). Devuelve una promesa con el nombre elegido o
// null si se cierra. Opciones:
// - permitirPersonalizado (true): sin resultados ofrece añadir el texto
//   tal cual; la edición solo deja elegir del catálogo.
// - conId (false): resuelve { id, nombre } (id del catálogo, o null si es
//   un ejercicio libre de "Añadir de todas formas") en vez del nombre.
// Muestra y devuelve el nombre real del catálogo (antes armaba uno desde
// la clave, ej. "Peso Muerto" por "Peso Muerto Convencional", y la sesión
// quedaba sin id).
// Es un .modal-overlay con id (#buscador-ejercicios-modal): history.js le
// da su entrada de historial, así Atrás y Escape cierran solo el buscador,
// y layout.css lo deja sin tapar la barra inferior ni el riel.
export function abrirBuscadorEjercicios({ permitirPersonalizado = true, conId = false } = {}) {
  return new Promise((resolve) => {
    document.getElementById('buscador-ejercicios-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'buscador-ejercicios-modal';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '6000';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'picker-titulo');
    overlay.innerHTML = `
      <div class="modal-content" style="display: flex; flex-direction: column; padding: 20px;">
        <div class="flex-between" style="margin-bottom: 16px;">
          <h3 id="picker-titulo" style="margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.3px;">Añadir Ejercicio</h3>
          <button id="close-picker" aria-label="Cerrar" style="background: transparent; border: none; color: var(--text-disabled); font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <input type="text" id="picker-search" aria-label="Buscar ejercicio" placeholder="Buscar ejercicio (ej. Sentadilla)" style="width: 100%; padding: 13px 16px; border-radius: 14px; border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-primary); margin-bottom: 16px; outline: none; box-sizing: border-box; font-size: 16px;">
        <div id="picker-results" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    `;
    // For desktop frame compatibility, append to #view-root > div if available, otherwise body
    const rootDiv = document.querySelector('#view-root > div') || document.body;
    rootDiv.appendChild(overlay);
    // La clase se agrega después de insertarlo: history.js observa el cambio
    // de "open" (no la inserción) para empujar la entrada de historial.
    overlay.classList.add('open');

    let cerrado = false;
    const close = (val) => {
      if (cerrado) return;
      cerrado = true;
      window.removeEventListener('popstate', alAtras);
      // Quitar "open" suelta su entrada de historial (history.js) antes de
      // sacar el nodo.
      overlay.classList.remove('open');
      overlay.remove();
      resolve(val);
    };
    // Atrás (o Escape, que history.js convierte en atrás): history.js ya lo
    // cerró; acá se saca el nodo y se resuelve sin elección.
    const alAtras = () => { if (!overlay.classList.contains('open')) close(null); };
    window.addEventListener('popstate', alAtras);

    document.getElementById('close-picker').onclick = () => close(null);

    const searchInput = document.getElementById('picker-search');
    const resultsContainer = document.getElementById('picker-results');

    const allEjercicios = Object.keys(CATALOGO_EJERCICIOS).map(k => ({
      key: k,
      nombre: CATALOGO_EJERCICIOS[k].nombre,
      musculo: CATALOGO_EJERCICIOS[k].grupoMuscular
    }));

    const renderResults = (query) => {
      const q = query.toLowerCase().trim();
      // Lo que se guarda como ejercicio libre: tal como se escribió, solo sin
      // espacios de más (la búsqueda sí compara en minúsculas).
      const escrito = query.trim().replace(/\s+/g, ' ');
      const matches = q ? allEjercicios.filter(e => e.nombre.toLowerCase().includes(q)) : allEjercicios.slice(0, 20);

      if (matches.length === 0 && q) {
        resultsContainer.innerHTML = `
          <div style="text-align: center; color: var(--text-secondary); padding: 20px 0; font-size: 14px;">
            No encontrado en el catálogo.
            ${permitirPersonalizado ? `<br><br>
            <button id="btn-custom-ej" class="tappable" style="background: var(--accent-teal); color: #000; border: none; padding: 10px 18px; border-radius: 12px; cursor: pointer; font-weight: 700; margin-top: 12px;">Añadir "${escapeHtml(escrito)}" de todas formas</button>` : ''}
          </div>
        `;
        const btnCustom = document.getElementById('btn-custom-ej');
        if (btnCustom) btnCustom.onclick = () => close(conId ? { id: null, nombre: escrito } : escrito);
      } else {
        resultsContainer.innerHTML = matches.map(e => `
          <button type="button" class="picker-item tappable" data-key="${escapeHtml(e.key)}" data-nombre="${escapeHtml(e.nombre)}" style="width: 100%; flex-shrink: 0; text-align: left; font: inherit; color: var(--text-primary); padding: 13px 16px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <span style="font-weight: 600; font-size: 15px;">${escapeHtml(e.nombre)}</span>
            <span style="font-size: 11px; color: var(--accent-teal); text-transform: uppercase; border: 1px solid var(--accent-teal); padding: 2px 6px; border-radius: 4px;">${e.musculo}</span>
          </button>
        `).join('');

        resultsContainer.querySelectorAll('.picker-item').forEach(item => {
          item.onclick = () => {
            if (!conId) { close(item.getAttribute('data-nombre')); return; }
            const ej = CATALOGO_EJERCICIOS[item.getAttribute('data-key')];
            close({ id: ej.id, nombre: ej.nombre });
          };
        });
      }
    };

    searchInput.oninput = (e) => renderResults(e.target.value);
    renderResults(''); // initial render

    setTimeout(() => searchInput.focus(), 100);
  });
}

// Una fila de serie completa: la fila visible + su hint de 1RM como
// hermano inmediato (initRutinaSessionListeners depende de
// row.nextElementSibling para encontrarlo). Se usa tanto en el render
// inicial como al agregar una serie nueva en vivo.
// Reps es texto (con teclado numérico): las plantillas de Calistenia traen
// series por tiempo ("30s", "20s/lado") y un input type="number" las dejaba
// vacías (y se guardaban sin reps).
function renderSerieRowHtml(s, sIdx) {
  const tipo = s.tipo || 'normal';
  const tc = TIPO_COLORS[tipo] || TIPO_COLORS.normal;
  const isNormal = tipo === 'normal' ? 'selected' : '';
  const isCalentamiento = tipo === 'calentamiento' ? 'selected' : '';
  const isFallo = tipo === 'fallo' ? 'selected' : '';
  const isDropset = tipo === 'dropset' ? 'selected' : '';

  const pesoInicial = parseFloat(s.peso) || 0;
  const repsInicial = parseInt(s.reps) || 0;
  const rm1Inicial = (pesoInicial > 0 && repsInicial > 0) ? db.estimar1RM(pesoInicial, repsInicial) : 0;

  const fieldStyle = "flex: 1; min-width:0; box-sizing:border-box; height:44px; background:var(--surface-1); border:1px solid var(--surface-border); color:var(--text-primary); text-align:center; font-size:15px; font-family: var(--font-mono); font-variant-numeric: tabular-nums; padding: 0 4px;";
  const rpeStyle = "flex: 0 0 48px; height:44px; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); color:var(--text-primary); font-size:13px; font-family: var(--font-mono); font-variant-numeric: tabular-nums; text-align:center; text-align-last:center; appearance:none; -webkit-appearance:none; padding: 0;";

  const row = `
    <div class="serie-row" style="display: flex; align-items: center; gap: 6px; position: relative; margin-bottom: 6px;">
      <select class="serie-tipo" style="display:none;">
        <option value="normal" ${isNormal}>N</option>
        <option value="calentamiento" ${isCalentamiento}>C</option>
        <option value="fallo" ${isFallo}>F</option>
        <option value="dropset" ${isDropset}>D</option>
      </select>
      <button type="button" class="serie-tipo-chip tappable" data-tipo="${tipo}" title="${TIPO_LABELS[tipo]}" style="flex-shrink:0; width: 32px; height: 44px; background: ${tc.bg}; border: 1px solid ${tc.border}; color: ${tc.color}; font-size: 13px; font-weight: 700; font-family: var(--font-mono); cursor: pointer; padding: 0;">${sIdx + 1}</button>
      <input type="text" inputmode="numeric" class="serie-reps" value="${escapeHtml(String(s.reps ?? ''))}" aria-label="Repeticiones o segundos" style="${fieldStyle}">
      <input type="number" step="0.5" inputmode="decimal" class="serie-peso" value="${s.peso}" style="${fieldStyle} flex: 1.25;">
      <select class="serie-rpe" style="${rpeStyle}">
        <option value="">-</option>
        <option value="5" ${s.rpe == 5 ? 'selected' : ''}>5</option>
        <option value="6" ${s.rpe == 6 ? 'selected' : ''}>6</option>
        <option value="7" ${s.rpe == 7 ? 'selected' : ''}>7</option>
        <option value="8" ${s.rpe == 8 ? 'selected' : ''}>8</option>
        <option value="9" ${s.rpe == 9 ? 'selected' : ''}>9</option>
        <option value="10" ${s.rpe == 10 ? 'selected' : ''}>10</option>
      </select>
      <button class="btn-check-serie" data-checked="${s.checked === true ? 'true' : 'false'}" style="flex-shrink:0; width: 44px; height: 44px; background: ${s.checked ? 'var(--state-success)' : 'var(--surface-2)'}; border: 1px solid ${s.checked ? 'var(--state-success)' : 'var(--text-secondary)'}; color: ${s.checked ? '#000' : 'var(--text-secondary)'}; font-size: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">✓</button>
    </div>
    <div class="serie-1rm-hint num" style="text-align: right; font-size: 10px; color: var(--text-disabled); margin: -2px 0 6px 38px; ${rm1Inicial > 0 ? '' : 'display: none;'}">1RM est. ~${rm1Inicial}kg</div>
  `;
  return row;
}

// El id del contenedor de "Ver progreso" depende del nombre del ejercicio:
// no puede llevar el nombre crudo (una comilla o "<" en un nombre de
// ejercicio personalizado rompería el atributo id), pero tampoco puede
// pasar por escapeHtml, porque el listener de "Ver progreso" reconstruye
// el mismo id a partir del nombre ya decodificado (vía getAttribute) sin
// volver a tocar el DOM — quedarían desincronizados. Se usa esta función en
// ambos lados en vez de escapeHtml.
const idSafeFragment = (nombre) => nombre.replace(/[^a-zA-Z0-9_-]/g, '');

// Volumen en kg de un grupo de series: peso × reps de las que tienen peso
// (las de peso corporal no suman kg). Reps puede traer texto ("10", "30s").
function volumenDeSeries(series) {
  return series.reduce((total, s) => {
    const peso = parseFloat(s.peso) || 0;
    const reps = parseInt(String(s.reps ?? '').match(/\d+/)?.[0] || '0');
    return total + (peso > 0 ? peso * reps : 0);
  }, 0);
}

// Riel de ejercicios bajo el HUD: una pestaña por ejercicio (nombre corto y
// progreso "2/3", ✓ al terminar), las superseries juntas en un marco ámbar
// "SUPERSERIE A, B…" y al final "+" (añadir ejercicio, el mismo buscador).
function renderRielEjercicios(rutina) {
  const letras = new Map();
  const corto = (n) => n.replace(/\s*\(.*\)\s*/g, ' ').trim();
  const tab = (ej, i) => {
    const total = (ej.series || []).length;
    const hechas = (ej.series || []).filter(s => s.checked === true).length;
    return `<button type="button" class="sesion-tab tappable" role="tab" data-ej-idx="${i}" aria-controls="sesion-ej-${i}" aria-selected="false" tabindex="-1" title="${escapeHtml(ej.nombre)}">
        <span class="sesion-tab-check" aria-hidden="true"${total > 0 && hechas === total ? '' : ' hidden'}>✓</span>
        <span class="sesion-tab-nombre">${escapeHtml(corto(ej.nombre))}</span>
        <span class="sesion-tab-prog num">${hechas}/${total}</span>
      </button>`;
  };
  let html = '';
  for (let i = 0; i < rutina.ejercicios.length; i++) {
    const ej = rutina.ejercicios[i];
    if (!ej.grupoId) { html += tab(ej, i); continue; }
    // Corrida de ejercicios consecutivos con el mismo grupoId.
    let j = i;
    while (j + 1 < rutina.ejercicios.length && rutina.ejercicios[j + 1].grupoId === ej.grupoId) j++;
    if (j === i) { html += tab(ej, i); continue; }
    if (!letras.has(ej.grupoId)) letras.set(ej.grupoId, String.fromCharCode(65 + letras.size));
    html += `<div class="sesion-riel-ss" role="presentation"><span class="sesion-riel-ss-etq">SUPERSERIE ${letras.get(ej.grupoId)}</span><div class="sesion-riel-ss-tabs">`;
    for (let k = i; k <= j; k++) html += tab(rutina.ejercicios[k], k);
    html += '</div></div>';
    i = j;
  }
  html += `<button type="button" id="btn-add-ejercicio-live" class="sesion-tab sesion-tab--mas tappable" aria-label="Añadir ejercicio">+</button>`;
  return `<nav id="sesion-riel" class="sesion-riel" role="tablist" aria-label="Ejercicios de la sesión">${html}</nav>`;
}

export async function renderRutinaSession(rutina) {
  // Preload data
  currentPRs = await db.getPRs();
  prsAlAbrir = JSON.parse(JSON.stringify(currentPRs));
  const previa = (await db.getSesiones()).find(s => s.rutinaId === rutina.id);
  volumenRutinaPrevio = previa ? volumenDeSeries((previa.ejercicios || []).flatMap(e => e.series || [])) : null;
  currentHistorial = {};
  currentEstancamiento = {};
  currentRestTimerSecs = await db.getRestTimerSecs();
  for (const ej of rutina.ejercicios) {
    currentHistorial[ej.nombre] = await db.getHistorialEjercicio(ej.nombre);
    currentSugerencias[ej.nombre] = await db.sugerirProgresion(ej.nombre);
    currentEstancamiento[ej.nombre] = await db.detectarEstancamiento(ej.nombre);
  }


  const CATEGORIA_LABEL = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };
  // Barra superior de la sesión (pantalla completa: en móvil la barra
  // inferior se oculta mientras está abierta, ver entrenamiento.js).
  let html = `
    <div class="sesion-cabecera">
    <header id="sesion-barra" class="sesion-barra">
      <button type="button" id="btn-sesion-salir" class="sesion-barra-salir tappable" aria-label="Salir de la sesión">
        <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      <div class="sesion-barra-titulo">
        <h2>${escapeHtml(rutina.nombre)}</h2>
        ${CATEGORIA_LABEL[rutina.categoria] ? `<div>${CATEGORIA_LABEL[rutina.categoria]}</div>` : ''}
      </div>
      <button type="button" id="btn-finalizar-sesion" class="sesion-barra-finalizar tappable">Finalizar</button>
    </header>
    <section id="sesion-hud" class="card card-hero sesion-hud" aria-label="Panel de la sesión">
      <div class="sesion-hud-fila">
        <div class="sesion-hud-mapas">
          <div id="hud-mapa-frente"></div>
          <div id="hud-mapa-espalda"></div>
        </div>
        <dl class="sesion-hud-datos">
          <div><dt>Tiempo</dt><dd><span id="session-timer" class="num">00:00</span></dd></div>
          <div><dt>Series</dt><dd><span id="hud-series" class="num">0/0</span></dd></div>
          <div><dt>Volumen</dt><dd><span id="hud-volumen" class="num">0</span> kg <span id="hud-volumen-var" class="sesion-hud-var num" hidden></span></dd></div>
          <div><dt>Récords</dt><dd><span id="hud-records" class="num">0</span><span id="hud-record-ultimo" class="sesion-hud-ultimo"></span></dd></div>
        </dl>
      </div>
      <div id="hud-segmentos" class="sesion-hud-segmentos" role="img" aria-label="Series de la sesión"></div>
    </section>
    ${renderRielEjercicios(rutina)}
    </div>
    <div class="card" style="padding: 22px; border-radius: 20px;">
      <div class="flex-between" style="margin-bottom: 20px;">
        <div></div>
        <button id="btn-rest-timer-config" type="button" style="background: transparent; border: none; color: var(--text-secondary); font-size: 11px; font-weight: 600; cursor: pointer; padding: 2px 0; display: flex; align-items: center; gap: 4px;">${clockSvg}Descanso: <span id="rest-timer-config-value" class="num">${currentRestTimerSecs}</span>s</button>
      </div>
  `;

  html += `<div id="sesion-ejercicios" class="sesion-ejercicios">`;


  // Ejercicios que comparten grupoId (asignado al agrupar en superserie en
  // Crear Rutina) se ejecutan sin descanso entre sí — ver el chip dentro de
  // la tarjeta y el skip del timer en el handler del check de serie, más
  // abajo. Solo el SEGUNDO+ de la corrida lleva el borde ámbar y el chip;
  // el primero se ve como cualquier otro (mismo criterio visual que el
  // mockup: "Press de Banca" normal, "Press Inclinado" marcado).
  //
  // Los ejercicios van en el orden de la rutina (antes se agrupaban por
  // grupo muscular, que separaba las superseries); el grupo es un rótulo
  // sobre el nombre.
  const gruposYaMostrados = new Set();
  const totalEjercicios = rutina.ejercicios.length;

  for (const ej of rutina.ejercicios) {
    const hist = currentHistorial[ej.nombre];
    const ultimo = (hist && hist.length > 0) ? hist[hist.length - 1] : null;
    const pr = currentPRs[ej.nombre.toLowerCase().trim()];
    const prog = getProgressionLevel(ej.nombre, ej.ejercicioId);
    const meta = metadataDeEjercicio(ej.nombre, ej.ejercicioId);
    const sug = currentSugerencias[ej.nombre];
    const estancado = currentEstancamiento[ej.nombre];

    const esSegundoDelGrupo = !!ej.grupoId && gruposYaMostrados.has(ej.grupoId);
    if (ej.grupoId) gruposYaMostrados.add(ej.grupoId);
    const supChipHtml = esSegundoDelGrupo
      ? `<div style="margin-bottom: 8px;"><span class="badge badge--medium">SUPERSERIE · sin descanso entre estos dos</span></div>`
      : '';

    html += `
      <div class="card ejercicio-sesion-block" id="sesion-ej-${rutina.ejercicios.indexOf(ej)}" role="tabpanel" data-ej-idx="${rutina.ejercicios.indexOf(ej)}" data-ej-nombre="${escapeHtml(ej.nombre)}"${ej.ejercicioId !== undefined ? ` data-ej-id="${escapeHtml(ej.ejercicioId || '')}"` : ''} data-grupo-id="${ej.grupoId || ''}" style="background: var(--surface-2); padding: 16px; border-radius: 16px; ${esSegundoDelGrupo ? 'border-left: 2px solid var(--state-medium);' : ''}">
        ${supChipHtml}

        <div class="sesion-ej-rotulo">Ejercicio <span class="num">${rutina.ejercicios.indexOf(ej) + 1}</span> de <span class="num">${totalEjercicios}</span>${GRUPO_MUSCULAR_LABELS[meta.grupoMuscular] ? ` · ${GRUPO_MUSCULAR_LABELS[meta.grupoMuscular]}` : ''}</div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
            <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary); white-space: normal; line-height: 1.2; word-break: break-word;">${escapeHtml(ej.nombre)}</h3>
            ${meta && (meta.posturaInicial || (meta.pasosEjecucion && meta.pasosEjecucion.length)) ? `<button class="btn-info-ejercicio" data-ejnombre="${escapeHtml(ej.nombre)}" style="flex-shrink:0; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-secondary); width:22px; height:22px; border-radius:50%; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></button>` : ''}
          </div>
          <button class="btn-plate-calc" style="flex-shrink:0; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 6px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Calculadora de discos"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="8.01" y2="10"></line><line x1="12" y1="10" x2="12.01" y2="10"></line><line x1="16" y1="10" x2="16.01" y2="10"></line><line x1="8" y1="14" x2="8.01" y2="14"></line><line x1="12" y1="14" x2="12.01" y2="14"></line><line x1="16" y1="14" x2="16.01" y2="14"></line><line x1="8" y1="18" x2="16" y2="18"></line></svg></button>
            <button class="btn-ver-progreso" data-ejnombre="${escapeHtml(ej.nombre)}" style="flex-shrink:0; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-secondary); font-size: 12px; font-weight: 700; cursor: pointer; padding: 6px 12px; border-radius: 20px; white-space: nowrap; display: flex; align-items: center;">${trendUpSvg}Progreso</button>
        </div>

        <div id="progreso-container-${idSafeFragment(ej.nombre)}" style="display: none; width: 100%; margin-bottom: 8px;"></div>
    `;

    const chips = [];

    if (pr && pr.pesoMax > 0) {
      const rm = db.estimar1RM(pr.pesoMax, pr.repsMax || pr.repsEnPesoMax || 1); // fallback
      chips.push(`<span class="num" style="background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">${trophySvgSm}PR ${pr.pesoMax}kg${rm > 0 ? ` · 1RM ~${rm}kg` : ''}</span>`);
    } else if (pr && pr.pesoMax === 0 && pr.repsMax > 0) {
      chips.push(`<span class="num" style="background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">${trophySvgSm}PR ${pr.repsMax} reps</span>`);
    }

    if (ultimo) {
      const ultimoTxt = ultimo.pesoMax > 0 ? `${ultimo.pesoMax}kg` : `${ultimo.repsMax || 0} reps`;
      chips.push(`<span style="background: var(--surface-1); color: var(--text-secondary); border: 1px solid var(--surface-border); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;">${historySvg}${ultimoTxt} · ${ultimo.volumenTotal} vol</span>`);
    } else {
      chips.push(`<span style="background: var(--surface-1); color: var(--text-disabled); border: 1px solid var(--surface-border); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;">Primera vez</span>`);
    }

    if (prog) {
      chips.push(`<span style="background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">${trendUpSvg}${RAMA_LABELS[prog.familia] || prog.familia} · Nv.${prog.nivelActual}/${prog.nivelTotal}</span>`);
    }

    html += `<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">${chips.join('')}</div>`;

    if (sug) {
      const sugText = sug.peso > 0 ? sug.peso + 'kg' : sug.reps + ' reps';
      const sugIcon = sug.accion === 'aumentar' ? arrowUpSvg : arrowDownSvg;
      html += `<button class="btn-sugerencia" data-ejnombre="${escapeHtml(ej.nombre)}" data-peso="${sug.peso}" data-reps="${sug.reps}" style="width: 100%; background: var(--surface-2); border: 1px dashed var(--surface-border); color: var(--text-primary); padding: 9px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px;">${sugIcon}Sugerido: ${sugText} · toca para aplicar</button>`;
    }

    if (estancado) {
      html += `<div style="display: flex; align-items: center; font-size: 11px; color: var(--state-medium); margin-bottom: 6px;">${warningSvgSm}Sin mejora en tus últimas 3 sesiones — prueba variar reps, descanso o el ejercicio.</div>`;
    }

    html += `<div class="series-list" data-ejnombre="${escapeHtml(ej.nombre)}" style="display: flex; flex-direction: column;">`;

    html += `
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <div style="width: 32px; flex-shrink: 0;"></div>
          <div style="flex: 1; font-size: 9px; color: var(--text-secondary); text-align: center;">REPS</div>
          <div style="flex: 1.25; font-size: 9px; color: var(--text-secondary); text-align: center;">PESO</div>
          <div style="flex: 0 0 48px; font-size: 9px; color: var(--text-secondary); text-align: center;">RPE</div>
          <div style="width: 44px; flex-shrink: 0;"></div>
        </div>
      `;
      ej.series.forEach((s, sIdx) => { html += renderSerieRowHtml(s, sIdx); });

    html += `</div>`;
    html += `<button type="button" class="btn-add-serie tappable" style="margin-top: 4px; width: 100%; padding: 8px; background: transparent; border: 1px dashed var(--surface-border); color: var(--text-secondary); font-size: 12px; font-weight: 700; cursor: pointer;">+ Serie</button>`;
    html += `</div>`;
  }

  html += `</div>`;

  // Anterior / puntos / Siguiente (también se cambia con el riel o deslizando).
  html += `
    <div class="sesion-nav" ${rutina.ejercicios.length ? '' : 'hidden'}>
      <button type="button" id="btn-ej-anterior" class="sesion-nav-btn tappable">‹ Anterior</button>
      <div id="sesion-puntos" class="sesion-puntos" aria-hidden="true">${rutina.ejercicios.map(() => '<span></span>').join('')}</div>
      <button type="button" id="btn-ej-siguiente" class="sesion-nav-btn tappable">Siguiente ›</button>
    </div>
  </div>`;

  // Floating timer. Sticky en vez de fixed: fixed centra contra el
  // viewport completo (incluye el ancho del sidebar en escritorio), sticky
  // centra contra su propio contenedor (la columna de contenido ya
  // centrada), que es lo que se ve visualmente como "la pantalla".
  html += `<div id="floating-rest-timer" style="display: none; position: sticky; bottom: calc(90px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); background: var(--surface-2); border: 2px solid var(--accent-teal); color: var(--text-primary); padding: 12px 24px; border-radius: 30px; font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; box-shadow: 0 8px 16px rgba(0,0,0,0.5); z-index: 1000; cursor: pointer; align-items: center; gap: 8px; width: fit-content;">
    ${clockSvg}<span id="rest-timer-text" class="num">01:00</span>
  </div>`;

  html += renderSessionSummaryForm();

  return html;
}

// opciones.inicio (ms): hora de inicio de la sesión; al retomar un borrador
// (o repintar tras agregar un ejercicio) el cronómetro sigue desde ahí.
// opciones.ejercicioActivo: índice del ejercicio que se estaba usando.
export function initRutinaSessionListeners(rutina, onSuccess, signal, opciones = {}) {
  startTime = new Date(typeof opciones.inicio === 'number' ? opciones.inicio : Date.now());
  let ejercicioActivo = Number.isInteger(opciones.ejercicioActivo) ? opciones.ejercicioActivo : 0;

  // Estado de la sesión leído del DOM, en el orden de rutina.ejercicios
  // (data-ej-idx): los bloques se muestran agrupados por grupo muscular, así
  // que el orden en pantalla puede no ser el de la rutina.
  const leerEjerciciosDelDom = () => {
    const ejercicios = rutina.ejercicios.map(ej => ({
      nombre: ej.nombre,
      ...(ej.ejercicioId !== undefined ? { ejercicioId: ej.ejercicioId } : {}),
      ...(ej.grupoId ? { grupoId: ej.grupoId } : {}),
      series: (ej.series || []).map(s => ({ ...s }))
    }));
    document.querySelectorAll('.ejercicio-sesion-block').forEach(b => {
      const ej = ejercicios[Number(b.dataset.ejIdx)];
      if (!ej) return;
      ej.series = Array.from(b.querySelectorAll('.serie-row')).map(row => ({
        tipo: row.querySelector('.serie-tipo').value,
        reps: row.querySelector('.serie-reps').value,
        peso: row.querySelector('.serie-peso').value,
        rpe: row.querySelector('.serie-rpe').value ? parseInt(row.querySelector('.serie-rpe').value) : null,
        checked: row.querySelector('.btn-check-serie').getAttribute('data-checked') === 'true'
      }));
    });
    return ejercicios;
  };

  // Borrador (ver utils/sesion-borrador.js): se guarda al empezar y con cada
  // cambio, así recargar, cerrar la app o salir con Atrás no pierde nada.
  // Una serie es récord si está marcada y supera el récord que había al
  // abrir la sesión (misma regla que el aviso de PR en vivo).
  const esRecord = (bloque, row) => {
    if (row.querySelector('.btn-check-serie').getAttribute('data-checked') !== 'true') return false;
    const pr = prsAlAbrir[(bloque.dataset.ejNombre || '').toLowerCase().trim()];
    if (!pr) return false;
    const peso = parseFloat(row.querySelector('.serie-peso').value) || 0;
    const reps = parseFloat(row.querySelector('.serie-reps').value) || 0;
    return peso > pr.pesoMax || (peso === 0 && pr.pesoMax === 0 && reps > pr.repsMax);
  };
  const formatoKg = (n) => Number(n).toLocaleString('es-CL', { maximumFractionDigits: 1 });

  // Riel: progreso de cada pestaña ("2/3") y ✓ en las terminadas.
  const actualizarRiel = () => {
    bloquesSesion().forEach(b => {
      const tab = document.querySelector(`.sesion-tab[data-ej-idx="${b.dataset.ejIdx}"]`);
      if (!tab) return;
      const total = b.querySelectorAll('.btn-check-serie').length;
      const hechas = total - pendientesDe(b);
      const terminada = total > 0 && hechas === total;
      tab.querySelector('.sesion-tab-prog').textContent = `${hechas}/${total}`;
      tab.classList.toggle('sesion-tab--hecha', terminada);
      tab.querySelector('.sesion-tab-check').hidden = !terminada;
    });
  };

  // HUD: tiempo (lo mueve el intervalo), series hechas/total, volumen con la
  // variación contra la última sesión de esta rutina, récords y la barra
  // segmentada (una marca por serie; cian = hecha, ámbar = récord, borde
  // cian = la que toca). Se actualiza en cada cambio, sin repintar la sesión.
  const actualizarHud = () => {
    const seriesEl = document.getElementById('hud-series');
    if (!seriesEl) return;
    const bloques = Array.from(document.querySelectorAll('.ejercicio-sesion-block'));
    let total = 0, hechas = 0;
    const marcadas = [];
    const records = new Map(); // nombre -> { valor, ts }
    bloques.forEach(b => b.querySelectorAll('.serie-row').forEach(row => {
      total++;
      if (row.querySelector('.btn-check-serie').getAttribute('data-checked') !== 'true') return;
      hechas++;
      marcadas.push({ peso: row.querySelector('.serie-peso').value, reps: row.querySelector('.serie-reps').value });
      if (esRecord(b, row)) {
        const peso = parseFloat(row.querySelector('.serie-peso').value) || 0;
        const valor = peso > 0 ? formatoKg(peso) : `${parseInt(row.querySelector('.serie-reps').value) || 0} reps`;
        const ts = Number(row.dataset.marcadaTs || 0);
        const previo = records.get(b.dataset.ejNombre);
        if (!previo || ts >= previo.ts) records.set(b.dataset.ejNombre, { valor, ts });
      }
    }));
    seriesEl.textContent = `${hechas}/${total}`;
    const volumen = volumenDeSeries(marcadas);
    document.getElementById('hud-volumen').textContent = formatoKg(volumen);
    const varEl = document.getElementById('hud-volumen-var');
    if (volumenRutinaPrevio && volumen > 0) {
      const pct = Math.round(((volumen - volumenRutinaPrevio) / volumenRutinaPrevio) * 100);
      varEl.textContent = `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)} %`;
      varEl.classList.toggle('sesion-hud-var--sube', pct >= 0);
      varEl.hidden = false;
    } else {
      varEl.hidden = true;
    }
    document.getElementById('hud-records').textContent = String(records.size);
    const ultimo = [...records.entries()].sort((a, b) => b[1].ts - a[1].ts)[0];
    document.getElementById('hud-record-ultimo').textContent = ultimo ? ` · ${ultimo[0].replace(/\s*\(.*\)\s*/g, ' ').trim()} ${ultimo[1].valor}` : '';

    // La que toca: la primera sin marcar del ejercicio activo; si ese ya
    // terminó, la primera sin marcar de la sesión.
    const pendientes = (b) => Array.from(b.querySelectorAll('.serie-row')).filter(r => r.querySelector('.btn-check-serie').getAttribute('data-checked') !== 'true');
    const activo = bloques.find(b => Number(b.dataset.ejIdx) === ejercicioActivo);
    const toca = (activo && pendientes(activo)[0]) || bloques.map(b => pendientes(b)[0]).find(Boolean) || null;
    const segs = [];
    bloques.forEach((b, bi) => {
      b.querySelectorAll('.serie-row').forEach((row, ri) => {
        const hecha = row.querySelector('.btn-check-serie').getAttribute('data-checked') === 'true';
        const clase = hecha ? (esRecord(b, row) ? 'record' : 'hecha') : (row === toca ? 'toca' : 'pendiente');
        segs.push(`<span class="sesion-hud-seg sesion-hud-seg--${clase}${ri === 0 && bi > 0 ? ' sesion-hud-seg--nuevo' : ''}"></span>`);
      });
    });
    const segEl = document.getElementById('hud-segmentos');
    segEl.innerHTML = segs.join('');
    segEl.setAttribute('aria-label', `${hechas} de ${total} series hechas${records.size ? `, ${records.size} ${records.size === 1 ? 'récord' : 'récords'}` : ''}`);
  };

  // --- Un ejercicio a la vez (fase 4) -----------------------------------
  // Todos los .ejercicio-sesion-block siguen en el DOM (Finalizar, el
  // borrador y "Añadir ejercicio" los leen igual); solo se ve el activo.
  const bloquesSesion = () => Array.from(document.querySelectorAll('.ejercicio-sesion-block'));
  const pendientesDe = (b) => Array.from(b.querySelectorAll('.btn-check-serie')).filter(c => c.getAttribute('data-checked') !== 'true').length;
  let avanzarTrasDescanso = null; // índice del ejercicio que terminó; al acabar el descanso pasa al siguiente

  const mostrarEjercicio = (idx, { foco = false } = {}) => {
    const bloques = bloquesSesion();
    if (!bloques.length) return;
    const destino = bloques.find(b => Number(b.dataset.ejIdx) === idx) || bloques[0];
    ejercicioActivo = Number(destino.dataset.ejIdx);
    avanzarTrasDescanso = null;
    bloques.forEach(b => { b.hidden = b !== destino; });
    document.querySelectorAll('.sesion-tab[data-ej-idx]').forEach(t => {
      const activa = Number(t.dataset.ejIdx) === ejercicioActivo;
      t.classList.toggle('sesion-tab--activa', activa);
      t.setAttribute('aria-selected', String(activa));
      t.tabIndex = activa ? 0 : -1;
      if (activa) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    const pos = bloques.indexOf(destino);
    document.querySelectorAll('#sesion-puntos span').forEach((p, i) => p.classList.toggle('activo', i === pos));
    const ant = document.getElementById('btn-ej-anterior');
    const sig = document.getElementById('btn-ej-siguiente');
    if (ant) ant.disabled = pos === 0;
    if (sig) sig.disabled = pos === bloques.length - 1;
    document.getElementById('view-root')?.scrollTo(0, 0);
    if (foco) document.querySelector(`.sesion-tab[data-ej-idx="${ejercicioActivo}"]`)?.focus();
    guardar();
  };
  const moverEjercicio = (delta) => {
    const bloques = bloquesSesion();
    const pos = bloques.findIndex(b => Number(b.dataset.ejIdx) === ejercicioActivo);
    const destino = bloques[pos + delta];
    if (destino) mostrarEjercicio(Number(destino.dataset.ejIdx));
  };
  // Siguiente ejercicio después de uno terminado: el próximo en la rutina;
  // si era el último, el primero que tenga series pendientes.
  const pasarAlSiguiente = (desdeIdx) => {
    const bloques = bloquesSesion();
    const pos = bloques.findIndex(b => Number(b.dataset.ejIdx) === desdeIdx);
    const siguiente = bloques[pos + 1] || bloques.find(b => pendientesDe(b) > 0);
    if (siguiente && Number(siguiente.dataset.ejIdx) !== desdeIdx) mostrarEjercicio(Number(siguiente.dataset.ejIdx));
  };

  document.querySelectorAll('.sesion-tab[data-ej-idx]').forEach(t => {
    t.addEventListener('click', () => mostrarEjercicio(Number(t.dataset.ejIdx)));
  });
  // Teclado en el riel: flechas izquierda/derecha.
  document.getElementById('sesion-riel')?.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (!e.target.closest('.sesion-tab[data-ej-idx]')) return;
    e.preventDefault();
    moverEjercicio(e.key === 'ArrowRight' ? 1 : -1);
    document.querySelector(`.sesion-tab[data-ej-idx="${ejercicioActivo}"]`)?.focus();
  }, { signal });
  document.getElementById('btn-ej-anterior')?.addEventListener('click', () => moverEjercicio(-1), { signal });
  document.getElementById('btn-ej-siguiente')?.addEventListener('click', () => moverEjercicio(1), { signal });

  // Deslizar a izquierda/derecha sobre el ejercicio: solo si el gesto es
  // claramente horizontal (más de 60 px y el doble de lo vertical), así no
  // compite con el scroll vertical.
  const zonaSwipe = document.getElementById('sesion-ejercicios');
  if (zonaSwipe) {
    let inicioToque = null;
    zonaSwipe.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { inicioToque = null; return; }
      inicioToque = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true, signal });
    zonaSwipe.addEventListener('touchend', (e) => {
      if (!inicioToque) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - inicioToque.x;
      const dy = t.clientY - inicioToque.y;
      inicioToque = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) moverEjercicio(dx < 0 ? 1 : -1);
    }, { passive: true, signal });
  }

  const guardar = () => {
    if (!document.getElementById('btn-finalizar-sesion')) return; // la vista ya no está
    actualizarHud();
    actualizarRiel();
    guardarBorrador({
      rutinaId: rutina.id,
      nombreRutina: rutina.nombre,
      categoria: rutina.categoria,
      inicio: startTime.getTime(),
      ejercicios: leerEjerciciosDelDom(),
      ejercicioActivo
    });
  };
  const marcarActivo = (el) => {
    const bloque = el && el.closest && el.closest('.ejercicio-sesion-block');
    if (bloque) ejercicioActivo = Number(bloque.dataset.ejIdx);
  };
  document.addEventListener('input', (e) => {
    if (!e.target.closest || !e.target.closest('.ejercicio-sesion-block')) return;
    marcarActivo(e.target);
    guardar();
  }, { signal });
  document.addEventListener('change', (e) => {
    if (!e.target.closest || !e.target.closest('.ejercicio-sesion-block')) return;
    marcarActivo(e.target);
    guardar();
  }, { signal });

  // Mapa muscular en vivo: parte de la fatiga ya acumulada por sesiones
  // anteriores (calculada una sola vez al abrir esta vista — el decaimiento
  // en una ventana de 48h no cambia de forma perceptible en el rato que dura
  // una sesión) y le suma encima, sin esperar a "Finalizar Sesión", el
  // volumen de las series que se van marcando ahora mismo. El estado de
  // "serie marcada" durante una sesión en curso vive solo en el DOM
  // (data-checked, ver wireSerieRow más abajo) — no se persiste serie por
  // serie en el log de eventos (registrarSesion en db.js emite un único
  // evento sesion_registrada al terminar), así que se lee de ahí en vez de
  // inventar un evento nuevo solo para esto.
  // HUD: dos mapas mini (frente y espalda) con la misma fatiga en vivo.
  const mapasHud = [];
  let fatigaBasePorGrupo = {};
  const mapaFrenteEl = document.getElementById('hud-mapa-frente');
  const mapaEspaldaEl = document.getElementById('hud-mapa-espalda');
  if (mapaFrenteEl && mapaEspaldaEl) {
    mapasHud.push(new MuscleMap(mapaFrenteEl, { vista: VISTA.FRENTE, intensidades: {}, claseContenedor: 'mk3-muscle-map--hud' }));
    mapasHud.push(new MuscleMap(mapaEspaldaEl, { vista: VISTA.ESPALDA, intensidades: {}, claseContenedor: 'mk3-muscle-map--hud' }));
    if (signal) signal.addEventListener('abort', () => mapasHud.forEach(m => m.destroy()));

    db.getEventosEjercicioPorCategoria(rutina.categoria).then(eventos => {
      fatigaBasePorGrupo = sumarFatigaPorGrupo(
        eventos,
        (entidadId, payload) => { const c = grupoMuscularParaMapa(payload.grupoMuscular); return c ? [c] : []; },
        (payload) => payload.series || 0
      );
      recalcularMapaSesion();
    });
  }

  function recalcularMapaSesion() {
    if (!mapasHud.length) return;
    const enVivoPorGrupo = {};
    document.querySelectorAll('.ejercicio-sesion-block').forEach(bloque => {
      const nombre = bloque.dataset.ejNombre;
      if (!nombre) return;
      const clave = grupoMuscularParaMapa(metadataDeEjercicio(nombre, bloque.getAttribute('data-ej-id')).grupoMuscular);
      if (!clave) return;
      const seriesMarcadas = bloque.querySelectorAll('.btn-check-serie[data-checked="true"]').length;
      if (seriesMarcadas <= 0) return;
      enVivoPorGrupo[clave] = (enVivoPorGrupo[clave] || 0) + seriesMarcadas;
    });

    const combinado = { ...fatigaBasePorGrupo };
    for (const [grupo, series] of Object.entries(enVivoPorGrupo)) {
      combinado[grupo] = (combinado[grupo] || 0) + series;
    }
    // Misma escala fija que calcularFatigaPorGrupo (FATIGA_REFERENCIA), no
    // el máximo dinámico entre grupos: si no, entrenar un solo grupo lo deja
    // "al máximo" toda la ventana de 48h en vez de apagarse gradual.
    const fatigaNormalizada = {};
    for (const [grupo, val] of Object.entries(combinado)) fatigaNormalizada[grupo] = Math.min(1, val / FATIGA_REFERENCIA);

    const porMusculo = expandirIntensidadPorMusculo(fatigaNormalizada, GRUPOS_MUSCULARES);
    mapasHud.forEach(m => m.setIntensidades(porMusculo));
  }

  const btnRestConfig = document.getElementById('btn-rest-timer-config');
  if (btnRestConfig) {
    btnRestConfig.addEventListener('click', () => {
      document.querySelectorAll('.rest-timer-config-popover').forEach(p => p.remove());

      const popover = document.createElement('div');
      popover.className = 'rest-timer-config-popover';
      popover.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px;">Tiempo de descanso</div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
          <button type="button" class="btn-rest-minus" style="width: 36px; height: 36px; border-radius: 50%; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 18px; font-weight: 700; cursor: pointer;">−</button>
          <span class="rest-config-display num" style="font-size: 20px; font-weight: 800; color: var(--text-primary); min-width: 48px; text-align: center;">${currentRestTimerSecs}s</span>
          <button type="button" class="btn-rest-plus" style="width: 36px; height: 36px; border-radius: 50%; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 18px; font-weight: 700; cursor: pointer;">+</button>
        </div>
      `;
      popover.style.position = 'absolute';
      popover.style.top = '100%';
      popover.style.right = '0';
      popover.style.marginTop = '6px';
      popover.style.width = '220px';
      popover.style.background = 'var(--surface-2)';
      popover.style.padding = '14px';
      popover.style.borderRadius = '14px';
      popover.style.border = '1px solid var(--accent-teal)';
      popover.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
      popover.style.zIndex = '30';

      btnRestConfig.parentElement.style.position = 'relative';
      btnRestConfig.parentElement.appendChild(popover);

      const display = popover.querySelector('.rest-config-display');
      const valueLabel = document.getElementById('rest-timer-config-value');
      const applyDelta = async (delta) => {
        currentRestTimerSecs = Math.max(15, currentRestTimerSecs + delta);
        display.textContent = `${currentRestTimerSecs}s`;
        if (valueLabel) valueLabel.textContent = currentRestTimerSecs;
        await db.setRestTimerSecs(currentRestTimerSecs);
      };
      popover.querySelector('.btn-rest-minus').addEventListener('click', () => applyDelta(-15));
      popover.querySelector('.btn-rest-plus').addEventListener('click', () => applyDelta(15));

      setTimeout(() => popover.remove(), 6000);
    }, { signal });
  }

  const timerDisplay = document.getElementById('session-timer');
  timerInterval = setInterval(() => {
    const diff = Math.floor((new Date() - startTime) / 1000);
    const m = String(Math.floor(diff / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;
  }, 1000);

  const floatEl = document.getElementById('floating-rest-timer');
  const textEl = document.getElementById('rest-timer-text');

  if (floatEl) {
    floatEl.addEventListener('click', () => {
      if (restTimerInterval) clearInterval(restTimerInterval);
      floatEl.style.display = 'none';
      alTerminarDescanso();
    });
  }

  // Al terminar (o cerrar) el descanso, si el ejercicio activo quedó
  // terminado, se pasa al siguiente.
  const alTerminarDescanso = () => {
    if (avanzarTrasDescanso !== null && avanzarTrasDescanso === ejercicioActivo) pasarAlSiguiente(avanzarTrasDescanso);
    avanzarTrasDescanso = null;
  };

  const startRestTimer = (seconds) => {
    if (!floatEl || !textEl) return;
    if (restTimerInterval) clearInterval(restTimerInterval);

    let timeRemaining = seconds;
    floatEl.style.display = 'flex';
    const mInit = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sInit = String(seconds % 60).padStart(2, '0');
    textEl.innerText = `${mInit}:${sInit}`;

    restTimerInterval = setInterval(() => {
      timeRemaining--;
      if (timeRemaining <= 0) {
        clearInterval(restTimerInterval);
        floatEl.style.display = 'none';
        playBeep();
        alTerminarDescanso();
      } else {
        const m = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
        const s = String(timeRemaining % 60).padStart(2, '0');
        textEl.innerText = `${m}:${s}`;
      }
    }, 1000);
  };


  document.querySelectorAll('.btn-sugerencia').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const peso = parseFloat(btn.getAttribute('data-peso')) || 0;
      const reps = parseInt(btn.getAttribute('data-reps')) || 0;

      const card = btn.closest('.ejercicio-sesion-block');
      const rows = card.querySelectorAll('.serie-row');
      rows.forEach(row => {
        const checkBtn = row.querySelector('.btn-check-serie');
        if (checkBtn.getAttribute('data-checked') !== 'true') {
          if (peso > 0) row.querySelector('.serie-peso').value = peso;
          if (reps > 0) row.querySelector('.serie-reps').value = reps;
        }
      });

      marcarActivo(btn);
      guardar();

      const originalHtml = btn.innerHTML;
      btn.innerHTML = '✓ Aplicado';
      btn.style.borderColor = 'var(--state-success)';
      btn.style.color = 'var(--state-success)';
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.style.borderColor = 'var(--accent-teal)';
        btn.style.color = 'var(--accent-teal)';
      }, 2000);
    });
  });


  document.querySelectorAll('.btn-info-ejercicio').forEach(btn => {
    btn.addEventListener('click', () => {
      const nombre = btn.getAttribute('data-ejnombre');
      const meta = metadataDeEjercicio(nombre);
      if (!meta) return;

      const pasosHtml = (meta.pasosEjecucion && meta.pasosEjecucion.length)
        ? `<ol style="margin: 6px 0 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px;">${meta.pasosEjecucion.map(p => `<li style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">${p}</li>`).join('')}</ol>`
        : '';
      const erroresHtml = (meta.erroresComunes && meta.erroresComunes.length)
        ? `<ul style="margin: 6px 0 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px;">${meta.erroresComunes.map(er => `<li style="font-size: 13px; color: var(--state-high); line-height: 1.4;">${er}</li>`).join('')}</ul>`
        : '';

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay open';
      overlay.style.zIndex = '6000';
      overlay.innerHTML = `
        <div class="modal-content" style="max-height: 80vh; overflow-y: auto; padding: 22px;">
          <div class="flex-between" style="margin-bottom: 14px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.3px; color: var(--text-primary);">${escapeHtml(nombre)}</h3>
            <button id="btn-close-tecnica" aria-label="Cerrar" style="background: transparent; border: none; color: var(--text-disabled); font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
          </div>
          ${meta.posturaInicial ? `
            <div style="margin-bottom: 14px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--accent-teal); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Postura inicial</div>
              <div style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">${meta.posturaInicial}</div>
            </div>
          ` : ''}
          ${pasosHtml ? `
            <div style="margin-bottom: 14px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--accent-teal); text-transform: uppercase; letter-spacing: 0.5px;">Ejecución</div>
              ${pasosHtml}
            </div>
          ` : ''}
          ${erroresHtml ? `
            <div style="margin-bottom: ${meta.musculoSecundario ? '14px' : '0'};">
              <div style="font-size: 11px; font-weight: 700; color: var(--state-high); text-transform: uppercase; letter-spacing: 0.5px;">Errores comunes</div>
              ${erroresHtml}
            </div>
          ` : ''}
          ${meta.musculoSecundario ? `<div style="font-size: 11px; color: var(--text-secondary);">Músculos secundarios: ${meta.musculoSecundario}</div>` : ''}
        </div>
      `;

      const rootDiv = document.querySelector('#view-root > div') || document.body;
      rootDiv.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.querySelector('#btn-close-tecnica').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    });
  });

  document.querySelectorAll('.btn-ver-progreso').forEach(btn => {
    btn.addEventListener('click', () => {
      const nombre = btn.getAttribute('data-ejnombre');
      const containerId = 'progreso-container-' + idSafeFragment(nombre);
      const chartCanvasId = containerId + '-chart';
      const container = document.getElementById(containerId);
      if (container.style.display === 'none') {
        const hist = currentHistorial[nombre];
        container.innerHTML = renderEjercicioDetalle(nombre, hist, chartCanvasId);
        container.style.display = 'block';
        initEjercicioDetalleChart(chartCanvasId, hist);
      } else {
        container.style.display = 'none';
      }
    });
  });

  document.querySelectorAll('.btn-plate-calc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // El botón vive en el header del ejercicio, no dentro de una fila de
      // serie (closest('.serie-row') siempre daba null acá y tiraba el
      // click entero) — usamos el peso más alto entre las series de este
      // ejercicio, que es el caso de uso real de una calculadora de discos
      // (cargar la barra para la serie de trabajo, no una de calentamiento).
      const card = btn.closest('.ejercicio-sesion-block');
      let peso = 0;
      if (card) {
        card.querySelectorAll('.serie-row').forEach(row => {
          const p = parseFloat(row.querySelector('.serie-peso').value) || 0;
          if (p > peso) peso = p;
        });
      }

      const discos = calcularDiscos(peso);
      const html = renderPlateCalculatorPopover(discos, 20);

      const popover = document.createElement('div');
      popover.innerHTML = html;
      popover.style.position = 'absolute';
      popover.style.bottom = '110%';
      popover.style.right = '0';
      popover.style.background = 'var(--surface-2)';
      popover.style.padding = '10px';
      popover.style.borderRadius = '12px';
      popover.style.border = '1px solid var(--surface-border)';
      popover.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
      popover.style.zIndex = '20';

      document.querySelectorAll('.plate-popover').forEach(p => p.remove());

      popover.className = 'plate-popover';
      btn.parentElement.appendChild(popover);

      setTimeout(() => popover.remove(), 4000);
    });
  });

  // Cierra cualquier popover de tipo-de-serie abierto (uno a la vez).
  const closeTipoPopovers = () => document.querySelectorAll('.tipo-serie-popover').forEach(p => p.remove());

  // Todo el cableado de una fila de serie (hint de 1RM, popover de tipo,
  // toggle del check + chequeo de PR en vivo). Se usa tanto en el cableado
  // inicial de todas las filas como al agregar una serie nueva en vivo.
  const wireSerieRow = (row) => {
    const hint = row.nextElementSibling;
    const pesoInput = row.querySelector('.serie-peso');
    const repsInput = row.querySelector('.serie-reps');

    if (hint && hint.classList.contains('serie-1rm-hint')) {
      const updateHint = () => {
        const peso = parseFloat(pesoInput.value) || 0;
        const reps = parseInt(repsInput.value) || 0;
        if (peso > 0 && reps > 0) {
          hint.textContent = `1RM est. ~${db.estimar1RM(peso, reps)}kg`;
          hint.style.display = '';
        } else {
          hint.style.display = 'none';
        }
      };
      pesoInput.addEventListener('input', updateHint);
      repsInput.addEventListener('input', updateHint);
    }

    const tipoSelect = row.querySelector('.serie-tipo');
    const tipoChip = row.querySelector('.serie-tipo-chip');
    if (tipoChip && tipoSelect) {
      tipoChip.addEventListener('click', (e) => {
        e.stopPropagation();
        const alreadyOpen = row.querySelector('.tipo-serie-popover');
        closeTipoPopovers();
        if (alreadyOpen) return; // click de nuevo sobre el mismo chip = solo cerrar

        const popover = document.createElement('div');
        popover.className = 'tipo-serie-popover';
        popover.style.cssText = 'position:absolute; top:calc(100% + 4px); left:0; z-index:50; background:var(--surface-2); border:1px solid var(--surface-border); box-shadow:0 8px 24px rgba(0,0,0,0.5); padding:4px; display:flex; flex-direction:column; gap:2px; min-width:140px;';
        popover.innerHTML = Object.keys(TIPO_LABELS).map(t =>
          `<button type="button" class="tappable" data-tipo="${t}" style="text-align:left; padding:8px 10px; background:transparent; border:none; color:${TIPO_COLORS[t].color}; font-size:13px; font-weight:600; cursor:pointer;">${TIPO_LABELS[t]}</button>`
        ).join('');
        row.appendChild(popover);

        popover.querySelectorAll('button[data-tipo]').forEach(optBtn => {
          optBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const tipo = optBtn.getAttribute('data-tipo');
            tipoSelect.value = tipo;
            tipoSelect.dispatchEvent(new Event('change', { bubbles: true }));
            const tc = TIPO_COLORS[tipo];
            tipoChip.style.background = tc.bg;
            tipoChip.style.borderColor = tc.border;
            tipoChip.style.color = tc.color;
            tipoChip.setAttribute('data-tipo', tipo);
            tipoChip.title = TIPO_LABELS[tipo];
            popover.remove();
          });
        });

        setTimeout(closeTipoPopovers, 6000);
      });
    }

    const btn = row.querySelector('.btn-check-serie');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      const isChecked = btn.getAttribute('data-checked') === 'true';
      marcarActivo(btn);
      if (isChecked) {
        btn.setAttribute('data-checked', 'false');
        btn.style.background = 'var(--surface-2)';
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderColor = 'var(--text-secondary)';
      } else {
        btn.setAttribute('data-checked', 'true');
        row.dataset.marcadaTs = String(Date.now());
        btn.style.background = 'var(--state-success)';
        btn.style.color = '#000';
        btn.style.borderColor = 'var(--state-success)';

        // Live PR Check
        const ejContainer = row.closest('.card');
        const ejNombre = ejContainer.querySelector('h3').innerText;

        // Superserie: sin descanso ENTRE los ejercicios agrupados — el
        // timer arranca recién al completar una serie del ÚLTIMO ejercicio
        // de la corrida (el siguiente bloque no comparte su grupoId, o no
        // hay siguiente). Un ejercicio suelto (sin grupoId) siempre dispara
        // el timer, como antes.
        //
        // nextElementSibling literal NO alcanza acá: los bloques están
        // agrupados por grupo muscular arriba en el render, así que dos
        // ejercicios de una misma superserie que caen en secciones
        // distintas (ej. pecho + bíceps, un caso común de superserie) tienen
        // el div de encabezado de sección de por medio — el "siguiente
        // hermano" real sería ESE encabezado, no el próximo ejercicio, lo
        // que disparaba el descanso después del primero igual. Se busca el
        // siguiente .ejercicio-sesion-block en orden del documento en vez
        // de en el árbol del DOM.
        const grupoId = ejContainer.dataset.grupoId;
        const bloquesOrden = Array.from(document.querySelectorAll('.ejercicio-sesion-block'));
        const siguienteBloque = bloquesOrden[bloquesOrden.indexOf(ejContainer) + 1] || null;
        const esUltimoDeLaSuperserie = !grupoId || !siguienteBloque || siguienteBloque.dataset.grupoId !== grupoId;
        if (esUltimoDeLaSuperserie) startRestTimer(currentRestTimerSecs);
        // Última serie del ejercicio: pasa solo al siguiente; al instante si
        // es una superserie (sin descanso entre ellos), si no al terminar el
        // descanso.
        if (pendientesDe(ejContainer) === 0) {
          const idxTerminado = Number(ejContainer.dataset.ejIdx);
          if (!esUltimoDeLaSuperserie) setTimeout(() => pasarAlSiguiente(idxTerminado), 350);
          else avanzarTrasDescanso = idxTerminado;
        }
        const pesoVal = parseFloat(pesoInput.value) || 0;
        const repsVal = parseFloat(repsInput.value) || 0;

        const pr = currentPRs[ejNombre.toLowerCase().trim()];
        if (pr) {
          let isPR = false;
          if (pesoVal > pr.pesoMax) isPR = true;
          else if (pesoVal === 0 && pr.pesoMax === 0 && repsVal > pr.repsMax) isPR = true;

          if (isPR) {
            const prevPeso = pr.pesoMax;
            const prevReps = pr.repsMax;

            const badge = document.createElement('div');
            badge.innerHTML = `${trophySvgSm}Nuevo PR`;
            badge.style.position = 'absolute';
            badge.style.top = '-16px';
            badge.style.right = '40px';
            badge.style.background = 'var(--accent-teal)';
            badge.style.color = '#000';
            badge.style.fontSize = '10px';
            badge.style.fontWeight = 'bold';
            badge.style.padding = '3px 8px';
            badge.style.borderRadius = '10px';
            badge.style.display = 'flex';
            badge.style.alignItems = 'center';
            badge.style.zIndex = '10';

            row.appendChild(badge);

            const mensaje = pesoVal > 0
              ? (prevPeso > 0
                  ? `🏆 ¡Nuevo récord! ${pesoVal}kg en ${escapeHtml(ejNombre)}, superaste tus ${prevPeso}kg anteriores.`
                  : `🏆 ¡Nuevo récord! ${pesoVal}kg en ${escapeHtml(ejNombre)}.`)
              : (prevReps > 0
                  ? `🏆 ¡Nuevo récord! ${repsVal} reps en ${escapeHtml(ejNombre)}, superaste tus ${prevReps} reps anteriores.`
                  : `🏆 ¡Nuevo récord! ${repsVal} reps en ${escapeHtml(ejNombre)}.`);
            Toast(mensaje, 'pr', 4000);

            pr.pesoMax = Math.max(pr.pesoMax, pesoVal);
            if (pesoVal === 0) pr.repsMax = Math.max(pr.repsMax, repsVal);
          }
        }
      }
      recalcularMapaSesion();
      guardar();
    });
  };

  document.querySelectorAll('.serie-row').forEach(wireSerieRow);
  document.addEventListener('click', closeTipoPopovers, { signal });

  document.querySelectorAll('.btn-add-serie').forEach(btn => {
    btn.addEventListener('click', () => {
      const seriesList = btn.previousElementSibling;
      if (!seriesList || !seriesList.classList.contains('series-list')) return;
      const rows = seriesList.querySelectorAll('.serie-row');
      const last = rows[rows.length - 1];
      const seed = last
        ? { tipo: 'normal', reps: last.querySelector('.serie-reps').value, peso: last.querySelector('.serie-peso').value, rpe: null, checked: false }
        : { tipo: 'normal', reps: '', peso: '', rpe: null, checked: false };
      seriesList.insertAdjacentHTML('beforeend', renderSerieRowHtml(seed, rows.length));
      const newRows = seriesList.querySelectorAll('.serie-row');
      wireSerieRow(newRows[newRows.length - 1]);
      marcarActivo(btn);
      guardar();
    }, { signal });
  });

  const openExercisePicker = () => abrirBuscadorEjercicios({ conId: true });

        const btnAddLive = document.getElementById('btn-add-ejercicio-live');
  if (btnAddLive) {
    btnAddLive.addEventListener('click', async () => {
      try {
        const elegido = await openExercisePicker();
        if (!elegido || !elegido.nombre || !elegido.nombre.trim()) return;

        // Lo que hay en pantalla, en el orden de la rutina (data-ej-idx).
        rutina.ejercicios = leerEjerciciosDelDom();

        // Del catálogo llega con su id; "Añadir de todas formas", con id null.
        rutina.ejercicios.push({ ejercicioId: elegido.id, nombre: elegido.nombre.trim(), series: [{reps: '', peso: ''}] });

        const subContent = document.getElementById('entrenamiento-sub-content');
        if (!subContent) throw new Error("subContent no existe");

        const newHtml = await renderRutinaSession(rutina);
        subContent.innerHTML = newHtml;
        // El cronómetro sigue desde el mismo inicio (antes se reiniciaba).
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        initRutinaSessionListeners(rutina, onSuccess, signal, { inicio: startTime.getTime(), ejercicioActivo: rutina.ejercicios.length - 1, onSalir: opciones.onSalir });
      } catch (err) {
        document.getElementById('entrenamiento-sub-content').innerHTML = "<div style='color:red; padding: 20px;'><h1>ERROR!</h1><p>" + err.message + "</p><pre>" + err.stack + "</pre></div>";
      }
    }, { signal });// Auto-apertura si es Entrenamiento Libre y está vacío
    if (rutina.nombre === 'Entrenamiento Libre' && rutina.ejercicios.length === 0) {
      setTimeout(() => {
        btnAddLive.click();
      }, 50);
    }
  }

  // ✕ de la barra superior: sale y el borrador queda. Con series marcadas
  // pregunta antes (Salir / Descartar sesión / Cancelar).
  document.getElementById('btn-sesion-salir')?.addEventListener('click', async () => {
    const salir = () => { if (opciones.onSalir) opciones.onSalir(); };
    if (!document.querySelector('.btn-check-serie[data-checked="true"]')) { salir(); return; }
    const eleccion = await preguntarOpciones({
      id: 'sesion-salir-modal',
      titulo: '¿Salir?',
      texto: 'Tu sesión queda guardada como borrador.',
      opciones: [
        { valor: 'salir', html: 'Salir', principal: true },
        { valor: 'descartar', html: 'Descartar sesión' },
        { valor: '', html: 'Cancelar', neutro: true }
      ]
    });
    if (!eleccion) return;
    if (eleccion === 'descartar') borrarBorrador();
    salir();
  }, { signal });

  const btnFinalizar = document.getElementById('btn-finalizar-sesion');
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', async () => {
      let duracionMin = Math.max(1, Math.floor((new Date() - startTime) / 60000));

      const ejerciciosLog = [];
      const bloques = document.querySelectorAll('.ejercicio-sesion-block');

      bloques.forEach(b => {
        const nombre = b.getAttribute('data-ej-nombre');
        // Sin data-ej-id (ejercicios de la rutina), registrarSesion lo
        // resuelve por nombre; con él va el id del catálogo o null (libre).
        const idAttr = b.getAttribute('data-ej-id');
        const ejercicioId = idAttr === null ? undefined : (idAttr || null);
        const seriesRows = b.querySelectorAll('.serie-row');
        const seriesCompletadas = [];

        seriesRows.forEach(row => {
          const btn = row.querySelector('.btn-check-serie');
          if (btn.getAttribute('data-checked') === 'true') {
            const tipo = row.querySelector('.serie-tipo').value;
            const reps = row.querySelector('.serie-reps').value;
            const peso = row.querySelector('.serie-peso').value;
            const rpe = row.querySelector('.serie-rpe').value ? parseInt(row.querySelector('.serie-rpe').value) : null;
            // checked: true explícito (solo se guardan las series marcadas):
            // sugerencias-nivel.js solo cuenta series marcadas.
            seriesCompletadas.push({ tipo, reps, peso, rpe, checked: true });
          }
        });

        if (seriesCompletadas.length > 0) {
          ejerciciosLog.push({ ...(ejercicioId !== undefined ? { ejercicioId } : {}), nombre, series: seriesCompletadas });
        }
      });

      if (ejerciciosLog.length === 0) {
        const confirmed = await ConfirmDialog('Terminar sesión vacía', 'No has completado ninguna serie — no se va a registrar nada.', { verb: 'Terminar', danger: false });
        if (!confirmed) {
          return;
        }
      }

      // Un borrador de más de 12 h (se retomó al día siguiente, o quedó
      // abierto): la duración real no suele ser la de la sesión.
      if (esBorradorLargo({ inicio: startTime.getTime() })) {
        const eleccion = await preguntarDuracionLarga(startTime, duracionMin);
        if (!eleccion) return;
        if (eleccion === '60') duracionMin = 60;
      }

      const summary = await askSessionSummary();

      cleanupSessionTimer();
      await db.registrarSesion({
        rutinaId: rutina.id,
        nombreRutina: rutina.nombre,
        duracionMin,
        completado: true,
        ejercicios: ejerciciosLog,
        rpe: summary.rpe,
        notas: summary.notas
      });
      borrarBorrador();

      if (onSuccess) onSuccess();
    });
  }

  // Estado inicial: una sesión recién empezada ya queda como borrador (salir
  // con Atrás no la destruye); una retomada vuelve a su ejercicio y el mapa
  // muscular refleja las series ya marcadas.
  guardar();
  recalcularMapaSesion();
  mostrarEjercicio(ejercicioActivo);
}

// Modal de opciones de la sesión (.modal-overlay con id: history.js le da
// su entrada, así Atrás lo cierra y resuelve null). Deja libre la barra
// inferior y el riel (layout.css). Resuelve el valor elegido o null.
function preguntarOpciones({ id, titulo, texto, opciones }) {
  return new Promise((resolve) => {
    document.getElementById(id)?.remove();
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '6000';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', id + '-titulo');
    const estilo = (o) => o.principal
      ? 'background: var(--cy); border: 1px solid var(--cy); color: var(--bg); font-weight: 800;'
      : o.neutro
        ? 'background: transparent; border: 1px solid var(--surface-border); color: var(--text-primary); font-weight: 700;'
        : 'background: transparent; border: 1px solid var(--cy); color: var(--cy); font-weight: 700;';
    overlay.innerHTML = `
      <div class="modal-content" style="padding: 22px;">
        <h3 id="${id}-titulo" style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: var(--text-primary);">${titulo}</h3>
        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.45; color: var(--text-secondary);">${texto}</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${opciones.map(o => `<button type="button" data-valor="${o.valor}" class="tappable" style="min-height: 44px; font: inherit; font-size: 14px; cursor: pointer; ${estilo(o)}">${o.html}</button>`).join('')}
        </div>
      </div>`;
    const rootDiv = document.querySelector('#view-root > div') || document.body;
    rootDiv.appendChild(overlay);
    overlay.classList.add('open');

    let listo = false;
    const terminar = async (valor) => {
      if (listo) return;
      listo = true;
      window.removeEventListener('popstate', alAtras);
      const porBoton = overlay.classList.contains('open');
      overlay.classList.remove('open');
      overlay.remove();
      // Cerrado por un botón: history.js suelta su entrada con un back()
      // asíncrono; se espera para que quien siga (salir, guardar) no lo pise.
      if (porBoton && history.state && history.state.modalId === id) {
        await new Promise(res => { const t = setTimeout(res, 500); window.addEventListener('popstate', () => { clearTimeout(t); res(); }, { once: true }); });
      }
      resolve(valor || null);
    };
    const alAtras = () => { if (!overlay.classList.contains('open')) terminar(null); };
    window.addEventListener('popstate', alAtras);
    overlay.querySelectorAll('button[data-valor]').forEach(b => b.addEventListener('click', () => terminar(b.dataset.valor)));
    requestAnimationFrame(() => overlay.querySelector('button[data-valor]')?.focus());
  });
}

// Duración de una sesión retomada después de más de 12 h: la real o 60 min.
function preguntarDuracionLarga(inicio, duracionRealMin) {
  const h = Math.floor(duracionRealMin / 60);
  const m = duracionRealMin % 60;
  const realTxt = h > 0 ? `${h} h ${m} min` : `${m} min`;
  const dia = inicio.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
  const hora = inicio.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  return preguntarOpciones({
    id: 'sesion-duracion-modal',
    titulo: '¿Qué duración guardo?',
    texto: `Esta sesión empezó el ${escapeHtml(dia)} <span class="num">${escapeHtml(formatFechaCorta(inicio))}</span> a las <span class="num">${escapeHtml(hora)}</span>, hace más de <span class="num">12</span> horas.`,
    opciones: [
      { valor: '60', html: 'Usar <span class="num">60</span> min', principal: true },
      { valor: 'real', html: `Usar la duración real · <span class="num">${realTxt}</span>` },
      { valor: '', html: 'Cancelar', neutro: true }
    ]
  });
}

export function cleanupSessionTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (restTimerInterval) {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
  }
  const floatEl = document.getElementById('floating-rest-timer');
  if (floatEl) floatEl.remove();
}