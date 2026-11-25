// js/components/ejercicio-detalle.js
import { db } from '../core/db.js';
import { ensureChartJs, baseChartOptions, chartFontFamily, hdPixelRatio, lineValueLabelsPlugin, verticalGradient } from '../utils/charts.js';
import { escapeHtml } from '../utils/escape.js';
import { formatFechaCorta, formatFechaLarga } from '../utils/fecha.js';
import { formatNumero } from '../utils/numero.js';
import { oIcono } from './orbita.js';
import { colorModulo } from '../utils/tema.js';

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
    return `<p class="o-ent-pej-nota" data-foto="prog-vacio">Aún no hay historial para graficar este ejercicio.</p>`;
  }

  const esPesoCorporal = historial.every(d => d.pesoMax === 0);
  const tieneDatos = historial.length >= 2;

  const chartHtml = tieneDatos
    ? `<div class="o-ent-graf"><canvas id="${chartCanvasId}" role="img" aria-label="Progreso de ${escapeHtml(nombre)} por sesión"></canvas></div>`
    : `<p class="o-ent-pej-nota" data-foto="prog-vacio">Necesitas al menos 2 sesiones registradas para ver la tendencia.</p>`;

  // Peso o 1RM: chips con aria-pressed (el gráfico cambia de serie).
  const toggleHtml = (tieneDatos && !esPesoCorporal) ? `
    <div id="${chartCanvasId}-toggle" class="o-chips" role="group" aria-label="Qué mostrar en el gráfico">
      <button type="button" class="o-chip btn-chart-mode" data-mode="peso" aria-pressed="true">Peso</button>
      <button type="button" class="o-chip btn-chart-mode" data-mode="1rm" aria-pressed="false">1RM</button>
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
      prEvents.push({ fecha: d.fecha, texto: `${formatNumero(d.pesoMax)} kg × ${d.repsEnPesoMax || '?'}` });
    } else if (d.pesoMax === 0 && d.repsMax > runningRepsMax) {
      runningRepsMax = d.repsMax;
      prEvents.push({ fecha: d.fecha, texto: `${formatNumero(d.repsMax)} reps` });
    }
  });
  prEvents = prEvents.reverse().slice(0, 5);

  const prHistHtml = prEvents.length > 0 ? `
    <section class="o-ent-pej-prs" aria-label="Historial de récords">
      <h5 class="o-rotulo">Historial de PRs</h5>
      <ul class="o-ent-pej-prs-lista">
        ${prEvents.map(ev => `
          <li data-foto="prog-pr">
            <span data-foto="prog-pr-fecha">${formatFechaLarga(new Date(ev.fecha))}</span>
            <b class="o-num">${oIcono('estrella')}<span data-foto="prog-pr-valor">${ev.texto}</span></b>
          </li>
        `).join('')}
      </ul>
    </section>
  ` : '';

  return `
    <section class="o-card o-ent-pej" aria-label="Progreso de ${escapeHtml(nombre)}">
      <h4 class="o-ent-pej-titulo" data-foto="prog-titulo">Progreso: ${escapeHtml(nombre)}</h4>
      ${toggleHtml}
      ${chartHtml}
      <dl class="o-ent-pej-datos">
        ${max1RM > 0 ? `<div><dd class="o-num" data-foto="prog-rm">${formatNumero(max1RM)} kg</dd><dt>1RM estimado</dt></div>` : ''}
        <div><dd class="o-num" data-foto="prog-vol">${formatNumero(ultimo.volumenTotal)}</dd><dt>Volumen última sesión</dt></div>
      </dl>
      ${prHistHtml}
    </section>
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
  // Colores del módulo (Órbita): Chart.js necesita el color real.
  const mod = colorModulo('--o-mod', 'entreno');
  const texto2 = colorModulo('--o-text-2', 'entreno');
  const opts = baseChartOptions();

  const esPesoCorporal = historial.every(d => d.pesoMax === 0);
  const pesoData = historial.map(d => esPesoCorporal ? d.repsMax : d.pesoMax);
  const rm1Data = historial.map(d => (d.pesoMax > 0) ? db.estimar1RM(d.pesoMax, d.repsEnPesoMax || 1) : 0);
  const labels = historial.map(d => formatFechaCorta(new Date(d.fecha)));

  let modo = 'peso';
  let unidad = esPesoCorporal ? ' reps' : ' kg';

  // Degradado real en vez de un alpha plano — más profundidad visual bajo
  // la línea, mismo criterio que el resto de los charts "HD" de la app.
  const gradient = verticalGradient(canvas.getContext('2d'), mod, canvas.clientHeight || 150);

  if (chartInstances.has(chartCanvasId)) chartInstances.get(chartCanvasId).destroy();
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: pesoData,
        borderColor: mod,
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: mod,
        pointBorderColor: colorModulo('--o-surface-1', 'entreno'),
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
        tooltip: { ...opts.plugins.tooltip, callbacks: { label: (ctx) => `${formatNumero(ctx.parsed.y)}${unidad}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: texto2, font: { size: 10, family: chartFontFamily() } } },
        y: { display: false }
      }
    },
    plugins: [lineValueLabelsPlugin(colorModulo('--o-text', 'entreno'), '', (v) => formatNumero(v))]
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

        toggleContainer.querySelectorAll('.btn-chart-mode').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      });
    });
  }
}