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
import { db } from '../core/db.js';
import { renderMiniChart } from './mini-chart.js';
import { renderGoalForm, initGoalForm } from './goal-form.js';
import * as LabEntreno from './lab-entreno.js';
import * as LabFinanzas from './lab-finanzas.js';
import * as LabTareas from './lab-tareas.js';
import * as LabHabitos from './lab-habitos.js';

// accentSoft recalculado del retinte de paleta (--cy/--am/--vi) — quedaban
// con las tripletas rgb() del acento viejo, más saturado.
const MODULOS = {
  entreno: { label: 'Entreno', accent: 'var(--cy)', accentSoft: 'rgba(79, 166, 179, 0.12)', mod: LabEntreno },
  finanzas: { label: 'Finanzas', accent: 'var(--am)', accentSoft: 'rgba(217, 138, 61, 0.12)', mod: LabFinanzas },
  tareas: { label: 'Tareas', accent: 'var(--vi)', accentSoft: 'rgba(115, 122, 180, 0.12)', mod: LabTareas },
  // Mismo acento que Tareas (--vi): Hábitos ya comparte ese scope MK III
  // en el resto de la app, así que no inventa un color de módulo propio.
  habitos: { label: 'Hábitos', accent: 'var(--vi)', accentSoft: 'rgba(115, 122, 180, 0.12)', mod: LabHabitos }
};
const ORDEN_MODULOS = ['entreno', 'finanzas', 'tareas', 'habitos'];

let activeModulo = 'entreno';
let activeTab = 'desglose';

// Deep-link desde otra vista (ej. "Metas" en Entreno) a un módulo/pestaña
// puntual del laboratorio antes de navegar a Inicio. No hace falta
// sessionStorage: al ser una SPA sin recarga de página, este módulo sigue
// vivo en memoria durante la navegación — el próximo renderLaboratorio()
// ya arranca en la selección pedida.
export function setSeleccionInicial(modulo, tab) {
  if (MODULOS[modulo]) activeModulo = modulo;
  activeTab = tab;
}

export function cleanupLaboratorio() {
  LabEntreno.cleanup();
  LabFinanzas.cleanup();
  LabTareas.cleanup();
  LabHabitos.cleanup();
}

// El resumen que reemplaza a la idea original de "Cruces" como quinto
// módulo: acá SÍ se cumple el "todos juntos" que ya prometía el copy de
// dashboard.js — por eso vive arriba del selector de pestañas, siempre
// visible sin importar qué módulo/pestaña esté activo, en vez de ser una
// pestaña más que hay que ir a buscar. Sin acento propio (var(--text-
// primary) para los títulos) — mismo criterio que Inicio: el color de
// marca se reserva para lo que no pertenece a un solo módulo.
//
// Dos cruces, cada uno como dos renderMiniChart apilados (una serie por
// card, mismo criterio de "cero riesgo" que el resto del Laboratorio) en
// vez de un componente de doble línea nuevo:
//   - Energía (Ritual) × Volumen (Entreno), por día, últimos 14 días.
//   - Cumplimiento de Hábitos por semana (últimas 8) × % del presupuesto
//     en Deseos del mes en curso, repetido como línea plana en esas 8
//     semanas — no hay una serie mensual de Hábitos hoy, y construirla es
//     trabajo aparte (ver plan de Fase 2b/mejoras futuras).
async function renderResumenCruzado() {
  const [energiaPorDia, volumenPorDia, cumplimientoHabitos, budget] = await Promise.all([
    db.getEnergiaPorDia(14),
    db.getVolumenPorDia(14),
    db.getTendenciaCumplimientoHabitos(8),
    db.getBudget()
  ]);

  const wantsEntry = budget.allocations.find(a => a.category === 'Wants');
  const wantsPct = wantsEntry ? wantsEntry.percent : 0;
  const wantsSerie = Array.from({ length: 8 }, () => wantsPct);

  const cardHtml = (titulo, chartHtml) => `
    <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 12px;">
      <h3 style="font-size: 12.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; margin: 0 0 12px 0;">${titulo}</h3>
      ${chartHtml}
    </div>`;

  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">Resumen</h2>
      <p style="font-size: 11.5px; color: var(--text-secondary); margin: 0 0 14px 0;">Cruces entre módulos — lo único acá que de verdad mira todo junto.</p>

      ${cardHtml('Energía del Ritual', renderMiniChart(energiaPorDia, {
        color: 'var(--accent-ritual)', unidad: '',
        label: 'Energía reportada por día (últimos 14 días)',
        emptyText: 'Completa el Ritual un par de días más para ver esto.'
      }))}
      ${cardHtml('Volumen de Entreno', renderMiniChart(volumenPorDia, {
        color: 'var(--cy)', unidad: '',
        label: 'Volumen total por día (últimos 14 días)',
        emptyText: 'Registra un par de sesiones más para ver esto.'
      }))}

      ${cardHtml('Cumplimiento de Hábitos', renderMiniChart(cumplimientoHabitos, {
        color: 'var(--vi)', unidad: '%',
        label: 'Cumplimiento promedio por semana (últimas 8 semanas)',
        emptyText: 'Marca algunos hábitos más para ver esto.'
      }))}
      ${cardHtml('Deseos del mes', renderMiniChart(wantsSerie, {
        color: 'var(--am)', unidad: '%',
        label: '% del presupuesto en Deseos este mes, repetido para comparar contra las 8 semanas de arriba',
        emptyText: 'Registra ingresos y gastos este mes para ver esto.'
      }))}
    </div>
  `;
}

function renderSelectorModulo() {
  return `
    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
      ${ORDEN_MODULOS.map(m => {
        const meta = MODULOS[m];
        const active = m === activeModulo;
        return `
          <button type="button" class="lab-modulo-btn" data-modulo="${m}" style="flex: 1; padding: 10px 6px; border-radius: 12px; border: 1px solid ${active ? meta.accent : 'var(--surface-border)'}; background: ${active ? meta.accentSoft : 'transparent'}; color: ${active ? meta.accent : 'var(--text-secondary)'}; font-weight: 700; font-size: 12.5px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.4px;">${meta.label}</button>
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
      ${await renderResumenCruzado()}
      ${renderSelectorModulo()}
      <div style="display: flex; gap: 6px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 14px; padding: 5px; margin-bottom: 22px; overflow-x: auto;">
        ${tabs.map(t => `
          <button type="button" class="lab-tab" data-tab="${t.id}" style="flex: 1; padding: 9px 6px; border-radius: 10px; border: none; cursor: pointer; font-size: 12.5px; font-weight: 700; white-space: nowrap; background: ${activeTab === t.id ? modActual.accent : 'transparent'}; color: ${activeTab === t.id ? 'var(--bg-base)' : 'var(--text-secondary)'};">${t.label}</button>
        `).join('')}
      </div>
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

  MODULOS[activeModulo].mod.initTabListeners(activeTab, refresh);
}
