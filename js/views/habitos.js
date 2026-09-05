import { db } from '../core/db.js';
import { renderHabitoForm, setupHabitoForm, openHabitoForm } from '../components/habito-form.js';
import { Toast, ConfirmDialog, EmptyState } from '../utils/states.js';
import { diaKeyDe } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';

// Lunes primero (convención es-CL) — a diferencia de la franja rodante
// anterior (últimos 7 días terminando hoy), esta es la semana calendario
// fija: lunes a domingo, hoy puede caer en cualquier posición.
const DOW_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DOW_LARGO = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// Vista local (lista | detalle) — mismo patrón que activeFinTab en
// finanzas.js: vive en el módulo, se resetea si se navega a otra vista y
// se vuelve. habitoDetalleId identifica qué hábito ver en detalle.
let vista = 'lista';
let habitoDetalleId = null;

function semanaActual() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dow = hoy.getDay(); // 0=domingo .. 6=sábado
  const offsetLunes = dow === 0 ? 6 : dow - 1;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - offsetLunes);
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    dias.push(d);
  }
  return dias;
}

// Franja semanal reutilizada por la vista de detalle. Los días futuros de
// la semana calendario (ej. si hoy es miércoles, jueves en adelante) se
// muestran pero no son tocables — no tiene sentido marcar un hábito por
// adelantado.
function renderFranjaSemanal(habito, hoyIso) {
  const marcas = habito.marcas || {};
  const dias7 = semanaActual();
  return dias7.map(d => {
    const iso = diaKeyDe(d);
    const marcado = !!marcas[iso];
    const esHoy = iso === hoyIso;
    const esFuturo = iso > hoyIso;
    const diaLabel = `${DOW_LARGO[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${d.getDate()}`;
    const accion = marcado ? 'Desmarcar' : 'Marcar';
    return `
      <button class="day-toggle tappable" data-id="${habito.id}" data-fecha="${iso}"
        ${esFuturo ? 'disabled' : ''}
        aria-label="${esFuturo ? `${escapeHtml(habito.nombre)} el ${diaLabel} (todavía no llega)` : `${accion} ${escapeHtml(habito.nombre)} el ${diaLabel}`}"
        aria-pressed="${marcado}"
        style="flex: 1; min-height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: transparent; border: none; cursor: ${esFuturo ? 'default' : 'pointer'}; padding: 0; opacity: ${esFuturo ? '0.35' : '1'};">
        <span aria-hidden="true" style="font-size: 10px; font-weight: 700; color: var(--text-disabled); letter-spacing: 0.4px;">${DOW_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
        <span aria-hidden="true" class="day-toggle-circle" data-check-size="13" style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border: 1.5px solid ${esHoy ? 'var(--accent-purple)' : 'transparent'}; background: ${marcado ? 'var(--accent-purple)' : 'var(--surface-2)'};">
          ${marcado ? '<svg width="13" height="13" fill="none" stroke="#000" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
        </span>
      </button>
    `;
  }).join('');
}

async function renderDetalle(id) {
  const habitos = await db.getHabitos();
  const habito = habitos.find(h => h.id === id);
  if (!habito) { vista = 'lista'; return render(); }

  const hoyIso = diaKeyDe(new Date());
  const racha = await db.getRachaHabito(id);
  const diasRegistrados = Object.keys(habito.marcas || {}).length;

  return `
    <div style="padding: 20px; font-family: var(--font-body); padding-bottom: 110px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
        <button id="btn-volver-habito" aria-label="Volver a Hábitos" style="width: 44px; height: 44px; flex-shrink: 0; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.4px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(habito.nombre)}</h1>
      </div>

      <div class="card card-hero" style="padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 13px; color: var(--text-secondary); font-weight: 600; margin-bottom: 12px;">
          ${racha.actual > 0
            ? `🔥 <span class="num">${racha.actual}</span> ${racha.actual === 1 ? 'día seguido' : 'días seguidos'}`
            : 'Sin racha — márcalo hoy'}
          · Mejor: <span class="num">${racha.mejor}</span> ${racha.mejor === 1 ? 'día' : 'días'}
        </div>
        <div style="display: flex; justify-content: space-between;">
          ${renderFranjaSemanal(habito, hoyIso)}
        </div>
      </div>

      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 20px;">${diasRegistrados} día${diasRegistrados === 1 ? '' : 's'} marcado${diasRegistrados === 1 ? '' : 's'} en total.</div>

      <div style="display: flex; gap: 12px;">
        <button id="btn-editar-habito-detalle" class="tappable" style="flex: 1; min-height: 44px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-primary); font-weight: 700; cursor: pointer;">Editar nombre</button>
        <button id="btn-eliminar-habito-detalle" class="tappable" style="flex: 1; min-height: 44px; background: transparent; border: 1px solid var(--surface-border); color: var(--state-high); font-weight: 700; cursor: pointer;">Eliminar</button>
      </div>

      ${renderHabitoForm()}
    </div>
  `;
}

