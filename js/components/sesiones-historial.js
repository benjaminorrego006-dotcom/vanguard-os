// Historial de sesiones de Entreno: lista por semana (lunes a domingo, la
// más reciente primero) con "Cargar más", y el detalle de cada sesión en un
// modal (.modal-overlay + open, así el atrás del sistema lo cierra; ver
// history.js) con Eliminar y Editar. Eliminar pide confirmación y deja un
// aviso con "Deshacer" (db.restaurarSesion). Editar llega en la fase 3.
import { db } from '../core/db.js';
import { claveDiaDe, fechaLocalDe, sumarDias, diaKeyDe, formatFechaCorta, conMayuscula } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { ConfirmDialog, ToastAccion, Toast } from '../utils/states.js';
import { CATEGORY_COLORS } from '../core/trainingConfig.js';

const SEMANAS_POR_PAGINA = 8;
const CATEGORIAS = { gym: 'GYM', calistenia: 'Calistenia', hiit: 'HIIT' };

let semanasVisibles = SEMANAS_POR_PAGINA;

// Lunes (clave 'YYYY-MM-DD') de la semana de una fecha guardada.
function lunesDe(fecha) {
  const clave = claveDiaDe(fecha);
  const dow = (fechaLocalDe(clave).getDay() + 6) % 7; // 0 = lunes
  return sumarDias(clave, -dow);
}

// "lunes 21 sept" (para la confirmación) y "Lun 21 sept" (para la fila).
function diaLargo(fecha) {
  const f = fechaLocalDe(claveDiaDe(fecha));
  return `${f.toLocaleDateString('es-CL', { weekday: 'long' })} ${formatFechaCorta(f)}`;
}
function diaCorto(fecha) {
  const f = fechaLocalDe(claveDiaDe(fecha));
  return `${conMayuscula(f.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', ''))} ${formatFechaCorta(f)}`;
}

// Solo se guardan las series marcadas; las antiguas no traen `checked`.
const seriesMarcadas = (s) => (s.ejercicios || []).reduce((n, ej) => n + (ej.series || []).filter(sr => sr.checked !== false).length, 0);
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function agruparPorSemana(sesiones) {
  const porLunes = new Map();
  sesiones.forEach(s => {
    const lunes = lunesDe(s.fecha);
    if (!porLunes.has(lunes)) porLunes.set(lunes, []);
    porLunes.get(lunes).push(s);
  });
  return [...porLunes.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([lunes, lista]) => ({ lunes, sesiones: lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) }));
}

function tituloSemana(lunes) {
  const hoyLunes = lunesDe(diaKeyDe(new Date()));
  if (lunes === hoyLunes) return 'Esta semana';
  if (lunes === sumarDias(hoyLunes, -7)) return 'Semana pasada';
  return `Semana del ${formatFechaCorta(fechaLocalDe(lunes))}`;
}

function filaSesion(s, categoria) {
  const series = seriesMarcadas(s);
  const incompleta = categoria === 'hiit' && s.completado === false;
  const cat = CATEGORIAS[categoria] || '';
  const aria = [diaLargo(s.fecha), s.nombreRutina, cat, plural(s.duracionMin || 0, 'minuto', 'minutos'), plural(series, 'serie', 'series'), incompleta ? 'incompleta' : ''].filter(Boolean).join(', ');
  return `
    <li>
      <button type="button" class="hist-sesion tappable" data-id="${escapeHtml(s.id)}" aria-label="${escapeHtml(aria)}. Ver detalle" style="width: 100%; display: flex; align-items: center; gap: 12px; text-align: left; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px 14px; cursor: pointer; font: inherit;">
        <span aria-hidden="true" style="width: 3px; align-self: stretch; background: ${CATEGORY_COLORS[categoria] || 'var(--surface-border)'}; flex-shrink: 0;"></span>
        <span style="flex: 1; min-width: 0;">
          <span style="display: block; font-size: 12px; color: var(--text-secondary);">${escapeHtml(diaCorto(s.fecha))}${cat ? ` · ${cat}` : ''}</span>
          <span style="display: block; font-size: 15px; font-weight: 700; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(s.nombreRutina || 'Entrenamiento')}</span>
          ${incompleta ? '<span style="display: inline-block; margin-top: 4px; font-size: 11px; font-weight: 700; color: var(--text-secondary); border: 1px solid var(--surface-border); padding: 1px 6px;">Incompleta</span>' : ''}
        </span>
        <span style="text-align: right; flex-shrink: 0; font-size: 12px; color: var(--text-secondary);">
          <span style="display: block;"><span class="num" style="color: var(--text-primary); font-weight: 700;">${s.duracionMin || 0}</span> min</span>
          <span style="display: block; margin-top: 2px;"><span class="num">${series}</span> ${series === 1 ? 'serie' : 'series'}</span>
        </span>
      </button>
    </li>`;
}

