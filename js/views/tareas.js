import { db } from '../core/db.js';
import { renderTaskForm, setupTaskForm, openTaskForm } from '../components/task-form.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { ensureChartJs, appPalette, baseChartOptions } from '../utils/charts.js';
import { renderActivityHeatmap, initActivityHeatmapListeners } from '../components/activity-heatmap.js';
import { renderRecurringTaskForm, initRecurringTaskForm, attachRecurringTaskDeleteListeners, describeRecurringTaskFreq } from '../components/recurring-task-form.js';
import { escapeHtml } from '../utils/escape.js';

let tasksDonutInstance = null;

// Llamado por el router (app.js) antes de desmontar esta vista — evita que
// la instancia de Chart.js siga viva con su canvas ya fuera del DOM.
export function cleanup() {
  if (tasksDonutInstance) { tasksDonutInstance.destroy(); tasksDonutInstance = null; }
}

// Estado del tablero (qué columna está activa) — vive en el módulo, no en
// el DOM, igual que `activeFinTab` en finanzas.js: sobrevive a refresh()
// pero se reinicia si se navega a otra vista y se vuelve.
let activeTaskState = 'todo';

const STATE_LABELS = {
  'todo': 'Por Hacer',
  'in-progress': 'En Curso',
  'done': 'Hecho'
};

const EMPTY_MSG = {
  'todo': 'SIN TAREAS PENDIENTES',
  'in-progress': 'SIN TAREAS EN CURSO',
  'done': 'SIN TAREAS COMPLETADAS'
};

