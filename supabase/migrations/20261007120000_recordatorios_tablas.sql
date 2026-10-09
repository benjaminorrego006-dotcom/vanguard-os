-- Recordatorios (docs/RECORDATORIOS-PLAN.md, F1): suscripciones push por
-- dispositivo y avisos ya calculados por la app. El servidor no entiende de
-- hábitos ni tareas: solo envía lo que vence. Las dos tablas llevan RLS con
-- user_id = auth.uid(), igual que `events`. La Edge Function usa la service
-- role (sin RLS) para leer los vencidos de todos.

-- Extensiones para el envío cada minuto (el job está en la migración
-- siguiente). En Supabase, pg_cron va en pg_catalog y pg_net en extensions.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Una fila por dispositivo suscrito (el endpoint lo da el navegador).
create table if not exists public.push_suscripciones (
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  creado_en timestamptz not null default now(),
  dispositivo text,
  primary key (user_id, endpoint)
);

alter table public.push_suscripciones enable row level security;

drop policy if exists "push_suscripciones propias" on public.push_suscripciones;
create policy "push_suscripciones propias" on public.push_suscripciones
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sin el grant, la API (PostgREST) no ve la tabla aunque tenga RLS.
grant select, insert, update, delete on public.push_suscripciones to authenticated;

-- Avisos de los próximos días, con id estable (p. ej. habito:<id>:<fecha>)
-- para que la app los reemplace sin duplicar. enviado_en null = pendiente.
create table if not exists public.recordatorios (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  envia_en timestamptz not null,
  titulo text not null,
  cuerpo text not null default '',
  url text not null default './',
  enviado_en timestamptz,
  primary key (user_id, id)
);

-- La función busca los pendientes vencidos: índice solo sobre esos.
create index if not exists recordatorios_pendientes_idx
  on public.recordatorios (envia_en)
  where enviado_en is null;

alter table public.recordatorios enable row level security;

drop policy if exists "recordatorios propios" on public.recordatorios;
create policy "recordatorios propios" on public.recordatorios
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.recordatorios to authenticated;

-- En este proyecto las tablas nuevas tampoco quedan visibles para la service
-- role sin grant explícito (la Edge Function la usa para leer y marcar).
grant select, insert, update, delete on public.push_suscripciones to service_role;
grant select, insert, update, delete on public.recordatorios to service_role;
