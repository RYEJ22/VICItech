-- =====================================================================================
-- ViciTech OS — Consolidated Master Supabase SQL Script
-- Safe to re-run (idempotent) on both fresh and existing Supabase PostgreSQL databases.
--
-- Consolidated from:
--   - supabase/schema.sql
--   - supabase/schema_v2.sql
--   - supabase/hardware_components.sql
--   - supabase/qc_test_reports.sql
--   - supabase/migrations/20261121000001_auth_profiles_hardening.sql
--   - supabase/migrations/20261121000002_rls_policies_core_tables.sql
--   - supabase/migrations/20261121000003_query_optimization_and_atomic_rpcs.sql
--   - supabase/migrations/20261121000004_dm_media_support.sql
--   - supabase/migrations/20261122000005_product_images_storage_and_gallery.sql
--   - supabase/seed.sql
--
-- Conflict resolutions applied:
--   1. public.orders keeps `status text not null default 'pending_qc'` WITHOUT the narrow
--      4-value check constraint from schema_v2.sql so checkout & IoT QC flow statuses
--      ('pending_qc', 'IoT Stress-Test Pending', 'In Progress', 'Pass', etc.) all succeed.
--   2. public.hardware_components uses distinct index names:
--      `hardware_components_name_tsv_idx` (GIN to_tsvector) and
--      `hardware_components_active_name_idx` (btree) instead of colliding on `_name_idx`.
--   3. All functions/triggers use the latest hardened versions (`set search_path = ''`,
--      `(select auth.uid())`, `private.handle_new_user()`), dropping legacy
--      `public.handle_new_user()`.
--   4. Strict per-operation RLS policies across all 13 tables (no `for all` policies).
--   5. Admin account promotion logs a non-blocking NOTICE if the Auth user does not exist yet.
--   6. Storage buckets & policies (`post-media`, `audio-tracks`) run safely inside a
--      guarded dynamic SQL block when `storage.buckets` and `storage.objects` exist.
-- =====================================================================================


-- =====================================================================================
-- SECTION 1: Extensions & Private Schema
-- =====================================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;


-- =====================================================================================
-- SECTION 2: Core Tables, Constraints & Indexes (13 Tables in Dependency Order)
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 2.1 public.profiles
-- -------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  username     text,
  full_name    text,
  display_name text        not null default 'ViciTech member',
  avatar_url   text,
  bio          text,
  role         text        not null default 'user',
  updated_at   timestamptz not null default now(),
  constraint profiles_username_unique unique (username)
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists display_name text not null default 'ViciTech member',
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists role text not null default 'user',
  add column if not exists updated_at timestamptz not null default now(),
  alter column username drop not null,
  alter column role set default 'user',
  alter column role set not null,
  drop constraint if exists profiles_username_format;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_value_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_value_check check (role in ('user', 'admin')) not valid;
  end if;
end
$$;

-- Backfill profile roles from trusted Supabase Auth app_metadata before role-guard triggers.
update public.profiles as profile
set role = case
  when auth_user.raw_app_meta_data ->> 'role' = 'admin' then 'admin'
  else 'user'
end
from auth.users as auth_user
where profile.id = auth_user.id
  and profile.role is distinct from case
    when auth_user.raw_app_meta_data ->> 'role' = 'admin' then 'admin'
    else 'user'
  end;

update public.profiles
set role = 'user'
where role is null;

create index if not exists profiles_username_idx
  on public.profiles (username)
  where username is not null;

create index if not exists profiles_lower_username_idx
  on public.profiles (lower(username))
  where username is not null;


-- -------------------------------------------------------------------------------------
-- 2.2 public.qc_logs
-- -------------------------------------------------------------------------------------
create table if not exists public.qc_logs (
  id                 uuid          primary key default gen_random_uuid(),
  serial_number      text          not null unique,
  device_name        text          not null,
  status             text          not null,
  burnin_hours       integer       not null default 0,
  score              integer,
  created_at         timestamptz   not null default now(),
  order_id           text,
  stress_test_status text          not null default 'Pending',
  cpu_temp_c         numeric(5,2),
  gpu_temp_c         numeric(5,2),
  stability_score    numeric(5,2),
  shipping_status    text          not null default 'In Production',
  certificate_id     text,
  shipped_at         timestamptz,
  updated_at         timestamptz   not null default now(),

  constraint qc_logs_serial_format check (serial_number ~ '^VICI-[A-Z]{3}-[0-9]{4}-[0-9]{4}$'),
  constraint qc_logs_burnin_hours_valid check (burnin_hours >= 0),
  constraint qc_logs_score_range check (score between 0 and 100)
);

alter table public.qc_logs
  add column if not exists order_id text,
  add column if not exists stress_test_status text not null default 'Pending',
  add column if not exists cpu_temp_c numeric(5,2),
  add column if not exists gpu_temp_c numeric(5,2),
  add column if not exists stability_score numeric(5,2),
  add column if not exists shipping_status text not null default 'In Production',
  add column if not exists certificate_id text,
  add column if not exists shipped_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

comment on table public.qc_logs is 'IoT stress-test results, looked up by serial number or QR code.';

create unique index if not exists qc_logs_order_id_idx
  on public.qc_logs (order_id)
  where order_id is not null;

create index if not exists qc_logs_created_at_idx
  on public.qc_logs (created_at desc);


-- -------------------------------------------------------------------------------------
-- 2.3 public.telemetry_logs
-- -------------------------------------------------------------------------------------
create table if not exists public.telemetry_logs (
  id                 uuid         primary key default gen_random_uuid(),
  serial_number      text         not null references public.qc_logs (serial_number) on delete cascade,
  order_id           text,
  cpu_temp_c         numeric(5,2),
  gpu_temp_c         numeric(5,2),
  fan_rpm            integer,
  voltage_stability  numeric(5,2),
  stability_score    numeric(5,2),
  stress_test_status text         not null default 'Pending',
  burnin_hours       integer      not null default 0,
  source             text         not null default 'esp32',
  created_at         timestamptz  not null default now(),

  constraint telemetry_fan_rpm_valid check (fan_rpm is null or fan_rpm >= 0),
  constraint telemetry_voltage_range check (voltage_stability is null or voltage_stability between 0 and 100),
  constraint telemetry_stability_range check (stability_score is null or stability_score between 0 and 100),
  constraint telemetry_burnin_hours_valid check (burnin_hours >= 0),
  constraint telemetry_source_valid check (source in ('esp32', 'admin_simulation'))
);

create index if not exists telemetry_logs_serial_created_idx
  on public.telemetry_logs (serial_number, created_at desc);

create index if not exists telemetry_logs_created_idx
  on public.telemetry_logs (created_at desc);

comment on table public.telemetry_logs is 'Append-only IoT QC readings; simulation payloads are explicitly marked.';


-- -------------------------------------------------------------------------------------
-- 2.4 public.orders (keeps unconstrained status text for checkout + IoT QC states)
-- -------------------------------------------------------------------------------------
create table if not exists public.orders (
  id            uuid          primary key default gen_random_uuid(),
  user_id       uuid          default auth.uid() references auth.users (id) on delete set null,
  order_type    text          not null default 'preset_builder',
  items         jsonb         not null default '[]'::jsonb,
  total_price   numeric(14,2) not null default 0,
  customer_info jsonb         not null default '{}'::jsonb,
  status        text          not null default 'pending_qc',
  created_at    timestamptz   not null default now(),
  order_number  text,
  user_role     text          not null default 'b2c',
  product_name  text          not null default 'Order',
  base_price    numeric(14,2),
  jit_buffer    numeric(14,2) not null default 0,
  order_summary jsonb         not null default '{}'::jsonb,
  serial_number text,

  constraint orders_order_type_valid check (
    order_type in ('direct_buy', 'preset_builder', 'trade_in_refurbished')
  ),
  constraint orders_items_array check (jsonb_typeof(items) = 'array'),
  constraint orders_customer_info_object check (jsonb_typeof(customer_info) = 'object'),
  constraint orders_total_price_nonnegative check (total_price >= 0),
  constraint orders_total_price_matches check (
    base_price is null or total_price = base_price + jit_buffer
  ),
  constraint orders_base_price_valid check (base_price is null or base_price >= 0),
  constraint orders_user_role_valid check (lower(user_role) in ('b2c', 'b2b', 'b2s')),
  constraint orders_jit_buffer_valid check (jit_buffer >= 0)
);

alter table public.orders
  add column if not exists order_type text not null default 'preset_builder',
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists customer_info jsonb not null default '{}'::jsonb,
  add column if not exists order_summary jsonb not null default '{}'::jsonb,
  add column if not exists order_number text,
  add column if not exists user_role text not null default 'b2c',
  add column if not exists product_name text not null default 'Order',
  add column if not exists base_price numeric(14,2),
  add column if not exists jit_buffer numeric(14,2) not null default 0,
  add column if not exists serial_number text,
  alter column status set default 'pending_qc';

