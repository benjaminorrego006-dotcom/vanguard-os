// js/utils/progressRing.js
// Anillo de progreso circular estilo Apple Watch: track de fondo + arco de
// progreso con el color de acento de la categoría, y un texto centrado
// (ej. "2/3") en vez de un ícono estático.
export function renderProgressRing({ percent = 0, color = 'var(--accent-teal)', size = 56, strokeWidth = 5, centerText = '' } = {}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const half = size / 2;
  const fontSize = Math.round(size * 0.24);

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg); flex-shrink: 0;">
      <circle cx="${half}" cy="${half}" r="${radius}" fill="none" stroke="var(--surface-border)" stroke-width="${strokeWidth}" />
      <circle cx="${half}" cy="${half}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
        stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round"
        style="transition: stroke-dashoffset 0.6s ease;" />
      ${centerText ? `<text x="${half}" y="${half}" transform="rotate(90 ${half} ${half})" text-anchor="middle" dominant-baseline="central" fill="var(--text-primary)" font-size="${fontSize}" font-weight="700" font-family="var(--font-body)">${centerText}</text>` : ''}
    </svg>
  `;
}
