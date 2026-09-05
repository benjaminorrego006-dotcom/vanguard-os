import { Toast, ConfirmDialog, SkeletonCard } from '../utils/states.js';
import { renderDonut } from '../utils/donut.js';
import { db } from '../core/db.js';
import { formatCurrency, formatCompactCurrency } from '../utils/currency.js';
import { exportAllData, importAllData, getDiasDesdeUltimoBackup } from '../utils/backup.js';
import { mountSetPinFlow, requestPinVerification } from '../core/lock.js';
import { renderActivityHeatmap, initActivityHeatmapListeners } from '../components/activity-heatmap.js';
import { renderIngresoForm, initIngresoForm } from '../components/IngresoForm.js';
import { renderGastoForm, initGastoForm } from '../components/GastoForm.js';
import { renderAhorroForm, initAhorroForm } from '../components/AhorroForm.js';
import { renderEnvelopeForm, initEnvelopeForm } from '../components/EnvelopeForm.js';
import { renderTransferForm, initTransferForm } from '../components/TransferForm.js';
import { renderRecurringForm, initRecurringForm } from '../components/RecurringForm.js';
import { ensureChartJs, appPalette, baseChartOptions, chartFontFamily } from '../utils/charts.js';
import { renderGoalCard } from '../components/goal-card.js';
import { renderGoalForm, initGoalForm, openGoalForm, openGoalContribute } from '../components/goal-form.js';
import { escapeHtml } from '../utils/escape.js';
import { mesKeyDe, formatFechaCorta, formatMes } from '../utils/fecha.js';

const editSvg = `<svg aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
const transferSvg = `<svg aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 3v18M17 3l4 4M17 3l-4 4M7 21V3M7 21l4-4M7 21l-4-4"></path></svg>`;
const delSvg = `<svg aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const backspaceSvg = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>`;
let b = null;
let activeFinTab = 'resumen';
let donutChartInstance = null;
let dailyBalanceChartInstance = null;
let monthCompareChartInstance = null;
let currentMonth = mesKeyDe(new Date());

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
  // Normalización para casos como 'Income' o 'Necesidades'
  let matchedKey = key;
  if (key === 'Income') matchedKey = 'Ingreso';
  if (key === 'Savings') matchedKey = 'Ahorro';
  if (key === 'Necesidades') matchedKey = 'Needs';
  if (key === 'Deseos') matchedKey = 'Wants';

  const path = ICON_PATHS[matchedKey] || ICON_PATHS['default'];
  return `<svg width="18" height="18" fill="none" stroke="${color}" stroke-width="2" viewBox="0 0 24 24">${path}</svg>`;
};



// Compacta el monto ("$50 mil") cuando el formato completo se pasa de
// ancho en la card "Disponible en Mes" — mide el string YA formateado, no
// el número crudo (un número corto puede formatear largo con símbolo de
// moneda + separadores).
const formatDisponible = (amount) => (formatCurrency(amount).length > 13) ? formatCompactCurrency(amount) : formatCurrency(amount);

