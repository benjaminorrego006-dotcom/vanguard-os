// Foco (Pomodoro) de una tarea de Lista — docs/PLAN-DIFICULTAD-FOCO.md, F3.
//
// Un solo foco a la vez. El estado vive en localStorage (`vg_foco`):
// { tareaId, titulo, fase: 'foco' | 'pausa', terminaEn, pausadoRestante }
// - fase 'foco': 25 min. Corriendo, `terminaEn` es la hora (ms) en que
//   termina; en pausa, `terminaEn` es null y `pausadoRestante` guarda los ms
//   que faltaban.
// - fase 'pausa': los 5 min de descanso después de un foco completo, solo
//   mientras la pantalla de foco está abierta.
// Al llegar a 0 se registra `foco_completado` (db.registrarFoco) con la
// hora de término real. Si el foco termina con la pantalla cerrada (otra
// vista, o la app cerrada), se avisa "Terminaste un foco de 25 min en
// <tarea>" y no hay pausa. Terminar antes no registra nada.
//
// La pantalla es un .modal-overlay con id (#foco-modal): history.js le da
// su entrada de historial. Atrás (o Escape) la cierra; acá se vuelve a
// abrir y se pregunta antes de cancelar el foco. Va en <body>, fuera de la
// vista: un render de la vista no la borra; navegar a otra pestaña la
// cierra y el foco sigue (la línea de Hoy lo vuelve a abrir).
import { db } from '../core/db.js';
import { esperarSalidaDeModal } from '../core/history.js';
import { playBeep } from '../core/audio.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';

export const MIN_FOCO = 25;
const MIN_PAUSA = 5;
const MS_FOCO = MIN_FOCO * 60 * 1000;
const MS_PAUSA = MIN_PAUSA * 60 * 1000;
const CLAVE = 'vg_foco';
const ARCO = 2 * Math.PI * 88;

// --- Estado ----------------------------------------------------------------
export function leerFoco() {
  try {
    const e = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (!e || !e.tareaId || (e.fase !== 'foco' && e.fase !== 'pausa')) return null;
    return e;
  } catch (err) { return null; }
}
function guardarFoco(e) {
  try {
    if (e) localStorage.setItem(CLAVE, JSON.stringify(e));
    else localStorage.removeItem(CLAVE);
  } catch (err) { /* sin localStorage: el foco vive solo en memoria de esta pestaña */ }
  memoria = e;
  actualizarLineasHoy();
  // El botón de foco del detalle (task-form.js) se pone al día con esto.
  window.dispatchEvent(new CustomEvent('vg-foco-cambio'));
}
// Respaldo en memoria si localStorage no está disponible.
let memoria = null;
const estado = () => leerFoco() || memoria;

const restanteDe = (e, ahora = Date.now()) => (e.terminaEn ? Math.max(0, e.terminaEn - ahora) : Math.max(0, e.pausadoRestante || 0));
const mmss = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Foco corriendo o pausado (no la pausa de descanso): lo que muestra Hoy.
export function focoEnCurso() {
  const e = estado();
  return e && e.fase === 'foco' ? { ...e, restante: restanteDe(e) } : null;
}

// --- Registro ----------------------------------------------------------------
let registrando = false;
async function registrar(e, terminaEn) {
  await db.registrarFoco({ tareaId: e.tareaId, minutos: MIN_FOCO, terminaEn });
}
const avisar = (titulo) => Toast(`Terminaste un foco de ${MIN_FOCO} min en ${titulo}`, 'success', 5000);
const sonar = () => {
  playBeep();
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (err) { /* sin vibración */ }
};

// Foco que llegó a 0. Con la pantalla abierta pasa a la pausa; si no, avisa
// y termina. El estado se escribe antes de registrar, así otro tick (u otra
// pestaña) no lo registra dos veces.
async function completarFoco(e) {
  if (registrando) return;
  registrando = true;
  const terminaEn = e.terminaEn;
  const conPantalla = pantallaAbierta();
  try {
    guardarFoco(conPantalla ? { ...e, fase: 'pausa', terminaEn: Date.now() + MS_PAUSA, pausadoRestante: null } : null);
    await registrar(e, terminaEn);
    sonar();
    if (conPantalla) pintar();
    else avisar(escapeHtml(e.titulo || 'tu tarea'));
  } catch (err) {
    console.error('[Foco] No se pudo registrar el foco', err);
  } finally {
    registrando = false;
  }
}

