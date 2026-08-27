import { db } from '../core/db.js';
import { renderRutinasLista, initRutinasListaListeners, renderPlantillaPreview, initPlantillaPreviewListeners } from '../components/rutinas-lista.js';
import { renderRutinaForm, initRutinaFormListeners } from '../components/rutina-form.js';
import { renderRutinaSession, initRutinaSessionListeners, cleanupSessionTimer } from '../components/rutina-session.js';
import { renderHiitTimer, initHiitTimerListeners, cleanupHiitTimer } from '../components/hiit-timer.js';
import { renderProgressRing } from '../utils/progressRing.js';
import { WEEKLY_GOALS, CATEGORY_COLORS } from '../core/trainingConfig.js';

let categoriaActiva = null;
let viewState = 'main'; // 'main', 'rutinas', 'form', 'session'
let rutinaActualId = null;
let currentViewController = null;

export let mountListeners;

const sesionCardHtml = (s) => {
  const timeStr = new Date(s.fecha).toLocaleDateString();
  const badgeClass = s.completado ? 'badge--low' : 'badge--medium';
  return `
    <div class="card" style="min-width: 170px; padding: 16px; border-radius: 16px;">
      <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px; color: var(--text-primary);">${s.nombreRutina}</div>
      <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-bottom: 10px;">${timeStr}</div>
      <div class="flex-between">
        <span class="badge ${badgeClass}">${s.completado ? 'Completado' : 'Parcial'}</span>
        <span style="font-size: 11px; color: var(--text-secondary); font-weight: 700;">${s.duracionMin} min</span>
      </div>
    </div>`;
};

const recientesEmptyHtml = () => `
  <div class="card" style="padding: 28px 20px; text-align: center; background-color: var(--surface-1); border-radius: 16px; border: 1px dashed var(--surface-border); width: 100%; box-sizing: border-box;">
    <div style="margin-bottom: 12px; display: flex; justify-content: center;">
      <svg width="34" height="34" fill="none" stroke="var(--accent-purple)" stroke-width="1.6" viewBox="0 0 24 24">
        <path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path>
        <rect x="4" y="2" width="4" height="20" rx="1"></rect><rect x="16" y="2" width="4" height="20" rx="1"></rect>
      </svg>
    </div>
    <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--text-primary);">Tu primera sesión te espera</h3>
    <p style="margin: 6px 0 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.5;">Elegí una categoría arriba y registrá tu entrenamiento de hoy — así arranca tu racha.</p>
  </div>
`;

