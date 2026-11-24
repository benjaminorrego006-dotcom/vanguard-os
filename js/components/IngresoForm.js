// js/components/IngresoForm.js
// Hoja «Registrar ingreso» (Órbita, oHoja #ingreso-modal): cifra con
// teclado, nuevo balance del mes y descripción. Lógica de siempre (Fase 8b).
import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { formatCurrency } from '../utils/currency.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';
import { montoHtml, contextoHtml, pintarContexto, confirmacionHtml, guardandoHtml } from './fin-hoja.js';

const ID = 'ingreso-modal';

export function renderIngresoForm() {
  return oHoja({
    id: ID, titulo: 'Registrar ingreso', modulo: 'finanzas',
    cuerpo: `
      ${confirmacionHtml('ingreso', 'Ingreso registrado')}
      ${montoHtml('ingreso')}
      ${contextoHtml('ingreso', 'Nuevo balance: -')}
      <div class="o-campo">
        <label for="ingreso-label">Descripción</label>
        <input type="text" id="ingreso-label" class="o-input" placeholder="Opcional, ej. Salario" autocomplete="off">
      </div>
      ${renderNumericKeypad({ orbita: true })}
      <input type="hidden" id="ingreso-tx-id">`,
    pie: '<button type="button" id="btn-submit-ingreso" class="o-btn o-btn--primario o-btn--bloque" disabled>Guardar ingreso</button>'
  });
}

export function initIngresoForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById(ID);
  if (!modal) return;

  let currentAmountStr = '';
  const display = document.getElementById('ingreso-numpad-display');
  const context = document.getElementById('ingreso-context-display');
  const btnSubmit = document.getElementById('btn-submit-ingreso');

  const updateUI = () => {
    // Presupuesto vigente (la hoja vive mientras la vista se repinta).
    const b = getBudgetFn();
    const num = parseFloat(currentAmountStr || '0');
    display.innerText = formatCurrency(num);
    pintarContexto(context, `Nuevo balance: ${formatCurrency(b.remaining + num)}`);
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
    const id = document.getElementById('ingreso-tx-id').value;
    const amount = parseFloat(currentAmountStr);
    let label = document.getElementById('ingreso-label').value.trim();

    if (amount > 0) {
      const originalText = btnSubmit.innerHTML;
      btnSubmit.innerHTML = guardandoHtml();

      setTimeout(async () => {
        let res;
        if (id) res = await db.updateTransaction(id, { type: 'Ingreso', category: 'Income', label, amount, goalId: null });
        else res = await db.addTransaction({ type: 'Ingreso', category: 'Income', label, amount, goalId: null });

        // Vista cambiada mientras se guardaba: el ingreso quedó guardado.
        if (!modal.isConnected) return;
        btnSubmit.innerHTML = originalText;

        // Confirmación visual (check + mensaje) antes de volver a la vista normal
        const overlay = document.getElementById('ingreso-confirm-overlay');
        if (!overlay) return;
        overlay.hidden = false;
        setTimeout(() => {
          if (!modal.isConnected) return;
          overlay.hidden = true;
          cerrarHoja(ID);
        }, 900);

      }, 500);
    }
  });

  // Cerrar: botón de la cabecera y toque en el fondo.
  montarHoja(ID);

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
    abrirHoja(ID);
  };
}
