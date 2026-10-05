import { db } from '../core/db.js';
import { Toast, ConfirmDialog, hayModalAbierto } from '../utils/states.js';
import { diaKeyDe, formatFechaCorta, sumarDias, fechaLocalDe, diasEntre } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';
import { renderPriorityBars } from '../utils/prioridad.js';
import { calcularAtrasadas } from '../utils/atrasadas.js';
import { renderTaskForm, setupTaskForm, openTaskForm } from '../components/task-form.js';

// 'budget-updated' es el aviso genérico de sync.js de que se aplicó un
// cambio remoto (ver runFullSync en core/sync.js) — sin este listener, un
// cambio hecho en otro dispositivo queda guardado en IndexedDB pero esta
// vista no se repinta sola hasta que se sale y se vuelve a entrar. Se
// engancha una sola vez: mountListeners() se vuelve a llamar en cada
// refresh() local, así que sin el guard se acumularía un listener nuevo
// por cada tarea tocada, no solo por cada sync.
let syncEnganchado = false;
function contenedor() {
  return document.getElementById('plan-host') || document.getElementById('view-root');
}

async function onSyncActualizado() {
  if (hayModalAbierto()) return;
  // No pisar una tarea nueva que el usuario esté a mitad de escribir en
  // cualquiera de las tarjetas de día (se guarda recién al enviar el form).
  const hayBorrador = Array.from(document.querySelectorAll('.plan-nueva'))
    .some(inp => document.activeElement === inp || inp.value.trim());
  if (hayBorrador) return;
  const root = contenedor();
  root.innerHTML = await render();
  mountListeners();
}

// Llamado por el router (app.js) antes de desmontar esta vista.
export function cleanup() {
  window.removeEventListener('budget-updated', onSyncActualizado);
  syncEnganchado = false;
}

const DOW = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Lunes de la semana que contiene `d`. getDay() devuelve 0 para domingo,
// así que (getDay()+6)%7 lo reindexa a lunes=0 y el domingo queda al final.
function lunesDe(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

// --- Datos de la semana (Tablero de día, docs/REDISENO-SEMANA.md) -------
// Semana muestra los ítems del planificador y las tareas de Lista con
// dueDate en cada día (sin hábitos). Sin migración: se leen los dos stores,
// como la agenda de Hoy (dashboard.js, renderAgenda).
const RANGO_PRIORIDAD = { high: 0, medium: 1, low: 2 };
const porCreacion = (a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''));

// Pendientes primero; entre las pendientes, las tareas de Lista por
// prioridad (alta → baja) y después los ítems del planificador por orden
// de creación. Las hechas al final, con el mismo criterio entre ellas.
function ordenItems(a, b) {
  if (a.hecha !== b.hecha) return a.hecha ? 1 : -1;
  if (a.origen !== b.origen) return a.origen === 'tarea' ? -1 : 1;
  if (a.origen === 'tarea') {
    const p = (RANGO_PRIORIDAD[a.priority] ?? 1) - (RANGO_PRIORIDAD[b.priority] ?? 1);
    if (p) return p;
  }
  return porCreacion(a, b);
}

// Arma los 7 días de la semana que empieza en `lunesIso` con los datos
// dados (puro: sin leer la base). Cada día: { iso, items, hechas, total,
// pendientesPasado }; pendientesPasado cuenta los ítems sin hacer de un día
// anterior a hoy (el cuadrado rojo de la franja). Además,
// `semana.atrasadas` es todo lo no hecho con fecha anterior a hoy de los dos
// stores, sin límite al lunes (calcularAtrasadas, el mismo cálculo que la
// fila "atrasadas" de Hoy), para la tira de pendientes de días pasados.
export function componerSemana(lunesIso, { plan = [], tareas = [], hoyIso = diaKeyDe(new Date()) } = {}) {
  const isos = Array.from({ length: 7 }, (_, i) => sumarDias(lunesIso, i));
  const semana = isos.map(iso => {
    const items = [
      ...plan.filter(p => p.fecha === iso)
        .map(p => ({ origen: 'plan', id: p.id, texto: p.texto, hecha: !!p.hecha, createdAt: p.createdAt })),
      ...tareas.filter(x => x.dueDate === iso)
        .map(x => ({ origen: 'tarea', id: x.id, texto: x.title, hecha: x.status === 'done', priority: x.priority, status: x.status, createdAt: x.createdAt }))
    ].sort(ordenItems);
    const hechas = items.filter(i => i.hecha).length;
    return { iso, items, hechas, total: items.length, pendientesPasado: iso < hoyIso ? items.length - hechas : 0 };
  });
  semana.atrasadas = calcularAtrasadas({ tareas, plan, hoyIso });
  return semana;
}

