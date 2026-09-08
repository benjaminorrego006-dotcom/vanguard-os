// Gráficos de Entreno del Laboratorio (ex Análisis > Entreno) — extraídos
// de analisis.js para poder montarse desde Inicio sin cargar esa vista
// completa. Mismo comportamiento que tenían ahí: Desglose por grupo
// muscular, progreso por Ejercicio, Metas y Récords.
import { db } from '../core/db.js';
import { ensureChartJs, appPalette, baseChartOptions, chartFontFamily, cssVar, hdPixelRatio, lineValueLabelsPlugin, verticalGradient } from '../utils/charts.js';
import { renderGoalCard, formatGoalValue } from './goal-card.js';
import { openGoalForm, openGoalContribute } from './goal-form.js';
import { renderMiniChart } from './mini-chart.js';
import { EmptyState, ConfirmDialog } from '../utils/states.js';
import { GRUPO_MUSCULAR_ORDEN, GRUPO_MUSCULAR_LABELS, agruparPorGrupoMuscular } from '../core/ejercicios-catalogo.js';
import { formatFechaCorta, formatFechaLarga } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';

export const TABS = [
  { id: 'desglose', label: 'Desglose' },
  { id: 'tendencia', label: 'Tendencia' },
  { id: 'ejercicios', label: 'Ejercicios' },
  { id: 'metas', label: 'Metas' },
  { id: 'records', label: 'Récords' }
];

let desgloseMetrica = 'series'; // 'series' | 'volumen' | 'reps'
let desglosePeriodo = 'semana'; // 'semana' | 'mes' | 'personalizado'
let desgloseFechaInicio = null;
let desgloseFechaFin = null;
let lastDesgloseEntries = [];

let ejercicioSeleccionado = null;
let ejercicioGrupoFiltro = 'todos';
let ejercicioRango = '3m'; // '1m' | '3m' | '6m' | '1a' | 'todo'
let ejercicioModo = 'peso'; // 'peso' | '1rm' | 'volumen'
let lastEjercicioHistorial = [];

let recordsGrupoFiltro = 'todos';

let donutChartInstance = null;
let ejercicioChartInstance = null;

export function cleanup() {
  if (donutChartInstance) { donutChartInstance.destroy(); donutChartInstance = null; }
  if (ejercicioChartInstance) { ejercicioChartInstance.destroy(); ejercicioChartInstance = null; }
}

// Variaciones del acento cian, de más saturado a más apagado, para
// distinguir los grupos musculares en la dona sin salirse de la paleta.
function getCyanShades() {
  const base = [cssVar('--cy'), cssVar('--cy2'), cssVar('--cy3'), cssVar('--cyb')];
  return [...base, ...base.map(c => c + 'AA')];
}

const resumenCardHtml = (label, value) => `
  <div class="card" style="padding: 16px; border-radius: 16px; text-align: center;">
    <div class="num" style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${value}</div>
    <div style="font-size: 10.5px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px;">${label}</div>
  </div>`;

function rangoFechasPeriodo() {
  const hoy = new Date();
  if (desglosePeriodo === 'semana') {
    const start = new Date(hoy);
    const dia = start.getDay();
    const distLunes = dia === 0 ? 6 : dia - 1;
    start.setDate(start.getDate() - distLunes);
    return { start, end: hoy };
  }
  if (desglosePeriodo === 'mes') {
    return { start: new Date(hoy.getFullYear(), hoy.getMonth(), 1), end: hoy };
  }
  const start = desgloseFechaInicio ? new Date(desgloseFechaInicio) : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const end = desgloseFechaFin ? new Date(desgloseFechaFin) : hoy;
  return { start, end };
}

function filtrarPorRango(historial, rango) {
  if (rango === 'todo') return historial;
  const meses = { '1m': 1, '3m': 3, '6m': 6, '1a': 12 };
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - meses[rango]);
  return historial.filter(h => new Date(h.fecha) >= cutoff);
}

// Sin ninguna sesión registrada en NINGÚN período, la sección entera se
// resuelve como "sin datos" desde el orquestador (laboratorio.js) — esto
// solo decide si HAY algo que graficar en el período/filtro actual.
export async function tieneDatos() {
  const sesiones = await db.getSesiones();
  return sesiones.length > 0;
}

