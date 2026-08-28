// js/utils/charts.js
// Carga perezosa de Chart.js (vendorizado en js/vendor/chart.js, build UMD)
// y helpers compartidos para que los gráficos usen la misma paleta que el
// resto de la app.

let chartJsPromise = null;

// Chart.js UMD se auto-registra en window.Chart al ejecutarse (no exporta
// bindings ES, por eso el import es de solo efecto). Se cachea la promesa
// para no volver a cargarlo si varias vistas piden un gráfico a la vez.
export function ensureChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!chartJsPromise) {
    // OJO: este módulo puede correr desde un Blob URL (ver loadModuleGraph
    // en app.js), donde un import() relativo no resuelve. Se arma la URL
    // absoluta contra location.href, igual que hace app.js con las vistas.
    const chartJsUrl = new URL('js/vendor/chart.js', location.href).href;
    chartJsPromise = (async () => {
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await import(attempt === 0 ? chartJsUrl : `${chartJsUrl}?retry=${Date.now()}_${attempt}`);
          if (!window.Chart) throw new Error('Chart.js no se registró en window.Chart tras cargarlo.');
          return window.Chart;
        } catch (err) {
          lastErr = err;
          if (attempt < 2) await new Promise(r => setTimeout(r, 150 * (attempt + 1)));
        }
      }
      throw lastErr;
    })();
  }
  return chartJsPromise;
}

// Resuelve una variable CSS (--accent-purple, etc.) a su valor real, porque
// el canvas 2D no entiende var(--x) como fillStyle/borderColor.
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Paleta de acentos ya usada en el resto de la app, resuelta a valores reales.
export function appPalette() {
  return {
    purple: cssVar('--accent-purple'),
    teal: cssVar('--accent-teal'),
    blue: cssVar('--accent-blue'),
    orange: cssVar('--accent-orange'),
    high: cssVar('--state-high'),
    medium: cssVar('--state-medium'),
    low: cssVar('--state-low'),
    success: cssVar('--state-success'),
    textSecondary: cssVar('--text-secondary'),
    surfaceBorder: cssVar('--surface-border')
  };
}

// Familia tipográfica para texto de Chart.js (ticks, tooltips): el canvas
// no hereda CSS, así que el toggle de Vanguard MK III (html.mk3-entreno /
// html.mk3-finanzas, ver components.css) no le llega solo — hay que
// preguntarle a la clase directamente. Devuelve undefined fuera de esos
// scopes para que Chart.js use su propia fuente por defecto (Tareas, que
// todavía no migró).
export function chartFontFamily() {
  const root = document.documentElement.classList;
  return (root.contains('mk3-entreno') || root.contains('mk3-finanzas'))
    ? "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    : undefined;
}

// Config base compartida: sin dependencias externas, fuente y colores
// consistentes con la paleta oscura de la app.
export function baseChartOptions() {
  const p = appPalette();
  const family = chartFontFamily();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVar('--surface-2'),
        titleColor: cssVar('--text-primary'),
        bodyColor: p.textSecondary,
        borderColor: p.surfaceBorder,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        titleFont: family ? { family } : undefined,
        bodyFont: family ? { family } : undefined
      }
    }
  };
}