// --- Reloj global ----------------------------------------------------------
let intervalo = null;
function tick() {
  const e = estado();
  if (!e) { pararReloj(); actualizarLineasHoy(); return; }
  if (e.fase === 'foco' && e.terminaEn && Date.now() >= e.terminaEn) { completarFoco(e); return; }
  if (e.fase === 'pausa' && Date.now() >= e.terminaEn) {
    if (pantallaAbierta()) { sonar(); terminarPausa(); } else guardarFoco(null);
    return;
  }
  if (pantallaAbierta()) pintar();
  actualizarLineasHoy();
}
function arrancarReloj() {
  if (!intervalo) intervalo = setInterval(tick, 1000);
}
function pararReloj() {
  if (intervalo) { clearInterval(intervalo); intervalo = null; }
}
// Línea de Hoy: tiempo y "en pausa" al día; sin foco en curso, se quita.
// Solo cambia el contenido (el listener de clic es de dashboard.js).
function actualizarLineasHoy() {
  const e = focoEnCurso();
  document.querySelectorAll('[data-foco-linea]').forEach(el => {
    if (!e) { el.remove(); return; }
    const tiempo = el.querySelector('.hoy-foco-tiempo');
    const html = tiempoLinea(e);
    if (tiempo && tiempo.innerHTML !== html) tiempo.innerHTML = html;
    el.setAttribute('aria-label', etiquetaLinea(e));
  });
}

// Al abrir la app (app.js): un foco que venció con la app cerrada se
// registra con su hora de término real y se avisa; una pausa vencida se
// descarta. Si queda un foco en curso, el reloj sigue.
export async function initFoco() {
  const e = estado();
  // La pausa solo existe con la pantalla abierta: al abrir la app se descarta.
  if (e && e.fase === 'pausa') guardarFoco(null);
  else if (e && e.fase === 'foco' && e.terminaEn && Date.now() >= e.terminaEn) {
    guardarFoco(null);
    try {
      await registrar(e, e.terminaEn);
      const tarea = (await db.getTasks()).find(t => t.id === e.tareaId);
      avisar(escapeHtml((tarea && tarea.title) || e.titulo || 'tu tarea'));
    } catch (err) { console.error('[Foco] No se pudo registrar el foco vencido', err); }
  }
  if (estado()) arrancarReloj();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    tick();
    if (pantallaAbierta()) pedirPantallaEncendida();
  });
  // Navegar a otra pestaña cierra la pantalla; el foco sigue.
  window.addEventListener('hashchange', () => { if (pantallaAbierta()) cerrarPantalla(); });
  window.addEventListener('popstate', alAtras);
}

// --- Inicio ----------------------------------------------------------------
// Empieza un foco de 25 min en la tarea y abre la pantalla. Si ya hay uno en
// curso, abre ese (un solo foco a la vez). `alVolver`: abre el detalle de la
// tarea al terminar la pausa (si no está abierto debajo).
export function iniciarFoco(tarea, { alVolver } = {}) {
  const actual = focoEnCurso();
  if (!actual) {
    guardarFoco({ tareaId: tarea.id, titulo: tarea.title || '', fase: 'foco', terminaEn: Date.now() + MS_FOCO, pausadoRestante: null });
    arrancarReloj();
  }
  abrirPantallaFoco({ alVolver });
}

// --- Pantalla ----------------------------------------------------------------
let volverA = null;
let cerrandoAProposito = false;
let confirmando = false;

const overlay = () => document.getElementById('foco-modal');
function pantallaAbierta() {
  const o = overlay();
  return !!o && o.classList.contains('open');
}

