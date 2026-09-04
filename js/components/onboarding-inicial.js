// js/components/onboarding-inicial.js
// Modal de bienvenida de 3 pasos, saltable, que se muestra UNA sola vez en
// el primer arranque — hoy el primer arranque cae en un reactor con tres
// anillos en cero, una racha en 0 e insignias con candado, sin explicar
// nada. El flag de "ya lo vio" vive en IndexedDB (db.isOnboardingInicial-
// Completado / marcarOnboardingInicialCompletado), no en localStorage:
// localStorage se borra junto con los datos del sitio, y si el flag
// viviera ahí el onboarding reaparecería justo cuando el usuario ya perdió
// todo, que es la peor combinación posible.
//
// A propósito NO pide nada de Finanzas (ingreso mensual, regla 50/30/20):
// eso ya se define en Finanzas > Ajustes la primera vez que se necesita, y
// duplicar esa pregunta acá solo generaría dos fuentes de verdad.
import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { exportAllData } from '../utils/backup.js';

const TOTAL_PASOS = 3;
let paso = 1;

// Mismo par de tamaños de chaflán que ya usa el resto de Vanguard MK III
// (ver html.mk3-* .card / .btn-primary en components.css) — acá se aplican
// inline porque este modal puede aparecer con cualquier vista de fondo
// (normalmente Inicio, pero no depende de su scope mk3-dashboard para
// verse bien).
const CHAFLAN_CARD = 'clip-path: polygon(0 9px, 9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%);';
const CHAFLAN_BTN = 'clip-path: polygon(0 7px, 7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%);';
const MONO = 'font-family: var(--font-mono-mk3);';

const MODULOS = ['Entreno', 'Finanzas', 'Tareas', 'Hábitos', 'Análisis'];

function renderDots() {
  return `
    <div style="display: flex; gap: 6px; justify-content: center; margin-bottom: 18px;">
      ${Array.from({ length: TOTAL_PASOS }, (_, i) => `
        <div style="width: 20px; height: 4px; background: ${i + 1 === paso ? 'var(--accent-primary)' : 'var(--surface-2)'}; transition: background 0.2s ease;"></div>
      `).join('')}
    </div>
  `;
}

function mostrarPaso(n) {
  paso = n;
  document.querySelectorAll('.onboarding-inicial-paso').forEach((el, i) => { el.style.display = i + 1 === n ? 'block' : 'none'; });
  const dots = document.getElementById('onboarding-inicial-dots');
  if (dots) dots.innerHTML = renderDots();
}

function renderPaso1() {
  return `
    <div id="onboarding-inicial-paso-1" class="onboarding-inicial-paso">
      <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: var(--text-primary); ${MONO}">Bienvenido a Vanguard</h2>
      <p style="color: var(--text-secondary); font-size: 13.5px; line-height: 1.5; margin: 0 0 20px 0; ${MONO}">
        Vanguard es tu sistema personal para entrenar, cuidar tu plata y organizar tu día a día, todo en un solo lugar y sin conexión a internet.
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
        ${MODULOS.map(m => `
          <span style="background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); font-size: 11.5px; font-weight: 700; padding: 6px 12px; ${MONO} ${CHAFLAN_BTN}">${m}</span>
        `).join('')}
      </div>
      <button id="btn-onboarding-inicial-siguiente-1" class="tappable" style="width: 100%; background: var(--accent-primary); color: #000; border: none; padding: 14px; font-size: 13px; font-weight: 700; cursor: pointer; ${MONO} ${CHAFLAN_BTN}">Siguiente</button>
    </div>
  `;
}

function renderPaso2() {
  return `
    <div id="onboarding-inicial-paso-2" class="onboarding-inicial-paso" style="display: none;">
      <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: var(--text-primary); ${MONO}">Tus datos son solo tuyos</h2>
      <p style="color: var(--text-secondary); font-size: 13.5px; line-height: 1.5; margin: 0 0 20px 0; ${MONO}">
        Tus datos viven solo en este teléfono. No hay cuenta ni nube: si borras la app o cambias de equipo sin haber exportado, se pierden. Exporta un respaldo cada tanto.
      </p>
      <button id="btn-onboarding-inicial-exportar" class="tappable" style="width: 100%; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 13px; font-size: 13px; font-weight: 700; cursor: pointer; margin-bottom: 20px; ${MONO} ${CHAFLAN_BTN}">Exportar respaldo ahora</button>
      <div style="display: flex; gap: 10px;">
        <button id="btn-onboarding-inicial-atras-2" class="tappable" style="background: transparent; border: 1px solid var(--surface-border); color: var(--text-secondary); padding: 14px 18px; font-size: 13px; font-weight: 700; cursor: pointer; ${MONO} ${CHAFLAN_BTN}">Atrás</button>
        <button id="btn-onboarding-inicial-siguiente-2" class="tappable" style="flex: 1; background: var(--accent-primary); color: #000; border: none; padding: 14px; font-size: 13px; font-weight: 700; cursor: pointer; ${MONO} ${CHAFLAN_BTN}">Siguiente</button>
      </div>
    </div>
  `;
}

