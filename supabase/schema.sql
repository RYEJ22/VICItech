-- =====================================================================================
-- ViciTech OS: Supabase schema (orders + qc_logs)
-- Paste the whole script into the Supabase SQL Editor and run it. It is safe to re-run.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 1. qc_logs: one row per unit that went through the IoT Smart Bench
-- -------------------------------------------------------------------------------------
create table if not exists public.qc_logs (
  id            uuid        primary key default gen_random_uuid(),
  serial_number text        not null unique,                       -- e.g. VICI-SRV-2026-9042
  device_name   text        not null,
  status        text        not null,                              -- e.g. 'Pass', 'Fail', 'In Progress'
  burnin_hours  integer     not null default 0,                    -- burn-in hours completed so far (a full run is 4)
  score         integer,                                           -- 0 to 100, null while a test is still running
  created_at    timestamptz not null default now(),

  constraint qc_logs_serial_format check (serial_number ~ '^VICI-[A-Z]{3}-[0-9]{4}-[0-9]{4}$'),
  constraint qc_logs_burnin_hours_valid check (burnin_hours >= 0),
  constraint qc_logs_score_range check (score between 0 and 100)
);

-- Extended tracking and telemetry fields shared by the public status view and admin portal.
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

create unique index if not exists qc_logs_order_id_idx
  on public.qc_logs (order_id)
  where order_id is not null;

comment on table public.qc_logs is 'IoT stress-test results, looked up by serial number or QR code.';

-- The unique constraint on serial_number already creates the lookup index. This one serves "latest logs" lists.
create index if not exists qc_logs_created_at_idx on public.qc_logs (created_at desc);


-- -------------------------------------------------------------------------------------
-- 2. orders: custom builds, bulk school procurements and refurbished purchases
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

  -- Compatibility columns retained for the existing ViciTech order, QC, and account flows.
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
  constraint orders_user_role_valid check (lower(user_role) in ('b2c', 'b2b', 'b2s')),
  constraint orders_jit_buffer_valid check (jit_buffer >= 0)
);

alter table public.orders
  add column if not exists order_type text not null default 'preset_builder',
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists customer_info jsonb not null default '{}'::jsonb,
  add column if not exists order_summary jsonb not null default '{}'::jsonb,
  add column if not exists order_number text,
  alter column status set default 'pending_qc';

-- Migrate historical checkouts into the normalized order columns without dropping legacy data.
update public.orders
set order_type = case
      when order_summary ->> 'type' in ('direct_buy', 'preset_builder', 'trade_in_refurbished')
        then order_summary ->> 'type'
      when order_summary ->> 'type' in ('direct', 'direct_buy')
        then 'direct_buy'
      when order_summary ->> 'type' like '%refurb%' or order_summary ->> 'type' like '%trade_in%'
        then 'trade_in_refurbished'
      else 'preset_builder'
    end,
    items = case
      when jsonb_typeof(order_summary -> 'items') = 'array' then order_summary -> 'items'
      else items
    end,
    customer_info = case
      when jsonb_typeof(order_summary -> 'buyerDetails') = 'object' then order_summary -> 'buyerDetails'
      else customer_info
    end;

alter table public.orders
  drop constraint if exists orders_total_price_matches,
  drop constraint if exists orders_base_price_valid,
  drop constraint if exists orders_order_type_valid,
  drop constraint if exists orders_items_array,
  drop constraint if exists orders_customer_info_object,
  drop constraint if exists orders_total_price_nonnegative;

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
  add constraint orders_base_price_valid check (base_price is null or base_price >= 0);

create or replace function public.sync_order_schema_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  summary_type text;
begin
  new.user_id := coalesce(new.user_id, auth.uid());
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

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_serial_number_idx on public.orders (serial_number);
create index if not exists orders_status_idx on public.orders (status);
create unique index if not exists orders_order_number_idx on public.orders (order_number) where order_number is not null;

comment on table public.orders is 'ViciTech direct purchases, preset builds, refurbished orders, and QC tracking.';
comment on column public.orders.order_type is 'Checkout flow: direct_buy, preset_builder, or trade_in_refurbished.';
comment on column public.orders.items is 'JSON array containing the purchased items and specifications.';
comment on column public.orders.customer_info is 'Customer and delivery details provided at checkout.';
comment on column public.orders.order_summary is 'Legacy-compatible checkout summary synchronized with normalized order columns.';

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_serial_number_idx on public.orders (serial_number);
create index if not exists orders_status_idx        on public.orders (status);
create unique index if not exists orders_order_number_idx on public.orders (order_number) where order_number is not null;


