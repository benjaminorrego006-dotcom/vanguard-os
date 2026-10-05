import { db } from '../core/db.js';
import { esperarSalidaDeModal } from '../core/history.js';
import { renderRutinasLista, initRutinasListaListeners, renderPlantillaPreview, initPlantillaPreviewListeners, renderGeneradorPreview, initGeneradorPreviewListeners } from '../components/rutinas-lista.js';
import { esDescansoActivo, renderDescansoActivoSesion, initDescansoActivoListeners } from '../components/descanso-activo.js';
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
import { formatFechaCorta, diaKeyDe } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { detectarSugerencias } from '../core/sugerencias-nivel.js';
import { Toast, hayModalAbierto, ConfirmDialog } from '../utils/states.js';
import { leerBorrador, borrarBorrador, esBorradorLargo } from '../utils/sesion-borrador.js';
import { renderProgreso, initProgresoListeners, setContextoCategoria, cleanup as cleanupProgreso } from '../components/entreno-progreso.js';
import { renderMiniChart } from '../components/mini-chart.js';
import { calcularHoyToca } from '../utils/hoyToca.js';
import { renderSesionesHistorial, initSesionesHistorialListeners } from '../components/sesiones-historial.js';
import { renderCuerpoTarjeta, renderCuerpoHistorial, renderMedidaForm, setupMedidaForm, initCuerpo } from '../components/cuerpo.js';

// Placeholder hasta que exista el sistema de nivel del backlog (onboarding
// de nivel dedicado, filtrado de rutinas por nivel, detección automática de
// progreso por patrón de movimiento). Lo único que existe hoy es
// db.getNivelEntrenamiento() — tiempoEntrenando + overrides POR RAMA, no un
// nivel único — así que el pill muestra una lectura aproximada de eso, no
// un nivel "real" todavía.
// Tarjeta "Completa tu perfil" (en vez de abrir el formulario solo al entrar):
// "Ahora no" la oculta hasta mañana. La fecha (diaKeyDe) va en localStorage
// porque es una preferencia de UI, no dato de la app.
const TARJETA_PERFIL_OCULTA_KEY = 'vg-entreno-tarjeta-perfil-oculta';
function tarjetaPerfilOcultaHoy() {
  try { return localStorage.getItem(TARJETA_PERFIL_OCULTA_KEY) === diaKeyDe(new Date()); }
  catch (e) { return false; /* modo privado: se muestra igual */ }
}
function ocultarTarjetaPerfilHoy() {
  try { localStorage.setItem(TARJETA_PERFIL_OCULTA_KEY, diaKeyDe(new Date())); }
  catch (e) { /* modo privado */ }
}

const TIEMPO_ENTRENANDO_PILL ={ 'menos-1': 'Nivel: recién empezando', '1-3': 'Nivel: intermedio', 'mas-3': 'Nivel: experimentado' };

let categoriaActiva = null;
let viewState = 'main'; // 'main', 'rutinas', 'form', 'session', 'progreso', 'historial', 'cuerpo'
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

// 'budget-updated' es el aviso genérico de sync.js de que se aplicó un
// cambio remoto (ver runFullSync en core/sync.js). Solo tiene sentido
// repintar si estamos en el dashboard principal ('main') — si el usuario
// está a mitad de una sesión/timer, en un formulario, o viendo su
// progreso, forzar un remount ahí se lo llevaría puesto. Se engancha una
// sola vez, igual que entrenoPopstateEnganchado arriba.
let entrenoSyncEnganchado = false;
async function onSyncActualizadoEntreno() {
  if (viewState !== 'main' || hayModalAbierto()) return;
  const root = document.getElementById('view-root');
  root.innerHTML = await render();
  mountListeners();
}

const NIVEL_SUGERIDO_LABEL = { intermedio: 'Intermedio', avanzado: 'Avanzado' };

// Tarjetas "listo para avanzar" (PROMPT-NIVEL-FILTRADO.md, paso 4/e): se
// calculan después de insertar el DOM, no durante render(), porque dependen
// de una lectura de IndexedDB (historial) que no tiene sentido bloquear el
// primer pintado del dashboard. Nunca suben el nivel solas — solo arman la
// sugerencia con evidencia concreta; subir o descartar es una acción
// explícita del usuario. Una tarjeta por rama con sugerencia (máx. 3
// visibles, el resto detrás de "Ver N más"); chaflán MK III (.card-hero),
// sin radios ni sombras.
const SUGERENCIAS_VISIBLES = 3;
let sugerenciasExpandido = false;

