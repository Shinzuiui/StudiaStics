-- Ejecuta esto completo en Supabase > SQL Editor > New query > Run

-- Tabla de ramos/materias
create table ramos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  nombre text not null,
  color text not null default '#2F6F4F',
  created_at timestamptz default now()
);

-- Tabla de sesiones de estudio
create table sesiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  ramo_id uuid references ramos not null,
  fecha date not null default current_date,
  duracion_minutos integer not null check (duracion_minutos > 0),
  metodo text not null check (metodo in ('timer', 'manual')),
  hora_inicio time,
  hora_fin time,
  created_at timestamptz default now()
);

-- Row Level Security: cada usuario solo ve/edita sus propios datos
alter table ramos enable row level security;
alter table sesiones enable row level security;

create policy "Users can manage their own ramos"
  on ramos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own sesiones"
  on sesiones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.ramos to authenticated;
grant select, insert, update, delete on table public.sesiones to authenticated;

-- ────────────────────────────────────────────
-- Tabla de metas diarias (Fase 1)
-- NOTA: ejecutar este bloque por separado en SQL Editor
--       si las tablas ramos/sesiones ya existen.
-- ────────────────────────────────────────────

create table metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  meta_minutos integer not null check (meta_minutos > 0),
  fecha_inicio date not null default current_date,
  created_at timestamptz default now()
);

alter table metas enable row level security;

create policy "Users can manage their own metas"
  on metas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.metas to authenticated;