// A diferencia de animateNumber() de utils/animate.js (que formatea con
// formatCurrency o formatCompactCurrency según un flag fijo), esta card
// necesita decidir el formato en cada frame según el ancho del string ya
// formateado (formatDisponible), así que no puede reusar ese utilitario.
const finAnimateCurrency = (el, from, to, duration = 500) => {
  const start = performance.now();
  const step = (timestamp) => {
    const progress = Math.min((timestamp - start) / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * easeProgress;
    el.innerText = formatDisponible(current);
    if (progress < 1) requestAnimationFrame(step);
    else el.innerText = formatDisponible(to);
  };
  requestAnimationFrame(step);
};

export let mountListeners;

// Llamado por el router (app.js) antes de desmontar esta vista — evita que
// las instancias de Chart.js sigan vivas con su canvas ya fuera del DOM.
export function cleanup() {
  if (donutChartInstance) { donutChartInstance.destroy(); donutChartInstance = null; }
  if (dailyBalanceChartInstance) { dailyBalanceChartInstance.destroy(); dailyBalanceChartInstance = null; }
  if (monthCompareChartInstance) { monthCompareChartInstance.destroy(); monthCompareChartInstance = null; }
}

export async function init() {
  b = await db.getBudget(currentMonth);

  const refresh = async () => {
    const prevB = b;
    b = await db.getBudget(currentMonth);
    
    // Animate stats
    const elIncome = document.getElementById('stat-income');
    const elExpense = document.getElementById('stat-expense');
    if(elIncome) finAnimateCurrency(elIncome, prevB.income, b.income, 400);
    if(elExpense) finAnimateCurrency(elExpense, prevB.expenses, b.expenses, 400);
    
    // Update disponible big number (card-disponible)
    const elDisponible = document.getElementById('disponible-mes-value');
    if (elDisponible) {
      elDisponible.innerText = formatDisponible(b.remaining);
      elDisponible.style.color = (b.remaining >= 0) ? 'var(--state-success)' : 'var(--state-high)';
    }

    // Donut de Presupuesto (SVG dibujado a mano, sin cambios) + gráficos
    // reales de Resumen (Chart.js, ver renderResumenCharts).
    const totalNeeds = b.allocations.find(a => a.category === 'Needs')?.amount || 0;
    const totalWants = b.allocations.find(a => a.category === 'Wants')?.amount || 0;
    const totalSavings = b.allocations.find(a => a.category === 'Savings')?.amount || 0;
    const getPct = (val) => b.budgeted > 0 ? Math.round((val / b.budgeted) * 100) : 0;

    const segments = [
      { percent: getPct(totalNeeds), color: 'var(--am2)' },
      { percent: getPct(totalWants), color: 'var(--accent-blue)' },
      { percent: getPct(totalSavings), color: 'var(--accent-purple)' }
    ];
    const donutSvg = renderDonut(segments, b.budgeted, b.budgeted === 0);

    const donutPresupuesto = document.getElementById('chart-donut-presupuesto');
    if (donutPresupuesto) donutPresupuesto.innerHTML = donutSvg;

    const donutPresupuestoText = document.querySelector('#chart-donut-presupuesto + div > div:last-child');
    if (donutPresupuestoText) donutPresupuestoText.innerText = formatCurrency(b.expenses + b.savedThisMonth);

    const resumenLegend = document.getElementById('resumen-cat-legend');
    if (resumenLegend) resumenLegend.innerHTML = renderResumenLegend(b);

    renderResumenCharts(b);

    const heatmapContainer = document.getElementById('finanzas-heatmap');
    if (heatmapContainer) {
      heatmapContainer.outerHTML = buildFinanzasHeatmapHtml();
      initActivityHeatmapListeners('finanzas-heatmap', 'var(--accent-purple)');
    }

    const trendContainer = document.getElementById('month-trend-container');
    if (trendContainer) trendContainer.innerHTML = renderMonthTrend(b);

    const dailyAvailContainer = document.getElementById('daily-available-container');
    if (dailyAvailContainer) dailyAvailContainer.innerHTML = renderDailyAvailable(b);

    // Update transactions
    const txContainer = document.getElementById('recent-tx-list');
    if(txContainer) {
      txContainer.innerHTML = b.breakdown.length === 0 ? finEmptyState('Sin datos', 'Todavía no hay movimientos', 'Toca el botón Ingreso o Gasto para registrar el primero.') : b.breakdown.slice(0, 5).map(tx => txHtml(tx, b.envelopes)).join('');
    }

    // Update Presupuesto Tab Legend (budget cards de la regla 50/30/20)
    const legendContainer = document.getElementById('presupuesto-legend-container');
    if (legendContainer) legendContainer.innerHTML = renderPresupuestoLegend(b);

    // Update Cuentas Tab (sobres como account-cards)
    const envelopesContainer = document.getElementById('envelopes-list-container');
    if (envelopesContainer) {
      envelopesContainer.innerHTML = await renderEnvelopesHTML(b);
      attachEnvListeners();
    }

    const aomCard = document.getElementById('card-ageofmoney');
    if (aomCard) {
      aomCard.outerHTML = renderAgeOfMoneyHTML(b);
    }

    const recurringContainer = document.getElementById('recurring-container');
    if(recurringContainer) {
      recurringContainer.innerHTML = renderRecurringHTML(b);
      attachRecurringListeners();
    }

    const goalsContainer = document.getElementById('goals-container');
    if(goalsContainer) {
      goalsContainer.innerHTML = renderGoalsHTML(b);
      attachGoalListeners();
    }
    
    // Re-attach listeners for dynamically updated Tx rows
    attachTxListeners();

    // Mantiene sincronizada la pestaña Movimientos si está montada (evita
    // que una fila editada/eliminada quede "pegada" con datos viejos).
    renderHistoryList();
  };

  let currentTypeFilter = 'All';

  const renderHistoryList = (filterVal) => {
    if (filterVal !== undefined) currentTypeFilter = filterVal;
    const container = document.getElementById('history-list-content');
    if (!container) return;

    let filtered = b.breakdown;
    if (currentTypeFilter === 'Ingreso') filtered = filtered.filter(t => t.type === 'Ingreso');
    if (currentTypeFilter === 'Gasto') filtered = filtered.filter(t => t.type === 'Gasto' && t.category !== 'Savings');
    if (currentTypeFilter === 'Ahorro') filtered = filtered.filter(t => t.category === 'Savings');

    const dateFrom = document.getElementById('history-date-from')?.value;
    const dateTo = document.getElementById('history-date-to')?.value;
    if (dateFrom) filtered = filtered.filter(t => t.date && t.date.slice(0, 10) >= dateFrom);
    if (dateTo) filtered = filtered.filter(t => t.date && t.date.slice(0, 10) <= dateTo);

    if (filtered.length === 0) {
      container.innerHTML = finEmptyState('Sin resultados', 'No hay movimientos', 'No se encontraron resultados con este filtro.');
      return;
    }

    container.innerHTML = filtered.map(tx => txHtml(tx, b.envelopes)).join('');
    attachTxListeners();
  };

  const attachEnvListeners = () => {
    document.querySelectorAll('.env-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const id = e.currentTarget.getAttribute('data-id');
        document.getElementById('assign-modal').openForm(id);
      });
    });
    document.querySelectorAll('.edit-env').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const env = b.envelopes.find(x => x.id === id);
        if (env) document.getElementById('envelope-modal').openForm(env);
      });
    });
    document.querySelectorAll('.delete-env').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const env = b.envelopes.find(x => x.id === id);
        const todasTxs = await db.getTransaccionesEnRango(null, null);
        const movimientosVinculados = todasTxs.filter(t => t.envelopeId === id || t.fromEnvelopeId === id || t.toEnvelopeId === id).length;
        const confirmed = await ConfirmDialog(
          `Eliminar sobre${env ? ' ' + env.name : ''}`,
          movimientosVinculados > 0
            ? `${movimientosVinculados} movimiento${movimientosVinculados === 1 ? '' : 's'} ya no ${movimientosVinculados === 1 ? 'tendrá' : 'tendrán'} un sobre asociado. No se puede deshacer.`
            : 'No se puede deshacer.',
          { verb: 'Eliminar' }
        );
        if (confirmed) {
          await db.deleteEnvelope(id);
          refresh();
        }
      });
    });
    document.querySelectorAll('.transfer-env').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        document.getElementById('transfer-modal').openForm(id);
      });
    });
    
    document.querySelectorAll('.btn-add-envelope').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.getElementById('envelope-modal').openForm();
        // pre-select category based on button
        const cat = e.currentTarget.getAttribute('data-cat');
        const catSelect = document.getElementById('envelope-category');
        if (catSelect && cat) {
          catSelect.value = cat;
        }
      });
    });
  };

  const openModal = (id) => { 
    document.getElementById(id).style.display = 'flex'; 
    setTimeout(() => document.getElementById(id).classList.add('open'), 10); 
  };
  const closeModal = (id) => { 
    document.getElementById(id).classList.remove('open'); 
    setTimeout(() => document.getElementById(id).style.display = 'none', 300); 
  };

  // --- REEMPLAZO DE TX EDIT (extraída para reutilizarse en refresh() e historial) ---
  const attachTxListeners = () => {
    document.querySelectorAll('.delete-tx').forEach(btn => {
      btn.addEventListener('click', async (e) => {
         e.stopPropagation();
         const id = e.currentTarget.getAttribute('data-id');
         const confirmed = await ConfirmDialog("Eliminar movimiento", "No se puede deshacer.", { verb: 'Eliminar' });
         if(confirmed) {
           await db.deleteTransaction(id);
           refresh();
         }
        });
      });

      document.querySelectorAll('.edit-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (e.target.closest('.delete-tx')) return;
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          const tx = b.breakdown.find(x => x.id === id);
          if(tx) {
            if (tx.type === 'Transfer' || tx.type === 'Assignment') {
              Toast("No es posible editar transferencias. Elimínala y crea una nueva.", "warning");
              return;
            }
            
            if(tx.type === 'Ingreso') {
              document.getElementById('ingreso-modal').openForm(tx);
            } else if (tx.category === 'Savings') {
              document.getElementById('ahorro-modal').openForm(tx);
            } else {
              document.getElementById('gasto-modal').openForm(tx);
            }
          }
        });
      });
  };

  const attachRecurringListeners = () => {
    const btnAddReq = document.getElementById('btn-add-recurring');
    if (btnAddReq) {
      btnAddReq.addEventListener('click', () => {
        if (!b.envelopes || b.envelopes.length === 0) {
          Toast("Primero debes crear un sobre", "warning");
          return;
        }
        document.getElementById('recurring-modal').openForm();
      });
    }
    document.querySelectorAll('.delete-recurring').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const req = (b.recurring || []).find(r => r.id === id);
        const confirmed = await ConfirmDialog(
          `Eliminar pago fijo${req ? ' ' + req.label : ''}`,
          'Ya no se descontará dinero automáticamente de tu sobre.',
          { verb: 'Eliminar' }
        );
        if (confirmed) {
           await db.deleteRecurring(id);
           refresh();
        }
      });
    });
  };

  const attachGoalListeners = () => {
    const btnAddGoal = document.getElementById('btn-add-goal');
    if (btnAddGoal) btnAddGoal.addEventListener('click', () => openGoalForm(null, { dominio: 'finanzas', tipo: 'dinero' }));

    document.querySelectorAll('.edit-goal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = b.goals.find(g => g.id === id);
        if (goal) openGoalForm(goal);
      });
    });

    document.querySelectorAll('.delete-goal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = b.goals.find(g => g.id === id);
        if (goal) {
          const confirmed = await ConfirmDialog(
            `Eliminar meta ${goal.name}`,
            goal.currentAmount > 0
              ? `El seguimiento de esta meta desaparece. Los ${formatCurrency(goal.currentAmount)} que llevas ahorrados quedan en tu historial de movimientos. No se puede deshacer.`
              : 'No se puede deshacer.',
            { verb: 'Eliminar' }
          );
          if (confirmed) {
             await db.deleteGoal(id);
             refresh();
          }
        }
      });
    });

    document.querySelectorAll('.goal-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const id = e.currentTarget.getAttribute('data-id');
        document.getElementById('ahorro-modal').openForm(null, id);
      });
    });
  };
  
  mountListeners = () => {

    document.querySelectorAll('.fin-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-tab');
        
        document.querySelectorAll('.fin-tab').forEach(t => {
          t.classList.remove('active');
          t.style.background = 'transparent';
          t.style.color = 'var(--text-secondary)';
        });
        e.currentTarget.classList.add('active');
        activeFinTab = target;
        e.currentTarget.style.background = 'var(--surface-1)';
        e.currentTarget.style.color = 'var(--text-primary)';
        
        document.querySelectorAll('.fin-tab-content').forEach(c => c.style.display = 'none');
        document.getElementById('tab-content-' + target).style.display = 'block';
        
        if (target === 'movimientos') {
          renderHistoryList('All');
        }
      });
    });

    initActivityHeatmapListeners('finanzas-heatmap', 'var(--accent-purple)');

    const elIncome = document.getElementById('stat-income');
    const elExpense = document.getElementById('stat-expense');

    if(elIncome) finAnimateCurrency(elIncome, 0, b.income, 800);
    if(elExpense) finAnimateCurrency(elExpense, 0, b.expenses, 800);
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const modal = e.target.closest('.modal-overlay');
          if (modal) closeModal(modal.id);
        });
      });

    const btnVerTodos = document.getElementById('btn-ver-todos');
    if (btnVerTodos) {
      btnVerTodos.addEventListener('click', () => {
        document.querySelector('.fin-tab[data-tab="movimientos"]').click();
        renderHistoryList('All');
      });
    }

    initIngresoForm(db, () => b, refresh);
    initGastoForm(db, () => b, refresh);
    initAhorroForm(db, () => b, refresh);
    initEnvelopeForm(db, refresh);
    initTransferForm(db, () => b, refresh);
    initRecurringForm(db, () => b, refresh);

    window.addEventListener('budget-updated', refresh);

    const btnFabIngreso = document.getElementById('btn-fab-ingreso');
    const btnFabGasto = document.getElementById('btn-fab-gasto');
    const btnFabAhorro = document.getElementById('btn-fab-ahorro');
    if (btnFabIngreso) btnFabIngreso.addEventListener('click', () => { document.getElementById('ingreso-modal').openForm(); });
    if (btnFabGasto) btnFabGasto.addEventListener('click', () => { document.getElementById('gasto-modal').openForm(); });
    if (btnFabAhorro) btnFabAhorro.addEventListener('click', () => { document.getElementById('ahorro-modal').openForm(); });

    const quickGastoInput = document.getElementById('quick-gasto-input');
    const quickGastoHint = document.getElementById('quick-gasto-hint');
    if (quickGastoInput) {
      quickGastoInput.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter') return;
        const text = quickGastoInput.value.trim();
        if (!text) return;

        const parsed = parseQuickGasto(text, b.envelopes);
        if (!parsed) {
          quickGastoHint.textContent = 'No encontré un monto — prueba algo como "50 en supermercado"';
          return;
        }

        if (parsed.matches.length === 1) {
          const env = parsed.matches[0];
          await db.addTransaction({
            type: 'Gasto',
            category: env.category,
            label: parsed.label || env.name,
            amount: parsed.amount,
            envelopeId: env.id,
            goalId: null
          });
          Toast(`Gasto de ${formatCurrency(parsed.amount)} agregado a ${escapeHtml(env.name)}`, 'success');
          quickGastoInput.value = '';
          quickGastoHint.textContent = '';
        } else {
          quickGastoHint.textContent = parsed.matches.length > 1
            ? 'Encontré más de un sobre posible — confirma cuál es'
            : 'No encontré una categoría clara — confirma cuál es';
          document.getElementById('gasto-modal').openForm({ amount: parsed.amount, label: parsed.label });
          quickGastoInput.value = '';
        }
      });
    }

    attachTxListeners();
    attachGoalListeners();
    attachRecurringListeners();
    attachEnvListeners();

    initGoalForm(refresh);

      // --- AJUSTES Y RESPALDOS ---
      const btnOpenSettings = document.getElementById('btn-open-settings');
      if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => {
        // FIX: el formulario de ajustes no precargaba la regla actual (quedaba vacío).
        const rule = b.rule || { needs: 0.5, wants: 0.3, savings: 0.2 };
        document.getElementById('rule-needs').value = Math.round(rule.needs * 100);
        document.getElementById('rule-wants').value = Math.round(rule.wants * 100);
        document.getElementById('rule-savings').value = Math.round(rule.savings * 100);
        openModal('settings-modal');
      });

      const btnCardDisponible = document.getElementById('card-disponible');
      // (el listener de click de esta tarjeta se agrega más abajo junto a las demás top-cards)

      const settingsForm = document.getElementById('settings-form');
      if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const n = parseFloat(document.getElementById('rule-needs').value) || 0;
          const w = parseFloat(document.getElementById('rule-wants').value) || 0;
          const s = parseFloat(document.getElementById('rule-savings').value) || 0;
          if (n + w + s !== 100) {
            Toast("Los porcentajes deben sumar 100", "error");
            return;
          }
          await db.setAllocationRule({ needs: n/100, wants: w/100, savings: s/100 });
          closeModal('settings-modal');
          Toast("Regla actualizada", "success");
          refresh();
        });
      }

      const btnExportData = document.getElementById('btn-export-data');
      if(btnExportData) btnExportData.addEventListener('click', async () => {
        exportAllData();
      });

      const fileImportData = document.getElementById('file-import-data');
      if (fileImportData) fileImportData.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const res = await importAllData(file);
        if(res) {
          Toast("Datos restaurados", "success");
          setTimeout(() => window.location.reload(), 1500);
        }
        // Si res es false, importAllData ya mostró el Toast de error o el usuario canceló.
        e.target.value = '';
      });

      const pinContainer = document.getElementById('pin-security-container');
      const refreshPinSection = () => { if (pinContainer) pinContainer.innerHTML = renderPinSecuritySection(); attachPinListeners(); };

      const attachPinListeners = () => {
        const btnEnablePin = document.getElementById('btn-enable-pin');
        if (btnEnablePin) btnEnablePin.addEventListener('click', () => {
          // Respaldo obligatorio antes de activar el PIN: es la única red de
          // seguridad si después se olvida (ver mountSetPinFlow / lock.js).
          exportAllData();
          mountSetPinFlow(refreshPinSection);
        });

        const btnChangePin = document.getElementById('btn-change-pin');
        if (btnChangePin) btnChangePin.addEventListener('click', () => {
          requestPinVerification({
            title: 'Cambiar PIN',
            onVerified: () => mountSetPinFlow(refreshPinSection)
          });
        });

        const btnDisablePin = document.getElementById('btn-disable-pin');
        if (btnDisablePin) btnDisablePin.addEventListener('click', () => {
          requestPinVerification({
            title: 'Desactivar PIN',
            onVerified: () => {
              db.disablePin();
              Toast('PIN desactivado', 'success');
              refreshPinSection();
            }
          });
        });
      };
      attachPinListeners();

      // --- HISTORY MODAL & TABS ---
      document.querySelectorAll('.history-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          const filterVal = e.currentTarget.getAttribute('data-filter');
          document.querySelectorAll('.history-tab').forEach(t => {
            t.style.background = 'var(--surface-2)';
            t.style.color = 'var(--text-secondary)';
          });
          e.currentTarget.style.background = 'var(--surface-1)';
          e.currentTarget.style.color = 'var(--text-primary)';
          renderHistoryList(filterVal);
        });
      });

      const dateFromInput = document.getElementById('history-date-from');
      const dateToInput = document.getElementById('history-date-to');
      if (dateFromInput) dateFromInput.addEventListener('change', () => renderHistoryList());
      if (dateToInput) dateToInput.addEventListener('change', () => renderHistoryList());
      const btnClearDates = document.getElementById('btn-clear-date-filter');
      if (btnClearDates) btnClearDates.addEventListener('click', () => {
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
        renderHistoryList();
      });

      // --- TOP CARDS & DONUT MAPPINGS ---
      const cardIngresos = document.getElementById('card-ingresos');
      const cardGastos = document.getElementById('card-gastos');
      
      if(cardIngresos) cardIngresos.addEventListener('click', () => { renderHistoryList('Ingreso'); document.querySelector('.fin-tab[data-tab="movimientos"]').click(); });
      if(cardGastos) cardGastos.addEventListener('click', () => { renderHistoryList('Gasto'); document.querySelector('.fin-tab[data-tab="movimientos"]').click(); });

      document.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const cat = e.currentTarget.getAttribute('data-cat');
          let filterType = 'All';
          if (cat === 'Necesidades' || cat === 'Deseos') filterType = 'Gasto';
          if (cat === 'Ahorro') filterType = 'Ahorro';
          renderHistoryList(filterType);
          document.querySelector('.fin-tab[data-tab="movimientos"]').click();
        });
      });

      renderResumenCharts(b);
    };
};


