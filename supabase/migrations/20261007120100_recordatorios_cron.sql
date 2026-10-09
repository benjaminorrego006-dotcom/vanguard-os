-- Recordatorios (F1): pg_cron llama cada minuto a la Edge Function
-- enviar-recordatorios con pg_net. La función exige el encabezado
-- x-cron-secret; el secreto vive en Supabase Vault con el nombre
-- 'recordatorios_cron_secret' (se crea aparte, nunca en el repo; ver
-- docs/RECORDATORIOS.md) y en los secretos de la función como CRON_SECRET.

-- Reemplazar el job si ya existía.
select cron.unschedule(jobid)
from cron.job
where jobname = 'enviar-recordatorios';

select cron.schedule(
  'enviar-recordatorios',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://dgnjoawfaizmbrekxauq.supabase.co/functions/v1/enviar-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'recordatorios_cron_secret' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
