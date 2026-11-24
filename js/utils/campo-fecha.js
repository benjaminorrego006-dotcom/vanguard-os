// Campos de fecha en formato chileno (dd-mm-aaaa). Chrome dibuja un
// <input type="date"> según el idioma del NAVEGADOR (no el lang de la
// página), así que en un equipo en inglés salía mm/dd/yyyy. Cada
// input[type="date"] que aparece en la página (MutationObserver, una sola
// vez por campo) pasa a ser un campo de texto que se ve dd-mm-aaaa pero
// cuyo .value sigue leyendo y escribiendo la clave 'YYYY-MM-DD': ningún
// formulario cambia. El selector nativo se abre con el ícono (mouse), con
// cualquier toque (pantallas táctiles) o con Alt+↓; elegir un día dispara
// 'input' y 'change' como el campo nativo.
import { diaKeyDe, fechaLocalDe } from './fecha.js';

const VALOR = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
const RE_CLAVE = /^\d{4}-\d{2}-\d{2}$/;
const RE_VISTA = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/;
const RE_DIGITOS = /^(\d{2})(\d{2})(\d{4})$/;

// 'dd-mm-aaaa' (o d/m/aaaa, o ddmmaaaa) → 'YYYY-MM-DD'; '' si no es un día real.
export function aClave(texto) {
  const t = String(texto || '').trim();
  const m = t.match(RE_VISTA) || t.match(RE_DIGITOS);
  if (!m) return '';
  const clave = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return diaKeyDe(fechaLocalDe(clave)) === clave ? clave : ''; // descarta 31-02 y similares
}

// 'YYYY-MM-DD' → 'dd-mm-aaaa'.
export function aVista(clave) {
  if (!RE_CLAVE.test(clave)) return '';
  const [a, m, d] = clave.split('-');
  return `${d}-${m}-${a}`;
}

// Un solo <input type="date"> oculto para abrir el selector nativo.
let selector = null;
function selectorNativo() {
  if (!selector) {
    selector = document.createElement('input');
    selector.type = 'date';
    selector.className = 'campo-fecha-selector';
    selector.tabIndex = -1;
    selector.setAttribute('aria-hidden', 'true');
    document.body.appendChild(selector);
  }
  return selector;
}

function abrirSelector(campo) {
  const sel = selectorNativo();
  if (typeof sel.showPicker !== 'function') return false;
  // Junto al campo, para que en PC el calendario se abra ahí.
  const r = campo.getBoundingClientRect();
  sel.style.left = `${r.left}px`;
  sel.style.top = `${r.bottom}px`;
  sel.min = campo.getAttribute('min') || '';
  sel.max = campo.getAttribute('max') || '';
  VALOR.set.call(sel, campo.value);
  sel.onchange = () => {
    campo.value = VALOR.get.call(sel);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
  };
  try { sel.showPicker(); return true; } catch (e) { return false; }
}

// Mientras se escribe: solo dígitos, con los guiones puestos solos.
function enmascarar(campo, e) {
  if (e.inputType && e.inputType.startsWith('delete')) return;
  const dig = VALOR.get.call(campo).replace(/\D/g, '').slice(0, 8);
  const partes = [dig.slice(0, 2), dig.slice(2, 4), dig.slice(4)].filter(Boolean);
  let texto = partes.join('-');
  if ((dig.length === 2 || dig.length === 4) && e.inputType === 'insertText') texto += '-';
  VALOR.set.call(campo, texto);
}

function mejorar(campo) {
  if (campo.dataset.campoFecha || campo.classList.contains('campo-fecha-selector')) return;
  const clave = VALOR.get.call(campo);
  campo.dataset.campoFecha = '1';
  campo.type = 'text';
  campo.inputMode = 'numeric';
  campo.autocomplete = 'off';
  campo.maxLength = 10;
  campo.pattern = '\\d{2}-\\d{2}-\\d{4}';
  if (!campo.placeholder) campo.placeholder = 'dd-mm-aaaa';
  if (!campo.title) campo.title = 'Fecha (dd-mm-aaaa)';
  campo.classList.add('campo-fecha');
  Object.defineProperty(campo, 'value', {
    configurable: true,
    get() { return aClave(VALOR.get.call(this)); },
    set(v) { VALOR.set.call(this, aVista(v == null ? '' : String(v))); }
  });
  campo.value = clave;

  campo.addEventListener('input', (e) => enmascarar(campo, e));
  // Táctil: el toque abre el calendario sin sacar el teclado (si el
  // navegador no tiene showPicker, el campo se enfoca y se escribe).
  let tactil = false;
  campo.addEventListener('pointerdown', (e) => {
    tactil = e.pointerType !== 'mouse';
    if (tactil && !campo.disabled && !campo.readOnly) e.preventDefault();
  });
  campo.addEventListener('click', (e) => {
    if (campo.disabled || campo.readOnly) return;
    const enIcono = e.offsetX > campo.clientWidth - campo.clientHeight;
    if (tactil || enIcono) {
      if (!abrirSelector(campo) && tactil) campo.focus();
    }
  });
  campo.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); abrirSelector(campo); }
  });
}

function revisar(raiz) {
  if (raiz.matches && raiz.matches('input[type="date"]')) mejorar(raiz);
  if (raiz.querySelectorAll) raiz.querySelectorAll('input[type="date"]').forEach(mejorar);
}

export function initCamposFecha() {
  revisar(document);
  new MutationObserver((cambios) => {
    for (const c of cambios) c.addedNodes.forEach((n) => { if (n.nodeType === 1) revisar(n); });
  }).observe(document.body, { childList: true, subtree: true });
}
