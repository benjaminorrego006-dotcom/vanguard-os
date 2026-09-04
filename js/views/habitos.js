import { db } from '../core/db.js';
import { renderHabitoForm, setupHabitoForm, openHabitoForm } from '../components/habito-form.js';
import { Toast, ConfirmDialog, EmptyState } from '../utils/states.js';
import { diaKeyDe } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';

const DOW_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DOW_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Últimos 7 días (hoy incluido, al final) — franja compacta por hábito,
// en vez de una grilla del mes entero: encaja mejor en la tarjeta angosta
// de una sola columna que ya usan el resto de las vistas en mobile. Sin
// calendario/heatmap mensual a propósito, para mantener la vista simple.
function ultimos7Dias() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    dias.push(d);
  }
  return dias;
}

export async function render() {
  const habitos = await db.getHabitos();
  const rachaGlobal = await db.getRachaHabitosGlobal();

  const dias7 = ultimos7Dias();
  const hoyIso = diaKeyDe(new Date());

  const renderCard = (habito) => {
    const marcas = habito.marcas || {};
    const totalMarcasSemana = dias7.filter(d => marcas[diaKeyDe(d)]).length;

    const stripHtml = dias7.map(d => {
      const iso = diaKeyDe(d);
      const marcado = !!marcas[iso];
      const esHoy = iso === hoyIso;
      const diaLabel = `${DOW_LARGO[d.getDay()]} ${d.getDate()}`;
      const accion = marcado ? 'Desmarcar' : 'Marcar';
      return `
        <button class="day-toggle tappable" data-id="${habito.id}" data-fecha="${iso}"
          aria-label="${accion} ${escapeHtml(habito.nombre)} el ${diaLabel}" aria-pressed="${marcado}"
          style="width: 30px; height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: transparent; border: none; cursor: pointer; padding: 0;">
          <span aria-hidden="true" style="font-size: 9px; font-weight: 700; color: var(--text-disabled); letter-spacing: 0.4px;">${DOW_SHORT[d.getDay()]}</span>
          <span aria-hidden="true" style="width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border: 1.5px solid ${esHoy ? 'var(--accent-purple)' : 'transparent'}; background: ${marcado ? 'var(--accent-purple)' : 'var(--surface-2)'};">
            ${marcado ? '<svg width="11" height="11" fill="none" stroke="#000" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
          </span>
        </button>
      `;
    }).join('');

    const racha = habito._racha || { actual: 0, mejor: 0 };

    return `
      <div class="card" style="padding: 16px 16px 12px 20px; position: relative; overflow: hidden; margin-bottom: 12px;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent-purple);"></div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
          <h4 class="tappable btn-edit-habito" data-id="${habito.id}" style="font-size: 16px; font-weight: 800; margin: 0; color: var(--text-primary); flex: 1; cursor: pointer; line-height: 1.3; letter-spacing: -0.2px;">${escapeHtml(habito.nombre)}</h4>
          <button class="btn-delete-habito tappable" data-id="${habito.id}" aria-label="Eliminar hábito ${escapeHtml(habito.nombre)}" style="background:transparent; border:none; color:var(--text-disabled); cursor:pointer; flex-shrink: 0; padding: 2px;">
            <svg aria-hidden="true" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600; margin-bottom: 10px;">
          ${racha.actual > 0
            ? `🔥 ${racha.actual} ${racha.actual === 1 ? 'día seguido' : 'días seguidos'}`
            : 'Sin racha — márcalo hoy'}
          <span style="color: var(--text-disabled); font-weight: 500;"> · ${totalMarcasSemana}/7 esta semana</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--surface-border); padding-top: 10px; margin: 0 -4px;">
          ${stripHtml}
        </div>
      </div>
    `;
  };

  // Racha por hábito: se calcula acá una sola vez (en paralelo) y se cuelga
  // en cada objeto como _racha para no repetir el await adentro de un
  // template literal — mismo motivo por el que renderCard es sync.
  await Promise.all(habitos.map(async (h) => {
    h._racha = await db.getRachaHabito(h.id);
  }));

  return `
    <div style="padding: 20px 0 20px 20px; font-family: var(--font-body);">
      <!-- Header -->
      <div class="flex-between" style="padding-right: 20px; margin-bottom: 20px;">
        <h1 style="font-size: 30px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.5px;">Hábitos</h1>
        <div class="icon-chip" style="width: 40px; height: 40px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
        </div>
      </div>

      ${habitos.length > 0 ? `
        <!-- Racha de días perfectos -->
        <div class="card" style="margin-right: 20px; margin-bottom: 20px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 56px; height: 56px; flex-shrink: 0; border-radius: 50%; background: rgba(139, 124, 246, 0.12); display: flex; align-items: center; justify-content: center; font-size: 24px;">🔥</div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${rachaGlobal.actual} ${rachaGlobal.actual === 1 ? 'día perfecto seguido' : 'días perfectos seguidos'}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Mejor racha: ${rachaGlobal.mejor} ${rachaGlobal.mejor === 1 ? 'día' : 'días'} · todos los hábitos cumplidos ese día</div>
          </div>
        </div>
      ` : ''}

      <!-- Lista de hábitos -->
      <div style="padding-right: 20px; padding-bottom: 110px;">
        ${habitos.length > 0
          ? habitos.map(renderCard).join('')
          : EmptyState('Sin hábitos todavía', 'Agrega el primero y empieza a marcar días.')}
      </div>

      <!-- FAB. Sticky en vez de fixed: fixed lo ancla al borde de la
           ventana completa, así que en escritorio (sidebar + columna de
           contenido centrada) queda lejos del contenido — mismo criterio
           que el FAB de Tareas (ver tareas.js). -->
      <div style="position: sticky; bottom: 100px; height: 0; z-index: 2000; display: flex; justify-content: flex-end; pointer-events: none;">
        <button id="btn-new-habito" class="tappable" style="pointer-events: auto; margin-right: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-purple); color: #000; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      ${renderHabitoForm()}
    </div>
  `;
}

export function mountListeners() {
  const refresh = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  setupHabitoForm(refresh);

  const btnNew = document.getElementById('btn-new-habito');
  if (btnNew) btnNew.addEventListener('click', () => openHabitoForm());

  document.querySelectorAll('.btn-edit-habito').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const habitos = await db.getHabitos();
      const habito = habitos.find(h => h.id === id);
      if (habito) openHabitoForm(habito);
    });
  });

  document.querySelectorAll('.btn-delete-habito').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const confirmed = await ConfirmDialog('¿Eliminar hábito?', 'Se borra junto con todo su historial de marcas. Esta acción no se puede deshacer.');
      if (confirmed) {
        await db.eliminarHabito(id);
        Toast('Hábito eliminado', 'success');
        refresh();
      }
    });
  });

  document.querySelectorAll('.day-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const el = e.currentTarget;
      const id = el.getAttribute('data-id');
      const fecha = el.getAttribute('data-fecha');
      await db.toggleMarcaHabito(id, fecha);
      refresh();
    });
  });
}
