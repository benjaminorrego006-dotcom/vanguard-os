import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';

// Modal de alta/edición de hábito — mismo patrón que task-form.js, pero
// más simple: un hábito solo tiene nombre (las marcas se tocan desde la
// franja semanal de cada tarjeta en habitos.js, no desde este formulario).
export function renderHabitoForm() {
  return `
    <div id="habito-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 440px;">
        <h2 id="habito-modal-title" style="margin-top: 0; font-size: 20px; font-weight: 700;">Nuevo Hábito</h2>
        <input type="hidden" id="habito-id">

        <div class="input-group">
          <label for="habito-nombre">Nombre del hábito</label>
          <input type="text" id="habito-nombre" placeholder="Ej. Entrenar 45 min" maxlength="60">
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button id="btn-cancel-habito" class="btn-primary" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Cancelar</button>
          <button id="btn-save-habito" class="btn-primary" style="background: var(--accent-purple); color: #000; flex: 1;">Guardar</button>
        </div>
      </div>
    </div>
  `;
}

export function setupHabitoForm(onSaveCallback) {
  const modal = document.getElementById('habito-modal');
  const btnCancel = document.getElementById('btn-cancel-habito');
  const btnSave = document.getElementById('btn-save-habito');
  const input = document.getElementById('habito-nombre');

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
  };

  btnCancel.addEventListener('click', close);

  const save = async () => {
    const nombre = input.value.trim();
    if (!nombre) return Toast('El nombre es requerido', 'warning');
    const id = document.getElementById('habito-id').value;
    if (id) {
      await db.renombrarHabito(id, nombre);
    } else {
      await db.crearHabito(nombre);
    }
    close();
    if (onSaveCallback) setTimeout(onSaveCallback, 300);
  };

  btnSave.addEventListener('click', save);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}

export function openHabitoForm(habito = null) {
  const modal = document.getElementById('habito-modal');
  const titleEl = document.getElementById('habito-modal-title');
  const idInput = document.getElementById('habito-id');
  const nombreInput = document.getElementById('habito-nombre');

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
