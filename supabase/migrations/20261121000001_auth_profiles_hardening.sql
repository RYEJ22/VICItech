-- =====================================================================================
-- ViciTech OS Migration 20261121000001: Auth & Profiles RLS Hardening (Module 1.1)
-- Ensures every new auth.users account automatically receives a public.profiles row
-- via a trigger in a non-exposed private schema, and enforces strict RLS per-operation.
-- =====================================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Ensure optional profile columns exist without breaking prior deployments.
alter table public.profiles
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists display_name text not null default 'ViciTech member',
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists role text not null default 'user',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_username_idx
  on public.profiles (username)
  where username is not null;

-- Keep prevent_profile_role_escalation safe with empty search_path and planner-cached auth.jwt().
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') is distinct from 'admin' then
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

-- Place trigger function in non-exposed private schema per CODING_STANDARDS Section 6.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_prefix text;
  base_username text;
  candidate_username text;
  resolved_full_name text;
  resolved_display_name text;
  resolved_avatar text;
  suffix integer := 0;
begin
  email_prefix := split_part(coalesce(new.email, ''), '@', 1);
  base_username := left(
    coalesce(nullif(regexp_replace(lower(email_prefix), '[^a-z0-9]+', '', 'g'), ''), 'user'),
    20
  );
  if char_length(base_username) < 3 then
    base_username := left(base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 8), 20);
  end if;
  candidate_username := base_username;

  resolved_full_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), '')
  );
  resolved_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    resolved_full_name,
    nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
    nullif(email_prefix, ''),
    'ViciTech member'
  );
  resolved_avatar := nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '');

  loop
    insert into public.profiles (id, username, full_name, display_name, avatar_url, role)
    values (
      new.id,
      candidate_username,
      resolved_full_name,
      resolved_display_name,
      resolved_avatar,
      case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin' else 'user' end
    )
    on conflict do nothing;

    if found or exists (select 1 from public.profiles where id = new.id) then
      exit;
    end if;

    suffix := suffix + 1;
    if suffix >= 10 then
      candidate_username := 'u_' || substr(replace(new.id::text, '-', ''), 1, 18);
    else
      candidate_username := left(base_username, 10)
        || '_'
        || substr(replace(new.id::text, '-', ''), 1, 8)
        || case when suffix > 1 then '_' || suffix::text else '' end;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop function if exists public.handle_new_user();

-- Hardened RLS: one policy per operation, explicit `to` clause, `(select auth.uid())`, ownership `with check`.
alter table public.profiles enable row level security;

revoke all on table public.profiles from public;
grant select on table public.profiles to anon, authenticated;
grant insert, update, delete on table public.profiles to authenticated;

drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "authenticated users read public profiles" on public.profiles;
drop policy if exists "users create own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users delete own profile" on public.profiles;
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_owner" on public.profiles;
drop policy if exists "profiles_update_owner" on public.profiles;
drop policy if exists "profiles_delete_owner" on public.profiles;

create policy "profiles_select_public"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "profiles_insert_owner"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_owner"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_delete_owner"
  on public.profiles
  for delete
  to authenticated
  using ((select auth.uid()) = id);
