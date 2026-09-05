import { db } from '../core/db.js';
import { playBeep, speakPhase } from '../core/audio.js';
import { renderSessionSummaryForm, askSessionSummary } from './session-summary-form.js';
import { escapeHtml } from '../utils/escape.js';

const fireSvg = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: -3px; margin-left: 4px;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`;
const trophySvg = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: -3px; margin-left: 4px;"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"></path><path d="M7 5H4a2 2 0 0 0 0 4h1M17 5h3a2 2 0 0 1 0 4h-1"></path></svg>`;
const crownSvg = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px;"><path d="m2 20 2-10 5 4 3-7 3 7 5-4 2 10z"></path></svg>`;

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
  return `
    <div id="hiit-container" class="card" style="padding: 22px; border-radius: 20px; min-height: 70vh; display: flex; flex-direction: column;">
      <div class="flex-between" style="margin-bottom: 24px;">
        <h2 style="font-size: 21px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.3px;">${escapeHtml(rutina.nombre)}</h2>
      </div>

      <div id="hiit-setup-view" style="display: flex; flex-direction: column; flex: 1;">
        <div id="hiit-streak-container" style="display: flex; gap: 12px; margin-bottom: 24px; background: rgba(92, 225, 230, 0.06); padding: 14px; border-radius: 16px; border: 1px solid rgba(92, 225, 230, 0.25);">
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Racha Actual</div>
            <div id="hiit-racha-actual" class="num" style="font-size: 20px; font-weight: 800; color: var(--accent-teal);">0${fireSvg}</div>
          </div>
          <div style="width: 1px; background: var(--surface-border);"></div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Mejor Histórica</div>
            <div id="hiit-racha-mejor" class="num" style="font-size: 20px; font-weight: 800; color: var(--text-primary);">0${trophySvg}</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
          <button class="hiit-mode-btn active" data-mode="free" style="padding: 13px; border-radius: 12px; background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--accent-teal); font-weight: 700; cursor: pointer;">Libre</button>
          <button class="hiit-mode-btn" data-mode="tabata" style="padding: 13px; border-radius: 12px; background: var(--surface-2); color: var(--text-secondary); border: 1px solid transparent; font-weight: 700; cursor: pointer;">Tabata</button>
          <button class="hiit-mode-btn" data-mode="emom" style="padding: 13px; border-radius: 12px; background: var(--surface-2); color: var(--text-secondary); border: 1px solid transparent; font-weight: 700; cursor: pointer;">EMOM</button>
          <button class="hiit-mode-btn" data-mode="amrap" style="padding: 13px; border-radius: 12px; background: var(--surface-2); color: var(--text-secondary); border: 1px solid transparent; font-weight: 700; cursor: pointer;">AMRAP</button>
        </div>

        <div id="hiit-settings-content" style="background: var(--surface-2); padding: 16px; border-radius: 16px; margin-bottom: 16px;">
          <!-- Injected based on mode -->
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: var(--surface-2); border-radius: 16px; margin-bottom: 24px;">
          <label for="hiit-voice-toggle" style="font-size: 14px; color: var(--text-primary); font-weight: 600;">Anuncios de voz</label>
          <input type="checkbox" id="hiit-voice-toggle" style="width: 20px; height: 20px; accent-color: var(--accent-teal);">
        </div>

        <div style="margin-top: auto;">
          <button id="btn-hiit-start" class="btn-primary tappable" style="background: var(--accent-teal);">
            Iniciar Timer
          </button>
        </div>
      </div>

      <div id="hiit-active-view" style="display: none; flex-direction: column; flex: 1; align-items: center; justify-content: center; text-align: center;">
        <div id="hiit-phase-label" style="font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px;">PREPÁRATE</div>
        
        <div id="hiit-time-display" class="num" style="font-size: 96px; font-weight: 900; line-height: 1; margin-bottom: 24px; color: var(--text-primary);">
          00:00
        </div>
        
        <div id="hiit-round-label" class="num" style="font-size: 18px; color: var(--text-secondary); font-weight: 600; margin-bottom: 8px;">Ronda 1 / 8</div>
        <div id="hiit-next-exercise" style="font-size: 16px; color: var(--accent-teal); font-weight: 700; margin-bottom: 8px; display: none;"></div>
        <div id="hiit-amrap-record" style="font-size: 14px; color: var(--accent-teal); font-weight: 700; margin-bottom: 24px; display: none;"></div>
        
        <button id="btn-amrap-add" class="tappable" style="display: none; background: rgba(92, 225, 230, 0.1); border: 1px dashed var(--accent-teal); color: var(--accent-teal); padding: 14px 24px; border-radius: 16px; font-size: 18px; font-weight: 700; margin-bottom: 24px; cursor: pointer;">+1 Ronda Completada</button>

        <div style="display: flex; gap: 16px; width: 100%; margin-top: auto;">
          <button id="btn-hiit-stop" class="tappable" style="flex: 1; padding: 15px; border-radius: 14px; background: rgba(239, 68, 68, 0.1); color: var(--state-high); font-size: 15px; font-weight: 700; border: none; cursor: pointer;">
            Terminar Sesión
          </button>
        </div>
      </div>

      <div id="hiit-summary-view" style="display: none; flex-direction: column; flex: 1; align-items: center; justify-content: center; text-align: center;">
        <div class="icon-chip" style="width: 72px; height: 72px; background: rgba(92, 225, 230, 0.15); color: var(--accent-teal); margin: 0 auto 20px auto;">
          <svg width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
        </div>
        <h2 style="font-size: 24px; font-weight: 800; margin: 0 0 8px 0; color: var(--text-primary); letter-spacing: -0.3px;">¡Sesión Completada!</h2>
        <div id="hiit-summary-stats" style="color: var(--text-secondary); font-size: 16px; margin-bottom: 32px; line-height: 1.5;"></div>
        <button id="btn-hiit-close" class="btn-primary tappable" style="background: var(--accent-teal);">
          Cerrar y Volver
        </button>
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
    const pref = localStorage.getItem('vg_hiit_voice');
    voiceToggle.checked = (pref !== 'off');
    voiceToggle.addEventListener('change', (e) => {
      localStorage.setItem('vg_hiit_voice', e.target.checked ? 'on' : 'off');
    });
  }

  const syncModeBtns = () => {
    document.querySelectorAll('.hiit-mode-btn').forEach(b => {
      if (b.getAttribute('data-mode') === currentState.mode) {
        b.classList.add('active');
        b.style.color = 'var(--text-primary)';
        b.style.borderColor = 'var(--accent-teal)';
      } else {
        b.classList.remove('active');
        b.style.color = 'var(--text-secondary)';
        b.style.borderColor = 'transparent';
      }
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

  const renderSettingsForm = () => {
    const c = document.getElementById('hiit-settings-content');
    if (!c) return;
    if (currentState.mode === 'free') {
      c.innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <div style="flex: 1;">
            <label for="hiit-s-work" style="font-size: 11px; color: var(--text-secondary);">Trabajo (seg)</label>
            <input type="number" inputmode="numeric" id="hiit-s-work" value="${currentState.workSecs}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center; box-sizing: border-box;">
          </div>
          <div style="flex: 1;">
            <label for="hiit-s-rest" style="font-size: 11px; color: var(--text-secondary);">Descanso (seg)</label>
            <input type="number" inputmode="numeric" id="hiit-s-rest" value="${currentState.restSecs}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center; box-sizing: border-box;">
          </div>
        </div>
        <div>
          <label for="hiit-s-rounds" style="font-size: 11px; color: var(--text-secondary);">Rondas Totales</label>
          <input type="number" inputmode="numeric" enterkeyhint="done" id="hiit-s-rounds" value="${currentState.totalRounds || 8}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center; box-sizing: border-box;">
        </div>
      `;
    } else if (currentState.mode === 'tabata') {
      c.innerHTML = `<div style="text-align: center; color: var(--text-secondary); font-size: 14px;">Preset Fijo:<br>20s Trabajo / 10s Descanso<br>8 Rondas (4 mins)</div>`;
    } else if (currentState.mode === 'emom') {
      c.innerHTML = `
        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <label for="hiit-s-emom-mins" style="font-size: 11px; color: var(--text-secondary);">Tiempo Total (min)</label>
            <input type="number" inputmode="numeric" id="hiit-s-emom-mins" value="${currentState.emomTotalMins}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center; box-sizing: border-box;">
          </div>
          <div style="flex: 1;">
            <label for="hiit-s-emom-sec" style="font-size: 11px; color: var(--text-secondary);">Intervalo (seg)</label>
            <input type="number" inputmode="numeric" enterkeyhint="done" id="hiit-s-emom-sec" value="${currentState.emomIntervalSecs}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center; box-sizing: border-box;">
          </div>
        </div>
      `;
    } else if (currentState.mode === 'amrap') {
      c.innerHTML = `
        <div>
          <label for="hiit-s-amrap-mins" style="font-size: 11px; color: var(--text-secondary);">Tiempo Total (min)</label>
          <input type="number" inputmode="numeric" enterkeyhint="done" id="hiit-s-amrap-mins" value="${currentState.amrapTotalMins}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 8px; color:var(--text-primary); text-align:center; box-sizing: border-box;">
        </div>
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

  const updateNextExercise = () => {
    if (rutina.hiitSettings && rutina.ejercicios && currentState.phase === 'rest') {
      const idx = currentState.currentRound; // the next round index (since currentRound is updated after rest)
      if (idx < rutina.ejercicios.length) {
        nextExerciseLabel.innerText = `Siguiente: ${rutina.ejercicios[idx].nombre}`;
        nextExerciseLabel.style.display = 'block';
      } else {
        nextExerciseLabel.style.display = 'none';
      }
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
        phaseLabel.style.color = "var(--accent-teal)";
        timeDisplay.style.color = "var(--accent-teal)";
        speakPhase("Descanso");
        updateNextExercise();
      } else {
        if (currentState.currentRound >= currentState.totalRounds) return finishSessionLogic(true);
        currentState.currentRound++;
        currentState.phase = 'work';
        currentState.timeRemaining = currentState.workSecs;
        phaseLabel.innerText = "TRABAJO";
        phaseLabel.style.color = "var(--accent-teal)";
        timeDisplay.style.color = "var(--accent-teal)";
        nextExerciseLabel.style.display = 'none';
        
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
      <div>Duración: <strong style="color:var(--text-primary);">${duracionMin} min</strong></div>
      <div>Energía Estimada: <strong style="color:var(--accent-teal);">~${estKcal} kcal</strong></div>
      ${currentState.mode === 'amrap' ? `<div>Rondas completadas: <strong style="color:var(--accent-teal);">${currentState.amrapCount}</strong></div>` : ''}
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
      btnAmrapAdd.style.display = 'block';
      
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
      phaseLabel.style.color = "var(--accent-teal)";
      timeDisplay.style.color = "var(--accent-teal)";
      speakPhase("Trabajo");
    } else if (currentState.mode === 'emom') {
      currentState.phase = 'work';
      currentState.timeRemaining = currentState.emomIntervalSecs;
      phaseLabel.innerText = "TRABAJANDO";
      phaseLabel.style.color = "var(--accent-teal)";
      timeDisplay.style.color = "var(--text-primary)";
      speakPhase("Comenzando EMOM");
    } else if (currentState.mode === 'amrap') {
      currentState.phase = 'work';
      phaseLabel.innerText = "AMRAP";
      phaseLabel.style.color = "var(--accent-teal)";
      timeDisplay.style.color = "var(--text-primary)";
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