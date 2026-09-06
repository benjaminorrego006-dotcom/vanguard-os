import { db } from '../core/db.js';
import { renderRutinasLista, initRutinasListaListeners, renderPlantillaPreview, initPlantillaPreviewListeners, renderGeneradorPreview, initGeneradorPreviewListeners } from '../components/rutinas-lista.js';
import { renderGeneradorConfigForm, setupGeneradorConfigForm, openGeneradorConfigForm } from '../components/generador-rutina-form.js';
import { renderRutinaForm, initRutinaFormListeners } from '../components/rutina-form.js';
import { renderHiitRutinaForm, initHiitRutinaFormListeners } from '../components/hiit-rutina-form.js';
import { renderRutinaSession, initRutinaSessionListeners, cleanupSessionTimer } from '../components/rutina-session.js';
import { renderHiitTimer, initHiitTimerListeners, cleanupHiitTimer } from '../components/hiit-timer.js';
import { renderProgressRing } from '../utils/progressRing.js';
import { WEEKLY_GOALS, CATEGORY_COLORS } from '../core/trainingConfig.js';
import { renderProfileForm, setupProfileForm, openProfileForm } from '../components/profile-form.js';
import { renderNivelOnboardingForm, setupNivelOnboardingForm, openNivelOnboardingForm } from '../components/nivel-onboarding-form.js';
import { calcularIMC, calcularTMB } from '../utils/bodyMetrics.js';
import { ensureChartJs, appPalette, baseChartOptions, chartFontFamily } from '../utils/charts.js';
import { renderActivityHeatmap, initActivityHeatmapListeners } from '../components/activity-heatmap.js';
import { cleanupEjercicioCharts } from '../components/ejercicio-detalle.js';
import { formatFechaCorta, formatFechaLarga, formatMes } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { renderArbolProgresion } from '../components/arbol-progresion.js';
import { renderEstandaresFuerza, initEstandaresFuerzaListeners } from '../components/estandares-fuerza.js';
import { detectarSugerenciaPendiente } from '../core/sugerencias-nivel.js';
import { Toast, EmptyState, ConfirmDialog } from '../utils/states.js';
import { GRUPO_MUSCULAR_ORDEN, GRUPO_MUSCULAR_LABELS, agruparPorGrupoMuscular } from '../core/ejercicios-catalogo.js';
import { renderGoalCard, formatGoalValue } from '../components/goal-card.js';
import { renderGoalForm, initGoalForm, openGoalForm, openGoalContribute } from '../components/goal-form.js';

let categoriaActiva = null;
let viewState = 'main'; // 'main', 'rutinas', 'form', 'session'
let rutinaActualId = null;
let currentViewController = null;
let volumenChartInstance = null;

// Instalada como PWA no hay botón atrás del navegador — sin esto, el botón
// atrás del sistema saldría directo de la app en vez de volver a la
// pantalla principal de Entreno. Un solo nivel de historial para TODA la
// pila de sub-vistas (rutinas/form/preview/árbol/estándares/sesión): entrar
// a cualquiera de ellas desde 'main' empuja una entrada; volver a 'main'
// (desde donde sea de esa pila) la consume. No replica el stepping fino de
// un nivel a la vez que ya hace el botón "Volver" — el atrás del sistema
// es más predecible yendo directo al inicio de Entreno.
let entrenoHistorialEmpujado = false;
let entrenoPopstateEnganchado = false;
let entrenoRespondiendoAPopstate = false;

// --- Estadísticas: movidas acá desde Análisis (retiro de Tareas del nav,
// TAREA 4) — mismo contenido de las pestañas Desglose/Ejercicios/Metas/
// Récords que tenía el módulo Entreno ahí, sin el selector de módulo (acá
// ya no hace falta, solo hay uno). analisis.js queda intacto como
// referencia histórica; esto es una copia adaptada, no un import.
let estadTab = 'desglose'; // 'desglose' | 'ejercicios' | 'metas' | 'records'
let estadDesgloseMetrica = 'series'; // 'series' | 'volumen' | 'reps'
let estadDesglosePeriodo = 'semana'; // 'semana' | 'mes' | 'personalizado'
let estadDesgloseFechaInicio = null;
let estadDesgloseFechaFin = null;
let estadLastDesgloseEntries = [];
let estadEjercicioSeleccionado = null;
let estadEjercicioGrupoFiltro = 'todos';
let estadEjercicioRango = '3m'; // '1m' | '3m' | '6m' | '1a' | 'todo'
let estadEjercicioModo = 'peso'; // 'peso' | '1rm' | 'volumen'
let estadLastEjercicioHistorial = [];
let estadRecordsGrupoFiltro = 'todos';
let estadDonutChartInstance = null;
let estadEjercicioChartInstance = null;

// Barras de volumen total (peso x reps x series) por semana, agregando
// todas las categorías. Se llama tras insertar el canvas en el DOM.
const renderVolumenSemanalChart = async () => {
  const canvas = document.getElementById('chart-volumen-semanal');
  if (!canvas) return;
  const { volumenPorSemana } = await db.getTendenciaSemanal(null, 8);
  const Chart = await ensureChartJs();
  const palette = appPalette();
  const opts = baseChartOptions();

  if (volumenChartInstance) volumenChartInstance.destroy();
  volumenChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: volumenPorSemana.map((_, i) => i === volumenPorSemana.length - 1 ? 'Esta sem.' : `S-${volumenPorSemana.length - 1 - i}`),
      datasets: [{
        data: volumenPorSemana,
        backgroundColor: palette.teal,
        borderRadius: 6,
        maxBarThickness: 28
      }]
    },
    options: {
      ...opts,
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.textSecondary, font: { size: 10, family: chartFontFamily() } } },
        y: { display: false }
      }
    }
  });
};

const NIVEL_SUGERIDO_LABEL = { intermedio: 'Intermedio', avanzado: 'Avanzado' };

