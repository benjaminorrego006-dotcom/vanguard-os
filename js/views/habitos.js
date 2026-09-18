import { db } from '../core/db.js';
import { renderHabitoForm, setupHabitoForm, openHabitoForm } from '../components/habito-form.js';
import { renderDonutChart, renderDonutLegend, destroyAllDonuts } from '../components/donut-chart.js';
import { ensureChartJs, baseChartOptions, chartFontFamily, cssVar, hdPixelRatio, lineValueLabelsPlugin, verticalGradient } from '../utils/charts.js';
import { Toast, ConfirmDialog, EmptyState } from '../utils/states.js';
import { diaKeyDe } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';

// Lunes primero (convención es-CL) — a diferencia de la franja rodante
// anterior (últimos 7 días terminando hoy), esta es la semana calendario
// fija: lunes a domingo, hoy puede caer en cualquier posición.
const DOW_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Mismo trazo que el ícono del header de esta vista (ver renderLista) —
// reemplaza al emoji 🔥 del contador de racha por un ícono vectorial
// consistente con el resto del set de íconos outline de la app.
const iconoFuego = (size = 15, color = 'currentColor') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" style="flex-shrink: 0;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`;
const DOW_LARGO = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// Frecuencia + meta numérica (ver db.js para la forma completa de estos
// campos) — helpers de solo lectura para la vista, misma lógica que
// habitoDiaAplicable/habitoCumplidoEnFecha en db.js pero duplicada acá
// porque esas son funciones privadas del módulo, no exportadas por `db`.
function esDiaAplicable(habito, fechaIso) {
  const frecuencia = habito.frecuencia || { tipo: 'diario' };
  if (frecuencia.tipo !== 'dias') return true;
  const d = new Date(fechaIso + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7; // 0=lunes..6=domingo
  return (frecuencia.dias || []).includes(dow);
}
function valorEnFecha(habito, fechaIso) {
  return (habito.marcas || {})[fechaIso];
}
// Igual que habitoCumplidoEnFecha en db.js -- una marca "true" (booleana) es
// de antes de que el hábito tuviera meta numérica y se sigue contando como
// completa, en vez de compararla como número (Number(true) da 1 y rompería
// la racha para cualquier meta real).
function estaCumplido(habito, fechaIso) {
  const valor = valorEnFecha(habito, fechaIso);
  if (habito.meta && Number(habito.meta.cantidad) > 0) {
    if (valor === true) return true;
    return Number(valor || 0) >= Number(habito.meta.cantidad);
  }
  return !!valor;
}
// Para MOSTRAR un valor numérico en la UI: una marca "true" heredada se
// traduce a la meta completa (así se ve "45" en vez del string literal
// "true") -- ver estaCumplido arriba para el mismo criterio en el cálculo.
function valorMostrado(habito, fechaIso) {
  const valor = valorEnFecha(habito, fechaIso);
  if (habito.meta && valor === true) return habito.meta.cantidad;
  return valor;
}
function esHabitoSemanal(habito) {
  return (habito.frecuencia || {}).tipo === 'semanal';
}
function marcasEstaSemanaCount(habito) {
  const dias7 = semanaActual();
  return dias7.filter(d => estaCumplido(habito, diaKeyDe(d))).length;
}
function labelFrecuencia(habito) {
  const f = habito.frecuencia || { tipo: 'diario' };
  if (f.tipo === 'dias') return (f.dias || []).slice().sort().map(i => DOW_SHORT[i]).join(', ');
  if (f.tipo === 'semanal') return `${f.vecesObjetivo || 1}x por semana`;
  return 'Diario';
}

// Mini-modal para registrar la cantidad del día en hábitos con meta
// numérica (ej. "6" de "8 vasos") — un tap simple no alcanza para un
// hábito que mide cantidad, a diferencia del check de los hábitos
// simples. Se incluye una vez por render (lista y detalle) igual que
// renderHabitoForm().
function renderProgresoModal() {
  return `
    <div id="progreso-modal" class="modal-overlay sheet-overlay">
      <div class="sheet-content" style="max-width: 360px;">
        <h2 id="progreso-modal-title" style="margin-top: 0; font-size: 18px; font-weight: 700;">Registrar progreso</h2>
        <input type="hidden" id="progreso-habito-id">
        <input type="hidden" id="progreso-fecha">
        <form id="progreso-form" onsubmit="return false;">
          <div class="input-group">
            <label for="progreso-cantidad" id="progreso-unidad-label">Cantidad</label>
            <input type="number" id="progreso-cantidad" min="0" inputmode="numeric" enterkeyhint="done">
          </div>
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button type="button" id="btn-cancel-progreso" class="btn-primary" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Cancelar</button>
            <button type="submit" id="btn-save-progreso" class="btn-primary" style="background: var(--accent-purple); color: #000; flex: 1;">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function abrirProgresoModal(habito, fecha) {
  const modal = document.getElementById('progreso-modal');
  if (!modal) return;
  document.getElementById('progreso-modal-title').innerText = habito.nombre;
  document.getElementById('progreso-habito-id').value = habito.id;
  document.getElementById('progreso-fecha').value = fecha;
  const unidad = (habito.meta && habito.meta.unidad) || 'veces';
  document.getElementById('progreso-unidad-label').innerText = `Cantidad (${unidad})`;
  const input = document.getElementById('progreso-cantidad');
  input.value = valorMostrado(habito, fecha) || '';
  modal.style.display = 'flex';
  setTimeout(() => { modal.classList.add('open'); input.focus(); }, 10);
}

