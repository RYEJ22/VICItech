-- ViciTech OS hardware component registry.
-- Run in the Supabase SQL Editor. Safe to re-run.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.hardware_components (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  category text not null,
  architecture text,
  base_price numeric(14, 2) not null default 0,
  stock_quantity integer not null default 0,
  condition text not null default 'brand_new',
  specs jsonb not null default '{}'::jsonb,
  performance_score integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hardware_components_category_valid check (
    category in ('cpu', 'gpu', 'ram', 'storage', 'motherboard', 'psu', 'case', 'cooling')
  ),
  constraint hardware_components_condition_valid check (
    condition in ('brand_new', 'refurbished_qc_passed', 'used')
  ),
  constraint hardware_components_price_nonnegative check (base_price >= 0),
  constraint hardware_components_stock_nonnegative check (stock_quantity >= 0),
  constraint hardware_components_score_range check (performance_score between 0 and 10000),
  constraint hardware_components_specs_object check (jsonb_typeof(specs) = 'object')
);

create index if not exists hardware_components_name_idx
  on public.hardware_components using gin (to_tsvector('simple', name));
create index if not exists hardware_components_brand_idx
  on public.hardware_components (brand);
create index if not exists hardware_components_category_idx
  on public.hardware_components (category);
create index if not exists hardware_components_active_category_idx
  on public.hardware_components (category, is_active);

create or replace function public.set_hardware_component_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists hardware_components_set_updated_at on public.hardware_components;
create trigger hardware_components_set_updated_at
before update on public.hardware_components
for each row execute function public.set_hardware_component_updated_at();

alter table public.hardware_components enable row level security;

drop policy if exists "Public can read hardware components" on public.hardware_components;
create policy "Public can read hardware components"
on public.hardware_components
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert hardware components" on public.hardware_components;
create policy "Admins can insert hardware components"
on public.hardware_components
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can update hardware components" on public.hardware_components;
create policy "Admins can update hardware components"
on public.hardware_components
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admins can delete hardware components" on public.hardware_components;
create policy "Admins can delete hardware components"
on public.hardware_components
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

grant select on public.hardware_components to anon, authenticated;
grant insert, update, delete on public.hardware_components to authenticated;