async function renderLista() {
  const [sesiones, rutinas] = await Promise.all([db.getSesiones(), db.getRutinas()]);
  const catPorRutina = {};
  rutinas.forEach(r => { catPorRutina[r.id] = r.categoria; });
  if (sesiones.length === 0) {
    return '<p style="color: var(--text-secondary); font-size: 14px; text-align: center; padding: 32px 0;">Todavía no tienes sesiones registradas.</p>';
  }
  const semanas = agruparPorSemana(sesiones);
  const visibles = semanas.slice(0, semanasVisibles);
  return `
    ${visibles.map(sem => `
      <section aria-label="${escapeHtml(tituloSemana(sem.lunes))}" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
          <h3 style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-secondary); margin: 0;">${escapeHtml(tituloSemana(sem.lunes))}</h3>
          <span style="font-size: 12px; color: var(--text-secondary);"><span class="num">${sem.sesiones.length}</span> ${sem.sesiones.length === 1 ? 'sesión' : 'sesiones'}</span>
        </div>
        <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px;">
          ${sem.sesiones.map(s => filaSesion(s, catPorRutina[s.rutinaId])).join('')}
        </ul>
      </section>`).join('')}
    ${semanas.length > visibles.length ? `
      <button type="button" id="btn-hist-cargar-mas" class="tappable" style="width: 100%; background: transparent; border: 1px solid var(--surface-border); color: var(--accent-teal); padding: 12px; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: 24px;">Cargar más</button>` : ''}`;
}

