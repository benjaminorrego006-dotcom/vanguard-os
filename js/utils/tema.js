// js/utils/tema.js
// Tema de la interfaz: "color" (Órbita, predeterminado desde la Fase 3 del
// rediseño) o "gris" (modo sobrio: fondo neutro, sin luces de color; ver
// html[data-tema="gris"] en variables.css). Quien ya eligió Gris a mano lo
// conserva: la clave guardada no cambia.
// Es una preferencia de este dispositivo, no un dato de la app: vive en
// localStorage, no pasa por el event log ni por la sync. El script chico
// del <head> de index.html aplica la misma lectura antes del primer pintado
// para que no parpadee; si cambias la clave o los valores, cámbialos allá
// también.
const CLAVE = 'vg-tema';
const BARRA = { gris: '#0B0B0D', color: '#0C0A1C' }; // <meta name="theme-color"> = --o-bg

export function temaActual() {
  try {
    return localStorage.getItem(CLAVE) === 'gris' ? 'gris' : 'color';
  } catch (e) {
    return 'color';
  }
}

export function aplicarTema(tema) {
  const t = tema === 'gris' ? 'gris' : 'color';
  document.documentElement.setAttribute('data-tema', t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BARRA[t]);
  try { localStorage.setItem(CLAVE, t); } catch (e) { /* sin almacenamiento: dura hasta recargar */ }
  return t;
}

// Un color de acento armado en JS ('var(--cy)', 'var(--state-high)'…) que
// se va a usar como color de TEXTO pasa a su token de texto (--cy-t…), que
// en el tema Gris mantiene el color. Cualquier otro valor queda igual.
const CON_TEXTO = /var\(--(cy|am2|am|vi|rd|accent-(?:primary|purple|teal|orange|blue|ritual|plan|notas)|state-(?:high|medium|low|success|info))\)/g;
export function colorTexto(color) {
  return typeof color === 'string' ? color.replace(CON_TEXTO, 'var(--$1-t)') : color;
}
