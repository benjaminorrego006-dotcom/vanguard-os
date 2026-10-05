import { db } from '../core/db.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { iniciarFoco, focoEnCurso, MIN_FOCO } from './foco.js';
import { formatFechaHora } from '../utils/fecha.js';

const STATE_CHIPS = [
  { value: 'todo', label: 'Por Hacer' },
  { value: 'in-progress', label: 'En Curso' },
  { value: 'done', label: 'Hecho' }
];

// Dificultad (docs/PLAN-DIFICULTAD-FOCO.md, F1): solo en tareas de Lista.
// Sin elegir = sin campo (al calcular se lee como 'media'); por eso una
// tarea sin el campo abre con "Media" sugerida (borde punteado) y no guarda
// nada si no se toca.
const DIFICULTAD_CHIPS = [
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Media' },
  { value: 'dificil', label: 'Difícil' }
];

const EVENT_LABELS = {
  tarea_creada: 'Tarea creada',
  tarea_actualizada: 'Tarea actualizada',
  tarea_completada: 'Marcada como hecha',
  tarea_eliminada: 'Tarea eliminada',
  foco_completado: 'Foco · 25 min'
};

// Botón de foco: solo en una tarea existente que no esté hecha. Con un foco
// en curso (de esta u otra tarea) lo abre en vez de empezar otro.
function syncFocoBtn() {
  const btn = document.getElementById('btn-task-foco');
  if (!btn) return;
  const id = document.getElementById('task-id').value;
  const status = document.getElementById('task-status-pending').value;
  btn.hidden = !id || status === 'done';
  const actual = focoEnCurso();
  btn.textContent = !actual ? `Foco ${MIN_FOCO} min` : actual.tareaId === id ? 'Volver al foco' : 'Ver foco en curso';
}

window.addEventListener('vg-foco-cambio', syncFocoBtn);

function formatBitacoraFecha(ts) {
  return formatFechaHora(new Date(ts));
}

// Vencida o vence hoy -> rojo (--rd); cualquier otro caso (sin fecha o
// fecha futura) usa el color de texto normal, nunca rojo.
function dueDateColor(dueDate) {
  if (!dueDate) return 'var(--text-primary)';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(dueDate + 'T00:00:00');
  return d <= hoy ? 'var(--rd)' : 'var(--text-primary)';
}

function renderPriorityPicker() {
  return `
    <div id="priority-picker" style="display:flex; align-items:flex-end; gap:6px;">
      ${[1, 2, 3].map(i => {
        const h = 8 + i * 5;
        const p = i === 1 ? 'low' : i === 2 ? 'medium' : 'high';
        return `<button type="button" class="btn-priority-bar tappable" data-priority="${p}" title="Prioridad ${p}" aria-label="Prioridad ${p}" style="width:16px; height:${h}px; padding:0; background:var(--surface-2); border:1px solid var(--surface-border); cursor:pointer;"></button>`;
      }).join('')}
    </div>
  `;
}

function syncPriorityBarStyles(priority) {
  const level = priority === 'high' ? 3 : priority === 'low' ? 1 : 2;
  document.querySelectorAll('.btn-priority-bar').forEach((btn, idx) => {
    const filled = (idx + 1) <= level;
    btn.style.background = filled ? 'var(--vi)' : 'var(--surface-2)';
    btn.style.borderColor = filled ? 'var(--vi)' : 'var(--surface-border)';
  });
}

function syncDificultadChips(dificultad) {
  document.querySelectorAll('.btn-dificultad-chip').forEach(btn => {
    const v = btn.getAttribute('data-dificultad');
    const elegida = v === dificultad;
    const sugerida = !dificultad && v === 'media';
    btn.setAttribute('aria-checked', String(elegida));
    btn.classList.toggle('btn-dificultad-chip--sugerida', sugerida);
    btn.style.background = elegida ? 'var(--vip)' : 'var(--surface-1)';
    btn.style.borderColor = elegida || sugerida ? 'var(--vi)' : 'var(--surface-border)';
    btn.style.borderStyle = sugerida ? 'dashed' : 'solid';
    btn.style.color = elegida ? 'var(--text-primary)' : 'var(--text-secondary)';
  });
}

function syncStateChipStyles(status) {
  document.querySelectorAll('.btn-state-chip').forEach(btn => {
    const isActive = btn.getAttribute('data-status') === status;
    btn.style.background = isActive ? 'var(--vip)' : 'var(--surface-1)';
    btn.style.borderColor = isActive ? 'var(--vi)' : 'var(--surface-border)';
    btn.style.color = isActive ? 'var(--text-primary)' : 'var(--text-secondary)';
  });
}

