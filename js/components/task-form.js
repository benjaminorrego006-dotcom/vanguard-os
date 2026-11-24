// js/components/task-form.js
// Hoja de tarea (Órbita, Fase 7): crear una tarea nueva o editar una que ya
// existe. Se monta en Plan › Tareas, Plan › Semana y Hoy. En una tarea que
// ya existe, los chips de estado se aplican al tocarlos (con su evento en el
// log), y la hoja muestra el Foco y la bitácora. Al cerrarla de cualquier
// forma (Cancelar, ✕, atrás, tocar fuera) la vista de atrás se repinta si
// hubo un cambio de estado.
import { db } from '../core/db.js';
import { esperarSalidaDeModal } from '../core/history.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { iniciarFoco, focoEnCurso, MIN_FOCO } from './foco.js';
import { formatFechaHora, diaKeyDe, fechaLocalDe, formatFechaCorta } from '../utils/fecha.js';
import { formatNumero } from '../utils/numero.js';
import { oHoja, oIcono, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';

const ID = 'task-modal';

export const ESTADOS = [
  { value: 'todo', label: 'Por hacer' },
  { value: 'in-progress', label: 'En curso' },
  { value: 'done', label: 'Hecho' }
];
export const PRIORIDADES = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' }
];
// Dificultad (docs/PLAN-DIFICULTAD-FOCO.md, F1): sin elegir = sin campo (al
// calcular se lee como 'media'); una tarea sin el campo abre con «Media»
// sugerida (borde punteado) y no guarda nada si no se toca.
const DIFICULTADES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Media' },
  { value: 'dificil', label: 'Difícil' }
];

const EVENT_LABELS = {
  tarea_creada: 'Tarea creada',
  tarea_actualizada: 'Tarea actualizada',
  tarea_completada: 'Marcada como hecha',
  tarea_eliminada: 'Tarea eliminada'
};
// foco_completado: «Foco · N min» con los minutos del evento.
const minutosDe = (ev) => (Number(ev.payload && ev.payload.minutos) > 0 ? Number(ev.payload.minutos) : MIN_FOCO);
const etiquetaEvento = (ev) => (ev.tipo === 'foco_completado' ? `Foco · ${minutosDe(ev)} min` : EVENT_LABELS[ev.tipo] || ev.tipo);

// «Vence hoy» / «Venció el 20 nov.» (alerta real: lleva ícono y texto) o
// «Vence el 30 nov.». null sin fecha o si la tarea está hecha.
export function avisoVencimiento(dueDate, status) {
  if (!dueDate || status === 'done') return null;
  const hoy = diaKeyDe(new Date());
  const fecha = formatFechaCorta(fechaLocalDe(dueDate));
  if (dueDate === hoy) return { texto: 'Vence hoy', alerta: true };
  if (dueDate < hoy) return { texto: `Venció el ${fecha}`, alerta: true };
  return { texto: `Vence el ${fecha}`, alerta: false };
}

// Bitácora: se deriva en vivo del log de eventos (nunca un campo guardado
// aparte), ver db.getBitacoraEntidad. La más reciente arriba.
export function renderBitacora(eventos) {
  if (!eventos.length) return '<p class="o-tarea-nada">Sin actividad registrada.</p>';
  const ordenados = [...eventos].sort((a, b) => b.ts - a.ts);
  return `<ol class="o-bitacora">${ordenados.map(ev => `
    <li class="o-bitacora-item">
      <b>${escapeHtml(etiquetaEvento(ev))}</b>
      <span class="o-num">${escapeHtml(formatFechaHora(new Date(ev.ts)))}</span>
    </li>`).join('')}</ol>`;
}

// «2 focos · 50 min», o '' si la tarea no tiene focos.
export function resumenFocos(eventos) {
  const focos = eventos.filter(e => e.tipo === 'foco_completado');
  if (!focos.length) return '';
  const minutos = focos.reduce((s, e) => s + minutosDe(e), 0);
  return `<span class="o-num">${formatNumero(focos.length)}</span> ${focos.length === 1 ? 'foco' : 'focos'} · <span class="o-num">${formatNumero(minutos)}</span> min`;
}

// Texto del botón de foco: con un foco en curso (de esta u otra tarea) lo
// abre en vez de empezar otro.
export function textoBotonFoco(tareaId) {
  const actual = focoEnCurso();
  return !actual ? `Foco ${MIN_FOCO} min` : actual.tareaId === tareaId ? 'Volver al foco' : 'Ver foco en curso';
}

