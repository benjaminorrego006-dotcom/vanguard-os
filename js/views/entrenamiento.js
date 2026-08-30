import { db } from '../core/db.js';
import { renderRutinasLista, initRutinasListaListeners, renderPlantillaPreview, initPlantillaPreviewListeners } from '../components/rutinas-lista.js';
import { renderRutinaForm, initRutinaFormListeners } from '../components/rutina-form.js';
import { renderHiitRutinaForm, initHiitRutinaFormListeners } from '../components/hiit-rutina-form.js';
import { renderRutinaSession, initRutinaSessionListeners, cleanupSessionTimer } from '../components/rutina-session.js';
import { renderHiitTimer, initHiitTimerListeners, cleanupHiitTimer } from '../components/hiit-timer.js';
import { renderProgressRing } from '../utils/progressRing.js';
import { WEEKLY_GOALS, CATEGORY_COLORS } from '../core/trainingConfig.js';
import { renderProfileForm, setupProfileForm, openProfileForm } from '../components/profile-form.js';
import { calcularIMC, calcularTMB } from '../utils/bodyMetrics.js';
import { ensureChartJs, appPalette, baseChartOptions, chartFontFamily } from '../utils/charts.js';
import { renderActivityHeatmap, initActivityHeatmapListeners } from '../components/activity-heatmap.js';
import { cleanupEjercicioCharts } from '../components/ejercicio-detalle.js';
import { renderArbolProgresion } from '../components/arbol-progresion.js';
import { renderEstandaresFuerza, initEstandaresFuerzaListeners } from '../components/estandares-fuerza.js';

let categoriaActiva = null;
let viewState = 'main'; // 'main', 'rutinas', 'form', 'session'
let rutinaActualId = null;
let currentViewController = null;
let volumenChartInstance = null;

// Barras de volumen total (peso x reps x series) por semana, agregando
// todas las categorías. Se llama tras insertar el canvas en el DOM.
const renderVolumenSemanalChart = async () => {
  const canvas = document.getElementById('chart-volumen-semanal');
  if (!canvas) return;
  const { volumenPorSemana } = await db.getTendenciaSemanal(null, 8);
  const Chart = await ensureChartJs();
  const palette = appPalette();
  const opts = baseChartOptions();

  if (volumenChartInstance) volumenChartInstance.destroy();
  volumenChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: volumenPorSemana.map((_, i) => i === volumenPorSemana.length - 1 ? 'Esta sem.' : `S-${volumenPorSemana.length - 1 - i}`),
      datasets: [{
        data: volumenPorSemana,
        backgroundColor: palette.teal,
        borderRadius: 6,
        maxBarThickness: 28
      }]
    },
    options: {
      ...opts,
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.textSecondary, font: { size: 10, family: chartFontFamily() } } },
        y: { display: false }
      }
    }
  });
};

export let mountListeners;

// Llamado por el router (app.js) antes de desmontar esta vista. Cubre dos
// fugas: el gráfico de volumen semanal (Chart.js, canvas ya fuera del DOM
// si no se destruye acá) y, si el usuario se va a otra pestaña de la barra
// lateral en medio de una sesión/timer en curso (en vez de tocar
// "Volver", el único lugar que hoy los limpiaba), el setInterval del
// cronómetro de sesión o del timer HIIT, que si no, sigue corriendo en
// segundo plano indefinidamente.
export function cleanup() {
  if (volumenChartInstance) { volumenChartInstance.destroy(); volumenChartInstance = null; }
  cleanupEjercicioCharts();
  cleanupSessionTimer();
  cleanupHiitTimer();
}

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
      <svg width="34" height="34" fill="none" stroke="var(--accent-teal)" stroke-width="1.6" viewBox="0 0 24 24">
        <path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path>
        <rect x="4" y="2" width="4" height="20" rx="1"></rect><rect x="16" y="2" width="4" height="20" rx="1"></rect>
      </svg>
    </div>
    <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--text-primary);">Tu primera sesión te espera</h3>
    <p style="margin: 6px 0 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.5;">Elegí una categoría arriba y registrá tu entrenamiento de hoy — así arranca tu racha.</p>
  </div>