function setupProgresoModal(onSaveCallback) {
  const modal = document.getElementById('progreso-modal');
  if (!modal) return;
  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
  };
  document.getElementById('btn-cancel-progreso').addEventListener('click', close);

  const save = async () => {
    const id = document.getElementById('progreso-habito-id').value;
    const fecha = document.getElementById('progreso-fecha').value;
    const cantidad = parseFloat(document.getElementById('progreso-cantidad').value) || 0;
    await db.registrarProgresoHabito(id, fecha, cantidad);
    close();
    if (onSaveCallback) setTimeout(onSaveCallback, 300);
  };
  bindQuickCaptureForm(document.getElementById('progreso-form'), save);
}

// Vista local (lista | detalle) — mismo patrón que activeFinTab en
// finanzas.js, pero además empuja una entrada de historial al entrar al
// detalle: instalada como PWA no hay botón atrás del navegador, así que
// sin esto el botón atrás del sistema saldría directo de la app en vez de
// volver a la lista. habitoDetalleId identifica qué hábito ver en detalle.
let vista = 'lista';
let habitoDetalleId = null;
let popstateEnganchado = false;

// Entries de la dona de "cumplimiento por hábito" del resumen de Hábitos
// (ver renderResumenHabitos) — igual que lastTareasDonutEntries en
// lab-tareas.js, se guardan al renderizar el HTML (síncrono) para que
// mountListeners() pueda montar el Chart.js real después, sin recalcular.
let lastHabitosDonutEntries = [];
let lastHabitosTendencia = [];
let tendenciaChartInstance = null;

// Variantes del acento violeta (mismo que lab-habitos.js): la dona de
// Hábitos usa shades de SU PROPIO acento, no colores prestados de otros
// módulos — mismo criterio que Entreno (shades de --cy) o Tareas.
const VIOLET_SHADES_RESUMEN = ['var(--vi)', 'var(--vib)', 'var(--vid)', 'var(--vip)', 'var(--vis)'];

function onPopStateHabitos(e) {
  if (vista === 'detalle' && (!e.state || !e.state.habitoDetalle)) {
    vista = 'lista';
    habitoDetalleId = null;
    const root = document.getElementById('view-root');
    if (root) render().then(html => { root.innerHTML = html; mountListeners(); });
  }
}

function semanaActual() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dow = hoy.getDay(); // 0=domingo .. 6=sábado
  const offsetLunes = dow === 0 ? 6 : dow - 1;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - offsetLunes);
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    dias.push(d);
  }
  return dias;
}

