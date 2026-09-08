// js/views/configuracion.js
// Centraliza lo que antes vivía disperso: Perfil y Nivel de entrenamiento
// (antes en Entreno, detrás de dos íconos en el header), y Regla de
// Asignación / Respaldos / Seguridad (antes en un modal de Finanzas sin
// relación real con ese módulo). "Borrar todos los datos" es nuevo — la
// función ya existía en db.js (wipeAllLocalData) pero ninguna vista la
// exponía.
import { db } from '../core/db.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { renderProfileForm, setupProfileForm, openProfileForm } from '../components/profile-form.js';
import { renderNivelOnboardingForm, setupNivelOnboardingForm, openNivelOnboardingForm } from '../components/nivel-onboarding-form.js';
import { renderPinSecuritySection, attachPinSecurityListeners } from '../components/pin-security.js';
import { exportAllData, importAllData, getDiasDesdeUltimoBackup } from '../utils/backup.js';

const NIVEL_LABELS = { 'menos-1': 'Menos de 1 año', '1-3': '1 a 3 años', 'mas-3': 'Más de 3 años' };

function seccion(titulo, subtitulo, contenidoHtml) {
  return `
    <div class="card" style="padding: 18px 20px; margin-bottom: 16px; border-radius: 18px;">
      <h3 style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">${escapeHtml(titulo)}</h3>
      ${subtitulo ? `<p style="font-size: 12.5px; color: var(--text-secondary); margin: 0 0 14px 0;">${subtitulo}</p>` : ''}
      ${contenidoHtml}
    </div>`;
}

const btnSecundario = (id, texto) => `<button id="${id}" type="button" class="btn-primary tappable" style="background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border);">${escapeHtml(texto)}</button>`;

export async function render() {
  const [profile, nivel, restTimerSecs, rule, diasDesdeBackup, estadoAlmacenamiento] = await Promise.all([
    db.getProfile(),
    db.getNivelEntrenamiento(),
    db.getRestTimerSecs(),
    db.getAllocationRule(),
    getDiasDesdeUltimoBackup(),
    db.getEstadoAlmacenamiento()
  ]);

  const perfilResumen = profile
    ? `${profile.pesoKg} kg · ${profile.estaturaCm} cm · ${profile.edad} años`
    : 'Todavía no completaste tu perfil.';
  const nivelResumen = nivel ? `Nivel declarado: ${NIVEL_LABELS[nivel.tiempoEntrenando] || nivel.tiempoEntrenando}` : 'Nivel de entrenamiento sin declarar.';

  const backupStatusHtml = (() => {
    let backupMsg, backupColor;
    if (diasDesdeBackup === null) {
      backupMsg = 'Nunca has exportado un respaldo';
      backupColor = 'var(--state-medium)';
    } else if (diasDesdeBackup > 14) {
      backupMsg = `Último respaldo hace ${diasDesdeBackup} días`;
      backupColor = 'var(--state-medium)';
    } else if (diasDesdeBackup === 0) {
      backupMsg = 'Último respaldo: hoy';
      backupColor = 'var(--text-secondary)';
    } else {
      backupMsg = `Último respaldo hace ${diasDesdeBackup} día${diasDesdeBackup === 1 ? '' : 's'}`;
      backupColor = 'var(--text-secondary)';
    }
    const persistida = estadoAlmacenamiento.persistencia ? estadoAlmacenamiento.persistencia.concedido : undefined;
    let persistMsg;
    if (persistida === true) {
      persistMsg = 'Almacenamiento persistente: concedido. El navegador no debería borrar tus datos por falta de espacio o inactividad.';
    } else if (persistida === false) {
      persistMsg = 'Almacenamiento persistente: no concedido. En iOS, si no abres la app por ~7 días, el sistema puede borrar tus datos — exporta respaldos seguido.';
    } else {
      persistMsg = 'Este navegador no soporta almacenamiento persistente. Exporta respaldos seguido para no perder tu progreso.';
    }
    return `
      <p style="color: ${backupColor}; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">${backupMsg}</p>
      <p style="color: var(--text-secondary); font-size: 12px; margin: 0 0 16px 0;">${persistMsg}</p>
    `;
  })();

  return `
    <div style="padding: 20px 20px 110px 20px; font-family: var(--font-body);">
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 30px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.5px;">Configuración</h1>
        <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">Perfil, seguridad, respaldos y preferencias.</div>
      </div>

      ${seccion('Perfil', escapeHtml(perfilResumen), btnSecundario('btn-cfg-perfil', 'Editar perfil'))}

      ${seccion('Entrenamiento', escapeHtml(nivelResumen), `
        ${btnSecundario('btn-cfg-nivel', 'Editar nivel declarado')}
        <div class="input-group" style="margin-top: 16px; margin-bottom: 0;">
          <label for="cfg-rest-timer">Timer de descanso entre series (segundos)</label>
          <div style="display: flex; gap: 10px;">
            <input type="number" inputmode="numeric" id="cfg-rest-timer" value="${restTimerSecs}" min="15" style="flex: 1; min-width: 0;">
            <button id="btn-cfg-rest-timer" type="button" class="btn-primary tappable" style="background: var(--accent-primary); color: #000; flex-shrink: 0; width: auto; padding: 0 18px;">Guardar</button>
          </div>
        </div>
      `)}

      ${seccion('Presupuesto', 'Regla de asignación mensual — los porcentajes deben sumar exactamente 100.', `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px;">
          <div class="input-group" style="margin-bottom: 0;">
            <label for="cfg-rule-needs">Necesidades %</label>
            <input type="number" inputmode="numeric" id="cfg-rule-needs" value="${Math.round(rule.needs * 100)}" min="0" max="100">
          </div>
          <div class="input-group" style="margin-bottom: 0;">
            <label for="cfg-rule-wants">Deseos %</label>
            <input type="number" inputmode="numeric" id="cfg-rule-wants" value="${Math.round(rule.wants * 100)}" min="0" max="100">
          </div>
          <div class="input-group" style="margin-bottom: 0;">
            <label for="cfg-rule-savings">Ahorro %</label>
            <input type="number" inputmode="numeric" id="cfg-rule-savings" value="${Math.round(rule.savings * 100)}" min="0" max="100">
          </div>
        </div>
        <button id="btn-cfg-rule-save" type="button" class="btn-primary tappable" style="background: var(--accent-primary); color: #000;">Guardar regla</button>
      `)}

      ${seccion('Seguridad', 'Bloquea la app con un PIN de 4 dígitos. Si lo olvidas, la única recuperación es borrar los datos del dispositivo y restaurarlos desde un respaldo — por eso exportamos uno automáticamente antes de activarlo.', `
        <div id="cfg-pin-container">${renderPinSecuritySection()}</div>
      `)}

      ${seccion('Respaldos', null, `
        ${backupStatusHtml}
        ${btnSecundario('btn-cfg-export', 'Exportar respaldo')}
        <div style="position: relative; margin-top: 12px;">
          <input type="file" id="cfg-file-import" accept=".json" style="position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%;">
          <button type="button" class="btn-primary tappable" style="background: var(--accent-primary); color: #000; pointer-events: none;">Restaurar respaldo</button>
        </div>
      `)}

      ${seccion('Datos', 'Elimina todo lo guardado en este dispositivo. Esta acción no se puede deshacer — exporta un respaldo antes si no estás seguro.', `
        <button id="btn-cfg-wipe" type="button" class="tappable" style="width: 100%; padding: 12px; background: transparent; border: 1px solid var(--state-high); color: var(--state-high); font-weight: 700; cursor: pointer;">Borrar todos los datos</button>
      `)}

      ${seccion('Acerca de', null, `
        <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
          <strong style="color: var(--text-primary);">Vanguard OS</strong> — tu sistema operativo personal.<br>
          Progressive Web App · datos 100% locales en este dispositivo.
        </div>
      `)}
    </div>
    ${renderProfileForm()}
    ${renderNivelOnboardingForm()}
  `;
}

