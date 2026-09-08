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
//
// OJO: se lee de #view-root, NO de document.documentElement. Desde el
// refactor que bajó el scope de Vanguard MK III de <html> a #view-root
// (ver app.js: this.root.classList.toggle('mk3-entreno', ...)), las clases
// mk3-entreno/mk3-finanzas/mk3-tareas nunca vuelven a estar en <html> —
// leer de ahí devolvía siempre el valor de :root sin ninguna de las
// redefiniciones por módulo (ej. --accent-teal quedaba fijo en su default
// #06B6D4 en vez de heredar --cy retinteado dentro de Entreno). Los
// gráficos que piden un token semántico (--accent-purple/--accent-teal, no
// el token base --cy/--am/--vi directo) quedaban con el color del acento
// de marca o el default viejo sin importar qué módulo estaba montado.
export function cssVar(name) {
  const scope = document.getElementById('view-root') || document.documentElement;
  return getComputedStyle(scope).getPropertyValue(name).trim();
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
// html.mk3-finanzas / html.mk3-tareas, ver components.css) no le llega
// solo — hay que preguntarle a la clase directamente. Devuelve undefined
// fuera de esos scopes para que Chart.js use su propia fuente por defecto.
export function chartFontFamily() {
  const scope = document.getElementById('view-root') || document.documentElement;
  const classes = scope.classList;
  return (classes.contains('mk3-entreno') || classes.contains('mk3-finanzas') || classes.contains('mk3-tareas'))
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

// Piso de 2 para devicePixelRatio: Chart.js no siempre toma el valor real
// de la pantalla en todos los entornos, y con 1 el canvas se ve borroso en
// cualquier panel de alta densidad de píxeles (la mayoría de los
// teléfonos). Repetir `Math.max(2, window.devicePixelRatio || 1)` en cada
// chart invitaba a que alguno se olvidara — un solo lugar que lo define.
export function hdPixelRatio() {
  return Math.max(2, window.devicePixelRatio || 1);
}

// Dibuja el valor de cada barra arriba de ella con Canvas 2D directo, en
// vez de sumar chartjs-plugin-datalabels como dependencia nueva. Pensado
// para charts de un solo dataset con el eje Y oculto (decorativo) — sin
// esto el número solo se ve al tocar/hacer hover.
export function barValueLabelsPlugin(color) {
  return {
    id: 'barValueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const data = chart.data.datasets[0].data;
      ctx.save();
      ctx.font = '600 10px ' + (chartFontFamily() || 'sans-serif');
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      meta.data.forEach((bar, i) => {
        if (!data[i]) return;
        ctx.fillText(String(data[i]), bar.x, bar.y - 8);
      });
      ctx.restore();
    }
  };
}

// Igual que barValueLabelsPlugin pero para barras horizontales
// (`indexAxis: 'y'`): la geometría es incompatible con la variante
// vertical — ahí `bar.x/bar.y` son el centro-arriba de la barra, acá
// `bar.x` es su extremo derecho y `bar.y` el centro vertical, así que el
// label se ancla a la derecha de la barra en vez de arriba. `formatter`
// opcional para series que no son números crudos (ej. moneda).
export function horizontalBarValueLabelsPlugin(color, formatter = String) {
  return {
    id: 'horizontalBarValueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const data = chart.data.datasets[0].data;
      ctx.save();
      ctx.font = '600 11px ' + (chartFontFamily() || 'sans-serif');
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      meta.data.forEach((bar, i) => {
        if (!data[i]) return;
        ctx.fillText(formatter(data[i]), bar.x + 8, bar.y);
      });
      ctx.restore();
    }
  };
}

// Misma idea que barValueLabelsPlugin, para charts de línea/puntos. `suffix`
// opcional para series en porcentaje (Hábitos: "42%" en vez de "42").
export function lineValueLabelsPlugin(color, suffix = '') {
  return {
    id: 'lineValueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const data = chart.data.datasets[0].data;
      ctx.save();
      ctx.font = '600 10px ' + (chartFontFamily() || 'sans-serif');
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      meta.data.forEach((point, i) => {
        if (!data[i]) return;
        ctx.fillText(`${data[i]}${suffix}`, point.x, point.y - 10);
      });
      ctx.restore();
    }
  };
}

// Degradado vertical real (no un alpha plano) para el relleno bajo una
// línea — mismo criterio "HD" en todos los line charts de la app.
export function verticalGradient(ctx2d, colorHex, heightPx) {
  const gradient = ctx2d.createLinearGradient(0, 0, 0, heightPx || 150);
  gradient.addColorStop(0, colorHex + '55');
  gradient.addColorStop(1, colorHex + '02');
  return gradient;
}
