// tools/verificar/foto-progreso.mjs
// Foto de las sub-pantallas de Entreno que migra la Fase 9c del rediseño:
// Historial de sesiones (todas las semanas, con «Cargar más»), Progreso
// completo (Estándares, Árbol de las tres categorías, Tendencia de las
// cuatro y Metas) y Cuerpo (gráfico de peso en 30/90/365 días, minigráficos
// de perímetros, fotos y lista de medidas). Lee las cifras y los textos que
// se ven y los datos de cada gráfico, para comparar antes y después de
// cambiar la interfaz.
//
// Uso (desde la raíz del repo, con Node portable en el PATH):
//   node tools/verificar/foto-progreso.mjs antes     → progreso-antes.json
//   node tools/verificar/foto-progreso.mjs despues   → salida/progreso-despues/foto.json
// verificar.mjs llama a tomarFotoProgreso() y compara contra progreso-antes.json.
//
// Escenario: datos de demostración, más medidas, metas de Entreno y fotos
// que agrega esta herramienta (la demostración no trae), con el mismo reloj
// simulado que las otras fotos. Contexto limpio, zona America/Santiago y
// Supabase bloqueado.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { AHORA_FOTO, prepararEscenario, ir, servir, compararFotos } from './foto-finanzas.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
export const ARCHIVO_ANTES_PROGRESO = path.join(AQUI, 'progreso-antes.json');
const CATS_ARBOL = ['gym', 'calistenia', 'hiit'];
const CATS_TENDENCIA = ['todos', 'gym', 'calistenia', 'hiit'];
const RANGOS = [30, 90, 365];

// Datos de cada gráfico de Chart.js (etiquetas y series), o null.
const datosGrafico = (id) => {
  const c = document.getElementById(id);
  const g = c && window.Chart ? window.Chart.getChart(c) : null;
  return g ? { labels: g.data.labels, series: g.data.datasets.map((d) => d.data.map((v) => (v === null ? null : Math.round(v * 1000) / 1000))) } : null;
};

// --- Lectores de cada interfaz -------------------------------------------

const T = `const t = (el) => (el ? el.textContent.replace(/\\s+/g, ' ').trim() : null); const datosGrafico = ${datosGrafico.toString()};`;

