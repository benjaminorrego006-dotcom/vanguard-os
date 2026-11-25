// tools/verificar/foto-sesion.mjs
// Foto de la sesión activa de Entreno (GYM y Calistenia) que migra la Fase
// 9d del rediseño: series, tiempos, descansos, volumen, niveles,
// sugerencias, récords, fatiga del mapa muscular, progreso de un ejercicio,
// resumen al finalizar y lo que queda guardado. Además, prueba que la
// sesión sobrevive a salir de Entreno, al botón atrás y a recargar la app
// (cada retomada debe quedar igual a como estaba).
//
// Uso (desde la raíz del repo, con Node portable en el PATH):
//   node tools/verificar/foto-sesion.mjs antes     → sesion-antes.json
//   node tools/verificar/foto-sesion.mjs despues   → salida/sesion-despues/foto.json
// verificar.mjs llama a tomarFotoSesion() y compara contra sesion-antes.json.
//
// Escenario: datos de demostración más una rutina de Calistenia y un
// descanso propio (120 s) para el primer ejercicio de la rutina de GYM, que
// agrega esta herramienta. Reloj simulado y detenido durante la sesión (el
// tiempo avanza solo cuando la herramienta lo pide), contexto limpio, zona
// America/Santiago y Supabase bloqueado.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { AHORA_FOTO, prepararEscenario, ir, servir, compararFotos } from './foto-finanzas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
export const ARCHIVO_ANTES_SESION = path.join(AQUI, 'sesion-antes.json');
// La sesión empieza a esta hora (el reloj queda detenido ahí).
const INICIO_SESION = new Date('2026-11-23T16:30:00-03:00');

let ultimoPaso = 'inicio';
const paso = (m) => { ultimoPaso = m; if (process.env.FOTO_LOG) console.log('·', m); };

const datosGrafico = (id) => {
  const c = document.getElementById(id);
  const g = c && window.Chart ? window.Chart.getChart(c) : null;
  return g ? { labels: g.data.labels, series: g.data.datasets.map((d) => d.data.map((v) => (v === null ? null : Math.round(v * 1000) / 1000))) } : null;
};
// Fatiga pintada en un mapa: id del músculo → intensidad (solo las > 0).
const fatiga = (sel) => {
  const out = {};
  document.querySelectorAll(`${sel} .mk3-muscle-map__musculo`).forEach((p) => {
    const v = parseFloat(p.style.getPropertyValue('--intensidad'));
    if (v > 0) out[p.dataset.muscleId] = Math.round(v * 1000) / 1000;
  });
  return out;
};
const T = `const t = (el) => (el ? el.textContent.replace(/\\s+/g, ' ').trim() : null);
  const visible = (el) => !!el && !el.hidden && !el.closest('[hidden]') && getComputedStyle(el).display !== 'none';
  const datosGrafico = ${datosGrafico.toString()};
  const fatiga = ${fatiga.toString()};`;

