// js/views/entrenamiento.js
// Entreno en Órbita (Fase 9a del rediseño, docs/rediseno-total.md):
// cabecera con el nivel y pestañas Inicio · Rutinas · Progreso.
//  - Inicio: sesión en curso, «Hoy toca», sugerencias de nivel, una tarjeta
//    por categoría (anillo de la semana; abre Rutinas en esa categoría),
//    volumen semanal, sesiones e IMC.
//  - Rutinas: categoría (GYM · Calistenia · HIIT) y la lista de rutinas.
//  - Progreso: Cuerpo, historial de sesiones y progreso completo.
// Las sub-pantallas (lista de rutinas, formularios, sesión activa,
// historial, progreso completo, Cuerpo) y las hojas de Entreno siguen en
// MK III hasta su parte de la fase: van dentro de un contenedor con
// .mk3-entreno (antes el ámbito estaba en #view-root, ver app.js).
// La lógica (sub-vistas, historial, sesión, sugerencias) es la de siempre.
import { db } from '../core/db.js';
import { esperarSalidaDeModal } from '../core/history.js';
import { renderRutinasLista, initRutinasListaListeners, renderPlantillaPreview, initPlantillaPreviewListeners, renderGeneradorPreview, initGeneradorPreviewListeners } from '../components/rutinas-lista.js';
import { esDescansoActivo, renderDescansoActivoSesion, initDescansoActivoListeners } from '../components/descanso-activo.js';
import { renderGeneradorConfigForm, setupGeneradorConfigForm, openGeneradorConfigForm } from '../components/generador-rutina-form.js';
import { renderRutinaForm, initRutinaFormListeners } from '../components/rutina-form.js';
import { renderHiitRutinaForm, initHiitRutinaFormListeners } from '../components/hiit-rutina-form.js';
import { renderRutinaSession, initRutinaSessionListeners, cleanupSessionTimer } from '../components/rutina-session.js';
import { renderHiitTimer, initHiitTimerListeners, cleanupHiitTimer } from '../components/hiit-timer.js';
import { WEEKLY_GOALS } from '../core/trainingConfig.js';
import { renderProfileForm, setupProfileForm, openProfileForm } from '../components/profile-form.js';
import { renderNivelOnboardingForm, setupNivelOnboardingForm, openNivelOnboardingForm } from '../components/nivel-onboarding-form.js';
import { calcularIMC } from '../utils/bodyMetrics.js';
import { cleanupEjercicioCharts, initEjercicioDetalleChart } from '../components/ejercicio-detalle.js';
import { armarIndice, buscar, renderResultados, renderFichaEjercicio, rutinasConEjercicio, FICHA_CHART_ID } from '../components/entreno-buscador.js';
import { formatFechaCorta, diaKeyDe } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { formatNumero } from '../utils/numero.js';
import { detectarSugerencias } from '../core/sugerencias-nivel.js';
import { Toast, hayModalAbierto, ConfirmDialog } from '../utils/states.js';
import { leerBorrador, borrarBorrador, esBorradorLargo } from '../utils/sesion-borrador.js';
import { renderProgreso, initProgresoListeners, setContextoCategoria, cleanup as cleanupProgreso } from '../components/entreno-progreso.js';
import { renderMiniChart } from '../components/mini-chart.js';
import { calcularHoyToca } from '../utils/hoyToca.js';
import { renderSesionesHistorial, initSesionesHistorialListeners } from '../components/sesiones-historial.js';
import { renderCuerpoTarjeta, renderCuerpoHistorial, renderMedidaForm, setupMedidaForm, initCuerpo, initCuerpoGraficos, cleanupCuerpoGraficos } from '../components/cuerpo.js';
import { renderFotoModales, setupFotoModales, setupFotosHoja, cleanupFotos } from '../components/fotos-progreso.js';
import { guardiaVista } from '../core/vista-activa.js';
import { colorTexto } from '../utils/tema.js';
import { oAnillo } from '../components/orbita.js';

// Guardia de la navegación con que se montó esta vista (core/vista-activa.js):
// un repintado que termina después de cambiar de vista no escribe encima.
let vistaVigente = () => true;

// Íconos de línea (heredan el color; el tamaño lo da .o-btn / .o-fila).
const ICO = {
  ajustes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
  buscar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  volver: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
  ir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>',
  historial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline></svg>',
  progreso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="15 7 21 7 21 13"></polyline></svg>',
  alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
};

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

// Lectura aproximada de db.getNivelEntrenamiento() (tiempoEntrenando; los
// niveles reales son por rama y viven en Progreso).
const TIEMPO_ENTRENANDO_PILL = { 'menos-1': 'Nivel: recién empezando', '1-3': 'Nivel: intermedio', 'mas-3': 'Nivel: experimentado' };

const CAT_NOMBRES = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };
const CATS = ['gym', 'calistenia', 'hiit'];
const PESTANAS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'rutinas', label: 'Rutinas' },
  { id: 'progreso', label: 'Progreso' }
];

// Pestaña activa y categoría elegida en Rutinas. Volver de una sub-pantalla
// (formulario, sesión, progreso) repinta la principal en la misma pestaña.
// Al salir de la vista se vuelve a Inicio (ver cleanup).
let pestana = 'inicio';
let catRutinas = 'gym';

