// Laboratorio > Semana (revisión semanal, S3): resumen lunes–domingo de todos
// los módulos con db.getResumenSemana (una lectura de events por render) y
// sus observaciones cruzadas. Por defecto la última semana completa; las
// flechas van a semanas anteriores y hasta la en curso. Mismo contrato que
// los lab-*.js (TABS, renderTab, initTabListeners, cleanup); además
// `sinPestanas` (no muestra la barra de pestañas) y `reiniciar` (al entrar al
// Laboratorio vuelve a la semana por defecto).
import { db } from '../core/db.js';
import { formatCurrency } from '../utils/currency.js';
import { escapeHtml } from '../utils/escape.js';
import { diaKeyDe, sumarDias, fechaLocalDe, formatDiaSemana } from '../utils/fecha.js';
import { svgEscudo } from './racha-reactor.js';

export const TABS = [{ id: 'resumen', label: 'Resumen' }];
export const sinPestanas = true;

// null = semana por defecto (la última completa).
let lunesVista = null;
// Tras cambiar de semana con una flecha, el foco vuelve a esa flecha (el
// re-render reemplaza el HTML): así se puede recorrer con el teclado.
let focoPendiente = null;

// Semana pedida desde afuera (tarjeta "Tu semana" de Hoy): la toma el
// próximo reiniciar() al entrar al Laboratorio, en vez de la de por defecto.
let lunesPedido = null;
export function pedirSemana(lunesKey) { lunesPedido = lunesKey; }
export function reiniciar() { lunesVista = lunesPedido; lunesPedido = null; }
export function cleanup() {}

const lunesDe = (clave) => {
  const [y, m, d] = clave.split('-').map(Number);
  return sumarDias(clave, -((new Date(y, m - 1, d).getDay() + 6) % 7));
};
const lunesActual = () => lunesDe(diaKeyDe(new Date()));
const lunesPorDefecto = () => sumarDias(lunesActual(), -7);

const numero = (n) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Math.round(n));
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const num = (texto) => `<span class="num">${texto}</span>`;
// Un par número + texto ("1 atrasada") no se parte entre líneas.
const dato = (html) => `<span class="semana-dato">${html}</span>`;
const mesCorto = (clave) => fechaLocalDe(clave).toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');

// "14 – 20 sept" o "31 ago – 6 sept".
export function rangoTexto(lunes, domingo) {
  const d1 = Number(lunes.slice(8)); const d2 = Number(domingo.slice(8));
  return lunes.slice(0, 7) === domingo.slice(0, 7)
    ? `${d1} – ${d2} ${mesCorto(domingo)}`
    : `${d1} ${mesCorto(lunes)} – ${d2} ${mesCorto(domingo)}`;
}
// Mismo rango con solo los números en mono ("sept" y el guion en la fuente normal).
export function rangoHtml(lunes, domingo) {
  return rangoTexto(lunes, domingo).replace(/\d+/g, n => num(n));
}

function semanaVacia(s) {
  return s.futura || (s.general.diasActivos === 0 && s.finanzas.gastoTotal === 0 && s.tareas.creadas === 0 && s.general.diasRitual === 0);
}

function renderTira(s) {
  return `
    <div class="racha-semana semana-tira" role="list" aria-label="Días de la semana">
      ${s.porDia.map(d => {
        const estado = d.futuro ? 'futuro' : d.protegido ? 'protegido' : d.activo ? 'activo' : 'vacio';
        const etiqueta = { futuro: 'todavía no llega', protegido: 'protegido por una vida extra', activo: 'con actividad', vacio: 'sin actividad' }[estado];
        const letra = formatDiaSemana(fechaLocalDe(d.fecha)).toUpperCase();
        return `
          <div class="racha-dia racha-dia--${estado}" role="listitem" aria-label="${letra} ${Number(d.fecha.slice(8))}: ${etiqueta}">
            <span class="racha-dia-letra">${letra}</span>
            <span class="racha-dia-marca">${estado === 'protegido' ? svgEscudo({ lleno: true, size: 10 }) : ''}</span>
          </div>`;
      }).join('')}
    </div>`;
}

// Un bloque por módulo: botón (se navega con teclado) que lleva a su pestaña.
function bloque({ modulo, color, titulo, lineas, aria }) {
  const inner = `
      <div class="semana-bloque-titulo" style="color: ${color};">${titulo}</div>
      ${lineas.filter(Boolean).map(l => `<div class="semana-bloque-linea">${l}</div>`).join('')}`;
  return modulo
    ? `<button type="button" class="semana-bloque tappable" data-modulo="${modulo}" style="border-left-color: ${color};" aria-label="${escapeHtml(aria)}. Ver ${titulo} en el Laboratorio">${inner}</button>`
    : `<div class="semana-bloque" style="border-left-color: ${color};" role="group" aria-label="${escapeHtml(aria)}">${inner}</div>`;
}

