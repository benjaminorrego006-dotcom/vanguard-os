// Modal de configuración del generador de rutinas (Etapa 4a). Separado del
// modal de perfil (profile-form.js): ese es para IMC/gasto calórico, esto
// es equipo/días/duración — cosas que solo le importan al generador.
import { db } from '../core/db.js';
import { Toast } from '../utils/states.js';
import { generarPlan } from '../core/generador-rutinas.js';
import { EQUIPO_OPCIONES } from '../core/trainingConfig.js';
import { CATALOGO_EJERCICIOS } from '../core/ejercicios-catalogo.js';
import { oHoja, abrirHoja, cerrarHoja, montarHoja } from './orbita.js';

const ID = 'generador-config-modal';

const DURACIONES = [20, 30, 45, 60, 75, 90];

// Qué valores de equipo tienen sentido mostrar para esta categoría —
// calculado del catálogo real, no una lista fija, para que se mantenga
// correcto solo si el catálogo crece. Sin esto, Calistenia mostraba las 9
// casillas de GYM (Barra, Mancuernas, Máquina, Kettlebell, Cajón...)
// aunque ningún ejercicio de Calistenia usa esos equipos — tildarlas no
// hacía absolutamente nada, pura confusión.
function equipoUsadoPorCategoria(categoria) {
  const usados = new Set();
  Object.values(CATALOGO_EJERCICIOS).forEach(e => {
    const aplica = e.categoria === categoria || (e.tambienEn || []).includes(categoria);
    if (aplica && e.equipo && e.equipo !== 'ninguno') usados.add(e.equipo);
  });
  return usados;
}

// Órbita (oHoja, Fase 9e); ids de siempre.
export function renderGeneradorConfigForm() {
  const cuerpo = `
    <p class="o-card-texto">Con qué cuentas para entrenar — el generador arma la rutina según tu nivel real en cada patrón de movimiento, sin proponer nada que no puedas hacer.</p>
    <div class="o-campo">
      <span class="o-campo-etiqueta" id="generador-equipo-etq">Equipo disponible</span>
      <div id="generador-equipo-grid" class="o-ent-equipo" role="group" aria-labelledby="generador-equipo-etq">
        ${EQUIPO_OPCIONES.map(o => `
          <label for="generador-equipo-${o.value}" data-equipo-opcion="${o.value}" class="o-ent-casilla">
            <input type="checkbox" id="generador-equipo-${o.value}" class="generador-equipo-check" value="${o.value}">
            ${o.label}
          </label>
        `).join('')}
      </div>
      <p class="o-campo-ayuda">Sin nada marcado, el generador solo usa ejercicios de peso corporal.</p>
    </div>
    <div class="o-ent-hoja-par">
      <div class="o-campo">
        <label for="generador-dias-semana">Días por semana</label>
        <select id="generador-dias-semana" class="o-input">
          ${[1, 2, 3, 4, 5, 6, 7].map(n => `<option value="${n}">${n} día${n === 1 ? '' : 's'}</option>`).join('')}
        </select>
      </div>
      <div class="o-campo">
        <label for="generador-duracion">Duración por sesión</label>
        <select id="generador-duracion" class="o-input">
          ${DURACIONES.map(n => `<option value="${n}">${n} min</option>`).join('')}
        </select>
      </div>
    </div>`;
  return oHoja({
    id: ID, modulo: 'entreno', titulo: 'Generar rutina', cuerpo,
    pie: '<button type="button" id="btn-cancel-generador-config" class="o-btn o-btn--secundario">Cancelar</button><button type="button" id="btn-generar-plan" class="o-btn o-btn--primario">Generar</button>'
  });
}

export function setupGeneradorConfigForm(onGenerado) {
  const modal = document.getElementById('generador-config-modal');
  if (!modal) return;

  const btnCancel = document.getElementById('btn-cancel-generador-config');
  const btnGenerar = document.getElementById('btn-generar-plan');
  montarHoja(ID);
  const close = () => cerrarHoja(ID);

  btnCancel.addEventListener('click', close);

  btnGenerar.addEventListener('click', async () => {
    const equipoDisponible = [...document.querySelectorAll('.generador-equipo-check:checked')].map(el => el.value);
    const diasSemana = parseInt(document.getElementById('generador-dias-semana').value, 10);
    const duracionSesionMin = parseInt(document.getElementById('generador-duracion').value, 10);
    const categoria = modal.dataset.categoria;

    // TODO (onboarding del sistema de nivel, pendiente): si categoria==='gym'
    // y equipoDisponible.length===0, el catálogo de GYM depende casi por
    // completo de barra/mancuernas/máquina — el generador solo cubre 2 de
    // los 8 patrones de movimiento (Rodilla y Core) y el resto queda en
    // aviso. Cuando se construya el onboarding, interceptar acá y sugerir
    // Calistenia en su lugar en vez de dejar que el usuario reciba una
    // rutina de 2 ejercicios sin más contexto. No implementado todavía —
    // pedido explícito del usuario de anotarlo, no resolverlo ahora.

    btnGenerar.disabled = true;
    btnGenerar.textContent = 'Generando…';
    try {
      await db.saveGeneradorConfig({ equipoDisponible, diasSemana, duracionSesionMin });
      const plan = await generarPlan({ categoria, diasSemana, duracionSesionMin, equipoDisponible });
      close();
      if (onGenerado) onGenerado(plan, categoria);
    } catch (err) {
      console.error('Error generando rutina:', err);
      Toast('No se pudo generar la rutina — intenta de nuevo.', 'error');
    } finally {
      btnGenerar.disabled = false;
      btnGenerar.textContent = 'Generar';
    }
  });
}

export async function openGeneradorConfigForm(categoria) {
  const modal = document.getElementById('generador-config-modal');
  if (!modal) return;
  modal.dataset.categoria = categoria;

  // Solo ocultar (nunca destildar): el equipo guardado es un único set
  // compartido entre categorías (db.saveGeneradorConfig no lo separa por
  // categoria), así que una casilla oculta para Calistenia debe seguir
  // marcada por dentro si el usuario la tildó viniendo de GYM — si no,
  // volver a GYM la mostraría destildada sin que el usuario la tocara.
  const equipoUsado = equipoUsadoPorCategoria(categoria);
  document.querySelectorAll('[data-equipo-opcion]').forEach(label => {
    label.hidden = !equipoUsado.has(label.dataset.equipoOpcion);
  });

  const config = await db.getGeneradorConfig();
  const equipoGuardado = new Set(config?.equipoDisponible || []);
  document.querySelectorAll('.generador-equipo-check').forEach(el => {
    el.checked = equipoGuardado.has(el.value);
  });
  document.getElementById('generador-dias-semana').value = config?.diasSemana || 3;
  document.getElementById('generador-duracion').value = config?.duracionSesionMin || 45;

  abrirHoja(ID);
}
