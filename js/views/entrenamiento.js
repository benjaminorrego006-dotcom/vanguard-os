import { db } from '../core/db.js';
import { renderRutinasLista, initRutinasListaListeners, renderPlantillaPreview, initPlantillaPreviewListeners, renderGeneradorPreview, initGeneradorPreviewListeners } from '../components/rutinas-lista.js';
import { renderGeneradorConfigForm, setupGeneradorConfigForm, openGeneradorConfigForm } from '../components/generador-rutina-form.js';
import { renderRutinaForm, initRutinaFormListeners } from '../components/rutina-form.js';
import { renderHiitRutinaForm, initHiitRutinaFormListeners } from '../components/hiit-rutina-form.js';
import { renderRutinaSession, initRutinaSessionListeners, cleanupSessionTimer } from '../components/rutina-session.js';
import { renderHiitTimer, initHiitTimerListeners, cleanupHiitTimer } from '../components/hiit-timer.js';
import { renderProgressRing } from '../utils/progressRing.js';
import { WEEKLY_GOALS, CATEGORY_COLORS } from '../core/trainingConfig.js';
import { renderProfileForm, setupProfileForm, openProfileForm } from '../components/profile-form.js';
import { renderNivelOnboardingForm, setupNivelOnboardingForm, openNivelOnboardingForm } from '../components/nivel-onboarding-form.js';
import { calcularIMC } from '../utils/bodyMetrics.js';
import { cleanupEjercicioCharts } from '../components/ejercicio-detalle.js';
import { formatFechaCorta } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { detectarSugerenciaPendiente } from '../core/sugerencias-nivel.js';
import { Toast } from '../utils/states.js';
import { renderProgreso, initProgresoListeners, setContextoCategoria, cleanup as cleanupProgreso } from '../components/entreno-progreso.js';
import { renderMiniChart } from '../components/mini-chart.js';

// Placeholder hasta que exista el sistema de nivel del backlog (onboarding
// de nivel dedicado, filtrado de rutinas por nivel, detección automática de
// progreso por patrón de movimiento). Lo único que existe hoy es
// db.getNivelEntrenamiento() — tiempoEntrenando + overrides POR RAMA, no un
// nivel único — así que el pill muestra una lectura aproximada de eso, no
// un nivel "real" todavía.
const TIEMPO_ENTRENANDO_PILL = { 'menos-1': 'Nivel: recién empezando', '1-3': 'Nivel: intermedio', 'mas-3': 'Nivel: experimentado' };

let categoriaActiva = null;
let viewState = 'main'; // 'main', 'rutinas', 'form', 'session', 'progreso'
let rutinaActualId = null;
let currentViewController = null;

// Instalada como PWA no hay botón atrás del navegador — sin esto, el botón
// atrás del sistema saldría directo de la app en vez de volver a la
// pantalla principal de Entreno. Un solo nivel de historial para TODA la
// pila de sub-vistas (rutinas/form/preview/progreso/sesión): entrar
// a cualquiera de ellas desde 'main' empuja una entrada; volver a 'main'
// (desde donde sea de esa pila) la consume. No replica el stepping fino de
// un nivel a la vez que ya hace el botón "Volver" — el atrás del sistema
// es más predecible yendo directo al inicio de Entreno.
let entrenoHistorialEmpujado = false;
let entrenoPopstateEnganchado = false;
let entrenoRespondiendoAPopstate = false;

const NIVEL_SUGERIDO_LABEL = { intermedio: 'Intermedio', avanzado: 'Avanzado' };