// Atajo "Entrenar" de Hoy: al montarse, la vista retoma la sesión en curso
// o, si no hay, empieza "Hoy toca" con los mismos botones de la principal;
// si no hay ninguno de los dos se queda en Entreno.
let entrenarPedido = false;
export function pedirEntrenarDesdeHoy() { entrenarPedido = true; pestana = 'inicio'; }

let categoriaActiva = null;
let viewState = 'main'; // 'main', 'rutinas', 'form', 'session', 'progreso', 'historial', 'cuerpo', 'ejercicio'
let currentViewController = null;
// Listeners de la lista de rutinas de la pestaña Rutinas (se abortan al repintar).
let rutinasTabController = null;
// Rutina que la pestaña Rutinas resalta al pintarse (desde el buscador o
// la ficha de un ejercicio); se consume una vez.
let rutinaResaltada = null;

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
// repintar si estamos en la pantalla principal ('main') — si el usuario
// está a mitad de una sesión/timer, en un formulario, o viendo su
// progreso, forzar un remount ahí se lo llevaría puesto. Se engancha una
// sola vez, igual que entrenoPopstateEnganchado arriba.
let entrenoSyncEnganchado = false;
// Repintados de la vista entera (aviso de cambios, pestaña, categoría): se
// numeran y solo se aplica el último pedido. Sin esto, un repintado por
// 'budget-updated' que empezó antes de elegir otra pestaña o categoría
// terminaba después y la deshacía.
let repintadoN = 0;
async function onSyncActualizadoEntreno() {
  if (viewState !== 'main' || hayModalAbierto()) return;
  const root = document.getElementById('view-root');
  const n = ++repintadoN;
  const htmlVista = await render();
  if (!vistaVigente() || n !== repintadoN) return;
  root.innerHTML = htmlVista;
  mountListeners();
}

const NIVEL_SUGERIDO_LABEL = { intermedio: 'Intermedio', avanzado: 'Avanzado' };

// "Listo para avanzar" (PROMPT-NIVEL-FILTRADO.md, paso 4/e): se calculan
// después de insertar el DOM, no durante render(), porque dependen de una
// lectura de IndexedDB (historial) que no tiene sentido bloquear el primer
// pintado. Nunca suben el nivel solas — solo arman la sugerencia con
// evidencia concreta; subir o descartar es una acción explícita del usuario.
// Una sola tarjeta debajo de "Hoy toca" (docs/PLAN-REVISION-OCT.md, 3.3),
// plegada por defecto y abierta si hay una sola sugerencia; adentro, una
// fila por rama con sus botones. Lo que el usuario abra o cierre se respeta
// en los repintados tras "Subir de nivel" / "Ahora no" (null = por defecto;
// vuelve a null al salir de la vista, ver cleanup).
let sugerenciasAbierta = null;

async function renderSugerenciaNivelBanner() {
  const contenedor = document.getElementById('sugerencia-nivel-banner');
  if (!contenedor) return;

  const sugerencias = await detectarSugerencias();
  if (!contenedor.isConnected) return;
  if (sugerencias.length === 0) { contenedor.innerHTML = ''; return; }

  const n = sugerencias.length;
  const abierta = sugerenciasAbierta ?? n === 1;
  const fila = (s) => `
    <li class="sugerencia-nivel o-ent-sug-fila" data-rama="${s.rama}">
      <p class="o-rotulo" data-foto="sug-rama">${escapeHtml(s.ramaLabel)} · ${NIVEL_SUGERIDO_LABEL[s.nivelSugerido]}</p>
      <p class="o-ent-sug-titulo" data-foto="sug-ej">${escapeHtml(s.ejercicioActual.nombre)} → ${escapeHtml(s.ejercicioSiguiente.nombre)}</p>
      <p class="o-card-texto" data-foto="sug-evid">${escapeHtml(s.evidencia)}</p>
      <div class="o-ent-acciones">
        <button type="button" class="btn-sugerencia-subir o-btn o-btn--secundario" data-rama="${s.rama}" data-nivel="${s.nivelSugerido}">Subir de nivel</button>
        <button type="button" class="btn-sugerencia-ahora-no o-btn o-btn--fantasma" data-rama="${s.rama}" data-nivel="${s.nivelSugerido}">Ahora no</button>
      </div>
    </li>`;
  contenedor.innerHTML = `
    <details id="sugerencias-nivel" class="o-card o-ent-sug"${abierta ? ' open' : ''}>
      <summary class="o-ent-sug-cab">${n} ${n === 1 ? 'ejercicio listo' : 'ejercicios listos'} para avanzar</summary>
      <ul class="o-ent-sug-lista">${sugerencias.map(fila).join('')}</ul>
    </details>`;

  // Tras cada innerHTML, los listeners se reasignan.
  // Un <details open> recién creado también dispara 'toggle': ese no cuenta.
  document.getElementById('sugerencias-nivel').addEventListener('toggle', (e) => {
    if (sugerenciasAbierta === null && e.target.open === abierta) return;
    sugerenciasAbierta = e.target.open;
  });
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
}

export let mountListeners;

