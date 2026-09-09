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
