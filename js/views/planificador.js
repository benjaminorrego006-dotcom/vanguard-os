import { db } from '../core/db.js';
import { Toast, ConfirmDialog, hayModalAbierto } from '../utils/states.js';
import { diaKeyDe, formatFechaCorta, sumarDias, fechaLocalDe } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';

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
// anterior a hoy. Además, `semana.vencidasAntes` lista las tareas de Lista
// sin hacer que vencieron antes del lunes (mismo criterio que las
// "atrasadas" de Hoy), para la tira de pendientes de días pasados.
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
  semana.vencidasAntes = tareas
    .filter(x => x.status !== 'done' && x.dueDate && x.dueDate < isos[0] && x.dueDate < hoyIso)
    .map(x => ({ origen: 'tarea', id: x.id, texto: x.title, hecha: false, priority: x.priority, status: x.status, fecha: x.dueDate, createdAt: x.createdAt }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  return semana;
}

// Igual que componerSemana, leyendo los dos stores. `lunes`: Date o clave.
export async function armarSemana(lunes) {
  const lunesIso = typeof lunes === 'string' ? lunes : diaKeyDe(lunes);
  const [plan, tareas] = await Promise.all([db.getTareasPlan(lunesIso, sumarDias(lunesIso, 6)), db.getTasks()]);
  return componerSemana(lunesIso, { plan, tareas, hoyIso: diaKeyDe(new Date()) });
}

// Offset en semanas respecto de la actual y día elegido en la franja. Viven
// fuera de render() para sobrevivir a los refresh, igual que el mes activo
// en otras vistas. diaSeleccionado se recalcula al cambiar de semana (hoy si
// está en la semana mostrada; si no, el lunes).
let offsetSemana = 0;
let diaSeleccionado = null;

const LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
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

export async function render() {
  const hoyIso = diaKeyDe(new Date());
  const lunesIso = sumarDias(diaKeyDe(lunesDe(new Date())), offsetSemana * 7);
  const semana = await armarSemana(lunesIso);
  const isos = semana.map(d => d.iso);
  if (!isos.includes(diaSeleccionado)) diaSeleccionado = isos.includes(hoyIso) ? hoyIso : lunesIso;

  const dias = isos.map(iso => fechaLocalDe(iso));
  const tareas = await db.getTareasPlan(isos[0], isos[6]);

  const hechasSemana = semana.reduce((n, d) => n + d.hechas, 0);
  const totalSemana = semana.reduce((n, d) => n + d.total, 0);
  const rango = `${formatFechaCorta(dias[0])} – ${formatFechaCorta(dias[6])}`;

  const filaTarea = (t) => `
    <div style="display: flex; align-items: flex-start; gap: 10px; padding: 7px 0;">
      <button class="plan-toggle tappable" data-id="${t.id}"
        style="width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; cursor: pointer; border: 1.5px solid ${t.hecha ? 'var(--accent-plan)' : 'var(--surface-border)'}; background: ${t.hecha ? 'var(--accent-plan)' : 'transparent'}; border-radius: 6px; display: flex; align-items: center; justify-content: center; padding: 0;">
        ${t.hecha ? '<svg width="11" height="11" fill="none" stroke="#000" stroke-width="3.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
      </button>
      <span style="flex: 1; font-size: 14px; line-height: 1.4; color: ${t.hecha ? 'var(--text-disabled)' : 'var(--text-primary)'}; text-decoration: ${t.hecha ? 'line-through' : 'none'};">${escapeHtml(t.texto)}</span>
      <button class="plan-delete tappable" data-id="${t.id}"
        style="background: transparent; border: none; color: var(--text-disabled); cursor: pointer; flex-shrink: 0; padding: 2px;">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>`;

  const tarjetaDia = (d, i) => {
    const iso = diaKeyDe(d);
    const delDia = tareas.filter(t => t.fecha === iso);
    const esHoy = iso === hoyIso;
    return `
      <div class="card" style="padding: 14px 16px; margin-bottom: 12px; ${esHoy ? 'border-color: var(--accent-plan);' : ''}">
        <div class="flex-between" style="margin-bottom: 8px;">
          <h4 style="font-size: 15px; font-weight: 800; margin: 0; color: ${esHoy ? 'var(--accent-plan)' : 'var(--text-primary)'};">${DOW[i]}</h4>
          <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;" class="num">
            ${d.getDate()}/${d.getMonth() + 1}${delDia.length ? ` · ${delDia.filter(t => t.hecha).length}/${delDia.length}` : ''}
          </span>
        </div>
        ${delDia.map(filaTarea).join('')}
        <form class="plan-nueva-form" onsubmit="return false;">
          <input class="plan-nueva" data-fecha="${iso}" type="text" placeholder="Nueva tarea…" enterkeyhint="go"
            style="width: 100%; margin-top: 8px; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 10px 12px; font-size: 14px; font-family: inherit; box-sizing: border-box; outline: none;">
        </form>
      </div>`;
  };

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

      ${dias.map(tarjetaDia).join('')}
    </div>`;
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

  // Cambiar de semana reinicia el día elegido (hoy o el lunes, ver render).
  document.getElementById('plan-prev')?.addEventListener('click', () => { offsetSemana--; diaSeleccionado = null; refresh(); });
  document.getElementById('plan-next')?.addEventListener('click', () => { offsetSemana++; diaSeleccionado = null; refresh(); });
  document.getElementById('plan-hoy')?.addEventListener('click', () => { offsetSemana = 0; diaSeleccionado = null; refresh(); });

  // Franja: tocar un día lo elige; ← → (e Inicio/Fin) recorren los días
  // como pestañas (role="tablist") y mueven el foco.
  const celdas = Array.from(document.querySelectorAll('.plan-dia'));
  const elegir = (iso, foco) => {
    diaSeleccionado = iso;
    celdas.forEach(c => {
      const sel = c.dataset.iso === iso;
      c.classList.toggle('plan-dia--sel', sel);
      c.setAttribute('aria-selected', String(sel));
      c.tabIndex = sel ? 0 : -1;
      if (sel && foco) c.focus();
    });
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

  document.querySelectorAll('.plan-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      await db.toggleTareaPlan(e.currentTarget.getAttribute('data-id'));
      refresh();
    });
  });

  document.querySelectorAll('.plan-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const confirmed = await ConfirmDialog('¿Eliminar tarea?', 'Se borra del planificador. Esta acción no se puede deshacer.');
      if (!confirmed) return;
      await db.eliminarTareaPlan(id);
      Toast('Tarea eliminada', 'success');
      refresh();
    });
  });

  document.querySelectorAll('.plan-nueva-form').forEach(form => {
    const input = form.querySelector('.plan-nueva');
    bindQuickCaptureForm(form, async () => {
      const texto = input.value.trim();
      if (!texto) return;
      await db.crearTareaPlan(input.getAttribute('data-fecha'), texto);
      refresh();
    });
  });
}
