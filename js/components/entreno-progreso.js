// Pantalla "Progreso" de Entreno: consolida en pestañas lo que antes vivía
// repartido — Árbol y Estándares dentro de cada categoría (GYM/Calistenia/
// HIIT), Tendencia también por categoría, y Metas en el dashboard principal
// de Entreno. Mismo motivo que el Laboratorio de Inicio/Más: evitar repetir
// la misma estructura de análisis 3 veces (una por categoría).
import { db } from '../core/db.js';
import { renderEstandaresFuerza, initEstandaresFuerzaListeners } from './estandares-fuerza.js';
import { renderArbolProgresion } from './arbol-progresion.js';
import * as LabEntreno from './lab-entreno.js';
import { renderGoalForm, initGoalForm } from './goal-form.js';
import { EmptyState } from '../utils/states.js';
import { ensureChartJs, appPalette, baseChartOptions, chartFontFamily, cssVar, hdPixelRatio, barValueLabelsPlugin } from '../utils/charts.js';

const TABS = [
  { id: 'estandares', label: 'Estándares' },
  { id: 'arbol', label: 'Árbol' },
  { id: 'tendencia', label: 'Tendencia' },
  { id: 'metas', label: 'Metas' }
];
const CATS_ARBOL = [
  { id: 'gym', label: 'GYM' },
  { id: 'calistenia', label: 'Calistenia' },
  { id: 'hiit', label: 'HIIT' }
];
const CATS_TENDENCIA = [{ id: 'todos', label: 'Todos' }, ...CATS_ARBOL];

let activeTab = 'estandares';
let categoriaArbol = 'gym';
let categoriaTendencia = 'todos';
let tendenciaChartInstance = null;

// Al entrar desde "Ver tu progreso en X" de una categoría puntual, esa
// categoría queda preseleccionada en Árbol y Tendencia — llegar a "tu
// progreso en GYM" y encontrar Calistenia seleccionada sería raro. Al
// entrar desde "Ver progreso completo" de la pantalla principal no hay
// contexto, así que se queda con lo último elegido (o el default).
export function setContextoCategoria(categoria) {
  if (!categoria) return;
  categoriaArbol = categoria;
  categoriaTendencia = categoria;
  activeTab = 'tendencia';
}

export function cleanup() {
  if (tendenciaChartInstance) { tendenciaChartInstance.destroy(); tendenciaChartInstance = null; }
}

function renderTabSelector() {
  return `
    <div style="display: flex; gap: 6px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 14px; padding: 5px; margin-bottom: 22px; overflow-x: auto;">
      ${TABS.map(t => `
        <button type="button" class="progreso-tab" data-tab="${t.id}" style="flex: 1; padding: 9px 6px; border-radius: 10px; border: none; cursor: pointer; font-size: 12.5px; font-weight: 700; white-space: nowrap; background: ${activeTab === t.id ? 'var(--accent-teal)' : 'transparent'}; color: ${activeTab === t.id ? 'var(--bg-base)' : 'var(--text-secondary)'};">${t.label}</button>
      `).join('')}
    </div>
  `;
}

function renderCategoriaSelector(cats, activa, className) {
  return `
    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
      ${cats.map(c => `
        <button type="button" class="${className}" data-cat="${c.id}" style="flex: 1; padding: 9px 6px; border-radius: 10px; border: 1px solid ${activa === c.id ? 'var(--accent-teal)' : 'var(--surface-border)'}; background: ${activa === c.id ? 'color-mix(in srgb, var(--accent-teal) 15%, transparent)' : 'transparent'}; color: ${activa === c.id ? 'var(--accent-teal)' : 'var(--text-secondary)'}; font-weight: 700; font-size: 12px; cursor: pointer;">${c.label}</button>
      `).join('')}
    </div>
  `;
}

function labelsSemanas(n) {
  return Array.from({ length: n }, (_, i) => i === n - 1 ? 'Esta sem.' : `S-${n - 1 - i}`);
}

