// js/components/gastos-anuales.js
// Finanzas › Recurrentes › "Gastos anuales" (docs/PLAN-PENDIENTES-OCT.md, B2):
// una fila por gasto (nombre, vencimiento, barra saldo del sobre / monto en
// ámbar y "Apartar este mes") y la hoja para crear, editar y eliminar
// (#anual-modal, .modal-overlay + open: Atrás la cierra vía history.js).
// Cada gasto tiene su sobre; el
// arrastre de saldos hace de alcancía (ver db.crearGastoAnual).
import { db, calcularApartarGastoAnual } from '../core/db.js';
import { formatCurrency } from '../utils/currency.js';
import { escapeHtml } from '../utils/escape.js';
import { diaKeyDe, fechaLocalDe, formatFechaLarga } from '../utils/fecha.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { esperarSalidaDeModal } from '../core/history.js';
import { oIcono, oHoja, abrirHoja, cerrarHoja } from './orbita.js';

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
    <li>
      <button type="button" class="o-card o-anual-fila anual-fila" data-id="${escapeHtml(gasto.id)}" aria-label="Editar ${escapeHtml(gasto.nombre)}">
        <span class="o-anual-cab">
          <span class="o-anual-nombre anual-nombre">${escapeHtml(gasto.nombre)}</span>
          <span class="o-num o-anual-fecha">${escapeHtml(fechaCorta(ap.vence))}</span>
        </span>
        <span class="o-anual-barra" aria-hidden="true"><i style="width: ${pct.toFixed(1)}%;"></i></span>
        <span class="o-anual-pie anual-pie">
          <span class="o-num${negativo ? ' o-anual-negativo' : ''}">${negativo ? oIcono('alerta') : ''}${formatCurrency(ap.saldo)} de ${formatCurrency(gasto.monto)}</span>
          <span class="o-anual-apartar">${cubierto ? 'Cubierto' : `Apartar este mes: <span class="o-num">${formatCurrency(ap.sugerido)}</span>`}</span>
        </span>
      </button>
    </li>`;
}

// HTML de la sección completa (lee los gastos y el saldo de cada sobre).
export async function renderAnualesHTML() {
  const gastos = await db.getGastosAnuales();
  const filas = await Promise.all(gastos.map(async gasto => ({ gasto, ap: await db.apartarSugerido(gasto) })));
  return `
    <section class="o-fin-seccion o-anual-seccion" aria-labelledby="anual-titulo">
      <div class="o-fin-seccion-cab">
        <div>
          <h2 class="o-rotulo" id="anual-titulo">Gastos anuales</h2>
          <p class="o-fin-pista">Cada uno tiene su sobre: lo que apartas cada mes se acumula hasta que vence.</p>
        </div>
        <button type="button" id="btn-anual-nuevo" class="o-btn o-btn--secundario">Agregar</button>
      </div>
      ${filas.length
        ? `<ul class="o-lista">${filas.map(filaHtml).join('')}</ul>`
        : '<p class="o-card o-fin-pista">Todavía no tienes gastos anuales. Agrega uno, como la patente o un seguro.</p>'}
    </section>`;
}

// Hoja de crear y editar (Órbita, oHoja #anual-modal; Fase 8b).
export function renderAnualForm() {
  return oHoja({
    id: ID, titulo: 'Nuevo gasto anual', modulo: 'finanzas',
    cuerpo: `
      <form id="anual-form" class="o-hoja-cuerpo" novalidate>
        <div class="o-campo">
          <label for="anual-nombre">Nombre</label>
          <input type="text" id="anual-nombre" class="o-input" maxlength="40" autocomplete="off" placeholder="Patente, seguro, permiso…">
        </div>
        <div class="o-campo">
          <label for="anual-monto">Monto</label>
          <input type="text" id="anual-monto" class="o-input o-input--monto" inputmode="numeric" autocomplete="off" placeholder="180000">
        </div>
        <div class="o-fin-hoja-par o-fin-hoja-par--1-2">
          <div class="o-campo">
            <label for="anual-dia">Día</label>
            <select id="anual-dia" class="o-input">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select>
          </div>
          <div class="o-campo">
            <label for="anual-mes">Mes</label>
            <select id="anual-mes" class="o-input">${MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
          </div>
        </div>
        <p class="o-card o-anual-preview" id="anual-preview" aria-live="polite"></p>
        <p class="o-campo-error" id="anual-error" role="alert" hidden></p>
        <button type="button" id="anual-eliminar" class="o-btn o-btn--secundario o-fin-eliminar" hidden>Eliminar gasto anual</button>
      </form>`,
    pie: '<button type="button" id="anual-cancelar" class="o-btn o-btn--secundario">Cancelar</button><button type="submit" form="anual-form" id="anual-guardar" class="o-btn o-btn--primario">Guardar</button>'
  });
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
  el.innerHTML = `<span class="o-num">${formatCurrency(d.monto)}</span> · vence el <span class="o-num">${escapeHtml(fechaCorta(r.vence))}</span><br>`
    + (r.sugerido === 0 ? 'Ya está cubierto.' : `Apartar este mes: <strong class="o-num">${formatCurrency(r.sugerido)}</strong> (${meses}, contando este)`);
}

async function cerrar() {
  const modal = document.getElementById(ID);
  if (!modal || !modal.classList.contains('open')) return;
  await cerrarHoja(ID);
  await esperarSalidaDeModal(ID);
}

async function abrir(gasto = null) {
  const modal = document.getElementById(ID);
  if (!modal) return;
  editando = gasto;
  baseEdicion = 0;
  document.getElementById(`${ID}-titulo`).textContent = gasto ? 'Editar gasto anual' : 'Nuevo gasto anual';
  document.getElementById('anual-nombre').value = gasto ? gasto.nombre : '';
  document.getElementById('anual-monto').value = gasto ? String(gasto.monto) : '';
  document.getElementById('anual-dia').value = String(gasto ? gasto.dia : 1);
  document.getElementById('anual-mes').value = String(gasto ? gasto.mes : 1);
  document.getElementById('anual-eliminar').hidden = !gasto;
  document.getElementById('anual-error').hidden = true;
  pintarPreview();
  abrirHoja(ID);
  if (gasto) {
    const ap = await db.apartarSugerido(gasto);
    if (editando !== gasto) return;
    baseEdicion = ap.base;
    pintarPreview();
  }
}

// Botón Agregar y filas: tras cada render de la sección (Finanzas los
// llama en cada repintado; repintarAnuales, después de guardar).
export function enlazarFilasAnuales() {
  const nuevo = document.getElementById('btn-anual-nuevo');
  if (nuevo) nuevo.addEventListener('click', () => abrir());
  document.querySelectorAll('.anual-fila').forEach(fila => {
    const abrirFila = async () => {
      const id = fila.getAttribute('data-id');
      const gasto = (await db.getGastosAnuales()).find(g => g.id === id);
      if (gasto) abrir(gasto);
    };
    fila.addEventListener('click', abrirFila);
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
  enlazarFilasAnuales();
}

// Listeners de la hoja (una vez por montaje de Finanzas).
export function initAnuales() {
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
  modal.querySelectorAll('[data-hoja-cerrar]').forEach(b => b.addEventListener('click', () => cerrar()));
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
      error.innerHTML = `${oIcono('alerta')}<span>${escapeHtml(err.message || 'No se pudo guardar.')}</span>`;
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
      `Su sobre se archiva con su historial y su saldo; puedes desarchivarlo en Sobres.`,
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
