// js/components/pin-security.js
// Bloque de "Seguridad" (activar/cambiar/desactivar PIN) — extraído de
// finanzas.js (donde vivía junto a Ajustes de Finanzas, sin relación real
// con el módulo) para que Configuración sea el único lugar que lo monta.
import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { exportAllData } from '../utils/backup.js';
import { mountSetPinFlow, requestPinVerification } from '../core/lock.js';

export function renderPinSecuritySection() {
  if (db.isPinEnabled()) {
    return `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 13px; color: var(--state-success); font-weight: 600;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--state-success); flex-shrink: 0;"></span>
        PIN activado
      </div>
      <div style="display: flex; gap: 12px;">
        <button id="btn-change-pin" type="button" class="tappable" style="flex: 1; padding: 12px; border-radius: 12px; background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border); font-weight: 600; cursor: pointer;">Cambiar PIN</button>
        <button id="btn-disable-pin" type="button" class="tappable" style="flex: 1; padding: 12px; border-radius: 12px; background: transparent; color: var(--state-high); border: 1px solid var(--state-high); font-weight: 600; cursor: pointer;">Desactivar</button>
      </div>
    `;
  }
  return `<button id="btn-enable-pin" type="button" class="btn-primary tappable" style="background: var(--accent-primary); color: #000;">Activar PIN</button>`;
}

// containerId: el elemento cuyo innerHTML se reemplaza al refrescar (activar/
// cambiar/desactivar todos terminan re-pintando el bloque para reflejar el
// nuevo estado, igual que hacía finanzas.js).
export function attachPinSecurityListeners(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const refresh = () => {
    container.innerHTML = renderPinSecuritySection();
    attachPinSecurityListeners(containerId);
  };

  const btnEnablePin = document.getElementById('btn-enable-pin');
  if (btnEnablePin) btnEnablePin.addEventListener('click', () => {
    // Respaldo obligatorio antes de activar el PIN: es la única red de
    // seguridad si después se olvida (ver mountSetPinFlow / lock.js).
    exportAllData();
    mountSetPinFlow(refresh);
  });

  const btnChangePin = document.getElementById('btn-change-pin');
  if (btnChangePin) btnChangePin.addEventListener('click', () => {
    requestPinVerification({
      title: 'Cambiar PIN',
      onVerified: () => mountSetPinFlow(refresh)
    });
  });

  const btnDisablePin = document.getElementById('btn-disable-pin');
  if (btnDisablePin) btnDisablePin.addEventListener('click', () => {
    requestPinVerification({
      title: 'Desactivar PIN',
      onVerified: () => {
        db.disablePin();
        Toast('PIN desactivado', 'success');
        refresh();
      }
    });
  });
}
