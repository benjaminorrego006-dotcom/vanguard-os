// Mapa de calor tipo GitHub, reutilizable entre secciones: cada una arma su
// propio countByDay/detailByDay a partir de sus datos y pasa el color de
// acento que le corresponde (--accent-teal en Entreno, --am en Finanzas,
// --accent-purple en Tareas) — este componente no sabe nada de sesiones, tareas ni
// transacciones, solo dibuja la grilla y maneja la interacción.
//
// Días (docs/PLAN-PENDIENTES-OCT.md, A3): al montar los listeners lee el
// descanso y la nota de cada día del mes (db.getDias) y decora las celdas:
// descanso sin actividad rayado y neutro, nota con un punto chico. El
// detalle del día tocado suma el descanso, la nota y un botón "Día" que
// abre la hoja para editarlos.

import { escapeHtml } from '../utils/escape.js';
import { db } from '../core/db.js';
import { abrirHojaDia } from './dia-hoja.js';

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
    // Intensidad = cuánto acento lleva la mezcla con el fondo (no una
    // opacidad: esa también apagaba el número). El color del texto se elige
    // al montar (pintarCeldas) según el fondo real, para cumplir AA.
    const mezcla = count === 0 ? 0 : Math.round((0.28 + (count / maxCount) * 0.72) * 100);
    const detailText = details.length ? details.join(', ') : emptyLabel;
    const fullLabel = `${day} de ${monthLabel}: ${detailText}`;
    return `
      <div class="heatmap-cell tappable" data-day="${day}" data-count="${count}" data-mezcla="${mezcla}" data-detail="${escapeHtml(fullLabel)}" title="${escapeHtml(fullLabel)}"
        style="position: relative; aspect-ratio: 1; width: 100%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-sizing: border-box; border: 1.5px solid transparent; font-size: clamp(10px, 3.6vw, 14px); font-weight: 700; transition: border-color 0.15s ease, transform 0.1s ease; background: ${count === 0 ? 'var(--surface-2)' : `color-mix(in srgb, ${accentVar} ${mezcla}%, var(--o-bg))`}; color: ${count === 0 ? 'var(--text-disabled)' : 'var(--o-ink)'};">
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
    <div id="${id}" data-year="${year}" data-month="${month}">
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: ${GAP}px; margin-bottom: 8px; width: 100%; max-width: ${GRID_MAX}px;">${weekdayHeaderHtml}</div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: ${GAP}px; width: 100%; max-width: ${GRID_MAX}px;">${cells}</div>
      <div id="${id}-detail" style="min-height: 16px; margin-top: 10px; font-size: 11.5px; color: var(--text-secondary); font-weight: 600;"></div>
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 10px; font-size: 10px; color: var(--text-disabled);">
        Menos
        <div style="width: 9px; height: 9px; background: var(--surface-2);"></div>
        <div style="width: 9px; height: 9px; background: ${accentVar}; opacity: 0.4;"></div>
        <div style="width: 9px; height: 9px; background: ${accentVar};"></div>
        Más
      </div>
    </div>
  `;
}

// --- Contraste AA de los números (WCAG 2.x): con el fondo real de cada
// celda (acento y fondo leídos del tema en curso, color o sobrio) se elige
// el texto claro (--o-text) o la tinta oscura (--o-ink), el que contraste
// más. En los tonos medios ninguno llega a 4,5:1, así que la mezcla se
// corre lo justo (más oscura con texto claro o más clara con tinta) hasta
// que uno cumpla.
const AA = 4.5;
function rgbDe(css, dentro) {
  const sonda = document.createElement('span');
  sonda.style.color = css;
  dentro.appendChild(sonda);
  const m = getComputedStyle(sonda).color.match(/[\d.]+/g).map(Number);
  sonda.remove();
  return m.slice(0, 3);
}
function luminancia(rgb) {
  const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const mezclar = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));