// Franja semanal reutilizada por la vista de detalle. Los días futuros de
// la semana calendario (ej. si hoy es miércoles, jueves en adelante) se
// muestran pero no son tocables — no tiene sentido marcar un hábito por
// adelantado. Los días NO aplicables (frecuencia 'dias' que no incluye esa
// fecha) reciben el mismo tratamiento visual que un futuro: no hay nada
// que marcar ahí, así que no se distingue de "todavía no llega".
function renderFranjaSemanal(habito, hoyIso) {
  const tieneMeta = !!habito.meta;
  const dias7 = semanaActual();
  return dias7.map(d => {
    const iso = diaKeyDe(d);
    const marcado = estaCumplido(habito, iso);
    const valor = valorMostrado(habito, iso);
    const esHoy = iso === hoyIso;
    const esFuturo = iso > hoyIso;
    const aplicable = esDiaAplicable(habito, iso);
    const inactivo = esFuturo || !aplicable;
    const diaLabel = `${DOW_LARGO[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()}`;
    const accion = marcado ? 'Desmarcar' : 'Marcar';
    // Un solo tratamiento de borde para todo lo "sin marcar" (hoy incluido)
    // — antes hoy llevaba un anillo de acento aparte, dos reglas de borde
    // distintas conviviendo se sentía menos prolijo. "Hoy" ahora se marca
    // por tipografía (la letra del día en el acento, en negrita), no por
    // una caja con borde especial — la caja en sí queda uniforme.
    const labelColor = esHoy ? 'var(--accent-purple)' : 'var(--text-disabled)';
    const labelWeight = esHoy ? '800' : '700';
    const claseBoton = tieneMeta ? 'day-progreso' : 'day-toggle';
    const etiquetaInactivo = esFuturo ? 'todavía no llega' : 'no aplica este día';
    return `
      <button class="${claseBoton} tappable" data-id="${habito.id}" data-fecha="${iso}"
        ${inactivo ? 'disabled' : ''}
        aria-label="${inactivo ? `${escapeHtml(habito.nombre)} el ${diaLabel} (${etiquetaInactivo})` : `${accion} ${escapeHtml(habito.nombre)} el ${diaLabel}`}"
        aria-pressed="${marcado}"
        style="flex: 1; min-height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; background: transparent; border: none; cursor: ${inactivo ? 'default' : 'pointer'}; padding: 0; opacity: ${inactivo ? '0.4' : '1'};">
        <span aria-hidden="true" style="font-size: 11px; font-weight: ${labelWeight}; color: ${labelColor}; letter-spacing: 0.4px;">${DOW_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
        <span aria-hidden="true" class="day-toggle-circle" data-check-size="8" style="width: 50%; aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border: ${marcado ? '0px' : '0.5px'} solid ${marcado ? 'transparent' : 'var(--surface-border)'}; background: ${marcado ? 'var(--accent-purple)' : 'transparent'}; transition: background 0.15s ease, border-color 0.15s ease; font-size: 8px; font-weight: 800; color: #fff;">
          ${tieneMeta && valor ? escapeHtml(String(valor)) : (marcado ? '<svg width="8" height="8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '')}
        </span>
      </button>
    `;
  }).join('');
}

// Cuadrícula semanal compacta por hábito, para la fila de la lista —
// mismo espíritu que el heatmap de Tareas/Entreno (una franja de celdas de
// color), pero de 7 días fijos (semana calendario actual, no un mes) y con
// 3 estados discretos en vez de intensidad por opacidad: un hábito no mide
// "cuánta actividad hubo" sino si se cumplió ese día o no.
//   cumplido → relleno sólido con el acento del módulo.
//   fallado  → día ya pasado y sin marcar, tinte rojizo apagado.
//   pendiente → hoy (todavía accionable) o futuro; hoy lleva un anillo para
//   distinguirlo de "ya pasó y no se hizo".
// Mismo lenguaje visual que la franja de racha del detalle (ver
// renderFranjaSemanal): sin marcar = solo borde fino, sin relleno oscuro;
// marcado = relleno del acento + check blanco. La única diferencia real es
// que acá "fallado" (día pasado sin marcar) sí necesita distinguirse de
// "pendiente" (hoy o futuro) porque no hay letra de día para hacerlo por
// tipografía — se resuelve con un borde con tinte rojizo en vez de uno
// gris neutro.
function renderMiniSemana(habito, hoyIso) {
  // Hábitos 'semanal' (X veces por semana) no tienen una obligación por
  // día puntual — la grilla de 7 celdas fallado/pendiente no aplica.
  // Muestra en cambio el conteo de la semana en curso contra el objetivo.
  if (esHabitoSemanal(habito)) {
    const hechas = marcasEstaSemanaCount(habito);
    const objetivo = (habito.frecuencia || {}).vecesObjetivo || 1;
    const completo = hechas >= objetivo;
    return `
      <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
        <div style="flex: 1; height: 6px; border-radius: 3px; background: var(--surface-border); overflow: hidden;">
          <div style="height: 100%; width: ${Math.min(100, (hechas / objetivo) * 100)}%; background: ${completo ? 'var(--state-success)' : 'var(--accent-purple)'};"></div>
        </div>
        <span class="num" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); flex-shrink: 0;">${hechas}/${objetivo} esta sem.</span>
      </div>`;
  }

  const dias7 = semanaActual();
  const celdas = dias7.map(d => {
    const iso = diaKeyDe(d);
    const marcado = estaCumplido(habito, iso);
    const esHoy = iso === hoyIso;
    const esFuturo = iso > hoyIso;
    const aplicable = esDiaAplicable(habito, iso);
    // "Fallado" (borde rojizo) solo tiene sentido en un día que de verdad
    // aplicaba — un día fuera de la frecuencia declarada no es una falla.
    const fallado = !marcado && !esHoy && !esFuturo && aplicable;
    const borderColor = fallado
      ? 'color-mix(in srgb, var(--state-high) 45%, var(--surface-border))'
      : 'var(--surface-border)';
    const ring = esHoy ? 'box-shadow: 0 0 0 1.5px var(--accent-purple) inset;' : '';
    const dim = (esFuturo || !aplicable) ? 'opacity: 0.4;' : '';
    return `
      <div aria-hidden="true" style="flex: 1; display: flex; align-items: center; justify-content: center;">
        <div style="width: 50%; aspect-ratio: 1; border-radius: 4px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: ${marcado ? '0px' : '0.5px'} solid ${marcado ? 'transparent' : borderColor}; background: ${marcado ? 'var(--accent-purple)' : 'transparent'}; ${ring} ${dim}">
          ${marcado ? '<svg width="8" height="8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </div>
      </div>`;
  }).join('');
  return `<div style="display: flex; gap: 3px; margin-top: 8px;">${celdas}</div>`;
}

