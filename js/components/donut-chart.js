// js/components/donut-chart.js
// Dona de Chart.js + leyenda, reutilizable entre secciones (antes cada
// vista tenía su propia copia casi idéntica: analisis.js para desglose por
// grupo muscular, tareas.js para completadas/pendientes, finanzas.js para
// gasto por categoría).
import { ensureChartJs, baseChartOptions, cssVar } from '../utils/charts.js';

const instances = new Map(); // canvasId -> instancia Chart.js activa

// Canvas no entiende `var(--x)` (no es parte del cascade de CSS) — a
// diferencia de un color puesto en un estilo inline, que sí lo resuelve el
// navegador solo. Cualquier entry.color en formato var(...) hay que
// resolverlo a su valor real (hex/rgb) antes de dárselo a Chart.js.
function resolveColor(color) {
  if (typeof color === 'string' && color.trim().startsWith('var(')) {
    const varName = color.trim().slice(4, -1).split(',')[0].trim();
    return cssVar(varName) || color;
  }
  return color;
}

/**
 * @param {string} canvasId - id del <canvas> ya insertado en el DOM.
 * @param {{label:string, valor:number, color:string}[]} entries - solo
 *   entradas con valor > 0; el caller decide el estado vacío.
 * @param {object} [opts]
 * @param {string} [opts.cutout] - grosor del anillo, ej. '68%'.
 * @param {(ctx, entry) => string} [opts.tooltipLabel] - texto del tooltip.
 */
export async function renderDonutChart(canvasId, entries, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || entries.length === 0) return null;

  const Chart = await ensureChartJs();
  const baseOpts = baseChartOptions();

  const prev = instances.get(canvasId);
  if (prev) prev.destroy();

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: entries.map(e => e.label),
      datasets: [{
        data: entries.map(e => e.valor),
        backgroundColor: entries.map(e => resolveColor(e.color)),
        borderColor: 'transparent',
        hoverOffset: 6
      }]
    },
    options: {
      ...baseOpts,
      cutout: opts.cutout || '68%',
      plugins: {
        ...baseOpts.plugins,
        tooltip: {
          ...baseOpts.plugins.tooltip,
          callbacks: {
            label: (ctx) => opts.tooltipLabel ? opts.tooltipLabel(ctx, entries[ctx.dataIndex]) : `${ctx.label}: ${ctx.parsed}`
          }
        }
      }
    }
  });
  instances.set(canvasId, chart);
  return chart;
}

// El router (app.js) llama esto al salir de la vista que montó estas donas
// — sin esto, navegar a otra pestaña deja el canvas viejo desmontado del
// DOM pero la instancia de Chart.js sigue viva en este Map hasta que
// alguien vuelva a pedir esa misma canvasId (si es que vuelve).
export function destroyAllDonuts() {
  instances.forEach(chart => chart.destroy());
  instances.clear();
}

// Leyenda simple a juego con la dona: color + etiqueta + % del total.
export function renderDonutLegend(entries) {
  const total = entries.reduce((sum, e) => sum + e.valor, 0);
  return entries.map(e => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 10px; height: 10px; border-radius: 3px; background: ${e.color}; flex-shrink: 0;"></span>
        <span style="font-size: 12.5px; color: var(--text-primary); font-weight: 600;">${e.label}</span>
      </div>
      <span style="font-size: 12.5px; color: var(--text-secondary); font-weight: 700;">${total > 0 ? Math.round(e.valor / total * 100) : 0}%</span>
    </div>`).join('');
}