-- -------------------------------------------------------------------------------------
-- 3. telemetry_logs: append-only sensor readings from real devices or explicit admin simulation
-- -------------------------------------------------------------------------------------
create table if not exists public.telemetry_logs (
  id                 uuid        primary key default gen_random_uuid(),
  serial_number      text        not null references public.qc_logs (serial_number) on delete cascade,
  order_id           text,
  cpu_temp_c         numeric(5,2),
  gpu_temp_c         numeric(5,2),
  fan_rpm            integer,
  voltage_stability  numeric(5,2),
  stability_score    numeric(5,2),
  stress_test_status text        not null default 'Pending',
  burnin_hours       integer     not null default 0,
  source             text        not null default 'esp32',
  created_at         timestamptz not null default now(),
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
-- 4. profiles: authenticated identity and globally unique usernames
-- -------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  username     text,
  display_name text        not null,
  full_name    text,
  avatar_url   text,
  bio          text,
  role         text        not null default 'user',
  updated_at   timestamptz not null default now(),
  constraint profiles_username_unique unique (username)
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists role text not null default 'user';

alter table public.profiles
  alter column username drop not null,
  alter column role set default 'user',
  alter column role set not null,
  drop constraint if exists profiles_username_format;

-- Backfill the profile role from the trusted Supabase app metadata claim.
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

alter table public.profiles
  alter column role set default 'user',
  alter column role set not null;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
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
    insert into public.profiles (id, username, display_name, role)
    values (
      new.id,
      candidate_username,
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

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Promote the designated administrator and update the trusted Supabase claim used by
-- the existing QC and server-side admin authorization policies.
do $$
declare
  admin_user_id uuid;
  email_prefix text := split_part('abdillahraihan110709@gmail.com', '@', 1);
begin
  select id
  into admin_user_id
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

  insert into public.profiles (id, username, display_name, role)
  values (admin_user_id, null, email_prefix, 'admin')
  on conflict (id) do update
  set role = 'admin',
      display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name),
      updated_at = now();
end
$$;

alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "authenticated users read public profiles" on public.profiles;
create policy "authenticated users read public profiles"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "users delete own profile" on public.profiles;
create policy "users delete own profile"
  on public.profiles for delete to authenticated
  using (id = (select auth.uid()));

-- -------------------------------------------------------------------------------------
-- 5. shared_builds: public build statistics shown on user profiles
-- -------------------------------------------------------------------------------------
create table if not exists public.shared_builds (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  title      text        not null,
  created_at timestamptz not null default now()
);

create index if not exists shared_builds_user_created_idx
  on public.shared_builds (user_id, created_at desc);
alter table public.shared_builds enable row level security;
grant select on public.shared_builds to authenticated;

drop policy if exists "authenticated users read shared builds" on public.shared_builds;
create policy "authenticated users read shared builds"
  on public.shared_builds for select to authenticated
  using (true);

drop policy if exists "users create own shared builds" on public.shared_builds;
create policy "users create own shared builds"
  on public.shared_builds for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users delete own shared builds" on public.shared_builds;
create policy "users delete own shared builds"
  on public.shared_builds for delete to authenticated
  using (user_id = (select auth.uid()));

-- Saved presets are account data and public profile statistics, not browser-only state.
create table if not exists public.user_presets (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  role       text        not null default 'b2c',
  parts      jsonb       not null default '[]'::jsonb,
  qty        integer     not null default 1,
  unit_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint user_presets_qty_valid check (qty between 1 and 500),
  constraint user_presets_total_valid check (unit_total >= 0)
);

create index if not exists user_presets_user_created_idx
  on public.user_presets (user_id, created_at desc);
alter table public.user_presets enable row level security;
grant select, insert, delete on public.user_presets to authenticated;

drop policy if exists "users read own presets" on public.user_presets;
create policy "users read own presets"
  on public.user_presets for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "users create own presets" on public.user_presets;
create policy "users create own presets"
  on public.user_presets for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users delete own presets" on public.user_presets;
create policy "users delete own presets"
  on public.user_presets for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.get_public_profile_stats(profile_user_id uuid)
returns table(saved_presets bigint, shared_builds bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*) from public.user_presets where user_id = profile_user_id),
    (select count(*) from public.shared_builds where user_id = profile_user_id)
  where auth.uid() is not null;
