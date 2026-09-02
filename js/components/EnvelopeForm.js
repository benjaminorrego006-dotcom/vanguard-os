import { Toast } from '../utils/states.js';

// REDISEÑO-FINANZAS: panel inline (no modal a pantalla completa) — igual
// que el resto del módulo, se muestra/oculta con display:block/none dentro
// del flujo normal de la tab Cuentas. `envelope-modal` conserva su id
// aunque ya no sea un overlay: finanzas.js sigue llamando a
// `document.getElementById('envelope-modal').openForm(...)` para abrirlo.
export function renderEnvelopeForm() {
  return `
    <div id="envelope-modal" class="card" style="display: none; padding: 20px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <p class="fin-eyebrow" id="modal-envelope-title" style="margin: 0;">Nuevo sobre</p>
        <button class="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 20px; cursor: pointer; line-height: 1;">&times;</button>
      </div>

      <form id="envelope-form">
        <input type="hidden" id="envelope-id">

        <div class="input-group">
          <label>Nombre del Sobre</label>
          <input type="text" id="envelope-name" placeholder="Ej. Supermercado, Netflix..." required>
        </div>

        <div class="input-group">
          <label>Categoría 50/30/20</label>
          <select id="envelope-category" required>
            <option value="Needs">Necesidad (50%)</option>
            <option value="Wants">Deseo (30%)</option>
          </select>
        </div>

        <div class="input-group">
          <label>Monto Asignado (opcional)</label>
          <input type="number" id="envelope-amount" placeholder="0" min="0" step="1">
        </div>

        <div class="input-group">
          <label>Icono</label>
          <select id="envelope-icon">
            <option value="home">Hogar / Supermercado</option>
            <option value="car">Transporte / Auto</option>
            <option value="laptop">Tecnología / Suscripciones</option>
            <option value="shield">Protección / Salud</option>
            <option value="plane">Salidas / Viajes</option>
            <option value="education">Educación</option>
          </select>
        </div>

        <button type="submit" class="btn-primary" style="background: var(--text-primary); color: var(--bg-base);">Guardar Sobre</button>
      </form>
    </div>
  `;
}

export function initEnvelopeForm(db, refreshCallback) {
  const modal = document.getElementById('envelope-modal');
  if (!modal) return;
  
  const form = document.getElementById('envelope-form');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('envelope-id').value;
    const name = document.getElementById('envelope-name').value.trim();
    const category = document.getElementById('envelope-category').value;
    const icon = document.getElementById('envelope-icon').value;
    const assignedAmount = parseFloat(document.getElementById('envelope-amount').value) || 0;
    
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
      
      modal.style.display = 'none';
      Toast("Sobre guardado", "success");
    }
  });

  modal.querySelector('.btn-close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.openForm = (env = null) => {
    if (env) {
      document.getElementById('envelope-id').value = env.id;
      document.getElementById('envelope-name').value = env.name;
      document.getElementById('envelope-category').value = env.category;
      document.getElementById('envelope-amount').value = env.assignedAmount || 0;
      document.getElementById('envelope-icon').value = env.icon;
      document.getElementById('modal-envelope-title').innerText = 'Editar Sobre';
    } else {
      document.getElementById('envelope-id').value = '';
      document.getElementById('envelope-name').value = '';
      document.getElementById('envelope-category').value = 'Needs';
      document.getElementById('envelope-amount').value = '';
      document.getElementById('envelope-icon').value = 'home';
      document.getElementById('modal-envelope-title').innerText = 'Nuevo Sobre';
    }
    
    modal.style.display = 'block';
    modal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
}