const renderAgeOfMoneyHTML = (b) => {
  return `
    <div class="card" id="card-ageofmoney" style="padding: 16px; margin-bottom: 24px; border-radius: 16px; background: linear-gradient(145deg, var(--surface-1), var(--surface-2)); display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--surface-border);">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(255, 182, 39, 0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-purple);">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        </div>
        <div>
          <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Edad del Dinero</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);"><span class="num">${b.ageOfMoney}</span> <span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">días</span></div>
        </div>
      </div>
      <div style="text-align: right; max-width: 120px;">
        <div style="font-size: 11px; font-weight: 500; color: var(--text-secondary); line-height: 1.3;">
          ${b.ageOfMoney >= 30 ? '<span style="color:var(--text-primary);">¡Vives con ingresos del mes pasado!</span>' : 'Aumenta esta métrica para salir del cheque a cheque.'}
        </div>
      </div>
    </div>
  `;
};


const renderRecurringHTML = (b) => {
  const addBtnHtml = `<button id="btn-add-recurring" class="tappable" style="margin-top: 12px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; cursor: pointer; font-weight: 600; width: 100%;">+ Nuevo pago</button>`;

  if (!b.recurring || b.recurring.length === 0) {
    return finEmptyState('Sin coincidencias', 'Sin pagos fijos todavía', 'Automatiza tus suscripciones y arriendos para que se descuenten solos.') + addBtnHtml;
  }

  const total = b.recurring.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const rows = b.recurring.map(req => {
    const env = b.envelopes.find(e => e.id === req.envelopeId);
    const envName = env ? escapeHtml(env.name) : 'Desconocido';
    return `
      <div class="fin-row recurring-row" data-id="${req.id}">
        <div style="width: 32px; height: 32px; flex-shrink: 0; background: var(--surface-2); display: flex; align-items: center; justify-content: center; color: var(--text-primary);">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        </div>
        <div class="fin-who">
          <div class="fin-name">${escapeHtml(req.label)}</div>
          <div class="fin-meta">Día ${req.dayOfMonth} &bull; ${envName}</div>
        </div>
        <div class="fin-amt">${formatCurrency(req.amount)}</div>
        <button class="delete-recurring" data-id="${req.id}" aria-label="Eliminar pago fijo ${escapeHtml(req.label)}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer; flex-shrink: 0;">${delSvg}</button>
      </div>
    `;
  }).join('');

  return `
    <div class="card fin-stat" style="margin-bottom: 14px;">
      <p class="fin-eyebrow">Total estimado por mes</p>
      <p class="fin-stat-value">${formatCurrency(total)}</p>
    </div>
    <div class="card fin-row-list" style="padding: 0; overflow: hidden;">${rows}</div>
    ${addBtnHtml}
  `;
};

