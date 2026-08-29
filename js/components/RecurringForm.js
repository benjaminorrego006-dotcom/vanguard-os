import { Toast, ConfirmDialog } from '../utils/states.js';
import { formatCurrency } from '../utils/currency.js';
import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { escapeHtml } from '../utils/escape.js';

export function renderRecurringForm() {
  return `
    <div id="recurring-modal" class="modal-overlay">
      <div class="modal-content" style="padding: 24px; padding-bottom: max(24px, env(safe-area-inset-bottom)); max-height: 90vh;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 id="modal-recurring-title" style="font-size: 20px; font-weight: 700; margin: 0; color: var(--text-primary);">Suscripción Fija</h2>
          <button class="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        
        <form id="recurring-form">
          <div style="text-align: center; font-size: 40px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); min-height: 48px;" id="recurring-numpad-display">
            $0
          </div>
          <div style="text-align: center; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 16px; min-height: 16px;">Monto del cargo automático</div>

          <input type="text" id="recurring-label" placeholder="Descripción (ej. Netflix, Spotify)" style="width: 100%; background: var(--surface-2); border: none; color: var(--text-primary); padding: 16px; border-radius: 12px; font-size: 15px; box-sizing: border-box; margin-bottom: 16px; outline: none;" required>
          
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <div style="flex: 1;">
              <label style="display: block; font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">Día del mes</label>
              <select id="recurring-day" style="width: 100%; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px; border-radius: 12px; font-size: 14px; outline: none; appearance: none;" required>
                ${Array.from({length: 28}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
              </select>
            </div>
            <div style="flex: 2;">
              <label style="display: block; font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">Descontar de</label>
              <select id="recurring-envelope" style="width: 100%; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px; border-radius: 12px; font-size: 14px; outline: none; appearance: none;" required>
              </select>
            </div>
          </div>

          ${renderNumericKeypad()}

          <button id="btn-submit-recurring" type="submit" class="tappable" style="width: 100%; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; border: none; background: var(--text-primary); color: var(--bg-base); opacity: 0.5; pointer-events: none;">Guardar Gasto Fijo</button>
        </form>
      </div>
    </div>
  `;
}

export function initRecurringForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById('recurring-modal');
  if (!modal) return;
  
  const form = document.getElementById('recurring-form');
  const display = document.getElementById('recurring-numpad-display');
  const btnSubmit = document.getElementById('btn-submit-recurring');
  const selectEnv = document.getElementById('recurring-envelope');
  
  let currentAmountStr = '';
  let b = getBudgetFn();

  const updateUI = () => {
    const num = parseFloat(currentAmountStr || '0');
    display.innerText = formatCurrency(num);
    const label = document.getElementById('recurring-label').value.trim();
    
    if (num > 0 && label && selectEnv.value) {
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
  
  document.getElementById('recurring-label').addEventListener('input', updateUI);
  selectEnv.addEventListener('change', updateUI);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(currentAmountStr);
    const label = document.getElementById('recurring-label').value.trim();
    const envelopeId = selectEnv.value;
    const dayOfMonth = parseInt(document.getElementById('recurring-day').value, 10);
    
    if (amount > 0 && label && envelopeId && dayOfMonth) {
      const originalText = btnSubmit.innerHTML;
      btnSubmit.innerHTML = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      
      setTimeout(async () => {
        await db.createRecurring({ label, amount, envelopeId, dayOfMonth });
        btnSubmit.innerHTML = originalText;
        modal.style.display = 'none';
        modal.classList.remove('open');
        Toast("Gasto fijo configurado", "success");
        
      }, 500);
    }
  });

  modal.querySelector('.btn-close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.classList.remove('open');
  });

  modal.openForm = () => {
    b = getBudgetFn(); 
    currentAmountStr = '';
    document.getElementById('recurring-label').value = '';
    document.getElementById('recurring-day').value = '15';
    
    selectEnv.innerHTML = b.envelopes.map(env => `<option value="${env.id}">${escapeHtml(env.name)}</option>`).join('');
    if (b.envelopes.length > 0) selectEnv.value = b.envelopes[0].id;
    
    updateUI();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  };
}