// Resumen agregado de Hábitos: cumplimiento por hábito (dona), el hábito
// que más necesita atención hoy, y la tendencia semanal — todo por encima
// de la lista fila-por-fila, porque es información sobre el CONJUNTO de
// hábitos, no de uno puntual (esa ya la cubre cada fila con su racha y su
// franja de 7 días). Solo tiene sentido con al menos un hábito creado.
async function renderResumenHabitos(habitos, hoyIso) {
  if (habitos.length === 0) return '';

  const hace7Dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return diaKeyDe(d);
  });
  const entries = habitos.map((h, i) => {
    const marcados = hace7Dias.filter(iso => estaCumplido(h, iso)).length;
    return { label: escapeHtml(h.nombre), valor: marcados, color: VIOLET_SHADES_RESUMEN[i % VIOLET_SHADES_RESUMEN.length] };
  }).filter(e => e.valor > 0);
  lastHabitosDonutEntries = entries;

  const donutHtml = entries.length === 0
    ? EmptyState('Sin marcas esta semana', 'Marca un hábito para ver su desglose acá.')
    : `<div style="display: flex; gap: 16px; align-items: center;">
         <div style="width: 92px; height: 92px; flex-shrink: 0;"><canvas id="habitos-donut"></canvas></div>
         <div style="flex: 1; min-width: 0;">${renderDonutLegend(entries)}</div>
       </div>`;

  // En riesgo: el hábito con la racha más floja entre los que hoy siguen
  // sin marcar — con un solo hábito no hay "el más flojo" que destacar,
  // ya lo cubre la tarjeta de racha global de arriba.
  let riesgoHtml = '';
  if (habitos.length >= 2) {
    const sinMarcarHoy = habitos.filter(h => esDiaAplicable(h, hoyIso) && !estaCumplido(h, hoyIso));
    if (sinMarcarHoy.length > 0) {
      const masFlojo = [...sinMarcarHoy].sort((a, b) => (a._racha?.actual || 0) - (b._racha?.actual || 0))[0];
      const rachaTxt = masFlojo._racha && masFlojo._racha.actual > 0
        ? `Racha de <span class="num">${masFlojo._racha.actual}</span> ${masFlojo._racha.actual === 1 ? 'día' : 'días'} — todavía sin marcar hoy.`
        : 'Sin racha y todavía sin marcar hoy.';
      riesgoHtml = `
        <div class="card" style="padding: 16px; border-color: color-mix(in srgb, var(--state-high) 35%, var(--surface-border));">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--state-high); margin-bottom: 8px;">En riesgo hoy</div>
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${escapeHtml(masFlojo.nombre)}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 3px;">${rachaTxt}</div>
        </div>`;
    }
  }

  // Reusa la serie del Laboratorio (getTendenciaCumplimientoHabitos) en vez
  // de calcular una nueva — mismo dato, un solo lugar que lo define.
  const tendencia = await db.getTendenciaCumplimientoHabitos(8);
  lastHabitosTendencia = tendencia;
  const hayTendencia = tendencia.some(v => v > 0);
  const tendenciaHoy = tendencia[tendencia.length - 1] || 0;
  const tendenciaProm = Math.round(tendencia.reduce((a, b) => a + b, 0) / tendencia.length);

  const tendenciaHtml = !hayTendencia
    ? EmptyState('Sin tendencia todavía', 'Marca hábitos un par de semanas más para ver el avance.')
    : `
      <div style="display: flex; gap: 20px; margin-bottom: 14px;">
        <div><span class="num" style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${tendenciaHoy}%</span><div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px;">Esta semana</div></div>
        <div><span class="num" style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${tendenciaProm}%</span><div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px;">Promedio 8 sem.</div></div>
      </div>
      <div style="height: 200px; padding-top: 8px;"><canvas id="habitos-tendencia-chart"></canvas></div>
    `;

  return `
    <div style="display: grid; grid-template-columns: ${riesgoHtml ? '1.3fr 1fr' : '1fr'}; gap: 12px; margin-top: 20px; margin-bottom: 12px;">
      <div class="card" style="padding: 16px;">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); margin-bottom: 10px;">Cumplimiento por hábito, 7 días</div>
        ${donutHtml}
      </div>
      ${riesgoHtml}
    </div>
    <div class="card" style="padding: 16px;">
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); margin-bottom: 10px;">% de hábitos cumplidos por semana (últimas 8 semanas)</div>
      ${tendenciaHtml}
    </div>
  `;
}

