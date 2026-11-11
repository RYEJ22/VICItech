-- ViciTech OS additive schema migration.
-- Safe to re-run: existing application tables and records are preserved.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  full_name text,
  display_name text not null default 'ViciTech member',
  avatar_url text,
  bio text,
  role text not null default 'user' check (role in ('user', 'admin')),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists display_name text not null default 'ViciTech member',
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists role text not null default 'user',
  add column if not exists updated_at timestamptz not null default now(),
  alter column username drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_value_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_value_check check (role in ('user', 'admin')) not valid;
  end if;
end
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  order_type text not null default 'direct_buy'
    check (order_type in ('direct_buy', 'preset_builder', 'trade_in_refurbished')),
  items jsonb not null default '[]'::jsonb,
  total_price numeric not null default 0 check (total_price >= 0),
  customer_info jsonb not null default '{}'::jsonb,
  status text not null default 'pending_qc'
    check (status in ('pending_qc', 'qc_in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists order_type text not null default 'direct_buy',
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists total_price numeric not null default 0,
  add column if not exists customer_info jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'pending_qc',
  add column if not exists created_at timestamptz not null default now();

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_user_id_idx on public.orders (user_id);

create table if not exists public.hardware_components (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  category text not null check (category in ('cpu', 'gpu', 'ram', 'storage', 'motherboard', 'psu', 'case', 'cooling')),
  architecture text,
  base_price numeric not null default 0 check (base_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  condition text not null default 'brand_new'
    check (condition in ('brand_new', 'refurbished_qc_passed', 'used')),
  specs jsonb not null default '{}'::jsonb,
  performance_score integer not null default 0 check (performance_score between 0 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hardware_components_name_idx on public.hardware_components (name);
create index if not exists hardware_components_category_idx on public.hardware_components (category);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'general'
    check (category in ('general', 'build_showcase', 'troubleshooting', 'news')),
  hardware_specs jsonb not null default '{}'::jsonb,
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx on public.community_posts (created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_prefix text;
  base_username text;
  candidate_username text;
  suffix integer := 0;
begin
  email_prefix := split_part(coalesce(new.email, ''), '@', 1);
  base_username := left(
    coalesce(nullif(regexp_replace(lower(email_prefix), '[^a-z0-9]+', '', 'g'), ''), 'user'),
    20
  );
  candidate_username := base_username;

  loop
    insert into public.profiles (id, username, full_name, display_name, role)
    values (
      new.id,
      candidate_username,
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(email_prefix, ''),
        'ViciTech member'
      ),
      case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin' else 'user' end
    )
    on conflict do nothing;

    if found or exists (select 1 from public.profiles where id = new.id) then
      exit;
    end if;

    suffix := suffix + 1;
    candidate_username := left(base_username, 11)
      || '_'
      || substr(replace(new.id::text, '-', ''), 1, 8)
      || case when suffix > 1 then '_' || suffix::text else '' end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.orders enable row level security;
grant select, insert, update, delete on public.orders to authenticated;

drop policy if exists "Users insert own orders" on public.orders;
create policy "Users insert own orders" on public.orders
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users view own orders" on public.orders;
create policy "Users view own orders" on public.orders
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Admins full access orders" on public.orders;
create policy "Admins full access orders" on public.orders
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table public.hardware_components enable row level security;
grant select on public.hardware_components to anon, authenticated;
grant insert, update, delete on public.hardware_components to authenticated;
drop policy if exists "Public view active components" on public.hardware_components;
create policy "Public view active components" on public.hardware_components
  for select to anon, authenticated using (true);
drop policy if exists "Admins manage components" on public.hardware_components;
create policy "Admins manage components" on public.hardware_components
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

alter table public.community_posts enable row level security;
grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
drop policy if exists "Public read posts" on public.community_posts;
create policy "Public read posts" on public.community_posts
  for select to anon, authenticated using (true);
drop policy if exists "Auth insert posts" on public.community_posts;
create policy "Auth insert posts" on public.community_posts
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users manage own posts" on public.community_posts;
create policy "Users manage own posts" on public.community_posts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'community_posts'
     ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;
end
$$;

do $$
declare
  admin_user_id uuid;
begin
  select id into admin_user_id
  from auth.users
  where lower(email) = 'abdillahraihan110709@gmail.com'
  limit 1;

  if admin_user_id is null then
    raise exception 'Create the Supabase Auth user abdillahraihan110709@gmail.com before running the admin seed.';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
      updated_at = now()
  where id = admin_user_id;

  insert into public.profiles (id, username, full_name, display_name, role)
  values (admin_user_id, 'abdillahraihan110709', 'Raihan Admin', 'Raihan Admin', 'admin')
  on conflict (id) do update set role = 'admin', updated_at = now();
end
$$;
