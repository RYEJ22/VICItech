-- =====================================================================================
-- ViciTech OS Migration 20261121000003: Query Optimization & Atomic RPCs (SOP-09)
-- Adds composite/partial indexes matched to app WHERE + ORDER BY clauses, hardens
-- trigger functions with empty search_path, and adds atomic multi-table RPCs.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Query-matched composite & partial indexes
-- -------------------------------------------------------------------------------------

-- Serves unread DM badge counts in Navbar.tsx (`where receiver_id = $1 and is_read = false`)
create index if not exists direct_messages_receiver_unread_idx
  on public.direct_messages (receiver_id)
  where is_read = false;

-- Serves case-insensitive profile & DM target lookups (`lower(username) = $1`)
create index if not exists profiles_lower_username_idx
  on public.profiles (lower(username))
  where username is not null;

-- Serves main feed cursor/offset queries (`order by created_at desc`) & GIN tag search
create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);

create index if not exists community_posts_tags_gin_idx
  on public.community_posts using gin (tags);

-- Serves /market filtered category & stock status queries ordered newest first
create index if not exists products_category_stock_created_idx
  on public.products (category, stock_status, created_at desc);

-- Serves listHardwareComponents({ activeOnly: true }) sorted alphabetically by name
create index if not exists hardware_components_active_name_idx
  on public.hardware_components (is_active, name);

-- -------------------------------------------------------------------------------------
-- 2. Trigger hardening (idempotent, non-recursive, set search_path = '')
-- -------------------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------------------
-- 3. Atomic RPC: publish community post + optional shared build record in one txn
-- -------------------------------------------------------------------------------------
create or replace function public.publish_community_post(
  p_title text,
  p_content text,
  p_category text default 'general',
  p_record_shared_build boolean default false
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  content text,
  category text,
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

  insert into public.community_posts (user_id, title, content, category)
  values (v_me, v_title, v_content, v_category)
  returning
    community_posts.id,
    community_posts.user_id,
    community_posts.title,
    community_posts.content,
    community_posts.category,
    community_posts.likes_count,
    community_posts.created_at
  into id, user_id, title, content, category, likes_count, created_at;

  if coalesce(p_record_shared_build, false) or v_category = 'build_showcase' then
    insert into public.shared_builds (user_id, title)
    values (v_me, title);
  end if;

  return next;
end;
$$;

revoke execute on function public.publish_community_post(text, text, text, boolean) from public, anon;
grant execute on function public.publish_community_post(text, text, text, boolean) to authenticated;

-- -------------------------------------------------------------------------------------
-- 4. Admin single-pass order aggregation RPC
-- -------------------------------------------------------------------------------------
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
    coalesce(sum(o.total_price), 0)::numeric as total_revenue,
    count(*) filter (where o.status = 'pending_qc')::bigint as pending_qc_count
  from public.orders as o;
end;
$$;

revoke execute on function public.get_admin_order_stats() from public, anon;
grant execute on function public.get_admin_order_stats() to authenticated;

-- =====================================================================================
-- 5. EXPLAIN Verification Queries (run in Supabase SQL Editor / local psql)
-- =====================================================================================
-- -- Community category + recency feed (uses community_posts_category_created_idx):
-- explain (analyze, buffers)
-- select id, user_id, title, content, category, likes_count, created_at
-- from public.community_posts
-- where category = 'hardware'
-- order by created_at desc
-- limit 25;
--
-- -- Market category + ready-stock filter (uses products_category_stock_created_idx):
-- explain (analyze, buffers)
-- select id, slug, title, price, stock_status
-- from public.products
-- where category = 'pc-build' and stock_status = 'ready'
-- order by created_at desc
-- limit 24;
--
-- -- Navbar unread DM count (uses direct_messages_receiver_unread_idx):
-- explain (analyze, buffers)
-- select count(*)
-- from public.direct_messages
-- where receiver_id = '<user-uuid>'::uuid and is_read = false;

-- =====================================================================================
-- 6. Rollback Plan (safe teardown for migrations 20261121000003 & 20261121000002)
-- =====================================================================================
-- -- Reverse 20261121000003:
-- drop function if exists public.get_admin_order_stats();
-- drop function if exists public.publish_community_post(text, text, text, boolean);
-- drop index if exists public.hardware_components_active_name_idx;
-- drop index if exists public.products_category_stock_created_idx;
-- drop index if exists public.community_posts_tags_gin_idx;
-- drop index if exists public.community_posts_created_at_idx;
-- drop index if exists public.profiles_lower_username_idx;
-- drop index if exists public.direct_messages_receiver_unread_idx;
--
-- -- Reverse 20261121000002 (only if intentionally tearing down new tables/policies):
-- drop function if exists public.send_direct_message_with_notification(uuid, text);
-- drop trigger if exists on_direct_message_notify on public.direct_messages;
-- drop function if exists private.notify_on_direct_message();
-- drop trigger if exists notifications_immutable on public.notifications;
-- drop function if exists public.prevent_notification_tampering();
-- drop table if exists public.notifications;
-- drop table if exists public.partners;
-- drop table if exists public.products;
-- drop function if exists public.is_admin();
