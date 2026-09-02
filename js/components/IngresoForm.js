import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { toSafeNumber } from '../utils/currency.js';

// REDISEÑO-FINANZAS: este componente solo lo usa finanzas.js (ver Parte 8
// del rediseño) — CLP fijo en vez del formatCurrency() multi-moneda
// compartido, mismo criterio que el resto del módulo.
const formatCurrency = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(toSafeNumber(amount));
const formatCompactCurrency = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', notation: 'compact', maximumFractionDigits: 1 }).format(toSafeNumber(amount));

export function renderIngresoForm() {
  return `
    <div id="ingreso-modal" class="modal-overlay">
      <div class="modal-content" style="padding: 24px; padding-bottom: max(24px, env(safe-area-inset-bottom)); max-height: 90vh; position: relative;">
        <div id="ingreso-confirm-overlay" style="display:none; position:absolute; inset:0; z-index:5; background: var(--surface-1); border-radius: inherit; flex-direction: column; align-items: center; justify-content: center; gap: 14px;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; animation: scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);">
            <svg width="30" height="30" fill="none" stroke="var(--state-success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">Ingreso registrado</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0; color: var(--state-success);">Registrar Ingreso</h2>
          <button class="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>
        </div>

        <input type="hidden" id="ingreso-tx-id">
        
        <!-- Big Amount Display -->
        <div style="text-align: center; font-size: 40px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); min-height: 48px;" id="ingreso-numpad-display">
          $0
        </div>
        
        <!-- Live Context Display -->
        <div id="ingreso-context-display" style="text-align: center; font-size: 13px; font-weight: 500; color: var(--state-success); margin-bottom: 16px; min-height: 16px;">Nuevo balance: -</div>

        <!-- Chips Row -->
        <div style="display: flex; gap: 8px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 8px; white-space: nowrap;">
           <div class="chip active" style="background: var(--state-success); color: #000;">Salario</div>
        </div>

        <!-- Description -->
        <input type="text" id="ingreso-label" placeholder="Descripción (opcional, ej. Salario)" style="width: 100%; background: var(--surface-2); border: none; color: var(--text-primary); padding: 16px; border-radius: 12px; font-size: 15px; box-sizing: border-box; margin-bottom: 24px; outline: none;">

        ${renderNumericKeypad()}

        <button id="btn-submit-ingreso" class="tappable" style="width: 100%; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; border: none; background: var(--state-success); color: #000; opacity: 0.5; pointer-events: none;">Guardar Ingreso</button>
      </div>
    </div>
  `;
}

export function initIngresoForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById('ingreso-modal');
  if (!modal) return;
  
  let currentAmountStr = '';
  const display = document.getElementById('ingreso-numpad-display');
  const context = document.getElementById('ingreso-context-display');
  const btnSubmit = document.getElementById('btn-submit-ingreso');
  const b = getBudgetFn(); // Current budget
  
  const updateUI = () => {
    const num = parseFloat(currentAmountStr || '0');
    display.innerText = formatCurrency(num);
    context.innerText = `Nuevo balance: ${formatCurrency(b.remaining + num)}`;
    
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
    const id = document.getElementById('ingreso-tx-id').value;
    const amount = parseFloat(currentAmountStr);
    let label = document.getElementById('ingreso-label').value.trim();
    
    if (amount > 0) {
      const originalText = btnSubmit.innerHTML;
      btnSubmit.innerHTML = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

      setTimeout(async () => {
        let res;
        if (id) res = await db.updateTransaction(id, { type: 'Ingreso', category: 'Income', label, amount, goalId: null });
        else res = await db.addTransaction({ type: 'Ingreso', category: 'Income', label, amount, goalId: null });

        btnSubmit.innerHTML = originalText;

        // Confirmación visual (check + mensaje) antes de volver a la vista normal
        const overlay = document.getElementById('ingreso-confirm-overlay');
        overlay.style.display = 'flex';
        setTimeout(() => {
          overlay.style.display = 'none';
          modal.style.display = 'none';
          modal.classList.remove('open');
        }, 900);

      }, 500);
    }
  });

  // Close logic
  modal.querySelector('.btn-close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.classList.remove('open');
  });

  // Expose an open method
  modal.openForm = (tx = null) => {
    if(tx) {
      document.getElementById('ingreso-tx-id').value = tx.id;
      currentAmountStr = tx.amount.toString();
      document.getElementById('ingreso-label').value = tx.label;
    } else {
      document.getElementById('ingreso-tx-id').value = '';
      currentAmountStr = '';
      document.getElementById('ingreso-label').value = '';
    }
    updateUI();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  };
}