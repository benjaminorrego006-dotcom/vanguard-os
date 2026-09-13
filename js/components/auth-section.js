// js/components/auth-section.js
// Sección "Cuenta" en Configuración — login/signup/logout contra Supabase
// Auth. Esto es Fase 2 del plan de sincronización entre dispositivos:
// solo la sesión de auth, todavía sin sincronizar ningún dato (eso es
// Fase 3, sobre la tabla `events`). La app sigue funcionando 100% offline
// sin cuenta — esta sección es opcional.
import { Toast } from '../utils/states.js';
import { escapeHtml } from '../utils/escape.js';
import { getSupabase, isSupabaseConfigured } from '../core/supabase-client.js';

export async function getAuthSession() {
  if (!isSupabaseConfigured()) return null;
  const { data: { session } } = await getSupabase().auth.getSession();
  return session;
}

export function renderAuthSection(session) {
  if (!isSupabaseConfigured()) {
    return `<p style="font-size: 13px; color: var(--text-secondary); margin: 0;">Todavía no está configurado el proyecto de Supabase — completá SUPABASE_URL y SUPABASE_ANON_KEY en js/core/supabase-client.js.</p>`;
  }

  if (session?.user) {
    return `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 13px; color: var(--state-success); font-weight: 600;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--state-success); flex-shrink: 0;"></span>
        Sesión iniciada: ${escapeHtml(session.user.email)}
      </div>
      <button id="btn-auth-logout" type="button" class="tappable" style="width: 100%; padding: 12px; border-radius: 12px; background: transparent; color: var(--state-high); border: 1px solid var(--state-high); font-weight: 600; cursor: pointer;">Cerrar sesión</button>
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
    const { data, error } = await getSupabase().auth.signUp({ email, password });
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
}
