import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';

// Modal de alta/edición de hábito — mismo patrón que task-form.js. Antes
// un hábito era solo un nombre; ahora también declara frecuencia (todo
// hábito viejo sin este campo se trata como 'diario', mismo comportamiento
// que siempre tuvo) y, opcionalmente, una meta numérica (cantidad + unidad
// — "8 vasos", "20 páginas") en vez de un simple cumplido/no cumplido.
const DOW_FORM = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // 0=lunes..6=domingo, mismo orden que habitos.js

function renderFrecuenciaPicker() {
  const OPCIONES = [
    { value: 'diario', label: 'Diario' },
    { value: 'dias', label: 'Días específicos' },
    { value: 'semanal', label: 'X veces/semana' }
  ];
  return `
    <div id="frecuencia-picker" style="display: flex; gap: 6px;">
      ${OPCIONES.map(o => `<button type="button" class="btn-frecuencia-chip tappable" data-frecuencia="${o.value}" style="flex: 1; padding: 10px 4px; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-secondary); cursor: pointer; font-size: 12px; font-weight: 700;">${o.label}</button>`).join('')}
    </div>
    <input type="hidden" id="habito-frecuencia-tipo" value="diario">

    <div id="frecuencia-dias-picker" style="display: none; gap: 6px; margin-top: 10px;">
      ${DOW_FORM.map((letra, i) => `<button type="button" class="btn-frecuencia-dia tappable" data-dow="${i}" style="flex: 1; min-height: 40px; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-secondary); cursor: pointer; font-weight: 700;">${letra}</button>`).join('')}
    </div>

    <div id="frecuencia-semanal-picker" style="display: none; align-items: center; gap: 10px; margin-top: 10px;">
      <span style="font-size: 13px; color: var(--text-secondary);">Al menos</span>
      <input type="number" id="habito-veces-objetivo" min="1" max="7" value="3" style="width: 60px; text-align: center; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 8px;">
      <span style="font-size: 13px; color: var(--text-secondary);">veces por semana</span>
    </div>
  `;
}

