// Entreno › Cuerpo (docs/FASE6-MEDIDAS.md): peso y perímetros.
// - Tarjeta en la vista principal: último peso y su variación contra hace 30
//   días, con "Registrar medidas" e "Historial".
// - Historial (sub-vista de Entreno): medidas por fecha, la más reciente
//   arriba, con Editar y Eliminar.
// - Hoja de registro / edición (#medida-modal, .modal-overlay + open: Atrás
//   la cierra vía history.js), sin tapar la barra inferior ni el riel.
// Los datos van por db (registrarMedida / editarMedida / eliminarMedida),
// que valida y deja el evento en el log.
import { db } from '../core/db.js';
import { esperarSalidaDeModal } from '../core/history.js';
import { diaKeyDe, sumarDias, fechaLocalDe, formatFechaCorta, conMayuscula } from '../utils/fecha.js';
import { formatNumero } from '../utils/numero.js';
import { escapeHtml } from '../utils/escape.js';
import { Toast, ConfirmDialog } from '../utils/states.js';

const CAMPOS = [
  { k: 'pesoKg', etq: 'Peso', u: 'kg' },
  { k: 'cinturaCm', etq: 'Cintura', u: 'cm' },
  { k: 'pechoCm', etq: 'Pecho', u: 'cm' },
  { k: 'brazoCm', etq: 'Brazo', u: 'cm' },
  { k: 'musloCm', etq: 'Muslo', u: 'cm' }
];

const fechaCorta = (clave) => formatFechaCorta(fechaLocalDe(clave));
const diaCorto = (clave) => {
  const f = fechaLocalDe(clave);
  return `${conMayuscula(f.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', ''))} ${formatFechaCorta(f)}`;
};
const conUnidad = (v, u) => `<span class="num">${formatNumero(v)}</span> ${u}`;

// Variación del último peso contra el peso vigente hace 30 días (el último
// registrado ese día o antes). null si no hay con qué comparar.
export function variacionPeso30(medidas, hoy = diaKeyDe(new Date())) {
  const pesos = medidas.filter(m => typeof m.pesoKg === 'number');
  if (!pesos.length) return null;
  const ultimo = pesos[0];
  const ref = pesos.find(m => m.fecha <= sumarDias(hoy, -30));
  return { ultimo, delta: ref ? Math.round((ultimo.pesoKg - ref.pesoKg) * 10) / 10 : null };
}
// Solo el número va en mono.
const textoVariacion = (delta) => (delta === 0 ? 'sin cambios en 30 días'
  : `<span class="num">${delta > 0 ? '+' : '−'}${formatNumero(Math.abs(delta))}</span> en 30 días`);

// --- Tarjeta de la vista principal ---------------------------------------------
export function renderCuerpoTarjeta(medidas) {
  const v = variacionPeso30(medidas);
  const ultima = medidas[0];
  const cuerpo = v
    ? `<div class="cuerpo-peso"><span class="num">${formatNumero(v.ultimo.pesoKg)}</span> kg${v.delta !== null ? ` <span class="cuerpo-var">· ${textoVariacion(v.delta)}</span>` : ''}</div>
       <div class="cuerpo-sub">Último registro: ${escapeHtml(fechaCorta(ultima.fecha))}</div>`
    : ultima
      ? `<div class="cuerpo-sub">Sin peso registrado. Último registro: ${escapeHtml(fechaCorta(ultima.fecha))}</div>`
      : `<div class="cuerpo-sub">Registra tu peso y tus medidas para seguir tu evolución.</div>`;
  return `
    <section id="entreno-cuerpo" class="card cuerpo-tarjeta" aria-labelledby="cuerpo-titulo">
      <div class="cuerpo-etq num" id="cuerpo-titulo">CUERPO</div>
      ${cuerpo}
      <div class="cuerpo-acciones">
        <button type="button" id="btn-cuerpo-registrar" class="cuerpo-btn cuerpo-btn--primario tappable">Registrar medidas</button>
        ${medidas.length ? '<button type="button" id="btn-cuerpo-historial" class="cuerpo-btn tappable">Historial</button>' : ''}
      </div>
    </section>`;
}