export async function render() {
  // Limpieza de datos solicitada por el usuario
  if (localStorage.getItem('vg_dummy_loaded')) {
    localStorage.removeItem('vg_routines');
    localStorage.removeItem('vg_sessions');
    localStorage.removeItem('vg_dummy_loaded');
    console.log("Datos de entrenamiento eliminados.");
  }

  const sesiones = await db.getSesiones();
  const resumenSemanal = await db.getResumenEntrenoSemanal();
  const racha = await db.getRachaGeneral();

  // Header and Recent Sessions remain visible in main view
  const recientesHTML = sesiones.length === 0
    ? recientesEmptyHtml()
    : sesiones.slice(0, 5).map(sesionCardHtml).join('');

  const rachaHtml = racha.actual > 0
    ? `<div style="display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; background: rgba(248, 113, 113, 0.12); border: 1px solid rgba(248, 113, 113, 0.3); color: var(--state-high); font-size: 12px; font-weight: 700; padding: 3px 10px 3px 8px; border-radius: 999px;">
        🔥 ${racha.actual} día${racha.actual === 1 ? '' : 's'} seguidos
      </div>`
    : '';

  const ringHtml = (cat) => renderProgressRing({
    percent: Math.min(100, (resumenSemanal[cat] / WEEKLY_GOALS[cat]) * 100),
    color: CATEGORY_COLORS[cat],
    size: 56,
    strokeWidth: 5,
    centerText: `${resumenSemanal[cat]}/${WEEKLY_GOALS[cat]}`
  });

  return `
    <div style="max-width: 480px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 0 20px; font-family: 'Inter', sans-serif; padding-bottom: 120px;">

      <!-- MAIN VIEW -->
      <div id="entrenamiento-main-view" style="display: block;">
        <div class="flex-between" style="padding: 20px 0 8px 0; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 30px; font-weight: 800; margin: 0; letter-spacing: -0.5px; color: var(--text-primary);">Entrenamiento</h1>
            <div style="font-size: 13px; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">¡A darle con todo!</div>
            ${rachaHtml}
          </div>
          <div class="icon-chip" style="width: 44px; height: 44px; background: rgba(191, 90, 242, 0.15); color: var(--accent-purple); flex-shrink: 0;">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.66 10.4a1.96 1.96 0 0 0-1.87 1.4L18 14.5l-3.35-7.06a2.08 2.08 0 0 0-3.6 0L8.2 13.5l-2.4-1.2A1.97 1.97 0 0 0 3.34 14l.8 2.4a2 2 0 0 0 1.9 1.4h11.9a2 2 0 0 0 1.9-1.4l1.6-4.8a1.96 1.96 0 0 0-1.4-2.4z"></path></svg>
          </div>
        </div>

        <div style="position: relative; margin-bottom: 20px;">
          <svg style="position: absolute; left: 16px; top: 15px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Encuentra tu próximo entrenamiento..." style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 16px; padding: 14px 20px 14px 44px; color: var(--text-primary); font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease;" onfocus="this.style.borderColor='var(--accent-purple)'; this.style.boxShadow='0 0 0 4px rgba(191,90,242,0.18)';" onblur="this.style.borderColor='var(--surface-border)'; this.style.boxShadow='none';">
        </div>

        <div class="card card--glass" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px;">
          <div style="font-size: 14px; font-style: italic; color: var(--text-primary); line-height: 1.5;">
            "La disciplina lleva a la <span style="color: var(--accent-purple); font-weight: 700; font-style: normal;">grandeza.</span>"
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px;">
          <div class="card tappable btn-explorar" data-cat="gym" style="padding: 20px; display: flex; align-items: center; gap: 18px; border-radius: 20px; cursor: pointer;">
            ${ringHtml('gym')}
            <div style="flex: 1;">
              <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 3px 0; color: var(--text-primary);">GYM (Pesas)</h3>
              <p style="color: var(--text-secondary); font-size: 12px; margin: 0; font-weight: 500;">Fuerza e Hipertrofia</p>
            </div>
            <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>

          <div class="card tappable btn-explorar" data-cat="calistenia" style="padding: 20px; display: flex; align-items: center; gap: 18px; border-radius: 20px; cursor: pointer;">
            ${ringHtml('calistenia')}
            <div style="flex: 1;">
              <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 3px 0; color: var(--text-primary);">Calistenia</h3>
              <p style="color: var(--text-secondary); font-size: 12px; margin: 0; font-weight: 500;">Peso Corporal y Dominio</p>
            </div>
            <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>

          <div class="card tappable btn-explorar" data-cat="hiit" style="padding: 20px; display: flex; align-items: center; gap: 18px; border-radius: 20px; cursor: pointer;">
            ${ringHtml('hiit')}
            <div style="flex: 1;">
              <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 3px 0; color: var(--text-primary);">HIIT/Cardio</h3>
              <p style="color: var(--text-secondary); font-size: 12px; margin: 0; font-weight: 500;">Quema y Resistencia</p>
            </div>
            <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 14px; color: var(--text-primary);">Sesiones Recientes</h3>
        <div id="entrenamiento-recientes" style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 24px;">
          ${recientesHTML}
        </div>
      </div>

      <!-- SUB VIEW (ROUTINES, FORMS, SESSIONS) -->
      <div id="entrenamiento-sub-view" style="display: none; padding-top: 20px;">
        <button id="btn-entrenamiento-volver" style="background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; margin-bottom: 20px; padding: 10px 16px; border-radius: 12px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Volver
        </button>
        <div id="entrenamiento-sub-content"></div>
      </div>

    </div>
  `;
}

mountListeners = () => {
  const mainView = document.getElementById('entrenamiento-main-view');
  const subView = document.getElementById('entrenamiento-sub-view');
  const subContent = document.getElementById('entrenamiento-sub-content');

  const goToMain = () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    
    categoriaActiva = null;
    viewState = 'main';
    mainView.style.display = 'block';
    subView.style.display = 'none';
    refreshRecientes();
  };

  const goToRutinas = async (cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    categoriaActiva = cat;
    viewState = 'rutinas';
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
      signal
    );
  };
  
  const goToPreview = (plantilla, cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'preview';
    
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

  const goToForm = async (cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'form';
    
    try {
      subContent.innerHTML = renderRutinaForm(cat);
      initRutinaFormListeners(cat, async () => {
        await goToRutinas(cat);
      }, signal);
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

  const refreshRecientes = async () => {
    const sesiones = await db.getSesiones();
    const container = document.getElementById('entrenamiento-recientes');
    if (!container) return;
    container.innerHTML = sesiones.length === 0
      ? recientesEmptyHtml()
      : sesiones.slice(0, 5).map(sesionCardHtml).join('');
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
      if (viewState === 'form' || viewState === 'preview') {
        goToRutinas(categoriaActiva);
      } else if (viewState === 'session') {
        cleanupSessionTimer();
        cleanupHiitTimer();
        goToRutinas(categoriaActiva);
      } else {
        goToMain();
      }
    });
  }
};