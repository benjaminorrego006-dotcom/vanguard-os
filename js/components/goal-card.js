// js/components/goal-card.js
// Tarjeta de meta reutilizable: funciona para metas de dinero (Finanzas) y
// metas de Entreno (sesiones, km, personalizado). Misma barra de progreso
// y fecha límite en los dos casos, solo cambia cómo se formatea el número.
import { formatCurrency } from '../utils/currency.js';
import { escapeHtml } from '../utils/escape.js';

export const GOAL_ICONS = ['shield', 'plane', 'car', 'home', 'laptop', 'education', 'run', 'target'];
export const GOAL_ICON_LABELS = {
  shield: 'Fondo de emergencia',
  plane: 'Viaje',
  car: 'Auto',
  home: 'Hogar',
  laptop: 'Tecnología',
  education: 'Educación',
  run: 'Actividad física',
  target: 'Meta general'
};

const ICON_PATHS = {
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
  plane: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"></path>',
  car: '<rect x="1" y="9" width="22" height="12" rx="3"></rect><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"></path><circle cx="6" cy="21" r="2"></circle><circle cx="18" cy="21" r="2"></circle>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
  laptop: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
  education: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>',
  run: '<circle cx="13" cy="4" r="2"></circle><path d="M4 17l4-3 3 1 4-5 3 2M8 21l3-4"></path>',
  target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1"></circle>',
  default: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle>'
};

export function getGoalSVG(icon, color = 'currentColor') {
  const path = ICON_PATHS[icon] || ICON_PATHS.default;
  return `<svg width="18" height="18" fill="none" stroke="${color}" stroke-width="2" viewBox="0 0 24 24">${path}</svg>`;
}

// Formatea un valor de meta según su tipo: dinero usa formatCurrency, el
// resto muestra el número con la unidad ("12 sesiones", "45 km").
export function formatGoalValue(goal, value) {
  if ((goal.dominio || 'finanzas') === 'finanzas') return formatCurrency(value);
  const n = Math.round(value * 10) / 10;
  return goal.unidad ? `${n} ${goal.unidad}` : `${n}`;
}

export function renderGoalCard(goal) {
  const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
  const accentColor = (goal.dominio || 'finanzas') === 'finanzas' ? 'var(--accent-purple)' : 'var(--accent-teal)';

  let deadlineHtml = '';
  if (goal.deadline) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechaLimite = new Date(goal.deadline + 'T00:00:00');
    const diasRestantes = Math.ceil((fechaLimite - hoy) / (1000 * 60 * 60 * 24));
    const fechaLabel = fechaLimite.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const vencida = diasRestantes < 0 && !goal.completed;
    deadlineHtml = `<div style="font-size: 11px; color: ${vencida ? 'var(--state-high)' : 'var(--text-disabled)'}; margin-top: 6px;">${vencida ? 'Venció el' : 'Vence el'} ${fechaLabel}${!vencida && !goal.completed ? ` &bull; ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}` : ''}</div>`;
  }

  const autoTrackHtml = goal.autoTrack
    ? `<div style="font-size: 10px; color: var(--text-disabled); margin-top: 4px;">Se actualiza sola al registrar una sesión</div>`
    : '';

  return `
    <div class="card goal-row" data-id="${goal.id}" style="padding: 16px; border-radius: 16px;">
      <div class="flex-between" style="margin-bottom: 12px;">
        <div style="display: flex; gap: 12px; align-items: center;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; font-size: 16px;">
            ${getGoalSVG(goal.icon, 'var(--text-primary)')}
          </div>
          <div style="font-size: 14px; font-weight: 700;">${escapeHtml(goal.name)}</div>
        </div>
        <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
          <div style="font-size: 12px; color: var(--text-secondary);">${formatGoalValue(goal, goal.currentAmount)} / ${formatGoalValue(goal, goal.targetAmount)}</div>
          <button class="edit-goal" data-id="${goal.id}" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer;"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
          <button class="delete-goal" data-id="${goal.id}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer;"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        </div>
      </div>
      <div style="height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; ${goal.autoTrack ? '' : 'cursor: pointer;'}" class="${goal.autoTrack ? '' : 'contrib-btn'}" data-id="${goal.id}">
        <div style="height: 100%; width: ${pct}%; background: ${goal.completed ? 'var(--state-success)' : accentColor}; border-radius: 4px;"></div>
      </div>
      ${deadlineHtml}
      ${autoTrackHtml}
    </div>
  `;
}
