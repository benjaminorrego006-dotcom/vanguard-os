// Pantalla "Progreso" de Entreno: consolida en pestañas lo que antes vivía
// repartido — Árbol y Estándares dentro de cada categoría (GYM/Calistenia/
// HIIT), Tendencia también por categoría, y Metas en el dashboard principal
// de Entreno. Mismo motivo que el Laboratorio de Inicio/Más: evitar repetir
// la misma estructura de análisis 3 veces (una por categoría).
//
// Órbita (Fase 9c). data-foto: lo que lee tools/verificar/foto-progreso.mjs.
// Las metas se pintan acá (lab-entreno.js las sigue pintando en MK III para
// el Laboratorio); sus botones conservan los ids y clases que engancha
// LabEntreno.initTabListeners('metas'). La hoja de metas (goal-form) ya es
// de Órbita (oHoja) y va sin envoltorio desde la 9e.
import { db } from '../core/db.js';
import { renderEstandaresFuerza, initEstandaresFuerzaListeners } from './estandares-fuerza.js';
import { renderArbolProgresion } from './arbol-progresion.js';
import * as LabEntreno from './lab-entreno.js';
import { renderGoalForm, initGoalForm, openGoalContribute } from './goal-form.js';
import { getGoalSVG, formatGoalValue } from './goal-card.js';
import { oIcono, oVacio } from './orbita.js';
import { escapeHtml } from '../utils/escape.js';
import { formatFechaCorta, fechaLocalDe, diaKeyDe, diasEntre } from '../utils/fecha.js';
import { formatNumero } from '../utils/numero.js';
import { ensureChartJs, baseChartOptions, chartFontFamily, hdPixelRatio, barValueLabelsPlugin } from '../utils/charts.js';

const TABS = [
  { id: 'estandares', label: 'Estándares' },
  { id: 'arbol', label: 'Árbol' },
  { id: 'tendencia', label: 'Tendencia' },
  { id: 'metas', label: 'Metas' }
];
const CATS_ARBOL = [
  { id: 'gym', label: 'GYM' },
  { id: 'calistenia', label: 'Calistenia' },
  { id: 'hiit', label: 'HIIT' }
];
const CATS_TENDENCIA = [{ id: 'todos', label: 'Todos' }, ...CATS_ARBOL];

const ICO_EDITAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
const ICO_BORRAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

let activeTab = 'estandares';
let categoriaArbol = 'gym';
let categoriaTendencia = 'todos';
let tendenciaChartInstance = null;
// Tras cambiar de pestaña con el teclado, el foco vuelve a la pestaña nueva
// (el repintado reemplaza los botones).
let enfocarTab = false;

// Al entrar desde "Ver tu progreso en X" de una categoría puntual, esa
// categoría queda preseleccionada en Árbol y Tendencia — llegar a "tu
// progreso en GYM" y encontrar Calistenia seleccionada sería raro. Al
// entrar desde "Ver progreso completo" de la pantalla principal no hay
// contexto, así que se queda con lo último elegido (o el default).
export function setContextoCategoria(categoria) {
  if (!categoria) return;
  categoriaArbol = categoria;
  categoriaTendencia = categoria;
  activeTab = 'tendencia';
}

export function cleanup() {
  if (tendenciaChartInstance) { tendenciaChartInstance.destroy(); tendenciaChartInstance = null; }
}

// Color real de un token de Órbita en Entreno (Chart.js no entiende var()).
function colorEntreno(token) {
  const el = document.querySelector('#view-root .o-mod-entreno') || document.documentElement;
  return getComputedStyle(el).getPropertyValue(token).trim();
}

function renderTabSelector() {
  return `
    <div class="o-tabs o-ent-prog-tabs" role="tablist" aria-label="Secciones de tu progreso">
      ${TABS.map(t => `<button type="button" role="tab" class="o-tab progreso-tab" data-tab="${t.id}" id="prog-tab-${t.id}" aria-selected="${activeTab === t.id}" aria-controls="progreso-tab-content" tabindex="${activeTab === t.id ? 0 : -1}">${t.label}</button>`).join('')}
    </div>`;
}

function renderCategoriaSelector(cats, activa, className, etiqueta) {
  return `
    <div class="o-chips o-ent-prog-cats" role="group" aria-label="${etiqueta}">
      ${cats.map(c => `<button type="button" class="o-chip ${className} progreso-cat" data-cat="${c.id}" aria-pressed="${activa === c.id}">${c.label}</button>`).join('')}
    </div>`;
}

function labelsSemanas(n) {
  return Array.from({ length: n }, (_, i) => i === n - 1 ? 'Esta sem.' : `S-${n - 1 - i}`);
}

