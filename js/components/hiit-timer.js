import { db } from '../core/db.js';
import { playBeep, speakPhase } from '../core/audio.js';
import { renderSessionSummaryForm, askSessionSummary } from './session-summary-form.js';
import { escapeHtml } from '../utils/escape.js';

// Órbita (Fase 9e): misma lógica y mismos ids; la maqueta usa clases de
// css/entreno.css (.o-ent-tim*) y el estado va en atributos (modo con
// aria-pressed, ejercicio en curso con aria-current) en vez de estilos.
const icono = (trazo) => `<svg class="o-ent-tim-ico" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${trazo}</svg>`;
const fireSvg = icono('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>');
const trophySvg = icono('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"></path><path d="M7 5H4a2 2 0 0 0 0 4h1M17 5h3a2 2 0 0 1 0 4h-1"></path>');
const crownSvg = icono('<path d="m2 20 2-10 5 4 3-7 3 7 5-4 2 10z"></path>');

let timerInterval = null;
let currentState = {
  mode: 'free', 
  phase: 'setup', 
  timeRemaining: 0,
  currentRound: 1,
  totalRounds: 0,
  workSecs: 30,
  restSecs: 15,
  emomTotalMins: 10,
  emomIntervalSecs: 60,
  amrapTotalMins: 15,
  amrapCount: 0,
  startTime: null
};

export function renderHiitTimer(rutina) {
  const modo = (m, etq) => `<button type="button" class="o-chip hiit-mode-btn" data-mode="${m}" aria-pressed="false">${etq}</button>`;
  return `
    <div id="hiit-container" class="o-mod-entreno o-ent-tim">
      <header class="o-ent-sub-cab">
        <p class="o-rotulo">HIIT</p>
        <h2 class="o-ent-titulo">${escapeHtml(rutina.nombre)}</h2>
      </header>

      ${rutina.ejercicios && rutina.ejercicios.length ? `
        <section id="hiit-ejercicios-lista" class="o-card o-ent-tim-ejs" aria-labelledby="hiit-ejercicios-titulo">
          <h3 class="o-rotulo" id="hiit-ejercicios-titulo">Ejercicios de este circuito</h3>
          <ol class="o-ent-tim-ej-lista">
            ${rutina.ejercicios.map((ej, i) => `<li class="hiit-ej-item" data-idx="${i}">${escapeHtml(ej.nombre)}</li>`).join('')}
          </ol>
        </section>
      ` : ''}

      <div id="hiit-setup-view" class="o-ent-tim-vista">
        <div id="hiit-streak-container" class="o-card o-ent-tim-racha">
          <div>
            <p class="o-rotulo">Racha actual</p>
            <p id="hiit-racha-actual" class="o-num o-ent-tim-racha-valor">0${fireSvg}</p>
          </div>
          <div>
            <p class="o-rotulo">Mejor histórica</p>
            <p id="hiit-racha-mejor" class="o-num o-ent-tim-racha-valor">0${trophySvg}</p>
          </div>
        </div>
        <div class="o-ent-modos" role="group" aria-label="Modo del temporizador">
          ${modo('free', 'Libre')}${modo('tabata', 'Tabata')}${modo('emom', 'EMOM')}${modo('amrap', 'AMRAP')}
        </div>

        <div id="hiit-settings-content" class="o-card o-ent-tim-ajustes">
          <!-- Se pinta según el modo -->
        </div>

        <label class="o-card o-ent-tim-voz" for="hiit-voice-toggle">
          <span>Anuncios de voz</span>
          <input type="checkbox" id="hiit-voice-toggle">
        </label>

        <button id="btn-hiit-start" type="button" class="o-btn o-btn--primario o-btn--bloque o-ent-tim-pie">Iniciar timer</button>
      </div>

      <div id="hiit-active-view" class="o-ent-tim-vista o-ent-tim-activa" style="display: none;">
        <p id="hiit-phase-label" class="o-ent-tim-fase" aria-live="polite">PREPÁRATE</p>
        <p id="hiit-time-display" class="o-num o-ent-tim-tiempo">00:00</p>
        <p id="hiit-round-label" class="o-num o-ent-tim-ronda">Ronda 1 / 8</p>
        <p id="hiit-next-exercise" class="o-ent-tim-siguiente" style="display: none;"></p>
        <p id="hiit-amrap-record" class="o-num o-ent-tim-record" style="display: none;"></p>

        <button id="btn-amrap-add" type="button" class="o-btn o-btn--secundario o-btn--bloque o-ent-tim-amrap" style="display: none;">+1 Ronda Completada</button>

        <button id="btn-hiit-stop" type="button" class="o-btn o-btn--secundario o-btn--bloque o-ent-tim-pie">Terminar sesión</button>
      </div>

      <div id="hiit-summary-view" class="o-ent-tim-vista o-ent-tim-fin" style="display: none;">
        <span class="o-ent-tim-fin-ico" aria-hidden="true">${fireSvg}</span>
        <h2 class="o-ent-titulo">¡Sesión Completada!</h2>
        <div id="hiit-summary-stats" class="o-ent-tim-fin-datos"></div>
        <button id="btn-hiit-close" type="button" class="o-btn o-btn--primario o-btn--bloque o-ent-tim-pie">Cerrar y volver</button>
      </div>

    </div>

    ${renderSessionSummaryForm()}
  `;
}