-- Migrate historical checkouts into normalized columns without overwriting already-normalized rows.
update public.orders
set order_type = case
      when order_summary ->> 'type' in ('direct_buy', 'preset_builder', 'trade_in_refurbished')
        then order_summary ->> 'type'
      when order_summary ->> 'type' in ('direct', 'direct_buy')
        then 'direct_buy'
      when order_summary ->> 'type' like '%refurb%' or order_summary ->> 'type' like '%trade_in%'
        then 'trade_in_refurbished'
      else coalesce(nullif(order_type, ''), 'preset_builder')
    end,
    items = case
      when jsonb_typeof(order_summary -> 'items') = 'array' then order_summary -> 'items'
      else items
    end,
    customer_info = case
      when jsonb_typeof(order_summary -> 'buyerDetails') = 'object' then order_summary -> 'buyerDetails'
      else customer_info
    end
where order_summary ? 'type'
   or (items = '[]'::jsonb and order_summary ? 'items')
   or (customer_info = '{}'::jsonb and order_summary ? 'buyerDetails');

alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_order_type_check,
  drop constraint if exists orders_total_price_matches,
  drop constraint if exists orders_base_price_valid,
  drop constraint if exists orders_order_type_valid,
  drop constraint if exists orders_items_array,
  drop constraint if exists orders_customer_info_object,
  drop constraint if exists orders_total_price_nonnegative,
  drop constraint if exists orders_user_role_valid,
  drop constraint if exists orders_jit_buffer_valid;

alter table public.orders
  add constraint orders_order_type_valid check (
    order_type in ('direct_buy', 'preset_builder', 'trade_in_refurbished')
  ),
  add constraint orders_items_array check (jsonb_typeof(items) = 'array'),
  add constraint orders_customer_info_object check (jsonb_typeof(customer_info) = 'object'),
  add constraint orders_total_price_nonnegative check (total_price >= 0),
  add constraint orders_total_price_matches check (
    base_price is null or total_price = base_price + jit_buffer
  ),
  add constraint orders_base_price_valid check (base_price is null or base_price >= 0),
  add constraint orders_user_role_valid check (lower(user_role) in ('b2c', 'b2b', 'b2s')),
  add constraint orders_jit_buffer_valid check (jit_buffer >= 0);

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);
create index if not exists orders_created_at_idx
  on public.orders (created_at desc);
create index if not exists orders_user_id_idx
  on public.orders (user_id);
create index if not exists orders_serial_number_idx
  on public.orders (serial_number);
create index if not exists orders_status_idx
  on public.orders (status);
create unique index if not exists orders_order_number_idx
  on public.orders (order_number)
  where order_number is not null;

comment on table public.orders is 'ViciTech direct purchases, preset builds, refurbished orders, and QC tracking.';
comment on column public.orders.order_type is 'Checkout flow: direct_buy, preset_builder, or trade_in_refurbished.';
comment on column public.orders.items is 'JSON array containing the purchased items and specifications.';
comment on column public.orders.customer_info is 'Customer and delivery details provided at checkout.';
comment on column public.orders.order_summary is 'Legacy-compatible checkout summary synchronized with normalized order columns.';


-- -------------------------------------------------------------------------------------
-- 2.5 public.hardware_components
-- -------------------------------------------------------------------------------------
create table if not exists public.hardware_components (
  id                uuid          primary key default gen_random_uuid(),
  name              text          not null,
  brand             text          not null,
  category          text          not null,
  architecture      text,
  base_price        numeric(14,2) not null default 0,
  stock_quantity    integer       not null default 0,
  condition         text          not null default 'brand_new',
  specs             jsonb         not null default '{}'::jsonb,
  performance_score integer       not null default 0,
  is_active         boolean       not null default true,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),

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

-- Drop ambiguous legacy index if present, then ensure distinct GIN + B-tree indexes.
drop index if exists public.hardware_components_name_idx;

create index if not exists hardware_components_name_tsv_idx
  on public.hardware_components using gin (to_tsvector('simple', name));
create index if not exists hardware_components_brand_idx
  on public.hardware_components (brand);
create index if not exists hardware_components_category_idx
  on public.hardware_components (category);
create index if not exists hardware_components_active_category_idx
  on public.hardware_components (category, is_active);
create index if not exists hardware_components_active_name_idx
  on public.hardware_components (is_active, name);


-- -------------------------------------------------------------------------------------
-- 2.6 public.products
-- -------------------------------------------------------------------------------------
create table if not exists public.products (
  id                 uuid          primary key default gen_random_uuid(),
  slug               text          not null unique,
  title              text          not null,
  description        text          not null default '',
  price              numeric(14,2) not null default 0 check (price >= 0),
  category           text          not null check (category in ('pc-build', 'laptop', 'smartphone', 'component', 'accessory')),
  seller_type        text          not null default 'vicitech' check (seller_type in ('vicitech', 'partner')),
  specs              jsonb         not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  images             text[]        not null default '{}',
  image_url          text,
  gallery_urls       text[]        not null default '{}',
  stock_status       text          not null default 'ready' check (stock_status in ('ready', 'preorder', 'sold_out')),
  is_preset          boolean       not null default false,
  preset_components  jsonb         not null default '[]'::jsonb,
  reviewed_by_name   text,
  reviewed_by_avatar text,
  review_quote       text,
  review_video_url   text,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);

alter table public.products
  add column if not exists image_url text,
  add column if not exists gallery_urls text[] not null default '{}';

update public.products
set
  image_url = coalesce(nullif(btrim(image_url), ''), images[1]),
  gallery_urls = case
    when coalesce(cardinality(gallery_urls), 0) > 0 then gallery_urls
    when coalesce(cardinality(images), 0) > 0 then images
    else '{}'::text[]
  end
where (image_url is null or btrim(image_url) = '')
   or coalesce(cardinality(gallery_urls), 0) = 0;

alter table public.products
  drop constraint if exists products_gallery_urls_limit;

alter table public.products
  add constraint products_gallery_urls_limit check (cardinality(gallery_urls) <= 10);

create index if not exists products_category_price_idx
  on public.products (category, price);
create index if not exists products_created_at_idx
  on public.products (created_at desc);
create index if not exists products_category_stock_created_idx
  on public.products (category, stock_status, created_at desc);


-- -------------------------------------------------------------------------------------
-- 2.7 public.partners
-- -------------------------------------------------------------------------------------
create table if not exists public.partners (
  id              uuid         primary key default gen_random_uuid(),
  name            text         not null,
  type            text         not null check (type in ('toko_komponen', 'service_center')),
  address         text         not null,
  city            text         not null,
  gmaps_url       text,
  latitude        numeric(9,6),
  longitude       numeric(9,6),
  is_verified     boolean      not null default true,
  whatsapp_number text,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

create index if not exists partners_city_type_idx
  on public.partners (city, type);
create index if not exists partners_verified_idx
  on public.partners (is_verified);


-- -------------------------------------------------------------------------------------
-- 2.8 public.community_posts
-- -------------------------------------------------------------------------------------
create table if not exists public.community_posts (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  idempotency_key uuid,
  title           text        not null,
  content         text        not null,
  category        text        not null default 'general',
  tags            text[]      not null default '{}',
  media_urls      text[]      not null default '{}',
  media_type      text,
  audio_url       text,
  audio_title     text,
  is_lfg          boolean     not null default false,
  lfg_details     jsonb,
  youtube_url     text,
  hardware_specs  jsonb       not null default '{}'::jsonb,
  likes_count     integer     not null default 0 check (likes_count >= 0),
  created_at      timestamptz not null default now()
);

alter table public.community_posts
  add column if not exists idempotency_key uuid,
  add column if not exists tags text[] not null default '{}',
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists media_type text,
  add column if not exists audio_url text,
  add column if not exists audio_title text,
  add column if not exists is_lfg boolean not null default false,
  add column if not exists lfg_details jsonb,
  add column if not exists youtube_url text;

alter table public.community_posts
  drop constraint if exists community_posts_category_check,
  drop constraint if exists community_posts_category_valid,
  drop constraint if exists community_posts_media_type_valid;

alter table public.community_posts
  add constraint community_posts_category_valid check (
    category in (
      'general',
      'build_showcase',
      'troubleshooting',
      'news',
      'hardware',
      'gaming',
      'dev',
      'creative',
      'meme'
    )
  ),
  add constraint community_posts_media_type_valid check (
    media_type is null or media_type in ('image', 'video')
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.community_posts'::regclass
      and conname = 'community_posts_idempotency_key_key'
  ) then
    alter table public.community_posts
      add constraint community_posts_idempotency_key_key unique (idempotency_key);
  end if;
end
$$;

create index if not exists community_posts_user_id_idx
  on public.community_posts (user_id);
create index if not exists community_posts_category_created_idx
  on public.community_posts (category, created_at desc);
create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);
create index if not exists community_posts_tags_gin_idx
  on public.community_posts using gin (tags);


