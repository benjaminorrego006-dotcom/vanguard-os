// Gráficos de Finanzas del Laboratorio (ex Análisis > Finanzas) —
// extraídos de analisis.js para poder montarse desde Inicio sin cargar
// esa vista completa. Mismo comportamiento que tenían ahí: Desglose de
// asignación, Movimientos (solo lectura), Metas de ahorro e Hitos.
import { db } from '../core/db.js';
import { renderGoalCard, formatGoalValue } from './goal-card.js';
import { openGoalForm, openGoalContribute } from './goal-form.js';
import { renderDonutChart, renderDonutLegend, destroyAllDonuts } from './donut-chart.js';
import { renderMiniChart } from './mini-chart.js';
import { txHtml } from '../views/finanzas.js';
import { EmptyState, ConfirmDialog } from '../utils/states.js';
import { formatCurrency } from '../utils/currency.js';
import { formatMes } from '../utils/fecha.js';

export const TABS = [
  { id: 'desglose', label: 'Desglose' },
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'metas', label: 'Metas' },
  { id: 'hitos', label: 'Hitos' }
];

let finMovRango = 'trimestre'; // 'mes' | 'trimestre' | 'año' | 'todo'
let lastFinanzasDonutEntries = [];

export function cleanup() {
  destroyAllDonuts();
}

const resumenCardHtml = (label, value) => `
  <div class="card" style="padding: 16px; border-radius: 16px; text-align: center;">
    <div class="num" style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${value}</div>
    <div style="font-size: 10.5px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px;">${label}</div>
  </div>`;

// Sin ninguna transacción registrada, la sección entera se resuelve como
// "sin datos" desde el orquestador (laboratorio.js).
export async function tieneDatos() {
  const budget = await db.getBudget();
  return budget.breakdown.length > 0;
}

async function renderDesglose() {
  const budget = await db.getBudget();

  const entries = budget.allocations
    .filter(a => a.amount > 0)
    .map(a => ({
      label: a.category === 'Needs' ? 'Necesidades' : a.category === 'Wants' ? 'Deseos' : 'Ahorro',
      valor: Math.round(a.amount),
      color: a.category === 'Needs' ? 'var(--am)' : a.category === 'Wants' ? 'var(--am2)' : 'var(--amd)'
    }));
  lastFinanzasDonutEntries = entries;

  const donutSection = entries.length === 0
    ? EmptyState('Sin movimientos este mes', 'Registra un ingreso o gasto para ver la distribución.')
    : `<div style="height: 200px;"><canvas id="lab-fin-donut"></canvas></div><div style="margin-top: 14px;">${renderDonutLegend(entries)}</div>`;

  const trendHtml = budget.trend
    ? `<div style="font-size: 12.5px; font-weight: 700; margin-top: 10px; color: ${budget.trend.isUp ? 'var(--rd)' : 'var(--state-success)'};">Gastaste ${budget.trend.pct}% ${budget.trend.isUp ? 'más' : 'menos'} que el mes pasado</div>`
    : '';

  return `
    <div>
      <div class="card" style="padding: 18px 20px; margin-bottom: 20px; border-radius: 18px;">
        <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Distribución del mes</h3>
        ${donutSection}
        ${trendHtml}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${resumenCardHtml('Ingresos', formatCurrency(budget.income))}
        ${resumenCardHtml('Gastos', formatCurrency(budget.expenses))}
        ${resumenCardHtml('Ahorro', formatCurrency(budget.savedThisMonth))}
        ${resumenCardHtml('Transacciones', budget.breakdown.length)}
      </div>
    </div>
  `;
}

async function initDesgloseChart() {
  if (lastFinanzasDonutEntries.length === 0) return;
  await renderDonutChart('lab-fin-donut', lastFinanzasDonutEntries, {
    tooltipLabel: (ctx, entry) => `${entry.label}: ${formatCurrency(entry.valor)}`
  });
}

function rangoFechasFinMov() {
  const hoy = new Date();
  const toStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (finMovRango === 'todo') return { start: null, end: null };
  const start = new Date(hoy);
  if (finMovRango === 'mes') start.setMonth(start.getMonth() - 1);
  else if (finMovRango === 'trimestre') start.setMonth(start.getMonth() - 3);
  else if (finMovRango === 'año') start.setFullYear(start.getFullYear() - 1);
  return { start: toStr(start), end: toStr(hoy) };
}

async function renderMovimientos() {
  const RANGOS = [{ v: 'mes', l: 'Mes' }, { v: 'trimestre', l: 'Trimestre' }, { v: 'año', l: 'Año' }, { v: 'todo', l: 'Todo' }];
  const { start, end } = rangoFechasFinMov();
  const [txs, envelopes] = await Promise.all([db.getTransaccionesEnRango(start, end), db.getEnvelopes()]);

  const listHtml = txs.length === 0
    ? EmptyState('Sin movimientos en este período', 'Prueba un rango más amplio.')
    : txs.map(tx => txHtml(tx, envelopes)).join('');

  return `
    <div>
      <div style="display: flex; gap: 6px; margin-bottom: 16px;">
        ${RANGOS.map(r => `<button type="button" class="btn-lab-fin-mov-rango" data-rango="${r.v}" style="flex: 1; padding: 8px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid ${finMovRango === r.v ? 'var(--am)' : 'var(--surface-border)'}; background: ${finMovRango === r.v ? 'var(--am)' : 'transparent'}; color: ${finMovRango === r.v ? 'var(--bg-base)' : 'var(--text-secondary)'};">${r.l}</button>`).join('')}
      </div>
      <div style="font-size: 11.5px; color: var(--text-secondary); margin-bottom: 12px;">${txs.length} movimiento${txs.length === 1 ? '' : 's'} — vista de solo lectura, edita desde Finanzas &gt; Movimientos.</div>
      <style>#lab-fin-mov-list .delete-tx { display: none; }</style>
      <div id="lab-fin-mov-list">${listHtml}</div>
    </div>
  `;
}