export function abrirPantallaFoco({ alVolver } = {}) {
  if (!estado()) return;
  volverA = alVolver || null;
  confirmando = false;
  let o = overlay();
  if (!o) {
    o = document.createElement('div');
    o.id = 'foco-modal';
    o.className = 'modal-overlay foco-overlay';
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-labelledby', 'foco-titulo');
    o.innerHTML = `
      <div class="foco-pantalla">
        <div class="foco-etq num" id="foco-fase">FOCO · ${MIN_FOCO} MIN</div>
        <h2 class="foco-titulo" id="foco-titulo"></h2>
        <div class="foco-anillo">
          <svg viewBox="0 0 200 200" aria-hidden="true"><circle class="foco-anillo-fondo" cx="100" cy="100" r="88"></circle><circle class="foco-anillo-arco" id="foco-arco" cx="100" cy="100" r="88" style="stroke-dasharray: ${ARCO.toFixed(2)};"></circle></svg>
          <div class="foco-cuenta num" id="foco-cuenta" role="timer" aria-live="off"></div>
        </div>
        <div class="foco-estado" id="foco-estado" aria-live="polite"></div>
        <div class="foco-acciones" id="foco-acciones"></div>
      </div>`;
    document.body.appendChild(o);
  }
  // Encima de otro modal (el detalle de la tarea), que ya tapa la
  // navegación: la pantalla lo cubre entero, sin dejar ver una franja suya.
  o.classList.toggle('foco-overlay--sobre-modal', !!document.querySelector('.modal-overlay.open:not(#foco-modal)'));
  pintar();
  arrancarReloj();
  o.style.display = 'flex';
  // La clase va después de insertarlo: history.js observa el cambio de
  // "open" para empujar la entrada de historial.
  requestAnimationFrame(() => {
    o.classList.add('open');
    o.querySelector('.foco-btn')?.focus();
  });
  pedirPantallaEncendida();
}

function pintar() {
  const o = overlay();
  const e = estado();
  if (!o || !e) return;
  const restante = restanteDe(e);
  const enPausa = e.fase === 'foco' && !e.terminaEn;
  const total = e.fase === 'foco' ? MS_FOCO : MS_PAUSA;
  o.classList.toggle('foco-overlay--pausa', e.fase === 'pausa');
  o.querySelector('#foco-fase').textContent = e.fase === 'foco' ? `FOCO · ${MIN_FOCO} MIN` : `PAUSA · ${MIN_PAUSA} MIN`;
  o.querySelector('#foco-titulo').textContent = e.titulo || 'Tarea';
  o.querySelector('#foco-cuenta').textContent = mmss(restante);
  o.querySelector('#foco-cuenta').setAttribute('aria-label', `Quedan ${Math.ceil(restante / 60000)} min`);
  o.querySelector('#foco-arco').style.strokeDashoffset = String(ARCO * (1 - restante / total));
  const est = confirmando ? '¿Cancelar el foco? El tiempo no se registra.'
    : enPausa ? 'En pausa'
    : e.fase === 'pausa' ? 'Foco registrado. Descansa un poco.' : '';
  const estEl = o.querySelector('#foco-estado');
  if (estEl.textContent !== est) estEl.textContent = est;

  const clave = confirmando ? 'confirmar' : e.fase === 'pausa' ? 'pausa' : enPausa ? 'pausado' : 'corriendo';
  const acciones = o.querySelector('#foco-acciones');
  if (acciones.dataset.clave === clave) return;
  acciones.dataset.clave = clave;
  const btn = (id, texto, primario = false) => `<button type="button" id="${id}" class="foco-btn tappable${primario ? ' foco-btn--primario chaflan' : ''}">${texto}</button>`;
  acciones.innerHTML = {
    confirmar: btn('foco-seguir-confirmar', 'Seguir con el foco', true) + btn('foco-cancelar', 'Cancelar foco'),
    pausa: btn('foco-saltar-pausa', 'Saltar pausa', true) + btn('foco-otro', 'Otro foco'),
    pausado: btn('foco-seguir', 'Seguir', true) + btn('foco-terminar', 'Terminar'),
    corriendo: btn('foco-pausar', 'Pausar', true) + btn('foco-terminar', 'Terminar')
  }[clave];
  // Render por innerHTML: los listeners se reasignan en cada cambio.
  const en = (id, fn) => acciones.querySelector('#' + id)?.addEventListener('click', fn);
  en('foco-pausar', pausar);
  en('foco-seguir', seguir);
  en('foco-terminar', terminarAntes);
  en('foco-saltar-pausa', terminarPausa);
  en('foco-otro', otroFoco);
  en('foco-seguir-confirmar', () => { confirmando = false; pintar(); });
  en('foco-cancelar', () => { confirmando = false; guardarFoco(null); Toast('Foco cancelado', 'info'); cerrarPantalla(); });
  if (o.contains(document.activeElement) || document.activeElement === document.body) acciones.querySelector('button')?.focus();
}

