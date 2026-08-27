import { getEjercicioMetadata } from './ejercicios-catalogo.js';
function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const DEFAULT_TX_SHAPE = {
  id: '',
  date: '',
  goalId: null,
  envelopeId: null, // NEW: Vinculación con Sobres
  type: 'Gasto',
  category: 'Needs',
  label: '',
  amount: 0
};

const DEFAULT_GOAL_SHAPE = {
  id: '',
  name: 'Meta',
  targetAmount: 0,
  currentAmount: 0,
  icon: 'shield',
  completed: false
};

const DEFAULT_SETTINGS_SHAPE = {
  allocationRule: { needs: 0.5, wants: 0.3, savings: 0.2 }
};

const DEFAULT_ENVELOPES = [
  { id: 'env_1', name: 'Supermercado', category: 'Needs', icon: 'shopping-cart' },
  { id: 'env_2', name: 'Servicios', category: 'Needs', icon: 'zap' },
  { id: 'env_3', name: 'Transporte', category: 'Needs', icon: 'car' },
  { id: 'env_4', name: 'Arriendo', category: 'Needs', icon: 'home' },
  { id: 'env_5', name: 'Salidas y Ocio', category: 'Wants', icon: 'coffee' },
  { id: 'env_6', name: 'Suscripciones', category: 'Wants', icon: 'tv' }
];

