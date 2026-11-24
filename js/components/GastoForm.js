// js/components/GastoForm.js
// Hoja «Registrar gasto» (Órbita, oHoja #gasto-modal): la misma en Finanzas
// y en Hoy. Cifra con teclado, sobre en chips (con lo que le queda), montos
// recientes del sobre, descripción y fecha. La lógica es la de siempre;
// solo cambió el marcado (Fase 8b).
import { renderNumericKeypad, initNumericKeypad } from './NumericKeypad.js';
import { formatCurrency, formatCompactCurrency } from '../utils/currency.js';
import { escapeHtml } from '../utils/escape.js';
import { compararFechas, claveDiaDe } from '../utils/fecha.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';
import { montoHtml, contextoHtml, pintarContexto, confirmacionHtml, guardandoHtml } from './fin-hoja.js';

const ID = 'gasto-modal';

export function renderGastoForm() {
  return oHoja({
    id: ID, titulo: 'Registrar gasto', modulo: 'finanzas',
    cuerpo: `
      ${confirmacionHtml('gasto', 'Gasto registrado')}
      ${montoHtml('gasto')}
      ${contextoHtml('gasto', 'Selecciona un sobre')}
      <div class="o-campo">
        <span class="o-campo-etiqueta" id="gasto-sobre-etq">Sobre</span>
        <div id="gasto-chip-container" class="o-chips o-fin-hoja-chips" role="group" aria-labelledby="gasto-sobre-etq"></div>
      </div>
      <div class="o-campo">
        <label for="gasto-label">Descripción</label>
        <input type="text" id="gasto-label" class="o-input" placeholder="Opcional, ej. Supermercado" autocomplete="off">
      </div>
      <div class="o-campo">
        <label for="gasto-fecha">Fecha</label>
        <input type="date" id="gasto-fecha" class="o-input">
      </div>
      <div id="gasto-recent-amounts-container" class="o-chips o-fin-hoja-chips" role="group" aria-label="Montos recientes de este sobre"></div>
      ${renderNumericKeypad({ orbita: true })}
      <!-- Al final: abrirHoja enfoca el primer control del cuerpo. -->
      <input type="hidden" id="gasto-tx-id">`,
    pie: '<button type="button" id="btn-submit-gasto" class="o-btn o-btn--primario o-btn--bloque" disabled>Guardar gasto</button>'
  });
}

export function initGastoForm(db, getBudgetFn, refreshCallback) {
  const modal = document.getElementById(ID);
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
      .sort((x, y) => compararFechas(y.date, x.date));
    const recentAmounts = recentTx.map(t => t.amount);
    const distinct = [...new Set(recentAmounts)].slice(0, 3);

    if (distinct.length > 0) {
      recentAmtsContainer.innerHTML = distinct.map(amt => `<button type="button" class="o-chip o-num" data-amt="${amt}" aria-label="Usar ${formatCurrency(amt)}">${formatCompactCurrency(amt)}</button>`).join('');
      recentAmtsContainer.querySelectorAll('.o-chip').forEach(c => c.addEventListener('click', (e) => {
        vibrate();
        currentAmountStr = e.currentTarget.getAttribute('data-amt');
        updateUI();
      }));
    } else {
      recentAmtsContainer.innerHTML = '';
    }
  };

  const syncChips = () => {
    chipContainer.querySelectorAll('.o-chip').forEach(ch => {
      ch.setAttribute('aria-pressed', String(ch.getAttribute('data-id') === selectedEnvelopeId));
    });
  };

  const updateUI = () => {
    b = getBudgetFn();
    const num = parseFloat(currentAmountStr || '0');
    display.innerText = formatCurrency(num);

    const env = b.envelopes.find(e => e.id === selectedEnvelopeId);
    if (env) {
      const rem = env.balance - num;
      // Sin monto todavía no hay nada que exceder: si el sobre ya está bajo
      // cero, se dice eso; "Excederías…" solo con un monto mayor a 0.
      if (num <= 0 && env.balance < 0) {
        pintarContexto(context, `${env.name} ya está en negativo (${formatCurrency(Math.abs(env.balance))} bajo cero)`, true);
      } else if (rem < 0) {
        // Si ya estaba bajo cero, "Excederías en $X" sumaba la deuda previa
        // al monto: se dice dónde quedaría (Revisión oct 5.2).
        pintarContexto(context, env.balance < 0
          ? `El sobre quedaría en ${formatCurrency(rem)}`
          : `Excederías tu sobre de ${env.name} en ${formatCurrency(Math.abs(rem))}`, true);
      } else {
        pintarContexto(context, `Quedan ${formatCurrency(rem)} en este sobre`);
      }
    } else {
      pintarContexto(context, 'Selecciona un sobre');
    }

    btnSubmit.disabled = !(num > 0 && selectedEnvelopeId);
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
      btnSubmit.innerHTML = guardandoHtml();

      setTimeout(async () => {
        const payload = { type: 'Gasto', category: selectedCategory, label, amount, goalId: null, envelopeId: selectedEnvelopeId };
        if (dateVal) payload.date = dateVal; // omitido -> db.js usa hoy por defecto
        let res;
        if (id) {
          res = await db.updateTransaction(id, payload);
        } else {
          res = await db.addTransaction(payload);
        }

        // Si mientras se guardaba se cambió de vista, el formulario ya no está
        // en la página: el gasto quedó guardado y no hay nada que pintar.
        if (!modal.isConnected) return;
        btnSubmit.innerHTML = originalText;

        // Confirmación visual (check + mensaje) antes de volver a la vista normal
        const overlay = document.getElementById('gasto-confirm-overlay');
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

  modal.openForm = (tx = null) => {
    b = getBudgetFn(); // Refresh data

    // Render Chips based on Envelopes
    if (b.envelopes.length > 0) {
      chipContainer.innerHTML = b.envelopes.map(env => `<button type="button" class="o-chip" data-id="${escapeHtml(env.id)}" data-cat="${escapeHtml(env.category)}" aria-pressed="false">${escapeHtml(env.name)}</button>`).join('');

      chipContainer.querySelectorAll('.o-chip').forEach(c => {
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
      chipContainer.innerHTML = '<p class="o-campo-ayuda">No hay sobres creados</p>';
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
        ? claveDiaDe(tx.date) // día local también si la fecha guardada es ISO
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
    abrirHoja(ID);
  };
}
