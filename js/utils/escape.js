// Escapado de texto libre antes de interpolarlo en innerHTML — sin esto, un
// título/nombre con "<" rompe el render, y como queda guardado en
// IndexedDB, la app queda rota en cada carga siguiente. También escapa la
// comilla simple a &#39; porque el mismo helper se usa para interpolar
// dentro de atributos (ej. data-nombre="${escapeHtml(nombre)}"), donde una
// comilla sin escapar cierra el atributo antes de tiempo.
export const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