const opcion = (clase, attr, o) => `<button type="button" class="o-chip ${clase}" ${attr}="${o.value}" aria-pressed="false">${o.label}</button>`;

export function renderTaskForm() {
  const cuerpo = `
    <form id="task-form" class="o-tarea-form" onsubmit="return false;" novalidate>
      <div class="o-campo">
        <label for="task-title">Título</label>
        <input type="text" id="task-title" class="o-input" placeholder="Ej.: Terminar el informe" maxlength="140" autocomplete="off" enterkeyhint="done">
      </div>

      <div class="o-campo">
        <span class="o-campo-etiqueta" id="task-estado-etq">Estado</span>
        <div class="o-tarea-opciones" role="group" aria-labelledby="task-estado-etq">
          ${ESTADOS.map(s => opcion('btn-state-chip', 'data-status', s)).join('')}
        </div>
      </div>

      <div id="task-foco-bloque" class="o-tarea-foco" hidden>
        <p id="task-focos" class="o-tarea-focos" hidden></p>
        <button type="button" id="btn-task-foco" class="o-btn o-btn--secundario o-btn--bloque">Foco ${MIN_FOCO} min</button>
      </div>

      <div class="o-campo">
        <label for="task-due-date">Fecha límite</label>
        <input type="date" id="task-due-date" class="o-input">
        <p id="task-due-aviso" class="o-campo-error" hidden></p>
      </div>

      <div class="o-campo">
        <span class="o-campo-etiqueta" id="task-prio-etq">Prioridad</span>
        <div class="o-tarea-opciones" role="group" aria-labelledby="task-prio-etq">
          ${PRIORIDADES.map(p => opcion('btn-priority-chip', 'data-priority', p)).join('')}
        </div>
      </div>

      <div class="o-campo">
        <span class="o-campo-etiqueta" id="task-dificultad-etq">Dificultad</span>
        <div class="o-tarea-opciones" role="group" aria-labelledby="task-dificultad-etq">
          ${DIFICULTADES.map(d => opcion('btn-dificultad-chip', 'data-dificultad', d)).join('')}
        </div>
      </div>

      <div class="o-campo">
        <label for="task-desc">Notas</label>
        <textarea id="task-desc" class="o-input" rows="3" placeholder="Detalles, contexto, enlaces…"></textarea>
      </div>

      <div class="o-campo">
        <label for="task-project">Proyecto o etiqueta</label>
        <input type="text" id="task-project" class="o-input" placeholder="Ej.: Lanzamiento" maxlength="60" autocomplete="off">
      </div>

      <div class="o-campo">
        <span class="o-campo-etiqueta">Subtareas</span>
        <ul id="subtasks-container" class="o-tarea-subs"></ul>
        <button type="button" id="btn-add-subtask" class="o-btn o-btn--fantasma o-btn--bloque">Agregar subtarea</button>
      </div>

      <section id="bitacora-section" class="o-campo" hidden>
        <span class="o-campo-etiqueta">Bitácora</span>
        <div id="task-bitacora"></div>
      </section>

      <!-- Ocultos al final: abrirHoja enfoca el primer control del cuerpo. -->
      <input type="hidden" id="task-id">
      <input type="hidden" id="task-status-pending" value="todo">
      <input type="hidden" id="task-priority" value="medium">
      <input type="hidden" id="task-dificultad" value="">
      <button type="button" id="btn-delete-task-modal" class="o-btn o-btn--secundario o-btn--bloque o-tarea-eliminar" hidden>Eliminar tarea</button>
    </form>`;
  return oHoja({
    id: ID, modulo: 'plan', titulo: 'Nueva tarea', cuerpo,
    pie: '<button type="button" id="btn-cancel-task" class="o-btn o-btn--secundario" data-hoja-cerrar>Cancelar</button><button type="submit" form="task-form" id="btn-save-task" class="o-btn o-btn--primario">Guardar</button>'
  });
}

// --- Partes de la hoja ------------------------------------------------------
const $ = (id) => document.getElementById(id);

function filaSubtarea({ title = '', done = false } = {}) {
  const li = document.createElement('li');
  li.className = 'o-tarea-sub';
  li.innerHTML = `
    <button type="button" class="o-check subtask-check" aria-pressed="${done}" aria-label="Subtarea hecha">${oIcono('check')}</button>
    <input type="text" class="o-input subtask-title" placeholder="Subtarea…" maxlength="120" autocomplete="off" aria-label="Subtarea">
    <button type="button" class="o-btn o-btn--fantasma o-btn--icono btn-remove-sub" aria-label="Quitar subtarea">${oIcono('cerrar')}</button>`;
  li.querySelector('.subtask-title').value = title;
  li.querySelector('.subtask-check').addEventListener('click', (e) => {
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  });
  li.querySelector('.btn-remove-sub').addEventListener('click', () => li.remove());
  return li;
}

