import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { formatCurrency } from '../utils/currency.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';

export function renderTransferForm() {
  return `
    <div id="transfer-modal" class="modal-overlay">
      <div class="modal-content" style="padding: 24px; padding-bottom: max(24px, env(safe-area-inset-bottom)); max-height: 90vh;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0; color: var(--accent-purple);">Transferir Fondos</h2>
          <button class="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        
        <div style="text-align: center; font-size: 40px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); min-height: 48px;" id="transfer-numpad-display">
          $0
        </div>
        
        <div id="transfer-context-display" style="text-align: center; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 16px; min-height: 16px;">Mueve dinero entre tus sobres</div>

        <div style="display: flex; gap: 8px; margin-bottom: 24px; align-items: center;">
           <select id="transfer-from-select" style="flex: 1; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px; border-radius: 12px; font-size: 16px; outline: none; appearance: none;">
           </select>
           <svg width="24" height="24" fill="none" stroke="var(--text-secondary)" stroke-width="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
           <select id="transfer-to-select" style="flex: 1; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px; border-radius: 12px; font-size: 16px; outline: none; appearance: none;">
           </select>
        </div>

        ${renderNumericKeypad()}

        <button id="btn-submit-transfer" class="tappable" style="width: 100%; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; border: none; background: var(--accent-purple); color: #000; opacity: 0.5; pointer-events: none;">Confirmar Transferencia</button>
      </div>
    </div>
  `;
}

export function initTransferForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById('transfer-modal');
  if (!modal) return;
  
  let currentAmountStr = '';
  
  const display = document.getElementById('transfer-numpad-display');
  const context = document.getElementById('transfer-context-display');
  const btnSubmit = document.getElementById('btn-submit-transfer');
  const selectFrom = document.getElementById('transfer-from-select');
  const selectTo = document.getElementById('transfer-to-select');
  
  let b = getBudgetFn(); 
  
  const updateUI = () => {
    b = getBudgetFn();
    const num = parseFloat(currentAmountStr || '0');
    display.innerText = formatCurrency(num);
    
    const envFrom = b.envelopes.find(e => e.id === selectFrom.value);
    
    if (envFrom && num > envFrom.balance) {
      context.style.color = 'var(--state-high)';
      context.innerText = `No tienes suficientes fondos en ${envFrom.name} (Max: ${formatCurrency(envFrom.balance)})`;
    } else {
      context.style.color = 'var(--text-secondary)';
      context.innerText = 'Mueve dinero entre tus sobres';
    }
    
    if (num > 0 && selectFrom.value && selectTo.value && selectFrom.value !== selectTo.value && envFrom && num <= envFrom.balance) {
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
  
  selectFrom.addEventListener('change', () => {
    // Filtrar selectTo por misma categoría
    const envFrom = b.envelopes.find(e => e.id === selectFrom.value);
    if (envFrom) {
      const sameCatEnvs = b.envelopes.filter(e => e.category === envFrom.category);
      selectTo.innerHTML = sameCatEnvs.map(env => `<option value="${env.id}">${escapeHtml(env.name)} (${formatCurrency(env.balance)})</option>`).join('');
      if (sameCatEnvs.length > 1) {
        const other = sameCatEnvs.find(e => e.id !== envFrom.id);
        if (other) selectTo.value = other.id;
      }
    }
    updateUI();
  });
  selectTo.addEventListener('change', updateUI);

  btnSubmit.addEventListener('click', async (e) => {
    e.preventDefault();
    const amount = parseFloat(currentAmountStr);
    const fromId = selectFrom.value;
    const toId = selectTo.value;
    
    if (amount > 0 && fromId && toId && fromId !== toId) {
      const originalText = btnSubmit.innerHTML;
      btnSubmit.innerHTML = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      
      setTimeout(async () => {
        b = getBudgetFn();
        await db.transferEnvelopeFunds(fromId, toId, amount);
        
        btnSubmit.innerHTML = originalText;
        modal.style.display = 'none';
        modal.classList.remove('open');
        Toast("Transferencia completada", "success");
        
      }, 500);
    }
  });

  modal.querySelector('.btn-close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
    modal.classList.remove('open');
  });

  modal.openForm = (preselectFromId = null) => {
    b = getBudgetFn(); 
    currentAmountStr = '';
    
    // Renderizar initial
    if (b.envelopes.length > 0) {
      const defaultId = preselectFromId || b.envelopes[0].id;
      const defaultEnv = b.envelopes.find(e => e.id === defaultId);
      selectFrom.innerHTML = b.envelopes.map(env => `<option value="${env.id}">${escapeHtml(env.name)} (${formatCurrency(env.balance)})</option>`).join('');
      selectFrom.value = defaultId;
      
      const sameCatEnvs = b.envelopes.filter(e => e.category === defaultEnv.category);
      selectTo.innerHTML = sameCatEnvs.map(env => `<option value="${env.id}">${escapeHtml(env.name)} (${formatCurrency(env.balance)})</option>`).join('');
    }
    if (selectTo.options.length > 1) {
       for(let i=0; i<selectTo.options.length; i++){
         if(selectTo.options[i].value !== selectFrom.value) {
            selectTo.selectedIndex = i;
            break;
         }
       }
    }
    
    updateUI();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  };
}