// Banner "sugerencia de avance de nivel" (PROMPT-NIVEL-FILTRADO.md, paso
// 4/e): se calcula después de insertar el DOM, no durante render(), porque
// depende de una lectura de IndexedDB (historial + PRs) que no tiene
// sentido bloquear el primer pintado del dashboard. Nunca sube el nivel
// sola — solo arma la sugerencia con evidencia concreta; subir o descartar
// es una acción explícita del usuario.
async function renderSugerenciaNivelBanner() {
  const contenedor = document.getElementById('sugerencia-nivel-banner');
  if (!contenedor) return;

  const sugerencia = await detectarSugerenciaPendiente();
  if (!sugerencia) { contenedor.innerHTML = ''; return; }

  contenedor.innerHTML = `
    <div class="card" style="padding: 16px 18px; margin-bottom: 20px; border-radius: 18px; border: 1px solid var(--surface-border);">
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" stroke-width="2.3" viewBox="0 0 24 24" style="flex-shrink: 0; margin-top: 1px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Tu progreso en ${sugerencia.ramaLabel} ya es ${NIVEL_SUGERIDO_LABEL[sugerencia.nivelSugerido]}</div>
          <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; font-weight: 500;">${sugerencia.detalle}</div>
          <div style="display: flex; gap: 10px; margin-top: 12px;">
            <button id="btn-sugerencia-nivel-confirmar" class="tappable" style="background: var(--accent-teal); color: #000; border: none; padding: 9px 16px; font-weight: 700; font-size: 12.5px; cursor: pointer;">Sí, subir de nivel</button>
            <button id="btn-sugerencia-nivel-descartar" class="tappable" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--surface-border); padding: 9px 16px; font-weight: 600; font-size: 12.5px; cursor: pointer;">Ahora no</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-sugerencia-nivel-confirmar').addEventListener('click', async () => {
    await db.confirmarSugerenciaNivel(sugerencia.rama, sugerencia.nivelSugerido);
    Toast(`Subiste a ${NIVEL_SUGERIDO_LABEL[sugerencia.nivelSugerido]} en ${sugerencia.ramaLabel}`, 'success');
    renderSugerenciaNivelBanner();
  });
  document.getElementById('btn-sugerencia-nivel-descartar').addEventListener('click', async () => {
    await db.descartarSugerenciaNivel(sugerencia.rama, sugerencia.nivelSugerido);
    renderSugerenciaNivelBanner();
  });
}

export let mountListeners;

// Llamado por el router (app.js) antes de desmontar esta vista. Cubre dos
// fugas: el gráfico de volumen semanal (Chart.js, canvas ya fuera del DOM
// si no se destruye acá) y, si el usuario se va a otra pestaña de la barra
// lateral en medio de una sesión/timer en curso (en vez de tocar
// "Volver", el único lugar que hoy los limpiaba), el setInterval del
// cronómetro de sesión o del timer HIIT, que si no, sigue corriendo en
// segundo plano indefinidamente.
export function cleanup() {
  if (volumenChartInstance) { volumenChartInstance.destroy(); volumenChartInstance = null; }
  if (estadDonutChartInstance) { estadDonutChartInstance.destroy(); estadDonutChartInstance = null; }
  if (estadEjercicioChartInstance) { estadEjercicioChartInstance.destroy(); estadEjercicioChartInstance = null; }
  cleanupEjercicioCharts();
  cleanupSessionTimer();
  cleanupHiitTimer();

  window.removeEventListener('popstate', onPopStateEntrenamiento);
  entrenoPopstateEnganchado = false;
  // Si había una sub-vista abierta con su entrada de historial empujada,
  // su nodo va a desaparecer con el innerHTML de la vista nueva sin pasar
  // por goToMain() — hay que soltar esa entrada (mismo criterio que
  // forgetOpenModals en history.js) para no dejar un "atrás" fantasma.
  if (entrenoHistorialEmpujado && history.state && history.state.entrenoSubView) {
    history.back();
  }
  entrenoHistorialEmpujado = false;
  viewState = 'main';
  categoriaActiva = null;
}

function onPopStateEntrenamiento(e) {
  if (viewState !== 'main' && (!e.state || !e.state.entrenoSubView)) {
    entrenoRespondiendoAPopstate = true;
    cleanupSessionTimer();
    cleanupHiitTimer();
    if (typeof window.__entrenoGoToMain === 'function') window.__entrenoGoToMain();
    entrenoRespondiendoAPopstate = false;
  }
}

const sesionCardHtml = (s) => {
  const timeStr = formatFechaCorta(new Date(s.fecha));
  const badgeClass = s.completado ? 'badge--low' : 'badge--medium';
  return `
    <div class="card" style="min-width: 170px; padding: 16px; border-radius: 16px;">
      <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary);">${escapeHtml(s.nombreRutina)}</div>
      <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-bottom: 10px;">${timeStr}</div>
      <div class="flex-between">
        <span class="badge ${badgeClass}">${s.completado ? 'Completado' : 'Parcial'}</span>
        <span style="font-size: 11px; color: var(--text-secondary); font-weight: 700;">${s.duracionMin} min</span>
      </div>
    </div>`;
};

const recientesEmptyHtml = () => `
  <div class="card" style="padding: 28px 20px; text-align: center; background-color: var(--surface-1); border-radius: 16px; border: 1px dashed var(--surface-border); width: 100%; box-sizing: border-box;">
    <div style="margin-bottom: 12px; display: flex; justify-content: center;">
      <svg width="34" height="34" fill="none" stroke="var(--accent-teal)" stroke-width="1.6" viewBox="0 0 24 24">
        <path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path>
        <rect x="4" y="2" width="4" height="20" rx="1"></rect><rect x="16" y="2" width="4" height="20" rx="1"></rect>
      </svg>
    </div>
    <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--text-primary);">Tu primera sesión te espera</h3>
    <p style="margin: 6px 0 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.5;">Elige una categoría arriba y registra tu entrenamiento de hoy — así arranca tu racha.</p>
  </div>