function renderPaso3Instrucciones() {
  if (window.__vgInstall && window.__vgInstall.deferredPrompt) {
    return `
      <p style="color: var(--text-secondary); font-size: 13.5px; line-height: 1.5; margin: 0 0 20px 0; ${MONO}">
        Instalada se siente como una app de verdad: ícono propio en tu pantalla de inicio, sin la barra del navegador encima.
      </p>
      <button id="btn-onboarding-inicial-instalar" class="tappable" style="width: 100%; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 13px; font-size: 13px; font-weight: 700; cursor: pointer; margin-bottom: 20px; ${MONO} ${CHAFLAN_BTN}">Instalar Vanguard</button>
    `;
  }
  return `
    <p style="color: var(--text-secondary); font-size: 13.5px; line-height: 1.5; margin: 0 0 14px 0; ${MONO}">
      Instalada se siente como una app de verdad: ícono propio en tu pantalla de inicio, sin la barra del navegador encima.
    </p>
    <div style="background: var(--surface-2); border: 1px solid var(--surface-border); padding: 12px 14px; margin-bottom: 10px; ${CHAFLAN_BTN}">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; ${MONO}">Chrome Android</div>
      <div style="font-size: 12.5px; color: var(--text-secondary); ${MONO}">Menú (⋮) → Instalar app.</div>
    </div>
    <div style="background: var(--surface-2); border: 1px solid var(--surface-border); padding: 12px 14px; margin-bottom: 20px; ${CHAFLAN_BTN}">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; ${MONO}">Safari iPhone</div>
      <div style="font-size: 12.5px; color: var(--text-secondary); ${MONO}">Compartir → Agregar a inicio.</div>
    </div>
  `;
}

function renderPaso3() {
  return `
    <div id="onboarding-inicial-paso-3" class="onboarding-inicial-paso" style="display: none;">
      <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: var(--text-primary); ${MONO}">Instálala en tu pantalla de inicio</h2>
      ${renderPaso3Instrucciones()}
      <div style="display: flex; gap: 10px;">
        <button id="btn-onboarding-inicial-atras-3" class="tappable" style="background: transparent; border: 1px solid var(--surface-border); color: var(--text-secondary); padding: 14px 18px; font-size: 13px; font-weight: 700; cursor: pointer; ${MONO} ${CHAFLAN_BTN}">Atrás</button>
        <button id="btn-onboarding-inicial-finalizar" class="tappable" style="flex: 1; background: var(--accent-primary); color: #000; border: none; padding: 14px; font-size: 13px; font-weight: 700; cursor: pointer; ${MONO} ${CHAFLAN_BTN}">Empezar a usar Vanguard</button>
      </div>
    </div>
  `;
}

function renderOnboardingInicial() {
  return `
    <div id="onboarding-inicial-modal" class="modal-overlay" style="z-index: 6000;">
      <div class="modal-content" style="max-width: 460px; border-radius: 0; box-shadow: none; ${CHAFLAN_CARD}">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 4px;">
          <button id="btn-onboarding-inicial-saltar" class="tappable" style="background: transparent; border: none; color: var(--text-disabled); font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px; ${MONO}">Saltar</button>
        </div>
        <div id="onboarding-inicial-dots">${renderDots()}</div>
        ${renderPaso1()}
        ${renderPaso2()}
        ${renderPaso3()}
      </div>
    </div>
  `;
}

async function cerrarOnboarding(modal) {
  await db.marcarOnboardingInicialCompletado();
  modal.classList.remove('open');
  setTimeout(() => modal.remove(), 300);
}

// Único punto de entrada: crea el modal en el DOM (fuera de #view-root, así
// sobrevive a la navegación entre vistas — mismo patrón que mountLockScreen
// en lock.js) y lo muestra. No hace nada si ya está montado (evita
// duplicarlo si algo llama a esto dos veces).
export function mountOnboardingInicial() {
  if (document.getElementById('onboarding-inicial-modal')) return;
  paso = 1;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderOnboardingInicial();
  document.body.appendChild(wrapper.firstElementChild);

  const modal = document.getElementById('onboarding-inicial-modal');

  document.getElementById('btn-onboarding-inicial-saltar').addEventListener('click', () => cerrarOnboarding(modal));

  document.getElementById('btn-onboarding-inicial-siguiente-1').addEventListener('click', () => mostrarPaso(2));
  document.getElementById('btn-onboarding-inicial-atras-2').addEventListener('click', () => mostrarPaso(1));
  document.getElementById('btn-onboarding-inicial-siguiente-2').addEventListener('click', () => mostrarPaso(3));
  document.getElementById('btn-onboarding-inicial-atras-3').addEventListener('click', () => mostrarPaso(2));

  document.getElementById('btn-onboarding-inicial-exportar').addEventListener('click', async () => {
    const btn = document.getElementById('btn-onboarding-inicial-exportar');
    btn.disabled = true;
    try {
      await exportAllData();
    } catch (err) {
      console.error('Error exportando respaldo desde el onboarding:', err);
      Toast('No se pudo exportar — inténtalo de nuevo.', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  const btnInstalar = document.getElementById('btn-onboarding-inicial-instalar');
  if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
      const evt = window.__vgInstall && window.__vgInstall.deferredPrompt;
      if (!evt) return;
      evt.prompt();
      const choice = await evt.userChoice;
      window.__vgInstall.deferredPrompt = null;
      if (choice.outcome === 'accepted') Toast('Vanguard instalada', 'success');
    });
  }

  document.getElementById('btn-onboarding-inicial-finalizar').addEventListener('click', () => cerrarOnboarding(modal));

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}