`;

export async function render() {
  const sesiones = await db.getSesiones();
  const metasEntreno = await db.getGoals('entreno');
  const resumenSemanal = await db.getResumenEntrenoSemanal();
  const racha = await db.getRachaGeneral();
  const profile = await db.getProfile();

  // Header and Recent Sessions remain visible in main view
  const recientesHTML = sesiones.length === 0
    ? recientesEmptyHtml()
    : sesiones.slice(0, 5).map(sesionCardHtml).join('');

  // Racha en cian (--cy): es un logro, no una alerta — el rojo (--state-high)
  // en MK III queda reservado para alertas reales (ver auditoría de Fase 6).
  const rachaHtml = racha.actual > 0
    ? `<div style="display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; background: rgba(92, 225, 230, 0.12); border: 1px solid rgba(92, 225, 230, 0.3); color: var(--accent-teal); font-size: 12px; font-weight: 700; padding: 3px 10px 3px 8px; border-radius: 999px;">
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

  // Mapa de calor tipo GitHub: intensidad de color según cuántas sesiones
  // hubo cada día del mes actual. Se deriva del log de eventos
  // ('sesion_registrada'), no de iterar `sesiones` acá.
  const now_ = new Date();
  const heatYear = now_.getFullYear();
  const heatMonth = now_.getMonth();
  const nombreMesActual = now_.toLocaleDateString('es-ES', { month: 'long' });
  const { countByDay, detailByDay } = await db.getActividadEntrenoPorDia(heatYear, heatMonth);
  const heatmapHtml = renderActivityHeatmap({
    id: 'entreno-heatmap',
    monthLabel: nombreMesActual,
    year: heatYear,
    month: heatMonth,
    countByDay,
    detailByDay,
    accentVar: 'var(--accent-teal)',
    emptyLabel: 'Sin entrenamiento'
  });

  let metricsHtml = '';
  if (profile) {
    const imc = calcularIMC(profile.pesoKg, profile.estaturaCm);
    const tmb = calcularTMB(profile);
    metricsHtml = `
      <div class="card" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px; display: flex; align-items: center; gap: 18px;">
        <div style="flex: 1;">
          <div style="font-size: 10.5px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">IMC</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${imc.valor}</span>
            <span style="font-size: 11.5px; font-weight: 700; color: ${imc.color};">${imc.categoria}</span>
          </div>
        </div>
        <div style="width: 1px; align-self: stretch; background: var(--surface-border);"></div>
        <div style="flex: 1;">
          <div style="font-size: 10.5px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Gasto calórico</div>
          <div style="font-size: 12.5px; color: var(--text-primary); font-weight: 700;">${tmb.tmbBase} <span style="color: var(--text-secondary); font-weight: 500;">kcal base (TMB)</span></div>
          <div style="font-size: 12.5px; color: var(--accent-teal); font-weight: 700; margin-top: 2px;">${tmb.gastoDiario} <span style="color: var(--text-secondary); font-weight: 500;">kcal/día estimado</span></div>
        </div>
      </div>
    `;
  }

  // Resumen breve de metas: el detalle completo (crear, editar, listar
  // todas) vive únicamente en la pestaña Metas de Análisis, para no
  // duplicar esa UI en el dashboard de Entreno.
  const metasActivas = metasEntreno.filter(g => !g.completed);
  const progresoPromedio = metasActivas.length > 0
    ? Math.round(metasActivas.reduce((sum, g) => sum + (g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0), 0) / metasActivas.length)
    : 0;

  const metasResumenHtml = metasEntreno.length === 0
    ? `<div class="card tappable" id="btn-ir-metas-analisis" style="padding: 20px; border-radius: 18px; text-align: center; cursor: pointer;">
         <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">Todavía no tenés metas de entrenamiento.</div>
         <div style="background: transparent; color: var(--accent-teal); border: 1px dashed var(--accent-teal); padding: 12px; border-radius: 8px; font-weight: 600;">+ Nueva meta</div>
       </div>`
    : `<div class="card tappable" id="btn-ir-metas-analisis" style="padding: 18px 20px; border-radius: 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px; cursor: pointer;">
         <div>
           <div style="font-size: 22px; font-weight: 800; color: var(--text-primary);">${metasActivas.length}</div>
           <div style="font-size: 11.5px; color: var(--text-secondary); font-weight: 600; margin-top: 2px;">meta${metasActivas.length === 1 ? '' : 's'} activa${metasActivas.length === 1 ? '' : 's'} &bull; ${progresoPromedio}% de progreso promedio</div>
         </div>
         <svg width="18" height="18" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
       </div>`;

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
          <button id="btn-open-profile" class="icon-chip tappable" style="width: 44px; height: 44px; background: rgba(92, 225, 230, 0.15); color: var(--accent-teal); flex-shrink: 0; border: none; cursor: pointer;">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </button>
        </div>

        <div style="position: relative; margin-bottom: 20px;">
          <svg style="position: absolute; left: 16px; top: 15px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" placeholder="Encuentra tu próximo entrenamiento..." style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 16px; padding: 14px 20px 14px 44px; color: var(--text-primary); font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease;" onfocus="this.style.borderColor='var(--accent-teal)'; this.style.boxShadow='0 0 0 4px rgba(92,225,230,0.18)';" onblur="this.style.borderColor='var(--surface-border)'; this.style.boxShadow='none';">
        </div>

        <div class="card card--glass" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px;">
          <div style="font-size: 14px; font-style: italic; color: var(--text-primary); line-height: 1.5;">
            "La disciplina lleva a la <span style="color: var(--accent-teal); font-weight: 700; font-style: normal;">grandeza.</span>"
          </div>
        </div>

        ${metricsHtml}

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

        <div class="card" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px;">
          <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Volumen semanal</h3>
          <div style="height: 110px;"><canvas id="chart-volumen-semanal"></canvas></div>
        </div>

        <div class="card" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px;">
          <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Actividad de ${nombreMesActual}</h3>
          ${heatmapHtml}
        </div>

        <div style="margin-bottom: 24px;">
          <div class="flex-between" style="margin-bottom: 14px;">
            <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary);">Metas</h3>
          </div>
          ${metasResumenHtml}
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

      ${renderProfileForm()}
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

  renderVolumenSemanalChart();
  initActivityHeatmapListeners('entreno-heatmap', 'var(--accent-teal)');

  // La tarjeta de Análisis vivía acá, duplicando la navbar (Limpieza C ya
  // la agregó como 5º ítem de primer nivel) — se sacó, ese es el único
  // camino ahora. "+ Nueva meta" sigue yendo a Análisis > Metas porque no
  // es un acceso a la vista en general, sino a una pestaña puntual dentro
  // de ella.
  const btnIrMetasAnalisis = document.getElementById('btn-ir-metas-analisis');
  if (btnIrMetasAnalisis) {
    btnIrMetasAnalisis.addEventListener('click', () => {
      sessionStorage.setItem('vg_analisis_initial_tab', 'metas');
      if (window.appRouter) window.appRouter.navigate('analisis');
    });
  }

  setupProfileForm(refreshFull);
  const btnOpenProfile = document.getElementById('btn-open-profile');
  if (btnOpenProfile) btnOpenProfile.addEventListener('click', () => openProfileForm());

  // Onboarding: si todavía no hay perfil guardado, se abre automáticamente
  // al entrar a Entreno (el usuario igual puede cancelar y completarlo después
  // desde el botón de perfil).
  db.getProfile().then(profile => {
    if (!profile) openProfileForm();
  });

  const goToMain = () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();

    categoriaActiva = null;
    viewState = 'main';
    // Refresco completo (no solo "recientes"): una sesión recién terminada
    // también cambia los anillos de progreso, el volumen semanal y el mapa
    // de calor, todos calculados en render().
    refreshFull();
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
      signal,
      () => goToArbolProgresion(),
      cat === 'gym' ? () => goToEstandaresFuerza() : undefined
    );
  };

  const goToArbolProgresion = async () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();

    viewState = 'arbol';
    mainView.style.display = 'none';
    subView.style.display = 'block';

    try {
      subContent.innerHTML = await renderArbolProgresion(categoriaActiva);
    } catch (err) {
      console.error('Error renderizando árbol de progresión:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
  };

  const goToEstandaresFuerza = async () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'estandares';
    mainView.style.display = 'none';
    subView.style.display = 'block';

    try {
      subContent.innerHTML = await renderEstandaresFuerza();
      initEstandaresFuerzaListeners(signal);
    } catch (err) {
      console.error('Error renderizando estándares de fuerza:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${err.message}</div>`;
    }
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
      if (viewState === 'form' || viewState === 'preview' || viewState === 'arbol' || viewState === 'estandares') {
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