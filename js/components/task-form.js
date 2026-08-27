import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';

export function renderTaskForm() {
  const priorities = [
    { value: 'high', label: 'Alta', color: 'var(--state-high)' },
    { value: 'medium', label: 'Media', color: 'var(--state-medium)' },
    { value: 'low', label: 'Baja', color: 'var(--state-low)' }
  ];

  return `
    <div id="task-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 500px; max-height: 90vh; overflow-y: auto;">
        <h2 id="task-modal-title" style="margin-top: 0; font-size: 20px; font-weight: 700;">Nueva Tarea</h2>
        <input type="hidden" id="task-id">
        <input type="hidden" id="task-status" value="todo">
        
        <div class="input-group">
          <label>Título de la Tarea</label>
          <input type="text" id="task-title" placeholder="Ej. Finalizar estrategia de marketing" required>
        </div>
        
        <div class="input-group">
          <label>Descripción (opcional)</label>
          <input type="text" id="task-desc" placeholder="Detalles extra...">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="input-group">
            <label>Prioridad</label>
            <select id="task-priority">
              ${priorities.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label>Fecha de Vencimiento</label>
            <input type="date" id="task-due-date">
          </div>
        </div>

        <div class="input-group">
          <label>Proyecto / Etiqueta</label>
          <input type="text" id="task-project" placeholder="Ej. Product Launch">
        </div>

        <div class="input-group">
          <label>Subtareas</label>
          <div id="subtasks-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
          <button id="btn-add-subtask" type="button" style="background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 8px; border-radius: 8px; cursor: pointer; width: 100%; font-size: 13px;">+ Agregar subtarea</button>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button id="btn-cancel-task" class="btn-primary" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Cancelar</button>
          <button id="btn-save-task" class="btn-primary" style="background: var(--accent-purple); color: #000; flex: 1;">Guardar</button>
        </div>
      </div>
    </div>
  `;
}

export function setupTaskForm(onSaveCallback) {
  const modal = document.getElementById('task-modal');
  const btnCancel = document.getElementById('btn-cancel-task');
  const btnSave = document.getElementById('btn-save-task');
  const btnAddSub = document.getElementById('btn-add-subtask');
  const container = document.getElementById('subtasks-container');

  btnCancel.addEventListener('click', () => {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
  });

  btnAddSub.addEventListener('click', () => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.innerHTML = `
      <input type="checkbox" class="subtask-check" style="width: 20px; height: 20px;">
      <input type="text" class="subtask-title" placeholder="Subtarea..." style="flex: 1; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 8px; border-radius: 8px; font-size: 14px;">
      <button class="tappable btn-remove-sub" type="button" style="background: transparent; border: none; color: var(--text-disabled);">✕</button>
    `;
    div.querySelector('.btn-remove-sub').addEventListener('click', () => div.remove());
    container.appendChild(div);
  });

  btnSave.addEventListener('click', async () => {
    const title = document.getElementById('task-title').value.trim();
    if (!title) return Toast('El título es requerido', 'warning');

    const subtasks = Array.from(container.children).map(div => ({
      title: div.querySelector('.subtask-title').value.trim(),
      done: div.querySelector('.subtask-check').checked
    })).filter(s => s.title !== '');

    const taskData = {
      id: document.getElementById('task-id').value || null,
      title,
      description: document.getElementById('task-desc').value.trim(),
      priority: document.getElementById('task-priority').value,
      dueDate: document.getElementById('task-due-date').value,
      project: document.getElementById('task-project').value.trim(),
      status: document.getElementById('task-status').value || 'todo',
      subtasks
    };

    await db.saveTask(taskData);
    modal.classList.remove('open');
    setTimeout(() => {
      modal.style.display = 'none';
      if (onSaveCallback) onSaveCallback();
    }, 300);
  });
}

export function openTaskForm(task = null) {
  const modal = document.getElementById('task-modal');
  const titleEl = document.getElementById('task-modal-title');
  const container = document.getElementById('subtasks-container');
  
  container.innerHTML = '';

  if (task) {
    titleEl.innerText = 'Editar Tarea';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-priority').value = task.priority || 'medium';
    document.getElementById('task-due-date').value = task.dueDate || '';
    document.getElementById('task-project').value = task.project || '';
    document.getElementById('task-status').value = task.status || 'todo';
    
    if (task.subtasks) {
      task.subtasks.forEach(sub => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '8px';
        div.innerHTML = `
          <input type="checkbox" class="subtask-check" style="width: 20px; height: 20px;" ${sub.done ? 'checked' : ''}>
          <input type="text" class="subtask-title" value="${sub.title}" style="flex: 1; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 8px; border-radius: 8px; font-size: 14px;">
          <button class="tappable btn-remove-sub" type="button" style="background: transparent; border: none; color: var(--text-disabled);">✕</button>
        `;
        div.querySelector('.btn-remove-sub').addEventListener('click', () => div.remove());
        container.appendChild(div);
      });
    }
  } else {
    titleEl.innerText = 'Nueva Tarea';
    document.getElementById('task-id').value = '';
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-due-date').value = '';
    document.getElementById('task-project').value = '';
    document.getElementById('task-status').value = 'todo';
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}