// Sobres como "cuentas" (Parte 1/Cuentas del rediseño): antes vivían
// anidados dentro de cada categoría en Presupuesto (renderPresupuestoLegend);
// acá es una lista plana de account-cards, sin agrupar por Needs/Wants —
// esa categoría igual se ve como eyebrow tag arriba del nombre.
const CAT_LABELS = { Needs: 'Necesidades', Wants: 'Deseos' };
const renderEnvelopesHTML = async (b) => {
  const addBtnHtml = `<button class="btn-add-envelope tappable" style="margin-top: 12px; width: 100%; padding: 12px; background: transparent; border: 1px dashed var(--surface-border); color: var(--text-secondary); font-size: 12px; font-weight: 700; cursor: pointer;">+ Nuevo sobre</button>`;

  if (!b.envelopes || b.envelopes.length === 0) {
    return finEmptyState('Sin cuentas', 'Todavía no creaste ningún sobre', 'Un sobre es donde separas plata para una categoría de gasto — luz, comida, salidas.') + addBtnHtml;
  }

  // getHistoricalSummaryByEnvelope es async (lee IndexedDB): se
  // precalculan todos los sparklines ANTES de armar el HTML.
  const histByEnvId = new Map(await Promise.all(
    b.envelopes.map(async (env) => [env.id, await db.getHistoricalSummaryByEnvelope(env.id, 3)])
  ));

  const cards = b.envelopes.map(env => {
    const pct = env.assignedAmount > 0 ? Math.min(100, Math.round((env.spent / env.assignedAmount) * 100)) : (env.spent > 0 ? 100 : 0);
    const meterCls = pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : '';
    const catColor = getCatColor(env.category);

    const hist = histByEnvId.get(env.id) || [];
    const maxH = Math.max(...hist, 1);
    const sparklineHtml = hist.length ? `<div style="display:flex; align-items:flex-end; gap:2px; height:12px;" title="Últimos 3 meses">${
      hist.map(v => {
        const hPct = Math.max(10, Math.round((v / maxH) * 100));
        const sparkColor = v > env.assignedAmount ? 'var(--state-high)' : 'var(--accent-blue)';
        return `<div style="width:3px; height:${hPct}%; background:${sparkColor}; border-radius:1px; opacity:0.7;"></div>`;
      }).join('')
    }</div>` : '';

    return `
      <div class="card fin-account-card env-row tappable" data-id="${env.id}">
        <div class="flex-between">
          <p class="fin-eyebrow" style="color: ${catColor};">${CAT_LABELS[env.category] || env.category}</p>
          <div style="display: flex; gap: 10px;">
            <button class="transfer-env" data-id="${env.id}" aria-label="Transferir desde ${escapeHtml(env.name)}" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer;" title="Transferir">${transferSvg}</button>
            <button class="edit-env" data-id="${env.id}" aria-label="Editar sobre ${escapeHtml(env.name)}" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer;" title="Editar">${editSvg}</button>
            <button class="delete-env" data-id="${env.id}" aria-label="Eliminar sobre ${escapeHtml(env.name)}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer;" title="Eliminar">${delSvg}</button>
          </div>
        </div>
        <div class="flex-between" style="margin-top: 2px; align-items: flex-end;">
          <div style="font-weight: 600; font-size: 14px;">${escapeHtml(env.name)}</div>
          ${sparklineHtml}
        </div>
        <div class="fin-bal" style="color: ${env.balance >= 0 ? 'var(--text-primary)' : 'var(--state-high)'};">${formatCurrency(env.balance)}</div>
        <div class="fin-meter"><i class="${meterCls}" style="width:${pct}%"></i></div>
        <div class="fin-bc-figures">${formatCurrency(env.spent)} de ${formatCurrency(env.assignedAmount)}</div>
      </div>
    `;
  }).join('');

  return `<div class="fin-grid2">${cards}</div>${addBtnHtml}`;
};

const renderGoalsHTML = (b) => {
  let html = `
    <div class="flex-between" style="margin-bottom: 12px;">
      <p class="fin-eyebrow">Metas de ahorro</p>
      ${b.savedThisMonth > 0 ? `<span class="fin-eyebrow">Ahorrado este mes: <span class="num">${formatCurrency(b.savedThisMonth)}</span></span>` : ''}
    </div>
  `;
  if (b.goals.length === 0) {
    html += `
       ${finEmptyState('Sin metas', 'Sin metas de ahorro todavía', 'Crea una para apartar dinero mes a mes hacia algo puntual.')}
       <button id="btn-add-goal" style="margin-top: 8px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>
    `;
  } else {
    html += `<div style="display: flex; flex-direction: column; gap: 12px;">`;
    html += b.goals.map(g => renderGoalCard(g)).join('');
    html += `<button id="btn-add-goal" style="margin-top: 8px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>`;
    html += `</div>`;
  }
  return html;
};

// Empty state propio de Finanzas (eyebrow + título + descripción), en vez
// del EmptyState() genérico de utils/states.js — ese es compartido por
// toda la app y el rediseño pidió tocar solo la vista de Finanzas.
const finEmptyState = (eyebrow, title, desc) => `
  <div class="fin-empty">
    <p class="fin-eyebrow">${eyebrow}</p>
    <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary);">${title}</h3>
    <p class="fin-desc">${desc}</p>
  </div>
`;

// Badge de alerta reutilizado en Presupuesto y como indicador en Resumen:
// ámbar si la categoría superó el 80% de lo asignado, rojo si superó el 100%.
const alertBadgeHtml = (usoCatPct, compact = false) => {
  if (usoCatPct < 80) return '';
  const isOver = usoCatPct >= 100;
  const bg = isOver ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  const color = isOver ? 'var(--state-high)' : 'var(--state-medium)';
  const label = compact ? '' : (isOver ? 'Excedido' : '80%+');
  return `<span style="display:inline-flex; align-items:center; gap:4px; background:${bg}; color:${color}; font-size:10px; font-weight:700; padding:${compact ? '0' : '2px 8px'}; border-radius:999px; ${compact ? `width:8px; height:8px;` : ''}">${compact ? '' : label}</span>`;
};

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

const getCatColor = (cat) => {
  if(cat === 'Needs') return 'var(--am2)';
  if(cat === 'Wants') return 'var(--accent-blue)';
  if(cat === 'Savings') return 'var(--accent-purple)';
  if(cat === 'Income') return 'var(--state-success)';
  return 'var(--text-secondary)';
};

// envelopes se pasa explícito (en vez de leer el `b` del módulo) para que
// esto sea llamable desde afuera de finanzas.js (ver Análisis > Finanzas >
// Movimientos) sin depender de que finanzas.js esté montado.
export const txHtml = (tx, envelopes) => {
  let catColor = getCatColor(tx.category);
  let iconSvg = getSVG(tx.category, catColor);
  let fallbackLabel = tx.type === 'Ingreso' ? 'Ingreso' : (tx.category === 'Savings' ? 'Ahorro' : (tx.category === 'Needs' ? 'Necesidades' : 'Deseos'));
  let displayLabel = tx.label || fallbackLabel;
  let subText = `${formatFechaCorta(new Date(tx.date))} &bull; ${tx.category === 'Needs' ? 'Necesidades' : tx.category === 'Wants' ? 'Deseos' : tx.category === 'Savings' ? 'Ahorro' : 'Ingreso'}`;

  let amountPrefix = tx.type === 'Ingreso' ? '+' : '-';
  let amountColor = tx.type === 'Ingreso' ? 'var(--state-success)' : 'var(--text-primary)';

  if (tx.envelopeId && envelopes) {
    const env = envelopes.find(e => e.id === tx.envelopeId);
    if (env) {
      if (tx.type === 'Gasto') {
        iconSvg = getSVG(env.icon, catColor);
        subText = `${formatFechaCorta(new Date(tx.date))} &bull; ${escapeHtml(env.name)}`;
      } else if (tx.type === 'Assignment') {
        catColor = 'var(--accent-blue)';
        iconSvg = transferSvg;
        amountColor = tx.isSubtraction ? 'var(--text-primary)' : 'var(--state-success)';
        amountPrefix = tx.isSubtraction ? '-' : '+';
        subText = `${formatFechaCorta(new Date(tx.date))} &bull; ${tx.isSubtraction ? 'Retirado de' : 'Asignado a'} ${escapeHtml(env.name)}`;
      }
    }
  } else if (tx.type === 'Transfer' && envelopes) {
    catColor = 'var(--accent-blue)';
    iconSvg = transferSvg;
    const fromEnv = escapeHtml(envelopes.find(e => e.id === tx.fromEnvelopeId)?.name || 'Desconocido');
    const toEnv = escapeHtml(envelopes.find(e => e.id === tx.toEnvelopeId)?.name || 'Desconocido');
    subText = `${formatFechaCorta(new Date(tx.date))} &bull; ${fromEnv} &rarr; ${toEnv}`;
    amountPrefix = '';
    amountColor = 'var(--text-secondary)';
  }

  return `
    <div class="fin-row tappable edit-tx" data-id="${tx.id}" style="cursor: pointer;">
      <div style="width: 32px; height: 32px; flex-shrink: 0; background: ${catColor}20; display: flex; align-items: center; justify-content: center; color: ${catColor};">
        ${iconSvg}
      </div>
      <div class="fin-who">
        <div class="fin-name" style="text-transform: capitalize;">${escapeHtml(displayLabel)}</div>
        <div class="fin-meta">${subText}</div>
      </div>
      <div class="fin-amt" style="color: ${amountColor};">${amountPrefix}${formatCurrency(tx.amount)}</div>
      <button class="delete-tx tappable" data-id="${tx.id}" aria-label="Eliminar movimiento ${escapeHtml(displayLabel)}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer; padding: 4px; flex-shrink: 0;">
         ${delSvg}
      </button>
    </div>
  `;
};


