// Mapa de calor tipo GitHub, reutilizable entre secciones: cada una arma su
// propio countByDay/detailByDay a partir de sus datos y pasa el color de
// acento que le corresponde (--accent-teal en Entreno, --accent-purple en
// Tareas y Finanzas) — este componente no sabe nada de sesiones, tareas ni
// transacciones, solo dibuja la grilla y maneja la interacción.

import { escapeHtml } from '../utils/escape.js';

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // lunes primero

// countByDay: { [day]: number }, detailByDay: { [day]: string[] }
export function renderActivityHeatmap({ id, monthLabel, year, month, countByDay, detailByDay, accentVar, emptyLabel = 'Sin actividad' }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const maxCount = Math.max(1, ...Object.values(countByDay), 0);

  const weekdayHeaderHtml = WEEKDAY_LABELS
    .map(d => `<div style="text-align: center; font-size: 9px; font-weight: 700; color: var(--text-disabled);">${d}</div>`)
    .join('');

  const cellHtml = (day) => {
    const count = countByDay[day] || 0;
    const details = detailByDay[day] || [];
    const alpha = count === 0 ? 0 : 0.28 + (count / maxCount) * 0.72;
    const detailText = details.length ? details.join(', ') : emptyLabel;
    const fullLabel = `${day} de ${monthLabel}: ${detailText}`;
    return `
      <div class="heatmap-cell tappable" data-day="${day}" data-detail="${escapeHtml(fullLabel)}" title="${escapeHtml(fullLabel)}"
        style="aspect-ratio: 1; border-radius: 5px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-sizing: border-box; border: 1.5px solid transparent; font-size: 9.5px; font-weight: 700; transition: border-color 0.15s ease; background: ${count === 0 ? 'var(--surface-2)' : accentVar}; opacity: ${count === 0 ? 1 : alpha}; color: ${count === 0 ? 'var(--text-disabled)' : 'var(--text-primary)'};">
        ${day}
      </div>`;
  };

  let cells = '';
  for (let i = 0; i < firstWeekday; i++) cells += `<div></div>`;
  for (let day = 1; day <= daysInMonth; day++) cells += cellHtml(day);
  const totalCells = firstWeekday + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < trailing; i++) cells += `<div></div>`;

  return `
    <div id="${id}">
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 6px;">${weekdayHeaderHtml}</div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">${cells}</div>
      <div id="${id}-detail" style="min-height: 16px; margin-top: 10px; font-size: 11.5px; color: var(--text-secondary); font-weight: 600;"></div>
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 10px; font-size: 10px; color: var(--text-disabled);">
        Menos
        <div style="width: 10px; height: 10px; border-radius: 2px; background: var(--surface-2);"></div>
        <div style="width: 10px; height: 10px; border-radius: 2px; background: ${accentVar}; opacity: 0.4;"></div>
        <div style="width: 10px; height: 10px; border-radius: 2px; background: ${accentVar};"></div>
        Más
      </div>
    </div>
  `;
}

// Click/tap (funciona igual con mouse y touch) muestra el detalle del día
// bajo la grilla; el `title` nativo ya cubre el hover instantáneo en desktop.
export function initActivityHeatmapListeners(id, accentVar) {
  const container = document.getElementById(id);
  if (!container) return;
  const detailEl = document.getElementById(`${id}-detail`);

  container.querySelectorAll('.heatmap-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      container.querySelectorAll('.heatmap-cell').forEach(c => { c.style.borderColor = 'transparent'; });
      cell.style.borderColor = accentVar;
      if (detailEl) detailEl.textContent = cell.getAttribute('data-detail');
    });
  });
}
