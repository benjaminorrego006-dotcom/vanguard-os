import { db } from '../core/db.js';
import { Toast, ConfirmDialog, EmptyState } from '../utils/states.js';
import { formatFechaLarga } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';

// Categoría abierta. null = pantalla de categorías. Vive fuera de render()
// para sobrevivir a los refresh, igual que el offset del planificador.
let categoriaAbierta = null;

function fechaCorta(isoStr) {
  try { return formatFechaLarga(isoStr); }
  catch (e) { return ''; }
}

const cabecera = (titulo, sub) => `
  <div class="flex-between" style="margin-bottom: 20px;">
    <div>
      <h1 style="font-size: 30px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.5px;">${escapeHtml(titulo)}</h1>
      <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(sub)}</div>
    </div>
    <div class="icon-chip" style="width: 40px; height: 40px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"></path><path d="M14 4v6h6"></path></svg>
    </div>
  </div>`;

async function renderCategorias() {
  const cats = await db.getCategoriasNota();
  const todas = await db.getNotas();
  const conteo = {};
  todas.forEach(n => { conteo[n.catId] = (conteo[n.catId] || 0) + 1; });

  const fila = (c) => {
    const n = conteo[c.id] || 0;
    return `
      <div class="card list-row cat-abrir tappable" data-id="${c.id}"
        style="padding: 14px 16px 14px 20px; position: relative; overflow: hidden; margin-bottom: 10px; cursor: pointer; display: flex; align-items: center; gap: 12px;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent-notas);"></div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${escapeHtml(c.nombre)}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;"><span class="num">${n}</span> ${n === 1 ? 'nota' : 'notas'}</div>
        </div>
        <button class="cat-delete tappable" data-id="${c.id}"
          style="background: transparent; border: none; color: var(--text-disabled); cursor: pointer; flex-shrink: 0; padding: 4px;">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>`;
  };

  return `
    <div style="padding: 20px 20px 110px 20px; font-family: var(--font-body);">
      ${cabecera('Anotaciones', `${cats.length} categorías · ${todas.length} notas`)}
      ${cats.length ? cats.map(fila).join('') : EmptyState('Sin categorías', 'Crea la primera para empezar a anotar.')}
      <div class="card" style="margin-top: 16px; padding: 16px;">
        <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Nueva categoría</label>
        <form id="cat-nueva-form" onsubmit="return false;">
          <input id="cat-nueva" type="text" placeholder="Viajes, Compras, Escritos…" enterkeyhint="go"
            style="width: 100%; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px 14px; font-size: 15px; font-family: inherit; box-sizing: border-box; outline: none;">
        </form>
      </div>
    </div>`;
}

async function renderNotas() {
  const cats = await db.getCategoriasNota();
  const cat = cats.find(c => c.id === categoriaAbierta);
  if (!cat) { categoriaAbierta = null; return renderCategorias(); }

  const notas = await db.getNotas(cat.id);

  const fila = (n) => `
    <div class="card" style="padding: 14px 16px 14px 20px; position: relative; overflow: hidden; margin-bottom: 10px; display: flex; gap: 12px; align-items: flex-start;">
      <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent-notas);"></div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${escapeHtml(n.titulo || 'Sin título')}</div>
        <div style="font-size: 11px; color: var(--text-disabled); margin-top: 2px;">${fechaCorta(n.createdAt)}</div>
        ${n.texto ? `<p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.5; color: var(--text-secondary); white-space: pre-wrap;">${escapeHtml(n.texto)}</p>` : ''}
      </div>
      <button class="nota-delete tappable" data-id="${n.id}"
        style="background: transparent; border: none; color: var(--text-disabled); cursor: pointer; flex-shrink: 0; padding: 2px;">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>`;

  return `
    <div style="padding: 20px 20px 110px 20px; font-family: var(--font-body);">
      <button id="cat-volver" class="btn btn-outlined btn-pill tappable" style="margin-bottom: 16px;">← Categorías</button>
      ${cabecera(cat.nombre, `${notas.length} ${notas.length === 1 ? 'nota' : 'notas'}`)}

      <div class="card" style="padding: 16px; margin-bottom: 20px;">
        <input id="nota-titulo" type="text" placeholder="Título"
          style="width: 100%; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px 14px; font-size: 15px; font-family: inherit; box-sizing: border-box; outline: none;">
        <textarea id="nota-texto" rows="4" placeholder="Escribe aquí…"
          style="width: 100%; margin-top: 10px; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px 14px; font-size: 15px; font-family: inherit; box-sizing: border-box; outline: none; resize: vertical;"></textarea>
        <button id="nota-guardar" class="btn-primary" style="background: var(--accent-notas);">Guardar nota</button>
      </div>

      ${notas.length ? notas.map(fila).join('') : EmptyState('Sin notas todavía', 'Escribe la primera arriba.')}
    </div>`;
}

export async function render() {
  return categoriaAbierta ? renderNotas() : renderCategorias();
}

export function mountListeners() {
  const refresh = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  // --- pantalla de categorías ---
  document.querySelectorAll('.cat-abrir').forEach(el => {
    el.addEventListener('click', (e) => {
      // El botón de borrar vive dentro de la fila clickeable: si el click
      // salió de ahí, ya lo maneja su propio listener.
      if (e.target.closest('.cat-delete')) return;
      categoriaAbierta = e.currentTarget.getAttribute('data-id');
      refresh();
    });
  });

  document.querySelectorAll('.cat-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await ConfirmDialog('¿Eliminar categoría?', 'Se borra junto con todas sus notas. Esta acción no se puede deshacer.');
      if (!confirmed) return;
      await db.eliminarCategoriaNota(e.currentTarget.getAttribute('data-id'));
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

  document.getElementById('nota-guardar')?.addEventListener('click', async () => {
    const titulo = document.getElementById('nota-titulo').value;
    const texto = document.getElementById('nota-texto').value;
    if (!titulo.trim() && !texto.trim()) return;
    await db.crearNota(categoriaAbierta, titulo, texto);
    Toast('Nota guardada', 'success');
    refresh();
  });

  document.querySelectorAll('.nota-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const confirmed = await ConfirmDialog('¿Eliminar nota?', 'Esta acción no se puede deshacer.');
      if (!confirmed) return;
      await db.eliminarNota(e.currentTarget.getAttribute('data-id'));
      Toast('Nota eliminada', 'success');
      refresh();
    });
  });
}

// Resetea a la pantalla de categorías al salir — igual que habitos.js
// resetea su vista interna: sin esto, volver a entrar a Anotaciones desde
// el nav dejaría la categoría anterior abierta en vez de la lista.
export function cleanup() {
  categoriaAbierta = null;
}