export function initHiitTimerListeners(rutina, onSuccess, signal) {
  // Load Streak
  const elRachaActual = document.getElementById('hiit-racha-actual');
  const elRachaMejor = document.getElementById('hiit-racha-mejor');
  if (elRachaActual && elRachaMejor && db.getRachaHiit) {
    db.getRachaHiit().then(racha => {
      elRachaActual.innerHTML = racha.actual + fireSvg;
      elRachaMejor.innerHTML = racha.mejor + trophySvg;
    });
  }
  const hs = rutina.hiitSettings;
  currentState = {
    mode: hs?.mode || 'free',
    phase: 'setup',
    timeRemaining: 0,
    currentRound: 1,
    totalRounds: hs?.totalRounds || 8,
    workSecs: hs?.workSecs || 30,
    restSecs: hs?.restSecs || 15,
    emomTotalMins: hs?.emomTotalMins || 10,
    emomIntervalSecs: hs?.emomIntervalSecs || 60,
    amrapTotalMins: hs?.amrapTotalMins || 15,
    amrapCount: 0,
    startTime: null
  };

  const voiceToggle = document.getElementById('hiit-voice-toggle');
  if (voiceToggle) {
    let pref = null;
    try { pref = localStorage.getItem('vg_hiit_voice'); } catch (e) { /* sin localStorage: voz activada */ }
    voiceToggle.checked = (pref !== 'off');
    voiceToggle.addEventListener('change', (e) => {
      try { localStorage.setItem('vg_hiit_voice', e.target.checked ? 'on' : 'off'); } catch (err) { /* no se recuerda */ }
    });
  }

  const syncModeBtns = () => {
    document.querySelectorAll('.hiit-mode-btn').forEach(b => {
      const activo = b.getAttribute('data-mode') === currentState.mode;
      b.classList.toggle('active', activo);
      b.setAttribute('aria-pressed', String(activo));
    });
  };
  syncModeBtns();

  const setupView = document.getElementById('hiit-setup-view');
  const activeView = document.getElementById('hiit-active-view');
  const summaryView = document.getElementById('hiit-summary-view');
  const timeDisplay = document.getElementById('hiit-time-display');
  const phaseLabel = document.getElementById('hiit-phase-label');
  const roundLabel = document.getElementById('hiit-round-label');
  const nextExerciseLabel = document.getElementById('hiit-next-exercise');
  const btnAmrapAdd = document.getElementById('btn-amrap-add');

  const campo = (id, etq, valor, done = false) => `
    <div class="o-campo">
      <label for="${id}">${etq}</label>
      <input type="number" inputmode="numeric"${done ? ' enterkeyhint="done"' : ''} id="${id}" class="o-input o-num o-ent-tim-campo" value="${valor}">
    </div>`;
  const renderSettingsForm = () => {
    const c = document.getElementById('hiit-settings-content');
    if (!c) return;
    if (currentState.mode === 'free') {
      c.innerHTML = `
        <div class="o-ent-tim-par">
          ${campo('hiit-s-work', 'Trabajo (seg)', currentState.workSecs)}
          ${campo('hiit-s-rest', 'Descanso (seg)', currentState.restSecs)}
        </div>
        ${campo('hiit-s-rounds', 'Rondas totales', currentState.totalRounds || 8, true)}
      `;
    } else if (currentState.mode === 'tabata') {
      c.innerHTML = `<p class="o-card-texto o-ent-tim-preset">Preset fijo:<br><span class="o-num">20s</span> Trabajo / <span class="o-num">10s</span> Descanso<br><span class="o-num">8</span> Rondas (<span class="o-num">4</span> mins)</p>`;
    } else if (currentState.mode === 'emom') {
      c.innerHTML = `
        <div class="o-ent-tim-par">
          ${campo('hiit-s-emom-mins', 'Tiempo total (min)', currentState.emomTotalMins)}
          ${campo('hiit-s-emom-sec', 'Intervalo (seg)', currentState.emomIntervalSecs, true)}
        </div>
      `;
    } else if (currentState.mode === 'amrap') {
      c.innerHTML = `
        ${campo('hiit-s-amrap-mins', 'Tiempo total (min)', currentState.amrapTotalMins, true)}
      `;
    }
  };
  renderSettingsForm();

  document.querySelectorAll('.hiit-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentState.mode = btn.getAttribute('data-mode');
      syncModeBtns();
      renderSettingsForm();
    });
  });

  const updateDisplay = () => {
    const m = String(Math.floor(currentState.timeRemaining / 60)).padStart(2, '0');
    const s = String(currentState.timeRemaining % 60).padStart(2, '0');
    timeDisplay.innerText = `${m}:${s}`;
    
    if (currentState.mode === 'amrap') {
      roundLabel.innerText = `Rondas: ${currentState.amrapCount}`;
    } else if (currentState.mode === 'emom') {
      roundLabel.innerText = `Intervalo ${currentState.currentRound} / ${currentState.totalRounds}`;
    } else {
      roundLabel.innerText = `Ronda ${currentState.currentRound} / ${currentState.totalRounds}`;
    }
  };

  const startTimerLogic = () => {
    timerInterval = setInterval(() => {
      currentState.timeRemaining--;
      
      // Voice cues at specific times
      if (currentState.timeRemaining === 3 && currentState.phase === 'rest') {
        speakPhase("Prepárate");
      }
      if (currentState.timeRemaining === 3 && currentState.phase === 'work' && currentState.mode !== 'amrap' && currentState.mode !== 'emom') {
        speakPhase("Tres");
      }
      if (currentState.timeRemaining === 2 && currentState.phase === 'work' && currentState.mode !== 'amrap' && currentState.mode !== 'emom') {
        speakPhase("Dos");
      }
      if (currentState.timeRemaining === 1 && currentState.phase === 'work' && currentState.mode !== 'amrap' && currentState.mode !== 'emom') {
        speakPhase("Uno");
      }

      if (currentState.timeRemaining <= 0) {
        handlePhaseTransition();
      }
      updateDisplay();
    }, 1000);
  };

  // El circuito recorre los ejercicios en round-robin: totalRounds suele
  // ser un múltiplo de ejercicios.length a propósito (ej. 5 ejercicios x 3
  // vueltas = 15 rondas), así que el índice tiene que envolver con módulo
  // — sin esto, "Siguiente ejercicio" (y el resaltado de "actual" de abajo)
  // dejaba de mostrar nada después de la primera vuelta completa, aunque
  // el circuito siguiera. Solo aplica a los modos con rondas de
  // trabajo/descanso discretas (free/tabata); EMOM y AMRAP no mapean 1:1
  // ronda-ejercicio de la misma forma.
  const enCircuitoDeEjercicios = () => (currentState.mode === 'free' || currentState.mode === 'tabata') && rutina.ejercicios && rutina.ejercicios.length > 0;

  const highlightEjercicioActual = () => {
    const listaEl = document.getElementById('hiit-ejercicios-lista');
    if (!listaEl) return;
    const activo = enCircuitoDeEjercicios();
    const idx = activo ? (currentState.currentRound - 1) % rutina.ejercicios.length : -1;
    listaEl.querySelectorAll('.hiit-ej-item').forEach(el => {
      const esActual = activo && Number(el.dataset.idx) === idx;
      if (esActual) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
  };

  const updateNextExercise = () => {
    if (enCircuitoDeEjercicios() && currentState.phase === 'rest') {
      const idx = currentState.currentRound % rutina.ejercicios.length;
      nextExerciseLabel.innerText = `Siguiente: ${rutina.ejercicios[idx].nombre}`;
      nextExerciseLabel.style.display = 'block';
    } else {
      nextExerciseLabel.style.display = 'none';
    }
  };

  const handlePhaseTransition = () => {
    playBeep();
    if (currentState.mode === 'free' || currentState.mode === 'tabata') {
      if (currentState.phase === 'work') {
        currentState.phase = 'rest';
        currentState.timeRemaining = currentState.restSecs;
        phaseLabel.innerText = "DESCANSO";
        timeDisplay.classList.add('o-ent-tim-tiempo--acento');
        speakPhase("Descanso");
        updateNextExercise();
      } else {
        if (currentState.currentRound >= currentState.totalRounds) return finishSessionLogic(true);
        currentState.currentRound++;
        currentState.phase = 'work';
        currentState.timeRemaining = currentState.workSecs;
        phaseLabel.innerText = "TRABAJO";
        timeDisplay.classList.add('o-ent-tim-tiempo--acento');
        nextExerciseLabel.style.display = 'none';
        highlightEjercicioActual();

        if (currentState.currentRound === currentState.totalRounds) {
          speakPhase("Última ronda, trabajo");
        } else {
          speakPhase("Trabajo");
        }
      }
    } else if (currentState.mode === 'emom') {
      if (currentState.currentRound >= currentState.totalRounds) return finishSessionLogic(true);
      currentState.currentRound++;
      currentState.timeRemaining = currentState.emomIntervalSecs;
      phaseLabel.innerText = "NUEVO INTERVALO";
      speakPhase("Nuevo intervalo");
      setTimeout(() => phaseLabel.innerText = "TRABAJANDO", 3000);
    } else if (currentState.mode === 'amrap') {
      speakPhase("Tiempo finalizado");
      return finishSessionLogic(true);
    }
  };

  const finishSessionLogic = async (completed) => {
    cleanupHiitTimer();
    const duracionMin = currentState.startTime ? Math.max(1, Math.floor((new Date() - currentState.startTime) / 60000)) : 0;
    
    // Calculate Calories
    let factor = 8;
    if (currentState.mode === 'tabata' || currentState.mode === 'emom') factor = 10;
    const estKcal = duracionMin * factor;

    const summary = await askSessionSummary();

    await db.registrarSesion({
      rutinaId: rutina.id,
      nombreRutina: `${rutina.nombre} (${currentState.mode.toUpperCase()})`,
      duracionMin,
      completado: completed,
      ejercicios: [{ nombre: 'HIIT Performance', series: [{ tipo: 'normal', reps: currentState.amrapCount.toString(), peso: 0 }] }],
      rpe: summary.rpe,
      notas: summary.notas
    });

    activeView.style.display = 'none';
    summaryView.style.display = 'flex';
    
    document.getElementById('hiit-summary-stats').innerHTML = `
      <p>Duración: <strong class="o-num">${duracionMin} min</strong></p>
      <p>Energía estimada: <strong class="o-num">~${estKcal} kcal</strong></p>
      ${currentState.mode === 'amrap' ? `<p>Rondas completadas: <strong class="o-num">${currentState.amrapCount}</strong></p>` : ''}
    `;
  };

  document.getElementById('btn-hiit-start').addEventListener('click', () => {
    if (currentState.mode === 'free') {
      currentState.workSecs = parseInt(document.getElementById('hiit-s-work').value) || 30;
      currentState.restSecs = parseInt(document.getElementById('hiit-s-rest').value) || 15;
      currentState.totalRounds = parseInt(document.getElementById('hiit-s-rounds').value) || 8;
    } else if (currentState.mode === 'tabata') {
      currentState.workSecs = 20;
      currentState.restSecs = 10;
      currentState.totalRounds = 8;
    } else if (currentState.mode === 'emom') {
      const mins = parseInt(document.getElementById('hiit-s-emom-mins').value) || 10;
      currentState.emomIntervalSecs = parseInt(document.getElementById('hiit-s-emom-sec').value) || 60;
      currentState.totalRounds = Math.ceil((mins * 60) / currentState.emomIntervalSecs);
    } else if (currentState.mode === 'amrap') {
      const mins = parseInt(document.getElementById('hiit-s-amrap-mins').value) || 15;
      currentState.timeRemaining = mins * 60;
      currentState.totalRounds = 1;
      btnAmrapAdd.style.display = '';
      
      const recordEl = document.getElementById('hiit-amrap-record');
      if (recordEl) {
        db.getMejorAmrap(rutina.id).then(record => {
          if (record > 0) {
            recordEl.innerHTML = `${crownSvg}Mejor histórico: ${record} rondas`;
            recordEl.style.display = 'block';
          }
        });
      }
    }

    setupView.style.display = 'none';
    activeView.style.display = 'flex';
    
    if (currentState.mode === 'free' || currentState.mode === 'tabata') {
      currentState.phase = 'work';
      currentState.timeRemaining = currentState.workSecs;
      phaseLabel.innerText = "TRABAJO";
      timeDisplay.classList.add('o-ent-tim-tiempo--acento');
      speakPhase("Trabajo");
      highlightEjercicioActual();
    } else if (currentState.mode === 'emom') {
      currentState.phase = 'work';
      currentState.timeRemaining = currentState.emomIntervalSecs;
      phaseLabel.innerText = "TRABAJANDO";
      timeDisplay.classList.remove('o-ent-tim-tiempo--acento');
      speakPhase("Comenzando EMOM");
    } else if (currentState.mode === 'amrap') {
      currentState.phase = 'work';
      phaseLabel.innerText = "AMRAP";
      timeDisplay.classList.remove('o-ent-tim-tiempo--acento');
      speakPhase("Comenzando AMRAP");
    }

    updateDisplay();
    currentState.startTime = new Date();
    playBeep();
    startTimerLogic();
  });

  btnAmrapAdd.addEventListener('click', () => {
    currentState.amrapCount++;
    updateDisplay();
  });

  document.getElementById('btn-hiit-stop').addEventListener('click', () => {
    finishSessionLogic(false);
  });

  document.getElementById('btn-hiit-close').addEventListener('click', () => {
    if (onSuccess) onSuccess();
  });
}

export function cleanupHiitTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}