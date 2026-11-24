// js/components/lista-detalle.js
// Layout «lista + detalle» de Órbita, reutilizable entre módulos (Hábitos,
// Plan › Tareas…).
//   - Celular y tablet (< 1024 px): el detalle es una sub-pantalla. Abrirlo
//     empuja una entrada de historial ({ [clave]: true }), así el botón atrás
//     del sistema vuelve a la lista en vez de salir de la app.
//   - PC (≥ 1024 px): lista a la izquierda y detalle a la derecha en la misma
//     pantalla. Abrir o cerrar el detalle no toca el historial ni el hash.
// La plantilla (oListaDetalle) va con css/orbita.css (.o-ld*). El estado lo
// lleva crearListaDetalle(); quien lo usa vuelve a pintar en alCambiar().
import { escapeHtml } from '../utils/escape.js';
import { oIcono } from './orbita.js';
import { esperarSalidaDeModal } from '../core/history.js';

export const ANCHO_LISTA_DETALLE = '(min-width: 1024px)';
export const esAncho = () => window.matchMedia(ANCHO_LISTA_DETALLE).matches;

// lista y detalle: HTML ya armado (datos escapados por quien llama). vacio:
// lo que ocupa la columna del detalle en PC cuando no hay nada abierto.
export function oListaDetalle({ id = '', lista = '', detalle = '', vacio = '', abierto = false, etiqueta = 'Detalle' } = {}) {
  return `
    <div${id ? ` id="${escapeHtml(id)}"` : ''} class="o-ld${abierto ? ' o-ld--abierto' : ''}">
      <div class="o-ld-lista">${lista}</div>
      <section class="o-ld-detalle" aria-label="${escapeHtml(etiqueta)}"${abierto ? ' aria-live="polite"' : ''}>${abierto ? detalle : vacio}</section>
    </div>`;
}

// Cabecera del detalle en PC: título + cerrar (sin historial).
export function oListaDetalleCab({ titulo = '', cerrarId = '', cerrarEtiqueta = 'Cerrar detalle' } = {}) {
  return `
    <header class="o-ld-cab">
      <h2 class="o-ld-titulo">${escapeHtml(titulo)}</h2>
      <button type="button" id="${escapeHtml(cerrarId)}" class="o-btn o-btn--fantasma o-btn--icono" aria-label="${escapeHtml(cerrarEtiqueta)}">${oIcono('cerrar')}</button>
    </header>`;
}

// Estado del detalle abierto. clave: la marca de la entrada de historial
// (p. ej. 'habitoDetalle'). alCambiar: repinta la vista.
export function crearListaDetalle({ clave, alCambiar }) {
  let id = null;
  let mq = null;
  const tieneEntrada = () => !!(history.state && history.state[clave]);
  const empujar = () => history.pushState({ ...(history.state || {}), [clave]: true }, '');
  // Soltar la entrada del detalle una sola vez: history.back() es asíncrono
  // y, hasta que llega su popstate, history.state sigue siendo la entrada.
  // Sin esto, dos cierres seguidos (un repintado que descarta y el botón
  // que cierra) retrocedían dos veces y salían de la vista.
  let soltando = false;
  const soltarEntrada = () => {
    if (soltando || !tieneEntrada()) return;
    soltando = true;
    history.back();
  };

  // Atrás del sistema en celular: cierra el detalle.
  const alVolver = () => {
    soltando = false;
    if (id !== null && !tieneEntrada()) { id = null; alCambiar(); }
  };
  // Cruce del corte (girar la tablet, cambiar el ancho de la ventana): con el
  // detalle abierto, al pasar a celular necesita su entrada para el atrás.
  const alCruzar = () => {
    if (id !== null && !esAncho() && !tieneEntrada()) empujar();
    alCambiar();
  };

  return {
    get id() { return id; },
    get abierto() { return id !== null; },
    // En celular el detalle ocupa toda la vista (sub-pantalla).
    get subpantalla() { return id !== null && !esAncho(); },
    enganchar() {
      if (mq) return;
      window.addEventListener('popstate', alVolver);
      mq = window.matchMedia(ANCHO_LISTA_DETALLE);
      mq.addEventListener('change', alCruzar);
    },
    abrir(nuevo) {
      if (!esAncho() && !tieneEntrada()) empujar();
      id = nuevo;
      return alCambiar();
    },
    // En PC solo repinta; si quedó una entrada (abierto en celular), se suelta
    // para no dejar un «atrás» fantasma.
    // Si un diálogo recién cerrado (p. ej. la confirmación de Eliminar)
    // todavía está soltando su propia entrada, se espera a que termine.
    async cerrar() {
      id = null;
      const modal = history.state && history.state.modalId;
      if (modal && !document.getElementById(modal)?.classList.contains('open')) await esperarSalidaDeModal(modal);
      soltarEntrada();
      return alCambiar();
    },
    // Cerrar sin repintar ni tocar el historial (cambio de pestaña, o el
    // elemento abierto en PC ya no existe).
    olvidar() { id = null; },
    // La sub-pantalla abierta ya no tiene elemento (se borró): además suelta
    // su entrada de historial, para no dejar un «atrás» que no hace nada.
    descartar() {
      id = null;
      soltarEntrada();
    },
    // Al salir de la vista.
    soltar() {
      window.removeEventListener('popstate', alVolver);
      if (mq) { mq.removeEventListener('change', alCruzar); mq = null; }
      if (id !== null) soltarEntrada();
      soltando = false;
      id = null;
    }
  };
}
