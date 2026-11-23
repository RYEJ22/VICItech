-- =====================================================================================
-- ViciTech Migration 20261123000012: Profile Avatar & Banner Upload RLS & Storage Fix
-- Ensures public.profiles columns and storage.objects policies for `profile-media`
-- allow authenticated users to upload and persist avatar_url / banner_url reliably.
-- =====================================================================================

alter table public.profiles
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists display_name text not null default 'Anggota ViciTech',
  add column if not exists avatar_url text,
  add column if not exists banner_url text,
  add column if not exists bio text,
  add column if not exists status_text text,
  add column if not exists accent_color text not null default '#C2410C',
  add column if not exists featured_rig text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;
grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "profiles_insert_owner" on public.profiles;
create policy "profiles_insert_owner"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_owner" on public.profiles;
create policy "profiles_update_owner"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    execute $sql$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values (
        'profile-media',
        'profile-media',
        true,
        5242880,
        array['image/jpeg', 'image/png', 'image/webp']
      )
      on conflict (id) do update
      set public = true,
          file_size_limit = greatest(coalesce(storage.buckets.file_size_limit, 0), 5242880),
          allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

      drop policy if exists "profile_media_select_public" on storage.objects;
      drop policy if exists "profile_media_insert_owner" on storage.objects;
      drop policy if exists "profile_media_update_owner" on storage.objects;
      drop policy if exists "profile_media_delete_owner" on storage.objects;

      create policy "profile_media_select_public"
        on storage.objects
        for select
        to anon, authenticated
        using (bucket_id = 'profile-media');

      create policy "profile_media_insert_owner"
        on storage.objects
        for insert
        to authenticated
        with check (
          bucket_id = 'profile-media'
          and (
            (storage.foldername(name))[1] = (select auth.uid())::text
            or name like ((select auth.uid())::text || '/%')
          )
        );

      create policy "profile_media_update_owner"
        on storage.objects
        for update
        to authenticated
        using (
          bucket_id = 'profile-media'
          and (
            (storage.foldername(name))[1] = (select auth.uid())::text
            or name like ((select auth.uid())::text || '/%')
          )
        )
        with check (
          bucket_id = 'profile-media'
          and (
            (storage.foldername(name))[1] = (select auth.uid())::text
            or name like ((select auth.uid())::text || '/%')
          )
        );

      create policy "profile_media_delete_owner"
        on storage.objects
        for delete
        to authenticated
        using (
          bucket_id = 'profile-media'
          and (
            (storage.foldername(name))[1] = (select auth.uid())::text
            or name like ((select auth.uid())::text || '/%')
          )
        );
    $sql$;
  end if;
end
$$;
