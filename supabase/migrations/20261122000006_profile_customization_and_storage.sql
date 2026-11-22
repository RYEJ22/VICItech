-- =====================================================================================
-- ViciTech OS Migration 20261122000006: Customizable Profile Hub & Storage Bucket
-- Safe to re-run (idempotent). Extends `public.profiles` with Discord/IG-style
-- customization fields and provisions the `profile-media` public bucket with strict RLS.
-- =====================================================================================

-- 1. Additive customization columns on public.profiles
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists banner_url text,
  add column if not exists bio text,
  add column if not exists status_text text,
  add column if not exists accent_color text not null default '#C2410C',
  add column if not exists featured_rig text,
  add column if not exists created_at timestamptz not null default now();

-- Backfill any null accent_color rows safely before attaching check constraint
update public.profiles
set accent_color = '#C2410C'
where accent_color is null or accent_color !~ '^#[0-9A-Fa-f]{6}$';

alter table public.profiles
  drop constraint if exists profiles_bio_length,
  drop constraint if exists profiles_status_text_length,
  drop constraint if exists profiles_featured_rig_length,
  drop constraint if exists profiles_accent_color_hex;

alter table public.profiles
  add constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 160) not valid,
  add constraint profiles_status_text_length
    check (status_text is null or char_length(status_text) <= 60) not valid,
  add constraint profiles_featured_rig_length
    check (featured_rig is null or char_length(featured_rig) <= 100) not valid,
  add constraint profiles_accent_color_hex
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$');

-- 2. Public Storage bucket `profile-media` (3 MB max, JPG/PNG/WebP) + per-operation RLS
do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    execute $sql$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values (
        'profile-media',
        'profile-media',
        true,
        3145728,
        array['image/jpeg', 'image/png', 'image/webp']
      )
      on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

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
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      create policy "profile_media_update_owner"
        on storage.objects
        for update
        to authenticated
        using (
          bucket_id = 'profile-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
        with check (
          bucket_id = 'profile-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      create policy "profile_media_delete_owner"
        on storage.objects
        for delete
        to authenticated
        using (
          bucket_id = 'profile-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );
    $sql$;
  end if;
end
$$;
