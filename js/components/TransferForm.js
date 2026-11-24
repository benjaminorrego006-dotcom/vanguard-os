// js/components/TransferForm.js
// Hoja «Transferir fondos» (Órbita, oHoja #transfer-modal): cifra con
// teclado, sobre de origen y de destino (misma categoría). Si el origen no
// tiene fondos, aviso con ícono y texto. Lógica de siempre (Fase 8b).
import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { formatCurrency } from '../utils/currency.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';
import { montoHtml, contextoHtml, pintarContexto, guardandoHtml } from './fin-hoja.js';

const ID = 'transfer-modal';

export function renderTransferForm() {
  return oHoja({
    id: ID, titulo: 'Transferir fondos', modulo: 'finanzas',
    cuerpo: `
      ${montoHtml('transfer')}
      ${contextoHtml('transfer', 'Mueve dinero entre tus sobres')}
      <div class="o-fin-hoja-par">
        <div class="o-campo">
          <label for="transfer-from-select">Desde</label>
          <select id="transfer-from-select" class="o-input"></select>
        </div>
        <div class="o-campo">
          <label for="transfer-to-select">Hacia</label>
          <select id="transfer-to-select" class="o-input"></select>
        </div>
      </div>
      ${renderNumericKeypad({ orbita: true })}`,
    pie: '<button type="button" id="btn-submit-transfer" class="o-btn o-btn--primario o-btn--bloque" disabled>Confirmar transferencia</button>'
  });
}

export function initTransferForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById(ID);
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
      pintarContexto(context, `No tienes suficientes fondos en ${envFrom.name} (Max: ${formatCurrency(envFrom.balance)})`, true);
    } else {
      pintarContexto(context, 'Mueve dinero entre tus sobres');
    }

    btnSubmit.disabled = !(num > 0 && selectFrom.value && selectTo.value && selectFrom.value !== selectTo.value && envFrom && num <= envFrom.balance);
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
      selectTo.innerHTML = sameCatEnvs.map(env => `<option value="${escapeHtml(env.id)}">${escapeHtml(env.name)} (${formatCurrency(env.balance)})</option>`).join('');
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
      btnSubmit.innerHTML = guardandoHtml();

      setTimeout(async () => {
        b = getBudgetFn();
        await db.transferEnvelopeFunds(fromId, toId, amount);

        Toast("Transferencia completada", "success");
        if (!modal.isConnected) return; // vista cambiada mientras se guardaba
        btnSubmit.innerHTML = originalText;
        cerrarHoja(ID);

      }, 500);
    }
  });

  // Cerrar: botón de la cabecera y toque en el fondo.
  montarHoja(ID);

  modal.openForm = (preselectFromId = null) => {
    b = getBudgetFn();
    currentAmountStr = '';

    // Renderizar initial
    if (b.envelopes.length > 0) {
      const defaultId = preselectFromId || b.envelopes[0].id;
      const defaultEnv = b.envelopes.find(e => e.id === defaultId);
      selectFrom.innerHTML = b.envelopes.map(env => `<option value="${escapeHtml(env.id)}">${escapeHtml(env.name)} (${formatCurrency(env.balance)})</option>`).join('');
      selectFrom.value = defaultId;

      const sameCatEnvs = b.envelopes.filter(e => e.category === defaultEnv.category);
      selectTo.innerHTML = sameCatEnvs.map(env => `<option value="${escapeHtml(env.id)}">${escapeHtml(env.name)} (${formatCurrency(env.balance)})</option>`).join('');
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
    abrirHoja(ID);
  };
}
