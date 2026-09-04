// js/core/history.js
// Botón "atrás" para los modales .modal-overlay. Sin esto, el navegador
// no tiene ninguna entrada de historial que consumir mientras un modal
// está abierto, así que "atrás" sale directo de la vista actual (o de la
// app) en vez de cerrar el modal encima.
//
// Genérico a propósito: todos los modales de la app (el de confirmación
// global de index.html y los de cada módulo de negocio — Gasto, Ingreso,
// Metas, etc.) comparten la misma convención de abrir/cerrar (agregar o
// sacar la clase "open" de un <div class="modal-overlay">). Un solo
// MutationObserver sobre esa clase cubre a todos sin tener que tocar cada
// archivo de formulario por separado. El lock screen (#lock-overlay) NO
// usa esta clase, así que queda afuera sin necesidad de un caso especial
// — el botón atrás nunca debe poder saltárselo.
const trackedOpen = new Map(); // id del modal -> elemento, mientras está abierto con una entrada de historial pusheada

function closeModalElement(el) {
  el.classList.remove('open');
  el.style.display = 'none';
}

export function initModalHistory() {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      const el = m.target;
      if (!(el instanceof Element) || !el.id || !el.classList.contains('modal-overlay')) continue;

      const isOpen = el.classList.contains('open');
      const wasTracked = trackedOpen.has(el.id);

      if (isOpen && !wasTracked) {
        trackedOpen.set(el.id, el);
        history.pushState({ modalId: el.id }, '');
      } else if (!isOpen && wasTracked) {
        trackedOpen.delete(el.id);
        // El modal se cerró por su propio botón (no por "atrás"): si su
        // entrada sigue siendo la actual, la sacamos para no dejar un
        // "atrás" fantasma que no cierre nada la próxima vez.
        if (history.state && history.state.modalId === el.id) history.back();
      }
    }
  });

  observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });

  window.addEventListener('popstate', (e) => {
    // Cualquier modal trackeado cuyo id ya no sea el del estado actual es
    // porque "atrás" lo dejó atrás — hay que cerrarlo visualmente.
    for (const [id, el] of Array.from(trackedOpen.entries())) {
      if (!e.state || e.state.modalId !== id) {
        trackedOpen.delete(id);
        closeModalElement(el);
      }
    }
  });
}

// Llamado por el router antes de tirar el HTML de la vista saliente: si
// esa vista tenía un modal abierto, su nodo va a desaparecer con el
// innerHTML de la vista nueva sin pasar por su botón de cierre — hay que
// destrackearlo y soltar su entrada de historial.
export function forgetOpenModals() {
  for (const [id] of Array.from(trackedOpen.entries())) {
    trackedOpen.delete(id);
    if (history.state && history.state.modalId === id) history.back();
  }
}
