// Fotos de progreso (docs/FASE6-MEDIDAS.md, F4): solo en este dispositivo.
// - reducirFoto: canvas a 1080 px en el lado largo, JPEG calidad 0,82.
// - Galería por fecha en Entreno › Cuerpo (historial), con aviso fijo, visor
//   (#foto-modal) con Eliminar y comparación "antes / ahora"
//   (#foto-comparar-modal). Ambos son hojas de Órbita (oHoja, Fase 9e):
//   Atrás las cierra vía history.js.
// - Fotos pendientes de la hoja de registro: se guardan al guardar la
//   medida, con su fecha y su id.
// Las imágenes se muestran con object URLs, que se liberan al repintar, al
// eliminar y al salir de Entreno.
import { db } from '../core/db.js';
import { esperarSalidaDeModal } from '../core/history.js';
import { diaKeyDe, fechaLocalDe, formatFechaCorta } from '../utils/fecha.js';
import { formatNumero } from '../utils/numero.js';
import { escapeHtml } from '../utils/escape.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { oIcono, oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';

export const LADO_MAX = 1080;
export const CALIDAD_JPEG = 0.82;

const fechaCorta = (clave) => formatFechaCorta(fechaLocalDe(clave));

// --- Reducción -------------------------------------------------------------------
async function decodificar(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* sigue con <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function reducirFoto(file) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('El archivo no es una imagen.');
  const fuente = await decodificar(file);
  const w0 = fuente.width || fuente.naturalWidth, h0 = fuente.height || fuente.naturalHeight;
  if (!w0 || !h0) throw new Error('No se pudo leer la imagen.');
  const escala = Math.min(1, LADO_MAX / Math.max(w0, h0));
  const ancho = Math.max(1, Math.round(w0 * escala)), alto = Math.max(1, Math.round(h0 * escala));
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d').drawImage(fuente, 0, 0, ancho, alto);
  if (typeof fuente.close === 'function') fuente.close();
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', CALIDAD_JPEG));
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  return { blob, ancho, alto };
}

// --- Object URLs -----------------------------------------------------------------
const urls = new Map(); // id de la foto -> object URL
function urlDe(foto) {
  if (!urls.has(foto.id)) urls.set(foto.id, URL.createObjectURL(foto.blob));
  return urls.get(foto.id);
}
function liberar(id) {
  const u = urls.get(id);
  if (u) { URL.revokeObjectURL(u); urls.delete(id); }
}
export function cleanupFotos() {
  urls.forEach(u => URL.revokeObjectURL(u));
  urls.clear();
  limpiarPendientes();
}

// --- Selectores de archivo ---------------------------------------------------------
// "Tomar foto" abre la cámara (capture); "Elegir foto" deja elegir de la
// galería (un input con capture no lo permite). `clase`: la de los botones
// (la galería de Cuerpo ya es Órbita; la hoja de registro sigue en MK III).
export const botonesAgregar = (prefijo, clase = 'o-btn o-btn--secundario') => `
  <button type="button" class="${clase}" data-abrir="${prefijo}-camara">Tomar foto</button>
  <button type="button" class="${clase}" data-abrir="${prefijo}-galeria">Elegir foto</button>
  <input type="file" id="${prefijo}-camara" accept="image/*" capture="environment" hidden>
  <input type="file" id="${prefijo}-galeria" accept="image/*" multiple hidden>`;