// --- Lectura de la sesión ----------------------------------------------
// Por los ganchos de la sesión (ids y clases sesion-*/serie-*), que la
// migración conserva: el mismo lector sirve antes y después.
const leerSesion = new Function(`${T}
  const $ = (id) => document.getElementById(id);
  const desc = $('hud-descanso');
  return {
    barra: { titulo: t(document.querySelector('.sesion-barra-titulo h2')), categoria: t(document.querySelector('.sesion-barra-titulo h2 + div')) },
    hud: {
      tiempo: t($('session-timer')),
      series: t($('hud-series')),
      volumen: t($('hud-volumen')),
      volumenDe: visible($('hud-volumen-meta')) ? t($('hud-volumen-meta')) : null,
      variacion: visible($('hud-volumen-var')) ? t($('hud-volumen-var')) : null,
      records: t($('hud-records')),
      recordUltimo: t($('hud-record-ultimo')),
      recordActivo: !!$('hud-records-bloque')?.classList.contains('sesion-hud-rec--activo'),
      segmentos: [...($('hud-segmentos')?.children || [])].map((s) => (s.className.match(/sesion-hud-seg--(\\w+)/g) || []).map((c) => c.replace('sesion-hud-seg--', '')).join('+') || 'pendiente').join(' '),
      linea: t($('hud-linea-datos')),
      descansoGeneral: t($('rest-timer-config-value'))
    },
    descanso: desc && !desc.hidden ? {
      cuenta: t($('hud-descanso-cuenta')), total: t($('hud-descanso-total')),
      siguiente: t($('hud-descanso-siguiente')), resumen: t($('hud-descanso-resumen'))
    } : null,
    riel: [...document.querySelectorAll('#sesion-riel .sesion-tab[data-ej-idx]')].map((b) => ({
      nombre: t(b.querySelector('.sesion-tab-nombre')), prog: t(b.querySelector('.sesion-tab-prog')),
      terminado: !b.querySelector('.sesion-tab-check')?.hidden, activa: b.getAttribute('aria-selected') === 'true'
    })),
    superseries: [...document.querySelectorAll('#sesion-riel .sesion-riel-ss-etq')].map(t),
    ejercicios: [...document.querySelectorAll('.ejercicio-sesion-block')].map((b) => ({
      nombre: b.dataset.ejNombre,
      visible: !b.hidden,
      rotulo: t(b.querySelector('.sesion-ej-rotulo')),
      corporal: b.dataset.pesoCorporal === 'true',
      descansoClave: b.dataset.descansoClave,
      chips: [...b.querySelectorAll('.sesion-chip')].map((c) => t(c) + (c.dataset.peso !== undefined ? ' [' + c.dataset.peso + '/' + c.dataset.reps + ']' : '')),
      estancado: b.querySelector('.sesion-ej-estancado') ? t(b.querySelector('.sesion-ej-estancado')) : null,
      ayudaDescanso: visible(b.querySelector('.sesion-descanso-ayuda')) ? t(b.querySelector('.sesion-descanso-ayuda')) : null,
      series: [...b.querySelectorAll('.serie-row')].map((r) => ({
        n: t(r.querySelector('.serie-tipo-chip')),
        tipo: r.querySelector('.serie-tipo').value,
        anterior: t(r.querySelector('.serie-anterior')),
        peso: r.querySelector('.serie-peso').value,
        reps: r.querySelector('.serie-reps').value,
        rpe: r.querySelector('.serie-rpe').value,
        hecha: r.querySelector('.btn-check-serie').dataset.checked === 'true',
        toca: r.classList.contains('serie-row--toca'),
        record: r.classList.contains('serie-row--pr'),
        corporal: r.classList.contains('serie-row--corporal')
      })),
      notas: [...b.querySelectorAll('.serie-pr-nota, .serie-discos')].map(t),
      editor: b.hidden ? null : {
        titulo: t(b.querySelector('.sesion-editor-titulo')),
        peso: t(b.querySelector('.sesion-editor-valor[data-campo="peso"]')),
        reps: t(b.querySelector('.sesion-editor-valor[data-campo="reps"]')),
        rpe: t(b.querySelector('.sesion-rpe-chip[aria-pressed="true"]'))
      }
    })),
    principal: { modo: $('btn-sesion-principal')?.dataset.modo || null, texto: t($('btn-sesion-principal')) },
    fatiga: { frente: fatiga('#hud-mapa-frente'), espalda: fatiga('#hud-mapa-espalda') }
  };`);

const leerResumen = new Function(`${T}
  const r = document.getElementById('sesion-resumen');
  return {
    titulo: t(r.querySelector('#sesion-resumen-titulo')),
    sub: t(r.querySelector('#sesion-resumen-titulo + div')),
    datos: [...r.querySelectorAll('.sesion-resumen-hero dl > div')].map((d) => t(d.querySelector('dt')) + ': ' + t(d.querySelector('dd'))),
    records: r.querySelector('.sesion-resumen-records li') ? [...r.querySelectorAll('.sesion-resumen-records li')].map(t) : t(r.querySelector('.sesion-resumen-records p')),
    tabla: [...r.querySelectorAll('.sesion-resumen-tabla tbody tr')].map((tr) => [...tr.children].map(t).join(' | ')),
    fatiga: { frente: fatiga('#resumen-mapa-frente'), espalda: fatiga('#resumen-mapa-espalda') }
  };`);