`;

// =====================================================================
// ESTADÍSTICAS (ex Análisis > Entreno) — Desglose/Ejercicios/Metas/
// Récords, sin cambios de comportamiento respecto a la versión que vivía
// en analisis.js, solo sin el selector de módulo (acá ya no hace falta).
// =====================================================================

function getEstadCyanShades() {
  const base = document.documentElement.classList.contains('mk3-entreno')
    ? [cssVarEstad('--cy'), cssVarEstad('--cy2'), cssVarEstad('--cy3'), cssVarEstad('--cyb')]
    : ['#06B6D4', '#22D3EE', '#67E8F9', '#0891B2'];
  return [...base, ...base.map(c => c + 'AA')];
}
function cssVarEstad(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const estadResumenCardHtml = (label, value) => `
  <div class="card" style="padding: 16px; border-radius: 16px; text-align: center;">
    <div class="num" style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${value}</div>
    <div style="font-size: 10.5px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px;">${label}</div>
  </div>`;

function estadRangoFechasPeriodo() {
  const hoy = new Date();
  if (estadDesglosePeriodo === 'semana') {
    const start = new Date(hoy);
    const dia = start.getDay();
    const distLunes = dia === 0 ? 6 : dia - 1;
    start.setDate(start.getDate() - distLunes);
    return { start, end: hoy };
  }
  if (estadDesglosePeriodo === 'mes') {
    return { start: new Date(hoy.getFullYear(), hoy.getMonth(), 1), end: hoy };
  }
  const start = estadDesgloseFechaInicio ? new Date(estadDesgloseFechaInicio) : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const end = estadDesgloseFechaFin ? new Date(estadDesgloseFechaFin) : hoy;
  return { start, end };
}

function estadFiltrarPorRango(historial, rango) {
  if (rango === 'todo') return historial;
  const meses = { '1m': 1, '3m': 3, '6m': 6, '1a': 12 };
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - meses[rango]);
  return historial.filter(h => new Date(h.fecha) >= cutoff);
}

// --- Desglose ---------------------------------------------------------

async function renderEstadDesglose() {
  const { start, end } = estadRangoFechasPeriodo();
  const data = await db.getDesgloseGrupoMuscular(start, end);
  const metricLabel = { series: 'Series', volumen: 'Volumen (kg)', reps: 'Repeticiones' }[estadDesgloseMetrica];

  const cyanShades = getEstadCyanShades();
  const entries = GRUPO_MUSCULAR_ORDEN
    .map((g, i) => ({ grupo: g, label: GRUPO_MUSCULAR_LABELS[g], valor: data.grupos[g][estadDesgloseMetrica], color: cyanShades[i % cyanShades.length] }))
    .filter(e => e.valor > 0);
  estadLastDesgloseEntries = entries;

  const totalMetrica = entries.reduce((sum, e) => sum + e.valor, 0);

  const leyendaHtml = entries.map(e => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 10px; height: 10px; border-radius: 3px; background: ${e.color}; flex-shrink: 0;"></span>
        <span style="font-size: 12.5px; color: var(--text-primary); font-weight: 600;">${e.label}</span>
      </div>
      <span style="font-size: 12.5px; color: var(--text-secondary); font-weight: 700;">${totalMetrica > 0 ? Math.round(e.valor / totalMetrica * 100) : 0}%</span>
    </div>`).join('');

  const donutSection = entries.length === 0
    ? EmptyState('Sin datos en este período', 'Registra una sesión para ver tu distribución por grupo muscular.')
    : `<div style="height: 200px;"><canvas id="chart-estad-donut"></canvas></div>
       <div style="margin-top: 14px;">${leyendaHtml}</div>`;

  return `
    <div>
      <select id="estad-desglose-metrica" style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); border-radius: 12px; padding: 10px 12px; font-size: 16px; font-weight: 600; margin-bottom: 12px;">
        <option value="series" ${estadDesgloseMetrica === 'series' ? 'selected' : ''}>Series por grupo muscular</option>
        <option value="volumen" ${estadDesgloseMetrica === 'volumen' ? 'selected' : ''}>Volumen por grupo muscular</option>
        <option value="reps" ${estadDesgloseMetrica === 'reps' ? 'selected' : ''}>Repeticiones totales</option>
      </select>

      <div style="display: flex; gap: 8px; margin-bottom: ${estadDesglosePeriodo === 'personalizado' ? '14px' : '18px'};">
        ${['semana', 'mes', 'personalizado'].map(p => `
          <button type="button" class="btn-estad-desglose-periodo" data-periodo="${p}" style="flex: 1; padding: 8px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid ${estadDesglosePeriodo === p ? 'var(--accent-teal)' : 'var(--surface-border)'}; background: ${estadDesglosePeriodo === p ? 'var(--accent-teal)' : 'transparent'}; color: ${estadDesglosePeriodo === p ? 'var(--bg-base)' : 'var(--text-secondary)'};">${p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Personalizado'}</button>
        `).join('')}
      </div>

      ${estadDesglosePeriodo === 'personalizado' ? `
        <div style="display: flex; gap: 10px; margin-bottom: 18px;">
          <div class="input-group" style="flex: 1; margin-bottom: 0;">
            <label for="estad-fecha-inicio" style="font-size: 11px;">Desde</label>
            <input type="date" id="estad-fecha-inicio" value="${estadDesgloseFechaInicio || ''}">
          </div>
          <div class="input-group" style="flex: 1; margin-bottom: 0;">
            <label for="estad-fecha-fin" style="font-size: 11px;">Hasta</label>
            <input type="date" id="estad-fecha-fin" value="${estadDesgloseFechaFin || ''}">
          </div>
        </div>
      ` : ''}

      <div class="card" style="padding: 18px 20px; margin-bottom: 20px; border-radius: 18px;">
        <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">${metricLabel} por grupo muscular</h3>
        ${donutSection}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${estadResumenCardHtml('Entrenamientos', data.entrenamientos)}
        ${estadResumenCardHtml('Series totales', data.seriesTotales)}
        ${estadResumenCardHtml('Repeticiones totales', data.repsTotales)}
        ${estadResumenCardHtml('Volumen total (kg)', Math.round(data.volumenTotal).toLocaleString('es-ES'))}
      </div>
    </div>
  `;
}

