// Gráficos de Hábitos del Laboratorio — Hábitos todavía no tenía presencia
// acá (a diferencia de Entreno/Finanzas/Tareas), aunque ya tiene fila
// propia en Inicio. Mismo contrato que el resto de los lab-*.js (TABS,
// renderTab, initTabListeners, cleanup), calcado de lab-tareas.js por ser
// el más chico: Desglose por hábito + Tendencia diaria de cumplimiento.
import { db } from '../core/db.js';
import { renderDonutChart, renderDonutLegend, destroyAllDonuts } from './donut-chart.js';
import { EmptyState } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';

export const TABS = [
  { id: 'desglose', label: 'Desglose' }
];

// Variantes del acento violeta (mismo que Tareas: Hábitos comparte scope
// MK III con esa sección) para distinguir hábitos en la dona sin salirse
// de la paleta — mismo criterio que getCyanShades() en lab-entreno.js.
const VIOLET_SHADES = ['var(--vi)', 'var(--vib)', 'var(--vid)', 'var(--vip)', 'var(--vis)'];

let lastHabitosDonutEntries = [];

export function cleanup() {
  destroyAllDonuts();
}

// Sin ningún hábito creado, la sección entera se resuelve como "sin
// datos" desde el orquestador (laboratorio.js).
export async function tieneDatos() {
  const habitos = await db.getHabitos();
  return habitos.length > 0;
}

async function renderDesglose() {
  const [habitos, racha, cumplimientoHoy] = await Promise.all([
    db.getHabitos(),
    db.getRachaHabitosGlobal(),
    db.getCumplimientoDiarioHabitos(1)
  ]);

  const entries = habitos
    .map((h, i) => ({
      label: escapeHtml(h.nombre),
      valor: Object.keys(h.marcas || {}).length,
      color: VIOLET_SHADES[i % VIOLET_SHADES.length]
    }))
    .filter(e => e.valor > 0);
  lastHabitosDonutEntries = entries;

  const donutSection = entries.length === 0
    ? EmptyState('Sin hábitos marcados todavía', 'Marca un hábito para ver su distribución acá.')
    : `<div style="height: 200px;"><canvas id="lab-hab-donut"></canvas></div><div style="margin-top: 14px;">${renderDonutLegend(entries)}</div>`;

  const resumenCardHtml = (label, value) => `
    <div class="card" style="padding: 16px; border-radius: 16px; text-align: center;">
      <div class="num" style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${value}</div>
      <div style="font-size: 10.5px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px;">${label}</div>
    </div>`;

  return `
    <div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        ${resumenCardHtml('Hábitos activos', habitos.length)}
        ${resumenCardHtml('Cumplimiento hoy', `${cumplimientoHoy[0] || 0}%`)}
        ${resumenCardHtml('Racha actual', racha.actual)}
      </div>
      <div class="card" style="padding: 18px 20px; margin-bottom: 20px; border-radius: 18px;">
        <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Días marcados por hábito</h3>
        ${donutSection}
      </div>
      <div class="card" style="padding: 18px 20px; border-radius: 18px; text-align: center;">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 6px;">Mejor racha histórica</div>
        <div class="num" style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${racha.mejor} día${racha.mejor === 1 ? '' : 's'}</div>
      </div>
    </div>
  `;
}

async function initDesgloseChart() {
  if (lastHabitosDonutEntries.length === 0) return;
  await renderDonutChart('lab-hab-donut', lastHabitosDonutEntries);
}

export async function renderTab(activeTab) {
  return await renderDesglose();
}

export function initTabListeners(activeTab, refresh) {
  if (activeTab === 'desglose') {
    initDesgloseChart();
  }
}