async function renderLista() {
  const habitos = await db.getHabitos();
  const rachaGlobal = await db.getRachaHabitosGlobal();
  const hoyIso = diaKeyDe(new Date());

  await Promise.all(habitos.map(async (h) => {
    h._racha = await db.getRachaHabito(h.id);
  }));

  // Fila simple: nombre a la izquierda, checkbox de HOY a la derecha (zona
  // del pulgar — es la acción que se repite a diario), chevron decorativo.
  // El área táctil de la fila entera lleva a la vista de detalle; el
  // checkbox tiene su propio manejador y no propaga el click a la fila.
  const renderFila = (habito) => {
    const marcadoHoy = !!(habito.marcas || {})[hoyIso];
    const racha = habito._racha || { actual: 0, mejor: 0 };
    return `
      <div class="list-row habito-row tappable" data-id="${habito.id}" style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; min-height: 44px; cursor: pointer; margin-bottom: 8px;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(habito.nombre)}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
            ${racha.actual > 0 ? `🔥 <span class="num">${racha.actual}</span> ${racha.actual === 1 ? 'día seguido' : 'días seguidos'}` : 'Sin racha todavía'}
          </div>
        </div>
        <button class="day-toggle-hoy tappable" data-id="${habito.id}" data-fecha="${hoyIso}" aria-label="${marcadoHoy ? 'Desmarcar' : 'Marcar'} ${escapeHtml(habito.nombre)} hoy" aria-pressed="${marcadoHoy}" style="flex-shrink: 0; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; cursor: pointer; padding: 0;">
          <span aria-hidden="true" class="day-toggle-circle" data-check-size="16" data-borde-marca="1" style="width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border: 1.5px solid ${marcadoHoy ? 'transparent' : 'var(--surface-border)'}; background: ${marcadoHoy ? 'var(--accent-purple)' : 'var(--surface-2)'};">
            ${marcadoHoy ? '<svg width="16" height="16" fill="none" stroke="#000" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
          </span>
        </button>
        <svg aria-hidden="true" width="16" height="16" fill="none" stroke="var(--text-disabled)" stroke-width="2.3" viewBox="0 0 24 24" style="flex-shrink: 0;"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    `;
  };

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
        <!-- Racha de días perfectos — tarjeta principal de Hábitos, lleva chaflán (ver .card-hero). -->
        <div class="card card-hero" style="margin-right: 20px; margin-bottom: 20px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;">
          <div style="width: 56px; height: 56px; flex-shrink: 0; border-radius: 50%; background: rgba(139, 124, 246, 0.12); display: flex; align-items: center; justify-content: center; font-size: 24px;">🔥</div>
          <div>
            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);"><span class="num">${rachaGlobal.actual}</span> ${rachaGlobal.actual === 1 ? 'día perfecto seguido' : 'días perfectos seguidos'}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Mejor racha: <span class="num">${rachaGlobal.mejor}</span> ${rachaGlobal.mejor === 1 ? 'día' : 'días'} · todos los hábitos cumplidos ese día</div>
          </div>
        </div>
      ` : ''}

      <!-- Lista de hábitos -->
      <div style="padding-right: 20px; padding-bottom: 110px;">
        ${habitos.length > 0
          ? habitos.map(renderFila).join('')
          : EmptyState('Sin hábitos todavía', 'Agrega el primero y empieza a marcar días.')}
      </div>

      <!-- FAB. Sticky en vez de fixed: fixed lo ancla al borde de la
           ventana completa, así que en escritorio (sidebar + columna de
           contenido centrada) queda lejos del contenido — mismo criterio
           que el FAB de Tareas (ver tareas.js). -->
      <div style="position: sticky; bottom: 100px; height: 0; z-index: 2000; display: flex; justify-content: flex-end; pointer-events: none;">
        <button id="btn-new-habito" class="tappable mk3-fab" style="pointer-events: auto; margin-right: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-purple); color: #000; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      ${renderHabitoForm()}
    </div>
  `;
}

export async function render() {
  if (vista === 'detalle' && habitoDetalleId) return renderDetalle(habitoDetalleId);
  return renderLista();
}