-- -------------------------------------------------------------------------------------
-- 2.9 public.shared_builds
-- -------------------------------------------------------------------------------------
create table if not exists public.shared_builds (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  title      text        not null,
  created_at timestamptz not null default now()
);

create index if not exists shared_builds_user_created_idx
  on public.shared_builds (user_id, created_at desc);


-- -------------------------------------------------------------------------------------
-- 2.10 public.user_presets
-- -------------------------------------------------------------------------------------
create table if not exists public.user_presets (
  id         uuid          primary key default gen_random_uuid(),
  user_id    uuid          not null references auth.users (id) on delete cascade,
  name       text          not null,
  role       text          not null default 'b2c',
  parts      jsonb         not null default '[]'::jsonb,
  qty        integer       not null default 1,
  unit_total numeric(14,2) not null default 0,
  created_at timestamptz   not null default now(),

  constraint user_presets_qty_valid check (qty between 1 and 500),
  constraint user_presets_total_valid check (unit_total >= 0)
);

create index if not exists user_presets_user_created_idx
  on public.user_presets (user_id, created_at desc);


-- -------------------------------------------------------------------------------------
-- 2.11 public.direct_messages
-- -------------------------------------------------------------------------------------
create table if not exists public.direct_messages (
  id          uuid        primary key default gen_random_uuid(),
  sender_id   uuid        not null references public.profiles (id) on delete cascade,
  receiver_id uuid        not null references public.profiles (id) on delete cascade,
  content     text        not null default '',
  media_urls  text[]      not null default '{}',
  media_type  text,
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now(),

  constraint direct_messages_not_self check (sender_id <> receiver_id),
  constraint direct_messages_media_type_valid check (
    media_type is null or media_type in ('image', 'video')
  ),
  constraint direct_messages_content_valid check (
    (char_length(btrim(content)) between 1 and 4000)
    or (cardinality(media_urls) > 0 and char_length(btrim(content)) <= 4000)
  )
);

alter table public.direct_messages
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists media_type text,
  alter column content set default '';

alter table public.direct_messages
  drop constraint if exists direct_messages_media_type_valid,
  drop constraint if exists direct_messages_content_valid;

alter table public.direct_messages
  add constraint direct_messages_media_type_valid check (
    media_type is null or media_type in ('image', 'video')
  ),
  add constraint direct_messages_content_valid check (
    (char_length(btrim(content)) between 1 and 4000)
    or (cardinality(media_urls) > 0 and char_length(btrim(content)) <= 4000)
  );

create index if not exists direct_messages_sender_created_idx
  on public.direct_messages (sender_id, created_at desc);
create index if not exists direct_messages_receiver_created_idx
  on public.direct_messages (receiver_id, created_at desc);
create index if not exists direct_messages_conversation_idx
  on public.direct_messages (sender_id, receiver_id, created_at);
create index if not exists direct_messages_receiver_unread_idx
  on public.direct_messages (receiver_id)
  where is_read = false;


-- -------------------------------------------------------------------------------------
-- 2.12 public.notifications
-- -------------------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  actor_id   uuid        references auth.users (id) on delete set null,
  type       text        not null check (type in ('like', 'comment', 'dm', 'system')),
  entity_id  text,
  title      text,
  body       text,
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read)
  where is_read = false;


-- -------------------------------------------------------------------------------------
-- 2.13 public.qc_test_reports
-- -------------------------------------------------------------------------------------
create table if not exists public.qc_test_reports (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  overall_status text        not null check (overall_status in ('pass', 'fail', 'in_progress')),
  results        jsonb       not null check (jsonb_typeof(results) = 'array'),
  environment    text        not null default 'simulated' check (environment in ('simulated', 'device')),
  created_at     timestamptz not null default now()
);

create index if not exists qc_test_reports_user_created_idx
  on public.qc_test_reports (user_id, created_at desc);


-- =====================================================================================
-- SECTION 3: Hardened Functions & Triggers (`set search_path = ''`)
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 3.1 Trusted admin role helper for RLS and admin RPCs
-- -------------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 3.2 Profile role escalation guard + private Auth signup provisioning trigger
-- -------------------------------------------------------------------------------------
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') is distinct from 'admin' then
    if tg_op = 'INSERT' then
      new.role := 'user';
    else
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before insert or update on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_prefix text;
  base_username text;
  candidate_username text;
  resolved_full_name text;
  resolved_display_name text;
  resolved_avatar text;
  suffix integer := 0;
begin
  email_prefix := split_part(coalesce(new.email, ''), '@', 1);
  base_username := left(
    coalesce(nullif(regexp_replace(lower(email_prefix), '[^a-z0-9]+', '', 'g'), ''), 'user'),
    20
  );
  if char_length(base_username) < 3 then
    base_username := left(base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 8), 20);
  end if;
  candidate_username := base_username;

  resolved_full_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
  );
  resolved_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    resolved_full_name,
    nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
    nullif(email_prefix, ''),
    'ViciTech member'
  );
  resolved_avatar := nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '');

  loop
    insert into public.profiles (id, username, full_name, display_name, avatar_url, role)
    values (
      new.id,
      candidate_username,
      resolved_full_name,
      resolved_display_name,
      resolved_avatar,
      case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin' else 'user' end
    )
    on conflict do nothing;

    if found or exists (select 1 from public.profiles where id = new.id) then
      exit;
    end if;

    suffix := suffix + 1;
    if suffix >= 10 then
      candidate_username := 'u_' || substr(replace(new.id::text, '-', ''), 1, 18);
    else
      candidate_username := left(base_username, 10)
        || '_'
        || substr(replace(new.id::text, '-', ''), 1, 8)
        || case when suffix > 1 then '_' || suffix::text else '' end;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop function if exists public.handle_new_user();

-- -------------------------------------------------------------------------------------
-- 3.3 Order field sync & hardware_components updated_at triggers
-- -------------------------------------------------------------------------------------
create or replace function public.sync_order_schema_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  summary_type text;
begin
  new.user_id := coalesce(new.user_id, (select auth.uid()));
  new.order_summary := coalesce(new.order_summary, '{}'::jsonb);
  new.items := coalesce(new.items, '[]'::jsonb);
  new.customer_info := coalesce(new.customer_info, '{}'::jsonb);
  new.jit_buffer := coalesce(new.jit_buffer, 0);
  new.user_role := coalesce(new.user_role, 'b2c');

  summary_type := new.order_summary ->> 'type';
  if summary_type in ('direct_buy', 'preset_builder', 'trade_in_refurbished') then
    new.order_type := summary_type;
  elsif summary_type = 'direct' then
    new.order_type := 'direct_buy';
  elsif summary_type like '%refurb%' or summary_type like '%trade_in%' then
    new.order_type := 'trade_in_refurbished';
  else
    new.order_type := coalesce(new.order_type, 'preset_builder');
  end if;

  if new.items = '[]'::jsonb and jsonb_typeof(new.order_summary -> 'items') = 'array' then
    new.items := new.order_summary -> 'items';
  end if;
  if new.customer_info = '{}'::jsonb
    and jsonb_typeof(new.order_summary -> 'buyerDetails') = 'object' then
    new.customer_info := new.order_summary -> 'buyerDetails';
  end if;

  if new.product_name is null or new.product_name = 'Order' then
    new.product_name := coalesce(
      new.order_summary ->> 'productName',
      new.order_summary ->> 'title',
      new.order_summary ->> 'itemTitle',
      new.items -> 0 ->> 'name',
      'Order'
    );
  end if;

  if new.total_price is null then
    new.total_price := coalesce(new.base_price, 0) + new.jit_buffer;
  end if;
  if new.base_price is null then
    new.base_price := greatest(new.total_price - new.jit_buffer, 0);
  end if;

  new.order_summary := new.order_summary || jsonb_build_object(
    'type', new.order_type,
    'items', new.items,
    'buyerDetails', new.customer_info
  );
  return new;
end;
$$;

drop trigger if exists orders_sync_schema_fields on public.orders;
create trigger orders_sync_schema_fields
  before insert or update on public.orders
  for each row execute function public.sync_order_schema_fields();

create or replace function public.set_hardware_component_updated_at()
returns trigger
language plpgsql
set search_path = ''
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

create or replace function public.sync_product_image_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_raw_urls text[] := '{}'::text[];
  v_clean_urls text[] := '{}'::text[];
  v_item text;
  v_trimmed text;
