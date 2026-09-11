// Gráficos de Tareas del Laboratorio (ex Análisis > Tareas) — se habían
// sacado sin reemplazo en 17e7d1e cuando Tareas salió del nav; con Tareas
// de vuelta, se recuperan acá. Desglose por estado, Tendencia semanal,
// Racha de días con al menos una tarea completada, e Historial.
import { db } from '../core/db.js';
import { renderDonutChart, renderDonutLegend, destroyAllDonuts } from './donut-chart.js';
import { EmptyState } from '../utils/states.js';
import { formatFechaLarga } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';

export const TABS = [
  { id: 'desglose', label: 'Desglose' },
  { id: 'racha', label: 'Racha' },
  { id: 'historial', label: 'Historial' }
];

let lastTareasDonutEntries = [];
let tareasHistorialOrden = 'desc'; // 'desc' | 'asc'

export function cleanup() {
  destroyAllDonuts();
}

// Sin ninguna tarea creada, la sección entera se resuelve como "sin
// datos" desde el orquestador (laboratorio.js).
export async function tieneDatos() {
  const tasks = await db.getTasks();
  return tasks.length > 0;
}

async function renderDesglose() {
  const tasks = await db.getTasks();
  const counts = { todo: 0, 'in-progress': 0, done: 0 };
  tasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });

  const entries = [
    { label: 'Completadas', valor: counts.done, color: 'var(--vi)' },
    { label: 'En curso', valor: counts['in-progress'], color: 'var(--vib)' },
    { label: 'Pendientes', valor: counts.todo, color: 'var(--vid)' }
  ].filter(e => e.valor > 0);
  lastTareasDonutEntries = entries;

  const donutSection = entries.length === 0
    ? EmptyState('Sin tareas todavía', 'Crea tu primera tarea para ver el desglose.')
    : `<div style="height: 200px;"><canvas id="lab-tar-donut"></canvas></div><div style="margin-top: 14px;">${renderDonutLegend(entries)}</div>`;

  const tasa = await db.getTasaCumplimientoTareas();
  const tasaHtml = tasa.tasa === null
    ? `<div style="font-size: 12.5px; color: var(--text-secondary);">Todavía no hay tareas completadas con fecha límite para medir la tasa de cumplimiento.</div>`
    : `<div style="display: flex; align-items: baseline; gap: 8px;"><span style="font-size: 28px; font-weight: 800; color: var(--text-primary);">${tasa.tasa}%</span><span style="font-size: 12px; color: var(--text-secondary);">a tiempo (${tasa.aTiempo} de ${tasa.total})</span></div>`;

  return `
    <div>
      <div class="card" style="padding: 18px 20px; margin-bottom: 20px; border-radius: 18px;">
        <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Estado actual</h3>
        ${donutSection}
      </div>
      <div class="card" style="padding: 18px; border-radius: 18px;">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">Tasa de cumplimiento</h3>
        ${tasaHtml}
      </div>
    </div>
  `;
}

async function initDesgloseChart() {
  if (lastTareasDonutEntries.length === 0) return;
  await renderDonutChart('lab-tar-donut', lastTareasDonutEntries);
}

async function renderRacha() {
  const racha = await db.getRachaTareas();
  return `
    <div class="card" style="padding: 28px 24px; border-radius: 18px; text-align: center;">
      <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 10px;">Racha actual</div>
      <div class="num" style="font-size: 48px; font-weight: 800; color: var(--text-primary);">${racha.actual}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">día${racha.actual === 1 ? '' : 's'} seguido${racha.actual === 1 ? '' : 's'} con al menos una tarea completada</div>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--surface-border);">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 6px;">Mejor histórica</div>
        <div class="num" style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${racha.mejor} día${racha.mejor === 1 ? '' : 's'}</div>
      </div>
    </div>
  `;
}

async function renderHistorial() {
  const tasks = await db.getTasks();
  const completadas = tasks.filter(t => t.status === 'done' && t.completedAt);
  completadas.sort((a, b) => tareasHistorialOrden === 'desc'
    ? new Date(b.completedAt) - new Date(a.completedAt)
    : new Date(a.completedAt) - new Date(b.completedAt));

  if (completadas.length === 0) {
    return `<div>${EmptyState('Sin tareas completadas todavía', 'Cuando termines tareas, van a aparecer acá.')}</div>`;
  }

  const rowsHtml = completadas.map(t => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--surface-border);">
      <span style="font-size: 13.5px; color: var(--text-primary); font-weight: 600;">${escapeHtml(t.title)}</span>
      <span style="font-size: 11.5px; color: var(--text-secondary); flex-shrink: 0; margin-left: 12px;">${formatFechaLarga(new Date(t.completedAt))}</span>
    </div>
  `).join('');

  return `
    <div>
      <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
        <button type="button" id="btn-lab-tareas-historial-orden" style="background: transparent; border: 1px solid var(--surface-border); color: var(--text-secondary); padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer;">${tareasHistorialOrden === 'desc' ? 'Más reciente primero' : 'Más antigua primero'}</button>
      </div>
      <div class="card" style="padding: 4px 18px; border-radius: 18px;">${rowsHtml}</div>
    </div>
  `;
}

export async function renderTab(activeTab) {
  if (activeTab === 'racha') return await renderRacha();
  if (activeTab === 'historial') return await renderHistorial();
  return await renderDesglose();
}

export function initTabListeners(activeTab, refresh) {
  if (activeTab === 'desglose') {
    initDesgloseChart();
  }

  if (activeTab === 'historial') {
    const btnOrden = document.getElementById('btn-lab-tareas-historial-orden');
    if (btnOrden) btnOrden.addEventListener('click', () => {
      tareasHistorialOrden = tareasHistorialOrden === 'desc' ? 'asc' : 'desc';
      refresh();
    });
  }
}
