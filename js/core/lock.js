import { db } from './db.js';
import { renderNumericKeypad, initNumericKeypad } from '../components/NumericKeypad.js';
import { Toast, ConfirmDialog } from '../utils/states.js';

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
const PIN_LENGTH = 4;

let inactivityTimer = null;
let activityListenersAttached = false;

function dotsHtml(filled) {
  let html = '';
  for (let i = 0; i < PIN_LENGTH; i++) {
    html += `<div class="pin-dot" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--accent-primary); background: ${i < filled ? 'var(--accent-primary)' : 'transparent'}; transition: background 0.15s ease;"></div>`;
  }
  return html;
}

function renderOverlay(title, subtitle, { allowCancel = false, showForgot = true } = {}) {
  return `
    <div id="lock-overlay" style="position: fixed; inset: 0; z-index: 8000; background: var(--bg-base); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box;">
      ${allowCancel ? `<button id="btn-lock-cancel" style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>` : ''}
      <div style="font-size: 22px; font-weight: 800; letter-spacing: 1px; color: var(--text-primary); margin-bottom: 8px;">${title}</div>
      <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 28px;">${subtitle}</div>
      <div id="lock-dots" style="display: flex; gap: 14px; margin-bottom: 32px;">${dotsHtml(0)}</div>
      <div style="width: 100%; max-width: 280px;">
        ${renderNumericKeypad()}
      </div>
      ${showForgot ? `<button id="btn-forgot-pin" style="background: transparent; border: none; color: var(--text-disabled); font-size: 13px; cursor: pointer; margin-top: 4px;">¿Olvidaste tu PIN?</button>` : ''}
    </div>
    <style>
      @keyframes lockShake { 10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(4px); } 30%, 50%, 70% { transform: translateX(-8px); } 40%, 60% { transform: translateX(8px); } }
      #lock-dots.shake { animation: lockShake 0.5s; }
    </style>
  `;
}

// Overlay genérico de "pedile 4 dígitos al usuario". `onSubmit(pin)` decide
// si fue correcto (true/false). Si fue correcto, el overlay se cierra
// PRIMERO y recién después corre `onSuccess(pin)` — importante porque
// onSuccess suele montar el siguiente overlay (ver mountSetPinFlow), y
// mountPinPrompt rechaza abrir uno nuevo mientras el anterior sigue en el
// DOM. Si fue incorrecto, se muestra el shake + `errorMessage` y se limpia.
// Usado por el bloqueo de arranque y por "verificar PIN actual".
function mountPinPrompt({ title, subtitle, onSubmit, onSuccess, errorMessage = 'PIN incorrecto', allowCancel = false, onCancel = null, showForgot = true }) {
  if (document.getElementById('lock-overlay')) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderOverlay(title, subtitle, { allowCancel, showForgot });
  document.body.appendChild(wrapper.firstElementChild);
  document.body.appendChild(wrapper.querySelector('style'));

  const overlay = document.getElementById('lock-overlay');
  const dotsEl = document.getElementById('lock-dots');
  let entered = '';

  const refreshDots = () => { dotsEl.innerHTML = dotsHtml(entered.length); };

  const trySubmit = async () => {
    const pin = entered;
    const ok = await onSubmit(pin);
    if (ok) {
      overlay.remove();
      if (onSuccess) onSuccess(pin);
    } else {
      dotsEl.classList.add('shake');
      Toast(errorMessage, 'error', 1500);
      setTimeout(() => {
        entered = '';
        refreshDots();
        dotsEl.classList.remove('shake');
      }, 400);
    }
  };

  initNumericKeypad(
    overlay,
    (val) => {
      if (entered.length >= PIN_LENGTH) return;
      entered += (val === '00' ? '0' : val);
      if (entered.length > PIN_LENGTH) entered = entered.slice(0, PIN_LENGTH);
      refreshDots();
      if (entered.length === PIN_LENGTH) trySubmit();
    },
    () => { entered = entered.slice(0, -1); refreshDots(); },
    () => { entered = ''; refreshDots(); }
  );

  if (allowCancel) {
    overlay.querySelector('#btn-lock-cancel').addEventListener('click', () => {
      overlay.remove();
      if (onCancel) onCancel();
    });
  }

  if (showForgot) {
    overlay.querySelector('#btn-forgot-pin').addEventListener('click', async () => {
      const confirmed = await ConfirmDialog(
        'Olvidaste tu PIN',
        'No hay forma de recuperar el PIN: la única opción es borrar todos los datos de este dispositivo y restaurarlos desde tu último respaldo exportado. ¿Continuar?'
      );
      if (!confirmed) return;
      await db.wipeAllLocalData();
      location.reload();
    });
  }
}

export function mountLockScreen(onUnlock) {
  mountPinPrompt({
    title: 'VANGUARD',
    subtitle: 'Ingresa tu PIN',
    showForgot: true,
    onSubmit: (pin) => db.verifyPin(pin),
    onSuccess: () => { if (onUnlock) onUnlock(); }
  });
}

// Pide el PIN actual antes de una acción sensible (desactivarlo, cambiarlo).
// `onVerified` corre solo si el PIN es correcto; permite cancelar.
export function requestPinVerification({ title = 'Confirma tu PIN', onVerified, onCancel }) {
  mountPinPrompt({
    title,
    subtitle: 'Ingresa tu PIN actual',
    allowCancel: true,
    showForgot: true,
    onCancel,
    onSubmit: (pin) => db.verifyPin(pin),
    onSuccess: () => { if (onVerified) onVerified(); }
  });
}

// Flujo de 2 pasos para crear/cambiar el PIN: pedir uno nuevo, luego
// confirmarlo. Si no coinciden, se limpia y se vuelve a pedir la
// confirmación (el primer PIN se conserva en el closure).
export function mountSetPinFlow(onDone, onCancel) {
  const askFirst = () => {
    mountPinPrompt({
      title: 'Crea tu PIN',
      subtitle: 'Elegí 4 dígitos',
      allowCancel: true,
      showForgot: false,
      onCancel,
      onSubmit: () => true, // cualquier 4 dígitos sirve como propuesta inicial
      onSuccess: (firstPin) => askConfirm(firstPin)
    });
  };

  const askConfirm = (firstPin) => {
    mountPinPrompt({
      title: 'Confirma tu PIN',
      subtitle: 'Ingresalo de nuevo',
      allowCancel: true,
      showForgot: false,
      onCancel,
      errorMessage: 'Los PIN no coinciden, intentá de nuevo',
      onSubmit: (secondPin) => secondPin === firstPin,
      onSuccess: async () => {
        await db.setPin(firstPin);
        Toast('PIN activado', 'success');
        if (onDone) onDone();
      }
    });
  };

  askFirst();
}

export function isLocked() {
  return db.isPinEnabled() && !!document.getElementById('lock-overlay');
}

function relock() {
  if (!db.isPinEnabled()) return;
  if (document.getElementById('lock-overlay')) return;
  mountLockScreen(() => resetInactivityTimer());
}

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (!db.isPinEnabled()) return;
  inactivityTimer = setTimeout(relock, INACTIVITY_LIMIT_MS);
}

// Vigila actividad del usuario (toques, clicks, teclas) para volver a
// bloquear tras 5 minutos de inactividad, sin importar en qué vista esté.
export function startInactivityWatch() {
  if (activityListenersAttached) { resetInactivityTimer(); return; }
  activityListenersAttached = true;
  ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => resetInactivityTimer(), { passive: true });
  });
  resetInactivityTimer();
}