$$;
revoke all on function public.get_public_profile_stats(uuid) from public;
grant execute on function public.get_public_profile_stats(uuid) to authenticated;

-- -------------------------------------------------------------------------------------
-- 6. direct_messages: private, append-only conversation messages
-- -------------------------------------------------------------------------------------
create table if not exists public.direct_messages (
  id          uuid        primary key default gen_random_uuid(),
  sender_id   uuid        not null references public.profiles (id) on delete cascade,
  receiver_id uuid        not null references public.profiles (id) on delete cascade,
  content     text        not null,
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now(),
  constraint direct_messages_not_self check (sender_id <> receiver_id),
  constraint direct_messages_content_valid check (char_length(btrim(content)) between 1 and 4000)
);

create index if not exists direct_messages_sender_created_idx
  on public.direct_messages (sender_id, created_at desc);
create index if not exists direct_messages_receiver_created_idx
  on public.direct_messages (receiver_id, created_at desc);
create index if not exists direct_messages_conversation_idx
  on public.direct_messages (sender_id, receiver_id, created_at);
alter table public.direct_messages enable row level security;
grant select, insert, update on public.direct_messages to authenticated;

drop policy if exists "users read own direct messages" on public.direct_messages;
create policy "users read own direct messages"
  on public.direct_messages for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

drop policy if exists "users send direct messages" on public.direct_messages;
create policy "users send direct messages"
  on public.direct_messages for insert to authenticated
  with check ((select auth.uid()) = sender_id and sender_id <> receiver_id);

drop policy if exists "receivers mark direct messages read" on public.direct_messages;
create policy "receivers mark direct messages read"
  on public.direct_messages for update to authenticated
  using ((select auth.uid()) = receiver_id)
  with check ((select auth.uid()) = receiver_id);

create or replace function public.prevent_direct_message_edits()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id
    or new.sender_id <> old.sender_id
    or new.receiver_id <> old.receiver_id
    or new.content <> old.content
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

-- Realtime delivers message inserts to participant-filtered clients; RLS still controls row access.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end
$$;

-- -------------------------------------------------------------------------------------
-- 7. Row Level Security
-- -------------------------------------------------------------------------------------
alter table public.qc_logs enable row level security;
alter table public.orders  enable row level security;
alter table public.telemetry_logs enable row level security;

-- qc_logs: certificate and QR lookups are public; writes require the trusted admin JWT claim.
drop policy if exists "qc_logs are publicly readable" on public.qc_logs;
create policy "qc_logs are publicly readable"
  on public.qc_logs for select
  to anon, authenticated
  using (true);

-- Administrative writes use the trusted JWT app_metadata claim, never user-editable metadata.
drop policy if exists "admins can create qc logs" on public.qc_logs;
create policy "admins can create qc logs"
  on public.qc_logs for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admins can update qc logs" on public.qc_logs;
create policy "admins can update qc logs"
  on public.qc_logs for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Orders: users can create and read their own rows; profile admins have full access.
grant select, insert, update, delete on public.orders to authenticated;

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders"
  on public.orders for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "users create own orders" on public.orders;
create policy "users create own orders"
  on public.orders for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "dev: anon can read orders" on public.orders;
drop policy if exists "dev: anon can create orders" on public.orders;

drop policy if exists "admins read all orders" on public.orders;
drop policy if exists "admins update orders" on public.orders;
drop policy if exists "admins full access to all orders" on public.orders;
create policy "admins full access to all orders"
  on public.orders for all
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

drop policy if exists "telemetry logs are publicly readable" on public.telemetry_logs;
create policy "telemetry logs are publicly readable"
  on public.telemetry_logs for select to anon, authenticated
  using (true);

drop policy if exists "admins can add telemetry logs" on public.telemetry_logs;
create policy "admins can add telemetry logs"
  on public.telemetry_logs for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.telemetry_logs to anon, authenticated;
grant insert on public.telemetry_logs to authenticated;

-- Realtime is required for customer read-only tracking and the admin terminal.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'telemetry_logs'
  ) then
    alter publication supabase_realtime add table public.telemetry_logs;
  end if;
end
$$;


-- -------------------------------------------------------------------------------------
-- 6. No demo QC units are inserted: public tracking only displays registered QC data.
-- -------------------------------------------------------------------------------------
