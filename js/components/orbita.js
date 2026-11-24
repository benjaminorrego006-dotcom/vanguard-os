// js/components/orbita.js
// Componentes base de Órbita (docs/rediseno-total.md, Fase 4): plantillas
// HTML para el anillo, la misión y el mazo, la hoja inferior y el estado
// vacío, más el comportamiento que no se resuelve con CSS (abrir y cerrar
// hojas, pasar y completar misiones). Los estilos viven en css/orbita.css;
// botón, campo, tarjeta, fila, check, chip y pestañas son solo clases.
//
// Como el resto de la app, todo se pinta con innerHTML: quien use estas
// plantillas reasigna sus listeners después de cada render. montarMazo()
// delega en el contenedor, así que basta con llamarlo una vez por render.
import { escapeHtml } from '../utils/escape.js';

// Íconos de trazo (24×24, currentColor). Solo los que usan los componentes
// base; cada módulo sigue con los suyos.
const TRAZOS = {
  check: '<path d="M5 12l5 5 9-10"></path>',
  alerta: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  info: '<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="11" x2="12" y2="16"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
  estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"></path>',
  cerrar: '<line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line>',
  despues: '<path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path>',
  vacio: '<circle cx="12" cy="12" r="9"></circle><path d="M8 12h8"></path>'
};

export function oIcono(nombre, clase = '') {
  return `<svg class="${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TRAZOS[nombre] || TRAZOS.info}</svg>`;
}

// Duración de un token de movimiento en ms (--o-dur-*). Con movimiento
// reducido los tokens ya bajan solos, así que las esperas también.
export function msDeToken(nombre) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return v.endsWith('ms') ? n : n * 1000;
}
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

// --- Anillo de avance ---------------------------------------------------
// valor/max → porcentaje. El arco usa el degradado del módulo del
// contenedor (--o-mod → --o-mod-2). centro: la cifra (por defecto el %);
// sub: rótulo corto bajo la cifra. etiqueta: texto para lectores de
// pantalla ("Hábitos: 4 de 6").
let anillos = 0;
export function oAnillo({ valor = 0, max = 100, etiqueta = '', centro, sub = '', grande = false } = {}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
  const lleno = pct >= 100;
  const id = `o-anillo-g${++anillos}`;
  // Grosor en unidades del viewBox (100): proporcional al tamaño.
  const grosor = grande ? 10 : 12;
  const r = 50 - grosor / 2;
  const texto = centro !== undefined ? String(centro) : `${Math.round(pct)}%`;
  const arco = pct > 0
    ? `<circle class="o-anillo-arco" cx="50" cy="50" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${grosor}" stroke-linecap="round" pathLength="100" stroke-dasharray="${pct.toFixed(2)} 100"></circle>`
    : '';
  return `
    <div class="o-anillo${grande ? ' o-anillo--lg' : ''}${lleno ? ' o-anillo--lleno' : ''}" role="img" aria-label="${escapeHtml(etiqueta || texto)}">
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color: var(--o-mod, var(--o-text))"></stop><stop offset="1" style="stop-color: var(--o-mod-2, var(--o-text-2))"></stop></linearGradient></defs>
        <circle class="o-anillo-pista" cx="50" cy="50" r="${r}" fill="none" stroke-width="${grosor}"></circle>
        ${arco}
      </svg>
      <span class="o-anillo-centro" aria-hidden="true">${escapeHtml(texto)}${sub ? `<small>${escapeHtml(sub)}</small>` : ''}</span>
    </div>`;
}

// --- Estado vacío -------------------------------------------------------
// accion: texto del botón (opcional); accionId: su id para el listener.
export function oVacio({ icono = 'vacio', titulo = '', texto = '', accion = '', accionId = '' } = {}) {
  return `
    <div class="o-vacio">
      <span class="o-vacio-ico">${oIcono(icono)}</span>
      <h3 class="o-vacio-titulo">${escapeHtml(titulo)}</h3>
      ${texto ? `<p class="o-vacio-texto">${escapeHtml(texto)}</p>` : ''}
      ${accion ? `<button type="button" class="o-btn o-btn--primario"${accionId ? ` id="${escapeHtml(accionId)}"` : ''}>${escapeHtml(accion)}</button>` : ''}
    </div>`;
}

