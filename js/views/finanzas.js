import { Toast, ConfirmDialog, EmptyState, SkeletonCard } from '../utils/states.js';
import { animateNumber } from '../utils/animate.js';
import { renderDonut } from '../utils/donut.js';
import { db } from '../core/db.js';
import { formatCurrency, getCurrency, setCurrency, formatCompactCurrency } from '../utils/currency.js';
import { exportAllData, importAllData } from '../utils/backup.js';
import { renderIngresoForm, initIngresoForm } from '../components/IngresoForm.js';
import { renderGastoForm, initGastoForm } from '../components/GastoForm.js';
import { renderAhorroForm, initAhorroForm } from '../components/AhorroForm.js';
import { renderEnvelopeForm, initEnvelopeForm } from '../components/EnvelopeForm.js';
import { renderTransferForm, initTransferForm } from '../components/TransferForm.js';
import { renderRecurringForm, initRecurringForm } from '../components/RecurringForm.js';

const editSvg = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
const transferSvg = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 3v18M17 3l4 4M17 3l-4 4M7 21V3M7 21l4-4M7 21l-4-4"></path></svg>`;
const delSvg = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const backspaceSvg = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>`;
let b = null;
let activeFinTab = 'resumen';
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
let currentMonth = `${year}-${month}`;

// Iconos disponibles para metas de ahorro (usados también en el <select> del modal de Meta)
const GOAL_ICONS = ['shield', 'plane', 'car', 'home', 'laptop', 'education'];
const GOAL_ICON_LABELS = {
  shield: 'Fondo de emergencia',
  plane: 'Viaje',
  car: 'Auto',
  home: 'Hogar',
  laptop: 'Tecnología',
  education: 'Educación'
};

const ICON_PATHS = {
  'Ingreso': '<polyline points="19 12 12 19 5 12"></polyline><line x1="12" y1="19" x2="12" y2="5"></line>',
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



export let mountListeners;
export async function init() {
  b = await db.getBudget(currentMonth);

  const refresh = async () => {
    const prevB = b;
    b = await db.getBudget(currentMonth);
    
    // Animate stats
    const elIncome = document.getElementById('stat-income');
    const elExpense = document.getElementById('stat-expense');
    if(elIncome) animateNumber(elIncome, prevB.income, b.income, 400, true);
    if(elExpense) animateNumber(elExpense, prevB.expenses, b.expenses, 400, true);
    
    // Update disponible big number (card-disponible)
    const elDisponible = document.querySelector('#card-disponible div:last-child');
    if (elDisponible) {
      elDisponible.innerText = (b.remaining.toString().length > 13) ? formatCompactCurrency(b.remaining) : formatCurrency(b.remaining);
      elDisponible.style.color = (b.remaining >= 0) ? 'var(--state-success)' : 'var(--state-high)';
    }

    // Update Donuts using renderDonut
    const totalNeeds = b.allocations.find(a => a.category === 'Needs')?.amount || 0;
    const totalWants = b.allocations.find(a => a.category === 'Wants')?.amount || 0;
    const totalSavings = b.allocations.find(a => a.category === 'Savings')?.amount || 0;
    const getPct = (val) => b.budgeted > 0 ? Math.round((val / b.budgeted) * 100) : 0;
    
    const segments = [
      { percent: getPct(totalNeeds), color: 'var(--state-high)' },
      { percent: getPct(totalWants), color: 'var(--accent-blue)' },
      { percent: getPct(totalSavings), color: 'var(--accent-purple)' }
    ];
    const donutSvg = renderDonut(segments, b.budgeted, b.budgeted === 0);
    
    const donutResumen = document.getElementById('chart-donut-resumen');
    if (donutResumen) donutResumen.innerHTML = donutSvg;
    
    const donutPresupuesto = document.getElementById('chart-donut-presupuesto');
    if (donutPresupuesto) donutPresupuesto.innerHTML = donutSvg;
    
    // Update internal text of Donuts
    const donutResumenText = document.querySelector('#chart-donut-resumen + div > div:last-child');
    if (donutResumenText) donutResumenText.innerText = formatCompactCurrency(b.budgeted);
    
    const donutPresupuestoText = document.querySelector('#chart-donut-presupuesto + div > div:last-child');
    if (donutPresupuestoText) donutPresupuestoText.innerText = formatCurrency(b.expenses + b.savedThisMonth);

    const resumenLegend = document.getElementById('resumen-cat-legend');
    if (resumenLegend) resumenLegend.innerHTML = renderResumenLegend(b);

    // Update transactions
    const txContainer = document.getElementById('recent-tx-list');
    if(txContainer) {
      txContainer.innerHTML = b.breakdown.length === 0 ? EmptyState("No hay movimientos", "Toca el botón + para registrar uno") : b.breakdown.slice(0, 5).map(tx => txHtml(tx)).join('');
    }
    
    // Update Presupuesto Tab Legend (Replaces old envelopes-container)
    const legendContainer = document.getElementById('presupuesto-legend-container');
    if (legendContainer) {
      legendContainer.innerHTML = renderPresupuestoLegend(b);
      // Re-attach listeners for dynamically rendered buttons inside legend
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
        const confirmed = await ConfirmDialog("¿Eliminar sobre?", "Las transacciones asociadas ya no estarán vinculadas a este sobre.");
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
         const confirmed = await ConfirmDialog("¿Eliminar movimiento?", "Esta acción no se puede deshacer.");
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

  // --- METAS DE AHORRO (extraída para reutilizarse en refresh() y en el render inicial) ---
  const setupGoalModal = () => {
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-target').value = '';
    document.getElementById('goal-initial').value = '0';
    document.getElementById('goal-icon').value = 'shield';
    document.getElementById('goal-initial-container').style.display = 'block';
    document.getElementById('modal-goal-title').innerText = 'Nueva Meta';
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
        const confirmed = await ConfirmDialog("¿Eliminar pago fijo?", "Ya no se descontará dinero automáticamente de tu sobre.");
        if (confirmed) {
           await db.deleteRecurring(id);
           refresh();
        }
      });
    });
  };

  const attachGoalListeners = () => {
    const btnAddGoal = document.getElementById('btn-add-goal');
    if (btnAddGoal) btnAddGoal.addEventListener('click', () => { setupGoalModal(); openModal('goal-modal'); });

    document.querySelectorAll('.edit-goal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = b.goals.find(g => g.id === id);
        if(goal) {
          document.getElementById('goal-id').value = goal.id;
          document.getElementById('goal-name').value = goal.name || '';
          document.getElementById('goal-target').value = goal.targetAmount || 0;
          document.getElementById('goal-icon').value = goal.icon || 'shield';
          document.getElementById('goal-initial-container').style.display = 'none';
          document.getElementById('modal-goal-title').innerText = 'Editar Meta';
          openModal('goal-modal');
        }
      });
    });

    document.querySelectorAll('.delete-goal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const goal = b.goals.find(g => g.id === id);
        if (goal) {
          const confirmed = await ConfirmDialog("¿Eliminar meta?", "Se eliminará la meta pero los ahorros quedarán en tu historial.");
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

    const elIncome = document.getElementById('stat-income');
    const elExpense = document.getElementById('stat-expense');
    
    if(elIncome) animateNumber(elIncome, 0, b.income, 800, true);
    if(elExpense) animateNumber(elExpense, 0, b.expenses, 800, true);
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

    initIngresoForm(db, refresh);
    initGastoForm(db, refresh);
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

    attachTxListeners();
    attachGoalListeners();
    attachRecurringListeners();
    attachEnvListeners();

    const goalForm = document.getElementById('goal-form');
    if (goalForm) {
      goalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('goal-id').value;
        const name = document.getElementById('goal-name').value.trim();
        const targetAmount = parseFloat(document.getElementById('goal-target').value) || 0;
        const icon = document.getElementById('goal-icon').value;
        const initialAmount = parseFloat(document.getElementById('goal-initial').value) || 0;
        
        if (!name || targetAmount <= 0) {
          Toast("Completa los datos", "warning");
          return;
        }

        const btnSubmit = goalForm.querySelector('button[type="submit"]');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

                if (id) {
          const existing = b.goals.find(g => g.id === id);
          await db.updateGoal(id, { name, targetAmount, icon, currentAmount: existing ? existing.currentAmount : 0 });
        } else {
          await db.createGoal({ name, targetAmount, icon, currentAmount: initialAmount, completed: false });
        }
        closeModal('goal-modal');
        Toast(id ? "Meta actualizada" : "Meta creada", "success");
        refresh();
      });
    }
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

      // --- HISTORY MODAL & TABS ---
      const renderHistoryList = (filterVal) => {
        const container = document.getElementById('history-list-content');
        if(!container) return;
        
        let filtered = b.breakdown;
        if (filterVal === 'Ingreso') filtered = b.breakdown.filter(t => t.type === 'Ingreso');
        if (filterVal === 'Gasto') filtered = b.breakdown.filter(t => t.type === 'Gasto' && t.category !== 'Savings');
        if (filterVal === 'Ahorro') filtered = b.breakdown.filter(t => t.category === 'Savings');
        
        if (filtered.length === 0) {
          container.innerHTML = EmptyState("No hay movimientos", "No se encontraron resultados");
          return;
        }
        
        container.innerHTML = filtered.map(tx => txHtml(tx)).join('');
        attachTxListeners();
      };

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
          if (cat === 'Ahorros') filterType = 'Ahorro';
          renderHistoryList(filterType);
          document.querySelector('.fin-tab[data-tab="movimientos"]').click();
        });
      });
    };
};


const renderAgeOfMoneyHTML = (b) => {
  return `
    <div class="card" id="card-ageofmoney" style="padding: 16px; margin-bottom: 24px; border-radius: 16px; background: linear-gradient(145deg, var(--surface-1), var(--surface-2)); display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--surface-border);">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(94, 234, 212, 0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-teal);">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        </div>
        <div>
          <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Edad del Dinero</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--text-primary);">${b.ageOfMoney} <span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">días</span></div>
        </div>
      </div>
      <div style="text-align: right; max-width: 120px;">
        <div style="font-size: 11px; font-weight: 500; color: var(--text-secondary); line-height: 1.3;">
          ${b.ageOfMoney >= 30 ? '<span style="color:var(--accent-teal);">¡Vives con ingresos del mes pasado!</span>' : 'Aumenta esta métrica para salir del cheque a cheque.'}
        </div>
      </div>
    </div>
  `;
};


const renderRecurringHTML = (b) => {
  let html = `
    <div class="flex-between" style="margin-bottom: 16px;">
      <div>
        <h2 style="font-size: 16px; font-weight: 700; margin: 0; margin-bottom: 2px;">Suscripciones Automáticas</h2>
      </div>
    </div>
  `;
  if (!b.recurring || b.recurring.length === 0) {
    html += `
       ${EmptyState("Sin pagos fijos", "Automatiza tus suscripciones")}
       <button id="btn-add-recurring" style="margin-top: 8px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nuevo pago</button>
    `;
  } else {
    html += `<div style="display: flex; flex-direction: column; gap: 12px;">`;
    html += b.recurring.map(req => {
      const env = b.envelopes.find(e => e.id === req.envelopeId);
      const envName = env ? env.name : 'Desconocido';
      return `
        <div class="card recurring-row" data-id="${req.id}" style="padding: 16px; border-radius: 16px;">
          <div class="flex-between">
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--text-primary);">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700;">${req.label}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">Día ${req.dayOfMonth} &bull; ${envName}</div>
              </div>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
              <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${formatCurrency(req.amount)}</div>
              <button class="delete-recurring" data-id="${req.id}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer;">${delSvg}</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    html += `<button id="btn-add-recurring" style="margin-top: 12px; background: transparent; color: var(--text-primary); border: 1px dashed var(--surface-border); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nuevo pago</button>`;
    html += `</div>`;
  }
  return html;
};