function pintarCeldas(container, accentVar) {
  const acento = rgbDe(accentVar, container);
  const fondo = rgbDe('var(--o-bg)', container);
  const claro = rgbDe('var(--o-text)', container);
  const tinta = rgbDe('var(--o-ink)', container);
  container.querySelectorAll('.heatmap-cell[data-count]:not([data-count="0"])').forEach((cell) => {
    const t0 = Number(cell.dataset.mezcla) / 100;
    let bg = mezclar(acento, fondo, t0);
    let usarTinta = contraste(tinta, bg) >= contraste(claro, bg);
    const ajustar = () => {
      const texto = usarTinta ? tinta : claro;
      const paso = usarTinta ? 0.02 : -0.02;
      let t = t0;
      bg = mezclar(acento, fondo, t);
      while (contraste(texto, bg) < AA && t + paso <= 1 && t + paso >= 0.1) {
        t += paso;
        bg = mezclar(acento, fondo, t);
      }
      return contraste(texto, bg) >= AA;
    };
    // Si un acento muy oscuro (o muy claro) no llega con un texto, el otro sí.
    if (!ajustar()) { usarTinta = !usarTinta; ajustar(); }
    cell.style.background = `rgb(${bg.join(', ')})`;
    cell.style.color = usarTinta ? 'var(--o-ink)' : 'var(--o-text)';
  });
}

// Click/tap (funciona igual con mouse y touch) o Enter muestra el detalle
// del día bajo la grilla; el `title` nativo ya cubre el hover en desktop.
export function initActivityHeatmapListeners(id, accentVar) {
  const container = document.getElementById(id);
  if (!container) return;
  pintarCeldas(container, accentVar);
  const detailEl = document.getElementById(`${id}-detail`);
  const year = Number(container.dataset.year);
  const month = Number(container.dataset.month);
  const pad = (n) => String(n).padStart(2, '0');
  const fechaDe = (day) => `${year}-${pad(month + 1)}-${pad(day)}`;
  let dias = new Map(); // día del mes -> { descanso, nota }
  let seleccionado = null;

  const mostrarDetalle = (cell) => {
    if (!detailEl) return;
    const day = Number(cell.getAttribute('data-day'));
    const info = dias.get(day);
    const partes = [escapeHtml(cell.getAttribute('data-detail'))];
    if (info && info.descanso) partes.push('Descanso planificado');
    detailEl.innerHTML = `
      <div>${partes.join(' · ')}</div>
      ${info && info.nota ? `<div class="dia-detalle-nota">${escapeHtml(info.nota)}</div>` : ''}
      <div class="dia-detalle-acciones">
        <button type="button" class="dia-abrir tappable" data-fecha="${fechaDe(day)}" aria-label="Descanso y nota del ${day}">${info ? 'Editar día' : 'Día'}</button>
      </div>`;
    detailEl.querySelector('.dia-abrir').addEventListener('click', (e) => {
      e.stopPropagation();
      abrirHojaDia(e.currentTarget.getAttribute('data-fecha'), { alGuardar: () => cargarDias() });
    });
  };

  const decorar = () => {
    container.querySelectorAll('.heatmap-cell').forEach(cell => {
      const day = Number(cell.getAttribute('data-day'));
      const info = dias.get(day);
      const sinActividad = cell.getAttribute('data-count') === '0';
      cell.classList.toggle('dia-rayado', !!(info && info.descanso && sinActividad));
      const punto = cell.querySelector('.dia-punto');
      if (info && info.nota && !punto) cell.insertAdjacentHTML('beforeend', '<span class="dia-punto" aria-hidden="true"></span>');
      if (!(info && info.nota) && punto) punto.remove();
      const extra = [info && info.descanso ? 'descanso planificado' : '', info && info.nota ? 'con nota' : ''].filter(Boolean).join(', ');
      cell.setAttribute('aria-label', cell.getAttribute('data-detail') + (extra ? ` (${extra})` : ''));
    });
    if (seleccionado && seleccionado.isConnected) mostrarDetalle(seleccionado);
  };

  async function cargarDias() {
    const filas = await db.getDias(fechaDe(1), fechaDe(31));
    if (!container.isConnected) return; // la vista se repintó mientras tanto
    dias = new Map(filas.map(d => [Number(d.fecha.slice(8)), d]));
    decorar();
  }

  container.querySelectorAll('.heatmap-cell').forEach(cell => {
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');
    const elegir = () => {
      container.querySelectorAll('.heatmap-cell').forEach(c => { c.style.borderColor = 'transparent'; });
      cell.style.borderColor = accentVar;
      seleccionado = cell;
      mostrarDetalle(cell);
    };
    cell.addEventListener('click', elegir);
    cell.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(); } });
  });
  cargarDias();
}