// --- Historial (sub-vista) ---------------------------------------------------------
export function renderCuerpoHistorial(medidas) {
  const filas = medidas.map(m => {
    const valores = CAMPOS.filter(c => typeof m[c.k] === 'number')
      .map(c => `<span class="cuerpo-valor"><span class="cuerpo-valor-etq">${c.etq}</span> ${conUnidad(m[c.k], c.u)}</span>`).join('');
    const dia = diaCorto(m.fecha);
    return `
      <li class="cuerpo-fila" data-id="${escapeHtml(m.id)}" data-fecha="${escapeHtml(m.fecha)}">
        <div class="cuerpo-fila-dia num">${escapeHtml(dia)}</div>
        <div class="cuerpo-fila-valores">${valores}</div>
        ${m.nota ? `<p class="cuerpo-fila-nota">${escapeHtml(m.nota)}</p>` : ''}
        <div class="cuerpo-fila-acciones">
          <button type="button" class="cuerpo-btn btn-medida-editar tappable" data-id="${escapeHtml(m.id)}" aria-label="Editar la medida del ${escapeHtml(dia)}">Editar</button>
          <button type="button" class="cuerpo-btn btn-medida-eliminar tappable" data-id="${escapeHtml(m.id)}" aria-label="Eliminar la medida del ${escapeHtml(dia)}">Eliminar</button>
        </div>
      </li>`;
  }).join('');
  return `
    <div class="cuerpo-historial">
      <div class="cuerpo-historial-cab">
        <h2>Cuerpo</h2>
        <button type="button" id="btn-cuerpo-hist-registrar" class="cuerpo-btn cuerpo-btn--primario tappable">Registrar medidas</button>
      </div>
      ${medidas.length
        ? `<ul class="cuerpo-lista">${filas}</ul>`
        : '<p class="cuerpo-sub">Todavía no hay medidas registradas.</p>'}
    </div>`;
}

// --- Hoja de registro / edición ------------------------------------------------------
export function renderMedidaForm() {
  return `
    <div id="medida-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="medida-titulo">
      <div class="modal-content cuerpo-hoja">
        <h3 id="medida-titulo">Registrar medidas</h3>
        <form id="medida-form" novalidate>
          <input type="hidden" id="medida-id">
          <label class="cuerpo-campo cuerpo-campo--fecha">
            <span>Fecha</span>
            <input type="date" id="medida-fecha" required>
          </label>
          <div class="cuerpo-campos">
            ${CAMPOS.map(c => `
              <label class="cuerpo-campo">
                <span>${c.etq} (${c.u})</span>
                <input type="text" inputmode="decimal" id="medida-${c.k}" data-campo="${c.k}" autocomplete="off" placeholder="—">
                <small class="cuerpo-anterior" id="medida-ant-${c.k}"></small>
              </label>`).join('')}
          </div>
          <label class="cuerpo-campo">
            <span>Nota (opcional)</span>
            <textarea id="medida-nota" rows="2" maxlength="200" placeholder="Ej. en ayunas"></textarea>
          </label>
          <p class="cuerpo-error" id="medida-error" role="alert" hidden></p>
          <div class="cuerpo-hoja-acciones">
            <button type="button" id="medida-cancelar" class="cuerpo-btn tappable">Cancelar</button>
            <button type="submit" id="medida-guardar" class="cuerpo-btn cuerpo-btn--primario tappable">Guardar</button>
          </div>
        </form>
      </div>
    </div>`;
}

let alCambiar = null; // repinta la vista que esté mostrando las medidas