export function renderHabitoForm() {
  return `
    <div id="habito-modal" class="modal-overlay sheet-overlay">
      <div class="sheet-content" style="max-width: 440px;">
        <h2 id="habito-modal-title" style="margin-top: 0; font-size: 20px; font-weight: 700;">Nuevo Hábito</h2>
        <input type="hidden" id="habito-id">

        <form id="habito-form" onsubmit="return false;">
          <div class="input-group">
            <label for="habito-nombre">Nombre del hábito</label>
            <input type="text" id="habito-nombre" placeholder="Ej. Entrenar 45 min" maxlength="60" enterkeyhint="done">
          </div>

          <div class="input-group">
            <div style="display: block; color: var(--text-secondary); font-size: 13px; font-weight: 600; margin-bottom: 8px;">Frecuencia</div>
            ${renderFrecuenciaPicker()}
          </div>

          <div class="input-group" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <input type="checkbox" id="habito-tiene-meta" style="width: 20px; height: 20px; flex-shrink: 0;">
            <label for="habito-tiene-meta" style="margin: 0; cursor: pointer;">Tiene una meta numérica (ej. 8 vasos de agua)</label>
          </div>
          <div id="habito-meta-campos" style="display: none; gap: 10px; margin-bottom: 8px;">
            <div class="input-group" style="margin-bottom: 0; flex: 1;">
              <label for="habito-meta-cantidad">Cantidad</label>
              <input type="number" id="habito-meta-cantidad" min="1" placeholder="8" inputmode="numeric">
            </div>
            <div class="input-group" style="margin-bottom: 0; flex: 1;">
              <label for="habito-meta-unidad">Unidad</label>
              <input type="text" id="habito-meta-unidad" placeholder="vasos" maxlength="20">
            </div>
          </div>

          <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button type="button" id="btn-cancel-habito" class="btn-primary" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Cancelar</button>
            <button type="submit" id="btn-save-habito" class="btn-primary" style="background: var(--accent-purple); color: #000; flex: 1;">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Estado de los pickers de frecuencia — vive en el módulo (no en el DOM)
// porque "días específicos" es una selección múltiple que no mapea a un
// solo input nativo; se sincroniza a inputs ocultos recién al guardar.
let frecuenciaTipoActual = 'diario';
let diasSeleccionados = new Set();

function pintarFrecuenciaChips() {
  document.querySelectorAll('.btn-frecuencia-chip').forEach(btn => {
    const activo = btn.getAttribute('data-frecuencia') === frecuenciaTipoActual;
    btn.style.background = activo ? 'var(--vip)' : 'var(--surface-1)';
    btn.style.borderColor = activo ? 'var(--vi)' : 'var(--surface-border)';
    btn.style.color = activo ? 'var(--text-primary)' : 'var(--text-secondary)';
  });
  const diasPicker = document.getElementById('frecuencia-dias-picker');
  const semanalPicker = document.getElementById('frecuencia-semanal-picker');
  if (diasPicker) diasPicker.style.display = frecuenciaTipoActual === 'dias' ? 'flex' : 'none';
  if (semanalPicker) semanalPicker.style.display = frecuenciaTipoActual === 'semanal' ? 'flex' : 'none';
}

function pintarDiasChips() {
  document.querySelectorAll('.btn-frecuencia-dia').forEach(btn => {
    const dow = Number(btn.getAttribute('data-dow'));
    const activo = diasSeleccionados.has(dow);
    btn.style.background = activo ? 'var(--vip)' : 'var(--surface-1)';
    btn.style.borderColor = activo ? 'var(--vi)' : 'var(--surface-border)';
    btn.style.color = activo ? 'var(--text-primary)' : 'var(--text-secondary)';
  });
}

export function setupHabitoForm(onSaveCallback) {
  const modal = document.getElementById('habito-modal');
  const btnCancel = document.getElementById('btn-cancel-habito');
  const input = document.getElementById('habito-nombre');
  const checkMeta = document.getElementById('habito-tiene-meta');
  const camposMeta = document.getElementById('habito-meta-campos');

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
  };

  btnCancel.addEventListener('click', close);

  document.querySelectorAll('.btn-frecuencia-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      frecuenciaTipoActual = btn.getAttribute('data-frecuencia');
      pintarFrecuenciaChips();
    });
  });

  document.querySelectorAll('.btn-frecuencia-dia').forEach(btn => {
    btn.addEventListener('click', () => {
      const dow = Number(btn.getAttribute('data-dow'));
      if (diasSeleccionados.has(dow)) diasSeleccionados.delete(dow);
      else diasSeleccionados.add(dow);
      pintarDiasChips();
    });
  });

  checkMeta.addEventListener('change', () => {
    camposMeta.style.display = checkMeta.checked ? 'flex' : 'none';
  });

  const save = async () => {
    const nombre = input.value.trim();
    if (!nombre) return Toast('El nombre es requerido', 'warning');

    if (frecuenciaTipoActual === 'dias' && diasSeleccionados.size === 0) {
      return Toast('Elegí al menos un día', 'warning');
    }

    const frecuencia = frecuenciaTipoActual === 'dias'
      ? { tipo: 'dias', dias: Array.from(diasSeleccionados).sort() }
      : frecuenciaTipoActual === 'semanal'
        ? { tipo: 'semanal', vecesObjetivo: Math.max(1, Math.min(7, parseInt(document.getElementById('habito-veces-objetivo').value, 10) || 3)) }
        : { tipo: 'diario' };

    const tieneMeta = checkMeta.checked;
    const cantidad = parseFloat(document.getElementById('habito-meta-cantidad').value);
    const unidad = document.getElementById('habito-meta-unidad').value.trim();
    if (tieneMeta && (!cantidad || cantidad <= 0)) return Toast('Ingresá una cantidad para la meta', 'warning');
    const meta = tieneMeta ? { cantidad, unidad: unidad || 'veces' } : null;

    const id = document.getElementById('habito-id').value;
    if (id) {
      await db.renombrarHabito(id, nombre);
      await db.actualizarConfigHabito(id, { frecuencia, meta });
    } else {
      await db.crearHabito(nombre, { frecuencia, meta });
    }
    close();
    if (onSaveCallback) setTimeout(onSaveCallback, 300);
  };

  bindQuickCaptureForm(document.getElementById('habito-form'), save);
}

export function openHabitoForm(habito = null) {
  const modal = document.getElementById('habito-modal');
  const titleEl = document.getElementById('habito-modal-title');
  const idInput = document.getElementById('habito-id');
  const nombreInput = document.getElementById('habito-nombre');
  const checkMeta = document.getElementById('habito-tiene-meta');
  const camposMeta = document.getElementById('habito-meta-campos');

  const frecuencia = (habito && habito.frecuencia) || { tipo: 'diario' };
  frecuenciaTipoActual = frecuencia.tipo || 'diario';
  diasSeleccionados = new Set(frecuencia.dias || []);
  document.getElementById('habito-veces-objetivo').value = frecuencia.vecesObjetivo || 3;

  const meta = (habito && habito.meta) || null;
  checkMeta.checked = !!meta;
  camposMeta.style.display = meta ? 'flex' : 'none';
  document.getElementById('habito-meta-cantidad').value = meta ? meta.cantidad : '';
  document.getElementById('habito-meta-unidad').value = meta ? meta.unidad : '';

  pintarFrecuenciaChips();
  pintarDiasChips();

  if (habito) {
    titleEl.innerText = 'Editar Hábito';
    idInput.value = habito.id;
    nombreInput.value = habito.nombre || '';
  } else {
    titleEl.innerText = 'Nuevo Hábito';
    idInput.value = '';
    nombreInput.value = '';
  }

  modal.style.display = 'flex';
  setTimeout(() => { modal.classList.add('open'); nombreInput.focus(); }, 10);
}