// --- Misiones -----------------------------------------------------------
// Una misión: { id, modulo ('habitos'|'plan'|'entreno'|'finanzas'|'notas'),
// rotulo, titulo, detalle, pista ("cierra el anillo"), hecho (verbo) }.
export function oMision({ id, modulo = '', rotulo = '', titulo = '', detalle = '', pista = '', hecho = 'Hecho' } = {}) {
  return `
    <article class="o-mision${modulo ? ` o-mod-${escapeHtml(modulo)}` : ''}" data-mision-id="${escapeHtml(id)}" aria-roledescription="misión">
      <div>
        ${rotulo ? `<p class="o-rotulo">${escapeHtml(rotulo)}</p>` : ''}
        <h3 class="o-mision-titulo">${escapeHtml(titulo)}</h3>
        ${detalle ? `<p class="o-mision-detalle">${escapeHtml(detalle)}</p>` : ''}
      </div>
      <div class="o-mision-pie">
        <span class="o-mision-pista">${escapeHtml(pista)}</span>
        <button type="button" class="o-btn o-btn--secundario o-btn--icono" data-mision-accion="despues" aria-label="Después: ${escapeHtml(titulo)}">${oIcono('despues')}</button>
        <button type="button" class="o-btn o-btn--primario" data-mision-accion="hecho">${oIcono('check')}${escapeHtml(hecho)}</button>
      </div>
    </article>`;
}

// El mazo muestra la primera misión; las demás asoman detrás. Sin
// misiones, el estado vacío que se le pase (o nada).
export function oMazo(misiones = [], { vacio = '' } = {}) {
  const n = misiones.length;
  if (!n) return `<div class="o-mazo" data-cola="0">${vacio}</div>`;
  const primera = { rotulo: `Siguiente misión · 1 de ${n}`, ...misiones[0] };
  return `<div class="o-mazo" data-cola="${Math.min(n, 3)}">${oMision(primera)}</div>`;
}

// Comportamiento del mazo: "Hecho" completa, "Después" o deslizar de lado
// la pasan. Llama a alHecho(id) / alDespues(id) cuando termina la salida;
// quien llama guarda el cambio (logEvent vía db.js) y vuelve a pintar.
// Devuelve una función para soltar los listeners.
const UMBRAL_DESLIZAR = 0.3; // fracción del ancho de la tarjeta
const UMBRAL_INICIO_PX = 8;
export function montarMazo(contenedor, { alHecho, alDespues } = {}) {
  if (!contenedor) return () => {};
  let ocupado = false;
  let arrastre = null;

  const salir = async (mision, clase, dir) => {
    if (ocupado) return;
    ocupado = true;
    if (dir) mision.dataset.dir = dir;
    mision.style.transform = '';
    mision.classList.remove('o-arrastrando');
    mision.classList.add(clase);
    await esperar(msDeToken('--o-dur-3'));
    ocupado = false;
    const id = mision.dataset.misionId;
    if (clase === 'o-hecha') { if (alHecho) await alHecho(id); }
    else if (alDespues) await alDespues(id);
  };

  const alClic = (e) => {
    const btn = e.target.closest('[data-mision-accion]');
    if (!btn || !contenedor.contains(btn)) return;
    const mision = btn.closest('.o-mision');
    if (!mision) return;
    if (btn.dataset.misionAccion === 'hecho') salir(mision, 'o-hecha');
    else salir(mision, 'o-saliendo', 'izq');
  };

  const alBajar = (e) => {
    const mision = e.target.closest('.o-mision');
    if (!mision || ocupado || e.target.closest('button, a, input')) return;
    arrastre = { mision, x: e.clientX, y: e.clientY, dx: 0, activo: false, puntero: e.pointerId };
  };
  const alMover = (e) => {
    if (!arrastre || e.pointerId !== arrastre.puntero) return;
    const dx = e.clientX - arrastre.x;
    const dy = e.clientY - arrastre.y;
    if (!arrastre.activo) {
      if (Math.abs(dx) < UMBRAL_INICIO_PX || Math.abs(dx) < Math.abs(dy)) {
        if (Math.abs(dy) > UMBRAL_INICIO_PX) arrastre = null; // es scroll vertical
        return;
      }
      arrastre.activo = true;
      arrastre.mision.classList.add('o-arrastrando');
      arrastre.mision.setPointerCapture?.(e.pointerId);
    }
    arrastre.dx = dx;
    arrastre.mision.style.transform = `translateX(${dx}px)`;
  };
  const alSoltar = () => {
    if (!arrastre) return;
    const { mision, dx, activo } = arrastre;
    arrastre = null;
    if (!activo) return;
    if (Math.abs(dx) > mision.offsetWidth * UMBRAL_DESLIZAR) {
      salir(mision, 'o-saliendo', dx < 0 ? 'izq' : 'der');
    } else {
      mision.classList.remove('o-arrastrando');
      mision.style.transform = '';
    }
  };

  contenedor.addEventListener('click', alClic);
  contenedor.addEventListener('pointerdown', alBajar);
  contenedor.addEventListener('pointermove', alMover);
  contenedor.addEventListener('pointerup', alSoltar);
  contenedor.addEventListener('pointercancel', alSoltar);
  return () => {
    contenedor.removeEventListener('click', alClic);
    contenedor.removeEventListener('pointerdown', alBajar);
    contenedor.removeEventListener('pointermove', alMover);
    contenedor.removeEventListener('pointerup', alSoltar);
    contenedor.removeEventListener('pointercancel', alSoltar);
  };
}