const safeGetItem = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Base de datos corrupta en la clave: ${key}. Restaurando valor por defecto.`);
    return defaultValue;
  }
};

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error('?? [Vanguard OS] Storage Quota Exceeded for key: ' + key, e);
  }
};

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
};

export const db = {
  async getDashboardStats() {
    const sesiones = safeGetItem('vg_sessions', []);
    if (!sesiones.length) return { sesionesSemana: 0, rachaSemanas: 0 };
    
    const now = new Date();
    const currentDay = now.getDay(); 
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - distanceToMonday);
    startOfThisWeek.setHours(0,0,0,0);
    
    let sesionesSemana = 0;
    const weekIds = new Set();
    const knownMonday = new Date('2024-01-01T00:00:00Z'); // A Monday
    
    sesiones.forEach(s => {
      const sDate = new Date(s.fecha);
      if (sDate >= startOfThisWeek) sesionesSemana++;
      
      const diffTime = sDate - knownMonday;
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
      weekIds.add(diffWeeks);
    });
    
    const currentWeekDiff = Math.floor((now - knownMonday) / (1000 * 60 * 60 * 24 * 7));
    let racha = 0;
    let checkWeek = currentWeekDiff;
    
    if (!weekIds.has(checkWeek) && weekIds.has(checkWeek - 1)) {
        checkWeek--;
    }
    
    while (weekIds.has(checkWeek)) {
      racha++;
      checkWeek--;
    }

    return { sesionesSemana, rachaSemanas: racha };
  },
  _triggerUpdate() { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('budget-updated')); },
  migrateAllStoredData() {
    // Migrate Transactions
    try {
      const rawTxs = JSON.parse(localStorage.getItem('vg_transactions') || 'null');
      if (rawTxs && Array.isArray(rawTxs)) {
        const isNumericLabel = (label) => /^\d+$/.test((label || '').trim());
        const migratedTxs = rawTxs.map(tx => {
          let merged = { ...DEFAULT_TX_SHAPE, ...tx, amount: toSafeNumber(tx.amount) };
          if (isNumericLabel(merged.label)) {
            const fallback = merged.type === 'Ingreso' ? 'Ingreso' : (merged.category === 'Savings' ? 'Ahorro' : (merged.category === 'Needs' ? 'Necesidades' : 'Deseos'));
            merged.label = fallback;
          }
          return merged;
        });
        safeSetItem('vg_transactions', JSON.stringify(migratedTxs));
      } else {
        safeSetItem('vg_transactions', JSON.stringify([]));
      }
    } catch(e) { safeSetItem('vg_transactions', JSON.stringify([])); }

    // Migrate Goals
    try {
      const rawGoals = JSON.parse(localStorage.getItem('vg_savings_goals') || 'null');
      if (rawGoals && Array.isArray(rawGoals)) {
        const migratedGoals = rawGoals.map(g => ({ 
          ...DEFAULT_GOAL_SHAPE, 
          ...g,
          targetAmount: toSafeNumber(g.targetAmount),
          currentAmount: toSafeNumber(g.currentAmount)
        }));
        safeSetItem('vg_savings_goals', JSON.stringify(migratedGoals));
      } else {
        safeSetItem('vg_savings_goals', JSON.stringify([]));
      }
    } catch(e) { safeSetItem('vg_savings_goals', JSON.stringify([])); }

    // Migrate Settings
    try {
      const rawSettings = JSON.parse(localStorage.getItem('vg_settings') || 'null');
      let migratedSettings = { ...DEFAULT_SETTINGS_SHAPE };
      if (rawSettings && typeof rawSettings === 'object') {
        migratedSettings = { ...DEFAULT_SETTINGS_SHAPE, ...rawSettings };
        if (!migratedSettings.allocationRule || typeof migratedSettings.allocationRule !== 'object') {
           migratedSettings.allocationRule = DEFAULT_SETTINGS_SHAPE.allocationRule;
        }
      }
      safeSetItem('vg_settings', JSON.stringify(migratedSettings));
    } catch(e) { safeSetItem('vg_settings', JSON.stringify(DEFAULT_SETTINGS_SHAPE)); }

    // NEW: Migrate Envelopes
    try {
      const rawEnvelopes = JSON.parse(localStorage.getItem('vg_envelopes') || 'null');
      if (!rawEnvelopes || !Array.isArray(rawEnvelopes) || rawEnvelopes.length === 0) {
        safeSetItem('vg_envelopes', JSON.stringify(DEFAULT_ENVELOPES));
      }
    } catch(e) { safeSetItem('vg_envelopes', JSON.stringify(DEFAULT_ENVELOPES)); }

    },

  init() {
    this.migrateAllStoredData();
  },

  async getAllocationRule() {
    const settings = safeGetItem('vg_settings', {});
    return settings.allocationRule || DEFAULT_SETTINGS_SHAPE.allocationRule;
  },

  async setAllocationRule(rule) {
    const settings = safeGetItem('vg_settings', {});
    settings.allocationRule = rule;
    safeSetItem('vg_settings', JSON.stringify(settings)); this._triggerUpdate();
  },

  // --- NEW: Envelopes API ---
  async createEnvelope(data) {
    let envs = await this.getEnvelopes();
    const newEnv = { id: generateId(), ...data };
    envs.push(newEnv);
    safeSetItem('vg_envelopes', JSON.stringify(envs)); this._triggerUpdate(); return newEnv;
  },
  async updateEnvelope(id, data) {
    let envs = await this.getEnvelopes();
    const idx = envs.findIndex(e => e.id === id);
    if(idx > -1) {
      envs[idx] = { ...envs[idx], ...data };
      safeSetItem('vg_envelopes', JSON.stringify(envs)); this._triggerUpdate();
    }
  },
  async deleteEnvelope(id) {
    let envs = await this.getEnvelopes();
    envs = envs.filter(e => e.id !== id);
    safeSetItem('vg_envelopes', JSON.stringify(envs)); this._triggerUpdate();
  },
  async transferEnvelopeFunds(fromId, toId, amount) {
    let envs = await this.getEnvelopes();
    const fromIdx = envs.findIndex(e => e.id === fromId);
    const toIdx = envs.findIndex(e => e.id === toId);
    
    if (fromIdx > -1 && toIdx > -1) {
      envs[fromIdx].assignedAmount = (Number(envs[fromIdx].assignedAmount) || 0) - amount;
      envs[toIdx].assignedAmount = (Number(envs[toIdx].assignedAmount) || 0) + amount;
      safeSetItem('vg_envelopes', JSON.stringify(envs));
      this._triggerUpdate();
      
      let txs = safeGetItem('vg_transactions', []);
      txs.push({
        id: generateId(),
        date: new Date().toISOString(),
        type: 'Transfer',
        amount: amount,
        label: 'Transferencia entre sobres',
        fromEnvelopeId: fromId,
        toEnvelopeId: toId
      });
      safeSetItem('vg_transactions', JSON.stringify(txs));
      this._triggerUpdate();
    }
  },

    // --- NEW: Recurring Expenses API ---
  async getRecurring() {
    return safeGetItem('vg_recurring', []);
  },
  async createRecurring(data) {
    let all = await this.getRecurring();
    const newItem = { 
      id: generateId(), 
      createdAt: new Date().toISOString(),
      lastProcessed: null,
      ...data 
    };
    all.push(newItem);
    safeSetItem('vg_recurring', JSON.stringify(all)); this._triggerUpdate(); return newItem;
  },
  async deleteRecurring(id) {
    let all = await this.getRecurring();
    all = all.filter(r => r.id !== id);
    safeSetItem('vg_recurring', JSON.stringify(all)); this._triggerUpdate();
  },
  async processRecurringTransactions() {
    let recurring = await this.getRecurring();
    if (recurring.length === 0) return false;

    let txs = safeGetItem('vg_transactions', []);
    let envelopes = await this.getEnvelopes();
    let updated = false;

    const today = new Date();
    today.setHours(0,0,0,0);

    recurring.forEach(req => {
      let lastDate = req.lastProcessed ? new Date(req.lastProcessed) : new Date(req.createdAt);
      
      let nextTarget = new Date(lastDate.getFullYear(), lastDate.getMonth(), req.dayOfMonth);
      // Evitar overflow de meses (ej. 31 de Febrero) limitando el dayOfMonth a 28 en UI.
      
      if (lastDate >= nextTarget || req.lastProcessed) {
        nextTarget.setMonth(nextTarget.getMonth() + 1);
      }

      while (today >= nextTarget) {
        const env = envelopes.find(e => e.id === req.envelopeId);
        const cat = env ? env.category : 'Needs';

        txs.push({
          id: generateId(),
          date: nextTarget.toISOString(),
          type: 'Gasto',
          category: cat,
          label: req.label + ' (Auto)',
          amount: req.amount,
          goalId: null,
          envelopeId: req.envelopeId
        });
        
        req.lastProcessed = nextTarget.toISOString();
        updated = true;
        nextTarget.setMonth(nextTarget.getMonth() + 1);
      }
    });

    if (updated) {
      safeSetItem('vg_recurring', JSON.stringify(recurring));
      safeSetItem('vg_transactions', JSON.stringify(txs)); this._triggerUpdate();
      return true;
    }
    return false;
  },

  async getEnvelopes() {
    return safeGetItem('vg_envelopes', []);
  },

  // --------------------------

  async addTransaction(tx) {
    const prevBudget = await this.getBudget();
    
    const txs = safeGetItem('vg_transactions', []);
    const now = new Date();
    const dateStr = tx.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    txs.push({ id: generateId(), date: dateStr, goalId: null, envelopeId: null, ...tx });
    safeSetItem('vg_transactions', JSON.stringify(txs)); this._triggerUpdate();
    
    const newBudget = await this.getBudget();
    let triggerAlert = null;
    if (prevBudget.alertLevel !== newBudget.alertLevel && (newBudget.alertLevel === 'warning' || newBudget.alertLevel === 'exceeded')) {
      const prevLvl = prevBudget.alertLevel === 'none' ? 0 : (prevBudget.alertLevel === 'ok' ? 1 : (prevBudget.alertLevel === 'warning' ? 2 : 3));
      const newLvl = newBudget.alertLevel === 'warning' ? 2 : 3;
      if (newLvl > prevLvl) triggerAlert = newBudget.alertLevel;
    }
    return { triggerAlert, excessAmount: newBudget.expenses + newBudget.savedThisMonth - newBudget.budgeted };
  },
  
  async updateTransaction(id, data) {
    const prevBudget = await this.getBudget();
    let txs = safeGetItem('vg_transactions', []);
    const idx = txs.findIndex(t => t.id === id);
    if(idx > -1) {
      txs[idx] = { ...txs[idx], ...data };
      safeSetItem('vg_transactions', JSON.stringify(txs)); this._triggerUpdate();
    }
    const newBudget = await this.getBudget();
    let triggerAlert = null;
    if (prevBudget.alertLevel !== newBudget.alertLevel && (newBudget.alertLevel === 'warning' || newBudget.alertLevel === 'exceeded')) {
      const prevLvl = prevBudget.alertLevel === 'none' ? 0 : (prevBudget.alertLevel === 'ok' ? 1 : (prevBudget.alertLevel === 'warning' ? 2 : 3));
      const newLvl = newBudget.alertLevel === 'warning' ? 2 : 3;
      if (newLvl > prevLvl) triggerAlert = newBudget.alertLevel;
    }
    return { triggerAlert, excessAmount: newBudget.expenses + newBudget.savedThisMonth - newBudget.budgeted };
  },

  async deleteTransaction(id) {
    let txs = safeGetItem('vg_transactions', []);
    const tx = txs.find(t => t.id === id);
    if (!tx) return {};

    txs = txs.filter(t => t.id !== id);
    safeSetItem('vg_transactions', JSON.stringify(txs)); this._triggerUpdate();
    
    // Revertir transferencia manualmente
    if (tx.type === 'Transfer') {
      let envs = await this.getEnvelopes();
      let fromIdx = envs.findIndex(e => e.id === tx.fromEnvelopeId);
      let toIdx = envs.findIndex(e => e.id === tx.toEnvelopeId);
      if (fromIdx > -1) envs[fromIdx].assignedAmount = (Number(envs[fromIdx].assignedAmount) || 0) + Number(tx.amount);
      if (toIdx > -1) envs[toIdx].assignedAmount = (Number(envs[toIdx].assignedAmount) || 0) - Number(tx.amount);
      safeSetItem('vg_envelopes', JSON.stringify(envs));
      this._triggerUpdate();
    }
    
    return {};
  },

  async getSavingsGoals() {
    const goals = safeGetItem('vg_savings_goals', []);
    return goals.map(g => {
      const c = Number(g.currentAmount) || 0;
      const t = Number(g.targetAmount) || 0;
      return { ...g, currentAmount: c, targetAmount: t, completed: c >= t && t > 0 };
    });
  },
  
  async createGoal(goal) {
    const goals = safeGetItem('vg_savings_goals', []);
    goals.push({ id: generateId(), ...goal });
    safeSetItem('vg_savings_goals', JSON.stringify(goals)); this._triggerUpdate();
  },
  
  async updateGoal(id, data) {
    let goals = safeGetItem('vg_savings_goals', []);
    const idx = goals.findIndex(g => g.id === id);
    if(idx > -1) {
      goals[idx] = { ...goals[idx], ...data };
      safeSetItem('vg_savings_goals', JSON.stringify(goals)); this._triggerUpdate();
    }
  },

  async deleteGoal(id) {
    let goals = safeGetItem('vg_savings_goals', []);
    goals = goals.filter(g => g.id !== id);
    safeSetItem('vg_savings_goals', JSON.stringify(goals)); this._triggerUpdate();
  },
  
  async contributeToGoal(goalId, amount, label = '') {
    const prevBudget = await this.getBudget();
    let goals = safeGetItem('vg_savings_goals', []);
    const goal = goals.find(g => g.id === goalId);
    if(goal) {
      goal.currentAmount = (Number(goal.currentAmount) || 0) + amount;
      safeSetItem('vg_savings_goals', JSON.stringify(goals)); this._triggerUpdate();
      
      const txs = safeGetItem('vg_transactions', []);
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      txs.push({ id: generateId(), date: dateStr, type: 'Gasto', category: 'Savings', label: label || goal.name, amount: amount, goalId: goal.id, envelopeId: null });
      safeSetItem('vg_transactions', JSON.stringify(txs)); this._triggerUpdate();
    }
    const newBudget = await this.getBudget();
    let triggerAlert = null;
    if (prevBudget.alertLevel !== newBudget.alertLevel && (newBudget.alertLevel === 'warning' || newBudget.alertLevel === 'exceeded')) {
      const prevLvl = prevBudget.alertLevel === 'none' ? 0 : (prevBudget.alertLevel === 'ok' ? 1 : (prevBudget.alertLevel === 'warning' ? 2 : 3));
      const newLvl = newBudget.alertLevel === 'warning' ? 2 : 3;
      if (newLvl > prevLvl) triggerAlert = newBudget.alertLevel;
    }
    return { triggerAlert, excessAmount: newBudget.expenses + newBudget.savedThisMonth - newBudget.budgeted };
  },

  getHistoricalSummaryByEnvelope(envelopeId, monthsBack = 6) {
    const txsAll = safeGetItem('vg_transactions', []);
    let result = [];
    const now = new Date();
    for(let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const txs = txsAll.filter(t => t.date && t.date.startsWith(mStr) && t.envelopeId === envelopeId && t.type === 'Gasto');
      let exp = 0;
      txs.forEach(t => exp += toSafeNumber(t.amount));
      result.push(exp);
    }
    return result;
  },

  getHistoricalSummary(monthsBack = 6) {
    const txsAll = safeGetItem('vg_transactions', []);
    let result = [];
    const now = new Date();
    let hasDataBeforeCurrent = false;

    for(let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const txs = txsAll.filter(t => t.date && t.date.startsWith(mStr));
      if (i > 0 && txs.length > 0) hasDataBeforeCurrent = true;

      let inc = 0; let exp = 0; let sav = 0;
      txs.forEach(t => {
        const amt = toSafeNumber(t.amount);
        if (t.type === 'Ingreso') inc += amt;
        else if (t.category === 'Savings') sav += amt;
        else exp += amt;
      });
      result.push({ month: mStr, income: inc, expenses: exp, saved: sav });
    }
    
    return { data: result, hasEnoughData: hasDataBeforeCurrent };
  },

  // --- AGE OF MONEY ---
  getAgeOfMoney(txsAll) {
    if (!txsAll) txsAll = safeGetItem('vg_transactions', []);
    
    // Función auxiliar de limpieza robusta (por si hay transacciones viejas mal formadas)
    const safeNum = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    const isValidDate = (d) => {
      const date = new Date(d);
      return date instanceof Date && !isNaN(date);
    };

    const incomes = txsAll
      .filter(t => t.type === 'Ingreso' && isValidDate(t.date))
      .map(t => ({ ...t, amt: safeNum(t.amount) }))
      .filter(t => t.amt > 0)
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    const expenses = txsAll
      .filter(t => t.type === 'Gasto' && t.category !== 'Savings' && isValidDate(t.date))
      .map(t => ({ ...t, amt: safeNum(t.amount) }))
      .filter(t => t.amt > 0)
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    if (incomes.length === 0 || expenses.length === 0) return 0;

    let incomeIdx = 0;
    let ages = [];

    for (let exp of expenses) {
      let remainingExp = exp.amt;
      let expDate = new Date(exp.date);
      
      while (remainingExp > 0 && incomeIdx < incomes.length) {
        let inc = incomes[incomeIdx];
        let incDate = new Date(inc.date);
        
        let diffTime = expDate.getTime() - incDate.getTime();
        let diffDays = Math.max(0, Math.floor(diffTime / (1000 * 3600 * 24)));

        if (inc.amt >= remainingExp) {
          inc.amt -= remainingExp;
          ages.push(diffDays);
          remainingExp = 0;
        } else {
          remainingExp -= inc.amt;
          ages.push(diffDays);
          incomeIdx++;
        }
      }
    }

    if (ages.length === 0) return 0;
    // Filtrar por si acaso se nos coló algún NaN en el array
    ages = ages.filter(a => !isNaN(a));
    if (ages.length === 0) return 0;

    const last10 = ages.slice(-10);
    const sum = last10.reduce((a, b) => a + b, 0);
    return Math.round(sum / last10.length);
  },

    // --- ENTRENAMIENTO (RUTINAS Y SESIONES) ---
  async getRutinas(categoria) {
    const rutinas = safeGetItem('vg_routines', []);
    if (!categoria) return rutinas;
    return rutinas.filter(r => r.categoria === categoria);
  },
  async crearRutina(data) {
    const rutinas = safeGetItem('vg_routines', []);
    const newRutina = {
      id: generateId(),
      nombre: data.nombre || 'Rutina Sin Nombre',
      categoria: data.categoria || 'gym', // gym, calistenia, hiit
      ejercicios: data.ejercicios || [], // [{nombre, series: [...]}]
      hiitSettings: data.hiitSettings || null // NUEVO
    };
    rutinas.push(newRutina);
    safeSetItem('vg_routines', JSON.stringify(rutinas));
    this._triggerUpdate();
    return newRutina;
  },
  async eliminarRutina(id) {
    let rutinas = safeGetItem('vg_routines', []);
    rutinas = rutinas.filter(r => r.id !== id);
    safeSetItem('vg_routines', JSON.stringify(rutinas));
    this._triggerUpdate();
  },
  async getSesiones() {
    return safeGetItem('vg_sessions', []).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  },
  async getUltimoRegistro(ejercicioNombre) {
    const sesiones = safeGetItem('vg_sessions', []).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    for (let s of sesiones) {
      if (s.ejercicios) {
        const ej = s.ejercicios.find(e => e.nombre.toLowerCase() === ejercicioNombre.toLowerCase());
        if (ej && ej.series && ej.series.length > 0) {
          return ej;
        }
      }
    }
    return null;
  },
  async registrarSesion(data) {
    const sesiones = safeGetItem('vg_sessions', []);
    const now = new Date();
    const newSesion = {
      id: generateId(),
      rutinaId: data.rutinaId,
      nombreRutina: data.nombreRutina || 'Entrenamiento',
      fecha: data.fecha || now.toISOString(),
      duracionMin: data.duracionMin || 0,
      completado: data.completado || false,
      ejercicios: data.ejercicios || [] // NUEVO: guardar detalle real
    };
    sesiones.push(newSesion);
    safeSetItem('vg_sessions', JSON.stringify(sesiones));
    this._triggerUpdate();
    return newSesion;
  },



  // --- BACKUP & RESTORE ---
  async exportarDatos() {
    return {
      transacciones: safeGetItem('vg_transactions', []),
      categorias: safeGetItem('vg_categories', []),
      presupuestos: safeGetItem('vg_budgets', []),
      metasAhorro: safeGetItem('vg_savings_goals', []),
      sobres: safeGetItem('vg_envelopes', []),
      recurrentes: safeGetItem('vg_recurring', []),
      configuracion: safeGetItem('vg_settings', {}),
      rutinas: safeGetItem('vg_routines', []),
      sesiones: safeGetItem('vg_sessions', [])
    };
  },

  async importarDatos(jsonData) {
    if (!jsonData) throw new Error("JSON vacío");
    
    if (jsonData.transacciones) safeSetItem('vg_transactions', JSON.stringify(jsonData.transacciones));
    if (jsonData.categorias) safeSetItem('vg_categories', JSON.stringify(jsonData.categorias));
    if (jsonData.presupuestos) safeSetItem('vg_budgets', JSON.stringify(jsonData.presupuestos));
    if (jsonData.metasAhorro) safeSetItem('vg_savings_goals', JSON.stringify(jsonData.metasAhorro));
    if (jsonData.sobres) safeSetItem('vg_envelopes', JSON.stringify(jsonData.sobres));
    if (jsonData.recurrentes) safeSetItem('vg_recurring', JSON.stringify(jsonData.recurrentes));
    if (jsonData.configuracion) safeSetItem('vg_settings', JSON.stringify(jsonData.configuracion));
    if (jsonData.rutinas) safeSetItem('vg_routines', JSON.stringify(jsonData.rutinas));
    if (jsonData.sesiones) safeSetItem('vg_sessions', JSON.stringify(jsonData.sesiones));
    if (this._triggerUpdate) this._triggerUpdate();
    return true;
  },

  // --- ANALYTICS ENTRENAMIENTO (FASE 1) ---

  async detectarNecesidadDeload() {
    // Calculamos volumen total de las últimas 4 semanas de forma independiente.
    // W1 (más antigua) a W4 (más reciente)
    const sesiones = safeGetItem('vg_sessions', []);
    const now = new Date();
    const weeks = [0, 0, 0, 0]; // index 3 = current week, index 0 = 3 weeks ago
    
    sesiones.forEach(s => {
      const sDate = new Date(s.fecha);
      const diffDays = (now - sDate) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays < 28) {
        const weekIndex = 3 - Math.floor(diffDays / 7);
        if (s.ejercicios) {
          s.ejercicios.forEach(ej => {
            ej.series.forEach(serie => {
              const p = Number(serie.peso) || 0;
              const match = String(serie.reps).match(/\d+/);
              const r = match ? parseInt(match[0]) : 0;
              weeks[weekIndex] += (p > 0 ? p * r : r);
            });
          });
        }
      }
    });

    // Validar si subió consecutivamente: W1 < W2 < W3 < W4
    // Solo si hay suficiente volumen como para ser significativo
    if (weeks[0] > 100 && weeks[0] < weeks[1] && weeks[1] < weeks[2] && weeks[2] < weeks[3]) {
      return true;
    }
    return false;
  },



  async sugerirProgresion(ejercicioNombre) {
    const nomClean = ejercicioNombre.toLowerCase().trim();
    const sesiones = safeGetItem('vg_sessions', []).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    
    for (const s of sesiones) {
      if (!s.ejercicios) continue;
      const ej = s.ejercicios.find(e => e.nombre.toLowerCase().trim() === nomClean);
      if (ej && ej.series && ej.series.length > 0) {
        let isHard = false;
        let pMax = 0;
        let rMax = 0;
        let maxRpe = 0;
        
        ej.series.forEach(serie => {
          const p = Number(serie.peso) || 0;
          const match = String(serie.reps).match(/\d+/);
          const r = match ? parseInt(match[0]) : 0;
          const rp = serie.rpe ? parseInt(serie.rpe) : 0;
          
          if (p > pMax) pMax = p;
          if (p === 0 && r > rMax) rMax = r;
          
          if (rp > maxRpe) maxRpe = rp;
        });
        
        let increment = 2.5;
        let repsIncr = 1;
        
        if (maxRpe > 0) {
          if (maxRpe <= 7) { increment = pMax > 0 ? Math.max(2.5, pMax * 0.05) : 0; repsIncr = 2; }
          else if (maxRpe >= 9) { isHard = true; }
        } else {
          isHard = ej.series.some(s => s.tipo === 'fallo' || (s.rpe && parseInt(s.rpe) >= 9));
        }
        
        if (isHard) {
          return { accion: 'mantener', peso: pMax, reps: rMax };
        } else {
          return { accion: 'aumentar', peso: pMax > 0 ? pMax + increment : 0, reps: pMax === 0 ? rMax + repsIncr : 0 };
        }
      }
    }
    return null;
  },

  estimar1RM(peso, reps) {
    const p = Number(peso) || 0;
    const r = Number(reps) || 0;
    if (p <= 0 || r <= 0) return 0;
    if (r === 1) return p;
    return Math.round(p * (1 + r / 30));
  },

  async getRachaHiit() {
    const rutinas = safeGetItem('vg_routines', []);
    const hitIds = rutinas.filter(r => r.categoria === 'hiit').map(r => r.id);
    const sesiones = safeGetItem('vg_sessions', []);
    const sesionesHiit = sesiones.filter(s => hitIds.includes(s.rutinaId) || s.nombreRutina.toLowerCase().includes('hiit') || s.nombreRutina.toLowerCase().includes('tabata'));
    
    // Group by unique day
    const uniqueDays = new Set();
    sesionesHiit.forEach(s => {
      const d = new Date(s.fecha);
      d.setHours(0,0,0,0);
      uniqueDays.add(d.getTime());
    });
    const sortedDays = Array.from(uniqueDays).sort((a,b) => b - a); // newest first
    
    let actual = 0;
    let mejor = 0;
    let tempMejor = 0;
    
    // Calculate current streak
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();
    
    let checkTime = todayTime;
    let index = 0;
    
    // Current streak can start today or yesterday
    if (sortedDays[0] === todayTime || sortedDays[0] === todayTime - 86400000) {
      if (sortedDays[0] === todayTime) {
        checkTime = todayTime;
      } else {
        checkTime = todayTime - 86400000;
      }
      
      while (index < sortedDays.length && sortedDays[index] === checkTime) {
        actual++;
        checkTime -= 86400000;
        index++;
      }
    }
    
    // Calculate best streak
    if (sortedDays.length > 0) {
      tempMejor = 1;
      mejor = 1;
      for (let i = 0; i < sortedDays.length - 1; i++) {
        if (sortedDays[i] - sortedDays[i+1] === 86400000) {
          tempMejor++;
          if (tempMejor > mejor) mejor = tempMejor;
        } else {
          tempMejor = 1;
        }
      }
    }
    
    return { actual, mejor };
  },

  // Racha de días consecutivos con al menos una sesión, sin filtrar por
  // categoría (a diferencia de getRachaHiit). Misma lógica de cómputo.
  async getRachaGeneral() {
    const sesiones = safeGetItem('vg_sessions', []);

    const uniqueDays = new Set();
    sesiones.forEach(s => {
      const d = new Date(s.fecha);
      d.setHours(0, 0, 0, 0);
      uniqueDays.add(d.getTime());
    });
    const sortedDays = Array.from(uniqueDays).sort((a, b) => b - a);
    if (sortedDays.length === 0) return { actual: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    let actual = 0;
    let checkTime = todayTime;
    let index = 0;

    if (sortedDays[0] === todayTime || sortedDays[0] === todayTime - 86400000) {
      checkTime = sortedDays[0];
      while (index < sortedDays.length && sortedDays[index] === checkTime) {
        actual++;
        checkTime -= 86400000;
        index++;
      }
    }

    return { actual };
  },

  // Sesiones completadas esta semana (lunes-domingo) por categoría, para
  // los anillos de progreso semanal en la vista de Entreno.
  async getResumenEntrenoSemanal() {
    const rutinas = safeGetItem('vg_routines', []);
    const catMap = {};
    rutinas.forEach(r => catMap[r.id] = r.categoria);

    const sesiones = safeGetItem('vg_sessions', []);
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const counts = { gym: 0, calistenia: 0, hiit: 0 };
    sesiones.forEach(s => {
      const sDate = new Date(s.fecha);
      if (sDate < startOfWeek) return;
      let cat = catMap[s.rutinaId];
      if (!cat && s.nombreRutina) {
        const n = s.nombreRutina.toLowerCase();
        if (n.includes('tabata') || n.includes('emom') || n.includes('amrap') || n.includes('hiit')) cat = 'hiit';
      }
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  },

  async getTendenciaSemanal(categoria, semanas = 8) {
    const rutinas = safeGetItem('vg_routines', []);
    const catMap = {};
    rutinas.forEach(r => catMap[r.id] = r.categoria);

    const sesiones = safeGetItem('vg_sessions', []);
    const now = new Date();
    const volumenPorSemana = Array.from({ length: semanas }, () => 0);
    const minutosPorSemana = Array.from({ length: semanas }, () => 0);

    sesiones.forEach(s => {
      let cat = catMap[s.rutinaId];
      if (!cat && s.nombreRutina) {
        const n = s.nombreRutina.toLowerCase();
        if (n.includes('tabata') || n.includes('emom') || n.includes('amrap') || n.includes('hiit')) cat = 'hiit';
      }
      if (categoria && cat !== categoria) return;

      const sDate = new Date(s.fecha);
      const diffDays = (now - sDate) / (1000 * 60 * 60 * 24);
      const weekIdx = semanas - 1 - Math.floor(diffDays / 7);
      if (weekIdx < 0 || weekIdx >= semanas) return;

      minutosPorSemana[weekIdx] += Number(s.duracionMin) || 0;

      (s.ejercicios || []).forEach(ej => {
        (ej.series || []).forEach(serie => {
          const p = Number(serie.peso) || 0;
          const match = String(serie.reps).match(/\d+/);
          const r = match ? parseInt(match[0]) : 0;
          volumenPorSemana[weekIdx] += (p > 0 ? p * r : r);
        });
      });
    });

    return { volumenPorSemana, minutosPorSemana };
  },

  async getProyeccionRecurrentes() {
    const recurring = await this.getRecurring();
    const envs = await this.getEnvelopes();
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(now.getDate() + 7);
    
    let alerts = [];
    
    recurring.forEach(r => {
      if (r.type === 'Gasto' && r.envelopeId) {
        const nextDate = new Date(r.nextDate);
        if (nextDate >= now && nextDate <= in7Days) {
          const env = envs.find(e => e.id === r.envelopeId);
          if (env) {
            const available = env.assignedAmount - env.spent;
            if (r.amount > available) {
              alerts.push({
                name: r.name,
                amount: r.amount,
                date: r.nextDate,
                envelopeName: env.name,
                shortfall: r.amount - available
              });
            }
          }
        }
      }
    });
    return alerts;
  },

  async getVolumenPorGrupo(rangoDias) {
    const sesiones = safeGetItem('vg_sessions', []);
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - rangoDias);

    const volumen = { pecho: 0, espalda: 0, hombros: 0, piernas: 0, brazos: 0, core: 0, otro: 0 };
    const balance = { empuje: 0, traccion: 0, piernas: 0, core: 0, otro: 0 };

    sesiones.forEach(s => {
      const sDate = new Date(s.fecha);
      if (sDate >= startDate && sDate <= now) {
        if (s.ejercicios) {
          s.ejercicios.forEach(ej => {
            const meta = getEjercicioMetadata(ej.nombre);
            if (volumen[meta.grupoMuscular] !== undefined) volumen[meta.grupoMuscular] += ej.series.length;
            else volumen.otro += ej.series.length;
            
            if (balance[meta.patron] !== undefined) balance[meta.patron] += ej.series.length;
            else balance.otro += ej.series.length;
          });
        }
      }
    });
    return { volumen, balance };
  },

  async getPRs() {
    const sesiones = safeGetItem('vg_sessions', []);
    const prs = {};
    
    sesiones.forEach(s => {
      if (s.ejercicios) {
        s.ejercicios.forEach(ej => {
          const nombre = ej.nombre.toLowerCase().trim();
          if (!prs[nombre]) prs[nombre] = { pesoMax: 0, repsMax: 0, fecha: s.fecha };
          
          ej.series.forEach(serie => {
            const peso = Number(serie.peso) || 0;
            const repsStr = String(serie.reps).trim();
            const match = repsStr.match(/\d+/);
            const reps = match ? parseInt(match[0]) : 0;
            
            if (peso > prs[nombre].pesoMax) {
              prs[nombre].pesoMax = peso;
              prs[nombre].repsMax = reps;
              prs[nombre].fecha = s.fecha;
            } else if (peso === prs[nombre].pesoMax && peso > 0) {
               if (reps > prs[nombre].repsMax) {
                 prs[nombre].repsMax = reps;
                 prs[nombre].fecha = s.fecha;
               }
            } else if (peso === 0 && prs[nombre].pesoMax === 0) {
              if (reps > prs[nombre].repsMax) {
                 prs[nombre].repsMax = reps;
                 prs[nombre].fecha = s.fecha;
              }
            }
          });
        });
      }
    });
    return prs;
  },


  async getMejorAmrap(rutinaId) {
    const sesiones = safeGetItem('vg_sessions', []);
    let maxRondas = 0;
    
    sesiones.forEach(s => {
      if (s.rutinaId === rutinaId && s.ejercicios && s.ejercicios.length > 0) {
        // En HIIT dummy, guardamos las rondas en reps del primer ejercicio
        const repsVal = s.ejercicios[0].series && s.ejercicios[0].series[0] ? Number(s.ejercicios[0].series[0].reps) : 0;
        if (repsVal > maxRondas) {
          maxRondas = repsVal;
        }
      }
    });
    
    return maxRondas;
  },

  async getHistorialEjercicio(nombre) {
    const nomClean = nombre.toLowerCase().trim();
    const sesiones = safeGetItem('vg_sessions', []).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    const historial = [];

    sesiones.forEach(s => {
      if (s.ejercicios) {
        const ej = s.ejercicios.find(e => e.nombre.toLowerCase().trim() === nomClean);
        if (ej && ej.series && ej.series.length > 0) {
          let pesoMax = -9999;
          let repsEnPesoMax = 0;
          let repsForBodyweight = 0;
          let volumenTotal = 0;

          ej.series.forEach(serie => {
            const peso = Number(serie.peso) || 0;
            const match = String(serie.reps).match(/\d+/);
            const reps = match ? parseInt(match[0]) : 0;

            if (peso > pesoMax) { pesoMax = peso; repsEnPesoMax = reps; }
            else if (peso === pesoMax && reps > repsEnPesoMax) { repsEnPesoMax = reps; }
            if (peso === 0 && reps > repsForBodyweight) repsForBodyweight = reps;
            volumenTotal += (peso > 0 ? peso * reps : reps);
          });

          if (pesoMax === -9999) pesoMax = 0;

          historial.push({
            fecha: s.fecha,
            pesoMax,
            repsEnPesoMax,
            repsMax: repsForBodyweight,
            volumenTotal,
            seriesCount: ej.series.length
          });
        }
      }
    });
    return historial;
  },

  // --- TAREAS ---
  async getTasks() {
    return safeGetItem('vg_tasks', []);
  },

  async saveTask(data) {
    let tasks = safeGetItem('vg_tasks', []);
    if (data.id) {
      const idx = tasks.findIndex(t => t.id === data.id);
      if (idx > -1) {
        tasks[idx] = { ...tasks[idx], ...data };
        safeSetItem('vg_tasks', JSON.stringify(tasks)); this._triggerUpdate();
        return tasks[idx];
      }
    }
    const newTask = { id: generateId(), createdAt: new Date().toISOString(), ...data };
    tasks.push(newTask);
    safeSetItem('vg_tasks', JSON.stringify(tasks)); this._triggerUpdate();
    return newTask;
  },

  async deleteTask(id) {
    let tasks = safeGetItem('vg_tasks', []);
    tasks = tasks.filter(t => t.id !== id);
    safeSetItem('vg_tasks', JSON.stringify(tasks)); this._triggerUpdate();
  },

  async updateTaskStatus(id, status) {
    let tasks = safeGetItem('vg_tasks', []);
    const idx = tasks.findIndex(t => t.id === id);
    if (idx > -1) {
      tasks[idx].status = status;
      safeSetItem('vg_tasks', JSON.stringify(tasks)); this._triggerUpdate();
    }
  },

  async getBudget(monthFilter = null) {
    await this.processRecurringTransactions();
    const txsAll = safeGetItem('vg_transactions', []);
    
    if (!monthFilter) {
      const now = new Date();
      monthFilter = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const txs = txsAll.filter(t => t.date && t.date.startsWith(monthFilter));
    
    // Calculate previous month trend
    const [y, m] = monthFilter.split('-');
    let prevDate = new Date(parseInt(y), parseInt(m) - 2);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevTxs = txsAll.filter(t => t.date && t.date.startsWith(prevMonthStr));
    
    let prevExpenses = 0;
    prevTxs.forEach(t => { 
      if(t.type !== 'Ingreso' && t.category !== 'Savings') prevExpenses += toSafeNumber(t.amount); 
    });
    
    let income = 0; let expenses = 0;
    let needs = 0; let wants = 0; let savings = 0;
    
    const breakdown = [...txs].sort((a,b) => b.date.localeCompare(a.date));

    txs.forEach(t => {
      const amt = toSafeNumber(t.amount);
      if (t.type === 'Ingreso') {
        income += amt;
      } else if (t.category === 'Savings') {
        savings += amt;
      } else {
        expenses += amt;
        if (t.category === 'Needs') needs += amt;
        if (t.category === 'Wants') wants += amt;
      }
    });

    const budgeted = income;
    const savedThisMonth = savings;
    const remaining = budgeted - expenses - savedThisMonth;
    const rule = await this.getAllocationRule();
    
    const rawEnvelopes = await this.getEnvelopes();
    const envelopes = rawEnvelopes.map(env => {
      const assignedAmount = Number(env.assignedAmount) || 0;
      let spent = 0;
      txs.forEach(t => {
        if (t.envelopeId === env.id && t.type === 'Gasto') spent += toSafeNumber(t.amount);
      });
      return { ...env, assignedAmount, spent, balance: assignedAmount - spent };
    });
    // -------------------------------------------------------------
    // -------------------------------------------------------------

    let trend = null;
    if (prevExpenses > 0) {
      const diff = expenses - prevExpenses;
      const pct = Math.round((diff / prevExpenses) * 100);
      trend = { pct: Math.abs(pct), isUp: diff > 0 };
    }

    let alertLevel = 'none';
    if (budgeted > 0) {
      const usedRatio = (expenses + savedThisMonth) / budgeted;
      if (usedRatio >= 1) alertLevel = 'exceeded';
      else if (usedRatio >= 0.8) alertLevel = 'warning';
      else alertLevel = 'ok';
    }
    
    const goals = await this.getSavingsGoals();
    const recurring = await this.getRecurring();
    const ageOfMoney = this.getAgeOfMoney(txsAll);

    return {
      currentMonth: monthFilter,
      alertLevel,
      trend,
      income, expenses, savedThisMonth, budgeted, balance: remaining, remaining, rule,
      goals,
      recurring,
      ageOfMoney,
      
      envelopes, // NUEVO
      budgetTarget: {
        needs: income * rule.needs,
        wants: income * rule.wants,
        savings: income * rule.savings
      },
      allocations: [
        { category: 'Needs', amount: needs, percent: budgeted ? Math.round((needs/budgeted)*100) : 0 },
        { category: 'Wants', amount: wants, percent: budgeted ? Math.round((wants/budgeted)*100) : 0 },
        { category: 'Savings', amount: savings, percent: budgeted ? Math.round((savings/budgeted)*100) : 0 }
      ],
      breakdown
    };
  }
};