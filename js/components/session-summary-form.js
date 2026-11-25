// Hoja compartida para cerrar una sesión (hoy la usa el temporizador de
// HIIT): captura el RPE (esfuerzo percibido, 1-10) y notas libres antes de
// guardar. Órbita (oHoja, Fase 9e). Sin ✕: como antes, se cierra solo con
// Omitir o Guardar sesión, que son los que resuelven la promesa.
import { oHoja } from './orbita.js';

const ID = 'session-summary-modal';

export function renderSessionSummaryForm() {
  const chips = Array.from({ length: 10 }, (_, i) => i + 1)
    .map(n => `<button type="button" class="o-chip rpe-chip" data-rpe="${n}" aria-pressed="false"><span class="o-num">${n}</span></button>`)
    .join('');
  const cuerpo = `
    <p class="o-card-texto">Esto es opcional, pero ayuda a que futuras sugerencias sean más precisas.</p>
    <div class="o-campo">
      <span class="o-campo-etiqueta" id="rpe-chip-etq">Esfuerzo percibido (RPE)</span>
      <div id="rpe-chip-container" class="o-ent-rpe-chips" role="group" aria-labelledby="rpe-chip-etq">${chips}</div>
    </div>
    <div class="o-campo">
      <label for="session-summary-notas">Notas (opcional)</label>
      <textarea id="session-summary-notas" class="o-input" rows="3" placeholder="¿Cómo te sentiste? ¿Algo a mejorar la próxima vez?"></textarea>
    </div>`;
  return oHoja({
    id: ID, modulo: 'entreno', titulo: '¿Cómo estuvo tu sesión?', cuerpo, cerrar: false,
    pie: '<button type="button" id="btn-skip-summary" class="o-btn o-btn--secundario">Omitir</button><button type="button" id="btn-save-summary" class="o-btn o-btn--primario">Guardar sesión</button>'
  });
}

export function askSessionSummary() {
  return new Promise((resolve) => {
    const modal = document.getElementById(ID);
    if (!modal) {
      resolve({ rpe: null, notas: '' });
      return;
    }

    let selectedRpe = null;
    const chipContainer = document.getElementById('rpe-chip-container');
    const notasEl = document.getElementById('session-summary-notas');
    const btnSkip = document.getElementById('btn-skip-summary');
    const btnSave = document.getElementById('btn-save-summary');

    // Estado limpio cada vez que se abre.
    notasEl.value = '';
    chipContainer.querySelectorAll('.rpe-chip').forEach(chip => chip.setAttribute('aria-pressed', 'false'));

    // Clonar para limpiar listeners de aperturas anteriores (mismo patrón que ConfirmDialog)
    const newChipContainer = chipContainer.cloneNode(true);
    chipContainer.parentNode.replaceChild(newChipContainer, chipContainer);
    const newSkip = btnSkip.cloneNode(true);
    btnSkip.parentNode.replaceChild(newSkip, btnSkip);
    const newSave = btnSave.cloneNode(true);
    btnSave.parentNode.replaceChild(newSave, btnSave);

    newChipContainer.querySelectorAll('.rpe-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedRpe = parseInt(chip.getAttribute('data-rpe'));
        newChipContainer.querySelectorAll('.rpe-chip').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      });
    });

    // Se resuelve en el acto (como antes); sacar "open" suelta su entrada
    // de historial (history.js).
    const close = (result) => {
      modal.classList.remove('open');
      modal.style.display = 'none';
      resolve(result);
    };

    newSkip.addEventListener('click', () => close({ rpe: null, notas: '' }));
    newSave.addEventListener('click', () => close({ rpe: selectedRpe, notas: notasEl.value.trim() }));

    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('open');
      newChipContainer.querySelector('.rpe-chip')?.focus({ preventScroll: true });
    }, 10);
  });
}
