// tools/verificar/foto-hojas.mjs
// Foto de lo que migra la Fase 9e del rediseño: el temporizador de HIIT
// (Libre, Tabata, EMOM y AMRAP: fases, cuenta, rondas, ejercicio actual y
// siguiente, voz, pitidos, resumen y lo que queda guardado), qué pasa con
// un HIIT o un descanso activo en curso al salir de la vista, al botón atrás
// y al recargar (desde la 9f se retoman; atrás en el resumen guarda la
// sesión una sola vez), el descanso activo, y las cifras y textos de las hojas de Entreno (las de la
// sesión, el detalle y la edición de una sesión, perfil, nivel, generador,
// medidas y fotos).
//
// Uso (desde la raíz del repo, con Node portable en el PATH):
//   node tools/verificar/foto-hojas.mjs antes     → hojas-antes.json
//   node tools/verificar/foto-hojas.mjs despues   → salida/hojas-despues/foto.json
// verificar.mjs llama a tomarFotoHojas() y compara contra hojas-antes.json.
//
// Escenario: datos de demostración, más un circuito HIIT de tres ejercicios,
// un día de descanso activo y tres fotos, que agrega esta herramienta.
// Reloj simulado y detenido (el tiempo avanza solo cuando la herramienta lo
// pide), voz y pitidos registrados en vez de sonar, contexto limpio, zona
// America/Santiago y Supabase bloqueado.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { AHORA_FOTO, prepararEscenario, ir, servir, compararFotos } from './foto-finanzas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
export const ARCHIVO_ANTES_HOJAS = path.join(AQUI, 'hojas-antes.json');
const INICIO = new Date('2026-11-23T17:00:00-03:00');

let ultimoPaso = 'inicio';
const paso = (m) => { ultimoPaso = m; if (process.env.FOTO_LOG) console.log('·', m); };

const T = `const t = (el) => (el ? el.textContent.replace(/\\s+/g, ' ').trim() : null);
  const visible = (el) => !!el && !!el.closest('body') && el.checkVisibility();
  // Texto visible de un bloque, sin botones ni íconos y sin espacios:
  // compara el contenido aunque cambie la maqueta.
  const plano = (el) => {
    if (!el) return null;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let s = ''; let n;
    while ((n = w.nextNode())) { const p = n.parentElement; if (!p.closest('button, svg, select, textarea, style, script') && p.checkVisibility()) s += n.textContent; }
    return s.replace(/\\s+/g, '');
  };
  // Campos visibles (una casilla cuenta si su etiqueta se ve); un select da
  // el texto de la opción elegida (los valores pueden ser ids al azar).
  const campos = (el) => el ? [...el.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea')]
    .filter((i) => i.id && (visible(i) || (i.type === 'checkbox' && visible(i.closest('label')))))
    .map((i) => i.id + '=' + (i.type === 'checkbox' ? i.checked : i.tagName === 'SELECT' ? (i.selectedOptions[0]?.textContent.trim() ?? '') : i.value)) : null;`;

// --- Lectores del temporizador de HIIT ----------------------------------
// Por los ids del temporizador (hiit-*), que la migración conserva. Lo
// único que cambia de forma es cómo se marca el ejercicio en curso.
const leerHiitCon = (actual) => new Function(`${T}
  const $ = (id) => document.getElementById(id);
  const vista = ['hiit-setup-view', 'hiit-active-view', 'hiit-summary-view'].find((id) => visible($(id))) || null;
  const lista = [...document.querySelectorAll('#hiit-ejercicios-lista .hiit-ej-item')];
  const actualIdx = lista.findIndex(${actual});
  return {
    titulo: t(document.querySelector('#hiit-container h2')),
    ejercicios: lista.map(t),
    vista,
    racha: vista === 'hiit-setup-view' ? { actual: t($('hiit-racha-actual')), mejor: t($('hiit-racha-mejor')) } : undefined,
    modo: vista === 'hiit-setup-view' ? document.querySelector('.hiit-mode-btn.active')?.dataset.mode : undefined,
    ajustes: vista === 'hiit-setup-view' ? { texto: plano($('hiit-settings-content')), campos: campos($('hiit-settings-content')) } : undefined,
    voz: vista === 'hiit-setup-view' ? $('hiit-voice-toggle')?.checked : undefined,
    activo: vista === 'hiit-active-view' ? {
      fase: t($('hiit-phase-label')), tiempo: t($('hiit-time-display')), ronda: t($('hiit-round-label')),
      siguiente: visible($('hiit-next-exercise')) ? t($('hiit-next-exercise')) : null,
      record: visible($('hiit-amrap-record')) ? t($('hiit-amrap-record')) : null,
      amrapBtn: visible($('btn-amrap-add')) ? t($('btn-amrap-add')) : null,
      actual: actualIdx
    } : undefined,
    resumen: vista === 'hiit-summary-view' ? { titulo: t(document.querySelector('#hiit-summary-view h2')), datos: plano($('hiit-summary-stats')) } : undefined
  };`);
