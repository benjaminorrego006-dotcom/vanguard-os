// tools/verificar/foto-ritual.mjs
// Foto del Ritual matutino (Fase 10a del rediseño): lo que se ve en la
// vista (#dashboard/ritual), la misión «Tu ritual está pendiente» de Hoy, el
// «Hecho» de la hoja de Perfil y los eventos que emite marcarlo por la
// interfaz, para comparar antes y después de cambiar la interfaz.
//
// Uso (desde la raíz del repo, con Node en el PATH):
//   node tools/verificar/foto-ritual.mjs antes     → ritual-antes.json
//   node tools/verificar/foto-ritual.mjs despues   → salida/ritual-despues/foto.json
// verificar.mjs llama a tomarFotoRitual() y compara contra ritual-antes.json.
//
// Escenario: sin datos de demostración, con el reloj simulado en la mañana
// (la misión del ritual solo sale antes de las 12) y tres días seguidos de
// ritual antes de hoy, más uno suelto que no cuenta para la racha.
// Contexto limpio, zona America/Santiago y Supabase bloqueado.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { ir, servir, compararFotos, esperarFinOnboarding } from './foto-finanzas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
export const ARCHIVO_ANTES_RITUAL = path.join(AQUI, 'ritual-antes.json');
export const AHORA_RITUAL = new Date('2026-11-23T08:30:00-03:00');
const CAMPOS = ['mision', 'proyecto', 'pilar', 'servir', 'gratitud'];

const T = 'const t = (el) => (el ? el.textContent.replace(/\\s+/g, \' \').trim() : null);';

// --- Lectores de cada interfaz -------------------------------------------
export const UI_MK3 = {
  nombre: 'mk3',
  vista: new Function(`${T}
    const raiz = document.getElementById('view-root');
    const hero = raiz.querySelector('.card-hero');
    const lineas = hero ? [...hero.children[1].children].slice(0, 2).map(t) : [];
    const barra = hero ? hero.children[1].children[2]?.firstElementChild : null;
    const cards = [...raiz.querySelectorAll('.card:not(.card-hero)')];
    const campos = [...raiz.querySelectorAll('.ritual-campo')].map((c) => {
      const card = c.closest('.card');
      return {
        campo: c.dataset.campo,
        etiqueta: t(card.querySelector('label')),
        valor: c.value,
        placeholder: c.getAttribute('placeholder'),
        lleno: !/surface-border/.test(card.firstElementChild.getAttribute('style'))
      };
    });
    const energia = [...raiz.querySelectorAll('.ritual-energia')].map((b) => ({ n: Number(b.dataset.valor), activo: /accent-ritual\\)/.test(b.getAttribute('style').split('background:')[1] || '') }));
    const cardEnergia = raiz.querySelector('.ritual-energia')?.closest('.card');
    const completo = cards.find((c) => /Ritual completo/.test(c.textContent));
    return {
      titulo: t(raiz.querySelector('h1')),
      fecha: t(raiz.querySelector('h1')?.nextElementSibling),
      racha: lineas[0] || null,
      progreso: lineas[1] || null,
      pct: barra ? parseFloat(barra.style.width) : null,
      campos,
      energiaEtiqueta: t(cardEnergia?.querySelector('label')),
      energia,
      completo: completo ? [...completo.children].map(t) : null
    };`),
  campo: (k) => `.ritual-campo[data-campo="${k}"]`,
  energia: (n) => `.ritual-energia[data-valor="${n}"]`
};

export const UI_ORBITA = {
  nombre: 'orbita',
  vista: new Function(`${T}
    const raiz = document.querySelector('.o-rit');
    const f = (k, el = raiz) => t(el.querySelector('[data-foto="' + k + '"]'));
    const completo = raiz.querySelector('[data-foto="completo"]');
    return {
      titulo: f('titulo'),
      fecha: f('fecha'),
      racha: f('racha'),
      progreso: f('progreso'),
      pct: Number(raiz.querySelector('[data-foto="pct"]')?.dataset.pct ?? NaN),
      campos: [...raiz.querySelectorAll('.o-rit-campo')].map((card) => {
        const c = card.querySelector('textarea');
        return { campo: c.dataset.campo, etiqueta: t(card.querySelector('label')), valor: c.value, placeholder: c.getAttribute('placeholder'), lleno: card.classList.contains('o-rit-campo--lleno') };
      }),
      energiaEtiqueta: f('energia-etiqueta'),
      energia: [...raiz.querySelectorAll('.o-rit-energia')].map((b) => ({ n: Number(b.dataset.valor), activo: b.getAttribute('aria-pressed') === 'true' })),
      completo: completo ? [...completo.querySelectorAll('[data-foto^="completo-"]')].map(t) : null
    };`),
  campo: (k) => `.o-rit-campo textarea[data-campo="${k}"]`,
  energia: (n) => `.o-rit-energia[data-valor="${n}"]`
};