// Leyenda compacta para el donut de la pestaña Resumen: muestra a qué
// categoría corresponde cada color y cuánto se gastó en cada una este mes.
const renderResumenLegend = (b) => {
  const totalNeeds = b.allocations.find(a => a.category === 'Needs')?.amount || 0;
  const totalWants = b.allocations.find(a => a.category === 'Wants')?.amount || 0;
  const totalSavings = b.allocations.find(a => a.category === 'Savings')?.amount || 0;
  const rule = b.rule || { needs: 0.5, wants: 0.3, savings: 0.2 };
  const items = [
    { label: 'Necesidades', amount: totalNeeds, color: 'var(--am2)', share: rule.needs },
    { label: 'Deseos', amount: totalWants, color: 'var(--accent-blue)', share: rule.wants },
    { label: 'Ahorro', amount: totalSavings, color: 'var(--accent-purple)', share: rule.savings }
  ];
  return items.map(item => {
    const disponibleCat = b.budgeted * item.share;
    const usoCatPct = disponibleCat > 0 ? Math.round((item.amount / disponibleCat) * 100) : (item.amount > 0 ? 100 : 0);
    return `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--text-secondary);">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${item.color}; flex-shrink: 0;"></span>${item.label}
        ${alertBadgeHtml(usoCatPct, true)}
      </div>
      <div class="${item.amount > 0 ? 'num' : ''}" style="font-size: 12px; font-weight: 700; color: ${item.amount > 0 ? 'var(--text-primary)' : 'var(--text-disabled)'};">${item.amount > 0 ? formatCurrency(item.amount) : 'Sin movimientos'}</div>
    </div>
  `;
  }).join('');
};

// Mapa de calor: días del mes con al menos un movimiento (ingreso, gasto o
// ahorro). b.breakdown ya viene filtrado a currentMonth por getBudget().
// Se llama tanto desde render() como desde el refresco en vivo de
// 'budget-updated', para que un movimiento nuevo se refleje sin recargar.
const buildFinanzasHeatmapHtml = () => {
  const [heatYear, heatMonthNum] = currentMonth.split('-').map(Number);
  const heatMonth = heatMonthNum - 1;
  const nombreMesActual = formatMes(new Date(heatYear, heatMonth, 1));
  const TX_TYPE_LABELS = { Gasto: 'Gasto', Ingreso: 'Ingreso', Ahorro: 'Ahorro', Transfer: 'Transferencia' };
  const countByDay = {};
  const detailByDay = {};
  b.breakdown.forEach(tx => {
    if (!tx.date) return;
    // 'date' es 'YYYY-MM-DD' sin hora — se parsean los componentes a mano
    // para no interpretarlo como medianoche UTC (mismo problema que
    // documenta toDayKey en db.js > getRachaGlobal).
    const day = Number(tx.date.split('-')[2]);
    if (!day) return;
    countByDay[day] = (countByDay[day] || 0) + 1;
    if (!detailByDay[day]) detailByDay[day] = [];
    const label = TX_TYPE_LABELS[tx.type] || tx.type;
    detailByDay[day].push(`${label}: ${tx.label || 'Sin descripción'} (${formatCurrency(tx.amount)})`);
  });
  return renderActivityHeatmap({
    id: 'finanzas-heatmap',
    monthLabel: nombreMesActual,
    year: heatYear,
    month: heatMonth,
    countByDay,
    detailByDay,
    accentVar: 'var(--accent-purple)',
    emptyLabel: 'Sin movimientos'
  });
};

const renderPinSecuritySection = () => {
  if (db.isPinEnabled()) {
    return `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 13px; color: var(--state-success); font-weight: 600;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--state-success); flex-shrink: 0;"></span>
        PIN activado
      </div>
      <div style="display: flex; gap: 12px;">
        <button id="btn-change-pin" type="button" class="tappable" style="flex: 1; padding: 12px; border-radius: 12px; background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border); font-weight: 600; cursor: pointer;">Cambiar PIN</button>
        <button id="btn-disable-pin" type="button" class="tappable" style="flex: 1; padding: 12px; border-radius: 12px; background: transparent; color: var(--state-high); border: 1px solid var(--state-high); font-weight: 600; cursor: pointer;">Desactivar</button>
      </div>
    `;
  }
  return `<button id="btn-enable-pin" type="button" class="btn-primary tappable" style="background: var(--accent-primary); color: #000;">Activar PIN</button>`;
};

// "Puedes gastar $X hoy" = (disponible restante) / días que quedan del mes (incluye hoy).
const renderDailyAvailable = (b) => {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const diasRestantes = Math.max(1, daysInMonth - now.getDate() + 1);
  const saldoDiario = Math.max(0, b.remaining) / diasRestantes;
  return `
    <div class="card" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px; display: flex; align-items: center; gap: 14px;">
      <div class="icon-chip" style="width: 40px; height: 40px; background: rgba(34, 197, 94, 0.15); color: var(--state-success); flex-shrink: 0;">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      </div>
      <div>
        <div style="font-size: 11px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Disponible por día</div>
        <div style="font-size: 17px; font-weight: 800; color: var(--text-primary);">Puedes gastar <span class="num">${formatCurrency(saldoDiario)}</span> hoy</div>
        <div style="font-size: 11px; color: var(--text-disabled); margin-top: 2px;">${formatCurrency(Math.max(0, b.remaining))} restantes &bull; ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} del mes</div>
      </div>
    </div>
  `;
};

// Comparativo simple contra el mes anterior, reutiliza b.trend (ya calculado en db.getBudget).
// b.trend es null cuando el mes anterior no tuvo gastos registrados (db.js
// solo calcula el % si prevExpenses > 0) — un porcentaje contra una base 0
// no dice nada real, así que se muestra un texto neutro en vez de omitirlo.
const renderMonthTrend = (b) => {
  if (!b.trend) return `<div style="font-size: 12px; font-weight: 600; color: var(--text-disabled); margin-top: 10px;">Sin datos del mes anterior</div>`;
  const { pct, isUp } = b.trend;
  const color = isUp ? 'var(--state-high)' : 'var(--state-low)';
  const texto = isUp ? `Gastaste ${pct}% más que el mes pasado` : `Vas ${pct}% mejor que el mes pasado`;
  const arrow = isUp
    ? `<svg width="12" height="12" fill="none" stroke="${color}" stroke-width="3" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`
    : `<svg width="12" height="12" fill="none" stroke="${color}" stroke-width="3" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
  return `<div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: ${color}; margin-top: 10px;">${arrow}${texto}</div>`;
};

// Saldo disponible acumulado día a día (1 hasta hoy) del mes actual, a
// partir de los movimientos ya cargados en b.breakdown.
const computeDailyBalanceSeries = (b) => {
  const now = new Date();
  const today = now.getDate();
  const deltaPorDia = new Array(today + 1).fill(0);

  (b.breakdown || []).forEach(t => {
    if (!t.date) return;
    const day = parseInt(t.date.slice(8, 10), 10);
    if (!day || day < 1 || day > today) return;
    const amt = Number(t.amount) || 0;
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

// Dibuja/actualiza los 3 gráficos Chart.js de la pestaña Resumen. Se llama
// tanto en mountListeners() (primer render) como en refresh() (cada vez
// que cambian los datos), destruyendo la instancia anterior si existe.
const renderResumenCharts = async (b) => {
  const Chart = await ensureChartJs();
  const palette = appPalette();
  const opts = baseChartOptions();

  const donutCanvas = document.getElementById('donut-chart-resumen');
  if (donutCanvas) {
    const totalNeeds = b.allocations.find(a => a.category === 'Needs')?.amount || 0;
    const totalWants = b.allocations.find(a => a.category === 'Wants')?.amount || 0;
    const totalSavings = b.allocations.find(a => a.category === 'Savings')?.amount || 0;
    if (donutChartInstance) donutChartInstance.destroy();
    donutChartInstance = new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Necesidades', 'Deseos', 'Ahorro'],
        datasets: [{
          data: [totalNeeds, totalWants, totalSavings],
          backgroundColor: [palette.high, palette.blue, palette.purple],
          borderColor: 'transparent',
          borderWidth: 2
        }]
      },
      options: { ...opts, cutout: '74%' }
    });
  }

  const lineCanvas = document.getElementById('line-chart-saldo-diario');
  if (lineCanvas) {
    const { labels, data } = computeDailyBalanceSeries(b);
    if (dailyBalanceChartInstance) dailyBalanceChartInstance.destroy();
    dailyBalanceChartInstance = new Chart(lineCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: palette.purple,
          backgroundColor: palette.purple + '26',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2
        }]
      },
      options: {
        ...opts,
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }

  const barCanvas = document.getElementById('bar-chart-mes-comparativo');
  if (barCanvas) {
    const hist = await db.getHistoricalSummary(2);
    const prevMes = hist.data[0]?.expenses || 0;
    const esteMes = hist.data[1]?.expenses || 0;
    if (monthCompareChartInstance) monthCompareChartInstance.destroy();
    monthCompareChartInstance = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: ['Mes anterior', 'Este mes'],
        datasets: [{
          data: [prevMes, esteMes],
          backgroundColor: [palette.surfaceBorder, esteMes > prevMes ? palette.high : palette.low],
          borderRadius: 8,
          maxBarThickness: 60
        }]
      },
      options: {
        ...opts,
        indexAxis: 'y',
        scales: {
          x: { display: false },
          y: { display: true, grid: { display: false }, ticks: { color: palette.textSecondary, font: { size: 12, weight: '600', family: chartFontFamily() } } }
        }
      }
    });
  }
};

