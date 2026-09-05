// Modal de configuración del generador de rutinas (Etapa 4a). Separado del
// modal de perfil (profile-form.js): ese es para IMC/gasto calórico, esto
// es equipo/días/duración — cosas que solo le importan al generador.
import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { generarPlan } from '../core/generador-rutinas.js';

export const EQUIPO_OPCIONES = [
  { value: 'barra', label: 'Barra' },
  { value: 'mancuernas', label: 'Mancuernas' },
  { value: 'banda', label: 'Banda de resistencia' },
  { value: 'anillas', label: 'Anillas' },
  { value: 'barra-dominadas', label: 'Barra de dominadas' },
  { value: 'banco', label: 'Banco' },
  { value: 'maquina', label: 'Máquina de gimnasio' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'cajon', label: 'Cajón pliométrico' }
];

const DURACIONES = [20, 30, 45, 60, 75, 90];

export function renderGeneradorConfigForm() {
  return `
    <div id="generador-config-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 480px; max-height: 90vh; overflow-y: auto;">
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">Generar Rutina</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: -8px 0 20px 0;">Con qué cuentas para entrenar — el generador arma la rutina según tu nivel real en cada patrón de movimiento, sin proponer nada que no puedas hacer.</p>

        <div class="input-group">
          <div style="display: block; color: var(--text-secondary); font-size: 13px; font-weight: 600; margin-bottom: 8px;">Equipo disponible</div>
          <div id="generador-equipo-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
            ${EQUIPO_OPCIONES.map(o => `
              <label for="generador-equipo-${o.value}" style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--text-primary); cursor: pointer;">
                <input type="checkbox" id="generador-equipo-${o.value}" class="generador-equipo-check" value="${o.value}">
                ${o.label}
              </label>
            `).join('')}
          </div>
          <p style="font-size: 11px; color: var(--text-disabled); margin: 8px 0 0 0;">Sin nada marcado, el generador solo usa ejercicios de peso corporal.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="input-group">
            <label for="generador-dias-semana">Días por semana</label>
            <select id="generador-dias-semana">
              ${[2, 3, 4, 5, 6].map(n => `<option value="${n}">${n} días</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label for="generador-duracion">Duración por sesión</label>
            <select id="generador-duracion">
              ${DURACIONES.map(n => `<option value="${n}">${n} min</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button id="btn-cancel-generador-config" class="btn-primary" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Cancelar</button>
          <button id="btn-generar-plan" class="btn-primary" style="background: var(--accent-teal); color: #000; flex: 1;">Generar</button>
        </div>
      </div>
    </div>
  `;
}

export function setupGeneradorConfigForm(onGenerado) {
  const modal = document.getElementById('generador-config-modal');
  if (!modal) return;

  const btnCancel = document.getElementById('btn-cancel-generador-config');
  const btnGenerar = document.getElementById('btn-generar-plan');
  const btnCloseX = modal.querySelector('.btn-close-modal');

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
  };

  btnCancel.addEventListener('click', close);
  if (btnCloseX) btnCloseX.addEventListener('click', close);

  btnGenerar.addEventListener('click', async () => {
    const equipoDisponible = [...document.querySelectorAll('.generador-equipo-check:checked')].map(el => el.value);
    const diasSemana = parseInt(document.getElementById('generador-dias-semana').value, 10);
    const duracionSesionMin = parseInt(document.getElementById('generador-duracion').value, 10);
    const categoria = modal.dataset.categoria;

    // TODO (onboarding del sistema de nivel, pendiente): si categoria==='gym'
    // y equipoDisponible.length===0, el catálogo de GYM depende casi por
    // completo de barra/mancuernas/máquina — el generador solo cubre 2 de
    // los 8 patrones de movimiento (Rodilla y Core) y el resto queda en
    // aviso. Cuando se construya el onboarding, interceptar acá y sugerir
    // Calistenia en su lugar en vez de dejar que el usuario reciba una
    // rutina de 2 ejercicios sin más contexto. No implementado todavía —
    // pedido explícito del usuario de anotarlo, no resolverlo ahora.

    btnGenerar.disabled = true;
    btnGenerar.textContent = 'Generando…';
    try {
      await db.saveGeneradorConfig({ equipoDisponible, diasSemana, duracionSesionMin });
      const plan = await generarPlan({ categoria, diasSemana, duracionSesionMin, equipoDisponible });
      close();
      if (onGenerado) onGenerado(plan, categoria);
    } catch (err) {
      console.error('Error generando rutina:', err);
      Toast('No se pudo generar la rutina — intenta de nuevo.', 'error');
    } finally {
      btnGenerar.disabled = false;
      btnGenerar.textContent = 'Generar';
    }
  });
}

export async function openGeneradorConfigForm(categoria) {
  const modal = document.getElementById('generador-config-modal');
  if (!modal) return;
  modal.dataset.categoria = categoria;

  const config = await db.getGeneradorConfig();
  const equipoGuardado = new Set(config?.equipoDisponible || []);
  document.querySelectorAll('.generador-equipo-check').forEach(el => {
    el.checked = equipoGuardado.has(el.value);
  });
  document.getElementById('generador-dias-semana').value = config?.diasSemana || 3;
  document.getElementById('generador-duracion').value = config?.duracionSesionMin || 45;

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}
