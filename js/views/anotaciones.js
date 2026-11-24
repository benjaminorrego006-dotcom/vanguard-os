import { db } from '../core/db.js';
import { Toast, ConfirmDialog, hayModalAbierto } from '../utils/states.js';
import { oIcono, oVacio } from '../components/orbita.js';
import { formatFechaLarga } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';

// Categoría abierta. null = pantalla de categorías. Vive fuera de render()
// para sobrevivir a los refresh, igual que el offset del planificador.
let categoriaAbierta = null;

// Dónde repintar: dentro de Plan (views/tareas.js, #notas-host) o, si
// alguna vez se monta sola, en #view-root. Mismo patrón que planificador.js.
function contenedor() {
  return document.getElementById('notas-host') || document.getElementById('view-root');
}

// 'budget-updated' es el aviso genérico de sync.js de que se aplicó un
// cambio remoto (ver runFullSync en core/sync.js) — sin este listener, un
// cambio hecho en otro dispositivo queda guardado en IndexedDB pero esta
// vista no se repinta sola hasta que se sale y se vuelve a entrar. Se
// engancha una sola vez: mountListeners() se vuelve a llamar en cada
// refresh() local, así que sin el guard se acumularía un listener nuevo
// por cada nota tocada, no solo por cada sync.
let syncEnganchado = false;
async function onSyncActualizado() {
  if (hayModalAbierto()) return;
  // No pisar un título/texto de nota que el usuario esté a mitad de
  // escribir sin guardar todavía (se guarda recién al tocar "Guardar nota").
  const titulo = document.getElementById('nota-titulo');
  const texto = document.getElementById('nota-texto');
  const hayBorrador = [titulo, texto].some(el => el && (document.activeElement === el || el.value.trim()));
  if (hayBorrador) return;
  const root = contenedor();
  root.innerHTML = await render();
  mountListeners();
}

