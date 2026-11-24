// js/components/EnvelopeForm.js
// Hoja «Nuevo sobre» / «Editar sobre» (Órbita, oHoja #envelope-modal).
// Antes era un panel dentro de Cuentas; ahora es una hoja como las demás
// (Atrás la cierra). finanzas.js la abre con
// `document.getElementById('envelope-modal').openForm(env)`. Lógica de
// siempre (Fase 8b), incluido el tope por categoría de la regla 50/30/20.
import { Toast } from '../utils/states.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';

const ID = 'envelope-modal';

// Máscara de miles: un <input type="number"> trata el punto como separador
// DECIMAL, así que "120.000" se guardaba como 120. envelope-amount es
// type="text" y formatea solo dígitos con puntos de miles mientras se
// escribe (mismo criterio que goal-form.js para los montos de meta).
const digitsToMiles = (raw) => {
  const digits = (raw || '').toString().replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const milesToInt = (str) => {
  const digits = (str || '').toString().replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

export function renderEnvelopeForm() {
  return oHoja({
    id: ID, titulo: 'Nuevo sobre', modulo: 'finanzas',
    cuerpo: `
      <form id="envelope-form" class="o-hoja-cuerpo">
        <div class="o-campo">
          <label for="envelope-name">Nombre del sobre</label>
          <input type="text" id="envelope-name" class="o-input" placeholder="Ej. Supermercado, Netflix..." autocomplete="off" required>
        </div>
        <div class="o-campo">
          <label for="envelope-category">Categoría 50/30/20</label>
          <select id="envelope-category" class="o-input" required>
            <option value="Needs">Necesidad (50%)</option>
            <option value="Wants">Deseo (30%)</option>
          </select>
        </div>
        <div class="o-campo">
          <label for="envelope-amount">Monto asignado (opcional)</label>
          <input type="text" inputmode="numeric" id="envelope-amount" class="o-input o-input--monto" placeholder="0" autocomplete="off">
        </div>
        <div class="o-campo">
          <label for="envelope-icon">Ícono</label>
          <select id="envelope-icon" class="o-input">
            <option value="home">Hogar / Supermercado</option>
            <option value="car">Transporte / Auto</option>
            <option value="laptop">Tecnología / Suscripciones</option>
            <option value="shield">Protección / Salud</option>
            <option value="plane">Salidas / Viajes</option>
            <option value="education">Educación</option>
          </select>
        </div>
        <input type="hidden" id="envelope-id">
      </form>`,
    pie: '<button type="button" class="o-btn o-btn--secundario" data-hoja-cerrar>Cancelar</button><button type="submit" form="envelope-form" id="envelope-guardar" class="o-btn o-btn--primario">Guardar sobre</button>'
  });
}

export function initEnvelopeForm(db, refreshCallback) {
  const modal = document.getElementById(ID);
  if (!modal) return;

  const form = document.getElementById('envelope-form');
  const amountInput = document.getElementById('envelope-amount');

  amountInput.addEventListener('input', () => {
    amountInput.value = digitsToMiles(amountInput.value);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('envelope-id').value;
    const name = document.getElementById('envelope-name').value.trim();
    const category = document.getElementById('envelope-category').value;
    const icon = document.getElementById('envelope-icon').value;
    const assignedAmount = milesToInt(amountInput.value);

    // Validar monto contra límite de la categoría 50/30/20
    const budget = await db.getBudget();
    const categoryBudget = category === 'Needs' ? budget.budgetTarget.needs : budget.budgetTarget.wants;
    let otherEnvelopesSum = 0;
    budget.envelopes.forEach(e => {
      if (e.category === category && e.id !== id) {
        otherEnvelopesSum += e.assignedAmount;
      }
    });

    const available = categoryBudget - otherEnvelopesSum;
    if (assignedAmount > available) {
      Toast(`Monto excede lo disponible en ${category === 'Needs' ? 'Necesidades' : 'Deseos'} (${available})`, 'error');
      return;
    }

    if (name) {
      if (id) {
        await db.updateEnvelope(id, { name, category, icon, assignedAmount });
      } else {
        await db.createEnvelope({ name, category, icon, assignedAmount });
      }

      Toast("Sobre guardado", "success");
      if (!modal.isConnected) return; // vista cambiada mientras se guardaba
      cerrarHoja(ID);
    }
  });

  // Cerrar: cabecera, Cancelar y toque en el fondo.
  montarHoja(ID);

  modal.openForm = (env = null) => {
    if (env) {
      document.getElementById('envelope-id').value = env.id;
      document.getElementById('envelope-name').value = env.name;
      document.getElementById('envelope-category').value = env.category;
      amountInput.value = digitsToMiles(env.assignedAmount || 0);
      document.getElementById('envelope-icon').value = env.icon;
      document.getElementById(`${ID}-titulo`).innerText = 'Editar sobre';
    } else {
      document.getElementById('envelope-id').value = '';
      document.getElementById('envelope-name').value = '';
      document.getElementById('envelope-category').value = 'Needs';
      document.getElementById('envelope-amount').value = '';
      document.getElementById('envelope-icon').value = 'home';
      document.getElementById(`${ID}-titulo`).innerText = 'Nuevo sobre';
    }

    abrirHoja(ID);
  };
}
