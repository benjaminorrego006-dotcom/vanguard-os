// js/components/RecurringForm.js
// Hoja «Nuevo pago fijo» (Órbita, oHoja #recurring-modal): cifra con
// teclado, descripción, día del mes y sobre del que se descuenta. Atrás la
// cierra (history.js). finanzas.js la abre con
// `document.getElementById('recurring-modal').openForm()`. Lógica de
// siempre (Fase 8b).
import { Toast } from '../utils/states.js';
import { formatCurrency } from '../utils/currency.js';
import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { escapeHtml } from '../utils/escape.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';
import { montoHtml, contextoHtml, guardandoHtml } from './fin-hoja.js';

const ID = 'recurring-modal';

export function renderRecurringForm() {
  return oHoja({
    id: ID, titulo: 'Nuevo pago fijo', modulo: 'finanzas',
    cuerpo: `
      <form id="recurring-form" class="o-hoja-cuerpo">
        ${montoHtml('recurring')}
        ${contextoHtml('recurring', 'Monto del cargo automático')}
        <div class="o-campo">
          <label for="recurring-label">Descripción</label>
          <input type="text" id="recurring-label" class="o-input" placeholder="Ej. Netflix, Spotify" autocomplete="off" required>
        </div>
        <div class="o-fin-hoja-par o-fin-hoja-par--1-2">
          <div class="o-campo">
            <label for="recurring-day">Día del mes</label>
            <select id="recurring-day" class="o-input" required>
              ${Array.from({length: 28}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
            </select>
          </div>
          <div class="o-campo">
            <label for="recurring-envelope">Descontar de</label>
            <select id="recurring-envelope" class="o-input" required></select>
          </div>
        </div>
        ${renderNumericKeypad({ orbita: true })}
      </form>`,
    pie: '<button id="btn-submit-recurring" type="submit" form="recurring-form" class="o-btn o-btn--primario o-btn--bloque" disabled>Guardar pago fijo</button>'
  });
}

export function initRecurringForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById(ID);
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
    btnSubmit.disabled = !(num > 0 && label && selectEnv.value);
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
      btnSubmit.innerHTML = guardandoHtml();

      setTimeout(async () => {
        await db.createRecurring({ label, amount, envelopeId, dayOfMonth });
        Toast("Gasto fijo configurado", "success");
        if (!modal.isConnected) return; // vista cambiada mientras se guardaba
        btnSubmit.innerHTML = originalText;
        cerrarHoja(ID);

      }, 500);
    }
  });

  // Cerrar: botón de la cabecera y toque en el fondo.
  montarHoja(ID);

  modal.openForm = () => {
    b = getBudgetFn();
    currentAmountStr = '';
    document.getElementById('recurring-label').value = '';
    document.getElementById('recurring-day').value = '15';

    selectEnv.innerHTML = b.envelopes.map(env => `<option value="${escapeHtml(env.id)}">${escapeHtml(env.name)}</option>`).join('');
    if (b.envelopes.length > 0) selectEnv.value = b.envelopes[0].id;

    updateUI();
    abrirHoja(ID);
  };
}