async function renderSugerenciaNivelBanner() {
  const contenedor = document.getElementById('sugerencia-nivel-banner');
  if (!contenedor) return;

  const sugerencias = await detectarSugerencias();
  if (sugerencias.length === 0) { contenedor.innerHTML = ''; return; }

  const visibles = sugerenciasExpandido ? sugerencias : sugerencias.slice(0, SUGERENCIAS_VISIBLES);
  const tarjeta = (s) => `
    <div class="card card-hero sugerencia-nivel" data-rama="${s.rama}" style="padding: 14px 16px; margin-bottom: 12px; border-left: 3px solid var(--accent-teal);">
      <div class="num" style="font-size: 10px; font-weight: 700; color: var(--accent-teal); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Listo para avanzar · ${NIVEL_SUGERIDO_LABEL[s.nivelSugerido]}</div>
      <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); line-height: 1.3;">${escapeHtml(s.ramaLabel)}: ${escapeHtml(s.ejercicioActual.nombre)} → ${escapeHtml(s.ejercicioSiguiente.nombre)}</div>
      <div title="${escapeHtml(s.evidencia)}" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(s.evidencia)}</div>
      <div style="display: flex; gap: 10px; margin-top: 12px;">
        <button class="btn-sugerencia-subir btn-primary tappable" data-rama="${s.rama}" data-nivel="${s.nivelSugerido}" style="background: var(--accent-teal); color: #000; width: auto; padding: 9px 16px; font-size: 12.5px;">Subir de nivel</button>
        <button class="btn-sugerencia-ahora-no tappable" data-rama="${s.rama}" data-nivel="${s.nivelSugerido}" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--surface-border); padding: 9px 16px; font-weight: 600; font-size: 12.5px; cursor: pointer;">Ahora no</button>
      </div>
    </div>`;
  const verMas = sugerencias.length > SUGERENCIAS_VISIBLES
    ? `<button id="btn-sugerencias-ver-mas" class="tappable" style="background: transparent; border: none; color: var(--accent-teal); font-size: 12.5px; font-weight: 700; padding: 4px 0 16px; cursor: pointer;">${sugerenciasExpandido ? 'Ver menos' : `Ver ${sugerencias.length - SUGERENCIAS_VISIBLES} más`}</button>`
    : '';
  contenedor.innerHTML = visibles.map(tarjeta).join('') + verMas;

  // Tras cada innerHTML, los listeners se reasignan.
  const porRama = (rama) => sugerencias.find(x => x.rama === rama);
  contenedor.querySelectorAll('.btn-sugerencia-subir').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = porRama(btn.dataset.rama);
      if (!s) return;
      btn.disabled = true;
      await db.confirmarSugerenciaNivel(s.rama, s.nivelSugerido, s.ejercicioSiguiente.id);
      Toast(`Subiste a ${NIVEL_SUGERIDO_LABEL[s.nivelSugerido]} en ${s.ramaLabel}`, 'success');
      renderSugerenciaNivelBanner();
    });
  });
  contenedor.querySelectorAll('.btn-sugerencia-ahora-no').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s = porRama(btn.dataset.rama);
      if (!s) return;
      btn.disabled = true;
      await db.descartarSugerenciaNivel(s.rama, s.nivelSugerido);
      renderSugerenciaNivelBanner();
    });
  });
  const btnVerMas = document.getElementById('btn-sugerencias-ver-mas');
  if (btnVerMas) btnVerMas.addEventListener('click', () => { sugerenciasExpandido = !sugerenciasExpandido; renderSugerenciaNivelBanner(); });
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
  // Salir de Entreno con una sesión abierta: vuelve la barra inferior.
  document.documentElement.classList.remove('entreno-sesion-activa');
  window.removeEventListener('budget-updated', onSyncActualizadoEntreno);
  entrenoSyncEnganchado = false;
  // Si había una sub-vista abierta con su entrada de historial empujada,
  // su nodo va a desaparecer con el innerHTML de la vista nueva sin pasar
  // por goToMain() — hay que soltar esa entrada (mismo criterio que
  // forgetOpenModals en history.js) para no dejar un "atrás" fantasma.
  if (entrenoHistorialEmpujado && history.state && history.state.entrenoSubView) {
    // Con el resumen de la sesión abierto hay dos entradas (sub-vista + resumen).
    if (history.state.sesionResumen) history.go(-2); else history.back();
  }
  entrenoHistorialEmpujado = false;
  viewState = 'main';
  categoriaActiva = null;
}