// Igual que componerSemana, leyendo los dos stores. `lunes`: Date o clave.
// Se lee todo el planificador (no solo la semana): las atrasadas no tienen
// límite hacia atrás.
export async function armarSemana(lunes) {
  const lunesIso = typeof lunes === 'string' ? lunes : diaKeyDe(lunes);
  const [plan, tareas] = await Promise.all([db.getTareasPlan(), db.getTasks()]);
  return componerSemana(lunesIso, { plan, tareas, hoyIso: diaKeyDe(new Date()) });
}

// Offset en semanas respecto de la actual y día elegido en la franja. Viven
// fuera de render() para sobrevivir a los refresh, igual que el mes activo
// en otras vistas. diaSeleccionado se recalcula al cambiar de semana (hoy si
// está en la semana mostrada; si no, el lunes).
let offsetSemana = 0;
let diaSeleccionado = null;
let tiraAbierta = false;

const LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIA_CORTO = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const plural = (n, uno, varios) => (n === 1 ? uno : varios);

// "jueves 1 de octubre, 1 de 2 hechas, 1 pendiente" (lector de pantalla).
function etiquetaDia(d, i, esHoy) {
  const f = fechaLocalDe(d.iso);
  const mes = f.toLocaleDateString('es-CL', { month: 'long' });
  const fecha = `${esHoy ? 'hoy, ' : ''}${DOW[i].toLowerCase()} ${f.getDate()} de ${mes}`;
  if (!d.total) return `${fecha}, sin tareas`;
  const pend = d.total - d.hechas;
  return `${fecha}, ${d.hechas} de ${d.total} ${plural(d.total, 'hecha', 'hechas')}${pend ? `, ${pend} ${plural(pend, 'pendiente', 'pendientes')}` : ''}`;
}

// Franja de 7 días: letra (o HOY), número, barra hechas/total y un cuadrado
// rojo si el día ya pasó con pendientes.
function renderFranja(semana, hoyIso) {
  const celda = (d, i) => {
    const esHoy = d.iso === hoyIso;
    const sel = d.iso === diaSeleccionado;
    const pct = d.total ? Math.round((d.hechas / d.total) * 100) : 0;
    return `
      <button type="button" role="tab" id="plan-dia-${d.iso}" class="plan-dia tappable${sel ? ' plan-dia--sel' : ''}${esHoy ? ' plan-dia--hoy' : ''}"
        data-iso="${d.iso}" aria-selected="${sel}" tabindex="${sel ? 0 : -1}" aria-label="${escapeHtml(etiquetaDia(d, i, esHoy))}">
        <span class="plan-dia-letra" aria-hidden="true">${esHoy ? 'HOY' : LETRA[i]}</span>
        <span class="plan-dia-num num" aria-hidden="true">${fechaLocalDe(d.iso).getDate()}</span>
        <span class="plan-dia-barra" aria-hidden="true"><span style="width: ${pct}%;"></span></span>
        ${d.pendientesPasado > 0 ? '<span class="plan-dia-alerta" aria-hidden="true"></span>' : ''}
      </button>`;
  };
  return `<div class="plan-franja" role="tablist" aria-label="Días de la semana">${semana.map(celda).join('')}</div>`;
}

