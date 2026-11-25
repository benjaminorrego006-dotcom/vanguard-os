import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { diaKeyDe } from '../utils/fecha.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';

// "Ahora no" del onboarding de perfil: oculta la apertura automática al
// entrar a Entreno hasta mañana. La fecha (diaKeyDe) va en localStorage
// porque es una preferencia de UI, no dato de la app. No afecta a las
// aperturas manuales (ícono de perfil, Configuración).
const PERFIL_AHORA_NO_KEY = 'vg-perfil-ahora-no';

export function perfilPospuestoHoy() {
  try { return localStorage.getItem(PERFIL_AHORA_NO_KEY) === diaKeyDe(new Date()); }
  catch (e) { return false; /* modo privado — mostrar el modal igual */ }
}

function posponerPerfilHoy() {
  try { localStorage.setItem(PERFIL_AHORA_NO_KEY, diaKeyDe(new Date())); }
  catch (e) { /* modo privado */ }
}

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

// Órbita (oHoja, Fase 9e). Se pinta en Entreno y en Configuración; ids de siempre.
export function renderProfileForm() {
  const cuerpo = `
    <p class="o-card-texto">Estos datos se usan para calcular tu IMC y tu gasto calórico estimado.</p>
    <div class="o-campo">
      <label for="profile-nombre">Nombre (opcional)</label>
      <input type="text" id="profile-nombre" class="o-input" autocomplete="given-name" maxlength="40" placeholder="Para saludarte en Hoy">
    </div>
    <div class="o-ent-hoja-par">
      <div class="o-campo">
        <label for="profile-peso">Peso (kg)</label>
        <input type="number" inputmode="decimal" id="profile-peso" class="o-input o-num" placeholder="70" min="1" step="0.1" required>
      </div>
      <div class="o-campo">
        <label for="profile-estatura">Estatura (cm)</label>
        <input type="number" inputmode="numeric" id="profile-estatura" class="o-input o-num" placeholder="170" min="1" required>
      </div>
    </div>
    <div class="o-ent-hoja-par">
      <div class="o-campo">
        <label for="profile-edad">Edad</label>
        <input type="number" inputmode="numeric" enterkeyhint="done" id="profile-edad" class="o-input o-num" placeholder="25" min="1" required>
      </div>
      <div class="o-campo">
        <label for="profile-sexo">Sexo</label>
        <select id="profile-sexo" class="o-input">
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>
      </div>
    </div>
    <div class="o-campo">
      <label for="profile-actividad">Nivel de actividad</label>
      <select id="profile-actividad" class="o-input">
        ${NIVELES_ACTIVIDAD.map(n => `<option value="${n.value}">${n.label}</option>`).join('')}
      </select>
    </div>
    <div class="o-campo">
      <label for="profile-meta">Meta</label>
      <select id="profile-meta" class="o-input">
        ${METAS.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
      </select>
    </div>`;
  // El título lo cambia openProfileForm (perfil nuevo o edición): lleva su id de siempre.
  return oHoja({
    id: 'profile-modal', modulo: 'entreno', titulo: 'Tu perfil', cuerpo,
    pie: '<button type="button" id="btn-cancel-profile" class="o-btn o-btn--secundario">Cancelar</button><button type="button" id="btn-save-profile" class="o-btn o-btn--primario">Guardar</button>'
  }).replace('id="profile-modal-titulo"', 'id="profile-modal-title"').replace('aria-labelledby="profile-modal-titulo"', 'aria-labelledby="profile-modal-title"');
}

export function setupProfileForm(onSaveCallback) {
  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  const btnCancel = document.getElementById('btn-cancel-profile');
  const btnSave = document.getElementById('btn-save-profile');
  montarHoja('profile-modal');
  const close = () => cerrarHoja('profile-modal');

  btnCancel.addEventListener('click', () => {
    if (btnCancel.dataset.modo === 'onboarding') posponerPerfilHoy();
    close();
  });

  btnSave.addEventListener('click', async () => {
    const pesoKg = parseFloat(document.getElementById('profile-peso').value);
    const estaturaCm = parseFloat(document.getElementById('profile-estatura').value);
    const edad = parseInt(document.getElementById('profile-edad').value);

    if (!pesoKg || !estaturaCm || !edad) {
      Toast('Completa peso, estatura y edad', 'warning');
      return;
    }

    await db.saveProfile({
      nombre: document.getElementById('profile-nombre').value,
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
  const btnCancel = document.getElementById('btn-cancel-profile');

  if (profile) {
    btnCancel.textContent = 'Cancelar';
    btnCancel.dataset.modo = '';
    titleEl.innerText = 'Tu perfil';
    document.getElementById('profile-nombre').value = profile.nombre || '';
    document.getElementById('profile-peso').value = profile.pesoKg || '';
    document.getElementById('profile-estatura').value = profile.estaturaCm || '';
    document.getElementById('profile-edad').value = profile.edad || '';
    document.getElementById('profile-sexo').value = profile.sexo || 'M';
    document.getElementById('profile-actividad').value = profile.nivelActividad || 'sedentario';
    document.getElementById('profile-meta').value = profile.meta || 'mantener';
  } else {
    btnCancel.textContent = 'Ahora no';
    btnCancel.dataset.modo = 'onboarding';
    titleEl.innerText = '¡Bienvenido! Cuéntanos de ti';
    document.getElementById('profile-nombre').value = '';
    document.getElementById('profile-peso').value = '';
    document.getElementById('profile-estatura').value = '';
    document.getElementById('profile-edad').value = '';
    document.getElementById('profile-sexo').value = 'M';
    document.getElementById('profile-actividad').value = 'sedentario';
    document.getElementById('profile-meta').value = 'mantener';
  }

  abrirHoja('profile-modal');
}