async function renderTendencia() {
  const cat = categoriaTendencia === 'todos' ? null : categoriaTendencia;
  const esHiit = categoriaTendencia === 'hiit';
  const { volumenPorSemana, minutosPorSemana } = await db.getTendenciaSemanal(cat, 8);
  const serie = esHiit ? minutosPorSemana : volumenPorSemana;
  const hayDatos = serie.some(v => v > 0);
  const titulo = esHiit ? 'Tendencia de constancia' : 'Tendencia de volumen';
  const unidad = esHiit ? 'minutos' : cat === 'calistenia' ? 'repeticiones' : cat === 'gym' ? 'kilos' : 'de volumen';

  const chartHtml = hayDatos
    ? `<div class="o-ent-graf"><canvas id="chart-progreso-tendencia" role="img" aria-label="${titulo} de las últimas 8 semanas: esta semana, ${formatNumero(serie[serie.length - 1])} ${unidad}"></canvas></div>`
    : oVacio({ titulo: 'Sin datos todavía', texto: 'Registra un par de sesiones más para ver tu tendencia.' });

  const infoText = esHiit
    ? 'Suma total de minutos activos en tus sesiones de cardio y HIIT de cada semana.'
    : cat === 'gym'
      ? 'Total de kilos movidos por semana (Series × Reps × Peso).'
      : cat === 'calistenia'
        ? 'Cantidad total de repeticiones hechas por semana.'
        : 'Volumen combinado de todas las modalidades (kilos movidos + repeticiones a peso corporal).';

  return `
    ${renderCategoriaSelector(CATS_TENDENCIA, categoriaTendencia, 'progreso-cat-tendencia', 'Categoría de la tendencia')}
    <section class="o-card o-ent-tendencia progreso-tendencia-card" data-foto="tendencia">
      <h3 class="o-card-titulo" data-foto="tend-titulo">${titulo}</h3>
      ${chartHtml}
      <p class="o-card-texto progreso-tendencia-info" data-foto="tend-info">${infoText}</p>
    </section>`;
}

function initTendenciaChart() {
  const canvas = document.getElementById('chart-progreso-tendencia');
  if (!canvas) return;
  db.getTendenciaSemanal(categoriaTendencia === 'todos' ? null : categoriaTendencia, 8).then(async ({ volumenPorSemana, minutosPorSemana }) => {
    const serie = categoriaTendencia === 'hiit' ? minutosPorSemana : volumenPorSemana;
    if (!serie.some(v => v > 0) || !canvas.isConnected) return;
    const Chart = await ensureChartJs();
    const opts = baseChartOptions();
    if (tendenciaChartInstance) tendenciaChartInstance.destroy();
    tendenciaChartInstance = new Chart(canvas, {
      type: 'bar',
      data: { labels: labelsSemanas(serie.length), datasets: [{ data: serie, backgroundColor: colorEntreno('--o-mod'), borderRadius: 0, maxBarThickness: 28 }] },
      options: {
        ...opts,
        devicePixelRatio: hdPixelRatio(),
        layout: { padding: { top: 18 } },
        scales: {
          x: { grid: { display: false }, ticks: { color: colorEntreno('--o-text-2'), font: { size: 10, family: chartFontFamily() } } },
          y: { display: false }
        }
      },
      plugins: [barValueLabelsPlugin(colorEntreno('--o-text'))]
    });
  });
}

// --- Metas (Órbita) ------------------------------------------------------

function renderMeta(goal) {
  const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
  let plazo = '';
  if (goal.deadline) {
    const diasRestantes = diasEntre(diaKeyDe(new Date()), goal.deadline);
    const fechaLabel = formatFechaCorta(fechaLocalDe(goal.deadline));
    const vencida = diasRestantes < 0 && !goal.completed;
    plazo = vencida
      ? `<p class="o-ent-meta-plazo o-ent-meta-plazo--vencida" data-foto="meta-plazo">${oIcono('alerta')}<span>Venció el ${fechaLabel}</span></p>`
      : `<p class="o-ent-meta-plazo" data-foto="meta-plazo">Vence el ${fechaLabel}${!goal.completed ? ` &bull; ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}` : ''}</p>`;
  }
  const nombre = escapeHtml(goal.name);
  return `
    <li class="o-card o-ent-meta goal-row" data-id="${goal.id}" data-foto="meta">
      <div class="o-ent-meta-cab">
        <span class="o-ent-meta-ico" aria-hidden="true">${getGoalSVG(goal.icon, 'currentColor')}</span>
        <b class="o-ent-meta-nombre" data-foto="meta-nombre">${nombre}</b>
        <button type="button" class="o-btn o-btn--icono o-btn--fantasma edit-goal" data-id="${goal.id}" aria-label="Editar meta ${nombre}">${ICO_EDITAR}</button>
        <button type="button" class="o-btn o-btn--icono o-btn--fantasma delete-goal" data-id="${goal.id}" aria-label="Eliminar meta ${nombre}">${ICO_BORRAR}</button>
      </div>
      <p class="o-ent-meta-valor o-num" data-foto="meta-valor">${formatGoalValue(goal, goal.currentAmount)} / ${formatGoalValue(goal, goal.targetAmount)}</p>
      <div class="o-ent-barra-pista o-ent-meta-pista" role="progressbar" aria-label="Avance de ${nombre}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
        <span class="o-ent-barra-relleno${goal.completed ? ' o-ent-meta-relleno--lista' : ''}" style="--o-ent-ancho: ${pct}%" data-foto="meta-pct" data-pct="${pct}" data-completada="${!!goal.completed}"></span>
      </div>
      ${goal.completed ? `<p class="o-ent-meta-lista" data-foto="meta-lista">${oIcono('check')}<span>Cumplida</span></p>` : ''}
      ${plazo}
      ${goal.autoTrack
        ? '<p class="o-card-texto" data-foto="meta-auto">Se actualiza sola al registrar una sesión</p>'
        : `<button type="button" class="o-btn o-btn--fantasma o-ent-meta-aporte" data-id="${goal.id}" data-foto="meta-aporte">Registrar avance</button>`}
    </li>`;
}

