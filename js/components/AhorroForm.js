// js/components/AhorroForm.js
// Hoja «Aportar a meta» (Órbita, oHoja #ahorro-modal): cifra con teclado,
// meta en chips (con cómo quedaría) y descripción. Lógica de siempre
// (Fase 8b).
import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { formatCurrency } from '../utils/currency.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';
import { montoHtml, contextoHtml, pintarContexto, guardandoHtml } from './fin-hoja.js';

const ID = 'ahorro-modal';

export function renderAhorroForm() {
  return oHoja({
    id: ID, titulo: 'Aportar a meta', modulo: 'finanzas',
    cuerpo: `
      ${montoHtml('ahorro')}
      ${contextoHtml('ahorro')}
      <div class="o-campo">
        <span class="o-campo-etiqueta" id="ahorro-meta-etq">Meta</span>
        <div id="ahorro-chip-container" class="o-chips o-fin-hoja-chips" role="group" aria-labelledby="ahorro-meta-etq"></div>
      </div>
      <div class="o-campo">
        <label for="ahorro-label">Descripción</label>
        <input type="text" id="ahorro-label" class="o-input" placeholder="Opcional" autocomplete="off">
      </div>
      ${renderNumericKeypad({ orbita: true })}
      <input type="hidden" id="ahorro-tx-id">`,
    pie: '<button type="button" id="btn-submit-ahorro" class="o-btn o-btn--primario o-btn--bloque" disabled>Guardar ahorro</button>'
  });
}

export function initAhorroForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById(ID);
  if (!modal) return;

  let currentAmountStr = '';
  let selectedGoalId = null;

  const display = document.getElementById('ahorro-numpad-display');
  const context = document.getElementById('ahorro-context-display');
  const btnSubmit = document.getElementById('btn-submit-ahorro');
  const chipContainer = document.getElementById('ahorro-chip-container');
  let b = getBudgetFn();

  const vibrate = () => { if(navigator.vibrate) navigator.vibrate(10); };

  const renderGoals = () => {
    b = getBudgetFn();
    if (b.goals.length === 0) {
      chipContainer.innerHTML = '<p class="o-campo-ayuda">Sin metas: el ahorro queda sin meta.</p>';
      selectedGoalId = null;
    } else {
      if (!selectedGoalId || !b.goals.find(g => g.id === selectedGoalId)) selectedGoalId = b.goals[0].id;
      chipContainer.innerHTML = b.goals.map(g => `<button type="button" class="o-chip" data-goal-id="${escapeHtml(g.id)}" aria-pressed="${selectedGoalId === g.id}">${escapeHtml(g.name)}</button>`).join('');

      chipContainer.querySelectorAll('.o-chip').forEach(c => {
        c.addEventListener('click', (e) => {
          vibrate();
          selectedGoalId = e.currentTarget.getAttribute('data-goal-id');
          renderGoals();
          updateUI();
        });
      });
    }
  };

  const updateUI = () => {
    const num = parseFloat(currentAmountStr || '0');
    display.innerText = formatCurrency(num);

    if (selectedGoalId) {
      const goal = b.goals.find(g => g.id === selectedGoalId);
      if (goal) {
        pintarContexto(context, `Meta ${goal.name}: ${formatCurrency(goal.currentAmount + num)} / ${formatCurrency(goal.targetAmount)}`);
      }
    } else {
      pintarContexto(context, '');
    }

    btnSubmit.disabled = !(num > 0);
  };

  const onKeyPress = (val) => {
    if (currentAmountStr === '0' && val !== '0' && val !== '00') currentAmountStr = val;
    else if (currentAmountStr !== '0' || (val !== '0' && val !== '00')) {
      if(currentAmountStr.length < 10) currentAmountStr += val;
    }
    updateUI();
  };

  const onBackspace = () => {
    currentAmountStr = currentAmountStr.slice(0, -1);
    updateUI();
  };

  const onLongBackspace = () => {
    currentAmountStr = '';
    updateUI();
  };

  initNumericKeypad(modal, onKeyPress, onBackspace, onLongBackspace);

  btnSubmit.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = document.getElementById('ahorro-tx-id').value;
    const amount = parseFloat(currentAmountStr);
    let label = document.getElementById('ahorro-label').value.trim();

    if (amount > 0) {
      const originalText = btnSubmit.innerHTML;
      btnSubmit.innerHTML = guardandoHtml();

      setTimeout(async () => {
        let res;
        if (id) {
          res = await db.updateTransaction(id, { type: 'Gasto', category: 'Savings', label, amount, goalId: selectedGoalId });
        } else {
          if (selectedGoalId) {
            res = await db.contributeToGoal(selectedGoalId, amount, label);
          } else {
            res = await db.addTransaction({ type: 'Gasto', category: 'Savings', label, amount, goalId: null });
          }
        }

        Toast("Ahorro guardado", "success");
        if (!modal.isConnected) return; // vista cambiada mientras se guardaba
        btnSubmit.innerHTML = originalText;
        cerrarHoja(ID);

      }, 500);
    }
  });

  // Cerrar: botón de la cabecera y toque en el fondo.
  montarHoja(ID);

  modal.openForm = (tx = null, defaultGoalId = null) => {
    if(tx) {
      document.getElementById('ahorro-tx-id').value = tx.id;
      currentAmountStr = tx.amount.toString();
      document.getElementById('ahorro-label').value = tx.label;
      selectedGoalId = tx.goalId;
    } else {
      document.getElementById('ahorro-tx-id').value = '';
      currentAmountStr = '';
      document.getElementById('ahorro-label').value = '';
      if(defaultGoalId) selectedGoalId = defaultGoalId;
    }

    renderGoals();
    updateUI();
    abrirHoja(ID);
  };
}