// Etiqueta de cada barra/punto de la tendencia semanal — mismo criterio
// que renderVolumenSemanalChart en entrenamiento.js ("Esta sem." para la
// última, "S-N" contando hacia atrás para el resto).
function etiquetasSemanas(n) {
  return Array.from({ length: n }, (_, i) => i === n - 1 ? 'Esta sem.' : `S-${n - 1 - i}`);
}

async function initTendenciaChart() {
  const canvas = document.getElementById('habitos-tendencia-chart');
  if (!canvas || lastHabitosTendencia.length === 0) return;

  const Chart = await ensureChartJs();
  const opts = baseChartOptions();
  const color = cssVar('--accent-purple');
  const textPrimary = cssVar('--text-primary');
  const family = chartFontFamily();

  const gradient = verticalGradient(canvas.getContext('2d'), color, canvas.clientHeight || 200);

  if (tendenciaChartInstance) tendenciaChartInstance.destroy();
  tendenciaChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: etiquetasSemanas(lastHabitosTendencia.length),
      datasets: [{
        data: lastHabitosTendencia,
        borderColor: color,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: color,
        pointBorderColor: cssVar('--panel'),
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        borderWidth: 3
      }]
    },
    options: {
      ...opts,
      devicePixelRatio: hdPixelRatio(),
      layout: { padding: { top: 20 } },
      plugins: {
        ...opts.plugins,
        tooltip: { ...opts.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.parsed.y}% cumplido` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: cssVar('--text-disabled'), font: { size: 10, family } } },
        y: {
          min: 0, max: 100,
          grid: { color: cssVar('--surface-border') },
          ticks: { color: cssVar('--text-disabled'), font: { size: 10, family }, stepSize: 25, callback: (v) => `${v}%` }
        }
      }
    },
    plugins: [lineValueLabelsPlugin(textPrimary, '%')]
  });
}

async function renderDetalle(id) {
  const habitos = await db.getHabitos();
  const habito = habitos.find(h => h.id === id);
  if (!habito) { vista = 'lista'; return render(); }

  const hoyIso = diaKeyDe(new Date());
  const racha = await db.getRachaHabito(id);
  const diasRegistrados = Object.keys(habito.marcas || {}).length;
  const unidadRachaDetalle = esHabitoSemanal(habito) ? 'semana' : 'día';

  return `
    <div style="padding: 20px; font-family: var(--font-body); padding-bottom: 110px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <button id="btn-volver-habito" aria-label="Volver a Hábitos" style="width: 44px; height: 44px; flex-shrink: 0; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.4px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(habito.nombre)}</h1>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
        <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); background: var(--surface-2); border: 1px solid var(--surface-border); padding: 4px 10px; border-radius: 100px;">${escapeHtml(labelFrecuencia(habito))}</span>
        ${habito.meta ? `<span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); background: var(--surface-2); border: 1px solid var(--surface-border); padding: 4px 10px; border-radius: 100px;">Meta: ${habito.meta.cantidad} ${escapeHtml(habito.meta.unidad || '')}</span>` : ''}
      </div>

      <div class="card card-hero" style="padding: 1.25rem; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">
            ${racha.actual > 0
              ? `<span class="num">${racha.actual}</span> ${racha.actual === 1 ? `${unidadRachaDetalle} seguid${unidadRachaDetalle === 'día' ? 'o' : 'a'}` : `${unidadRachaDetalle}s seguid${unidadRachaDetalle === 'día' ? 'os' : 'as'}`} · Mejor: <span class="num">${racha.mejor}</span> ${racha.mejor === 1 ? unidadRachaDetalle : `${unidadRachaDetalle}s`}`
              : 'Sin racha — márcalo hoy'}
          </div>
          ${racha.actual > 0 ? iconoFuego(18, 'var(--accent-purple)') : ''}
        </div>
        <div style="display: flex; gap: 8px;">
          ${renderFranjaSemanal(habito, hoyIso)}
        </div>
      </div>

      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 20px;">${diasRegistrados} día${diasRegistrados === 1 ? '' : 's'} marcado${diasRegistrados === 1 ? '' : 's'} en total.</div>

      <div style="display: flex; gap: 12px;">
        <button id="btn-editar-habito-detalle" class="tappable" style="flex: 1; min-height: 44px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); font-weight: 700; cursor: pointer;">Editar nombre</button>
        <button id="btn-eliminar-habito-detalle" class="tappable" style="flex: 1; min-height: 44px; background: transparent; border: 1px solid var(--surface-border); color: var(--state-high); font-weight: 700; cursor: pointer;">Eliminar</button>
      </div>

      ${renderHabitoForm()}
      ${renderProgresoModal()}
    </div>
  `;
}

async function renderLista() {
  const habitos = await db.getHabitos();
  const rachaGlobal = await db.getRachaHabitosGlobal();
  const hoyIso = diaKeyDe(new Date());

  await Promise.all(habitos.map(async (h) => {
    h._racha = await db.getRachaHabito(h.id);
  }));

  // Fila simple: nombre a la izquierda, checkbox de HOY a la derecha (zona
  // del pulgar — es la acción que se repite a diario), chevron decorativo.
  // El área táctil de la fila entera lleva a la vista de detalle; el
  // checkbox tiene su propio manejador y no propaga el click a la fila.
  const renderFila = (habito) => {
    const marcadoHoy = estaCumplido(habito, hoyIso);
    const hoyAplica = esDiaAplicable(habito, hoyIso);
    const tieneMeta = !!habito.meta;
    const racha = habito._racha || { actual: 0, mejor: 0 };
    const unidadRacha = esHabitoSemanal(habito) ? 'semana' : 'día';
    const rachaTexto = racha.actual > 0
      ? `🔥 <span class="num">${racha.actual}</span> ${racha.actual === 1 ? `${unidadRacha} seguid${unidadRacha === 'día' ? 'o' : 'a'}` : `${unidadRacha}s seguid${unidadRacha === 'día' ? 'os' : 'as'}`}`
      : 'Sin racha todavía';
    const claseToggle = tieneMeta ? 'day-progreso-hoy' : 'day-toggle-hoy';
    const valorHoy = valorMostrado(habito, hoyIso);
    return `
      <div class="list-row habito-row tappable" data-id="${habito.id}" style="display: flex; flex-direction: column; padding: 10px 12px; min-height: 44px; cursor: pointer; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(habito.nombre)}</div>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">${rachaTexto}</div>
          </div>
          ${!hoyAplica
            ? `<div aria-hidden="true" style="flex-shrink: 0; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--text-disabled); text-align: center; line-height: 1.1;">No<br>aplica</div>`
            : `<button class="${claseToggle} tappable" data-id="${habito.id}" data-fecha="${hoyIso}" aria-label="${marcadoHoy ? 'Editar' : 'Marcar'} ${escapeHtml(habito.nombre)} hoy" aria-pressed="${marcadoHoy}" style="flex-shrink: 0; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; cursor: pointer; padding: 0;">
                <span aria-hidden="true" class="day-toggle-circle" data-check-size="16" data-borde-marca="1" style="width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border: 1.5px solid ${marcadoHoy ? 'transparent' : 'var(--surface-border)'}; background: ${marcadoHoy ? 'var(--accent-purple)' : 'var(--surface-2)'}; font-size: 12px; font-weight: 800; color: #000;">
                  ${tieneMeta ? (valorHoy ? escapeHtml(String(valorHoy)) : '+') : (marcadoHoy ? '<svg width="16" height="16" fill="none" stroke="#000" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '')}
                </span>
              </button>`
          }
          <svg aria-hidden="true" width="16" height="16" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24" style="flex-shrink: 0;"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
        ${renderMiniSemana(habito, hoyIso)}
      </div>
    `;
  };

  return `
    <div style="padding: 20px 0 20px 20px; font-family: var(--font-body);">
      <!-- Header -->
      <div class="flex-between" style="padding-right: 20px; margin-bottom: 20px;">
        <h1 style="font-size: 30px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.5px;">Hábitos</h1>
        <div class="icon-chip" style="width: 40px; height: 40px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
        </div>
      </div>

      ${habitos.length > 0 ? `
        <!-- Racha de días perfectos — tarjeta principal de Hábitos, lleva chaflán (ver .card-hero). -->
        <div class="card card-hero" style="margin-right: 20px; margin-bottom: 20px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 56px; height: 56px; flex-shrink: 0; border-radius: 50%; background: color-mix(in srgb, var(--accent-purple) 12%, transparent); display: flex; align-items: center; justify-content: center; font-size: 24px;">🔥</div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);"><span class="num">${rachaGlobal.actual}</span> ${rachaGlobal.actual === 1 ? 'día perfecto seguido' : 'días perfectos seguidos'}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Mejor racha: <span class="num">${rachaGlobal.mejor}</span> ${rachaGlobal.mejor === 1 ? 'día' : 'días'} · todos los hábitos cumplidos ese día</div>
          </div>
        </div>
      ` : ''}

      <!-- Lista de hábitos primero: es lo único con lo que se puede
           interactuar (marcar el día) — el resumen/analítica de abajo es
           soporte, no debería empujarlo hacia abajo (mismo criterio que
           Inicio, donde el contenido accionable va antes que Laboratorio).
           Envueltos juntos en un solo wrapper (en vez de que cada uno
           cargue su propio padding-right/bottom) porque cuál de los dos
           termina siendo el último varía: sin datos de resumen todavía,
           renderResumenHabitos() devuelve '' y la lista queda al final.
           padding-bottom: 110px dejaba apenas ~60px de aire real bajo la
           última card (el gráfico de tendencia semanal) antes del FAB
           flotante — con poco contenido en la vista (ej. un solo hábito
           marcado) ese margen era suficiente, pero medido en vivo el FAB
           terminaba encima de la etiqueta del eje X del gráfico. Subido a
           180px para dejar un colchón real. -->
      <div style="padding-right: 20px; padding-bottom: 180px;">
        <div>
          ${habitos.length > 0
            ? habitos.map(renderFila).join('')
            : EmptyState('Sin hábitos todavía', 'Agrega el primero y empieza a marcar días.')}
        </div>
        ${await renderResumenHabitos(habitos, hoyIso)}
      </div>

      <!-- FAB. Sticky en vez de fixed: fixed lo ancla al borde de la
           ventana completa, así que en escritorio (sidebar + columna de
           contenido centrada) queda lejos del contenido — mismo criterio
           que el FAB de Tareas (ver tareas.js). -->
      <div style="position: sticky; bottom: 100px; height: 0; z-index: 2000; display: flex; justify-content: flex-end; pointer-events: none;">
        <button id="btn-new-habito" class="tappable mk3-fab" style="pointer-events: auto; margin-right: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-purple); color: #000; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      ${renderHabitoForm()}
      ${renderProgresoModal()}
    </div>
  `;
}

export async function render() {
  if (vista === 'detalle' && habitoDetalleId) return renderDetalle(habitoDetalleId);
  return renderLista();
}

// Monta el Chart.js real de la dona de cumplimiento, recién después de
// que el HTML ya está en el DOM — mismo patrón que initDesgloseChart() en
// lab-tareas.js/lab-finanzas.js. Sin efecto si el canvas no existe (vista
// de detalle) o si no hay datos para la dona (sin hábitos marcados aún).
function initHabitosCharts() {
  if (vista !== 'lista') return;
  if (lastHabitosDonutEntries.length > 0) renderDonutChart('habitos-donut', lastHabitosDonutEntries);
  initTendenciaChart();
}

export function mountListeners() {
  const refresh = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  initHabitosCharts();
  setupHabitoForm(refresh);
  setupProgresoModal(refresh);

  if (!popstateEnganchado) {
    popstateEnganchado = true;
    window.addEventListener('popstate', onPopStateHabitos);
  }

  const abrirDetalle = (id) => {
    vista = 'detalle'; habitoDetalleId = id;
    history.pushState({ habitoDetalle: true }, '');
    refresh();
  };
  const volverALista = () => {
    vista = 'lista'; habitoDetalleId = null;
    // Si la entrada actual sigue siendo la que empujó abrirDetalle, la
    // sacamos para no dejar un "atrás" fantasma que no vuelva a nada la
    // próxima vez (mismo criterio que history.js con los modales).
    if (history.state && history.state.habitoDetalle) history.back();
    refresh();
  };

  const btnNew = document.getElementById('btn-new-habito');
  if (btnNew) btnNew.addEventListener('click', () => openHabitoForm());

  const btnVolver = document.getElementById('btn-volver-habito');
  if (btnVolver) btnVolver.addEventListener('click', volverALista);

  document.querySelectorAll('.habito-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.day-toggle-hoy') || e.target.closest('.day-progreso-hoy')) return;
      abrirDetalle(row.getAttribute('data-id'));
    });
  });

  // Optimista: pinta el círculo al instante y recién después escribe en
  // IndexedDB — un check que espera a la base de datos se siente roto.
  // Si la escritura falla, vuelve al estado anterior y avisa con un toast
  // en vez de dejar un check mintiendo en pantalla.
  const pintarCirculo = (btn, marcado) => {
    const circle = btn.querySelector('.day-toggle-circle');
    if (!circle) return;
    btn.setAttribute('aria-pressed', String(marcado));
    // Dos "sabores" de círculo comparten esta función: el toggle de hoy en
    // la lista (data-borde-marca="1", relleno gris cuando no está marcado,
    // check negro) y las celdas de la franja semanal en el detalle (sin
    // relleno cuando no está marcado, solo borde fino, check blanco).
    const esListaFlavor = !!circle.getAttribute('data-borde-marca');
    if (esListaFlavor) {
      circle.style.background = marcado ? 'var(--accent-purple)' : 'var(--surface-2)';
      circle.style.borderColor = marcado ? 'transparent' : 'var(--surface-border)';
    } else {
      circle.style.background = marcado ? 'var(--accent-purple)' : 'transparent';
      circle.style.borderColor = marcado ? 'transparent' : 'var(--surface-border)';
      circle.style.borderWidth = marcado ? '0px' : '0.5px';
    }
    const size = circle.getAttribute('data-check-size') || '16';
    const checkColor = esListaFlavor ? '#000' : '#fff';
    circle.innerHTML = marcado
      ? `<svg width="${size}" height="${size}" fill="none" stroke="${checkColor}" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      : '';
  };

  // Hábitos con meta numérica: un tap abre el mini-modal de cantidad en
  // vez de togglear un booleano — necesitan un valor, no un check.
  document.querySelectorAll('.day-progreso-hoy, .day-progreso').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const el = e.currentTarget;
      const id = el.getAttribute('data-id');
      const fecha = el.getAttribute('data-fecha');
      const habitos = await db.getHabitos();
      const habito = habitos.find(h => h.id === id);
      if (habito) abrirProgresoModal(habito, fecha);
    });
  });

  document.querySelectorAll('.day-toggle-hoy, .day-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const el = e.currentTarget;
      const id = el.getAttribute('data-id');
      const fecha = el.getAttribute('data-fecha');
      const estabaMarcado = el.getAttribute('aria-pressed') === 'true';
      const nuevoMarcado = !estabaMarcado;

      pintarCirculo(el, nuevoMarcado);

      try {
        await db.toggleMarcaHabito(id, fecha);
        // idbSetArray (db.js) atrapa sus propios errores de IndexedDB y
        // solo los loguea — nunca rechaza la promesa hacia quien la llamó.
        // Sin esta verificación, una escritura que falló en silencio se
        // vería igual que una exitosa. Se relee para confirmar que el
        // marcado realmente quedó como se pintó antes de confiar en él.
        const habitosActuales = await db.getHabitos();
        const habitoActual = habitosActuales.find(h => h.id === id);
        const quedoMarcado = !!(habitoActual && habitoActual.marcas && habitoActual.marcas[fecha]);
        if (quedoMarcado !== nuevoMarcado) throw new Error('La marca no se guardó en IndexedDB');
        // El toque ya se vio al instante — este refresh solo pone al día
        // la racha y otros contadores derivados, ya no bloquea la
        // respuesta visual.
        refresh();
      } catch (err) {
        console.error('Error al marcar hábito:', err);
        pintarCirculo(el, estabaMarcado);
        Toast('No se pudo guardar — inténtalo de nuevo.', 'error');
      }
    });
  });

  const btnEditarDetalle = document.getElementById('btn-editar-habito-detalle');
  if (btnEditarDetalle) {
    btnEditarDetalle.addEventListener('click', async () => {
      const habitos = await db.getHabitos();
      const habito = habitos.find(h => h.id === habitoDetalleId);
      if (habito) openHabitoForm(habito);
    });
  }

  const btnEliminarDetalle = document.getElementById('btn-eliminar-habito-detalle');
  if (btnEliminarDetalle) {
    btnEliminarDetalle.addEventListener('click', async () => {
      const habitos = await db.getHabitos();
      const habito = habitos.find(h => h.id === habitoDetalleId);
      const diasRegistrados = habito ? Object.keys(habito.marcas || {}).length : 0;
      const confirmed = await ConfirmDialog(
        `Eliminar hábito${habito ? ' ' + habito.nombre : ''}`,
        diasRegistrados > 0
          ? `Se perderá el registro de ${diasRegistrados} día${diasRegistrados === 1 ? '' : 's'} marcado${diasRegistrados === 1 ? '' : 's'}. No se puede deshacer.`
          : 'No se puede deshacer.',
        { verb: 'Eliminar' }
      );
      if (confirmed) {
        await db.eliminarHabito(habitoDetalleId);
        Toast('Hábito eliminado', 'success');
        volverALista();
      }
    });
  }
}

// Llamado por el router (app.js) antes de desmontar esta vista — si el
// detalle de un hábito estaba abierto (con su entrada de historial
// empujada), su nodo va a desaparecer con el innerHTML de la vista nueva
// sin pasar por volverALista(); hay que soltar esa entrada (mismo criterio
// que forgetOpenModals en history.js) y resetear a la lista para la
// próxima vez que se entre a Hábitos.
export function cleanup() {
  window.removeEventListener('popstate', onPopStateHabitos);
  popstateEnganchado = false;
  if (vista === 'detalle' && history.state && history.state.habitoDetalle) {
    history.back();
  }
  vista = 'lista';
  habitoDetalleId = null;
  destroyAllDonuts();
  if (tendenciaChartInstance) { tendenciaChartInstance.destroy(); tendenciaChartInstance = null; }
}
