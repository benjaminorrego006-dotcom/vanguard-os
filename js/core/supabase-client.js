// js/core/supabase-client.js
// Cliente de Supabase vía CDN (esm.sh), sin bundler — respeta cómo está
// armada el resto de la app. El loader de index.html (loadModuleGraph)
// solo reescribe imports relativos que empiezan con '.', así que este
// import absoluto a esm.sh pasa intacto y lo resuelve el navegador nativo.
//
// SUPABASE_ANON_KEY es pública a propósito: la seguridad real la da Row
// Level Security en las tablas de Supabase, no el secreto de esta key.
// La `service_role` key, en cambio, NUNCA debe vivir en este archivo ni
// en ningún archivo que se sirva al cliente.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const SUPABASE_URL = 'https://dgnjoawfaizmbrekxauq.supabase.co';
// Publishable key (formato nuevo de Supabase, reemplaza a la anon key JWT
// pero cumple el mismo rol): pública a propósito, misma seguridad que la
// anon key — la protección real la da Row Level Security en las tablas.
const SUPABASE_ANON_KEY = 'sb_publishable_M0Zsy0vy3oZxG9Mqo1vH2g_fZjrUnuo';

const CONFIGURED = !SUPABASE_URL.includes('TU-PROYECTO') && !SUPABASE_ANON_KEY.includes('TU-ANON-KEY');

let client = null;

export function isSupabaseConfigured() {
  return CONFIGURED;
}

export function getSupabase() {
  if (!CONFIGURED) throw new Error('Supabase todavía no está configurado (js/core/supabase-client.js)');
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
