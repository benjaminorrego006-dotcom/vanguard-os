// js/components/ejercicio-detalle.js
import { db } from '../core/db.js';
import { ensureChartJs, appPalette, baseChartOptions } from '../utils/charts.js';

const chartInstances = new Map(); // canvasId -> Chart instance (para destruir al re-togglear)

// Llamado por entrenamiento.js al salir de Entreno (o de una sesión en
// curso) — mismo motivo que destroyAllDonuts() en donut-chart.js: sin
// esto, la instancia sigue viva con el canvas ya desmontado del DOM.
export function cleanupEjercicioCharts() {
  chartInstances.forEach(chart => chart.destroy());
  chartInstances.clear();
}

export function renderEjercicioDetalle(nombre, historial, chartCanvasId) {
  if (!historial || historial.length === 0) {
    return `<div style="padding: 16px; color: var(--text-secondary); text-align: center; font-size: 13px;">Aún no hay historial para graficar este ejercicio.</div>`;
  }

  const esPesoCorporal = historial.every(d => d.pesoMax === 0);
  const tieneDatos = historial.length >= 2;

  const chartHtml = tieneDatos
    ? `<div style="height: 130px;"><canvas id="${chartCanvasId}"></canvas></div>`
    : `<div style="display:flex; align-items:center; justify-content:center; height:90px; color: var(--text-disabled); font-size: 12px;">Necesitas al menos 2 sesiones registradas para ver la tendencia.</div>`;

  const toggleHtml = (tieneDatos && !esPesoCorporal) ? `
    <div id="${chartCanvasId}-toggle" style="display: flex; gap: 6px; margin-bottom: 10px;">
      <button type="button" class="btn-chart-mode" data-mode="peso" style="flex: 1; padding: 6px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid var(--accent-teal); background: var(--accent-teal); color: #000;">Peso</button>
      <button type="button" class="btn-chart-mode" data-mode="1rm" style="flex: 1; padding: 6px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid var(--surface-border); background: transparent; color: var(--text-secondary);">1RM</button>
    </div>
  ` : '';

  let max1RM = 0;
  historial.forEach(d => {
    if (d.pesoMax > 0) {
      const rm = db.estimar1RM(d.pesoMax, d.repsEnPesoMax || 1);
      if (rm > max1RM) max1RM = rm;
    }
  });

  const ultimo = historial[historial.length - 1];

  // Historial de PRs: derivado del mismo historial de sesiones (no se
  // guarda estado aparte) — recorre en orden cronológico y registra cada
  // sesión en la que se superó la mejor marca previa.
  let prEvents = [];
  let runningPesoMax = 0;
  let runningRepsMax = 0;
  historial.forEach(d => {
    if (d.pesoMax > runningPesoMax) {
      runningPesoMax = d.pesoMax;
      prEvents.push({ fecha: d.fecha, texto: `${d.pesoMax}kg × ${d.repsEnPesoMax || '?'}` });
    } else if (d.pesoMax === 0 && d.repsMax > runningRepsMax) {
      runningRepsMax = d.repsMax;
      prEvents.push({ fecha: d.fecha, texto: `${d.repsMax} reps` });
    }
  });
  prEvents = prEvents.reverse().slice(0, 5);

  const prHistHtml = prEvents.length > 0 ? `
    <div style="margin-top: 14px;">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Historial de PRs</div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${prEvents.map(ev => `
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
            <span style="color: var(--text-secondary);">${new Date(ev.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span style="color: var(--accent-teal); font-weight: 700;">🏆 ${ev.texto}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `
    <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 16px;">
      <h4 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Progreso: ${nombre}</h4>

      ${toggleHtml}
      ${chartHtml}

      <div style="display: flex; gap: 8px; margin-top: 14px;">
        ${max1RM > 0 ? `
          <div style="flex: 1; background: var(--surface-2); border: 1px solid var(--surface-border); border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 16px; font-weight: 800; color: var(--accent-teal);">${max1RM}kg</div>
            <div style="font-size: 10px; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">1RM estimado</div>
          </div>
        ` : ''}
        <div style="flex: 1; background: var(--surface-2); border: 1px solid var(--surface-border); border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">${ultimo.volumenTotal}</div>
          <div style="font-size: 10px; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">Volumen última sesión</div>
        </div>
      </div>

      ${prHistHtml}
    </div>
  `;
}

// Debe llamarse DESPUÉS de insertar el HTML de renderEjercicioDetalle() en
// el DOM (el canvas tiene que existir ya). Dibuja el peso (o reps, si es
// ejercicio de peso corporal) máximo alcanzado en cada sesión, en orden
// cronológico, para ver si el usuario está progresando.
export async function initEjercicioDetalleChart(chartCanvasId, historial) {
  const canvas = document.getElementById(chartCanvasId);
  if (!canvas || !historial || historial.length < 2) return;

  const Chart = await ensureChartJs();
  const palette = appPalette();
  const opts = baseChartOptions();

  const esPesoCorporal = historial.every(d => d.pesoMax === 0);
  const pesoData = historial.map(d => esPesoCorporal ? d.repsMax : d.pesoMax);
  const rm1Data = historial.map(d => (d.pesoMax > 0) ? db.estimar1RM(d.pesoMax, d.repsEnPesoMax || 1) : 0);
  const labels = historial.map(d => new Date(d.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));

  let modo = 'peso';
  let unidad = esPesoCorporal ? ' reps' : ' kg';

  if (chartInstances.has(chartCanvasId)) chartInstances.get(chartCanvasId).destroy();
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: pesoData,
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
        x: { grid: { display: false }, ticks: { color: palette.textSecondary, font: { size: 10 } } },
        y: { display: false }
      }
    }
  });
  chartInstances.set(chartCanvasId, chart);

  const toggleContainer = document.getElementById(`${chartCanvasId}-toggle`);
  if (toggleContainer && !esPesoCorporal) {
    toggleContainer.querySelectorAll('.btn-chart-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        modo = btn.getAttribute('data-mode');
        unidad = modo === '1rm' ? ' kg (1RM)' : ' kg';
        chart.data.datasets[0].data = modo === '1rm' ? rm1Data : pesoData;
        chart.update();

        toggleContainer.querySelectorAll('.btn-chart-mode').forEach(b => {
          const active = b === btn;
          b.style.background = active ? 'var(--accent-teal)' : 'transparent';
          b.style.borderColor = active ? 'var(--accent-teal)' : 'var(--surface-border)';
          b.style.color = active ? '#000' : 'var(--text-secondary)';
        });
      });
    });
  }
}