export const UI_MK3 = {
  nombre: 'mk3',
  historial: new Function(`${T}
    const raiz = document.getElementById('hist-lista');
    return {
      titulo: t(document.querySelector('#entrenamiento-sub-content h1')),
      semanas: [...raiz.querySelectorAll('section')].map((sec) => ({
        titulo: t(sec.querySelector('h3')),
        cuenta: t(sec.querySelector('h3 + span')),
        sesiones: [...sec.querySelectorAll('.hist-sesion')].map((b) => {
          const info = b.children[1];
          const der = b.children[2];
          return { aria: b.getAttribute('aria-label'), dia: t(info.children[0]), nombre: t(info.children[1]), incompleta: /Incompleta/.test(info.textContent), min: t(der.children[0]), series: t(der.children[1]) };
        })
      })),
      vacio: raiz.querySelector('section') ? null : t(raiz.querySelector('p')),
      cargarMas: !!document.getElementById('btn-hist-cargar-mas')
    };`),
  tabsProgreso: new Function(`${T}
    return [...document.querySelectorAll('.progreso-tab')].map((b) => t(b));`),
  estandares: new Function(`${T}
    const raiz = document.getElementById('progreso-tab-content');
    const cards = [...raiz.querySelectorAll('.card')];
    const aviso = cards.find((c) => /nombres exactos/.test(c.textContent));
    const banner = cards.find((c) => /Completa tu peso corporal/.test(c.textContent));
    return {
      titulo: t(raiz.querySelector('h2')),
      aviso: t(aviso && aviso.querySelector('b')),
      bannerPeso: !!banner,
      filas: cards.filter((c) => c !== aviso && c !== banner).map((c) => {
        const spans = [...c.querySelectorAll('span')].filter((s) => !s.classList.contains('badge'));
        const gap = [...c.querySelectorAll('div')].find((d) => /^(Te faltan|Tope)/.test(t(d)));
        return {
          nombre: t(spans[0] || c.firstElementChild?.firstElementChild || c.firstElementChild),
          valor: spans[1] ? t(spans[1]) : null,
          sinDato: /Sin registros/.test(c.textContent),
          nivel: t(c.querySelector('.badge')),
          gap: t(gap),
          segmentos: [...c.querySelectorAll('div')].filter((d) => /state-success/.test(d.getAttribute('style') || '')).length
        };
      })
    };`),
  arbol: new Function(`${T}
    const raiz = document.getElementById('progreso-tab-content');
    return {
      titulo: t(raiz.querySelector('h2')),
      ramas: [...raiz.querySelectorAll('h3')].map((h) => {
        const cont = h.parentElement;
        let estatico = false;
        const nodos = [];
        [...cont.children].forEach((el) => {
          if (el === h) return;
          if (!el.classList.contains('card')) { if (/Estáticos/.test(el.textContent)) estatico = true; return; }
          const spans = el.firstElementChild.querySelectorAll('span');
          const reqs = [...el.querySelectorAll('ul')];
          nodos.push({
            nombre: t(spans[0]),
            objetivo: t(spans[1]),
            estatico,
            bloqueado: /opacity: 0\\.45/.test(el.getAttribute('style')),
            raiz: /Punto de partida/.test(el.textContent),
            requiere: reqs[0] ? [...reqs[0].querySelectorAll('li')].map(t) : [],
            alternativos: reqs[1] ? [...reqs[1].querySelectorAll('li')].map(t) : []
          });
        });
        return { rama: t(h), nodos };
      })
    };`),
  tendencia: new Function(`${T}
    const raiz = document.getElementById('progreso-tab-content');
    const card = raiz.querySelector('.progreso-tendencia-card');
    return {
      titulo: t(card.querySelector('h3')),
      vacio: card.querySelector('.vg-empty') ? t(card.querySelector('.vg-empty')) : null,
      info: t(card.querySelector('.progreso-tendencia-info')),
      grafico: datosGrafico('chart-progreso-tendencia')
    };`),
  metas: new Function(`${T}
    const raiz = document.getElementById('progreso-tab-content');
    return {
      vacio: raiz.querySelector('.vg-empty') ? t(raiz.querySelector('.vg-empty')) : null,
      nueva: !!document.getElementById('btn-lab-entreno-nueva-meta'),
      metas: [...raiz.querySelectorAll('.goal-row')].map((g) => {
        const barra = g.querySelector('[class*="contrib-btn"] > div, div[style*="height: 8px"] > div');
        return {
          nombre: t(g.querySelector('.flex-between > div > div:last-child')),
          valor: t(g.querySelector('.num')),
          pct: barra ? parseFloat(barra.style.width) : null,
          completada: barra ? /state-success/.test(barra.getAttribute('style')) : null,
          plazo: t([...g.querySelectorAll('div')].find((d) => /^(Vence|Venció)/.test(t(d)))),
          automatica: /Se actualiza sola/.test(g.textContent),
          aporte: !!g.querySelector('.contrib-btn')
        };
      })
    };`),
  cuerpo: new Function(`${T}
    const raiz = document.querySelector('#entrenamiento-sub-content .cuerpo-historial');
    return {
      titulo: t(raiz.querySelector('h2')),
      rangos: [...raiz.querySelectorAll('.cuerpo-rango')].map((b) => ({ r: b.dataset.rango, activo: b.getAttribute('aria-pressed') === 'true', texto: t(b) })),
      pesoVacio: t(document.getElementById('cuerpo-peso-vacio')),
      pesoAria: document.getElementById('cuerpo-peso-chart')?.getAttribute('aria-label') || null,
      peso: datosGrafico('cuerpo-peso-chart'),
      minis: [...raiz.querySelectorAll('.cuerpo-mini')].map((m) => ({
        campo: m.dataset.campo,
        etq: t(m.querySelector('.cuerpo-mini-etq')),
        valor: t(m.querySelector('.cuerpo-mini-valor')),
        variacion: t(m.querySelector('.cuerpo-mini-var')),
        grafico: datosGrafico('cuerpo-mini-' + m.dataset.campo)
      })),
      fotos: {
        titulo: t(document.getElementById('cuerpo-fotos-titulo')),
        comparar: !!document.getElementById('btn-fotos-comparar'),
        dias: [...raiz.querySelectorAll('.fotos-dia')].map((d) => ({ fecha: t(d.querySelector('h4')), n: d.querySelectorAll('.foto-mini').length }))
      },
      medidas: [...raiz.querySelectorAll('.cuerpo-fila')].map((f) => ({
        dia: t(f.querySelector('.cuerpo-fila-dia')),
        valores: [...f.querySelectorAll('.cuerpo-valor')].map(t),
        nota: t(f.querySelector('.cuerpo-fila-nota'))
      }))
    };`),
  // Chips de categoría y de rango en cada interfaz.
  tab: (id) => `.progreso-tab[data-tab="${id}"]`,
  catArbol: (id) => `.progreso-cat-arbol[data-cat="${id}"]`,
  catTendencia: (id) => `.progreso-cat-tendencia[data-cat="${id}"]`,
  rango: (r) => `.cuerpo-rango[data-rango="${r}"]`
};