export function mountListeners() {
  const refresh = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  setupHabitoForm(refresh);

  const abrirDetalle = (id) => { vista = 'detalle'; habitoDetalleId = id; refresh(); };
  const volverALista = () => { vista = 'lista'; habitoDetalleId = null; refresh(); };

  const btnNew = document.getElementById('btn-new-habito');
  if (btnNew) btnNew.addEventListener('click', () => openHabitoForm());

  const btnVolver = document.getElementById('btn-volver-habito');
  if (btnVolver) btnVolver.addEventListener('click', volverALista);

  document.querySelectorAll('.habito-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.day-toggle-hoy')) return;
      abrirDetalle(row.getAttribute('data-id'));
    });
  });

  // Optimista: pinta el círculo al instante y recién después escribe en
  // IndexedDB — un check que espera a la base de datos se siente roto.
  // Si la escritura falla, vuelve al estado anterior y avisa con un toast
  // en vez de dejar un check mintiendo en pantalla.
  const pintarCirculo = (btn, marcado) => {
    const circle = btn.querySelector('.day-toggle-circle');
    if (!circle) return;
    btn.setAttribute('aria-pressed', String(marcado));
    circle.style.background = marcado ? 'var(--accent-purple)' : 'var(--surface-2)';
    if (circle.getAttribute('data-borde-marca')) {
      circle.style.borderColor = marcado ? 'transparent' : 'var(--surface-border)';
    }
    const size = circle.getAttribute('data-check-size') || '16';
    circle.innerHTML = marcado
      ? `<svg width="${size}" height="${size}" fill="none" stroke="#000" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      : '';
  };

  document.querySelectorAll('.day-toggle-hoy, .day-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const el = e.currentTarget;
      const id = el.getAttribute('data-id');
      const fecha = el.getAttribute('data-fecha');
      const estabaMarcado = el.getAttribute('aria-pressed') === 'true';
      const nuevoMarcado = !estabaMarcado;

      pintarCirculo(el, nuevoMarcado);

      try {
        await db.toggleMarcaHabito(id, fecha);
        // idbSetArray (db.js) atrapa sus propios errores de IndexedDB y
        // solo los loguea — nunca rechaza la promesa hacia quien la llamó.
        // Sin esta verificación, una escritura que falló en silencio se
        // vería igual que una exitosa. Se relee para confirmar que el
        // marcado realmente quedó como se pintó antes de confiar en él.
        const habitosActuales = await db.getHabitos();
        const habitoActual = habitosActuales.find(h => h.id === id);
        const quedoMarcado = !!(habitoActual && habitoActual.marcas && habitoActual.marcas[fecha]);
        if (quedoMarcado !== nuevoMarcado) throw new Error('La marca no se guardó en IndexedDB');
        // El toque ya se vio al instante — este refresh solo pone al día
        // la racha y otros contadores derivados, ya no bloquea la
        // respuesta visual.
        refresh();
      } catch (err) {
        console.error('Error al marcar hábito:', err);
        pintarCirculo(el, estabaMarcado);
        Toast('No se pudo guardar — inténtalo de nuevo.', 'error');
      }
    });
  });

  const btnEditarDetalle = document.getElementById('btn-editar-habito-detalle');
  if (btnEditarDetalle) {
    btnEditarDetalle.addEventListener('click', async () => {
      const habitos = await db.getHabitos();
      const habito = habitos.find(h => h.id === habitoDetalleId);
      if (habito) openHabitoForm(habito);
    });
  }

  const btnEliminarDetalle = document.getElementById('btn-eliminar-habito-detalle');
  if (btnEliminarDetalle) {
    btnEliminarDetalle.addEventListener('click', async () => {
      const habitos = await db.getHabitos();
      const habito = habitos.find(h => h.id === habitoDetalleId);
      const diasRegistrados = habito ? Object.keys(habito.marcas || {}).length : 0;
      const confirmed = await ConfirmDialog(
        `Eliminar hábito${habito ? ' ' + habito.nombre : ''}`,
        diasRegistrados > 0
          ? `Se perderá el registro de ${diasRegistrados} día${diasRegistrados === 1 ? '' : 's'} marcado${diasRegistrados === 1 ? '' : 's'}. No se puede deshacer.`
          : 'No se puede deshacer.',
        { verb: 'Eliminar' }
      );
      if (confirmed) {
        await db.eliminarHabito(habitoDetalleId);
        Toast('Hábito eliminado', 'success');
        volverALista();
      }
    });
  }
}
