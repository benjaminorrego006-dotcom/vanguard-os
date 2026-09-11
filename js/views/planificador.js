import { db } from '../core/db.js';
import { Toast, ConfirmDialog } from '../utils/states.js';
import { diaKeyDe, formatFechaCorta } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';
import { bindQuickCaptureForm } from '../utils/quickCapture.js';

const DOW = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Lunes de la semana que contiene `d`. getDay() devuelve 0 para domingo,
// así que (getDay()+6)%7 lo reindexa a lunes=0 y el domingo queda al final.
function lunesDe(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

// Offset en semanas respecto de la actual. Vive fuera de render() para
// sobrevivir a los refresh, igual que el mes activo en otras vistas.
let offsetSemana = 0;

export async function render() {
  const base = lunesDe(new Date());
  base.setDate(base.getDate() + offsetSemana * 7);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base); d.setDate(d.getDate() + i); return d;
  });
  const desde = diaKeyDe(dias[0]), hasta = diaKeyDe(dias[6]);
  const tareas = await db.getTareasPlan(desde, hasta);
  const hoyIso = diaKeyDe(new Date());

  const hechas = tareas.filter(t => t.hecha).length;
  const rango = `${formatFechaCorta(dias[0])} – ${formatFechaCorta(dias[6])}`;

  const filaTarea = (t) => `
    <div style="display: flex; align-items: flex-start; gap: 10px; padding: 7px 0;">
      <button class="plan-toggle tappable" data-id="${t.id}"
        style="width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; cursor: pointer; border: 1.5px solid ${t.hecha ? 'var(--accent-plan)' : 'var(--surface-border)'}; background: ${t.hecha ? 'var(--accent-plan)' : 'transparent'}; border-radius: 6px; display: flex; align-items: center; justify-content: center; padding: 0;">
        ${t.hecha ? '<svg width="11" height="11" fill="none" stroke="#000" stroke-width="3.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
      </button>
      <span style="flex: 1; font-size: 14px; line-height: 1.4; color: ${t.hecha ? 'var(--text-disabled)' : 'var(--text-primary)'}; text-decoration: ${t.hecha ? 'line-through' : 'none'};">${escapeHtml(t.texto)}</span>
      <button class="plan-delete tappable" data-id="${t.id}"
        style="background: transparent; border: none; color: var(--text-disabled); cursor: pointer; flex-shrink: 0; padding: 2px;">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>`;

  const tarjetaDia = (d, i) => {
    const iso = diaKeyDe(d);
    const delDia = tareas.filter(t => t.fecha === iso);
    const esHoy = iso === hoyIso;
    return `
      <div class="card" style="padding: 14px 16px; margin-bottom: 12px; ${esHoy ? 'border-color: var(--accent-plan);' : ''}">
        <div class="flex-between" style="margin-bottom: 8px;">
          <h4 style="font-size: 15px; font-weight: 800; margin: 0; color: ${esHoy ? 'var(--accent-plan)' : 'var(--text-primary)'};">${DOW[i]}</h4>
          <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;" class="num">
            ${d.getDate()}/${d.getMonth() + 1}${delDia.length ? ` · ${delDia.filter(t => t.hecha).length}/${delDia.length}` : ''}
          </span>
        </div>
        ${delDia.map(filaTarea).join('')}
        <form class="plan-nueva-form" onsubmit="return false;">
          <input class="plan-nueva" data-fecha="${iso}" type="text" placeholder="Nueva tarea…" enterkeyhint="go"
            style="width: 100%; margin-top: 8px; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 10px 12px; font-size: 14px; font-family: inherit; box-sizing: border-box; outline: none;">
        </form>
      </div>`;
  };

  return `
    <div style="padding: 20px 20px 110px 20px; font-family: var(--font-body);">

      <div class="flex-between" style="margin-bottom: 16px;">
        <div>
          <h1 style="font-size: 30px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.5px;">Semana</h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${rango} · <span class="num">${hechas}</span>/<span class="num">${tareas.length}</span> completadas</div>
        </div>
        <div class="icon-chip" style="width: 40px; height: 40px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M3 9h18M8 2v4M16 2v4"></path></svg>
        </div>
      </div>

      <div class="segmented-control" style="margin-bottom: 18px;">
        <button id="plan-prev">← Anterior</button>
        <button id="plan-hoy" class="${offsetSemana === 0 ? 'active' : ''}">Esta semana</button>
        <button id="plan-next">Siguiente →</button>
      </div>

      ${dias.map(tarjetaDia).join('')}
    </div>`;
}

export function mountListeners() {
  const refresh = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  document.getElementById('plan-prev')?.addEventListener('click', () => { offsetSemana--; refresh(); });
  document.getElementById('plan-next')?.addEventListener('click', () => { offsetSemana++; refresh(); });
  document.getElementById('plan-hoy')?.addEventListener('click', () => { offsetSemana = 0; refresh(); });

  document.querySelectorAll('.plan-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      await db.toggleTareaPlan(e.currentTarget.getAttribute('data-id'));
      refresh();
    });
  });

  document.querySelectorAll('.plan-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await ConfirmDialog('¿Eliminar tarea?', 'Se borra del planificador. Esta acción no se puede deshacer.');
      if (!confirmed) return;
      await db.eliminarTareaPlan(e.currentTarget.getAttribute('data-id'));
      Toast('Tarea eliminada', 'success');
      refresh();
    });
  });

  document.querySelectorAll('.plan-nueva-form').forEach(form => {
    const input = form.querySelector('.plan-nueva');
    bindQuickCaptureForm(form, async () => {
      const texto = input.value.trim();
      if (!texto) return;
      await db.crearTareaPlan(input.getAttribute('data-fecha'), texto);
      refresh();
    });
  });
}
