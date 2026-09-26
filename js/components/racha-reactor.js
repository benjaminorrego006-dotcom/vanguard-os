// js/components/racha-reactor.js
// Anillo de racha grande (el "reactor") + insignias. Vivían en Inicio; ahora
// son la cabecera de Hábitos (Inicio quedó con solo un chip de racha). La
// racha y las insignias se derivan del log de eventos (db.getRachaGlobal /
// db.getBadges), así que muestran los mismos valores que antes.
import { db } from '../core/db.js';
import { WEEKLY_GOALS } from '../core/trainingConfig.js';
import { diaKeyDe, fechaLocalDe, formatDiaSemana } from '../utils/fecha.js';
import { Toast } from '../utils/states.js';

// --- Vida extra (racha global) --------------------------------------------
// Escudo SVG (no emoji) de una vida extra. `lleno` = vida disponible; vacío
// = hueco para una vida que todavía no se gana. El color lo pone quien lo
// usa (currentColor).
export function svgEscudo({ lleno = true, size = 14 } = {}) {
  return `<svg class="escudo-vida" aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${lleno ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
}

// Texto corto bajo el reactor según las vidas disponibles.
function textoVidas(racha) {
  if (racha.vidas > 0) {
    return `${racha.vidas} ${racha.vidas === 1 ? 'vida extra' : 'vidas extra'} · protege tu racha si un día no registras nada`;
  }
  const n = racha.faltanParaVida;
  return `Gana una vida con 7 días seguidos (${n === 1 ? 'falta 1' : `faltan ${n}`})`;
}

// Últimos 7 días de la racha global (last7): activo, protegido por una vida
// (escudo + borde discontinuo), vacío, y hoy pendiente. Clases en
// components.css (.racha-semana), con el acento de Hábitos.
function renderSemanaRacha(racha) {
  const protegidos = new Set(racha.diasProtegidos || []);
  const hoy = diaKeyDe(new Date());
  return `
    <div class="racha-semana" role="list" aria-label="Últimos 7 días de la racha">
      ${racha.last7.map(d => {
        const estado = protegidos.has(d.date) ? 'protegido' : d.count > 0 ? 'activo' : 'vacio';
        const etiqueta = estado === 'protegido' ? 'protegido por una vida extra' : estado === 'activo' ? 'con actividad' : (d.date === hoy ? 'hoy, pendiente' : 'sin actividad');
        const letra = formatDiaSemana(fechaLocalDe(d.date)).toUpperCase();
        return `
          <div class="racha-dia racha-dia--${estado}${d.date === hoy ? ' racha-dia--hoy' : ''}" role="listitem" data-fecha="${d.date}" aria-label="${letra} ${d.date.slice(8)}: ${etiqueta}">
            <span class="racha-dia-letra">${letra}</span>
            <span class="racha-dia-marca">${estado === 'protegido' ? svgEscudo({ lleno: true, size: 10 }) : ''}</span>
          </div>`;
      }).join('')}
    </div>`;
}

// Toast "Ganaste una vida extra" una sola vez en la vida del usuario: la
// primera vez que se ve vidas >= 1. Preferencia de UI → localStorage.
const CLAVE_PRIMERA_VIDA = 'vg-vida-extra-primera-vista';
export function avisarPrimeraVidaSiCorresponde(racha) {
  if (!racha || !(racha.vidas > 0)) return;
  try {
    if (localStorage.getItem(CLAVE_PRIMERA_VIDA)) return;
    localStorage.setItem(CLAVE_PRIMERA_VIDA, diaKeyDe(new Date()));
  } catch (e) { return; /* sin localStorage no hay forma de mostrarlo una sola vez */ }
  Toast('Ganaste una vida extra 🛡', 'success', 3500);
}

// Insignias sobrias: sin niveles, sin copy de videojuego. Bloqueada = ícono
// de candado atenuado en gris; desbloqueada = ícono propio con el color de
// acento del módulo al que pertenece (Vanguard MK III). racha_7 no
// pertenece a ningún módulo en particular (es la racha global del
// reactor), así que se queda con el naranja de "fuego" que ya tenía;
// mes_sin_exceder se queda en el verde de éxito, que ya era un semántico
// aparte del acento de marca.
const BADGE_META = {
  racha_7: { icon: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>`, color: 'var(--accent-orange)' },
  primera_meta: { icon: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>`, color: 'var(--am)' },
  mes_sin_exceder: { icon: `<circle cx="12" cy="12" r="10"></circle><polyline points="9 12 11 14 15 10"></polyline>`, color: 'var(--state-success)' },
  diez_sesiones: { icon: `<path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><rect x="4" y="2" width="4" height="20" rx="1"></rect><rect x="16" y="2" width="4" height="20" rx="1"></rect>`, color: 'var(--cy)' }
};

// Tres anillos concéntricos de progreso (uno por módulo) más un hexágono
// central de líneas finas con la racha global. Mismo principio matemático
// que progressRing.js (círculo de fondo + arco vía
// stroke-dasharray/dashoffset), pero con tres anillos en un mismo SVG y el
// texto superpuesto en HTML encima (más simple que centrar dos líneas de
// texto dentro del SVG). "Avance del día" se aproxima con la métrica de
// progreso más cercana que ya calcula cada módulo: Entreno usa el avance
// de la meta semanal de sesiones (no hay meta diaria en la app), Finanzas
// usa el % del presupuesto del mes ya gastado, Hábitos usa el % de
// hábitos marcados hoy sobre el total de hábitos activos.
function renderReactor({ cyPct, amPct, viPct, rachaGlobal }) {
  const size = 220;
  const c = 110;
  const rings = [
    { r: 96, sw: 10, pct: cyPct, color: 'var(--cy)', track: 'var(--cyb)' },
    { r: 78, sw: 10, pct: amPct, color: 'var(--am)', track: 'var(--amb)' },
    { r: 60, sw: 10, pct: viPct, color: 'var(--vi)', track: 'var(--vib)' }
  ];

  const ringsHtml = rings.map(ring => {
    const circumference = 2 * Math.PI * ring.r;
    const clamped = Math.max(0, Math.min(100, ring.pct));
    const offset = circumference - (clamped / 100) * circumference;
    return `
      <circle cx="${c}" cy="${c}" r="${ring.r}" fill="none" stroke="${ring.track}" stroke-width="${ring.sw}"></circle>
      <circle cx="${c}" cy="${c}" r="${ring.r}" fill="none" stroke="${ring.color}" stroke-width="${ring.sw}"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
        style="transition: stroke-dashoffset 0.6s ease;"></circle>
    `;
  }).join('');

  const hexR = 44;
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (-90 + i * 60) * Math.PI / 180;
    return `${(c + hexR * Math.cos(angle)).toFixed(2)},${(c + hexR * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');

  return `
    <div style="position: relative; width: ${size}px; height: ${size}px; margin: 0 auto;">
      <svg role="img" aria-label="Racha de ${rachaGlobal.actual} día${rachaGlobal.actual === 1 ? '' : 's'}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
        ${ringsHtml}
        <polygon points="${hexPoints}" fill="none" stroke="var(--t3)" stroke-width="1.5"></polygon>
      </svg>
      <div aria-hidden="true" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
        <div class="num" style="font-size: 36px; font-weight: 800; color: var(--t1); line-height: 1;">${rachaGlobal.actual}</div>
        <div style="font-size: 10px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: 2.5px; margin-top: 5px;">Racha</div>
        <div class="reactor-vidas">
          ${[0, 1].map(i => `<span class="reactor-vida${i < rachaGlobal.vidas ? ' reactor-vida--llena' : ''}">${svgEscudo({ lleno: i < rachaGlobal.vidas, size: 12 })}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// Insignia como celda de panal hexagonal (clase .mk3-hex, ver
// components.css). Bloqueada = candado atenuado; desbloqueada = ícono
// propio con el color de su módulo.
function renderBadgeHex(b) {
  const meta = BADGE_META[b.id];
  const bg = b.unlocked ? `${meta.color}22` : 'var(--surface-2)';
  const fg = b.unlocked ? meta.color : 'var(--text-disabled)';
  const icon = b.unlocked
    ? `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">${meta.icon}</svg>`
    : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>`;
  return `
    <div title="${b.label}" style="flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 68px; text-align: center;">
      <div class="mk3-hex" style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: ${bg}; color: ${fg};">
        ${icon}
      </div>
      <div style="font-size: 9.5px; font-weight: 600; color: ${b.unlocked ? 'var(--text-secondary)' : 'var(--text-disabled)'}; line-height: 1.25;">${b.label}</div>
    </div>
  `;
}

// Cabecera de Hábitos: reactor + insignias. Calcula los tres porcentajes
// igual que lo hacía Inicio, para que los anillos muestren lo mismo.
export async function renderCabeceraRacha() {
  const [budget, resumenSemanal, rachaGlobal, badges, habitos] = await Promise.all([
    db.getBudget(),
    db.getResumenEntrenoSemanal(),
    db.getRachaGlobal(),
    db.getBadges(),
    db.getHabitos()
  ]);

  const sesionesSemanaTotal = Object.values(resumenSemanal).reduce((a, b) => a + b, 0);
  const metaSemanaTotal = Object.values(WEEKLY_GOALS).reduce((a, b) => a + b, 0);
  const cyPct = metaSemanaTotal > 0 ? Math.min(100, (sesionesSemanaTotal / metaSemanaTotal) * 100) : 0;

  const usado = budget.expenses + budget.savedThisMonth;
  const pct = budget.budgeted > 0 ? Math.round((usado / budget.budgeted) * 100) : 0;
  const amPct = Math.min(pct, 100);

  const hoyIso = diaKeyDe(new Date());
  const marcadosHoy = habitos.filter(h => h.marcas && h.marcas[hoyIso]).length;
  // Sin hábitos creados no hay nada que marcar todavía — el anillo va en 0
  // en vez de inventar un porcentaje (0/0 no es 100%).
  const viPct = habitos.length > 0 ? (marcadosHoy / habitos.length) * 100 : 0;

  avisarPrimeraVidaSiCorresponde(rachaGlobal);

  return `
    <!-- Reactor: tres anillos (Entreno/Finanzas/Hábitos) + racha global —
         lleva chaflán (ver .card-hero). Debajo: vidas extra y los últimos
         7 días de la racha. -->
    <div class="card card-hero" style="margin-right: 20px; padding: 24px 18px; margin-bottom: 16px;">
      ${renderReactor({ cyPct, amPct, viPct, rachaGlobal })}
      <div id="reactor-vidas-texto" class="reactor-vidas-texto">${textoVidas(rachaGlobal)}</div>
      ${renderSemanaRacha(rachaGlobal)}
    </div>

    <!-- Insignias: panal hexagonal -->
    <div style="display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 2px; padding-right: 20px;">
      ${badges.map(renderBadgeHex).join('')}
    </div>
  `;
}