// --- Lecturas comunes (Hoy, Perfil y log) ---------------------------------
async function leerMision(page) {
  await ir(page, 'dashboard');
  await page.waitForSelector('.o-mazo, .o-mision, .o-vacio');
  return page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    const m = document.querySelector('[data-mision-id="ctx:ritual"]');
    if (!m) return null;
    return {
      rotulo: t(m.querySelector('.o-rotulo')),
      titulo: t(m.querySelector('.o-mision-titulo')),
      detalle: t(m.querySelector('.o-mision-detalle')),
      hecho: t(m.querySelector('[data-mision-accion="hecho"]')),
      modulo: [...m.classList].find((c) => c.startsWith('o-mod-')) || null
    };
  });
}

async function leerPerfil(page) {
  await page.locator('#btn-perfil, [data-abrir-perfil]').first().click();
  await page.waitForSelector('#perfil-overlay.open');
  await page.waitForFunction(() => document.getElementById('menu-ritual-hecho') !== null);
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ hecho: !document.getElementById('menu-ritual-hecho').hidden, href: document.querySelector('[data-menu-view="ritual"]').getAttribute('href') }));
  await page.keyboard.press('Escape');
  await page.waitForSelector('#perfil-overlay.open', { state: 'detached' }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('#perfil-overlay.open') && !(history.state && history.state.modalId));
  return r;
}

const eventosRitual = (page) => page.evaluate(async () => (await (await import('/js/core/idb.js')).getAll('events'))
  .filter((e) => e.modulo === 'ritual')
  .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))
  .map((e) => ({ tipo: e.tipo, entidadId: e.entidadId, payload: e.payload })));

const filaRitual = (page, fecha) => page.evaluate(async (f) => {
  const { db } = await import('/js/core/db.js');
  return db.getRitual(f);
}, fecha);

// La ruta es #dashboard/ritual (#ritual a secas redirige a Hoy); el router
// la monta como la vista 'ritual'.
async function abrirRitual(page, ui) {
  await page.evaluate(() => { location.hash = 'dashboard/ritual'; });
  await page.waitForFunction(() => window.appRouter.currentView === 'ritual'
    && /o-entrar/.test(document.getElementById('view-root').style.animation));
  await page.waitForSelector(ui.campo('mision'));
}

// Escribe un campo como lo haría la persona: texto y salir del campo
// (el ritual guarda en `change`). Espera el repintado.
async function escribir(page, ui, campo, texto) {
  await page.locator(ui.campo(campo)).fill(texto);
  await page.locator(ui.campo(campo)).blur();
  await page.waitForFunction(({ sel, texto }) => document.querySelector(sel)?.value === texto && document.activeElement?.tagName !== 'TEXTAREA', { sel: ui.campo(campo), texto });
  await page.waitForTimeout(300);
}

async function tocarEnergia(page, ui, n) {
  await page.locator(ui.energia(n)).click();
  await page.waitForTimeout(400);
}