function marcarOpciones(selector, attr, valor, sugerido = null) {
  document.querySelectorAll(`#${ID} ${selector}`).forEach(b => {
    const v = b.getAttribute(attr);
    b.setAttribute('aria-pressed', String(v === valor));
    b.classList.toggle('o-tarea-sugerida', !valor && v === sugerido);
  });
}

function pintarAviso() {
  const aviso = $('task-due-aviso');
  if (!aviso) return;
  const a = avisoVencimiento($('task-due-date').value, $('task-status-pending').value);
  aviso.hidden = !a || !a.alerta;
  aviso.innerHTML = a && a.alerta ? `${oIcono('alerta')}<span>${escapeHtml(a.texto)}</span>` : '';
}

function syncFocoBtn() {
  const btn = $('btn-task-foco');
  if (!btn) return;
  const id = $('task-id').value;
  $('task-foco-bloque').hidden = !id || $('task-status-pending').value === 'done';
  btn.textContent = textoBotonFoco(id);
}
window.addEventListener('vg-foco-cambio', syncFocoBtn);

// Bitácora y «N focos · X min», de una sola lectura del log de la tarea.
async function refreshBitacoraSection(taskId) {
  const eventos = await db.getBitacoraEntidad(taskId);
  if ($('task-id')?.value !== taskId) return; // se abrió otra mientras se leía
  const el = $('task-bitacora');
  if (el) el.innerHTML = renderBitacora(eventos);
  const resumen = $('task-focos');
  if (resumen) {
    const r = resumenFocos(eventos);
    resumen.hidden = !r;
    resumen.innerHTML = r;
  }
}

// Al cerrarse la pantalla de foco con esta hoja abierta debajo, se ponen al
// día la bitácora y los focos sin reabrirla.
window.addEventListener('vg-foco-cerrado', (e) => {
  const id = e.detail && e.detail.tareaId;
  if (id && document.querySelector(`#${ID}.open`) && $('task-id')?.value === id) refreshBitacoraSection(id);
});

