// tools/verificar/foto-entreno.mjs
// Foto de las cifras de Entreno (Fase 9 del rediseño): lo que muestra la
// pantalla de inicio de Entreno (nivel, «Hoy toca», racha, anillos por
// categoría, volumen semanal, sesiones, IMC, Cuerpo y sugerencias de
// nivel) y lo que calcula db.js, para comparar antes y después de cambiar
// la interfaz.
//
// Uso (desde la raíz del repo, con Node portable en el PATH):
//   node tools/verificar/foto-entreno.mjs antes     → entreno-antes.json
//   node tools/verificar/foto-entreno.mjs despues   → salida/entreno-despues/foto.json
// verificar.mjs llama a tomarFotoEntreno() y compara contra entreno-antes.json.
//
// Escenario: los datos de demostración (perfil, nivel, rutinas y ~20
// sesiones en 60 días), con el mismo reloj simulado que la foto de
// Finanzas. Reglas de CLAUDE.md: contexto limpio, zona America/Santiago,
// reloj simulado y Supabase bloqueado.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { AHORA_FOTO, prepararEscenario, ir, servir, compararFotos } from './foto-finanzas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
export const ARCHIVO_ANTES_ENTRENO = path.join(AQUI, 'entreno-antes.json');
const CATS = ['gym', 'calistenia', 'hiit'];

// Las sugerencias de nivel se pintan después del primer render (leen el
// historial): se esperan un momento; si no hay, la tarjeta queda vacía.
async function esperarSugerencias(page, selector) {
  await page.waitForFunction((s) => document.querySelector(s), selector, { timeout: 4000 }).catch(() => {});
}

// Interfaz MK III (antes de la Fase 9).
async function leerUiMk3(page) {
  await ir(page, 'entrenamiento');
  await page.waitForSelector('#entrenamiento-main-view');
  await esperarSugerencias(page, '#sugerencias-nivel');
  return page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    const main = document.getElementById('entrenamiento-main-view');
    const tarjeta = (rotulo) => [...main.querySelectorAll('.card')].find((c) => t(c.firstElementChild) === rotulo);
    const btnHoy = document.getElementById('btn-hoy-toca-empezar');
    const hoyCard = btnHoy?.closest('.card');
    const vol = tarjeta('Volumen semanal');
    const imc = tarjeta('IMC');
    const racha = t(main).match(/🔥\s*(\d+) días? seguidos?/);
    return {
      nivel: t(main.querySelector('h1 + div')),
      hoyToca: hoyCard ? { nombre: t(hoyCard.firstElementChild.children[1]), categoria: t(hoyCard.firstElementChild.children[2]) } : null,
      racha: racha ? Number(racha[1]) : 0,
      categorias: Object.fromEntries(['gym', 'calistenia', 'hiit'].map((c) => {
        const el = main.querySelector(`.btn-explorar[data-cat="${c}"]`);
        return [c, { anillo: t(el.querySelector('svg text')), ultima: t(el.querySelector('p')) }];
      })),
      volumen: {
        actual: t(vol.querySelector('span')),
        delta: t(vol.querySelector('span.num')),
        puntos: [...vol.querySelectorAll('svg text')].map(t).filter((x) => !/^S\d+$/.test(x))
      },
      sesionesSemana: t(tarjeta('Sesiones').querySelector('.num')),
      imc: { valor: t(imc.querySelector('.num')), categoria: t(imc.querySelector('.num')?.parentElement?.nextElementSibling) },
      cuerpo: { peso: t(document.querySelector('#entreno-cuerpo .cuerpo-peso')), sub: t(document.querySelector('#entreno-cuerpo .cuerpo-sub')) },
      sugerencias: {
        titulo: t(document.querySelector('#sugerencias-nivel summary')),
        filas: [...document.querySelectorAll('.sugerencia-nivel')].map((f) => ({ rama: f.dataset.rama, texto: [...f.children].slice(0, 3).map(t) }))
      },
      tarjetaPerfil: !!document.getElementById('entreno-tarjeta-perfil'),
      sesionEnCurso: !!document.getElementById('entreno-sesion-en-curso'),
      enlaces: { historial: !!document.getElementById('link-historial-sesiones'), progreso: !!document.getElementById('link-ver-progreso-completo') }
    };
  });
}

