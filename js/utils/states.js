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
//
// Rediseño: la caja punteada + ícono genérico de "info" se reemplaza por
// .vg-empty (components.css) — el mismo patrón de texto centrado sin caja
// que ya usaba Finanzas en su propio .fin-empty, ahora generalizado para
// que Análisis/Anotaciones/Hábitos (los ~13 llamadores de este helper)
// dejen de verse como "recuadro de error vacío" genérico.
export function EmptyState(title, subtitle = '') {
  return `
    <div class="vg-empty">
      <h3>${title}</h3>
      ${subtitle ? `<p class="vg-desc">${subtitle}</p>` : ''}
    </div>
  `;
}

// Antes de repintar la vista activa por un evento que no vino de una
// acción del usuario (ej. sync.js aplicando un cambio llegado de otro
// dispositivo -- ver 'budget-updated' en core/sync.js), hay que evitar
// pisar un modal que el usuario tiene abierto en ese momento: un remontaje
// completo de la vista (patrón `root.innerHTML = await render()`, usado
// por la mayoría de las vistas para su propio refresh() local) se lo
// llevaría puesto junto con lo que sea que estuviera escribiendo sin
// guardar todavía.
export function hayModalAbierto() {
  return !!document.querySelector('.modal-overlay.open');
}

export function Toast(message, type = 'info', duration = 2500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  let bgColor = 'var(--surface-2)';
  let color = 'var(--text-primary)';
  if (type === 'success') { bgColor = 'rgba(34, 197, 94, 0.15)'; color = 'var(--state-success)'; }
  if (type === 'error') { bgColor = 'rgba(239, 68, 68, 0.15)'; color = 'var(--state-high)'; }
  if (type === 'info') { bgColor = 'rgba(59, 130, 246, 0.15)'; color = 'var(--state-info)'; }
  if (type === 'pr') { bgColor = 'color-mix(in srgb, var(--accent-purple) 15%, transparent)'; color = 'var(--accent-purple)'; }

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

  setTimeout(dismiss, duration);
}

// Aviso con una acción ("Sesión eliminada · Deshacer"). Reutilizable: va
// al mismo #toast-container (encima de la barra inferior y a la derecha
// del riel), MK III (recto, sin sombra) y con el acento que pida cada
// módulo. Uno a la vez: uno nuevo cierra el anterior. El tiempo se pausa
// mientras el foco está adentro, así se alcanza con teclado. Devuelve
// { cerrar } por si el llamador necesita quitarlo antes.
let toastAccionActual = null;
export function ToastAccion(mensaje, { accion, alAccion, duracion = 6000, color = 'var(--cy)' } = {}) {
  const container = document.getElementById('toast-container');
  if (!container) return { cerrar() {} };
  if (toastAccionActual) toastAccionActual.cerrar();

  const toast = document.createElement('div');
  toast.className = 'toast-accion';
  toast.style.cssText = `
    background: var(--surface-1);
    border: 1px solid var(--surface-border);
    border-left: 3px solid ${color};
    color: var(--text-primary);
    padding: 4px 6px 4px 14px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  `;
  toast.innerHTML = `<span class="toast-accion-texto"></span>${accion ? `<button type="button" class="toast-accion-btn" style="background: transparent; border: none; color: ${color}; font: inherit; font-weight: 700; min-height: 44px; padding: 0 10px; cursor: pointer;"></button>` : ''}`;
  toast.querySelector('.toast-accion-texto').textContent = mensaje;
  const btn = toast.querySelector('.toast-accion-btn');
  if (btn) btn.textContent = accion;
  container.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });

  let timer = null;
  let cerrado = false;
  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    clearTimeout(timer);
    if (toastAccionActual && toastAccionActual.toast === toast) toastAccionActual = null;
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  };
  const programar = () => { clearTimeout(timer); timer = setTimeout(cerrar, duracion); };
  toast.addEventListener('focusin', () => clearTimeout(timer));
  toast.addEventListener('focusout', () => { if (!cerrado) programar(); });
  if (btn) {
    btn.addEventListener('click', () => {
      cerrar();
      if (alAccion) alAccion();
    });
  }
  programar();
  toastAccionActual = { toast, cerrar };
  return { cerrar };
}

// FIX: unificado a ConfirmDialog(title, message) -> Promise<boolean>.
// Antes había 3 firmas incompatibles usadas en distintos archivos
// (objeto {title,message,onConfirm} en states.js, (msg, callback) en backup.js,
// y await ConfirmDialog(title, msg) en finanzas.js). Se estandariza a esta última,
// que es el patrón dominante, y se ajusta backup.js para que coincida.
//
// Patrón obligatorio para diálogos destructivos (ver migración en habitos.js,
// finanzas.js, analisis.js, task-form.js, rutinas-lista.js, lock.js): el
// título nombra el objeto ("Eliminar hábito", no "Confirmar"), el cuerpo
// nombra la consecuencia con datos reales cuando se puede calcular, y el
// botón de acción lleva el verbo en vez de un genérico "Confirmar". `verb`
// y `danger` son opcionales y con default que reproduce el comportamiento
// de antes (botón rojo, texto "Confirmar"), así que los call sites que
// todavía no se migraron siguen funcionando igual.
export function ConfirmDialog(title = 'Confirmar', message = '', { verb = 'Confirmar', danger = true } = {}) {
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

    // El verbo YA es el texto visible del botón, así que no hace falta
    // aria-label aparte (ver Tarea 2 del prompt de accesibilidad). Rojo
    // solo si la acción es realmente destructiva — el resto usa el acento
    // de marca, no el rojo de alerta.
    newOk.textContent = verb;
    newOk.style.background = danger ? 'var(--state-high)' : 'var(--accent-primary)';

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