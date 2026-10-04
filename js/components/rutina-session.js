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
import { formatNumero } from '../utils/numero.js';
import { MuscleMap, sumarFatigaPorGrupo, expandirIntensidadPorMusculo, FATIGA_REFERENCIA } from './mk3-muscle-map.js';
import { VISTA, GRUPOS_MUSCULARES } from './mk3-muscle-map-data.js';

const trophySvgSm = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 3px;"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"></path><path d="M7 5H4a2 2 0 0 0 0 4h1M17 5h3a2 2 0 0 1 0 4h-1"></path></svg>`;
const trendUpSvg = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 3px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`;

let timerInterval = null;
let restTimerInterval = null;
// Wake Lock de la sesión (pantalla siempre encendida, fase 6).
let wakeLockActual = null;
function soltarPantallaEncendida() {
  const lock = wakeLockActual;
  wakeLockActual = null;
  if (lock && !lock.released) lock.release().catch(() => { /* ya suelto */ });
}
let startTime = null;

let currentPRs = {};
let currentSugerencias = {};
let currentHistorial = {};
let currentEstancamiento = {};
// Última vez que se hizo cada ejercicio (db.getUltimoRegistro): columna "Anterior".
let currentAnterior = {};
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

// Una fila de la tabla de series (fase 5): # (chip con el tipo de serie y su
// popover) · ANTERIOR (la serie con el mismo índice de la última vez) · KG ·
// REPS · RPE · ✓. Los inputs siguen siendo la fuente que leen Finalizar, el
// borrador y el HUD; el editor de abajo escribe en ellos.
// Reps es texto (con teclado numérico): las plantillas de Calistenia traen
// series por tiempo ("30s", "20s/lado") y un input type="number" las dejaba
// vacías (y se guardaban sin reps).
function renderSerieRowHtml(s, sIdx, anterior = null) {
  const tipo = s.tipo || 'normal';
  const tc = TIPO_COLORS[tipo] || TIPO_COLORS.normal;
  const n = sIdx + 1;
  const opcionTipo = (v, l) => `<option value="${v}" ${tipo === v ? 'selected' : ''}>${l}</option>`;
  const marcada = s.checked === true;
  return `
    <div class="serie-row">
      <select class="serie-tipo" hidden aria-hidden="true">${opcionTipo('normal', 'N')}${opcionTipo('calentamiento', 'C')}${opcionTipo('fallo', 'F')}${opcionTipo('dropset', 'D')}</select>
      <button type="button" class="serie-tipo-chip tappable" data-tipo="${tipo}" title="${TIPO_LABELS[tipo]}" aria-label="Serie ${n}, ${TIPO_LABELS[tipo]}. Cambiar tipo" style="background: ${tc.bg}; border: 1px solid ${tc.border}; color: ${tc.color};">${n}</button>
      <span class="serie-anterior num" title="La última vez">${textoAnterior(anterior)}</span>
      <input type="number" step="0.5" min="0" inputmode="decimal" class="serie-peso" value="${escapeHtml(String(s.peso ?? ''))}" aria-label="Kilos de la serie ${n}">
      <input type="text" inputmode="numeric" class="serie-reps" value="${escapeHtml(String(s.reps ?? ''))}" aria-label="Repeticiones o segundos de la serie ${n}">
      <select class="serie-rpe" aria-label="RPE de la serie ${n}">
        <option value="">-</option>
        ${[5, 6, 7, 8, 9, 10].map(v => `<option value="${v}" ${s.rpe == v ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      <button type="button" class="btn-check-serie" data-checked="${marcada ? 'true' : 'false'}" aria-label="Marcar la serie ${n} como hecha" style="background: ${marcada ? 'var(--state-success)' : 'var(--surface-2)'}; border: 1px solid ${marcada ? 'var(--state-success)' : 'var(--text-secondary)'}; color: ${marcada ? '#000' : 'var(--text-secondary)'};">✓</button>
    </div>
  `;
}

// "57,5×10" de la serie anterior ("10 reps" si fue sin peso); vacío si no hay.
function textoAnterior(serie) {
  if (!serie) return '';
  const peso = parseFloat(serie.peso) || 0;
  const reps = formatNumero(serie.reps, { textoSiNoEsNumero: true });
  if (!reps && !peso) return '';
  return peso > 0 ? `${formatNumero(peso)}×${reps}` : `${reps} reps`;
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
  currentAnterior = {};
  currentRestTimerSecs = await db.getRestTimerSecs();
  for (const ej of rutina.ejercicios) {
    currentHistorial[ej.nombre] = await db.getHistorialEjercicio(ej.nombre);
    currentSugerencias[ej.nombre] = await db.sugerirProgresion(ej.nombre);
    currentEstancamiento[ej.nombre] = await db.detectarEstancamiento(ej.nombre);
    currentAnterior[ej.nombre] = await db.getUltimoRegistro(ej.nombre);
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
      <div class="sesion-barra-menu-wrap">
        <button type="button" id="btn-sesion-menu" class="sesion-barra-salir tappable" aria-label="Opciones de la sesión" aria-haspopup="true" aria-expanded="false">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>
        </button>
        <div id="sesion-barra-menu" class="sesion-barra-menu" hidden>
          <div class="sesion-descanso-config">
            <span>Descanso</span>
            <button type="button" class="btn-rest-minus tappable" aria-label="Restar 15 segundos al descanso">−</button>
            <span class="sesion-descanso-config-valor"><span id="rest-timer-config-value" class="num">${currentRestTimerSecs}</span> s</span>
            <button type="button" class="btn-rest-plus tappable" aria-label="Sumar 15 segundos al descanso">+</button>
          </div>
        </div>
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
      <div id="hud-descanso" class="sesion-hud-descanso" hidden>
        <div class="sesion-descanso-fila">
          <div class="sesion-descanso-anillo">
            <svg viewBox="0 0 64 64" aria-hidden="true"><circle class="sesion-descanso-fondo" cx="32" cy="32" r="28"></circle><circle id="hud-descanso-arco" class="sesion-descanso-arco" cx="32" cy="32" r="28"></circle></svg>
            <div class="sesion-descanso-cuenta"><span id="hud-descanso-cuenta" class="num" role="timer">00:00</span><span class="sesion-descanso-de">de <span id="hud-descanso-total" class="num"></span></span></div>
          </div>
          <div class="sesion-descanso-info">
            <div class="sesion-descanso-etq">Descanso</div>
            <div id="hud-descanso-siguiente" class="sesion-descanso-siguiente"></div>
            <div class="sesion-descanso-btns">
              <button type="button" id="btn-descanso-menos" class="tappable" aria-label="Restar 15 segundos">−<span class="num">15</span></button>
              <button type="button" id="btn-descanso-mas" class="tappable" aria-label="Sumar 15 segundos">+<span class="num">15</span></button>
              <button type="button" id="btn-descanso-saltar" class="tappable">Saltar</button>
            </div>
          </div>
        </div>
        <div id="hud-descanso-resumen" class="sesion-descanso-resumen"></div>
      </div>
      <span id="hud-descanso-aviso" class="sesion-sr" aria-live="polite"></span>
      <div id="hud-segmentos" class="sesion-hud-segmentos" role="img" aria-label="Series de la sesión"></div>
    </section>
    ${renderRielEjercicios(rutina)}
    </div>
    <div class="sesion-cuerpo">
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
    const idx = rutina.ejercicios.indexOf(ej);
    const pr = currentPRs[ej.nombre.toLowerCase().trim()];
    const prog = getProgressionLevel(ej.nombre, ej.ejercicioId);
    const meta = metadataDeEjercicio(ej.nombre, ej.ejercicioId);
    const sug = currentSugerencias[ej.nombre];
    const estancado = currentEstancamiento[ej.nombre];
    const anterior = currentAnterior[ej.nombre];
    const tieneTecnica = meta && (meta.posturaInicial || (meta.pasosEjecucion && meta.pasosEjecucion.length));

    const esSegundoDelGrupo = !!ej.grupoId && gruposYaMostrados.has(ej.grupoId);
    if (ej.grupoId) gruposYaMostrados.add(ej.grupoId);
    const supChipHtml = esSegundoDelGrupo
      ? `<div style="margin-bottom: 8px;"><span class="badge badge--medium">SUPERSERIE · sin descanso entre estos dos</span></div>`
      : '';

    // Chips del ejercicio en una línea: récord, nivel de progresión,
    // sugerencia (toca para aplicar a las series sin marcar) y estancamiento.
    const chips = [];
    if (pr && pr.pesoMax > 0) {
      const rm = db.estimar1RM(pr.pesoMax, pr.repsMax || pr.repsEnPesoMax || 1);
      chips.push(`<span class="sesion-chip">${trophySvgSm}PR <span class="num">${formatNumero(pr.pesoMax)}</span> kg${rm > 0 ? ` · 1RM ~<span class="num">${formatNumero(rm)}</span> kg` : ''}</span>`);
    } else if (pr && pr.pesoMax === 0 && pr.repsMax > 0) {
      chips.push(`<span class="sesion-chip">${trophySvgSm}PR <span class="num">${formatNumero(pr.repsMax)}</span> reps</span>`);
    }
    if (prog) {
      chips.push(`<span class="sesion-chip">${trendUpSvg}${RAMA_LABELS[prog.familia] || prog.familia} · Nv.<span class="num">${prog.nivelActual}/${prog.nivelTotal}</span></span>`);
    }
    if (sug) {
      const sube = sug.accion === 'aumentar';
      const valor = sug.peso > 0 ? `<span class="num">${formatNumero(sug.peso)}</span> kg` : `<span class="num">${formatNumero(sug.reps)}</span> reps`;
      chips.push(`<button type="button" class="sesion-chip sesion-chip--accion btn-sugerencia tappable" data-ejnombre="${escapeHtml(ej.nombre)}" data-peso="${sug.peso}" data-reps="${sug.reps}" aria-label="Aplicar la sugerencia a las series sin marcar">${sube ? '↑ Sube' : '↓ Baja'} a ${valor}</button>`);
    }
    if (estancado) {
      chips.push(`<button type="button" class="sesion-chip sesion-chip--ambar btn-estancado tappable" aria-expanded="false">Estancado <span class="num">3</span> ses.</button>`);
    }

    html += `
      <div class="card ejercicio-sesion-block" id="sesion-ej-${idx}" role="tabpanel" data-ej-idx="${idx}" data-ej-nombre="${escapeHtml(ej.nombre)}"${ej.ejercicioId !== undefined ? ` data-ej-id="${escapeHtml(ej.ejercicioId || '')}"` : ''} data-grupo-id="${ej.grupoId || ''}"${esSegundoDelGrupo ? ' data-superserie-segundo="true"' : ''}>
        ${supChipHtml}
        <div class="sesion-ej-cabecera">
          <div class="sesion-ej-titulo">
            <div class="sesion-ej-rotulo">Ejercicio <span class="num">${idx + 1}</span> de <span class="num">${totalEjercicios}</span>${GRUPO_MUSCULAR_LABELS[meta.grupoMuscular] ? ` · ${GRUPO_MUSCULAR_LABELS[meta.grupoMuscular]}` : ''}</div>
            <h3>${escapeHtml(ej.nombre)}</h3>
          </div>
          <div class="sesion-ej-menu-wrap">
            <button type="button" class="btn-ej-menu tappable" aria-label="Más opciones de ${escapeHtml(ej.nombre)}" aria-haspopup="menu" aria-expanded="false">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>
            </button>
            <div class="sesion-ej-menu" role="menu" hidden>
              ${tieneTecnica ? `<button type="button" role="menuitem" class="btn-info-ejercicio" data-ejnombre="${escapeHtml(ej.nombre)}">Técnica</button>` : ''}
              <button type="button" role="menuitem" class="btn-ver-progreso" data-ejnombre="${escapeHtml(ej.nombre)}">Progreso</button>
              <button type="button" role="menuitem" class="btn-plate-calc">Calculadora de discos</button>
            </div>
          </div>
        </div>
        <div id="progreso-container-${idSafeFragment(ej.nombre)}" style="display: none; width: 100%; margin-bottom: 8px;"></div>
        ${chips.length ? `<div class="sesion-ej-chips">${chips.join('')}</div>` : ''}
        ${estancado ? `<p class="sesion-ej-estancado" hidden>Sin mejora en tus últimas <span class="num">3</span> sesiones: prueba variar las reps, el descanso o el ejercicio.</p>` : ''}
        <div class="serie-tabla-cab" aria-hidden="true"><span>#</span><span>Anterior</span><span>KG</span><span>Reps</span><span>RPE</span><span>✓</span></div>
        <div class="series-list" data-ejnombre="${escapeHtml(ej.nombre)}">
          ${ej.series.map((s, sIdx) => renderSerieRowHtml(s, sIdx, anterior && anterior.series ? anterior.series[sIdx] : null)).join('')}
        </div>
        <button type="button" class="btn-add-serie tappable">+ Serie</button>
        <div class="sesion-editor" aria-label="Serie que toca">
          <div class="sesion-editor-titulo">Serie <span class="num sesion-editor-n"></span><span class="sesion-editor-tipo"></span><span class="sesion-editor-1rm"></span></div>
          <div class="sesion-editor-campos">
            <div class="sesion-editor-campo">
              <span class="sesion-editor-etq">KG</span>
              <div class="sesion-editor-ctrl">
                <button type="button" class="sesion-editor-btn tappable" data-campo="peso" data-paso="-2.5" aria-label="Restar 2,5 kg">−</button>
                <output class="sesion-editor-valor num" data-campo="peso" tabindex="0" title="Mantén presionado para la calculadora de discos"></output>
                <button type="button" class="sesion-editor-btn tappable" data-campo="peso" data-paso="2.5" aria-label="Sumar 2,5 kg">+</button>
              </div>
            </div>
            <div class="sesion-editor-campo">
              <span class="sesion-editor-etq">Reps</span>
              <div class="sesion-editor-ctrl">
                <button type="button" class="sesion-editor-btn tappable" data-campo="reps" data-paso="-1" aria-label="Restar 1 repetición">−</button>
                <output class="sesion-editor-valor num" data-campo="reps"></output>
                <button type="button" class="sesion-editor-btn tappable" data-campo="reps" data-paso="1" aria-label="Sumar 1 repetición">+</button>
              </div>
            </div>
          </div>
          <div class="sesion-editor-rpe" role="group" aria-label="RPE de la serie">
            <span class="sesion-editor-etq">RPE</span>
            ${[6, 7, 8, 9, 10].map(v => `<button type="button" class="sesion-rpe-chip num tappable" data-rpe="${v}" aria-pressed="false">${v}</button>`).join('')}
          </div>
        </div>
      </div>`;
  }

  html += `</div>`;

  // Pie fijo abajo (zona del pulgar): ‹ · puntos · › y el botón principal.
  html += `
    <div class="sesion-pie" ${rutina.ejercicios.length ? '' : 'hidden'}>
      <div class="sesion-nav">
        <button type="button" id="btn-ej-anterior" class="sesion-nav-btn tappable" aria-label="Ejercicio anterior">‹ Anterior</button>
        <div id="sesion-puntos" class="sesion-puntos" aria-hidden="true">${rutina.ejercicios.map(() => '<span></span>').join('')}</div>
        <button type="button" id="btn-ej-siguiente" class="sesion-nav-btn tappable" aria-label="Ejercicio siguiente">Siguiente ›</button>
      </div>
      <button type="button" id="btn-sesion-principal" class="sesion-principal tappable"></button>
    </div>
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
  let descanso = null; // { hasta (ms), total (s) } mientras corre el descanso

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
    const toca = (activo && filaTocaDe(activo)) || bloques.map(b => pendientes(b)[0]).find(Boolean) || null;
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
  let avanzarTrasDescanso = null; // { desde, hacia }: al acabar el descanso se pasa a "hacia" (o al siguiente si es null)

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

  // --- Tabla, editor y botón principal (fase 5) --------------------------
  const esCalistenia = rutina.categoria === 'calistenia';
  const estaMarcada = (row) => row.querySelector('.btn-check-serie').getAttribute('data-checked') === 'true';
  // La fila que toca: la elegida (tocándola) si sigue sin marcar; si no, la
  // primera sin marcar del ejercicio. null si ya están todas hechas.
  const filaTocaDe = (b) => {
    if (!b) return null;
    const elegida = b.querySelector('.serie-row--toca');
    if (elegida && !estaMarcada(elegida)) return elegida;
    return Array.from(b.querySelectorAll('.serie-row')).find(r => !estaMarcada(r)) || null;
  };
  const fijarToca = (b, row) => {
    b.querySelectorAll('.serie-row--toca').forEach(r => r.classList.remove('serie-row--toca'));
    if (row) row.classList.add('serie-row--toca');
  };
  const bloqueActivo = () => bloquesSesion().find(b => Number(b.dataset.ejIdx) === ejercicioActivo) || null;
  // Corrida de superserie del bloque (bloques consecutivos con su grupoId).
  const corridaDe = (b) => {
    const g = b.dataset.grupoId;
    const bloques = bloquesSesion();
    if (!g) return [b];
    let i = bloques.indexOf(b), j = i;
    while (i > 0 && bloques[i - 1].dataset.grupoId === g) i--;
    while (j < bloques.length - 1 && bloques[j + 1].dataset.grupoId === g) j++;
    return bloques.slice(i, j + 1);
  };
  const nombreCorto = (n) => (n || '').replace(/\s*\(.*\)\s*/g, ' ').trim();
  const textoPeso = (v) => {
    const peso = parseFloat(v) || 0;
    if (peso === 0 && esCalistenia) return 'Corporal';
    return formatNumero(peso);
  };

  // Editor de la fila que toca: KG −/+ (2,5), REPS −/+ (1) y RPE 6–10.
  const actualizarEditor = (b) => {
    const ed = b.querySelector('.sesion-editor');
    if (!ed) return;
    const row = filaTocaDe(b);
    fijarToca(b, row);
    ed.classList.toggle('sesion-editor--vacio', !row);
    ed.querySelectorAll('button').forEach(x => { x.disabled = !row; });
    if (!row) {
      ed.querySelector('.sesion-editor-n').textContent = '';
      ed.querySelector('.sesion-editor-tipo').textContent = 'Todas las series hechas';
      ed.querySelector('.sesion-editor-1rm').textContent = '';
      ed.querySelectorAll('.sesion-editor-valor').forEach(o => { o.textContent = '–'; });
      ed.querySelectorAll('.sesion-rpe-chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      return;
    }
    const rows = Array.from(b.querySelectorAll('.serie-row'));
    const tipo = row.querySelector('.serie-tipo').value;
    const peso = row.querySelector('.serie-peso').value;
    const reps = row.querySelector('.serie-reps').value;
    const rpe = row.querySelector('.serie-rpe').value;
    ed.querySelector('.sesion-editor-n').textContent = String(rows.indexOf(row) + 1);
    ed.querySelector('.sesion-editor-tipo').textContent = tipo !== 'normal' ? ` · ${TIPO_LABELS[tipo]}` : '';
    const p = parseFloat(peso) || 0, r = parseInt(reps) || 0;
    const rm = p > 0 && r > 0 ? db.estimar1RM(p, r) : 0;
    ed.querySelector('.sesion-editor-1rm').innerHTML = rm > 0 ? ` · 1RM ~<span class="num">${formatNumero(rm)}</span> kg` : '';
    ed.querySelector('.sesion-editor-valor[data-campo="peso"]').textContent = textoPeso(peso);
    ed.querySelector('.sesion-editor-valor[data-campo="reps"]').textContent = formatNumero(reps, { textoSiNoEsNumero: true }) || '0';
    ed.querySelectorAll('.sesion-rpe-chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.rpe === rpe)));
  };

  // Botón principal: completar la serie que toca (en superserie, completar y
  // pasar al siguiente de la corrida), "Siguiente ejercicio" o "Finalizar".
  const actualizarPrincipal = () => {
    const btn = document.getElementById('btn-sesion-principal');
    if (!btn) return;
    const b = bloqueActivo();
    const bloques = bloquesSesion();
    const row = filaTocaDe(b);
    btn.classList.remove('sesion-principal--ss');
    btn.classList.toggle('sesion-principal--descanso', !!descanso);
    if (descanso) {
      // Atenuado: se puede seguir editando la serie siguiente; para seguir
      // antes de tiempo está "Saltar" en el HUD.
      btn.dataset.modo = 'descanso';
      btn.setAttribute('aria-disabled', 'true');
      btn.innerHTML = `Descansando… <span class="num">${mmss(restantes())}</span>`;
      return;
    }
    btn.removeAttribute('aria-disabled');
    if (b && row) {
      const n = Array.from(b.querySelectorAll('.serie-row')).indexOf(row) + 1;
      const peso = parseFloat(row.querySelector('.serie-peso').value) || 0;
      const repsTxt = formatNumero(row.querySelector('.serie-reps').value, { textoSiNoEsNumero: true }) || '0';
      const carga = peso > 0 ? `${formatNumero(peso)} kg × ${repsTxt}` : `${esCalistenia ? 'Corporal' : '0 kg'} × ${repsTxt}`;
      const corrida = corridaDe(b);
      const sig = corrida[corrida.indexOf(b) + 1];
      if (sig) {
        btn.dataset.modo = 'superserie';
        btn.classList.add('sesion-principal--ss');
        btn.textContent = `✓ Completar y pasar a ${nombreCorto(sig.dataset.ejNombre)} →`;
      } else {
        btn.dataset.modo = 'completar';
        btn.innerHTML = `✓ Completar serie <span class="num">${n}</span> · <span class="num">${escapeHtml(carga)}</span>`;
      }
    } else if (b && bloques.indexOf(b) < bloques.length - 1) {
      btn.dataset.modo = 'siguiente';
      btn.textContent = 'Siguiente ejercicio →';
    } else {
      btn.dataset.modo = 'finalizar';
      btn.textContent = 'Finalizar sesión';
    }
  };

  // Valor nuevo para un campo del editor: el paso sobre lo que tenga la fila
  // (reps por tiempo como "30s" conservan su sufijo). Nunca negativo.
  const pasoCampo = (valor, paso) => {
    const m = String(valor ?? '').match(/^(\d+(?:[.,]\d+)?)(.*)$/);
    const base = m ? parseFloat(m[1].replace(',', '.')) : 0;
    const sufijo = m ? m[2] : '';
    const nuevo = Math.max(0, Math.round((base + paso) * 100) / 100);
    return `${nuevo}${sufijo}`;
  };
  const escribir = (input, valor, evento = 'input') => {
    input.value = valor;
    input.dispatchEvent(new Event(evento, { bubbles: true }));
  };

  const zonaEjercicios = document.getElementById('sesion-ejercicios');
  if (zonaEjercicios) {
    zonaEjercicios.addEventListener('click', (e) => {
      const b = e.target.closest('.ejercicio-sesion-block');
      if (!b) return;
      const pasoBtn = e.target.closest('.sesion-editor-btn');
      if (pasoBtn) {
        const row = filaTocaDe(b);
        if (!row) return;
        const input = row.querySelector(pasoBtn.dataset.campo === 'peso' ? '.serie-peso' : '.serie-reps');
        escribir(input, pasoCampo(input.value, Number(pasoBtn.dataset.paso)));
        return;
      }
      const chipRpe = e.target.closest('.sesion-rpe-chip');
      if (chipRpe) {
        const row = filaTocaDe(b);
        if (!row) return;
        const sel = row.querySelector('.serie-rpe');
        escribir(sel, sel.value === chipRpe.dataset.rpe ? '' : chipRpe.dataset.rpe, 'change');
        return;
      }
      // Tocar una fila (fuera de ✓ y del chip de tipo) la vuelve la que toca.
      const row = e.target.closest('.serie-row');
      if (row && !e.target.closest('.btn-check-serie, .serie-tipo-chip, .tipo-serie-popover') && !estaMarcada(row)) {
        fijarToca(b, row);
        guardar();
      }
    }, { signal });
    zonaEjercicios.addEventListener('focusin', (e) => {
      const row = e.target.closest('.serie-row');
      const b = e.target.closest('.ejercicio-sesion-block');
      if (row && b && !estaMarcada(row) && e.target.matches('input, select')) { fijarToca(b, row); guardar(); }
    }, { signal });

    // Mantener presionado el KG del editor abre la calculadora de discos.
    let presion = null;
    zonaEjercicios.addEventListener('pointerdown', (e) => {
      const valor = e.target.closest('.sesion-editor-valor[data-campo="peso"]');
      if (!valor) return;
      const b = valor.closest('.ejercicio-sesion-block');
      presion = setTimeout(() => {
        const row = filaTocaDe(b);
        abrirCalculadora(b, row ? parseFloat(row.querySelector('.serie-peso').value) || 0 : 0);
      }, 500);
    }, { signal });
    const soltar = () => { clearTimeout(presion); presion = null; };
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => zonaEjercicios.addEventListener(ev, soltar, { signal }));
  }

  // Calculadora de discos (desde ⋯ o manteniendo presionado el KG).
  const abrirCalculadora = (b, peso) => {
    document.querySelectorAll('.plate-popover').forEach(p => p.remove());
    const popover = document.createElement('div');
    popover.className = 'plate-popover';
    popover.innerHTML = renderPlateCalculatorPopover(calcularDiscos(peso), 20);
    (b.querySelector('.sesion-editor') || b).appendChild(popover);
    setTimeout(() => popover.remove(), 4000);
  };

  // Menú ⋯ de cada ejercicio (Técnica, Progreso, Calculadora de discos).
  const cerrarMenus = () => document.querySelectorAll('.sesion-ej-menu').forEach(m => {
    m.hidden = true;
    m.parentElement.querySelector('.btn-ej-menu')?.setAttribute('aria-expanded', 'false');
  });
  document.querySelectorAll('.btn-ej-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = btn.parentElement.querySelector('.sesion-ej-menu');
      const abrir = menu.hidden;
      cerrarMenus();
      menu.hidden = !abrir;
      btn.setAttribute('aria-expanded', String(abrir));
      if (abrir) menu.querySelector('button')?.focus();
    });
  });
  document.querySelectorAll('.sesion-ej-menu button').forEach(item => item.addEventListener('click', () => setTimeout(cerrarMenus, 0)));
  document.addEventListener('click', (e) => { if (!e.target.closest('.sesion-ej-menu-wrap')) cerrarMenus(); }, { signal });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.sesion-ej-menu:not([hidden])')) { e.stopPropagation(); cerrarMenus(); } }, { signal, capture: true });

  // Chip de estancamiento: muestra el texto completo.
  document.querySelectorAll('.btn-estancado').forEach(btn => btn.addEventListener('click', () => {
    const p = btn.closest('.ejercicio-sesion-block').querySelector('.sesion-ej-estancado');
    if (!p) return;
    p.hidden = !p.hidden;
    btn.setAttribute('aria-expanded', String(!p.hidden));
  }));

  document.getElementById('btn-sesion-principal')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-sesion-principal');
    const b = bloqueActivo();
    const modo = btn.dataset.modo;
    if ((modo === 'completar' || modo === 'superserie') && b) {
      const row = filaTocaDe(b);
      if (!row) return;
      const corrida = corridaDe(b);
      const sig = modo === 'superserie' ? corrida[corrida.indexOf(b) + 1] : null;
      row.querySelector('.btn-check-serie').click();
      if (sig) mostrarEjercicio(Number(sig.dataset.ejIdx));
    } else if (modo === 'siguiente') {
      moverEjercicio(1);
    } else if (modo === 'finalizar') {
      document.getElementById('btn-finalizar-sesion')?.click();
    }
  }, { signal });

  const guardar = () => {
    if (!document.getElementById('btn-finalizar-sesion')) return; // la vista ya no está
    const activo = bloqueActivo();
    if (activo) actualizarEditor(activo);
    actualizarPrincipal();
    actualizarHud();
    actualizarRiel();
    pintarDescanso();
    guardarBorrador({
      rutinaId: rutina.id,
      nombreRutina: rutina.nombre,
      categoria: rutina.categoria,
      inicio: startTime.getTime(),
      ejercicios: leerEjerciciosDelDom(),
      ejercicioActivo,
      descanso: descanso ? { hasta: descanso.hasta, total: descanso.total, avanzar: avanzarTrasDescanso } : null
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


  const timerDisplay = document.getElementById('session-timer');
  timerInterval = setInterval(() => {
    const diff = Math.floor((new Date() - startTime) / 1000);
    const m = String(Math.floor(diff / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;
  }, 1000);

  // Al terminar (o saltar) el descanso: si el ejercicio activo quedó
  // terminado se pasa al siguiente (o, en superserie, de vuelta al primero
  // de la corrida con series pendientes).
  const alTerminarDescanso = () => {
    const pendiente = avanzarTrasDescanso;
    avanzarTrasDescanso = null;
    if (!pendiente || pendiente.desde !== ejercicioActivo) return;
    if (pendiente.hacia !== null) mostrarEjercicio(pendiente.hacia);
    else pasarAlSiguiente(pendiente.desde);
  };

  // --- Descanso dentro del HUD (fase 6) ---------------------------------
  // La cuenta va contra una hora de término (hasta), no tick a tick: sigue
  // siendo correcta si el navegador frena los temporizadores en segundo
  // plano y se guarda en el borrador (al recargar, sigue contando).
  const ARCO = 2 * Math.PI * 28;
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const mss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const restantes = () => (descanso ? Math.max(0, Math.ceil((descanso.hasta - Date.now()) / 1000)) : 0);

  // Lo que viene después del descanso: el ejercicio al que se va a pasar (o
  // el activo) y su serie que toca.
  const textoSiguiente = () => {
    let b = bloqueActivo();
    if (avanzarTrasDescanso && avanzarTrasDescanso.desde === ejercicioActivo) {
      const bloques = bloquesSesion();
      if (avanzarTrasDescanso.hacia !== null) b = bloques.find(x => Number(x.dataset.ejIdx) === avanzarTrasDescanso.hacia) || b;
      else {
        const pos = bloques.findIndex(x => Number(x.dataset.ejIdx) === avanzarTrasDescanso.desde);
        b = bloques[pos + 1] || bloques.find(x => pendientesDe(x) > 0) || b;
      }
    }
    const row = filaTocaDe(b);
    if (!b || !row) return 'Siguiente: terminar la sesión';
    const n = Array.from(b.querySelectorAll('.serie-row')).indexOf(row) + 1;
    const peso = parseFloat(row.querySelector('.serie-peso').value) || 0;
    const reps = formatNumero(row.querySelector('.serie-reps').value, { textoSiNoEsNumero: true }) || '0';
    const carga = peso > 0 ? `${formatNumero(peso)} kg × ${reps}` : `${esCalistenia ? 'Corporal' : '0 kg'} × ${reps}`;
    return `Siguiente: ${nombreCorto(b.dataset.ejNombre)} · serie ${n} · ${carga}`;
  };

  const pintarDescanso = () => {
    const hud = document.getElementById('sesion-hud');
    const panel = document.getElementById('hud-descanso');
    if (!hud || !panel) return;
    hud.classList.toggle('sesion-hud--descanso', !!descanso);
    panel.hidden = !descanso;
    if (!descanso) return;
    const rest = restantes();
    document.getElementById('hud-descanso-cuenta').textContent = mmss(rest);
    document.getElementById('hud-descanso-total').textContent = mss(descanso.total);
    document.getElementById('hud-descanso-arco').style.strokeDashoffset = String(ARCO * (1 - rest / Math.max(1, descanso.total)));
    document.getElementById('hud-descanso-siguiente').textContent = textoSiguiente();
    const seriesTxt = document.getElementById('hud-series')?.textContent || '';
    const volTxt = document.getElementById('hud-volumen')?.textContent || '0';
    document.getElementById('hud-descanso-resumen').innerHTML = `Tiempo <span class="num">${document.getElementById('session-timer')?.textContent || ''}</span> · Series <span class="num">${seriesTxt}</span> · <span class="num">${volTxt}</span> kg`;
  };

  const terminarDescanso = ({ sonar }) => {
    if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
    if (!descanso) return;
    descanso = null;
    if (sonar) {
      playBeep();
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* sin vibración */ }
    }
    pintarDescanso();
    guardar();
    alTerminarDescanso();
  };

  const tickDescanso = () => {
    if (!descanso) return;
    if (restantes() <= 0) { terminarDescanso({ sonar: true }); return; }
    pintarDescanso();
    actualizarPrincipal();
  };

  // segundos: duración; opciones.hasta/total: retomar uno guardado.
  const iniciarDescanso = (segundos, { hasta = null, total = null } = {}) => {
    if (restTimerInterval) clearInterval(restTimerInterval);
    descanso = { hasta: hasta || Date.now() + segundos * 1000, total: total || segundos };
    pintarDescanso();
    const aviso = document.getElementById('hud-descanso-aviso');
    if (aviso) aviso.textContent = `Descanso de ${mss(descanso.total)}`;
    restTimerInterval = setInterval(tickDescanso, 1000);
    guardar();
  };

  document.getElementById('btn-descanso-menos')?.addEventListener('click', () => {
    if (!descanso) return;
    descanso.hasta -= 15000;
    if (restantes() <= 0) terminarDescanso({ sonar: false }); else { pintarDescanso(); guardar(); }
  }, { signal });
  document.getElementById('btn-descanso-mas')?.addEventListener('click', () => {
    if (!descanso) return;
    descanso.hasta += 15000;
    descanso.total += 15;
    pintarDescanso();
    guardar();
  }, { signal });
  document.getElementById('btn-descanso-saltar')?.addEventListener('click', () => terminarDescanso({ sonar: false }), { signal });

  // Pantalla siempre encendida mientras la sesión está abierta (Wake Lock);
  // se vuelve a pedir al volver a la app y se suelta al salir. Sin soporte,
  // no pasa nada.
  const pedirPantallaEncendida = async () => {
    try {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      if (wakeLockActual && !wakeLockActual.released) return;
      wakeLockActual = await navigator.wakeLock.request('screen');
    } catch (e) { /* sin permiso o sin soporte */ }
  };
  pedirPantallaEncendida();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.getElementById('sesion-hud')) pedirPantallaEncendida();
  }, { signal });
  if (signal) signal.addEventListener('abort', soltarPantallaEncendida);

  // Ajuste de la duración del descanso (menú ⋯ de la barra superior).
  const menuSesionBtn = document.getElementById('btn-sesion-menu');
  const menuSesion = document.getElementById('sesion-barra-menu');
  if (menuSesionBtn && menuSesion) {
    const cerrar = () => { menuSesion.hidden = true; menuSesionBtn.setAttribute('aria-expanded', 'false'); };
    menuSesionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const abrir = menuSesion.hidden;
      menuSesion.hidden = !abrir;
      menuSesionBtn.setAttribute('aria-expanded', String(abrir));
      if (abrir) menuSesion.querySelector('button')?.focus();
    }, { signal });
    document.addEventListener('click', (e) => { if (!e.target.closest('.sesion-barra-menu-wrap')) cerrar(); }, { signal });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuSesion.hidden) { e.stopPropagation(); cerrar(); menuSesionBtn.focus(); } }, { signal, capture: true });
    const valor = document.getElementById('rest-timer-config-value');
    const ajustar = async (delta) => {
      currentRestTimerSecs = Math.max(15, currentRestTimerSecs + delta);
      if (valor) valor.textContent = String(currentRestTimerSecs);
      await db.setRestTimerSecs(currentRestTimerSecs);
    };
    menuSesion.querySelector('.btn-rest-minus')?.addEventListener('click', () => ajustar(-15), { signal });
    menuSesion.querySelector('.btn-rest-plus')?.addEventListener('click', () => ajustar(15), { signal });
  }


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

      const original = btn.innerHTML;
      btn.textContent = '✓ Aplicado';
      setTimeout(() => { btn.innerHTML = original; }, 2000);
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
    btn.addEventListener('click', () => {
      const card = btn.closest('.ejercicio-sesion-block');
      let peso = 0;
      card.querySelectorAll('.serie-row').forEach(row => {
        const p = parseFloat(row.querySelector('.serie-peso').value) || 0;
        if (p > peso) peso = p;
      });
      abrirCalculadora(card, peso);
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
        // Desmarcar es para rehacerla: pasa a ser la que toca.
        const bloqueFila = row.closest('.ejercicio-sesion-block');
        if (bloqueFila) fijarToca(bloqueFila, row);
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
        if (esUltimoDeLaSuperserie) iniciarDescanso(currentRestTimerSecs);
        // Última serie del ejercicio: pasa solo al siguiente; al instante si
        // es una superserie (sin descanso entre ellos), si no al terminar el
        // descanso.
        const idxMarcado = Number(ejContainer.dataset.ejIdx);
        if (pendientesDe(ejContainer) === 0 && !esUltimoDeLaSuperserie) {
          setTimeout(() => pasarAlSiguiente(idxMarcado), 350);
        } else if (esUltimoDeLaSuperserie) {
          // Superserie: tras el descanso se vuelve al primero de la corrida
          // que tenga series pendientes; si no queda ninguna, al siguiente.
          const corrida = corridaDe(ejContainer);
          const vuelta = corrida.length > 1 ? corrida.find(b => pendientesDe(b) > 0) : null;
          if (vuelta) avanzarTrasDescanso = { desde: idxMarcado, hacia: Number(vuelta.dataset.ejIdx) };
          else if (pendientesDe(ejContainer) === 0) avanzarTrasDescanso = { desde: idxMarcado, hacia: null };
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
      const bloque = btn.closest('.ejercicio-sesion-block');
      const seriesList = bloque && bloque.querySelector('.series-list');
      if (!seriesList) return;
      const rows = seriesList.querySelectorAll('.serie-row');
      const last = rows[rows.length - 1];
      const seed = last
        ? { tipo: 'normal', reps: last.querySelector('.serie-reps').value, peso: last.querySelector('.serie-peso').value, rpe: null, checked: false }
        : { tipo: 'normal', reps: '', peso: '', rpe: null, checked: false };
      const ant = currentAnterior[bloque.dataset.ejNombre];
      seriesList.insertAdjacentHTML('beforeend', renderSerieRowHtml(seed, rows.length, ant && ant.series ? ant.series[rows.length] : null));
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
        const descansoEnCurso = descanso ? { hasta: descanso.hasta, total: descanso.total, avanzar: null } : null;
        if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
        initRutinaSessionListeners(rutina, onSuccess, signal, { inicio: startTime.getTime(), ejercicioActivo: rutina.ejercicios.length - 1, onSalir: opciones.onSalir, descanso: descansoEnCurso });
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
  if (opciones.descanso && opciones.descanso.hasta > Date.now()) {
    iniciarDescanso(0, { hasta: opciones.descanso.hasta, total: opciones.descanso.total });
    avanzarTrasDescanso = opciones.descanso.avanzar || null;
    pintarDescanso();
  }
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
  soltarPantallaEncendida();
}