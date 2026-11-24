// tools/verificar/foto-finanzas.mjs
// Foto de las cifras de Finanzas (Fase 8 del rediseño): saldos de cada
// sobre, arrastre mensual y totales del mes, para comparar antes y después
// de cambiar la interfaz.
//
// Uso (desde la raíz del repo, con Node portable en el PATH):
//   node tools/verificar/foto-finanzas.mjs antes     → finanzas-antes.json
//   node tools/verificar/foto-finanzas.mjs despues   → salida/finanzas-despues/foto.json
// verificar.mjs llama a tomarFoto() y compara contra finanzas-antes.json.
//
// Dos capas:
//  - "ui": lo que se ve en pantalla (cada monto tal como lo muestra la app),
//    leído por la interfaz real de Finanzas y de Hoy.
//  - "datos": lo que calcula db.getBudget() para agosto–noviembre (saldo,
//    arrastre, asignado, gastado y transferencias de cada sobre; ingresos,
//    gastos, ahorro y disponible del mes). Sirve para ver que el cálculo
//    del arrastre no se movió; no reemplaza a la capa "ui".
//
// Escenario: datos de demostración (cargados por Configuración, como en
// verificar.mjs) más tres casos que el arrastre tiene que cuidar y que la
// demo no trae. Se agregan con db.js desde la página (preparación, no
// verificación) y después se recarga, para que la app arranque con su
// caché de memoria vacía:
//  1. Suscripciones se pasa en octubre → saldo negativo que se arrastra.
//  2. Un sobre «Regalos» con gasto en octubre, archivado.
//  3. Un gasto anual («Patente»), que crea su sobre y ajusta su asignado.
// Reglas de CLAUDE.md: contexto limpio, zona America/Santiago, reloj
// simulado y Supabase bloqueado.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
export const AHORA_FOTO = new Date('2026-11-23T16:00:00-03:00');
export const ARCHIVO_ANTES = path.join(AQUI, 'finanzas-antes.json');
const MESES = ['2026-08', '2026-09', '2026-10', '2026-11'];

// Cada pestaña de Finanzas se abre con su botón. Selectores de la
// interfaz vigente (se actualizan junto con la vista, como SEL).
const PESTANA = (t) => `[data-tab="${t}"]`;

// --- Preparación ---
export async function prepararEscenario(page, base) {
  await page.goto(base + 'index.html');
  await page.locator('button:has-text("Saltar")').click({ timeout: 15000 });
  await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
  await page.evaluate(() => { location.hash = 'configuracion'; });
  await page.waitForFunction(() => window.appRouter.currentView === 'configuracion');
  await page.locator('#btn-cfg-demo').click();
  await page.locator('#confirm-ok').click();
  await page.waitForSelector('.o-toast:has-text("Datos de demostración cargados")', { timeout: 20000 });

  await page.evaluate(async () => {
    const { db } = await import('/js/core/db.js');
    const sobres = await db.getEnvelopes();
    const susc = sobres.find((e) => e.name === 'Suscripciones');
    await db.addTransaction({ type: 'Gasto', category: susc.category, amount: 60000, label: 'Plan anual de la nube', date: '2026-10-12', envelopeId: susc.id, goalId: null });
    const regalos = await db.createEnvelope({ name: 'Regalos', category: 'Wants', icon: 'default', assignedAmount: 30000 });
    await db.addTransaction({ type: 'Gasto', category: 'Wants', amount: 12000, label: 'Regalo de cumpleaños', date: '2026-10-05', envelopeId: regalos.id, goalId: null });
    await db.archivarSobre(regalos.id);
    await db.crearGastoAnual({ nombre: 'Patente', monto: 240000, mes: 3, dia: 31 });
  });
  await page.reload();
  await page.waitForFunction(() => window.appRouter && window.appRouter.currentView);
}

// --- Lectura de la interfaz ---
export const ir = async (page, vista) => {
  await page.evaluate((v) => { location.hash = v; }, vista);
  await page.waitForFunction((v) => window.appRouter.currentView === v.split('/')[0], vista);
};

// Texto visible de un elemento, con espacios normalizados.
const texto = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);

