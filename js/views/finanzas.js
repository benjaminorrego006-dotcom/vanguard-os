// js/views/finanzas.js
// Finanzas (Órbita, Fase 8): pestañas Resumen · Movimientos · Sobres ·
// Recurrentes (docs/rediseno-total.md). Sobres reúne lo que antes eran
// Presupuesto (regla 50/30/20) y Cuentas (sobres con arrastre, archivados y
// metas). Las pestañas son estado del módulo; no van en el hash.
//
// Movimientos y Recurrentes usan el layout lista + detalle
// (components/lista-detalle.js): en celular el detalle es sub-pantalla (el
// atrás vuelve a la lista); desde 1024 px va a la derecha sin tocar el
// historial.
//
// Solo cambia la presentación: cada cifra sale del mismo cálculo de
// siempre (db.getBudget y calcularSaldosConArrastre en db.js) y todo monto
// pasa por formatCurrency / formatCompactCurrency. tools/verificar compara
// saldos y totales contra la foto de antes de la Fase 8
// (finanzas-antes.json).
//
// La vista se arma en dos partes: el cuerpo (#fin-cuerpo: cabecera,
// pestañas y panel, o la sub-pantalla de un detalle), que se repinta, y las
// hojas de formulario, que se montan una vez y quedan fuera del repintado
// (así un cambio que llega mientras una hoja está abierta no la destruye).
// Las hojas siguen con su estilo MK III dentro de .mk3-finanzas, igual que
// la hoja de gasto de Hoy, hasta que se migren.
import { Toast, ConfirmDialog, hayModalAbierto } from '../utils/states.js';
import { db, esMovimientoEntreSobres } from '../core/db.js';
import { formatCurrency, formatCompactCurrency } from '../utils/currency.js';
import { renderActivityHeatmap, initActivityHeatmapListeners } from '../components/activity-heatmap.js';
import { renderAnualesHTML, renderAnualForm, initAnuales, enlazarFilasAnuales } from '../components/gastos-anuales.js';
import { renderIngresoForm, initIngresoForm } from '../components/IngresoForm.js';
import { renderGastoForm, initGastoForm } from '../components/GastoForm.js';
import { renderAhorroForm, initAhorroForm } from '../components/AhorroForm.js';
import { renderEnvelopeForm, initEnvelopeForm } from '../components/EnvelopeForm.js';
import { renderTransferForm, initTransferForm } from '../components/TransferForm.js';
import { renderRecurringForm, initRecurringForm } from '../components/RecurringForm.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';
import { ensureChartJs, anchoEtiquetasBarraH, baseChartOptions, hdPixelRatio, horizontalBarValueLabelsPlugin, verticalGradient } from '../utils/charts.js';
import { renderDonutChart, destroyAllDonuts } from '../components/donut-chart.js';
import { renderGoalForm, initGoalForm, openGoalForm } from '../components/goal-form.js';
import { getGoalSVG } from '../components/goal-card.js';
import { escapeHtml } from '../utils/escape.js';
import { mesKeyDe, diaKeyDe, diasEntre, formatFechaCorta, formatFechaLarga, formatMes, formatMesCorto, fechaLocalDe, claveDiaDe, conMayuscula } from '../utils/fecha.js';
import { colorTexto } from '../utils/tema.js';
import { proximaFechaRecurrente } from '../utils/recurrentes.js';
import { oIcono, oVacio, oAnillo } from '../components/orbita.js';
import { oListaDetalle, oListaDetalleCab, crearListaDetalle } from '../components/lista-detalle.js';
import { guardiaVista } from '../core/vista-activa.js';