const renderGoalsHTML = (b) => {
  let html = `
    <div class="flex-between" style="margin-bottom: 16px;">
      <div>
        <h2 style="font-size: 16px; font-weight: 700; margin: 0; margin-bottom: 2px;">Metas de Ahorro</h2>
        ${b.savedThisMonth > 0 ? `<div style="font-size: 12px; font-weight: 600; color: var(--accent-purple);">Ahorrado este mes: ${formatCurrency(b.savedThisMonth)}</div>` : ''}
      </div>
    </div>
  `;
  if (b.goals.length === 0) {
    html += `
       ${EmptyState("Sin metas de ahorro", "Crea una para apartar dinero mes a mes")}
       <button id="btn-add-goal" style="margin-top: 8px; background: transparent; color: var(--accent-purple); border: 1px dashed var(--accent-purple); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>
    `;
  } else {
    html += `<div style="display: flex; flex-direction: column; gap: 12px;">`;
    html += b.goals.map(g => {
      const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
      return `
        <div class="card goal-row" data-id="${g.id}" style="padding: 16px; border-radius: 16px;">
          <div class="flex-between" style="margin-bottom: 12px;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; font-size: 16px;">
                ${getSVG(g.icon, 'var(--text-primary)')}
              </div>
              <div style="font-size: 14px; font-weight: 700;">${g.name}</div>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
              <div style="font-size: 12px; color: var(--text-secondary);">${formatCurrency(g.currentAmount)} / ${formatCurrency(g.targetAmount)}</div>
              <button class="edit-goal" data-id="${g.id}" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer;">${editSvg}</button>
              <button class="delete-goal" data-id="${g.id}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer;">${delSvg}</button>
            </div>
          </div>
          <div style="height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; cursor: pointer;" class="contrib-btn" data-id="${g.id}">
            <div style="height: 100%; width: ${pct}%; background: ${g.completed ? 'var(--state-success)' : 'var(--accent-purple)'}; border-radius: 4px;"></div>
          </div>
        </div>
      `;
    }).join('');
    html += `<button id="btn-add-goal" style="margin-top: 8px; background: transparent; color: var(--accent-purple); border: 1px dashed var(--accent-purple); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">+ Nueva meta</button>`;
    html += `</div>`;
  }
  return html;
};