// Interfaz MK III (antes de la Fase 8).
async function leerUiMk3(page) {
  const ui = {};
  await ir(page, 'finanzas');
  await page.waitForSelector('#disponible-mes-value');
  await page.waitForTimeout(1500); // los montos de Resumen se animan 800 ms
  ui.resumen = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    const dia = t(document.querySelector('#daily-available-container'));
    return {
      balance: t(document.querySelector('#disponible-mes-value')),
      gastos: t(document.querySelector('#stat-expense')),
      ingresos: t(document.querySelector('#stat-income')),
      tendencia: t(document.querySelector('#month-trend-container')),
      porDia: t(document.querySelector('#daily-available-container .num')),
      restantes: (dia.match(/(-?\$[\d.]+) restantes/) || [])[1] || null,
      diasRestantes: Number((dia.match(/(\d+) días? del mes/) || [])[1]),
      categorias: Object.fromEntries([...document.querySelectorAll('#resumen-cat-legend > div')].map((d) => [t(d.firstElementChild), t(d.lastElementChild)])),
      recientes: [...document.querySelectorAll('#recent-tx-list .fin-row')].map((r) => ({ nombre: t(r.querySelector('.fin-name')), monto: t(r.querySelector('.fin-amt')) }))
    };
  });

  await page.locator(PESTANA('presupuesto')).click();
  ui.presupuesto = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    return {
      gastado: t(document.querySelector('#chart-donut-presupuesto + div > div:last-child')),
      categorias: Object.fromEntries([...document.querySelectorAll('#presupuesto-legend-container .legend-item')].map((c) => [t(c.querySelector('h3')), t(c.querySelector('.fin-bc-figures'))]))
    };
  });

  await page.locator(PESTANA('recurrentes')).click();
  ui.recurrentes = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    return {
      total: t(document.querySelector('#recurring-container .fin-stat-value')),
      filas: [...document.querySelectorAll('.recurring-row')].map((r) => {
        const meta = t(r.querySelector('.fin-meta'));
        return { nombre: t(r.querySelector('.fin-name')), dia: Number((meta.match(/Día (\d+)/) || [])[1]), sobre: meta.split('•').pop().trim(), monto: t(r.querySelector('.fin-amt')) };
      }),
      anuales: [...document.querySelectorAll('.anual-fila')].map((f) => ({ nombre: t(f.querySelector('.anual-nombre')), montos: t(f.querySelector('.anual-pie')).match(/-?\$[\d.]+/g) }))
    };
  });

  await page.locator(PESTANA('cuentas')).click();
  ui.sobres = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    const sobres = {};
    for (const c of document.querySelectorAll('.env-row')) {
      const nombre = t(c.querySelector('.flex-between:nth-of-type(2) > div:first-child'));
      const cifras = t(c.querySelector('.fin-bc-figures'));
      const lineas = [...c.querySelectorAll('.sobre-linea')].map(t);
      const arr = lineas.find((l) => / de [a-záéíóú]+$/.test(l));
      const tra = lineas.find((l) => /transferido$/.test(l));
      const sobregiro = (cifras.match(/^Sobregiro de (-?\$[\d.]+)/) || [])[1] || null;
      const [gastado, disponible] = sobregiro ? [null, null] : cifras.split(' de ');
      sobres[nombre] = {
        categoria: t(c.querySelector('.fin-eyebrow')),
        saldo: t(c.querySelector('.fin-bal')),
        gastado, disponible, sobregiro,
        arrastre: arr ? arr.replace(/ de [a-záéíóú]+$/, '') : null,
        mesArrastre: arr ? arr.match(/ de ([a-záéíóú]+)$/)[1] : null,
        transferido: tra ? tra.replace(/ transferido$/, '') : null
      };
    }
    return sobres;
  });
  ui.archivados = await page.evaluate(() => [...document.querySelectorAll('.sobre-archivado-row')].map((r) => r.firstElementChild.firstElementChild.textContent.trim()));
  ui.metas = await page.evaluate(() => [...document.querySelectorAll('.goal-row')].map((g) => ({ montos: g.textContent.match(/-?\$[\d.]+/g) })));

  await page.locator(PESTANA('movimientos')).click();
  ui.movimientos = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    return [...document.querySelectorAll('#history-list-content .fin-row')].map((r) => ({ nombre: t(r.querySelector('.fin-name')), monto: t(r.querySelector('.fin-amt')) }));
  });
  await page.locator(PESTANA('resumen')).click();
  return ui;
}