// --- Recorrido -----------------------------------------------------------
export async function tomarFotoRitual(browser, base, { ui = UI_ORBITA, capturas = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Santiago', locale: 'es-CL', serviceWorkers: 'allow' });
  await context.route(/supabase\.co/, (r) => r.abort());
  await context.clock.install({ time: AHORA_RITUAL });
  const page = await context.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/supabase\.co/.test(m.text() + (m.location()?.url || ''))) errores.push(m.text()); });
  let ultimoPaso = 'inicio';
  const paso = (p) => { ultimoPaso = p; };
  const foto = { errores };
  try {
    paso('escenario');
    await page.goto(base + 'index.html');
    await page.locator('button:has-text("Saltar")').click({ timeout: 15000 });
    await esperarFinOnboarding(page);
    await page.evaluate(async () => {
      const { db } = await import('/js/core/db.js');
      for (const [fecha, mision] of [['2026-11-18', 'Suelto'], ['2026-11-20', 'Terminar el informe'], ['2026-11-21', 'Ordenar la casa'], ['2026-11-22', 'Descansar de verdad']]) {
        await db.setRitualCampo(fecha, 'mision', mision);
      }
      await db.setRitualCampo('2026-11-22', 'energia', 3);
    });
    await page.reload();
    await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
    const eventosPrevios = (await eventosRitual(page)).length;

    paso('hoy vacío');
    foto.hoyVacio = { mision: await leerMision(page), perfil: await leerPerfil(page) };

    paso('vista vacía');
    await abrirRitual(page, ui);
    foto.vacio = await page.evaluate(ui.vista);
    if (capturas) await capturar(page, capturas, 'vacio');

    paso('primer campo');
    await escribir(page, ui, 'mision', 'Cerrar la Fase 10');
    foto.unCampo = await page.evaluate(ui.vista);

    paso('resto de los campos');
    await escribir(page, ui, 'proyecto', 'Vanguard OS');
    await escribir(page, ui, 'pilar', 'Productividad');
    await escribir(page, ui, 'servir', 'A quien use la app');
    foto.cincoMenos = await page.evaluate(ui.vista);
    foto.hoyParcial = { mision: await leerMision(page) };
    await abrirRitual(page, ui);
    await escribir(page, ui, 'gratitud', 'Un café caliente');

    paso('energía');
    const toast = page.waitForSelector('.o-toast:has-text("Ritual completo")', { timeout: 10000 }).then(() => true).catch(() => false);
    await tocarEnergia(page, ui, 4);
    foto.toastCompleto = await toast;
    foto.completo = await page.evaluate(ui.vista);
    if (capturas) await capturar(page, capturas, 'completo');

    paso('hoy completo');
    foto.hoyCompleto = { mision: await leerMision(page), perfil: await leerPerfil(page) };

    paso('deseleccionar energía');
    await abrirRitual(page, ui);
    await tocarEnergia(page, ui, 4);
    foto.sinEnergia = await page.evaluate(ui.vista);
    await tocarEnergia(page, ui, 2);

    paso('recarga');
    await page.reload();
    await page.waitForFunction(() => window.appRouter && window.appRouter.currentView === 'ritual');
    await page.waitForSelector(ui.campo('mision'));
    foto.recargado = await page.evaluate(ui.vista);

    paso('log');
    foto.eventos = (await eventosRitual(page)).slice(eventosPrevios);
    foto.fila = await filaRitual(page, '2026-11-23');
    foto.campos = CAMPOS;
    return foto;
  } catch (e) {
    throw new Error(`${String(e.message).split(String.fromCharCode(10))[0]} (paso: ${ultimoPaso})`);
  } finally {
    await context.close();
  }
}

async function capturar(page, dir, nombre) {
  fs.mkdirSync(dir, { recursive: true });
  const vp = page.viewportSize();
  for (const [n, w, h] of [['390', 390, 844], ['1440', 1440, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(dir, `ritual-${nombre}-${n}.png`), fullPage: true });
  }
  await page.setViewportSize(vp);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const etiqueta = process.argv[2] || 'despues';
  const puerto = 8769;
  const srv = await servir(puerto);
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.supabase.co ~NOTFOUND'] });
  try {
    const salida = path.join(AQUI, 'salida', `ritual-${etiqueta}`);
    const ui = etiqueta === 'antes' ? UI_MK3 : UI_ORBITA;
    const foto = await tomarFotoRitual(browser, `http://127.0.0.1:${puerto}/`, { ui, capturas: salida });
    const destino = etiqueta === 'antes' ? ARCHIVO_ANTES_RITUAL : path.join(salida, 'foto.json');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(foto, null, 2) + '\n');
    console.log(`Foto "${etiqueta}" (${ui.nombre}) → ${path.relative(RAIZ, destino)} (errores de consola: ${foto.errores.length})`);
    if (etiqueta !== 'antes' && fs.existsSync(ARCHIVO_ANTES_RITUAL)) {
      const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_RITUAL, 'utf8')), foto);
      console.log(difs.length ? `${difs.length} diferencias:\n${difs.slice(0, 40).join('\n')}` : 'Sin diferencias con la foto de antes.');
    }
  } finally {
    await browser.close();
    srv.close();
  }
}