// Banner "sugerencia de avance de nivel" (PROMPT-NIVEL-FILTRADO.md, paso
// 4/e): se calcula después de insertar el DOM, no durante render(), porque
// depende de una lectura de IndexedDB (historial + PRs) que no tiene
// sentido bloquear el primer pintado del dashboard. Nunca sube el nivel
// sola — solo arma la sugerencia con evidencia concreta; subir o descartar
// es una acción explícita del usuario.
async function renderSugerenciaNivelBanner() {
  const contenedor = document.getElementById('sugerencia-nivel-banner');
  if (!contenedor) return;

  const sugerencia = await detectarSugerenciaPendiente();
  if (!sugerencia) { contenedor.innerHTML = ''; return; }

  contenedor.innerHTML = `
    <div class="card" style="padding: 16px 18px; margin-bottom: 20px; border-radius: 18px; border: 1px solid var(--surface-border);">
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" stroke-width="2.3" viewBox="0 0 24 24" style="flex-shrink: 0; margin-top: 1px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Tu progreso en ${sugerencia.ramaLabel} ya es ${NIVEL_SUGERIDO_LABEL[sugerencia.nivelSugerido]}</div>
          <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; font-weight: 500;">${sugerencia.detalle}</div>
          <div style="display: flex; gap: 10px; margin-top: 12px;">
            <button id="btn-sugerencia-nivel-confirmar" class="tappable" style="background: var(--accent-teal); color: #000; border: none; padding: 9px 16px; font-weight: 700; font-size: 12.5px; cursor: pointer;">Sí, subir de nivel</button>
            <button id="btn-sugerencia-nivel-descartar" class="tappable" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--surface-border); padding: 9px 16px; font-weight: 600; font-size: 12.5px; cursor: pointer;">Ahora no</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-sugerencia-nivel-confirmar').addEventListener('click', async () => {
    await db.confirmarSugerenciaNivel(sugerencia.rama, sugerencia.nivelSugerido);
    Toast(`Subiste a ${NIVEL_SUGERIDO_LABEL[sugerencia.nivelSugerido]} en ${sugerencia.ramaLabel}`, 'success');
    renderSugerenciaNivelBanner();
  });
  document.getElementById('btn-sugerencia-nivel-descartar').addEventListener('click', async () => {
    await db.descartarSugerenciaNivel(sugerencia.rama, sugerencia.nivelSugerido);
    renderSugerenciaNivelBanner();
  });
}

export let mountListeners;

// Llamado por el router (app.js) antes de desmontar esta vista. Cubre la
// posible instancia de Chart.js viva de la pestaña Tendencia de Progreso, y
// si el usuario se va a otra pestaña de la barra lateral en medio de una
// sesión/timer en curso (en vez de tocar "Volver", el único lugar que hoy
// los limpiaba), el setInterval del cronómetro de sesión o del timer HIIT,
// que si no, sigue corriendo en segundo plano indefinidamente.
export function cleanup() {
  cleanupProgreso();
  cleanupEjercicioCharts();
  cleanupSessionTimer();
  cleanupHiitTimer();

  window.removeEventListener('popstate', onPopStateEntrenamiento);
  entrenoPopstateEnganchado = false;
  // Si había una sub-vista abierta con su entrada de historial empujada,
  // su nodo va a desaparecer con el innerHTML de la vista nueva sin pasar
  // por goToMain() — hay que soltar esa entrada (mismo criterio que
  // forgetOpenModals en history.js) para no dejar un "atrás" fantasma.
  if (entrenoHistorialEmpujado && history.state && history.state.entrenoSubView) {
    history.back();
  }
  entrenoHistorialEmpujado = false;
  viewState = 'main';
  categoriaActiva = null;
}

function onPopStateEntrenamiento(e) {
  if (viewState !== 'main' && (!e.state || !e.state.entrenoSubView)) {
    entrenoRespondiendoAPopstate = true;
    cleanupSessionTimer();
    cleanupHiitTimer();
    if (typeof window.__entrenoGoToMain === 'function') window.__entrenoGoToMain();
    entrenoRespondiendoAPopstate = false;
  }
}

// "Hoy toca": sugiere la categoría (y su primera rutina guardada) que
// lleva MÁS TIEMPO sin entrenarse — una rotación real (si hay una rutina
// por categoría tipo Push/Pull/Legs, esto las va turnando solas) sin
// necesitar todavía el sistema de nivel/split del backlog. Solo mira
// categorías donde el usuario ya tiene al menos una rutina guardada — no
// tiene sentido sugerir "hoy toca HIIT" si ni siquiera hay una rutina de
// HIIT creada.
async function calcularHoyToca(sesiones) {
  const rutinas = await db.getRutinas();
  if (rutinas.length === 0) return null;

  const rutinasPorId = {};
  rutinas.forEach(r => { rutinasPorId[r.id] = r; });

  const ultimaPorCategoria = {};
  sesiones.forEach(s => {
    const cat = rutinasPorId[s.rutinaId]?.categoria;
    if (!cat) return;
    if (!ultimaPorCategoria[cat] || new Date(s.fecha) > new Date(ultimaPorCategoria[cat])) {
      ultimaPorCategoria[cat] = s.fecha;
    }
  });

  const categoriasConRutina = [...new Set(rutinas.map(r => r.categoria))];
  const categoriaSugerida = categoriasConRutina.sort((a, b) => {
    const fa = ultimaPorCategoria[a] ? new Date(ultimaPorCategoria[a]).getTime() : 0;
    const fb = ultimaPorCategoria[b] ? new Date(ultimaPorCategoria[b]).getTime() : 0;
    return fa - fb;
  })[0];

  return rutinas.find(r => r.categoria === categoriaSugerida) || null;
}

function calcularUltimaSesionPorCategoria(sesiones, rutinasPorId) {
  const ultima = {};
  sesiones.forEach(s => {
    const cat = rutinasPorId[s.rutinaId]?.categoria;
    if (!cat) return;
    if (!ultima[cat] || new Date(s.fecha) > new Date(ultima[cat])) ultima[cat] = s.fecha;
  });
  return ultima;
}

export async function render() {
  const [sesiones, rutinas, resumenSemanal, racha, profile] = await Promise.all([
    db.getSesiones(),
    db.getRutinas(),
    db.getResumenEntrenoSemanal(),
    db.getRachaGeneral(),
    db.getProfile()
  ]);
  const rutinasPorId = {};
  rutinas.forEach(r => { rutinasPorId[r.id] = r; });

  const nivelGuardado = await db.getNivelEntrenamiento();
  const nivelPillLabel = nivelGuardado ? (TIEMPO_ENTRENANDO_PILL[nivelGuardado.tiempoEntrenando] || 'Nivel: sin definir') : 'Nivel: sin definir';

  // Racha en cian (--cy): es un logro, no una alerta — el rojo (--state-high)
  // en MK III queda reservado para alertas reales (ver auditoría de Fase 6).
  const rachaHtml = racha.actual > 0
    ? `<div style="display: inline-flex; align-items: center; gap: 4px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 12px; font-weight: 700; padding: 3px 10px 3px 8px; border-radius: 999px; flex-shrink: 0;">
        🔥 <span class="num">${racha.actual}</span> día${racha.actual === 1 ? '' : 's'} seguido${racha.actual === 1 ? '' : 's'}
      </div>`
    : '';

  const ringHtml = (cat) => renderProgressRing({
    percent: Math.min(100, (resumenSemanal[cat] / WEEKLY_GOALS[cat]) * 100),
    color: CATEGORY_COLORS[cat],
    size: 52,
    strokeWidth: 5,
    centerText: `${resumenSemanal[cat]}/${WEEKLY_GOALS[cat]}`
  });

  const ultimaPorCategoria = calcularUltimaSesionPorCategoria(sesiones, rutinasPorId);
  const subtituloTile = (cat) => ultimaPorCategoria[cat]
    ? `Última: ${formatFechaCorta(new Date(ultimaPorCategoria[cat]))}`
    : 'Sin sesiones todavía';

  const hoyToca = await calcularHoyToca(sesiones);
  const catNames = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };
  const hoyTocaHtml = hoyToca
    ? `
      <div class="card card-hero" style="padding: 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div style="min-width: 0;">
          <div style="font-size: 10.5px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Hoy toca</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(hoyToca.nombre)}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${catNames[hoyToca.categoria] || hoyToca.categoria}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px; flex-shrink: 0;">
          ${rachaHtml}
          <button id="btn-hoy-toca-empezar" data-id="${hoyToca.id}" class="btn-primary tappable" style="background: var(--accent-teal); color: #000; padding: 10px 20px; font-size: 13px; width: auto;">Empezar</button>
        </div>
      </div>
    `
    : `
      <div class="card" style="padding: 20px; margin-bottom: 20px; text-align: center;">
        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">Todavía no tienes rutinas guardadas.</div>
        ${rachaHtml}
      </div>
    `;

  const sesionesEstaSemana = (resumenSemanal.gym || 0) + (resumenSemanal.calistenia || 0) + (resumenSemanal.hiit || 0);

  const { volumenPorSemana } = await db.getTendenciaSemanal(null, 6);
  const volumenSparklineHtml = renderMiniChart(volumenPorSemana, {
    color: 'var(--accent-teal)',
    unidad: '',
    height: 70,
    width: 200
  });

  let imcHtml = `<div style="font-size: 11px; color: var(--text-disabled);">Completa tu perfil para ver tu IMC.</div>`;
  if (profile) {
    const imc = calcularIMC(profile.pesoKg, profile.estaturaCm);
    imcHtml = `
      <div style="display: flex; align-items: baseline; gap: 6px;">
        <span class="num" style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${imc.valor}</span>
      </div>
      <div style="font-size: 11.5px; font-weight: 700; color: ${imc.color}; margin-top: 2px;">${imc.categoria}</div>
    `;
  }

  return `
    <div style="max-width: 480px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 0 20px; font-family: 'Inter', sans-serif; padding-bottom: 120px;">

      <!-- MAIN VIEW -->
      <div id="entrenamiento-main-view" style="display: block;">
        <div class="flex-between" style="padding: 20px 0 8px 0; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 30px; font-weight: 800; margin: 0; letter-spacing: -0.5px; color: var(--text-primary);">Entreno</h1>
            <div style="display: inline-flex; align-items: center; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-top: 6px;">${nivelPillLabel}</div>
          </div>
          <div style="display: flex; gap: 8px; flex-shrink: 0;">
            <!-- Perfil y nivel de entrenamiento se editan desde Configuración
                 (ver Más → Configuración) — este ícono es solo el atajo. -->
            <button id="btn-open-cfg-entreno" class="icon-chip tappable" title="Configuración" style="width: 44px; height: 44px; background: rgba(92, 225, 230, 0.15); color: var(--accent-teal); flex-shrink: 0; border: none; cursor: pointer;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        </div>

        <div id="sugerencia-nivel-banner"></div>

        <!-- Búsqueda: por ahora decorativa (filtra al escribir queda para
             una segunda pasada — ver conversación de reestructuración). -->
        <div style="position: relative; margin-bottom: 20px;">
          <svg style="position: absolute; left: 16px; top: 15px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="entreno-buscador" placeholder="Buscar ejercicio o rutina..." style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 16px; padding: 14px 20px 14px 44px; color: var(--text-primary); font-size: 16px; outline: none; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease;" onfocus="this.style.borderColor='var(--accent-teal)'; this.style.boxShadow='0 0 0 4px color-mix(in srgb, var(--accent-teal) 18%, transparent)';" onblur="this.style.borderColor='var(--surface-border)'; this.style.boxShadow='none';">
        </div>

        ${hoyTocaHtml}

        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <div class="card tappable btn-explorar" data-cat="gym" style="flex: 1; padding: 16px 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-radius: 18px; cursor: pointer; text-align: center;">
            ${ringHtml('gym')}
            <div>
              <h3 style="font-size: 13px; font-weight: 700; margin: 0; color: var(--text-primary);">GYM</h3>
              <p style="color: var(--text-secondary); font-size: 10.5px; margin: 2px 0 0 0; font-weight: 500;">${subtituloTile('gym')}</p>
            </div>
          </div>

          <div class="card tappable btn-explorar" data-cat="calistenia" style="flex: 1; padding: 16px 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-radius: 18px; cursor: pointer; text-align: center;">
            ${ringHtml('calistenia')}
            <div>
              <h3 style="font-size: 13px; font-weight: 700; margin: 0; color: var(--text-primary);">Calistenia</h3>
              <p style="color: var(--text-secondary); font-size: 10.5px; margin: 2px 0 0 0; font-weight: 500;">${subtituloTile('calistenia')}</p>
            </div>
          </div>

          <div class="card tappable btn-explorar" data-cat="hiit" style="flex: 1; padding: 16px 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-radius: 18px; cursor: pointer; text-align: center;">
            ${ringHtml('hiit')}
            <div>
              <h3 style="font-size: 13px; font-weight: 700; margin: 0; color: var(--text-primary);">HIIT</h3>
              <p style="color: var(--text-secondary); font-size: 10.5px; margin: 2px 0 0 0; font-weight: 500;">${subtituloTile('hiit')}</p>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <div class="card" style="flex: 1.3; padding: 14px 16px; border-radius: 16px;">
            <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Volumen semanal</div>
            ${volumenSparklineHtml}
          </div>
          <div class="card" style="flex: 1; padding: 14px 16px; border-radius: 16px; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Sesiones</div>
            <span class="num" style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${sesionesEstaSemana}</span>
            <div style="font-size: 10.5px; color: var(--text-secondary); margin-top: 2px;">esta semana</div>
          </div>
          <div class="card" style="flex: 1; padding: 14px 16px; border-radius: 16px; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">IMC</div>
            ${imcHtml}
          </div>
        </div>

        <a id="link-ver-progreso-completo" href="#" style="display: block; text-align: center; font-size: 13px; font-weight: 700; color: var(--accent-teal); text-decoration: none; padding: 8px 0 24px 0;">Ver progreso completo →</a>
      </div>

      <!-- SUB VIEW (ROUTINES, FORMS, SESSIONS) -->
      <div id="entrenamiento-sub-view" style="display: none; padding-top: 20px;">
        <button id="btn-entrenamiento-volver" aria-label="Volver" style="width: 44px; height: 44px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; padding: 0;">
          <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <div id="entrenamiento-sub-content"></div>
      </div>

      ${renderProfileForm()}
      ${renderGeneradorConfigForm()}
      ${renderNivelOnboardingForm()}
    </div>
  `;
}

mountListeners = () => {
  const mainView = document.getElementById('entrenamiento-main-view');
  const subView = document.getElementById('entrenamiento-sub-view');
  const subContent = document.getElementById('entrenamiento-sub-content');

  const refreshFull = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  renderSugerenciaNivelBanner();

  const btnHoyTocaEmpezar = document.getElementById('btn-hoy-toca-empezar');
  if (btnHoyTocaEmpezar) {
    btnHoyTocaEmpezar.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const rutinas = await db.getRutinas();
      const rutina = rutinas.find(r => r.id === id);
      if (rutina) goToSession(rutina);
    });
  }

  const linkVerProgresoCompleto = document.getElementById('link-ver-progreso-completo');
  if (linkVerProgresoCompleto) {
    linkVerProgresoCompleto.addEventListener('click', (e) => { e.preventDefault(); goToProgreso(); });
  }

  setupProfileForm(refreshFull);
  setupGeneradorConfigForm((plan, cat) => goToGeneradorPreview(plan, cat));
  setupNivelOnboardingForm(refreshFull);

  const btnOpenCfgEntreno = document.getElementById('btn-open-cfg-entreno');
  if (btnOpenCfgEntreno) btnOpenCfgEntreno.addEventListener('click', () => window.appRouter.navigate('configuracion'));

  // Onboarding: si todavía no hay perfil guardado, se abre automáticamente
  // al entrar a Entreno (el usuario igual puede cancelar y completarlo después
  // desde el botón de perfil). El de nivel es un segundo gate independiente
  // — se abre solo si el perfil YA existe, para no apilar dos modales a la
  // vez en la primera visita; si falta el perfil, el de nivel queda para la
  // próxima visita (el usuario también puede abrirlo a mano con su ícono).
  db.getProfile().then(profile => {
    if (!profile) { openProfileForm(); return; }
    db.getNivelEntrenamiento().then(nivel => {
      if (!nivel) openNivelOnboardingForm();
    });
  });

  const goToMain = () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();

    categoriaActiva = null;
    viewState = 'main';
    // Consume la entrada de historial empujada al entrar a la pila de
    // sub-vistas — salvo que ya estemos respondiendo a un popstate (el
    // atrás del sistema), donde esa entrada ya se está consumiendo sola.
    if (entrenoHistorialEmpujado && !entrenoRespondiendoAPopstate) {
      entrenoHistorialEmpujado = false;
      history.back();
    } else if (entrenoRespondiendoAPopstate) {
      entrenoHistorialEmpujado = false;
    }
    // Refresco completo (no solo "recientes"): una sesión recién terminada
    // también cambia los anillos de progreso, el volumen semanal y el mapa
    // de calor, todos calculados en render().
    refreshFull();
  };
  window.__entrenoGoToMain = goToMain;

  if (!entrenoPopstateEnganchado) {
    entrenoPopstateEnganchado = true;
    window.addEventListener('popstate', onPopStateEntrenamiento);
  }

  // Empuja UNA entrada de historial al entrar a la pila de sub-vistas desde
  // 'main' — entrar a otra sub-vista (rutinas→form, rutinas→sesión, etc.)
  // no empuja una nueva, ya alcanza con esa única entrada mientras no se
  // vuelva del todo a 'main' (ver goToMain).
  const empujarHistorialSiHaceFalta = () => {
    if (!entrenoHistorialEmpujado) {
      entrenoHistorialEmpujado = true;
      history.pushState({ entrenoSubView: true }, '');
    }
  };

  const goToRutinas = async (cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    categoriaActiva = cat;
    viewState = 'rutinas';
    empujarHistorialSiHaceFalta();
    mainView.style.display = 'none';
    subView.style.display = 'block';
    
    try {
      subContent.innerHTML = await renderRutinasLista(cat);
    } catch (err) {
      console.error('Error renderizando rutinas:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">
        <div style="display: flex; justify-content: center; margin-bottom: 12px;">
          <svg width="32" height="32" fill="none" stroke="var(--state-high)" stroke-width="1.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Algo falló al cargar esta sección</div>
        <div style="font-size: 12px; opacity: 0.7;">${err.message}</div>
      </div>`;
      return;
    }

    initRutinasListaListeners(
      cat,
      () => goToForm(cat),
      (rutina) => goToSession(rutina),
      (plantilla) => goToPreview(plantilla, cat),
      signal,
      () => goToProgreso(cat),
      () => openGeneradorConfigForm(cat)
    );
  };

  // Progreso: pestañas Estándares/Árbol/Tendencia/Metas (ver
  // components/entreno-progreso.js). `categoria` llega solo cuando se
  // entra desde "Ver tu progreso en X" de una categoría puntual — desde
  // "Ver progreso completo" del dashboard principal llega undefined y
  // Progreso arranca en su pestaña/categoría por defecto.
  const goToProgreso = async (categoria) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'progreso';
    empujarHistorialSiHaceFalta();
    mainView.style.display = 'none';
    subView.style.display = 'block';
    setContextoCategoria(categoria);

    const refreshProgreso = async () => {
      subContent.innerHTML = await renderProgreso();
      initProgresoListeners(refreshProgreso, signal);
    };

    try {
      await refreshProgreso();
    } catch (err) {
      console.error('Error renderizando Progreso:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToPreview = (plantilla, cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'preview';
    empujarHistorialSiHaceFalta();

    try {
      subContent.innerHTML = renderPlantillaPreview(plantilla);
      initPlantillaPreviewListeners(cat, plantilla, async () => {
        await goToRutinas(cat);
      }, signal);
    } catch (err) {
      console.error('Error renderizando preview:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToGeneradorPreview = (plan, cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    categoriaActiva = cat;
    viewState = 'generador-preview';
    empujarHistorialSiHaceFalta();
    mainView.style.display = 'none';
    subView.style.display = 'block';

    try {
      subContent.innerHTML = renderGeneradorPreview(plan, cat);
      initGeneradorPreviewListeners(plan, cat, async () => {
        await goToRutinas(cat);
      }, signal);
    } catch (err) {
      console.error('Error renderizando rutina generada:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToForm = async (cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'form';
    empujarHistorialSiHaceFalta();

    try {
      if (cat === 'hiit') {
        subContent.innerHTML = renderHiitRutinaForm();
        initHiitRutinaFormListeners(async () => {
          await goToRutinas(cat);
        }, signal);
      } else {
        subContent.innerHTML = renderRutinaForm(cat);
        initRutinaFormListeners(cat, async () => {
          await goToRutinas(cat);
        }, signal);
      }
    } catch (err) {
      console.error('Error renderizando formulario:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToSession = async (rutina) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'session';
    empujarHistorialSiHaceFalta();

    try {
      if (rutina.categoria === 'hiit') {
        subContent.innerHTML = renderHiitTimer(rutina);
        initHiitTimerListeners(rutina, async () => goToMain(), signal);
      } else {
        subContent.innerHTML = await renderRutinaSession(rutina);
        initRutinaSessionListeners(rutina, async () => goToMain(), signal);
      }
    } catch (err) {
      console.error('Error renderizando sesión:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  document.querySelectorAll('.btn-explorar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.currentTarget.getAttribute('data-cat');
      goToRutinas(cat);
    });
  });

  const btnVolver = document.getElementById('btn-entrenamiento-volver');
  if (btnVolver) {
    btnVolver.addEventListener('click', () => {
      if (viewState === 'form' || viewState === 'preview' || viewState === 'generador-preview') {
        goToRutinas(categoriaActiva);
      } else if (viewState === 'session') {
        cleanupSessionTimer();
        cleanupHiitTimer();
        goToRutinas(categoriaActiva);
      } else if (viewState === 'progreso' && categoriaActiva) {
        goToRutinas(categoriaActiva);
      } else {
        goToMain();
      }
    });
  }
};