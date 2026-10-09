// Configuración › Recordatorios (docs/RECORDATORIOS-PLAN.md).
// F2: activar los avisos en este dispositivo y mandar uno de prueba.
// Sin cuenta, la sección solo explica que hace falta iniciar sesión.
import { estadoPush, activarPush, desactivarPush, enviarAvisoPrueba } from '../core/push.js';
import { Toast } from '../utils/states.js';

const TEXTO_ESTADO = {
  'sin-sesion': 'Para recibir avisos necesitas una cuenta: inicia sesión arriba, en Cuenta. Sin cuenta la app funciona igual, solo que sin avisos.',
  'requiere-instalar': 'En iPhone los avisos funcionan solo con la app en la pantalla de inicio (iOS 16.4 o más nuevo): en Safari toca Compartir › Agregar a inicio y abre Vanguard desde ese ícono.',
  'sin-soporte': 'Este navegador no permite notificaciones push.',
  'bloqueado': 'Las notificaciones de Vanguard están bloqueadas en este navegador. Actívalas en los permisos del sitio (el candado junto a la dirección, o Ajustes › Notificaciones en el teléfono) y vuelve aquí.',
  'desactivado': 'Los avisos no están activados en este dispositivo.',
  'activado': 'Avisos activados en este dispositivo.'
};

const boton = (id, texto, primario = false) => `<button id="${id}" type="button" class="btn-primary tappable" style="${primario ? 'background: var(--accent-primary); color: #000;' : 'background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border);'} margin-top: 12px;">${texto}</button>`;

export function renderRecordatoriosSeccion(estado) {
  return `
    <p id="cfg-push-estado" data-estado="${estado}" style="margin: 0; font-size: 13px; color: ${estado === 'activado' ? 'var(--text-primary)' : 'var(--text-secondary)'}; line-height: 1.45;">${TEXTO_ESTADO[estado] || ''}</p>
    ${estado === 'desactivado' ? boton('btn-push-activar', 'Activar en este dispositivo', true) : ''}
    ${estado === 'activado' ? boton('btn-push-prueba', 'Enviar aviso de prueba') + boton('btn-push-desactivar', 'Desactivar en este dispositivo') : ''}`;
}

// `contenedor`: el elemento de la sección. `vigente`: la guardia de la vista
// (core/vista-activa.js), para no pintar si ya se cambió de pantalla.
export function mountRecordatoriosSeccion(contenedor, vigente = () => true) {
  if (!contenedor) return;
  const repintar = async (estado) => {
    const e = estado || await estadoPush();
    if (!vigente() || !contenedor.isConnected) return;
    contenedor.innerHTML = renderRecordatoriosSeccion(e);
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
  conBoton('btn-push-activar', async () => {
    const e = await activarPush();
    if (e === 'activado') Toast('Avisos activados en este dispositivo', 'success');
    else if (e === 'bloqueado') Toast('Las notificaciones quedaron bloqueadas', 'error');
    await repintar(e);
  });
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
}
