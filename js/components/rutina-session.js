import { db } from '../core/db.js';
import { playBeep } from '../core/audio.js';
import { renderEjercicioDetalle } from './ejercicio-detalle.js';
import { calcularDiscos, renderPlateCalculatorPopover } from './plate-calculator.js';
import { getProgressionLevel } from '../core/progresiones-calistenia.js';
import { getEjercicioMetadata, CATALOGO_EJERCICIOS } from '../core/ejercicios-catalogo.js';
import { ConfirmDialog } from '../utils/states.js';

const trophySvgSm = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 3px;"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"></path><path d="M7 5H4a2 2 0 0 0 0 4h1M17 5h3a2 2 0 0 1 0 4h-1"></path></svg>`;
const historySvg = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 3px;"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><path d="M12 7v5l4 2"></path></svg>`;
const trendUpSvg = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 3px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`;
const arrowUpSvg = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px;"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
const arrowDownSvg = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px;"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
const clockSvg = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -3px; margin-right: 6px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

let timerInterval = null;
let restTimerInterval = null;
let startTime = null;

let currentPRs = {};
let currentSugerencias = {};
let currentHistorial = {};

export async function renderRutinaSession(rutina) {
  // Preload data
  currentPRs = await db.getPRs();
  currentHistorial = {};
  for (const ej of rutina.ejercicios) {
    currentHistorial[ej.nombre] = await db.getHistorialEjercicio(ej.nombre);
    currentSugerencias[ej.nombre] = await db.sugerirProgresion(ej.nombre);
  }

  
  let html = `
    <div class="card" style="padding: 22px; border-radius: 20px;">
      <div class="flex-between" style="margin-bottom: 20px;">
        <h2 style="font-size: 21px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.3px;">${rutina.nombre}</h2>
        <div id="session-timer" style="font-size: 16px; font-weight: 700; color: var(--accent-purple); font-variant-numeric: tabular-nums; font-family: var(--font-mono);">00:00</div>
      </div>
  `;

  html += `<div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">`;
  
  let currentGrupoId = null;

  for (let idx = 0; idx < rutina.ejercicios.length; idx++) {
    const ej = rutina.ejercicios[idx];
    const hist = currentHistorial[ej.nombre];
    const ultimo = (hist && hist.length > 0) ? hist[hist.length - 1] : null;
    const pr = currentPRs[ej.nombre.toLowerCase().trim()];
    const prog = getProgressionLevel(ej.nombre);
    const meta = getEjercicioMetadata(ej.nombre);
    const sug = currentSugerencias[ej.nombre];

    if (ej.grupoId && ej.grupoId !== currentGrupoId) {
      if (currentGrupoId !== null) html += `</div>`; // close previous group
      currentGrupoId = ej.grupoId;
      html += `<div style="border: 2px dashed var(--accent-teal); border-radius: 18px; padding: 14px; background: rgba(20, 184, 166, 0.05); position: relative;">
                <div style="position: absolute; top: -10px; left: 16px; background: var(--surface-1); padding: 0 8px; font-size: 11px; font-weight: 700; color: var(--accent-teal); border-radius: 4px;">Superserie ${ej.grupoId}</div>`;
    } else if (!ej.grupoId && currentGrupoId !== null) {
      html += `</div>`; // close previous group
      currentGrupoId = null;
    }

    html += `
      <div class="card ejercicio-sesion-block" data-ej-nombre="${ej.nombre}" style="background: var(--surface-2); padding: 16px; border-radius: 16px; margin-bottom: ${ej.grupoId ? '12px' : '0'};">

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
            <h3 style="font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary); white-space: normal; line-height: 1.2; word-break: break-word;">${ej.nombre}</h3>
            ${meta && meta.instrucciones ? `<button class="btn-info-ejercicio" data-instrucciones="${meta.instrucciones}" data-musculo="${meta.musculoSecundario || ''}" style="flex-shrink:0; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-secondary); width:22px; height:22px; border-radius:50%; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></button>` : ''}
          </div>
          <button class="btn-plate-calc" style="flex-shrink:0; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 6px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Calculadora de discos"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="8.01" y2="10"></line><line x1="12" y1="10" x2="12.01" y2="10"></line><line x1="16" y1="10" x2="16.01" y2="10"></line><line x1="8" y1="14" x2="8.01" y2="14"></line><line x1="12" y1="14" x2="12.01" y2="14"></line><line x1="16" y1="14" x2="16.01" y2="14"></line><line x1="8" y1="18" x2="16" y2="18"></line></svg></button>
            <button class="btn-ver-progreso" data-ejnombre="${ej.nombre}" style="flex-shrink:0; background: var(--surface-1); border: 1px solid var(--surface-border); color: var(--accent-purple); font-size: 12px; font-weight: 700; cursor: pointer; padding: 6px 12px; border-radius: 20px; white-space: nowrap; display: flex; align-items: center;">${trendUpSvg}Progreso</button>
        </div>

        <div id="progreso-container-${ej.nombre.replace(/\s+/g, '')}" style="display: none; width: 100%; margin-bottom: 12px;"></div>
    `;

    const chips = [];

    if (pr && pr.pesoMax > 0) {
      const rm = db.estimar1RM(pr.pesoMax, pr.repsMax || pr.repsEnPesoMax || 1); // fallback
      chips.push(`<span style="background: rgba(191,90,242,0.12); color: var(--accent-purple); border: 1px solid rgba(191,90,242,0.3); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">${trophySvgSm}PR ${pr.pesoMax}kg${rm > 0 ? ` · 1RM ~${rm}kg` : ''}</span>`);
    } else if (pr && pr.pesoMax === 0 && pr.repsMax > 0) {
      chips.push(`<span style="background: rgba(191,90,242,0.12); color: var(--accent-purple); border: 1px solid rgba(191,90,242,0.3); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">${trophySvgSm}PR ${pr.repsMax} reps</span>`);
    }

    if (ultimo) {
      const ultimoTxt = ultimo.pesoMax > 0 ? `${ultimo.pesoMax}kg` : `${ultimo.repsMax || 0} reps`;
      chips.push(`<span style="background: var(--surface-1); color: var(--text-secondary); border: 1px solid var(--surface-border); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;">${historySvg}${ultimoTxt} · ${ultimo.volumenTotal} vol</span>`);
    } else {
      chips.push(`<span style="background: var(--surface-1); color: var(--text-disabled); border: 1px solid var(--surface-border); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;">Primera vez</span>`);
    }

    if (prog) {
      chips.push(`<span style="background: rgba(20,184,166,0.12); color: var(--accent-teal); border: 1px solid rgba(20,184,166,0.3); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">${trendUpSvg}${prog.familia} · Nv.${prog.nivelActual}/${prog.nivelTotal}</span>`);
    }

    html += `<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">${chips.join('')}</div>`;

    if (sug) {
      const sugText = sug.peso > 0 ? sug.peso + 'kg' : sug.reps + ' reps';
      const sugIcon = sug.accion === 'aumentar' ? arrowUpSvg : arrowDownSvg;
      html += `<button class="btn-sugerencia" data-ejnombre="${ej.nombre}" data-peso="${sug.peso}" data-reps="${sug.reps}" style="width: 100%; background: rgba(20,184,166,0.08); border: 1px dashed var(--accent-teal); color: var(--accent-teal); padding: 9px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 12px;">${sugIcon}Sugerido: ${sugText} · toca para aplicar</button>`;
    }

    html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
    
    html += `
              <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
          <div style="width: 20px;"></div>
          <div style="flex: 2; font-size: 10px; color: var(--text-secondary); text-align: center;">TIPO</div>
          <div style="flex: 2; font-size: 10px; color: var(--text-secondary); text-align: center;">REPS</div>
          <div style="flex: 2; font-size: 10px; color: var(--text-secondary); text-align: center;">PESO</div>
          <div style="flex: 2; font-size: 10px; color: var(--text-secondary); text-align: center;">RPE</div>
          <div style="width: 44px;"></div>
        </div>
      `;
      ej.series.forEach((s, sIdx) => {
      const isNormal = s.tipo === 'normal' ? 'selected' : '';
      const isCalentamiento = s.tipo === 'calentamiento' ? 'selected' : '';
      const isFallo = s.tipo === 'fallo' ? 'selected' : '';
      const isDropset = s.tipo === 'dropset' ? 'selected' : '';

      html += `
                  <div class="serie-row" style="display: flex; gap: 4px; align-items: center; position: relative; margin-bottom: 8px;">
            <div style="width: 20px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-align: center;">${sIdx + 1}</div>
            <div style="flex: 2;">
              <select class="serie-tipo" style="width:100%; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 0; color:var(--text-primary); font-size:12px; text-align: center; text-align-last: center; appearance: none; -webkit-appearance: none;">
                <option value="normal" ${isNormal}>N</option>
                <option value="calentamiento" ${isCalentamiento}>C</option>
                <option value="fallo" ${isFallo}>F</option>
                <option value="dropset" ${isDropset}>D</option>
              </select>
            </div>
            <div style="flex: 2;">
              <input type="number" class="serie-reps" value="${s.reps}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 4px; color:var(--text-primary); text-align:center; font-size:14px; font-family: var(--font-mono);">
            </div>
            <div style="flex: 2;">
              <input type="number" step="0.5" class="serie-peso" value="${s.peso}" style="width:100%; box-sizing:border-box; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 4px; color:var(--text-primary); text-align:center; font-size:14px; font-family: var(--font-mono);">
            </div>
            <div style="flex: 2;">
              <select class="serie-rpe" style="width:100%; background:var(--surface-1); border:1px solid var(--surface-border); border-radius:10px; padding:10px 0; color:var(--text-primary); font-size:12px; text-align:center; text-align-last: center; appearance: none; -webkit-appearance: none;">
                <option value="">-</option>
                <option value="5" ${s.rpe == 5 ? 'selected' : ''}>5</option>
                <option value="6" ${s.rpe == 6 ? 'selected' : ''}>6</option>
                <option value="7" ${s.rpe == 7 ? 'selected' : ''}>7</option>
                <option value="8" ${s.rpe == 8 ? 'selected' : ''}>8</option>
                <option value="9" ${s.rpe == 9 ? 'selected' : ''}>9</option>
                <option value="10" ${s.rpe == 10 ? 'selected' : ''}>10</option>
              </select>
            </div>
            <button class="btn-check-serie" data-checked="${s.checked === true ? 'true' : 'false'}" style="width: 44px; height: 40px; border-radius: 8px; background: ${s.checked ? 'var(--state-success)' : 'var(--surface-2)'}; border: 1px solid ${s.checked ? 'var(--state-success)' : 'var(--surface-border)'}; color: ${s.checked ? '#000' : 'var(--surface-border)'}; font-size: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
              ✓
            </button>
          </div>
      `;
    });
    
    html += `</div></div>`;
  }
  
  if (currentGrupoId !== null) {
    html += `</div>`;
  }

  html += `</div>`;

  
  html += `
    <button id="btn-add-ejercicio-live" class="tappable" style="width: 100%; padding: 15px; border-radius: 14px; background: var(--surface-2); color: var(--text-primary); font-size: 15px; font-weight: 700; border: 1px dashed var(--surface-border); cursor: pointer; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Añadir Ejercicio</button><button id="btn-finalizar-sesion" class="btn-primary tappable" style="background: var(--accent-purple);">
      Finalizar Sesión
    </button>
  </div>`;

  // Floating timer
  html += `<div id="floating-rest-timer" style="display: none; position: fixed; bottom: calc(90px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); background: var(--surface-2); border: 2px solid var(--accent-purple); color: var(--text-primary); padding: 12px 24px; border-radius: 30px; font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; box-shadow: 0 8px 16px rgba(0,0,0,0.5); z-index: 1000; cursor: pointer; align-items: center; gap: 8px;">
    ${clockSvg}<span id="rest-timer-text">01:00</span>
  </div>`;

  return html;
}

