// js/components/racha-reactor.js
// Piezas de la racha global que se usan en varias vistas: el escudo de una
// vida extra (Hoy, Hábitos › Logros y Laboratorio › Semana) y el aviso de la
// primera vida ganada. El antiguo "reactor" (tres anillos + insignias) se
// reemplazó en la Fase 6 por la pestaña Logros de Hábitos (views/habitos.js).
import { diaKeyDe } from '../utils/fecha.js';
import { Toast } from '../utils/states.js';

// Escudo SVG (no emoji) de una vida extra. `lleno` = vida disponible; vacío
// = hueco para una vida que todavía no se gana. El color lo pone quien lo
// usa (currentColor).
export function svgEscudo({ lleno = true, size = 14 } = {}) {
  return `<svg class="escudo-vida" aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${lleno ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
}

// Toast "Ganaste una vida extra" una sola vez en la vida del usuario: la
// primera vez que se ve vidas >= 1. Preferencia de UI → localStorage.
const CLAVE_PRIMERA_VIDA = 'vg-vida-extra-primera-vista';
export function avisarPrimeraVidaSiCorresponde(racha) {
  if (!racha || !(racha.vidas > 0)) return;
  try {
    if (localStorage.getItem(CLAVE_PRIMERA_VIDA)) return;
    localStorage.setItem(CLAVE_PRIMERA_VIDA, diaKeyDe(new Date()));
  } catch (e) { return; /* sin localStorage no hay forma de mostrarlo una sola vez */ }
  Toast('Ganaste una vida extra 🛡', 'success', 3500);
}
