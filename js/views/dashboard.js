import { db } from '../core/db.js';
import { formatCurrency } from '../utils/currency.js';
import { WEEKLY_GOALS } from '../core/trainingConfig.js';
import { Toast } from '../utils/states.js';
import { parseQuickGasto } from './finanzas.js';
import { escapeHtml } from '../utils/escape.js';
import { exportAllData, getDiasDesdeUltimoBackup } from '../utils/backup.js';

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
// su cuenta a esa pantalla. Se puede posponer 7 días (no cerrar para
// siempre): mismo motivo que el snooze de instalación, timestamp en
// localStorage porque es una preferencia de UI, no dato de la app.
const BACKUP_SNOOZE_KEY = 'vg-backup-snoozed-at';
const BACKUP_SNOOZE_DIAS = 7;
const BACKUP_AVISO_DIAS = 14;
const BACKUP_ALERTA_ROJA_DIAS = 30;

function backupNecesitaAviso(diasDesdeBackup) {
  return diasDesdeBackup === null || diasDesdeBackup > BACKUP_AVISO_DIAS;
}

function avisoBackupPospuesto() {
  try {
    const snoozedAt = localStorage.getItem(BACKUP_SNOOZE_KEY);
    if (!snoozedAt) return false;
    const diasDesde = (Date.now() - Number(snoozedAt)) / (1000 * 60 * 60 * 24);
    return diasDesde < BACKUP_SNOOZE_DIAS;
  } catch (e) { return false; /* modo privado — mostrar el aviso igual */ }
}

// Insignias sobrias: sin niveles, sin copy de videojuego. Bloqueada = ícono
// de candado atenuado en gris; desbloqueada = ícono propio con el color de
// acento del módulo al que pertenece (Vanguard MK III). racha_7 no
// pertenece a ningún módulo en particular (es la racha global del
// reactor), así que se queda con el naranja de "fuego" que ya tenía;
// mes_sin_exceder se queda en el verde de éxito, que ya era un semántico
// aparte del acento de marca.
const BADGE_META = {
  racha_7: { icon: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>`, color: 'var(--accent-orange)' },
  primera_meta: { icon: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>`, color: 'var(--am)' },
  mes_sin_exceder: { icon: `<circle cx="12" cy="12" r="10"></circle><polyline points="9 12 11 14 15 10"></polyline>`, color: 'var(--state-success)' },
  diez_sesiones: { icon: `<path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><rect x="4" y="2" width="4" height="20" rx="1"></rect><rect x="16" y="2" width="4" height="20" rx="1"></rect>`, color: 'var(--cy)' }
};

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

