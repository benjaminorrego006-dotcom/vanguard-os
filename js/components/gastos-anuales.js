// js/components/gastos-anuales.js
// Finanzas › Recurrentes › "Gastos anuales" (docs/PLAN-PENDIENTES-OCT.md, B2):
// una fila por gasto (nombre, vencimiento, barra saldo del sobre / monto en
// ámbar y "Apartar este mes") y la hoja para crear, editar y eliminar
// (#anual-modal, .modal-overlay + open: Atrás la cierra vía history.js; no
// tapa la barra inferior ni el riel). Cada gasto tiene su sobre; el
// arrastre de saldos hace de alcancía (ver db.crearGastoAnual).
import { db, calcularApartarGastoAnual } from '../core/db.js';
import { formatCurrency } from '../utils/currency.js';
import { escapeHtml } from '../utils/escape.js';
import { diaKeyDe, fechaLocalDe, formatFechaLarga } from '../utils/fecha.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { esperarSalidaDeModal } from '../core/history.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ID = 'anual-modal';
let editando = null; // gasto en edición (null = nuevo)
let baseEdicion = 0; // saldo del sobre sin lo asignado este mes, para la vista previa
let pintadoN = 0;

const fechaCorta = (clave) => formatFechaLarga(fechaLocalDe(clave));
const soloDigitos = (v) => String(v || '').replace(/\D/g, '');

function filaHtml({ gasto, ap }) {
  const pct = gasto.monto > 0 ? Math.max(0, Math.min(100, (ap.saldo / gasto.monto) * 100)) : 0;
  const negativo = ap.saldo < 0;
  const cubierto = ap.sugerido === 0;
  return `
    <div class="anual-fila tappable" role="button" tabindex="0" data-id="${gasto.id}" aria-label="Editar ${escapeHtml(gasto.nombre)}">
      <div class="anual-cab">
        <span class="anual-nombre">${escapeHtml(gasto.nombre)}</span>
        <span class="anual-fecha num">${escapeHtml(fechaCorta(ap.vence))}</span>
      </div>
      <div class="anual-barra" aria-hidden="true"><div style="width: ${pct.toFixed(1)}%;"></div></div>
      <div class="anual-pie">
        <span class="num${negativo ? ' anual-negativo' : ''}">${formatCurrency(ap.saldo)} de ${formatCurrency(gasto.monto)}</span>
        <span class="anual-apartar">${cubierto ? 'Cubierto' : `Apartar este mes: <span class="num">${formatCurrency(ap.sugerido)}</span>`}</span>
      </div>
    </div>`;
}

// HTML de la sección completa (lee los gastos y el saldo de cada sobre).
export async function renderAnualesHTML() {
  const gastos = await db.getGastosAnuales();
  const filas = await Promise.all(gastos.map(async gasto => ({ gasto, ap: await db.apartarSugerido(gasto) })));
  return `
    <section class="card anual-seccion" aria-labelledby="anual-titulo">
      <div class="anual-seccion-cab">
        <div>
          <p class="fin-eyebrow" id="anual-titulo" style="margin: 0;">Gastos anuales</p>
          <p class="anual-ayuda">Cada uno tiene su sobre: lo que apartas cada mes se acumula hasta que vence.</p>
        </div>
        <button type="button" id="btn-anual-nuevo" class="anual-btn tappable">+ Agregar</button>
      </div>
      ${filas.length
        ? filas.map(filaHtml).join('')
        : '<p class="anual-vacio">Todavía no tienes gastos anuales. Agrega uno, como la patente o un seguro.</p>'}
    </section>`;
}

export function renderAnualForm() {
  return `
    <div id="${ID}" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="anual-form-titulo">
      <div class="modal-content anual-hoja">
        <div class="anual-etq">GASTO ANUAL</div>
        <h3 id="anual-form-titulo">Nuevo gasto anual</h3>
        <form id="anual-form" novalidate>
          <label class="anual-campo">Nombre
            <input type="text" id="anual-nombre" maxlength="40" autocomplete="off" placeholder="Patente, seguro, permiso…">
          </label>
          <label class="anual-campo">Monto
            <input type="text" id="anual-monto" inputmode="numeric" autocomplete="off" placeholder="180000">
          </label>
          <div class="anual-campos">
            <label class="anual-campo">Día
              <select id="anual-dia">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select>
            </label>
            <label class="anual-campo">Mes
              <select id="anual-mes">${MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
            </label>
          </div>
          <p class="anual-preview" id="anual-preview" aria-live="polite"></p>
          <p class="anual-error" id="anual-error" hidden></p>
          <div class="anual-acciones">
            <button type="button" id="anual-cancelar" class="anual-btn">Cancelar</button>
            <button type="submit" id="anual-guardar" class="anual-btn anual-btn--primario">Guardar</button>
          </div>
          <button type="button" id="anual-eliminar" class="anual-eliminar" hidden>Eliminar gasto anual</button>
        </form>
      </div>
    </div>`;
}

function datosForm() {
  return {
    nombre: document.getElementById('anual-nombre').value,
    monto: Number(soloDigitos(document.getElementById('anual-monto').value)),
    dia: Number(document.getElementById('anual-dia').value),
    mes: Number(document.getElementById('anual-mes').value)
  };
}

