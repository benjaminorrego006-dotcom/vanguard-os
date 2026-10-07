// js/core/vista-activa.js
// Id de la navegación en curso, compartido entre el router (app.js) y las
// vistas, sin que las vistas importen app.js. Cada navigate() llama a
// marcarNavegacion(); una vista toma su guardia al montarse y, antes de
// escribir en el DOM después de un await, comprueba que siga vigente.
//
// El caso que motivó esto: con una sub-vista abierta (Historial de
// sesiones, Cuerpo, el detalle de un hábito), tocar otra pestaña de la
// barra dispara primero el popstate de la vista (vuelve a su principal y
// se repinta de forma asíncrona) y después el hashchange del router. Sin la
// guardia, ese repintado tardío pintaba la vista vieja encima de la nueva.
let navActual = 0;
let vistaActual = null;

export function marcarNavegacion(viewId) {
  navActual += 1;
  vistaActual = viewId;
  return navActual;
}

// Devuelve una función que dice si la navegación con la que se montó la
// vista `viewId` sigue siendo la actual.
export function guardiaVista(viewId) {
  const id = navActual;
  return () => id === navActual && vistaActual === viewId;
}
