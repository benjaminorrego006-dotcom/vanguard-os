import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';

const NIVELES_ACTIVIDAD = [
  { value: 'sedentario', label: 'Sedentario (poco o nada de ejercicio)' },
  { value: 'ligero', label: 'Ligero (1-3 días/semana)' },
  { value: 'moderado', label: 'Moderado (3-5 días/semana)' },
  { value: 'activo', label: 'Activo (6-7 días/semana)' },
  { value: 'muy_activo', label: 'Muy activo (2x al día / trabajo físico)' }
];

const METAS = [
  { value: 'bajar_peso', label: 'Bajar de peso' },
  { value: 'subir_masa', label: 'Subir masa muscular' },
  { value: 'mantener', label: 'Mantener' },
  { value: 'rendimiento', label: 'Mejorar rendimiento' }
];

export function renderProfileForm() {
  return `
    <div id="profile-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 500px; max-height: 90vh; overflow-y: auto;">
        <h2 id="profile-modal-title" style="margin-top: 0; font-size: 20px; font-weight: 700;">Tu Perfil</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: -8px 0 20px 0;">Estos datos se usan para calcular tu IMC y tu gasto calórico estimado.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="input-group">
            <label>Peso (kg)</label>
            <input type="number" inputmode="decimal" id="profile-peso" placeholder="70" min="1" step="0.1" required>
          </div>
          <div class="input-group">
            <label>Estatura (cm)</label>
            <input type="number" inputmode="numeric" id="profile-estatura" placeholder="170" min="1" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="input-group">
            <label>Edad</label>
            <input type="number" inputmode="numeric" enterkeyhint="done" id="profile-edad" placeholder="25" min="1" required>
          </div>
          <div class="input-group">
            <label>Sexo</label>
            <select id="profile-sexo">
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
        </div>

        <div class="input-group">
          <label>Nivel de actividad</label>
          <select id="profile-actividad">
            ${NIVELES_ACTIVIDAD.map(n => `<option value="${n.value}">${n.label}</option>`).join('')}
          </select>
        </div>

        <div class="input-group">
          <label>Meta</label>
          <select id="profile-meta">
            ${METAS.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
          </select>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button id="btn-cancel-profile" class="btn-primary" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Cancelar</button>
          <button id="btn-save-profile" class="btn-primary" style="background: var(--accent-teal); color: #000; flex: 1;">Guardar</button>
        </div>
      </div>
    </div>
  `;
}

export function setupProfileForm(onSaveCallback) {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  const btnCancel = document.getElementById('btn-cancel-profile');
  const btnSave = document.getElementById('btn-save-profile');
  const btnCloseX = modal.querySelector('.btn-close-modal');

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
  };

  btnCancel.addEventListener('click', close);
  if (btnCloseX) btnCloseX.addEventListener('click', close);

  btnSave.addEventListener('click', async () => {
    const pesoKg = parseFloat(document.getElementById('profile-peso').value);
    const estaturaCm = parseFloat(document.getElementById('profile-estatura').value);
    const edad = parseInt(document.getElementById('profile-edad').value);

    if (!pesoKg || !estaturaCm || !edad) {
      Toast('Completa peso, estatura y edad', 'warning');
      return;
    }

    await db.saveProfile({
      pesoKg,
      estaturaCm,
      edad,
      sexo: document.getElementById('profile-sexo').value,
      nivelActividad: document.getElementById('profile-actividad').value,
      meta: document.getElementById('profile-meta').value
    });

    close();
    Toast('Perfil guardado', 'success');
    if (onSaveCallback) onSaveCallback();
  });
}

export async function openProfileForm() {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  const profile = await db.getProfile();
  const titleEl = document.getElementById('profile-modal-title');

  if (profile) {
    titleEl.innerText = 'Tu Perfil';
    document.getElementById('profile-peso').value = profile.pesoKg || '';
    document.getElementById('profile-estatura').value = profile.estaturaCm || '';
    document.getElementById('profile-edad').value = profile.edad || '';
    document.getElementById('profile-sexo').value = profile.sexo || 'M';
    document.getElementById('profile-actividad').value = profile.nivelActividad || 'sedentario';
    document.getElementById('profile-meta').value = profile.meta || 'mantener';
  } else {
    titleEl.innerText = '¡Bienvenido! Cuéntanos de ti';
    document.getElementById('profile-peso').value = '';
    document.getElementById('profile-estatura').value = '';
    document.getElementById('profile-edad').value = '';
    document.getElementById('profile-sexo').value = 'M';
    document.getElementById('profile-actividad').value = 'sedentario';
    document.getElementById('profile-meta').value = 'mantener';
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}