function pintarPreview() {
  const el = document.getElementById('anual-preview');
  if (!el) return;
  const d = datosForm();
  if (!(d.monto > 0)) { el.textContent = 'Ingresa el monto para ver cuánto apartar cada mes.'; return; }
  const r = calcularApartarGastoAnual(d, baseEdicion, diaKeyDe(new Date()));
  const meses = r.meses === 1 ? '1 mes' : `${r.meses} meses`;
  el.innerHTML = `${formatCurrency(d.monto)} · vence el <span class="num">${escapeHtml(fechaCorta(r.vence))}</span><br>`
    + (r.sugerido === 0 ? 'Ya está cubierto.' : `Apartar este mes: <strong class="num">${formatCurrency(r.sugerido)}</strong> (${meses}, contando este)`);
}

async function cerrar() {
  const modal = document.getElementById(ID);
  if (!modal || !modal.classList.contains('open')) return;
  modal.classList.remove('open');
  setTimeout(() => { if (!modal.classList.contains('open')) modal.style.display = 'none'; }, 300);
  await esperarSalidaDeModal(ID);
}

async function abrir(gasto = null) {
  const modal = document.getElementById(ID);
  if (!modal) return;
  editando = gasto;
  baseEdicion = 0;
  document.getElementById('anual-form-titulo').textContent = gasto ? 'Editar gasto anual' : 'Nuevo gasto anual';
  document.getElementById('anual-nombre').value = gasto ? gasto.nombre : '';
  document.getElementById('anual-monto').value = gasto ? String(gasto.monto) : '';
  document.getElementById('anual-dia').value = String(gasto ? gasto.dia : 1);
  document.getElementById('anual-mes').value = String(gasto ? gasto.mes : 1);
  document.getElementById('anual-eliminar').hidden = !gasto;
  document.getElementById('anual-error').hidden = true;
  pintarPreview();
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
  if (gasto) {
    const ap = await db.apartarSugerido(gasto);
    if (editando !== gasto) return;
    baseEdicion = ap.base;
    pintarPreview();
  }
}

function enlazarFilas() {
  const nuevo = document.getElementById('btn-anual-nuevo');
  if (nuevo) nuevo.addEventListener('click', () => abrir());
  document.querySelectorAll('.anual-fila').forEach(fila => {
    const abrirFila = async () => {
      const id = fila.getAttribute('data-id');
      const gasto = (await db.getGastosAnuales()).find(g => g.id === id);
      if (gasto) abrir(gasto);
    };
    fila.addEventListener('click', abrirFila);
    fila.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirFila(); } });
  });
}

// Repinta la sección (desde el refresco de Finanzas). Si dos repintados se
// cruzan, gana el último que empezó.
export async function repintarAnuales() {
  const cont = document.getElementById('anuales-container');
  if (!cont) return;
  const n = ++pintadoN;
  const html = await renderAnualesHTML();
  if (n !== pintadoN || !cont.isConnected) return;
  cont.innerHTML = html;
  enlazarFilas();
}

// Listeners de la hoja y de las filas, tras cada render de Finanzas.
export function initAnuales() {
  enlazarFilas();
  const modal = document.getElementById(ID);
  if (!modal) return;
  ['anual-nombre', 'anual-monto', 'anual-dia', 'anual-mes'].forEach(id => {
    document.getElementById(id).addEventListener(id === 'anual-dia' || id === 'anual-mes' ? 'change' : 'input', pintarPreview);
  });
  document.getElementById('anual-monto').addEventListener('input', (e) => {
    const limpio = soloDigitos(e.target.value);
    if (limpio !== e.target.value) e.target.value = limpio;
  });
  document.getElementById('anual-cancelar').addEventListener('click', () => cerrar());
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

  document.getElementById('anual-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Todo lo del formulario, antes de cualquier await.
    const datos = datosForm();
    const gasto = editando;
    const btn = document.getElementById('anual-guardar');
    const error = document.getElementById('anual-error');
    btn.disabled = true;
    try {
      if (gasto) await db.editarGastoAnual(gasto.id, datos);
      else await db.crearGastoAnual(datos);
      await cerrar();
      Toast(gasto ? 'Gasto anual guardado' : `Gasto anual creado, con su sobre "${datos.nombre.trim()}"`, 'success');
      repintarAnuales();
    } catch (err) {
      error.textContent = err.message || 'No se pudo guardar.';
      error.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('anual-eliminar').addEventListener('click', async () => {
    const gasto = editando;
    if (!gasto) return;
    await cerrar();
    const ok = await ConfirmDialog(
      `Eliminar ${gasto.nombre}`,
      `Su sobre se archiva con su historial y su saldo; puedes desarchivarlo en Cuentas.`,
      { verb: 'Eliminar' }
    );
    if (!ok) return;
    const r = await db.eliminarGastoAnual(gasto.id);
    if (r.ok && !r.sobreArchivado && r.recurrentes.length) {
      Toast(`Gasto eliminado. Su sobre sigue activo porque tiene recurrentes: ${r.recurrentes.join(', ')}.`, 'warning', 4500);
    } else {
      Toast('Gasto eliminado; su sobre quedó archivado', 'success');
    }
    repintarAnuales();
  });
}
