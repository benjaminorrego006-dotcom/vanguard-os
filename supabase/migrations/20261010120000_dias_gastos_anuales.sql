-- Tablas espejo de los stores nuevos de IndexedDB v6
-- (docs/PLAN-PENDIENTES-OCT.md, A1): 'dias' (descanso planificado y nota del
-- día; id = clave de día) y 'gastos_anuales'. Son copias de lectura del
-- estado local, igual que las demás tablas espejo: la fuente de verdad entre
-- dispositivos sigue siendo `events`. Misma forma que el resto
-- (id, user_id, data, updated_at; PK (user_id, id); RLS por user_id).

create table if not exists public.dias (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.dias enable row level security;

drop policy if exists "dias propios" on public.dias;
create policy "dias propios" on public.dias
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sin los grants, la API (PostgREST) y la service role no ven la tabla
-- aunque tenga RLS.
grant select, insert, update, delete on public.dias to authenticated;
grant select, insert, update, delete on public.dias to service_role;

create table if not exists public.gastos_anuales (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.gastos_anuales enable row level security;

drop policy if exists "gastos_anuales propios" on public.gastos_anuales;
create policy "gastos_anuales propios" on public.gastos_anuales
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.gastos_anuales to authenticated;
grant select, insert, update, delete on public.gastos_anuales to service_role;
