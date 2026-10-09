// Configuración › Recordatorios (docs/RECORDATORIOS-PLAN.md).
// F2: activar los avisos en este dispositivo y mandar uno de prueba.
// F4: un interruptor y una hora por tipo (las preferencias son de la cuenta:
// valen para todos los dispositivos donde se activen). Guardar el mapa
// completo dispara el recálculo (core/recordatorios.js): apagar un tipo
// borra sus pendientes y cambiar la hora los mueve.
// Sin cuenta, la sección solo explica que hace falta iniciar sesión.
import { db } from '../core/db.js';
import { estadoPush, activarPush, desactivarPush, enviarAvisoPrueba, pedirPermisoNotificaciones } from '../core/push.js';
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';

const TEXTO_ESTADO = {
  'sin-sesion': 'Para recibir avisos necesitas una cuenta: inicia sesión arriba, en Cuenta. Sin cuenta la app funciona igual, solo que sin avisos.',
  'requiere-instalar': 'En iPhone los avisos funcionan solo con la app en la pantalla de inicio (iOS 16.4 o más nuevo): en Safari toca Compartir › Agregar a inicio y abre Vanguard desde ese ícono.',
  'sin-soporte': 'Este navegador no permite notificaciones push.',
  'bloqueado': 'Las notificaciones de Vanguard están bloqueadas en este navegador. Actívalas en los permisos del sitio (el candado junto a la dirección, o Ajustes › Notificaciones en el teléfono) y vuelve aquí.',
  'desactivado': 'Los avisos no están activados en este dispositivo.',
  'sin-respuesta': 'No llegó la respuesta al permiso de notificaciones (se cerró o el teléfono lo silenció). Permítelas a mano: con la app instalada, mantén presionado el ícono de Vanguard › Información de la app › Notificaciones › Permitir; en Chrome, toca el candado junto a la dirección › Permisos › Notificaciones › Permitir. Después vuelve a tocar "Activar en este dispositivo".',
  'activado': 'Avisos activados en este dispositivo.'
};

const boton = (id, texto, primario = false) => `<button id="${id}" type="button" class="btn-primary tappable" style="${primario ? 'background: var(--accent-primary); color: #000;' : 'background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border);'} margin-top: 12px;">${texto}</button>`;

// Una fila por tipo: interruptor, nombre, cuándo llega y (si corresponde) la hora.
function filaTipo(tipo, nombre, cuando, prefs, conHora = true) {
  const p = prefs[tipo];
  return `
    <div class="cfg-rec-tipo" data-tipo="${tipo}">
      <label class="cfg-rec-interruptor">
        <input type="checkbox" class="cfg-rec-activo" data-tipo="${tipo}" ${p.activo ? 'checked' : ''}>
        <span class="cfg-rec-textos"><span class="cfg-rec-nombre">${nombre}</span><span class="cfg-rec-cuando">${cuando}</span></span>
      </label>
      ${conHora ? `<input type="time" class="cfg-rec-hora num" data-tipo="${tipo}" value="${escapeHtml(p.hora)}" aria-label="Hora de ${nombre.toLowerCase()}" ${p.activo ? '' : 'disabled'}>` : ''}
    </div>`;
}

export function renderRecordatoriosSeccion(estado, prefs = null, habitosConHora = 0) {
  const tipos = estado !== 'sin-sesion' && prefs ? `
    <div class="cfg-rec-tipos" id="cfg-rec-tipos">
      <div class="cfg-rec-titulo">Qué avisar</div>
      ${filaTipo('habitos', 'Hábitos', habitosConHora
        ? `A la hora de cada hábito (<span class="num">${habitosConHora}</span> con hora), si todavía no lo marcas.`
        : 'Elige la hora en cada hábito: Hábitos › editar › "Recordarme a las…".', prefs, false)}
      ${filaTipo('tareas', 'Tareas de Lista', 'El día que vencen.', prefs)}
      ${filaTipo('cobros', 'Cobros recurrentes', 'El día anterior al cobro.', prefs)}
      ${filaTipo('resumen', 'Resumen del día', '"Hoy: N tareas, M hábitos".', prefs)}
      <p class="cfg-rec-nota">Valen para todos los dispositivos donde actives los avisos.</p>
    </div>` : '';
  return `
    <p id="cfg-push-estado" data-estado="${estado}" style="margin: 0; font-size: 13px; color: ${estado === 'activado' ? 'var(--text-primary)' : 'var(--text-secondary)'}; line-height: 1.45;">${TEXTO_ESTADO[estado] || ''}</p>
    ${estado === 'desactivado' || estado === 'sin-respuesta' ? boton('btn-push-activar', 'Activar en este dispositivo', true) : ''}
    ${estado === 'activado' ? boton('btn-push-prueba', 'Enviar aviso de prueba') + boton('btn-push-desactivar', 'Desactivar en este dispositivo') : ''}
    ${tipos}`;
}

