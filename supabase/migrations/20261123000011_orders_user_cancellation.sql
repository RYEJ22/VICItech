-- =====================================================================================
-- ViciTech Migration 20261123000011: Owner Order Cancellation & Metadata
-- Safe & idempotent: adds nullable cancel_reason & cancelled_at columns,
-- guards against non-admin tampering on order financial/item fields, and permits
-- authenticated order owners to cancel eligible pending/processing orders.
-- =====================================================================================

alter table public.orders
  add column if not exists cancel_reason text,
  add column if not exists cancelled_at timestamptz;

create or replace function public.enforce_owner_order_cancellation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.id <> old.id
    or new.user_id <> old.user_id
    or new.order_number is distinct from old.order_number
    or new.product_name is distinct from old.product_name
    or new.base_price is distinct from old.base_price
    or new.jit_buffer is distinct from old.jit_buffer
    or new.total_price is distinct from old.total_price
    or new.serial_number is distinct from old.serial_number
    or new.order_summary is distinct from old.order_summary
    or new.created_at <> old.created_at then
    raise exception 'Hanya status pembatalan pesanan yang dapat diperbarui oleh pemilik pesanan.';
  end if;

  if lower(coalesce(old.status, '')) not in (
    'pending',
    'unpaid',
    'awaiting_payment',
    'processing',
    'pending_qc',
    'qc_in_progress',
    'iot stress-test pending',
    'menunggu pembayaran',
    'diproses'
  ) then
    raise exception 'Pesanan dengan status saat ini tidak lagi dapat dibatalkan.';
  end if;

  if new.status <> 'cancelled' then
    raise exception 'Pemilik pesanan hanya dapat mengubah status menjadi cancelled.';
  end if;

  if new.cancel_reason is not null then
    new.cancel_reason := left(btrim(new.cancel_reason), 240);
    if new.cancel_reason = '' then
      new.cancel_reason := null;
    end if;
  end if;

  new.cancelled_at := coalesce(new.cancelled_at, now());
  return new;
end;
$$;

drop trigger if exists orders_owner_cancel_guard on public.orders;
create trigger orders_owner_cancel_guard
  before update on public.orders
  for each row execute function public.enforce_owner_order_cancellation();

drop policy if exists "orders_cancel_owner" on public.orders;
create policy "orders_cancel_owner"
  on public.orders
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and lower(coalesce(status, '')) in (
      'pending',
      'unpaid',
      'awaiting_payment',
      'processing',
      'pending_qc',
      'qc_in_progress',
      'iot stress-test pending',
      'menunggu pembayaran',
      'diproses'
    )
  )
  with check (
    (select auth.uid()) = user_id
    and status = 'cancelled'
    and (cancel_reason is null or char_length(btrim(cancel_reason)) <= 240)
  );
