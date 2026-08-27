export function SkeletonCard(height = '100px') {
  return `
    <div style="
      height: ${height}; 
      background: var(--surface-2); 
      border-radius: var(--radius-md, 12px); 
      margin-bottom: 16px;
      animation: pulseSkeleton 1.2s ease-in-out infinite alternate;
    "></div>
    <style>
      @keyframes pulseSkeleton {
        0% { opacity: 0.5; }
        100% { opacity: 0.8; }
      }
    </style>
  `;
}

// FIX: la firma anterior era EmptyState({ icon, title, actionLabel, onActionId })
// pero en finanzas.js siempre se llama como EmptyState("titulo", "subtitulo"),
// lo que hacía que se renderizara "undefined" en vez del mensaje.
// Se simplifica a (title, subtitle) para que coincida con el uso real,
// manteniendo la prohibición de emojis (icono SVG opcional en vez de emoji).
export function EmptyState(title, subtitle = '') {
  return `
    <div class="card" style="padding: 32px 20px; text-align: center; background-color: var(--surface-1); border-radius: 16px; margin-bottom: 24px; border: 1px dashed var(--surface-border);">
      <div style="margin-bottom: 12px; display: flex; justify-content: center;">
        <svg width="28" height="28" fill="none" stroke="var(--text-disabled)" stroke-width="1.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--text-secondary);">${title}</h3>
      ${subtitle ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: var(--text-disabled);">${subtitle}</p>` : ''}
    </div>
  `;
}

export function Toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  let bgColor = 'var(--surface-2)';
  let color = 'var(--text-primary)';
  if (type === 'success') { bgColor = 'rgba(102, 187, 106, 0.15)'; color = 'var(--state-success)'; }
  if (type === 'error') { bgColor = 'rgba(239, 83, 80, 0.15)'; color = 'var(--state-high)'; }
  if (type === 'info') { bgColor = 'rgba(41, 182, 246, 0.15)'; color = 'var(--state-info)'; }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: var(--surface-1);
    border-left: 4px solid ${color};
    color: var(--text-primary);
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: pre-line;
  `;

  toast.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color}"></span> ${message}`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  let startX = 0;
  toast.addEventListener('touchstart', e => startX = e.touches[0].clientX, {passive: true});
  toast.addEventListener('touchmove', e => {
    const diffX = e.touches[0].clientX - startX;
    if (diffX > 0) {
      toast.style.transform = `translateX(${diffX}px)`;
      toast.style.opacity = 1 - (diffX / 200);
    }
  }, {passive: true});
  toast.addEventListener('touchend', e => {
    const diffX = e.changedTouches[0].clientX - startX;
    if (diffX > 50) dismiss();
    else { toast.style.transform = 'translateX(0)'; toast.style.opacity = '1'; }
  });

  const dismiss = () => {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  };

  setTimeout(dismiss, 2500);
}

// FIX: unificado a ConfirmDialog(title, message) -> Promise<boolean>.
// Antes había 3 firmas incompatibles usadas en distintos archivos
// (objeto {title,message,onConfirm} en states.js, (msg, callback) en backup.js,
// y await ConfirmDialog(title, msg) en finanzas.js). Se estandariza a esta última,
// que es el patrón dominante, y se ajusta backup.js para que coincida.
export function ConfirmDialog(title = 'Confirmar', message = '') {
  return new Promise((resolve) => {
    const modal = document.getElementById('global-confirm-modal');
    if (!modal) {
      console.warn('[Vanguard OS] #global-confirm-modal no está presente en el DOM.');
      resolve(false);
      return;
    }
    const content = modal.querySelector('.modal-content');
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;

    const btnOk = document.getElementById('confirm-ok');
    const btnCancel = document.getElementById('confirm-cancel');

    // Clonar para limpiar listeners previos de aperturas anteriores del modal
    const newOk = btnOk.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnOk.parentNode.replaceChild(newOk, btnOk);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    const closeModal = (result) => {
      content.style.opacity = '0';
      content.style.transform = 'scale(0.95)';
      setTimeout(() => {
        modal.classList.remove('open');
        modal.style.display = 'none';
        resolve(result);
      }, 220);
    };

    newCancel.addEventListener('click', () => closeModal(false));
    newOk.addEventListener('click', () => closeModal(true));

    modal.classList.add('open');
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      content.style.opacity = '1';
      content.style.transform = 'scale(1)';
    });
  });
}