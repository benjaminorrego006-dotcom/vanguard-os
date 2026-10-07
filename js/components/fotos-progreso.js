// Fotos de progreso (docs/FASE6-MEDIDAS.md, F4): solo en este dispositivo.
// - reducirFoto: canvas a 1080 px en el lado largo, JPEG calidad 0,82.
// - Galería por fecha en Entreno › Cuerpo (historial), con aviso fijo, visor
//   (#foto-modal) con Eliminar y comparación "antes / ahora"
//   (#foto-comparar-modal). Ambos son .modal-overlay + open: Atrás los
//   cierra vía history.js.
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
// galería (un input con capture no lo permite).
export const botonesAgregar = (prefijo) => `
  <button type="button" class="cuerpo-btn tappable" data-abrir="${prefijo}-camara">Tomar foto</button>
  <button type="button" class="cuerpo-btn tappable" data-abrir="${prefijo}-galeria">Elegir foto</button>
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
  const grupos = [...porDia.entries()].map(([fecha, lista]) => `
    <div class="fotos-dia" data-fecha="${escapeHtml(fecha)}">
      <h4 class="fotos-dia-titulo num">${escapeHtml(fechaCorta(fecha))}</h4>
      <div class="fotos-grid">
        ${lista.map(f => `<button type="button" class="foto-mini tappable" data-id="${escapeHtml(f.id)}" aria-label="Ver la foto del ${escapeHtml(fechaCorta(f.fecha))}"><img src="${urlDe(f)}" alt="" loading="lazy"></button>`).join('')}
      </div>
    </div>`).join('');
  return `
    <section class="card cuerpo-fotos" aria-labelledby="cuerpo-fotos-titulo">
      <div class="cuerpo-graf-cab">
        <h3 id="cuerpo-fotos-titulo">Fotos${fotos.length ? ` · <span class="num">${fotos.length}</span>` : ''}</h3>
        ${fotos.length >= 2 ? '<button type="button" id="btn-fotos-comparar" class="cuerpo-btn tappable">Comparar</button>' : ''}
      </div>
      <p class="cuerpo-fotos-aviso">Las fotos quedan solo en este teléfono. Exporta tus fotos para no perderlas.</p>
      <div class="cuerpo-fotos-acciones">${botonesAgregar('fotos-input')}</div>
      ${fotos.length ? grupos : '<p class="cuerpo-sub">Todavía no hay fotos.</p>'}
    </section>`;
}

// Tras insertar renderFotosSeccion. `repintar`: vuelve a pintar el historial.
export function initFotos({ repintar, signal } = {}) {
  const opts = signal ? { signal } : undefined;
  const seccion = document.querySelector('.cuerpo-fotos');
  if (!seccion) return;
  engancharBotones(seccion, async (archivos) => {
    const hoy = diaKeyDe(new Date());
    const n = await procesar(archivos, (r) => db.agregarFoto({ ...r, fecha: hoy }));
    if (n) Toast(n === 1 ? 'Foto agregada' : `${n} fotos agregadas`, 'success');
    if (n && repintar) await repintar();
  }, opts);
  seccion.querySelectorAll('.foto-mini').forEach(b => b.addEventListener('click', () => abrirFoto(b.dataset.id, repintar), opts));
  document.getElementById('btn-fotos-comparar')?.addEventListener('click', () => abrirComparar(), opts);
}

// --- Visor y comparación -----------------------------------------------------------------
export function renderFotoModales() {
  return `
    <div id="foto-modal" class="modal-overlay foto-overlay" role="dialog" aria-modal="true" aria-labelledby="foto-titulo">
      <div class="modal-content foto-hoja">
        <h3 id="foto-titulo" class="num"></h3>
        <div class="foto-grande"><img id="foto-img" alt=""></div>
        <p class="cuerpo-sub num" id="foto-tam"></p>
        <div class="cuerpo-hoja-acciones">
          <button type="button" id="foto-eliminar" class="cuerpo-btn tappable">Eliminar</button>
          <button type="button" id="foto-cerrar" class="cuerpo-btn cuerpo-btn--primario tappable">Cerrar</button>
        </div>
      </div>
    </div>
    <div id="foto-comparar-modal" class="modal-overlay foto-overlay" role="dialog" aria-modal="true" aria-labelledby="foto-comparar-titulo">
      <div class="modal-content foto-hoja">
        <h3 id="foto-comparar-titulo">Antes / ahora</h3>
        <div class="foto-comparar">
          ${['antes', 'ahora'].map(k => `
            <div class="foto-comparar-col">
              <label class="cuerpo-campo"><span>${k === 'antes' ? 'Antes' : 'Ahora'}</span><select id="foto-sel-${k}"></select></label>
              <div class="foto-grande"><img id="foto-cmp-${k}" alt=""></div>
            </div>`).join('')}
        </div>
        <div class="cuerpo-hoja-acciones">
          <button type="button" id="foto-comparar-cerrar" class="cuerpo-btn cuerpo-btn--primario tappable">Cerrar</button>
        </div>
      </div>
    </div>`;
}

function abrirModal(modal) {
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}
async function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (!modal || !modal.classList.contains('open')) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 300);
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
  modal.querySelector('#foto-titulo').textContent = fechaCorta(foto.fecha);
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
      <button type="button" class="foto-pend-quitar tappable" data-i="${i}" aria-label="Quitar la foto ${i + 1}">✕</button>
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