async function renderMetas() {
  const metas = await db.getGoals('finanzas');

  if (metas.length === 0) {
    return `
      <div>
        ${EmptyState('Sin metas de ahorro todavía', 'Ej. "Fondo de emergencia", "Vacaciones" o "Pie para depto"')}
        <button id="btn-lab-fin-nueva-meta" style="margin-top: 12px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>
      </div>`;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${metas.map(g => renderGoalCard(g)).join('')}
      <button id="btn-lab-fin-nueva-meta" style="margin-top: 4px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>
    </div>`;
}

async function renderHitos() {
  const [mesesSinExceder, categoriasFuera, tendenciaAhorro] = await Promise.all([
    db.getMesesSinExceder(6),
    db.getCategoriasFueraDeRango(6),
    db.getTendenciaAhorro(6)
  ]);

  const mesLabel = (mesStr) => {
    const [y, m] = mesStr.split('-');
    const mesDate = new Date(Number(y), Number(m) - 1, 1);
    return `${formatMes(mesDate)} ${mesDate.getFullYear()}`;
  };

  const mesesHtml = mesesSinExceder.length === 0
    ? `<div style="font-size: 12.5px; color: var(--text-secondary);">Todavía no hay un mes completo sin excederte.</div>`
    : mesesSinExceder.map(m => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--surface-border);">
          <span style="font-size: 13px; color: var(--text-primary); text-transform: capitalize;">${mesLabel(m.mes)}</span>
          <span style="font-size: 12px; color: var(--state-success); font-weight: 700;">✓ Sin excederte</span>
        </div>`).join('');

  const categoriasHtml = categoriasFuera.length === 0
    ? `<div style="font-size: 12.5px; color: var(--text-secondary);">Ninguna categoría se sale de rango de forma consistente.</div>`
    : categoriasFuera.map(c => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--surface-border);">
          <span style="font-size: 13px; color: var(--text-primary);">${c.categoria}</span>
          <span style="font-size: 12px; color: var(--rd); font-weight: 700;">${c.meses}/${c.totalMeses} meses</span>
        </div>`).join('');

  const ahorroChartHtml = renderMiniChart(tendenciaAhorro, {
    color: 'var(--am)',
    unidad: '',
    label: 'Ahorro guardado por mes (últimos 6 meses)',
    emptyText: 'Registra algunos meses de ahorro para ver la tendencia.'
  });

  return `
    <div>
      <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">Tendencia de ahorro</h3>
        ${ahorroChartHtml}
      </div>
      <div class="card" style="padding: 18px; border-radius: 18px; margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">Meses sin exceder presupuesto</h3>
        ${mesesHtml}
      </div>
      <div class="card" style="padding: 18px; border-radius: 18px;">
        <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 12px 0; color: var(--text-primary);">Categorías fuera de rango</h3>
        ${categoriasHtml}
      </div>
    </div>
  `;
}

export async function renderTab(activeTab) {
  if (activeTab === 'movimientos') return await renderMovimientos();
  if (activeTab === 'metas') return await renderMetas();
  if (activeTab === 'hitos') return await renderHitos();
  return await renderDesglose();
}

export function initTabListeners(activeTab, refresh) {
  if (activeTab === 'desglose') {
    initDesgloseChart();
  }

  if (activeTab === 'movimientos') {
    document.querySelectorAll('.btn-lab-fin-mov-rango').forEach(btn => {
      btn.addEventListener('click', () => { finMovRango = btn.getAttribute('data-rango'); refresh(); });
    });
  }

  if (activeTab === 'metas') {
    const btnNueva = document.getElementById('btn-lab-fin-nueva-meta');
    if (btnNueva) btnNueva.addEventListener('click', () => openGoalForm(null, { dominio: 'finanzas', tipo: 'dinero' }));

    document.querySelectorAll('.edit-goal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = (await db.getGoals('finanzas')).find(g => g.id === id);
        if (goal) openGoalForm(goal);
      });
    });
    document.querySelectorAll('.delete-goal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = (await db.getGoals('finanzas')).find(g => g.id === id);
        if (goal) {
          const confirmed = await ConfirmDialog(
            `Eliminar meta ${goal.name}`,
            goal.currentAmount > 0
              ? `El seguimiento de esta meta desaparece. Los ${formatCurrency(goal.currentAmount)} que llevas ahorrados quedan en tu historial de movimientos. No se puede deshacer.`
              : 'No se puede deshacer.',
            { verb: 'Eliminar' }
          );
          if (confirmed) { await db.deleteGoal(id); refresh(); }
        }
      });
    });
    document.querySelectorAll('.goal-row').forEach(row => {
      row.addEventListener('click', async (e) => {
        if (e.target.closest('button')) return;
        const id = e.currentTarget.getAttribute('data-id');
        const goal = (await db.getGoals('finanzas')).find(g => g.id === id);
        if (goal && !goal.autoTrack) openGoalContribute(goal);
      });
    });
  }
}
