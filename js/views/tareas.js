import { db } from '../core/db.js';
import { renderTaskForm, setupTaskForm, openTaskForm } from '../components/task-form.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { ensureChartJs, appPalette, baseChartOptions } from '../utils/charts.js';
import { renderActivityHeatmap, initActivityHeatmapListeners } from '../components/activity-heatmap.js';

let tasksDonutInstance = null;

const PRIORITY_COLORS = {
  high: { badge: 'badge--high', label: 'alta', strip: 'var(--state-high)' },
  medium: { badge: 'badge--medium', label: 'media', strip: 'var(--state-medium)' },
  low: { badge: 'badge--low', label: 'baja', strip: 'var(--state-low)' }
};

const COL_META = {
  'todo': {
    title: 'Por Hacer',
    color: 'var(--text-secondary)',
    emptyTitle: 'Arranca por acá',
    emptySubtitle: 'Anota lo primero que tengas que hacer hoy.',
    emptyIcon: `<svg width="26" height="26" fill="none" stroke="var(--text-secondary)" stroke-width="1.8" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>`,
    showAddButton: true
  },
  'in-progress': {
    title: 'En Progreso',
    color: 'var(--accent-blue)',
    emptyTitle: 'Nada en marcha todavía',
    emptySubtitle: 'Mové una tarea de "Por Hacer" cuando la empieces.',
    emptyIcon: `<svg width="26" height="26" fill="none" stroke="var(--accent-blue)" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>`
  },
  'done': {
    title: 'Completado',
    color: 'var(--state-success)',
    emptyTitle: 'Todavía sin checks',
    emptySubtitle: 'Cuando termines algo, va a aparecer acá.',
    emptyIcon: `<svg width="26" height="26" fill="none" stroke="var(--state-success)" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg>`
  }
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

export async function render() {
  const tasks = await db.getTasks();

  const cols = {
    'todo': { title: 'Por Hacer', tasks: [] },
    'in-progress': { title: 'En Progreso', tasks: [] },
    'done': { title: 'Completado', tasks: [] }
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
  const countByDay = {};
  const detailByDay = {};
  tasks.forEach(t => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    if (d.getFullYear() === heatYear && d.getMonth() === heatMonth) {
      const day = d.getDate();
      countByDay[day] = (countByDay[day] || 0) + 1;
      if (!detailByDay[day]) detailByDay[day] = [];
      detailByDay[day].push(t.title);
    }
  });
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

  const renderCard = (task) => {
    const p = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

    // Metadatos secundarios candidatos (fecha, subtareas, etiqueta/proyecto),
    // en orden de prioridad. Se muestran como máximo 2 por tarjeta para que
    // el título quede como el elemento visualmente dominante.
    const metaCandidates = [];
    if (task.dueDate) {
      metaCandidates.push(`<span style="display:flex; align-items:center; gap:4px;">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${formatDate(task.dueDate)}
      </span>`);
    }
    if (task.project) {
      metaCandidates.push(`<span style="display:flex; align-items:center; gap:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        ${task.project}
      </span>`);
    }
    if (task.subtasks && task.subtasks.length > 0) {
      const doneCount = task.subtasks.filter(s => s.done).length;
      metaCandidates.push(`<span style="display:flex; align-items:center; gap:4px;">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        ${doneCount}/${task.subtasks.length}
      </span>`);
    }
    const metaHtml = metaCandidates.slice(0, 2).join('');

    const isDone = task.status === 'done';
    const titleStyle = isDone ? 'text-decoration: line-through; color: var(--text-disabled);' : 'color: var(--text-primary);';

    const arrowSvg = (dir) => dir === 'left'
      ? `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`
      : `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

    let moveHtml = '';
    if (task.status === 'todo') {
      moveHtml = `<button class="btn-move tappable" data-id="${task.id}" data-to="in-progress" style="background:var(--surface-1); border:1px solid var(--surface-border); border-radius: 8px; color:var(--text-secondary); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">${arrowSvg('right')}</button>`;
    } else if (task.status === 'in-progress') {
      moveHtml = `
        <button class="btn-move tappable" data-id="${task.id}" data-to="todo" style="background:var(--surface-1); border:1px solid var(--surface-border); border-radius: 8px; color:var(--text-secondary); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">${arrowSvg('left')}</button>
        <button class="btn-move tappable" data-id="${task.id}" data-to="done" style="background:var(--surface-1); border:1px solid var(--surface-border); border-radius: 8px; color:var(--state-success); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">${arrowSvg('right')}</button>
      `;
    } else {
      moveHtml = `<button class="btn-move tappable" data-id="${task.id}" data-to="in-progress" style="background:var(--surface-1); border:1px solid var(--surface-border); border-radius: 8px; color:var(--text-secondary); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">${arrowSvg('left')}</button>`;
    }

    return `
      <div class="card task-card tappable" data-id="${task.id}" style="padding: 16px 16px 16px 20px; position: relative; overflow: hidden; margin-bottom: 12px; border-radius: 16px;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${p.strip};"></div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
          <h4 class="tappable btn-edit-task" data-id="${task.id}" style="font-size: 16px; font-weight: 800; margin: 0; ${titleStyle} flex: 1; cursor: pointer; line-height: 1.3; letter-spacing: -0.2px;">${task.title}</h4>
          <button class="btn-delete-task tappable" data-id="${task.id}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer; flex-shrink: 0; padding: 2px;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
          <span class="badge ${p.badge}">${p.label}</span>
          ${metaHtml ? `<div style="display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--text-secondary); font-weight: 600; min-width: 0;">${metaHtml}</div>` : ''}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--surface-border); padding-top: 10px;">
          ${moveHtml}
        </div>
      </div>
    `;
  };

  const renderCol = (id) => {
    const col = cols[id];
    const meta = COL_META[id];
    return `
      <div style="min-width: 270px; max-width: 300px; flex: 1;">
        <div class="flex-between" style="margin-bottom: 16px; padding: 0 2px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${meta.color}; flex-shrink: 0;"></span>
            <h3 style="font-size: 13px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.6px; margin: 0;">${meta.title}</h3>
          </div>
          <span style="background: var(--surface-2); color: var(--text-secondary); padding: 2px 9px; border-radius: 10px; font-size: 11px; font-weight: 700;">${col.tasks.length}</span>
        </div>
        <div>
          ${col.tasks.map(renderCard).join('')}
          ${col.tasks.length === 0 ? `
            <div style="border: 1.5px dashed var(--surface-border); border-radius: 16px; padding: 22px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px;">
              <div style="margin-bottom: 4px;">${meta.emptyIcon}</div>
              <div style="color: var(--text-secondary); font-size: 13px; font-weight: 700;">${meta.emptyTitle}</div>
              <div style="color: var(--text-disabled); font-size: 11px; line-height: 1.4;">${meta.emptySubtitle}</div>
              ${meta.showAddButton ? `
                <button class="btn-add-task-empty tappable" style="margin-top: 10px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Agregar tarea
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

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
        <div class="card" style="margin-right: 20px; margin-bottom: 20px; padding: 14px 16px; border-radius: 16px; display: flex; align-items: center; gap: 14px;">
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
      <div class="card" style="margin-right: 20px; margin-bottom: 24px; padding: 18px 20px; border-radius: 18px;">
        <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Actividad de ${nombreMesActual}</h3>
        ${heatmapHtml}
      </div>

      <!-- Search -->
      <div style="margin-right: 20px; margin-bottom: 24px; position: relative;">
        <svg style="position: absolute; left: 16px; top: 13px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="task-search" placeholder="Buscar tareas, proyectos..." style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 16px; padding: 13px 20px 13px 44px; color: var(--text-primary); font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease;" onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 4px rgba(139,124,246,0.18)';" onblur="this.style.borderColor='var(--surface-border)'; this.style.boxShadow='none';">
      </div>

      <!-- Kanban Board -->
      <div style="display: flex; gap: 16px; overflow-x: auto; padding-right: 20px; padding-bottom: 120px; scroll-snap-type: x mandatory;">
        ${renderCol('todo')}
        ${renderCol('in-progress')}
        ${renderCol('done')}
      </div>

      <!-- FAB -->
      <div style="position: fixed; bottom: 100px; right: 24px; z-index: 2000;">
        <button id="btn-new-task" class="tappable" style="width: 56px; height: 56px; border-radius: 50%; background: var(--accent-purple); color: #000; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px -6px rgba(139, 124, 246, 0.6); cursor: pointer;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      ${renderTaskForm()}
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

  const btnNew = document.getElementById('btn-new-task');
  if (btnNew) {
    btnNew.addEventListener('click', () => openTaskForm());
  }

  // Empty state "+ Agregar tarea" (columna Por Hacer)
  document.querySelectorAll('.btn-add-task-empty').forEach(btn => {
    btn.addEventListener('click', () => openTaskForm());
  });

  // Edit Task
  document.querySelectorAll('.btn-edit-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const tasks = await db.getTasks();
      const task = tasks.find(t => t.id === id);
      if (task) openTaskForm(task);
    });
  });

  // Delete Task
  document.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const confirmed = await ConfirmDialog("¿Eliminar tarea?", "Esta acción no se puede deshacer.");
      if (confirmed) {
        await db.deleteTask(id);
        Toast("Tarea eliminada", "success");
        refresh();
      }
    });
  });

  // Move Task
  document.querySelectorAll('.btn-move').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const to = e.currentTarget.getAttribute('data-to');
      await db.updateTaskStatus(id, to);
      refresh();
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