export function mountListeners() {
  const refresh = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  setupProfileForm(refresh);
  setupNivelOnboardingForm(refresh);
  attachPinSecurityListeners('cfg-pin-container');

  document.getElementById('btn-cfg-perfil')?.addEventListener('click', () => openProfileForm());
  document.getElementById('btn-cfg-nivel')?.addEventListener('click', () => openNivelOnboardingForm());

  document.getElementById('btn-cfg-rest-timer')?.addEventListener('click', async () => {
    const val = parseInt(document.getElementById('cfg-rest-timer').value, 10);
    await db.setRestTimerSecs(val);
    Toast('Timer de descanso actualizado', 'success');
  });

  document.getElementById('btn-cfg-rule-save')?.addEventListener('click', async () => {
    const n = parseFloat(document.getElementById('cfg-rule-needs').value) || 0;
    const w = parseFloat(document.getElementById('cfg-rule-wants').value) || 0;
    const s = parseFloat(document.getElementById('cfg-rule-savings').value) || 0;
    if (n + w + s !== 100) {
      Toast('Los porcentajes deben sumar 100', 'error');
      return;
    }
    await db.setAllocationRule({ needs: n / 100, wants: w / 100, savings: s / 100 });
    Toast('Regla actualizada', 'success');
  });

  document.getElementById('btn-cfg-export')?.addEventListener('click', () => exportAllData());

  document.getElementById('cfg-file-import')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const res = await importAllData(file);
    if (res) {
      Toast('Datos restaurados', 'success');
      setTimeout(() => window.location.reload(), 1500);
    }
    e.target.value = '';
  });

  document.getElementById('btn-cfg-wipe')?.addEventListener('click', async () => {
    const confirmado = await ConfirmDialog(
      '¿Borrar todos los datos?',
      'Se elimina todo lo guardado en este dispositivo: rutinas, sesiones, tareas, hábitos, finanzas, notas — todo. No se puede deshacer.',
      { verb: 'Borrar todo', danger: true }
    );
    if (!confirmado) return;
    await db.wipeAllLocalData();
    window.location.reload();
  });
}