function engancharBotones(raiz, alElegir, opts) {
  raiz.querySelectorAll('[data-abrir]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.abrir)?.click(), opts));
  raiz.querySelectorAll('input[type="file"]').forEach(input => input.addEventListener('change', async () => {
    const archivos = [...(input.files || [])];
    input.value = '';
    if (archivos.length) await alElegir(archivos);
  }, opts));
}

async function procesar(archivos, alListo) {
  let ok = 0;
  for (const f of archivos) {
    try { await alListo(await reducirFoto(f)); ok++; } catch (e) { Toast(e.message || 'No se pudo agregar la foto.', 'error'); }
  }
  return ok;
}

// --- Galería (en el historial de Cuerpo) -----------------------------------------------
export function renderFotosSeccion(fotos) {
  const porDia = new Map();
  fotos.forEach(f => { if (!porDia.has(f.fecha)) porDia.set(f.fecha, []); porDia.get(f.fecha).push(f); });
  // Órbita (Fase 9c); data-foto: lo que lee tools/verificar/foto-progreso.mjs.
  const grupos = [...porDia.entries()].map(([fecha, lista]) => `
    <div class="o-ent-fotos-dia" data-fecha="${escapeHtml(fecha)}" data-foto="fotos-dia">
      <h4 class="o-rotulo" data-foto="fotos-fecha">${escapeHtml(fechaCorta(fecha))}</h4>
      <div class="o-ent-fotos-grid">
        ${lista.map(f => `<button type="button" class="o-ent-foto" data-id="${escapeHtml(f.id)}" aria-label="Ver la foto del ${escapeHtml(fechaCorta(f.fecha))}"><img src="${urlDe(f)}" alt="" loading="lazy"></button>`).join('')}
      </div>
    </div>`).join('');
  return `
    <section class="o-card o-ent-fotos" aria-labelledby="cuerpo-fotos-titulo">
      <div class="o-ent-cgraf-cab">
        <h3 class="o-card-titulo" id="cuerpo-fotos-titulo">Fotos${fotos.length ? ` · <span class="o-num">${fotos.length}</span>` : ''}</h3>
        ${fotos.length >= 2 ? '<button type="button" id="btn-fotos-comparar" class="o-btn o-btn--secundario">Comparar</button>' : ''}
      </div>
      <div class="o-alerta o-alerta--aviso">
        <span class="o-alerta-ico">${oIcono('info')}</span>
        <span class="o-alerta-cuerpo"><span class="o-alerta-linea">Las fotos quedan solo en este teléfono. Exporta tus fotos para no perderlas.</span></span>
      </div>
      <div class="o-ent-acciones">${botonesAgregar('fotos-input', 'o-btn o-btn--secundario')}</div>
      ${fotos.length ? grupos : '<p class="o-card-texto">Todavía no hay fotos.</p>'}
    </section>`;
}

// Tras insertar renderFotosSeccion. `repintar`: vuelve a pintar el historial.
export function initFotos({ repintar, signal } = {}) {
  const opts = signal ? { signal } : undefined;
  const seccion = document.querySelector('.o-ent-fotos');
  if (!seccion) return;
  engancharBotones(seccion, async (archivos) => {
    const hoy = diaKeyDe(new Date());
    const n = await procesar(archivos, (r) => db.agregarFoto({ ...r, fecha: hoy }));
    if (n) Toast(n === 1 ? 'Foto agregada' : `${n} fotos agregadas`, 'success');
    if (n && repintar) await repintar();
  }, opts);
  seccion.querySelectorAll('.o-ent-foto').forEach(b => b.addEventListener('click', () => abrirFoto(b.dataset.id, repintar), opts));
  document.getElementById('btn-fotos-comparar')?.addEventListener('click', () => abrirComparar(), opts);
}

// --- Visor y comparación -----------------------------------------------------------------
export function renderFotoModales() {
  const visor = oHoja({
    id: 'foto-modal', modulo: 'entreno', titulo: '',
    cuerpo: `
      <div class="o-ent-foto-grande"><img id="foto-img" alt=""></div>
      <p class="o-card-texto o-num" id="foto-tam"></p>`,
    pie: '<button type="button" id="foto-eliminar" class="o-btn o-btn--secundario">Eliminar</button><button type="button" id="foto-cerrar" class="o-btn o-btn--primario">Cerrar</button>'
  });
  const comparar = oHoja({
    id: 'foto-comparar-modal', modulo: 'entreno', titulo: 'Antes / ahora',
    cuerpo: `
      <div class="o-ent-foto-comparar">
        ${['antes', 'ahora'].map(k => `
          <div class="o-campo">
            <label for="foto-sel-${k}">${k === 'antes' ? 'Antes' : 'Ahora'}</label>
            <select id="foto-sel-${k}" class="o-input"></select>
            <div class="o-ent-foto-grande"><img id="foto-cmp-${k}" alt=""></div>
          </div>`).join('')}
      </div>`,
    pie: '<button type="button" id="foto-comparar-cerrar" class="o-btn o-btn--primario">Cerrar</button>'
  });
  return visor + comparar;
}

function abrirModal(modal) {
  abrirHoja(modal.id);
}
async function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (!modal || !modal.classList.contains('open')) return;
  await cerrarHoja(id);
  await esperarSalidaDeModal(id);
}

let fotoAbierta = null;
let alEliminar = null;

async function abrirFoto(id, repintar) {
  const modal = document.getElementById('foto-modal');
  const foto = await db.getFoto(id);
  if (!modal || !foto) return;
  fotoAbierta = foto.id;
  alEliminar = repintar || null;
  modal.querySelector('#foto-modal-titulo').textContent = fechaCorta(foto.fecha);
  const img = modal.querySelector('#foto-img');
  img.src = urlDe(foto);
  img.alt = `Foto del ${fechaCorta(foto.fecha)}`;
  modal.querySelector('#foto-tam').textContent = `${foto.ancho} × ${foto.alto} px · ${formatNumero(foto.blob.size / 1024, { decimales: 0 })} KB`;
  abrirModal(modal);
}

