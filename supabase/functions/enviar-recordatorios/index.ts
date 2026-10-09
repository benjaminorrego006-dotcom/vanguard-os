// Edge Function enviar-recordatorios (docs/RECORDATORIOS-PLAN.md, F1).
//
// La llama pg_cron cada minuto (supabase/migrations/*_recordatorios_cron.sql).
// Toma los recordatorios vencidos (envia_en <= ahora) sin enviar, los marca
// como enviados en un solo UPDATE (así dos llamadas que se pisen no mandan
// dos veces) y envía cada uno a todas las suscripciones push de su usuario.
// Una suscripción que responde 404 o 410 ya no existe en el navegador: se
// borra. Un aviso vencido hace más de una hora (teléfono apagado, función
// caída) se marca pero no se envía: llegaría tarde y confundiría.
//
// Secretos (npx supabase secrets set, nunca en el repo):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...),
//   CRON_SECRET (el mismo valor que 'recordatorios_cron_secret' en Vault).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import webpush from 'npm:web-push@3.6.7';

const MAX_RETRASO_MS = 60 * 60 * 1000;

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  // Solo pg_cron (o quien tenga el secreto) puede dispararla.
  const secreto = Deno.env.get('CRON_SECRET');
  if (!secreto || req.headers.get('x-cron-secret') !== secreto) return json({ error: 'no autorizado' }, 401);

  const publica = Deno.env.get('VAPID_PUBLIC_KEY');
  const privada = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT');
  if (!publica || !privada || !subject) return json({ error: 'faltan las claves VAPID' }, 500);
  webpush.setVapidDetails(subject, publica, privada);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const ahora = new Date();
  // Reclamar los vencidos: el UPDATE ... RETURNING es atómico.
  const { data: tomados, error: errTomar } = await supabase
    .from('recordatorios')
    .update({ enviado_en: ahora.toISOString() })
    .is('enviado_en', null)
    .lte('envia_en', ahora.toISOString())
    .select('user_id, id, envia_en, titulo, cuerpo, url');
  if (errTomar) return json({ error: errTomar.message }, 500);
  if (!tomados || tomados.length === 0) return json({ tomados: 0, enviados: 0, fallidos: 0, suscripcionesBorradas: 0 });

  const usuarios = [...new Set(tomados.map((r) => r.user_id))];
  const { data: subs, error: errSubs } = await supabase
    .from('push_suscripciones')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', usuarios);
  if (errSubs) return json({ error: errSubs.message }, 500);

  let enviados = 0, fallidos = 0, atrasados = 0;
  const muertas = new Set<string>();
  for (const r of tomados) {
    if (ahora.getTime() - new Date(r.envia_en).getTime() > MAX_RETRASO_MS) { atrasados++; continue; }
    const payload = JSON.stringify({ id: r.id, titulo: r.titulo, cuerpo: r.cuerpo, url: r.url });
    for (const s of (subs || []).filter((x) => x.user_id === r.user_id)) {
      if (muertas.has(s.endpoint)) continue;
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'high' });
        enviados++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) muertas.add(s.endpoint);
        else fallidos++;
        console.error('[enviar-recordatorios] envío fallido', status, (e as Error).message);
      }
    }
  }
  for (const endpoint of muertas) {
    await supabase.from('push_suscripciones').delete().eq('endpoint', endpoint);
  }
  return json({ tomados: tomados.length, enviados, fallidos, atrasados, suscripcionesBorradas: muertas.size });
});