// Los 3 "budget cards" macro de la regla 50/30/20 (Necesidades/Deseos/
// Ahorros). Antes esta función también anidaba la lista de sobres de cada
// categoría — eso ahora vive en renderEnvelopesHTML (tab Cuentas), para no
// mostrar la misma plata dos veces enmarcada de formas distintas.
const renderPresupuestoLegend = (b) => {
  const totalNeeds = b.allocations.find(a => a.category === 'Needs')?.amount || 0;
  const totalWants = b.allocations.find(a => a.category === 'Wants')?.amount || 0;
  const totalSavings = b.allocations.find(a => a.category === 'Savings')?.amount || 0;
  const rule = b.rule || { needs: 0.5, wants: 0.3, savings: 0.2 };
  const ruleDisplay = { needs: Math.round(rule.needs * 100), wants: Math.round(rule.wants * 100), savings: Math.round(rule.savings * 100) };

  return ['Necesidades', 'Deseos', 'Ahorro'].map(catKey => {
    const isNeeds = catKey === 'Necesidades';
    const isWants = catKey === 'Deseos';
    const totalAmt = isNeeds ? totalNeeds : (isWants ? totalWants : totalSavings);
    const rulePct = isNeeds ? ruleDisplay.needs : (isWants ? ruleDisplay.wants : ruleDisplay.savings);

    // Barra de progreso "gastado vs disponible" de la categoría, coloreada
    // por nivel de uso respecto de lo que le corresponde según la regla 50/30/20.
    const disponibleCat = b.budgeted * (isNeeds ? rule.needs : (isWants ? rule.wants : rule.savings));
    const usoCatPct = disponibleCat > 0 ? Math.round((totalAmt / disponibleCat) * 100) : (totalAmt > 0 ? 100 : 0);
    const usoCatPctClamped = Math.min(100, usoCatPct);
    const meterCls = usoCatPct >= 100 ? 'danger' : usoCatPct >= 80 ? 'warn' : '';
    const note = usoCatPct >= 100
      ? `<p style="margin-top:8px; font-size:11px; color:var(--state-high);">Superaste el presupuesto de este mes.</p>`
      : (usoCatPct >= 80 ? `<p style="margin-top:8px; font-size:11px; color:var(--state-medium);">Estás cerca del límite.</p>` : '');

    return `
      <div class="card legend-item tappable" data-cat="${catKey}">
        <div class="fin-bc-head">
          <h3 style="font-size: 13.5px; margin: 0;">${catKey}</h3>
          <span class="fin-eyebrow"><span class="num">${rulePct}%</span> de la regla</span>
        </div>
        <p class="fin-bc-figures">${formatCurrency(totalAmt)} de ${formatCurrency(disponibleCat)}</p>
        <div class="fin-meter"><i class="${meterCls}" style="width:${usoCatPctClamped}%"></i></div>
        ${note}
      </div>
    `;
  }).join('');
};

