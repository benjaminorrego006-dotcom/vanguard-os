// js/components/fin-hoja.js
// Piezas comunes de las hojas de Finanzas en Órbita (ingreso, gasto,
// ahorro, transferencia y pago fijo): la cifra grande que va armando el
// teclado, la línea de contexto (con ícono y texto cuando avisa algo que
// no alcanza) y la confirmación con check al guardar. Cada hoja es un
// oHoja() con su id de siempre y sigue con su propia lógica; esto solo
// arma el marcado. Estilos en css/finanzas.css (.o-fin-hoja-*).
import { oIcono } from './orbita.js';
import { escapeHtml } from '../utils/escape.js';

// Cifra grande (id `${prefijo}-numpad-display`, el de siempre).
export const montoHtml = (prefijo) =>
  `<p class="o-fin-hoja-monto o-num" id="${prefijo}-numpad-display" aria-live="polite">$0</p>`;

// Línea de contexto bajo la cifra (id `${prefijo}-context-display`).
export const contextoHtml = (prefijo, texto = '') =>
  `<p class="o-fin-hoja-contexto" id="${prefijo}-context-display">${escapeHtml(texto)}</p>`;

// Pinta la línea de contexto. alerta: un sobre que se excede o no tiene
// fondos (rojo con ícono y texto, nunca solo color).
export function pintarContexto(el, texto, alerta = false) {
  if (!el) return;
  el.classList.toggle('o-fin-alerta', alerta);
  el.innerHTML = alerta ? `${oIcono('alerta')}<span>${escapeHtml(texto)}</span>` : escapeHtml(texto);
}

// Capa de «registrado» que cubre la hoja un momento después de guardar.
export const confirmacionHtml = (prefijo, texto) => `
  <div id="${prefijo}-confirm-overlay" class="o-fin-hoja-ok" hidden>
    <span class="o-fin-hoja-ok-ico">${oIcono('check')}</span>
    <p>${escapeHtml(texto)}</p>
  </div>`;

// Contenido del botón Guardar mientras se guarda.
export const guardandoHtml = () => `${oIcono('check')}<span class="o-fin-oculto">Guardando</span>`;
