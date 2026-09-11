// js/views/mas.js
// Hub de "Más": punto de entrada a las secciones que no tienen pestaña
// propia en el nav principal (Ritual, Planificador, Anotaciones) más
// Configuración — evita que la barra de navegación crezca a 8-9 items,
// que en mobile deja de ser usable (ver discusión de rediseño de nav).
import { escapeHtml } from '../utils/escape.js';

const SECCIONES = [
  {
    id: 'ritual',
    nombre: 'Ritual',
    desc: 'Tu check-in matutino: misión, energía y gratitud del día.',
    accent: 'var(--accent-ritual, var(--vi))',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
  },
  {
    id: 'planificador',
    nombre: 'Planificador',
    desc: 'Tu semana, día por día — qué toca hacer y cuándo.',
    accent: 'var(--accent-plan, var(--am))',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
  },
  {
    id: 'anotaciones',
    nombre: 'Anotaciones',
    desc: 'Notas rápidas organizadas por categoría.',
    accent: 'var(--accent-notas, var(--cy))',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"></path><path d="M14 4v6h6"></path></svg>`
  },
  {
    id: 'laboratorio',
    nombre: 'Laboratorio',
    desc: 'Gráficos y tendencias de todos tus módulos, todos juntos.',
    accent: 'var(--cy)',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v6L4 20a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L15 8V2"></path><line x1="9" y1="2" x2="15" y2="2"></line><line x1="8" y1="16" x2="16" y2="16"></line></svg>`
  },
  {
    id: 'configuracion',
    nombre: 'Configuración',
    desc: 'Perfil, seguridad, respaldos y preferencias de la app.',
    accent: 'var(--text-secondary)',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
  }
];

function tarjeta(s) {
  return `
    <div class="card list-row mas-ir tappable" data-id="${s.id}"
      style="padding: 16px 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 14px; cursor: pointer;">
      <div class="icon-chip" style="width: 42px; height: 42px; background: color-mix(in srgb, ${s.accent} 15%, transparent); color: ${s.accent}; flex-shrink: 0;">
        ${s.icon}
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${escapeHtml(s.nombre)}</div>
        <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(s.desc)}</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" stroke-width="2" style="flex-shrink: 0;"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>`;
}

export async function render() {
  return `
    <div style="padding: 20px 20px 110px 20px; font-family: var(--font-body);">
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 30px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.5px;">Más</h1>
        <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Otras secciones de tu día a día.</div>
      </div>
      ${SECCIONES.map(tarjeta).join('')}
    </div>`;
}

export function mountListeners() {
  document.querySelectorAll('.mas-ir').forEach(el => {
    el.addEventListener('click', () => {
      window.appRouter.navigate(el.getAttribute('data-id'));
    });
  });
}