function renderBloques(s) {
  const e = s.entreno; const f = s.finanzas; const t = s.tareas; const h = s.habitos; const g = s.general;
  const pct = (n) => `${num(n)} %`;
  const sesiones = e.diasObjetivo ? dato(`${num(e.sesiones)} de ${num(e.diasObjetivo)} sesiones`) : dato(`${num(e.sesiones)} ${e.sesiones === 1 ? 'sesión' : 'sesiones'}`);
  const entreno = bloque({
    modulo: 'entreno', color: 'var(--cy)', titulo: 'Entreno',
    lineas: [`${sesiones} · ${dato(`${num(numero(e.minutos))} min`)} · ${dato(`volumen ${num(numero(e.volumen))}`)}`, e.diasDescanso ? dato(plural(e.diasDescanso, 'día de descanso activo', 'días de descanso activo')) : ''],
    aria: `Entreno: ${e.diasObjetivo ? `${e.sesiones} de ${e.diasObjetivo} sesiones` : plural(e.sesiones, 'sesión', 'sesiones')}, ${numero(e.minutos)} minutos, volumen ${numero(e.volumen)}`
  });
  const finanzas = bloque({
    modulo: 'finanzas', color: 'var(--am)', titulo: 'Finanzas',
    lineas: [`${dato(`Gasto ${num(formatCurrency(f.gastoTotal))}`)} <span class="semana-sec">${dato(`(variable ${num(formatCurrency(f.gastoVariable))})`)}</span>`,
      f.sobreTop ? `Más gasto: ${escapeHtml(f.sobreTop.nombre || 'Sin sobre')} ${num(formatCurrency(f.sobreTop.gasto))}` : ''],
    aria: `Finanzas: gasto ${formatCurrency(f.gastoTotal)}, variable ${formatCurrency(f.gastoVariable)}${f.sobreTop ? `, más gasto en ${f.sobreTop.nombre || 'sin sobre'} ${formatCurrency(f.sobreTop.gasto)}` : ''}`
  });
  const tareas = bloque({
    modulo: 'tareas', color: 'var(--vi)', titulo: 'Tareas',
    lineas: [`${dato(`${num(t.completadas)} ${t.completadas === 1 ? 'completada' : 'completadas'}`)}${t.deSemana ? ` <span class="semana-sec">${dato(`(${num(t.deSemana)} de Semana)`)}</span>` : ''} · ${dato(`${num(t.creadas)} ${t.creadas === 1 ? 'creada' : 'creadas'}`)} · ${dato(`${num(t.atrasadas)} ${t.atrasadas === 1 ? 'atrasada' : 'atrasadas'}`)}`],
    aria: `Tareas: ${plural(t.completadas, 'completada', 'completadas')}${t.deSemana ? `, ${t.deSemana} de Semana` : ''}, ${plural(t.creadas, 'creada', 'creadas')}, ${plural(t.atrasadas, 'atrasada', 'atrasadas')}`
  });
  const habitos = bloque({
    modulo: 'habitos', color: 'var(--vi)', titulo: 'Hábitos',
    lineas: h.pct === null ? ['Sin hábitos para esta semana'] : [
      dato(`${pct(h.pct)} cumplido`),
      h.mejor ? `Mejor: ${escapeHtml(h.mejor.nombre)} ${dato(pct(h.mejor.pct))}` : '',
      h.masFlojo ? `Más flojo: ${escapeHtml(h.masFlojo.nombre)} ${dato(pct(h.masFlojo.pct))}` : '',
      h.semanales.total ? `Semanales: ${dato(`${num(h.semanales.cumplidos)} de ${num(h.semanales.total)}`)}` : ''
    ],
    aria: h.pct === null ? 'Hábitos: sin hábitos para esta semana' : `Hábitos: ${h.pct} % cumplido${h.mejor ? `, mejor ${h.mejor.nombre} ${h.mejor.pct} %` : ''}${h.masFlojo ? `, más flojo ${h.masFlojo.nombre} ${h.masFlojo.pct} %` : ''}`
  });
  const dias = s.diasContados;
  const energia = g.diasRitual > 0 && g.energia !== null ? `${dato(`Energía ${num(g.energia.toFixed(1).replace('.', ','))}`)} · ${dato(`${num(g.diasEnergia)} de ${num(dias)} días`)}` : '';
  const general = bloque({
    modulo: null, color: 'var(--t2)', titulo: 'General',
    lineas: [
      g.rachaAlCierre !== null ? `${dato(`Racha ${num(g.rachaAlCierre)} ${g.rachaAlCierre === 1 ? 'día' : 'días'}`)} · ${dato(`${num(g.vidasAlCierre)} ${g.vidasAlCierre === 1 ? 'vida' : 'vidas'} al cierre`)}` : '',
      `${dato(`${num(g.diasActivos)} de ${num(dias)} días activos`)}${g.diasProtegidos ? ` · ${dato(`${num(g.diasProtegidos)} ${g.diasProtegidos === 1 ? 'protegido' : 'protegidos'}`)}` : ''}`,
      g.diasRitual > 0 ? dato(`Ritual ${num(g.diasRitual)} de ${num(dias)} días`) : '',
      energia
    ],
    aria: `General: racha ${plural(g.rachaAlCierre ?? 0, 'día', 'días')} y ${plural(g.vidasAlCierre ?? 0, 'vida', 'vidas')} al cierre, ${g.diasActivos} de ${dias} días activos, ${plural(g.diasProtegidos, 'protegido', 'protegidos')}${g.diasRitual > 0 ? `, Ritual ${g.diasRitual} de ${dias} días` : ''}${energia ? `, energía ${g.energia.toFixed(1).replace('.', ',')} en ${plural(g.diasEnergia, 'día', 'días')}` : ''}`
  });
  return `<div class="semana-bloques">${entreno}${finanzas}${tareas}${habitos}${general}</div>`;
}

