// js/components/auth-section.js
// Sección "Cuenta" en Configuración — login/signup/logout contra Supabase
// Auth, más un botón de sync manual. La sincronización real (subir/bajar
// `events`) vive en core/sync.js y corre sola en segundo plano (al
// loguearse, al recuperar conexión, y evento por evento en tiempo real) —
// el botón de acá es solo para forzarla a demanda. La app sigue
// funcionando 100% offline sin cuenta — esta sección es opcional.
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { getSupabase, isSupabaseConfigured, cargarSupabase, estadoSupabase } from '../core/supabase-client.js';
import { runFullSync } from '../core/sync.js';

// Espera la carga del bundle de Supabase (la dispara initSync al arrancar;
// si todavía no terminó, se espera acá) antes de pedir la sesión.
export async function getAuthSession() {
  await cargarSupabase();
  if (!isSupabaseConfigured()) return null;
  const { data: { session } } = await getSupabase().auth.getSession();
  return session;
}

// Página estática aparte (privacidad.html en la raíz, no una vista del
// router). "Volver a Vanguard OS" en esa página cubre la PWA instalada, que
// no tiene botón atrás del navegador.
const PRIVACIDAD_LINK = `<p style="font-size: 12px; color: var(--text-secondary); margin: 14px 0 0;">Al usar una cuenta se guarda una copia de tus datos en la nube. <a href="privacidad.html" style="color: var(--accent-primary);">Política de privacidad</a></p>`;

export function renderAuthSection(session) {
  const estado = estadoSupabase();
  if (estado === 'no-configurado') {
    return `<p style="font-size: 13px; color: var(--text-secondary); margin: 0;">Todavía no está configurado el proyecto de Supabase — completá SUPABASE_URL y SUPABASE_ANON_KEY en js/core/supabase-client.js.</p>`;
  }
  if (estado !== 'listo') {
    // El bundle de Supabase no cargó: la app funciona igual, solo sin sync.
    return `
      <div id="auth-no-disponible" style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px;">Sincronización no disponible</div>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.4;">No se pudo cargar el módulo de sincronización. Tus datos siguen guardados en este teléfono; vuelve a intentarlo al recargar la app.</p>`;
  }

  if (session?.user) {
    return `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 13px; color: var(--state-success); font-weight: 600;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--state-success); flex-shrink: 0;"></span>
        Sesión iniciada: ${escapeHtml(session.user.email)}
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="btn-auth-sync" type="button" class="tappable" style="flex: 1; padding: 12px; border-radius: 12px; background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border); font-weight: 600; cursor: pointer;">Sincronizar ahora</button>
        <button id="btn-auth-logout" type="button" class="tappable" style="flex: 1; padding: 12px; border-radius: 12px; background: transparent; color: var(--state-high); border: 1px solid var(--state-high); font-weight: 600; cursor: pointer;">Cerrar sesión</button>
      </div>
      ${PRIVACIDAD_LINK}
    `;
  }

  return `
    <div class="input-group" style="margin-bottom: 12px;">
      <label for="auth-email">Email</label>
      <input type="email" id="auth-email" autocomplete="email" placeholder="vos@ejemplo.com">
    </div>
    <div class="input-group" style="margin-bottom: 14px;">
      <label for="auth-password">Contraseña</label>
      <input type="password" id="auth-password" autocomplete="current-password" placeholder="Mínimo 6 caracteres">
    </div>
    <div style="display: flex; gap: 10px;">
      <button id="btn-auth-signup" type="button" class="tappable" style="flex: 1; padding: 12px; border-radius: 12px; background: var(--surface-2); color: var(--text-primary); border: 1px solid var(--surface-border); font-weight: 600; cursor: pointer;">Crear cuenta</button>
      <button id="btn-auth-login" type="button" class="btn-primary tappable" style="flex: 1; background: var(--accent-primary); color: #000;">Iniciar sesión</button>
    </div>
    ${PRIVACIDAD_LINK}
  `;
}

export function attachAuthListeners(containerId) {
  if (!isSupabaseConfigured()) return;
  const container = document.getElementById(containerId);
  if (!container) return;

  const refresh = async () => {
    const session = await getAuthSession();
    container.innerHTML = renderAuthSection(session);
    attachAuthListeners(containerId);
  };

  const readCreds = () => ({
    email: document.getElementById('auth-email')?.value.trim(),
    password: document.getElementById('auth-password')?.value
  });

  document.getElementById('btn-auth-signup')?.addEventListener('click', async () => {
    const { email, password } = readCreds();
    if (!email || !password) return Toast('Completá email y contraseña', 'warning');
    // emailRedirectTo explícito (en vez de dejar que Supabase caiga al
    // "Site URL" configurado en su dashboard, que en un proyecto nuevo
    // apunta a localhost por default): el link de confirmación del mail
    // tiene que volver a ESTA URL exacta para que el cliente de Supabase
    // de esta misma pestaña la procese. Sigue siendo responsabilidad del
    // usuario agregar esta URL a la lista de "Redirect URLs" permitidas en
    // Authentication → URL Configuration del dashboard de Supabase, o el
    // link de confirmación rebota igual antes de llegar acá.
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) return Toast(error.message, 'error');
    // Con "Confirm email" activado (default en proyectos nuevos de Supabase),
    // signUp no deja sesión iniciada hasta que se confirma por mail.
    if (!data.session) {
      Toast('Cuenta creada — confirmá tu email para poder iniciar sesión', 'success');
    } else {
      Toast('Cuenta creada e iniciada', 'success');
    }
    refresh();
  });

  document.getElementById('btn-auth-login')?.addEventListener('click', async () => {
    const { email, password } = readCreds();
    if (!email || !password) return Toast('Completá email y contraseña', 'warning');
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return Toast(error.message, 'error');
    Toast('Sesión iniciada', 'success');
    refresh();
  });

  document.getElementById('btn-auth-logout')?.addEventListener('click', async () => {
    await getSupabase().auth.signOut();
    Toast('Sesión cerrada', 'success');
    refresh();
  });

  document.getElementById('btn-auth-sync')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Sincronizando…';
    try {
      const { push, pull } = await runFullSync();
      if (push.error || pull.error) Toast('Sync con errores — ver consola', 'error');
      else Toast(`Sincronizado: ${push.pushed} subidos, ${pull.pulled} bajados`, 'success');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sincronizar ahora';
    }
  });
}
