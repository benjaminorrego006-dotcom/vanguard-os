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

  // Tamaño de celda "objetivo" en desktop (92px, el doble del pedido
  // anterior). En vez de fijarlo como width/height en px —lo que forzaba
  // una grilla de ancho fijo (680px) que en mobile quedaba más ancha que
  // la tarjeta y se recortaba contra el `overflow-x: hidden` de `main`—
  // las columnas usan `1fr` con un `max-width` en el contenedor igual al
  // ancho que tendría la grilla a 92px/celda. Así en pantallas anchas las
  // celdas siguen midiendo 92px (el grid nunca crece más que ese máximo),
  // y en mobile se achican en proporción al ancho real disponible sin
  // desbordar ni recortarse. `aspect-ratio: 1` en cada celda las mantiene
  // cuadradas en cualquier tamaño.
  const CELL = 92; // px, tope en desktop
  const GAP = 6; // px
  const GRID_MAX = CELL * 7 + GAP * 6; // px

  const weekdayHeaderHtml = WEEKDAY_LABELS
    .map(d => `<div style="text-align: center; font-size: 11px; font-weight: 700; color: var(--text-disabled);">${d}</div>`)
    .join('');

  const cellHtml = (day) => {
    const count = countByDay[day] || 0;
    const details = detailByDay[day] || [];
    const alpha = count === 0 ? 0 : 0.28 + (count / maxCount) * 0.72;
    const detailText = details.length ? details.join(', ') : emptyLabel;
    const fullLabel = `${day} de ${monthLabel}: ${detailText}`;
    return `
      <div class="heatmap-cell tappable" data-day="${day}" data-detail="${escapeHtml(fullLabel)}" title="${escapeHtml(fullLabel)}"
        style="aspect-ratio: 1; width: 100%; border-radius: 9px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-sizing: border-box; border: 1.5px solid transparent; font-size: clamp(10px, 3.6vw, 14px); font-weight: 700; transition: border-color 0.15s ease, transform 0.1s ease; background: ${count === 0 ? 'var(--surface-2)' : accentVar}; opacity: ${count === 0 ? 1 : alpha}; color: ${count === 0 ? 'var(--text-disabled)' : '#000'};">
        ${day}
      </div>`;
  };

  let cells = '';
  for (let i = 0; i < firstWeekday; i++) cells += `<div style="aspect-ratio: 1; width: 100%;"></div>`;
  for (let day = 1; day <= daysInMonth; day++) cells += cellHtml(day);
  const totalCells = firstWeekday + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < trailing; i++) cells += `<div style="aspect-ratio: 1; width: 100%;"></div>`;

  return `
    <div id="${id}">
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: ${GAP}px; margin-bottom: 8px; width: 100%; max-width: ${GRID_MAX}px;">${weekdayHeaderHtml}</div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: ${GAP}px; width: 100%; max-width: ${GRID_MAX}px;">${cells}</div>
      <div id="${id}-detail" style="min-height: 16px; margin-top: 10px; font-size: 11.5px; color: var(--text-secondary); font-weight: 600;"></div>
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 10px; font-size: 10px; color: var(--text-disabled);">
        Menos
        <div style="width: 9px; height: 9px; border-radius: 2px; background: var(--surface-2);"></div>
        <div style="width: 9px; height: 9px; border-radius: 2px; background: ${accentVar}; opacity: 0.4;"></div>
        <div style="width: 9px; height: 9px; border-radius: 2px; background: ${accentVar};"></div>
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
