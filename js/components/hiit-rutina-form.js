import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { oIcono } from './orbita.js';

// Formulario "Crear rutina HIIT". Órbita desde la Fase 9b (css/entreno.css);
// los ids y clases que lee el guardado son los de siempre.

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
    <section class="o-card o-ent-form">
      <h2 class="o-ent-titulo">Crear rutina HIIT</h2>

      <div class="o-campo">
        <label for="hiit-rf-nombre">Nombre de la rutina</label>
        <input type="text" id="hiit-rf-nombre" class="o-input" placeholder="Ej. Tabata Explosivo" autocomplete="off">
      </div>

      <div class="o-campo">
        <span class="o-campo-etiqueta" id="hiit-rf-modo-etiqueta">Modo</span>
        <div class="o-ent-modos" role="group" aria-labelledby="hiit-rf-modo-etiqueta">
          <button type="button" class="hiit-rf-mode-btn o-chip" data-mode="free" aria-pressed="true">Libre</button>
          <button type="button" class="hiit-rf-mode-btn o-chip" data-mode="tabata" aria-pressed="false">Tabata</button>
          <button type="button" class="hiit-rf-mode-btn o-chip" data-mode="emom" aria-pressed="false">EMOM</button>
          <button type="button" class="hiit-rf-mode-btn o-chip" data-mode="amrap" aria-pressed="false">AMRAP</button>
        </div>
      </div>

      <div id="hiit-rf-settings" class="o-ent-hiit-ajustes">
        <!-- Se llena según el modo -->
      </div>

      <div class="o-campo">
        <span class="o-campo-etiqueta">Ejercicios del circuito (opcional)</span>
        <p class="o-campo-ayuda">Se usan para mostrar "Siguiente: ..." durante los descansos. Déjalo vacío si es solo un temporizador.</p>
        <div id="hiit-rf-ejercicios-container" class="o-ent-hiit-ejs"></div>
        <button id="btn-hiit-rf-add-ejercicio" type="button" class="o-btn o-btn--secundario o-btn--bloque">Agregar ejercicio</button>
      </div>

      <button id="btn-guardar-hiit-rutina" type="button" class="o-btn o-btn--primario o-btn--bloque">Guardar rutina</button>
    </section>
  `;
}

export function initHiitRutinaFormListeners(onSuccess, signal) {
  formState = { mode: 'free', workSecs: 30, restSecs: 15, totalRounds: 8, emomTotalMins: 10, emomIntervalSecs: 60, amrapTotalMins: 15 };

  const ejerciciosContainer = document.getElementById('hiit-rf-ejercicios-container');
  const settingsEl = document.getElementById('hiit-rf-settings');

  const syncModeBtns = () => {
    document.querySelectorAll('.hiit-rf-mode-btn').forEach(b => {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === formState.mode));
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
        <div class="o-ent-campos o-ent-campos--2">
          <div class="o-campo">
            <label for="hiit-rf-s-work">Trabajo (seg)</label>
            <input type="number" inputmode="numeric" id="hiit-rf-s-work" class="o-input o-num o-ent-num-centro" value="${formState.workSecs}">
          </div>
          <div class="o-campo">
            <label for="hiit-rf-s-rest">Descanso (seg)</label>
            <input type="number" inputmode="numeric" id="hiit-rf-s-rest" class="o-input o-num o-ent-num-centro" value="${formState.restSecs}">
          </div>
        </div>
        <div class="o-campo">
          <label for="hiit-rf-s-rounds">Rondas totales</label>
          <input type="number" inputmode="numeric" enterkeyhint="done" id="hiit-rf-s-rounds" class="o-input o-num o-ent-num-centro" value="${formState.totalRounds}">
        </div>
      `;
    } else if (formState.mode === 'tabata') {
      settingsEl.innerHTML = `<p class="o-ent-preset">Preset fijo:<br><span class="o-num">20s</span> Trabajo / <span class="o-num">10s</span> Descanso<br><span class="o-num">8</span> Rondas (<span class="o-num">4</span> mins)</p>`;
    } else if (formState.mode === 'emom') {
      settingsEl.innerHTML = `
        <div class="o-ent-campos o-ent-campos--2">
          <div class="o-campo">
            <label for="hiit-rf-s-emom-mins">Tiempo total (min)</label>
            <input type="number" inputmode="numeric" id="hiit-rf-s-emom-mins" class="o-input o-num o-ent-num-centro" value="${formState.emomTotalMins}">
          </div>
          <div class="o-campo">
            <label for="hiit-rf-s-emom-sec">Intervalo (seg)</label>
            <input type="number" inputmode="numeric" enterkeyhint="done" id="hiit-rf-s-emom-sec" class="o-input o-num o-ent-num-centro" value="${formState.emomIntervalSecs}">
          </div>
        </div>
      `;
    } else if (formState.mode === 'amrap') {
      settingsEl.innerHTML = `
        <div class="o-campo">
          <label for="hiit-rf-s-amrap-mins">Tiempo total (min)</label>
          <input type="number" inputmode="numeric" enterkeyhint="done" id="hiit-rf-s-amrap-mins" class="o-input o-num o-ent-num-centro" value="${formState.amrapTotalMins}">
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
    div.className = 'o-ent-hiit-ej';
    div.innerHTML = `
      <input type="text" class="hiit-rf-ej-nombre o-input" placeholder="Ej. Burpees" aria-label="Ejercicio del circuito">
      <button type="button" class="btn-remove-hiit-ej o-btn o-btn--fantasma o-btn--icono" aria-label="Quitar ejercicio">${oIcono('cerrar')}</button>
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