// Progreso de un ejercicio dentro de la sesión (ejercicio-detalle.js).
export const UI_MK3 = {
  nombre: 'mk3',
  progreso: new Function('id', `${T}
    const c = document.getElementById(id);
    const hojas = [...c.querySelectorAll('*')].filter((e) => e.children.length === 0);
    const valorDe = (etq) => { const e = hojas.find((x) => t(x) === etq); return e ? t(e.previousElementSibling) : null; };
    return {
      titulo: t(c.querySelector('h4')),
      rm: valorDe('1RM estimado'),
      volumen: valorDe('Volumen última sesión'),
      prs: hojas.filter((e) => /🏆/.test(e.textContent)).map((e) => t(e.previousElementSibling) + ' · ' + t(e).replace('🏆', '').trim()),
      vacio: c.querySelector('canvas') ? null : t(c.querySelector('div > div:not(:has(*))'))
    };`)
};
export const UI_ORBITA = {
  nombre: 'orbita',
  progreso: new Function('id', `${T}
    const c = document.getElementById(id);
    const f = (k) => t(c.querySelector('[data-foto="' + k + '"]'));
    return {
      titulo: f('prog-titulo'),
      rm: f('prog-rm'),
      volumen: f('prog-vol'),
      prs: [...c.querySelectorAll('[data-foto="prog-pr"]')].map((e) => t(e.querySelector('[data-foto="prog-pr-fecha"]')) + ' · ' + t(e.querySelector('[data-foto="prog-pr-valor"]'))),
      vacio: c.querySelector('canvas') ? null : f('prog-vacio')
    };`)
};

// --- Escenario -----------------------------------------------------------

async function sembrar(page) {
  return page.evaluate(async () => {
    const { db } = await import('/js/core/db.js');
    const s = (n, reps) => Array.from({ length: n }, () => ({ tipo: 'normal', reps: String(reps), peso: '0', rpe: '' }));
    await db.crearRutina({
      nombre: 'Calistenia base', categoria: 'calistenia',
      ejercicios: [{ nombre: 'Flexiones (Push-up)', series: s(3, 12) }, { nombre: 'Dominadas', series: s(3, 6) }, { nombre: 'Fondos en Paralelas', series: s(2, 8) }]
    });
    const gym = (await db.getRutinas()).filter((r) => r.categoria === 'gym');
    const rutina = gym[0];
    await db.setDescansoEjercicio(db.claveDescansoEjercicio(rutina.ejercicios[0]), 120);
    return { gym: rutina.id, nombreGym: rutina.nombre };
  });
}

async function irARutinas(page, cat) {
  if (await page.evaluate(() => window.appRouter.currentView) !== 'entrenamiento') await ir(page, 'entrenamiento');
  await page.waitForSelector('#entrenamiento-main-view [data-ent-tab="rutinas"]');
  if (await page.locator('[data-ent-tab="rutinas"][aria-selected="false"]').count()) await page.locator('[data-ent-tab="rutinas"]').click();
  await page.waitForSelector('#ent-rutinas #btn-nueva-rutina');
  if (await page.locator(`[data-rut-cat="${cat}"][aria-pressed="false"]`).count()) {
    await page.locator(`[data-rut-cat="${cat}"]`).click();
    await page.waitForSelector(`[data-rut-cat="${cat}"][aria-pressed="true"]`);
  }
  await page.waitForSelector('#ent-rutinas .btn-iniciar-sesion');
}

const enSesion = async (page) => {
  await page.waitForSelector('#btn-finalizar-sesion');
  await page.waitForFunction(() => document.querySelectorAll('#hud-mapa-frente .mk3-muscle-map__musculo').length > 0);
};
const leer = (page) => page.evaluate(leerSesion);
// Sin lo que depende de la hora: para comparar una sesión retomada con la de antes.
const sinHora = (x) => {
  const c = JSON.parse(JSON.stringify(x));
  delete c.hud.tiempo; delete c.hud.linea;
  if (c.descanso) { delete c.descanso.cuenta; delete c.descanso.resumen; }
  if (c.principal.modo === 'descanso') delete c.principal.texto;
  return c;
};
const principal = async (page) => { await page.locator('#btn-sesion-principal').click(); };
const saltar = async (page) => {
  if (await page.locator('#hud-descanso:not([hidden])').count()) await page.locator('#btn-descanso-saltar').click();
};
const modo = (page) => page.$eval('#btn-sesion-principal', (b) => b.dataset.modo);
const tarjetaEnCurso = async (page) => {
  // La tarjeta «Tienes una sesión en curso» está en la pestaña Inicio.
  await page.waitForSelector('#entrenamiento-main-view [data-ent-tab="inicio"]');
  if (await page.locator('[data-ent-tab="inicio"][aria-selected="false"]').count()) await page.locator('[data-ent-tab="inicio"]').click();
  await page.waitForSelector('#btn-sesion-en-curso-retomar');
  return page.$eval('#entreno-sesion-en-curso', (e) => e.textContent.replace(/\s+/g, ' ').replace('Retomar', '').replace('Descartar', '').trim());
};
const retomar = async (page) => { await page.locator('#btn-sesion-en-curso-retomar').click(); await enSesion(page); };

