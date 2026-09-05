import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';

const linkSvg = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" viewBox="0 0 24 24" style="vertical-align: -2px; margin-right: 4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

export function renderRutinaForm(categoria) {
  return `
    <div class="card" style="padding: 22px; border-radius: 20px;">
      <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 20px 0; color: var(--text-primary); letter-spacing: -0.3px;">Crear Rutina</h2>

      <div class="input-group" style="margin-bottom: 20px;">
        <label>Nombre de la rutina</label>
        <input type="text" id="rutina-nombre" placeholder="Ej. Empuje Pesado" autocomplete="off">
      </div>

      <style>
        #ejercicios-container .ejercicio-block:first-child .btn-agrupar-sup { display: none !important; }
      </style>
      <div id="ejercicios-container" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px;">
        <!-- Ejercicios dynamically added here -->
      </div>

      <button id="btn-add-ejercicio" type="button" class="tappable" style="width: 100%; padding: 13px; border-radius: 12px; background: transparent; border: 1px dashed var(--surface-border); color: var(--text-secondary); font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: 24px;">
        + Agregar ejercicio
      </button>

      <button id="btn-guardar-rutina" class="btn-primary tappable" style="background: var(--accent-teal);">
        Guardar Rutina
      </button>
    </div>
  `;
}

export function initRutinaFormListeners(categoria, onSuccess, signal) {
  const container = document.getElementById('ejercicios-container');
  const btnAdd = document.getElementById('btn-add-ejercicio');
  const btnSave = document.getElementById('btn-guardar-rutina');
  
  const isCalistenia = categoria === 'calistenia';
  const pesoHelper = isCalistenia ? ' (kg, - banda / + lastre)' : ' (kg)';

  const createSerieRowHTML = () => {
    return `
      <div class="serie-row" style="display: flex; gap: 8px; align-items: center;">
        <select class="serie-tipo" style="flex: 1; min-width:0; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 10px; padding: 9px 8px; color: var(--text-primary); font-size: 16px;">
          <option value="normal">Normal</option>
          <option value="calentamiento">Calentamiento</option>
          <option value="fallo">Fallo</option>
          <option value="dropset">Drop Set</option>
        </select>
        <input type="text" inputmode="numeric" class="serie-reps" placeholder="Reps" style="width: 60px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 10px; padding: 9px 8px; color: var(--text-primary); font-size: 16px; box-sizing: border-box;">
        <input type="number" inputmode="decimal" enterkeyhint="done" class="serie-peso" placeholder="Peso" style="width: 70px; background: var(--surface-1); border: 1px solid var(--surface-border); border-radius: 10px; padding: 9px 8px; color: var(--text-primary); font-size: 16px; box-sizing: border-box;">
        <button class="btn-remove-serie" style="background: transparent; border: none; color: var(--text-disabled); cursor: pointer; font-size: 18px; flex-shrink: 0;">&times;</button>
      </div>
    `;
  };

  const addEjercicioRow = () => {
    const div = document.createElement('div');
    div.className = 'ejercicio-block';
    div.style.cssText = 'background: var(--surface-2); padding: 16px; border-radius: 16px; border: 1px solid var(--surface-border); display: flex; flex-direction: column; gap: 12px; position: relative;';

    div.innerHTML = `
      <button class="btn-remove-ej" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: var(--text-disabled); cursor: pointer; font-size: 20px;">&times;</button>
      <input type="text" class="ej-nombre" placeholder="Nombre del ejercicio" style="width: calc(100% - 30px); box-sizing: border-box; background: transparent; border: none; border-bottom: 1px solid var(--surface-border); padding: 4px 0; color: var(--text-primary); font-size: 16px; font-weight: 700; outline: none; margin-bottom: 4px;">

      <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-bottom: -4px;">Series, Repeticiones y Peso${pesoHelper}</div>
      <div class="series-container" style="display: flex; flex-direction: column; gap: 8px;">
        ${createSerieRowHTML()}
      </div>

      <button class="btn-add-serie" style="background: transparent; border: 1px dashed var(--surface-border); color: var(--text-secondary); border-radius: 10px; padding: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; margin-top: 4px;">+ Añadir serie</button>
      <button class="btn-agrupar-sup" style="background: rgba(92, 225, 230, 0.1); border: 1px dashed var(--accent-teal); color: var(--accent-teal); border-radius: 10px; padding: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; margin-top: 4px;">${linkSvg}Agrupar en superserie con el anterior</button>
    `;

    div.querySelector('.btn-remove-ej').addEventListener('click', () => div.remove());
    
    const seriesContainer = div.querySelector('.series-container');
    div.querySelector('.btn-add-serie').addEventListener('click', () => {
      const rowDiv = document.createElement('div');
      rowDiv.innerHTML = createSerieRowHTML();
      const newSerie = rowDiv.firstElementChild;
      
      newSerie.querySelector('.btn-remove-serie').addEventListener('click', () => {
        if (seriesContainer.children.length > 1) newSerie.remove();
      });
      seriesContainer.appendChild(newSerie);
    });

    // attach remove event to the default first series
    div.querySelector('.btn-remove-serie').addEventListener('click', (e) => {
      if (seriesContainer.children.length > 1) e.currentTarget.parentElement.remove();
    });

    container.appendChild(div);
  };

  addEjercicioRow();

  btnAdd.addEventListener('click', addEjercicioRow);

  btnSave.addEventListener('click', async () => {
    const nombre = document.getElementById('rutina-nombre').value.trim();
    if (!nombre) return Toast('Debes darle un nombre a la rutina', 'warning');

    const ejercicios = [];
    container.querySelectorAll('.ejercicio-block').forEach(block => {
      const eNombre = block.querySelector('.ej-nombre').value.trim();
      if (eNombre) {
        const series = [];
        block.querySelectorAll('.serie-row').forEach(row => {
          series.push({
            tipo: row.querySelector('.serie-tipo').value,
            reps: row.querySelector('.serie-reps').value.trim() || '0',
            peso: parseFloat(row.querySelector('.serie-peso').value) || 0
          });
        });
        ejercicios.push({
          nombre: eNombre,
          series: series
        });
      }
    });

    if (ejercicios.length === 0) return Toast('Agrega al menos un ejercicio', 'warning');

    await db.crearRutina({
      nombre,
      categoria,
      ejercicios
    });

    if (onSuccess) onSuccess();
  });
}