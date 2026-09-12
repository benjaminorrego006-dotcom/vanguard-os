// Un <input> dentro de un <form> dispara un evento "submit" nativo del
// navegador al presionar Enter/Ir/Listo en CUALQUIER teclado móvil — a
// diferencia de un listener de keydown, que depende de qué evento de tecla
// mande ese teclado en particular para su tecla de acción (varía entre
// iOS/Android y con enterkeyhint). Ver commit 4396aa1: un keydown +
// enterkeyhint="done" no disparaba consistentemente en todas las
// plataformas. Toda captura rápida de texto libre (gasto rápido de
// Finanzas, "Anota algo" de Inicio) comparte este mismo wiring en vez de
// reimplementar su propio listener.
export function bindQuickCaptureForm(form, onSubmit) {
  console.log('[DEBUG-TEMP] bindQuickCaptureForm called, form=', form ? form.id : null);
  if (!form) return;
  form.addEventListener('submit', (e) => {
    console.log('[DEBUG-TEMP] submit event received on form', form.id);
    e.preventDefault();
    onSubmit();
  });
}
