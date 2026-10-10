// js/components/dia-hoja.js
// Hoja "Día" (docs/PLAN-PENDIENTES-OCT.md, A3): descanso planificado y nota
// del día. Se abre desde Hoy, los mapas de actividad (Tareas, Finanzas) y la
// franja del detalle de un hábito, así que vive en <body> (se crea la
// primera vez) en vez de dentro de una vista. Es un .modal-overlay + open:
// Atrás la cierra vía history.js, y no tapa la barra inferior ni el riel
// (#dia-modal en layout.css). Cambiar de vista la cierra.
import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { diaKeyDe, fechaLocalDe, conMayuscula } from '../utils/fecha.js';
import { esperarSalidaDeModal } from '../core/history.js';

const ID = 'dia-modal';
const NOTA_MAX = 140;
let alGuardarActual = null;
let fechaActual = null;

const largo = (s) => [...s].length;

// "viernes 10 de octubre" (con el año si no es el actual).
function fechaTexto(fecha) {
  const d = fechaLocalDe(fecha);
  const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
  if (d.getFullYear() !== new Date().getFullYear()) opciones.year = 'numeric';
  return conMayuscula(d.toLocaleDateString('es-CL', opciones));
}

function crear() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="${ID}" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dia-titulo">
      <div class="modal-content dia-hoja">
        <div class="dia-etq">DÍA</div>
        <h3 id="dia-titulo"></h3>
        <form id="dia-form" novalidate>
          <label class="dia-interruptor">
            <input type="checkbox" id="dia-descanso">
            <span>
              <span class="dia-interruptor-titulo">Descanso planificado</span>
              <span class="dia-interruptor-ayuda" id="dia-descanso-ayuda"></span>
            </span>
          </label>
          <label class="dia-campo" for="dia-nota">
            <span class="dia-campo-cab"><span>Nota del día</span><span class="num" id="dia-contador" aria-live="polite"></span></span>
            <textarea id="dia-nota" rows="3" maxlength="${NOTA_MAX * 2}" placeholder="Algo que quieras recordar de este día"></textarea>
          </label>
          <p class="dia-error" id="dia-error" hidden></p>
          <div class="dia-acciones">
            <button type="button" id="dia-cancelar" class="dia-btn">Cancelar</button>
            <button type="submit" id="dia-guardar" class="dia-btn dia-btn--primario">Guardar</button>
          </div>
        </form>
      </div>
    </div>`;
  const modal = wrapper.firstElementChild;
  document.body.appendChild(modal);

  const nota = modal.querySelector('#dia-nota');
  nota.addEventListener('input', () => {
    // Tope por punto de código (un emoji cuenta 1), igual que db.guardarDia.
    const chars = [...nota.value];
    if (chars.length > NOTA_MAX) nota.value = chars.slice(0, NOTA_MAX).join('');
    pintarContador();
  });
  modal.querySelector('#dia-cancelar').addEventListener('click', () => cerrar());
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
  modal.querySelector('#dia-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Todo lo que se lee del formulario, antes de cualquier await.
    const fecha = fechaActual;
    const alGuardar = alGuardarActual;
    const descanso = modal.querySelector('#dia-descanso').checked;
    const texto = nota.value;
    const btn = modal.querySelector('#dia-guardar');
    const error = modal.querySelector('#dia-error');
    btn.disabled = true;
    try {
      const fila = await db.guardarDia({ fecha, descanso, nota: texto });
      await cerrar();
      Toast(fila ? 'Día guardado' : 'Se quitó el descanso y la nota', 'success');
      if (alGuardar) alGuardar(fila, fecha);
    } catch (err) {
      error.textContent = err.message || 'No se pudo guardar el día.';
      error.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
  // Cambiar de vista con la hoja abierta (la barra queda libre) la cierra.
  window.addEventListener('hashchange', () => {
    if (modal.classList.contains('open')) { modal.classList.remove('open'); modal.style.display = 'none'; }
  });
  return modal;
}

function pintarContador() {
  const modal = document.getElementById(ID);
  if (!modal) return;
  const n = largo(modal.querySelector('#dia-nota').value);
  modal.querySelector('#dia-contador').textContent = `${n}/${NOTA_MAX}`;
}

async function cerrar() {
  const modal = document.getElementById(ID);
  if (!modal || !modal.classList.contains('open')) return;
  modal.classList.remove('open');
  setTimeout(() => { if (!modal.classList.contains('open')) modal.style.display = 'none'; }, 300);
  await esperarSalidaDeModal(ID);
}

// Abre la hoja para `fecha` (clave de día). `alGuardar(fila, fecha)` se
// llama tras guardar (fila null si el día quedó vacío), para repintar.
export async function abrirHojaDia(fecha, { alGuardar = null } = {}) {
  const modal = document.getElementById(ID) || crear();
  fechaActual = fecha;
  alGuardarActual = alGuardar;
  const dia = await db.getDia(fecha);
  if (fechaActual !== fecha) return; // otra apertura ganó mientras se leía

  const hoy = diaKeyDe(new Date());
  const pasado = fecha < hoy;
  const descanso = !!(dia && dia.descanso);
  const chk = modal.querySelector('#dia-descanso');
  chk.checked = descanso;
  // En un día pasado el descanso solo se puede quitar, no poner.
  chk.disabled = pasado && !descanso;
  modal.querySelector('.dia-interruptor').classList.toggle('dia-interruptor--off', chk.disabled);
  modal.querySelector('#dia-descanso-ayuda').textContent = chk.disabled
    ? 'El descanso se planifica: solo puedes marcarlo para hoy o un día futuro.'
    : 'No corta tu racha y tus hábitos de ese día no cuentan como fallados.';
  modal.querySelector('#dia-titulo').innerHTML = escapeHtml(fechaTexto(fecha)) + (fecha === hoy ? ' <span class="dia-hoy">· hoy</span>' : '');
  modal.querySelector('#dia-nota').value = (dia && dia.nota) || '';
  modal.querySelector('#dia-error').hidden = true;
  pintarContador();

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('open'), 10);
}
