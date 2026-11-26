-- =====================================================================================
-- ViciTech OS Migration 20261126: Centralized User Profile Settings (Accessibility & UU PDP)
-- Safe to re-run (idempotent). Does not include any seed data.
-- =====================================================================================

alter table public.profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_settings_is_object'
  ) then
    alter table public.profiles
      add constraint profiles_settings_is_object
      check (jsonb_typeof(settings) = 'object');
  end if;
end $$;

-- Verify RLS restricts profile updates strictly to the authenticated row owner.
alter table public.profiles enable row level security;

drop policy if exists "profiles_update_owner" on public.profiles;
create policy "profiles_update_owner"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant update (settings, updated_at) on table public.profiles to authenticated;
