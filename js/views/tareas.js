// js/views/tareas.js
// Plan (Órbita, Fase 7): pestañas Tareas · Semana · Notas. La sub-vista
// activa sale del hash (#tareas, #tareas/semana, #tareas/notas), así que
// recargar o compartir el enlace cae en la misma. Semana monta el
// planificador (views/planificador.js) en #plan-host y Notas monta
// Anotaciones (views/anotaciones.js) en #notas-host.
//
// Tareas usa el layout lista + detalle (components/lista-detalle.js): en
// celular el detalle de una tarea es sub-pantalla (el atrás vuelve a la
// lista); desde 1024 px va a la derecha y abrirlo o cerrarlo no toca el
// historial. La hoja de tarea (components/task-form.js) crea y edita.
import { db } from '../core/db.js';
import { renderTaskForm, setupTaskForm, openTaskForm, ESTADOS, PRIORIDADES, avisoVencimiento, renderBitacora, resumenFocos, textoBotonFoco } from '../components/task-form.js';
import { iniciarFoco } from '../components/foco.js';
import { Toast, ConfirmDialog, hayModalAbierto } from '../utils/states.js';
import { renderActivityHeatmap, initActivityHeatmapListeners } from '../components/activity-heatmap.js';
import { escapeHtml } from '../utils/escape.js';
import { formatMes } from '../utils/fecha.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';
import { etiquetaDificultad } from '../utils/dificultad.js';
import { oIcono, oVacio } from '../components/orbita.js';
import { oListaDetalle, oListaDetalleCab, crearListaDetalle } from '../components/lista-detalle.js';
import * as Planificador from './planificador.js';
import * as Anotaciones from './anotaciones.js';
import { guardiaVista } from '../core/vista-activa.js';

// Guardia de la navegación con que se montó esta vista (core/vista-activa.js):
// un repintado que termina después de cambiar de vista no escribe encima.
let vistaVigente = () => true;

const ICO_MAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
const ICO_VOLVER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>';
const ICO_BUSCAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.2" y2="16.2"></line></svg>';
const ICO_EMPEZAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"></path></svg>';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// --- Sub-vistas de Plan -----------------------------------------------------
let subActual = 'lista';
const SUBRUTAS = { lista: '#tareas', semana: '#tareas/semana', notas: '#tareas/notas' };
const PESTANAS = [{ id: 'lista', label: 'Tareas' }, { id: 'semana', label: 'Semana' }, { id: 'notas', label: 'Notas' }];