const renderTasksDonut = async (tasks) => {
  const canvas = document.getElementById('tasks-donut-chart');
  if (!canvas || tasks.length === 0) return;

  const completadas = tasks.filter(t => t.status === 'done').length;
  const pendientes = tasks.length - completadas;

  const Chart = await ensureChartJs();
  const palette = appPalette();

  if (tasksDonutInstance) tasksDonutInstance.destroy();
  tasksDonutInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Completadas', 'Pendientes'],
      datasets: [{
        data: [completadas, pendientes],
        backgroundColor: [palette.success, palette.surfaceBorder],
        borderColor: 'transparent',
        borderWidth: 1
      }]
    },
    options: { ...baseChartOptions(), cutout: '68%' }
  });
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00'); // avoid timezone shifts
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Vencida/vence-hoy -> rojo (--rd), cualquier otra fecha futura -> texto
// tenue. Devuelve null si la tarea no tiene fecha límite.
function dueDateInfo(dueDate) {
  if (!dueDate) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(dueDate + 'T00:00:00');
  const urgente = d <= hoy;
  let text;
  if (d.getTime() === hoy.getTime()) text = 'VENCE HOY';
  else if (d < hoy) text = `VENCIÓ · ${formatDate(dueDate)}`;
  else text = `VENCE · ${formatDate(dueDate)}`;
  return { text, urgente };
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// Con fecha antes que sin fecha; entre las que tienen fecha, la más
// próxima primero; a igualdad de fecha, la de mayor prioridad primero.
function ordenUrgencia(a, b) {
  const aTiene = !!a.dueDate, bTiene = !!b.dueDate;
  if (aTiene !== bTiene) return aTiene ? -1 : 1;
  if (aTiene && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
}

// Prioridad como 1-3 barritas rellenas en violeta, no como texto — mismo
// lenguaje visual que el detalle de tarea (task-form.js).
export function renderPriorityBars(priority) {
  const level = priority === 'high' ? 3 : priority === 'low' ? 1 : 2;
  const bars = [1, 2, 3].map(i => {
    const filled = i <= level;
    const h = 5 + i * 3;
    return `<span style="display:inline-block; width:4px; height:${h}px; background:${filled ? 'var(--vi)' : 'var(--surface-2)'}; border:1px solid ${filled ? 'var(--vi)' : 'var(--surface-border)'};"></span>`;
  }).join('');
  return `<span style="display:inline-flex; align-items:flex-end; gap:2px; flex-shrink:0;" title="Prioridad">${bars}</span>`;
}

// Flecha de avance rápido: Por Hacer -> En Curso -> Hecho, sin pasar por el
// detalle. Hecho ya es el final, no tiene siguiente estado.
function renderAdvanceButton(task) {
  if (task.status === 'done') return '';
  const to = task.status === 'todo' ? 'in-progress' : 'done';
  return `
    <button class="btn-advance-task tappable" data-id="${task.id}" data-from="${task.status}" data-to="${to}" title="Avanzar a ${STATE_LABELS[to]}" style="width:32px; height:32px; padding:0; background:transparent; border:none; color:var(--accent-purple); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>
    </button>
  `;
}

function renderUrgentTask(task) {
  const due = dueDateInfo(task.dueDate);
  return `
    <div class="card task-card tappable btn-edit-task" data-id="${task.id}" style="position:relative; padding:14px 14px 14px 18px; margin-bottom:10px; cursor:pointer;">
      <div style="position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--vi);"></div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
        <h4 style="margin:0; font-size:15px; font-weight:800; color:var(--text-primary); line-height:1.3;">${escapeHtml(task.title)}</h4>
        <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
          ${renderPriorityBars(task.priority)}
          ${renderAdvanceButton(task)}
        </div>
      </div>
      ${due ? `<div style="margin-top:8px; font-size:11px; font-weight:700; letter-spacing:0.4px; color:${due.urgente ? 'var(--rd)' : 'var(--text-secondary)'};">${due.text}</div>` : ''}
    </div>
  `;
}

function renderColaTask(task) {
  const due = dueDateInfo(task.dueDate);
  return `
    <div class="card task-card tappable btn-edit-task" data-id="${task.id}" style="position:relative; padding:12px 12px 12px 16px; margin-bottom:8px; cursor:pointer;">
      <div style="position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--vid);"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <span style="font-size:13px; font-weight:600; color:var(--t5); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(task.title)}</span>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          ${due ? `<span style="font-size:10px; font-weight:700; color:var(--t5); flex-shrink:0;">${due.text}</span>` : ''}
          ${renderAdvanceButton(task)}
        </div>
      </div>
    </div>
  `;
}

function renderStatusTask(task) {
  const isDone = task.status === 'done';
  const due = dueDateInfo(task.dueDate);
  return `
    <div class="card task-card tappable btn-edit-task" data-id="${task.id}" style="position:relative; padding:14px 14px 14px 18px; margin-bottom:10px; cursor:pointer;">
      <div style="position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--vi);"></div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
        <h4 style="margin:0; font-size:15px; font-weight:800; line-height:1.3; color:${isDone ? 'var(--text-disabled)' : 'var(--text-primary)'}; ${isDone ? 'text-decoration:line-through;' : ''}">${escapeHtml(task.title)}</h4>
        <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
          ${renderPriorityBars(task.priority)}
          ${renderAdvanceButton(task)}
        </div>
      </div>
      ${due ? `<div style="margin-top:8px; font-size:11px; font-weight:700; letter-spacing:0.4px; color:${due.urgente && !isDone ? 'var(--rd)' : 'var(--text-secondary)'};">${due.text}</div>` : ''}
    </div>
  `;
}

function renderRecurringTaskRow(item) {
  return `
    <div class="card" data-id="${item.id}" style="padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;">
      <div>
        <div style="font-size:13px; font-weight:700; color:var(--text-primary);">${escapeHtml(item.title)}</div>
        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">${describeRecurringTaskFreq(item)}</div>
      </div>
      <button class="delete-recurring-task tappable" data-id="${item.id}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer; flex-shrink:0;">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  `;
}

function renderRecurringTasksSection(recurringTasks) {
  return `
    <div class="card" style="margin-right:20px; margin-bottom:24px; padding:18px 20px;">
      <div class="flex-between" style="margin-bottom:${recurringTasks.length ? '14px' : '4px'};">
        <h3 style="font-size:13px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin:0;">Tareas Recurrentes</h3>
        <button id="btn-add-recurring-task" class="tappable" style="background:transparent; border:none; color:var(--accent-purple); font-size:13px; font-weight:700; cursor:pointer;">+ Nueva</button>
      </div>
      ${recurringTasks.length === 0
        ? `<div style="font-size:12px; color:var(--text-secondary);">Automatiza tareas que se repiten: pagos, revisiones, rutinas.</div>`
        : recurringTasks.map(renderRecurringTaskRow).join('')}
    </div>
  `;
}

function renderEmptyBoard(msg) {
  return `<div style="border:1.5px dashed var(--surface-border); padding:32px 16px; text-align:center; color:var(--text-secondary); font-size:11px; text-transform:uppercase; letter-spacing:1.5px; font-weight:700;">${msg}</div>`;
}

function renderStateSelector(cols) {
  return `
    <div style="display:flex; gap:2px; margin-right:20px; margin-bottom:20px;">
      ${['todo', 'in-progress', 'done'].map(id => {
        const isActive = id === activeTaskState;
        return `
          <button class="btn-state-tab tappable" data-state="${id}" style="flex:1; padding:14px 8px; background:${isActive ? 'var(--vis)' : 'var(--surface-1)'}; border:1px solid var(--surface-border); border-bottom:2px solid ${isActive ? 'var(--vi)' : 'transparent'}; color:${isActive ? 'var(--text-primary)' : 'var(--text-secondary)'}; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px;">
            <span style="text-transform:uppercase; font-weight:700;">${STATE_LABELS[id]}</span>
            <span style="font-size:16px; font-weight:800; font-variant-numeric: tabular-nums;">${cols[id].tasks.length}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderBoardContent(cols) {
  const activeCol = cols[activeTaskState];

  if (activeTaskState === 'todo') {
    const sorted = [...activeCol.tasks].sort(ordenUrgencia);
    if (sorted.length === 0) return renderEmptyBoard(EMPTY_MSG.todo);

    const urgentes = sorted.slice(0, 2);
    const cola = sorted.slice(2);
    return `
      <div style="margin-bottom:22px;">
        ${urgentes.map(renderUrgentTask).join('')}
      </div>
      <div>
        <h3 style="text-transform:uppercase; font-size:11px; letter-spacing:2px; color:var(--t5); font-weight:700; margin:0 0 10px 0;">Cola · Por Hacer</h3>
        ${cola.length > 0 ? cola.map(renderColaTask).join('') : renderEmptyBoard('SIN TAREAS EN COLA')}
      </div>
    `;
  }

  if (activeCol.tasks.length === 0) return renderEmptyBoard(EMPTY_MSG[activeTaskState]);
  return activeCol.tasks.map(renderStatusTask).join('');
}

export async function render() {
  const tasks = await db.getTasks();
  const recurringTasks = await db.getRecurringTasks();

  const cols = {
    'todo': { tasks: [] },
    'in-progress': { tasks: [] },
    'done': { tasks: [] }
  };
  tasks.forEach(t => {
    if (cols[t.status]) cols[t.status].tasks.push(t);
    else cols['todo'].tasks.push(t); // fallback
  });

  // Mapa de calor: días del mes con al menos una tarea completada.
  const now_ = new Date();
  const heatYear = now_.getFullYear();
  const heatMonth = now_.getMonth();
  const nombreMesActual = now_.toLocaleDateString('es-ES', { month: 'long' });
  const { countByDay, detailByDay } = await db.getActividadTareasPorDia(heatYear, heatMonth);
  const heatmapHtml = renderActivityHeatmap({
    id: 'tareas-heatmap',
    monthLabel: nombreMesActual,
    year: heatYear,
    month: heatMonth,
    countByDay,
    detailByDay,
    accentVar: 'var(--accent-purple)',
    emptyLabel: 'Sin tareas completadas'
  });

  return `
    <div style="padding: 20px 0 20px 20px; font-family: var(--font-body);">
      <!-- Header -->
      <div class="flex-between" style="padding-right: 20px; margin-bottom: 20px;">
        <h1 style="font-size: 30px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.5px;">Tareas</h1>
        <div class="icon-chip" style="width: 40px; height: 40px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
        </div>
      </div>

      ${tasks.length > 0 ? `
        <!-- Completadas vs. pendientes -->
        <div class="card" style="margin-right: 20px; margin-bottom: 20px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 56px; height: 56px; flex-shrink: 0; position: relative;">
            <canvas id="tasks-donut-chart" width="56" height="56"></canvas>
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${tasks.filter(t => t.status === 'done').length} de ${tasks.length} completadas</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${tasks.length - tasks.filter(t => t.status === 'done').length} pendientes</div>
          </div>
        </div>
      ` : ''}

      <!-- Mapa de actividad -->
      <div class="card" style="margin-right: 20px; margin-bottom: 24px; padding: 18px 20px;">
        <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Actividad de ${nombreMesActual}</h3>
        ${heatmapHtml}
      </div>

      <!-- Recurrentes -->
      ${renderRecurringTasksSection(recurringTasks)}

      <!-- Search -->
      <div style="margin-right: 20px; margin-bottom: 24px; position: relative;">
        <svg style="position: absolute; left: 16px; top: 13px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="task-search" placeholder="Buscar tareas, proyectos..." style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); padding: 13px 20px 13px 44px; color: var(--text-primary); font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease;" onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 4px rgba(139,124,246,0.18)';" onblur="this.style.borderColor='var(--surface-border)'; this.style.boxShadow='none';">
      </div>

      <!-- Tablero por estado -->
      ${renderStateSelector(cols)}
      <div style="margin-right: 20px; padding-bottom: 24px;">
        ${renderBoardContent(cols)}
      </div>

      <!-- Captura rápida -->
      <div class="list-row" style="margin-right: 20px; margin-bottom: 120px; display: flex; align-items: stretch; border: 1.5px solid var(--vib); overflow: hidden;">
        <input type="text" id="task-quick-add" placeholder="Nueva tarea rápida..." style="flex: 1; background: transparent; border: none; padding: 14px 16px; color: var(--text-primary); font-size: 14px; outline: none;">
        <button id="btn-quick-add" class="tappable" style="background: var(--vib); border: none; color: var(--text-primary); padding: 0 20px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      <!-- FAB (formulario completo: prioridad, fecha, subtareas). Sticky en
           vez de fixed: fixed lo ancla al borde de la ventana, así que en
           escritorio (contenido centrado en una columna angosta con
           sidebar) quedaba flotando lejos del contenido que opera. Sticky
           lo mantiene pegado al borde derecho de la MISMA columna. -->
      <div style="position: sticky; bottom: 100px; height: 0; z-index: 2000; display: flex; justify-content: flex-end; pointer-events: none;">
        <button id="btn-new-task" class="tappable" style="pointer-events: auto; margin-right: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-purple); color: #000; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px -6px rgba(139, 124, 246, 0.6); cursor: pointer;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      ${renderTaskForm()}
      ${renderRecurringTaskForm()}
    </div>
  `;
}

export function mountListeners() {
  const refresh = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  db.getTasks().then(renderTasksDonut);
  initActivityHeatmapListeners('tareas-heatmap', 'var(--accent-purple)');

  setupTaskForm(refresh);
  initRecurringTaskForm(db, refresh);
  attachRecurringTaskDeleteListeners(db, refresh);

  const btnNew = document.getElementById('btn-new-task');
  if (btnNew) btnNew.addEventListener('click', () => openTaskForm());

  const btnAddRecurringTask = document.getElementById('btn-add-recurring-task');
  if (btnAddRecurringTask) {
    btnAddRecurringTask.addEventListener('click', () => {
      document.getElementById('task-recurring-modal').openForm();
    });
  }

  // Selector de estado del tablero
  document.querySelectorAll('.btn-state-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTaskState = btn.getAttribute('data-state');
      refresh();
    });
  });

  // Captura rápida: crea la tarea directo en "Por Hacer", prioridad media.
  const quickInput = document.getElementById('task-quick-add');
  const quickAdd = async () => {
    const title = quickInput.value.trim();
    if (!title) return;
    await db.saveTask({ title, description: '', priority: 'medium', dueDate: '', project: '', status: 'todo', subtasks: [] });
    Toast('Tarea agregada', 'success');
    activeTaskState = 'todo';
    refresh();
  };
  const btnQuickAdd = document.getElementById('btn-quick-add');
  if (btnQuickAdd) btnQuickAdd.addEventListener('click', quickAdd);
  if (quickInput) quickInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') quickAdd(); });

  // Abrir detalle de tarea (edición completa, con bitácora)
  document.querySelectorAll('.btn-edit-task').forEach(el => {
    el.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const tasks = await db.getTasks();
      const task = tasks.find(t => t.id === id);
      if (task) openTaskForm(task);
    });
  });

  // Flecha de avance rápido en la tarjeta: mueve de estado sin abrir el
  // detalle. db.updateTaskStatus ya registra el evento correspondiente en
  // el log (tarea_actualizada / tarea_completada), igual que si el cambio
  // viniera de los chips del detalle — la bitácora queda completa. El
  // contador de ambas columnas se ajusta a mano para que se vea moverse
  // en el momento; el tablero recién se vuelve a pintar del todo cuando
  // termina la transición (la duración real la maneja el CSS de
  // .btn-advance-task / prefers-reduced-motion, acá solo esperamos el
  // tiempo que dura para no cortar la animación a la mitad).
  const bumpStateCount = (status, delta) => {
    const btn = document.querySelector(`.btn-state-tab[data-state="${status}"]`);
    const countEl = btn && btn.querySelector('span:last-child');
    if (countEl) countEl.textContent = String(Number(countEl.textContent) + delta);
  };
  document.querySelectorAll('.btn-advance-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const from = btn.getAttribute('data-from');
      const to = btn.getAttribute('data-to');
      const card = btn.closest('.task-card');

      bumpStateCount(from, -1);
      bumpStateCount(to, 1);
      if (card) {
        card.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateX(12px)';
        card.style.pointerEvents = 'none';
      }

      await db.updateTaskStatus(id, to);
      setTimeout(refresh, 220);
    });
  });

  // Search filter
  const searchInput = document.getElementById('task-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      document.querySelectorAll('.task-card').forEach(card => {
        const text = card.innerText.toLowerCase();
        if (text.includes(val)) card.style.display = 'block';
        else card.style.display = 'none';
      });
    });
  }
}
