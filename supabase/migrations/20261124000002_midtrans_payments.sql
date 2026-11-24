alter table public.orders
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_reference text,
  add column if not exists payment_method text,
  add column if not exists paid_at timestamptz;

alter table public.orders
  add constraint orders_payment_status_valid
  check (payment_status in ('unpaid', 'pending', 'paid', 'expired', 'failed'));

create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

create or replace function public.enforce_owner_order_cancellation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
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
    'pending', 'unpaid', 'awaiting_payment', 'processing', 'pending_qc',
    'qc_in_progress', 'iot stress-test pending', 'menunggu pembayaran', 'diproses'
  ) then
    raise exception 'Pesanan dengan status saat ini tidak lagi dapat dibatalkan.';
  end if;

  if new.status <> 'cancelled' then
    raise exception 'Pemilik pesanan hanya dapat mengubah status menjadi cancelled.';
  end if;

  if new.cancel_reason is not null then
    new.cancel_reason := left(btrim(new.cancel_reason), 240);
    if new.cancel_reason = '' then new.cancel_reason := null; end if;
  end if;
  new.cancelled_at := coalesce(new.cancelled_at, now());
  return new;
end;
$$;
