// "Descanso activo": el día 7 del generador cuando ya no hace falta apuntar a
// ningún patrón (diaLigero devuelve { nombre: 'Día 7 · Movilidad',
// ejercicios: [] }). No es una sesión de fuerza: se muestra como una tarjeta
// con tres sugerencias fijas y, si el usuario lo "abre", un botón para
// marcarlo como hecho — sin crear nunca una sesión vacía.
import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';

const SUGERENCIAS = [
  'Camina 30–45 min a ritmo cómodo',
  '10 min de movilidad: caderas, hombros y columna',
  'Duerme 7–9 h'
];

// Un día "sin ejercicios por diseño": el generador lo nombra "Movilidad" y lo
// deja vacío. Un día vacío por falta de equipo NO cuenta (no se llama así).
export function esDescansoActivo(dia, categoria) {
  return categoria !== 'hiit' && !!dia && (dia.ejercicios || []).length === 0 && /movilidad/i.test(dia.nombre || '');
}

export function renderDescansoActivoCard({ nombre, conBoton = false } = {}) {
  return `
    <div class="chaflan descanso-activo-card" style="background: var(--surface-2); border: 1px solid var(--surface-border); padding: 16px;">
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
        <h4 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--text-primary);">Descanso activo</h4>
        ${nombre ? `<span style="font-size: 11px; color: var(--text-disabled);">${escapeHtml(nombre)}</span>` : ''}
      </div>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 12px 0;">Hoy no toca fuerza: la semana ya quedó cubierta.</p>
      <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px;">
        ${SUGERENCIAS.map(s => `<li style="font-size: 13px; color: var(--text-primary); display: flex; gap: 8px;"><span aria-hidden="true" style="color: var(--accent-teal);">•</span><span>${s}</span></li>`).join('')}
      </ul>
      ${conBoton ? `<button type="button" id="btn-descanso-activo-hecho" class="btn-primary tappable" style="background: var(--accent-teal); color: #000; margin-top: 16px; padding: 12px; font-size: 14px;">Marcar como hecho</button>` : ''}
    </div>
  `;
}

export function renderDescansoActivoSesion(rutina) {
  return `<div style="padding: 4px 0;">${renderDescansoActivoCard({ nombre: rutina.nombre, conBoton: true })}</div>`;
}

export function initDescansoActivoListeners(rutina, onSuccess, signal) {
  const btn = document.getElementById('btn-descanso-activo-hecho');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await db.registrarDescansoActivoCompletado({ rutinaId: rutina.id, categoria: rutina.categoria, nombre: rutina.nombre });
      Toast('Descanso activo registrado.', 'success');
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('Error registrando descanso activo:', err);
      Toast('No se pudo registrar — intenta de nuevo.', 'error');
      btn.disabled = false;
    }
  }, { signal });
}