function renderObservaciones(s) {
  const obs = s.observaciones || [];
  return `
    <section class="semana-obs" aria-label="Observaciones de la semana">
      <div class="semana-obs-titulo">Observaciones</div>
      ${obs.length
        ? obs.map(o => `<p class="semana-obs-texto">${escapeHtml(o.texto)}</p>`).join('')
        : '<p class="semana-obs-texto semana-sec">Todavía no hay suficientes datos para comparar. Vuelve en unas semanas.</p>'}
    </section>`;
}

export async function renderTab() {
  const actual = lunesActual();
  const lunes = lunesVista || lunesPorDefecto();
  const s = await db.getResumenSemana(lunes);
  const esActual = lunes === actual;
  const cabecera = `
    <div class="semana-cabecera">
      <button type="button" id="semana-anterior" class="semana-flecha tappable" aria-label="Semana anterior">‹</button>
      <div class="semana-rango" aria-live="polite">
        <span>${rangoHtml(s.lunes, s.domingo)}</span>
        ${esActual ? '<span class="semana-en-curso">En curso</span>' : ''}
      </div>
      <button type="button" id="semana-siguiente" class="semana-flecha tappable" aria-label="Semana siguiente"${esActual ? ' disabled' : ''}>›</button>
    </div>`;
  if (semanaVacia(s)) {
    return `<div id="lab-semana">${cabecera}${renderTira(s)}
      <div class="semana-vacia">Sin registros esta semana.</div></div>`;
  }
  return `<div id="lab-semana">${cabecera}${renderTira(s)}${renderBloques(s)}${renderObservaciones(s)}</div>`;
}

// irAModulo(modulo): lo pasa laboratorio.js para saltar a la pestaña de un
// módulo desde su bloque.
export function initTabListeners(_tab, refresh, irAModulo) {
  const lunes = lunesVista || lunesPorDefecto();
  if (focoPendiente) {
    const destino = document.getElementById(focoPendiente);
    (destino && !destino.disabled ? destino : document.getElementById('semana-anterior'))?.focus();
    focoPendiente = null;
  }
  document.getElementById('semana-anterior')?.addEventListener('click', () => { lunesVista = sumarDias(lunes, -7); focoPendiente = 'semana-anterior'; refresh(); });
  document.getElementById('semana-siguiente')?.addEventListener('click', () => {
    if (lunes >= lunesActual()) return;
    lunesVista = sumarDias(lunes, 7);
    focoPendiente = 'semana-siguiente';
    refresh();
  });
  document.querySelectorAll('#lab-semana .semana-bloque[data-modulo]').forEach(btn => {
    btn.addEventListener('click', () => { if (irAModulo) irAModulo(btn.dataset.modulo); });
  });
}