// Bitácora: se deriva en vivo del log de eventos central (nunca un campo
// guardado aparte) — ver db.getBitacoraEntidad. Más reciente arriba, en
// violeta brillante; el resto, en violeta atenuado (--vib).
async function renderBitacora(taskId) {
  const eventos = await db.getBitacoraEntidad(taskId);
  if (eventos.length === 0) {
    return `<div style="font-size:12px; color:var(--text-secondary);">Sin actividad registrada</div>`;
  }
  const ordenados = [...eventos].sort((a, b) => b.ts - a.ts);
  return `
    <div style="position:relative; padding-left:18px;">
      ${ordenados.map((ev, i) => {
        const isLatest = i === 0;
        const isLast = i === ordenados.length - 1;
        const dotColor = isLatest ? 'var(--vi)' : 'var(--vib)';
        const label = EVENT_LABELS[ev.tipo] || ev.tipo;
        return `
          <div style="position:relative; padding-bottom:${isLast ? '0' : '16px'};">
            ${!isLast ? `<div style="position:absolute; left:-14px; top:12px; bottom:0; width:1px; background:var(--vib);"></div>` : ''}
            <div style="position:absolute; left:-18px; top:3px; width:8px; height:8px; border-radius:50%; background:${dotColor};"></div>
            <div style="font-size:13px; font-weight:700; color:${isLatest ? 'var(--text-primary)' : 'var(--text-secondary)'};">${label}</div>
            <div style="font-size:11px; color:var(--t5); margin-top:2px;">${formatBitacoraFecha(ev.ts)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function refreshBitacoraSection(taskId) {
  const el = document.getElementById('task-bitacora');
  if (el) el.innerHTML = await renderBitacora(taskId);
}

export function renderTaskForm() {
  return `
    <div id="task-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 520px; max-height: 90vh; overflow-y: auto;">
        <h2 id="task-modal-title" style="margin-top: 0; margin-bottom: 18px; font-size: 20px; font-weight: 800; color: var(--text-primary);">Nueva Tarea</h2>
        <input type="hidden" id="task-id">
        <input type="hidden" id="task-status-pending" value="todo">

        <!-- Selector de estado: 3 chips -->
        <div style="display:flex; gap:6px; margin-bottom:22px;">
          ${STATE_CHIPS.map(s => `
            <button type="button" class="btn-state-chip tappable" data-status="${s.value}" style="flex:1; padding:10px 6px; background:var(--surface-1); border:1px solid var(--surface-border); color:var(--text-secondary); cursor:pointer; text-transform:uppercase; font-weight:700;">${s.label}</button>
          `).join('')}
        </div>

        <button type="button" id="btn-task-foco" class="tappable" hidden style="width:100%; min-height:44px; margin:-10px 0 20px; background:transparent; border:1px solid var(--vi); color:var(--vi); font:inherit; font-size:13px; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; cursor:pointer;">Foco 25 min</button>

        <div class="input-group">
          <label for="task-title">Título</label>
          <input type="text" id="task-title" placeholder="Ej. Finalizar estrategia de marketing" required>
        </div>

        <!-- Metadatos: fecha límite + prioridad -->
        <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:20px;">
          <div class="input-group" style="margin-bottom:0; flex:1;">
            <label for="task-due-date">Fecha límite</label>
            <input type="date" id="task-due-date">
          </div>
          <div style="padding-bottom:14px;">
            <div style="display:block; color:var(--text-secondary); font-size:13px; font-weight:600; margin-bottom:8px; text-transform:uppercase;">Prioridad</div>
            ${renderPriorityPicker()}
            <input type="hidden" id="task-priority" value="medium">
          </div>
        </div>

        <!-- Dificultad: 3 chips (misma estética que los de estado). -->
        <div style="margin-bottom:20px;">
          <div id="task-dificultad-etq" style="display:block; color:var(--text-secondary); font-size:13px; font-weight:600; margin-bottom:8px; text-transform:uppercase;">Dificultad</div>
          <div role="radiogroup" aria-labelledby="task-dificultad-etq" style="display:flex; gap:6px;">
            ${DIFICULTAD_CHIPS.map(d => `
              <button type="button" role="radio" aria-checked="false" class="btn-dificultad-chip tappable" data-dificultad="${d.value}" style="flex:1; min-height:44px; padding:10px 6px; background:var(--surface-1); border:1px solid var(--surface-border); color:var(--text-secondary); cursor:pointer; text-transform:uppercase; font-weight:700;">${d.label}</button>
            `).join('')}
          </div>
          <input type="hidden" id="task-dificultad" value="">
        </div>

        <div class="input-group">
          <label for="task-desc">Notas</label>
          <textarea id="task-desc" placeholder="Detalles, contexto, links..." rows="3" style="color: var(--text-secondary);"></textarea>
        </div>

        <div class="input-group">
          <label for="task-project">Proyecto / Etiqueta</label>
          <input type="text" id="task-project" placeholder="Ej. Product Launch">
        </div>

        <div class="input-group">
          <div style="display: block; color: var(--text-secondary); font-size: 13px; font-weight: 600; margin-bottom: 8px;">Subtareas</div>
          <div id="subtasks-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
          <button id="btn-add-subtask" type="button" style="background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 8px; cursor: pointer; width: 100%; font-size: 13px;">+ Agregar subtarea</button>
        </div>

        <!-- Bitácora: derivada del log de eventos, solo si la tarea existe -->
        <div id="bitacora-section" style="display:none; margin-top:8px; margin-bottom:8px;">
          <div style="display:block; color:var(--text-secondary); font-size:13px; font-weight:600; margin-bottom:12px; text-transform:uppercase;">Bitácora</div>
          <div id="task-bitacora"></div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button id="btn-save-task" class="btn-primary" style="background: var(--accent-purple); color: var(--bg-base); flex: 1; margin-top:0;">Guardar</button>
          <button id="btn-delete-task-modal" type="button" style="display:none; background: transparent; border: 1.5px solid var(--rdb); color: var(--rd); padding: 0 18px; font-weight:700; font-size:13px; cursor:pointer;">Eliminar</button>
        </div>
        <button id="btn-cancel-task" type="button" style="background: transparent; border: none; color: var(--text-secondary); width: 100%; padding: 12px; margin-top: 8px; cursor: pointer; font-size: 13px;">Cancelar</button>
      </div>
    </div>
  `;
}

export function setupTaskForm(onSaveCallback) {
  const modal = document.getElementById('task-modal');
  const btnCancel = document.getElementById('btn-cancel-task');
  const btnSave = document.getElementById('btn-save-task');
  const btnDelete = document.getElementById('btn-delete-task-modal');
  const btnAddSub = document.getElementById('btn-add-subtask');
  const container = document.getElementById('subtasks-container');
  const dueInput = document.getElementById('task-due-date');
  const priorityHidden = document.getElementById('task-priority');
  const statusPending = document.getElementById('task-status-pending');

  const closeModal = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
  };

  btnCancel.addEventListener('click', () => {
    closeModal();
    // Un clic en un chip de estado ya aplicó el cambio en la BD aunque el
    // resto de la edición se cancele — el tablero de atrás necesita
    // refrescarse para reflejarlo (ver comentario en el listener de chips).
    if (onSaveCallback) onSaveCallback();
  });

  btnAddSub.addEventListener('click', () => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.innerHTML = `
      <input type="checkbox" class="subtask-check" style="width: 20px; height: 20px;">
      <input type="text" class="subtask-title" placeholder="Subtarea..." style="flex: 1; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 8px; font-size: 16px;">
      <button class="tappable btn-remove-sub" type="button" aria-label="Eliminar subtarea" style="background: transparent; border: none; color: var(--text-disabled);">✕</button>
    `;
    div.querySelector('.btn-remove-sub').addEventListener('click', () => div.remove());
    container.appendChild(div);
  });

  dueInput.addEventListener('change', () => { dueInput.style.color = dueDateColor(dueInput.value); });

  // Foco: la pantalla se abre encima del detalle, que queda abierto debajo
  // (al terminar la pausa se vuelve a él). Si se abrió desde otro lado,
  // `alVolver` abre este detalle.
  document.getElementById('btn-task-foco').addEventListener('click', () => {
    const id = document.getElementById('task-id').value;
    if (!id) return;
    iniciarFoco({ id, title: document.getElementById('task-title').value.trim() }, { alVolver: abrirDetallePorId });
  });

  const dificultadHidden = document.getElementById('task-dificultad');
  document.querySelectorAll('.btn-dificultad-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      dificultadHidden.value = btn.getAttribute('data-dificultad');
      syncDificultadChips(dificultadHidden.value);
    });
  });

  document.querySelectorAll('.btn-priority-bar').forEach(btn => {
    btn.addEventListener('click', () => {
      const priority = btn.getAttribute('data-priority');
      priorityHidden.value = priority;
      syncPriorityBarStyles(priority);
    });
  });

  // Chips de estado: en una tarea existente, mover de estado se aplica de
  // inmediato (misma semántica que antes tenían las flechas del tablero) y
  // la bitácora se refresca en vivo con el evento recién generado. En una
  // tarea nueva (sin id) solo queda pendiente hasta guardar.
  document.querySelectorAll('.btn-state-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      const status = btn.getAttribute('data-status');
      statusPending.value = status;
      syncStateChipStyles(status);
      syncFocoBtn();
      const taskId = document.getElementById('task-id').value;
      if (taskId) {
        // Aplica el cambio ya (misma semántica que antes tenían las
        // flechas de mover) y refresca solo la bitácora en vivo. El
        // tablero de atrás se refresca recién al cerrar el modal
        // (Guardar/Cancelar/Eliminar) — refrescarlo acá reemplazaría todo
        // #view-root, incluido este mismo modal, y lo cerraría de golpe.
        await db.updateTaskStatus(taskId, status);
        await refreshBitacoraSection(taskId);
      }
    });
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
      priority: priorityHidden.value,
      dueDate: dueInput.value,
      project: document.getElementById('task-project').value.trim(),
      status: statusPending.value,
      subtasks,
      // Solo si se eligió: sin tocar, la tarea queda sin el campo.
      ...(dificultadHidden.value ? { dificultad: dificultadHidden.value } : {})
    };

    await db.saveTask(taskData);
    Toast('Tarea guardada', 'success');
    closeModal();
    if (onSaveCallback) onSaveCallback();
  });

  btnDelete.addEventListener('click', async () => {
    const id = document.getElementById('task-id').value;
    if (!id) return;
    const title = document.getElementById('task-title').value.trim();
    const subtaskCount = document.getElementById('subtasks-container').children.length;
    const confirmed = await ConfirmDialog(
      `Eliminar tarea${title ? ' ' + title : ''}`,
      subtaskCount > 0
        ? `Se perderán sus ${subtaskCount} subtarea${subtaskCount === 1 ? '' : 's'}. No se puede deshacer.`
        : 'No se puede deshacer.',
      { verb: 'Eliminar' }
    );
    if (confirmed) {
      await db.deleteTask(id);
      Toast('Tarea eliminada', 'success');
      closeModal();
      if (onSaveCallback) onSaveCallback();
    }
  });
}