const getCatColor = (cat) => {
  if(cat === 'Needs') return 'var(--state-high)';
  if(cat === 'Wants') return 'var(--accent-blue)';
  if(cat === 'Savings') return 'var(--accent-purple)';
  if(cat === 'Income') return 'var(--state-success)';
  return 'var(--text-secondary)';
};

const txHtml = (tx) => {
  let catColor = getCatColor(tx.category);
  let iconSvg = getSVG(tx.category, catColor);
  let fallbackLabel = tx.type === 'Ingreso' ? 'Ingreso' : (tx.category === 'Savings' ? 'Ahorro' : (tx.category === 'Needs' ? 'Necesidades' : 'Deseos'));
  let displayLabel = tx.label || fallbackLabel;
  let subText = `${tx.date.substring(0,10)} &bull; ${tx.category === 'Needs' ? 'Necesidades' : tx.category === 'Wants' ? 'Deseos' : tx.category === 'Savings' ? 'Ahorros' : 'Ingreso'}`;
  
  let amountPrefix = tx.type === 'Ingreso' ? '+' : '-';
  let amountColor = tx.type === 'Ingreso' ? 'var(--state-success)' : 'var(--text-primary)';
  
  if (tx.envelopeId && b && b.envelopes) {
    const env = b.envelopes.find(e => e.id === tx.envelopeId);
    if (env) {
      if (tx.type === 'Gasto') {
        iconSvg = getSVG(env.icon, catColor);
        subText = `${tx.date.substring(0,10)} &bull; ${env.name}`;
      } else if (tx.type === 'Assignment') {
        catColor = 'var(--accent-blue)';
        iconSvg = transferSvg;
        amountColor = tx.isSubtraction ? 'var(--text-primary)' : 'var(--state-success)';
        amountPrefix = tx.isSubtraction ? '-' : '+';
        subText = `${tx.date.substring(0,10)} &bull; ${tx.isSubtraction ? 'Retirado de' : 'Asignado a'} ${env.name}`;
      }
    }
  } else if (tx.type === 'Transfer' && b && b.envelopes) {
    catColor = 'var(--accent-blue)';
    iconSvg = transferSvg;
    const fromEnv = b.envelopes.find(e => e.id === tx.fromEnvelopeId)?.name || 'Desconocido';
    const toEnv = b.envelopes.find(e => e.id === tx.toEnvelopeId)?.name || 'Desconocido';
    subText = `${tx.date.substring(0,10)} &bull; ${fromEnv} &rarr; ${toEnv}`;
    amountPrefix = '';
    amountColor = 'var(--text-secondary)';
  }

  return `
    <div class="tx-row flex-between tappable edit-tx" data-id="${tx.id}" style="padding: 12px 16px; background: var(--bg-base); border-radius: 12px; margin-bottom: 8px;">
      <div style="display: flex; gap: 12px; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 10px; background: ${catColor}20; display: flex; align-items: center; justify-content: center; color: ${catColor};">
          ${iconSvg}
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); text-transform: capitalize;">${displayLabel}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${subText}</div>
        </div>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <div style="font-size: 15px; font-weight: 700; color: ${amountColor};">
          ${amountPrefix}${formatCurrency(tx.amount)}
        </div>
        <button class="delete-tx tappable" data-id="${tx.id}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer; padding: 4px;">
           ${delSvg}
        </button>
      </div>
    </div>
  `;
};