// Datos para pintar la sección (estado del dispositivo y preferencias).
export async function datosRecordatoriosSeccion() {
  const [estado, prefs, habitos] = await Promise.all([estadoPush().catch(() => 'sin-soporte'), db.getPrefsRecordatorios(), db.getHabitos()]);
  const habitosConHora = habitos.filter(h => prefs.habitos.horas[h.id]).length;
  return { estado, prefs, habitosConHora };
}

// `contenedor`: el elemento de la sección. `vigente`: la guardia de la vista
// (core/vista-activa.js), para no pintar si ya se cambió de pantalla.
export function mountRecordatoriosSeccion(contenedor, vigente = () => true) {
  if (!contenedor) return;
  const repintar = async (estadoForzado) => {
    const d = await datosRecordatoriosSeccion();
    if (!vigente() || !contenedor.isConnected) return;
    contenedor.innerHTML = renderRecordatoriosSeccion(estadoForzado || d.estado, d.prefs, d.habitosConHora);
    mountRecordatoriosSeccion(contenedor, vigente);
  };
  const conBoton = (id, accion) => {
    const b = contenedor.querySelector('#' + id);
    if (!b) return;
    b.addEventListener('click', async () => {
      b.disabled = true;
      try { await accion(); }
      catch (err) {
        console.error('[recordatorios]', err);
        Toast('No se pudo completar. Revisa tu conexión e inténtalo de nuevo.', 'error');
        b.disabled = false;
      }
    });
  };
  // "Activar": el permiso se pide PRIMERO, síncrono en el click, sin ningún
  // await antes (ver pedirPermisoNotificaciones). Siempre hay un aviso con
  // el resultado.
  const btnActivar = contenedor.querySelector('#btn-push-activar');
  if (btnActivar) {
    btnActivar.addEventListener('click', () => {
      const pedido = pedirPermisoNotificaciones();
      btnActivar.disabled = true;
      activarPush(pedido).then(async (e) => {
        const aviso = {
          activado: ['Avisos activados en este dispositivo', 'success'],
          bloqueado: ['Las notificaciones están bloqueadas para Vanguard: actívalas en los permisos del sitio o de la app', 'error'],
          'sin-respuesta': ['No hubo respuesta al permiso: en Recordatorios tienes cómo permitirlo a mano', 'info'],
          'sin-sesion': ['Inicia sesión en Cuenta para activar los avisos', 'info'],
          'sin-soporte': ['Este navegador no permite notificaciones push', 'error']
        }[e] || ['No se pudieron activar los avisos', 'error'];
        Toast(aviso[0], aviso[1], 5000);
        await repintar(e === 'activado' ? 'activado' : e === 'bloqueado' ? 'bloqueado' : e === 'sin-respuesta' ? 'sin-respuesta' : undefined);
      }).catch((err) => {
        console.error('[recordatorios] No se pudo activar ni guardar la suscripción:', err);
        Toast(`No se pudieron activar los avisos: ${(err && err.message) || err}`, 'error', 6000);
        btnActivar.disabled = false;
      });
    });
  }
  conBoton('btn-push-desactivar', async () => {
    await desactivarPush();
    Toast('Avisos desactivados en este dispositivo', 'info');
    await repintar('desactivado');
  });
  conBoton('btn-push-prueba', async () => {
    await enviarAvisoPrueba();
    Toast('Listo: el aviso de prueba llega en más o menos un minuto', 'success', 4000);
    const b = contenedor.querySelector('#btn-push-prueba');
    if (b) b.disabled = false;
  });

  // Preferencias por tipo: cada cambio guarda el mapa completo.
  const guardar = async () => {
    const prefs = await db.getPrefsRecordatorios();
    contenedor.querySelectorAll('.cfg-rec-activo').forEach(c => { prefs[c.dataset.tipo].activo = c.checked; });
    contenedor.querySelectorAll('.cfg-rec-hora').forEach(i => { if (i.value) prefs[i.dataset.tipo].hora = i.value; });
    await db.savePrefsRecordatorios(prefs);
    contenedor.querySelectorAll('.cfg-rec-hora').forEach(i => { const c = contenedor.querySelector(`.cfg-rec-activo[data-tipo="${i.dataset.tipo}"]`); i.disabled = !(c && c.checked); });
    Toast('Recordatorios actualizados', 'success', 1800);
  };
  contenedor.querySelectorAll('.cfg-rec-activo, .cfg-rec-hora').forEach(el => el.addEventListener('change', () => {
    guardar().catch(err => { console.error('[recordatorios]', err); Toast('No se pudo guardar', 'error'); });
  }));
}