function renderDetalle(s, categoria) {
  const series = seriesMarcadas(s);
  const incompleta = categoria === 'hiit' && s.completado === false;
  const ejercicios = (s.ejercicios || []).map(ej => `
    <li style="padding: 10px 0; border-top: 1px solid var(--surface-border);">
      <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">${escapeHtml(ej.nombre || 'Ejercicio')}</div>
      <ol style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px;">
        ${(ej.series || []).map((sr, i) => {
          const peso = Number(sr.peso) || 0;
          const tipo = sr.tipo && sr.tipo !== 'normal' ? ` · ${escapeHtml(sr.tipo)}` : '';
          const marcada = sr.checked !== false;
          return `<li style="display: flex; gap: 10px; font-size: 13px; color: ${marcada ? 'var(--text-primary)' : 'var(--text-secondary)'};">
            <span style="width: 56px; color: var(--text-secondary);">Serie <span class="num">${i + 1}</span></span>
            <span>${peso > 0 ? `<span class="num">${escapeHtml(String(sr.peso))}</span> kg × ` : ''}<span class="num">${escapeHtml(String(sr.reps ?? 0))}</span> reps${tipo}${marcada ? '' : ' · sin marcar'}</span>
          </li>`;
        }).join('')}
      </ol>
    </li>`).join('');
  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
      <div style="min-width: 0;">
        <div style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(conMayuscula(diaLargo(s.fecha)))}${CATEGORIAS[categoria] ? ` · ${CATEGORIAS[categoria]}` : ''}</div>
        <h2 id="sesion-detalle-titulo" style="font-size: 20px; font-weight: 800; margin: 4px 0 0 0; color: var(--text-primary);">${escapeHtml(s.nombreRutina || 'Entrenamiento')}</h2>
      </div>
      <button type="button" id="btn-sesion-detalle-cerrar" aria-label="Cerrar detalle" style="width: 44px; height: 44px; flex-shrink: 0; background: transparent; border: 1px solid var(--surface-border); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">
        <svg aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
      <span><span class="num" style="color: var(--text-primary); font-weight: 700;">${s.duracionMin || 0}</span> min</span>
      <span><span class="num" style="color: var(--text-primary); font-weight: 700;">${series}</span> ${series === 1 ? 'serie' : 'series'}</span>
      ${s.rpe ? `<span>RPE <span class="num" style="color: var(--text-primary); font-weight: 700;">${escapeHtml(String(s.rpe))}</span></span>` : ''}
      ${incompleta ? '<span style="font-weight: 700;">Incompleta</span>' : ''}
    </div>
    ${s.notas ? `<p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 12px 0; white-space: pre-line;">${escapeHtml(s.notas)}</p>` : ''}
    <ul style="list-style: none; margin: 0 0 16px 0; padding: 0;">${ejercicios || '<li style="font-size: 13px; color: var(--text-secondary);">Sin series registradas.</li>'}</ul>
    <div class="sesion-detalle-acciones" style="display: flex; gap: 8px; background: var(--surface-1); padding-top: 12px; border-top: 1px solid var(--surface-border);">
      <button type="button" id="btn-sesion-eliminar" class="tappable" style="flex: 1; background: transparent; border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;">Eliminar</button>
      <button type="button" id="btn-sesion-editar" disabled aria-disabled="true" aria-label="Editar, próximamente" style="flex: 1; background: transparent; border: 1px solid var(--surface-border); color: var(--text-disabled); padding: 12px; font: inherit; font-size: 14px; font-weight: 700; cursor: not-allowed;">Editar · Próximamente</button>
    </div>`;
}

export async function renderSesionesHistorial() {
  semanasVisibles = SEMANAS_POR_PAGINA;
  return `
    <div style="margin-bottom: 16px;">
      <h1 style="font-size: 26px; font-weight: 800; margin: 0; color: var(--text-primary);">Historial de sesiones</h1>
      <p style="font-size: 13px; color: var(--text-secondary); margin: 4px 0 0 0;">Toca una sesión para ver sus series o eliminarla.</p>
    </div>
    <div id="hist-lista">${await renderLista()}</div>
    <div id="sesion-detalle-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sesion-detalle-titulo">
      <div class="modal-content" id="sesion-detalle-contenido"></div>
    </div>`;
}

// Espera a que termine el history.back() con que history.js suelta la
// entrada de un modal recién cerrado (ej. el de confirmación): si se cierra
// otro modal antes, su propio back() no encuentra su entrada y queda un
// "atrás" fantasma.
function esperarRetrocesoDe(modalId) {
  if (!history.state || history.state.modalId !== modalId) return Promise.resolve();
  return new Promise(resolve => {
    const t = setTimeout(resolve, 500);
    window.addEventListener('popstate', () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

export function initSesionesHistorialListeners(signal) {
  const lista = document.getElementById('hist-lista');
  const modal = document.getElementById('sesion-detalle-modal');
  const contenido = document.getElementById('sesion-detalle-contenido');
  if (!lista || !modal || !contenido) return;

  let origenFoco = null;
  const refrescarLista = async () => {
    if (!document.body.contains(lista)) return;
    lista.innerHTML = await renderLista();
    // innerHTML nuevo: los listeners van por delegación en `lista`, que no cambia.
  };

  const cerrarDetalle = () => {
    modal.classList.remove('open');
    modal.style.display = 'none';
    if (origenFoco && document.body.contains(origenFoco)) origenFoco.focus();
  };

  const abrirDetalle = async (id, boton) => {
    const [sesiones, rutinas] = await Promise.all([db.getSesiones(), db.getRutinas()]);
    const s = sesiones.find(x => x.id === id);
    if (!s) { await refrescarLista(); return; }
    const cat = (rutinas.find(r => r.id === s.rutinaId) || {}).categoria;
    origenFoco = boton;
    contenido.innerHTML = renderDetalle(s, cat);
    // Listeners del detalle: se reasignan en cada apertura (innerHTML nuevo).
    document.getElementById('btn-sesion-detalle-cerrar').addEventListener('click', cerrarDetalle);
    document.getElementById('btn-sesion-eliminar').addEventListener('click', () => eliminar(s));
    modal.style.display = 'flex';
    modal.classList.add('open');
    requestAnimationFrame(() => document.getElementById('btn-sesion-detalle-cerrar')?.focus());
  };

  const eliminar = async (s) => {
    const dia = diaLargo(s.fecha);
    const ok = await ConfirmDialog(`¿Eliminar la sesión del ${dia}?`, 'Se quita del historial y se recalculan tu racha, tus metas y tu volumen. Podrás deshacerlo durante unos segundos.', { verb: 'Eliminar' });
    await esperarRetrocesoDe('global-confirm-modal');
    if (!ok) { document.getElementById('btn-sesion-eliminar')?.focus(); return; }
    const res = await db.eliminarSesion(s.id);
    cerrarDetalle();
    if (!res || !res.ok) { Toast('No se pudo eliminar la sesión', 'error'); return; }
    await refrescarLista();
    ToastAccion('Sesión eliminada', {
      accion: 'Deshacer',
      color: 'var(--cy)',
      alAccion: async () => {
        const r = await db.restaurarSesion(s.id);
        if (!r || !r.ok) { Toast('No se pudo deshacer', 'error'); return; }
        await refrescarLista();
      }
    });
  };

  // Delegación: la lista se repinta con innerHTML (Cargar más, eliminar,
  // deshacer) y así no hay que volver a enganchar cada fila.
  lista.addEventListener('click', (e) => {
    const fila = e.target.closest('.hist-sesion');
    if (fila) { abrirDetalle(fila.getAttribute('data-id'), fila); return; }
    if (e.target.closest('#btn-hist-cargar-mas')) {
      const primeraNueva = lista.querySelectorAll('section').length;
      semanasVisibles += SEMANAS_POR_PAGINA;
      refrescarLista().then(() => {
        const sec = lista.querySelectorAll('section')[primeraNueva];
        sec?.querySelector('.hist-sesion')?.focus();
      });
    }
  }, { signal });

  // Tocar fuera del contenido cierra el detalle.
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrarDetalle(); }, { signal });
}
