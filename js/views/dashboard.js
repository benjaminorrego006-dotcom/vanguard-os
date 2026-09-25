import { db } from '../core/db.js';
import { formatCurrency } from '../utils/currency.js';
import { Toast } from '../utils/states.js';
import { parseQuickGasto } from './finanzas.js';
import { escapeHtml } from '../utils/escape.js';
import { diaKeyDe } from '../utils/fecha.js';
import { exportAllData, getDiasDesdeUltimoBackup } from '../utils/backup.js';
import * as LabFinanzas from '../components/lab-finanzas.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';
import { calcularHoyToca } from '../utils/hoyToca.js';
import { renderTaskForm, setupTaskForm, openTaskForm } from '../components/task-form.js';
import * as Anotaciones from './anotaciones.js';

// Llamado por el router (app.js) antes de desmontar Inicio. El laboratorio
// puede tener una instancia de Chart.js viva (el donut de "Distribución del
// mes") que si no, queda con su canvas fuera del DOM pero corriendo — mismo
// motivo que ya documentaba analisis.js.
export function cleanup() {
  if (labObserver) { labObserver.disconnect(); labObserver = null; }
  LabFinanzas.cleanup();
}

async function repintar() {
  const root = document.getElementById('view-root');
  const scroll = root.scrollTop;
  cleanup();
  root.innerHTML = await render();
  mountListeners();
  root.scrollTop = scroll;
}

// ¿Este hábito toca hoy y todavía no está cumplido? Mismo criterio que los
// helpers de db.js (días de la semana con getDay() local; con meta numérica,
// "cumplido" es llegar a la cantidad).
function habitoPendienteHoy(h, hoyIso) {
  const f = h.frecuencia || { tipo: 'diario' };
  if (f.tipo === 'dias' && !(f.dias || []).includes((new Date().getDay() + 6) % 7)) return false;
  const v = h.marcas && h.marcas[hoyIso];
  if (h.meta && h.meta.cantidad) return !(Number(v) >= Number(h.meta.cantidad));
  return !v;
}

// Agenda de hoy: tareas con fecha de hoy (Tareas y Semana) + hábitos que
// tocan hoy y no están cumplidos. Cada fila lleva su checkbox en línea.
function renderAgenda({ tareasHoy, planHoy, habitosPend, hoyIso }) {
  const items = [
    ...tareasHoy.map(t => ({ tipo: 'tarea', id: t.id, texto: t.title, etiqueta: 'Tarea' })),
    ...planHoy.map(t => ({ tipo: 'plan', id: t.id, texto: t.texto, etiqueta: 'Semana' })),
    // Hábito con meta numérica ('habito-num'): no se cumple con un toque, se
    // abre el modal de progreso y se muestra lo avanzado (ej. 5/20 min).
    ...habitosPend.map(h => {
      const conMeta = !!(h.meta && h.meta.cantidad);
      const meta = conMeta ? Number(h.meta.cantidad) : 0;
      const actual = conMeta ? (Number(h.marcas && h.marcas[hoyIso]) || 0) : 0;
      const unidad = conMeta && h.meta.unidad ? String(h.meta.unidad) : '';
      return {
        tipo: conMeta ? 'habito-num' : 'habito', id: h.id, texto: h.nombre, actual, meta, unidad,
        etiqueta: conMeta ? `Hábito · ${actual}/${meta}${unidad ? ' ' + escapeHtml(unidad) : ''}` : 'Hábito'
      };
    })
  ];
  const fila = (it) => `
    <div style="display: flex; align-items: center; gap: 4px;">
      <button class="agenda-check tappable" data-tipo="${it.tipo}" data-id="${it.id}" data-nombre="${escapeHtml(it.texto)}" data-actual="${it.actual || 0}" data-meta="${it.meta || 0}" data-unidad="${escapeHtml(it.unidad || '')}" aria-label="${it.tipo === 'habito-num' ? 'Registrar progreso de' : 'Marcar'} ${escapeHtml(it.texto)}" style="width: 44px; height: 44px; flex-shrink: 0; background: transparent; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;">
        <span aria-hidden="true" style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border: 1.5px solid var(--text-disabled); color: var(--text-secondary);">${it.tipo === 'habito-num' ? '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' : ''}</span>
      </button>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(it.texto)}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${it.etiqueta}</div>
      </div>
    </div>`;
  return `
    <div id="hoy-agenda" class="card" style="padding: 14px 16px 10px; margin-bottom: 20px;">
      <div class="num" style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px;">Agenda de hoy${items.length ? ` · ${items.length}` : ''}</div>
      ${items.length
        ? items.map(fila).join('')
        : '<div style="font-size: 13px; color: var(--text-disabled); padding: 6px 0 8px;">Nada pendiente hoy</div>'}
    </div>`;
}