function subDeHash() {
  const sub = (location.hash || '').replace(/^#/, '').split('/')[1];
  return sub === 'semana' || sub === 'notas' ? sub : 'lista';
}

// Estado del tablero: la columna activa y la búsqueda viven en el módulo
// para sobrevivir a los repintados (marcar, crear).
let activeTaskState = 'todo';
let busqueda = '';

// Detalle de una tarea (layout lista + detalle).
const ld = crearListaDetalle({ clave: 'tareaDetalle', alCambiar: () => repintar() });

const EMPTY_MSG = {
  'todo': { titulo: 'Sin tareas pendientes', texto: 'Agrega una con el botón + o con la línea de arriba.' },
  'in-progress': { titulo: 'Nada en curso', texto: 'Empieza una desde «Por hacer» para verla aquí.' },
  'done': { titulo: 'Sin tareas hechas', texto: 'Las que termines aparecen aquí.' }
};
const ETQ_ESTADO = Object.fromEntries(ESTADOS.map(s => [s.value, s.label]));
const ETQ_PRIORIDAD = Object.fromEntries(PRIORIDADES.map(p => [p.value, p.label]));
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// Con fecha antes que sin fecha; entre las que tienen fecha, la más
// próxima primero; a igualdad de fecha, la de mayor prioridad primero.
function ordenUrgencia(a, b) {
  const aTiene = !!a.dueDate, bTiene = !!b.dueDate;
  if (aTiene !== bTiene) return aTiene ? -1 : 1;
  if (aTiene && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
}

// --- Fila de una tarea --------------------------------------------------------
// La fila abre el detalle; a la derecha, el paso siguiente: «Empezar» (Por
// hacer → En curso) o el check (En curso → Hecho).
function partesMeta(t) {
  const partes = [];
  const venc = avisoVencimiento(t.dueDate, t.status);
  if (venc) partes.push(venc.alerta ? `<span class="o-tarea-venc">${oIcono('alerta')}${escapeHtml(venc.texto)}</span>` : escapeHtml(venc.texto));
  if (t.priority === 'high' || t.priority === 'low') partes.push(`Prioridad ${ETQ_PRIORIDAD[t.priority].toLowerCase()}`);
  if (t.dificultad === 'facil' || t.dificultad === 'dificil') partes.push(etiquetaDificultad(t));
  if (t.project) partes.push(escapeHtml(t.project));
  const subs = t.subtasks || [];
  if (subs.length) partes.push(`<span class="o-num">${subs.filter(s => s.done).length}/${subs.length}</span>`);
  return partes;
}
const textoPlano = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function renderFila(t) {
  const titulo = escapeHtml(t.title);
  const hecha = t.status === 'done';
  const actual = ld.id === t.id;
  const meta = partesMeta(t);
  let paso = '';
  if (t.status === 'todo') {
    paso = `<button type="button" class="o-btn o-btn--fantasma o-btn--icono btn-advance-task" data-id="${escapeHtml(t.id)}" data-from="todo" data-to="in-progress" aria-label="Empezar «${titulo}» (pasa a En curso)">${ICO_EMPEZAR}</button>`;
  } else if (t.status === 'in-progress') {
    paso = `<button type="button" class="o-check btn-advance-task" data-id="${escapeHtml(t.id)}" data-from="in-progress" data-to="done" aria-pressed="false" aria-label="Marcar «${titulo}» como hecha">${oIcono('check')}</button>`;
  }
  return `
    <li class="o-fila o-tarea-fila${hecha ? ' o-fila--hecha' : ''}${actual ? ' o-fila--actual' : ''}" data-id="${escapeHtml(t.id)}" data-buscar="${escapeHtml(`${t.title} ${t.project || ''} ${t.description || ''}`.toLowerCase())}">
      <button type="button" class="o-tarea-abrir btn-edit-task" data-id="${escapeHtml(t.id)}"${actual ? ' aria-current="true"' : ''} aria-label="${titulo}${meta.length ? `: ${escapeHtml(textoPlano(meta.join(', ')))}` : ''}. Ver detalle">
        <span class="o-fila-texto"><b>${titulo}</b>${meta.length ? `<small>${meta.join('<span aria-hidden="true"> · </span>')}</small>` : ''}</span>
      </button>
      ${paso ? `<span class="o-tarea-paso">${paso}</span>` : ''}
    </li>`;
}

function renderTablero(cols) {
  const tareas = cols[activeTaskState];
  if (!tareas.length) {
    const m = EMPTY_MSG[activeTaskState];
    return `<div class="o-card">${oVacio({ icono: 'check', titulo: m.titulo, texto: m.texto })}</div>`;
  }
  if (activeTaskState !== 'todo') return `<ul class="o-lista o-tarea-lista" aria-label="${ETQ_ESTADO[activeTaskState]}">${tareas.map(renderFila).join('')}</ul>`;
  // Por hacer: las dos más urgentes arriba y el resto en cola.
  const orden = [...tareas].sort(ordenUrgencia);
  const primero = orden.slice(0, 2);
  const cola = orden.slice(2);
  return `
    <section class="o-tarea-grupo" aria-labelledby="tar-primero">
      <h2 class="o-rotulo" id="tar-primero">Lo primero</h2>
      <ul class="o-lista o-tarea-lista">${primero.map(renderFila).join('')}</ul>
    </section>
    ${cola.length ? `
    <section class="o-tarea-grupo" aria-labelledby="tar-cola">
      <h2 class="o-rotulo" id="tar-cola">En cola · <span class="o-num">${cola.length}</span></h2>
      <ul class="o-lista o-tarea-lista">${cola.map(renderFila).join('')}</ul>
    </section>` : ''}`;
}

// --- Detalle de una tarea -----------------------------------------------------
// El mismo contenido en la sub-pantalla (celular) y en la columna derecha
// (PC); solo cambia la cabecera. Editar abre la hoja.
async function cuerpoDetalle(t) {
  const eventos = await db.getBitacoraEntidad(t.id);
  const titulo = escapeHtml(t.title);
  const venc = avisoVencimiento(t.dueDate, t.status);
  const chips = [];
  if (t.dueDate) {
    chips.push(venc && venc.alerta
      ? `<li class="o-chip o-tarea-chip-alerta">${oIcono('alerta')}${escapeHtml(venc.texto)}</li>`
      : `<li class="o-chip">${escapeHtml(venc ? venc.texto : 'Con fecha')}</li>`);
  }
  chips.push(`<li class="o-chip">Prioridad ${ETQ_PRIORIDAD[t.priority || 'medium'].toLowerCase()}</li>`);
  if (t.dificultad === 'facil' || t.dificultad === 'dificil') chips.push(`<li class="o-chip">${etiquetaDificultad(t)}</li>`);
  if (t.project) chips.push(`<li class="o-chip">${escapeHtml(t.project)}</li>`);
  const subs = t.subtasks || [];
  const focos = resumenFocos(eventos);
  return `
    <div class="o-tarea-det">
      <div class="o-tarea-opciones" role="group" aria-label="Estado de la tarea">
        ${ESTADOS.map(s => `<button type="button" class="o-chip o-tarea-det-estado" data-status="${s.value}" aria-pressed="${(t.status || 'todo') === s.value}">${s.label}</button>`).join('')}
      </div>
      <ul class="o-chips o-tarea-chips" aria-label="Datos de la tarea">${chips.join('')}</ul>
      ${t.status !== 'done' || focos ? `
      <div class="o-card o-card--destacada o-tarea-foco-card">
        <p class="o-tarea-focos">${focos || 'Sin focos todavía.'}</p>
        ${t.status !== 'done' ? `<button type="button" id="btn-foco-tarea" class="o-btn o-btn--secundario">${textoBotonFoco(t.id)}</button>` : ''}
      </div>` : ''}
      ${t.description ? `
      <section class="o-tarea-seccion" aria-labelledby="tar-det-notas">
        <h3 class="o-rotulo" id="tar-det-notas">Notas</h3>
        <p class="o-tarea-notas">${escapeHtml(t.description)}</p>
      </section>` : ''}
      ${subs.length ? `
      <section class="o-tarea-seccion" aria-labelledby="tar-det-subs">
        <h3 class="o-rotulo" id="tar-det-subs">Subtareas · <span class="o-num">${subs.filter(s => s.done).length}/${subs.length}</span></h3>
        <ul class="o-tarea-subs">${subs.map((s, i) => `
          <li class="o-tarea-sub${s.done ? ' o-tarea-sub--hecha' : ''}">
            <button type="button" class="o-check o-tarea-det-sub" data-i="${i}" aria-pressed="${!!s.done}" aria-label="${s.done ? 'Desmarcar' : 'Marcar'} la subtarea «${escapeHtml(s.title)}»">${oIcono('check')}</button>
            <span>${escapeHtml(s.title)}</span>
          </li>`).join('')}
        </ul>
      </section>` : ''}
      <section class="o-tarea-seccion" aria-labelledby="tar-det-bitacora">
        <h3 class="o-rotulo" id="tar-det-bitacora">Bitácora</h3>
        ${renderBitacora(eventos)}
      </section>
      <div class="o-tarea-acciones">
        <button type="button" id="btn-editar-tarea" class="o-btn o-btn--secundario" aria-label="Editar «${titulo}»">Editar</button>
        <button type="button" id="btn-eliminar-tarea" class="o-btn o-btn--secundario o-tarea-eliminar" aria-label="Eliminar «${titulo}»">Eliminar</button>
      </div>
    </div>`;
}

// Sub-pantalla (celular): ocupa toda la vista, con «Volver».
async function renderDetalle(t) {
  return `
    <div class="o-vista o-plan o-mod-plan tareas-host">
      <header class="o-plan-det-cab">
        <button type="button" id="btn-volver-tarea" class="o-btn o-btn--secundario o-btn--icono" aria-label="Volver a Tareas">${ICO_VOLVER}</button>
        <h1 class="o-mod-titulo">${escapeHtml(t.title)}</h1>
      </header>
      ${await cuerpoDetalle(t)}
      ${renderTaskForm()}
    </div>`;
}

// --- Lista (con el detalle a la derecha en PC) --------------------------------
async function renderLista(tasks) {
  const cols = { 'todo': [], 'in-progress': [], 'done': [] };
  tasks.forEach(t => (cols[t.status] || cols.todo).push(t));

  // Mapa de calor: días del mes con al menos una tarea completada.
  const ahora = new Date();
  const mes = formatMes(ahora);
  const { countByDay, detailByDay } = await db.getActividadTareasPorDia(ahora.getFullYear(), ahora.getMonth());
  const mapa = renderActivityHeatmap({
    id: 'tareas-heatmap', monthLabel: mes, year: ahora.getFullYear(), month: ahora.getMonth(),
    countByDay, detailByDay, accentVar: 'var(--o-mod)', emptyLabel: 'Sin tareas completadas'
  });

  const lista = `
    <div class="o-plan-col">
      <div class="o-plan-buscar">
        ${ICO_BUSCAR}
        <input type="search" id="task-search" class="o-input" placeholder="Buscar tareas o proyectos" aria-label="Buscar tareas" value="${escapeHtml(busqueda)}" autocomplete="off">
      </div>
      <div class="o-tabs o-tarea-estados" role="tablist" aria-label="Tareas por estado">
        ${ESTADOS.map(s => `<button type="button" role="tab" class="o-tab btn-state-tab" data-state="${s.value}" id="tar-estado-${s.value}" aria-selected="${s.value === activeTaskState}" aria-controls="tar-tablero" tabindex="${s.value === activeTaskState ? 0 : -1}">${s.label}<span class="o-num o-tarea-cuenta">${cols[s.value].length}</span></button>`).join('')}
      </div>
      <form id="task-quick-add-form" class="o-plan-agregar" onsubmit="return false;">
        <input type="text" id="task-quick-add" class="o-input" placeholder="Agregar una tarea rápida…" aria-label="Nueva tarea rápida" enterkeyhint="go" autocomplete="off" maxlength="140">
        <button type="submit" id="btn-quick-add" class="o-btn o-btn--secundario o-btn--icono" aria-label="Agregar a Por hacer">${ICO_MAS}</button>
      </form>
      <div id="tar-tablero" class="o-tarea-tablero" role="tabpanel" aria-labelledby="tar-estado-${activeTaskState}">
        ${renderTablero(cols)}
        <p id="tar-sin-resultados" class="o-tarea-nada" hidden>Ninguna tarea coincide con la búsqueda.</p>
      </div>
      <section id="tareas-calendar-card" class="o-card o-tarea-mapa" aria-labelledby="tar-mapa-titulo">
        <h2 class="o-rotulo" id="tar-mapa-titulo">Actividad de ${escapeHtml(mes)}</h2>
        ${mapa}
      </section>
    </div>`;

  let detalle = '';
  if (ld.abierto) {
    const t = tasks.find(x => x.id === ld.id);
    if (t) detalle = `<div class="o-card">${oListaDetalleCab({ titulo: t.title, cerrarId: 'btn-cerrar-tarea', cerrarEtiqueta: `Cerrar el detalle de ${t.title}` })}${await cuerpoDetalle(t)}</div>`;
    else ld.olvidar();
  }
  return oListaDetalle({
    id: 'tar-ld', lista, detalle, abierto: !!detalle, etiqueta: 'Detalle de la tarea',
    vacio: `<div class="o-card o-ld-vacio">${oVacio({ icono: 'info', titulo: 'Elige una tarea', texto: 'Su estado, sus subtareas, el foco y la bitácora aparecen aquí.' })}</div>`
  });
}

export async function render() {
  subActual = subDeHash();
  const tasks = await db.getTasks();
  if (subActual === 'lista' && ld.subpantalla) {
    const t = tasks.find(x => x.id === ld.id);
    if (t) return renderDetalle(t);
    ld.descartar(); // borrada (desde la hoja o en otro dispositivo)
  }
  const pendientes = tasks.filter(t => t.status !== 'done').length;
  const inner = subActual === 'semana'
    ? `<div id="plan-host">${await Planificador.render()}</div>`
    : subActual === 'notas'
      ? `<div id="notas-host" class="o-mod-notas">${await Anotaciones.render()}</div>`
      : await renderLista(tasks);
  return `
    <div class="o-vista o-plan o-mod-plan tareas-host">
      <header class="o-mod-cab">
        <div>
          <h1 class="o-mod-titulo">Plan</h1>
          <p class="o-mod-sub">${pendientes ? `${plural(pendientes, 'tarea pendiente', 'tareas pendientes')}` : 'Sin tareas pendientes'}</p>
        </div>
        ${subActual === 'lista' ? `<button type="button" id="btn-new-task" class="o-btn o-btn--primario o-btn--icono" aria-label="Nueva tarea">${ICO_MAS}</button>` : ''}
      </header>
      <div class="o-tabs tareas-subtabs" role="tablist" aria-label="Secciones de Plan">
        ${PESTANAS.map(p => `<button type="button" role="tab" class="o-tab tareas-subtab" data-sub="${p.id}" id="plan-tab-${p.id}" aria-selected="${p.id === subActual}" aria-controls="plan-panel" tabindex="${p.id === subActual ? 0 : -1}">${p.label}</button>`).join('')}
      </div>
      <section id="plan-panel" class="o-plan-panel" role="tabpanel" aria-labelledby="plan-tab-${subActual}">
        ${inner}
      </section>
      ${subActual === 'lista' ? renderTaskForm() : ''}
    </div>`;
}

// --- Repintar y sincronizar ---------------------------------------------------
async function repintar() {
  soltarSubvistas();
  const root = document.getElementById('view-root');
  const html = await render();
  if (!vistaVigente()) return;
  root.innerHTML = html;
  mountListeners();
}

// 'budget-updated' es el aviso genérico de sync.js de que se aplicó un
// cambio remoto: sin este listener un cambio hecho en otro dispositivo no se
// ve hasta salir y volver. Se engancha una sola vez (mountListeners se llama
// en cada repintado).
let syncEnganchado = false;
async function onSyncActualizado() {
  if (subActual !== 'lista') return;
  // No pisar una hoja abierta ni lo que se está escribiendo.
  if (hayModalAbierto()) return;
  const quick = document.getElementById('task-quick-add');
  if (quick && (document.activeElement === quick || quick.value.trim())) return;
  await repintar();
}
// Al cerrar la pantalla de foco, el detalle abierto pone al día su bitácora
// y sus focos; con un foco que empieza o termina, el texto del botón.
function onFocoCerrado(e) {
  if (subActual === 'lista' && e.detail && e.detail.tareaId === ld.id && !hayModalAbierto()) repintar();
}
function onFocoCambio() {
  const b = document.getElementById('btn-foco-tarea');
  if (b && ld.id) b.textContent = textoBotonFoco(ld.id);
}

// Suelta lo de las sub-vistas (sin cerrar el detalle): antes de cada
// repintado, así cambiar de pestaña no acumula listeners.
function soltarSubvistas() {
  window.removeEventListener('budget-updated', onSyncActualizado);
  window.removeEventListener('vg-foco-cerrado', onFocoCerrado);
  window.removeEventListener('vg-foco-cambio', onFocoCambio);
  syncEnganchado = false;
  Planificador.cleanup();
  Anotaciones.cleanup();
}

// Llamado por el router (app.js) antes de desmontar esta vista.
export function cleanup() {
  soltarSubvistas();
  ld.soltar();
}

async function cambiarSub(sub) {
  if (sub === subActual) return;
  ld.olvidar();
  busqueda = '';
  history.replaceState(history.state, '', SUBRUTAS[sub] || SUBRUTAS.lista);
  await repintar();
  document.getElementById(`plan-tab-${sub}`)?.focus({ preventScroll: true });
}

// Lo llama el router cuando cambia solo la subruta del hash estando ya en
// Plan (la pestaña de la barra estando en Semana, o #planificador).
export function onSubrouteChange() {
  if (subDeHash() !== subActual) { ld.olvidar(); repintar(); }
}

export function mountListeners() {
  vistaVigente = guardiaVista('tareas');

  // Pestañas de Plan (flechas para moverse entre ellas, como un tablist).
  const tabs = [...document.querySelectorAll('.tareas-subtab')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => cambiarSub(tab.getAttribute('data-sub')));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].click();
    });
  });

  if (subActual === 'semana') { Planificador.mountListeners(); return; }
  if (subActual === 'notas') { Anotaciones.mountListeners(); return; }

  if (!syncEnganchado) {
    syncEnganchado = true;
    window.addEventListener('budget-updated', onSyncActualizado);
    window.addEventListener('vg-foco-cerrado', onFocoCerrado);
    window.addEventListener('vg-foco-cambio', onFocoCambio);
  }
  ld.enganchar();

  initActivityHeatmapListeners('tareas-heatmap', 'var(--o-mod)');
  setupTaskForm(repintar);

  document.getElementById('btn-new-task')?.addEventListener('click', () => openTaskForm());

  // Estados del tablero (flechas entre pestañas).
  const estados = [...document.querySelectorAll('.btn-state-tab')];
  estados.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.state === activeTaskState) return;
      activeTaskState = btn.dataset.state;
      repintar().then(() => document.getElementById(`tar-estado-${activeTaskState}`)?.focus({ preventScroll: true }));
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      estados[(i + (e.key === 'ArrowRight' ? 1 : estados.length - 1)) % estados.length].click();
    });
  });

  // Alta rápida: directo a «Por hacer», prioridad media.
  const quick = document.getElementById('task-quick-add');
  bindQuickCaptureForm(document.getElementById('task-quick-add-form'), async () => {
    const title = quick.value.trim();
    if (!title) return;
    await db.saveTask({ title, description: '', priority: 'medium', dueDate: '', project: '', status: 'todo', subtasks: [] });
    Toast('Tarea agregada', 'success');
    activeTaskState = 'todo';
    busqueda = '';
    await repintar();
    document.getElementById('task-quick-add')?.focus({ preventScroll: true });
  });

  // Abrir el detalle: en celular, sub-pantalla arriba de todo.
  document.querySelectorAll('.btn-edit-task').forEach(el => {
    el.addEventListener('click', () => {
      ld.abrir(el.getAttribute('data-id')).then(() => { if (ld.subpantalla) window.scrollTo(0, 0); });
    });
  });

  // Paso siguiente desde la fila (sin abrir el detalle): db.updateTaskStatus
  // registra su evento (tarea_actualizada / tarea_completada). Se relee para
  // confirmar, porque una escritura fallida de IndexedDB no rechaza.
  document.querySelectorAll('.btn-advance-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const to = btn.dataset.to;
      const fila = btn.closest('.o-tarea-fila');
      fila?.classList.add('o-tarea-fila--saliendo');
      if (btn.classList.contains('o-check')) btn.setAttribute('aria-pressed', 'true');
      try {
        await db.updateTaskStatus(id, to);
        const t = (await db.getTasks()).find(x => x.id === id);
        if (!t || t.status !== to) throw new Error('El estado no se guardó en IndexedDB');
        Toast(to === 'done' ? 'Tarea hecha' : 'Tarea en curso', 'success');
        await repintar();
      } catch (err) {
        console.error('Error al avanzar la tarea:', err);
        fila?.classList.remove('o-tarea-fila--saliendo');
        if (btn.classList.contains('o-check')) btn.setAttribute('aria-pressed', 'false');
        Toast('No se pudo guardar. Inténtalo de nuevo.', 'error');
      }
    });
  });

  // Búsqueda: filtra las filas por título, proyecto y notas.
  const buscar = document.getElementById('task-search');
  const filtrar = () => {
    const q = busqueda.trim().toLowerCase();
    let visibles = 0;
    document.querySelectorAll('.o-tarea-fila').forEach(f => {
      const ver = !q || f.dataset.buscar.includes(q);
      f.hidden = !ver;
      if (ver) visibles++;
    });
    document.querySelectorAll('.o-tarea-grupo').forEach(g => { g.hidden = !g.querySelector('.o-tarea-fila:not([hidden])'); });
    const nada = document.getElementById('tar-sin-resultados');
    if (nada) nada.hidden = !q || visibles > 0 || !document.querySelector('.o-tarea-fila');
  };
  buscar?.addEventListener('input', () => { busqueda = buscar.value; filtrar(); });
  buscar?.addEventListener('keydown', (e) => { if (e.key === 'Escape' && buscar.value) { e.preventDefault(); buscar.value = ''; busqueda = ''; filtrar(); } });
  filtrar();

  // --- Detalle ---
  const volver = () => ld.cerrar();
  document.getElementById('btn-volver-tarea')?.addEventListener('click', volver);
  document.getElementById('btn-cerrar-tarea')?.addEventListener('click', volver);
  const tareaAbierta = async () => (await db.getTasks()).find(x => x.id === ld.id);

  document.querySelectorAll('.o-tarea-det-estado').forEach(b => b.addEventListener('click', async () => {
    if (b.getAttribute('aria-pressed') === 'true' || !ld.id) return;
    await db.updateTaskStatus(ld.id, b.dataset.status);
    Toast(`Pasó a ${ETQ_ESTADO[b.dataset.status]}`, 'success');
    repintar();
  }));
  document.querySelectorAll('.o-tarea-det-sub').forEach(b => b.addEventListener('click', async () => {
    const t = await tareaAbierta();
    if (!t) return;
    const i = Number(b.dataset.i);
    const subtasks = (t.subtasks || []).map((s, k) => (k === i ? { ...s, done: !s.done } : s));
    b.setAttribute('aria-pressed', String(!!subtasks[i]?.done));
    await db.saveTask({ id: t.id, subtasks });
    repintar();
  }));
  document.getElementById('btn-foco-tarea')?.addEventListener('click', async () => {
    const t = await tareaAbierta();
    if (t) iniciarFoco(t, { alVolver: (id) => ld.abrir(id) });
  });
  document.getElementById('btn-editar-tarea')?.addEventListener('click', async () => {
    const t = await tareaAbierta();
    if (t) openTaskForm(t);
  });
  document.getElementById('btn-eliminar-tarea')?.addEventListener('click', async () => {
    const t = await tareaAbierta();
    if (!t) return;
    const n = (t.subtasks || []).length;
    const ok = await ConfirmDialog(
      `Eliminar tarea ${t.title}`,
      n > 0 ? `Se perderán sus ${n} ${n === 1 ? 'subtarea' : 'subtareas'}. No se puede deshacer.` : 'No se puede deshacer.',
      { verb: 'Eliminar' }
    );
    if (!ok) return;
    await db.deleteTask(t.id);
    Toast('Tarea eliminada', 'success');
    ld.cerrar();
  });
}