async function renderDesglose() {
  const { start, end } = rangoFechasPeriodo();
  const data = await db.getDesgloseGrupoMuscular(start, end);
  const metricLabel = { series: 'Series', volumen: 'Volumen (kg)', reps: 'Repeticiones' }[desgloseMetrica];

  const cyanShades = getCyanShades();
  const entries = GRUPO_MUSCULAR_ORDEN
    .map((g, i) => ({ grupo: g, label: GRUPO_MUSCULAR_LABELS[g], valor: data.grupos[g][desgloseMetrica], color: cyanShades[i % cyanShades.length] }))
    .filter(e => e.valor > 0);
  lastDesgloseEntries = entries;

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
    : `<div style="height: 200px;"><canvas id="lab-entreno-donut"></canvas></div>
       <div style="margin-top: 14px;">${leyendaHtml}</div>`;

  return `
    <div>
      <select id="lab-entreno-desglose-metrica" style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); border-radius: 12px; padding: 10px 12px; font-size: 16px; font-weight: 600; margin-bottom: 12px;">
        <option value="series" ${desgloseMetrica === 'series' ? 'selected' : ''}>Series por grupo muscular</option>
        <option value="volumen" ${desgloseMetrica === 'volumen' ? 'selected' : ''}>Volumen por grupo muscular</option>
        <option value="reps" ${desgloseMetrica === 'reps' ? 'selected' : ''}>Repeticiones totales</option>
      </select>

      <div style="display: flex; gap: 8px; margin-bottom: ${desglosePeriodo === 'personalizado' ? '14px' : '18px'};">
        ${['semana', 'mes', 'personalizado'].map(p => `
          <button type="button" class="btn-lab-entreno-periodo" data-periodo="${p}" style="flex: 1; padding: 8px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid ${desglosePeriodo === p ? 'var(--cy)' : 'var(--surface-border)'}; background: ${desglosePeriodo === p ? 'var(--cy)' : 'transparent'}; color: ${desglosePeriodo === p ? 'var(--bg-base)' : 'var(--text-secondary)'};">${p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Personalizado'}</button>
        `).join('')}
      </div>

      ${desglosePeriodo === 'personalizado' ? `
        <div style="display: flex; gap: 10px; margin-bottom: 18px;">
          <div class="input-group" style="flex: 1; margin-bottom: 0;">
            <label for="lab-entreno-fecha-inicio" style="font-size: 11px;">Desde</label>
            <input type="date" id="lab-entreno-fecha-inicio" value="${desgloseFechaInicio || ''}">
          </div>
          <div class="input-group" style="flex: 1; margin-bottom: 0;">
            <label for="lab-entreno-fecha-fin" style="font-size: 11px;">Hasta</label>
            <input type="date" id="lab-entreno-fecha-fin" value="${desgloseFechaFin || ''}">
          </div>
        </div>
      ` : ''}

      <div class="card" style="padding: 18px 20px; margin-bottom: 20px; border-radius: 18px;">
        <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">${metricLabel} por grupo muscular</h3>
        ${donutSection}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${resumenCardHtml('Entrenamientos', data.entrenamientos)}
        ${resumenCardHtml('Series totales', data.seriesTotales)}
        ${resumenCardHtml('Repeticiones totales', data.repsTotales)}
        ${resumenCardHtml('Volumen total (kg)', Math.round(data.volumenTotal).toLocaleString('es-ES'))}
      </div>
    </div>
  `;
}

async function initDesgloseChart() {
  const canvas = document.getElementById('lab-entreno-donut');
  if (!canvas || lastDesgloseEntries.length === 0) return;
  const Chart = await ensureChartJs();
  const opts = baseChartOptions();

  if (donutChartInstance) donutChartInstance.destroy();
  donutChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: lastDesgloseEntries.map(e => e.label),
      datasets: [{
        data: lastDesgloseEntries.map(e => e.valor),
        backgroundColor: lastDesgloseEntries.map(e => e.color),
        borderColor: 'transparent',
        hoverOffset: 6
      }]
    },
    options: {
      ...opts,
      devicePixelRatio: hdPixelRatio(),
      cutout: '68%',
      plugins: {
        ...opts.plugins,
        tooltip: { ...opts.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}` } }
      }
    }
  });
}

async function renderTendencia() {
  const { volumenPorSemana } = await db.getTendenciaSemanal(null, 8);
  const chartHtml = renderMiniChart(volumenPorSemana, {
    color: 'var(--cy)',
    unidad: '',
    label: 'Volumen total por semana (últimas 8 semanas)',
    emptyText: 'Registra un par de sesiones más para ver tu tendencia.'
  });
  return `<div class="card" style="padding: 18px; border-radius: 18px;">${chartHtml}</div>`;
}

async function renderEjercicios() {
  const lista = await db.getListaEjerciciosRegistrados();

  if (lista.length === 0) {
    return `<div>${EmptyState('Sin ejercicios registrados', 'Registra una sesión para poder ver el progreso de tus ejercicios acá.')}</div>`;
  }

  const gruposPresentes = [...new Set(lista.map(e => e.grupoMuscular))];
  const listaFiltrada = ejercicioGrupoFiltro === 'todos' ? lista : lista.filter(e => e.grupoMuscular === ejercicioGrupoFiltro);

  if (!ejercicioSeleccionado || !listaFiltrada.some(e => e.nombre === ejercicioSeleccionado)) {
    ejercicioSeleccionado = listaFiltrada[0] ? listaFiltrada[0].nombre : null;
  }

  const RANGOS = [{ v: '1m', l: '1M' }, { v: '3m', l: '3M' }, { v: '6m', l: '6M' }, { v: '1a', l: '1A' }, { v: 'todo', l: 'Todo' }];
  const MODOS = [{ v: 'peso', l: 'Peso máx.' }, { v: '1rm', l: '1RM est.' }, { v: 'volumen', l: 'Volumen' }];

  const historialCompleto = ejercicioSeleccionado ? await db.getHistorialEjercicio(ejercicioSeleccionado) : [];
  const historial = filtrarPorRango(historialCompleto, ejercicioRango);
  lastEjercicioHistorial = historial;

  const chartSection = historial.length < 2
    ? `<div style="display: flex; align-items: center; justify-content: center; height: 160px; color: var(--text-disabled); font-size: 12px; text-align: center; padding: 0 16px;">Necesitas al menos 2 sesiones registradas en este rango para ver la tendencia.</div>`
    : `<div style="height: 180px;"><canvas id="lab-entreno-ejercicio"></canvas></div>`;

  return `
    <div>
      <select id="lab-entreno-ejercicio-grupo" style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); border-radius: 12px; padding: 10px 12px; font-size: 16px; font-weight: 600; margin-bottom: 10px;">
        <option value="todos">Todos los grupos</option>
        ${gruposPresentes.map(g => `<option value="${g}" ${ejercicioGrupoFiltro === g ? 'selected' : ''}>${GRUPO_MUSCULAR_LABELS[g] || g}</option>`).join('')}
      </select>

      <select id="lab-entreno-ejercicio-select" style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); border-radius: 12px; padding: 10px 12px; font-size: 16px; font-weight: 600; margin-bottom: 14px;">
        ${listaFiltrada.map(e => `<option value="${escapeHtml(e.nombre)}" ${e.nombre === ejercicioSeleccionado ? 'selected' : ''}>${escapeHtml(e.nombre)}</option>`).join('')}
      </select>

      <div style="display: flex; gap: 6px; margin-bottom: 14px;">
        ${RANGOS.map(r => `<button type="button" class="btn-lab-entreno-rango" data-rango="${r.v}" style="flex: 1; padding: 7px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid ${ejercicioRango === r.v ? 'var(--cy)' : 'var(--surface-border)'}; background: ${ejercicioRango === r.v ? 'var(--cy)' : 'transparent'}; color: ${ejercicioRango === r.v ? 'var(--bg-base)' : 'var(--text-secondary)'};">${r.l}</button>`).join('')}
      </div>

      <div class="card" style="padding: 18px 20px; border-radius: 18px;">
        <div style="display: flex; gap: 6px; margin-bottom: 14px;">
          ${MODOS.map(m => `<button type="button" class="btn-lab-entreno-modo" data-modo="${m.v}" style="flex: 1; padding: 8px; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid ${ejercicioModo === m.v ? 'var(--cy)' : 'var(--surface-border)'}; background: ${ejercicioModo === m.v ? 'var(--cy)' : 'transparent'}; color: ${ejercicioModo === m.v ? 'var(--bg-base)' : 'var(--text-secondary)'};">${m.l}</button>`).join('')}
        </div>
        ${chartSection}
      </div>
    </div>
  `;
}

async function initEjercicioChart() {
  const canvas = document.getElementById('lab-entreno-ejercicio');
  if (!canvas || lastEjercicioHistorial.length < 2) return;
  const Chart = await ensureChartJs();
  const palette = appPalette();
  const opts = baseChartOptions();

  const esPesoCorporal = lastEjercicioHistorial.every(d => d.pesoMax === 0);
  const dataPoints = lastEjercicioHistorial.map(d => {
    if (ejercicioModo === 'volumen') return d.volumenTotal;
    if (ejercicioModo === '1rm') return d.pesoMax > 0 ? db.estimar1RM(d.pesoMax, d.repsEnPesoMax || 1) : 0;
    return esPesoCorporal ? d.repsMax : d.pesoMax;
  });
  const labels = lastEjercicioHistorial.map(d => formatFechaCorta(new Date(d.fecha)));
  const unidad = ejercicioModo === 'volumen' ? '' : (esPesoCorporal && ejercicioModo !== '1rm' ? ' reps' : ' kg');

  if (ejercicioChartInstance) ejercicioChartInstance.destroy();
  // Degradado real + value labels + HD — mismo criterio que
  // ejercicio-detalle.js (misma clase de chart: progreso de un ejercicio
  // en el tiempo), solo que este vive en la pestaña "Ejercicios" del
  // Laboratorio en vez de dentro de una sesión activa.
  const gradient = verticalGradient(canvas.getContext('2d'), palette.teal, canvas.clientHeight || 180);
  ejercicioChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: dataPoints,
        borderColor: palette.teal,
        backgroundColor: gradient,
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: palette.teal,
        pointBorderColor: cssVar('--panel'),
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        borderWidth: 2.5
      }]
    },
    options: {
      ...opts,
      devicePixelRatio: hdPixelRatio(),
      layout: { padding: { top: 18 } },
      plugins: {
        ...opts.plugins,
        tooltip: { ...opts.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.parsed.y}${unidad}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.textSecondary, font: { size: 10, family: chartFontFamily() } } },
        y: { display: false }
      }
    },
    plugins: [lineValueLabelsPlugin(cssVar('--text-primary'), unidad)]
  });
}

async function renderMetas() {
  const metas = await db.getGoals('entreno');

  if (metas.length === 0) {
    return `
      <div>
        ${EmptyState('Sin metas todavía', 'Ej. "Levantar 100kg en sentadilla", "Completar 20 sesiones este trimestre" o "Correr 50km este mes"')}
        <button id="btn-lab-entreno-nueva-meta" style="margin-top: 12px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>
      </div>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${metas.map(g => renderGoalCard(g)).join('')}
      <button id="btn-lab-entreno-nueva-meta" style="margin-top: 4px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>
    </div>`;
}

const renderPRCard = (pr) => {
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
        <button class="btn-lab-fav-pr" data-nombre="${escapeHtml(pr.nombre)}" aria-label="${pr.favorito ? 'Quitar de favoritos' : 'Marcar como favorito'} ${escapeHtml(pr.nombre)}" aria-pressed="${!!pr.favorito}" style="background: transparent; border: none; cursor: pointer; padding: 2px; color: ${pr.favorito ? '#FBBF24' : 'var(--text-disabled)'};">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="${pr.favorito ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
      </div>
    </div>`;
};

