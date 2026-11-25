alter table public.products
  add column if not exists cost_price bigint not null default 0,
  add column if not exists stock_quantity integer not null default 0;

alter table public.orders
  add column if not exists cogs_amount bigint not null default 0,
  add column if not exists gateway_fee bigint not null default 0,
  add column if not exists paid_amount bigint not null default 0,
  add column if not exists cash_status text not null default 'pending_settlement';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_cash_status_check') then
    alter table public.orders add constraint orders_cash_status_check
      check (cash_status in ('settled', 'pending_settlement', 'dp_partial'));
  end if;
end $$;

create table if not exists public.admin_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null,
  description text not null,
  amount bigint not null,
  created_at timestamptz default now(),
  constraint admin_expenses_amount_positive check (amount > 0)
);

alter table public.admin_expenses enable row level security;
drop policy if exists admin_expenses_admin_select on public.admin_expenses;
drop policy if exists admin_expenses_admin_insert on public.admin_expenses;
drop policy if exists admin_expenses_admin_delete on public.admin_expenses;
create policy admin_expenses_admin_select on public.admin_expenses
  for select to authenticated using (public.is_admin());
create policy admin_expenses_admin_insert on public.admin_expenses
  for insert to authenticated with check (public.is_admin());
create policy admin_expenses_admin_delete on public.admin_expenses
  for delete to authenticated using (public.is_admin());
revoke all on public.admin_expenses from anon, authenticated;
grant select, insert, delete on public.admin_expenses to authenticated;