// --- Hoja inferior ------------------------------------------------------
// .modal-overlay con id + open: history.js la cierra con el botón atrás y
// con Escape, y se puede cerrar arrastrando el agarre. cuerpo y pie son
// HTML ya armado por quien llama (escapar ahí los datos del usuario).
export function oHoja({ id, titulo = '', cuerpo = '', pie = '', modulo = '' } = {}) {
  const tituloId = `${id}-titulo`;
  return `
    <div id="${escapeHtml(id)}" class="modal-overlay o-ui${modulo ? ` o-mod-${escapeHtml(modulo)}` : ''}" role="dialog" aria-modal="true" aria-labelledby="${escapeHtml(tituloId)}">
      <div class="o-hoja">
        <div class="o-hoja-cab">
          <h2 id="${escapeHtml(tituloId)}" class="o-hoja-titulo">${escapeHtml(titulo)}</h2>
          <button type="button" class="o-btn o-btn--fantasma o-btn--icono" data-hoja-cerrar aria-label="Cerrar">${oIcono('cerrar')}</button>
        </div>
        <div class="o-hoja-cuerpo">${cuerpo}</div>
        ${pie ? `<div class="o-hoja-pie">${pie}</div>` : ''}
      </div>
    </div>`;
}

export function abrirHoja(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('o-saliendo');
  overlay.style.display = 'flex';
  overlay.classList.add('open');
  // Foco en el primer control del contenido; si no hay, en Cerrar.
  const foco = overlay.querySelector('.o-hoja-cuerpo :is(input, textarea, select, button)') || overlay.querySelector('[data-hoja-cerrar]');
  if (foco) foco.focus({ preventScroll: true });
}

// Cierre con fundido; sacar "open" es lo que history.js vigila.
export async function cerrarHoja(id) {
  const overlay = document.getElementById(id);
  if (!overlay || !overlay.classList.contains('open')) return;
  overlay.classList.add('o-saliendo');
  await esperar(msDeToken('--o-dur-2'));
  overlay.classList.remove('open', 'o-saliendo');
  overlay.style.display = 'none';
}

// Botones [data-hoja-cerrar] y toque en el fondo. Llamar después de pintar.
export function montarHoja(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.querySelectorAll('[data-hoja-cerrar]').forEach(b => b.addEventListener('click', () => cerrarHoja(id)));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrarHoja(id); });
}