function onPopStateEntrenamiento(e) {
  // Un atrás que cae en la entrada de otro modal (ej. se cerró la
  // confirmación y queda el detalle de una sesión del historial debajo)
  // no sale de la sub-vista: ese modal sigue abierto sobre ella.
  if (e.state && e.state.modalId) return;
  if (viewState !== 'main' && (!e.state || !e.state.entrenoSubView)) {
    entrenoRespondiendoAPopstate = true;
    cleanupSessionTimer();
    cleanupHiitTimer();
    if (typeof window.__entrenoGoToMain === 'function') window.__entrenoGoToMain();
    entrenoRespondiendoAPopstate = false;
  }
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

// Tarjeta "Tienes una sesión en curso" (borrador en localStorage, ver
// utils/sesion-borrador.js). Hasta 12 h muestra cuánto lleva; un borrador
// más viejo muestra cuándo empezó (al guardarlo se pregunta la duración).
function renderSesionEnCurso() {
  const b = leerBorrador();
  if (!b) return '';
  const nombre = escapeHtml(b.nombreRutina || 'Entrenamiento');
  let tiempo;
  if (esBorradorLargo(b)) {
    const inicio = new Date(b.inicio);
    const dia = inicio.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
    const hora = inicio.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    tiempo = `desde el ${escapeHtml(dia)} <span class="num">${escapeHtml(formatFechaCorta(inicio))}</span>, <span class="num">${escapeHtml(hora)}</span>`;
  } else {
    const min = Math.max(0, Math.floor((Date.now() - b.inicio) / 60000));
    tiempo = min >= 60
      ? `<span class="num">${Math.floor(min / 60)}</span> h <span class="num">${min % 60}</span> min`
      : `<span class="num">${min}</span> min`;
  }
  const marcadas = b.ejercicios.reduce((n, ej) => n + (ej.series || []).filter(s => s.checked).length, 0);
  return `
    <section id="entreno-sesion-en-curso" aria-label="Sesión en curso" style="background: var(--surface-1); border: 1px solid var(--cy3); border-left: 3px solid var(--cy); padding: 14px 16px; margin-bottom: 20px;">
      <div style="font-size: 12px; color: var(--cy); font-weight: 700; margin-bottom: 4px;">Tienes una sesión en curso</div>
      <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">${nombre} <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">· ${tiempo}</span></div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;"><span class="num">${marcadas}</span> ${marcadas === 1 ? 'serie marcada' : 'series marcadas'}</div>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button type="button" id="btn-sesion-en-curso-retomar" class="tappable" style="flex: 1; min-height: 44px; background: var(--cy); border: 1px solid var(--cy); color: var(--bg); font: inherit; font-size: 14px; font-weight: 800; cursor: pointer;">Retomar</button>
        <button type="button" id="btn-sesion-en-curso-descartar" class="tappable" style="flex: 1; min-height: 44px; background: transparent; border: 1px solid var(--surface-border); color: var(--text-primary); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;">Descartar</button>
      </div>
    </section>`;
}

export async function render() {
  const [sesiones, rutinas, resumenSemanal, racha, profile, medidas] = await Promise.all([
    db.getSesiones(),
    db.getRutinas(),
    db.getResumenEntrenoSemanal(),
    db.getRachaGeneral(),
    db.getProfile(),
    db.getMedidas()
  ]);
  const rutinasPorId = {};
  rutinas.forEach(r => { rutinasPorId[r.id] = r; });

  const nivelGuardado = await db.getNivelEntrenamiento();
  const nivelPillLabel = nivelGuardado ? (TIEMPO_ENTRENANDO_PILL[nivelGuardado.tiempoEntrenando] || 'Nivel: sin definir') : 'Nivel: sin definir';

  // Falta el perfil (peso, estatura…) o el nivel declarado: una tarjeta con
  // botón al mismo formulario, en vez de abrirlo solo y tapar la vista.
  const faltaPerfil = !profile;
  const faltaNivel = !nivelGuardado;
  const tarjetaPerfilHtml = (faltaPerfil || faltaNivel) && !tarjetaPerfilOcultaHoy() ? `
    <div id="entreno-tarjeta-perfil" class="card card-hero" style="padding: 16px; margin-bottom: 20px;">
      <div class="num" style="font-size: 10px; font-weight: 700; color: var(--accent-teal); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">${faltaPerfil ? 'Perfil' : 'Nivel'}</div>
      <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); line-height: 1.3;">${faltaPerfil ? 'Completa tu perfil para calcular tu nivel e IMC' : 'Define tu nivel para ajustar tus rutinas'}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">${faltaPerfil && faltaNivel ? 'Tu peso y estatura calculan el IMC; tu nivel ajusta la exigencia del generador.' : faltaPerfil ? 'Con tu peso y estatura calculamos tu IMC.' : 'Con tu experiencia el generador elige ejercicios de tu nivel.'}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
        ${faltaPerfil ? '<button id="btn-tarjeta-perfil-completar" type="button" class="tappable" style="flex: 1; background: var(--accent-teal); color: #000; border: none; padding: 10px 12px; font-size: 13px; font-weight: 700; cursor: pointer;">Completar</button>' : ''}
        ${faltaNivel ? `<button id="btn-tarjeta-perfil-nivel" type="button" class="tappable" style="flex: 1; background: ${faltaPerfil ? 'transparent' : 'var(--accent-teal)'}; color: ${faltaPerfil ? 'var(--text-primary)' : '#000'}; border: ${faltaPerfil ? '1px solid var(--surface-border)' : 'none'}; padding: 10px 12px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;">Definir mi nivel</button>` : ''}
        <button id="btn-tarjeta-perfil-ahora-no" type="button" class="tappable" style="background: transparent; border: 1px solid var(--surface-border); color: var(--text-secondary); padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer;">Ahora no</button>
      </div>
    </div>` : '';

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
    : rutinas.length === 0
    // Sin rutinas: estado vacío con acción. La vista principal no tiene
    // categoría activa, así que se elige arriba (GYM por defecto) y los dos
    // botones usan los mismos flujos que la lista de rutinas de esa categoría.
    ? `
      <div id="entreno-vacio" class="card card-hero" data-cat="gym" style="padding: 20px; margin-bottom: 20px;">
        <div class="num" style="font-size: 10px; font-weight: 700; color: var(--accent-teal); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">Entreno</div>
        <h2 style="font-size: 19px; font-weight: 800; margin: 0 0 6px 0; color: var(--text-primary);">Arma tu primera rutina</h2>
        <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 14px 0; line-height: 1.45;">Genérala a tu medida según tus días y tu equipo, o créala a mano ejercicio por ejercicio.</p>
        <div role="group" aria-label="Categoría" style="display: flex; gap: 6px; margin-bottom: 14px;">
          ${['gym', 'calistenia', 'hiit'].map((cat, i) => `<button type="button" class="entreno-vacio-cat tappable" data-cat="${cat}" aria-pressed="${i === 0}" style="flex: 1; padding: 9px 4px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid ${i === 0 ? 'var(--accent-teal)' : 'var(--surface-border)'}; background: ${i === 0 ? 'color-mix(in srgb, var(--accent-teal) 14%, transparent)' : 'transparent'}; color: ${i === 0 ? 'var(--accent-teal)' : 'var(--text-secondary)'};">${catNames[cat]}</button>`).join('')}
        </div>
        <button id="btn-entreno-vacio-generar" type="button" class="btn-primary tappable" style="background: var(--accent-teal); color: #000; margin-bottom: 8px;">Generar mi rutina</button>
        <button id="btn-entreno-vacio-manual" type="button" class="tappable" style="width: 100%; padding: 12px; background: transparent; border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 13px; font-weight: 700; cursor: pointer;">Crear rutina a mano</button>
        ${rachaHtml ? `<div style="margin-top: 12px;">${rachaHtml}</div>` : ''}
      </div>
    `
    : (rachaHtml ? `<div style="margin-bottom: 20px;">${rachaHtml}</div>` : '');

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

        ${tarjetaPerfilHtml}

        <div id="sugerencia-nivel-banner"></div>

        <!-- Búsqueda: por ahora decorativa (filtra al escribir queda para
             una segunda pasada — ver conversación de reestructuración). -->
        <div style="position: relative; margin-bottom: 20px;">
          <svg style="position: absolute; left: 16px; top: 15px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="entreno-buscador" placeholder="Buscar ejercicio o rutina..." style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 16px; padding: 14px 20px 14px 44px; color: var(--text-primary); font-size: 16px; outline: none; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease;" onfocus="this.style.borderColor='var(--accent-teal)'; this.style.boxShadow='0 0 0 4px color-mix(in srgb, var(--accent-teal) 18%, transparent)';" onblur="this.style.borderColor='var(--surface-border)'; this.style.boxShadow='none';">
        </div>

        ${renderSesionEnCurso()}

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

        ${renderCuerpoTarjeta(medidas)}

        ${sesiones.length > 0 ? '<a id="link-historial-sesiones" href="#" style="display: block; text-align: center; font-size: 13px; font-weight: 700; color: var(--accent-teal); text-decoration: none; padding: 8px 0;">Historial de sesiones →</a>' : ''}
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
      ${renderMedidaForm()}
      ${renderGeneradorConfigForm()}
      ${renderNivelOnboardingForm()}
    </div>
  `;
}

mountListeners = () => {
  // Tras recargar en medio de una sub-vista (ej. una sesión, que ahora se
  // retoma desde su borrador), la entrada actual del historial sigue
  // marcada como sub-vista aunque se vea la principal: sin esto, el primer
  // Atrás después de entrar a otra sub-vista caería en esa entrada vieja y
  // no volvería a la principal.
  if (viewState === 'main' && !entrenoHistorialEmpujado && history.state && history.state.entrenoSubView) {
    history.replaceState(null, '');
  }
  if (!entrenoSyncEnganchado) {
    entrenoSyncEnganchado = true;
    window.addEventListener('budget-updated', onSyncActualizadoEntreno);
  }

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

  document.getElementById('link-historial-sesiones')?.addEventListener('click', (e) => { e.preventDefault(); goToHistorial(); });
  // Cuerpo (Fase 6): la hoja de medidas y la tarjeta de la vista principal.
  setupMedidaForm();
  initCuerpo({ repintar: refreshFull, abrirHistorial: () => goToCuerpo() });

  // Sesión en curso (borrador): Retomar la abre con todo restaurado;
  // Descartar pide confirmación y lo borra.
  document.getElementById('btn-sesion-en-curso-retomar')?.addEventListener('click', async () => {
    const borrador = leerBorrador();
    if (!borrador) { refreshFull(); return; }
    const rutinas = await db.getRutinas();
    // La rutina pudo borrarse (o ser una sesión libre): con lo del borrador alcanza.
    const base = rutinas.find(r => r.id === borrador.rutinaId)
      || { id: borrador.rutinaId, nombre: borrador.nombreRutina || 'Entrenamiento', categoria: borrador.categoria || 'gym', ejercicios: [] };
    goToSession(base, { borrador });
  });
  document.getElementById('btn-sesion-en-curso-descartar')?.addEventListener('click', async () => {
    const borrador = leerBorrador();
    const ok = await ConfirmDialog('¿Descartar la sesión en curso?', `Se pierden las series que marcaste${borrador && borrador.nombreRutina ? ` en ${borrador.nombreRutina}` : ''}.`, { verb: 'Descartar' });
    if (!ok) { document.getElementById('btn-sesion-en-curso-descartar')?.focus(); return; }
    borrarBorrador();
    document.getElementById('entreno-sesion-en-curso')?.remove();
  });

  const linkVerProgresoCompleto = document.getElementById('link-ver-progreso-completo');
  if (linkVerProgresoCompleto) {
    linkVerProgresoCompleto.addEventListener('click', (e) => { e.preventDefault(); goToProgreso(); });
  }

  setupProfileForm(refreshFull);
  setupGeneradorConfigForm((plan, cat) => goToGeneradorPreview(plan, cat));
  setupNivelOnboardingForm(refreshFull);

  const btnOpenCfgEntreno = document.getElementById('btn-open-cfg-entreno');
  if (btnOpenCfgEntreno) btnOpenCfgEntreno.addEventListener('click', () => window.appRouter.navigate('configuracion'));

  // Perfil y nivel ya no se abren solos al entrar: la tarjeta de arriba
  // (si falta alguno) abre los mismos formularios; al guardar, refreshFull
  // vuelve a renderizar y la tarjeta desaparece cuando ya no falta nada.
  document.getElementById('btn-tarjeta-perfil-completar')?.addEventListener('click', () => openProfileForm());
  document.getElementById('btn-tarjeta-perfil-nivel')?.addEventListener('click', () => openNivelOnboardingForm());
  document.getElementById('btn-tarjeta-perfil-ahora-no')?.addEventListener('click', () => {
    ocultarTarjetaPerfilHoy();
    document.getElementById('entreno-tarjeta-perfil')?.remove();
  });

  const goToMain = () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();

    categoriaActiva = null;
    viewState = 'main';
    modoSesion(false);
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

  // Toda sub-vista (rutinas, sesión, progreso, historial, formularios) se
  // pinta en #entrenamiento-sub-view: este es el único lugar que la muestra
  // y oculta la principal. Antes cada goTo* lo repetía y goToSession no lo
  // hacía, así "Hoy toca → Empezar" pintaba la sesión en una vista oculta.
  const mostrarSubVista = () => {
    empujarHistorialSiHaceFalta();
    modoSesion(false);
    mainView.style.display = 'none';
    subView.style.display = 'block';
  };

  // Sesión de GYM/Calistenia a pantalla completa: la clase en <html> oculta
  // la barra inferior en móvil (el riel de tablet/PC se queda) y la sesión
  // trae su propia barra superior, así que se oculta el "Volver" genérico.
  // Se quita en todas las salidas: cualquier otra sub-vista (mostrarSubVista),
  // goToMain (volver, Atrás, guardar, descartar) y cleanup (cambiar de vista).
  const modoSesion = (activo) => {
    document.documentElement.classList.toggle('entreno-sesion-activa', activo);
    // Pantalla nueva: la sesión empieza arriba (no con el scroll de la lista).
    if (activo) document.getElementById('view-root')?.scrollTo(0, 0);
    const volver = document.getElementById('btn-entrenamiento-volver');
    if (volver) volver.style.display = activo ? 'none' : 'flex';
  };

  // Salir de una sesión (✕, "Volver"): el borrador queda (ver
  // sesion-borrador.js). Desde una lista de rutinas vuelve a ella; desde
  // "Hoy toca" o "Retomar", a la principal.
  const salirDeSesion = () => {
    cleanupSessionTimer();
    cleanupHiitTimer();
    if (categoriaActiva) goToRutinas(categoriaActiva); else goToMain();
  };

  const goToRutinas = async (cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    categoriaActiva = cat;
    viewState = 'rutinas';
    mostrarSubVista();

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
    mostrarSubVista();
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

  // Historial de sesiones (ver components/sesiones-historial.js): lista por
  // semana y detalle con Eliminar. Volver lleva a 'main', que se repinta
  // entero (una sesión eliminada cambia racha, anillos y volumen).
  const goToHistorial = async () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'historial';
    mostrarSubVista();

    try {
      subContent.innerHTML = await renderSesionesHistorial();
      initSesionesHistorialListeners(signal);
    } catch (err) {
      console.error('Error renderizando el historial:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${escapeHtml(err.message)}</div>`;
    }
  };

  // Cuerpo › historial de medidas (components/cuerpo.js). Guardar o
  // eliminar repinta solo esta lista; Volver repinta la principal entera.
  const goToCuerpo = async () => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'cuerpo';
    mostrarSubVista();
    const refreshCuerpo = async () => {
      if (viewState !== 'cuerpo') return;
      subContent.innerHTML = renderCuerpoHistorial(await db.getMedidas());
      initCuerpo({ repintar: refreshCuerpo, signal });
    };
    try {
      await refreshCuerpo();
    } catch (err) {
      console.error('Error renderizando Cuerpo:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${escapeHtml(err.message)}</div>`;
    }
  };

  const goToPreview = (plantilla, cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'preview';
    mostrarSubVista();

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
    mostrarSubVista();

    try {
      subContent.innerHTML = renderGeneradorPreview(plan, cat);
      initGeneradorPreviewListeners(plan, cat, async () => {
        await goToRutinas(cat);
      }, signal, () => openGeneradorConfigForm(cat));
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
    mostrarSubVista();

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

  // Estado vacío (sin rutinas): categoría elegida + "Generar mi rutina"
  // (mismo generador que la lista de rutinas; al guardar lleva a esa lista)
  // y "Crear rutina a mano" (formulario de la categoría; en HIIT, el de HIIT).
  const vacio = document.getElementById('entreno-vacio');
  if (vacio) {
    vacio.querySelectorAll('.entreno-vacio-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        vacio.dataset.cat = btn.dataset.cat;
        vacio.querySelectorAll('.entreno-vacio-cat').forEach(b => {
          const activo = b === btn;
          b.setAttribute('aria-pressed', String(activo));
          b.style.borderColor = activo ? 'var(--accent-teal)' : 'var(--surface-border)';
          b.style.background = activo ? 'color-mix(in srgb, var(--accent-teal) 14%, transparent)' : 'transparent';
          b.style.color = activo ? 'var(--accent-teal)' : 'var(--text-secondary)';
        });
      });
    });
    document.getElementById('btn-entreno-vacio-generar')?.addEventListener('click', () => openGeneradorConfigForm(vacio.dataset.cat));
    document.getElementById('btn-entreno-vacio-manual')?.addEventListener('click', () => {
      const cat = vacio.dataset.cat;
      categoriaActiva = cat;
      goToForm(cat);
    });
  }

  // opciones.borrador: retomar esa sesión en curso (GYM/Calistenia). Sin él,
  // una sesión nueva de GYM/Calistenia con otra ya en curso pide descartarla
  // antes (el borrador es uno solo y empezar otra lo reemplazaría).
  const goToSession = async (rutina, opciones = {}) => {
    const borrador = opciones.borrador || null;
    const usaBorrador = (r) => !esDescansoActivo(r, r.categoria) && r.categoria !== 'hiit';
    if (!borrador && usaBorrador(rutina)) {
      const enCurso = leerBorrador();
      if (enCurso) {
        const ok = await ConfirmDialog('Ya tienes una sesión en curso', `Si empiezas ${rutina.nombre}, se descarta lo que llevas de ${enCurso.nombreRutina || 'la otra sesión'}.`, { verb: 'Descartar y empezar' });
        // Que history.js suelte la entrada de la confirmación antes de
        // empujar la de la sub-vista (si no, su back() se la lleva).
        await esperarSalidaDeModal('global-confirm-modal');
        if (!ok) return;
        borrarBorrador();
      }
    }
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'session';
    mostrarSubVista();

    try {
      if (borrador) {
        // Retomar: los ejercicios y series del borrador, y su hora de inicio.
        const retomada = { ...rutina, ejercicios: borrador.ejercicios };
        modoSesion(true);
        subContent.innerHTML = await renderRutinaSession(retomada);
        initRutinaSessionListeners(retomada, async () => goToMain(), signal, { inicio: borrador.inicio, ejercicioActivo: borrador.ejercicioActivo, descanso: borrador.descanso, onSalir: salirDeSesion });
      } else if (esDescansoActivo(rutina, rutina.categoria)) {
        subContent.innerHTML = renderDescansoActivoSesion(rutina);
        initDescansoActivoListeners(rutina, async () => goToMain(), signal);
      } else if (rutina.categoria === 'hiit') {
        subContent.innerHTML = renderHiitTimer(rutina);
        initHiitTimerListeners(rutina, async () => goToMain(), signal);
      } else {
        modoSesion(true);
        subContent.innerHTML = await renderRutinaSession(rutina);
        initRutinaSessionListeners(rutina, async () => goToMain(), signal, { onSalir: salirDeSesion });
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
        // Desde "Hoy toca" de la principal no hay lista de rutinas detrás.
        salirDeSesion();
      } else if (viewState === 'progreso' && categoriaActiva) {
        goToRutinas(categoriaActiva);
      } else {
        goToMain();
      }
    });
  }
};