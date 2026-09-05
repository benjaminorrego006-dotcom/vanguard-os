import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';

// Estado local del formulario — mismo patrón de modos que hiit-timer.js
// (Libre/Tabata/EMOM/AMRAP) para que crear una rutina HIIT se sienta como
// una versión "guardable" de la pantalla de configuración del timer.
let formState = {
  mode: 'free',
  workSecs: 30,
  restSecs: 15,
  totalRounds: 8,
  emomTotalMins: 10,
  emomIntervalSecs: 60,
  amrapTotalMins: 15
};

export function renderHiitRutinaForm() {
  return `
    <div class="card" style="padding: 22px; border-radius: 20px;">
      <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 20px 0; color: var(--text-primary); letter-spacing: -0.3px;">Crear Rutina HIIT</h2>

      <div class="input-group">
        <label for="hiit-rf-nombre">Nombre de la rutina</label>
        <input type="text" id="hiit-rf-nombre" placeholder="Ej. Tabata Explosivo" autocomplete="off">
      </div>

      <div style="margin-bottom: 16px;">
        <div style="display: block; color: var(--text-secondary); font-size: 13px; font-weight: 600; margin-bottom: 8px;">Modo</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button type="button" class="hiit-rf-mode-btn" data-mode="free" style="padding: 13px; border-radius: 12px; background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--accent-teal); font-weight: 700; cursor: pointer;">Libre</button>
          <button type="button" class="hiit-rf-mode-btn" data-mode="tabata" style="padding: 13px; border-radius: 12px; background: var(--surface-2); color: var(--text-secondary); border: 1px solid transparent; font-weight: 700; cursor: pointer;">Tabata</button>
          <button type="button" class="hiit-rf-mode-btn" data-mode="emom" style="padding: 13px; border-radius: 12px; background: var(--surface-2); color: var(--text-secondary); border: 1px solid transparent; font-weight: 700; cursor: pointer;">EMOM</button>
          <button type="button" class="hiit-rf-mode-btn" data-mode="amrap" style="padding: 13px; border-radius: 12px; background: var(--surface-2); color: var(--text-secondary); border: 1px solid transparent; font-weight: 700; cursor: pointer;">AMRAP</button>
        </div>
      </div>

      <div id="hiit-rf-settings" style="background: var(--surface-2); padding: 16px; border-radius: 16px; margin-bottom: 20px;">
        <!-- Se llena según el modo -->
      </div>

      <div class="input-group">
        <div style="display: block; color: var(--text-secondary); font-size: 13px; font-weight: 600; margin-bottom: 8px;">Ejercicios del circuito (opcional)</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin: -4px 0 10px 0; line-height: 1.4;">Se usan para mostrar "Siguiente: ..." durante los descansos. Dejalo vacío si es solo un temporizador.</div>
        <div id="hiit-rf-ejercicios-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
        <button id="btn-hiit-rf-add-ejercicio" type="button" style="background: transparent; color: var(--text-secondary); border: 1px dashed var(--surface-border); padding: 8px; border-radius: 8px; cursor: pointer; width: 100%; font-size: 13px;">+ Agregar ejercicio</button>
      </div>

      <button id="btn-guardar-hiit-rutina" class="btn-primary tappable" style="background: var(--accent-teal);">
        Guardar Rutina
      </button>
    </div>
  `;
}