async function renderRecords() {
  const prsObj = await db.getPRs();
  const prsArray = Object.values(prsObj).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  if (prsArray.length === 0) {
    return `<div>${EmptyState('Sin récords todavía', 'Registra sesiones con peso o repeticiones y tus PRs van a aparecer acá automáticamente.')}</div>`;
  }

  const gruposPresentes = [...new Set(prsArray.map(p => p.grupoMuscular))];
  const favoritos = prsArray.filter(p => p.favorito);
  const filtrados = recordsGrupoFiltro === 'todos' ? prsArray : prsArray.filter(p => p.grupoMuscular === recordsGrupoFiltro);
  const agrupados = agruparPorGrupoMuscular(filtrados, p => p.grupoMuscular);

  const filtrosHtml = `
    <div style="display: flex; gap: 8px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 2px;">
      <button type="button" class="btn-lab-records-grupo" data-grupo="todos" style="flex: 0 0 auto; padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; border: 1px solid ${recordsGrupoFiltro === 'todos' ? 'var(--cy)' : 'var(--surface-border)'}; background: ${recordsGrupoFiltro === 'todos' ? 'var(--cy)' : 'transparent'}; color: ${recordsGrupoFiltro === 'todos' ? 'var(--bg-base)' : 'var(--text-secondary)'};">Todos</button>
      ${gruposPresentes.map(g => `<button type="button" class="btn-lab-records-grupo" data-grupo="${g}" style="flex: 0 0 auto; padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; border: 1px solid ${recordsGrupoFiltro === g ? 'var(--cy)' : 'var(--surface-border)'}; background: ${recordsGrupoFiltro === g ? 'var(--cy)' : 'transparent'}; color: ${recordsGrupoFiltro === g ? 'var(--bg-base)' : 'var(--text-secondary)'};">${GRUPO_MUSCULAR_LABELS[g] || g}</button>`).join('')}
    </div>`;

  const favHtml = (recordsGrupoFiltro === 'todos' && favoritos.length > 0) ? `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 12px; font-weight: 700; color: #FBBF24; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">⭐ Favoritos</h3>
      <div style="display: flex; flex-direction: column; gap: 10px;">${favoritos.map(renderPRCard).join('')}</div>
    </div>` : '';

  const gruposHtml = agrupados.map(({ label, items }) => `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">${label}</h3>
      <div style="display: flex; flex-direction: column; gap: 10px;">${items.map(renderPRCard).join('')}</div>
    </div>`).join('');

  return `<div>${filtrosHtml}${favHtml}${gruposHtml}</div>`;
}