// Lectores de Órbita (Fase 9c): los mismos datos, por data-foto.
export const UI_ORBITA = {
  nombre: 'orbita',
  historial: new Function(`${T}
    const raiz = document.getElementById('hist-lista');
    const f = (el, k) => t(el.querySelector('[data-foto="' + k + '"]'));
    return {
      titulo: t(document.querySelector('[data-foto="hist-titulo"]')),
      semanas: [...raiz.querySelectorAll('[data-foto="hist-semana"]')].map((sec) => ({
        titulo: f(sec, 'sem-titulo'),
        cuenta: f(sec, 'sem-cuenta'),
        sesiones: [...sec.querySelectorAll('[data-foto="hist-sesion"]')].map((b) => ({
          aria: b.getAttribute('aria-label'), dia: f(b, 'hist-dia'), nombre: f(b, 'hist-nombre'),
          incompleta: !!b.querySelector('[data-foto="hist-incompleta"]'), min: f(b, 'hist-min'), series: f(b, 'hist-series')
        }))
      })),
      vacio: t(raiz.querySelector('[data-foto="hist-vacio"]')),
      cargarMas: !!document.getElementById('btn-hist-cargar-mas')
    };`),
  tabsProgreso: UI_MK3.tabsProgreso,
  estandares: new Function(`${T}
    const raiz = document.getElementById('progreso-tab-content');
    const f = (el, k) => t(el.querySelector('[data-foto="' + k + '"]'));
    return {
      titulo: f(raiz, 'est-titulo'),
      aviso: f(raiz, 'est-aviso'),
      bannerPeso: !!raiz.querySelector('[data-foto="est-perfil"]'),
      filas: [...raiz.querySelectorAll('[data-foto="est-fila"]')].map((c) => ({
        nombre: f(c, 'est-nombre'),
        valor: f(c, 'est-valor'),
        sinDato: /Sin registros/.test(c.textContent),
        nivel: f(c, 'est-nivel'),
        gap: f(c, 'est-gap'),
        segmentos: c.querySelectorAll('.o-ent-est-seg[data-lleno="true"]').length
      }))
    };`),
  arbol: new Function(`${T}
    const raiz = document.getElementById('progreso-tab-content');
    const f = (el, k) => t(el.querySelector('[data-foto="' + k + '"]'));
    return {
      titulo: f(raiz, 'arbol-titulo'),
      ramas: [...raiz.querySelectorAll('[data-foto="rama"]')].map((r) => ({
        rama: f(r, 'rama-nombre'),
        nodos: [...r.querySelectorAll('[data-foto="nodo"]')].map((n) => ({
          nombre: f(n, 'nodo-nombre'),
          objetivo: f(n, 'nodo-objetivo'),
          estatico: !!n.closest('[data-foto="rama-estaticos"]'),
          bloqueado: n.dataset.bloqueado === 'true',
          raiz: !!n.querySelector('[data-foto="nodo-raiz"]'),
          requiere: [...n.querySelectorAll('[data-foto="req"] > li')].map(t),
          alternativos: [...n.querySelectorAll('[data-foto="req-alt"] > li')].map(t)
        }))
      }))
    };`),
  tendencia: new Function(`${T}
    const card = document.querySelector('#progreso-tab-content [data-foto="tendencia"]');
    return {
      titulo: t(card.querySelector('[data-foto="tend-titulo"]')),
      vacio: card.querySelector('.o-vacio') ? t(card.querySelector('.o-vacio')) : null,
      info: t(card.querySelector('[data-foto="tend-info"]')),
      grafico: datosGrafico('chart-progreso-tendencia')
    };`),
  metas: new Function(`${T}
    const raiz = document.getElementById('progreso-tab-content');
    const f = (el, k) => t(el.querySelector('[data-foto="' + k + '"]'));
    return {
      vacio: raiz.querySelector('.o-vacio') ? t(raiz.querySelector('.o-vacio')) : null,
      nueva: !!document.getElementById('btn-lab-entreno-nueva-meta'),
      metas: [...raiz.querySelectorAll('[data-foto="meta"]')].map((g) => {
        const barra = g.querySelector('[data-foto="meta-pct"]');
        return {
          nombre: f(g, 'meta-nombre'),
          valor: f(g, 'meta-valor'),
          pct: barra ? Number(barra.dataset.pct) : null,
          completada: barra ? barra.dataset.completada === 'true' : null,
          plazo: f(g, 'meta-plazo'),
          automatica: !!g.querySelector('[data-foto="meta-auto"]'),
          aporte: !!g.querySelector('[data-foto="meta-aporte"]')
        };
      })
    };`),
  cuerpo: new Function(`${T}
    const raiz = document.querySelector('#entrenamiento-sub-content [data-foto="cuerpo"]');
    const f = (el, k) => t(el.querySelector('[data-foto="' + k + '"]'));
    return {
      titulo: f(raiz, 'cuerpo-titulo'),
      rangos: [...raiz.querySelectorAll('[data-foto="rango"]')].map((b) => ({ r: b.dataset.rango, activo: b.getAttribute('aria-pressed') === 'true', texto: t(b) })),
      pesoVacio: t(document.getElementById('cuerpo-peso-vacio')),
      pesoAria: document.getElementById('cuerpo-peso-chart')?.getAttribute('aria-label') || null,
      peso: datosGrafico('cuerpo-peso-chart'),
      minis: [...raiz.querySelectorAll('[data-foto="mini"]')].map((m) => ({
        campo: m.dataset.campo,
        etq: f(m, 'mini-etq'),
        valor: f(m, 'mini-valor'),
        variacion: f(m, 'mini-var'),
        grafico: datosGrafico('cuerpo-mini-' + m.dataset.campo)
      })),
      fotos: {
        titulo: t(document.getElementById('cuerpo-fotos-titulo')),
        comparar: !!document.getElementById('btn-fotos-comparar'),
        dias: [...raiz.querySelectorAll('[data-foto="fotos-dia"]')].map((d) => ({ fecha: f(d, 'fotos-fecha'), n: d.querySelectorAll('.o-ent-foto').length }))
      },
      medidas: [...raiz.querySelectorAll('[data-foto="medida"]')].map((m) => ({
        dia: f(m, 'medida-dia'),
        valores: [...m.querySelectorAll('[data-foto="medida-valor"]')].map(t),
        nota: f(m, 'medida-nota')
      }))
    };`),
  tab: UI_MK3.tab,
  rango: (r) => `.o-ent-rango[data-rango="${r}"]`,
  catArbol: UI_MK3.catArbol,
  catTendencia: UI_MK3.catTendencia
};