begin
  if tg_op = 'INSERT' then
    if nullif(btrim(coalesce(new.image_url, '')), '') is not null
       or coalesce(cardinality(new.gallery_urls), 0) > 0 then
      if nullif(btrim(coalesce(new.image_url, '')), '') is not null then
        v_raw_urls := array_append(v_raw_urls, btrim(new.image_url));
      end if;
      v_raw_urls := v_raw_urls || coalesce(new.gallery_urls, '{}'::text[]);
    else
      v_raw_urls := coalesce(new.images, '{}'::text[]);
    end if;
  else
    if new.images is distinct from old.images
       and new.image_url is not distinct from old.image_url
       and new.gallery_urls is not distinct from old.gallery_urls then
      v_raw_urls := coalesce(new.images, '{}'::text[]);
    elsif new.image_url is distinct from old.image_url then
      if nullif(btrim(coalesce(new.image_url, '')), '') is not null then
        v_raw_urls := array_append(v_raw_urls, btrim(new.image_url));
      end if;
      v_raw_urls := v_raw_urls || coalesce(new.gallery_urls, '{}'::text[]);
    elsif new.gallery_urls is distinct from old.gallery_urls then
      v_raw_urls := coalesce(new.gallery_urls, '{}'::text[]);
    else
      if nullif(btrim(coalesce(new.image_url, '')), '') is not null then
        v_raw_urls := array_append(v_raw_urls, btrim(new.image_url));
      end if;
      v_raw_urls := v_raw_urls || coalesce(new.gallery_urls, '{}'::text[]);
    end if;
  end if;

  foreach v_item in array coalesce(v_raw_urls, '{}'::text[]) loop
    v_trimmed := nullif(btrim(coalesce(v_item, '')), '');
    if v_trimmed is not null and not (v_trimmed = any(v_clean_urls)) then
      v_clean_urls := array_append(v_clean_urls, v_trimmed);
    end if;
  end loop;

  new.gallery_urls := v_clean_urls;
  new.images := v_clean_urls;
  new.image_url := v_clean_urls[1];
  return new;
end;
$$;

drop trigger if exists products_sync_image_columns on public.products;
create trigger products_sync_image_columns
  before insert or update on public.products
  for each row execute function public.sync_product_image_columns();

-- -------------------------------------------------------------------------------------
-- 3.4 Direct messages & notifications immutability + notification trigger
-- -------------------------------------------------------------------------------------
create or replace function public.prevent_direct_message_edits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.sender_id <> old.sender_id
    or new.receiver_id <> old.receiver_id
    or new.content <> old.content
    or new.media_urls is distinct from old.media_urls
    or new.media_type is distinct from old.media_type
    or new.created_at <> old.created_at
    or old.is_read
    or not new.is_read then
    raise exception 'Direct messages are immutable; recipients may only mark unread messages as read.';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_messages_immutable on public.direct_messages;
create trigger direct_messages_immutable
  before update on public.direct_messages
  for each row execute function public.prevent_direct_message_edits();

create or replace function public.prevent_notification_tampering()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.user_id <> old.user_id
    or new.actor_id is distinct from old.actor_id
    or new.type <> old.type
    or new.entity_id is distinct from old.entity_id
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.created_at <> old.created_at then
    raise exception 'Notifications cannot be edited; recipients may only change is_read.';
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_immutable on public.notifications;
create trigger notifications_immutable
  before update on public.notifications
  for each row execute function public.prevent_notification_tampering();

create or replace function private.notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_preview text;
begin
  v_preview := left(btrim(coalesce(new.content, '')), 160);
  if v_preview = '' and coalesce(cardinality(new.media_urls), 0) > 0 then
    v_preview := case
      when new.media_type = 'video' then '[Video]'
      else '[Foto]'
    end;
  end if;

  insert into public.notifications (user_id, actor_id, type, entity_id, title, body)
  values (
    new.receiver_id,
    new.sender_id,
    'dm',
    new.id::text,
    'Pesan langsung baru',
    nullif(v_preview, '')
  );
  return new;
end;
$$;

revoke all on function private.notify_on_direct_message() from public, anon, authenticated;

drop trigger if exists on_direct_message_notify on public.direct_messages;
create trigger on_direct_message_notify
  after insert on public.direct_messages
  for each row execute function private.notify_on_direct_message();


-- =====================================================================================
-- SECTION 4: RPC Functions
-- =====================================================================================

create or replace function public.get_public_profile_stats(profile_user_id uuid)
returns table(saved_presets bigint, shared_builds bigint)
language sql
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.user_presets where user_id = profile_user_id),
    (select count(*) from public.shared_builds where user_id = profile_user_id)
  where (select auth.uid()) is not null;
$$;

revoke all on function public.get_public_profile_stats(uuid) from public, anon;
grant execute on function public.get_public_profile_stats(uuid) to authenticated;

drop function if exists public.send_direct_message_with_notification(uuid, text);