// Observer que dispara la carga diferida del Laboratorio (ver
// mountListeners): así Chart.js no se descarga hasta que el usuario llega
// con el scroll a esa sección.
let labObserver = null;

// El evento beforeinstallprompt lo captura index.html apenas carga la
// página (antes de que este módulo exista) y lo guarda en
// window.__vgInstall.deferredPrompt — acá solo lo leemos. Si el usuario ya
// lo descartó, no insistimos por 30 días (timestamp en localStorage: es
// solo una preferencia de UI, no dato de la app, así que no hace falta que
// viva en IndexedDB como el resto de la data).
const INSTALL_DISMISS_KEY = 'vg-install-dismissed-at';
const INSTALL_DISMISS_DIAS = 30;

function debeMostrarBannerInstalar() {
  if (!window.__vgInstall || !window.__vgInstall.deferredPrompt) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  try {
    const dismissedAt = localStorage.getItem(INSTALL_DISMISS_KEY);
    if (dismissedAt) {
      const diasDesde = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (diasDesde < INSTALL_DISMISS_DIAS) return false;
    }
  } catch (e) { /* localStorage puede fallar en modo privado — no bloquear el banner por eso */ }
  return true;
}

// beforeinstallprompt puede llegar recién unos segundos después de que
// Inicio ya está montada — si el usuario sigue ahí cuando eso pasa,
// re-renderizamos para que el banner aparezca sin que tenga que navegar.
// Este listener se registra una sola vez: dashboard.js es un módulo
// singleton (el mismo Blob URL cacheado se reusa en cada navegación a
// Inicio — ver loadModuleGraph en app.js), así que el top-level de este
// archivo corre una sola vez por sesión y no hace falta sacarlo en un
// cleanup.
window.addEventListener('vg-install-available', () => {
  if (window.appRouter && window.appRouter.currentView === 'dashboard') {
    window.appRouter.navigate('dashboard');
  }
});

// Todo IndexedDB, sin backend: si Chrome libera espacio, el usuario borra
// datos de navegación o cambia de teléfono, se pierde todo. exportAllData()
// hoy vivía escondida en Ajustes de Finanzas — este aviso la trae a Inicio,
// que es lo primero que se ve, en vez de depender de que alguien entre por
// su cuenta a esa pantalla. "Después" lo oculta hasta mañana (no para
// siempre): la fecha (diaKeyDe) queda en localStorage porque es una
// preferencia de UI, no dato de la app.
const BACKUP_AVISO_DIAS = 14;
const BACKUP_ALERTA_ROJA_DIAS = 30;

function backupNecesitaAviso(diasDesdeBackup) {
  return diasDesdeBackup === null || diasDesdeBackup > BACKUP_AVISO_DIAS;
}

// "Después" de la tarjeta contextual (ritual / respaldo / hoy toca): guarda
// el día en que se ocultó; vuelve a aparecer mañana.
const OCULTA_PREFIX = 'vg-ctx-oculta-';

function ocultaHoy(tipo) {
  try { return localStorage.getItem(OCULTA_PREFIX + tipo) === diaKeyDe(new Date()); }
  catch (e) { return false; /* modo privado — mostrar la tarjeta igual */ }
}

function ocultarHoy(tipo) {
  try { localStorage.setItem(OCULTA_PREFIX + tipo, diaKeyDe(new Date())); }
  catch (e) { /* modo privado */ }
}

