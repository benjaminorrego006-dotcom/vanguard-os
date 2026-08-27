// Modal compartido para cerrar cualquier sesión (GYM, Calistenia o HIIT):
// captura el RPE (esfuerzo percibido, 1-10) y notas libres antes de guardar.
// Usado por rutina-session.js y hiit-timer.js.

export function renderSessionSummaryForm() {
  const chips = Array.from({ length: 10 }, (_, i) => i + 1)
    .map(n => `<button type="button" class="rpe-chip tappable" data-rpe="${n}" style="flex: 1; min-width: 30px; padding: 10px 0; border-radius: 10px; border: 1px solid var(--surface-border); background: var(--bg-base); color: var(--text-primary); font-size: 13px; font-weight: 700; cursor: pointer;">${n}</button>`)
    .join('');

  return `
    <div id="session-summary-modal" class="modal-overlay">
      <div class="modal-content" style="max-width: 460px;">
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 700;">¿Cómo estuvo tu sesión?</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: -8px 0 20px 0;">Esto es opcional, pero ayuda a que futuras sugerencias sean más precisas.</p>

        <div class="input-group">
          <label>Esfuerzo percibido (RPE)</label>
          <div id="rpe-chip-container" style="display: flex; gap: 6px; flex-wrap: wrap;">${chips}</div>
        </div>

        <div class="input-group">
          <label>Notas (opcional)</label>
          <textarea id="session-summary-notas" rows="3" placeholder="¿Cómo te sentiste? ¿Algo a mejorar la próxima vez?" style="width: 100%; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 14px 16px; border-radius: 14px; font-size: 14px; box-sizing: border-box; outline: none; font-family: inherit; resize: vertical;"></textarea>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px;">
          <button id="btn-skip-summary" class="btn-primary" style="background: var(--surface-2); color: var(--text-primary); flex: 1;">Omitir</button>
          <button id="btn-save-summary" class="btn-primary" style="background: var(--accent-teal); color: #000; flex: 1;">Guardar sesión</button>
        </div>
      </div>
    </div>
  `;
}

export function askSessionSummary() {
  return new Promise((resolve) => {
    const modal = document.getElementById('session-summary-modal');
    if (!modal) {
      resolve({ rpe: null, notas: '' });
      return;
    }

    let selectedRpe = null;
    const chipContainer = document.getElementById('rpe-chip-container');
    const notasEl = document.getElementById('session-summary-notas');
    const btnSkip = document.getElementById('btn-skip-summary');
    const btnSave = document.getElementById('btn-save-summary');

    // Reset visual state cada vez que se abre
    notasEl.value = '';
    selectedRpe = null;
    chipContainer.querySelectorAll('.rpe-chip').forEach(chip => {
      chip.style.background = 'var(--bg-base)';
      chip.style.borderColor = 'var(--surface-border)';
      chip.style.color = 'var(--text-primary)';
    });

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
        newChipContainer.querySelectorAll('.rpe-chip').forEach(c => {
          const active = c === chip;
          c.style.background = active ? 'var(--accent-teal)' : 'var(--bg-base)';
          c.style.borderColor = active ? 'var(--accent-teal)' : 'var(--surface-border)';
          c.style.color = active ? '#000' : 'var(--text-primary)';
        });
      });
    });

    const close = (result) => {
      modal.classList.remove('open');
      setTimeout(() => modal.style.display = 'none', 300);
      resolve(result);
    };

    newSkip.addEventListener('click', () => close({ rpe: null, notas: '' }));
    newSave.addEventListener('click', () => close({ rpe: selectedRpe, notas: notasEl.value.trim() }));

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
  });
}