export function initHiitRutinaFormListeners(onSuccess, signal) {
  formState = { mode: 'free', workSecs: 30, restSecs: 15, totalRounds: 8, emomTotalMins: 10, emomIntervalSecs: 60, amrapTotalMins: 15 };

  const ejerciciosContainer = document.getElementById('hiit-rf-ejercicios-container');
  const settingsEl = document.getElementById('hiit-rf-settings');

  const syncModeBtns = () => {
    document.querySelectorAll('.hiit-rf-mode-btn').forEach(b => {
      const active = b.getAttribute('data-mode') === formState.mode;
      b.style.color = active ? 'var(--text-primary)' : 'var(--text-secondary)';
      b.style.borderColor = active ? 'var(--accent-teal)' : 'transparent';
    });
  };

  // Lee del DOM los inputs del modo actual antes de cambiar de modo o
  // guardar, para no perder lo que el usuario ya tipeó.
  const readSettingsFromDom = () => {
    if (formState.mode === 'free') {
      const w = document.getElementById('hiit-rf-s-work');
      const r = document.getElementById('hiit-rf-s-rest');
      const n = document.getElementById('hiit-rf-s-rounds');
      if (w) formState.workSecs = parseInt(w.value) || 30;
      if (r) formState.restSecs = parseInt(r.value) || 15;
      if (n) formState.totalRounds = parseInt(n.value) || 8;
    } else if (formState.mode === 'emom') {
      const m = document.getElementById('hiit-rf-s-emom-mins');
      const s = document.getElementById('hiit-rf-s-emom-sec');
      if (m) formState.emomTotalMins = parseInt(m.value) || 10;
      if (s) formState.emomIntervalSecs = parseInt(s.value) || 60;
    } else if (formState.mode === 'amrap') {
      const m = document.getElementById('hiit-rf-s-amrap-mins');
      if (m) formState.amrapTotalMins = parseInt(m.value) || 15;
    }
    // tabata: preset fijo, nada que leer.
  };

  const renderSettingsForm = () => {
    if (formState.mode === 'free') {
      settingsEl.innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <div style="flex: 1;">
            <label for="hiit-rf-s-work" style="font-size: 11px; color: var(--text-secondary);">Trabajo (seg)</label>
            <input type="number" inputmode="numeric" id="hiit-rf-s-work" value="${formState.workSecs}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center;">
          </div>
          <div style="flex: 1;">
            <label for="hiit-rf-s-rest" style="font-size: 11px; color: var(--text-secondary);">Descanso (seg)</label>
            <input type="number" inputmode="numeric" id="hiit-rf-s-rest" value="${formState.restSecs}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center;">
          </div>
        </div>
        <div>
          <label for="hiit-rf-s-rounds" style="font-size: 11px; color: var(--text-secondary);">Rondas Totales</label>
          <input type="number" inputmode="numeric" enterkeyhint="done" id="hiit-rf-s-rounds" value="${formState.totalRounds}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center;">
        </div>
      `;
    } else if (formState.mode === 'tabata') {
      settingsEl.innerHTML = `<div style="text-align: center; color: var(--text-secondary); font-size: 14px;">Preset Fijo:<br>20s Trabajo / 10s Descanso<br>8 Rondas (4 mins)</div>`;
    } else if (formState.mode === 'emom') {
      settingsEl.innerHTML = `
        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <label for="hiit-rf-s-emom-mins" style="font-size: 11px; color: var(--text-secondary);">Tiempo Total (min)</label>
            <input type="number" inputmode="numeric" id="hiit-rf-s-emom-mins" value="${formState.emomTotalMins}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center;">
          </div>
          <div style="flex: 1;">
            <label for="hiit-rf-s-emom-sec" style="font-size: 11px; color: var(--text-secondary);">Intervalo (seg)</label>
            <input type="number" inputmode="numeric" enterkeyhint="done" id="hiit-rf-s-emom-sec" value="${formState.emomIntervalSecs}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center;">
          </div>
        </div>
      `;
    } else if (formState.mode === 'amrap') {
      settingsEl.innerHTML = `
        <div>
          <label for="hiit-rf-s-amrap-mins" style="font-size: 11px; color: var(--text-secondary);">Tiempo Total (min)</label>
          <input type="number" inputmode="numeric" enterkeyhint="done" id="hiit-rf-s-amrap-mins" value="${formState.amrapTotalMins}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center;">
        </div>
      `;
    }
  };

  syncModeBtns();
  renderSettingsForm();

  document.querySelectorAll('.hiit-rf-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      readSettingsFromDom();
      formState.mode = btn.getAttribute('data-mode');
      syncModeBtns();
      renderSettingsForm();
    }, { signal });
  });

  const addEjercicioRow = () => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '8px';
    div.innerHTML = `
      <input type="text" class="hiit-rf-ej-nombre" placeholder="Ej. Burpees" style="flex: 1; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 8px; border-radius: 8px; font-size: 16px;">
      <button class="tappable btn-remove-hiit-ej" type="button" style="background: transparent; border: none; color: var(--text-disabled);">✕</button>
    `;
    div.querySelector('.btn-remove-hiit-ej').addEventListener('click', () => div.remove(), { signal });
    ejerciciosContainer.appendChild(div);
  };

  const btnAddEj = document.getElementById('btn-hiit-rf-add-ejercicio');
  if (btnAddEj) btnAddEj.addEventListener('click', addEjercicioRow, { signal });

  document.getElementById('btn-guardar-hiit-rutina').addEventListener('click', async () => {
    const nombre = document.getElementById('hiit-rf-nombre').value.trim();
    if (!nombre) return Toast('Debes darle un nombre a la rutina', 'warning');

    readSettingsFromDom();

    let hiitSettings;
    if (formState.mode === 'tabata') {
      hiitSettings = { mode: 'tabata', workSecs: 20, restSecs: 10, totalRounds: 8 };
    } else if (formState.mode === 'emom') {
      hiitSettings = {
        mode: 'emom',
        emomTotalMins: formState.emomTotalMins,
        emomIntervalSecs: formState.emomIntervalSecs,
        // totalRounds/workSecs: para que el timer tenga algo sensato
        // pre-cargado incluso antes de leer los campos específicos de EMOM.
        totalRounds: Math.max(1, Math.ceil((formState.emomTotalMins * 60) / formState.emomIntervalSecs)),
        workSecs: formState.emomIntervalSecs,
        restSecs: 0
      };
    } else if (formState.mode === 'amrap') {
      hiitSettings = { mode: 'amrap', amrapTotalMins: formState.amrapTotalMins, totalRounds: 1, workSecs: formState.amrapTotalMins * 60, restSecs: 0 };
    } else {
      hiitSettings = { mode: 'free', workSecs: formState.workSecs, restSecs: formState.restSecs, totalRounds: formState.totalRounds };
    }

    const ejercicios = Array.from(ejerciciosContainer.querySelectorAll('.hiit-rf-ej-nombre'))
      .map(input => input.value.trim())
      .filter(nombreEj => nombreEj !== '')
      .map(nombreEj => ({ nombre: nombreEj, series: [] }));

    await db.crearRutina({ nombre, categoria: 'hiit', ejercicios, hiitSettings });
    Toast('Rutina HIIT creada', 'success');
    if (onSuccess) onSuccess();
  }, { signal });
}