// --- Íconos -------------------------------------------------------------------
const svg = (trazo, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${trazo}</svg>`;
const ICO = {
  mas: svg('<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>'),
  volver: svg('<line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>'),
  ingreso: svg('<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>'),
  gasto: svg('<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>'),
  ahorro: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>'),
  transferir: svg('<path d="M17 3v18M17 3l4 4M17 3l-4 4M7 21V3M7 21l4-4M7 21l-4-4"></path>'),
  recurrente: svg('<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>'),
  reloj: svg('<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'),
  editar: svg('<path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>'),
  archivar: svg('<rect x="3" y="4" width="18" height="4"></rect><path d="M5 8v12h14V8"></path><line x1="10" y1="12" x2="14" y2="12"></line>'),
  borrar: svg('<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>'),
  opciones: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>',
  subir: svg('<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>'),
  bajar: svg('<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>'),
  enviar: svg('<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>')
};

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// --- Estado del módulo ----------------------------------------------------------
let b = null;
const PESTANAS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'sobres', label: 'Sobres' },
  { id: 'recurrentes', label: 'Recurrentes' }
];
let activeFinTab = 'resumen';
// Otra vista (Hoy, aviso de gastos anuales) pide abrir Finanzas en una
// pestaña puntual: se usa en el próximo render. Presupuesto y Cuentas
// (pestañas de antes de la Fase 8) viven ahora en Sobres.
const PESTANA_ANTERIOR = { presupuesto: 'sobres', cuentas: 'sobres' };
export function pedirPestanaFinanzas(tab) { activeFinTab = PESTANA_ANTERIOR[tab] || tab; }
// Atajo "Gasto" de Hoy: la próxima vez que se monte Finanzas abre la hoja de
// gasto (la misma GastoForm, sin otra copia del formulario).
let gastoPedido = false;
export function pedirGastoFinanzas() { gastoPedido = true; }
let dailyBalanceChartInstance = null;
let monthCompareChartInstance = null;
let currentMonth = mesKeyDe(new Date());

// Filtros de Movimientos: sobreviven a los repintados.
let filtroMov = 'All';
let fechaDesde = '';
let fechaHasta = '';

// Detalles (lista + detalle): un movimiento y un pago fijo.
const ldMov = crearListaDetalle({ clave: 'movDetalle', alCambiar: () => repintar() });
const ldRec = crearListaDetalle({ clave: 'recDetalle', alCambiar: () => repintar() });

// Guardia de la navegación con que se montó esta vista (core/vista-activa.js).
let vistaVigente = () => true;
// Mientras la propia vista guarda o borra, el aviso 'budget-updated' no
// repinta: cada acción repinta al terminar (y espera a que su diálogo
// suelte la entrada de historial).
let ocupado = false;

const CAT_LABELS = { Needs: 'Necesidades', Wants: 'Deseos' };

// --- Utilidades de presentación ------------------------------------------------
// Compacta el monto ("$50 mil") cuando el formato completo se pasa de ancho
// en el balance — mide el string YA formateado, no el número crudo.
const formatDisponible = (amount) => (formatCurrency(amount).length > 13) ? formatCompactCurrency(amount) : formatCurrency(amount);
const conSigno = (n) => `${n < 0 ? '−' : '+'}${formatCurrency(Math.abs(n))}`;
const formatMonth = (str) => {
  const [anio, mes] = str.split('-').map(Number);
  return conMayuscula(`${formatMes(new Date(anio, mes - 1, 1))} de ${anio}`);
};
const sobresDe = () => b.todosLosSobres || b.envelopes;

// Color real de un token del módulo (para Chart.js, que no entiende var()).
function colorModulo(token) {
  const el = document.querySelector('.o-fin') || document.documentElement;
  return getComputedStyle(el).getPropertyValue(token).trim();
}

// Menú ⋯ de cada sobre (docs/PLAN-REVISION-OCT.md, 4.2): Editar y Archivar
// salen de la tarjeta; Transferir queda visible. Abierto, deja una entrada
// de historial para que Atrás lo cierre (como las hojas, ver history.js).
// cerrarMenuSobre() devuelve una promesa que se cumple cuando esa entrada
// ya se consumió: una acción que abre una hoja debe esperarla, si no el
// history.back() pendiente cerraría la hoja recién abierta.
let menuSobre = null; // { menu, btn } mientras hay uno abierto
const ocultarMenuSobre = () => {
  if (!menuSobre) return;
  menuSobre.menu.hidden = true;
  menuSobre.btn.setAttribute('aria-expanded', 'false');
  menuSobre = null;
  window.removeEventListener('popstate', ocultarMenuSobre);
};
const cerrarMenuSobre = () => new Promise(res => {
  if (!menuSobre) return res();
  ocultarMenuSobre();
  if (history.state && history.state.menuSobre) {
    window.addEventListener('popstate', () => res(), { once: true });
    history.back();
  } else res();
});
const abrirMenuSobre = (btn) => {
  const menu = btn.parentElement.querySelector('.sobre-menu');
  menu.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  menuSobre = { menu, btn };
  history.pushState({ menuSobre: true }, '');
  window.addEventListener('popstate', ocultarMenuSobre);
  menu.querySelector('button')?.focus();
};
// Una sola vez por sesión (el módulo es singleton): toque fuera y Escape.
document.addEventListener('click', (e) => {
  if (menuSobre && !e.target.closest('.sobre-menu-wrap')) cerrarMenuSobre();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuSobre) { e.stopPropagation(); const { btn } = menuSobre; cerrarMenuSobre().then(() => btn.focus()); }
}, { capture: true });

// =============================================================================
// Movimientos: datos de una fila (mismos textos y montos que antes)
// =============================================================================
const ETQ_CATEGORIA = (cat) => (cat === 'Needs' ? 'Necesidades' : cat === 'Wants' ? 'Deseos' : cat === 'Savings' ? 'Ahorro' : 'Ingreso');

function datosMovimiento(tx, envelopes) {
  const fallbackLabel = tx.type === 'Ingreso' ? 'Ingreso' : (tx.category === 'Savings' ? 'Ahorro' : (tx.category === 'Needs' ? 'Necesidades' : 'Deseos'));
  const fecha = formatFechaCorta(fechaLocalDe(tx.date));
  let meta = `${fecha} · ${ETQ_CATEGORIA(tx.category)}`;
  let prefijo = tx.type === 'Ingreso' ? '+' : '-';
  let clase = tx.type === 'Ingreso' ? 'ingreso' : (tx.type === 'Gasto' && tx.category !== 'Savings' ? 'gasto' : 'neutro');
  let tipo = tx.type === 'Ingreso' ? 'Ingreso' : tx.category === 'Savings' ? 'Ahorro' : 'Gasto';
  let icono = tx.type === 'Ingreso' ? ICO.ingreso : tx.category === 'Savings' ? ICO.ahorro : ICO.gasto;
  let sobre = null;
  if (tx.envelopeId && envelopes) {
    const env = envelopes.find(e => e.id === tx.envelopeId);
    if (env) {
      sobre = env;
      if (tx.type === 'Gasto') {
        meta = `${fecha} · ${env.name}`;
      } else if (tx.type === 'Assignment') {
        prefijo = tx.isSubtraction ? '-' : '+';
        clase = 'neutro';
        tipo = 'Asignación';
        icono = ICO.transferir;
        meta = `${fecha} · ${tx.isSubtraction ? 'Retirado de' : 'Asignado a'} ${env.name}`;
      }
    }
  } else if (tx.type === 'Transfer' && envelopes) {
    const desde = envelopes.find(e => e.id === tx.fromEnvelopeId)?.name || 'Desconocido';
    const hacia = envelopes.find(e => e.id === tx.toEnvelopeId)?.name || 'Desconocido';
    meta = `${fecha} · ${desde} → ${hacia}`;
    prefijo = '';
    clase = 'neutro';
    tipo = 'Transferencia';
    icono = ICO.transferir;
  }
  return {
    nombre: conMayuscula(tx.label || fallbackLabel),
    meta, monto: `${prefijo}${formatCurrency(tx.amount)}`, clase, tipo, icono, sobre,
    editable: tx.type !== 'Transfer' && tx.type !== 'Assignment'
  };
}

function filaMovimiento(tx, { abierto = false } = {}) {
  const d = datosMovimiento(tx, sobresDe());
  return `
    <li class="o-fila o-fin-mov${abierto ? ' o-fila--actual' : ''}" data-id="${escapeHtml(tx.id)}">
      <button type="button" class="o-fin-abrir o-fin-mov-abrir" data-id="${escapeHtml(tx.id)}"${abierto ? ' aria-current="true"' : ''} aria-label="${escapeHtml(`${d.nombre}, ${d.monto}, ${d.meta}`)}. Ver detalle">
        <span class="o-fila-ico o-fin-ico--${d.clase}">${d.icono}</span>
        <span class="o-fila-texto"><b class="o-fin-mov-nombre">${escapeHtml(d.nombre)}</b><small>${escapeHtml(d.meta)}</small></span>
        <span class="o-num o-fin-monto o-fin-monto--${d.clase}">${escapeHtml(d.monto)}</span>
      </button>
    </li>`;
}

function movimientosFiltrados() {
  let filtered = b.breakdown;
  if (filtroMov === 'Ingreso') filtered = filtered.filter(t => t.type === 'Ingreso');
  if (filtroMov === 'Gasto') filtered = filtered.filter(t => t.type === 'Gasto' && t.category !== 'Savings');
  if (filtroMov === 'Ahorro') filtered = filtered.filter(t => t.category === 'Savings');
  if (fechaDesde) filtered = filtered.filter(t => t.date && claveDiaDe(t.date) >= fechaDesde);
  if (fechaHasta) filtered = filtered.filter(t => t.date && claveDiaDe(t.date) <= fechaHasta);
  return filtered;
}

function listaMovimientosHtml() {
  const filtered = movimientosFiltrados();
  if (filtered.length === 0) {
    const sinNada = b.breakdown.length === 0;
    return `<li class="o-card">${oVacio({ icono: 'vacio', titulo: sinNada ? 'Todavía no hay movimientos' : 'No hay movimientos', texto: sinNada ? 'Toca Ingreso o Gasto para registrar el primero.' : 'No se encontraron resultados con este filtro.' })}</li>`;
  }
  return filtered.map(tx => filaMovimiento(tx, { abierto: ldMov.id === tx.id })).join('');
}

// =============================================================================
// Resumen
// =============================================================================
// Comparativo simple contra el mes anterior, reutiliza b.trend (ya calculado
// en db.getBudget). b.trend es null cuando el mes anterior no tuvo gastos.
function tendenciaHtml() {
  if (!b.trend) return `<p class="o-fin-tendencia" id="fin-tendencia">Sin datos del mes anterior</p>`;
  const { pct, isUp, hastaDia } = b.trend;
  const referencia = hastaDia ? 'a esta altura del mes pasado' : 'el mes pasado';
  const texto = isUp ? `Gastaste ${pct}% más que ${referencia}` : `Vas ${pct}% mejor que ${referencia}`;
  return `<p class="o-fin-tendencia" id="fin-tendencia">${isUp ? ICO.subir : ICO.bajar}<span>${texto}</span></p>`;
}

// "Puedes gastar $X hoy" = (disponible restante) / días que quedan del mes
// (incluye hoy). Es del mes: no usa el arrastre de los sobres.
function disponiblePorDiaHtml() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const diasRestantes = Math.max(1, daysInMonth - now.getDate() + 1);
  const saldoDiario = Math.max(0, b.remaining) / diasRestantes;
  return `
    <div class="o-card o-fin-pordia" id="daily-available-container">
      <span class="o-fila-ico">${ICO.reloj}</span>
      <div>
        <p class="o-rotulo">Disponible por día</p>
        <p class="o-fin-pordia-texto">Puedes gastar <span class="o-num" id="fin-pordia">${formatCurrency(saldoDiario)}</span> hoy</p>
        <p class="o-fin-pordia-sub"><span class="o-num" id="fin-restantes">${formatCurrency(Math.max(0, b.remaining))}</span> restantes · <span class="o-num" id="fin-dias">${diasRestantes}</span> ${diasRestantes === 1 ? 'día' : 'días'} del mes</p>
      </div>
    </div>`;
}

// Uso de una categoría contra lo que le toca según la regla 50/30/20.
// ≥ 100 %: alerta (rojo, con ícono y texto); ≥ 80 %: aviso ámbar.
function marcaUso(usoCatPct) {
  if (usoCatPct < 80) return '';
  const excedido = usoCatPct >= 100;
  const mensaje = excedido ? 'Superaste el presupuesto de esta categoría' : 'Ya usaste el 80% o más del presupuesto de esta categoría';
  return `<span class="o-fin-uso o-fin-uso--${excedido ? 'alerta' : 'aviso'}" title="${mensaje}">${oIcono('alerta')}<span>${excedido ? 'Excedido' : '80%+'}</span><span class="o-fin-oculto">: ${mensaje}</span></span>`;
}

const CATEGORIAS = [
  { key: 'Needs', label: 'Necesidades', share: 'needs', color: '--o-mod' },
  { key: 'Wants', label: 'Deseos', share: 'wants', color: '--o-mod-2' },
  { key: 'Savings', label: 'Ahorro', share: 'savings', color: '--o-text-2' }
];
const reglaDe = () => b.rule || { needs: 0.5, wants: 0.3, savings: 0.2 };
const totalCat = (key) => b.allocations.find(a => a.category === key)?.amount || 0;

// Leyenda de la dona: cuánto se gastó en cada categoría este mes.
function distribucionHtml() {
  const rule = reglaDe();
  return CATEGORIAS.map(c => {
    const amount = totalCat(c.key);
    const disponibleCat = b.budgeted * rule[c.share];
    const usoCatPct = disponibleCat > 0 ? Math.round((amount / disponibleCat) * 100) : (amount > 0 ? 100 : 0);
    return `
      <li class="o-fin-dist-fila" data-cat="${c.label}">
        <span class="o-fin-dist-punto" style="background: var(${c.color});"></span>
        <span class="o-fin-dist-nombre">${c.label}</span>
        ${marcaUso(usoCatPct)}
        <span class="o-fin-dist-monto${amount > 0 ? ' o-num' : ''}">${amount > 0 ? formatCurrency(amount) : 'Sin movimientos'}</span>
      </li>`;
  }).join('');
}

// Mapa de calor: días del mes con al menos un movimiento.
const buildFinanzasHeatmapHtml = () => {
  const [heatYear, heatMonthNum] = currentMonth.split('-').map(Number);
  const heatMonth = heatMonthNum - 1;
  const nombreMesActual = formatMes(new Date(heatYear, heatMonth, 1));
  const TX_TYPE_LABELS = { Gasto: 'Gasto', Ingreso: 'Ingreso', Ahorro: 'Ahorro', Transfer: 'Transferencia' };
  const countByDay = {};
  const detailByDay = {};
  b.breakdown.forEach(tx => {
    if (!tx.date) return;
    const day = Number(claveDiaDe(tx.date).split('-')[2]);
    if (!day) return;
    countByDay[day] = (countByDay[day] || 0) + 1;
    if (!detailByDay[day]) detailByDay[day] = [];
    const label = TX_TYPE_LABELS[tx.type] || tx.type;
    detailByDay[day].push(`${label}: ${tx.label || 'Sin descripción'} (${formatCurrency(tx.amount)})`);
  });
  return renderActivityHeatmap({
    id: 'finanzas-heatmap', monthLabel: nombreMesActual, year: heatYear, month: heatMonth,
    countByDay, detailByDay, accentVar: 'var(--o-mod)', emptyLabel: 'Sin movimientos'
  });
};

async function panelResumen() {
  const isHealthy = b.remaining >= 0;
  const trendHistory6 = await db.getHistoricalSummary(6);
  const tendencia6 = trendHistory6.hasEnoughData ? (() => {
    const maxVal = Math.max(...trendHistory6.data.map(d => d.expenses + d.saved), 1);
    return `
      <section class="o-card o-fin-seccion" aria-labelledby="fin-tend-titulo">
        <h2 class="o-rotulo" id="fin-tend-titulo">Tendencia de gastos</h2>
        <div class="o-fin-barras">
          ${trendHistory6.data.map(d => {
            const h = Math.max(4, Math.round(((d.expenses + d.saved) / maxVal) * 100));
            return `<div class="o-fin-barra${d.month === b.currentMonth ? ' o-fin-barra--actual' : ''}"><div class="o-fin-barra-pista"><i style="height: ${h}%;"></i></div><span>${formatMesCorto(fechaLocalDe(d.month + '-01'))}</span></div>`;
          }).join('')}
        </div>
        <p class="o-fin-nota"><span>Actual: <span class="o-num">${formatCompactCurrency(b.expenses)}</span></span><span>Presupuesto: <span class="o-num">${formatCompactCurrency(b.budgeted)}</span></span></p>
      </section>`;
  })() : '';
  const [y, m] = currentMonth.split('-').map(Number);
  const recientes = b.breakdown.slice(0, 5);
  return `
    <div class="o-fin-resumen">
      <section class="o-card o-card--destacada o-fin-balance" id="card-disponible" aria-labelledby="fin-balance-rotulo">
        <p class="o-rotulo" id="fin-balance-rotulo">Balance del mes</p>
        <p class="o-fin-balance-valor${isHealthy ? '' : ' o-fin-alerta'}">${isHealthy ? '' : `${oIcono('alerta')}<span class="o-fin-oculto">Balance negativo: </span>`}<span class="o-num" id="fin-balance">${formatDisponible(b.remaining)}</span></p>
        ${tendenciaHtml()}
        <div class="o-fin-balance-pie">
          <button type="button" class="o-fin-stat" id="card-gastos" aria-label="Gastos del mes: ${formatDisponible(b.expenses)}. Ver gastos">
            <span class="o-rotulo">Gastos</span><span class="o-num" id="fin-gastos">${formatDisponible(b.expenses)}</span>
          </button>
          <button type="button" class="o-fin-stat" id="card-ingresos" aria-label="Ingresos del mes: ${formatDisponible(b.income)}. Ver ingresos">
            <span class="o-rotulo">Ingresos</span><span class="o-num o-fin-monto--ingreso" id="fin-ingresos">${formatDisponible(b.income)}</span>
          </button>
        </div>
      </section>

      <div class="o-fin-acciones">
        <button type="button" id="btn-fab-ingreso" class="o-btn o-btn--secundario">${ICO.ingreso}Ingreso</button>
        <button type="button" id="btn-fab-ahorro" class="o-btn o-btn--secundario">${ICO.ahorro}Ahorro</button>
        <button type="button" id="btn-fab-transferir" class="o-btn o-btn--secundario">${ICO.transferir}Transferir</button>
      </div>

      ${disponiblePorDiaHtml()}

      <section class="o-card o-fin-seccion" aria-labelledby="fin-dist-titulo">
        <h2 class="o-rotulo" id="fin-dist-titulo">Distribución del gasto</h2>
        <div class="o-fin-dona">
          <canvas id="donut-chart-resumen" width="150" height="150"></canvas>
          <div class="o-fin-dona-centro" aria-hidden="true"><small>Presupuesto</small><b class="o-num">${formatCompactCurrency(b.budgeted)}</b></div>
        </div>
        <ul class="o-fin-dist" id="resumen-cat-legend">${distribucionHtml()}</ul>
      </section>

      <section class="o-card o-fin-seccion" aria-labelledby="fin-mapa-titulo">
        <h2 class="o-rotulo" id="fin-mapa-titulo">Actividad de ${escapeHtml(formatMes(new Date(y, m - 1, 1)))}</h2>
        ${buildFinanzasHeatmapHtml()}
      </section>

      <section class="o-card o-fin-seccion" aria-labelledby="fin-saldo-titulo">
        <h2 class="o-rotulo" id="fin-saldo-titulo">Evolución del saldo disponible</h2>
        <div class="o-fin-grafico o-fin-grafico--linea"><canvas id="line-chart-saldo-diario"></canvas></div>
      </section>

      <section class="o-card o-fin-seccion" aria-labelledby="fin-comp-titulo">
        <h2 class="o-rotulo" id="fin-comp-titulo">Gasto vs. mes anterior</h2>
        <div class="o-fin-grafico o-fin-grafico--barras"><canvas id="bar-chart-mes-comparativo"></canvas></div>
      </section>

      ${tendencia6}

      <section class="o-fin-seccion" aria-labelledby="fin-recientes-titulo">
        <div class="o-fin-seccion-cab">
          <h2 class="o-rotulo" id="fin-recientes-titulo">Movimientos recientes</h2>
          <button type="button" id="btn-ver-todos" class="o-btn o-btn--fantasma">Ver todos</button>
        </div>
        <ul class="o-lista" id="recent-tx-list">
          ${recientes.length ? recientes.map(tx => filaMovimiento(tx)).join('') : `<li class="o-card">${oVacio({ icono: 'vacio', titulo: 'Todavía no hay movimientos', texto: 'Toca Ingreso o Gasto para registrar el primero.' })}</li>`}
        </ul>
      </section>
    </div>`;
}

// Saldo disponible acumulado día a día (1 hasta hoy) del mes actual.
const computeDailyBalanceSeries = () => {
  const now = new Date();
  const today = now.getDate();
  const deltaPorDia = new Array(today + 1).fill(0);
  (b.breakdown || []).forEach(t => {
    if (!t.date) return;
    const day = parseInt(claveDiaDe(t.date).slice(8, 10), 10);
    if (!day || day < 1 || day > today) return;
    const amt = Number(t.amount) || 0;
    if (esMovimientoEntreSobres(t)) return; // mover dinero entre sobres no cambia el balance
    deltaPorDia[day] += (t.type === 'Ingreso') ? amt : -amt;
  });
  const labels = [];
  const data = [];
  let running = 0;
  for (let d = 1; d <= today; d++) {
    running += deltaPorDia[d];
    labels.push(String(d));
    data.push(Math.round(running * 100) / 100);
  }
  return { labels, data };
};

// Gráficos de Resumen (Chart.js, cargado diferido): dona, saldo diario y
// comparativo con el mes anterior. Colores del módulo, resueltos a valor.
async function renderResumenCharts() {
  if (!document.getElementById('donut-chart-resumen')) return;
  const Chart = await ensureChartJs();
  if (!document.getElementById('donut-chart-resumen')) return; // se cambió de pestaña mientras cargaba
  const opts = baseChartOptions();
  const acento = colorModulo('--o-mod');
  const linea = colorModulo('--o-line-strong');
  const texto2 = colorModulo('--o-text-2');

  const entries = CATEGORIAS.map(c => ({ label: c.label, valor: totalCat(c.key), color: colorModulo(c.color) })).filter(e => e.valor > 0);
  if (entries.length > 0) {
    await renderDonutChart('donut-chart-resumen', entries, { cutout: '74%', tooltipLabel: (ctx, entry) => `${entry.label}: ${formatCurrency(entry.valor)}` });
  } else {
    destroyAllDonuts();
  }

  const lineCanvas = document.getElementById('line-chart-saldo-diario');
  if (lineCanvas) {
    const { labels, data } = computeDailyBalanceSeries();
    if (dailyBalanceChartInstance) dailyBalanceChartInstance.destroy();
    const gradient = verticalGradient(lineCanvas.getContext('2d'), acento, lineCanvas.clientHeight || 100);
    dailyBalanceChartInstance = new Chart(lineCanvas, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor: acento, backgroundColor: gradient, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 }] },
      options: { ...opts, devicePixelRatio: hdPixelRatio(), scales: { x: { display: false }, y: { display: false } } }
    });
  }

  const barCanvas = document.getElementById('bar-chart-mes-comparativo');
  if (barCanvas) {
    // Mismo corte que b.trend: en el mes en curso, el anterior hasta el mismo día.
    const prevMes = b.prevExpenses || 0;
    const esteMes = b.expenses || 0;
    if (monthCompareChartInstance) monthCompareChartInstance.destroy();
    monthCompareChartInstance = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: [b.trendHastaDia ? ['Anterior', `(1–${b.trendHastaDia})`] : ['Mes', 'anterior'], 'Este mes'],
        datasets: [{ data: [prevMes, esteMes], backgroundColor: [linea, acento], borderRadius: 4, maxBarThickness: 60 }]
      },
      options: {
        ...opts,
        devicePixelRatio: hdPixelRatio(),
        indexAxis: 'y',
        layout: { padding: { right: anchoEtiquetasBarraH([prevMes, esteMes].map(formatCompactCurrency)) } },
        scales: { x: { display: false }, y: { display: true, grid: { display: false }, ticks: { color: texto2, font: { size: 12, weight: '600' } } } }
      },
      plugins: [horizontalBarValueLabelsPlugin(colorModulo('--o-text'), formatCompactCurrency)]
    });
  }
}

function soltarGraficos() {
  destroyAllDonuts();
  if (dailyBalanceChartInstance) { dailyBalanceChartInstance.destroy(); dailyBalanceChartInstance = null; }
  if (monthCompareChartInstance) { monthCompareChartInstance.destroy(); monthCompareChartInstance = null; }
}

// =============================================================================
// Movimientos (lista + detalle)
// =============================================================================
const FILTROS = [['All', 'Todos'], ['Ingreso', 'Ingresos'], ['Gasto', 'Gastos'], ['Ahorro', 'Ahorro']];

function listaMovimientos() {
  return `
    <div class="o-fin-col">
      <!-- Gasto rápido: texto libre tipo "50 en supermercado" (parseQuickGasto).
           <form> a propósito: Enter/Ir/Listo de cualquier teclado móvil
           dispara "submit" de forma nativa. -->
      <form id="quick-gasto-form" class="o-fin-rapido" onsubmit="return false;">
        <label class="o-fin-oculto" for="quick-gasto-input">Gasto rápido</label>
        <input type="text" id="quick-gasto-input" class="o-input" inputmode="text" enterkeyhint="go" autocomplete="off" placeholder="Gasto rápido, ej. 50 en supermercado">
        <button type="submit" id="btn-quick-gasto-submit" class="o-btn o-btn--secundario o-btn--icono" aria-label="Agregar gasto">${ICO.enviar}</button>
      </form>
      <p id="quick-gasto-hint" class="o-fin-pista" aria-live="polite"></p>
      <div class="o-chips o-fin-filtros" role="group" aria-label="Tipo de movimiento">
        ${FILTROS.map(([v, l]) => `<button type="button" class="o-chip history-tab" data-filter="${v}" aria-pressed="${filtroMov === v}">${l}</button>`).join('')}
      </div>
      <div class="o-fin-fechas">
        <label class="o-fin-oculto" for="history-date-from">Desde</label>
        <input type="date" id="history-date-from" class="o-input" value="${escapeHtml(fechaDesde)}">
        <span aria-hidden="true">a</span>
        <label class="o-fin-oculto" for="history-date-to">Hasta</label>
        <input type="date" id="history-date-to" class="o-input" value="${escapeHtml(fechaHasta)}">
        <button type="button" id="btn-clear-date-filter" class="o-btn o-btn--secundario">Limpiar</button>
      </div>
      <ul class="o-lista" id="history-list-content" aria-label="Movimientos de ${escapeHtml(formatMonth(currentMonth))}">${listaMovimientosHtml()}</ul>
      <div class="o-card o-fin-edad" id="card-ageofmoney">
        <span class="o-fila-ico">${ICO.reloj}</span>
        <div>
          <p class="o-rotulo">Edad del dinero</p>
          <p class="o-fin-edad-valor"><span class="o-num">${b.ageOfMoney}</span> ${b.ageOfMoney === 1 ? 'día' : 'días'}</p>
          <p class="o-fin-pordia-sub">${b.ageOfMoney >= 30 ? '¡Vives con ingresos del mes pasado!' : 'Aumenta esta métrica para salir del cheque a cheque.'}</p>
        </div>
      </div>
    </div>`;
}

// Detalle de un movimiento: el mismo en la sub-pantalla y en la columna.
function cuerpoMovimiento(tx) {
  const d = datosMovimiento(tx, sobresDe());
  const filas = [['Tipo', escapeHtml(d.tipo)], ['Fecha', escapeHtml(conMayuscula(formatFechaLarga(fechaLocalDe(tx.date))))]];
  if (tx.type === 'Transfer') {
    const env = sobresDe();
    filas.push(['Desde', escapeHtml(env.find(e => e.id === tx.fromEnvelopeId)?.name || 'Desconocido')]);
    filas.push(['Hacia', escapeHtml(env.find(e => e.id === tx.toEnvelopeId)?.name || 'Desconocido')]);
  } else if (d.sobre) {
    filas.push(['Sobre', escapeHtml(d.sobre.name)]);
    const negativo = d.sobre.saldo < 0;
    filas.push([`Saldo de ${escapeHtml(d.sobre.name)}`, `<span class="${negativo ? 'o-fin-alerta' : ''}">${negativo ? oIcono('alerta') : ''}<span class="o-num">${formatCurrency(d.sobre.saldo)}</span></span>`]);
  } else if (tx.type !== 'Ingreso') {
    filas.push(['Categoría', ETQ_CATEGORIA(tx.category)]);
  }
  if (tx.goalId) {
    const meta = (b.goals || []).find(g => g.id === tx.goalId);
    if (meta) filas.push(['Meta', escapeHtml(meta.name)]);
  }
  return `
    <div class="o-fin-det">
      <p class="o-fin-det-monto o-num o-fin-monto--${d.clase}" id="fin-mov-monto">${escapeHtml(d.monto)}</p>
      <dl class="o-fin-datos">${filas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${d.editable ? '' : `<p class="o-fin-pista">Las transferencias no se editan: elimínala y crea una nueva.</p>`}
      <div class="o-fin-det-acciones">
        ${d.editable ? `<button type="button" id="btn-editar-mov" class="o-btn o-btn--secundario" aria-label="Editar ${escapeHtml(d.nombre)}">Editar</button>` : ''}
        <button type="button" id="btn-eliminar-mov" class="o-btn o-btn--secundario o-fin-eliminar" aria-label="Eliminar el movimiento ${escapeHtml(d.nombre)}">Eliminar</button>
      </div>
    </div>`;
}

function panelMovimientos() {
  let detalle = '';
  if (ldMov.abierto) {
    const tx = b.breakdown.find(x => x.id === ldMov.id);
    if (tx) {
      const nombre = datosMovimiento(tx, sobresDe()).nombre;
      detalle = `<div class="o-card">${oListaDetalleCab({ titulo: nombre, cerrarId: 'btn-cerrar-mov', cerrarEtiqueta: `Cerrar el detalle de ${nombre}` })}${cuerpoMovimiento(tx)}</div>`;
    } else ldMov.olvidar();
  }
  return oListaDetalle({
    id: 'fin-mov-ld', lista: listaMovimientos(), detalle, abierto: !!detalle, etiqueta: 'Detalle del movimiento',
    vacio: `<div class="o-card o-ld-vacio">${oVacio({ icono: 'info', titulo: 'Elige un movimiento', texto: 'Su monto, su sobre y la fecha aparecen aquí, con Editar y Eliminar.' })}</div>`
  });
}

// =============================================================================
// Sobres (regla 50/30/20 + sobres con arrastre + archivados + metas)
// =============================================================================
function reglaHtml() {
  const rule = reglaDe();
  return CATEGORIAS.map(c => {
    const totalAmt = totalCat(c.key);
    const rulePct = Math.round(rule[c.share] * 100);
    // Barra "gastado vs disponible" de la categoría según la regla 50/30/20.
    const disponibleCat = b.budgeted * rule[c.share];
    const usoCatPct = disponibleCat > 0 ? Math.round((totalAmt / disponibleCat) * 100) : (totalAmt > 0 ? 100 : 0);
    const nivel = usoCatPct >= 100 ? 'alerta' : usoCatPct >= 80 ? 'aviso' : '';
    const nota = usoCatPct >= 100
      ? `<p class="o-fin-nota-uso o-fin-alerta">${oIcono('alerta')}<span>Superaste el presupuesto de este mes.</span></p>`
      : (usoCatPct >= 80 ? `<p class="o-fin-nota-uso o-fin-aviso">${oIcono('alerta')}<span>Estás cerca del límite.</span></p>` : '');
    return `
      <button type="button" class="o-card o-fin-regla legend-item" data-cat="${c.label}" aria-label="${c.label}: ${formatCurrency(totalAmt)} de ${formatCurrency(disponibleCat)}. Ver movimientos">
        <span class="o-fin-regla-cab"><span class="o-fin-regla-nombre">${c.label}</span><span class="o-rotulo"><span class="o-num">${rulePct}%</span> de la regla</span></span>
        <span class="o-fin-regla-cifras o-num">${formatCurrency(totalAmt)} de ${formatCurrency(disponibleCat)}</span>
        <span class="o-fin-medidor" aria-hidden="true"><i class="${nivel ? `o-fin-medidor--${nivel}` : ''}" style="width: ${Math.min(100, usoCatPct)}%;"></i></span>
        ${nota}
      </button>`;
  }).join('');
}

// Tarjeta de cada sobre (R5 + CLAUDE.md, regla 7): saldo con arrastre,
// "$gastado de $disponible" y una línea aparte con el arrastre del mes
// anterior. Rojo solo con saldo negativo (con ícono y texto).
async function sobresHtml() {
  const archivados = b.envelopesArchivados || [];
  const archivadosHtml = archivados.length === 0 ? '' : `
    <details class="o-card o-fin-archivados">
      <summary>Archivados (<span class="o-num">${archivados.length}</span>)</summary>
      <ul class="o-fin-archivados-lista">
        ${archivados.map(env => `
          <li class="o-fin-archivado">
            <span class="o-fila-texto"><b class="o-fin-archivado-nombre">${escapeHtml(env.name)}</b><small>${CAT_LABELS[env.category] || escapeHtml(env.category)}</small></span>
            <button type="button" class="o-btn o-btn--secundario desarchivar-env" data-id="${escapeHtml(env.id)}" aria-label="Desarchivar sobre ${escapeHtml(env.name)}">Desarchivar</button>
          </li>`).join('')}
      </ul>
    </details>`;
  const nuevo = `<button type="button" class="o-btn o-btn--secundario o-btn--bloque btn-add-envelope">${ICO.mas}Nuevo sobre</button>`;

  if (!b.envelopes || b.envelopes.length === 0) {
    return `<div class="o-card">${oVacio({ icono: 'vacio', titulo: archivados.length ? 'Todos tus sobres están archivados' : 'Todavía no creaste ningún sobre', texto: 'Un sobre es donde separas plata para una categoría de gasto — luz, comida, salidas.' })}</div>${nuevo}${archivadosHtml}`;
  }

  // Mini-gráfico de 3 meses (R5): gasto de cada mes contra el disponible de
  // ESE mes (arrastre + asignado ± transferencias). Los 2 meses anteriores
  // salen de getBudget, en serie a propósito: en paralelo podrían procesar
  // la misma recurrente dos veces.
  const [anioVista, mesVista] = b.currentMonth.split('-').map(Number);
  const mesesPrevios = [2, 1].map(i => mesKeyDe(new Date(anioVista, mesVista - 1 - i, 1)));
  const sobresPorMes = [];
  for (const m of mesesPrevios) sobresPorMes.push(new Map((await db.getBudget(m)).todosLosSobres.map(e => [e.id, e])));
  sobresPorMes.push(new Map(b.envelopes.map(e => [e.id, e])));
  const disponibleDe = (e) => e.arrastre + e.asignado + e.transferencias;
  const nombreMesAnterior = formatMes(new Date(anioVista, mesVista - 2, 1)).toLowerCase();

  const cards = b.envelopes.map(env => {
    const disponible = disponibleDe(env);
    const negativo = env.saldo < 0;
    // Disponible negativo: el sobre arrastra más sobregiro que lo que recibe
    // este mes; "$0 de -$66.200" no se entiende. Con 0 justo no es alerta.
    const sobregiroAcumulado = disponible < 0 ? -disponible : 0;
    const pct = negativo ? 100 : disponible > 0 ? Math.min(100, Math.round((env.gastado / disponible) * 100)) : (env.gastado > 0 ? 100 : 0);
    const nivel = negativo ? 'alerta' : pct >= 80 ? 'aviso' : ''; // rojo solo con saldo negativo

    const hist = sobresPorMes.map(mapa => mapa.get(env.id)).map(e => (e ? { gastado: e.gastado, disponible: disponibleDe(e) } : { gastado: 0, disponible: 0 }));
    const maxH = Math.max(...hist.map(h => Math.max(h.gastado, h.disponible)), 1);
    const spark = hist.some(h => h.gastado > 0 || h.disponible > 0) ? `<span class="o-fin-spark" title="Gasto contra disponible, últimos 3 meses" aria-hidden="true">${
      hist.map(h => `<i class="${h.gastado > h.disponible ? 'o-fin-spark--excedido' : ''}" style="height: ${Math.max(10, Math.round((h.gastado / maxH) * 100))}%;"></i>`).join('')
    }</span>` : '';

    const lineaArrastre = env.arrastre !== 0
      ? `<p class="o-fin-sobre-linea o-fin-sobre-arrastre"><span class="o-num">${conSigno(env.arrastre)}</span> de ${nombreMesAnterior}</p>` : '';
    const lineaTransf = env.transferencias !== 0
      ? `<p class="o-fin-sobre-linea o-fin-sobre-transf"><span class="o-num">${conSigno(env.transferencias)}</span> transferido</p>` : '';
    const nombre = escapeHtml(env.name);
    const aria = `${env.name}: saldo ${formatCurrency(env.saldo)}${negativo ? ' (negativo)' : ''}. ${sobregiroAcumulado ? `Sobregiro de ${formatCurrency(sobregiroAcumulado)} acumulado. Gastado ${formatCurrency(env.gastado)} este mes.` : `Gastado ${formatCurrency(env.gastado)} de ${formatCurrency(disponible)} disponibles.`}`
      + (env.arrastre !== 0 ? ` Arrastre ${conSigno(env.arrastre)} de ${nombreMesAnterior}.` : '')
      + (env.transferencias !== 0 ? ` ${conSigno(env.transferencias)} transferido.` : '');

    return `
      <article class="o-card o-fin-sobre env-row" data-id="${escapeHtml(env.id)}" role="group" aria-label="${escapeHtml(aria)}">
        <div class="o-fin-sobre-cab">
          <div class="o-fin-sobre-titulo">
            <p class="o-rotulo o-fin-sobre-cat">${CAT_LABELS[env.category] || escapeHtml(env.category)}</p>
            <h3 class="o-fin-sobre-nombre">${nombre}</h3>
          </div>
          ${spark}
          <div class="o-fin-sobre-acciones">
            <button type="button" class="o-btn o-btn--fantasma o-btn--icono transfer-env" data-id="${escapeHtml(env.id)}" aria-label="Transferir desde ${nombre}" title="Transferir">${ICO.transferir}</button>
            <div class="sobre-menu-wrap">
              <button type="button" class="o-btn o-btn--fantasma o-btn--icono sobre-menu-btn" aria-label="Más acciones de ${nombre}" aria-haspopup="menu" aria-expanded="false" title="Más acciones">${ICO.opciones}</button>
              <div class="sobre-menu o-fin-menu" role="menu" hidden>
                <button type="button" role="menuitem" class="edit-env" data-id="${escapeHtml(env.id)}">${ICO.editar}Editar</button>
                <button type="button" role="menuitem" class="archive-env" data-id="${escapeHtml(env.id)}">${ICO.archivar}Archivar</button>
              </div>
            </div>
          </div>
        </div>
        <p class="o-fin-sobre-saldo${negativo ? ' o-fin-alerta' : ''}">${negativo ? `${oIcono('alerta')}<span class="o-fin-oculto">Saldo negativo: </span>` : ''}<span class="o-num">${formatCurrency(env.saldo)}</span></p>
        <span class="o-fin-medidor" aria-hidden="true"><i class="${nivel ? `o-fin-medidor--${nivel}` : ''}" style="width: ${pct}%;"></i></span>
        ${sobregiroAcumulado
          ? `<p class="o-fin-sobre-cifras o-fin-alerta">${oIcono('alerta')}<span>Sobregiro de <span class="o-num">${formatCurrency(sobregiroAcumulado)}</span> acumulado</span></p>`
          : `<p class="o-fin-sobre-cifras"><span class="o-num">${formatCurrency(env.gastado)}</span> de <span class="o-num">${formatCurrency(disponible)}</span></p>`}
        ${lineaArrastre}${lineaTransf}
      </article>`;
  }).join('');

  return `<div class="o-fin-sobres">${cards}</div>${nuevo}${archivadosHtml}`;
}

function metasHtml() {
  const goals = b.goals || [];
  const nueva = `<button type="button" id="btn-add-goal" class="o-btn o-btn--secundario o-btn--bloque">${ICO.mas}Nueva meta</button>`;
  const fila = (g) => {
    const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
    let plazo = '';
    if (g.deadline) {
      const dias = diasEntre(diaKeyDe(new Date()), g.deadline);
      const vencida = dias < 0 && !g.completed;
      const fecha = formatFechaCorta(fechaLocalDe(g.deadline));
      plazo = vencida
        ? `<p class="o-fin-meta-plazo o-fin-alerta">${oIcono('alerta')}<span>Venció el ${fecha}</span></p>`
        : `<p class="o-fin-meta-plazo">Vence el ${fecha}${!g.completed ? ` · ${plural(dias, 'día', 'días')}` : ''}</p>`;
    }
    const nombre = escapeHtml(g.name);
    return `
      <li class="o-card o-fin-meta goal-row" data-id="${escapeHtml(g.id)}">
        <div class="o-fin-meta-cab">
          <span class="o-fila-ico">${getGoalSVG(g.icon)}</span>
          <h3 class="o-fin-meta-nombre">${nombre}</h3>
          <button type="button" class="o-btn o-btn--fantasma o-btn--icono edit-goal" data-id="${escapeHtml(g.id)}" aria-label="Editar meta ${nombre}">${ICO.editar}</button>
          <button type="button" class="o-btn o-btn--fantasma o-btn--icono delete-goal" data-id="${escapeHtml(g.id)}" aria-label="Eliminar meta ${nombre}">${ICO.borrar}</button>
        </div>
        <p class="o-num o-fin-meta-montos">${formatCurrency(g.currentAmount)} / ${formatCurrency(g.targetAmount)}</p>
        <span class="o-fin-medidor" aria-hidden="true"><i class="${g.completed ? 'o-fin-medidor--ok' : ''}" style="width: ${pct}%;"></i></span>
        ${plazo}
      </li>`;
  };
  return `
    <section class="o-fin-seccion" aria-labelledby="fin-metas-titulo">
      <div class="o-fin-seccion-cab">
        <h2 class="o-rotulo" id="fin-metas-titulo">Metas de ahorro</h2>
        ${b.savedThisMonth > 0 ? `<span class="o-fin-pista">Ahorrado este mes: <span class="o-num">${formatCurrency(b.savedThisMonth)}</span></span>` : ''}
      </div>
      ${goals.length ? `<ul class="o-lista">${goals.map(fila).join('')}</ul>` : `<div class="o-card">${oVacio({ icono: 'vacio', titulo: 'Sin metas de ahorro todavía', texto: 'Crea una para apartar dinero mes a mes hacia algo puntual.' })}</div>`}
      ${nueva}
    </section>`;
}

async function panelSobres() {
  const gastado = b.expenses + b.savedThisMonth;
  return `
    <div class="o-fin-col">
      <section class="o-card o-fin-presupuesto" aria-labelledby="fin-pres-rotulo">
        ${oAnillo({ valor: gastado, max: b.budgeted, etiqueta: `Gastado ${formatCurrency(gastado)} de ${formatCurrency(b.budgeted)}` })}
        <div class="o-fin-presupuesto-texto">
          <p class="o-rotulo" id="fin-pres-rotulo">Gastado este mes</p>
          <p class="o-fin-presupuesto-valor o-num" id="fin-pres-gastado">${formatCurrency(gastado)}</p>
          <p class="o-fin-pordia-sub">de <span class="o-num">${formatCurrency(b.budgeted)}</span> que entraron este mes</p>
        </div>
      </section>
      <div class="o-fin-seccion-cab">
        <h2 class="o-rotulo">Límites mensuales</h2>
        <button type="button" id="btn-open-settings" class="o-btn o-btn--fantasma">Editar en Configuración</button>
      </div>
      <div class="o-fin-reglas" id="presupuesto-legend-container">${reglaHtml()}</div>
      <section class="o-fin-seccion" aria-labelledby="fin-sobres-titulo">
        <h2 class="o-rotulo" id="fin-sobres-titulo">Sobres</h2>
        <div class="mk3-finanzas">${renderEnvelopeForm()}</div>
        <div id="envelopes-list-container" class="o-fin-col">${await sobresHtml()}</div>
      </section>
      ${metasHtml()}
    </div>`;
}

// =============================================================================
// Recurrentes (lista + detalle) y gastos anuales
// =============================================================================
function filaRecurrente(req, abierto) {
  const env = sobresDe().find(e => e.id === req.envelopeId);
  const sobre = env ? env.name : 'Desconocido';
  const nombre = escapeHtml(req.label);
  return `
    <li class="o-fila o-fin-rec${abierto ? ' o-fila--actual' : ''}" data-id="${escapeHtml(req.id)}">
      <button type="button" class="o-fin-abrir o-fin-rec-abrir" data-id="${escapeHtml(req.id)}"${abierto ? ' aria-current="true"' : ''} aria-label="${nombre}, ${formatCurrency(req.amount)}, día ${req.dayOfMonth}, sobre ${escapeHtml(sobre)}. Ver detalle">
        <span class="o-fila-ico">${ICO.recurrente}</span>
        <span class="o-fila-texto"><b class="o-fin-rec-nombre">${nombre}</b><small>Día <span class="o-num o-fin-rec-dia">${req.dayOfMonth}</span> · <span class="o-fin-rec-sobre">${escapeHtml(sobre)}</span></small></span>
        <span class="o-num o-fin-monto">${formatCurrency(req.amount)}</span>
      </button>
    </li>`;
}

async function listaRecurrentes() {
  const recurring = b.recurring || [];
  const total = recurring.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return `
    <div class="o-fin-col">
      <p class="o-fin-pista">Configura un pago fijo una vez y se descuenta solo de su sobre cada mes: arriendos, suscripciones, cuentas de servicios.</p>
      ${recurring.length ? `
      <div class="o-card o-fin-total">
        <p class="o-rotulo">Total estimado por mes</p>
        <p class="o-fin-total-valor o-num" id="fin-rec-total">${formatCurrency(total)}</p>
      </div>
      <ul class="o-lista" id="recurring-list" aria-label="Pagos fijos">${recurring.map(r => filaRecurrente(r, ldRec.id === r.id)).join('')}</ul>`
      : `<div class="o-card">${oVacio({ icono: 'vacio', titulo: 'Sin pagos fijos todavía', texto: 'Automatiza tus suscripciones y arriendos para que se descuenten solos.' })}</div>`}
      <button type="button" id="btn-add-recurring" class="o-btn o-btn--secundario o-btn--bloque">${ICO.mas}Nuevo pago</button>
      <!-- Gastos anuales prorrateados (components/gastos-anuales.js). -->
      <div id="anuales-container">${await renderAnualesHTML()}</div>
    </div>`;
}

// Detalle de un pago fijo: monto, día, sobre y su saldo, próximo cobro. Si
// el saldo del sobre no alcanza para este cobro, alerta con ícono y texto.
function cuerpoRecurrente(req) {
  const env = sobresDe().find(e => e.id === req.envelopeId);
  const proximo = proximaFechaRecurrente(req);
  const filas = [
    ['Día de cobro', `Día <span class="o-num">${req.dayOfMonth}</span> de cada mes`],
    ['Próximo cobro', escapeHtml(conMayuscula(formatFechaLarga(fechaLocalDe(proximo))))],
    ['Sobre', escapeHtml(env ? env.name : 'Desconocido')]
  ];
  let alerta = '';
  if (env) {
    const negativo = env.saldo < 0;
    filas.push([`Saldo de ${escapeHtml(env.name)}`, `<span class="${negativo ? 'o-fin-alerta' : ''}">${negativo ? oIcono('alerta') : ''}<span class="o-num">${formatCurrency(env.saldo)}</span></span>`]);
    if (env.saldo < req.amount) {
      alerta = `<p class="o-fin-aviso-cobro o-fin-alerta" role="note">${oIcono('alerta')}<span>El saldo de ${escapeHtml(env.name)} no alcanza para este cobro: faltan <span class="o-num">${formatCurrency(req.amount - Math.max(0, env.saldo))}</span>.</span></p>`;
    }
  }
  return `
    <div class="o-fin-det">
      <p class="o-fin-det-monto o-num" id="fin-rec-monto">${formatCurrency(req.amount)}</p>
      ${alerta}
      <dl class="o-fin-datos">${filas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <div class="o-fin-det-acciones o-fin-det-acciones--una">
        <button type="button" id="btn-eliminar-recurrente" class="o-btn o-btn--secundario o-fin-eliminar" aria-label="Eliminar el pago fijo ${escapeHtml(req.label)}">Eliminar</button>
      </div>
    </div>`;
}

async function panelRecurrentes() {
  let detalle = '';
  if (ldRec.abierto) {
    const req = (b.recurring || []).find(x => x.id === ldRec.id);
    if (req) detalle = `<div class="o-card">${oListaDetalleCab({ titulo: req.label, cerrarId: 'btn-cerrar-rec', cerrarEtiqueta: `Cerrar el detalle de ${req.label}` })}${cuerpoRecurrente(req)}</div>`;
    else ldRec.olvidar();
  }
  return oListaDetalle({
    id: 'fin-rec-ld', lista: await listaRecurrentes(), detalle, abierto: !!detalle, etiqueta: 'Detalle del pago fijo',
    vacio: `<div class="o-card o-ld-vacio">${oVacio({ icono: 'info', titulo: 'Elige un pago fijo', texto: 'Su próximo cobro y el saldo de su sobre aparecen aquí.' })}</div>`
  });
}

// =============================================================================
// Cuerpo, sub-pantallas y hojas
// =============================================================================
// Sub-pantalla (celular): el detalle ocupa toda la vista, con «Volver».
function subpantalla({ titulo, volverId, volverEtiqueta, cuerpo }) {
  return `
    <header class="o-fin-det-cab">
      <button type="button" id="${volverId}" class="o-btn o-btn--secundario o-btn--icono" aria-label="${volverEtiqueta}">${ICO.volver}</button>
      <h1 class="o-mod-titulo">${escapeHtml(titulo)}</h1>
    </header>
    ${cuerpo}`;
}

async function renderCuerpo() {
  b = await db.getBudget(currentMonth);
  if (activeFinTab === 'movimientos' && ldMov.subpantalla) {
    const tx = b.breakdown.find(x => x.id === ldMov.id);
    if (tx) return subpantalla({ titulo: datosMovimiento(tx, sobresDe()).nombre, volverId: 'btn-volver-mov', volverEtiqueta: 'Volver a Movimientos', cuerpo: cuerpoMovimiento(tx) });
    ldMov.descartar(); // borrado (desde otra hoja o en otro dispositivo)
  }
  if (activeFinTab === 'recurrentes' && ldRec.subpantalla) {
    const req = (b.recurring || []).find(x => x.id === ldRec.id);
    if (req) return subpantalla({ titulo: req.label, volverId: 'btn-volver-rec', volverEtiqueta: 'Volver a Recurrentes', cuerpo: cuerpoRecurrente(req) });
    ldRec.descartar();
  }
  const panel = activeFinTab === 'movimientos' ? panelMovimientos()
    : activeFinTab === 'sobres' ? await panelSobres()
      : activeFinTab === 'recurrentes' ? await panelRecurrentes()
        : await panelResumen();
  return `
    <header class="o-mod-cab">
      <div>
        <h1 class="o-mod-titulo">Finanzas</h1>
        <p class="o-mod-sub">${formatMonth(currentMonth)}</p>
      </div>
      <button type="button" id="btn-fab-gasto" class="o-btn o-btn--primario">${ICO.mas}Gasto</button>
    </header>
    <div class="o-tabs fin-tabs" role="tablist" aria-label="Secciones de Finanzas">
      ${PESTANAS.map(p => `<button type="button" role="tab" class="o-tab fin-tab" data-tab="${p.id}" id="fin-tab-${p.id}" aria-selected="${p.id === activeFinTab}" aria-controls="fin-panel" tabindex="${p.id === activeFinTab ? 0 : -1}">${p.label}</button>`).join('')}
    </div>
    <section id="fin-panel" class="o-fin-panel" role="tabpanel" aria-labelledby="fin-tab-${activeFinTab}">${panel}</section>`;
}

// Estilos de las hojas MK III de Finanzas (hasta que se migren a Órbita).
const modalCSS = `
  .input-group { margin-bottom: 20px; }
  .input-group label { display: block; color: var(--text-secondary); font-size: 13px; font-weight: 600; margin-bottom: 8px; }
  .input-group input, .input-group select {
    width: 100%; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary);
    padding: 14px 16px; font-size: 16px; box-sizing: border-box; outline: none;
    font-family: inherit; transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .input-group input:focus, .input-group select:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--fondo-indigo) 18%, transparent);
  }
  .tab-btn { flex: 1; padding: 12px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 14px; }
  .cat-item { cursor: pointer; padding: 4px; transition: background 0.2s; }
  .cat-item.active { background: rgba(255,255,255,0.1); }