// Abre el detalle de una tarea por id (fin de la pausa de un foco abierto
// desde Semana u Hoy). Sin el formulario montado en la vista, no hace nada.
export async function abrirDetallePorId(id) {
  if (!document.getElementById('task-modal')) return;
  const task = (await db.getTasks()).find(t => t.id === id);
  if (task) openTaskForm(task);
}

export function openTaskForm(task = null) {
  const modal = document.getElementById('task-modal');
  const titleEl = document.getElementById('task-modal-title');
  const container = document.getElementById('subtasks-container');
  const dueInput = document.getElementById('task-due-date');
  const priorityHidden = document.getElementById('task-priority');
  const statusPending = document.getElementById('task-status-pending');
  const bitacoraSection = document.getElementById('bitacora-section');
  const btnDelete = document.getElementById('btn-delete-task-modal');

  container.innerHTML = '';

  if (task) {
    titleEl.innerText = 'Detalle de Tarea';
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-desc').value = task.description || '';
    priorityHidden.value = task.priority || 'medium';
    dueInput.value = task.dueDate || '';
    dueInput.style.color = dueDateColor(task.dueDate);
    document.getElementById('task-project').value = task.project || '';
    statusPending.value = task.status || 'todo';
    document.getElementById('task-dificultad').value = ['facil', 'media', 'dificil'].includes(task.dificultad) ? task.dificultad : '';

    if (task.subtasks) {
      task.subtasks.forEach(sub => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '8px';
        div.innerHTML = `
          <input type="checkbox" class="subtask-check" style="width: 20px; height: 20px;" ${sub.done ? 'checked' : ''}>
          <input type="text" class="subtask-title" value="${escapeHtml(sub.title)}" style="flex: 1; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 8px; font-size: 16px;">
          <button class="tappable btn-remove-sub" type="button" aria-label="Eliminar subtarea" style="background: transparent; border: none; color: var(--text-disabled);">✕</button>
        `;
        div.querySelector('.btn-remove-sub').addEventListener('click', () => div.remove());
        container.appendChild(div);
      });
    }

    bitacoraSection.style.display = 'block';
    document.getElementById('task-bitacora').innerHTML = `<div style="font-size:12px; color:var(--t4);">Cargando…</div>`;
    btnDelete.style.display = 'block';
    refreshBitacoraSection(task.id);
  } else {
    titleEl.innerText = 'Nueva Tarea';
    document.getElementById('task-id').value = '';
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    priorityHidden.value = 'medium';
    dueInput.value = '';
    dueInput.style.color = 'var(--text-primary)';
    document.getElementById('task-project').value = '';
    statusPending.value = 'todo';
    document.getElementById('task-dificultad').value = '';
    bitacoraSection.style.display = 'none';
    btnDelete.style.display = 'none';
  }

  syncPriorityBarStyles(priorityHidden.value);
  syncStateChipStyles(statusPending.value);
  syncDificultadChips(document.getElementById('task-dificultad').value);
  syncFocoBtn();

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}