export async function render() {
  await init();

  const formatMonth = (str) => {
    const monthLabel = formatMes(new Date(str + '-01T00:00:00'));
    const year = new Date(str + '-01T00:00:00').getFullYear();
    return `${monthLabel} de ${year}`;
  };
  
  const balanceSafe = b.remaining;
  
  const totalNeeds = b.allocations.find(a => a.category === 'Needs')?.amount || 0;
  const totalWants = b.allocations.find(a => a.category === 'Wants')?.amount || 0;
  const totalSavings = b.allocations.find(a => a.category === 'Savings')?.amount || 0;

  const rule = b.rule || { needs: 0.5, wants: 0.3, savings: 0.2 };
  const ruleDisplay = { needs: Math.round(rule.needs * 100), wants: Math.round(rule.wants * 100), savings: Math.round(rule.savings * 100) };
  
  const getPct = (val) => b.budgeted > 0 ? Math.round((val / b.budgeted) * 100) : 0;
  const isHealthy = balanceSafe >= 0;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const dailyAverage = currentDay > 0 ? (b.expenses / currentDay) : 0;
  const projectedExpense = b.expenses + (dailyAverage * (daysInMonth - currentDay));
  const projectedPct = b.budgeted > 0 ? (projectedExpense / b.budgeted) * 100 : 0;
  
  const segments = [
    { percent: getPct(totalNeeds), color: 'var(--am2)' },
    { percent: getPct(totalWants), color: 'var(--accent-blue)' },
    { percent: getPct(totalSavings), color: 'var(--accent-purple)' }
  ];
  const donutSvg = renderDonut(segments, b.budgeted, b.budgeted === 0);
  const presupuestoLegendHtml = renderPresupuestoLegend(b);
  const envelopesHtml = await renderEnvelopesHTML(b);

  // getHistoricalSummary ahora es async (lee IndexedDB): se precalcula acá
  // el bloque de "Tendencia de gastos" en vez de armarlo en una IIFE
  // síncrona dentro del template literal de más abajo.
  const trendHistory6 = await db.getHistoricalSummary(6);
  const trendHtml = (() => {
    if (!trendHistory6.hasEnoughData) return '';
    const maxVal = Math.max(...trendHistory6.data.map(d => d.expenses + d.saved));
    return `
    <div class="card" style="padding: 20px; margin-bottom: 24px;">
      <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0;">Tendencia de gastos</h3>
      <div style="display: flex; gap: 8px; align-items: flex-end; height: 100px; padding-top: 10px;">
        ${trendHistory6.data.map(d => {
          const h = Math.max(4, Math.round(((d.expenses + d.saved) / maxVal) * 100));
          const isCurrent = d.month === b.currentMonth;
          return `<div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
            <div style="width: 100%; height: 100px; background: var(--surface-2); border-radius: 6px; position: relative; overflow: hidden;">
              <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: ${h}%; background: ${isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)'}; border-radius: 6px; transition: height 0.5s ease;"></div>
            </div>
            <div style="font-size: 10px; color: var(--text-secondary); font-weight: 600;">${d.month.split('-')[1]}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="flex-between" style="font-size: 11px; color: var(--text-disabled); margin-top: 12px;">
        <span>Actual: ${formatCompactCurrency(b.expenses)}</span>
        <span>Presupuesto: ${formatCompactCurrency(b.budgeted)}</span>
      </div>
    </div>`;
  })();

  // Estado de respaldo/persistencia para el bloque "Respaldos" de Ajustes.
  // Se precalcula acá (async) porque el template de más abajo es un string
  // síncrono — mismo patrón que presupuestoLegendHtml/trendHtml arriba.
  const diasDesdeBackup = await getDiasDesdeUltimoBackup();
  const estadoAlmacenamiento = await db.getEstadoAlmacenamiento();
  const backupStatusHtml = (() => {
    let backupMsg, backupColor;
    if (diasDesdeBackup === null) {
      backupMsg = 'Nunca has exportado un respaldo';
      backupColor = 'var(--state-medium)';
    } else if (diasDesdeBackup > 14) {
      backupMsg = `Último respaldo hace ${diasDesdeBackup} días`;
      backupColor = 'var(--state-medium)';
    } else if (diasDesdeBackup === 0) {
      backupMsg = 'Último respaldo: hoy';
      backupColor = 'var(--text-secondary)';
    } else {
      backupMsg = `Último respaldo hace ${diasDesdeBackup} día${diasDesdeBackup === 1 ? '' : 's'}`;
      backupColor = 'var(--text-secondary)';
    }

    const persistida = estadoAlmacenamiento.persistencia ? estadoAlmacenamiento.persistencia.concedido : undefined;
    let persistMsg;
    if (persistida === true) {
      persistMsg = 'Almacenamiento persistente: concedido. El navegador no debería borrar tus datos por falta de espacio o inactividad.';
    } else if (persistida === false) {
      persistMsg = 'Almacenamiento persistente: no concedido. En iOS, si no abres la app por ~7 días, el sistema puede borrar tus datos — exporta respaldos seguido.';
    } else {
      persistMsg = 'Este navegador no soporta almacenamiento persistente. Exporta respaldos seguido para no perder tu progreso.';
    }

    return `
      <p style="color: ${backupColor}; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">${backupMsg}</p>
      <p style="color: var(--text-secondary); font-size: 12px; margin: 0 0 16px 0;">${persistMsg}</p>
    `;
  })();

  const [heatYear, heatMonthNum] = currentMonth.split('-').map(Number);
  const nombreMesActual = formatMes(new Date(heatYear, heatMonthNum - 1, 1));
  const heatmapHtml = buildFinanzasHeatmapHtml();

  let projColor = 'var(--state-success)';
  if (projectedPct > 90) projColor = 'var(--accent-blue)';
  if (projectedPct > 110) projColor = 'var(--state-high)';

  const modalCSS = `
    @keyframes scaleIn {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); z-index: 3000; display: none; align-items: flex-end; justify-content: center; opacity: 0; transition: opacity 0.3s ease; padding: 0; }
    .modal-overlay.open { opacity: 1; }
    .modal-content {
      background: var(--surface-1);
      background-image: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 30%);
      width: 100%; max-width: 500px;
      border-radius: 28px 28px 0 0;
      border: 1px solid var(--glass-border); border-bottom: none;
      padding: 14px 24px calc(28px + env(safe-area-inset-bottom)) 24px;
      transform: translateY(100%); opacity: 0;
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
      max-height: 88vh; overflow-y: auto; box-sizing: border-box;
      box-shadow: 0 -20px 60px -20px rgba(0,0,0,0.6);
    }
    .modal-content::before {
      content: ''; display: block; width: 36px; height: 4px; border-radius: 2px;
      background: var(--surface-border); margin: 0 auto 18px auto;
    }
    .modal-overlay.open .modal-content { transform: translateY(0); opacity: 1; }
    @media (min-width: 640px) {
      .modal-overlay { align-items: center; padding: 20px; }
      .modal-content { border-radius: 24px; border-bottom: 1px solid var(--glass-border); transform: scale(0.95) translateY(20px); padding: 30px 24px; }
      .modal-content::before { display: none; }
      .modal-overlay.open .modal-content { transform: scale(1) translateY(0); }
    }
    .input-group { margin-bottom: 20px; }
    .input-group label { display: block; color: var(--text-secondary); font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .input-group input, .input-group select {
      width: 100%; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary);
      padding: 14px 16px; border-radius: 14px; font-size: 16px; box-sizing: border-box; outline: none;
      font-family: inherit; transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .input-group input:focus, .input-group select:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18);
    }
    .tab-btn { flex: 1; padding: 12px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 14px; }
    .cat-item { cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s; }
    .cat-item.active { background: rgba(255,255,255,0.1); }
    .tx-row { cursor: pointer; }
    .tx-row:hover { background: var(--surface-2) !important; }
    .top-card { cursor: pointer; }
    .numpad-btn { background: transparent; border: none; font-size: 24px; font-weight: 500; padding: 16px; border-radius: 12px; cursor: pointer; color: var(--text-primary); transition: background 0.1s; }
    .numpad-btn:active { background: var(--surface-2); }
    .chip { padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
    .chip.active { border-color: rgba(255,255,255,0.2); }
  `;

  const fullStr = formatDisponible(balanceSafe);

  return `
    <style>${modalCSS}</style>
    <div style="max-width: 480px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 0 20px; font-family: 'Inter', sans-serif; padding-bottom: 120px;">

      <!-- Header -->
      <div style="position: sticky; top: 0; z-index: 100; padding: 20px 4px 16px 4px; background: var(--bg-base); margin: 0 -4px 12px -4px;">
        <div class="flex-between">
          <h1 style="font-size: 30px; font-weight: 800; margin: 0; letter-spacing: -0.5px; color: var(--text-primary);">Finanzas</h1>
          <div style="background: var(--surface-2); border: 1px solid var(--surface-border); padding: 8px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span style="text-transform: capitalize;">${formatMonth(currentMonth)}</span>
          </div>
        </div>
      </div>

      <!-- TABS BAR -->
      <div class="segmented-control" style="margin-bottom: 20px; overflow-x: auto; flex-wrap: nowrap;">
        ${['resumen', 'movimientos', 'presupuesto', 'recurrentes', 'cuentas'].map(t => {
          const labels = { resumen: 'Resumen', movimientos: 'Movimientos', presupuesto: 'Presupuesto', recurrentes: 'Recurrentes', cuentas: 'Cuentas' };
          const isActive = activeFinTab === t;
          return `<button class="fin-tab ${isActive ? 'active' : ''}" data-tab="${t}" style="flex: 0 0 auto; padding: 10px 14px; background: ${isActive ? 'var(--surface-1)' : 'transparent'}; color: ${isActive ? 'var(--text-primary)' : 'var(--text-secondary)'};">${labels[t]}</button>`;
        }).join('')}
      </div>

      <!-- TAB 1: RESUMEN -->
      <div id="tab-content-resumen" class="fin-tab-content" style="display: ${activeFinTab === 'resumen' ? 'block' : 'none'};">
        <p class="fin-eyebrow" style="margin-bottom: 4px;">Resumen del mes</p>
        <div class="fin-grid3" style="margin-bottom: 24px;">
          <div class="card fin-stat card-hero" id="card-disponible" style="min-width: 0;">
            <p class="fin-eyebrow">Balance</p>
            <div id="disponible-mes-value" class="fin-stat-value" style="color: ${isHealthy ? 'var(--state-success)' : 'var(--state-high)'}; overflow-wrap: anywhere;">${fullStr}</div>
            <div id="month-trend-container">${renderMonthTrend(b)}</div>
          </div>
          <div class="card fin-stat tappable" id="card-gastos" style="min-width: 0;">
            <p class="fin-eyebrow">Gastos del mes</p>
            <div id="stat-expense" class="fin-stat-value" style="color: var(--state-high); overflow-wrap: anywhere;">${formatDisponible(b.expenses)}</div>
          </div>
          <div class="card fin-stat tappable" id="card-ingresos" style="min-width: 0;">
            <p class="fin-eyebrow">Ingresos del mes</p>
            <div id="stat-income" class="fin-stat-value" style="color: var(--state-success); overflow-wrap: anywhere;">${formatDisponible(b.income)}</div>
          </div>
        </div>

        <!-- BOTONES FAB MOVIDOS AQUÍ -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
          <button id="btn-fab-ingreso" class="tappable" style="flex: 1; padding: 14px 8px; border-radius: 16px; background: var(--surface-1); border: 1px solid var(--surface-border); display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-primary);">
            <div class="icon-chip" style="width: 36px; height: 36px; background: rgba(34, 197, 94, 0.15); color: var(--state-success);"><svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7-7 7 7"></path></svg></div>
            <span style="font-size: 11px; font-weight: 700;">Ingreso</span>
          </button>
          <button id="btn-fab-gasto" class="tappable" style="flex: 1; padding: 14px 8px; border-radius: 16px; background: var(--surface-1); border: 1px solid var(--surface-border); display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-primary);">
            <div class="icon-chip" style="width: 36px; height: 36px; background: rgba(239, 68, 68, 0.15); color: var(--state-high);"><svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7 7 7-7"></path></svg></div>
            <span style="font-size: 11px; font-weight: 700;">Gasto</span>
          </button>
          <button id="btn-fab-ahorro" class="tappable" style="flex: 1; padding: 14px 8px; border-radius: 16px; background: var(--surface-1); border: 1px solid var(--surface-border); display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-primary);">
            <div class="icon-chip" style="width: 36px; height: 36px; background: rgba(255, 182, 39, 0.15); color: var(--accent-purple);"><svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path></svg></div>
            <span style="font-size: 11px; font-weight: 700;">Ahorro</span>
          </button>
        </div>

        <!-- Gasto rápido: texto libre tipo "50 en supermercado" -->
        <div style="margin-bottom: 24px;">
          <div style="position: relative;">
            <svg style="position: absolute; left: 16px; top: 15px; color: var(--text-secondary); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7 7 7-7"></path></svg>
            <input type="text" id="quick-gasto-input" placeholder="Agregar gasto rápido, ej. 50 en supermercado" style="width: 100%; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 16px; padding: 14px 16px 14px 44px; color: var(--text-primary); font-size: 16px; outline: none; box-sizing: border-box; transition: border-color 0.2s ease, box-shadow 0.2s ease;" onfocus="this.style.borderColor='var(--state-high)'; this.style.boxShadow='0 0 0 4px rgba(239,68,68,0.15)';" onblur="this.style.borderColor='var(--surface-border)'; this.style.boxShadow='none';">
          </div>
          <div id="quick-gasto-hint" style="font-size: 11px; color: var(--text-disabled); margin-top: 6px; padding-left: 4px; min-height: 14px;"></div>
        </div>

        <div id="daily-available-container">${renderDailyAvailable(b)}</div>

        <!-- Donut real (Chart.js) -->
        <div class="card card--glass" style="padding: 28px; margin-bottom: 24px; text-align: center; border-radius: 24px;">
          <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 20px 0; text-align: left;">Distribución del gasto</h3>
          <div style="position: relative; width: 150px; height: 150px; margin: 0 auto;">
            <canvas id="donut-chart-resumen" width="150" height="150"></canvas>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
              <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-bottom: 2px;">Presupuesto</div>
              <div style="font-size: 17px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.3px;">${formatCompactCurrency(b.budgeted)}</div>
            </div>
          </div>
          <div id="resumen-cat-legend" style="display: flex; flex-direction: column; gap: 10px; margin-top: 24px; text-align: left;">
            ${renderResumenLegend(b)}
          </div>
        </div>

        <!-- Mapa de actividad -->
        <div class="card" style="padding: 18px 20px; margin-bottom: 24px; border-radius: 18px;">
          <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 14px 0;">Actividad de ${nombreMesActual}</h3>
          ${heatmapHtml}
        </div>

        <!-- Evolución del saldo disponible día a día -->
        <div class="card" style="padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0;">Evolución del saldo disponible</h3>
          <div style="height: 120px;"><canvas id="line-chart-saldo-diario"></canvas></div>
        </div>

        <!-- Comparativo de gasto: este mes vs. mes anterior -->
        <div class="card" style="padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0;">Gasto vs. mes anterior</h3>
          <div style="height: 110px;"><canvas id="bar-chart-mes-comparativo"></canvas></div>
        </div>

        ${trendHtml}

        <div class="card" style="padding: 0; margin-bottom: 24px; overflow: hidden;">
          <div class="flex-between" style="padding: 14px 20px; border-bottom: 1px solid var(--line);">
            <h3 style="font-size: 13px; margin: 0;">Movimientos recientes</h3>
            <span class="btn-go-movimientos fin-eyebrow" id="btn-ver-todos" style="cursor: pointer;">Ver todos</span>
          </div>
          <div id="recent-tx-list" class="fin-row-list">
            ${b.breakdown.length === 0 ? finEmptyState('Sin datos', 'Todavía no hay movimientos', 'Toca el botón Ingreso o Gasto para registrar el primero.') : b.breakdown.slice(0, 5).map(tx => txHtml(tx, b.envelopes)).join('')}
          </div>
        </div>
      </div>

      <!-- TAB 2: MOVIMIENTOS -->
      <div id="tab-content-movimientos" class="fin-tab-content" style="display: ${activeFinTab === 'movimientos' ? 'block' : 'none'};">
        <p class="fin-eyebrow" style="margin-bottom: 12px;">Todos los registros</p>
        <div class="segmented-control" style="margin-bottom: 16px;">
          <button class="history-tab" data-filter="All" style="background: var(--surface-1); color: var(--text-primary);">Todos</button>
          <button class="history-tab" data-filter="Ingreso" style="background: transparent; color: var(--text-secondary);">Ingresos</button>
          <button class="history-tab" data-filter="Gasto" style="background: transparent; color: var(--text-secondary);">Gastos</button>
          <button class="history-tab" data-filter="Ahorro" style="background: transparent; color: var(--text-secondary);">Ahorro</button>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px;">
          <input type="date" id="history-date-from" style="flex: 1; min-width: 0; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 10px 12px; border-radius: 12px; font-size: 16px; box-sizing: border-box; outline: none; font-family: inherit;">
          <span style="color: var(--text-disabled); font-size: 12px;">a</span>
          <input type="date" id="history-date-to" style="flex: 1; min-width: 0; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 10px 12px; border-radius: 12px; font-size: 16px; box-sizing: border-box; outline: none; font-family: inherit;">
          <button id="btn-clear-date-filter" style="background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary); padding: 10px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; flex-shrink: 0;">Limpiar</button>
        </div>
        <div class="card" style="padding: 0; margin-bottom: 24px; overflow: hidden;">
          <div id="history-list-content" class="fin-row-list">
            <!-- Inyectado por renderHistoryList -->
          </div>
        </div>
        ${renderAgeOfMoneyHTML(b)}
      </div>

      <!-- TAB 3: PRESUPUESTO -->
      <div id="tab-content-presupuesto" class="fin-tab-content" style="display: ${activeFinTab === 'presupuesto' ? 'block' : 'none'};">
        <div class="flex-between" style="margin-bottom: 12px;">
          <p class="fin-eyebrow">Límites mensuales</p>
          <button id="btn-open-settings" style="background: transparent; border: none; color: var(--text-secondary); font-size: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.08em;">Editar regla</button>
        </div>
        <div class="card" style="padding: 24px; margin-bottom: 24px; text-align: center;">
          <div style="position: relative; width: 180px; height: 180px; margin: 0 auto 32px auto;">
            <div id="chart-donut-presupuesto" style="width: 180px; height: 180px; margin: 0 auto; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));">${donutSvg}</div>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600; margin-bottom: 4px;">Gastado</div>
              <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); line-height: 1;">${formatCurrency(b.expenses + b.savedThisMonth)}</div>
            </div>
          </div>
          <div id="presupuesto-legend-container" class="fin-grid2" style="text-align: left;">
            ${presupuestoLegendHtml}
          </div>
        </div>
      </div>

      <!-- TAB 4: RECURRENTES -->
      <div id="tab-content-recurrentes" class="fin-tab-content" style="display: ${activeFinTab === 'recurrentes' ? 'block' : 'none'};">
        <p class="fin-eyebrow" style="margin-bottom: 4px;">Descuento automático</p>
        <p style="color: var(--text-secondary); font-size: 12.5px; max-width: 520px; margin: 0 0 18px 0;">Configura un pago fijo una vez y se descuenta solo de su sobre cada mes — arriendos, suscripciones, cuentas de servicios.</p>
        ${renderRecurringForm()}
        <div id="recurring-container">
          ${renderRecurringHTML(b)}
        </div>
      </div>

      <!-- TAB 5: CUENTAS -->
      <div id="tab-content-cuentas" class="fin-tab-content" style="display: ${activeFinTab === 'cuentas' ? 'block' : 'none'};">
        <p class="fin-eyebrow" style="margin-bottom: 12px;">Sobres y metas</p>
        ${renderEnvelopeForm()}
        <div id="envelopes-list-container">
          ${envelopesHtml}
        </div>
        <div id="goals-container" style="margin-top: 24px;">
          ${renderGoalsHTML(b)}
        </div>
      </div>

    </div>

    <!-- Settings Edit Modal -->
    <div id="settings-modal" class="modal-overlay">
      <div class="modal-content" style="max-height: 600px; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0; color: var(--text-primary);">Ajustes de Finanzas</h2>
          <button class="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0;">Regla de Asignación</h3>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">Los porcentajes deben sumar exactamente 100.</p>
        <form id="settings-form">
          <div class="input-group">
            <label for="rule-needs">Necesidades (%)</label>
            <input type="number" inputmode="numeric" id="rule-needs" required autocomplete="off" min="0" max="100">
          </div>
          <div class="input-group">
            <label for="rule-wants">Deseos (%)</label>
            <input type="number" inputmode="numeric" id="rule-wants" required autocomplete="off" min="0" max="100">
          </div>
          <div class="input-group">
            <label for="rule-savings">Ahorro (%)</label>
            <input type="number" inputmode="numeric" enterkeyhint="done" id="rule-savings" required autocomplete="off" min="0" max="100">
          </div>
          <button type="submit" class="btn-primary" style="background: var(--accent-purple);">Guardar Regla</button>
        </form>
        <hr style="border: none; border-top: 1px solid var(--surface-border); margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0;">Respaldos</h3>
        ${backupStatusHtml}
        <button id="btn-export-data" class="btn-primary tappable" style="background: var(--surface-2); color: var(--text-primary); margin-bottom: 16px; border: 1px solid var(--surface-border);">Exportar respaldo</button>
        <div style="position: relative;">
          <input type="file" id="file-import-data" accept=".json" style="position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%;">
          <button class="btn-primary tappable" style="background: var(--accent-purple); color: #000; pointer-events: none;">Restaurar respaldo</button>
        </div>
        <hr style="border: none; border-top: 1px solid var(--surface-border); margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px 0;">Seguridad</h3>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">Bloquea la app con un PIN de 4 dígitos. Si lo olvidas, la única recuperación es borrar los datos del dispositivo y restaurarlos desde un respaldo — por eso exportamos uno automáticamente antes de activarlo.</p>
        <div id="pin-security-container">${renderPinSecuritySection()}</div>
      </div>
    </div>

    ${renderGoalForm()}

    ${renderIngresoForm()}
      ${renderGastoForm()}
      ${renderAhorroForm()}
      ${renderTransferForm()}
    `;
  }