// Onboarding del sistema de nivel (PROMPT-NIVEL-FILTRADO.md, paso 2): 3
// preguntas, una por pantalla, respuesta de un toque. Se abre solo al
// entrar por primera vez a Entrenamiento, o manualmente desde el ícono de
// nivel junto al de perfil — y se puede repetir después para corregir.
//
// Guarda en dos lugares distintos a propósito, para no duplicar estado que
// ya existe: tiempoEntrenando es dato nuevo (db.saveNivelEntrenamiento);
// días y equipo se comparten con el generador de rutinas
// (db.saveGeneradorConfig, Etapa 4a) — completar esto también precompleta
// el generador. Sexo NO se pregunta acá: ya lo pide el perfil (IMC/gasto
// calórico) y Estándares de Fuerza lo lee de ahí directamente.
import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { EQUIPO_OPCIONES } from './generador-rutina-form.js';

const TIEMPO_OPCIONES = [
  { value: 'menos-1', label: 'Menos de 1 año', ayuda: 'Recién empezando o volviendo después de una pausa larga.' },
  { value: '1-3', label: '1 a 3 años', ayuda: 'Ya conoces los movimientos básicos y entrenas con cierta regularidad.' },
  { value: 'mas-3', label: 'Más de 3 años', ayuda: 'Entrenas hace tiempo, con experiencia real en progresión de cargas.' }
];

const TOTAL_PASOS = 3;

// Respuestas en curso del wizard — vive a nivel de módulo (no dentro de
// setup/open) porque ambas funciones necesitan leerla y escribirla: setup
// la llena cuando el usuario toca una opción, open la prellena si ya había
// respuestas guardadas, sin simular clicks ni disparar navegación como
// efecto secundario de la precarga.
const respuestas = { tiempoEntrenando: null, diasSemana: null };
let pasoActual = 1;

function renderDots() {
  return `
    <div style="display: flex; gap: 6px; justify-content: center; margin-bottom: 20px;">
      ${Array.from({ length: TOTAL_PASOS }, (_, i) => `
        <div style="width: 8px; height: 8px; background: ${i + 1 === pasoActual ? 'var(--accent-teal)' : 'var(--surface-border)'}; clip-path: polygon(20% 0, 100% 0, 80% 100%, 0 100%);"></div>
      `).join('')}
    </div>
  `;
}

function mostrarPaso(n) {
  pasoActual = n;
  document.querySelectorAll('.nivel-onboarding-paso').forEach((el, i) => el.style.display = i + 1 === n ? 'block' : 'none');
  const dots = document.getElementById('nivel-onboarding-dots');
  if (dots) dots.innerHTML = renderDots();
}

