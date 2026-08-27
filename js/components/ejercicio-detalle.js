// js/components/ejercicio-detalle.js
import { db } from '../core/db.js';
import { renderMiniChart } from './mini-chart.js';

export function renderEjercicioDetalle(nombre, historial) {
  if (!historial || historial.length === 0) {
    return `<div style="padding: 16px; color: var(--text-secondary); text-align: center; font-size: 13px;">Aún no hay historial para graficar este ejercicio.</div>`;
  }

  const esPesoCorporal = historial.every(d => d.pesoMax === 0);
  const serie = historial.map(d => esPesoCorporal ? d.repsMax : d.pesoMax);

  const chartHtml = renderMiniChart(serie, {
    color: 'var(--accent-purple)',
    unidad: esPesoCorporal ? ' reps' : 'kg',
    label: esPesoCorporal ? 'Repeticiones máximas por sesión' : 'Peso máximo por sesión',
    emptyText: 'Necesitas al menos 2 sesiones registradas para ver la tendencia.'
  });

  let max1RM = 0;
  historial.forEach(d => {
    if (d.pesoMax > 0) {
      const rm = db.estimar1RM(d.pesoMax, d.repsEnPesoMax || 1);
      if (rm > max1RM) max1RM = rm;
    }
  });

  const ultimo = historial[historial.length - 1];

  return `
    <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 16px;">
      <h4 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Progreso: ${nombre}</h4>

      ${chartHtml}

      <div style="display: flex; gap: 8px; margin-top: 14px;">
        ${max1RM > 0 ? `
          <div style="flex: 1; background: var(--surface-2); border: 1px solid var(--surface-border); border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 16px; font-weight: 800; color: var(--accent-purple);">${max1RM}kg</div>
            <div style="font-size: 10px; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">1RM estimado</div>
          </div>
        ` : ''}
        <div style="flex: 1; background: var(--surface-2); border: 1px solid var(--surface-border); border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">${ultimo.volumenTotal}</div>
          <div style="font-size: 10px; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">Volumen última sesión</div>
        </div>
      </div>
    </div>
  `;
}