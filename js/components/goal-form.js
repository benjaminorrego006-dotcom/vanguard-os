// js/components/goal-form.js
// Modal reutilizable para crear/editar una meta (dinero en Finanzas, o
// sesiones/km/personalizado en Entreno) y modal chico para abonar
// progreso manual a metas que no son de dinero ni de auto-track.
import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { GOAL_ICONS, GOAL_ICON_LABELS } from './goal-card.js';

const TIPOS_ENTRENO = [
  { value: 'sesiones', label: 'Cantidad de sesiones', unidadDefault: 'sesiones' },
  { value: 'km', label: 'Distancia (km)', unidadDefault: 'km' },
  { value: 'personalizado', label: 'Personalizado', unidadDefault: '' }
];

export function renderGoalForm() {
  return `
    <div id="goal-modal" class="modal-overlay">
      <div class="modal-content" style="max-height: 90vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 id="modal-goal-title" style="font-size: 20px; font-weight: 700; margin: 0; color: var(--accent-purple);">Nueva Meta</h2>
          <button class="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <form id="goal-form">
          <input type="hidden" id="goal-id">
          <input type="hidden" id="goal-dominio" value="finanzas">
          <div class="input-group">
            <label>Nombre de la meta</label>
            <input type="text" id="goal-name" placeholder="Ej. Fondo de emergencia" required autocomplete="off">
          </div>

          <div class="input-group" id="goal-tipo-container" style="display: none;">
            <label>Tipo de meta</label>
            <select id="goal-tipo">
              ${TIPOS_ENTRENO.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="input-group">
              <label id="goal-target-label">Monto objetivo</label>
              <input type="number" id="goal-target" placeholder="0" min="1" step="any" required autocomplete="off">
            </div>
            <div class="input-group" id="goal-unidad-container" style="display: none;">
              <label>Unidad</label>
              <input type="text" id="goal-unidad" placeholder="ej. km, sesiones" autocomplete="off">
            </div>
          </div>

          <div class="input-group" id="goal-initial-container">
            <label id="goal-initial-label">Monto inicial (opcional)</label>
            <input type="number" id="goal-initial" placeholder="0" min="0" step="any" autocomplete="off" value="0">
          </div>
          <div class="input-group">
            <label>Fecha límite (opcional)</label>
            <input type="date" id="goal-deadline" autocomplete="off">
          </div>
          <div class="input-group">
            <label>Ícono</label>
            <select id="goal-icon">
              ${GOAL_ICONS.map(icon => `<option value="${icon}">${GOAL_ICON_LABELS[icon]}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn-primary" style="background: var(--accent-purple);">Guardar Meta</button>
        </form>
      </div>
    </div>

    <!-- Modal chico para abonar progreso manual (metas sin auto-track y que no son de dinero) -->
    <div id="goal-contribute-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 400px;">
        <h2 id="goal-contribute-title" style="margin-top: 0; font-size: 18px; font-weight: 700;">Agregar progreso</h2>
        <div class="input-group">
          <label id="goal-contribute-label">Cantidad</label>
          <input type="number" id="goal-contribute-amount" placeholder="0" min="0" step="any" autocomplete="off">
        </div>
        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button id="btn-cancel-goal-contribute" class="btn-primary" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Cancelar</button>
          <button id="btn-save-goal-contribute" class="btn-primary" style="background: var(--accent-teal); color: #000; flex: 1;">Guardar</button>
        </div>
      </div>
    </div>
  `;
}

export function initGoalForm(refreshCallback) {
  const modal = document.getElementById('goal-modal');
  if (!modal) return;

  const openModal = (id) => {
    document.getElementById(id).style.display = 'flex';
    setTimeout(() => document.getElementById(id).classList.add('open'), 10);
  };
  const closeModal = (id) => {
    document.getElementById(id).classList.remove('open');
    setTimeout(() => document.getElementById(id).style.display = 'none', 300);
  };

  modal.querySelector('.btn-close-modal').addEventListener('click', () => closeModal('goal-modal'));

  const tipoSelect = document.getElementById('goal-tipo');
  const applyTipoUI = () => {
    const dominio = document.getElementById('goal-dominio').value;
    const esEntreno = dominio === 'entreno';
    document.getElementById('goal-tipo-container').style.display = esEntreno ? 'block' : 'none';
    document.getElementById('goal-unidad-container').style.display = esEntreno ? 'block' : 'none';
    document.getElementById('goal-target-label').textContent = esEntreno ? 'Cantidad objetivo' : 'Monto objetivo';
    document.getElementById('goal-initial-label').textContent = esEntreno ? 'Progreso inicial (opcional)' : 'Monto inicial (opcional)';
    const esSesiones = esEntreno && tipoSelect.value === 'sesiones';
    document.getElementById('goal-initial-container').style.display = esSesiones ? 'none' : 'block';
  };
  if (tipoSelect) {
    tipoSelect.addEventListener('change', () => {
      const tipo = TIPOS_ENTRENO.find(t => t.value === tipoSelect.value);
      if (tipo) document.getElementById('goal-unidad').value = tipo.unidadDefault;
      applyTipoUI();
    });
  }

  document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('goal-id').value;
    const dominio = document.getElementById('goal-dominio').value;
    const esEntreno = dominio === 'entreno';
    const name = document.getElementById('goal-name').value.trim();
    const targetAmount = parseFloat(document.getElementById('goal-target').value) || 0;
    const icon = document.getElementById('goal-icon').value;
    const initialAmount = parseFloat(document.getElementById('goal-initial').value) || 0;
    const deadline = document.getElementById('goal-deadline').value || null;
    const tipo = esEntreno ? document.getElementById('goal-tipo').value : 'dinero';
    const unidad = esEntreno ? document.getElementById('goal-unidad').value.trim() : '';
    const autoTrack = tipo === 'sesiones';

    if (!name || targetAmount <= 0) {
      Toast('Completa los datos', 'warning');
      return;
    }

    if (id) {
      const goals = await db.getGoals();
      const existing = goals.find(g => g.id === id);
      await db.updateGoal(id, {
        name, targetAmount, icon, deadline, dominio, tipo, unidad, autoTrack,
        currentAmount: existing ? existing.currentAmount : 0
      });
    } else {
      await db.createGoal({
        name, targetAmount, icon, deadline, dominio, tipo, unidad, autoTrack,
        currentAmount: autoTrack ? 0 : initialAmount,
        completed: false
      });
    }

    closeModal('goal-modal');
    Toast(id ? 'Meta actualizada' : 'Meta creada', 'success');
    if (refreshCallback) refreshCallback();
  });

  // --- Modal de abonar progreso manual ---
  const contributeModal = document.getElementById('goal-contribute-modal');
  let contributeGoalId = null;

  document.getElementById('btn-cancel-goal-contribute').addEventListener('click', () => closeModal('goal-contribute-modal'));
  document.getElementById('btn-save-goal-contribute').addEventListener('click', async () => {
    const amount = parseFloat(document.getElementById('goal-contribute-amount').value);
    if (!amount || amount <= 0 || !contributeGoalId) return;
    await db.contributeToGoal(contributeGoalId, amount);
    closeModal('goal-contribute-modal');
    Toast('Progreso agregado', 'success');
    if (refreshCallback) refreshCallback();
  });

  window.__openGoalContribute = (goal) => {
    contributeGoalId = goal.id;
    document.getElementById('goal-contribute-title').textContent = goal.name;
    document.getElementById('goal-contribute-label').textContent = goal.unidad ? `Cantidad (${goal.unidad})` : 'Cantidad';
    document.getElementById('goal-contribute-amount').value = '';
    openModal('goal-contribute-modal');
  };

  window.__openGoalForm = (goal = null, defaults = {}) => {
    if (goal) {
      document.getElementById('goal-id').value = goal.id;
      document.getElementById('goal-dominio').value = goal.dominio || 'finanzas';
      document.getElementById('goal-name').value = goal.name || '';
      document.getElementById('goal-target').value = goal.targetAmount || 0;
      document.getElementById('goal-icon').value = goal.icon || 'shield';
      document.getElementById('goal-deadline').value = goal.deadline || '';
      if (tipoSelect) tipoSelect.value = goal.tipo || 'personalizado';
      document.getElementById('goal-unidad').value = goal.unidad || '';
      document.getElementById('modal-goal-title').textContent = 'Editar Meta';
    } else {
      document.getElementById('goal-id').value = '';
      document.getElementById('goal-dominio').value = defaults.dominio || 'finanzas';
      document.getElementById('goal-name').value = '';
      document.getElementById('goal-target').value = '';
      document.getElementById('goal-initial').value = '0';
      document.getElementById('goal-deadline').value = '';
      document.getElementById('goal-icon').value = defaults.icon || 'shield';
      if (tipoSelect) tipoSelect.value = defaults.tipo || 'sesiones';
      document.getElementById('goal-unidad').value = defaults.unidad || '';
      document.getElementById('modal-goal-title').textContent = 'Nueva Meta';
    }
    applyTipoUI();
    openModal('goal-modal');
  };
}

export function openGoalForm(goal, defaults) {
  if (window.__openGoalForm) window.__openGoalForm(goal, defaults);
}

export function openGoalContribute(goal) {
  if (window.__openGoalContribute) window.__openGoalContribute(goal);
}
