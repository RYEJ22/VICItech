-- pgTAP verification for SOP-09: atomic RPCs, validation rollback, admin stats, and query indexes.
-- Requires basejump-supabase_test_helpers (`tests.create_supabase_user`, `tests.authenticate_as`, etc.).

begin;
select plan(13);

select tests.create_supabase_user('alice_q', 'alice_q@vicitech.test');
select tests.create_supabase_user('admin_q', 'admin_q@vicitech.test');

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = tests.get_supabase_uid('admin_q');

update public.profiles
set role = 'admin'
where id = tests.get_supabase_uid('admin_q');

-- ─── 1–5: publish_community_post atomic multi-table RPC ───
select tests.clear_authentication();
select throws_ok(
  $$select * from public.publish_community_post('Judul Anon', 'Isi Anon', 'hardware', false)$$,
  '42501',
  null,
  '1. anon cannot execute publish_community_post RPC'
);

select tests.authenticate_as('alice_q');
select lives_ok(
  $$select * from public.publish_community_post('Rakit ATX Hemat Daya', 'Airflow seimbang dan kabel rapi', 'build_showcase', true)$$,
  '2. authenticated user can publish post + shared build via atomic RPC'
);

select is(
  (select count(*) from public.community_posts where user_id = tests.get_supabase_uid('alice_q')),
  1::bigint,
  '3. publish_community_post inserts community_posts row'
);

select is(
  (select count(*) from public.shared_builds where user_id = tests.get_supabase_uid('alice_q')),
  1::bigint,
  '4. publish_community_post atomically inserts matching shared_builds row'
);

select throws_ok(
  $$select * from public.publish_community_post('   ', 'Konten valid', 'build_showcase', true)$$,
  '22023',
  null,
  '5. invalid empty title rejects with 22023'
);

select is(
  (select count(*) from public.shared_builds where user_id = tests.get_supabase_uid('alice_q')),
  1::bigint,
  '6. failed RPC leaves zero extra shared_builds rows'
);

-- ─── 7–9: get_admin_order_stats authorization & single-pass aggregation ───
select throws_ok(
  $$select * from public.get_admin_order_stats()$$,
  '42501',
  null,
  '7. non-admin cannot call get_admin_order_stats RPC'
);

select tests.authenticate_as('admin_q');
insert into public.orders (user_id, order_type, product_name, base_price, jit_buffer, total_price, status)
values
  (tests.get_supabase_uid('alice_q'), 'preset_builder', 'Rig A', 10000000, 500000, 10500000, 'pending_qc'),
  (tests.get_supabase_uid('alice_q'), 'direct_buy', 'Rig B', 5000000, 0, 5000000, 'completed');

select is(
  (select total_orders >= 2 and total_revenue >= 15500000 and pending_qc_count >= 1 from public.get_admin_order_stats()),
  true,
  '8. admin receives accurate aggregated order metrics from get_admin_order_stats'
);

-- ─── 9–13: Critical composite & partial indexes exist ───
select is(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'direct_messages_receiver_unread_idx'
  ),
  true,
  '9. partial index direct_messages_receiver_unread_idx exists'
);

select is(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'community_posts_category_created_idx'
  ),
  true,
  '10. composite index community_posts_category_created_idx exists'
);

select is(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'products_category_stock_created_idx'
  ),
  true,
  '11. composite index products_category_stock_created_idx exists'
);

select is(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'partners_city_type_idx'
  ),
  true,
  '12. composite index partners_city_type_idx exists'
);

select is(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'hardware_components_active_name_idx'
  ),
  true,
  '13. composite index hardware_components_active_name_idx exists'
);

select * from finish();
rollback;
