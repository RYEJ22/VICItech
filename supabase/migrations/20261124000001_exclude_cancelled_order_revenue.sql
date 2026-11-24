-- Keep all recorded orders in the order count while excluding cancellations from revenue.
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