export const UI_MK3 = {
  nombre: 'mk3',
  hiit: leerHiitCon("(el) => /accent-teal/.test(el.style.background)")
};
export const UI_ORBITA = {
  nombre: 'orbita',
  hiit: leerHiitCon("(el) => el.getAttribute('aria-current') === 'step'")
};

// Una hoja abierta: título, texto sin botones y campos. La hoja es la
// .modal-overlay abierta con ese id (o la última abierta).
const leerHoja = new Function('id', `${T}
  const abiertas = [...document.querySelectorAll('.modal-overlay.open')];
  const h = id ? document.getElementById(id) : abiertas[abiertas.length - 1];
  if (!h || !h.classList.contains('open')) return null;
  return { texto: plano(h), campos: campos(h), botones: [...h.querySelectorAll('button')].filter((b) => visible(b) && t(b) && !/^[×✕]$/.test(t(b))).map((b) => t(b) + (b.disabled ? ' (deshabilitado)' : '')) };`);

// --- Escenario -----------------------------------------------------------

async function sembrar(page) {
  return page.evaluate(async () => {
    const { db } = await import('/js/core/db.js');
    await db.crearRutina({
      nombre: 'Circuito tres', categoria: 'hiit',
      ejercicios: [{ nombre: 'Sentadilla con salto', series: [] }, { nombre: 'Escaladores', series: [] }, { nombre: 'Jumping jacks', series: [] }],
      hiitSettings: { mode: 'free', workSecs: 10, restSecs: 5, totalRounds: 6 }
    });
    await db.crearRutina({ nombre: 'Día 7 · Movilidad', categoria: 'gym', ejercicios: [] });
    const png = () => new Promise((r) => { const c = document.createElement('canvas'); c.width = 4; c.height = 6; c.getContext('2d').fillRect(0, 0, 4, 6); c.toBlob(r, 'image/png'); });
    for (const fecha of ['2026-10-25', '2026-11-22', '2026-11-22']) await db.agregarFoto({ blob: await png(), ancho: 4, alto: 6, fecha });
  });
}

// Voz y pitidos: se registran en vez de sonar (la prueba los compara).
function registrarSonidos() {
  window.__voz = [];
  window.__pitidos = 0;
  class Enunciado { constructor(text) { this.text = text; } }
  window.SpeechSynthesisUtterance = Enunciado;
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: (u) => window.__voz.push(u.text), cancel: () => {} } });
  class Audio {
    constructor() { window.__pitidos++; this.currentTime = 0; this.destination = {}; }
    createOscillator() { return { connect() {}, type: '', frequency: { setValueAtTime() {} }, start() {}, stop() {} }; }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
  }
  window.AudioContext = Audio;
  window.webkitAudioContext = Audio;
}

async function irARutinas(page, cat, conRutinas = true) {
  if (await page.evaluate(() => window.appRouter.currentView) !== 'entrenamiento') await ir(page, 'entrenamiento');
  await page.waitForSelector('#entrenamiento-main-view [data-ent-tab="rutinas"]');
  if (await page.locator('[data-ent-tab="rutinas"][aria-selected="false"]').count()) await page.locator('[data-ent-tab="rutinas"]').click();
  await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
  if (await page.locator(`[data-rut-cat="${cat}"][aria-pressed="false"]`).count()) {
    await page.locator(`[data-rut-cat="${cat}"]`).click();
    await page.waitForSelector(`[data-rut-cat="${cat}"][aria-pressed="true"]`);
  }
  if (conRutinas) await page.waitForSelector('#ent-rutinas .btn-iniciar-sesion');
}
async function iniciar(page, cat, nombre) {
  await irARutinas(page, cat);
  const id = await page.evaluate(async (n) => { const { db } = await import('/js/core/db.js'); return (await db.getRutinas()).find((r) => r.nombre === n).id; }, nombre);
  await page.locator(`#ent-rutinas .btn-iniciar-sesion[data-id="${id}"]`).click();
}
const enMain = (page) => page.waitForSelector('#entrenamiento-main-view [data-ent-tab]', { state: 'visible' });

// Lo que queda en la base después de cada HIIT.
const ultimaSesion = (page) => page.evaluate(async () => {
  const { db } = await import('/js/core/db.js');
  const s = (await db.getSesiones())[0];
  return s ? { nombreRutina: s.nombreRutina, fecha: String(s.fecha).slice(0, 16), duracionMin: s.duracionMin, completado: s.completado, rpe: s.rpe, notas: s.notas, ejercicios: JSON.stringify(s.ejercicios) } : null;
});
const nSesiones = (page) => page.evaluate(async () => { const { db } = await import('/js/core/db.js'); return (await db.getSesiones()).length; });
const sonidos = (page) => page.evaluate(() => ({ voz: window.__voz.splice(0), pitidos: window.__pitidos }));

