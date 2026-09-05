// js/components/mini-chart.js

/**
 * Genera un gráfico de línea minimalista con número destacado y tendencia.
 * @param {number[]} data - valores en orden cronológico (antiguo → reciente)
 * @param {object} opts
 * @param {string} opts.color - color de acento (usa variables CSS, ej. 'var(--accent-purple)')
 * @param {string} opts.unidad - sufijo para el número grande, ej. 'kg', ' min'
 * @param {string} opts.label - etiqueta bajo el número grande
 * @param {string} opts.emptyText - texto cuando no hay datos suficientes
 */
export function renderMiniChart(data, opts = {}) {
  const {
    color = 'var(--accent-purple)',
    unidad = '',
    label = '',
    emptyText = 'Sin datos suficientes todavía.',
    height = 90,
    width = 300
  } = opts;

  const valores = (data || []).filter(v => typeof v === 'number' && !isNaN(v));
  const tieneDatos = valores.length >= 2 && valores.some(v => v > 0);

  if (!tieneDatos) {
    return `
      <div style="display:flex; align-items:center; justify-content:center; height:${height}px; color: var(--text-disabled); font-size: 12px;">
        ${emptyText}
      </div>
    `;
  }

  const actual = valores[valores.length - 1];
  const anterior = valores[valores.length - 2];
  let deltaHtml = '';
  if (anterior > 0) {
    const pct = Math.round(((actual - anterior) / anterior) * 100);
    const sign = pct >= 0 ? '+' : '';
    const deltaColor = pct >= 0 ? 'var(--state-success)' : 'var(--text-secondary)';
    deltaHtml = `<span class="num" style="color:${deltaColor}; font-size: 12px; font-weight: 700; margin-left: 8px;">${sign}${pct}%</span>`;
  }

  const min = Math.min(...valores);
  const max = Math.max(...valores) || 1;
  const pad = 6;
  const scaleX = (i) => pad + (i / (valores.length - 1)) * (width - pad * 2);
  const scaleY = (v) => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2 - 20) - 4;

  let pathD = `M ${scaleX(0)} ${scaleY(valores[0])}`;
  valores.forEach((v, i) => { if (i > 0) pathD += ` L ${scaleX(i)} ${scaleY(v)}`; });
  const areaD = `${pathD} L ${scaleX(valores.length - 1)} ${height - pad} L ${scaleX(0)} ${height - pad} Z`;

  const gradId = `grad-${Math.random().toString(36).slice(2, 8)}`;

  let dataPointsHtml = '';
  valores.forEach((v, i) => {
    const cx = scaleX(i);
    const cy = scaleY(v);
    // Número (valor) encima del punto, si es mayor a 0
    if (v > 0) {
      const textY = cy < 15 ? cy + 12 : cy - 6; 
      dataPointsHtml += `<text x="${cx}" y="${textY}" fill="var(--text-secondary)" font-size="9" font-weight="500" text-anchor="middle">${v}</text>`;
    }
    // Círculo en cada punto (más grande el último)
    if (v > 0 || i === valores.length - 1) {
      dataPointsHtml += `<circle cx="${cx}" cy="${cy}" r="${i === valores.length - 1 ? 4 : 2.5}" fill="${color}"/>`;
    }
    // Etiqueta de semana (eje X)
    dataPointsHtml += `<text x="${cx}" y="${height + 12}" fill="var(--text-disabled)" font-size="9" text-anchor="middle">S${i+1}</text>`;
  });

  return `
    <div>
      <div style="display:flex; align-items:baseline; margin-bottom: 8px;">
        <span style="font-size: 28px; font-weight: 800; color: var(--text-primary); line-height:1;">${actual}${unidad}</span>
        ${deltaHtml}
      </div>
      <div style="padding-bottom: 16px;"> <!-- Extra padding para las labels S1, S2 -->
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;" preserveAspectRatio="none">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="var(--surface-border)" stroke-width="1"/>
          <path d="${areaD}" fill="url(#${gradId})" stroke="none"/>
          <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${dataPointsHtml}
        </svg>
      </div>
      ${label ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${label}</div>` : ''}
    </div>
  `;
}