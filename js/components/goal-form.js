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

// Máscara de miles para los montos en pesos (dominio 'finanzas'): un
// <input type="number"> trata el punto como separador DECIMAL, así que
// "500.000" se guardaba como 500. Estos inputs son type="text" y formatean
// solo dígitos con puntos de miles mientras se escribe; las metas de
// dominio 'entreno' (sesiones/km) no son plata y no pasan por acá.
const digitsToMiles = (raw) => {
  const digits = (raw || '').toString().replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const milesToInt = (str) => {
  const digits = (str || '').toString().replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

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
              <input type="text" inputmode="numeric" id="goal-target" placeholder="0" required autocomplete="off">
            </div>
            <div class="input-group" id="goal-unidad-container" style="display: none;">
              <label>Unidad</label>
              <input type="text" id="goal-unidad" placeholder="ej. km, sesiones" autocomplete="off">
            </div>
          </div>

          <div class="input-group" id="goal-initial-container">
            <label id="goal-initial-label">Monto inicial (opcional)</label>
            <input type="text" inputmode="numeric" id="goal-initial" placeholder="0" autocomplete="off" value="0">
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
          <input type="text" inputmode="numeric" id="goal-contribute-amount" placeholder="0" autocomplete="off">
        </div>
        <div style="display: flex; gap: 12px; margin-top: 20px;">
          <button id="btn-cancel-goal-contribute" class="btn-primary" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Cancelar</button>
          <button id="btn-save-goal-contribute" class="btn-primary" style="background: var(--accent-purple); color: #000; flex: 1;">Guardar</button>
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
  const targetInput = document.getElementById('goal-target');
  const initialInput = document.getElementById('goal-initial');
  const applyTipoUI = () => {
    const dominio = document.getElementById('goal-dominio').value;
    const esEntreno = dominio === 'entreno';
    document.getElementById('goal-tipo-container').style.display = esEntreno ? 'block' : 'none';
    document.getElementById('goal-unidad-container').style.display = esEntreno ? 'block' : 'none';
    document.getElementById('goal-target-label').textContent = esEntreno ? 'Cantidad objetivo' : 'Monto objetivo';
    document.getElementById('goal-initial-label').textContent = esEntreno ? 'Progreso inicial (opcional)' : 'Monto inicial (opcional)';
    const esSesiones = esEntreno && tipoSelect.value === 'sesiones';
    document.getElementById('goal-initial-container').style.display = esSesiones ? 'none' : 'block';
    // Entreno admite decimales (ej. "5.5" km) y no se enmascara con puntos
    // de miles — solo dinero pasa por digitsToMiles().
    targetInput.setAttribute('inputmode', esEntreno ? 'decimal' : 'numeric');
    initialInput.setAttribute('inputmode', esEntreno ? 'decimal' : 'numeric');
  };
  if (tipoSelect) {
    tipoSelect.addEventListener('change', () => {
      const tipo = TIPOS_ENTRENO.find(t => t.value === tipoSelect.value);
      if (tipo) document.getElementById('goal-unidad').value = tipo.unidadDefault;
      applyTipoUI();
    });
  }

  const isMoneyMode = () => document.getElementById('goal-dominio').value !== 'entreno';
  const attachMoneyMask = (input) => {
    input.addEventListener('input', () => {
      if (!isMoneyMode()) return;
      input.value = digitsToMiles(input.value);
    });
  };
  attachMoneyMask(targetInput);
  attachMoneyMask(initialInput);

  document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('goal-id').value;
    const dominio = document.getElementById('goal-dominio').value;
    const esEntreno = dominio === 'entreno';
    const name = document.getElementById('goal-name').value.trim();
    const targetAmount = esEntreno ? (parseFloat(document.getElementById('goal-target').value) || 0) : milesToInt(document.getElementById('goal-target').value);
    const icon = document.getElementById('goal-icon').value;
    const initialAmount = esEntreno ? (parseFloat(document.getElementById('goal-initial').value) || 0) : milesToInt(document.getElementById('goal-initial').value);
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
  const contributeInput = document.getElementById('goal-contribute-amount');
  let contributeGoalId = null;
  let contributeDominio = 'finanzas';

  contributeInput.addEventListener('input', () => {
    if (contributeDominio === 'entreno') return;
    contributeInput.value = digitsToMiles(contributeInput.value);
  });

  document.getElementById('btn-cancel-goal-contribute').addEventListener('click', () => closeModal('goal-contribute-modal'));
  document.getElementById('btn-save-goal-contribute').addEventListener('click', async () => {
    const amount = contributeDominio === 'entreno' ? (parseFloat(contributeInput.value) || 0) : milesToInt(contributeInput.value);
    if (!amount || amount <= 0 || !contributeGoalId) return;
    await db.contributeToGoal(contributeGoalId, amount);
    closeModal('goal-contribute-modal');
    Toast('Progreso agregado', 'success');
    if (refreshCallback) refreshCallback();
  });

  // Morado para metas de Finanzas, cian (exclusivo de Entreno) para metas
  // de Entreno — mismo criterio que goal-card.js.
  const accentFor = (dominio) => dominio === 'entreno' ? 'var(--accent-teal)' : 'var(--accent-purple)';

  window.__openGoalContribute = (goal) => {
    contributeGoalId = goal.id;
    contributeDominio = goal.dominio || 'finanzas';
    contributeInput.setAttribute('inputmode', contributeDominio === 'entreno' ? 'decimal' : 'numeric');
    document.getElementById('goal-contribute-title').textContent = goal.name;
    document.getElementById('goal-contribute-label').textContent = goal.unidad ? `Cantidad (${goal.unidad})` : 'Cantidad';
    contributeInput.value = '';
    const contribBtn = document.getElementById('btn-save-goal-contribute');
    if (contribBtn) contribBtn.style.background = accentFor(goal.dominio);
    openModal('goal-contribute-modal');
  };

  window.__openGoalForm = (goal = null, defaults = {}) => {
    let dominio;
    if (goal) {
      dominio = goal.dominio || 'finanzas';
      document.getElementById('goal-id').value = goal.id;
      document.getElementById('goal-dominio').value = dominio;
      document.getElementById('goal-name').value = goal.name || '';
      document.getElementById('goal-target').value = dominio === 'entreno'
        ? (goal.targetAmount || 0)
        : digitsToMiles(goal.targetAmount || 0);
      document.getElementById('goal-icon').value = goal.icon || 'shield';
      document.getElementById('goal-deadline').value = goal.deadline || '';
      if (tipoSelect) tipoSelect.value = goal.tipo || 'personalizado';
      document.getElementById('goal-unidad').value = goal.unidad || '';
      document.getElementById('modal-goal-title').textContent = 'Editar Meta';
    } else {
      dominio = defaults.dominio || 'finanzas';
      document.getElementById('goal-id').value = '';
      document.getElementById('goal-dominio').value = dominio;
      document.getElementById('goal-name').value = '';
      document.getElementById('goal-target').value = '';
      document.getElementById('goal-initial').value = '0';
      document.getElementById('goal-deadline').value = '';
      document.getElementById('goal-icon').value = defaults.icon || 'shield';
      if (tipoSelect) tipoSelect.value = defaults.tipo || 'sesiones';
      document.getElementById('goal-unidad').value = defaults.unidad || '';
      document.getElementById('modal-goal-title').textContent = 'Nueva Meta';
    }
    const color = accentFor(dominio);
    const titleEl = document.getElementById('modal-goal-title');
    const submitBtn = document.querySelector('#goal-form button[type="submit"]');
    if (titleEl) titleEl.style.color = color;
    if (submitBtn) submitBtn.style.background = color;
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