// Interfaz Órbita (Fase 9): cada dato lleva data-foto en la vista.
export async function leerUiOrbitaEntreno(page) {
  await ir(page, 'entrenamiento');
  await page.waitForSelector('[data-foto="nivel"]');
  await esperarSugerencias(page, '#sugerencias-nivel');
  const inicio = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    const f = (k, raiz = document) => raiz.querySelector(`[data-foto="${k}"]`);
    const hoy = f('hoy-toca');
    const vol = f('volumen');
    return {
      nivel: t(f('nivel')),
      hoyToca: hoy ? { nombre: t(f('hoy-nombre', hoy)), categoria: t(f('hoy-cat', hoy)) } : null,
      racha: Number(f('racha')?.dataset.valor || 0),
      categorias: Object.fromEntries(['gym', 'calistenia', 'hiit'].map((c) => {
        const el = document.querySelector(`[data-foto="cat"][data-cat="${c}"]`);
        return [c, { anillo: t(el.querySelector('.o-anillo-centro')), ultima: t(f('cat-ultima', el)) }];
      })),
      volumen: {
        actual: t(vol.querySelector('span')),
        delta: t(vol.querySelector('span.num')),
        puntos: [...vol.querySelectorAll('svg text')].map(t).filter((x) => !/^S\d+$/.test(x))
      },
      sesionesSemana: t(f('sesiones')),
      imc: { valor: t(f('imc-valor')), categoria: t(f('imc-cat')) },
      sugerencias: {
        titulo: t(document.querySelector('#sugerencias-nivel summary')),
        filas: [...document.querySelectorAll('.sugerencia-nivel')].map((x) => ({ rama: x.dataset.rama, texto: [...x.querySelectorAll('[data-foto^="sug-"]')].map(t) }))
      },
      tarjetaPerfil: !!document.getElementById('entreno-tarjeta-perfil'),
      sesionEnCurso: !!document.getElementById('entreno-sesion-en-curso')
    };
  });
  // Cuerpo y los enlaces al historial y al progreso viven en la pestaña Progreso.
  await page.locator('[data-ent-tab="progreso"]').click();
  await page.waitForSelector('#entreno-cuerpo');
  const { cuerpo, enlaces } = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    return {
      cuerpo: { peso: t(document.querySelector('[data-foto="cuerpo-peso"]')), sub: t(document.querySelector('[data-foto="cuerpo-sub"]')) },
      enlaces: { historial: !!document.getElementById('link-historial-sesiones'), progreso: !!document.getElementById('link-ver-progreso-completo') }
    };
  });
  await page.locator('[data-ent-tab="inicio"]').click();
  const { sugerencias, tarjetaPerfil, sesionEnCurso, ...resto } = inicio;
  // Mismo orden de claves que la foto MK III.
  return { ...resto, cuerpo, sugerencias, tarjetaPerfil, sesionEnCurso, enlaces };
}

// Lo que calcula db.js (no depende de la interfaz).
async function leerDatos(page) {
  return page.evaluate(async () => {
    const { db } = await import('/js/core/db.js');
    const { calcularHoyToca } = await import('/js/utils/hoyToca.js');
    const [sesiones, rutinas, resumen, racha, tendencia] = await Promise.all([
      db.getSesiones(), db.getRutinas(), db.getResumenEntrenoSemanal(), db.getRachaGeneral(), db.getTendenciaSemanal(null, 6)
    ]);
    const hoy = await calcularHoyToca(sesiones);
    return {
      sesiones: sesiones.length,
      rutinasPorCategoria: Object.fromEntries(['gym', 'calistenia', 'hiit'].map((c) => [c, rutinas.filter((r) => r.categoria === c).map((r) => r.nombre).sort()])),
      resumenSemanal: resumen,
      racha: { actual: racha.actual },
      volumenPorSemana: tendencia.volumenPorSemana,
      hoyToca: hoy ? hoy.nombre : null
    };
  });
}

export async function tomarFotoEntreno(browser, base, { leerUi = leerUiMk3, capturas = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Santiago', locale: 'es-CL', serviceWorkers: 'allow' });
  await context.route(/supabase\.co/, (r) => r.abort());
  await context.clock.install({ time: AHORA_FOTO });
  const page = await context.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/supabase\.co/.test(m.text() + (m.location()?.url || ''))) errores.push(m.text()); });
  try {
    await prepararEscenario(page, base);
    const ui = await leerUi(page);
    if (capturas) {
      fs.mkdirSync(capturas, { recursive: true });
      for (const vp of [{ n: '390', w: 390, h: 844 }, { n: '1440', w: 1440, h: 900 }]) {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await ir(page, 'dashboard');
        await ir(page, 'entrenamiento');
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(capturas, `entreno-inicio-${vp.n}.png`), fullPage: true });
        const pestanas = await page.$$eval('[data-ent-tab]', (els) => els.map((e) => e.dataset.entTab));
        for (const tab of pestanas) {
          await page.locator(`[data-ent-tab="${tab}"]`).click();
          await page.waitForTimeout(800);
          await page.screenshot({ path: path.join(capturas, `entreno-${tab}-${vp.n}.png`), fullPage: true });
        }
      }
    }
    const datos = await leerDatos(page);
    return { ui, datos, errores };
  } finally {
    await context.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const etiqueta = process.argv[2] || 'despues';
  const puerto = 8768;
  const srv = await servir(puerto);
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.supabase.co ~NOTFOUND'] });
  try {
    const salida = path.join(AQUI, 'salida', `entreno-${etiqueta}`);
    const foto = await tomarFotoEntreno(browser, `http://127.0.0.1:${puerto}/`, { capturas: salida, leerUi: etiqueta === 'antes' ? leerUiMk3 : leerUiOrbitaEntreno });
    const destino = etiqueta === 'antes' ? ARCHIVO_ANTES_ENTRENO : path.join(salida, 'foto.json');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(foto, null, 2) + '\n');
    console.log(`Foto "${etiqueta}" → ${path.relative(RAIZ, destino)} (errores de consola: ${foto.errores.length})`);
    if (etiqueta !== 'antes' && fs.existsSync(ARCHIVO_ANTES_ENTRENO)) {
      const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_ENTRENO, 'utf8')), foto);
      console.log(difs.length ? `Diferencias con la foto de antes:\n  ${difs.join('\n  ')}` : 'Idéntica a la foto de antes.');
    }
  } finally {
    await browser.close();
    srv.close();
  }
}