// --- Reactor: tres anillos concéntricos de progreso (uno por módulo) más
// un hexágono central de líneas finas con la racha global. Mismo principio
// matemático que progressRing.js (círculo de fondo + arco vía
// stroke-dasharray/dashoffset), pero con tres anillos en un mismo SVG y el
// texto superpuesto en HTML encima (más simple que centrar dos líneas de
// texto dentro del SVG). "Avance del día" se aproxima con la métrica de
// progreso más cercana que ya calcula cada módulo: Entreno usa el avance
// de la meta semanal de sesiones (no hay meta diaria en la app), Finanzas
// usa el % del presupuesto del mes ya gastado, Tareas usa el % de tareas
// completadas sobre el total.
function renderReactor({ cyPct, amPct, viPct, rachaGlobal }) {
  const size = 220;
  const c = 110;
  const rings = [
    { r: 96, sw: 10, pct: cyPct, color: 'var(--cy)', track: 'var(--cyb)' },
    { r: 78, sw: 10, pct: amPct, color: 'var(--am)', track: 'var(--amb)' },
    { r: 60, sw: 10, pct: viPct, color: 'var(--vi)', track: 'var(--vib)' }
  ];

  const ringsHtml = rings.map(ring => {
    const circumference = 2 * Math.PI * ring.r;
    const clamped = Math.max(0, Math.min(100, ring.pct));
    const offset = circumference - (clamped / 100) * circumference;
    return `
      <circle cx="${c}" cy="${c}" r="${ring.r}" fill="none" stroke="${ring.track}" stroke-width="${ring.sw}"></circle>
      <circle cx="${c}" cy="${c}" r="${ring.r}" fill="none" stroke="${ring.color}" stroke-width="${ring.sw}"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
        style="transition: stroke-dashoffset 0.6s ease;"></circle>
    `;
  }).join('');

  const hexR = 44;
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (-90 + i * 60) * Math.PI / 180;
    return `${(c + hexR * Math.cos(angle)).toFixed(2)},${(c + hexR * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');

  return `
    <div style="position: relative; width: ${size}px; height: ${size}px; margin: 0 auto;">
      <svg role="img" aria-label="Racha de ${rachaGlobal.actual} día${rachaGlobal.actual === 1 ? '' : 's'}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
        ${ringsHtml}
        <polygon points="${hexPoints}" fill="none" stroke="var(--t3)" stroke-width="1.5"></polygon>
      </svg>
      <div aria-hidden="true" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
        <div class="num" style="font-size: 36px; font-weight: 800; color: var(--t1); line-height: 1;">${rachaGlobal.actual}</div>
        <div style="font-size: 10px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: 2.5px; margin-top: 5px;">Racha</div>
      </div>
    </div>
  `;
}

// Fila heroica compacta: barra de color lateral + una sola métrica grande,
// nada más — reemplaza a las dos tarjetas grandes (círculo de progreso /
// ícono de billetera) de la versión anterior.
function renderHeroicRow({ id, color, label, value }) {
  return `
    <div id="${id}" class="card tappable" style="display: flex; align-items: center; gap: 14px; padding: 15px 16px; margin-bottom: 10px; border-left: 3px solid ${color}; cursor: pointer;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">${label}</div>
        <div class="num" style="font-size: 19px; font-weight: 800; color: var(--text-primary); line-height: 1.15;">${value}</div>
      </div>
      <svg width="16" height="16" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  `;
}

// Insignia como celda de panal hexagonal (clase .mk3-hex, ver
// components.css). Bloqueada = candado atenuado; desbloqueada = ícono
// propio con el color de su módulo.
function renderBadgeHex(b) {
  const meta = BADGE_META[b.id];
  const bg = b.unlocked ? `${meta.color}22` : 'var(--surface-2)';
  const fg = b.unlocked ? meta.color : 'var(--text-disabled)';
  const icon = b.unlocked
    ? `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">${meta.icon}</svg>`
    : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`;
  return `
    <div title="${b.label}" style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 68px; text-align: center;">
      <div class="mk3-hex" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: ${bg}; color: ${fg};">
        ${icon}
      </div>
      <div style="font-size: 9.5px; font-weight: 600; color: ${b.unlocked ? 'var(--text-secondary)' : 'var(--text-disabled)'}; line-height: 1.25;">${b.label}</div>
    </div>
  `;
}

export async function render() {
  const [budget, stats, sesiones, resumenSemanal, racha, rachaGlobal, badges, tareas] = await Promise.all([
    db.getBudget(),
    db.getDashboardStats(),
    db.getSesiones(),
    db.getResumenEntrenoSemanal(),
    db.getRachaGeneral(),
    db.getRachaGlobal(),
    db.getBadges(),
    db.getTasks()
  ]);

  const sesionesSemanaTotal = Object.values(resumenSemanal).reduce((a, b2) => a + b2, 0);
  const metaSemanaTotal = Object.values(WEEKLY_GOALS).reduce((a, b2) => a + b2, 0);

  const ultimoEntreno = sesiones[0] || null;
  const usado = budget.expenses + budget.savedThisMonth;
  const alertasCaja = await db.getProyeccionRecurrentes();

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

  const diasDesdeBackup = await getDiasDesdeUltimoBackup();
  const backupReminderHtml = (backupNecesitaAviso(diasDesdeBackup) && !avisoBackupPospuesto()) ? (() => {
    const esAlertaRoja = diasDesdeBackup !== null && diasDesdeBackup > BACKUP_ALERTA_ROJA_DIAS;
    const color = esAlertaRoja ? 'var(--state-high)' : 'var(--state-medium)';
    const mensaje = diasDesdeBackup === null
      ? 'Nunca has exportado un respaldo'
      : esAlertaRoja
        ? `Hace más de ${BACKUP_ALERTA_ROJA_DIAS} días que no exportas un respaldo`
        : `Hace ${diasDesdeBackup} días que no exportas un respaldo`;
    return `
      <div id="backup-reminder" class="card" style="padding: 14px 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div class="icon-chip" style="width: 36px; height: 36px; background: ${color}22; color: ${color}; flex-shrink: 0;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 700; color: ${color};">${mensaje}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Tus datos viven solo en este teléfono. Sin respaldo, se pierden si borras la app o cambias de equipo.</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-backup-export-inicio" class="tappable" style="flex: 1; background: ${color}; color: #000; border: none; padding: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">Exportar respaldo</button>
          <button id="btn-backup-snooze" class="tappable" style="background: transparent; border: 1px solid var(--surface-border); color: var(--text-secondary); padding: 10px 14px; font-size: 12px; font-weight: 600; cursor: pointer;" aria-label="Recordarme en 7 días">Después</button>
        </div>
      </div>
    `;
  })() : '';

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

  const pct = budget.budgeted > 0 ? Math.round((usado / budget.budgeted) * 100) : 0;
  const pctBar = Math.min(pct, 100);

  const cyPct = metaSemanaTotal > 0 ? Math.min(100, (sesionesSemanaTotal / metaSemanaTotal) * 100) : 0;
  const amPct = pctBar;
  const tareasCompletadas = tareas.filter(t => t.status === 'done').length;
  const tareasActivas = tareas.length - tareasCompletadas;
  const viPct = tareas.length > 0 ? (tareasCompletadas / tareas.length) * 100 : 0;

  const rachaSubtitle = stats.rachaSemanas > 0
    ? `${stats.rachaSemanas} semana${stats.rachaSemanas === 1 ? '' : 's'} de racha en Entreno`
    : 'Empieza tu semana con una sesión';

  return `
    <div style="padding: 20px 20px 8px; color: var(--text-primary);">

      <!-- Greeting -->
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${saludoPorHora()}, Benjamín</h1>
        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600; margin-top: 4px;">${rachaSubtitle}</div>
      </div>

      ${alertasHtml}
      ${backupReminderHtml}
      ${installBannerHtml}

      <!-- Reactor: tres anillos (Entreno/Finanzas/Tareas) + racha global —
           tarjeta principal de Inicio, lleva chaflán (ver .card-hero). -->
      <div class="card card-hero" style="padding: 24px 18px; margin-bottom: 20px;">
        ${renderReactor({ cyPct, amPct, viPct, rachaGlobal })}
      </div>

      <!-- Insignias: panal hexagonal -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 2px;">
        ${badges.map(renderBadgeHex).join('')}
      </div>

      <!-- Quick Actions -->
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <button id="qa-gasto" class="tappable card" style="flex: 1; padding: 14px; font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; margin-bottom: 0;">
          <div class="icon-chip" style="width: 26px; height: 26px; background: rgba(255, 182, 39, 0.15); color: var(--am); flex-shrink: 0;">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          Registrar gasto
        </button>
        <button id="qa-entreno" class="tappable card" style="flex: 1; padding: 14px; font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; margin-bottom: 0;">
          <div class="icon-chip" style="width: 26px; height: 26px; background: rgba(92, 225, 230, 0.15); color: var(--cy); flex-shrink: 0;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          Entrenar ahora
        </button>
      </div>

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
      </div>

      <!-- Captura rápida global -->
      <div style="margin-bottom: 20px;">
        <div style="position: relative;">
          <svg style="position: absolute; left: 16px; top: 15px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7 7 7-7"></path></svg>
          <input type="text" id="quick-capture-input" placeholder="Anota algo — tarea o gasto (ej. &quot;50 en super&quot;)..." style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 16px; padding: 13px 20px 13px 44px; color: var(--text-primary); font-size: 16px; outline: none; box-sizing: border-box;" autocomplete="off">
        </div>
        <div id="quick-capture-hint" style="font-size: 11px; color: var(--text-disabled); margin-top: 6px; padding-left: 4px; min-height: 14px;"></div>
      </div>

    </div>
  `;
}

export function mountListeners() {
  const go = (view) => {
    if (window.appRouter) window.appRouter.navigate(view);
  };
  const refresh = () => { if (window.appRouter) window.appRouter.navigate('dashboard'); };

  const btnBackupExport = document.getElementById('btn-backup-export-inicio');
  const btnBackupSnooze = document.getElementById('btn-backup-snooze');
  if (btnBackupExport) {
    btnBackupExport.addEventListener('click', async () => {
      await exportAllData();
      refresh(); // diasDesdeUltimoBackup ya quedó en 0 — el aviso se saca solo al re-renderizar
    });
  }
  if (btnBackupSnooze) {
    btnBackupSnooze.addEventListener('click', () => {
      try { localStorage.setItem(BACKUP_SNOOZE_KEY, String(Date.now())); } catch (e) { /* modo privado */ }
      const card = document.getElementById('backup-reminder');
      if (card) card.remove();
    });
  }

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

  const qaGasto = document.getElementById('qa-gasto');
  const qaEntreno = document.getElementById('qa-entreno');
  const rowEntreno = document.getElementById('row-entreno');
  const rowFinanzas = document.getElementById('row-finanzas');
  const rowTareas = document.getElementById('row-tareas');

  if (qaGasto) qaGasto.addEventListener('click', () => go('finanzas'));
  if (qaEntreno) qaEntreno.addEventListener('click', () => go('entrenamiento'));
  if (rowEntreno) rowEntreno.addEventListener('click', () => go('entrenamiento'));
  if (rowFinanzas) rowFinanzas.addEventListener('click', () => go('finanzas'));
  if (rowTareas) rowTareas.addEventListener('click', () => go('tareas'));

  // Captura rápida: si el texto trae un monto, se registra como gasto
  // (mismo parser que "Agregar gasto rápido" de Finanzas); si no, se crea
  // como tarea. Dos destinos nada más — evita inventar un "log de nota
  // libre" de Entreno que la app no tiene forma estructurada de guardar.
  const quickInput = document.getElementById('quick-capture-input');
  const quickHint = document.getElementById('quick-capture-hint');
  if (quickInput) {
    quickInput.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      const text = quickInput.value.trim();
      if (!text) return;

      const amountFound = /\d+(?:[.,]\d+)?/.test(text);
      if (amountFound) {
        const budget = await db.getBudget();
        const parsed = parseQuickGasto(text, budget.envelopes);
        if (!parsed) {
          quickHint.textContent = 'No encontré un monto válido';
          return;
        }
        const env = parsed.matches[0] || null;
        await db.addTransaction({
          type: 'Gasto',
          category: env ? env.category : 'Needs',
          label: parsed.label || 'Gasto',
          amount: parsed.amount,
          envelopeId: env ? env.id : null,
          goalId: null
        });
        Toast(`Gasto de ${formatCurrency(parsed.amount)} registrado`, 'success');
      } else {
        await db.saveTask({ title: text, status: 'todo', priority: 'medium' });
        Toast('Tarea creada', 'success');
      }
      quickInput.value = '';
      quickHint.textContent = '';
      refresh();
    });
  }
}
