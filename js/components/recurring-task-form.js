import { Toast, ConfirmDialog } from '../utils/states.js';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function describeRecurringTaskFreq(item) {
  if (item.frequency === 'daily') return 'Todos los días';
  if (item.frequency === 'weekly') return `Cada ${WEEKDAYS[item.weekday]}`;
  return `Día ${item.dayOfMonth} de cada mes`;
}

export function renderRecurringTaskForm() {
  return `
    <div id="task-recurring-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 420px;">
        <div class="flex-between" style="margin-bottom: 20px;">
          <h2 style="margin:0; font-size:20px; font-weight:800; color:var(--text-primary);">Tarea Recurrente</h2>
          <button class="btn-close-recurring-task" style="background:transparent; border:none; color:var(--text-secondary); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <form id="task-recurring-form">
          <div class="input-group">
            <label>Título</label>
            <input type="text" id="tr-title" placeholder="Ej. Pagar arriendo" required>
          </div>
          <div class="input-group">
            <label>Frecuencia</label>
            <select id="tr-frequency">
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
              <option value="monthly" selected>Mensual</option>
            </select>
          </div>
          <div class="input-group" id="tr-weekly-field" style="display:none;">
            <label>Día de la semana</label>
            <select id="tr-weekday">
              ${WEEKDAYS.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
            </select>
          </div>
          <div class="input-group" id="tr-monthly-field">
            <label>Día del mes</label>
            <select id="tr-day">
              ${Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label>Prioridad</label>
            <select id="tr-priority">
              <option value="low">Baja</option>
              <option value="medium" selected>Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <button id="btn-submit-recurring-task" type="submit" class="btn-primary" style="background: var(--accent-purple); color: var(--bg-base); width:100%; margin-top:4px;">Guardar</button>
        </form>
      </div>
    </div>
  `;
}

export function initRecurringTaskForm(db, refreshCallback) {
  const modal = document.getElementById('task-recurring-modal');
  if (!modal) return;

  const form = document.getElementById('task-recurring-form');
  const freqSelect = document.getElementById('tr-frequency');
  const weeklyField = document.getElementById('tr-weekly-field');
  const monthlyField = document.getElementById('tr-monthly-field');

  const closeModal = () => {
    modal.style.display = 'none';
    modal.classList.remove('open');
  };

  const syncFreqFields = () => {
    const f = freqSelect.value;
    weeklyField.style.display = f === 'weekly' ? 'block' : 'none';
    monthlyField.style.display = f === 'monthly' ? 'block' : 'none';
  };
  freqSelect.addEventListener('change', syncFreqFields);

  modal.querySelector('.btn-close-recurring-task').addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('tr-title').value.trim();
    if (!title) return Toast('El título es requerido', 'warning');

    const frequency = freqSelect.value;
    const data = {
      title,
      priority: document.getElementById('tr-priority').value,
      frequency,
      weekday: frequency === 'weekly' ? parseInt(document.getElementById('tr-weekday').value, 10) : null,
      dayOfMonth: frequency === 'monthly' ? parseInt(document.getElementById('tr-day').value, 10) : null
    };

    await db.createRecurringTask(data);
    Toast('Tarea recurrente creada', 'success');
    closeModal();
    if (refreshCallback) refreshCallback();
  });

  modal.openForm = () => {
    document.getElementById('tr-title').value = '';
    freqSelect.value = 'monthly';
    document.getElementById('tr-weekday').value = '1';
    document.getElementById('tr-day').value = '1';
    document.getElementById('tr-priority').value = 'medium';
    syncFreqFields();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  };
}

export function attachRecurringTaskDeleteListeners(db, refreshCallback) {
  document.querySelectorAll('.delete-recurring-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const confirmed = await ConfirmDialog('Eliminar tarea recurrente', 'Las tareas ya generadas quedan intactas, pero no se crearán más.', { verb: 'Eliminar' });
      if (confirmed) {
        await db.deleteRecurringTask(id);
        Toast('Recurrente eliminada', 'success');
        if (refreshCallback) refreshCallback();
      }
    });
  });
}