// Interfaz Órbita (Fase 8): mismo esquema que leerUiMk3, para comparar
// campo a campo. Presupuesto y Cuentas viven ahora en la pestaña Sobres.
export async function leerUiOrbita(page) {
  const ui = {};
  await ir(page, 'finanzas');
  await page.waitForSelector('#fin-balance');
  await page.locator(PESTANA('resumen')).click();
  await page.waitForSelector('#recent-tx-list');
  ui.resumen = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    const dia = t(document.querySelector('#daily-available-container'));
    return {
      balance: t(document.querySelector('#fin-balance')),
      gastos: t(document.querySelector('#fin-gastos')),
      ingresos: t(document.querySelector('#fin-ingresos')),
      tendencia: t(document.querySelector('#fin-tendencia')),
      porDia: t(document.querySelector('#fin-pordia')),
      restantes: (dia.match(/(-?\$[\d.]+) restantes/) || [])[1] || null,
      diasRestantes: Number((dia.match(/(\d+) días? del mes/) || [])[1]),
      categorias: Object.fromEntries([...document.querySelectorAll('#resumen-cat-legend .o-fin-dist-fila')].map((d) => [t(d.querySelector('.o-fin-dist-nombre')), t(d.querySelector('.o-fin-dist-monto'))])),
      recientes: [...document.querySelectorAll('#recent-tx-list .o-fin-mov')].map((r) => ({ nombre: t(r.querySelector('.o-fin-mov-nombre')), monto: t(r.querySelector('.o-fin-monto')) }))
    };
  });

  await page.locator(PESTANA('sobres')).click();
  await page.waitForSelector('#envelopes-list-container');
  ui.presupuesto = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    return {
      gastado: t(document.querySelector('#fin-pres-gastado')),
      categorias: Object.fromEntries([...document.querySelectorAll('#presupuesto-legend-container .legend-item')].map((c) => [t(c.querySelector('.o-fin-regla-nombre')), t(c.querySelector('.o-fin-regla-cifras'))]))
    };
  });
  ui.sobres = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    const sobres = {};
    for (const c of document.querySelectorAll('.env-row')) {
      const cifras = t(c.querySelector('.o-fin-sobre-cifras'));
      const lineas = [...c.querySelectorAll('.o-fin-sobre-linea')].map(t);
      const arr = lineas.find((l) => / de [a-záéíóú]+$/.test(l));
      const tra = lineas.find((l) => /transferido$/.test(l));
      const sobregiro = (cifras.match(/^Sobregiro de (-?\$[\d.]+)/) || [])[1] || null;
      const [gastado, disponible] = sobregiro ? [null, null] : cifras.split(' de ');
      sobres[t(c.querySelector('.o-fin-sobre-nombre'))] = {
        categoria: t(c.querySelector('.o-fin-sobre-cat')),
        saldo: t(c.querySelector('.o-fin-sobre-saldo .o-num')),
        gastado, disponible, sobregiro,
        arrastre: arr ? arr.replace(/ de [a-záéíóú]+$/, '') : null,
        mesArrastre: arr ? arr.match(/ de ([a-záéíóú]+)$/)[1] : null,
        transferido: tra ? tra.replace(/ transferido$/, '') : null
      };
    }
    return sobres;
  });
  ui.archivados = await page.evaluate(() => [...document.querySelectorAll('.o-fin-archivado-nombre')].map((r) => r.textContent.trim()));
  ui.metas = await page.evaluate(() => [...document.querySelectorAll('.goal-row')].map((g) => ({ montos: g.textContent.match(/-?\$[\d.]+/g) })));

  await page.locator(PESTANA('recurrentes')).click();
  await page.waitForSelector('#anuales-container');
  ui.recurrentes = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    return {
      total: t(document.querySelector('#fin-rec-total')),
      filas: [...document.querySelectorAll('.o-fin-rec')].map((r) => ({
        nombre: t(r.querySelector('.o-fin-rec-nombre')),
        dia: Number(t(r.querySelector('.o-fin-rec-dia'))),
        sobre: t(r.querySelector('.o-fin-rec-sobre')),
        monto: t(r.querySelector('.o-fin-monto'))
      })),
      anuales: [...document.querySelectorAll('.anual-fila')].map((f) => ({ nombre: t(f.querySelector('.anual-nombre')), montos: t(f.querySelector('.anual-pie')).match(/-?\$[\d.]+/g) }))
    };
  });

  await page.locator(PESTANA('movimientos')).click();
  await page.waitForSelector('#history-list-content');
  ui.movimientos = await page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    return [...document.querySelectorAll('#history-list-content .o-fin-mov')].map((r) => ({ nombre: t(r.querySelector('.o-fin-mov-nombre')), monto: t(r.querySelector('.o-fin-monto')) }));
  });
  await page.locator(PESTANA('resumen')).click();
  // Mismo orden de claves que la foto de antes (la comparación no depende de él).
  return { resumen: ui.resumen, presupuesto: ui.presupuesto, recurrentes: ui.recurrentes, sobres: ui.sobres, archivados: ui.archivados, metas: ui.metas, movimientos: ui.movimientos };
}