// Llamado por el router (app.js) antes de desmontar esta vista. Cubre la
// posible instancia de Chart.js viva de la pestaña Tendencia de Progreso, y
// si el usuario se va a otra pestaña de la barra lateral en medio de una
// sesión/timer en curso (en vez de tocar "Volver", el único lugar que hoy
// los limpiaba), el setInterval del cronómetro de sesión o del timer HIIT,
// que si no, sigue corriendo en segundo plano indefinidamente.
export function cleanup() {
  sugerenciasAbierta = null;
  cleanupProgreso();
  cleanupEjercicioCharts();
  cleanupCuerpoGraficos();
  cleanupFotos();
  cleanupSessionTimer();
  cleanupHiitTimer();
  if (rutinasTabController) { rutinasTabController.abort(); rutinasTabController = null; }
  rutinaResaltada = null;

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
  pestana = 'inicio';
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
function renderSesionEnCurso(b) {
  if (!b) return '';
  const nombre = escapeHtml(b.nombreRutina || 'Entrenamiento');
  let tiempo;
  if (esBorradorLargo(b)) {
    const inicio = new Date(b.inicio);
    const dia = inicio.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
    const hora = inicio.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    tiempo = `desde el ${escapeHtml(dia)} <span class="o-num">${escapeHtml(formatFechaCorta(inicio))}</span>, <span class="o-num">${escapeHtml(hora)}</span>`;
  } else {
    const min = Math.max(0, Math.floor((Date.now() - b.inicio) / 60000));
    tiempo = min >= 60
      ? `<span class="o-num">${Math.floor(min / 60)}</span> h <span class="o-num">${min % 60}</span> min`
      : `<span class="o-num">${min}</span> min`;
  }
  const marcadas = b.ejercicios.reduce((n, ej) => n + (ej.series || []).filter(s => s.checked).length, 0);
  return `
    <section id="entreno-sesion-en-curso" class="o-card o-card--destacada o-ent-encurso" aria-labelledby="ent-encurso-rot">
      <p class="o-rotulo" id="ent-encurso-rot">Tienes una sesión en curso</p>
      <h2 class="o-ent-titulo">${nombre} <span class="o-ent-encurso-tiempo">· ${tiempo}</span></h2>
      <p class="o-card-texto"><span class="o-num">${marcadas}</span> ${marcadas === 1 ? 'serie marcada' : 'series marcadas'}</p>
      <div class="o-ent-acciones">
        <button type="button" id="btn-sesion-en-curso-retomar" class="o-btn o-btn--primario">Retomar</button>
        <button type="button" id="btn-sesion-en-curso-descartar" class="o-btn o-btn--secundario">Descartar</button>
      </div>
    </section>`;
}

// Racha de días seguidos con entreno: un logro (nunca rojo).
const rachaHtml = (n) => n > 0
  ? `<span class="o-ent-racha" data-foto="racha" data-valor="${n}">🔥 <span class="o-num">${n}</span> día${n === 1 ? '' : 's'} seguido${n === 1 ? '' : 's'}</span>`
  : '';

// --- Pestaña Inicio ----------------------------------------------------------
async function panelInicio(d) {
  const { sesiones, rutinas, resumenSemanal, racha, profile, nivelGuardado } = d;
  const rutinasPorId = {};
  rutinas.forEach(r => { rutinasPorId[r.id] = r; });
  const borrador = leerBorrador();

  // Falta el perfil (peso, estatura…) o el nivel declarado: una tarjeta con
  // botón al mismo formulario, en vez de abrirlo solo y tapar la vista.
  const faltaPerfil = !profile;
  const faltaNivel = !nivelGuardado;
  const tarjetaPerfilHtml = (faltaPerfil || faltaNivel) && !tarjetaPerfilOcultaHoy() ? `
    <section id="entreno-tarjeta-perfil" class="o-card o-ent-perfil" aria-labelledby="ent-perfil-titulo">
      <p class="o-rotulo">${faltaPerfil ? 'Perfil' : 'Nivel'}</p>
      <h2 class="o-ent-titulo" id="ent-perfil-titulo">${faltaPerfil ? 'Completa tu perfil para calcular tu nivel e IMC' : 'Define tu nivel para ajustar tus rutinas'}</h2>
      <p class="o-card-texto">${faltaPerfil && faltaNivel ? 'Tu peso y estatura calculan el IMC; tu nivel ajusta la exigencia del generador.' : faltaPerfil ? 'Con tu peso y estatura calculamos tu IMC.' : 'Con tu experiencia el generador elige ejercicios de tu nivel.'}</p>
      <div class="o-ent-acciones">
        ${faltaPerfil ? '<button id="btn-tarjeta-perfil-completar" type="button" class="o-btn o-btn--secundario">Completar</button>' : ''}
        ${faltaNivel ? '<button id="btn-tarjeta-perfil-nivel" type="button" class="o-btn o-btn--secundario">Definir mi nivel</button>' : ''}
        <button id="btn-tarjeta-perfil-ahora-no" type="button" class="o-btn o-btn--fantasma">Ahora no</button>
      </div>
    </section>` : '';

  const hoyToca = await calcularHoyToca(sesiones);
  // Un solo botón principal por pantalla: con una sesión en curso, Retomar
  // lo es y Empezar pasa a secundario.
  const claseEmpezar = borrador ? 'o-btn--secundario' : 'o-btn--primario';
  const hoyTocaHtml = hoyToca
    ? `
      <section class="o-card o-card--destacada o-ent-hoy" data-foto="hoy-toca" aria-labelledby="ent-hoy-nombre">
        <div class="o-ent-hoy-texto">
          <p class="o-rotulo">Hoy toca</p>
          <h2 class="o-ent-titulo" id="ent-hoy-nombre" data-foto="hoy-nombre">${escapeHtml(hoyToca.nombre)}</h2>
          <p class="o-card-texto" data-foto="hoy-cat">${CAT_NOMBRES[hoyToca.categoria] || escapeHtml(hoyToca.categoria)}</p>
        </div>
        <div class="o-ent-hoy-acc">
          ${rachaHtml(racha.actual)}
          <button id="btn-hoy-toca-empezar" type="button" data-id="${escapeHtml(hoyToca.id)}" class="o-btn ${claseEmpezar}">Empezar</button>
        </div>
      </section>`
    : rutinas.length === 0
    // Sin rutinas: estado vacío con acción. Se elige la categoría (GYM por
    // defecto) y los dos botones usan los mismos flujos que la lista de
    // rutinas de esa categoría.
    ? `
      <section id="entreno-vacio" class="o-card o-card--destacada o-ent-vacio" data-cat="gym" aria-labelledby="ent-vacio-titulo">
        <p class="o-rotulo">Entreno</p>
        <h2 class="o-ent-titulo" id="ent-vacio-titulo">Arma tu primera rutina</h2>
        <p class="o-card-texto">Genérala a tu medida según tus días y tu equipo, o créala a mano ejercicio por ejercicio.</p>
        <div class="o-chips" role="group" aria-label="Categoría">
          ${CATS.map((cat, i) => `<button type="button" class="o-chip entreno-vacio-cat" data-cat="${cat}" aria-pressed="${i === 0}">${CAT_NOMBRES[cat]}</button>`).join('')}
        </div>
        <div class="o-ent-acciones o-ent-acciones--col">
          <button id="btn-entreno-vacio-generar" type="button" class="o-btn ${claseEmpezar} o-btn--bloque">Generar mi rutina</button>
          <button id="btn-entreno-vacio-manual" type="button" class="o-btn o-btn--secundario o-btn--bloque">Crear rutina a mano</button>
        </div>
        ${rachaHtml(racha.actual)}
      </section>`
    : (racha.actual > 0 ? `<div class="o-ent-racha-sola">${rachaHtml(racha.actual)}</div>` : '');

  const ultimaPorCategoria = calcularUltimaSesionPorCategoria(sesiones, rutinasPorId);
  const subtituloTile = (cat) => ultimaPorCategoria[cat]
    ? `Última: ${formatFechaCorta(new Date(ultimaPorCategoria[cat]))}`
    : 'Sin sesiones todavía';
  const categoriasHtml = `
    <section class="o-ent-cats" aria-label="Esta semana por categoría">
      ${CATS.map(cat => `
        <button type="button" class="o-card o-ent-cat btn-explorar" data-cat="${cat}" data-foto="cat">
          ${oAnillo({ valor: resumenSemanal[cat], max: WEEKLY_GOALS[cat], centro: `${resumenSemanal[cat]}/${WEEKLY_GOALS[cat]}`, etiqueta: `${CAT_NOMBRES[cat]}: ${resumenSemanal[cat]} de ${WEEKLY_GOALS[cat]} sesiones esta semana` })}
          <span class="o-ent-cat-nombre">${CAT_NOMBRES[cat]}</span>
          <small class="o-ent-cat-ultima" data-foto="cat-ultima">${subtituloTile(cat)}</small>
        </button>`).join('')}
    </section>`;

  const sesionesEstaSemana = (resumenSemanal.gym || 0) + (resumenSemanal.calistenia || 0) + (resumenSemanal.hiit || 0);
  const { volumenPorSemana } = await db.getTendenciaSemanal(null, 6);
  // Volumen en kg (peso × reps). Las cifras de cada semana van sin
  // decimales para que no se monten.
  const volumenHtml = renderMiniChart(volumenPorSemana, {
    color: 'var(--o-mod)',
    unidad: ' kg',
    height: 70,
    width: 300,
    formatoEtiqueta: (v) => formatNumero(Math.round(v))
  });

  let imcHtml = '<p class="o-card-texto">Completa tu perfil para ver tu IMC.</p>';
  if (profile) {
    const imc = calcularIMC(profile.pesoKg, profile.estaturaCm);
    imcHtml = `
      <p class="o-ent-dato o-num" data-foto="imc-valor">${formatNumero(imc.valor)}</p>
      <p class="o-ent-imc-cat" data-foto="imc-cat" style="color: ${colorTexto(imc.color)};">${imc.categoria}</p>`;
  }

  return `
    <div class="o-ent-inicio">
    <div class="o-ent-col">
    ${tarjetaPerfilHtml}
    <!-- Buscador (components/entreno-buscador.js): rutinas y ejercicios. -->
    <div class="o-ent-busq-zona">
      <div class="o-ent-buscar">
        ${ICO.buscar}
        <input type="search" id="entreno-buscador" class="o-input" placeholder="Buscar ejercicio o rutina…" aria-label="Buscar ejercicio o rutina" aria-controls="entreno-buscador-res" autocomplete="off" enterkeyhint="search">
      </div>
      <div id="entreno-buscador-res" class="o-card o-ent-busq" aria-live="polite" hidden></div>
    </div>
    ${renderSesionEnCurso(borrador)}
    ${hoyTocaHtml}
    <!-- "Listo para avanzar": una tarjeta plegable, debajo de Hoy toca. -->
    <div id="sugerencia-nivel-banner"></div>
    </div>
    <div class="o-ent-col">
    ${categoriasHtml}
    <section class="o-ent-stats" aria-label="Resumen de la semana">
      <div class="o-card o-ent-volumen" data-foto="volumen">
        <p class="o-rotulo">Volumen semanal</p>
        ${volumenHtml}
      </div>
      <div class="o-card">
        <p class="o-rotulo">Sesiones</p>
        <p class="o-ent-dato o-num" data-foto="sesiones">${sesionesEstaSemana}</p>
        <p class="o-card-texto">esta semana</p>
      </div>
      <div class="o-card">
        <p class="o-rotulo">IMC</p>
        ${imcHtml}
      </div>
    </section>
    </div>
    </div>`;
}

// --- Pestaña Rutinas ---------------------------------------------------------
// La lista de rutinas (rutinas-lista.js) es Órbita desde la Fase 9b.
async function panelRutinas() {
  let lista;
  try {
    lista = await renderRutinasLista(catRutinas);
  } catch (err) {
    console.error('Error renderizando rutinas:', err);
    lista = `<p class="o-alerta" role="alert"><span class="o-alerta-ico">${ICO.alerta}</span><span class="o-alerta-cuerpo"><span class="o-alerta-titulo">Algo falló al cargar esta sección</span><span class="o-alerta-linea">${escapeHtml(err.message)}</span></span></p>`;
  }
  return `
    <div class="o-chips o-ent-rut-cats" role="group" aria-label="Categoría">
      ${CATS.map(cat => `<button type="button" class="o-chip" data-rut-cat="${cat}" aria-pressed="${cat === catRutinas}">${CAT_NOMBRES[cat]}</button>`).join('')}
    </div>
    <div id="ent-rutinas" class="o-ent-rutinas">${lista}</div>`;
}

// --- Pestaña Progreso --------------------------------------------------------
function panelProgreso({ sesiones, medidas }) {
  const fila = (id, ico, titulo, sub) => `
    <li><button type="button" id="${id}" class="o-fila o-ent-ir">
      <span class="o-fila-ico">${ico}</span>
      <span class="o-fila-texto"><b>${titulo}</b><small>${sub}</small></span>
      <span class="o-ent-ir-flecha">${ICO.ir}</span>
    </button></li>`;
  return `
    <div class="o-ent-progreso">
    ${renderCuerpoTarjeta(medidas)}
    <ul class="o-lista o-ent-enlaces">
      ${sesiones.length > 0 ? fila('link-historial-sesiones', ICO.historial, 'Historial de sesiones', `<span class="o-num">${sesiones.length}</span> ${sesiones.length === 1 ? 'sesión registrada' : 'sesiones registradas'}`) : ''}
      ${fila('link-ver-progreso-completo', ICO.progreso, 'Progreso completo', 'Estándares de fuerza, árbol de progresión, tendencia y metas')}
    </ul>
    </div>`;
}

export async function render() {
  const [sesiones, rutinas, resumenSemanal, racha, profile, medidas, nivelGuardado] = await Promise.all([
    db.getSesiones(),
    db.getRutinas(),
    db.getResumenEntrenoSemanal(),
    db.getRachaGeneral(),
    db.getProfile(),
    db.getMedidas(),
    db.getNivelEntrenamiento()
  ]);
  const nivelPillLabel = nivelGuardado ? (TIEMPO_ENTRENANDO_PILL[nivelGuardado.tiempoEntrenando] || 'Nivel: sin definir') : 'Nivel: sin definir';
  const d = { sesiones, rutinas, resumenSemanal, racha, profile, medidas, nivelGuardado };
  const panel = pestana === 'rutinas' ? await panelRutinas()
    : pestana === 'progreso' ? panelProgreso(d)
      : await panelInicio(d);

  return `
    <div class="o-vista o-ent o-mod-entreno">
      <div id="entrenamiento-main-view">
        <header class="o-mod-cab">
          <div>
            <h1 class="o-mod-titulo">Entreno</h1>
            <p class="o-mod-sub" data-foto="nivel">${nivelPillLabel}</p>
          </div>
          <!-- Perfil y nivel de entrenamiento se editan desde Configuración;
               este botón es solo el atajo. -->
          <button id="btn-open-cfg-entreno" type="button" class="o-btn o-btn--secundario o-btn--icono" aria-label="Configuración de entreno" title="Configuración de entreno">${ICO.ajustes}</button>
        </header>
        <div class="o-tabs ent-tabs" role="tablist" aria-label="Secciones de Entreno">
          ${PESTANAS.map(p => `<button type="button" role="tab" class="o-tab" data-ent-tab="${p.id}" id="ent-tab-${p.id}" aria-selected="${p.id === pestana}" aria-controls="ent-panel" tabindex="${p.id === pestana ? 0 : -1}">${p.label}</button>`).join('')}
        </div>
        <section id="ent-panel" class="o-ent-panel" role="tabpanel" aria-labelledby="ent-tab-${pestana}">${panel}</section>
      </div>

      <!-- Sub-pantallas. Formularios de rutina y vistas previas: Órbita
           (Fase 9b). Sesión, historial, progreso completo y Cuerpo: MK III
           hasta su parte de la fase (mostrarSubVista pone o quita
           .mk3-entreno). -->
      <div id="entrenamiento-sub-view" class="o-ent-sub" style="display: none;">
        <button id="btn-entrenamiento-volver" type="button" class="o-btn o-btn--secundario o-btn--icono" aria-label="Volver">${ICO.volver}</button>
        <div id="entrenamiento-sub-content" class="mk3-entreno"></div>
      </div>

      <div class="mk3-entreno o-ent-hojas">
        ${renderProfileForm()}
        ${renderMedidaForm()}
        ${renderFotoModales()}
        ${renderGeneradorConfigForm()}
        ${renderNivelOnboardingForm()}
      </div>
    </div>
  `;
}

mountListeners = () => {
  vistaVigente = guardiaVista('entrenamiento');
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
    const n = ++repintadoN;
    const htmlVista = await render();
    if (!vistaVigente() || n !== repintadoN) return;
    root.innerHTML = htmlVista;
    mountListeners();
  };

  // Pestañas: repintan la vista en la pestaña elegida (flechas para moverse
  // entre ellas, como en Hábitos y Finanzas).
  const tabs = [...document.querySelectorAll('[data-ent-tab]')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', async () => {
      if (tab.dataset.entTab === pestana) return;
      pestana = tab.dataset.entTab;
      await refreshFull();
      document.getElementById(`ent-tab-${pestana}`)?.focus();
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].click();
    });
  });

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

  document.getElementById('link-historial-sesiones')?.addEventListener('click', () => goToHistorial());
  // Cuerpo (Fase 6): la hoja de medidas y la tarjeta de Progreso.
  setupMedidaForm();
  setupFotosHoja();
  setupFotoModales();
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
    // Sin la sesión en curso, Empezar vuelve a ser el botón principal.
    refreshFull();
  });

  document.getElementById('link-ver-progreso-completo')?.addEventListener('click', () => goToProgreso());

  setupProfileForm(refreshFull);
  setupGeneradorConfigForm((plan, cat) => goToGeneradorPreview(plan, cat));
  setupNivelOnboardingForm(refreshFull);

  document.getElementById('btn-open-cfg-entreno')?.addEventListener('click', () => window.appRouter.navigate('configuracion'));

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
    // de calor, todos calculados en render(). La pestaña activa se conserva.
    refreshFull();
  };
  window.__entrenoGoToMain = goToMain;

  if (!entrenoPopstateEnganchado) {
    entrenoPopstateEnganchado = true;
    window.addEventListener('popstate', onPopStateEntrenamiento);
  }

  // Empuja UNA entrada de historial al entrar a la pila de sub-vistas desde
  // 'main' — entrar a otra sub-vista (form, sesión, etc.) no empuja una
  // nueva, ya alcanza con esa única entrada mientras no se vuelva del todo
  // a 'main' (ver goToMain).
  const empujarHistorialSiHaceFalta = () => {
    if (!entrenoHistorialEmpujado) {
      entrenoHistorialEmpujado = true;
      history.pushState({ entrenoSubView: true }, '');
    }
  };

  // Toda sub-vista (sesión, progreso, historial, formularios) se pinta en
  // #entrenamiento-sub-view: este es el único lugar que la muestra y oculta
  // la principal. `legado`: la sub-vista sigue en MK III y va dentro del
  // ámbito .mk3-entreno; las ya migradas a Órbita, sin él.
  const mostrarSubVista = (legado = true) => {
    // Un repintado de la principal que siga en curso ya no debe aplicarse:
    // taparía la sub-vista recién abierta.
    repintadoN++;
    subContent.classList.toggle('mk3-entreno', legado);
    empujarHistorialSiHaceFalta();
    modoSesion(false);
    mainView.style.display = 'none';
    subView.style.display = 'block';
    document.getElementById('view-root')?.scrollTo(0, 0);
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
    if (volver) volver.style.display = activo ? 'none' : '';
  };

  // Salir de una sesión (✕, "Volver"): el borrador queda (ver
  // sesion-borrador.js). Vuelve a la principal, en la pestaña desde la que
  // se empezó (Rutinas o Inicio).
  const salirDeSesion = () => {
    cleanupSessionTimer();
    cleanupHiitTimer();
    goToMain();
  };

  // La lista de rutinas vive en la pestaña Rutinas: ir a una categoría es
  // volver a la principal en esa pestaña.
  const goToRutinas = (cat) => {
    if (cat) catRutinas = cat;
    pestana = 'rutinas';
    goToMain();
  };

  // Progreso: pestañas Estándares/Árbol/Tendencia/Metas (ver
  // components/entreno-progreso.js). `categoria` llega solo cuando se
  // entra desde "Ver tu progreso en X" de una categoría puntual — desde
  // "Progreso completo" llega undefined y Progreso arranca en su
  // pestaña/categoría por defecto.
  const goToProgreso = async (categoria) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'progreso';
    mostrarSubVista();
    setContextoCategoria(categoria);

    const refreshProgreso = async () => {
      const htmlSub = await renderProgreso();
      if (!vistaVigente()) return;
      subContent.innerHTML = htmlSub;
      initProgresoListeners(refreshProgreso, signal);
    };

    try {
      await refreshProgreso();
    } catch (err) {
      console.error('Error renderizando Progreso:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${escapeHtml(err.message)}</div>`;
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
      const htmlSub = await renderSesionesHistorial();
      if (!vistaVigente()) return;
      subContent.innerHTML = htmlSub;
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
      const [medidas, fotos] = await Promise.all([db.getMedidas(), db.getFotos()]);
      if (!vistaVigente()) return;
      subContent.innerHTML = renderCuerpoHistorial(medidas, fotos);
      initCuerpo({ repintar: refreshCuerpo, signal });
      await initCuerpoGraficos(medidas);
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

    categoriaActiva = cat;
    viewState = 'preview';
    mostrarSubVista(false);

    try {
      subContent.innerHTML = renderPlantillaPreview(plantilla);
      initPlantillaPreviewListeners(cat, plantilla, async () => {
        goToRutinas(cat);
      }, signal);
    } catch (err) {
      console.error('Error renderizando preview:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${escapeHtml(err.message)}</div>`;
    }
  };

  const goToGeneradorPreview = (plan, cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    categoriaActiva = cat;
    viewState = 'generador-preview';
    mostrarSubVista(false);

    try {
      subContent.innerHTML = renderGeneradorPreview(plan, cat);
      initGeneradorPreviewListeners(plan, cat, async () => {
        goToRutinas(cat);
      }, signal, () => openGeneradorConfigForm(cat));
    } catch (err) {
      console.error('Error renderizando rutina generada:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${escapeHtml(err.message)}</div>`;
    }
  };

  const goToForm = async (cat) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    categoriaActiva = cat;
    viewState = 'form';
    mostrarSubVista(false);

    try {
      if (cat === 'hiit') {
        subContent.innerHTML = renderHiitRutinaForm();
        initHiitRutinaFormListeners(async () => {
          goToRutinas(cat);
        }, signal);
      } else {
        subContent.innerHTML = renderRutinaForm(cat);
        initRutinaFormListeners(cat, async () => {
          goToRutinas(cat);
        }, signal);
      }
    } catch (err) {
      console.error('Error renderizando formulario:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${escapeHtml(err.message)}</div>`;
    }
  };

  // Abrir una rutina (buscador o ficha): la pestaña Rutinas en su categoría,
  // con la rutina resaltada.
  const abrirRutina = async (id) => {
    const rutina = (await db.getRutinas()).find(r => r.id === id);
    if (!rutina) return;
    rutinaResaltada = rutina.id;
    if (viewState === 'main') {
      catRutinas = rutina.categoria;
      pestana = 'rutinas';
      refreshFull();
    } else {
      goToRutinas(rutina.categoria);
    }
  };

  // Ficha de un ejercicio (desde el buscador): catálogo, rutinas que lo
  // usan y su progreso. Solo lee.
  const goToEjercicio = async (nombre) => {
    if (currentViewController) currentViewController.abort();
    currentViewController = new AbortController();
    const signal = currentViewController.signal;

    viewState = 'ejercicio';
    mostrarSubVista(false);
    try {
      const [rutinas, historial] = await Promise.all([db.getRutinas(), db.getHistorialEjercicio(nombre)]);
      if (!vistaVigente() || viewState !== 'ejercicio') return;
      subContent.innerHTML = renderFichaEjercicio(nombre, { rutinas: rutinasConEjercicio(rutinas, nombre), historial });
      subContent.querySelectorAll('[data-ficha-rutina]').forEach(btn => {
        btn.addEventListener('click', () => abrirRutina(btn.dataset.fichaRutina), { signal });
      });
      await initEjercicioDetalleChart(FICHA_CHART_ID, historial);
    } catch (err) {
      console.error('Error renderizando la ficha del ejercicio:', err);
      subContent.innerHTML = `<p class="o-alerta" role="alert"><span class="o-alerta-ico">${ICO.alerta}</span><span class="o-alerta-cuerpo"><span class="o-alerta-titulo">Algo falló al cargar esta sección</span><span class="o-alerta-linea">${escapeHtml(err.message)}</span></span></p>`;
    }
  };

  // Buscador de Inicio: filtra al escribir; Enter abre el primer resultado
  // y Escape lo limpia. El índice se arma una vez por pintado.
  const buscador = document.getElementById('entreno-buscador');
  const resultados = document.getElementById('entreno-buscador-res');
  if (buscador && resultados) {
    let indice = null;
    const actualizar = async () => {
      const consulta = buscador.value;
      if (!consulta.trim()) { resultados.hidden = true; resultados.innerHTML = ''; return; }
      if (!indice) indice = armarIndice(await db.getRutinas());
      if (buscador.value !== consulta) return; // llegó otra tecla mientras tanto
      resultados.innerHTML = renderResultados(buscar(indice, consulta), consulta);
      resultados.hidden = false;
      resultados.querySelectorAll('[data-busq-rutina]').forEach(btn => btn.addEventListener('click', () => abrirRutina(btn.dataset.busqRutina)));
      resultados.querySelectorAll('[data-busq-ejercicio]').forEach(btn => btn.addEventListener('click', () => goToEjercicio(btn.dataset.busqEjercicio)));
    };
    buscador.addEventListener('input', actualizar);
    buscador.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        resultados.querySelector('[data-busq-rutina], [data-busq-ejercicio]')?.click();
      } else if (e.key === 'Escape' && buscador.value) {
        e.preventDefault();
        buscador.value = '';
        actualizar();
      }
    });
  }

  // Estado vacío (sin rutinas): categoría elegida + "Generar mi rutina"
  // (mismo generador que la lista de rutinas; al guardar lleva a esa lista)
  // y "Crear rutina a mano" (formulario de la categoría; en HIIT, el de HIIT).
  const vacio = document.getElementById('entreno-vacio');
  if (vacio) {
    vacio.querySelectorAll('.entreno-vacio-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        vacio.dataset.cat = btn.dataset.cat;
        vacio.querySelectorAll('.entreno-vacio-cat').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      });
    });
    document.getElementById('btn-entreno-vacio-generar')?.addEventListener('click', () => openGeneradorConfigForm(vacio.dataset.cat));
    document.getElementById('btn-entreno-vacio-manual')?.addEventListener('click', () => goToForm(vacio.dataset.cat));
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
        const htmlSub = await renderRutinaSession(retomada);
        if (!vistaVigente()) return;
        subContent.innerHTML = htmlSub;
        initRutinaSessionListeners(retomada, async () => goToMain(), signal, { inicio: borrador.inicio, ejercicioActivo: borrador.ejercicioActivo, descanso: borrador.descanso, onSalir: salirDeSesion });
      } else if (esDescansoActivo(rutina, rutina.categoria)) {
        subContent.innerHTML = renderDescansoActivoSesion(rutina);
        initDescansoActivoListeners(rutina, async () => goToMain(), signal);
      } else if (rutina.categoria === 'hiit') {
        subContent.innerHTML = renderHiitTimer(rutina);
        initHiitTimerListeners(rutina, async () => goToMain(), signal);
      } else {
        modoSesion(true);
        const htmlSub = await renderRutinaSession(rutina);
        if (!vistaVigente()) return;
        subContent.innerHTML = htmlSub;
        initRutinaSessionListeners(rutina, async () => goToMain(), signal, { onSalir: salirDeSesion });
      }
    } catch (err) {
      console.error('Error renderizando sesión:', err);
      subContent.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Error: ${escapeHtml(err.message)}</div>`;
    }
  };

  // Tarjetas de categoría de Inicio: abren Rutinas en esa categoría.
  document.querySelectorAll('.btn-explorar').forEach(btn => {
    btn.addEventListener('click', (e) => goToRutinas(e.currentTarget.getAttribute('data-cat')));
  });

  // Pestaña Rutinas: categoría y lista (rutinas-lista.js).
  if (rutinasTabController) { rutinasTabController.abort(); rutinasTabController = null; }
  if (pestana === 'rutinas' && document.getElementById('ent-rutinas')) {
    document.querySelectorAll('[data-rut-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.rutCat === catRutinas) return;
        catRutinas = btn.dataset.rutCat;
        refreshFull();
      });
    });
    rutinasTabController = new AbortController();
    const cat = catRutinas;
    initRutinasListaListeners(
      cat,
      () => goToForm(cat),
      (rutina) => goToSession(rutina),
      (plantilla) => goToPreview(plantilla, cat),
      rutinasTabController.signal,
      () => { categoriaActiva = cat; goToProgreso(cat); },
      () => openGeneradorConfigForm(cat)
    );
    if (rutinaResaltada) {
      const id = rutinaResaltada;
      rutinaResaltada = null;
      const iniciar = [...document.querySelectorAll('#ent-rutinas .btn-iniciar-sesion')].find(b => b.dataset.id === id);
      const tarjeta = iniciar?.closest('.o-ent-rutina');
      if (tarjeta) {
        tarjeta.classList.add('o-ent-rutina--resaltada');
        tarjeta.scrollIntoView({ block: 'center' });
        iniciar.focus({ preventScroll: true });
      }
    }
  }

  // Volver: a la principal, en la pestaña desde la que se entró.
  document.getElementById('btn-entrenamiento-volver')?.addEventListener('click', () => {
    if (viewState === 'session') salirDeSesion();
    else goToMain();
  });

  if (entrenarPedido) {
    entrenarPedido = false;
    if (viewState === 'main') {
      (document.getElementById('btn-sesion-en-curso-retomar') || document.getElementById('btn-hoy-toca-empezar'))?.click();
    }
  }
};