// Fila de un ítem del día: check · texto · (Lista) vencimiento + prioridad,
// (planificador) ✕ para borrar. El texto de una tarea de Lista abre su
// detalle, como en Lista.
function filaItem(it, iso, hoyIso) {
  const texto = escapeHtml(it.texto);
  const check = `
    <button type="button" class="plan-check tappable" aria-pressed="${it.hecha}" aria-label="${it.hecha ? `Desmarcar «${texto}»` : `Marcar «${texto}» como hecha`}">
      <span class="plan-check-caja" aria-hidden="true">${it.hecha ? '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="3.4" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}</span>
    </button>`;
  if (it.origen === 'tarea') {
    const venc = !it.hecha && iso <= hoyIso ? (iso === hoyIso ? 'VENCE HOY' : 'VENCIDA') : '';
    return `
      <li class="plan-item${it.hecha ? ' plan-item--hecha' : ''}" data-origen="tarea" data-id="${escapeHtml(it.id)}">
        ${check}
        <button type="button" class="plan-item-texto plan-item-abrir tappable" aria-label="${texto}. Abrir el detalle">${texto}</button>
        <span class="plan-item-meta">${venc ? `<span class="plan-venc">${venc}</span>` : ''}${renderPriorityBars(it.priority)}</span>
      </li>`;
  }
  return `
    <li class="plan-item${it.hecha ? ' plan-item--hecha' : ''}" data-origen="plan" data-id="${escapeHtml(it.id)}">
      ${check}
      <span class="plan-item-texto">${texto}</span>
      <button type="button" class="plan-delete tappable" aria-label="Eliminar «${texto}»">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </li>`;
}

// Detalle del día elegido: "Domingo 4" + hechas/total y sus ítems.
function renderDetalle(semana, hoyIso) {
  const i = semana.findIndex(d => d.iso === diaSeleccionado);
  const d = semana[i];
  const n = fechaLocalDe(d.iso).getDate();
  return `
    <section id="plan-detalle" class="plan-detalle" role="tabpanel" aria-labelledby="plan-dia-${d.iso}">
      <div class="plan-detalle-cab">
        <h2>${DOW[i]} <span class="num">${n}</span></h2>
        ${d.total ? `<span class="plan-detalle-cont num" aria-label="${d.hechas} de ${d.total} ${plural(d.total, 'hecha', 'hechas')}">${d.hechas}/${d.total}</span>` : ''}
      </div>
      ${d.items.length
        ? `<ul class="plan-items">${d.items.map(it => filaItem(it, d.iso, hoyIso)).join('')}</ul>`
        : '<p class="plan-vacio">Nada para este día</p>'}
    </section>`;
}

// Chip del form único con el día elegido ("DOM 4") y su etiqueta.
function chipDia(semana) {
  const i = semana.findIndex(d => d.iso === diaSeleccionado);
  const n = fechaLocalDe(diaSeleccionado).getDate();
  return { texto: `${DIA_CORTO[i]} ${n}`, label: `Agregar al ${DOW[i].toLowerCase()} ${n}` };
}

// Un solo form al final: crea en el día elegido de la franja.
function renderNueva(semana) {
  const chip = chipDia(semana);
  return `
    <form class="plan-nueva-form" onsubmit="return false;">
      <input class="plan-nueva" type="text" placeholder="Agregar…" enterkeyhint="go" aria-label="${chip.label}">
      <span class="plan-nueva-chip num" aria-hidden="true">${chip.texto}</span>
      <button type="submit" class="plan-nueva-btn tappable" aria-label="${chip.label}">+</button>
    </form>`;
}

// Tira "N pendientes de días pasados" (solo en la semana actual): tocar el
// texto despliega la lista; "Pasar a hoy" las mueve todas a hoy.
function renderTira(atrasadas, hoyIso) {
  if (offsetSemana !== 0 || !atrasadas.length) { tiraAbierta = false; return ''; }
  const n = atrasadas.length;
  const hace = (fecha) => { const k = diasEntre(fecha, hoyIso); return k === 1 ? 'ayer' : `hace ${k} días`; };
  return `
    <div class="plan-tira">
      <div class="plan-tira-fila">
        <button type="button" id="plan-tira-toggle" class="plan-tira-texto tappable" aria-expanded="${tiraAbierta}" aria-controls="plan-tira-lista">
          <span class="num">${n}</span> ${plural(n, 'pendiente', 'pendientes')} de días pasados
          <svg aria-hidden="true" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="transform: rotate(${tiraAbierta ? 180 : 0}deg);"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <button type="button" id="plan-tira-pasar" class="plan-tira-pasar tappable">Pasar a hoy</button>
      </div>
      <ul id="plan-tira-lista" class="plan-tira-lista" ${tiraAbierta ? '' : 'hidden'}>
        ${atrasadas.map(a => `<li><span class="plan-tira-item">${escapeHtml(a.texto)}</span><span class="plan-tira-meta">${a.tipo === 'plan' ? 'Semana' : 'Lista'} · ${hace(a.fecha)}</span></li>`).join('')}
      </ul>
    </div>`;
}