export async function recorrerHojas(page, ui, capturar = async () => {}) {
  const foto = {};
  const hiit = () => page.evaluate(ui.hiit);
  const hoja = (id) => page.evaluate(leerHoja, id || null);
  const correr = async (seg) => { await page.clock.runFor(seg * 1000); };

  await sembrar(page);
  paso('sembrado');
  await page.reload();
  await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
  await page.evaluate(() => { window.__voz = []; window.__pitidos = 0; });
  await page.clock.pauseAt(INICIO);

  // ================= HIIT =================
  // --- Tabata express (demo): ajustes de cada modo y una Tabata completa.
  await iniciar(page, 'hiit', 'Tabata express');
  await page.waitForSelector('#btn-hiit-start');
  await correr(1);
  foto.tabataAjustes = await hiit();
  await capturar('hiit-ajustes');
  foto.modos = {};
  for (const m of ['free', 'emom', 'amrap', 'tabata']) {
    await page.locator(`.hiit-mode-btn[data-mode="${m}"]`).click();
    foto.modos[m] = (await hiit()).ajustes;
  }
  foto.vozActivada = await page.$eval('#hiit-voice-toggle', (e) => e.checked);
  await page.locator('#btn-hiit-start').click();
  const tabata = {};
  tabata.t0 = await hiit();
  await capturar('hiit-trabajo');
  for (const [k, s] of [['t1', 1], ['t17', 16], ['t20', 3], ['t25', 5], ['t30', 5], ['t211', 181], ['t230', 19]]) { await correr(s); tabata[k] = await hiit(); }
  await capturar('hiit-descanso');
  tabata.sonidos = await sonidos(page);
  await correr(10); // t = 240: fin → hoja «¿Cómo estuvo tu sesión?»
  await correr(0.1);
  await page.waitForSelector('#session-summary-modal.open');
  tabata.hojaResumen = await hoja('session-summary-modal');
  await capturar('hiit-hoja-resumen');
  await page.locator('#session-summary-modal [data-rpe="8"]').click();
  await page.locator('#session-summary-notas').fill('Buena');
  await page.locator('#btn-save-summary').click(); await correr(0.5);
  await page.waitForSelector('#hiit-summary-view', { state: 'visible' });
  tabata.fin = await hiit();
  await capturar('hiit-fin');
  tabata.guardada = await ultimaSesion(page);
  tabata.sonidosFin = await sonidos(page);
  foto.tabata = tabata;
  await page.locator('#btn-hiit-close').click();
  await correr(0.5);
  await enMain(page);
  paso('tabata');

  // --- Circuito de tres ejercicios en Libre (ejercicio actual y siguiente).
  await iniciar(page, 'hiit', 'Circuito tres');
  await page.waitForSelector('#btn-hiit-start');
  await correr(1);
  const libre = { ajustes: await hiit() };
  await page.locator('#hiit-s-work').fill('5');
  await page.locator('#hiit-s-rest').fill('3');
  await page.locator('#hiit-s-rounds').fill('4');
  await page.locator('#btn-hiit-start').click();
  libre.t0 = await hiit();
  for (const [k, s] of [['t5', 5], ['t8', 3], ['t13', 5], ['t16', 3], ['t21', 5], ['t24', 3], ['t29', 5]]) { await correr(s); libre[k] = await hiit(); }
  await capturar('hiit-circuito');
  libre.sonidos = await sonidos(page);
  await correr(3); // t = 32: fin
  await correr(0.1);
  await page.waitForSelector('#session-summary-modal.open');
  await page.locator('#btn-skip-summary').click(); await correr(0.5);
  await page.waitForSelector('#hiit-summary-view', { state: 'visible' });
  libre.fin = await hiit();
  libre.guardada = await ultimaSesion(page);
  foto.libre = libre;
  await page.locator('#btn-hiit-close').click();
  await correr(0.5);
  await enMain(page);
  paso('libre');

  // --- EMOM: 2 min en intervalos de 30 s, terminado a mano.
  await iniciar(page, 'hiit', 'Tabata express');
  await page.waitForSelector('#btn-hiit-start');
  await correr(1);
  await page.locator('.hiit-mode-btn[data-mode="emom"]').click();
  await page.locator('#hiit-s-emom-mins').fill('2');
  await page.locator('#hiit-s-emom-sec').fill('30');
  await page.locator('#btn-hiit-start').click();
  const emom = { t0: await hiit() };
  for (const [k, s] of [['t29', 29], ['t30', 1], ['t32', 2], ['t33', 1], ['t60', 27], ['t70', 10]]) { await correr(s); emom[k] = await hiit(); }
  emom.sonidos = await sonidos(page);
  await page.locator('#btn-hiit-stop').click();
  await correr(0.1);
  await page.waitForSelector('#session-summary-modal.open');
  await page.locator('#btn-skip-summary').click(); await correr(0.5);
  await page.waitForSelector('#hiit-summary-view', { state: 'visible' });
  emom.fin = await hiit();
  emom.guardada = await ultimaSesion(page);
  foto.emom = emom;
  await page.locator('#btn-hiit-close').click();
  await correr(0.5);
  await enMain(page);
  paso('emom');

  // --- AMRAP: 1 min, tres rondas; después otro con el récord.
  const amrap = {};
  for (const vuelta of [1, 2]) {
    await iniciar(page, 'hiit', 'Tabata express');
    await page.waitForSelector('#btn-hiit-start');
    await correr(1);
    await page.locator('.hiit-mode-btn[data-mode="amrap"]').click();
    await page.locator('#hiit-s-amrap-mins').fill('1');
    await page.locator('#btn-hiit-start').click();
    await correr(0.1);
    amrap[`v${vuelta}t0`] = await hiit();
    if (vuelta === 1) {
      for (let i = 0; i < 3; i++) { await correr(10); await page.locator('#btn-amrap-add').click(); }
      amrap.v1t30 = await hiit();
      await capturar('hiit-amrap');
      await correr(30); // t = 60: «Tiempo finalizado»
      await correr(0.1);
      await page.waitForSelector('#session-summary-modal.open');
      await page.locator('#session-summary-modal [data-rpe="9"]').click();
      await page.locator('#btn-save-summary').click(); await correr(0.5);
    } else {
      await correr(5);
      await page.locator('#btn-hiit-stop').click();
      await correr(0.1);
      await page.waitForSelector('#session-summary-modal.open');
      await page.locator('#btn-skip-summary').click(); await correr(0.5);
    }
    await page.waitForSelector('#hiit-summary-view', { state: 'visible' });
    amrap[`v${vuelta}fin`] = await hiit();
    amrap[`v${vuelta}guardada`] = await ultimaSesion(page);
    amrap[`v${vuelta}sonidos`] = await sonidos(page);
    await page.locator('#btn-hiit-close').click();
    await correr(0.5);
    await enMain(page);
  }
  foto.amrap = amrap;
  paso('amrap');

  // --- Racha de HIIT después de las sesiones de hoy.
  await iniciar(page, 'hiit', 'Tabata express');
  await page.waitForSelector('#btn-hiit-start');
  await correr(1);
  foto.rachaDespues = (await hiit()).racha;
  await page.locator('#btn-entrenamiento-volver').click();
  await correr(0.5);
  await enMain(page);

  // --- Un HIIT en curso al salir: con Volver, yendo a otra vista, con el
  // botón atrás y al recargar. La Fase 9f cambia este bloque a propósito.
  foto.salida = await recorrerSalidaHiit(page, hiit, correr);
  paso('salida HIIT');

  // ================= Descanso activo =================
  await iniciar(page, 'gym', 'Día 7 · Movilidad');
  await page.waitForSelector('#btn-descanso-activo-hecho');
  foto.descansoActivo = { texto: await page.$eval('#entrenamiento-sub-content', (e) => e.textContent.replace(/\s+/g, '')) };
  await capturar('descanso-activo');
  const eventos = () => page.evaluate(async () => (await (await import('/js/core/idb.js')).getAll('events')).filter((e) => e.tipo === 'descanso_activo_completado').map((e) => JSON.stringify(e.payload)).sort());
  foto.descansoActivo.antes = await eventos();
  await page.locator('#btn-descanso-activo-hecho').click();
  await enMain(page);
  foto.descansoActivo.despues = await eventos();
  paso('descanso activo');

  // ================= Hojas de la sesión de GYM =================
  await iniciar(page, 'gym', (await page.evaluate(async () => { const { db } = await import('/js/core/db.js'); return (await db.getRutinas()).filter((r) => r.categoria === 'gym' && r.ejercicios.length).map((r) => r.nombre).sort()[0]; })));
  await page.waitForSelector('#btn-finalizar-sesion');
  const hojas = {};
  // Técnica del primer ejercicio que la tenga.
  const conTecnica = await page.evaluate(() => [...document.querySelectorAll('.ejercicio-sesion-block')].findIndex((b) => b.querySelector('.btn-info-ejercicio')));
  await page.locator(`#sesion-riel .sesion-tab[data-ej-idx="${conTecnica}"]`).click();
  let bloque = page.locator('.ejercicio-sesion-block:not([hidden])');
  await bloque.locator('.btn-ej-menu').click();
  await bloque.locator('.btn-info-ejercicio').click(); await correr(0.1);
  await page.waitForTimeout(100);
  hojas.tecnica = await hoja();
  paso('técnica leída');
  await capturar('hoja-tecnica');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Con Escape la técnica de antes no se cierra (no tiene id): se cierra con su botón.
  if (await page.locator('.modal-overlay.open').count()) await page.locator('.modal-overlay.open button[aria-label="Cerrar"]').last().click();
  await page.waitForTimeout(200);
  // Descanso del primer ejercicio.
  await page.locator('#sesion-riel .sesion-tab[data-ej-idx="0"]').click();
  bloque = page.locator('.ejercicio-sesion-block:not([hidden])');
  await bloque.locator('.btn-ej-menu').click();
  await bloque.locator('.btn-descanso-ej').click(); await correr(0.1);
  await page.waitForSelector('#descanso-ej-modal.open');
  paso('hoja descanso');
  hojas.descanso = await hoja('descanso-ej-modal');
  await capturar('hoja-descanso');
  await page.locator('#descanso-ej-modal [data-delta="15"]').click();
  await page.waitForTimeout(200);
  hojas.descansoMas15 = await hoja('descanso-ej-modal');
  await page.locator('#descanso-ej-general').click();
  await page.waitForTimeout(200);
  hojas.descansoGeneral = await hoja('descanso-ej-modal');
  await page.locator('#descanso-ej-listo').click();
  await page.waitForTimeout(300);
  // Buscador de ejercicios (+ del riel).
  paso('buscador');
  await page.locator('#btn-add-ejercicio-live').click();
  await page.waitForSelector('#buscador-ejercicios-modal.open');
  hojas.buscador = (await hoja('buscador-ejercicios-modal')).botones.length;
  await page.locator('#picker-search').fill('sentadilla');
  hojas.buscadorSentadilla = (await hoja('buscador-ejercicios-modal')).botones;
  await capturar('hoja-buscador');
  await page.locator('#picker-search').fill('Remo raro');
  hojas.buscadorSinResultados = await hoja('buscador-ejercicios-modal');
  await page.goBack();
  await page.waitForSelector('#buscador-ejercicios-modal', { state: 'detached' });
  // ¿Salir? con una serie hecha.
  paso('salir');
  await page.evaluate(() => { const c = document.getElementById('toast-container'); if (c) c.innerHTML = ''; });
  await page.locator('#btn-sesion-principal').click();
  if (await page.locator('#hud-descanso:not([hidden])').count()) await page.locator('#btn-descanso-saltar').click();
  await page.locator('#btn-sesion-salir').click();
  await page.waitForSelector('#sesion-salir-modal.open');
  hojas.salir = await hoja('sesion-salir-modal');
  await capturar('hoja-salir');
  await page.locator('#sesion-salir-modal [data-valor="salir"]').click();
  await enMain(page);
  await page.locator('[data-ent-tab="inicio"]').click();
  await page.waitForSelector('#btn-sesion-en-curso-retomar');
  // Duración larga: retomada 13 h después.
  paso('duración larga');
  await page.clock.setSystemTime(new Date((await page.evaluate(() => Date.now())) + 13 * 3600 * 1000));
  await page.locator('#btn-sesion-en-curso-retomar').click();
  await page.waitForSelector('#btn-finalizar-sesion');
  await page.locator('#btn-finalizar-sesion').click();
  await page.waitForSelector('#sesion-duracion-modal.open');
  hojas.duracionLarga = await hoja('sesion-duracion-modal');
  await capturar('hoja-duracion');
  await page.locator('#sesion-duracion-modal [data-valor="60"]').click();
  await page.waitForSelector('#sesion-resumen:not([hidden]) #btn-resumen-guardar');
  await page.locator('#btn-resumen-guardar').click();
  await page.waitForFunction(() => !Object.keys(localStorage).some((k) => /sesionEnCurso/.test(k)));
  await enMain(page);
  hojas.duracionGuardada = (await ultimaSesion(page)).duracionMin;
  // Desde acá el reloj corre (las hojas que siguen abren con setTimeout).
  await page.clock.resume();
  paso('hojas de la sesión');

  // ================= Detalle y edición de una sesión =================
  await page.locator('[data-ent-tab="progreso"]').click();
  await page.locator('#link-historial-sesiones').click();
  await page.waitForSelector('.hist-sesion');
  await page.locator('.hist-sesion').nth(1).click();
  await page.waitForSelector('#sesion-detalle-modal.open #btn-sesion-editar');
  hojas.detalle = await hoja('sesion-detalle-modal');
  await capturar('hoja-detalle');
  await page.locator('#btn-sesion-editar').click();
  await page.waitForSelector('#sesion-edicion-form');
  hojas.edicion = await hoja('sesion-detalle-modal');
  await capturar('hoja-edicion');
  await page.locator('#ed-duracion').fill('');
  await page.locator('#sesion-edicion-form button[type="submit"]').click();
  hojas.edicionError = await page.$eval('#sesion-edicion-error', (e) => e.textContent);
  await page.locator('#ed-duracion').fill('50');
  await page.locator('#sesion-edicion-form button[type="submit"]').click();
  await page.waitForSelector('#sesion-detalle-modal.open #btn-sesion-editar');
  hojas.detalleEditado = await hoja('sesion-detalle-modal');
  await page.goBack();
  await page.waitForFunction(() => !document.getElementById('sesion-detalle-modal')?.classList.contains('open'));
  await page.locator('#btn-entrenamiento-volver').click();
  await enMain(page);
  paso('detalle y edición');

  // ================= Generador =================
  for (const cat of ['gym', 'calistenia']) {
    await irARutinas(page, cat, false);
    await page.locator('#btn-generar-rutina').click();
    await page.waitForSelector('#generador-config-modal.open');
    hojas[`generador_${cat}`] = await hoja('generador-config-modal');
    if (cat === 'gym') await capturar('hoja-generador');
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('generador-config-modal')?.classList.contains('open'));
  }

  // ================= Medidas y fotos =================
  await ir(page, 'entrenamiento');
  await page.locator('[data-ent-tab="progreso"]').click();
  await page.locator('#btn-cuerpo-registrar').click();
  await page.waitForSelector('#medida-modal.open');
  hojas.medida = await hoja('medida-modal');
  await capturar('hoja-medida');
  await page.locator('#medida-pesoKg').fill('80,5');
  await page.locator('#medida-guardar').click();
  await page.waitForFunction(() => !document.getElementById('medida-modal')?.classList.contains('open'));
  hojas.medidaGuardada = await page.evaluate(async () => { const { db } = await import('/js/core/db.js'); const m = (await db.getMedidas())[0]; return { fecha: m.fecha, pesoKg: m.pesoKg }; });
  await page.locator('#btn-cuerpo-historial').click();
  await page.waitForSelector('.o-ent-foto');
  await page.locator('.o-ent-foto').first().click();
  await page.waitForSelector('#foto-modal.open');
  hojas.foto = await hoja('foto-modal');
  await capturar('hoja-foto');
  await page.locator('#foto-cerrar').click();
  await page.waitForFunction(() => !document.getElementById('foto-modal')?.classList.contains('open'));
  await page.locator('#btn-fotos-comparar').click();
  await page.waitForSelector('#foto-comparar-modal.open');
  hojas.comparar = { ...(await hoja('foto-comparar-modal')), opciones: await page.$$eval('#foto-sel-antes option', (os) => os.map((o) => o.textContent)) };
  await page.locator('#foto-comparar-cerrar').click();
  await page.waitForFunction(() => !document.getElementById('foto-comparar-modal')?.classList.contains('open'));
  await page.locator('#btn-entrenamiento-volver').click();
  await enMain(page);
  paso('medidas y fotos');

  // ================= Perfil y nivel (desde Configuración) =================
  await ir(page, 'configuracion');
  await page.locator('#btn-cfg-perfil').click();
  await page.waitForSelector('#profile-modal.open');
  hojas.perfil = await hoja('profile-modal');
  await capturar('hoja-perfil');
  await page.locator('#profile-peso').fill('72.5');
  await page.locator('#btn-save-profile').click();
  await page.waitForFunction(() => !document.getElementById('profile-modal')?.classList.contains('open'));
  hojas.perfilGuardado = await page.evaluate(async () => { const { db } = await import('/js/core/db.js'); const p = await db.getProfile(); return { pesoKg: p.pesoKg, estaturaCm: p.estaturaCm, edad: p.edad, sexo: p.sexo, nivelActividad: p.nivelActividad, meta: p.meta }; });
  await page.locator('#btn-cfg-nivel').click();
  await page.waitForSelector('#nivel-onboarding-modal.open');
  hojas.nivel1 = await hoja('nivel-onboarding-modal');
  await capturar('hoja-nivel');
  await page.locator('.nivel-onboarding-tiempo-btn[data-value="1-3"]').click();
  hojas.nivel2 = await hoja('nivel-onboarding-modal');
  await page.locator('.nivel-onboarding-dias-btn[data-value="4"]').click();
  hojas.nivel3 = await hoja('nivel-onboarding-modal');
  await page.locator('#nivel-onboarding-equipo-mancuernas').check();
  await page.locator('#btn-nivel-onboarding-finalizar').click();
  await page.waitForFunction(() => !document.getElementById('nivel-onboarding-modal')?.classList.contains('open'));
  hojas.nivelGuardado = await page.evaluate(async () => { const { db } = await import('/js/core/db.js'); const n = await db.getNivelEntrenamiento(); const c = await db.getGeneradorConfig(); return { tiempo: n.tiempoEntrenando, dias: c.diasSemana, equipo: c.equipoDisponible, duracion: c.duracionSesionMin }; });
  paso('perfil y nivel');
  foto.hojas = hojas;
  // Fase 9f: lo que guarda sesiones va al final (no mueve las cifras de arriba).
  foto.fin = await recorrerFinHiit(page, hiit, correr);
  paso('fin HIIT');
  return foto;
}