// --- Recorrido (común) ---------------------------------------------------

// Medidas, metas de Entreno y fotos (la demostración no las trae).
async function sembrar(page) {
  await page.evaluate(async () => {
    const { db } = await import('/js/core/db.js');
    const medidas = [
      ['2026-08-20', { pesoKg: 83.4, cinturaCm: 88 }],
      ['2026-09-25', { pesoKg: 82.1, cinturaCm: 87, pechoCm: 101 }],
      ['2026-10-10', { pesoKg: 81.6 }],
      ['2026-10-25', { pesoKg: 81, cinturaCm: 86, brazoCm: 36.5, nota: 'Después de vacaciones' }],
      ['2026-11-05', { pesoKg: 80.7 }],
      ['2026-11-12', { pesoKg: 80.9 }],
      ['2026-11-15', { pesoKg: 80.2, cinturaCm: 85.5, brazoCm: 37 }],
      ['2026-11-22', { pesoKg: 79.8, pechoCm: 102, musloCm: 58 }]
    ];
    for (const [fecha, v] of medidas) await db.registrarMedida({ fecha, ...v });
    await db.createGoal({ name: '20 sesiones este trimestre', targetAmount: 20, currentAmount: 0, dominio: 'entreno', tipo: 'sesiones', unidad: 'sesiones', icon: 'calendar', autoTrack: true, deadline: '2026-12-31' });
    await db.createGoal({ name: 'Correr 50 km', targetAmount: 50, currentAmount: 12.5, dominio: 'entreno', tipo: 'personalizado', unidad: 'km', icon: 'run', deadline: '2026-11-10' });
    await db.createGoal({ name: 'Sentadilla 100 kg', targetAmount: 100, currentAmount: 100, completed: true, dominio: 'entreno', tipo: 'personalizado', unidad: 'kg', icon: 'muscle' });
    const png = () => new Promise((r) => { const c = document.createElement('canvas'); c.width = 4; c.height = 6; c.getContext('2d').fillRect(0, 0, 4, 6); c.toBlob(r, 'image/png'); });
    for (const fecha of ['2026-10-25', '2026-11-22', '2026-11-22']) await db.agregarFoto({ blob: await png(), ancho: 4, alto: 6, fecha });
  });
}