function saludoPorHora() {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Misma escala verde/ámbar/rojo que las barras de categoría en
// Finanzas > Presupuesto, para que la barra miniatura del dashboard se
// lea igual que el detalle.
function colorAlerta(nivel) {
  if (nivel === 'exceeded') return 'var(--state-high)';
  if (nivel === 'warning') return 'var(--state-medium)';
  return 'var(--state-low)';
}

// Fila heroica compacta: barra de color lateral + una sola métrica grande,
// nada más — reemplaza a las dos tarjetas grandes (círculo de progreso /
// ícono de billetera) de la versión anterior.
function renderHeroicRow({ id, color, label, value }) {
  return `
    <div id="${id}" class="card tappable" style="display: flex; align-items: center; gap: 14px; padding: 15px 16px; margin-bottom: 10px; border-left: 2px solid ${color}; cursor: pointer;">
      <div style="flex: 1; min-width: 0;">
        <div class="num" style="font-size: 10px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">${label}</div>
        <div class="num" style="font-size: 19px; font-weight: 800; color: var(--text-primary); line-height: 1.15;">${value}</div>
      </div>
      <svg width="16" height="16" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  `;
}

// Tarjeta contextual: un solo espacio con prioridad Ritual pendiente (solo
// antes de las 12:00) > aviso de respaldo > "Hoy toca" de Entreno. "Después"
// oculta esa tarjeta hasta mañana (ver ocultarHoy) y deja pasar a la
// siguiente en la prioridad.
async function renderTarjetaContextual({ hayDatosReales, diasDesdeBackup, sesiones }) {
  const hoy = diaKeyDe(new Date());

  const tarjeta = ({ tipo, color, eyebrow, titulo, detalle, accion }) => `
    <div id="ctx-card" data-tipo="${tipo}" class="card card-hero" style="padding: 14px 16px; margin-bottom: 14px;">
      <div class="num" style="font-size: 10px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">${eyebrow}</div>
      <div style="font-size: 16px; font-weight: 800; color: var(--text-primary); line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${titulo}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">${detalle}</div>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button id="ctx-accion" class="tappable" style="flex: 1; background: ${color}; color: #000; border: none; padding: 10px; font-size: 13px; font-weight: 700; cursor: pointer;">${accion}</button>
        <button id="ctx-despues" class="tappable" style="background: transparent; border: 1px solid var(--surface-border); color: var(--text-secondary); padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer;" aria-label="Ocultar hasta mañana">Después</button>
      </div>
    </div>`;

  if (new Date().getHours() < 12 && !ocultaHoy('ritual')) {
    const p = await db.getProgresoRitual(hoy);
    if (!p.completo) {
      return tarjeta({
        tipo: 'ritual',
        color: 'var(--accent-ritual)',
        eyebrow: 'Ritual de hoy',
        titulo: 'Tu ritual está pendiente',
        detalle: `${p.hechos} de ${p.total} campos completados. Empieza el día con intención.`,
        accion: 'Hacer ritual'
      });
    }
  }

  if (hayDatosReales && backupNecesitaAviso(diasDesdeBackup) && !ocultaHoy('backup')) {
    const esAlertaRoja = diasDesdeBackup !== null && diasDesdeBackup > BACKUP_ALERTA_ROJA_DIAS;
    return tarjeta({
      tipo: 'backup',
      color: esAlertaRoja ? 'var(--state-high)' : 'var(--state-medium)',
      eyebrow: 'Respaldo',
      titulo: diasDesdeBackup === null
        ? 'Nunca has exportado un respaldo'
        : `Hace ${diasDesdeBackup} días sin respaldo`,
      detalle: 'Tus datos viven solo en este teléfono. Sin respaldo, se pierden si borras la app o cambias de equipo.',
      accion: 'Exportar respaldo'
    });
  }

  if (!ocultaHoy('hoytoca')) {
    const rutina = await calcularHoyToca(sesiones);
    if (rutina) {
      const catNames = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };
      return tarjeta({
        tipo: 'hoytoca',
        color: 'var(--cy)',
        eyebrow: 'Hoy toca',
        titulo: escapeHtml(rutina.nombre),
        detalle: escapeHtml(catNames[rutina.categoria] || rutina.categoria),
        accion: 'Ir a entrenar'
      });
    }
  }

  return '';
}