// Última semana pintada: tocar otro día de la franja repinta solo el
// detalle, sin volver a leer la base.
let ultimaSemana = null;

export async function render() {
  const hoyIso = diaKeyDe(new Date());
  const lunesIso = sumarDias(diaKeyDe(lunesDe(new Date())), offsetSemana * 7);
  const semana = await armarSemana(lunesIso);
  const isos = semana.map(d => d.iso);
  if (!isos.includes(diaSeleccionado)) diaSeleccionado = isos.includes(hoyIso) ? hoyIso : lunesIso;
  ultimaSemana = { semana, hoyIso };

  const hechasSemana = semana.reduce((n, d) => n + d.hechas, 0);
  const totalSemana = semana.reduce((n, d) => n + d.total, 0);
  const rango = `${formatFechaCorta(fechaLocalDe(isos[0]))} – ${formatFechaCorta(fechaLocalDe(isos[6]))}`;

  return `
    <div style="padding: 20px 20px 110px 20px; font-family: var(--font-body);">

      <header class="plan-cab">
        <div class="plan-cab-titulo">
          <h1>Semana</h1>
          ${offsetSemana === 0
            ? `<div class="plan-rango">${rango} · <span class="num">${hechasSemana}/${totalSemana}</span></div>`
            : `<button type="button" id="plan-hoy" class="plan-rango plan-rango--volver tappable" aria-label="${rango}, ${hechasSemana} de ${totalSemana} hechas. Volver a esta semana">${rango} · <span class="num">${hechasSemana}/${totalSemana}</span> <span class="plan-rango-volver">· Volver a hoy</span></button>`}
        </div>
        <div class="plan-cab-nav">
          <button type="button" id="plan-prev" class="plan-flecha tappable" aria-label="Semana anterior">‹</button>
          <button type="button" id="plan-next" class="plan-flecha tappable" aria-label="Semana siguiente">›</button>
        </div>
      </header>

      ${renderFranja(semana, hoyIso)}

      ${renderTira(semana.atrasadas, hoyIso)}

      ${renderDetalle(semana, hoyIso)}

      ${renderNueva(semana)}
    </div>
    ${renderTaskForm()}`;
}