// capturar(nombre): captura de pantalla opcional en cada estado (no cambia la foto).
export async function recorrerSesion(page, ui, capturar = async () => {}) {
  const foto = {};
  const ids = await sembrar(page);
  paso('sembrado');
  await page.reload();
  await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);

  // --- GYM ---
  await irARutinas(page, 'gym');
  await page.clock.pauseAt(INICIO_SESION);
  await page.locator(`.btn-iniciar-sesion[data-id="${ids.gym}"]`).click();
  await enSesion(page);
  paso('sesión GYM abierta');
  foto.inicio = await leer(page);

  // Reloj: detenido durante la sesión y fijado en horas exactas (segundos
  // desde el inicio) antes de cada lectura; corre libre solo mientras se
  // navega (salir, atrás, recargar, guardar), que espera temporizadores.
  const fijar = (seg) => page.clock.pauseAt(new Date(INICIO_SESION.getTime() + seg * 1000));
  const soltar = () => page.clock.resume();

  // Serie 1 → descanso propio del ejercicio (120 s).
  await principal(page);
  foto.descanso = await leer(page);
  await fijar(30);
  foto.descanso30s = await leer(page);
  await capturar('descanso');
  await page.locator('#btn-descanso-mas').click();
  foto.descansoMas15 = await leer(page);
  await page.locator('#btn-descanso-menos').click();
  await page.locator('#btn-descanso-menos').click();
  foto.descansoMenos30 = await leer(page);
  await saltar(page);
  foto.trasSaltar = await leer(page);
  paso('descanso');

  // Resto del primer ejercicio, sumando y restando con el editor.
  await page.locator('.ejercicio-sesion-block:not([hidden]) .sesion-editor-btn[data-campo="reps"][data-paso="1"]').click();
  await page.locator('.ejercicio-sesion-block:not([hidden]) .sesion-rpe-chip[data-rpe="9"]').click();
  const enPrimero = async () => (await page.locator('.ejercicio-sesion-block[data-ej-idx="0"]:not([hidden])').count()) > 0;
  for (let i = 0; i < 8 && (await modo(page)) === 'completar' && (await enPrimero()); i++) { await principal(page); await saltar(page); }
  foto.primerEjercicio = await leer(page);
  paso('primer ejercicio');

  // Segundo ejercicio (con PR e historial): la sugerencia aplicada a las
  // series sin marcar, una serie, un récord y el descanso queda corriendo.
  if ((await modo(page)) === 'siguiente') await principal(page);
  await page.waitForSelector('.ejercicio-sesion-block[data-ej-idx="1"]:not([hidden])');
  const sug = page.locator('.ejercicio-sesion-block:not([hidden]) .btn-sugerencia');
  foto.conSugerencia = (await sug.count()) > 0;
  if (foto.conSugerencia) { await sug.click(); foto.trasSugerencia = await leer(page); }
  await principal(page);
  await saltar(page);
  const fila2 = page.locator('.ejercicio-sesion-block:not([hidden]) .serie-row').nth(1);
  await fila2.locator('.serie-peso').fill('200');
  await fila2.locator('.serie-peso').dispatchEvent('change');
  await principal(page);
  foto.record = await leer(page);
  await capturar('record');
  await saltar(page);
  await principal(page);
  await fijar(40);
  foto.antesDeSalir = await leer(page);

  // Sobrevive 1: ✕ (con series marcadas pregunta; «Salir» deja el
  // borrador), otra vista y de vuelta a Entreno, con el descanso corriendo.
  await soltar();
  await page.locator('#btn-sesion-salir').click();
  await page.locator('#sesion-salir-modal [data-valor="salir"]').click();
  await tarjetaEnCurso(page);
  await ir(page, 'dashboard');
  await ir(page, 'entrenamiento');
  await tarjetaEnCurso(page);
  await fijar(100);
  foto.tarjetaTrasSalir = await tarjetaEnCurso(page);
  await retomar(page);
  await fijar(101);
  foto.retomadaTrasSalir = await leer(page);
  paso('retomada tras salir');

  // Sobrevive 2: el botón atrás del sistema (sin descanso corriendo).
  await saltar(page);
  foto.antesDeAtras = await leer(page);
  await soltar();
  await page.goBack();
  await tarjetaEnCurso(page);
  await fijar(200);
  foto.tarjetaTrasAtras = await tarjetaEnCurso(page);
  await retomar(page);
  await fijar(201);
  foto.retomadaTrasAtras = await leer(page);
  paso('retomada tras atrás');

  // Sobrevive 3: recargar la app.
  await soltar();
  await page.reload();
  await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
  if (await page.evaluate(() => window.appRouter.currentView) !== 'entrenamiento') await ir(page, 'entrenamiento');
  await tarjetaEnCurso(page);
  await fijar(300);
  foto.tarjetaTrasRecarga = await tarjetaEnCurso(page);
  await retomar(page);
  await fijar(301);
  foto.retomadaTrasRecarga = await leer(page);
  paso('retomada tras recarga');
  // Lo que depende de la hora (cronómetro, cuenta del descanso) se compara
  // aparte: está en cada lectura y entra en la comparación antes/después.
  foto.sobrevive = {
    salir: compararFotos(sinHora(foto.antesDeSalir), sinHora(foto.retomadaTrasSalir)),
    atras: compararFotos(sinHora(foto.antesDeAtras), sinHora(foto.retomadaTrasAtras)),
    recarga: compararFotos(sinHora(foto.antesDeAtras), sinHora(foto.retomadaTrasRecarga))
  };

  // Progreso del segundo ejercicio (menú ⋯ › Progreso), peso y 1RM.
  await page.locator('#sesion-riel .sesion-tab[data-ej-idx="1"]').click();
  const b0 = page.locator('.ejercicio-sesion-block[data-ej-idx="1"]');
  await b0.locator('.btn-ej-menu').click();
  await b0.locator('.btn-ver-progreso').click();
  const contId = await b0.evaluate((b) => [...b.querySelectorAll('[id^="progreso-container-"]')][0].id);
  await soltar();
  await page.waitForFunction((id) => document.getElementById(id).children.length > 0, contId);
  await page.waitForTimeout(500);
  await fijar(400);
  const grafico = async () => page.evaluate(`(() => { ${T} return datosGrafico(${JSON.stringify(contId + '-chart')}); })()`);
  foto.progresoEjercicio = { ...(await page.evaluate(ui.progreso, contId)), peso: await grafico() };
  if (await page.locator(`#${contId}-chart-toggle [data-mode="1rm"]`).count()) {
    await page.locator(`#${contId}-chart-toggle [data-mode="1rm"]`).click();
    foto.progresoEjercicio.rm1 = await grafico();
  }
  await capturar('progreso-ejercicio');
  paso('progreso del ejercicio');

  // Finalizar a los 32 min: resumen y lo guardado.
  await fijar(32 * 60);
  foto.alFinalizar = (await leer(page)).hud;
  await page.locator('#btn-finalizar-sesion').click();
  await page.waitForSelector('#sesion-resumen:not([hidden]) #btn-resumen-guardar');
  foto.resumen = await page.evaluate(leerResumen);
  await capturar('resumen');
  await page.locator('[data-rpe-sesion="8"]').click();
  await page.locator('#btn-resumen-guardar').click();
  // registrarSesion toma la hora: el reloj sigue detenido hasta que termina.
  await page.waitForFunction(() => !Object.keys(localStorage).some((k) => /sesionEnCurso/.test(k)));
  await soltar();
  await page.waitForSelector('#entrenamiento-main-view [data-ent-tab]');
  foto.guardada = await page.evaluate(async () => {
    const { db } = await import('/js/core/db.js');
    const s = (await db.getSesiones())[0];
    return { nombreRutina: s.nombreRutina, fecha: s.fecha, duracionMin: s.duracionMin, rpe: s.rpe, completado: s.completado, ejercicios: s.ejercicios.map((e) => ({ nombre: e.nombre, series: e.series.map((x) => `${x.tipo} ${x.peso}×${x.reps} rpe ${x.rpe}`) })) };
  });
  foto.borradorTrasGuardar = await page.evaluate(() => Object.keys(localStorage).filter((k) => /sesionEnCurso/.test(k)));
  paso('guardada');

  // --- Calistenia: niveles y peso corporal ---
  await irARutinas(page, 'calistenia');
  await fijar(60 * 60);
  await page.locator('.btn-iniciar-sesion').first().click();
  await enSesion(page);
  foto.calistenia = await leer(page);
  await principal(page);
  foto.calistenia1 = await leer(page);
  await saltar(page);
  paso('calistenia');
  return foto;
}