// onSave: repinta la vista de atrás. Se llama al guardar, al eliminar y al
// cerrar la hoja después de cambiar el estado de una tarea existente.
export function setupTaskForm(onSave) {
  const overlay = $(ID);
  if (!overlay) return;
  montarHoja(ID);
  let estadoCambiado = false;
  let guardando = false;
  const avisar = async () => {
    await esperarSalidaDeModal(ID);
    if (onSave) onSave();
  };

  // Cerrar sin guardar (Cancelar, ✕, atrás, fondo): si un chip de estado ya
  // movió la tarea, la vista de atrás se pone al día.
  new MutationObserver(() => {
    if (overlay.classList.contains('open') || guardando) return;
    if (estadoCambiado) { estadoCambiado = false; avisar(); }
  }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  overlay.addEventListener('vg-hoja-abierta', () => { estadoCambiado = false; guardando = false; });

  $('btn-add-subtask').addEventListener('click', () => {
    const li = filaSubtarea();
    $('subtasks-container').appendChild(li);
    li.querySelector('.subtask-title').focus();
  });
  $('task-due-date').addEventListener('change', pintarAviso);

  // Foco: la pantalla se abre encima de la hoja (al terminar la pausa se
  // vuelve a ella). Desde otro lado, `alVolver` abre esta tarea.
  $('btn-task-foco').addEventListener('click', () => {
    const id = $('task-id').value;
    if (id) iniciarFoco({ id, title: $('task-title').value.trim() }, { alVolver: abrirDetallePorId });
  });

  document.querySelectorAll(`#${ID} .btn-priority-chip`).forEach(b => b.addEventListener('click', () => {
    $('task-priority').value = b.getAttribute('data-priority');
    marcarOpciones('.btn-priority-chip', 'data-priority', $('task-priority').value);
  }));
  document.querySelectorAll(`#${ID} .btn-dificultad-chip`).forEach(b => b.addEventListener('click', () => {
    $('task-dificultad').value = b.getAttribute('data-dificultad');
    marcarOpciones('.btn-dificultad-chip', 'data-dificultad', $('task-dificultad').value);
  }));

  // Estado: en una tarea existente se aplica al tocarlo y la bitácora se
  // refresca en vivo; en una nueva queda pendiente hasta guardar.
  document.querySelectorAll(`#${ID} .btn-state-chip`).forEach(b => b.addEventListener('click', async () => {
    const status = b.getAttribute('data-status');
    $('task-status-pending').value = status;
    marcarOpciones('.btn-state-chip', 'data-status', status);
    syncFocoBtn();
    pintarAviso();
    const taskId = $('task-id').value;
    if (!taskId) return;
    await db.updateTaskStatus(taskId, status);
    estadoCambiado = true;
    await refreshBitacoraSection(taskId);
  }));

  $('task-form').addEventListener('submit', async () => {
    const title = $('task-title').value.trim();
    if (!title) { $('task-title').focus(); return Toast('Escribe un título', 'warning'); }
    const subtasks = [...$('subtasks-container').children].map(li => ({
      title: li.querySelector('.subtask-title').value.trim(),
      done: li.querySelector('.subtask-check').getAttribute('aria-pressed') === 'true'
    })).filter(s => s.title !== '');
    const dificultad = $('task-dificultad').value;
    guardando = true;
    await db.saveTask({
      id: $('task-id').value || null,
      title,
      description: $('task-desc').value.trim(),
      priority: $('task-priority').value,
      dueDate: $('task-due-date').value,
      project: $('task-project').value.trim(),
      status: $('task-status-pending').value,
      subtasks,
      // Solo si se eligió: sin tocar, la tarea queda sin el campo.
      ...(dificultad ? { dificultad } : {})
    });
    Toast('Tarea guardada', 'success');
    estadoCambiado = false;
    await cerrarHoja(ID);
    guardando = false;
    avisar();
  });

  $('btn-delete-task-modal').addEventListener('click', async () => {
    const id = $('task-id').value;
    if (!id) return;
    const title = $('task-title').value.trim();
    const n = $('subtasks-container').children.length;
    const ok = await ConfirmDialog(
      `Eliminar tarea${title ? ' ' + title : ''}`,
      n > 0 ? `Se perderán sus ${n} ${n === 1 ? 'subtarea' : 'subtareas'}. No se puede deshacer.` : 'No se puede deshacer.',
      { verb: 'Eliminar' }
    );
    if (!ok) return;
    guardando = true;
    await db.deleteTask(id);
    Toast('Tarea eliminada', 'success');
    estadoCambiado = false;
    await cerrarHoja(ID);
    guardando = false;
    avisar();
  });
}

// Abre la hoja de una tarea por id (fin de la pausa de un foco abierto desde
// Semana u Hoy). Sin la hoja montada en la vista, no hace nada.
export async function abrirDetallePorId(id) {
  if (!$(ID)) return;
  const task = (await db.getTasks()).find(t => t.id === id);
  if (task) openTaskForm(task);
}

export function openTaskForm(task = null) {
  if (!$(ID)) return;
  const sub = $('subtasks-container');
  sub.innerHTML = '';
  $('task-focos').hidden = true;
  $('task-focos').innerHTML = '';
  $(`${ID}-titulo`).textContent = task ? 'Editar tarea' : 'Nueva tarea';
  $('task-id').value = task ? task.id : '';
  $('task-title').value = task ? task.title || '' : '';
  $('task-desc').value = task ? task.description || '' : '';
  $('task-priority').value = (task && task.priority) || 'medium';
  $('task-due-date').value = (task && task.dueDate) || '';
  $('task-project').value = (task && task.project) || '';
  $('task-status-pending').value = (task && task.status) || 'todo';
  $('task-dificultad').value = task && ['facil', 'media', 'dificil'].includes(task.dificultad) ? task.dificultad : '';
  (task && task.subtasks || []).forEach(s => sub.appendChild(filaSubtarea(s)));
  $('bitacora-section').hidden = !task;
  $('btn-delete-task-modal').hidden = !task;
  if (task) {
    $('task-bitacora').innerHTML = '<p class="o-tarea-nada">Cargando…</p>';
    refreshBitacoraSection(task.id);
  }
  marcarOpciones('.btn-state-chip', 'data-status', $('task-status-pending').value);
  marcarOpciones('.btn-priority-chip', 'data-priority', $('task-priority').value);
  marcarOpciones('.btn-dificultad-chip', 'data-dificultad', $('task-dificultad').value, 'media');
  syncFocoBtn();
  pintarAviso();
  $(ID).dispatchEvent(new CustomEvent('vg-hoja-abierta'));
  abrirHoja(ID);
}