// A la pestaña Progreso de Entreno, solo por la interfaz (sin cambiar el
// hash con una sub-pantalla abierta).
async function irAPestanaProgreso(page) {
  if (!(await page.locator('#entrenamiento-main-view').count())) await ir(page, 'entrenamiento');
  await page.waitForSelector('#entrenamiento-sub-view', { state: 'attached' });
  const abierta = await page.$eval('#entrenamiento-sub-view', (e) => getComputedStyle(e).display !== 'none');
  if (abierta) {
    await page.locator('#btn-entrenamiento-volver').click();
    await page.waitForSelector('#entrenamiento-sub-view', { state: 'hidden' });
  }
  if (await page.locator('#ent-tab-progreso[aria-selected="false"]').count()) await page.locator('#ent-tab-progreso').click();
  await page.waitForSelector('#ent-tab-progreso[aria-selected="true"]');
  await page.waitForSelector('#link-ver-progreso-completo');
}

const esperarGraficos = (page) => page.waitForFunction(() => [...document.querySelectorAll('#entrenamiento-sub-content canvas')]
  .every((c) => window.Chart && window.Chart.getChart(c)), null, { timeout: 15000 });

async function abrirSub(page, boton, listo) {
  await irAPestanaProgreso(page);
  await page.locator(boton).click();
  await page.waitForSelector(listo);
}

async function elegir(page, selector, listo) {
  const b = page.locator(selector);
  if ((await b.getAttribute('aria-pressed')) !== 'true' && (await b.getAttribute('aria-selected')) !== 'true') {
    await b.click();
  }
  await page.waitForSelector(listo);
  await page.waitForTimeout(250);
}

// Con FOTO_LOG=1 cada paso se anota en la consola (para ver dónde se traba).
let ultimoPaso = 'inicio';
const paso = (m) => { ultimoPaso = m; if (process.env.FOTO_LOG) console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`); };

export async function recorrerProgreso(page, ui) {
  const foto = {};
  paso("historial");

  // Historial: lo que se ve de entrada y, si hay, con «Cargar más».
  await abrirSub(page, '#link-historial-sesiones', '#hist-lista');
  foto.historial = await page.evaluate(ui.historial);
  if (foto.historial.cargarMas) {
    await page.locator('#btn-hist-cargar-mas').click();
    await page.waitForFunction((n) => document.querySelectorAll('#hist-lista section').length > n, foto.historial.semanas.length);
    foto.historialMas = await page.evaluate(ui.historial);
  }

  paso("progreso");
  // Progreso completo: cada pestaña y cada categoría.
  await abrirSub(page, '#link-ver-progreso-completo', '#progreso-tab-content');
  foto.tabs = await page.evaluate(ui.tabsProgreso);
  await elegir(page, ui.tab('estandares'), '#progreso-tab-content h2');
  foto.estandares = await page.evaluate(ui.estandares);
  await elegir(page, ui.tab('arbol'), '#progreso-tab-content h2');
  foto.arbol = {};
  for (const cat of CATS_ARBOL) {
    await elegir(page, ui.catArbol(cat), `${ui.catArbol(cat)}[aria-pressed="true"]`);
    foto.arbol[cat] = await page.evaluate(ui.arbol);
    paso(`árbol ${cat}`);
  }
  await elegir(page, ui.tab('tendencia'), ui.catTendencia('todos'));
  foto.tendencia = {};
  for (const cat of CATS_TENDENCIA) {
    await elegir(page, ui.catTendencia(cat), `${ui.catTendencia(cat)}[aria-pressed="true"]`);
    await esperarGraficos(page);
    foto.tendencia[cat] = await page.evaluate(ui.tendencia);
    paso(`tendencia ${cat}`);
  }
  await elegir(page, ui.tab('metas'), '#btn-lab-entreno-nueva-meta');
  foto.metas = await page.evaluate(ui.metas);
  // Lo guardado (números, sin formato): la presentación no lo cambia.
  foto.metasGuardadas = await page.evaluate(async () => {
    const { db } = await import('/js/core/db.js');
    return (await db.getGoals('entreno')).map((g) => ({ nombre: g.name, actual: g.currentAmount, meta: g.targetAmount }));
  });

  paso("cuerpo");
  // Cuerpo: el gráfico de peso en cada rango (y vuelta a 90 días).
  await irAPestanaProgreso(page);
  await page.locator('#btn-cuerpo-historial').click();
  await page.waitForSelector(`#entrenamiento-sub-content ${ui.rango(90)}`);
  foto.cuerpo = {};
  for (const r of [...RANGOS, 90]) {
    await elegir(page, ui.rango(r), `${ui.rango(r)}[aria-pressed="true"]`);
    await esperarGraficos(page);
    foto.cuerpo[r] = await page.evaluate(ui.cuerpo);
  }
  return foto;
}