// Leyenda compacta para el donut de la pestaña Resumen: muestra a qué
// categoría corresponde cada color y cuánto se gastó en cada una este mes.
const renderResumenLegend = (b) => {
  const totalNeeds = b.allocations.find(a => a.category === 'Needs')?.amount || 0;
  const totalWants = b.allocations.find(a => a.category === 'Wants')?.amount || 0;
  const totalSavings = b.allocations.find(a => a.category === 'Savings')?.amount || 0;
  const items = [
    { label: 'Necesidades', amount: totalNeeds, color: 'var(--state-high)' },
    { label: 'Deseos', amount: totalWants, color: 'var(--accent-blue)' },
    { label: 'Ahorros', amount: totalSavings, color: 'var(--accent-purple)' }
  ];
  return items.map(item => `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--text-secondary);">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${item.color}; flex-shrink: 0;"></span>${item.label}
      </div>
      <div style="font-size: 12px; font-weight: 700; color: ${item.amount > 0 ? 'var(--text-primary)' : 'var(--text-disabled)'};">${item.amount > 0 ? formatCurrency(item.amount) : 'Sin movimientos'}</div>
    </div>
  `).join('');
};

const renderPresupuestoLegend = (b) => {
  const totalNeeds = b.allocations.find(a => a.category === 'Needs')?.amount || 0;
  const totalWants = b.allocations.find(a => a.category === 'Wants')?.amount || 0;
  const totalSavings = b.allocations.find(a => a.category === 'Savings')?.amount || 0;
  const rule = b.rule || { needs: 0.5, wants: 0.3, savings: 0.2 };
  const ruleDisplay = { needs: Math.round(rule.needs * 100), wants: Math.round(rule.wants * 100), savings: Math.round(rule.savings * 100) };
  const getPct = (val) => b.budgeted > 0 ? Math.round((val / b.budgeted) * 100) : 0;
  
  return ['Necesidades', 'Deseos', 'Ahorros'].map(catKey => {
    const isNeeds = catKey === 'Necesidades';
    const isWants = catKey === 'Deseos';
    const isSavings = catKey === 'Ahorros';
    const totalAmt = isNeeds ? totalNeeds : (isWants ? totalWants : totalSavings);
    const getPctVal = isNeeds ? getPct(totalNeeds) : (isWants ? getPct(totalWants) : getPct(totalSavings));
    const rulePct = isNeeds ? ruleDisplay.needs : (isWants ? ruleDisplay.wants : ruleDisplay.savings);
    const color = isNeeds ? 'var(--state-high)' : (isWants ? 'var(--accent-blue)' : 'var(--accent-purple)');

    // Barra de progreso "gastado vs disponible" de la categoría, coloreada
    // por nivel de uso respecto de lo que le corresponde según la regla 50/30/20.
    const disponibleCat = b.budgeted * (isNeeds ? rule.needs : (isWants ? rule.wants : rule.savings));
    const usoCatPct = disponibleCat > 0 ? Math.round((totalAmt / disponibleCat) * 100) : (totalAmt > 0 ? 100 : 0);
    const usoCatPctClamped = Math.min(100, usoCatPct);
    const usoBarColor = usoCatPct >= 100 ? 'var(--state-high)' : usoCatPct >= 80 ? 'var(--state-medium)' : 'var(--state-low)';

    let html = `<div class="legend-item tappable" data-cat="${catKey}" style="display: flex; flex-direction: column; gap: 8px; background: var(--surface-2); padding: 12px; border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color};"></span>${catKey}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 700;">${formatCurrency(totalAmt)}</div>
            <div style="font-size: 10px; font-weight: 500; color: var(--text-disabled);">${getPctVal}% / ${rulePct}%</div>
          </div>
        </div>
        <div style="width: 100%; height: 6px; background: var(--bg-base); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${usoCatPctClamped}%; background: ${usoBarColor}; border-radius: 3px; transition: width 0.4s ease;"></div>
        </div>
        <div style="font-size: 10px; color: var(--text-disabled); text-align: right;">Disponible: ${formatCurrency(Math.max(0, disponibleCat - totalAmt))} de ${formatCurrency(disponibleCat)}</div>`;

    if (!isSavings) {
      const catEnvs = b.envelopes.filter(e => e.category === (isNeeds ? 'Needs' : 'Wants'));
      if (catEnvs.length > 0) {
        html += `<div style="margin-top: 8px; border-top: 1px solid var(--surface-border); padding-top: 8px; display: flex; flex-direction: column; gap: 6px;">`;
        catEnvs.forEach(env => {
          const pct = env.assignedAmount > 0 ? Math.min(100, Math.round((env.spent / env.assignedAmount) * 100)) : (env.spent > 0 ? 100 : 0);
          const barColor = pct >= 100 ? 'var(--state-high)' : pct >= 80 ? 'var(--state-medium)' : color;
          // SVG inline for envelopes since getSVG might not be available globally if it's not exported
          const iconSvg = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path></svg>`;
          
          // Sparkline 3 months (P2.4)
          const hist = db.getHistoricalSummaryByEnvelope(env.id, 3);
          const maxH = Math.max(...hist, 1);
          let sparklineHtml = `<div style="display:flex; align-items:flex-end; gap:2px; height:12px; margin-left: 6px;" title="Últimos 3 meses">`;
          hist.forEach(v => {
            const hPct = Math.max(10, Math.round((v / maxH) * 100));
            const sparkColor = v > env.assignedAmount ? 'var(--state-high)' : 'var(--accent-blue)';
            sparklineHtml += `<div style="width:3px; height:${hPct}%; background:${sparkColor}; border-radius:1px; opacity:0.7;"></div>`;
          });
          sparklineHtml += `</div>`;

          html += `<div class="env-row tappable" data-id="${env.id}" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-base); padding: 8px; border-radius: 8px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 24px; height: 24px; border-radius: 6px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                  ${iconSvg}
                </div>
                <div>
                  <div style="font-size: 12px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center;">${env.name} ${sparklineHtml}</div>
                  <div style="font-size: 10px; color: var(--text-disabled);">Asignado: ${formatCurrency(env.assignedAmount)}</div>
                </div>
              </div>
              <div style="text-align: right; width: 60px;">
                <div style="font-size: 12px; font-weight: 700; color: ${env.spent > 0 ? 'var(--text-primary)' : 'var(--text-disabled)'};">${env.spent > 0 ? formatCurrency(env.spent) : 'Sin gastos'}</div>
                <div style="width: 100%; height: 4px; background: var(--surface-2); border-radius: 2px; margin-top: 4px; overflow: hidden;">
                  <div style="height: 100%; width: ${env.spent > 0 ? pct : 0}%; background: ${env.spent > 0 ? barColor : 'var(--surface-border)'};"></div>
                </div>
              </div>
              <div style="flex-basis: 100%; display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--surface-border);">
                <button class="transfer-env" data-id="${env.id}" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer;" title="Transferir">${transferSvg}</button>
                <button class="edit-env" data-id="${env.id}" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer;" title="Editar">${editSvg}</button>
                <button class="delete-env" data-id="${env.id}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer;" title="Eliminar">${delSvg}</button>
              </div>
            </div>`;
        });
        html += `</div>`;
      }
      html += `<button class="btn-add-envelope" data-cat="${isNeeds ? 'Needs' : 'Wants'}" style="margin-top: 8px; width: 100%; padding: 8px; background: transparent; border: 1px dashed var(--surface-border); border-radius: 8px; color: var(--text-secondary); font-size: 12px; font-weight: 600; cursor: pointer;">+ Añadir sobre en ${catKey}</button>`;
    }
    html += `</div>`;
    return html;
  }).join('');
};

export async function render() {
  await init();

  const formatMonth = (str) => {
    const monthLabel = new Date(str + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();
    const year = new Date(str + '-01T00:00:00').getFullYear();
    return `${monthLabel} de ${year}`;
  };
  
  const cur = getCurrency();
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
    { percent: getPct(totalNeeds), color: 'var(--state-high)' },
    { percent: getPct(totalWants), color: 'var(--accent-blue)' },
    { percent: getPct(totalSavings), color: 'var(--accent-purple)' }
  ];
  const donutSvg = renderDonut(segments, b.budgeted, b.budgeted === 0);

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

  let fullStr = '';
  if(balanceSafe.toString().length > 13) {
      fullStr = formatCompactCurrency(balanceSafe);
  } else {
      fullStr = formatCurrency(balanceSafe);
  }

  return `
    <style>${modalCSS}</style>
    <div style="max-width: 480px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 0 20px; font-family: 'Inter', sans-serif; padding-bottom: 120px;">

      <!-- Header -->
      <div style="position: sticky; top: 0; z-index: 100; padding: 20px 4px 16px 4px; background: linear-gradient(180deg, var(--bg-base) 70%, rgba(15,17,21,0)); margin: 0 -4px 12px -4px;">
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
        <button class="fin-tab ${activeFinTab === 'resumen' ? 'active' : ''}" data-tab="resumen" style="flex: 0 0 auto; padding: 10px 14px; background: ${activeFinTab === 'resumen' ? 'var(--surface-1)' : 'transparent'}; color: ${activeFinTab === 'resumen' ? 'var(--text-primary)' : 'var(--text-secondary)'};">Resumen</button>
        <button class="fin-tab ${activeFinTab === 'presupuesto' ? 'active' : ''}" data-tab="presupuesto" style="flex: 0 0 auto; padding: 10px 14px; background: ${activeFinTab === 'presupuesto' ? 'var(--surface-1)' : 'transparent'}; color: ${activeFinTab === 'presupuesto' ? 'var(--text-primary)' : 'var(--text-secondary)'};">Presupuesto</button>
        <button class="fin-tab ${activeFinTab === 'movimientos' ? 'active' : ''}" data-tab="movimientos" style="flex: 0 0 auto; padding: 10px 14px; background: ${activeFinTab === 'movimientos' ? 'var(--surface-1)' : 'transparent'}; color: ${activeFinTab === 'movimientos' ? 'var(--text-primary)' : 'var(--text-secondary)'};">Movimientos</button>
        <button class="fin-tab ${activeFinTab === 'metas' ? 'active' : ''}" data-tab="metas" style="flex: 0 0 auto; padding: 10px 14px; background: ${activeFinTab === 'metas' ? 'var(--surface-1)' : 'transparent'}; color: ${activeFinTab === 'metas' ? 'var(--text-primary)' : 'var(--text-secondary)'};">Metas</button>
      </div>

      <!-- TAB 1: RESUMEN -->
      <div id="tab-content-resumen" class="fin-tab-content" style="display: ${activeFinTab === 'resumen' ? 'block' : 'none'};">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="card top-card tappable" id="card-ingresos" style="padding: 18px; border-radius: 18px; display: flex; flex-direction: column; gap: 10px;">
            <div class="icon-chip" style="width: 30px; height: 30px; background: rgba(52, 211, 153, 0.15); color: var(--state-success);">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7-7 7 7"></path></svg>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">Ingresos</div>
            <div id="stat-income" style="font-size: 19px; font-weight: 800; letter-spacing: -0.3px;">${formatCurrency(b.income)}</div>
          </div>

          <div class="card top-card tappable" id="card-gastos" style="padding: 18px; border-radius: 18px; display: flex; flex-direction: column; gap: 10px;">
            <div class="icon-chip" style="width: 30px; height: 30px; background: rgba(248, 113, 113, 0.15); color: var(--state-high);">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7 7 7-7"></path></svg>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">Gastos</div>
            <div id="stat-expense" style="font-size: 19px; font-weight: 800; letter-spacing: -0.3px;">${formatCurrency(b.expenses)}</div>
          </div>
        </div>

        <div class="card" id="card-disponible" style="padding: 28px 24px; text-align: center; border-radius: 24px; margin-bottom: 24px; background: linear-gradient(155deg, var(--surface-2) 0%, var(--surface-1) 65%); border: 1px solid var(--surface-border); box-shadow: 0 0 0 1px var(--glass-border) inset, 0 16px 40px -16px ${isHealthy ? 'rgba(52, 211, 153, 0.35)' : 'rgba(248, 113, 113, 0.35)'};">
          <div style="font-size: 12px; color: var(--text-secondary); font-weight: 700; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.6px;">Disponible en Mes</div>
          <div style="font-size: 38px; font-weight: 800; color: ${isHealthy ? 'var(--state-success)' : 'var(--state-high)'}; line-height: 1.1; letter-spacing: -0.5px;">
            ${fullStr}
          </div>
        </div>

        <!-- BOTONES FAB MOVIDOS AQUÍ -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
          <button id="btn-fab-ingreso" class="tappable" style="flex: 1; padding: 14px 8px; border-radius: 16px; background: var(--surface-1); border: 1px solid var(--surface-border); display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-primary);">
            <div class="icon-chip" style="width: 36px; height: 36px; background: rgba(52, 211, 153, 0.15); color: var(--state-success);"><svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7-7 7 7"></path></svg></div>
            <span style="font-size: 11px; font-weight: 700;">Ingreso</span>
          </button>
          <button id="btn-fab-gasto" class="tappable" style="flex: 1; padding: 14px 8px; border-radius: 16px; background: var(--surface-1); border: 1px solid var(--surface-border); display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-primary);">
            <div class="icon-chip" style="width: 36px; height: 36px; background: rgba(248, 113, 113, 0.15); color: var(--state-high);"><svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7 7 7-7"></path></svg></div>
            <span style="font-size: 11px; font-weight: 700;">Gasto</span>
          </button>
          <button id="btn-fab-ahorro" class="tappable" style="flex: 1; padding: 14px 8px; border-radius: 16px; background: var(--surface-1); border: 1px solid var(--surface-border); display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-primary);">
            <div class="icon-chip" style="width: 36px; height: 36px; background: rgba(191, 90, 242, 0.15); color: var(--accent-purple);"><svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path></svg></div>
            <span style="font-size: 11px; font-weight: 700;">Ahorro</span>
          </button>
        </div>

        <!-- Simplified Donut -->
        <div class="card card--glass" style="padding: 28px; margin-bottom: 24px; text-align: center; border-radius: 24px;">
          <h3 style="font-size: 13px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 20px 0; text-align: left;">Distribución del gasto</h3>
          <div style="position: relative; width: 150px; height: 150px; margin: 0 auto;">
            <div id="chart-donut-resumen" style="width: 150px; height: 150px; margin: 0 auto; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));">${donutSvg}</div>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-bottom: 2px;">Presupuesto</div>
              <div style="font-size: 17px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.3px;">${formatCompactCurrency(b.budgeted)}</div>
            </div>
          </div>
          <div id="resumen-cat-legend" style="display: flex; flex-direction: column; gap: 10px; margin-top: 24px; text-align: left;">
            ${renderResumenLegend(b)}
          </div>
        </div>

        ${(() => {
          const trendHistory = db.getHistoricalSummary(6);
          if (trendHistory.hasEnoughData) {
            const maxVal = Math.max(...trendHistory.data.map(d => d.expenses + d.saved));
            return `
            <div class="card" style="padding: 20px; margin-bottom: 24px;">
              <h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0;">Tendencia de gastos</h3>
              <div style="display: flex; gap: 8px; align-items: flex-end; height: 100px; padding-top: 10px;">
                ${trendHistory.data.map(d => {
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
          }
          return '';
        })()}

        <div class="card" style="padding: 20px; margin-bottom: 24px;">
          <div class="flex-between" style="margin-bottom: 16px;">
            <h2 style="font-size: 16px; font-weight: 700; margin: 0;">Movimientos Recientes</h2>
            <span class="btn-go-movimientos" id="btn-ver-todos" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer;">Ver todos</span>
          </div>
          <div id="recent-tx-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${b.breakdown.length === 0 ? EmptyState("No hay movimientos", "Toca el botón Ingreso o Gasto") : b.breakdown.slice(0, 5).map(tx => txHtml(tx)).join('')}
          </div>
        </div>
      </div>

      <!-- TAB 2: PRESUPUESTO -->
      <div id="tab-content-presupuesto" class="fin-tab-content" style="display: ${activeFinTab === 'presupuesto' ? 'block' : 'none'};">
        <div class="card" style="padding: 24px; margin-bottom: 24px;">
          <div class="flex-between" style="margin-bottom: 24px;">
            <h2 style="font-size: 16px; font-weight: 700; margin: 0;">Tu Regla 50/30/20</h2>
            <button id="btn-open-settings" style="background: transparent; border: none; color: var(--accent-blue); font-size: 13px; font-weight: 600; cursor: pointer;">Editar regla</button>
          </div>
          <div style="position: relative; width: 180px; height: 180px; margin: 0 auto 32px auto;">
            <div id="chart-donut-presupuesto" style="width: 180px; height: 180px; margin: 0 auto; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));">${donutSvg}</div>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600; margin-bottom: 4px;">Gastado</div>
              <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); line-height: 1;">${formatCurrency(b.expenses + b.savedThisMonth)}</div>
            </div>
          </div>

          <div id="presupuesto-legend-container" style="display: flex; flex-direction: column; gap: 16px;">
            ${renderPresupuestoLegend(b)}
          </div>
        </div>

        <div class="card" id="recurring-container" style="padding: 20px; margin-bottom: 24px;">
          ${renderRecurringHTML(b)}
        </div>
      </div>

      <!-- TAB 3: MOVIMIENTOS -->
      <div id="tab-content-movimientos" class="fin-tab-content" style="display: ${activeFinTab === 'movimientos' ? 'block' : 'none'};">
        <div class="segmented-control" style="margin-bottom: 16px;">
          <button class="history-tab" data-filter="All" style="background: var(--surface-1); color: var(--text-primary);">Todos</button>
          <button class="history-tab" data-filter="Ingreso" style="background: transparent; color: var(--text-secondary);">Ingresos</button>
          <button class="history-tab" data-filter="Gasto" style="background: transparent; color: var(--text-secondary);">Gastos</button>
          <button class="history-tab" data-filter="Ahorro" style="background: transparent; color: var(--text-secondary);">Ahorros</button>
        </div>
        <div id="history-list-content" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
          <!-- Inyectado por renderHistoryList -->
        </div>
        ${renderAgeOfMoneyHTML(b)}
      </div>

      <!-- TAB 4: METAS -->
      <div id="tab-content-metas" class="fin-tab-content" style="display: ${activeFinTab === 'metas' ? 'block' : 'none'};">
        <div class="card" id="goals-container" style="padding: 20px; margin-bottom: 24px;">
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
            <label>Necesidades (%)</label>
            <input type="number" id="rule-needs" required autocomplete="off" min="0" max="100">
          </div>
          <div class="input-group">
            <label>Deseos (%)</label>
            <input type="number" id="rule-wants" required autocomplete="off" min="0" max="100">
          </div>
          <div class="input-group">
            <label>Ahorros (%)</label>
            <input type="number" id="rule-savings" required autocomplete="off" min="0" max="100">
          </div>
          <button type="submit" class="btn-primary" style="background: var(--accent-blue);">Guardar Regla</button>
        </form>
        <hr style="border: none; border-top: 1px solid var(--surface-border); margin: 24px 0;">
        <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px 0;">Respaldos</h3>
        <button id="btn-export-data" class="btn-primary tappable" style="background: var(--surface-2); color: var(--text-primary); margin-bottom: 16px; border: 1px solid var(--surface-border);">Exportar respaldo</button>
        <div style="position: relative;">
          <input type="file" id="file-import-data" accept=".json" style="position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%;">
          <button class="btn-primary tappable" style="background: var(--accent-purple); color: #000; pointer-events: none;">Restaurar respaldo</button>
        </div>
      </div>
    </div>

    <!-- Goal Modal -->
    <div id="goal-modal" class="modal-overlay">
      <div class="modal-content" style="max-height: 90vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 id="modal-goal-title" style="font-size: 20px; font-weight: 700; margin: 0; color: var(--accent-purple);">Nueva Meta</h2>
          <button class="btn-close-modal" style="background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <form id="goal-form">
          <input type="hidden" id="goal-id">
          <div class="input-group">
            <label>Nombre de la meta</label>
            <input type="text" id="goal-name" placeholder="Ej. Fondo de emergencia" required autocomplete="off">
          </div>
          <div class="input-group">
            <label>Monto objetivo</label>
            <input type="number" id="goal-target" placeholder="0" min="1" required autocomplete="off">
          </div>
          <div class="input-group" id="goal-initial-container">
            <label>Monto inicial (opcional)</label>
            <input type="number" id="goal-initial" placeholder="0" min="0" autocomplete="off" value="0">
          </div>
          <div class="input-group">
            <label>Ícono</label>
            <select id="goal-icon">
              ${GOAL_ICONS.map(icon => `<option value="${icon}">${GOAL_ICON_LABELS[icon]}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn-primary" style="background: var(--accent-purple);">Guardar Meta</button>
        </form>
      </div>
    </div>

    ${renderIngresoForm()}
      ${renderGastoForm()}
      ${renderAhorroForm()}
      ${renderEnvelopeForm()}
      ${renderTransferForm()}
      ${renderRecurringForm()}
    `;
  }