// Hoy no cambia en la Fase 8: se leen sus cifras de dinero tal cual.
async function leerHoy(page) {
  await ir(page, 'dashboard');
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    return {
      // Anillo de Presupuesto de la órbita: «Presupuesto 67%».
      presupuesto: t([...document.querySelectorAll('#view-root *')].filter((e) => /^Presupuesto ?\d+%$/.test(t(e))).pop()),
      cobros: t(document.querySelector('#alerta-caja')),
      anuales: t(document.querySelector('#alerta-anual'))
    };
  });
}

// --- Lectura del cálculo ---
async function leerDatos(page) {
  return page.evaluate(async (meses) => {
    const { db } = await import('/js/core/db.js');
    const salida = {};
    for (const m of meses) {
      const b = await db.getBudget(m);
      salida[m] = {
        ingresos: b.income, gastos: b.expenses, ahorro: b.savedThisMonth, presupuestado: b.budgeted, disponible: b.remaining,
        sobres: Object.fromEntries(b.todosLosSobres.map((e) => [e.name, {
          archivado: !!e.archivado, asignado: e.asignado, arrastre: e.arrastre, gastado: e.gastado, transferencias: e.transferencias, saldo: e.saldo
        }]))
      };
    }
    return salida;
  }, MESES);
}

// Toma la foto completa en un contexto limpio del navegador dado.
// leerUi: la función de lectura de la interfaz vigente.
export async function tomarFoto(browser, base, { leerUi = leerUiMk3, capturas = null } = {}) {
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
    ui.hoy = await leerHoy(page);
    if (capturas) {
      fs.mkdirSync(capturas, { recursive: true });
      for (const vp of [{ n: '390', w: 390, h: 844 }, { n: '1440', w: 1440, h: 900 }]) {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await ir(page, 'finanzas');
        await page.waitForSelector('[data-tab]');
        const pestanas = await page.$$eval('[data-tab]', (els) => [...new Set(els.map((e) => e.dataset.tab))]);
        for (const tab of pestanas) {
          await page.locator(PESTANA(tab)).first().click();
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(capturas, `finanzas-${tab}-${vp.n}.png`), fullPage: true });
        }
      }
    }
    const datos = await leerDatos(page);
    return { ui, datos, errores };
  } finally {
    await context.close();
  }
}

// Listas de movimientos: db.getBudget las ordena por día, y los del mismo
// día quedan en el orden en que IndexedDB los entrega (por id, que en los
// datos de demostración es aleatorio). Ese empate cambia de una corrida a
// otra con la misma app, así que se comparan como conjunto (mismos
// movimientos, mismos montos), no por posición.
const SIN_ORDEN = new Set(['ui.movimientos', 'ui.resumen.recientes']);
const ordenar = (lista) => [...lista].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));

// Compara dos fotos: lista de diferencias "ruta: antes → después".
export function compararFotos(a, b, ruta = '') {
  if (SIN_ORDEN.has(ruta) && Array.isArray(a) && Array.isArray(b)) { a = ordenar(a); b = ordenar(b); }
  const difs = [];
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    if (JSON.stringify(a) !== JSON.stringify(b)) difs.push(`${ruta}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
    return difs;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) difs.push(...compararFotos(a[k], b[k], ruta ? `${ruta}.${k}` : k));
  return difs;
}

// --- Uso directo ---
export function servir(puerto) {
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const archivo = path.join(RAIZ, p);
    if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(archivo).pipe(res);
  });
  return new Promise((ok) => srv.listen(puerto, '127.0.0.1', () => ok(srv)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const etiqueta = process.argv[2] || 'despues';
  const puerto = 8767;
  const srv = await servir(puerto);
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.supabase.co ~NOTFOUND'] });
  try {
    const salida = path.join(AQUI, 'salida', `finanzas-${etiqueta}`);
    const foto = await tomarFoto(browser, `http://127.0.0.1:${puerto}/`, { capturas: salida, leerUi: etiqueta === 'antes' ? leerUiMk3 : leerUiOrbita });
    const destino = etiqueta === 'antes' ? ARCHIVO_ANTES : path.join(salida, 'foto.json');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(foto, null, 2) + '\n');
    console.log(`Foto "${etiqueta}" → ${path.relative(RAIZ, destino)} (errores de consola: ${foto.errores.length})`);
    if (etiqueta !== 'antes' && fs.existsSync(ARCHIVO_ANTES)) {
      const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES, 'utf8')), foto);
      console.log(difs.length ? `Diferencias con la foto de antes:\n  ${difs.join('\n  ')}` : 'Idéntica a la foto de antes.');
    }
  } finally {
    await browser.close();
    srv.close();
  }
}