export async function render() {
  const hoyIso = diaKeyDe(new Date());
  const [budget, stats, sesiones, rachaGlobal, habitos, tareas, notas, categoriasNota, alertasCaja, diasDesdeBackup, planHoy] = await Promise.all([
    db.getBudget(),
    db.getDashboardStats(),
    db.getSesiones(),
    db.getRachaGlobal(),
    db.getHabitos(),
    db.getTasks(),
    db.getNotas(),
    db.getCategoriasNota(),
    db.getProyeccionRecurrentes(),
    getDiasDesdeUltimoBackup(),
    db.getTareasPlan(hoyIso, hoyIso)
  ]);

  let alertasHtml = '';
  if (alertasCaja && alertasCaja.length > 0) {
    alertasHtml = `
      <div class="card" style="padding: 16px; margin-bottom: 20px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; gap: 14px;">
        <div class="icon-chip" style="width: 36px; height: 36px; background: rgba(239, 68, 68, 0.18); color: var(--state-high); flex-shrink: 0;">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 12px; font-weight: 700; color: var(--state-high); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Alerta de flujo de caja (7 días)</div>
          ${alertasCaja.map(a => `<div style="font-size: 12px; color: var(--text-primary); margin-top:4px; line-height: 1.4;">El pago <b>${escapeHtml(a.name)}</b> (${formatCurrency(a.amount)}) excederá el saldo del sobre <b>${escapeHtml(a.envelopeName)}</b>. Faltan ${formatCurrency(a.shortfall)}.</div>`).join('')}
        </div>
      </div>
    `;
  }


  // Sin esto, alguien que recién instaló la app y todavía no cargó nada
  // ve el aviso de respaldo cuando no hay nada real que respaldar.
  // Reutiliza datos que este render() ya pidió arriba, sin consultas nuevas.
  const hayDatosReales = sesiones.length > 0 || habitos.length > 0 || tareas.length > 0 || budget.breakdown.length > 0;
  const tarjetaContextualHtml = await renderTarjetaContextual({ hayDatosReales, diasDesdeBackup, sesiones });

  const installBannerHtml = debeMostrarBannerInstalar() ? `
    <div id="install-banner" class="card" style="padding: 14px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
      <div class="icon-chip" style="width: 36px; height: 36px; background: rgba(92, 225, 230, 0.15); color: var(--cy); flex-shrink: 0;">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Instalar Vanguard en tu teléfono</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Acceso directo desde tu pantalla de inicio.</div>
      </div>
      <button id="btn-install-app" class="tappable" style="background: var(--cy); color: #000; border: none; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer; flex-shrink: 0; white-space: nowrap;">Instalar</button>
      <button id="btn-dismiss-install" class="tappable" style="background: transparent; border: none; color: var(--text-disabled); cursor: pointer; padding: 4px; flex-shrink: 0;" aria-label="Cerrar">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  ` : '';


  const habitosMarcadosHoy = habitos.filter(h => h.marcas && h.marcas[hoyIso]).length;
  const tareasActivas = tareas.filter(t => t.status !== 'done').length;

  const fechaLarga = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  const ultimaNota = notas[0] || null;
  const catUltimaNota = ultimaNota ? categoriasNota.find(c => c.id === ultimaNota.catId) : null;

  const agendaHtml = renderAgenda({
    tareasHoy: tareas.filter(t => t.status !== 'done' && t.dueDate === hoyIso),
    planHoy: planHoy.filter(t => !t.hecha),
    habitosPend: habitos.filter(h => habitoPendienteHoy(h, hoyIso)),
    hoyIso
  });

  const quickBtn = (id, color, label, iconSvg, extra = '') => `
    <button id="${id}" ${extra} class="tappable card" style="flex: 1; min-width: 0; padding: 10px 4px; font-size: 12px; font-weight: 700; color: var(--text-primary); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; margin-bottom: 0;">
      <div class="icon-chip" style="width: 28px; height: 28px; background: color-mix(in srgb, ${color} 15%, transparent); color: ${color}; flex-shrink: 0;">${iconSvg}</div>
      ${label}
    </button>`;

  return `
    <div style="padding: 16px 20px 8px; color: var(--text-primary);">

      <!-- Encabezado compacto: saludo, fecha y chip de racha (el botón ☰ es
           el del encabezado global de la app, ver index.html). -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px;">
        <div style="min-width: 0;">
          <h1 style="font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.4px;">${saludoPorHora()}, Benjamín</h1>
          <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">${escapeHtml(fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1))}</div>
        </div>
        <button id="chip-racha" class="tappable" aria-label="Racha de ${rachaGlobal.actual} ${rachaGlobal.actual === 1 ? 'día' : 'días'}. Ver hábitos" style="flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 12px; font-weight: 700; padding: 6px 12px 6px 10px; border-radius: 999px; cursor: pointer;">
          🔥 <span class="num">${rachaGlobal.actual}</span>
        </button>
      </div>

      ${tarjetaContextualHtml}

      <!-- Accesos rápidos -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        ${quickBtn('qa-gasto', 'var(--am)', 'Gasto', '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>')}
        ${quickBtn('qa-entreno', 'var(--cy)', 'Entrenar', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>')}
        ${quickBtn('qa-tarea', 'var(--vi)', 'Tarea', '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>')}
        ${quickBtn('qa-nota', 'var(--accent-notas)', 'Nota', '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"></path><path d="M14 4v6h6"></path></svg>', `data-cat="${ultimaNota ? ultimaNota.catId : ''}"`)}
      </div>

      ${alertasHtml}

      <!-- Agenda de hoy: tareas con fecha de hoy + hábitos pendientes -->
      ${agendaHtml}

      <!-- Filas heroicas por módulo -->
      <div style="margin-bottom: 20px;">
        ${renderHeroicRow({
          id: 'row-entreno',
          color: 'var(--cy)',
          label: 'Entreno',
          value: `${stats.sesionesSemana} ${stats.sesionesSemana === 1 ? 'sesión' : 'sesiones'} esta semana`
        })}
        ${renderHeroicRow({
          id: 'row-finanzas',
          color: 'var(--am)',
          label: 'Finanzas',
          value: `${formatCurrency(Math.max(0, budget.remaining))} disponibles`
        })}
        ${renderHeroicRow({
          id: 'row-tareas',
          color: 'var(--vi)',
          label: 'Tareas',
          value: `${tareasActivas} activa${tareasActivas === 1 ? '' : 's'}`
        })}
        ${renderHeroicRow({
          id: 'row-habitos',
          color: 'var(--vi)',
          label: 'Hábitos',
          value: habitos.length === 0
            ? 'Sin hábitos todavía'
            : `${habitosMarcadosHoy}/${habitos.length} marcados hoy`
        })}
        ${renderHeroicRow({
          id: 'row-anotaciones',
          color: 'var(--accent-notas)',
          label: 'Anotaciones',
          value: notas.length === 0
            ? 'Sin notas todavía'
            : `${notas.length} ${notas.length === 1 ? 'nota' : 'notas'} en ${categoriasNota.length} ${categoriasNota.length === 1 ? 'categoría' : 'categorías'}`
        })}
      </div>


      <!-- Laboratorio: en Inicio solo el gráfico más destacado (distribución
           de gasto del mes — Entreno ya tiene su propio espacio arriba, en
           el reactor/CTA), no el selector de módulo+pestaña completo de
           antes. La versión completa de los 4 módulos vive en Más >
           Laboratorio (views/laboratorio.js). El contenido (datos +
           Chart.js) se llena en mountListeners() — ver refreshLab() ahí. -->
      <div style="margin-bottom: 20px;">
        <div class="flex-between" style="margin: 0 0 4px 0;">
          <h2 style="font-size: 18px; font-weight: 800; margin: 0; color: var(--text-primary);">Laboratorio</h2>
          <a href="#laboratorio" style="font-size: 12.5px; font-weight: 700; color: var(--cy); text-decoration: none;">Ver todo →</a>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 14px 0;">Tu distribución de gasto del mes.</p>
        <div id="lab-section-content">
          <div class="card" style="padding: 40px 20px; text-align: center; color: var(--text-disabled); font-size: 12px;">Cargando…</div>
        </div>
      </div>


      <!-- Última nota -->
      ${ultimaNota ? `
        <div id="ultima-nota" class="card tappable" style="padding: 14px 16px; margin-bottom: 20px; cursor: pointer;">
          <div class="num" style="font-size: 10px; font-weight: 700; color: var(--accent-notas); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Última nota${catUltimaNota ? ` · ${escapeHtml(catUltimaNota.nombre)}` : ''}</div>
          <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${escapeHtml(ultimaNota.titulo || 'Sin título')}</div>
          ${ultimaNota.texto ? `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(ultimaNota.texto)}</div>` : ''}
        </div>
      ` : ''}

      <!-- Captura rápida global — <form> a propósito, no un div + keydown:
           ver commit 4396aa1 (mismo fix que "Agregar gasto rápido" de
           Finanzas). Un <input> solo dentro de un <form> ya dispara
           "submit" en Enter/Ir/Listo sin necesitar un botón visible. -->
      <div style="margin-bottom: 20px;">
        <form id="quick-capture-form" onsubmit="return false;">
          <div style="position: relative;">
            <svg style="position: absolute; left: 16px; top: 15px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7 7 7-7"></path></svg>
            <input type="text" id="quick-capture-input" placeholder="Anota algo — tarea o gasto (ej. &quot;50 en super&quot;)..." enterkeyhint="go" style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 16px; padding: 13px 20px 13px 44px; color: var(--text-primary); font-size: 16px; outline: none; box-sizing: border-box;" autocomplete="off">
          </div>
        </form>
        <div id="quick-capture-hint" style="font-size: 11px; color: var(--text-disabled); margin-top: 6px; padding-left: 4px; min-height: 14px;"></div>
        <div id="quick-capture-sobre-opciones" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;"></div>
      </div>


      ${installBannerHtml}

      ${renderTaskForm()}

      <!-- Progreso de un hábito numérico desde la agenda -->
      <div id="hoy-progreso-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="hoy-prog-titulo">
        <div class="modal-content">
          <h2 id="hoy-prog-titulo" style="margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: var(--text-primary);">Registrar progreso</h2>
          <div id="hoy-prog-detalle" style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;"></div>
          <form id="hoy-prog-form" onsubmit="return false;">
            <input id="hoy-prog-cantidad" type="number" inputmode="decimal" min="0" step="any" placeholder="Cantidad a sumar" autocomplete="off" style="width: 100%; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 14px; font-size: 16px; font-family: inherit; box-sizing: border-box; outline: none;">
            <div style="display: flex; gap: 8px; margin-top: 14px;">
              <button type="button" id="hoy-prog-cancelar" class="tappable" style="flex: 1; background: transparent; border: 1px solid var(--surface-border); color: var(--text-secondary); padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer;">Cancelar</button>
              <button type="submit" id="hoy-prog-guardar" class="tappable" style="flex: 1; background: var(--vi); color: #000; border: none; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer;">Sumar</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `;
}

