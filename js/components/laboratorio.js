// Laboratorio: sección de Inicio con los gráficos de todos los módulos
// juntos (ex Análisis, que el commit 17e7d1e había repartido dentro de
// Entreno/Finanzas y descartado para Tareas — ver docs de esa decisión).
// Vuelven a estar juntos acá, arriba de todo en Inicio, en vez de vivir
// como una vista propia con su propia ruta.
//
// chart.js pesa 204KB y antes solo se cargaba al entrar a Análisis; con
// esto pasaría a cargarse en cada apertura de la app si no se cuida. Por
// eso este módulo separa render (datos vía db.js, barato) de "montar
// gráfico" (llama a initTabListeners(), que sí dispara ensureChartJs()) —
// ver goLaboratorio.js en dashboard.js: el HTML entero de esta sección se
// difiere hasta que entra al viewport, no se genera en el primer render.
import { renderGoalForm, initGoalForm } from './goal-form.js';
import * as LabEntreno from './lab-entreno.js';
import * as LabFinanzas from './lab-finanzas.js';
import * as LabTareas from './lab-tareas.js';
import * as LabHabitos from './lab-habitos.js';
import * as LabSemana from './lab-semana.js';

// accentSoft recalculado del retinte de paleta (--cy/--am/--vi) — quedaban
// con las tripletas rgb() del acento viejo, más saturado.
const MODULOS = {
  // Revisión semanal: cruza todos los módulos, así que va neutra y primero.
  semana: { label: 'Semana', accent: 'var(--t1)', accentSoft: 'rgba(200, 221, 228, 0.08)', mod: LabSemana },
  entreno: { label: 'Entreno', accent: 'var(--cy)', accentSoft: 'rgba(79, 166, 179, 0.12)', mod: LabEntreno },
  finanzas: { label: 'Finanzas', accent: 'var(--am)', accentSoft: 'rgba(217, 138, 61, 0.12)', mod: LabFinanzas },
  tareas: { label: 'Tareas', accent: 'var(--vi)', accentSoft: 'rgba(115, 122, 180, 0.12)', mod: LabTareas },
  // Mismo acento que Tareas (--vi): Hábitos ya comparte ese scope MK III
  // en el resto de la app, así que no inventa un color de módulo propio.
  habitos: { label: 'Hábitos', accent: 'var(--vi)', accentSoft: 'rgba(115, 122, 180, 0.12)', mod: LabHabitos }
};
const ORDEN_MODULOS = ['semana', 'entreno', 'finanzas', 'tareas', 'habitos'];

let activeModulo = 'semana';
let activeTab = 'resumen';
let seleccionPedida = false;

// Deep-link desde otra vista (ej. "Metas" en Entreno) a un módulo/pestaña
// puntual del laboratorio antes de navegar a Inicio. No hace falta
// sessionStorage: al ser una SPA sin recarga de página, este módulo sigue
// vivo en memoria durante la navegación — el próximo renderLaboratorio()
// ya arranca en la selección pedida.
export function setSeleccionInicial(modulo, tab) {
  if (MODULOS[modulo]) activeModulo = modulo;
  activeTab = tab;
  seleccionPedida = true;
}

// Al entrar a la vista Laboratorio: "Semana" con la semana por defecto,
// salvo que otra vista haya pedido un módulo/pestaña (setSeleccionInicial).
export function entrarLaboratorio() {
  if (!seleccionPedida) {
    activeModulo = 'semana';
    activeTab = LabSemana.TABS[0].id;
  }
  seleccionPedida = false;
  LabSemana.reiniciar();
}

export function cleanupLaboratorio() {
  LabSemana.cleanup();
  LabEntreno.cleanup();
  LabFinanzas.cleanup();
  LabTareas.cleanup();
  LabHabitos.cleanup();
}

function renderSelectorModulo() {
  return `
    <div style="display: flex; gap: 6px; margin-bottom: 16px;">
      ${ORDEN_MODULOS.map(m => {
        const meta = MODULOS[m];
        const active = m === activeModulo;
        return `
          <button type="button" class="lab-modulo-btn" data-modulo="${m}" aria-pressed="${active}" style="flex: 1 1 auto; min-width: 0; padding: 10px 4px; border-radius: 12px; border: 1px solid ${active ? meta.accent : 'var(--surface-border)'}; background: ${active ? meta.accentSoft : 'transparent'}; color: ${active ? meta.accent : 'var(--text-secondary)'}; font-weight: 700; font-size: 11px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${meta.label}</button>
        `;
      }).join('')}
    </div>
  `;
}

export async function renderLaboratorio() {
  const modActual = MODULOS[activeModulo];
  const tabs = modActual.mod.TABS;
  if (!tabs.some(t => t.id === activeTab)) activeTab = tabs[0].id;

  const contentHtml = await modActual.mod.renderTab(activeTab);

  return `
    <div>
      ${renderSelectorModulo()}
      ${modActual.mod.sinPestanas ? '' : `<div style="display: flex; gap: 6px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 14px; padding: 5px; margin-bottom: 22px; overflow-x: auto;">
        ${tabs.map(t => `
          <button type="button" class="lab-tab" data-tab="${t.id}" style="flex: 1; padding: 9px 6px; border-radius: 10px; border: none; cursor: pointer; font-size: 12.5px; font-weight: 700; white-space: nowrap; background: ${activeTab === t.id ? modActual.accent : 'transparent'}; color: ${activeTab === t.id ? 'var(--bg-base)' : 'var(--text-secondary)'};">${t.label}</button>
        `).join('')}
      </div>`}
      <div id="lab-tab-content">${contentHtml}</div>
      ${renderGoalForm()}
    </div>
  `;
}

// `refresh` lo pasa dashboard.js: re-renderiza SOLO el contenedor del
// laboratorio (#lab-section-content), no la vista de Inicio entera — un
// cambio de pestaña acá no debe recalcular el reactor ni las filas.
export function initLaboratorioListeners(refresh) {
  document.querySelectorAll('.lab-modulo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modulo = btn.getAttribute('data-modulo');
      if (modulo === activeModulo) return;
      cleanupLaboratorio();
      activeModulo = modulo;
      activeTab = MODULOS[modulo].mod.TABS[0].id;
      refresh();
    });
  });

  document.querySelectorAll('.lab-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab === activeTab) return;
      activeTab = tab;
      refresh();
    });
  });

  // El modal de metas vive en el DOM mientras el laboratorio está montado
  // (así una meta recién creada no requiere cambiar de pestaña primero).
  initGoalForm(refresh);

  // Semana usa el tercer argumento para saltar a la pestaña de un módulo
  // desde su bloque; los demás módulos lo ignoran.
  const irAModulo = (modulo) => {
    if (!MODULOS[modulo] || modulo === activeModulo) return;
    cleanupLaboratorio();
    activeModulo = modulo;
    activeTab = MODULOS[modulo].mod.TABS[0].id;
    refresh();
  };
  MODULOS[activeModulo].mod.initTabListeners(activeTab, refresh, irAModulo);
}
