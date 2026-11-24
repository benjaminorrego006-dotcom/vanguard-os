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

// Órbita (Fase 9b): la usa la vista previa de la rutina generada y, en la
// sesión, la pantalla de un día de descanso activo.
export function renderDescansoActivoCard({ nombre, conBoton = false } = {}) {
  return `
    <section class="o-card descanso-activo-card o-ent-descanso" data-foto="gen-dia">
      <div class="o-ent-prev-rut-cab">
        <h3 class="o-ent-prev-nombre" data-foto="gen-nombre">Descanso activo</h3>
        ${nombre ? `<span class="o-ent-descanso-dia">${escapeHtml(nombre)}</span>` : ''}
      </div>
      <p class="o-card-texto">Hoy no toca fuerza: la semana ya quedó cubierta.</p>
      <ul class="o-ent-descanso-lista">
        ${SUGERENCIAS.map(s => `<li>${s}</li>`).join('')}
      </ul>
      ${conBoton ? `<button type="button" id="btn-descanso-activo-hecho" class="o-btn o-btn--primario o-btn--bloque">Marcar como hecho</button>` : ''}
    </section>
  `;
}

export function renderDescansoActivoSesion(rutina) {
  return `<div class="o-mod-entreno o-ent-descanso-sesion">${renderDescansoActivoCard({ nombre: rutina.nombre, conBoton: true })}</div>`;
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