// --- Sesión en curso: tarjeta de Inicio, Retomar y Descartar -------------
function ayudasEnCurso(page, correr) {
  const tarjeta = () => page.evaluate(() => {
    const c = document.getElementById('entreno-sesion-en-curso');
    return c && c.checkVisibility() ? c.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  // La tarjeta vive en la pestaña Inicio.
  const alInicio = async () => {
    await enMain(page);
    if (await page.locator('[data-ent-tab="inicio"][aria-selected="false"]').count()) await page.locator('[data-ent-tab="inicio"]').click();
    await page.waitForSelector('[data-ent-tab="inicio"][aria-selected="true"]');
    await page.waitForTimeout(100);
  };
  const descartar = async () => {
    await alInicio();
    await page.locator('#btn-sesion-en-curso-descartar').click();
    await correr(0.1);
    await page.locator('#confirm-ok').click();
    await correr(0.5);
    await page.waitForSelector('#btn-sesion-en-curso-retomar', { state: 'detached' });
  };
  const recargar = async (pausa) => {
    await page.clock.resume();
    await page.reload();
    await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
    await page.clock.pauseAt(pausa);
    if (await page.evaluate(() => window.appRouter.currentView) !== 'entrenamiento') await ir(page, 'entrenamiento');
    await enMain(page);
  };
  const voz = () => page.evaluate(() => window.__voz.splice(0));
  // HIIT Tabata express con 10 s de trabajo.
  const arrancar = async (hiit) => {
    await iniciar(page, 'hiit', 'Tabata express');
    await page.waitForSelector('#btn-hiit-start');
    await correr(1);
    // Un aviso de antes (reloj detenido: no se va solo) taparía el botón.
    await page.evaluate(() => { const c = document.getElementById('toast-container'); if (c) c.innerHTML = ''; });
    await page.locator('#btn-hiit-start').click();
    await correr(10);
    await voz();
    return hiit();
  };
  return { tarjeta, alInicio, descartar, recargar, voz, arrancar };
}

// Qué pasa con un HIIT o un descanso activo en curso al salir (Fase 9f):
// el borrador queda, la pestaña Inicio muestra «Tienes una sesión en
// curso» y «Retomar» lo abre donde va según la hora real (el HIIT sigue
// corriendo mientras estás fuera, sin voz). Cada salida termina con
// Descartar, así la siguiente parte limpia y no se guarda nada.
async function recorrerSalidaHiit(page, hiit, correr) {
  const { tarjeta, alInicio, descartar, recargar, voz, arrancar } = ayudasEnCurso(page, correr);
  const salida = {};
  const salidas = {
    volver: async () => { await page.locator('#btn-entrenamiento-volver').click(); await correr(0.5); },
    otraVista: async () => { await ir(page, 'dashboard'); await correr(0.5); await ir(page, 'entrenamiento'); },
    atras: async () => { await page.goBack(); await correr(0.5); }
  };

  // --- HIIT: fuera 15 s, vuelve en el descanso de la ronda 1; 6 s después, ronda 2.
  salida.antes = await arrancar(hiit);
  for (const [nombre, salir] of Object.entries(salidas)) {
    if (nombre !== 'volver') await arrancar(hiit);
    await salir();
    await correr(15);
    const e = { hiitAbierto: await page.locator('#hiit-container').count() > 0, sesiones: await nSesiones(page), vozFuera: await voz() };
    await alInicio();
    e.tarjeta = await tarjeta();
    await page.locator('#btn-sesion-en-curso-retomar').click();
    await page.waitForSelector('#hiit-active-view', { state: 'visible' });
    e.retomado = await hiit();
    e.vozAlRetomar = await voz();
    await correr(6);
    e.seisSegundos = await hiit();
    e.voz6s = await voz();
    await salidas.volver();
    await descartar();
    e.sesionesTrasDescartar = await nSesiones(page);
    salida[nombre] = e;
  }

  // --- Descanso activo: sale sin marcarlo y lo retoma (también al recargar).
  const textoDescanso = () => page.$eval('#entrenamiento-sub-content', (e) => e.textContent.replace(/\s+/g, ''));
  salida.descanso = {};
  const conRecarga = { ...salidas, recarga: () => recargar(new Date(INICIO.getTime() + 1800 * 1000)) };
  for (const [nombre, salir] of Object.entries(conRecarga)) {
    await iniciar(page, 'gym', 'Día 7 · Movilidad');
    await page.waitForSelector('#btn-descanso-activo-hecho');
    await correr(60);
    await salir();
    await correr(60);
    await alInicio();
    const d = { tarjeta: await tarjeta() };
    await page.locator('#btn-sesion-en-curso-retomar').click();
    await page.waitForSelector('#btn-descanso-activo-hecho');
    d.retomado = await textoDescanso();
    await salidas.volver();
    await descartar();
    salida.descanso[nombre] = d;
  }

  // Como antes de la 9f, la foto sigue desde una recarga a la hora y media.
  await recargar(new Date(INICIO.getTime() + 3600 * 1000));
  return salida;
}

// Al final de la foto (guardan sesiones y no deben mover las cifras de las
// secciones anteriores). El reloj corre de verdad desde la sesión larga, así
// que se registran duraciones y textos relativos al inicio, no la fecha.
async function recorrerFinHiit(page, hiit, correr) {
  const { tarjeta, alInicio, recargar, voz, arrancar } = ayudasEnCurso(page, correr);
  const sinFecha = (s) => s && { ...s, fecha: undefined };
  const fin = {};
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  paso('fin: arrancar');

  // --- Recarga una hora después: el HIIT terminó fuera de la pantalla, así
  // que «Retomar» pide el resumen y lo guarda con su duración real (4 min).
  await arrancar(hiit);
  const inicio = await page.evaluate(() => JSON.parse(localStorage.getItem('vanguard.sesionEnCurso')).inicio);
  paso('fin: recarga');
  await recargar(new Date(inicio + 3600 * 1000));
  paso('fin: retomar terminado');
  const r = { sesiones: await nSesiones(page) };
  await alInicio();
  r.tarjeta = await tarjeta();
  await page.locator('#btn-sesion-en-curso-retomar').click();
  await page.waitForSelector('#hiit-active-view', { state: 'visible' });
  await correr(0.1);
  await page.waitForSelector('#session-summary-modal.open');
  await correr(0.1);
  r.hiit = await hiit();
  await page.locator('#btn-skip-summary').click();
  await page.waitForSelector('#hiit-summary-view', { state: 'visible' });
  r.fin = await hiit();
  r.guardada = sinFecha(await ultimaSesion(page));
  r.sesionesDespues = await nSesiones(page);
  r.voz = await voz();
  await page.locator('#btn-hiit-close').click();
  await alInicio();
  r.tarjetaDespues = await tarjeta();
  fin.recarga = r;

  // --- Atrás con la hoja del resumen abierta (antes la sesión se perdía):
  // cuenta como Omitir, la sesión queda guardada con su duración real y su
  // sesion_registrada sale una sola vez (también después de recargar).
  const eventosSesion = () => page.evaluate(async () => (await (await import('/js/core/idb.js')).getAll('events'))
    .filter((e) => e.tipo === 'sesion_registrada').map((e) => e.entidadId));
  const previos = await eventosSesion();
  paso('fin: resumen y atrás');
  await arrancar(hiit);
  await correr(70); // 1 min 20 s desde el inicio
  await page.locator('#btn-hiit-stop').click();
  await correr(0.1);
  await page.waitForSelector('#session-summary-modal.open');
  const a = { sesiones: await nSesiones(page) };
  await page.goBack();
  await correr(1);
  await page.waitForSelector('#hiit-summary-view', { state: 'visible' });
  a.hojaAbierta = await page.locator('#session-summary-modal.open').count() > 0;
  a.fin = await hiit();
  a.guardada = sinFecha(await ultimaSesion(page));
  a.sesionesDespues = await nSesiones(page);
  const nuevos = (await eventosSesion()).filter((id) => !previos.includes(id));
  a.eventosNuevos = nuevos.length;
  a.eventoEsLaSesion = nuevos[0] === (await page.evaluate(async () => (await (await import('/js/core/db.js')).db.getSesiones())[0]?.id));
  await page.locator('#btn-hiit-close').click();
  await alInicio();
  a.tarjeta = await tarjeta();
  await recargar(new Date(await page.evaluate(() => Date.now()) + 60 * 1000));
  await alInicio();
  a.tarjetaTrasRecargar = await tarjeta();
  a.eventosTrasRecargar = (await eventosSesion()).filter((id) => !previos.includes(id)).length;
  a.sesionesTrasRecargar = await nSesiones(page);
  fin.resumenAtras = a;
  return fin;
}

export async function tomarFotoHojas(browser, base, { ui = UI_MK3, capturas = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Santiago', locale: 'es-CL', serviceWorkers: 'allow' });
  await context.route(/supabase\.co/, (r) => r.abort());
  await context.clock.install({ time: AHORA_FOTO });
  await context.addInitScript(() => {
    let a = 20261125;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  await context.addInitScript(registrarSonidos);
  const page = await context.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/supabase\.co/.test(m.text() + (m.location()?.url || ''))) errores.push(m.text()); });
  try {
    paso('escenario');
    await prepararEscenario(page, base);
    if (capturas) fs.mkdirSync(capturas, { recursive: true });
    const capturar = capturas ? (n) => page.screenshot({ path: path.join(capturas, `${n}-390.png`) }) : undefined;
    const foto = await recorrerHojas(page, ui, capturar);
    return { ...foto, errores };
  } catch (e) {
    fs.mkdirSync(path.join(AQUI, 'salida'), { recursive: true });
    await page.screenshot({ path: path.join(AQUI, 'salida', 'hojas-error.png') }).catch(() => {});
    if (process.env.FOTO_LOG) console.log(await page.evaluate(() => location.hash + ' ' + JSON.stringify(history.state) + ' ' + document.body.innerText.slice(0, 300)).catch(() => ''));
    throw new Error(`${String(e.message).split(String.fromCharCode(10))[0]} (paso: ${ultimoPaso})`);
  } finally {
    await context.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const etiqueta = process.argv[2] || 'despues';
  const puerto = 8770;
  const srv = await servir(puerto);
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.supabase.co ~NOTFOUND'] });
  try {
    const salida = path.join(AQUI, 'salida', `hojas-${etiqueta}`);
    const ui = etiqueta === 'antes' ? UI_MK3 : UI_ORBITA;
    const foto = await tomarFotoHojas(browser, `http://127.0.0.1:${puerto}/`, { ui, capturas: salida });
    const destino = etiqueta === 'antes' ? ARCHIVO_ANTES_HOJAS : path.join(salida, 'foto.json');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(foto, null, 2) + '\n');
    console.log(`Foto "${etiqueta}" (${ui.nombre}) → ${path.relative(RAIZ, destino)} (errores de consola: ${foto.errores.length})`);
    if (etiqueta !== 'antes' && fs.existsSync(ARCHIVO_ANTES_HOJAS)) {
      const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_HOJAS, 'utf8')), foto);
      console.log(difs.length ? `${difs.length} diferencias:\n  ${difs.slice(0, 60).join('\n  ')}` : 'Sin diferencias con la foto de antes.');
      process.exitCode = difs.length ? 1 : 0;
    }
  } finally {
    await browser.close();
    srv.close();
  }
}
