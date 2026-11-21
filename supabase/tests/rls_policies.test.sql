-- Two-user & admin pgTAP verification for ViciTech core tables and atomic RPC (SOP-08).
-- Requires basejump-supabase_test_helpers (`tests.create_supabase_user`, `tests.authenticate_as`, etc.).

begin;
select plan(22);

select tests.create_supabase_user('alice', 'alice_rls@vicitech.test');
select tests.create_supabase_user('bob', 'bob_rls@vicitech.test');
select tests.create_supabase_user('charlie', 'charlie_rls@vicitech.test');
select tests.create_supabase_user('admin_user', 'admin_rls@vicitech.test');

-- Grant trusted admin claim + profile role to admin_user before running role-isolated checks.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = tests.get_supabase_uid('admin_user');

update public.profiles
set role = 'admin'
where id = tests.get_supabase_uid('admin_user');

-- ─── 1–6: community_posts (public read, owner write/update/delete, no spoofing) ───
select tests.authenticate_as('alice');
select lives_ok(
  $$insert into public.community_posts (user_id, idempotency_key, title, content, category)
    values (tests.get_supabase_uid('alice'), gen_random_uuid(), 'Rakit RX 7800 XT', 'Uji termal aman', 'hardware')$$,
  '1. owner can insert community_posts'
);

select tests.authenticate_as('bob');
select throws_ok(
  $$insert into public.community_posts (user_id, idempotency_key, title, content, category)
    values (tests.get_supabase_uid('alice'), gen_random_uuid(), 'Palsu', 'Spoof', 'hardware')$$,
  '42501',
  null,
  '2. other user cannot spoof user_id on community_posts insert'
);

select tests.clear_authentication();
select is(
  (select count(*) from public.community_posts where user_id = tests.get_supabase_uid('alice')),
  1::bigint,
  '3. anon can read public community_posts'
);

select tests.authenticate_as('bob');
update public.community_posts
  set title = 'Dibajak Bob'
  where user_id = tests.get_supabase_uid('alice');
delete from public.community_posts
  where user_id = tests.get_supabase_uid('alice');

select tests.clear_authentication();
select is(
  (select title from public.community_posts where user_id = tests.get_supabase_uid('alice')),
  'Rakit RX 7800 XT',
  '4. other user cannot update owner community_posts'
);
select is(
  (select count(*) from public.community_posts where user_id = tests.get_supabase_uid('alice')),
  1::bigint,
  '5. other user cannot delete owner community_posts'
);

select tests.authenticate_as('alice');
select lives_ok(
  $$update public.community_posts
    set title = 'Rakit RX 7800 XT Updated'
    where user_id = tests.get_supabase_uid('alice')$$,
  '6. owner can update own community_posts'
);

-- ─── 7–16: direct_messages, notifications, & send_direct_message_with_notification RPC ───
select tests.clear_authentication();
select throws_ok(
  $$select public.send_direct_message_with_notification(tests.get_supabase_uid('bob'), 'Halo anon')$$,
  '42501',
  null,
  '7. anon cannot execute send_direct_message_with_notification RPC'
);

select tests.authenticate_as('alice');
select lives_ok(
  $$select public.send_direct_message_with_notification(tests.get_supabase_uid('bob'), 'Halo Bob, slot mabar siap')$$,
  '8. authenticated user can send DM atomically via RPC'
);

select tests.authenticate_as('bob');
select is(
  (select count(*) from public.notifications where user_id = tests.get_supabase_uid('bob') and type = 'dm'),
  1::bigint,
  '9. DM RPC atomically inserts notification for receiver'
);

select tests.authenticate_as('alice');
select throws_ok(
  $$select public.send_direct_message_with_notification(tests.get_supabase_uid('alice'), 'Self DM')$$,
  '22023',
  null,
  '10. RPC rejects self-messaging and leaves DM/notification counts intact'
);

select tests.authenticate_as('charlie');
select is(
  (select count(*) from public.direct_messages where sender_id = tests.get_supabase_uid('alice') and receiver_id = tests.get_supabase_uid('bob')),
  0::bigint,
  '11. third user cannot read DMs between alice and bob'
);
select is(
  (select count(*) from public.notifications where user_id = tests.get_supabase_uid('bob')),
  0::bigint,
  '12. third user cannot read bobs notifications'
);

select tests.authenticate_as('bob');
select lives_ok(
  $$update public.direct_messages
    set is_read = true
    where receiver_id = tests.get_supabase_uid('bob')$$,
  '13. receiver can mark direct_message as read'
);
select throws_ok(
  $$update public.direct_messages
    set content = 'Isi diubah'
    where receiver_id = tests.get_supabase_uid('bob')$$,
  'P0001',
  null,
  '14. receiver cannot alter immutable DM content'
);
select lives_ok(
  $$update public.notifications
    set is_read = true
    where user_id = tests.get_supabase_uid('bob')$$,
  '15. recipient can mark notification as read'
);
select throws_ok(
  $$update public.notifications
    set title = 'Judul diubah'
    where user_id = tests.get_supabase_uid('bob')$$,
  'P0001',
  null,
  '16. recipient cannot alter immutable notification fields'
);

-- ─── 17–22: products & partners (public read, admin-only write) ───
select tests.authenticate_as('alice');
select throws_ok(
  $$insert into public.products (slug, title, price, category)
    values ('rogue-build', 'Unauthorized PC', 10000000, 'pc-build')$$,
  '42501',
  null,
  '17. non-admin cannot insert products'
);
select throws_ok(
  $$insert into public.partners (name, type, address, city)
    values ('Fake Mitra', 'service_center', 'Jl. Palsu 1', 'Bandung')$$,
  '42501',
  null,
  '18. non-admin cannot insert partners'
);

select tests.authenticate_as('admin_user');
select lives_ok(
  $$insert into public.products (slug, title, price, category)
    values ('vicitech-preset-pro', 'ViciTech Pro Workstation', 18500000, 'pc-build')$$,
  '19. admin can insert product'
);
select lives_ok(
  $$insert into public.partners (name, type, address, city)
    values ('ViciTech Hub Bandung', 'service_center', 'Jl. Dipatiukur No. 40', 'Bandung')$$,
  '20. admin can insert partner'
);

select tests.clear_authentication();
select is(
  (select count(*) from public.products where slug = 'vicitech-preset-pro'),
  1::bigint,
  '21. anon can select products'
);
select is(
  (select count(*) from public.partners where name = 'ViciTech Hub Bandung'),
  1::bigint,
  '22. anon can select partners'
);

select * from finish();
rollback;
