import { db } from './db.js';

// El servidor local a veces omite el header Content-Type cuando recibe
// varias peticiones en paralelo (medido: 0/52 fallos pidiendo los archivos
// de a uno vs 4/52 pidiéndolos todos a la vez, que es lo que hace el
// navegador automáticamente al resolver los imports estáticos de un
// módulo). Como el servidor no manda headers de caché, ni siquiera
// "precalentar" el caché HTTP evita que el import real vuelva a pedir
// todo en paralelo. La única forma de eliminar la concurrencia es
// construir el grafo de módulos nosotros mismos: bajamos cada archivo
// UNO A LA VEZ (con reintento por archivo) y lo empaquetamos como
// Blob URL, reescribiendo sus imports relativos para que apunten a los
// Blob URL ya resueltos de sus dependencias. Así el import() final no
// dispara ninguna petición de red nueva.
const blobUrlCache = new Map(); // url absoluta -> blob url ya construido

async function fetchTextWithRetry(url, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(i === 0 ? url : `${url}${url.includes('?') ? '&' : '?'}retry=${Date.now()}_${i}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
      const ct = res.headers.get('content-type') || '';
      if (!/javascript|ecmascript/i.test(ct)) throw new Error(`Content-Type inválido ("${ct || 'vacío'}") al pedir ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 80 * (i + 1)));
    }
  }
  throw lastErr;
}

async function loadModuleGraph(entryUrl) {
  if (blobUrlCache.has(entryUrl)) return blobUrlCache.get(entryUrl);

  const importLineRe = /^import\s+[^;\n]*?from\s+['"](\.[^'"]+)['"]/gm;
  const texts = new Map();   // url -> código fuente original
  const deps = new Map();    // url -> [{specifier, absUrl}]

  // 1. Bajar todo el grafo secuencialmente (nunca dos fetch en paralelo).
  const toVisit = [entryUrl];
  const seen = new Set([entryUrl]);
  while (toVisit.length) {
    const url = toVisit.shift();
    if (blobUrlCache.has(url) || texts.has(url)) continue;

    const text = await fetchTextWithRetry(url);
    texts.set(url, text);

    const fileDeps = [];
    let m;
    importLineRe.lastIndex = 0;
    while ((m = importLineRe.exec(text))) {
      const abs = new URL(m[1], url).href;
      fileDeps.push({ specifier: m[1], absUrl: abs });
      if (!seen.has(abs) && !blobUrlCache.has(abs)) {
        seen.add(abs);
        toVisit.push(abs);
      }
    }
    deps.set(url, fileDeps);
  }

  // 2. Orden topológico (post-order): las dependencias primero.
  const order = [];
  const visited = new Set();
  (function visit(url) {
    if (visited.has(url) || blobUrlCache.has(url)) return;
    visited.add(url);
    for (const d of deps.get(url) || []) visit(d.absUrl);
    order.push(url);
  })(entryUrl);

  // 3. Construir los Blob URL de abajo hacia arriba, reescribiendo cada
  // import relativo para que apunte al Blob URL final de esa dependencia.
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const url of order) {
    let text = texts.get(url);
    for (const d of deps.get(url) || []) {
      const finalUrl = blobUrlCache.get(d.absUrl);
      if (!finalUrl) continue;
      const specRe = new RegExp(`(^import\\s+[^;\\n]*?from\\s+['"])${escapeRe(d.specifier)}(['"])`, 'm');
      text = text.replace(specRe, `$1${finalUrl}$2`);
    }
    const blob = new Blob([text], { type: 'text/javascript' });
    blobUrlCache.set(url, URL.createObjectURL(blob));
  }

  return blobUrlCache.get(entryUrl);
}

class Router {
  constructor() {
    this.root = document.getElementById('view-root');
    this.navItems = document.querySelectorAll('.nav-item');
    this.currentView = null;
    
    db.init();
    
    // Inject icons only if they exist
    this.injectIcons();
    
    // Initialize Router
    this.init();
  }

  injectIcons() {
    const iconHome = document.getElementById('icon-home');
    if (iconHome) iconHome.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const iconTasks = document.getElementById('icon-tasks');
    if (iconTasks) iconTasks.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
    const iconTraining = document.getElementById('icon-training');
    if (iconTraining) iconTraining.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><rect x="4" y="2" width="4" height="20" rx="1"></rect><rect x="16" y="2" width="4" height="20" rx="1"></rect></svg>`;
    const iconWallet = document.getElementById('icon-wallet');
    if (iconWallet) iconWallet.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12h-3v4h3v-4z"></path></svg>`;
  }

  init() {
    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        this.navigate(view);
      });
    });

    // Start robust splash screen logic
    this.setupSplashScreen();

    // Navigate to initial dashboard view
    this.navigate('dashboard').then(() => {
      // Layer 1: Hide automatically when ready
      this.hideSplash();
    }).catch(err => {
      console.error("Dashboard failed to mount initially", err);
      // Even on failure, try to hide it so user sees the error
      this.hideSplash();
    });
  }
  
  setupSplashScreen() {
    // Layer 2: Safety timeout (Max 3 seconds)
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash && !splash.classList.contains('splash-hidden')) {
        console.warn('Splash timeout: el contenido tardó demasiado en cargar, forzando cierre.');
        this.hideSplash();
      }
    }, 3000);

    // Layer 3: Manual "Entrar" button backup after 1.5s
    setTimeout(() => {
      const btn = document.getElementById('splash-enter-btn');
      if (btn) {
        btn.style.display = 'block';
        btn.addEventListener('click', () => this.hideSplash());
      }
    }, 1500);
  }

  hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    
    // Check if it's already hidden to avoid double execution
    if (splash.classList.contains('splash-hidden')) return;
    
    splash.classList.add('splash-hidden');
    splash.style.pointerEvents = 'none';
    splash.style.opacity = '0';
    
    // Wait for the CSS fade-out transition, then remove from DOM completely
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 300);
  }

  async navigate(viewId) {
    this.currentView = viewId;

    this.navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewId);
    });

    try {
      this.root.style.animation = 'none';

      // OJO: no usar import.meta.url aquí — cuando app.js se carga desde un
      // Blob URL (ver loadModuleGraph), import.meta.url es ese blob: URL y
      // resolver rutas relativas contra él no funciona de forma fiable.
      const viewUrl = new URL(`js/views/${viewId}.js`, location.href).href;
      const blobUrl = await loadModuleGraph(viewUrl);
      const module = await import(blobUrl);
      this.root.innerHTML = await module.render();
      if (typeof module.mountListeners === 'function') module.mountListeners();
      void this.root.offsetWidth;
      this.root.style.animation = 'fadeSlideIn var(--transition-view)';
    } catch (err) {
      console.error('Error al cargar la vista:', err);
      this.root.innerHTML = `<div style="padding: 20px; color: red;">Error: ${err.message}</div>`;
    }
  }
}

// Global hook
window.appRouter = new Router();