create or replace function public.send_direct_message_with_notification(
  p_receiver_id uuid,
  p_content text default '',
  p_media_urls text[] default '{}',
  p_media_type text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_trimmed text := btrim(coalesce(p_content, ''));
  v_media_urls text[] := coalesce(p_media_urls, '{}'::text[]);
  v_media_type text := nullif(btrim(coalesce(p_media_type, '')), '');
  v_message_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_receiver_id is null or p_receiver_id = v_me then
    raise exception 'cannot message yourself' using errcode = '22023';
  end if;
  if char_length(v_trimmed) > 4000
     or (char_length(v_trimmed) = 0 and coalesce(cardinality(v_media_urls), 0) = 0) then
    raise exception 'invalid message length' using errcode = '22023';
  end if;
  if coalesce(cardinality(v_media_urls), 0) > 4 then
    raise exception 'too many media attachments' using errcode = '22023';
  end if;
  if v_media_type is not null and v_media_type not in ('image', 'video') then
    raise exception 'invalid media type' using errcode = '22023';
  end if;

  insert into public.direct_messages (sender_id, receiver_id, content, media_urls, media_type)
  values (v_me, p_receiver_id, v_trimmed, v_media_urls, v_media_type)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke execute on function public.send_direct_message_with_notification(uuid, text, text[], text) from public, anon;
grant execute on function public.send_direct_message_with_notification(uuid, text, text[], text) to authenticated;

drop function if exists public.publish_community_post(text, text, text, boolean);

create or replace function public.publish_community_post(
  p_title text,
  p_content text,
  p_category text default 'general',
  p_record_shared_build boolean default false,
  p_media_urls text[] default '{}',
  p_media_type text default null
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  content text,
  category text,
  media_urls text[],
  media_type text,
  likes_count integer,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_title text := btrim(coalesce(p_title, ''));
  v_content text := btrim(coalesce(p_content, ''));
  v_category text := coalesce(nullif(btrim(p_category), ''), 'general');
  v_media_urls text[] := coalesce(p_media_urls, '{}'::text[]);
  v_media_type text := nullif(btrim(coalesce(p_media_type, '')), '');
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if char_length(v_title) not between 1 and 200 then
    raise exception 'title must be between 1 and 200 characters' using errcode = '22023';
  end if;
  if char_length(v_content) not between 1 and 4000 then
    raise exception 'content must be between 1 and 4000 characters' using errcode = '22023';
  end if;
  if coalesce(cardinality(v_media_urls), 0) > 4 then
    raise exception 'too many media attachments' using errcode = '22023';
  end if;
  if v_media_type is not null and v_media_type not in ('image', 'video') then
    raise exception 'invalid media type' using errcode = '22023';
  end if;

  insert into public.community_posts (user_id, title, content, category, media_urls, media_type)
  values (v_me, v_title, v_content, v_category, v_media_urls, v_media_type)
  returning
    community_posts.id,
    community_posts.user_id,
    community_posts.title,
    community_posts.content,
    community_posts.category,
    community_posts.media_urls,
    community_posts.media_type,
    community_posts.likes_count,
    community_posts.created_at
  into id, user_id, title, content, category, media_urls, media_type, likes_count, created_at;

  if coalesce(p_record_shared_build, false) or v_category = 'build_showcase' then
    insert into public.shared_builds (user_id, title)
    values (v_me, title);
  end if;

  return next;
end;
$$;

revoke execute on function public.publish_community_post(text, text, text, boolean, text[], text) from public, anon;
grant execute on function public.publish_community_post(text, text, text, boolean, text[], text) to authenticated;

create or replace function public.get_admin_order_stats()
returns table (
  total_orders bigint,
  total_revenue numeric,
  pending_qc_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin privileges required' using errcode = '42501';
  end if;

  return query
  select
    count(*)::bigint as total_orders,
    coalesce(sum(o.total_price) filter (
      where lower(trim(coalesce(o.status, ''))) not in ('cancelled', 'canceled', 'dibatalkan', 'batal')
    ), 0)::numeric as total_revenue,
    count(*) filter (where o.status = 'pending_qc')::bigint as pending_qc_count
  from public.orders as o;
end;
$$;

revoke execute on function public.get_admin_order_stats() from public, anon;
grant execute on function public.get_admin_order_stats() to authenticated;


-- =====================================================================================
-- SECTION 5: Strict Per-Operation RLS Policies & Grants Across All 13 Tables
-- =====================================================================================

-- 5.1 profiles
alter table public.profiles enable row level security;
revoke all on table public.profiles from public;
grant select on table public.profiles to anon, authenticated;
grant insert, update, delete on table public.profiles to authenticated;

drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "authenticated users read public profiles" on public.profiles;
drop policy if exists "users create own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users delete own profile" on public.profiles;
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_owner" on public.profiles;
drop policy if exists "profiles_update_owner" on public.profiles;
drop policy if exists "profiles_delete_owner" on public.profiles;

create policy "profiles_select_public"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "profiles_insert_owner"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_owner"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_delete_owner"
  on public.profiles
  for delete
  to authenticated
  using ((select auth.uid()) = id);

-- 5.2 community_posts
alter table public.community_posts enable row level security;
revoke all on table public.community_posts from public;
grant select on table public.community_posts to anon, authenticated;
grant insert, update, delete on table public.community_posts to authenticated;

drop policy if exists "Public read posts" on public.community_posts;
drop policy if exists "Auth insert posts" on public.community_posts;
drop policy if exists "Users manage own posts" on public.community_posts;
drop policy if exists "community_posts_select_public" on public.community_posts;
drop policy if exists "community_posts_insert_owner" on public.community_posts;
drop policy if exists "community_posts_update_owner" on public.community_posts;
drop policy if exists "community_posts_delete_owner" on public.community_posts;

create policy "community_posts_select_public"
  on public.community_posts
  for select
  to anon, authenticated
  using (true);

create policy "community_posts_insert_owner"
  on public.community_posts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "community_posts_update_owner"
  on public.community_posts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "community_posts_delete_owner"
  on public.community_posts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 5.3 direct_messages
alter table public.direct_messages enable row level security;
revoke all on table public.direct_messages from public;
grant select, insert, update on table public.direct_messages to authenticated;

drop policy if exists "users read own direct messages" on public.direct_messages;
drop policy if exists "users send direct messages" on public.direct_messages;
drop policy if exists "receivers mark direct messages read" on public.direct_messages;
drop policy if exists "direct_messages_select_participant" on public.direct_messages;
drop policy if exists "direct_messages_insert_sender" on public.direct_messages;
drop policy if exists "direct_messages_update_receiver" on public.direct_messages;

create policy "direct_messages_select_participant"
  on public.direct_messages
  for select
  to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

create policy "direct_messages_insert_sender"
  on public.direct_messages
  for insert
  to authenticated
  with check ((select auth.uid()) = sender_id and sender_id <> receiver_id);

create policy "direct_messages_update_receiver"
  on public.direct_messages
  for update
  to authenticated
  using ((select auth.uid()) = receiver_id)
  with check ((select auth.uid()) = receiver_id);

-- 5.4 notifications
alter table public.notifications enable row level security;
revoke all on table public.notifications from public;
grant select, update, delete on table public.notifications to authenticated;

drop policy if exists "notifications_select_recipient" on public.notifications;
drop policy if exists "notifications_update_recipient" on public.notifications;
drop policy if exists "notifications_delete_recipient" on public.notifications;

create policy "notifications_select_recipient"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_update_recipient"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notifications_delete_recipient"
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 5.5 products
alter table public.products enable row level security;
revoke all on table public.products from public;
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

drop policy if exists "products_select_public" on public.products;
drop policy if exists "products_insert_admin" on public.products;
drop policy if exists "products_update_admin" on public.products;
drop policy if exists "products_delete_admin" on public.products;

create policy "products_select_public"
  on public.products
  for select
  to anon, authenticated
  using (true);

create policy "products_insert_admin"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

create policy "products_update_admin"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_delete_admin"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

-- 5.6 partners
alter table public.partners enable row level security;
revoke all on table public.partners from public;
grant select on table public.partners to anon, authenticated;
grant insert, update, delete on table public.partners to authenticated;

drop policy if exists "partners_select_public" on public.partners;
drop policy if exists "partners_insert_admin" on public.partners;
drop policy if exists "partners_update_admin" on public.partners;
drop policy if exists "partners_delete_admin" on public.partners;

create policy "partners_select_public"
  on public.partners
  for select
  to anon, authenticated
  using (true);

create policy "partners_insert_admin"
  on public.partners
  for insert
  to authenticated
  with check (public.is_admin());

create policy "partners_update_admin"
  on public.partners
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "partners_delete_admin"
  on public.partners
  for delete
  to authenticated
  using (public.is_admin());

-- 5.7 orders
alter table public.orders enable row level security;
revoke all on table public.orders from public;
grant select, insert, update, delete on table public.orders to authenticated;

drop policy if exists "dev: anon can read orders" on public.orders;
drop policy if exists "dev: anon can create orders" on public.orders;
drop policy if exists "admins read all orders" on public.orders;
drop policy if exists "admins update orders" on public.orders;
drop policy if exists "Users insert own orders" on public.orders;
drop policy if exists "Users view own orders" on public.orders;
drop policy if exists "Admins full access orders" on public.orders;
drop policy if exists "users read own orders" on public.orders;
drop policy if exists "users create own orders" on public.orders;
drop policy if exists "admins full access to all orders" on public.orders;
drop policy if exists "orders_select_owner_or_admin" on public.orders;
drop policy if exists "orders_insert_owner" on public.orders;
drop policy if exists "orders_update_admin" on public.orders;
drop policy if exists "orders_delete_admin" on public.orders;

create policy "orders_select_owner_or_admin"
  on public.orders
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "orders_insert_owner"
  on public.orders
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id or public.is_admin());

create policy "orders_update_admin"
  on public.orders
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "orders_delete_admin"
  on public.orders
  for delete
  to authenticated
  using (public.is_admin());

-- 5.8 hardware_components
alter table public.hardware_components enable row level security;
revoke all on table public.hardware_components from public;
grant select on table public.hardware_components to anon, authenticated;
grant insert, update, delete on table public.hardware_components to authenticated;

drop policy if exists "Public view active components" on public.hardware_components;
drop policy if exists "Admins manage components" on public.hardware_components;
drop policy if exists "Public can read hardware components" on public.hardware_components;
drop policy if exists "Admins can insert hardware components" on public.hardware_components;
drop policy if exists "Admins can update hardware components" on public.hardware_components;
drop policy if exists "Admins can delete hardware components" on public.hardware_components;
drop policy if exists "hardware_components_select_public" on public.hardware_components;
drop policy if exists "hardware_components_insert_admin" on public.hardware_components;
drop policy if exists "hardware_components_update_admin" on public.hardware_components;
drop policy if exists "hardware_components_delete_admin" on public.hardware_components;

create policy "hardware_components_select_public"
  on public.hardware_components
  for select
  to anon, authenticated
  using (true);

create policy "hardware_components_insert_admin"
  on public.hardware_components
  for insert
  to authenticated
  with check (public.is_admin());

create policy "hardware_components_update_admin"
  on public.hardware_components
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "hardware_components_delete_admin"
  on public.hardware_components
  for delete
  to authenticated
  using (public.is_admin());

-- 5.9 user_presets
alter table public.user_presets enable row level security;
revoke all on table public.user_presets from public;
grant select, insert, delete on table public.user_presets to authenticated;

drop policy if exists "users read own presets" on public.user_presets;
drop policy if exists "users create own presets" on public.user_presets;
drop policy if exists "users delete own presets" on public.user_presets;
drop policy if exists "user_presets_select_owner" on public.user_presets;
drop policy if exists "user_presets_insert_owner" on public.user_presets;
drop policy if exists "user_presets_delete_owner" on public.user_presets;

create policy "user_presets_select_owner"
  on public.user_presets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_presets_insert_owner"
  on public.user_presets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_presets_delete_owner"
  on public.user_presets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 5.10 shared_builds
alter table public.shared_builds enable row level security;
revoke all on table public.shared_builds from public;
grant select on table public.shared_builds to anon, authenticated;
grant insert, delete on table public.shared_builds to authenticated;

drop policy if exists "authenticated users read shared builds" on public.shared_builds;
drop policy if exists "users create own shared builds" on public.shared_builds;
drop policy if exists "users delete own shared builds" on public.shared_builds;
drop policy if exists "shared_builds_select_public" on public.shared_builds;
drop policy if exists "shared_builds_insert_owner" on public.shared_builds;
drop policy if exists "shared_builds_delete_owner" on public.shared_builds;

create policy "shared_builds_select_public"
  on public.shared_builds
  for select
  to anon, authenticated
  using (true);

create policy "shared_builds_insert_owner"
  on public.shared_builds
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "shared_builds_delete_owner"
  on public.shared_builds
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 5.11 qc_test_reports
alter table public.qc_test_reports enable row level security;
revoke all on table public.qc_test_reports from public;
grant select, insert on table public.qc_test_reports to authenticated;

drop policy if exists "Users can read their own QC reports" on public.qc_test_reports;
drop policy if exists "Users can create their own QC reports" on public.qc_test_reports;
drop policy if exists "qc_test_reports_select_owner_or_admin" on public.qc_test_reports;
drop policy if exists "qc_test_reports_insert_owner" on public.qc_test_reports;

create policy "qc_test_reports_select_owner_or_admin"
  on public.qc_test_reports
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "qc_test_reports_insert_owner"
  on public.qc_test_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- 5.12 qc_logs
alter table public.qc_logs enable row level security;
revoke all on table public.qc_logs from public;
grant select on table public.qc_logs to anon, authenticated;
grant insert, update, delete on table public.qc_logs to authenticated;

drop policy if exists "qc_logs are publicly readable" on public.qc_logs;
drop policy if exists "admins can create qc logs" on public.qc_logs;
drop policy if exists "admins can update qc logs" on public.qc_logs;
drop policy if exists "qc_logs_select_public" on public.qc_logs;
drop policy if exists "qc_logs_insert_admin" on public.qc_logs;
drop policy if exists "qc_logs_update_admin" on public.qc_logs;
drop policy if exists "qc_logs_delete_admin" on public.qc_logs;

create policy "qc_logs_select_public"
  on public.qc_logs
  for select
  to anon, authenticated
  using (true);

create policy "qc_logs_insert_admin"
  on public.qc_logs
  for insert
  to authenticated
  with check (public.is_admin());

create policy "qc_logs_update_admin"
  on public.qc_logs
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "qc_logs_delete_admin"
  on public.qc_logs
  for delete
  to authenticated
  using (public.is_admin());

-- 5.13 telemetry_logs
alter table public.telemetry_logs enable row level security;
revoke all on table public.telemetry_logs from public;
grant select on table public.telemetry_logs to anon, authenticated;
grant insert on table public.telemetry_logs to authenticated;

drop policy if exists "telemetry logs are publicly readable" on public.telemetry_logs;
drop policy if exists "admins can add telemetry logs" on public.telemetry_logs;
drop policy if exists "telemetry_logs_select_public" on public.telemetry_logs;
drop policy if exists "telemetry_logs_insert_admin" on public.telemetry_logs;

create policy "telemetry_logs_select_public"
  on public.telemetry_logs
  for select
  to anon, authenticated
  using (true);

create policy "telemetry_logs_insert_admin"
  on public.telemetry_logs
  for insert
  to authenticated
  with check (public.is_admin());


-- =====================================================================================
-- SECTION 6: Realtime Publications
-- =====================================================================================

do $$
declare
  tbl text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach tbl in array array['direct_messages', 'telemetry_logs', 'community_posts', 'notifications']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end
$$;


-- =====================================================================================
-- SECTION 7: Storage Buckets & Policies (`post-media`, `audio-tracks`, `product-images`)
-- =====================================================================================

do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    execute $sql$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values
        (
          'post-media',
          'post-media',
          true,
          31457280,
          array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
        ),
        (
          'audio-tracks',
          'audio-tracks',
          true,
          15728640,
          array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm']
        ),
        (
          'product-images',
          'product-images',
          true,
          5242880,
          array['image/jpeg', 'image/png', 'image/webp']
        )
      on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

      drop policy if exists "post_media_select_public" on storage.objects;
      drop policy if exists "post_media_insert_owner" on storage.objects;
      drop policy if exists "post_media_update_owner" on storage.objects;
      drop policy if exists "post_media_delete_owner" on storage.objects;

      create policy "post_media_select_public"
        on storage.objects
        for select
        to anon, authenticated
        using (bucket_id = 'post-media');

      create policy "post_media_insert_owner"
        on storage.objects
        for insert
        to authenticated
        with check (
          bucket_id = 'post-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      create policy "post_media_update_owner"
        on storage.objects
        for update
        to authenticated
        using (
          bucket_id = 'post-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
        with check (
          bucket_id = 'post-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      create policy "post_media_delete_owner"
        on storage.objects
        for delete
        to authenticated
        using (
          bucket_id = 'post-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      drop policy if exists "audio_tracks_select_public" on storage.objects;
      drop policy if exists "audio_tracks_insert_admin" on storage.objects;
      drop policy if exists "audio_tracks_update_admin" on storage.objects;
      drop policy if exists "audio_tracks_delete_admin" on storage.objects;

      create policy "audio_tracks_select_public"
        on storage.objects
        for select
        to anon, authenticated
        using (bucket_id = 'audio-tracks');

      create policy "audio_tracks_insert_admin"
        on storage.objects
        for insert
        to authenticated
        with check (bucket_id = 'audio-tracks' and public.is_admin());

      create policy "audio_tracks_update_admin"
        on storage.objects
        for update
        to authenticated
        using (bucket_id = 'audio-tracks' and public.is_admin())
        with check (bucket_id = 'audio-tracks' and public.is_admin());

      create policy "audio_tracks_delete_admin"
        on storage.objects
        for delete
        to authenticated
        using (bucket_id = 'audio-tracks' and public.is_admin());

      drop policy if exists "product_images_select_public" on storage.objects;
      drop policy if exists "product_images_insert_admin" on storage.objects;
      drop policy if exists "product_images_update_admin" on storage.objects;
      drop policy if exists "product_images_delete_admin" on storage.objects;

      create policy "product_images_select_public"
        on storage.objects
        for select
        to anon, authenticated
        using (bucket_id = 'product-images');

      create policy "product_images_insert_admin"
        on storage.objects
        for insert
        to authenticated
        with check (bucket_id = 'product-images' and public.is_admin());

      create policy "product_images_update_admin"
        on storage.objects
        for update
        to authenticated
        using (bucket_id = 'product-images' and public.is_admin())
        with check (bucket_id = 'product-images' and public.is_admin());

      create policy "product_images_delete_admin"
        on storage.objects
        for delete
        to authenticated
        using (bucket_id = 'product-images' and public.is_admin());
    $sql$;
  end if;
end
$$;


-- =====================================================================================
-- SECTION 8: Designated Admin Account Promotion (Non-Blocking)
-- =====================================================================================

do $$
declare
  admin_email text;
  admin_user_id uuid;
  default_username text;
begin
  foreach admin_email in array array[
    'abdillahraihan110709@gmail.com',
    'abdillahraihan110708@gmail.com'
  ]
  loop
    admin_user_id := null;

    select id
    into admin_user_id
    from auth.users
    where lower(email) = lower(admin_email)
    limit 1;

    if admin_user_id is null then
      raise notice 'Skipping admin promotion: Auth user % not found yet. Create the account in Supabase Auth first, then re-run this block.', admin_email;
      continue;
    end if;

    default_username := left(
      coalesce(nullif(regexp_replace(lower(split_part(admin_email, '@', 1)), '[^a-z0-9]+', '', 'g'), ''), 'admin'),
      20
    );

    if exists (
      select 1
      from public.profiles
      where username = default_username
        and id <> admin_user_id
    ) then
      default_username := left(default_username, 11) || '_' || substr(replace(admin_user_id::text, '-', ''), 1, 8);
    end if;

    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
        updated_at = now()
    where id = admin_user_id;

    insert into public.profiles (id, username, full_name, display_name, role)
    values (admin_user_id, default_username, 'Raihan Admin', 'Raihan Admin', 'admin')
    on conflict (id) do update
    set role = 'admin',
        username = coalesce(nullif(public.profiles.username, ''), excluded.username),
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name),
        updated_at = now();
  end loop;
end
$$;


-- =====================================================================================
-- SECTION 9: Demo Seed Data (Idempotent via ON CONFLICT DO UPDATE; Zero Real PII)
-- Out-of-band Demo Accounts (provision passwords outside repo via Supabase Auth UI):
--   1. Regular User     : demo-member@vicitech.local  (role: 'user')
--   2. Verified Builder : demo-builder@vicitech.local (role: 'user', badge: Builder)
-- =====================================================================================

begin;

-- -------------------------------------------------------------------------------------
-- 9.1 5 Preset Setups in public.products
-- -------------------------------------------------------------------------------------
insert into public.products (
  slug,
  title,
  description,
  price,
  category,
  seller_type,
  specs,
  images,
  stock_status,
  is_preset,
  preset_components,
  reviewed_by_name,
  review_quote,
  review_video_url
)
values
  (
    'preset-workstation-creator-1440p',
    'Preset Workstation Creator 1440p',
    'Rakitan siap kerja untuk rendering 1440p dan editing multi-track dengan uji burn-in termal 4 jam serta verifikasi JIT buffer PSU.',
    14950000,
    'pc-build',
    'vicitech',
    '{"cpu":"AMD Ryzen 5 7600","gpu":"NVIDIA RTX 4060 8 GB","ram":"32 GB DDR5-5600","storage":"1 TB NVMe PCIe 4.0","psu":"650 W 80+ Gold","tdp_watts":420,"qc_protocol":"15-Point IoT Bench"}'::jsonb,
    array['/images/hero/pc-rig.jpg'],
    'ready',
    true,
    '[{"slot":"CPU","name":"AMD Ryzen 5 7600"},{"slot":"GPU","name":"NVIDIA RTX 4060 8 GB"},{"slot":"RAM","name":"32 GB DDR5-5600 Dual Channel"},{"slot":"Storage","name":"1 TB NVMe Gen4 SSD"},{"slot":"PSU","name":"650 W 80+ Gold"}]'::jsonb,
    'Rizky Aditya (Verified Builder)',
    'Kurva kipas dan suplai daya sangat tenang di beban render kontinyu 1440p, suhu stabil di kisaran 68 C.',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE'
  ),
  (
    'preset-labkom-cbt-hemat-daya',
    'Paket Pengadaan Labkom CBT Hemat Daya',
    'Konfigurasi desktop sekolah dan ruang ujian CBT dengan efisiensi daya tinggi, pembersihan data NIST 800-88, dan pelacakan serial QC terpusat.',
    5650000,
    'pc-build',
    'vicitech',
    '{"cpu":"Intel Core i3-12100","gpu":"Intel UHD 730","ram":"16 GB DDR4-3200","storage":"512 GB NVMe SSD","psu":"450 W 80+ Bronze","tdp_watts":145,"target_segment":"B2S Labkom"}'::jsonb,
    array['/images/hero/code-screen.jpg'],
    'ready',
    true,
    '[{"slot":"CPU","name":"Intel Core i3-12100"},{"slot":"Motherboard","name":"H610M Micro-ATX"},{"slot":"RAM","name":"16 GB DDR4-3200"},{"slot":"Storage","name":"512 GB NVMe SSD"},{"slot":"PSU","name":"450 W 80+ Bronze"}]'::jsonb,
    'Hendra Wijaya (CBT Lab Lead)',
    'Konsumsi listrik irit untuk pengadaan 30 sampai 40 seat sekaligus dengan suhu ruang ujian tetap terjaga.',
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
  ),
  (
    'preset-esports-1080p-180hz',
    'Preset Esports 1080p 180Hz Ready',
    'Preset gaming kompetitif dengan frame-time konsisten 140+ FPS di 1080p High, airflow depan mesh, dan validasi bottleneck seimbang.',
    11400000,
    'pc-build',
    'vicitech',
    '{"cpu":"AMD Ryzen 5 5600","gpu":"Radeon RX 6600 8 GB","ram":"16 GB DDR4-3600","storage":"1 TB NVMe SSD","psu":"550 W 80+ Bronze","tdp_watts":310,"target_fps":"180 Hz Esports"}'::jsonb,
    array['/images/hero/pc-rig.jpg'],
    'ready',
    true,
    '[{"slot":"CPU","name":"AMD Ryzen 5 5600"},{"slot":"GPU","name":"AMD Radeon RX 6600 8 GB"},{"slot":"RAM","name":"16 GB DDR4-3600"},{"slot":"Storage","name":"1 TB NVMe SSD"},{"slot":"PSU","name":"550 W 80+ Bronze"}]'::jsonb,
    'Bagas Pratama (Verified Builder)',
    'Pilihan paling efisien untuk game kompetitif 1080p dengan margin PSU yang lega bila ingin upgrade GPU nanti.',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE'
  ),
  (
    'preset-thinkpad-t14-dev-edition',
    'ThinkPad T14 Grade A+ Dev Refurbished',
    'Laptop enterprise bersertifikat QC 15-titik dengan repaste termal presisi, kesehatan baterai di atas 88%, dan kapasitas RAM siap upgrade hingga 48 GB.',
    6800000,
    'laptop',
    'vicitech',
    '{"cpu":"AMD Ryzen 5 PRO 4650U","ram":"16 GB DDR4 (Max 48 GB)","storage":"512 GB NVMe SSD","battery_health":"90%","grade":"Grade A+ QC Pass","tdp_watts":45}'::jsonb,
    array['/images/hero/thermal-paste.jpg'],
    'ready',
    true,
    '[{"slot":"Chassis","name":"ThinkPad T14 Gen 1 Grade A+"},{"slot":"Memory","name":"16 GB DDR4-3200 Soldered + Free SO-DIMM Slot"},{"slot":"Storage","name":"512 GB NVMe Gen3"},{"slot":"Thermal","name":"PTM7950 Fresh Repaste"}]'::jsonb,
    'Dewi Anggraini (Lead QC Technician)',
    'Keyboard taktil dan suhu CPU turun 7 C setelah repaste ulang di smart bench ViciTech Bandung.',
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
  ),
  (
    'preset-ai-local-workstation-rtx4070s',
    'Workstation Local AI & 3D Render RTX 4070S',
    'Mesin riset LLM lokal, Blender Cycles, dan simulasi teknik dengan VRAM 12 GB serta RAM DDR5 dual-channel kapasitas besar.',
    24500000,
    'pc-build',
    'vicitech',
    '{"cpu":"Intel Core i5-14600K","gpu":"NVIDIA RTX 4070 Super 12 GB","ram":"64 GB DDR5-6000","storage":"2 TB NVMe Gen4","psu":"850 W 80+ Gold ATX 3.0","tdp_watts":520}'::jsonb,
    array['/images/hero/repair-tech.jpg'],
    'preorder',
    true,
    '[{"slot":"CPU","name":"Intel Core i5-14600K"},{"slot":"GPU","name":"NVIDIA RTX 4070 Super 12 GB"},{"slot":"RAM","name":"64 GB DDR5-6000"},{"slot":"Storage","name":"2 TB NVMe Gen4"},{"slot":"PSU","name":"850 W ATX 3.0 Gold"}]'::jsonb,
    'Rizky Aditya (Verified Builder)',
    'Stabil menjalankan inferensi model 7B-13B secara lokal sambil tetap dingin dan bebas throttling.',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE'
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  category = excluded.category,
  seller_type = excluded.seller_type,
  specs = excluded.specs,
  images = excluded.images,
  stock_status = excluded.stock_status,
  is_preset = excluded.is_preset,
  preset_components = excluded.preset_components,
  reviewed_by_name = excluded.reviewed_by_name,
  review_quote = excluded.review_quote,
  review_video_url = excluded.review_video_url,
  updated_at = now();

-- -------------------------------------------------------------------------------------
-- 9.2 5 Verified Partners in public.partners
-- -------------------------------------------------------------------------------------
insert into public.partners (
  id,
  name,
  type,
  address,
  city,
  gmaps_url,
  latitude,
  longitude,
  is_verified,
  whatsapp_number
)
values
  (
    '22222222-2222-4222-8222-222222222201',
    'ViciTech Hub Bandung',
    'service_center',
    'Jl. Dipatiukur No. 40, Coblong',
    'Bandung',
    'https://maps.google.com/?q=-6.8935,107.6152',
    -6.893500,
    107.615200,
    true,
    '628000000101'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    'Mitra Diagnostik Jakarta Selatan',
    'service_center',
    'Jl. Fatmawati Raya No. 88, Cilandak',
    'Jakarta',
    'https://maps.google.com/?q=-6.2882,106.7966',
    -6.288200,
    106.796600,
    true,
    '628000000102'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    'Mitra Regional Tasikmalaya & Priangan',
    'service_center',
    'Jl. HZ Mustofa No. 115, Tawang',
    'Tasikmalaya',
    'https://maps.google.com/?q=-7.3274,108.2207',
    -7.327400,
    108.220700,
    true,
    '628000000103'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    'Mitra Komponen Hardware Surabaya',
    'toko_komponen',
    'Jl. Dharmahusada No. 64, Gubeng',
    'Surabaya',
    'https://maps.google.com/?q=-7.2658,112.7586',
    -7.265800,
    112.758600,
    true,
    '628000000104'
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    'Mitra Komponen & Servis Yogyakarta',
    'toko_komponen',
    'Jl. Kaliurang KM 6.5, Sleman',
    'Yogyakarta',
    'https://maps.google.com/?q=-7.7525,110.3821',
    -7.752500,
    110.382100,
    true,
    '628000000105'
  )
on conflict (id) do update
set
  name = excluded.name,
  type = excluded.type,
  address = excluded.address,
  city = excluded.city,
  gmaps_url = excluded.gmaps_url,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_verified = excluded.is_verified,
  whatsapp_number = excluded.whatsapp_number,
  updated_at = now();

-- -------------------------------------------------------------------------------------
-- 9.3 Sample QC units + telemetry sources (esp32 vs admin_simulation)
-- -------------------------------------------------------------------------------------
insert into public.qc_logs (
  serial_number,
  device_name,
  status,
  burnin_hours,
  score,
  order_id,
  stress_test_status,
  cpu_temp_c,
  gpu_temp_c,
  stability_score,
  shipping_status,
  certificate_id
)
values
  (
    'VICI-SRV-2026-9042',
    'Preset Workstation Creator 1440p',
    'Pass',
    4,
    98,
    'VT-PO-2026-0412',
    'Complete',
    68.40,
    65.10,
    98.20,
    'Ready to ship',
    'VT-CERT-2026-9042A1'
  ),
  (
    'VICI-LTP-2026-4410',
    'ThinkPad T14 Grade A+ Dev Refurbished',
    'Pass',
    4,
    96,
    'VT-PO-2026-0402',
    'Complete',
    71.20,
    60.50,
    96.40,
    'Shipped',
    'VT-CERT-2026-4410B2'
  ),
  (
    'VICI-DSK-2026-3108',
    'Paket Pengadaan Labkom CBT Hemat Daya',
    'In Progress',
    2,
    null,
    'VT-PO-2026-0419',
    'Running',
    58.90,
    49.00,
    97.60,
    'In QC',
    null
  )
on conflict (serial_number) do update
set
  device_name = excluded.device_name,
  status = excluded.status,
  burnin_hours = excluded.burnin_hours,
  score = excluded.score,
  order_id = excluded.order_id,
  stress_test_status = excluded.stress_test_status,
  cpu_temp_c = excluded.cpu_temp_c,
  gpu_temp_c = excluded.gpu_temp_c,
  stability_score = excluded.stability_score,
  shipping_status = excluded.shipping_status,
  certificate_id = excluded.certificate_id,
  updated_at = now();

insert into public.telemetry_logs (
  id,
  serial_number,
  order_id,
  cpu_temp_c,
  gpu_temp_c,
  fan_rpm,
  voltage_stability,
  stability_score,
  stress_test_status,
  burnin_hours,
  source
)
values
  (
    '33333333-3333-4333-8333-333333333301',
    'VICI-SRV-2026-9042',
    'VT-PO-2026-0412',
    68.40,
    65.10,
    1480,
    99.10,
    98.20,
    'Complete',
    4,
    'esp32'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    'VICI-LTP-2026-4410',
    'VT-PO-2026-0402',
    71.20,
    60.50,
    1820,
    98.30,
    96.40,
    'Complete',
    4,
    'admin_simulation'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    'VICI-DSK-2026-3108',
    'VT-PO-2026-0419',
    58.90,
    49.00,
    1220,
    99.40,
    97.60,
    'Running',
    2,
    'esp32'
  )
on conflict (id) do update
set
  cpu_temp_c = excluded.cpu_temp_c,
  gpu_temp_c = excluded.gpu_temp_c,
  fan_rpm = excluded.fan_rpm,
  voltage_stability = excluded.voltage_stability,
  stability_score = excluded.stability_score,
  stress_test_status = excluded.stress_test_status,
  burnin_hours = excluded.burnin_hours,
  source = excluded.source;

-- -------------------------------------------------------------------------------------
-- 9.4 10 Community Posts across categories (requires >= 1 existing auth.users row)
-- -------------------------------------------------------------------------------------
do $$
declare
  v_demo_user_id uuid;
begin
  select id into v_demo_user_id
  from auth.users
  order by created_at asc
  limit 1;

  if v_demo_user_id is null then
    raise notice 'Skipping community_posts seed: create an auth.users account first, then re-run master_schema.sql or seed.sql.';
    return;
  end if;

  insert into public.community_posts (
    id,
    user_id,
    title,
    content,
    category,
    tags,
    is_lfg,
    lfg_details,
    likes_count
  )
  values
    (
      '11111111-1111-4111-8111-111111111101',
      v_demo_user_id,
      'Rakit PC Esports 1080p di Bawah Rp 12 Juta',
      'Kombinasi Ryzen 5 5600 + RX 6600 menjaga frame time stabil di atas 140 FPS pada suhu load di bawah 66 C. #RTX #Ryzen5 #BudgetBuild',
      'hardware',
      array['Ryzen5', 'RX6600', 'BudgetBuild'],
      false,
      null,
      94
    ),
    (
      '11111111-1111-4111-8111-111111111102',
      v_demo_user_id,
      'Workstation Editing 4K Senyap 35 dB',
      'Penyesuaian kurva kipas intake dan exhaust menjaga kebisingan tetap rendah saat render Adobe Premiere berdurasi panjang. #SilentBuild #CreatorRig',
      'creative',
      array['CreatorRig', 'SilentBuild', 'Workflow4K'],
      false,
      null,
      152
    ),
    (
      '11111111-1111-4111-8111-111111111103',
      v_demo_user_id,
      'Mabar Valorant & CS2 Malam Ini (Server Jakarta)',
      'Butuh 2 pemain role Controller/Sentinel untuk custom scrim santai jam 20.00 WIB. Langsung klik DM untuk koordinasi lobby.',
      'gaming',
      array['LFG', 'Valorant', 'Mabar'],
      true,
      '{"game":"Valorant","rank":"Gold–Platinum","slots_needed":2,"status":"open"}'::jsonb,
      46
    ),
    (
      '11111111-1111-4111-8111-111111111104',
      v_demo_user_id,
      'Setup Docker + Local LLM 7B di ThinkPad T14 Refurbished',
      'Upgrade RAM ke 32 GB DDR4 membuat container backend dan database lokal berjalan lancar tanpa swap berlebih.',
      'dev',
      array['ThinkPad', 'Docker', 'LocalDev'],
      false,
      null,
      118
    ),
    (
      '11111111-1111-4111-8111-111111111105',
      v_demo_user_id,
      'Cara Mencegah Thermal Throttling di Lab Sekolah 36 Unit',
      'Pembersihan filter debu per semester dan repaste CPU di atas usia tiga tahun menurunkan suhu puncak lab CBT hingga 9 C.',
      'hardware',
      array['CBTSetup', 'LabMaintenance', 'Thermal'],
      false,
      null,
      203
    ),
    (
      '11111111-1111-4111-8111-111111111106',
      v_demo_user_id,
      'Rekap Indeks Harga GPU Bekas Tersertifikasi Minggu Ini',
      'Unit RTX 4060 dan RTX 3060 Ti Grade A menunjukkan pasokan stabil di Hub Bandung dengan garansi inspeksi 15 titik.',
      'news',
      array['HargaGPU', 'RefurbishedQC'],
      false,
      null,
      89
    ),
    (
      '11111111-1111-4111-8111-111111111107',
      v_demo_user_id,
      'Checklist Jaringan & UPS untuk 30 PC Ujian Serentak',
      'Pembagian beban UPS per 6 unit dan switch gigabit managed mencegah drop tegangan ketika seluruh lab menyala bersamaan.',
      'troubleshooting',
      array['CBTSetup', 'UPS', 'Jaringan'],
      false,
      null,
      144
    ),
    (
      '11111111-1111-4111-8111-111111111108',
      v_demo_user_id,
      'Mabar Apex Legends Ranked — Butuh IGL Santai',
      'Sesi malam ini mencari satu rekan skuad dengan komunikasi Discord jernih dan ping stabil di server SG.',
      'gaming',
      array['ApexLegends', 'LFG'],
      true,
      '{"game":"Apex Legends","rank":"Platinum","slots_needed":1,"status":"open"}'::jsonb,
      39
    ),
    (
      '11111111-1111-4111-8111-111111111109',
      v_demo_user_id,
      'Eksperimen Script Monitoring Suhu ESP32 ke Dashboard QC',
      'Membaca sensor DHT22 + NTC langsung ke endpoint telemetry dengan payload terkalibrasi setiap 10 detik.',
      'dev',
      array['ESP32', 'Telemetry', 'IoT'],
      false,
      null,
      131
    ),
    (
      '11111111-1111-4111-8111-111111111110',
      v_demo_user_id,
      'Meme Rakit PC: Lupa Pasang I/O Shield Setelah Baut Selesai',
      'Momen klasik teknisi akhir pekan—kabel sudah rapi, eh pelat belakang motherboard masih tertinggal di kotak.',
      'meme',
      array['PCMeme', 'RakitPC'],
      false,
      null,
      215
    )
  on conflict (id) do update
  set
    title = excluded.title,
    content = excluded.content,
    category = excluded.category,
    tags = excluded.tags,
    is_lfg = excluded.is_lfg,
    lfg_details = excluded.lfg_details,
    likes_count = excluded.likes_count;
end
$$;

commit;
