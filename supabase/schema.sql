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

comment on table public.qc_logs is 'IoT stress-test results, looked up by serial number or QR code.';

-- The unique constraint on serial_number already creates the lookup index. This one serves "latest logs" lists.
create index if not exists qc_logs_created_at_idx on public.qc_logs (created_at desc);


-- -------------------------------------------------------------------------------------
-- 2. orders: custom builds, bulk school procurements and refurbished purchases
-- -------------------------------------------------------------------------------------
create table if not exists public.orders (
  id            uuid          primary key default gen_random_uuid(),

  -- Owner of the order. Filled automatically with the signed-in user (null for service-role or anonymous inserts).
  user_id       uuid          default auth.uid() references auth.users (id) on delete set null,

  user_role     text          not null,                            -- 'b2c' | 'b2b' | 'b2s'
  product_name  text          not null,
  base_price    numeric(14,2) not null,                            -- list price in IDR
  jit_buffer    numeric(14,2) not null default 0,                  -- just-in-time buffer added on top of the base price
  total_price   numeric(14,2) not null,                            -- always base_price + jit_buffer
  order_summary jsonb         not null default '{}'::jsonb,
  status        text          not null default 'IoT Stress-Test Pending',
  serial_number text,                                              -- assigned once the unit is tested (see qc_logs)
  created_at    timestamptz   not null default now(),

  constraint orders_user_role_valid     check (lower(user_role) in ('b2c', 'b2b', 'b2s')),
  constraint orders_base_price_valid    check (base_price >= 0),
  constraint orders_jit_buffer_valid    check (jit_buffer >= 0),
  constraint orders_total_price_matches check (total_price = base_price + jit_buffer)
);

alter table public.orders
  add column if not exists order_summary jsonb not null default '{}'::jsonb;

comment on table  public.orders             is 'Customer orders and pre-orders across the B2C, B2B and B2S roles.';
comment on column public.orders.jit_buffer  is 'Just-in-time buffer (IDR) added to base_price.';
comment on column public.orders.status      is 'Free text. Suggested values: IoT Stress-Test Pending, IoT Stress-Testing, Packaging at Bandung Hub, Shipped.';

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_serial_number_idx on public.orders (serial_number);
create index if not exists orders_status_idx        on public.orders (status);


-- -------------------------------------------------------------------------------------
-- 3. Row Level Security
-- -------------------------------------------------------------------------------------
alter table public.qc_logs enable row level security;
alter table public.orders  enable row level security;

-- qc_logs: certificate and QR lookups are public. Writes are service-role only (no insert/update policy).
drop policy if exists "qc_logs are publicly readable" on public.qc_logs;
create policy "qc_logs are publicly readable"
  on public.qc_logs for select
  to anon, authenticated
  using (true);

-- orders: signed-in users can read and create their own orders. Status changes and deletes happen server-side.
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

-- DEV ONLY policies (for development without user login):
create policy "dev: anon can read orders"   on public.orders for select to anon using (true);
create policy "dev: anon can create orders" on public.orders for insert to anon with check (true);


-- -------------------------------------------------------------------------------------
-- 4. Sample QC rows (match the serials used in the app's demo data)
-- -------------------------------------------------------------------------------------
insert into public.qc_logs (serial_number, device_name, status, burnin_hours, score) values
  ('VICI-SRV-2026-9042', 'ViciTech GPU Server 4U',                'Pass', 4, 98),
  ('VICI-LTP-2026-1187', 'ThinkPad T14 Gen 4 (Refurbished A+)',   'Pass', 4, 96),
  ('VICI-DSK-2026-3305', 'ViciTech Office Workstation SFF',       'Pass', 4, 97)
on conflict (serial_number) do nothing;
