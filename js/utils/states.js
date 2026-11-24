import { oIcono, msDeToken } from '../components/orbita.js';
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
// Órbita: las vistas migradas usan oVacio() (components/orbita.js); este
// queda para las vistas MK III hasta la limpieza final.
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

// Aviso (Órbita, Fase 4): píldora de css/orbita.css sobre el dock. Cada
// tipo lleva su ícono además del color (nunca solo color): éxito ✓,
// error y advertencia ⚠ (rojo solo para el error), info ⓘ y récord ★.
const TIPOS_TOAST = {
  success: { clase: 'o-toast--ok', icono: 'check' },
  error: { clase: 'o-toast--alerta', icono: 'alerta' },
  warning: { clase: 'o-toast--aviso', icono: 'alerta' },
  info: { clase: 'o-toast--info', icono: 'info' },
  pr: { clase: 'o-toast--logro', icono: 'estrella' }
};

function salirToast(toast) {
  toast.classList.add('o-toast--saliendo');
  setTimeout(() => toast.remove(), msDeToken('--o-dur-2'));
}

export function Toast(message, type = 'info', duration = 2500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const tipo = TIPOS_TOAST[type] || TIPOS_TOAST.info;
  const toast = document.createElement('div');
  toast.className = `o-toast ${tipo.clase}`;
  toast.innerHTML = `${oIcono(tipo.icono, 'o-toast-ico')}<span class="o-toast-texto"></span>`;
  toast.querySelector('.o-toast-texto').textContent = message;
  container.appendChild(toast);

  // Deslizar a la derecha lo descarta (el arrastre va inline; la salida, por clase).
  let startX = 0;
  toast.addEventListener('touchstart', e => startX = e.touches[0].clientX, {passive: true});
  toast.addEventListener('touchmove', e => {
    const diffX = e.touches[0].clientX - startX;
    if (diffX > 0) toast.style.transform = `translateX(${diffX}px)`;
  }, {passive: true});
  toast.addEventListener('touchend', e => {
    const diffX = e.changedTouches[0].clientX - startX;
    toast.style.transform = '';
    if (diffX > 50) dismiss();
  });

  let cerrado = false;
  const dismiss = () => {
    if (cerrado) return;
    cerrado = true;
    salirToast(toast);
  };

  setTimeout(dismiss, duration);
}

// Aviso con una acción ("Sesión eliminada · Deshacer"). Reutilizable: va
// al mismo #toast-container (encima del dock y a la derecha del riel).
// Uno a la vez: uno nuevo cierra el anterior. El tiempo se pausa mientras
// el foco está adentro, así se alcanza con teclado. Devuelve { cerrar }
// por si el llamador necesita quitarlo antes.
let toastAccionActual = null;
export function ToastAccion(mensaje, { accion, alAccion, duracion = 6000 } = {}) {
  const container = document.getElementById('toast-container');
  if (!container) return { cerrar() {} };
  if (toastAccionActual) toastAccionActual.cerrar();

  const toast = document.createElement('div');
  toast.className = `o-toast o-toast--info toast-accion${accion ? ' o-toast--accion' : ''}`;
  toast.innerHTML = `${oIcono('info', 'o-toast-ico')}<span class="o-toast-texto toast-accion-texto"></span>${accion ? '<button type="button" class="o-btn o-btn--fantasma toast-accion-btn"></button>' : ''}`;
  toast.querySelector('.toast-accion-texto').textContent = mensaje;
  const btn = toast.querySelector('.toast-accion-btn');
  if (btn) btn.textContent = accion;
  container.appendChild(toast);

  let timer = null;
  let cerrado = false;
  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    clearTimeout(timer);
    if (toastAccionActual && toastAccionActual.toast === toast) toastAccionActual = null;
    salirToast(toast);
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
// Órbita (Fase 4): el diálogo es .o-dialogo (css/orbita.css).
export function ConfirmDialog(title = 'Confirmar', message = '', { verb = 'Confirmar', danger = true } = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('global-confirm-modal');
    if (!modal) {
      console.warn('[Vanguard OS] #global-confirm-modal no está presente en el DOM.');
      resolve(false);
      return;
    }
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    // El ícono de advertencia acompaña al rojo: solo en acciones destructivas.
    const icono = document.getElementById('confirm-icon');
    if (icono) icono.hidden = !danger;

    const btnOk = document.getElementById('confirm-ok');
    const btnCancel = document.getElementById('confirm-cancel');

    // Clonar para limpiar listeners previos de aperturas anteriores del modal
    const newOk = btnOk.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnOk.parentNode.replaceChild(newOk, btnOk);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    // El verbo YA es el texto visible del botón, así que no hace falta
    // aria-label aparte (ver Tarea 2 del prompt de accesibilidad). Rojo
    // solo si la acción es realmente destructiva — el resto usa el botón
    // principal neutro, no el rojo de alerta.
    newOk.textContent = verb;
    newOk.classList.toggle('o-btn--alerta', danger);
    newOk.classList.toggle('o-btn--primario', !danger);

    const closeModal = (result) => {
      modal.classList.add('o-saliendo');
      setTimeout(() => {
        modal.classList.remove('open', 'o-saliendo');
        modal.style.display = 'none';
        resolve(result);
      }, msDeToken('--o-dur-2'));
    };

    newCancel.addEventListener('click', () => closeModal(false));
    newOk.addEventListener('click', () => closeModal(true));

    modal.classList.remove('o-saliendo');
    modal.classList.add('open');
    modal.style.display = 'flex';
    newCancel.focus({ preventScroll: true });
  });
}