async function renderMetas() {
  const metas = await db.getGoals('entreno');
  const nueva = '<button type="button" id="btn-lab-entreno-nueva-meta" class="o-btn o-btn--secundario o-btn--bloque">+ Nueva meta</button>';
  if (metas.length === 0) {
    return `
      <div class="o-ent-metas">
        ${oVacio({ titulo: 'Sin metas todavía', texto: 'Ej. "Levantar 100kg en sentadilla", "Completar 20 sesiones este trimestre" o "Correr 50km este mes"' })}
        ${nueva}
      </div>`;
  }
  return `
    <div class="o-ent-metas">
      <ul class="o-lista o-ent-metas-lista">${metas.map(renderMeta).join('')}</ul>
      ${nueva}
    </div>`;
}

async function renderContent() {
  if (activeTab === 'estandares') return await renderEstandaresFuerza();
  if (activeTab === 'arbol') {
    return `${renderCategoriaSelector(CATS_ARBOL, categoriaArbol, 'progreso-cat-arbol', 'Categoría del árbol')}${await renderArbolProgresion(categoriaArbol)}`;
  }
  if (activeTab === 'tendencia') return await renderTendencia();
  if (activeTab === 'metas') return await renderMetas();
  return '';
}

export async function renderProgreso() {
  return `
    <div class="o-ent-prog">
      <header class="o-ent-sub-cab">
        <h2 class="o-ent-titulo">Tu progreso</h2>
        <p class="o-card-texto">Estándares, árbol de progresión, tendencia y metas — todo en un solo lugar.</p>
      </header>
      ${renderTabSelector()}
      <div id="progreso-tab-content" class="o-ent-prog-cont" role="tabpanel" aria-labelledby="prog-tab-${activeTab}">${await renderContent()}</div>
    </div>
    ${renderGoalForm()}
  `;
}

export function initProgresoListeners(refresh, signal) {
  const tabs = [...document.querySelectorAll('.progreso-tab')];
  const activar = (tab, conFoco) => {
    if (tab === activeTab) return;
    activeTab = tab;
    enfocarTab = conFoco;
    refresh();
  };
  tabs.forEach((btn, i) => {
    btn.addEventListener('click', () => activar(btn.dataset.tab, false), { signal });
    // Teclado de pestañas: flechas, Inicio y Fin.
    btn.addEventListener('keydown', (e) => {
      const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (destino === undefined) return;
      e.preventDefault();
      activar(tabs[(destino + tabs.length) % tabs.length].dataset.tab, true);
    }, { signal });
  });
  if (enfocarTab) {
    enfocarTab = false;
    document.getElementById(`prog-tab-${activeTab}`)?.focus();
  }

  document.querySelectorAll('.progreso-cat-arbol').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat');
      if (cat === categoriaArbol) return;
      categoriaArbol = cat;
      refresh();
    }, { signal });
  });

  document.querySelectorAll('.progreso-cat-tendencia').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat');
      if (cat === categoriaTendencia) return;
      categoriaTendencia = cat;
      refresh();
    }, { signal });
  });

  if (activeTab === 'estandares') initEstandaresFuerzaListeners(signal);
  if (activeTab === 'tendencia') initTendenciaChart();
  if (activeTab === 'metas') {
    LabEntreno.initTabListeners('metas', refresh);
    // «Registrar avance» (antes: tocar la barra de la tarjeta).
    document.querySelectorAll('.o-ent-meta-aporte').forEach(btn => {
      btn.addEventListener('click', async () => {
        const goal = (await db.getGoals('entreno')).find(g => g.id === btn.dataset.id);
        if (goal && !goal.autoTrack) openGoalContribute(goal);
      }, { signal });
    });
  }

  // El modal de metas vive en el DOM mientras Progreso está montado (mismo
  // criterio que laboratorio.js) — así "+ Nueva meta" desde otra pestaña
  // que no sea Metas (ej. un link cruzado) igual encuentra el modal listo.
  initGoalForm(refresh);
}
