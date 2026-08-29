import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { formatCurrency, formatCompactCurrency } from '../utils/currency.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';

export function renderAhorroForm() {
  return `
    <div id="ahorro-modal" class="modal-overlay">
      <div class="modal-content" style="padding: 24px; padding-bottom: max(24px, env(safe-area-inset-bottom)); max-height: 90vh;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0; color: var(--accent-purple);">Aportar a Meta</h2>
          <button class="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        
        <input type="hidden" id="ahorro-tx-id">
        
        <!-- Big Amount Display -->
        <div style="text-align: center; font-size: 40px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); min-height: 48px;" id="ahorro-numpad-display">
          $0
        </div>
        
        <!-- Live Context Display -->
        <div id="ahorro-context-display" style="text-align: center; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 16px; min-height: 16px;"></div>

        <!-- Chips Row (Goals) -->
        <div id="ahorro-chip-container" style="display: flex; gap: 8px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 8px; white-space: nowrap;">
        </div>

        <!-- Description -->
        <input type="text" id="ahorro-label" placeholder="Descripción (opcional)" style="width: 100%; background: var(--surface-2); border: none; color: var(--text-primary); padding: 16px; border-radius: 12px; font-size: 15px; box-sizing: border-box; margin-bottom: 24px; outline: none;">

        ${renderNumericKeypad()}

        <button id="btn-submit-ahorro" class="tappable" style="width: 100%; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; border: none; background: var(--accent-purple); color: #000; opacity: 0.5; pointer-events: none;">Guardar Ahorro</button>
      </div>
    </div>
  `;
}

export function initAhorroForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById('ahorro-modal');
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
      chipContainer.innerHTML = `<div class="chip active" style="background: var(--accent-purple); color: #000;">Sin metas</div>`;
      selectedGoalId = null;
    } else {
      if (!selectedGoalId || !b.goals.find(g => g.id === selectedGoalId)) selectedGoalId = b.goals[0].id;
      chipContainer.innerHTML = b.goals.map(g => `
        <div class="chip tappable ${selectedGoalId === g.id ? 'active' : ''}" data-goal-id="${g.id}" style="${selectedGoalId === g.id ? 'background: var(--accent-purple); color: #000; border-color: transparent;' : 'background: transparent; color: var(--accent-purple); border-color: rgba(187,134,252,0.3);'}">${escapeHtml(g.name)}</div>
      `).join('');
      
      chipContainer.querySelectorAll('.chip').forEach(c => {
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
        context.innerText = `Meta ${goal.name}: ${formatCurrency(goal.currentAmount + num)} / ${formatCurrency(goal.targetAmount)}`;
      }
    } else {
      context.innerText = '';
    }
    
    if (num > 0) {
      btnSubmit.style.opacity = '1';
      btnSubmit.style.pointerEvents = 'auto';
    } else {
      btnSubmit.style.opacity = '0.5';
      btnSubmit.style.pointerEvents = 'none';
    }
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
      btnSubmit.innerHTML = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      
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
        
        btnSubmit.innerHTML = originalText;
        modal.style.display = 'none';
        modal.classList.remove('open');
        Toast("Ahorro guardado", "success");
        
      }, 500);
    }
  });

  // Close logic
  modal.querySelector('.btn-close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.classList.remove('open');
  });

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
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  };
}