-- Two-user pgTAP verification for public.profiles RLS and private.handle_new_user trigger.
-- Requires basejump-supabase_test_helpers (`tests.create_supabase_user`, `tests.authenticate_as`, etc.).

begin;
select plan(7);

-- 1. Creating auth users triggers public.profiles rows automatically.
select tests.create_supabase_user('alice', 'alice@vicitech.test');
select tests.create_supabase_user('bob', 'bob@vicitech.test');

select is(
  (select count(*) from public.profiles where id in (tests.get_supabase_uid('alice'), tests.get_supabase_uid('bob'))),
  2::bigint,
  'handle_new_user creates profile rows for new auth users'
);

-- 2. Public SELECT works for anon visitors.
select tests.clear_authentication();
select is(
  (select count(*) from public.profiles where id = tests.get_supabase_uid('alice')),
  1::bigint,
  'anon can read public profiles'
);

-- 3. Authenticated owner can update their own display_name and full_name.
select tests.authenticate_as('alice');
select lives_ok(
  $$update public.profiles
    set display_name = 'Alice Builder', full_name = 'Alice Kusuma'
    where id = tests.get_supabase_uid('alice')$$,
  'owner can update their own profile'
);

-- 4. Other user cannot insert a profile spoofing another user id.
select tests.authenticate_as('bob');
select throws_ok(
  $$insert into public.profiles (id, display_name)
    values (gen_random_uuid(), 'Spoofed Profile')$$,
  '42501',
  null,
  'authenticated user cannot insert a profile for another user id'
);

-- 5 & 6. Other user cannot update or delete owner profile.
update public.profiles
  set display_name = 'Hacked Alice'
  where id = tests.get_supabase_uid('alice');

delete from public.profiles
  where id = tests.get_supabase_uid('alice');

select tests.clear_authentication();
select is(
  (select display_name from public.profiles where id = tests.get_supabase_uid('alice')),
  'Alice Builder',
  'other user cannot overwrite owner display_name'
);

select is(
  (select count(*) from public.profiles where id = tests.get_supabase_uid('alice')),
  1::bigint,
  'other user cannot delete owner profile'
);

-- 7. Non-admin owner cannot escalate their own role column.
select tests.authenticate_as('alice');
update public.profiles
  set role = 'admin'
  where id = tests.get_supabase_uid('alice');

select is(
  (select role from public.profiles where id = tests.get_supabase_uid('alice')),
  'user',
  'non-admin owner cannot escalate profile role to admin'
);

select * from finish();
rollback;
