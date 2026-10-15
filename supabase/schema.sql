-- La Produ · Baila La Chola — base de datos en Supabase
-- Se corre una sola vez en: Supabase → SQL Editor → New query → Run.

-- Personas habilitadas para entrar (se editan desde Table Editor → miembros)
create table public.miembros (
  email text primary key,
  nombre text,
  creado timestamptz not null default now()
);

-- Cada fecha completa (checklist, plata, updates, relato…) en un JSON
create table public.fechas (
  id text primary key,
  data jsonb not null,
  actualizada timestamptz not null default now(),
  actualizada_por text
);

-- ¿La persona logueada está en la lista?
create or replace function public.es_miembro()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.miembros
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

alter table public.miembros enable row level security;
alter table public.fechas   enable row level security;

create policy "miembros ven la lista" on public.miembros
  for select to authenticated using (public.es_miembro());
create policy "miembros leen fechas" on public.fechas
  for select to authenticated using (public.es_miembro());
create policy "miembros crean fechas" on public.fechas
  for insert to authenticated with check (public.es_miembro());
create policy "miembros editan fechas" on public.fechas
  for update to authenticated using (public.es_miembro()) with check (public.es_miembro());
create policy "miembros borran fechas" on public.fechas
  for delete to authenticated using (public.es_miembro());

-- Vistas tipo planilla (Table Editor → se exportan a CSV)
create view public.planilla_fechas with (security_invoker = true) as
select id, data->>'nombre' as nombre, data->>'fecha' as fecha,
       data->>'lugar' as lugar, data->>'estado' as estado,
       data->>'responsable' as responsable, actualizada, actualizada_por
from public.fechas;

create view public.planilla_movimientos with (security_invoker = true) as
select f.id as fecha_id, f.data->>'nombre' as fecha_nombre,
       m->>'fecha' as dia, m->>'concepto' as concepto, m->>'categoria' as categoria,
       m->>'tipo' as tipo, (m->>'monto')::numeric as monto, m->>'moneda' as moneda,
       m->>'pago' as pago, m->>'recibio' as recibio, m->>'estado' as estado,
       m->>'observaciones' as observaciones
from public.fechas f,
     jsonb_array_elements(coalesce(f.data->'movimientos', '[]'::jsonb)) m;

grant select, insert, update, delete on public.fechas to authenticated;
grant select on public.miembros, public.planilla_fechas, public.planilla_movimientos to authenticated;
grant execute on function public.es_miembro() to authenticated;

-- Quiénes pueden entrar
insert into public.miembros (email, nombre) values
  ('cou.infante@gmail.com', 'Cou'),
  ('inechiappe@gmail.com', 'Ine'),
  ('clarastreger@gmail.com', 'Clari'),
  ('perriantonnella@gmail.com', 'Anto'),
  ('marianabrusse.clases@gmail.com', 'Marian');
