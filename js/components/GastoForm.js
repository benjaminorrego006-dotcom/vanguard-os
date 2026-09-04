import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { formatCurrency, formatCompactCurrency } from '../utils/currency.js';
import { escapeHtml } from '../utils/escape.js';

export function renderGastoForm() {
  return `
    <div id="gasto-modal" class="modal-overlay">
      <div class="modal-content" style="padding: 24px; padding-bottom: max(24px, env(safe-area-inset-bottom)); max-height: 90vh; position: relative;">
        <div id="gasto-confirm-overlay" style="display:none; position:absolute; inset:0; z-index:5; background: var(--surface-1); border-radius: inherit; flex-direction: column; align-items: center; justify-content: center; gap: 14px;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; animation: scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);">
            <svg width="30" height="30" fill="none" stroke="var(--state-high)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">Gasto registrado</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 700; margin: 0; color: var(--state-high);">Registrar Gasto</h2>
          <button class="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>
        </div>

        <input type="hidden" id="gasto-tx-id">
        
        <!-- Big Amount Display -->
        <div style="text-align: center; font-size: 40px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary); min-height: 48px;" id="gasto-numpad-display">
          $0
        </div>
        
        <!-- Live Context Display -->
        <div id="gasto-context-display" style="text-align: center; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 16px; min-height: 16px;">Selecciona un sobre</div>

        <!-- Chips Row (Envelopes) -->
        <div id="gasto-chip-container" style="display: flex; gap: 8px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 8px; white-space: nowrap;">
        </div>

        <!-- Description -->
        <input type="text" id="gasto-label" placeholder="Descripción (opcional, ej. Supermercado)" style="width: 100%; background: var(--surface-2); border: none; color: var(--text-primary); padding: 16px; border-radius: 12px; font-size: 15px; box-sizing: border-box; margin-bottom: 12px; outline: none;">

        <!-- Fecha (default hoy) -->
        <input type="date" id="gasto-fecha" style="width: 100%; background: var(--surface-2); border: none; color: var(--text-primary); padding: 16px; border-radius: 12px; font-size: 15px; box-sizing: border-box; margin-bottom: 16px; outline: none; font-family: inherit;">

        <!-- Recent Amounts Shortcut -->
        <div id="gasto-recent-amounts-container" style="display: flex; gap: 8px; overflow-x: auto; margin-bottom: 24px; min-height: 32px; white-space: nowrap; padding-bottom: 4px;"></div>

        ${renderNumericKeypad()}

        <button id="btn-submit-gasto" class="tappable" style="width: 100%; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; border: none; background: var(--state-high); color: #000; opacity: 0.5; pointer-events: none;">Guardar Gasto</button>
      </div>
    </div>
  `;
}