function pausar() {
  const e = estado();
  if (!e || e.fase !== 'foco' || !e.terminaEn) return;
  guardarFoco({ ...e, terminaEn: null, pausadoRestante: restanteDe(e) });
  soltarPantallaEncendida();
  pintar();
}
function seguir() {
  const e = estado();
  if (!e || e.fase !== 'foco' || e.terminaEn) return;
  guardarFoco({ ...e, terminaEn: Date.now() + (e.pausadoRestante || 0), pausadoRestante: null });
  pedirPantallaEncendida();
  pintar();
}
// "Terminar": corta el foco sin registrarlo.
function terminarAntes() {
  guardarFoco(null);
  Toast('Foco terminado sin registrar', 'info');
  cerrarPantalla();
}
function otroFoco() {
  const e = estado();
  if (!e) return;
  guardarFoco({ tareaId: e.tareaId, titulo: e.titulo, fase: 'foco', terminaEn: Date.now() + MS_FOCO, pausadoRestante: null });
  pedirPantallaEncendida();
  pintar();
}
// Fin de la pausa (o "Saltar pausa"): cierra y vuelve al detalle de la tarea.
async function terminarPausa() {
  const e = estado();
  guardarFoco(null);
  await cerrarPantalla();
  if (e) volverAlDetalle(e.tareaId);
}
function volverAlDetalle(tareaId) {
  const detalle = document.querySelector('#task-modal.open');
  const abierto = detalle && document.getElementById('task-id')?.value === tareaId;
  if (!abierto && volverA) volverA(tareaId);
}

// Cierra la pantalla (el foco, si sigue, queda corriendo) y espera a que
// history.js suelte su entrada antes de que otro modal empuje la suya.
async function cerrarPantalla() {
  const o = overlay();
  if (!o) return;
  soltarPantallaEncendida();
  cerrandoAProposito = true;
  o.classList.remove('open');
  o.style.display = 'none';
  await esperarSalidaDeModal('foco-modal');
  o.remove();
  cerrandoAProposito = false;
  if (!estado()) pararReloj();
}

// Atrás (o Escape): history.js ya cerró la pantalla. Con un foco en curso se
// vuelve a abrir y se pregunta; en la pausa, Atrás la salta.
function alAtras() {
  const o = overlay();
  if (!o || cerrandoAProposito || o.classList.contains('open')) return;
  const e = estado();
  if (e && e.fase === 'foco') {
    confirmando = true;
    o.style.display = 'flex';
    o.classList.add('open');
    pintar();
    o.querySelector('#foco-seguir-confirmar')?.focus();
    return;
  }
  soltarPantallaEncendida();
  o.remove();
  guardarFoco(null);
  pararReloj();
  if (e) volverAlDetalle(e.tareaId);
}

// --- Pantalla siempre encendida (mismo patrón que el HUD de Entreno) ---------
let wakeLock = null;
async function pedirPantallaEncendida() {
  try {
    const e = estado();
    if (!overlay()) return;
    if (!e || (e.fase === 'foco' && !e.terminaEn)) return;
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    if (wakeLock && !wakeLock.released) return;
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (err) { /* sin permiso o sin soporte */ }
}
function soltarPantallaEncendida() {
  const lock = wakeLock;
  wakeLock = null;
  if (lock && !lock.released) lock.release().catch(() => { /* ya suelto */ });
}

// --- Línea de Hoy --------------------------------------------------------------
// "Foco en <tarea> · 12:40" mientras hay un foco en curso; la abre.
const tiempoLinea = (e) => `${mmss(restanteDe(e))}${e.terminaEn ? '' : ' · en pausa'}`;
const etiquetaLinea = (e) => `Foco en ${e.titulo || 'Tarea'}, quedan ${mmss(restanteDe(e))}${e.terminaEn ? '' : ', en pausa'}. Abrir`;
export function lineaFocoHoy() {
  const e = focoEnCurso();
  if (!e) return '';
  return `
    <button type="button" id="hoy-foco" class="hoy-foco tappable" data-foco-linea aria-label="${escapeHtml(etiquetaLinea(e))}">
      <span class="hoy-foco-etq num">FOCO</span>
      <span class="hoy-foco-texto">en ${escapeHtml(e.titulo || 'Tarea')}</span>
      <span class="hoy-foco-tiempo num">${tiempoLinea(e)}</span>
    </button>`;
}