export function mountListeners() {
  if (!syncEnganchado) {
    syncEnganchado = true;
    window.addEventListener('budget-updated', onSyncActualizado);
  }

  const refresh = async () => {
    const root = contenedor();
    root.innerHTML = await render();
    mountListeners();
  };

  // Detalle de tarea de Lista (mismo formulario que en Lista); al guardar
  // o eliminar se repinta la semana.
  setupTaskForm(refresh);

  // Cambiar de semana reinicia el día elegido (hoy o el lunes, ver render).
  document.getElementById('plan-prev')?.addEventListener('click', () => { offsetSemana--; diaSeleccionado = null; refresh(); });
  document.getElementById('plan-next')?.addEventListener('click', () => { offsetSemana++; diaSeleccionado = null; refresh(); });
  document.getElementById('plan-hoy')?.addEventListener('click', () => { offsetSemana = 0; diaSeleccionado = null; refresh(); });

  // Franja: tocar un día lo elige y repinta el detalle (y el chip del form);
  // ← → (e Inicio/Fin) recorren los días como pestañas (role="tablist") y
  // mueven el foco. El form queda fuera del detalle: lo escrito se conserva.
  const celdas = Array.from(document.querySelectorAll('.plan-dia'));
  const elegir = (iso, foco) => {
    if (iso === diaSeleccionado && !foco) return;
    diaSeleccionado = iso;
    celdas.forEach(c => {
      const sel = c.dataset.iso === iso;
      c.classList.toggle('plan-dia--sel', sel);
      c.setAttribute('aria-selected', String(sel));
      c.tabIndex = sel ? 0 : -1;
      if (sel && foco) c.focus();
    });
    const detalle = document.getElementById('plan-detalle');
    if (!detalle || !ultimaSemana) return;
    detalle.outerHTML = renderDetalle(ultimaSemana.semana, ultimaSemana.hoyIso);
    const chip = chipDia(ultimaSemana.semana);
    const chipEl = document.querySelector('.plan-nueva-chip');
    if (chipEl) chipEl.textContent = chip.texto;
    document.querySelectorAll('.plan-nueva, .plan-nueva-btn').forEach(el => el.setAttribute('aria-label', chip.label));
    montarDetalle();
  };
  celdas.forEach((c, i) => {
    c.addEventListener('click', () => elegir(c.dataset.iso, false));
    c.addEventListener('keydown', (e) => {
      const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: celdas.length - 1 }[e.key];
      if (destino === undefined || !celdas[destino]) return;
      e.preventDefault();
      elegir(celdas[destino].dataset.iso, true);
    });
  });

  // Listeners del detalle: se reasignan cada vez que se repinta.
  const montarDetalle = () => {
    document.querySelectorAll('#plan-detalle .plan-item').forEach(li => {
      const id = li.dataset.id;
      const origen = li.dataset.origen;
      li.querySelector('.plan-check')?.addEventListener('click', async () => {
        if (origen === 'plan') await db.toggleTareaPlan(id);
        else await db.updateTaskStatus(id, li.classList.contains('plan-item--hecha') ? 'todo' : 'done');
        refresh();
      });
      li.querySelector('.plan-item-abrir')?.addEventListener('click', async () => {
        const task = (await db.getTasks()).find(x => x.id === id);
        if (task) openTaskForm(task);
      });
      li.querySelector('.plan-delete')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await ConfirmDialog('¿Eliminar tarea?', 'Se borra del planificador. Esta acción no se puede deshacer.');
        if (!confirmed) return;
        await db.eliminarTareaPlan(id);
        Toast('Tarea eliminada', 'success');
        refresh();
      });
    });
  };
  montarDetalle();

  // Form único: crea en el día elegido de la franja.
  const form = document.querySelector('.plan-nueva-form');
  if (form) {
    const input = form.querySelector('.plan-nueva');
    bindQuickCaptureForm(form, async () => {
      const texto = input.value.trim();
      if (!texto) return;
      await db.crearTareaPlan(diaSeleccionado, texto);
      refresh();
    });
  }

  // Tira de pendientes de días pasados.
  const toggle = document.getElementById('plan-tira-toggle');
  toggle?.addEventListener('click', () => {
    tiraAbierta = !tiraAbierta;
    document.getElementById('plan-tira-lista').hidden = !tiraAbierta;
    toggle.setAttribute('aria-expanded', String(tiraAbierta));
    toggle.querySelector('svg').style.transform = `rotate(${tiraAbierta ? 180 : 0}deg)`;
  });
  // "Pasar a hoy": planificador → moverTareaPlan (tarea_reprogramada); Lista
  // → saveTask({ id, dueDate }) (tarea_actualizada), igual que "Mover a hoy"
  // en la agenda de Hoy.
  document.getElementById('plan-tira-pasar')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const lista = (ultimaSemana && ultimaSemana.semana.atrasadas) || [];
    if (!lista.length) return;
    btn.disabled = true;
    const hoy = diaKeyDe(new Date());
    try {
      for (const a of lista) {
        if (a.tipo === 'plan') await db.moverTareaPlan(a.id, hoy);
        else await db.saveTask({ id: a.id, dueDate: hoy });
      }
      Toast(`${lista.length} ${plural(lista.length, 'pasada', 'pasadas')} a hoy`, 'success');
      tiraAbierta = false;
      diaSeleccionado = hoy;
      await refresh();
    } catch (err) {
      console.error('Error al pasar a hoy:', err);
      Toast('No se pudo guardar — inténtalo de nuevo.', 'error');
      btn.disabled = false;
    }
  });
}