export function initGastoForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById('gasto-modal');
  if (!modal) return;
  
  let currentAmountStr = '';
  let selectedCategory = 'Needs';
  let selectedEnvelopeId = null;
  
  const display = document.getElementById('gasto-numpad-display');
  const context = document.getElementById('gasto-context-display');
  const btnSubmit = document.getElementById('btn-submit-gasto');
  const chipContainer = document.getElementById('gasto-chip-container');
  const recentAmtsContainer = document.getElementById('gasto-recent-amounts-container');
  let b = getBudgetFn(); // Current budget
  
  const vibrate = () => { if(navigator.vibrate) navigator.vibrate(10); };

  const renderRecentAmounts = () => {
    b = getBudgetFn(); 
    const recentTx = (b.breakdown || [])
      .filter(t => t.type === 'Gasto' && t.envelopeId === selectedEnvelopeId)
      .sort((x, y) => new Date(y.date) - new Date(x.date));
    const recentAmounts = recentTx.map(t => t.amount);
    const distinct = [...new Set(recentAmounts)].slice(0, 3);
    
    if (distinct.length > 0) {
      recentAmtsContainer.innerHTML = distinct.map(amt => `<div class="chip tappable" style="background: var(--surface-2); color: var(--text-secondary); padding: 6px 16px; font-size: 13px; font-weight: 600; border-radius: 20px; border: 1px solid transparent;" data-amt="${amt}">${formatCompactCurrency(amt)}</div>`).join('');
      recentAmtsContainer.querySelectorAll('.chip').forEach(c => c.addEventListener('click', (e) => {
        vibrate();
        currentAmountStr = e.currentTarget.getAttribute('data-amt');
        updateUI();
      }));
    } else {
      recentAmtsContainer.innerHTML = '';
    }
  };

  const syncChips = () => {
    chipContainer.querySelectorAll('.chip').forEach(ch => {
      if(ch.getAttribute('data-id') === selectedEnvelopeId) {
        ch.classList.add('active');
        ch.style.background = ch.getAttribute('data-cat') === 'Needs' ? 'var(--state-high)' : 'var(--accent-blue)';
        ch.style.color = '#000';
        ch.style.borderColor = 'transparent';
      } else {
        ch.classList.remove('active');
        ch.style.background = 'transparent';
        ch.style.color = 'var(--text-primary)';
        ch.style.borderColor = 'var(--surface-border)';
      }
    });
  };

  const updateUI = () => {
    b = getBudgetFn();
    const num = parseFloat(currentAmountStr || '0');
    display.innerText = formatCurrency(num);
    
    const env = b.envelopes.find(e => e.id === selectedEnvelopeId);
    if (env) {
      const rem = env.balance - num;
      if (rem < 0) {
        context.style.color = 'var(--state-high)';
        context.innerText = `Excederías tu sobre de ${env.name} en ${formatCurrency(Math.abs(rem))}`;
      } else {
        context.style.color = 'var(--text-secondary)';
        context.innerText = `Quedan ${formatCurrency(rem)} en este sobre`;
      }
    } else {
      context.innerText = 'Selecciona un sobre';
    }
    
    if (num > 0 && selectedEnvelopeId) {
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
    const id = document.getElementById('gasto-tx-id').value;
    const amount = parseFloat(currentAmountStr);
    let label = document.getElementById('gasto-label').value.trim();
    const dateVal = document.getElementById('gasto-fecha').value;

    if (amount > 0 && selectedEnvelopeId) {
      const originalText = btnSubmit.innerHTML;
      btnSubmit.innerHTML = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

      setTimeout(async () => {
        const payload = { type: 'Gasto', category: selectedCategory, label, amount, goalId: null, envelopeId: selectedEnvelopeId };
        if (dateVal) payload.date = dateVal; // omitido -> db.js usa hoy por defecto
        let res;
        if (id) {
          res = await db.updateTransaction(id, payload);
        } else {
          res = await db.addTransaction(payload);
        }

        btnSubmit.innerHTML = originalText;

        // Confirmación visual (check + mensaje) antes de volver a la vista normal
        const overlay = document.getElementById('gasto-confirm-overlay');
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

  modal.openForm = (tx = null) => {
    b = getBudgetFn(); // Refresh data
    
    // Render Chips based on Envelopes
    if (b.envelopes.length > 0) {
      chipContainer.innerHTML = b.envelopes.map(env => `
        <div class="chip tappable" data-id="${env.id}" data-cat="${env.category}" style="background: transparent; color: var(--text-primary); border-color: var(--surface-border);">
          ${escapeHtml(env.name)}
        </div>
      `).join('');
      
      chipContainer.querySelectorAll('.chip').forEach(c => {
        c.addEventListener('click', (e) => {
          vibrate();
          selectedEnvelopeId = e.currentTarget.getAttribute('data-id');
          selectedCategory = e.currentTarget.getAttribute('data-cat');
          syncChips();
          renderRecentAmounts();
          updateUI();
        });
      });
    } else {
      chipContainer.innerHTML = `<div style="font-size:12px; color:var(--text-disabled);">No hay sobres creados</div>`;
    }

    if(tx) {
      // tx.id puede venir vacío cuando esto se usa para precargar una
      // entrada NUEVA (ej. desde "gasto rápido"), no para editar una
      // existente — por eso siempre '' en vez de undefined (que se
      // guardaría como el string "undefined" y se leería como edición).
      document.getElementById('gasto-tx-id').value = tx.id || '';
      currentAmountStr = tx.amount != null ? tx.amount.toString() : '';
      document.getElementById('gasto-label').value = tx.label || '';
      const now = new Date();
      document.getElementById('gasto-fecha').value = tx.date
        ? tx.date.slice(0, 10)
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      selectedCategory = tx.category || (b.envelopes[0] ? b.envelopes[0].category : 'Needs');
      selectedEnvelopeId = tx.envelopeId || (b.envelopes[0] ? b.envelopes[0].id : null);
    } else {
      document.getElementById('gasto-tx-id').value = '';
      currentAmountStr = '';
      document.getElementById('gasto-label').value = '';
      const now = new Date();
      document.getElementById('gasto-fecha').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (b.envelopes.length > 0) {
        selectedEnvelopeId = b.envelopes[0].id;
        selectedCategory = b.envelopes[0].category;
      } else {
        selectedEnvelopeId = null;
        selectedCategory = 'Needs';
      }
    }
    
    syncChips();
    renderRecentAmounts();
    updateUI();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  };
}