function fechaCorta(isoStr) {
  try { return formatFechaLarga(isoStr); }
  catch (e) { return ''; }
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const ICO_VOLVER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>';
const ICO_NOTA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"></path><path d="M14 4v6h6"></path></svg>';

// Plan › Notas (Órbita, Fase 7): acento neutro (.o-mod-notas, en #notas-host).
async function renderCategorias() {
  const cats = await db.getCategoriasNota();
  const todas = await db.getNotas();
  const conteo = {};
  todas.forEach(n => { conteo[n.catId] = (conteo[n.catId] || 0) + 1; });

  const fila = (c) => {
    const n = conteo[c.id] || 0;
    const nombre = escapeHtml(c.nombre);
    return `
      <li class="o-fila o-nota-cat">
        <button type="button" class="o-nota-abrir cat-abrir" data-id="${escapeHtml(c.id)}" aria-label="${nombre}, ${plural(n, 'nota', 'notas')}. Abrir">
          <span class="o-fila-ico">${ICO_NOTA}</span>
          <span class="o-fila-texto"><b>${nombre}</b><small><span class="o-num">${n}</span> ${n === 1 ? 'nota' : 'notas'}</small></span>
        </button>
        <button type="button" class="o-btn o-btn--fantasma o-btn--icono cat-delete" data-id="${escapeHtml(c.id)}" aria-label="Eliminar la categoría ${nombre}">${oIcono('cerrar')}</button>
      </li>`;
  };

  return `
    <div class="o-notas">
      <div class="o-notas-cab">
        <h2 class="o-notas-titulo">Notas</h2>
        <p class="o-mod-sub">${plural(cats.length, 'categoría', 'categorías')} · ${plural(todas.length, 'nota', 'notas')}</p>
      </div>
      <div class="o-notas-cuerpo">
        <form id="cat-nueva-form" class="o-card o-campo" onsubmit="return false;">
          <label for="cat-nueva">Nueva categoría</label>
          <input id="cat-nueva" class="o-input" type="text" placeholder="Viajes, compras, escritos…" enterkeyhint="go" autocomplete="off" maxlength="60">
        </form>
        ${cats.length
          ? `<ul class="o-lista" aria-label="Categorías">${cats.map(fila).join('')}</ul>`
          : `<div class="o-card">${oVacio({ icono: 'vacio', titulo: 'Sin categorías', texto: 'Crea la primera para empezar a anotar.' })}</div>`}
      </div>
    </div>`;
}

async function renderNotas() {
  const cats = await db.getCategoriasNota();
  const cat = cats.find(c => c.id === categoriaAbierta);
  if (!cat) { categoriaAbierta = null; return renderCategorias(); }

  const notas = await db.getNotas(cat.id);
  const fila = (n) => {
    const titulo = escapeHtml(n.titulo || 'Sin título');
    return `
      <li class="o-card o-nota">
        <div class="o-nota-cab">
          <div class="o-nota-tit">
            <h3>${titulo}</h3>
            <span class="o-num">${escapeHtml(fechaCorta(n.createdAt))}</span>
          </div>
          <button type="button" class="o-btn o-btn--fantasma o-btn--icono nota-delete" data-id="${escapeHtml(n.id)}" aria-label="Eliminar la nota ${titulo}">${oIcono('cerrar')}</button>
        </div>
        ${n.texto ? `<p class="o-nota-texto">${escapeHtml(n.texto)}</p>` : ''}
      </li>`;
  };

  return `
    <div class="o-notas">
      <div class="o-notas-cab o-notas-cab--cat">
        <button type="button" id="cat-volver" class="o-btn o-btn--secundario o-btn--icono" aria-label="Volver a las categorías">${ICO_VOLVER}</button>
        <div>
          <h2 class="o-notas-titulo">${escapeHtml(cat.nombre)}</h2>
          <p class="o-mod-sub">${plural(notas.length, 'nota', 'notas')}</p>
        </div>
      </div>
      <div class="o-notas-cuerpo">
        <form id="nota-form" class="o-card o-nota-form" onsubmit="return false;">
          <div class="o-campo">
            <label for="nota-titulo">Título</label>
            <input id="nota-titulo" class="o-input" type="text" placeholder="Opcional" autocomplete="off" maxlength="120">
          </div>
          <div class="o-campo">
            <label for="nota-texto">Nota</label>
            <textarea id="nota-texto" class="o-input" rows="4" placeholder="Escribe aquí…"></textarea>
          </div>
          <button type="submit" id="nota-guardar" class="o-btn o-btn--secundario o-btn--bloque">Guardar nota</button>
        </form>
        ${notas.length
          ? `<ul class="o-lista o-notas-lista" aria-label="Notas de ${escapeHtml(cat.nombre)}">${notas.map(fila).join('')}</ul>`
          : `<div class="o-card">${oVacio({ icono: 'vacio', titulo: 'Sin notas todavía', texto: 'Escribe la primera aquí arriba.' })}</div>`}
      </div>
    </div>`;
}

export async function render() {
  return categoriaAbierta ? renderNotas() : renderCategorias();
}

export function mountListeners() {
  if (!syncEnganchado) {
    syncEnganchado = true;
    window.addEventListener('budget-updated', onSyncActualizado);
  }

  const refresh = async () => {
    const root = contenedor();
    root.innerHTML = await render();
    mountListeners();
  };

  // --- pantalla de categorías ---
  document.querySelectorAll('.cat-abrir').forEach(el => {
    el.addEventListener('click', () => {
      categoriaAbierta = el.getAttribute('data-id');
      refresh();
    });
  });

  document.querySelectorAll('.cat-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const confirmed = await ConfirmDialog('¿Eliminar categoría?', 'Se borra junto con todas sus notas. Esta acción no se puede deshacer.');
      if (!confirmed) return;
      await db.eliminarCategoriaNota(id);
      Toast('Categoría eliminada', 'success');
      refresh();
    });
  });

  const inputCat = document.getElementById('cat-nueva');
  bindQuickCaptureForm(document.getElementById('cat-nueva-form'), async () => {
    const nombre = inputCat.value.trim();
    if (!nombre) return;
    await db.crearCategoriaNota(nombre);
    refresh();
  });

  // --- pantalla de notas ---
  document.getElementById('cat-volver')?.addEventListener('click', () => {
    categoriaAbierta = null;
    refresh();
  });

  document.getElementById('nota-guardar')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('nota-titulo').value;
    const texto = document.getElementById('nota-texto').value;
    if (!titulo.trim() && !texto.trim()) { document.getElementById('nota-texto').focus(); Toast('Escribe algo antes de guardar', 'warning'); return; }
    await db.crearNota(categoriaAbierta, titulo, texto);
    Toast('Nota guardada', 'success');
    refresh();
  });

  document.querySelectorAll('.nota-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const confirmed = await ConfirmDialog('¿Eliminar nota?', 'Esta acción no se puede deshacer.');
      if (!confirmed) return;
      await db.eliminarNota(id);
      Toast('Nota eliminada', 'success');
      refresh();
    });
  });
}

// Lo usa el acceso rápido "Nota" de Inicio: deja abierta una categoría (su
// formulario de nota nueva ya está arriba) antes de navegar a esta vista.
export function abrirCategoria(catId) {
  categoriaAbierta = catId;
}

// Resetea a la pantalla de categorías al salir — igual que habitos.js
// resetea su vista interna: sin esto, volver a entrar a Anotaciones desde
// el nav dejaría la categoría anterior abierta en vez de la lista.
export function cleanup() {
  window.removeEventListener('budget-updated', onSyncActualizado);
  syncEnganchado = false;
  categoriaAbierta = null;
}