export function renderNivelOnboardingForm() {
  return `
    <div id="nivel-onboarding-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 460px;">
        <div id="nivel-onboarding-dots">${renderDots()}</div>

        <div id="nivel-onboarding-paso-1" class="nivel-onboarding-paso">
          <h2 style="margin-top: 0; font-size: 19px; font-weight: 700;">¿Cuánto tiempo llevas entrenando?</h2>
          <p style="color: var(--text-secondary); font-size: 13px; margin: -6px 0 20px 0;">Es tu punto de partida, no la última palabra — si tu historial muestra que ya estás más avanzado, la app te lo va a sugerir después.</p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${TIEMPO_OPCIONES.map(o => `
              <button class="nivel-onboarding-tiempo-btn tappable" data-value="${o.value}" style="text-align: left; padding: 14px 16px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); cursor: pointer;">
                <div style="font-size: 14px; font-weight: 700;">${o.label}</div>
                <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; font-weight: 500;">${o.ayuda}</div>
              </button>
            `).join('')}
          </div>
        </div>

        <div id="nivel-onboarding-paso-2" class="nivel-onboarding-paso" style="display: none;">
          <h2 style="margin-top: 0; font-size: 19px; font-weight: 700;">¿Cuántos días por semana puedes entrenar?</h2>
          <p style="color: var(--text-secondary); font-size: 13px; margin: -6px 0 20px 0;">Define si tus rutinas priorizan ejercicios compuestos (pocos días) o suman aislamiento (más días).</p>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
            ${[2, 3, 4, 5, 6].map(n => `
              <button class="nivel-onboarding-dias-btn tappable" data-value="${n}" style="padding: 16px 0; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 16px; font-weight: 700; cursor: pointer;">${n}</button>
            `).join('')}
          </div>
          <button id="btn-nivel-onboarding-atras-2" class="btn-primary tappable" style="background: var(--surface-2); color: var(--text-primary); margin-top: 20px;">Atrás</button>
        </div>

        <div id="nivel-onboarding-paso-3" class="nivel-onboarding-paso" style="display: none;">
          <h2 style="margin-top: 0; font-size: 19px; font-weight: 700;">¿Qué equipo tienes disponible?</h2>
          <p style="color: var(--text-secondary); font-size: 13px; margin: -6px 0 16px 0;">Filtra los ejercicios que la app te va a proponer. Puedes dejarlo vacío si solo entrenas con peso corporal.</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px;">
            ${EQUIPO_OPCIONES.map(o => `
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--text-primary); cursor: pointer;">
                <input type="checkbox" class="nivel-onboarding-equipo-check" value="${o.value}">
                ${o.label}
              </label>
            `).join('')}
          </div>
          <div style="display: flex; gap: 12px;">
            <button id="btn-nivel-onboarding-atras-3" class="btn-primary tappable" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Atrás</button>
            <button id="btn-nivel-onboarding-finalizar" class="btn-primary tappable" style="background: var(--accent-teal); color: #000; flex: 1;">Finalizar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupNivelOnboardingForm(onFinalizado) {
  const modal = document.getElementById('nivel-onboarding-modal');
  if (!modal) return;

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
  };

  modal.querySelectorAll('.nivel-onboarding-tiempo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      respuestas.tiempoEntrenando = btn.dataset.value;
      mostrarPaso(2);
    });
  });

  modal.querySelectorAll('.nivel-onboarding-dias-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      respuestas.diasSemana = parseInt(btn.dataset.value, 10);
      mostrarPaso(3);
    });
  });

  document.getElementById('btn-nivel-onboarding-atras-2').addEventListener('click', () => mostrarPaso(1));
  document.getElementById('btn-nivel-onboarding-atras-3').addEventListener('click', () => mostrarPaso(2));

  document.getElementById('btn-nivel-onboarding-finalizar').addEventListener('click', async () => {
    const equipoDisponible = [...modal.querySelectorAll('.nivel-onboarding-equipo-check:checked')].map(el => el.value);
    const btn = document.getElementById('btn-nivel-onboarding-finalizar');
    btn.disabled = true;
    try {
      await db.saveNivelEntrenamiento({ tiempoEntrenando: respuestas.tiempoEntrenando });
      // Lee la config existente para no pisar duracionSesionMin si el
      // usuario ya la había ajustado desde "Generar Rutina".
      const configPrevia = await db.getGeneradorConfig();
      await db.saveGeneradorConfig({
        equipoDisponible,
        diasSemana: respuestas.diasSemana,
        duracionSesionMin: configPrevia?.duracionSesionMin
      });
      close();
      Toast('Perfil de nivel guardado', 'success');
      if (onFinalizado) onFinalizado();
    } catch (err) {
      console.error('Error guardando el perfil de nivel:', err);
      Toast('No se pudo guardar — inténtalo de nuevo.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

// Prellena las respuestas previas (si las hay) sin simular clicks ni
// disparar navegación — así reabrir el onboarding desde el ícono de nivel
// permite corregir datos ya guardados en vez de repetir todo desde cero,
// y siempre arranca mostrando el paso 1.
export async function openNivelOnboardingForm() {
  const modal = document.getElementById('nivel-onboarding-modal');
  if (!modal) return;

  const [nivel, config] = await Promise.all([db.getNivelEntrenamiento(), db.getGeneradorConfig()]);

  respuestas.tiempoEntrenando = nivel?.tiempoEntrenando || null;
  respuestas.diasSemana = config?.diasSemana || null;

  const equipoGuardado = new Set(config?.equipoDisponible || []);
  modal.querySelectorAll('.nivel-onboarding-equipo-check').forEach(el => {
    el.checked = equipoGuardado.has(el.value);
  });

  mostrarPaso(1);
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}