export async function tomarFotoProgreso(browser, base, { ui = UI_MK3, capturas = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Santiago', locale: 'es-CL', serviceWorkers: 'allow' });
  await context.route(/supabase\.co/, (r) => r.abort());
  await context.clock.install({ time: AHORA_FOTO });
  // Los datos de demostración eligen ejercicios al azar: con una semilla
  // fija la foto sale igual en cada corrida.
  await context.addInitScript(() => {
    let a = 20261123;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  const page = await context.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/supabase\.co/.test(m.text() + (m.location()?.url || ''))) errores.push(m.text()); });
  try {
    paso("escenario");
    await prepararEscenario(page, base);
    paso("escenario listo");
    await sembrar(page);
    paso("sembrado");
    const foto = await recorrerProgreso(page, ui);
    if (capturas) {
      fs.mkdirSync(capturas, { recursive: true });
      for (const vp of [{ n: '390', w: 390, h: 844 }, { n: '1440', w: 1440, h: 900 }]) {
        paso(`capturas ${vp.n}`);
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await abrirSub(page, '#link-historial-sesiones', '#hist-lista');
        await page.screenshot({ path: path.join(capturas, `historial-${vp.n}.png`), fullPage: true });
        await abrirSub(page, '#link-ver-progreso-completo', '#progreso-tab-content');
        for (const tab of ['estandares', 'arbol', 'tendencia', 'metas']) {
          await elegir(page, ui.tab(tab), '#progreso-tab-content > *');
          await page.waitForTimeout(400);
          await page.screenshot({ path: path.join(capturas, `progreso-${tab}-${vp.n}.png`), fullPage: true });
        }
        await irAPestanaProgreso(page);
        await page.locator('#btn-cuerpo-historial').click();
        await page.waitForSelector(`#entrenamiento-sub-content ${ui.rango(90)}`);
        await esperarGraficos(page);
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(capturas, `cuerpo-${vp.n}.png`), fullPage: true });
      }
      await ir(page, 'dashboard');
    }
    return { ...foto, errores };
  } catch (e) {
    // El paso donde se trabó, para diagnosticar desde verificar.mjs.
    throw new Error(`${String(e.message).split(String.fromCharCode(10))[0]} (paso: ${ultimoPaso})`);
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
    const salida = path.join(AQUI, 'salida', `progreso-${etiqueta}`);
    const ui = etiqueta === 'antes' ? UI_MK3 : UI_ORBITA;
    const foto = await tomarFotoProgreso(browser, `http://127.0.0.1:${puerto}/`, { ui, capturas: salida });
    const destino = etiqueta === 'antes' ? ARCHIVO_ANTES_PROGRESO : path.join(salida, 'foto.json');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(foto, null, 2) + '\n');
    console.log(`Foto "${etiqueta}" (${ui.nombre}) → ${path.relative(RAIZ, destino)} (errores de consola: ${foto.errores.length})`);
    if (etiqueta !== 'antes' && fs.existsSync(ARCHIVO_ANTES_PROGRESO)) {
      const difs = compararFotos(JSON.parse(fs.readFileSync(ARCHIVO_ANTES_PROGRESO, 'utf8')), foto);
      console.log(difs.length ? `${difs.length} diferencias:\n${difs.slice(0, 40).join('\n')}` : 'Sin diferencias con la foto de antes.');
    }
  } finally {
    await browser.close();
    srv.close();
  }
}