async function initEstadDesgloseChart() {
  const canvas = document.getElementById('chart-estad-donut');
  if (!canvas || estadLastDesgloseEntries.length === 0) return;
  const Chart = await ensureChartJs();
  const opts = baseChartOptions();

  if (estadDonutChartInstance) estadDonutChartInstance.destroy();
  estadDonutChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: estadLastDesgloseEntries.map(e => e.label),
      datasets: [{
        data: estadLastDesgloseEntries.map(e => e.valor),
        backgroundColor: estadLastDesgloseEntries.map(e => e.color),
        borderColor: 'transparent',
        hoverOffset: 6
      }]
    },
    options: {
      ...opts,
      cutout: '68%',
      plugins: {
        ...opts.plugins,
        tooltip: { ...opts.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}` } }
      }
    }
  });
}

// --- Ejercicios ---------------------------------------------------------

async function renderEstadEjercicios() {
  const lista = await db.getListaEjerciciosRegistrados();

  if (lista.length === 0) {
    return `<div>${EmptyState('Sin ejercicios registrados', 'Registra una sesión para poder ver el progreso de tus ejercicios acá.')}</div>`;
  }

  const gruposPresentes = [...new Set(lista.map(e => e.grupoMuscular))];
  const listaFiltrada = estadEjercicioGrupoFiltro === 'todos' ? lista : lista.filter(e => e.grupoMuscular === estadEjercicioGrupoFiltro);

  if (!estadEjercicioSeleccionado || !listaFiltrada.some(e => e.nombre === estadEjercicioSeleccionado)) {
    estadEjercicioSeleccionado = listaFiltrada[0] ? listaFiltrada[0].nombre : null;
  }

  const RANGOS = [{ v: '1m', l: '1M' }, { v: '3m', l: '3M' }, { v: '6m', l: '6M' }, { v: '1a', l: '1A' }, { v: 'todo', l: 'Todo' }];
  const MODOS = [{ v: 'peso', l: 'Peso máx.' }, { v: '1rm', l: '1RM est.' }, { v: 'volumen', l: 'Volumen' }];

  const historialCompleto = estadEjercicioSeleccionado ? await db.getHistorialEjercicio(estadEjercicioSeleccionado) : [];
  const historial = estadFiltrarPorRango(historialCompleto, estadEjercicioRango);
  estadLastEjercicioHistorial = historial;

  const chartSection = historial.length < 2
    ? `<div style="display: flex; align-items: center; justify-content: center; height: 160px; color: var(--text-disabled); font-size: 12px; text-align: center; padding: 0 16px;">Necesitas al menos 2 sesiones registradas en este rango para ver la tendencia.</div>`
    : `<div style="height: 180px;"><canvas id="chart-estad-ejercicio"></canvas></div>`;

  return `
    <div>
      <select id="estad-ejercicio-grupo" style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); border-radius: 12px; padding: 10px 12px; font-size: 16px; font-weight: 600; margin-bottom: 10px;">
        <option value="todos">Todos los grupos</option>
        ${gruposPresentes.map(g => `<option value="${g}" ${estadEjercicioGrupoFiltro === g ? 'selected' : ''}>${GRUPO_MUSCULAR_LABELS[g] || g}</option>`).join('')}
      </select>

      <select id="estad-ejercicio-select" style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); border-radius: 12px; padding: 10px 12px; font-size: 16px; font-weight: 600; margin-bottom: 14px;">
        ${listaFiltrada.map(e => `<option value="${escapeHtml(e.nombre)}" ${e.nombre === estadEjercicioSeleccionado ? 'selected' : ''}>${escapeHtml(e.nombre)}</option>`).join('')}
      </select>

      <div style="display: flex; gap: 6px; margin-bottom: 14px;">
        ${RANGOS.map(r => `<button type="button" class="btn-estad-ejercicio-rango" data-rango="${r.v}" style="flex: 1; padding: 7px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid ${estadEjercicioRango === r.v ? 'var(--accent-teal)' : 'var(--surface-border)'}; background: ${estadEjercicioRango === r.v ? 'var(--accent-teal)' : 'transparent'}; color: ${estadEjercicioRango === r.v ? 'var(--bg-base)' : 'var(--text-secondary)'};">${r.l}</button>`).join('')}
      </div>

      <div class="card" style="padding: 18px 20px; border-radius: 18px;">
        <div style="display: flex; gap: 6px; margin-bottom: 14px;">
          ${MODOS.map(m => `<button type="button" class="btn-estad-ejercicio-modo" data-modo="${m.v}" style="flex: 1; padding: 8px; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid ${estadEjercicioModo === m.v ? 'var(--accent-teal)' : 'var(--surface-border)'}; background: ${estadEjercicioModo === m.v ? 'var(--accent-teal)' : 'transparent'}; color: ${estadEjercicioModo === m.v ? 'var(--bg-base)' : 'var(--text-secondary)'};">${m.l}</button>`).join('')}
        </div>
        ${chartSection}
      </div>
    </div>
  `;
}

async function initEstadEjercicioChart() {
  const canvas = document.getElementById('chart-estad-ejercicio');
  if (!canvas || estadLastEjercicioHistorial.length < 2) return;
  const Chart = await ensureChartJs();
  const palette = appPalette();
  const opts = baseChartOptions();

  const esPesoCorporal = estadLastEjercicioHistorial.every(d => d.pesoMax === 0);
  const dataPoints = estadLastEjercicioHistorial.map(d => {
    if (estadEjercicioModo === 'volumen') return d.volumenTotal;
    if (estadEjercicioModo === '1rm') return d.pesoMax > 0 ? db.estimar1RM(d.pesoMax, d.repsEnPesoMax || 1) : 0;
    return esPesoCorporal ? d.repsMax : d.pesoMax;
  });
  const labels = estadLastEjercicioHistorial.map(d => formatFechaCorta(new Date(d.fecha)));
  const unidad = estadEjercicioModo === 'volumen' ? '' : (esPesoCorporal && estadEjercicioModo !== '1rm' ? ' reps' : ' kg');

  if (estadEjercicioChartInstance) estadEjercicioChartInstance.destroy();
  estadEjercicioChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: dataPoints,
        borderColor: palette.teal,
        backgroundColor: palette.teal + '26',
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: palette.teal,
        pointHoverRadius: 5,
        borderWidth: 2.5
      }]
    },
    options: {
      ...opts,
      plugins: {
        ...opts.plugins,
        tooltip: { ...opts.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.parsed.y}${unidad}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.textSecondary, font: { size: 10, family: chartFontFamily() } } },
        y: { display: false }
      }
    }
  });
}

// --- Metas ---------------------------------------------------------

async function renderEstadMetas() {
  const metas = await db.getGoals('entreno');

  if (metas.length === 0) {
    return `
      <div>
        ${EmptyState('Sin metas todavía', 'Ej. "Levantar 100kg en sentadilla", "Completar 20 sesiones este trimestre" o "Correr 50km este mes"')}
        <button id="btn-estad-nueva-meta" style="margin-top: 12px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>
      </div>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${metas.map(g => renderGoalCard(g)).join('')}
      <button id="btn-estad-nueva-meta" style="margin-top: 4px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>
    </div>`;
}

// --- Récords ---------------------------------------------------------

const estadRenderPRCard = (pr) => {
  const esPesoCorporal = pr.pesoMax === 0;
  const valorTxt = esPesoCorporal ? `${pr.repsMax} reps` : `${pr.pesoMax}kg × ${pr.repsMax}`;
  return `
    <div class="card" style="padding: 14px 16px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="min-width: 0;">
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(pr.nombre)}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${formatFechaLarga(new Date(pr.fecha))}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
        <div class="num" style="font-size: 14px; font-weight: 800; color: var(--text-primary); white-space: nowrap;">${valorTxt}</div>
        <button class="btn-estad-fav-pr" data-nombre="${escapeHtml(pr.nombre)}" aria-label="${pr.favorito ? 'Quitar de favoritos' : 'Marcar como favorito'} ${escapeHtml(pr.nombre)}" aria-pressed="${!!pr.favorito}" style="background: transparent; border: none; cursor: pointer; padding: 2px; color: ${pr.favorito ? '#FBBF24' : 'var(--text-disabled)'};">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="${pr.favorito ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
      </div>
    </div>`;
};

async function renderEstadRecords() {
  const prsObj = await db.getPRs();
  const prsArray = Object.values(prsObj).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  if (prsArray.length === 0) {
    return `<div>${EmptyState('Sin récords todavía', 'Registra sesiones con peso o repeticiones y tus PRs van a aparecer acá automáticamente.')}</div>`;
  }

  const gruposPresentes = [...new Set(prsArray.map(p => p.grupoMuscular))];
  const favoritos = prsArray.filter(p => p.favorito);
  const filtrados = estadRecordsGrupoFiltro === 'todos' ? prsArray : prsArray.filter(p => p.grupoMuscular === estadRecordsGrupoFiltro);
  const agrupados = agruparPorGrupoMuscular(filtrados, p => p.grupoMuscular);

  const filtrosHtml = `
    <div style="display: flex; gap: 8px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 2px;">
      <button type="button" class="btn-estad-records-grupo" data-grupo="todos" style="flex: 0 0 auto; padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; border: 1px solid ${estadRecordsGrupoFiltro === 'todos' ? 'var(--accent-teal)' : 'var(--surface-border)'}; background: ${estadRecordsGrupoFiltro === 'todos' ? 'var(--accent-teal)' : 'transparent'}; color: ${estadRecordsGrupoFiltro === 'todos' ? 'var(--bg-base)' : 'var(--text-secondary)'};">Todos</button>
      ${gruposPresentes.map(g => `<button type="button" class="btn-estad-records-grupo" data-grupo="${g}" style="flex: 0 0 auto; padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; border: 1px solid ${estadRecordsGrupoFiltro === g ? 'var(--accent-teal)' : 'var(--surface-border)'}; background: ${estadRecordsGrupoFiltro === g ? 'var(--accent-teal)' : 'transparent'}; color: ${estadRecordsGrupoFiltro === g ? 'var(--bg-base)' : 'var(--text-secondary)'};">${GRUPO_MUSCULAR_LABELS[g] || g}</button>`).join('')}
    </div>`;

  const favHtml = (estadRecordsGrupoFiltro === 'todos' && favoritos.length > 0) ? `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 12px; font-weight: 700; color: #FBBF24; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">⭐ Favoritos</h3>
      <div style="display: flex; flex-direction: column; gap: 10px;">${favoritos.map(estadRenderPRCard).join('')}</div>
    </div>` : '';

  const gruposHtml = agrupados.map(({ label, items }) => `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">${label}</h3>
      <div style="display: flex; flex-direction: column; gap: 10px;">${items.map(estadRenderPRCard).join('')}</div>
    </div>`).join('');

  return `<div>${filtrosHtml}${favHtml}${gruposHtml}</div>`;
}

const ESTAD_TABS = [
  { id: 'desglose', label: 'Desglose' },
  { id: 'ejercicios', label: 'Ejercicios' },
  { id: 'metas', label: 'Metas' },
  { id: 'records', label: 'Récords' }
];

async function renderEstadisticasContent() {
  if (estadTab === 'ejercicios') return await renderEstadEjercicios();
  if (estadTab === 'metas') return await renderEstadMetas();
  if (estadTab === 'records') return await renderEstadRecords();
  return await renderEstadDesglose();
}

async function renderEstadisticas() {
  const contentHtml = await renderEstadisticasContent();
  return `
    <div>
      <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 16px 0; color: var(--text-primary);">Estadísticas</h2>
      <div style="display: flex; gap: 6px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 14px; padding: 5px; margin-bottom: 22px; overflow-x: auto;">
        ${ESTAD_TABS.map(t => `
          <button type="button" class="estad-tab" data-tab="${t.id}" style="flex: 1; padding: 9px 6px; border-radius: 10px; border: none; cursor: pointer; font-size: 12.5px; font-weight: 700; white-space: nowrap; background: ${estadTab === t.id ? 'var(--accent-teal)' : 'transparent'}; color: ${estadTab === t.id ? 'var(--bg-base)' : 'var(--text-secondary)'};">${t.label}</button>
        `).join('')}
      </div>
      <div id="estad-tab-content">${contentHtml}</div>
      ${renderGoalForm()}
    </div>
  `;
}

function initEstadisticasListeners(refreshEstad) {
  document.querySelectorAll('.estad-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab === estadTab) return;
      estadTab = tab;
      refreshEstad();
    });
  });

  initGoalForm(refreshEstad);

  if (estadTab === 'desglose') {
    const metricaSel = document.getElementById('estad-desglose-metrica');
    if (metricaSel) metricaSel.addEventListener('change', (e) => { estadDesgloseMetrica = e.target.value; refreshEstad(); });

    document.querySelectorAll('.btn-estad-desglose-periodo').forEach(btn => {
      btn.addEventListener('click', () => { estadDesglosePeriodo = btn.getAttribute('data-periodo'); refreshEstad(); });
    });

    const fi = document.getElementById('estad-fecha-inicio');
    const ff = document.getElementById('estad-fecha-fin');
    if (fi) fi.addEventListener('change', (e) => { estadDesgloseFechaInicio = e.target.value; refreshEstad(); });
    if (ff) ff.addEventListener('change', (e) => { estadDesgloseFechaFin = e.target.value; refreshEstad(); });

    initEstadDesgloseChart();
  }

  if (estadTab === 'ejercicios') {
    const grupoSel = document.getElementById('estad-ejercicio-grupo');
    if (grupoSel) grupoSel.addEventListener('change', (e) => { estadEjercicioGrupoFiltro = e.target.value; estadEjercicioSeleccionado = null; refreshEstad(); });

    const ejSel = document.getElementById('estad-ejercicio-select');
    if (ejSel) ejSel.addEventListener('change', (e) => { estadEjercicioSeleccionado = e.target.value; refreshEstad(); });

    document.querySelectorAll('.btn-estad-ejercicio-rango').forEach(btn => {
      btn.addEventListener('click', () => { estadEjercicioRango = btn.getAttribute('data-rango'); refreshEstad(); });
    });
    document.querySelectorAll('.btn-estad-ejercicio-modo').forEach(btn => {
      btn.addEventListener('click', () => { estadEjercicioModo = btn.getAttribute('data-modo'); refreshEstad(); });
    });

    initEstadEjercicioChart();
  }

  if (estadTab === 'metas') {
    const btnNueva = document.getElementById('btn-estad-nueva-meta');
    if (btnNueva) {
      btnNueva.addEventListener('click', () => {
        openGoalForm(null, { dominio: 'entreno', tipo: 'sesiones', unidad: 'sesiones', icon: 'run' });
      });
    }
    document.querySelectorAll('.edit-goal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = (await db.getGoals('entreno')).find(g => g.id === id);
        if (goal) openGoalForm(goal);
      });
    });
    document.querySelectorAll('.delete-goal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = (await db.getGoals('entreno')).find(g => g.id === id);
        const confirmed = await ConfirmDialog(
          `Eliminar meta${goal ? ' ' + goal.name : ''}`,
          goal && goal.currentAmount > 0
            ? `Se pierde el seguimiento de tu avance (${formatGoalValue(goal, goal.currentAmount)}). No se puede deshacer.`
            : 'No se puede deshacer.',
          { verb: 'Eliminar' }
        );
        if (confirmed) { await db.deleteGoal(id); refreshEstad(); }
      });
    });
    document.querySelectorAll('.goal-row').forEach(row => {
      row.addEventListener('click', async (e) => {
        if (e.target.closest('button')) return;
        const id = e.currentTarget.getAttribute('data-id');
        const goal = (await db.getGoals('entreno')).find(g => g.id === id);
        if (goal && !goal.autoTrack) openGoalContribute(goal);
      });
    });
  }

  if (estadTab === 'records') {
    document.querySelectorAll('.btn-estad-records-grupo').forEach(btn => {
      btn.addEventListener('click', () => { estadRecordsGrupoFiltro = btn.getAttribute('data-grupo'); refreshEstad(); });
    });
    document.querySelectorAll('.btn-estad-fav-pr').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const nombre = e.currentTarget.getAttribute('data-nombre');
        await db.toggleFavoritoPR(nombre);
        refreshEstad();
      });
    });
  }
}

export async function render() {
  const sesiones = await db.getSesiones();
  const metasEntreno = await db.getGoals('entreno');
  const resumenSemanal = await db.getResumenEntrenoSemanal();
  const racha = await db.getRachaGeneral();
  const profile = await db.getProfile();

  // Header and Recent Sessions remain visible in main view
  const recientesHTML = sesiones.length === 0
    ? recientesEmptyHtml()
    : sesiones.slice(0, 5).map(sesionCardHtml).join('');

  // Racha en cian (--cy): es un logro, no una alerta — el rojo (--state-high)
  // en MK III queda reservado para alertas reales (ver auditoría de Fase 6).
  const rachaHtml = racha.actual > 0
    ? `<div style="display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 12px; font-weight: 700; padding: 3px 10px 3px 8px; border-radius: 999px;">
        🔥 <span class="num">${racha.actual}</span> día${racha.actual === 1 ? '' : 's'} seguidos
      </div>`
    : '';

  const ringHtml = (cat) => renderProgressRing({
    percent: Math.min(100, (resumenSemanal[cat] / WEEKLY_GOALS[cat]) * 100),
    color: CATEGORY_COLORS[cat],
    size: 56,
    strokeWidth: 5,
    centerText: `${resumenSemanal[cat]}/${WEEKLY_GOALS[cat]}`
  });

  // Mapa de calor tipo GitHub: intensidad de color según cuántas sesiones
  // hubo cada día del mes actual. Se deriva del log de eventos
  // ('sesion_registrada'), no de iterar `sesiones` acá.
  const now_ = new Date();
  const heatYear = now_.getFullYear();
  const heatMonth = now_.getMonth();
  const nombreMesActual = formatMes(now_);
  const { countByDay, detailByDay } = await db.getActividadEntrenoPorDia(heatYear, heatMonth);
  const heatmapHtml = renderActivityHeatmap({
    id: 'entreno-heatmap',
    monthLabel: nombreMesActual,
    year: heatYear,
    month: heatMonth,
    countByDay,
    detailByDay,
    accentVar: 'var(--accent-teal)',
    emptyLabel: 'Sin entrenamiento'
  });

  let metricsHtml = '';
  if (profile) {
    const imc = calcularIMC(profile.pesoKg, profile.estaturaCm);
    const tmb = calcularTMB(profile);
    metricsHtml = `
      <div class="card" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px; display: flex; align-items: center; gap: 18px;">
        <div style="flex: 1;">
          <div style="font-size: 10.5px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">IMC</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span class="num" style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${imc.valor}</span>
            <span style="font-size: 11.5px; font-weight: 700; color: ${imc.color};">${imc.categoria}</span>
          </div>
        </div>
        <div style="width: 1px; align-self: stretch; background: var(--surface-border);"></div>
        <div style="flex: 1;">
          <div style="font-size: 10.5px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Gasto calórico</div>
          <div style="font-size: 12.5px; color: var(--text-primary); font-weight: 700;"><span class="num">${tmb.tmbBase}</span> <span style="color: var(--text-secondary); font-weight: 500;">kcal base (TMB)</span></div>
          <div class="num" style="font-size: 12.5px; color: var(--text-primary); font-weight: 700; margin-top: 2px;">${tmb.gastoDiario} <span style="color: var(--text-secondary); font-weight: 500;">kcal/día estimado</span></div>
        </div>
      </div>
    `;
  }

  // Resumen breve de metas: el detalle completo (crear, editar, listar
  // todas) vive únicamente en la pestaña Metas de Análisis, para no
  // duplicar esa UI en el dashboard de Entreno.
  const metasActivas = metasEntreno.filter(g => !g.completed);
  const progresoPromedio = metasActivas.length > 0
    ? Math.round(metasActivas.reduce((sum, g) => sum + (g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0), 0) / metasActivas.length)
    : 0;

  const metasResumenHtml = metasEntreno.length === 0
    ? `<div class="card tappable" id="btn-ir-estad-metas" style="padding: 20px; border-radius: 18px; text-align: center; cursor: pointer;">
         <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">Todavía no tienes metas de entrenamiento.</div>
         <div style="background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; font-weight: 600;">+ Nueva meta</div>
       </div>`
    : `<div class="card tappable" id="btn-ir-estad-metas" style="padding: 18px 20px; border-radius: 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px; cursor: pointer;">
         <div>
           <div style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${metasActivas.length}</div>
           <div style="font-size: 11.5px; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">meta${metasActivas.length === 1 ? '' : 's'} activa${metasActivas.length === 1 ? '' : 's'} &bull; ${progresoPromedio}% de progreso promedio</div>
         </div>
         <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
       </div>`;

  return `
    <div style="max-width: 480px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 0 20px; font-family: 'Inter', sans-serif; padding-bottom: 120px;">

      <!-- MAIN VIEW -->
      <div id="entrenamiento-main-view" style="display: block;">
        <div class="flex-between" style="padding: 20px 0 8px 0; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 30px; font-weight: 800; margin: 0; letter-spacing: -0.5px; color: var(--text-primary);">Entrenamiento</h1>
            <div style="font-size: 13px; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">¡A darle con todo!</div>
            ${rachaHtml}
          </div>
          <div style="display: flex; gap: 8px; flex-shrink: 0;">
            <button id="btn-open-nivel" class="icon-chip tappable" title="Perfil de nivel" style="width: 44px; height: 44px; background: rgba(92, 225, 230, 0.15); color: var(--accent-teal); flex-shrink: 0; border: none; cursor: pointer;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </button>
            <button id="btn-open-profile" class="icon-chip tappable" title="Tu perfil" style="width: 44px; height: 44px; background: rgba(92, 225, 230, 0.15); color: var(--accent-teal); flex-shrink: 0; border: none; cursor: pointer;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </button>
          </div>
        </div>

        <div id="sugerencia-nivel-banner"></div>

        <div style="position: relative; margin-bottom: 20px;">
          <svg style="position: absolute; left: 16px; top: 15px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Encuentra tu próximo entrenamiento..." style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 16px; padding: 14px 20px 14px 44px; color: var(--text-primary); font-size: 16px; outline: none; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease;" onfocus="this.style.borderColor='var(--accent-teal)'; this.style.boxShadow='0 0 0 4px rgba(92,225,230,0.18)';" onblur="this.style.borderColor='var(--surface-border)'; this.style.boxShadow='none';">
        </div>

        <div class="card card--glass" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px;">
          <div style="font-size: 14px; font-style: italic; color: var(--text-primary); line-height: 1.5;">
            "La disciplina lleva a la <span style="color: var(--text-primary); font-weight: 700; font-style: normal;">grandeza.</span>"
          </div>
        </div>

        ${metricsHtml}

        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px;">
          <div class="card tappable btn-explorar" data-cat="gym" style="padding: 20px; display: flex; align-items: center; gap: 18px; border-radius: 20px; cursor: pointer;">
            ${ringHtml('gym')}
            <div style="flex: 1;">
              <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 3px 0; color: var(--text-primary);">GYM (Pesas)</h3>
              <p style="color: var(--text-secondary); font-size: 12px; margin: 0; font-weight: 500;">Fuerza e Hipertrofia</p>
            </div>
            <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>

          <div class="card tappable btn-explorar" data-cat="calistenia" style="padding: 20px; display: flex; align-items: center; gap: 18px; border-radius: 20px; cursor: pointer;">
            ${ringHtml('calistenia')}
            <div style="flex: 1;">
              <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 3px 0; color: var(--text-primary);">Calistenia</h3>
              <p style="color: var(--text-secondary); font-size: 12px; margin: 0; font-weight: 500;">Peso Corporal y Dominio</p>
            </div>
            <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>

          <div class="card tappable btn-explorar" data-cat="hiit" style="padding: 20px; display: flex; align-items: center; gap: 18px; border-radius: 20px; cursor: pointer;">
            ${ringHtml('hiit')}
            <div style="flex: 1;">
              <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 3px 0; color: var(--text-primary);">HIIT/Cardio</h3>
              <p style="color: var(--text-secondary); font-size: 12px; margin: 0; font-weight: 500;">Quema y Resistencia</p>
            </div>
            <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>

        <div class="card" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px;">
          <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Volumen semanal</h3>
          <div style="height: 110px;"><canvas id="chart-volumen-semanal"></canvas></div>
        </div>

        <div class="card" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px;">
          <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Actividad de ${nombreMesActual}</h3>
          ${heatmapHtml}
        </div>

        <div class="card tappable" id="btn-ir-estadisticas" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px; display: flex; align-items: center; gap: 14px; cursor: pointer;">
          <div class="icon-chip" style="width: 40px; height: 40px; background: rgba(92, 225, 230, 0.15); color: var(--accent-teal); flex-shrink: 0;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <div style="flex: 1;">
            <h3 style="font-size: 15px; font-weight: 700; margin: 0 0 2px 0; color: var(--text-primary);">Estadísticas</h3>
            <p style="color: var(--text-secondary); font-size: 12px; margin: 0; font-weight: 500;">Desglose por grupo muscular, progreso por ejercicio y récords</p>
          </div>
          <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>

        <div style="margin-bottom: 24px;">
          <div class="flex-between" style="margin-bottom: 14px;">
            <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary);">Metas</h3>
          </div>
          ${metasResumenHtml}
        </div>

        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 14px; color: var(--text-primary);">Sesiones Recientes</h3>
        <div id="entrenamiento-recientes" style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 24px;">
          ${recientesHTML}
        </div>
      </div>

      <!-- SUB VIEW (ROUTINES, FORMS, SESSIONS) -->
      <div id="entrenamiento-sub-view" style="display: none; padding-top: 20px;">
        <button id="btn-entrenamiento-volver" aria-label="Volver" style="width: 44px; height: 44px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; padding: 0;">
          <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div id="entrenamiento-sub-content"></div>
      </div>

      ${renderProfileForm()}
      ${renderGeneradorConfigForm()}
      ${renderNivelOnboardingForm()}
    </div>
  `;
}

mountListeners = () => {
  const mainView = document.getElementById('entrenamiento-main-view');
  const subView = document.getElementById('entrenamiento-sub-view');
  const subContent = document.getElementById('entrenamiento-sub-content');

  const refreshFull = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  renderVolumenSemanalChart();
  renderSugerenciaNivelBanner();
  initActivityHeatmapListeners('entreno-heatmap', 'var(--accent-teal)');

  // Análisis salió del nav (retiro de Tareas, TAREA 4): Desglose/
  // Ejercicios/Metas/Récords ahora viven acá mismo, en la sub-vista
  // Estadísticas, en vez de navegar a otra vista.
  const btnIrEstadisticas = document.getElementById('btn-ir-estadisticas');
  if (btnIrEstadisticas) btnIrEstadisticas.addEventListener('click', () => goToEstadisticas('desglose'));

  const btnIrEstadMetas = document.getElementById('btn-ir-estad-metas');
  if (btnIrEstadMetas) btnIrEstadMetas.addEventListener('click', () => goToEstadisticas('metas'));

  setupProfileForm(refreshFull);
  const btnOpenProfile = document.getElementById('btn-open-profile');
  if (btnOpenProfile) btnOpenProfile.addEventListener('click', () => openProfileForm());

  setupGeneradorConfigForm((plan, cat) => goToGeneradorPreview(plan, cat));

  setupNivelOnboardingForm(refreshFull);
  const btnOpenNivel = document.getElementById('btn-open-nivel');
  if (btnOpenNivel) btnOpenNivel.addEventListener('click', () => openNivelOnboardingForm());

  // Onboarding: si todavía no hay perfil guardado, se abre automáticamente
  // al entrar a Entreno (el usuario igual puede cancelar y completarlo después
  // desde el botón de perfil). El de nivel es un segundo gate independiente
  // — se abre solo si el perfil YA existe, para no apilar dos modales a la
  // vez en la primera visita; si falta el perfil, el de nivel queda para la
  // próxima visita (el usuario también puede abrirlo a mano con su ícono).
  db.getProfile().then(profile => {
    if (!profile) { openProfileForm(); return; }
    db.getNivelEntrenamiento().then(nivel => {
      if (!nivel) openNivelOnboardingForm();
    });
  });

  const goToMain = () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();

    categoriaActiva = null;
    viewState = 'main';
    // Consume la entrada de historial empujada al entrar a la pila de
    // sub-vistas — salvo que ya estemos respondiendo a un popstate (el
    // atrás del sistema), donde esa entrada ya se está consumiendo sola.
    if (entrenoHistorialEmpujado && !entrenoRespondiendoAPopstate) {
      entrenoHistorialEmpujado = false;
      history.back();
    } else if (entrenoRespondiendoAPopstate) {
      entrenoHistorialEmpujado = false;
    }
    // Refresco completo (no solo "recientes"): una sesión recién terminada
    // también cambia los anillos de progreso, el volumen semanal y el mapa
    // de calor, todos calculados en render().
    refreshFull();
  };
  window.__entrenoGoToMain = goToMain;

  if (!entrenoPopstateEnganchado) {
    entrenoPopstateEnganchado = true;
    window.addEventListener('popstate', onPopStateEntrenamiento);
  }

  // Empuja UNA entrada de historial al entrar a la pila de sub-vistas desde
  // 'main' — entrar a otra sub-vista (rutinas→form, rutinas→sesión, etc.)
  // no empuja una nueva, ya alcanza con esa única entrada mientras no se
  // vuelva del todo a 'main' (ver goToMain).
  const empujarHistorialSiHaceFalta = () => {
    if (!entrenoHistorialEmpujado) {
      entrenoHistorialEmpujado = true;
      history.pushState({ entrenoSubView: true }, '');
    }
  };

  const goToRutinas = async (cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    categoriaActiva = cat;
    viewState = 'rutinas';
    empujarHistorialSiHaceFalta();
    mainView.style.display = 'none';
    subView.style.display = 'block';
    
    try {
      subContent.innerHTML = await renderRutinasLista(cat);
    } catch (err) {
      console.error('Error renderizando rutinas:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">
        <div style="display: flex; justify-content: center; margin-bottom: 12px;">
          <svg width="32" height="32" fill="none" stroke="var(--state-high)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Algo falló al cargar esta sección</div>
        <div style="font-size: 12px; opacity: 0.7;">${err.message}</div>
      </div>`;
      return;
    }

    initRutinasListaListeners(
      cat,
      () => goToForm(cat),
      (rutina) => goToSession(rutina),
      (plantilla) => goToPreview(plantilla, cat),
      signal,
      () => goToArbolProgresion(),
      cat === 'gym' ? () => goToEstandaresFuerza() : undefined,
      () => openGeneradorConfigForm(cat)
    );
  };

  const goToArbolProgresion = async () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();

    viewState = 'arbol';
    empujarHistorialSiHaceFalta();
    mainView.style.display = 'none';
    subView.style.display = 'block';

    try {
      subContent.innerHTML = await renderArbolProgresion(categoriaActiva);
    } catch (err) {
      console.error('Error renderizando árbol de progresión:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToEstandaresFuerza = async () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'estandares';
    empujarHistorialSiHaceFalta();
    mainView.style.display = 'none';
    subView.style.display = 'block';

    try {
      subContent.innerHTML = await renderEstandaresFuerza();
      initEstandaresFuerzaListeners(signal);
    } catch (err) {
      console.error('Error renderizando estándares de fuerza:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const refreshEstadisticas = async () => {
    if (estadDonutChartInstance) { estadDonutChartInstance.destroy(); estadDonutChartInstance = null; }
    if (estadEjercicioChartInstance) { estadEjercicioChartInstance.destroy(); estadEjercicioChartInstance = null; }
    subContent.innerHTML = await renderEstadisticas();
    initEstadisticasListeners(refreshEstadisticas);
  };

  const goToEstadisticas = async (tabInicial) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();

    if (tabInicial) estadTab = tabInicial;
    viewState = 'estadisticas';
    empujarHistorialSiHaceFalta();
    mainView.style.display = 'none';
    subView.style.display = 'block';

    try {
      await refreshEstadisticas();
    } catch (err) {
      console.error('Error renderizando estadísticas:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToPreview = (plantilla, cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'preview';
    empujarHistorialSiHaceFalta();

    try {
      subContent.innerHTML = renderPlantillaPreview(plantilla);
      initPlantillaPreviewListeners(cat, plantilla, async () => {
        await goToRutinas(cat);
      }, signal);
    } catch (err) {
      console.error('Error renderizando preview:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToGeneradorPreview = (plan, cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    categoriaActiva = cat;
    viewState = 'generador-preview';
    empujarHistorialSiHaceFalta();
    mainView.style.display = 'none';
    subView.style.display = 'block';

    try {
      subContent.innerHTML = renderGeneradorPreview(plan, cat);
      initGeneradorPreviewListeners(plan, cat, async () => {
        await goToRutinas(cat);
      }, signal);
    } catch (err) {
      console.error('Error renderizando rutina generada:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToForm = async (cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'form';
    empujarHistorialSiHaceFalta();

    try {
      if (cat === 'hiit') {
        subContent.innerHTML = renderHiitRutinaForm();
        initHiitRutinaFormListeners(async () => {
          await goToRutinas(cat);
        }, signal);
      } else {
        subContent.innerHTML = renderRutinaForm(cat);
        initRutinaFormListeners(cat, async () => {
          await goToRutinas(cat);
        }, signal);
      }
    } catch (err) {
      console.error('Error renderizando formulario:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToSession = async (rutina) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'session';
    empujarHistorialSiHaceFalta();

    try {
      if (rutina.categoria === 'hiit') {
        subContent.innerHTML = renderHiitTimer(rutina);
        initHiitTimerListeners(rutina, async () => goToMain(), signal);
      } else {
        subContent.innerHTML = await renderRutinaSession(rutina);
        initRutinaSessionListeners(rutina, async () => goToMain(), signal);
      }
    } catch (err) {
      console.error('Error renderizando sesión:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  document.querySelectorAll('.btn-explorar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.currentTarget.getAttribute('data-cat');
      goToRutinas(cat);
    });
  });

  const btnVolver = document.getElementById('btn-entrenamiento-volver');
  if (btnVolver) {
    btnVolver.addEventListener('click', () => {
      if (viewState === 'form' || viewState === 'preview' || viewState === 'arbol' || viewState === 'estandares' || viewState === 'generador-preview') {
        goToRutinas(categoriaActiva);
      } else if (viewState === 'session') {
        cleanupSessionTimer();
        cleanupHiitTimer();
        goToRutinas(categoriaActiva);
      } else {
        goToMain();
      }
    });
  }
};