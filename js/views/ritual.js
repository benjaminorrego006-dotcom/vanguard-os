import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { diaKeyDe } from '../utils/fecha.js';
import { escapeHtml } from '../utils/escape.js';

const CAMPOS = [
  { k: 'mision',   t: 'Tu misión de hoy',       ph: 'Si el día sirviera para una sola cosa, ¿cuál sería?' },
  { k: 'proyecto', t: 'Tu proyecto principal',  ph: '¿En qué vas a avanzar hoy?' },
  { k: 'pilar',    t: 'Tu pilar de hoy',        ph: 'Psicología, fisiología, productividad, presencia, propósito…' },
  { k: 'servir',   t: 'A quién puedes servir',  ph: 'Alguien que se beneficie de tu día' },
  { k: 'gratitud', t: 'Algo que agradeces',     ph: 'Una cosa, aunque sea pequeña' }
];

export async function render() {
  const hoy = diaKeyDe(new Date());
  const ritual = await db.getRitual(hoy);
  const { hechos, total, completo } = await db.getProgresoRitual(hoy);
  const racha = await db.getRachaRitual();

  const fechaLarga = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  const campoHtml = ({ k, t, ph }) => {
    const lleno = !!(ritual[k] && String(ritual[k]).trim());
    return `
      <div class="card" style="padding: 16px 16px 14px 20px; position: relative; overflow: hidden; margin-bottom: 12px;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${lleno ? 'var(--accent-ritual)' : 'var(--surface-border)'};"></div>
        <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">${t}</label>
        <textarea class="ritual-campo" data-campo="${k}" rows="2" placeholder="${ph}"
          style="width: 100%; background: var(--bg-base); border: 1px solid var(--surface-border); color: var(--text-primary); padding: 12px 14px; font-size: 15px; font-family: inherit; box-sizing: border-box; outline: none; resize: vertical;">${escapeHtml(ritual[k] || '')}</textarea>
      </div>`;
  };

  const energiaHtml = [1, 2, 3, 4, 5].map(n => `
    <button class="ritual-energia tappable" data-valor="${n}"
      style="flex: 1; padding: 14px 0; border: none; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 16px;
      background: ${ritual.energia === n ? 'var(--accent-ritual)' : 'var(--surface-2)'};
      color: ${ritual.energia === n ? '#000' : 'var(--text-secondary)'};">${n}</button>`).join('');

  return `
    <div style="padding: 20px 20px 110px 20px; font-family: var(--font-body);">

      <div class="flex-between" style="margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 30px; font-weight: 800; margin: 0; color: var(--text-primary); letter-spacing: -0.5px;">Ritual</h1>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(fechaLarga)}</div>
        </div>
        <div class="icon-chip" style="width: 40px; height: 40px; background: var(--surface-2); border: 1px solid var(--surface-border); color: var(--text-secondary);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"></path></svg>
        </div>
      </div>

      <div class="card card-hero" style="margin-bottom: 20px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;">
        <div style="width: 56px; height: 56px; flex-shrink: 0; border-radius: 50%; background: var(--rtp, rgba(139,124,255,0.14)); display: flex; align-items: center; justify-content: center; font-size: 24px;">${completo ? '✅' : '🌅'}</div>
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);"><span class="num">${racha.actual}</span> ${racha.actual === 1 ? 'día seguido' : 'días seguidos'} de ritual</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;"><span class="num">${hechos}</span> de <span class="num">${total}</span> campos completados hoy</div>
          <div style="height: 6px; background: var(--surface-2); border-radius: 99px; overflow: hidden; margin-top: 8px;">
            <div style="height: 100%; width: ${(hechos / total) * 100}%; background: var(--accent-ritual);"></div>
          </div>
        </div>
      </div>

      ${CAMPOS.map(campoHtml).join('')}

      <div class="card" style="padding: 16px 16px 14px 20px; position: relative; overflow: hidden;">
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${ritual.energia ? 'var(--accent-ritual)' : 'var(--surface-border)'};"></div>
        <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">¿Con qué energía arrancas?</label>
        <div style="display: flex; gap: 6px;">${energiaHtml}</div>
      </div>

      ${completo ? `
        <div class="card" style="margin-top: 16px; padding: 16px 20px; border-color: var(--accent-ritual);">
          <div style="font-size: 15px; font-weight: 700; color: var(--accent-ritual);">Ritual completo</div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Ya sabes cómo se ve un buen día de hoy. Ahora ejecútalo.</div>
        </div>` : ''}
    </div>`;
}

export function mountListeners() {
  const refresh = async () => {
    const root = document.getElementById('view-root');
    root.innerHTML = await render();
    mountListeners();
  };

  const hoy = diaKeyDe(new Date());

  // Los textos se guardan en `change` (blur), no en `input`: repintar la
  // vista entera en cada tecla mataría el foco del textarea.
  document.querySelectorAll('.ritual-campo').forEach(el => {
    el.addEventListener('change', async (e) => {
      const campo = e.currentTarget.getAttribute('data-campo');
      await db.setRitualCampo(hoy, campo, e.currentTarget.value);
      refresh();
    });
  });

  // La energía sí repinta: es un toggle y no hay foco de texto que perder.
  document.querySelectorAll('.ritual-energia').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const valor = Number(e.currentTarget.getAttribute('data-valor'));
      await db.setRitualCampo(hoy, 'energia', valor);
      const { completo } = await db.getProgresoRitual(hoy);
      if (completo) Toast('Ritual completo', 'success');
      refresh();
    });
  });
}