`;

export async function render() {
  const cuerpo = await renderCuerpo();
  return `
    <div class="o-vista o-fin o-mod-finanzas">
      <div id="fin-cuerpo">${cuerpo}</div>
      <div class="mk3-finanzas o-fin-hojas">
        <style>${modalCSS}</style>
        ${renderGoalForm()}
        ${renderIngresoForm()}
        ${renderGastoForm()}
        ${renderAhorroForm()}
        ${renderTransferForm()}
        ${renderRecurringForm()}
        ${renderAnualForm()}
      </div>
    </div>`;
}

// --- Repintar ------------------------------------------------------------------
let pintadoN = 0;
async function repintar() {
  const n = ++pintadoN;
  await cerrarMenuSobre();
  const html = await renderCuerpo();
  const cuerpo = document.getElementById('fin-cuerpo');
  if (n !== pintadoN || !cuerpo || !vistaVigente()) return;
  soltarGraficos();
  cuerpo.innerHTML = html;
  montarCuerpo();
}

// 'budget-updated': lo dispara db.js en cada cambio (también los que llegan
// por sync de otro dispositivo). No pisa una hoja abierta, el formulario de
// sobre a medio escribir ni el gasto rápido; tampoco una acción propia en
// curso (esa repinta sola al terminar).
async function onBudgetUpdated() {
  if (ocupado || hayModalAbierto() || (history.state && history.state.modalId)) return;
  const formSobre = document.getElementById('envelope-modal');
  if (formSobre && formSobre.style.display !== 'none') return;
  const rapido = document.getElementById('quick-gasto-input');
  if (rapido && (document.activeElement === rapido || rapido.value.trim())) return;
  await repintar();
}

// Llamado por el router (app.js) antes de desmontar esta vista.
export function cleanup() {
  soltarGraficos();
  window.removeEventListener('budget-updated', onBudgetUpdated);
  ldMov.soltar();
  ldRec.soltar();
  cerrarMenuSobre();
}

// Ejecuta una acción propia (guardar, borrar): el aviso de db.js no repinta
// a medias; al terminar se repinta una vez.
async function accion(fn) {
  ocupado = true;
  try { await fn(); } finally { ocupado = false; }
}

// --- Listeners -----------------------------------------------------------------
// Una vez por montaje: las hojas y el aviso de cambios.
export function mountListeners() {
  vistaVigente = guardiaVista('finanzas');
  const getB = () => b;
  initIngresoForm(db, getB, repintar);
  initGastoForm(db, getB, repintar);
  initAhorroForm(db, getB, repintar);
  initTransferForm(db, getB, repintar);
  initRecurringForm(db, getB, repintar);
  initGoalForm(repintar);
  initAnuales();
  window.removeEventListener('budget-updated', onBudgetUpdated);
  window.addEventListener('budget-updated', onBudgetUpdated);
  ldMov.enganchar();
  ldRec.enganchar();
  montarCuerpo();
  if (gastoPedido) {
    gastoPedido = false;
    document.getElementById('gasto-modal')?.openForm();
  }
}

async function cambiarPestana(tab) {
  if (tab === activeFinTab) return;
  ldMov.olvidar();
  ldRec.olvidar();
  activeFinTab = tab;
  await repintar();
  document.getElementById(`fin-tab-${tab}`)?.focus({ preventScroll: true });
}

// Movimientos filtrados por tipo, desde Resumen (Gastos, Ingresos, una
// categoría de la regla).
function irAMovimientos(filtro) {
  filtroMov = filtro;
  fechaDesde = '';
  fechaHasta = '';
  if (activeFinTab === 'movimientos') { repintar(); return; }
  cambiarPestana('movimientos');
}

// Lo de cada repintado del cuerpo.
function montarCuerpo() {
  // Pestañas (flechas para moverse entre ellas, como un tablist).
  const tabs = [...document.querySelectorAll('.fin-tab')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => cambiarPestana(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].click();
    });
  });
  document.getElementById('btn-fab-gasto')?.addEventListener('click', () => document.getElementById('gasto-modal').openForm());

  // Detalle abierto desde cualquier lista de movimientos (Resumen o Movimientos).
  document.querySelectorAll('.o-fin-mov-abrir').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    if (activeFinTab !== 'movimientos') { ldRec.olvidar(); activeFinTab = 'movimientos'; }
    await ldMov.abrir(id);
    if (ldMov.subpantalla) window.scrollTo(0, 0);
  }));

  if (activeFinTab === 'resumen') montarResumen();
  if (activeFinTab === 'movimientos') montarMovimientos();
  if (activeFinTab === 'sobres') montarSobres();
  if (activeFinTab === 'recurrentes') montarRecurrentes();
}

function montarResumen() {
  document.getElementById('btn-fab-ingreso')?.addEventListener('click', () => document.getElementById('ingreso-modal').openForm());
  document.getElementById('btn-fab-ahorro')?.addEventListener('click', () => document.getElementById('ahorro-modal').openForm());
  document.getElementById('btn-fab-transferir')?.addEventListener('click', () => document.getElementById('transfer-modal').openForm());
  document.getElementById('card-gastos')?.addEventListener('click', () => irAMovimientos('Gasto'));
  document.getElementById('card-ingresos')?.addEventListener('click', () => irAMovimientos('Ingreso'));
  document.getElementById('btn-ver-todos')?.addEventListener('click', () => irAMovimientos('All'));
  initActivityHeatmapListeners('finanzas-heatmap', 'var(--o-mod)');
  renderResumenCharts();
}

function montarMovimientos() {
  // Filtros: solo se repinta la lista (sin perder el foco del campo).
  const pintarLista = () => {
    const ul = document.getElementById('history-list-content');
    if (!ul) return;
    ul.innerHTML = listaMovimientosHtml();
    ul.querySelectorAll('.o-fin-mov-abrir').forEach(btn => btn.addEventListener('click', async () => {
      await ldMov.abrir(btn.dataset.id);
      if (ldMov.subpantalla) window.scrollTo(0, 0);
    }));
  };
  document.querySelectorAll('.history-tab').forEach(chip => chip.addEventListener('click', () => {
    filtroMov = chip.dataset.filter;
    document.querySelectorAll('.history-tab').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    pintarLista();
  }));
  const desde = document.getElementById('history-date-from');
  const hasta = document.getElementById('history-date-to');
  desde?.addEventListener('change', () => { fechaDesde = desde.value; pintarLista(); });
  hasta?.addEventListener('change', () => { fechaHasta = hasta.value; pintarLista(); });
  document.getElementById('btn-clear-date-filter')?.addEventListener('click', () => {
    if (desde) desde.value = '';
    if (hasta) hasta.value = '';
    fechaDesde = '';
    fechaHasta = '';
    pintarLista();
  });

  // Gasto rápido (parseQuickGasto, sin cambios).
  const quickGastoForm = document.getElementById('quick-gasto-form');
  const quickGastoInput = document.getElementById('quick-gasto-input');
  const quickGastoHint = document.getElementById('quick-gasto-hint');
  bindQuickCaptureForm(quickGastoForm, async () => {
    const text = quickGastoInput.value.trim();
    if (!text) return;
    const parsed = parseQuickGasto(text, b.envelopes);
    if (!parsed) {
      quickGastoHint.textContent = 'No pude leer el monto — prueba algo como "50 en supermercado"';
      quickGastoHint.classList.add('o-fin-pista--error');
      return;
    }
    quickGastoHint.classList.remove('o-fin-pista--error');
    if (parsed.matches.length === 1) {
      const env = parsed.matches[0];
      await accion(() => db.addTransaction({ type: 'Gasto', category: env.category, label: parsed.label || env.name, amount: parsed.amount, envelopeId: env.id, goalId: null }));
      Toast(`Gasto de ${formatCurrency(parsed.amount)} agregado a ${escapeHtml(env.name)}`, 'success');
      quickGastoInput.value = '';
      await repintar();
      document.getElementById('quick-gasto-input')?.focus({ preventScroll: true });
    } else {
      quickGastoHint.textContent = parsed.matches.length > 1
        ? 'Encontré más de un sobre posible — confirma cuál es'
        : 'No encontré una categoría clara — confirma cuál es';
      document.getElementById('gasto-modal').openForm({ amount: parsed.amount, label: parsed.label });
      quickGastoInput.value = '';
    }
  });

  // Detalle.
  document.getElementById('btn-volver-mov')?.addEventListener('click', () => ldMov.cerrar());
  document.getElementById('btn-cerrar-mov')?.addEventListener('click', () => ldMov.cerrar());
  const txAbierto = () => b.breakdown.find(x => x.id === ldMov.id);
  document.getElementById('btn-editar-mov')?.addEventListener('click', () => {
    const tx = txAbierto();
    if (!tx) return;
    if (tx.type === 'Ingreso') document.getElementById('ingreso-modal').openForm(tx);
    else if (tx.category === 'Savings') document.getElementById('ahorro-modal').openForm(tx);
    else document.getElementById('gasto-modal').openForm(tx);
  });
  document.getElementById('btn-eliminar-mov')?.addEventListener('click', () => accion(async () => {
    const tx = txAbierto();
    if (!tx) return;
    const ok = await ConfirmDialog('Eliminar movimiento', 'No se puede deshacer.', { verb: 'Eliminar' });
    if (!ok) return;
    await db.deleteTransaction(tx.id);
    Toast('Movimiento eliminado', 'success');
    await ldMov.cerrar();
  }));
}

function montarSobres() {
  initEnvelopeForm(db, repintar);
  document.getElementById('btn-open-settings')?.addEventListener('click', () => window.appRouter.navigate('configuracion'));
  document.querySelectorAll('.legend-item').forEach(item => item.addEventListener('click', () => {
    irAMovimientos(item.dataset.cat === 'Ahorro' ? 'Ahorro' : 'Gasto');
  }));

  document.querySelectorAll('.env-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const env = b.envelopes.find(x => x.id === row.dataset.id);
      if (env) document.getElementById('envelope-modal').openForm(env);
    });
  });
  document.querySelectorAll('.sobre-menu-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const yaAbierto = menuSobre && menuSobre.btn === btn;
      await cerrarMenuSobre();
      if (!yaAbierto) abrirMenuSobre(btn);
    });
  });
  document.querySelectorAll('.edit-env').forEach(btn => {
    btn.addEventListener('click', async () => {
      await cerrarMenuSobre();
      const env = b.envelopes.find(x => x.id === btn.dataset.id);
      if (env) document.getElementById('envelope-modal').openForm(env);
    });
  });
  // R3: archivar en vez de eliminar. Si hay recurrentes apuntando al sobre,
  // no se archiva: se muestran y se ofrece ir a Recurrentes.
  document.querySelectorAll('.archive-env').forEach(btn => {
    btn.addEventListener('click', () => accion(async () => {
      const id = btn.dataset.id;
      await cerrarMenuSobre();
      const env = b.envelopes.find(x => x.id === id);
      const nombre = env ? env.name : 'el sobre';
      const recurrentes = (await db.getRecurring()).filter(r => r.envelopeId === id);
      if (recurrentes.length > 0) {
        const uno = recurrentes.length === 1;
        const lista = recurrentes.map(r => r.label || 'Sin nombre').join(', ');
        const irARecurrentes = await ConfirmDialog(
          `No se puede archivar ${nombre}`,
          `${uno ? 'Lo usa este pago fijo' : 'Lo usan estos pagos fijos'}: ${lista}. ${uno ? 'Cámbialo de sobre o bórralo' : 'Cámbialos de sobre o bórralos'} en Recurrentes primero.`,
          { verb: 'Ver recurrentes', danger: false }
        );
        if (irARecurrentes) cambiarPestana('recurrentes');
        return;
      }
      const confirmed = await ConfirmDialog(
        `Archivar sobre ${nombre}`,
        'El sobre se oculta; su historial y saldo se conservan. Puedes desarchivarlo cuando quieras.',
        { verb: 'Archivar', danger: false }
      );
      if (!confirmed) return;
      await db.archivarSobre(id);
      await repintar();
    }));
  });
  document.querySelectorAll('.desarchivar-env').forEach(btn => {
    btn.addEventListener('click', () => accion(async () => {
      await db.desarchivarSobre(btn.dataset.id);
      await repintar();
    }));
  });
  document.querySelectorAll('.transfer-env').forEach(btn => {
    btn.addEventListener('click', async () => {
      await cerrarMenuSobre();
      document.getElementById('transfer-modal').openForm(btn.dataset.id);
    });
  });
  document.querySelectorAll('.btn-add-envelope').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById('envelope-modal').openForm());
  });

  // Metas.
  document.getElementById('btn-add-goal')?.addEventListener('click', () => openGoalForm(null, { dominio: 'finanzas', tipo: 'dinero' }));
  document.querySelectorAll('.edit-goal').forEach(btn => btn.addEventListener('click', () => {
    const goal = b.goals.find(g => g.id === btn.dataset.id);
    if (goal) openGoalForm(goal);
  }));
  document.querySelectorAll('.delete-goal').forEach(btn => btn.addEventListener('click', () => accion(async () => {
    const goal = b.goals.find(g => g.id === btn.dataset.id);
    if (!goal) return;
    const confirmed = await ConfirmDialog(
      `Eliminar meta ${goal.name}`,
      goal.currentAmount > 0
        ? `El seguimiento de esta meta desaparece. Los ${formatCurrency(goal.currentAmount)} que llevas ahorrados quedan en tu historial de movimientos. No se puede deshacer.`
        : 'No se puede deshacer.',
      { verb: 'Eliminar' }
    );
    if (!confirmed) return;
    await db.deleteGoal(goal.id);
    await repintar();
  })));
  document.querySelectorAll('.goal-row').forEach(row => row.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    document.getElementById('ahorro-modal').openForm(null, row.dataset.id);
  }));
}

function montarRecurrentes() {
  enlazarFilasAnuales();
  document.getElementById('btn-add-recurring')?.addEventListener('click', () => {
    if (!b.envelopes || b.envelopes.length === 0) {
      Toast('Primero debes crear un sobre', 'warning');
      return;
    }
    document.getElementById('recurring-modal').openForm();
  });
  document.querySelectorAll('.o-fin-rec-abrir').forEach(btn => btn.addEventListener('click', async () => {
    await ldRec.abrir(btn.dataset.id);
    if (ldRec.subpantalla) window.scrollTo(0, 0);
  }));
  document.getElementById('btn-volver-rec')?.addEventListener('click', () => ldRec.cerrar());
  document.getElementById('btn-cerrar-rec')?.addEventListener('click', () => ldRec.cerrar());
  document.getElementById('btn-eliminar-recurrente')?.addEventListener('click', () => accion(async () => {
    const req = (b.recurring || []).find(r => r.id === ldRec.id);
    if (!req) return;
    const confirmed = await ConfirmDialog(
      `Eliminar pago fijo ${req.label}`,
      'Ya no se descontará dinero automáticamente de tu sobre.',
      { verb: 'Eliminar' }
    );
    if (!confirmed) return;
    await db.deleteRecurring(req.id);
    Toast('Pago fijo eliminado', 'success');
    await ldRec.cerrar();
  }));
}

// =============================================================================
// Para otras vistas
// =============================================================================
// Palabras que no aportan como pista de categoría en el gasto rápido.
const QUICK_GASTO_STOPWORDS = new Set(['en', 'de', 'del', 'el', 'la', 'los', 'las', 'para', 'por', 'un', 'una']);

// Interpreta texto libre tipo "50 en supermercado": el primer número es el
// monto, y el resto del texto se busca como palabra clave contra el nombre
// de los sobres existentes (coincidencia de substring, sin distinguir
// mayúsculas). Devuelve null si no hay un monto válido.
// Formato CL: el punto es separador de miles (12.500 = doce mil quinientos)
// y la coma es SIEMPRE el separador decimal (12,5 = doce coma cinco).
// La regex prueba primero el patrón de miles (punto + grupos de 3 dígitos),
// porque las alternativas se evalúan de izquierda a derecha y una regex más
// laxa cortaría "12.500" en "12".
const QUICK_GASTO_AMOUNT_RE = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?|\d+/;
const THOUSANDS_FORMAT_RE = /^\d{1,3}(?:\.\d{3})+/;

export const parseQuickGasto = (text, envelopes) => {
  const match = text.match(QUICK_GASTO_AMOUNT_RE);
  if (!match) return null;
  let normalized = match[0];
  if (THOUSANDS_FORMAT_RE.test(normalized)) normalized = normalized.replace(/\./g, '');
  normalized = normalized.replace(',', '.');
  const amount = parseFloat(normalized);
  if (!amount || amount <= 0) return null;

  const rawLabel = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim();
  const palabras = rawLabel.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !QUICK_GASTO_STOPWORDS.has(w));

  // Etiqueta sin las palabras de relleno ("en", "de", ...), para no guardar
  // movimientos con nombres como "en supermercado".
  const label = rawLabel
    .split(/\s+/)
    .filter(w => !QUICK_GASTO_STOPWORDS.has(w.toLowerCase()))
    .join(' ')
    .replace(/^./, c => c.toUpperCase());

  const matches = (envelopes || []).filter(env => {
    const nombre = env.name.toLowerCase();
    return palabras.some(w => nombre.includes(w) || w.includes(nombre));
  });

  return { amount, label, matches };
};

// Fila de movimiento MK III: la usa Laboratorio › Finanzas (lab-finanzas.js),
// que todavía no se migra a Órbita. envelopes se pasa explícito para que sea
// llamable sin que Finanzas esté montada.
const ICON_PATHS = {
  'Ingreso': '<polyline points="5 12 12 5 19 12"></polyline><line x1="12" y1="19" x2="12" y2="5"></line>',
  'Needs': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
  'Wants': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
  'Ahorro': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
  'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
  'plane': '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"></path>',
  'car': '<rect x="1" y="9" width="22" height="12" rx="3"></rect><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"></path><circle cx="6" cy="21" r="2"></circle><circle cx="18" cy="21" r="2"></circle>',
  'home': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
  'laptop': '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
  'education': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>',
  'default': '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle>'
};
const getSVG = (key, color = 'currentColor') => {
  if (!key) return '';
  let matchedKey = key;
  if (key === 'Income') matchedKey = 'Ingreso';
  if (key === 'Savings') matchedKey = 'Ahorro';
  if (key === 'Necesidades') matchedKey = 'Needs';
  if (key === 'Deseos') matchedKey = 'Wants';
  const path = ICON_PATHS[matchedKey] || ICON_PATHS['default'];
  return `<svg width="18" height="18" fill="none" stroke="${color}" stroke-width="2" viewBox="0 0 24 24">${path}</svg>`;
};
const getCatColor = (cat) => {
  if (cat === 'Needs') return 'var(--am2)';
  if (cat === 'Wants') return 'var(--accent-blue)';
  if (cat === 'Savings') return 'var(--accent-purple)';
  if (cat === 'Income') return 'var(--state-success)';
  return 'var(--text-secondary)';
};
const transferSvg = `<svg aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 3v18M17 3l4 4M17 3l-4 4M7 21V3M7 21l4-4M7 21l-4-4"></path></svg>`;
const delSvg = `<svg aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

export const txHtml = (tx, envelopes) => {
  let catColor = getCatColor(tx.category);
  let iconSvg = getSVG(tx.category, catColor);
  let fallbackLabel = tx.type === 'Ingreso' ? 'Ingreso' : (tx.category === 'Savings' ? 'Ahorro' : (tx.category === 'Needs' ? 'Necesidades' : 'Deseos'));
  let displayLabel = tx.label || fallbackLabel;
  let subText = `${formatFechaCorta(fechaLocalDe(tx.date))} &bull; ${tx.category === 'Needs' ? 'Necesidades' : tx.category === 'Wants' ? 'Deseos' : tx.category === 'Savings' ? 'Ahorro' : 'Ingreso'}`;

  let amountPrefix = tx.type === 'Ingreso' ? '+' : '-';
  let amountColor = tx.type === 'Ingreso' ? 'var(--state-success)' : 'var(--text-primary)';

  if (tx.envelopeId && envelopes) {
    const env = envelopes.find(e => e.id === tx.envelopeId);
    if (env) {
      if (tx.type === 'Gasto') {
        iconSvg = getSVG(env.icon, catColor);
        subText = `${formatFechaCorta(fechaLocalDe(tx.date))} &bull; ${escapeHtml(env.name)}`;
      } else if (tx.type === 'Assignment') {
        catColor = 'var(--accent-blue)';
        iconSvg = transferSvg;
        amountColor = tx.isSubtraction ? 'var(--text-primary)' : 'var(--state-success)';
        amountPrefix = tx.isSubtraction ? '-' : '+';
        subText = `${formatFechaCorta(fechaLocalDe(tx.date))} &bull; ${tx.isSubtraction ? 'Retirado de' : 'Asignado a'} ${escapeHtml(env.name)}`;
      }
    }
  } else if (tx.type === 'Transfer' && envelopes) {
    catColor = 'var(--accent-blue)';
    iconSvg = transferSvg;
    const fromEnv = escapeHtml(envelopes.find(e => e.id === tx.fromEnvelopeId)?.name || 'Desconocido');
    const toEnv = escapeHtml(envelopes.find(e => e.id === tx.toEnvelopeId)?.name || 'Desconocido');
    subText = `${formatFechaCorta(fechaLocalDe(tx.date))} &bull; ${fromEnv} &rarr; ${toEnv}`;
    amountPrefix = '';
    amountColor = 'var(--text-secondary)';
  }

  return `
    <div class="fin-row tappable edit-tx" data-id="${tx.id}" style="cursor: pointer;">
      <div style="width: 32px; height: 32px; flex-shrink: 0; background: color-mix(in srgb, ${catColor} 13%, transparent); display: flex; align-items: center; justify-content: center; color: ${colorTexto(catColor)};">
        ${iconSvg}
      </div>
      <div class="fin-who">
        <div class="fin-name">${escapeHtml(conMayuscula(displayLabel))}</div>
        <div class="fin-meta">${subText}</div>
      </div>
      <div class="fin-amt${tx.type === 'Gasto' && tx.category !== 'Savings' ? ' fin-amt--gasto' : ''}" style="color: ${colorTexto(amountColor)};">${amountPrefix}${formatCurrency(tx.amount)}</div>
      <button class="delete-tx tappable" data-id="${tx.id}" aria-label="Eliminar movimiento ${escapeHtml(displayLabel)}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer; padding: 4px; flex-shrink: 0;">
         ${delSvg}
      </button>
    </div>
  `;
};