async function renderTendencia() {
  const cat = categoriaTendencia === 'todos' ? null : categoriaTendencia;
  const esHiit = categoriaTendencia === 'hiit';
  const { volumenPorSemana, minutosPorSemana } = await db.getTendenciaSemanal(cat, 8);
  const serie = esHiit ? minutosPorSemana : volumenPorSemana;
  const hayDatos = serie.some(v => v > 0);

  const chartHtml = hayDatos
    ? `<div style="height: 160px;"><canvas id="chart-progreso-tendencia"></canvas></div>`
    : EmptyState('Sin datos todavía', 'Registra un par de sesiones más para ver tu tendencia.');

  const infoText = esHiit
    ? 'Suma total de minutos activos en tus sesiones de cardio y HIIT de cada semana.'
    : cat === 'gym'
      ? 'Total de kilos movidos por semana (Series × Reps × Peso).'
      : cat === 'calistenia'
        ? 'Cantidad total de repeticiones hechas por semana.'
        : 'Volumen combinado de todas las modalidades (kilos movidos + repeticiones a peso corporal).';

  return `
    <div>
      ${renderCategoriaSelector(CATS_TENDENCIA, categoriaTendencia, 'progreso-cat-tendencia')}
      <div class="card" style="padding: 18px; border-radius: 18px;">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">${esHiit ? 'Tendencia de constancia' : 'Tendencia de volumen'}</h3>
        ${chartHtml}
        <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 11px; color: var(--text-secondary); line-height: 1.4;">${infoText}</div>
      </div>
    </div>
  `;
}

function initTendenciaChart() {
  const canvas = document.getElementById('chart-progreso-tendencia');
  if (!canvas) return;
  db.getTendenciaSemanal(categoriaTendencia === 'todos' ? null : categoriaTendencia, 8).then(async ({ volumenPorSemana, minutosPorSemana }) => {
    const serie = categoriaTendencia === 'hiit' ? minutosPorSemana : volumenPorSemana;
    if (!serie.some(v => v > 0)) return;
    const Chart = await ensureChartJs();
    const palette = appPalette();
    const opts = baseChartOptions();
    if (tendenciaChartInstance) tendenciaChartInstance.destroy();
    tendenciaChartInstance = new Chart(canvas, {
      type: 'bar',
      data: { labels: labelsSemanas(serie.length), datasets: [{ data: serie, backgroundColor: palette.teal, borderRadius: 6, maxBarThickness: 28 }] },
      options: {
        ...opts,
        devicePixelRatio: hdPixelRatio(),
        layout: { padding: { top: 18 } },
        scales: {
          x: { grid: { display: false }, ticks: { color: palette.textSecondary, font: { size: 10, family: chartFontFamily() } } },
          y: { display: false }
        }
      },
      plugins: [barValueLabelsPlugin(cssVar('--text-primary'))]
    });
  });
}

async function renderContent() {
  if (activeTab === 'estandares') return await renderEstandaresFuerza();
  if (activeTab === 'arbol') {
    return `${renderCategoriaSelector(CATS_ARBOL, categoriaArbol, 'progreso-cat-arbol')}${await renderArbolProgresion(categoriaArbol)}`;
  }
  if (activeTab === 'tendencia') return await renderTendencia();
  if (activeTab === 'metas') return await LabEntreno.renderTab('metas');
  return '';
}

export async function renderProgreso() {
  return `
    <div>
      <h2 style="font-size: 21px; font-weight: 800; margin: 0 0 4px 0; color: var(--text-primary);">Tu Progreso</h2>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 20px 0; line-height: 1.5;">Estándares, árbol de progresión, tendencia y metas — todo en un solo lugar.</p>
      ${renderTabSelector()}
      <div id="progreso-tab-content">${await renderContent()}</div>
      ${renderGoalForm()}
    </div>
  `;
}

export function initProgresoListeners(refresh, signal) {
  document.querySelectorAll('.progreso-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab === activeTab) return;
      activeTab = tab;
      refresh();
    }, { signal });
  });

  document.querySelectorAll('.progreso-cat-arbol').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat');
      if (cat === categoriaArbol) return;
      categoriaArbol = cat;
      refresh();
    }, { signal });
  });

  document.querySelectorAll('.progreso-cat-tendencia').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat');
      if (cat === categoriaTendencia) return;
      categoriaTendencia = cat;
      refresh();
    }, { signal });
  });

  if (activeTab === 'estandares') initEstandaresFuerzaListeners(signal);
  if (activeTab === 'tendencia') initTendenciaChart();
  if (activeTab === 'metas') LabEntreno.initTabListeners('metas', refresh);

  // El modal de metas vive en el DOM mientras Progreso está montado (mismo
  // criterio que laboratorio.js) — así "+ Nueva meta" desde otra pestaña
  // que no sea Metas (ej. un link cruzado) igual encuentra el modal listo.
  initGoalForm(refresh);
}