async function abrirComparar() {
  const modal = document.getElementById('foto-comparar-modal');
  const fotos = (await db.getFotos()).slice().reverse(); // de la más antigua a la más nueva
  if (!modal || fotos.length < 2) return;
  const veces = new Map();
  const etiqueta = fotos.map(f => { const n = (veces.get(f.fecha) || 0) + 1; veces.set(f.fecha, n); return n; });
  const total = new Map(); fotos.forEach(f => total.set(f.fecha, (total.get(f.fecha) || 0) + 1));
  const opciones = fotos.map((f, i) => `<option value="${escapeHtml(f.id)}">${escapeHtml(fechaCorta(f.fecha))}${total.get(f.fecha) > 1 ? ` (${etiqueta[i]})` : ''}</option>`).join('');
  const porId = new Map(fotos.map(f => [f.id, f]));
  [['antes', fotos[0]], ['ahora', fotos[fotos.length - 1]]].forEach(([k, f]) => {
    const sel = modal.querySelector(`#foto-sel-${k}`);
    const img = modal.querySelector(`#foto-cmp-${k}`);
    sel.innerHTML = opciones;
    sel.value = f.id;
    const poner = () => { const x = porId.get(sel.value); if (x) { img.src = urlDe(x); img.alt = `${k === 'antes' ? 'Antes' : 'Ahora'}: foto del ${fechaCorta(x.fecha)}`; } };
    sel.onchange = poner;
    poner();
  });
  abrirModal(modal);
}

// Una vez por render de Entreno (los modales se pintan con la vista).
export function setupFotoModales() {
  const ver = document.getElementById('foto-modal');
  if (!ver) return;
  montarHoja('foto-modal');
  montarHoja('foto-comparar-modal');
  ver.querySelector('#foto-cerrar').addEventListener('click', () => cerrarModal('foto-modal'));
  ver.querySelector('#foto-eliminar').addEventListener('click', async () => {
    const id = fotoAbierta; // antes de cualquier await
    if (!id) return;
    const ok = await ConfirmDialog('¿Eliminar esta foto?', 'Se borra de este teléfono. No se puede deshacer.', { verb: 'Eliminar' });
    if (!ok) return;
    await db.eliminarFoto(id);
    await cerrarModal('foto-modal');
    liberar(id);
    fotoAbierta = null;
    Toast('Foto eliminada', 'success');
    if (alEliminar) await alEliminar();
  });
  document.getElementById('foto-comparar-cerrar')?.addEventListener('click', () => cerrarModal('foto-comparar-modal'));
}

// --- Fotos pendientes de la hoja de registro ----------------------------------------------
let pendientes = []; // { blob, ancho, alto, url }

export function limpiarPendientes() {
  pendientes.forEach(p => URL.revokeObjectURL(p.url));
  pendientes = [];
  pintarPendientes();
}
function pintarPendientes() {
  const caja = document.getElementById('medida-fotos-pend');
  if (!caja) return;
  caja.innerHTML = pendientes.map((p, i) => `
    <div class="foto-pend">
      <img src="${p.url}" alt="Foto ${i + 1} para guardar">
      <button type="button" class="foto-pend-quitar" data-i="${i}" aria-label="Quitar la foto ${i + 1}">${oIcono('cerrar')}</button>
    </div>`).join('');
  caja.querySelectorAll('.foto-pend-quitar').forEach(b => b.addEventListener('click', () => {
    const [p] = pendientes.splice(Number(b.dataset.i), 1);
    if (p) URL.revokeObjectURL(p.url);
    pintarPendientes();
  }));
}
// Tras pintar la hoja (una vez por render de Entreno).
export function setupFotosHoja() {
  const raiz = document.getElementById('medida-fotos');
  if (!raiz) return;
  engancharBotones(raiz, async (archivos) => {
    await procesar(archivos, async (r) => { pendientes.push({ ...r, url: URL.createObjectURL(r.blob) }); });
    pintarPendientes();
  });
}
// Al guardar la medida: las pendientes quedan con su fecha y su id.
export async function guardarPendientes({ fecha, medidaId }) {
  const lista = pendientes;
  pendientes = [];
  for (const p of lista) {
    await db.agregarFoto({ blob: p.blob, ancho: p.ancho, alto: p.alto, fecha, medidaId });
    URL.revokeObjectURL(p.url);
  }
  pintarPendientes();
  return lista.length;
}