export async function tomarFotoSesion(browser, base, { ui = UI_MK3, capturas = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Santiago', locale: 'es-CL', serviceWorkers: 'allow' });
  await context.route(/supabase\.co/, (r) => r.abort());
  await context.clock.install({ time: AHORA_FOTO });
  await context.addInitScript(() => {
    let a = 20261123;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  const page = await context.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/supabase\.co/.test(m.text() + (m.location()?.url || ''))) errores.push(m.text()); });
  try {
    paso('escenario');
    await prepararEscenario(page, base);
    if (capturas) fs.mkdirSync(capturas, { recursive: true });
    const capturar = capturas ? (n) => page.screenshot({ path: path.join(capturas, `${n}-390.png`) }) : undefined;
    const foto = await recorrerSesion(page, ui, capturar);
    if (capturas) {
      fs.mkdirSync(capturas, { recursive: true });
      for (const vp of [{ n: '390', w: 390, h: 844 }, { n: '1440', w: 1440, h: 900 }]) {
        paso(`capturas ${vp.n}`);
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(capturas, `calistenia-${vp.n}.png`) });
      }
    }
    return { ...foto, errores };
  } catch (e) {
    fs.mkdirSync(path.join(AQUI, 'salida'), { recursive: true });
    await page.screenshot({ path: path.join(AQUI, 'salida', 'sesion-error.png') }).catch(() => {});
    if (process.env.FOTO_LOG) console.log(await page.evaluate(() => location.hash + ' ' + JSON.stringify(history.state) + ' ' + document.body.innerText.slice(0, 300)).catch(() => ''));
    throw new Error(`${String(e.message).split(String.fromCharCode(10))[0]} (paso: ${ultimoPaso})`);
  } finally {
    await context.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const etiqueta = process.argv[2] || 'despues';
  const puerto = 8769;
  const srv = await servir(puerto);
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.supabase.co ~NOTFOUND'] });
  try {
    const salida = path.join(AQUI, 'salida', `sesion-${etiqueta}`);
    const ui = etiqueta === 'antes' ? UI_MK3 : UI_ORBITA;
    const foto = await tomarFotoSesion(browser, `http://127.0.0.1:${puerto}/`, { ui, capturas: salida });
    const destino = etiqueta === 'antes' ? ARCHIVO_ANTES_SESION : path.join(salida, 'foto.json');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(foto, null, 2) + '\n');
    console.log(`Foto "${etiqueta}" (${ui.nombre}) → ${path.relative(RAIZ, destino)} (errores de consola: ${foto.errores.length})`);
    const sob = foto.sobrevive;
    console.log(`Sobrevive: salir ${sob.salir.length ? 'NO ' + sob.salir.slice(0, 2).join(' | ') : 'sí'} · atrás ${sob.atras.length ? 'NO ' + sob.atras.slice(0, 2).join(' | ') : 'sí'} · recarga ${sob.recarga.length ? 'NO ' + sob.recarga.slice(0, 2).join(' | ') : 'sí'}`);
    if (etiqueta !== 'antes' && fs.existsSync(ARCHIVO_ANTES_SESION)) {
      const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_SESION, 'utf8')), foto);
      console.log(difs.length ? `${difs.length} diferencias:\n  ${difs.slice(0, 40).join('\n  ')}` : 'Sin diferencias con la foto de antes.');
      process.exitCode = difs.length ? 1 : 0;
    }
  } finally {
    await browser.close();
    srv.close();
  }
}
