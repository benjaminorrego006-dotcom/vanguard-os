// Laboratorio completo (selector de módulo + pestañas, los 4 módulos) como
// vista propia dentro de "Más" — antes vivía entero en Inicio, lo que
// apilaba selector de módulo + selector de pestaña + gráfico + filas
// heroicas de módulo, todo en la misma pantalla. Inicio ahora solo muestra
// un gráfico destacado (ver dashboard.js) con un link "Ver todo" hacia acá;
// esta vista es la versión completa e interactiva, sin recortar.
import { renderLaboratorio, initLaboratorioListeners, cleanupLaboratorio, entrarLaboratorio } from '../components/laboratorio.js';

export async function render() {
  entrarLaboratorio(); // "Semana" por defecto al entrar (salvo un deep-link)
  return `
    <div style="padding: 20px 20px calc(110px + env(safe-area-inset-bottom)) 20px; font-family: var(--font-body);"><!-- la barra inferior flota a 16px + safe-area del borde -->
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 30px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.5px;">Laboratorio</h1>
        <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Gráficos y tendencias de tus módulos, todos juntos.</div>
      </div>
      <div id="lab-full-content">${await renderLaboratorio()}</div>
    </div>
  `;
}

export function mountListeners() {
  const refresh = async () => {
    const content = document.getElementById('lab-full-content');
    if (!content) return;
    content.innerHTML = await renderLaboratorio();
    initLaboratorioListeners(refresh);
  };
  initLaboratorioListeners(refresh);
}

export function cleanup() {
  cleanupLaboratorio();
}