export async function renderTab(activeTab) {
  if (activeTab === 'tendencia') return await renderTendencia();
  if (activeTab === 'ejercicios') return await renderEjercicios();
  if (activeTab === 'metas') return await renderMetas();
  if (activeTab === 'records') return await renderRecords();
  return await renderDesglose();
}

export function initTabListeners(activeTab, refresh) {
  if (activeTab === 'desglose') {
    const metricaSel = document.getElementById('lab-entreno-desglose-metrica');
    if (metricaSel) metricaSel.addEventListener('change', (e) => { desgloseMetrica = e.target.value; refresh(); });

    document.querySelectorAll('.btn-lab-entreno-periodo').forEach(btn => {
      btn.addEventListener('click', () => { desglosePeriodo = btn.getAttribute('data-periodo'); refresh(); });
    });

    const fi = document.getElementById('lab-entreno-fecha-inicio');
    const ff = document.getElementById('lab-entreno-fecha-fin');
    if (fi) fi.addEventListener('change', (e) => { desgloseFechaInicio = e.target.value; refresh(); });
    if (ff) ff.addEventListener('change', (e) => { desgloseFechaFin = e.target.value; refresh(); });

    initDesgloseChart();
  }

  if (activeTab === 'ejercicios') {
    const grupoSel = document.getElementById('lab-entreno-ejercicio-grupo');
    if (grupoSel) grupoSel.addEventListener('change', (e) => { ejercicioGrupoFiltro = e.target.value; ejercicioSeleccionado = null; refresh(); });

    const ejSel = document.getElementById('lab-entreno-ejercicio-select');
    if (ejSel) ejSel.addEventListener('change', (e) => { ejercicioSeleccionado = e.target.value; refresh(); });

    document.querySelectorAll('.btn-lab-entreno-rango').forEach(btn => {
      btn.addEventListener('click', () => { ejercicioRango = btn.getAttribute('data-rango'); refresh(); });
    });
    document.querySelectorAll('.btn-lab-entreno-modo').forEach(btn => {
      btn.addEventListener('click', () => { ejercicioModo = btn.getAttribute('data-modo'); refresh(); });
    });

    initEjercicioChart();
  }

  if (activeTab === 'metas') {
    const btnNueva = document.getElementById('btn-lab-entreno-nueva-meta');
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
        if (confirmed) { await db.deleteGoal(id); refresh(); }
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

  if (activeTab === 'records') {
    document.querySelectorAll('.btn-lab-records-grupo').forEach(btn => {
      btn.addEventListener('click', () => { recordsGrupoFiltro = btn.getAttribute('data-grupo'); refresh(); });
    });
    document.querySelectorAll('.btn-lab-fav-pr').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const nombre = e.currentTarget.getAttribute('data-nombre');
        await db.toggleFavoritoPR(nombre);
        refresh();
      });
    });
  }
}
