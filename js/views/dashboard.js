import { db } from '../core/db.js';
import { formatCurrency, formatCompactCurrency } from '../utils/currency.js';
import { renderProgressRing } from '../utils/progressRing.js';
import { WEEKLY_GOALS } from '../core/trainingConfig.js';
import { ensureChartJs, appPalette, baseChartOptions } from '../utils/charts.js';

let rachaGlobalChartInstance = null;

// Insignias sobrias: sin niveles, sin copy de videojuego. Bloqueada = ícono
// atenuado en gris; desbloqueada = mismo ícono con el color de acento.
const BADGE_META = {
  racha_7: { icon: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>`, color: 'var(--accent-orange)' },
  primera_meta: { icon: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>`, color: 'var(--accent-purple)' },
  mes_sin_exceder: { icon: `<circle cx="12" cy="12" r="10"></circle><polyline points="9 12 11 14 15 10"></polyline>`, color: 'var(--state-success)' },
  diez_sesiones: { icon: `<path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><rect x="4" y="2" width="4" height="20" rx="1"></rect><rect x="16" y="2" width="4" height="20" rx="1"></rect>`, color: 'var(--accent-teal)' }
};

function saludoPorHora() {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Misma escala verde/ámbar/rojo que las barras de categoría en
// Finanzas > Presupuesto, para que la barra miniatura del dashboard se
// lea igual que el detalle.
function colorAlerta(nivel) {
  if (nivel === 'exceeded') return 'var(--state-high)';
  if (nivel === 'warning') return 'var(--state-medium)';
  return 'var(--state-low)';
}

export async function render() {
  const [budget, stats, sesiones, resumenSemanal, racha, rachaGlobal, badges] = await Promise.all([
    db.getBudget(),
    db.getDashboardStats(),
    db.getSesiones(),
    db.getResumenEntrenoSemanal(),
    db.getRachaGeneral(),
    db.getRachaGlobal(),
    db.getBadges()
  ]);

  const sesionesSemanaTotal = Object.values(resumenSemanal).reduce((a, b2) => a + b2, 0);
  const metaSemanaTotal = Object.values(WEEKLY_GOALS).reduce((a, b2) => a + b2, 0);

  const ultimoEntreno = sesiones[0] || null;
  const ultimaTx = (budget.breakdown && budget.breakdown[0]) || null;

  const usado = budget.expenses + budget.savedThisMonth;
  const alertasCaja = await db.getProyeccionRecurrentes();

  const ultimoEntrenoFechaStr = ultimoEntreno
    ? new Date(ultimoEntreno.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
    : null;

  let alertasHtml = '';
  if (alertasCaja && alertasCaja.length > 0) {
    alertasHtml = `
      <div class="card" style="padding: 16px; margin-bottom: 20px; border-radius: 18px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; gap: 14px;">
        <div class="icon-chip" style="width: 36px; height: 36px; background: rgba(239, 68, 68, 0.18); color: var(--state-high); flex-shrink: 0;">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 12px; font-weight: 700; color: var(--state-high); margin-bottom: 4px;">Alerta de Flujo de Caja (7 días)</div>
          ${alertasCaja.map(a => `<div style="font-size: 12px; color: var(--text-primary); margin-top:4px; line-height: 1.4;">El pago <b>${a.name}</b> (${formatCurrency(a.amount)}) excederá el saldo del sobre <b>${a.envelopeName}</b>. Faltan ${formatCurrency(a.shortfall)}.</div>`).join('')}
        </div>
      </div>
    `;
  }

  const pct = budget.budgeted > 0 ? Math.round((usado / budget.budgeted) * 100) : 0;
  const pctBar = Math.min(pct, 100);
  const colorFin = colorAlerta(budget.alertLevel);

  const rachaHtml = stats.rachaSemanas > 0
    ? `<svg width="13" height="13" fill="none" stroke="var(--accent-orange)" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>${stats.rachaSemanas} semana${stats.rachaSemanas === 1 ? '' : 's'} de racha`
    : 'Empieza tu semana con una sesión';

  return `
    <div style="padding: 20px 20px 8px; font-family: var(--font-body); color: var(--text-primary);">

      <!-- Greeting -->
      <div style="margin-bottom: 20px;">
        <h1 style="font-family: var(--font-display); font-size: 30px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${saludoPorHora()}, Benjamín</h1>
        <div style="font-size: 13px; color: var(--text-secondary); font-weight: 600; margin-top: 4px; display: flex; align-items: center;">
          ${rachaHtml}
        </div>
      </div>

      ${alertasHtml}

      <!-- Racha global (con glow radial sutil detrás) -->
      <div style="position: relative; margin-bottom: 16px;">
        <div style="position: absolute; inset: -18px; background: radial-gradient(circle at 28% 25%, rgba(168, 85, 247, 0.16), transparent 68%); filter: blur(18px); z-index: 0; pointer-events: none;"></div>
        <div class="card" style="position: relative; z-index: 1; padding: 16px 18px; margin-bottom: 0; border-radius: 18px; display: flex; align-items: center; gap: 16px;">
          <div style="flex-shrink: 0;">
            <div style="font-size: 26px; font-weight: 800; color: var(--text-primary); line-height: 1;">${rachaGlobal.actual}</div>
            <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-top: 2px; white-space: nowrap;">día${rachaGlobal.actual === 1 ? '' : 's'} de racha</div>
          </div>
          <div style="flex: 1; height: 40px; min-width: 0;"><canvas id="chart-racha-global"></canvas></div>
        </div>
      </div>

      <!-- Insignias -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 2px;">
        ${badges.map(b => `
          <div title="${b.label}" style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 68px; text-align: center;">
            <div style="width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: ${b.unlocked ? `${BADGE_META[b.id].color}1f` : 'var(--surface-2)'}; color: ${b.unlocked ? BADGE_META[b.id].color : 'var(--text-disabled)'}; border: 1px solid ${b.unlocked ? 'transparent' : 'var(--surface-border)'};">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">${BADGE_META[b.id].icon}</svg>
            </div>
            <div style="font-size: 9.5px; font-weight: 600; color: ${b.unlocked ? 'var(--text-secondary)' : 'var(--text-disabled)'}; line-height: 1.25;">${b.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- Quick Actions -->
      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <button id="qa-gasto" class="tappable card" style="flex: 1; padding: 14px; border-radius: 16px; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; margin-bottom: 0;">
          <div class="icon-chip" style="width: 26px; height: 26px; background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); flex-shrink: 0;">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          Registrar gasto
        </button>
        <button id="qa-entreno" class="tappable card" style="flex: 1; padding: 14px; border-radius: 16px; font-family: inherit; font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; margin-bottom: 0;">
          <div class="icon-chip" style="width: 26px; height: 26px; background: rgba(6, 182, 212, 0.15); color: var(--accent-teal); flex-shrink: 0;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          Entrenar ahora
        </button>
      </div>

      <!-- SPLIT CARDS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">

        <!-- ENTRENAMIENTO -->
        <div id="card-entreno" class="card tappable" style="padding: 18px 16px; display: flex; flex-direction: column; border-radius: 20px;">
          <div class="flex-between" style="margin-bottom: 4px;">
            <h3 style="font-size: 10.5px; font-weight: 700; color: var(--text-secondary); letter-spacing: 1px; margin: 0;">ENTRENAMIENTO</h3>
            <span style="color: var(--text-secondary);"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 10h3v4h-3M3 10H0v4h3"></path><rect x="3" y="8" width="4" height="8" rx="1"></rect><rect x="17" y="8" width="4" height="8" rx="1"></rect><line x1="7" y1="12" x2="17" y2="12"></line></svg></span>
          </div>
          <div style="width: 18px; height: 2px; background: var(--accent-teal); margin-bottom: 12px; border-radius: 1px;"></div>

          <div style="display: flex; justify-content: center; margin-bottom: 10px;">
            ${renderProgressRing({
              percent: metaSemanaTotal > 0 ? Math.min(100, (sesionesSemanaTotal / metaSemanaTotal) * 100) : 0,
              color: 'var(--accent-teal)',
              size: 48,
              strokeWidth: 4,
              centerText: `${sesionesSemanaTotal}/${metaSemanaTotal}`
            })}
          </div>

          <div style="font-size: 14px; font-weight: 700; text-align: center; margin-bottom: 4px;">${stats.sesionesSemana} sesión${stats.sesionesSemana === 1 ? '' : 'es'} esta semana</div>
          <div style="font-family: var(--font-mono); font-size: 10.5px; color: var(--text-secondary); text-align: center; line-height: 1.4; margin-bottom: 14px;">
            ${racha.actual > 0 ? `🔥 ${racha.actual} día${racha.actual === 1 ? '' : 's'} seguidos` : 'Empieza tu racha hoy'}
          </div>

          <div style="margin-top: auto;">
            <div style="font-size: 9px; font-weight: 700; color: var(--text-secondary); letter-spacing: 1px; margin-bottom: 2px; text-transform: uppercase;">Último entrenamiento</div>
            <div style="font-size: 11.5px; margin-bottom: 10px;">${ultimoEntreno ? `${ultimoEntrenoFechaStr} · ${ultimoEntreno.nombreRutina}` : 'Aún no registras ninguno'}</div>
            <button class="tappable btn-ver-progreso-nav" style="width: 100%; background: rgba(6, 182, 212, 0.1); border: 1px solid var(--accent-teal); color: var(--accent-teal); padding: 9px; border-radius: 10px; font-size: 11.5px; font-weight: 700; cursor: pointer;">Ver progreso</button>
          </div>
        </div>

        <!-- FINANZAS -->
        <div id="card-finanzas" class="card tappable" style="padding: 18px 16px; display: flex; flex-direction: column; border-radius: 20px;">
          <div class="flex-between" style="margin-bottom: 4px;">
            <h3 style="font-size: 10.5px; font-weight: 700; color: var(--text-secondary); letter-spacing: 1px; margin: 0;">FINANZAS</h3>
            <span style="color: var(--text-secondary);"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12h-3v4h3v-4z"></path></svg></span>
          </div>
          <div style="width: 18px; height: 2px; background: var(--accent-purple); margin-bottom: 12px; border-radius: 1px;"></div>

          <div style="display: flex; justify-content: center; margin-bottom: 10px;">
            <div class="icon-chip" style="width: 48px; height: 48px; background: rgba(168, 85, 247, 0.15); color: var(--accent-purple);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12h-3v4h3v-4z"></path></svg>
            </div>
          </div>

          <div style="font-size: 14px; font-weight: 700; text-align: center; margin-bottom: 4px;">Presupuesto</div>
          <div style="font-family: var(--font-mono); font-size: 12px; text-align: center; margin-bottom: 8px;">
            <span style="color: var(--text-primary); font-weight: 700;">${formatCompactCurrency(usado)}</span>
            <span style="color: var(--text-secondary);"> / ${formatCompactCurrency(budget.budgeted)}</span>
          </div>

          <div style="height: 6px; background: var(--surface-2); border-radius: 3px; margin-bottom: 6px; overflow: hidden; position: relative;">
            <div style="position: absolute; top:0; left:0; height:100%; width: ${pctBar}%; background: ${colorFin}; border-radius: 3px; transition: width 0.5s ease;"></div>
          </div>
          <div style="text-align: right; font-family: var(--font-mono); font-size: 10.5px; color: var(--text-secondary); margin-bottom: 10px;">${pct}%</div>

          <div style="margin-top: auto;">
            <div style="font-size: 9px; font-weight: 700; color: var(--text-secondary); letter-spacing: 1px; margin-bottom: 2px; text-transform: uppercase;">Reciente</div>
            <div style="font-size: 11.5px;">${ultimaTx ? `${ultimaTx.label || ultimaTx.category} · <span style="font-family: var(--font-mono);">${formatCurrency(ultimaTx.amount)}</span>` : 'Sin movimientos aún'}</div>
          </div>
        </div>

      </div>
    </div>
  `;
}

const renderRachaGlobalChart = async () => {
  const canvas = document.getElementById('chart-racha-global');
  if (!canvas) return;
  const { last7 } = await db.getRachaGlobal();
  const Chart = await ensureChartJs();
  const palette = appPalette();

  if (rachaGlobalChartInstance) rachaGlobalChartInstance.destroy();
  rachaGlobalChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: last7.map(d => d.date.slice(8, 10)),
      datasets: [{
        data: last7.map(d => d.count),
        borderColor: palette.orange,
        backgroundColor: palette.orange + '26',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: 2
      }]
    },
    options: {
      ...baseChartOptions(),
      scales: { x: { display: false }, y: { display: false } }
    }
  });
};

export function mountListeners() {
  renderRachaGlobalChart();

  const go = (view) => {
    if (window.appRouter) window.appRouter.navigate(view);
  };
  const qaGasto = document.getElementById('qa-gasto');
  const qaEntreno = document.getElementById('qa-entreno');
  const cardEntreno = document.getElementById('card-entreno');
  const cardFinanzas = document.getElementById('card-finanzas');

  if (qaGasto) qaGasto.addEventListener('click', () => go('finanzas'));
  if (qaEntreno) qaEntreno.addEventListener('click', () => go('entrenamiento'));
  if (cardEntreno) cardEntreno.addEventListener('click', () => go('entrenamiento'));
  if (cardFinanzas) cardFinanzas.addEventListener('click', () => go('finanzas'));
}