export function mountListeners() {
  const go = (view) => {
    if (window.appRouter) window.appRouter.navigate(view);
  };
  const refresh = () => { if (window.appRouter) window.appRouter.navigate('dashboard'); };

  // Antes se difería con un IntersectionObserver hasta que el contenedor
  // entraba al viewport (tenía sentido cuando acá vivía el selector
  // completo de módulo+pestaña). Con el recorte a un solo gráfico, ya
  // renderiza directo: es liviano, y queda a un scroll mínimo del reactor
  // — total, casi cualquier usuario lo ve enseguida. Directo también evita
  // depender de que el observer efectivamente dispare (no reprodujimos un
  // caso donde no lo hacía, pero tampoco hay forma de descartarlo del
  // todo sin el dispositivo real, y acá ya no hay costo que justifique el
  // riesgo). Si falla, muestra un estado de error en vez de quedarse
  // pegado en "Cargando…" para siempre.
  const refreshLab = async () => {
    const labContent = document.getElementById('lab-section-content');
    if (!labContent) return;
    try {
      labContent.innerHTML = await LabFinanzas.renderTab('desglose');
      LabFinanzas.initTabListeners('desglose', refreshLab);
    } catch (err) {
      console.error('Error al cargar el Laboratorio de Inicio:', err);
      labContent.innerHTML = `<div class="card" style="padding: 24px 20px; text-align: center; color: var(--text-secondary); font-size: 12.5px;">No se pudo cargar el gráfico. Probá de nuevo desde Más &gt; Laboratorio.</div>`;
    }
  };
  // Carga diferida: recién cuando la sección entra en pantalla. Con el
  // Laboratorio bajo la tarjeta contextual, los accesos y los resúmenes,
  // cargarlo de entrada bajaba Chart.js sin que nadie lo viera. Sin
  // IntersectionObserver (navegadores muy viejos) se carga directo.
  const labContainer = document.getElementById('lab-section-content');
  if (labContainer && 'IntersectionObserver' in window) {
    labObserver = new IntersectionObserver((entries) => {
      if (!entries.some(e => e.isIntersecting)) return;
      labObserver.disconnect();
      labObserver = null;
      refreshLab();
    });
    labObserver.observe(labContainer);
  } else {
    refreshLab();
  }

  // Tarjeta contextual: el botón principal depende del tipo; "Después" la
  // oculta hasta mañana y el re-render deja pasar a la siguiente.
  const ctx = document.getElementById('ctx-card');
  if (ctx) {
    const tipo = ctx.getAttribute('data-tipo');
    document.getElementById('ctx-accion').addEventListener('click', async () => {
      if (tipo === 'ritual') go('ritual');
      else if (tipo === 'backup') { await exportAllData(); refresh(); } // diasDesdeUltimoBackup ya quedó en 0 — la tarjeta se saca sola al re-renderizar
      else go('entrenamiento');
    });
    document.getElementById('ctx-despues').addEventListener('click', () => {
      ocultarHoy(tipo);
      refresh();
    });
  }
  const chipRacha = document.getElementById('chip-racha');
  if (chipRacha) chipRacha.addEventListener('click', () => go('habitos'));
  const ultimaNotaEl = document.getElementById('ultima-nota');
  if (ultimaNotaEl) ultimaNotaEl.addEventListener('click', () => go('anotaciones'));

  const btnInstallApp = document.getElementById('btn-install-app');
  const btnDismissInstall = document.getElementById('btn-dismiss-install');
  if (btnInstallApp) {
    btnInstallApp.addEventListener('click', async () => {
      const evt = window.__vgInstall && window.__vgInstall.deferredPrompt;
      if (!evt) return;
      evt.prompt();
      const choice = await evt.userChoice;
      window.__vgInstall.deferredPrompt = null;
      if (choice.outcome === 'accepted') {
        Toast('Vanguard instalada', 'success');
      } else {
        // Rechazó el prompt nativo del navegador — cuenta como descarte
        // igual que el botón de cerrar, para no insistir de nuevo enseguida.
        try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch (e) { /* modo privado */ }
      }
      const banner = document.getElementById('install-banner');
      if (banner) banner.remove();
    });
  }
  if (btnDismissInstall) {
    btnDismissInstall.addEventListener('click', () => {
      try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch (e) { /* modo privado */ }
      const banner = document.getElementById('install-banner');
      if (banner) banner.remove();
    });
  }

  // Agenda: marcar en línea con las mismas funciones de db.js que usan
  // Tareas, Semana y Hábitos (cada una emite su logEvent).
  document.querySelectorAll('.agenda-check').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tipo = btn.getAttribute('data-tipo');
      const id = btn.getAttribute('data-id');
      if (tipo === 'habito-num') { abrirProgreso(btn); return; }
      btn.disabled = true;
      try {
        if (tipo === 'tarea') await db.updateTaskStatus(id, 'done');
        else if (tipo === 'plan') await db.toggleTareaPlan(id);
        else await db.toggleMarcaHabito(id, diaKeyDe(new Date()));
        await repintar();
      } catch (err) {
        console.error('Error al marcar desde la agenda:', err);
        Toast('No se pudo guardar — inténtalo de nuevo.', 'error');
        btn.disabled = false;
      }
    });
  });

  // Hábito numérico: el modal suma la cantidad ingresada a lo que ya lleva
  // hoy y guarda el total con registrarProgresoHabito (que emite su
  // logEvent con la cantidad). Si el total llega a la meta, el hábito sale
  // de la agenda al repintar; si no, queda con el avance (ej. 5/20).
  const progModal = document.getElementById('hoy-progreso-modal');
  const progInput = document.getElementById('hoy-prog-cantidad');
  const progForm = document.getElementById('hoy-prog-form');
  const progGuardar = document.getElementById('hoy-prog-guardar');
  let progreso = null;

  const cerrarProgreso = () => {
    if (!progModal.classList.contains('open')) return;
    progModal.classList.remove('open');
    progModal.style.display = 'none';
  };
  function abrirProgreso(btn) {
    progreso = {
      id: btn.getAttribute('data-id'),
      actual: Number(btn.getAttribute('data-actual')) || 0,
      meta: Number(btn.getAttribute('data-meta')) || 0,
      unidad: btn.getAttribute('data-unidad') || ''
    };
    const nombre = btn.getAttribute('data-nombre') || '';
    document.getElementById('hoy-prog-detalle').textContent =
      `${nombre} · llevas ${progreso.actual}/${progreso.meta}${progreso.unidad ? ' ' + progreso.unidad : ''}`;
    progInput.value = '';
    progGuardar.disabled = false;
    progModal.style.display = 'flex';
    progModal.classList.add('open');
    setTimeout(() => progInput.focus(), 50);
  }
  if (progModal) {
    progModal.addEventListener('click', (e) => { if (e.target === progModal) cerrarProgreso(); });
    document.getElementById('hoy-prog-cancelar').addEventListener('click', cerrarProgreso);
    progForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cantidad = Number(String(progInput.value).replace(',', '.'));
      if (!progreso || !(cantidad > 0)) { progInput.focus(); return; }
      const total = progreso.actual + cantidad;
      progGuardar.disabled = true;
      try {
        await db.registrarProgresoHabito(progreso.id, diaKeyDe(new Date()), total);
        cerrarProgreso();
        Toast(total >= progreso.meta ? 'Meta cumplida' : 'Progreso guardado', 'success');
        await repintar();
      } catch (err) {
        console.error('Error al registrar progreso desde la agenda:', err);
        Toast('No se pudo guardar — inténtalo de nuevo.', 'error');
        progGuardar.disabled = false;
      }
    });
  }

  // Formulario de tarea existente (components/task-form.js), montado acá.
  setupTaskForm(repintar);
  const qaTarea = document.getElementById('qa-tarea');
  if (qaTarea) qaTarea.addEventListener('click', () => openTaskForm());

  // "Nota": abre el formulario de nota nueva de Anotaciones, en la
  // categoría de la última nota (o la primera).
  const qaNota = document.getElementById('qa-nota');
  if (qaNota) {
    qaNota.addEventListener('click', async () => {
      const cats = await db.getCategoriasNota();
      const cat = cats.find(c => c.id === qaNota.getAttribute('data-cat')) || cats[0];
      if (cat) Anotaciones.abrirCategoria(cat.id);
      go('anotaciones');
    });
  }

  const qaGasto = document.getElementById('qa-gasto');
  const qaEntreno = document.getElementById('qa-entreno');
  const rowEntreno = document.getElementById('row-entreno');
  const rowFinanzas = document.getElementById('row-finanzas');
  const rowTareas = document.getElementById('row-tareas');
  const rowHabitos = document.getElementById('row-habitos');
  const rowAnotaciones = document.getElementById('row-anotaciones');

  if (qaGasto) qaGasto.addEventListener('click', () => go('finanzas'));
  if (qaEntreno) qaEntreno.addEventListener('click', () => go('entrenamiento'));
  if (rowEntreno) rowEntreno.addEventListener('click', () => go('entrenamiento'));
  if (rowFinanzas) rowFinanzas.addEventListener('click', () => go('finanzas'));
  if (rowTareas) rowTareas.addEventListener('click', () => go('tareas'));
  if (rowHabitos) rowHabitos.addEventListener('click', () => go('habitos'));
  if (rowAnotaciones) rowAnotaciones.addEventListener('click', () => go('anotaciones'));

  // Captura rápida: si el texto trae un monto, se registra como gasto
  // (mismo parser que "Agregar gasto rápido" de Finanzas); si no, se crea
  // como tarea. Dos destinos nada más — evita inventar un "log de nota
  // libre" de Entreno que la app no tiene forma estructurada de guardar.
  const quickInput = document.getElementById('quick-capture-input');
  const quickHint = document.getElementById('quick-capture-hint');
  const quickOpciones = document.getElementById('quick-capture-sobre-opciones');

  const limpiarCapturaRapida = () => {
    quickInput.value = '';
    quickHint.textContent = '';
    if (quickOpciones) quickOpciones.innerHTML = '';
  };

  const registrarGasto = async (parsed, env) => {
    await db.addTransaction({
      type: 'Gasto',
      category: env ? env.category : 'Needs',
      label: parsed.label || 'Gasto',
      amount: parsed.amount,
      envelopeId: env ? env.id : null,
      goalId: null
    });
    Toast(`Gasto de ${formatCurrency(parsed.amount)} registrado`, 'success');
    limpiarCapturaRapida();
    refresh();
  };

  // Cuando el texto matchea más de un sobre (ej. "Auto" y "Autopista" con
  // "15000 en auto"), no elegimos por el usuario — se muestran los sobres
  // encontrados como opciones y que confirme cuál es, mismo criterio que ya
  // usa Finanzas (ahí abre el formulario completo para desambiguar; acá, al
  // no vivir ese modal en Inicio, se resuelve inline).
  const mostrarSelectorDeSobre = (parsed) => {
    if (!quickOpciones) return;
    quickHint.textContent = 'Encontré más de un sobre posible — elegí cuál es:';
    quickOpciones.innerHTML = parsed.matches.map((env, i) => `
      <button type="button" class="tappable qa-sobre-opcion" data-idx="${i}" style="background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer;">${escapeHtml(env.name)}</button>
    `).join('');
    quickOpciones.querySelectorAll('.qa-sobre-opcion').forEach(btn => {
      btn.addEventListener('click', () => registrarGasto(parsed, parsed.matches[Number(btn.dataset.idx)]));
    });
  };

  const submitQuickCapture = async () => {
    const text = quickInput.value.trim();
    if (!text) return;
    if (quickOpciones) quickOpciones.innerHTML = '';

    // El monto tiene que ir AL PRINCIPIO ("50 en super", el ejemplo del
    // placeholder) — un dígito en cualquier parte del texto (ej. "Comprar
    // 2 entradas") mandaba tareas comunes a Finanzas como gasto.
    const amountFound = /^\$?\s*\d/.test(text);
    if (amountFound) {
      const budget = await db.getBudget();
      const parsed = parseQuickGasto(text, budget.envelopes);
      if (!parsed) {
        quickHint.textContent = 'No encontré un monto válido';
        return;
      }
      if (parsed.matches.length > 1) {
        mostrarSelectorDeSobre(parsed);
        return;
      }
      await registrarGasto(parsed, parsed.matches[0] || null);
      return;
    } else {
      await db.saveTask({ title: text, status: 'todo', priority: 'medium' });
      Toast('Tarea creada', 'success');
    }
    limpiarCapturaRapida();
    refresh();
  };
  bindQuickCaptureForm(document.getElementById('quick-capture-form'), submitQuickCapture);
}