// Abre la hoja vacía (nueva) o con una medida (edición). Junto a cada campo,
// el valor anterior como referencia: el último registrado (o, al editar, el
// último anterior a esta medida).
export async function abrirMedidaForm(medida = null) {
  const modal = document.getElementById('medida-modal');
  if (!modal) return;
  const medidas = await db.getMedidas();
  const hoy = diaKeyDe(new Date());
  const desde = medida ? medidas.findIndex(m => m.id === medida.id) + 1 : 0;
  modal.querySelector('#medida-titulo').textContent = medida ? 'Editar medidas' : 'Registrar medidas';
  modal.querySelector('#medida-id').value = medida ? medida.id : '';
  const fecha = modal.querySelector('#medida-fecha');
  fecha.value = medida ? medida.fecha : hoy;
  fecha.max = hoy;
  CAMPOS.forEach(c => {
    const input = modal.querySelector(`#medida-${c.k}`);
    input.value = medida && typeof medida[c.k] === 'number' ? formatNumero(medida[c.k]) : '';
    const ant = medidas.slice(desde).find(m => typeof m[c.k] === 'number');
    modal.querySelector(`#medida-ant-${c.k}`).innerHTML = ant ? `Anterior: ${conUnidad(ant[c.k], c.u)} · ${escapeHtml(fechaCorta(ant.fecha))}` : '';
  });
  modal.querySelector('#medida-nota').value = medida && medida.nota ? medida.nota : '';
  const error = modal.querySelector('#medida-error');
  error.hidden = true;
  error.textContent = '';
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}

async function cerrarMedidaForm() {
  const modal = document.getElementById('medida-modal');
  if (!modal || !modal.classList.contains('open')) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
  await esperarSalidaDeModal('medida-modal');
}

// La hoja se renderiza una vez por render completo de Entreno: sus
// listeners se asignan acá, tras cada render.
export function setupMedidaForm() {
  const modal = document.getElementById('medida-modal');
  if (!modal) return;
  modal.querySelector('#medida-cancelar').addEventListener('click', () => cerrarMedidaForm());
  modal.querySelector('#medida-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = modal.querySelector('#medida-guardar');
    const error = modal.querySelector('#medida-error');
    const id = modal.querySelector('#medida-id').value;
    const datos = { fecha: modal.querySelector('#medida-fecha').value, nota: modal.querySelector('#medida-nota').value };
    CAMPOS.forEach(c => { datos[c.k] = modal.querySelector(`#medida-${c.k}`).value.trim(); });
    btn.disabled = true;
    try {
      if (id) await db.editarMedida(id, datos);
      else await db.registrarMedida(datos);
    } catch (err) {
      error.textContent = err.message || 'No se pudo guardar. Inténtalo de nuevo.';
      error.hidden = false;
      btn.disabled = false;
      return;
    }
    btn.disabled = false;
    await cerrarMedidaForm();
    Toast(id ? 'Medidas actualizadas' : 'Medidas registradas', 'success');
    if (alCambiar) await alCambiar();
  });
}

// Botones de la tarjeta o del historial (lo que esté en pantalla). Se
// llama tras cada render de esa parte. `repintar`: vuelve a pintar la vista
// actual después de guardar o eliminar.
export function initCuerpo({ repintar, abrirHistorial, signal } = {}) {
  alCambiar = repintar || null;
  const opts = signal ? { signal } : undefined;
  // La tarjeta sigue en el DOM (oculta) con el historial abierto: ids distintos.
  document.getElementById(abrirHistorial ? 'btn-cuerpo-registrar' : 'btn-cuerpo-hist-registrar')?.addEventListener('click', () => abrirMedidaForm(), opts);
  document.getElementById('btn-cuerpo-historial')?.addEventListener('click', () => abrirHistorial && abrirHistorial(), opts);
  document.querySelectorAll('.btn-medida-editar').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.id;
    const medida = (await db.getMedidas()).find(m => m.id === id);
    if (medida) abrirMedidaForm(medida);
  }, opts));
  document.querySelectorAll('.btn-medida-eliminar').forEach(b => b.addEventListener('click', async () => {
    // El id y la fecha se capturan antes de cualquier await.
    const id = b.dataset.id;
    const fecha = b.closest('.cuerpo-fila')?.dataset.fecha;
    const ok = await ConfirmDialog('¿Eliminar esta medida?', `Se borra la medida del ${fecha ? fechaCorta(fecha) : 'día elegido'}. No se puede deshacer.`, { verb: 'Eliminar' });
    if (!ok) return;
    await db.eliminarMedida(id);
    Toast('Medida eliminada', 'success');
    if (alCambiar) await alCambiar();
  }, opts));
}