export function initRutinaSessionListeners(rutina, onSuccess, signal) {
  startTime = new Date();
  
  const timerDisplay = document.getElementById('session-timer');
  timerInterval = setInterval(() => {
    const diff = Math.floor((new Date() - startTime) / 1000);
    const m = String(Math.floor(diff / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;
  }, 1000);

  const floatEl = document.getElementById('floating-rest-timer');
  const textEl = document.getElementById('rest-timer-text');
  
  if (floatEl) {
    floatEl.addEventListener('click', () => {
      if (restTimerInterval) clearInterval(restTimerInterval);
      floatEl.style.display = 'none';
    });
  }

  const startRestTimer = (seconds) => {
    if (!floatEl || !textEl) return;
    if (restTimerInterval) clearInterval(restTimerInterval);
    
    let timeRemaining = seconds;
    floatEl.style.display = 'flex';
    const mInit = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sInit = String(seconds % 60).padStart(2, '0');
    textEl.innerText = `${mInit}:${sInit}`;
    
    restTimerInterval = setInterval(() => {
      timeRemaining--;
      if (timeRemaining <= 0) {
        clearInterval(restTimerInterval);
        floatEl.style.display = 'none';
        playBeep();
      } else {
        const m = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
        const s = String(timeRemaining % 60).padStart(2, '0');
        textEl.innerText = `${m}:${s}`;
      }
    }, 1000);
  };

  
  document.querySelectorAll('.btn-sugerencia').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const peso = parseFloat(btn.getAttribute('data-peso')) || 0;
      const reps = parseInt(btn.getAttribute('data-reps')) || 0;
      
      const card = btn.closest('.ejercicio-sesion-block');
      const rows = card.querySelectorAll('.serie-row');
      rows.forEach(row => {
        const checkBtn = row.querySelector('.btn-check-serie');
        if (checkBtn.getAttribute('data-checked') !== 'true') {
          if (peso > 0) row.querySelector('.serie-peso').value = peso;
          if (reps > 0) row.querySelector('.serie-reps').value = reps;
        }
      });
      
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '✓ Aplicado';
      btn.style.borderColor = 'var(--state-success)';
      btn.style.color = 'var(--state-success)';
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.style.borderColor = 'var(--accent-teal)';
        btn.style.color = 'var(--accent-teal)';
      }, 2000);
    });
  });

  
  document.querySelectorAll('.btn-info-ejercicio').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const instr = btn.getAttribute('data-instrucciones');
      const musculo = btn.getAttribute('data-musculo');
      
      const popover = document.createElement('div');
      popover.innerHTML = `<div style="font-size: 12px; line-height: 1.4; color: var(--text-primary);"><strong style="color: var(--accent-purple);">Técnica:</strong> ${instr}</div>${musculo ? `<div style="margin-top: 4px; font-size: 10px; color: var(--text-secondary);">Secundarios: ${musculo}</div>` : ''}`;
      popover.style.position = 'absolute';
      popover.style.top = '100%';
      popover.style.left = '0';
      popover.style.width = '250px';
      popover.style.background = 'var(--surface-2)';
      popover.style.padding = '14px';
      popover.style.borderRadius = '14px';
      popover.style.border = '1px solid var(--accent-purple)';
      popover.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
      popover.style.zIndex = '30';
      
      document.querySelectorAll('.info-popover').forEach(p => p.remove());
      popover.className = 'info-popover';
      
      const container = btn.parentElement;
      container.style.position = 'relative';
      container.appendChild(popover);
      
      setTimeout(() => popover.remove(), 6000); // auto close after 6s
    });
  });

  document.querySelectorAll('.btn-ver-progreso').forEach(btn => {
    btn.addEventListener('click', () => {
      const nombre = btn.getAttribute('data-ejnombre');
      const containerId = 'progreso-container-' + nombre.replace(/\s+/g, '');
      const container = document.getElementById(containerId);
      if (container.style.display === 'none') {
        const hist = currentHistorial[nombre];
        container.innerHTML = renderEjercicioDetalle(nombre, hist);
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });
  });

  document.querySelectorAll('.btn-plate-calc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.serie-row');
      const pesoInput = row.querySelector('.serie-peso');
      const peso = parseFloat(pesoInput.value) || 0;
      
      const discos = calcularDiscos(peso);
      const html = renderPlateCalculatorPopover(discos, 20);
      
      const popover = document.createElement('div');
      popover.innerHTML = html;
      popover.style.position = 'absolute';
      popover.style.bottom = '110%';
      popover.style.right = '0';
      popover.style.background = 'var(--surface-2)';
      popover.style.padding = '10px';
      popover.style.borderRadius = '12px';
      popover.style.border = '1px solid var(--surface-border)';
      popover.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
      popover.style.zIndex = '20';
      
      document.querySelectorAll('.plate-popover').forEach(p => p.remove());
      
      popover.className = 'plate-popover';
      e.target.parentElement.appendChild(popover);
      
      setTimeout(() => popover.remove(), 4000);
    });
  });

  document.querySelectorAll('.btn-check-serie').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const isChecked = btn.getAttribute('data-checked') === 'true';
      if (isChecked) {
        btn.setAttribute('data-checked', 'false');
        btn.style.background = 'var(--surface-2)';
        btn.style.color = 'var(--surface-border)';
        btn.style.borderColor = 'var(--surface-border)';
      } else {
        btn.setAttribute('data-checked', 'true');
        btn.style.background = 'var(--state-success)';
        btn.style.color = '#000';
        btn.style.borderColor = 'var(--state-success)';
        
        startRestTimer(60);
        
        // Live PR Check
        const row = btn.closest('.serie-row');
        const ejContainer = row.closest('.card');
        const ejNombre = ejContainer.querySelector('h3').innerText;
        const pesoInput = row.querySelector('.serie-peso');
        const repsInput = row.querySelector('.serie-reps');
        
        const pesoVal = parseFloat(pesoInput.value) || 0;
        const repsVal = parseFloat(repsInput.value) || 0;
        
        const pr = currentPRs[ejNombre.toLowerCase().trim()];
        if (pr) {
          let isPR = false;
          if (pesoVal > pr.pesoMax) isPR = true;
          else if (pesoVal === 0 && pr.pesoMax === 0 && repsVal > pr.repsMax) isPR = true;
          
          if (isPR) {
            const badge = document.createElement('div');
            badge.innerHTML = `${trophySvgSm}Nuevo PR`;
            badge.style.position = 'absolute';
            badge.style.top = '-16px';
            badge.style.right = '40px';
            badge.style.background = 'var(--accent-purple)';
            badge.style.color = '#000';
            badge.style.fontSize = '10px';
            badge.style.fontWeight = 'bold';
            badge.style.padding = '3px 8px';
            badge.style.borderRadius = '10px';
            badge.style.display = 'flex';
            badge.style.alignItems = 'center';
            badge.style.zIndex = '10';
            
            row.appendChild(badge);
            
            pr.pesoMax = Math.max(pr.pesoMax, pesoVal);
            if (pesoVal === 0) pr.repsMax = Math.max(pr.repsMax, repsVal);
          }
        }
      }
    });
  });

    const openExercisePicker = () => {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay open';
      overlay.style.zIndex = '6000';
      overlay.innerHTML = `
        <div class="modal-content" style="max-height: 80vh; display: flex; flex-direction: column; padding: 20px;">
          <div class="flex-between" style="margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.3px;">Añadir Ejercicio</h3>
            <button id="close-picker" style="background: transparent; border: none; color: var(--text-disabled); font-size: 24px; cursor: pointer;">&times;</button>
          </div>
          <input type="text" id="picker-search" placeholder="Buscar ejercicio (ej. Sentadilla)" style="width: 100%; padding: 13px 16px; border-radius: 14px; border: 1px solid var(--surface-border); background: var(--surface-2); color: var(--text-primary); margin-bottom: 16px; outline: none; box-sizing: border-box; font-size: 15px;">
          <div id="picker-results" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
      `;
      // For desktop frame compatibility, append to #view-root > div if available, otherwise body
      const rootDiv = document.querySelector('#view-root > div') || document.body;
      rootDiv.appendChild(overlay);

      const close = (val) => {
        overlay.remove();
        resolve(val);
      };

      document.getElementById('close-picker').onclick = () => close(null);

      const searchInput = document.getElementById('picker-search');
      const resultsContainer = document.getElementById('picker-results');
      
      const allEjercicios = Object.keys(CATALOGO_EJERCICIOS).map(k => ({
        nombre: k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        musculo: CATALOGO_EJERCICIOS[k].grupoMuscular
      }));

      const renderResults = (query) => {
        const q = query.toLowerCase().trim();
        const matches = q ? allEjercicios.filter(e => e.nombre.toLowerCase().includes(q)) : allEjercicios.slice(0, 20);
        
        if (matches.length === 0 && q) {
          resultsContainer.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); padding: 20px 0; font-size: 14px;">
              No encontrado en el catálogo. <br><br>
              <button id="btn-custom-ej" class="tappable" style="background: var(--accent-purple); color: #000; border: none; padding: 10px 18px; border-radius: 12px; cursor: pointer; font-weight: 700; margin-top: 12px;">Añadir "${q}" de todas formas</button>
            </div>
          `;
          const btnCustom = document.getElementById('btn-custom-ej');
          if (btnCustom) btnCustom.onclick = () => close(q);
        } else {
          resultsContainer.innerHTML = matches.map(e => `
            <div class="picker-item tappable" data-nombre="${e.nombre}" style="padding: 13px 16px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 600; font-size: 15px;">${e.nombre}</span>
              <span style="font-size: 11px; color: var(--accent-teal); text-transform: uppercase; border: 1px solid var(--accent-teal); padding: 2px 6px; border-radius: 4px;">${e.musculo}</span>
            </div>
          `).join('');
          
          resultsContainer.querySelectorAll('.picker-item').forEach(item => {
            item.onclick = () => close(item.getAttribute('data-nombre'));
          });
        }
      };

      searchInput.oninput = (e) => renderResults(e.target.value);
      renderResults(''); // initial render
      
      setTimeout(() => searchInput.focus(), 100);
    });
  };

        const btnAddLive = document.getElementById('btn-add-ejercicio-live');
  if (btnAddLive) {
    btnAddLive.addEventListener('click', async () => {
      try {
        const nom = await openExercisePicker();
        if (!nom || !nom.trim()) return;
        
        const bloques = document.querySelectorAll('.ejercicio-sesion-block');
        bloques.forEach((b, i) => {
          if (!rutina.ejercicios[i]) return;
          const seriesRows = b.querySelectorAll('.serie-row');
          rutina.ejercicios[i].series = [];
          seriesRows.forEach(row => {
            rutina.ejercicios[i].series.push({
               tipo: row.querySelector('.serie-tipo') ? row.querySelector('.serie-tipo').value : 'normal',
               reps: row.querySelector('.serie-reps') ? row.querySelector('.serie-reps').value : '',
               peso: row.querySelector('.serie-peso') ? row.querySelector('.serie-peso').value : '',
               rpe: row.querySelector('.serie-rpe') ? row.querySelector('.serie-rpe').value : null,
               checked: row.querySelector('.btn-check-serie') ? (row.querySelector('.btn-check-serie').getAttribute('data-checked') === 'true') : false
            });
          });
        });
        
        rutina.ejercicios.push({ nombre: nom.trim(), series: [{reps: '', peso: ''}] });
        
        const subContent = document.getElementById('entrenamiento-sub-content');
        if (!subContent) throw new Error("subContent no existe");
        
        const newHtml = await renderRutinaSession(rutina);
        subContent.innerHTML = newHtml;
        initRutinaSessionListeners(rutina, onSuccess, signal);
      } catch (err) {
        document.getElementById('entrenamiento-sub-content').innerHTML = "<div style='color:red; padding: 20px;'><h1>ERROR!</h1><p>" + err.message + "</p><pre>" + err.stack + "</pre></div>";
      }
    });// Auto-apertura si es Entrenamiento Libre y está vacío
    if (rutina.nombre === 'Entrenamiento Libre' && rutina.ejercicios.length === 0) {
      setTimeout(() => {
        btnAddLive.click();
      }, 50);
    }
  }

  const btnFinalizar = document.getElementById('btn-finalizar-sesion');
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', async () => {
      const duracionMin = Math.max(1, Math.floor((new Date() - startTime) / 60000));
      
      const ejerciciosLog = [];
      const bloques = document.querySelectorAll('.ejercicio-sesion-block');
      
      bloques.forEach(b => {
        const nombre = b.getAttribute('data-ej-nombre');
        const seriesRows = b.querySelectorAll('.serie-row');
        const seriesCompletadas = [];
        
        seriesRows.forEach(row => {
          const btn = row.querySelector('.btn-check-serie');
          if (btn.getAttribute('data-checked') === 'true') {
            const tipo = row.querySelector('.serie-tipo').value;
            const reps = row.querySelector('.serie-reps').value;
            const peso = row.querySelector('.serie-peso').value;
            const rpe = row.querySelector('.serie-rpe').value ? parseInt(row.querySelector('.serie-rpe').value) : null;
            seriesCompletadas.push({ tipo, reps, peso, rpe });
          }
        });
        
        if (seriesCompletadas.length > 0) {
          ejerciciosLog.push({ nombre, series: seriesCompletadas });
        }
      });
      
      if (ejerciciosLog.length === 0) {
        const confirmed = await ConfirmDialog('¿Terminar sesión vacía?', 'No has completado ninguna serie.');
        if (!confirmed) {
          return;
        }
      }
      
      cleanupSessionTimer();
      await db.registrarSesion({
        rutinaId: rutina.id,
        nombreRutina: rutina.nombre,
        duracionMin,
        completado: true,
        ejercicios: ejerciciosLog
      });
      
      if (onSuccess) onSuccess();
    });
  }
}

export function cleanupSessionTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (restTimerInterval) {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
  }
  const floatEl = document.getElementById('floating-rest-timer');
  if (floatEl) floatEl.remove();
}