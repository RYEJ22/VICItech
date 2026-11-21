-- =====================================================================================
-- ViciTech OS Migration 20261121000002: Core Tables & Strict Per-Operation RLS (SOP-08)
-- Covers community_posts, direct_messages, notifications, products, partners, orders,
-- hardware_components, user_presets, shared_builds, qc_test_reports, qc_logs,
-- telemetry_logs, Storage buckets (post-media, audio-tracks), and atomic DM RPC.
-- =====================================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 1. Helper: trusted admin role check for RLS policies
-- -------------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 2. community_posts: public read, owner-only insert/update/delete
-- -------------------------------------------------------------------------------------
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'general',
  hardware_specs jsonb not null default '{}'::jsonb,
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.community_posts
  add column if not exists idempotency_key uuid,
  add column if not exists tags text[] not null default '{}',
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists media_type text,
  add column if not exists audio_url text,
  add column if not exists audio_title text,
  add column if not exists is_lfg boolean not null default false,
  add column if not exists lfg_details jsonb,
  add column if not exists youtube_url text;

alter table public.community_posts
  drop constraint if exists community_posts_category_check,
  drop constraint if exists community_posts_category_valid,
  drop constraint if exists community_posts_media_type_valid;

alter table public.community_posts
  add constraint community_posts_category_valid check (
    category in (
      'general',
      'build_showcase',
      'troubleshooting',
      'news',
      'hardware',
      'gaming',
      'dev',
      'creative',
      'meme'
    )
  ),
  add constraint community_posts_media_type_valid check (
    media_type is null or media_type in ('image', 'video')
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.community_posts'::regclass
      and conname = 'community_posts_idempotency_key_key'
  ) then
    alter table public.community_posts
      add constraint community_posts_idempotency_key_key unique (idempotency_key);
  end if;
end
$$;

create index if not exists community_posts_user_id_idx
  on public.community_posts (user_id);
create index if not exists community_posts_category_created_idx
  on public.community_posts (category, created_at desc);

alter table public.community_posts enable row level security;
revoke all on table public.community_posts from public;
grant select on table public.community_posts to anon, authenticated;
grant insert, update, delete on table public.community_posts to authenticated;

drop policy if exists "Public read posts" on public.community_posts;
drop policy if exists "Auth insert posts" on public.community_posts;
drop policy if exists "Users manage own posts" on public.community_posts;
drop policy if exists "community_posts_select_public" on public.community_posts;
drop policy if exists "community_posts_insert_owner" on public.community_posts;
drop policy if exists "community_posts_update_owner" on public.community_posts;
drop policy if exists "community_posts_delete_owner" on public.community_posts;

create policy "community_posts_select_public"
  on public.community_posts
  for select
  to anon, authenticated
  using (true);

create policy "community_posts_insert_owner"
  on public.community_posts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "community_posts_update_owner"
  on public.community_posts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "community_posts_delete_owner"
  on public.community_posts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- -------------------------------------------------------------------------------------
-- 3. direct_messages: participant-only read, sender insert, receiver read-flag update
-- -------------------------------------------------------------------------------------
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint direct_messages_not_self check (sender_id <> receiver_id),
  constraint direct_messages_content_valid check (char_length(btrim(content)) between 1 and 4000)
);

create index if not exists direct_messages_sender_created_idx
  on public.direct_messages (sender_id, created_at desc);
create index if not exists direct_messages_receiver_created_idx
  on public.direct_messages (receiver_id, created_at desc);
create index if not exists direct_messages_conversation_idx
  on public.direct_messages (sender_id, receiver_id, created_at);

create or replace function public.prevent_direct_message_edits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.sender_id <> old.sender_id
    or new.receiver_id <> old.receiver_id
    or new.content <> old.content
    or new.created_at <> old.created_at
    or old.is_read
    or not new.is_read then
    raise exception 'Direct messages are immutable; recipients may only mark unread messages as read.';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_messages_immutable on public.direct_messages;
create trigger direct_messages_immutable
  before update on public.direct_messages
  for each row execute function public.prevent_direct_message_edits();

alter table public.direct_messages enable row level security;
revoke all on table public.direct_messages from public;
grant select, insert, update on table public.direct_messages to authenticated;

drop policy if exists "users read own direct messages" on public.direct_messages;
drop policy if exists "users send direct messages" on public.direct_messages;
drop policy if exists "receivers mark direct messages read" on public.direct_messages;
drop policy if exists "direct_messages_select_participant" on public.direct_messages;
drop policy if exists "direct_messages_insert_sender" on public.direct_messages;
drop policy if exists "direct_messages_update_receiver" on public.direct_messages;

create policy "direct_messages_select_participant"
  on public.direct_messages
  for select
  to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

create policy "direct_messages_insert_sender"
  on public.direct_messages
  for insert
  to authenticated
  with check ((select auth.uid()) = sender_id and sender_id <> receiver_id);

create policy "direct_messages_update_receiver"
  on public.direct_messages
  for update
  to authenticated
  using ((select auth.uid()) = receiver_id)
  with check ((select auth.uid()) = receiver_id);

-- -------------------------------------------------------------------------------------
-- 4. notifications: trigger-created only; recipient reads, marks read, or deletes
-- -------------------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null check (type in ('like', 'comment', 'dm', 'system')),
  entity_id text,
  title text,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read)
  where is_read = false;

create or replace function public.prevent_notification_tampering()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.user_id <> old.user_id
    or new.actor_id is distinct from old.actor_id
    or new.type <> old.type
    or new.entity_id is distinct from old.entity_id
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.created_at <> old.created_at then
    raise exception 'Notifications cannot be edited; recipients may only change is_read.';
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_immutable on public.notifications;
create trigger notifications_immutable
  before update on public.notifications
  for each row execute function public.prevent_notification_tampering();

create or replace function private.notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, actor_id, type, entity_id, title, body)
  values (
    new.receiver_id,
    new.sender_id,
    'dm',
    new.id::text,
    'Pesan langsung baru',
    left(btrim(new.content), 160)
  );
  return new;
end;
$$;

revoke all on function private.notify_on_direct_message() from public, anon, authenticated;

drop trigger if exists on_direct_message_notify on public.direct_messages;
create trigger on_direct_message_notify
  after insert on public.direct_messages
  for each row execute function private.notify_on_direct_message();

alter table public.notifications enable row level security;
revoke all on table public.notifications from public;
grant select, update, delete on table public.notifications to authenticated;

drop policy if exists "notifications_select_recipient" on public.notifications;
drop policy if exists "notifications_update_recipient" on public.notifications;
drop policy if exists "notifications_delete_recipient" on public.notifications;

create policy "notifications_select_recipient"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_update_recipient"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notifications_delete_recipient"
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

-- Atomic RPC for sending a direct message + notification together.
create or replace function public.send_direct_message_with_notification(
  p_receiver_id uuid,
  p_content text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_trimmed text := btrim(coalesce(p_content, ''));
  v_message_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_receiver_id is null or p_receiver_id = v_me then
    raise exception 'cannot message yourself' using errcode = '22023';
  end if;
  if char_length(v_trimmed) not between 1 and 4000 then
    raise exception 'invalid message length' using errcode = '22023';
  end if;

  insert into public.direct_messages (sender_id, receiver_id, content)
  values (v_me, p_receiver_id, v_trimmed)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke execute on function public.send_direct_message_with_notification(uuid, text) from public, anon;
grant execute on function public.send_direct_message_with_notification(uuid, text) to authenticated;

-- -------------------------------------------------------------------------------------
-- 5. products: public read, admin-only write
-- -------------------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  price numeric(14, 2) not null default 0 check (price >= 0),
  category text not null check (category in ('pc-build', 'laptop', 'smartphone', 'component', 'accessory')),
  seller_type text not null default 'vicitech' check (seller_type in ('vicitech', 'partner')),
  specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  images text[] not null default '{}',
  stock_status text not null default 'ready' check (stock_status in ('ready', 'preorder', 'sold_out')),
  is_preset boolean not null default false,
  preset_components jsonb not null default '[]'::jsonb,
  reviewed_by_name text,
  reviewed_by_avatar text,
  review_quote text,
  review_video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_price_idx
  on public.products (category, price);
create index if not exists products_created_at_idx
  on public.products (created_at desc);

alter table public.products enable row level security;
revoke all on table public.products from public;
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

drop policy if exists "products_select_public" on public.products;
drop policy if exists "products_insert_admin" on public.products;
drop policy if exists "products_update_admin" on public.products;
drop policy if exists "products_delete_admin" on public.products;

create policy "products_select_public"
  on public.products
  for select
  to anon, authenticated
  using (true);

create policy "products_insert_admin"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

create policy "products_update_admin"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_delete_admin"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------------------------------
-- 6. partners: public read, admin-only write
-- -------------------------------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('toko_komponen', 'service_center')),
  address text not null,
  city text not null,
  gmaps_url text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_verified boolean not null default true,
  whatsapp_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partners_city_type_idx
  on public.partners (city, type);
create index if not exists partners_verified_idx
  on public.partners (is_verified);

alter table public.partners enable row level security;
revoke all on table public.partners from public;
grant select on table public.partners to anon, authenticated;
grant insert, update, delete on table public.partners to authenticated;

drop policy if exists "partners_select_public" on public.partners;
drop policy if exists "partners_insert_admin" on public.partners;
drop policy if exists "partners_update_admin" on public.partners;
drop policy if exists "partners_delete_admin" on public.partners;

create policy "partners_select_public"
  on public.partners
  for select
  to anon, authenticated
  using (true);

create policy "partners_insert_admin"
  on public.partners
  for insert
  to authenticated
  with check (public.is_admin());

create policy "partners_update_admin"
  on public.partners
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "partners_delete_admin"
  on public.partners
  for delete
  to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------------------------------
-- 7. Harden remaining operational tables with per-operation RLS + (select auth.uid())
-- -------------------------------------------------------------------------------------
alter table public.orders enable row level security;
revoke all on table public.orders from public;
grant select, insert, update, delete on table public.orders to authenticated;

drop policy if exists "Users insert own orders" on public.orders;
drop policy if exists "Users view own orders" on public.orders;
drop policy if exists "Admins full access orders" on public.orders;
drop policy if exists "users read own orders" on public.orders;
drop policy if exists "users create own orders" on public.orders;
drop policy if exists "admins full access to all orders" on public.orders;
drop policy if exists "orders_select_owner_or_admin" on public.orders;
drop policy if exists "orders_insert_owner" on public.orders;
drop policy if exists "orders_update_admin" on public.orders;
drop policy if exists "orders_delete_admin" on public.orders;

create policy "orders_select_owner_or_admin"
  on public.orders
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "orders_insert_owner"
  on public.orders
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id or public.is_admin());

create policy "orders_update_admin"
  on public.orders
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "orders_delete_admin"
  on public.orders
  for delete
  to authenticated
  using (public.is_admin());

alter table public.hardware_components enable row level security;
revoke all on table public.hardware_components from public;
grant select on table public.hardware_components to anon, authenticated;
grant insert, update, delete on table public.hardware_components to authenticated;

drop policy if exists "Public view active components" on public.hardware_components;
drop policy if exists "Admins manage components" on public.hardware_components;
drop policy if exists "Public can read hardware components" on public.hardware_components;
drop policy if exists "Admins can insert hardware components" on public.hardware_components;
drop policy if exists "Admins can update hardware components" on public.hardware_components;
drop policy if exists "Admins can delete hardware components" on public.hardware_components;
drop policy if exists "hardware_components_select_public" on public.hardware_components;
drop policy if exists "hardware_components_insert_admin" on public.hardware_components;
drop policy if exists "hardware_components_update_admin" on public.hardware_components;
drop policy if exists "hardware_components_delete_admin" on public.hardware_components;

create policy "hardware_components_select_public"
  on public.hardware_components
  for select
  to anon, authenticated
  using (true);

create policy "hardware_components_insert_admin"
  on public.hardware_components
  for insert
  to authenticated
  with check (public.is_admin());

create policy "hardware_components_update_admin"
  on public.hardware_components
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "hardware_components_delete_admin"
  on public.hardware_components
  for delete
  to authenticated
  using (public.is_admin());

alter table public.user_presets enable row level security;
revoke all on table public.user_presets from public;
grant select, insert, delete on table public.user_presets to authenticated;

drop policy if exists "users read own presets" on public.user_presets;
drop policy if exists "users create own presets" on public.user_presets;
drop policy if exists "users delete own presets" on public.user_presets;
drop policy if exists "user_presets_select_owner" on public.user_presets;
drop policy if exists "user_presets_insert_owner" on public.user_presets;
drop policy if exists "user_presets_delete_owner" on public.user_presets;

create policy "user_presets_select_owner"
  on public.user_presets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_presets_insert_owner"
  on public.user_presets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_presets_delete_owner"
  on public.user_presets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.shared_builds enable row level security;
revoke all on table public.shared_builds from public;
grant select on table public.shared_builds to anon, authenticated;
grant insert, delete on table public.shared_builds to authenticated;

drop policy if exists "authenticated users read shared builds" on public.shared_builds;
drop policy if exists "users create own shared builds" on public.shared_builds;
drop policy if exists "users delete own shared builds" on public.shared_builds;
drop policy if exists "shared_builds_select_public" on public.shared_builds;
drop policy if exists "shared_builds_insert_owner" on public.shared_builds;
drop policy if exists "shared_builds_delete_owner" on public.shared_builds;

create policy "shared_builds_select_public"
  on public.shared_builds
  for select
  to anon, authenticated
  using (true);

create policy "shared_builds_insert_owner"
  on public.shared_builds
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "shared_builds_delete_owner"
  on public.shared_builds
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.qc_test_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  overall_status text not null check (overall_status in ('pass', 'fail', 'in_progress')),
  results jsonb not null check (jsonb_typeof(results) = 'array'),
  environment text not null default 'simulated' check (environment in ('simulated', 'device')),
  created_at timestamptz not null default now()
);

create index if not exists qc_test_reports_user_created_idx
  on public.qc_test_reports (user_id, created_at desc);

alter table public.qc_test_reports enable row level security;
revoke all on table public.qc_test_reports from public;
grant select, insert on table public.qc_test_reports to authenticated;

drop policy if exists "Users can read their own QC reports" on public.qc_test_reports;
drop policy if exists "Users can create their own QC reports" on public.qc_test_reports;
drop policy if exists "qc_test_reports_select_owner_or_admin" on public.qc_test_reports;
drop policy if exists "qc_test_reports_insert_owner" on public.qc_test_reports;

create policy "qc_test_reports_select_owner_or_admin"
  on public.qc_test_reports
  for select
  to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "qc_test_reports_insert_owner"
  on public.qc_test_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

alter table public.qc_logs enable row level security;
alter table public.telemetry_logs enable row level security;

drop policy if exists "qc_logs are publicly readable" on public.qc_logs;
drop policy if exists "admins can create qc logs" on public.qc_logs;
drop policy if exists "admins can update qc logs" on public.qc_logs;
drop policy if exists "qc_logs_select_public" on public.qc_logs;
drop policy if exists "qc_logs_insert_admin" on public.qc_logs;
drop policy if exists "qc_logs_update_admin" on public.qc_logs;
drop policy if exists "qc_logs_delete_admin" on public.qc_logs;

create policy "qc_logs_select_public"
  on public.qc_logs
  for select
  to anon, authenticated
  using (true);

create policy "qc_logs_insert_admin"
  on public.qc_logs
  for insert
  to authenticated
  with check (public.is_admin());

create policy "qc_logs_update_admin"
  on public.qc_logs
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "qc_logs_delete_admin"
  on public.qc_logs
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "telemetry logs are publicly readable" on public.telemetry_logs;
drop policy if exists "admins can add telemetry logs" on public.telemetry_logs;
drop policy if exists "telemetry_logs_select_public" on public.telemetry_logs;
drop policy if exists "telemetry_logs_insert_admin" on public.telemetry_logs;

create policy "telemetry_logs_select_public"
  on public.telemetry_logs
  for select
  to anon, authenticated
  using (true);

create policy "telemetry_logs_insert_admin"
  on public.telemetry_logs
  for insert
  to authenticated
  with check (public.is_admin());

-- -------------------------------------------------------------------------------------
-- 8. Storage buckets: post-media & audio-tracks (guarded when Supabase storage exists)
-- -------------------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    execute $sql$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values
        (
          'post-media',
          'post-media',
          true,
          31457280,
          array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
        ),
        (
          'audio-tracks',
          'audio-tracks',
          true,
          15728640,
          array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm']
        )
      on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

      drop policy if exists "post_media_select_public" on storage.objects;
      drop policy if exists "post_media_insert_owner" on storage.objects;
      drop policy if exists "post_media_update_owner" on storage.objects;
      drop policy if exists "post_media_delete_owner" on storage.objects;

      create policy "post_media_select_public"
        on storage.objects
        for select
        to anon, authenticated
        using (bucket_id = 'post-media');

      create policy "post_media_insert_owner"
        on storage.objects
        for insert
        to authenticated
        with check (
          bucket_id = 'post-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      create policy "post_media_update_owner"
        on storage.objects
        for update
        to authenticated
        using (
          bucket_id = 'post-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        )
        with check (
          bucket_id = 'post-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      create policy "post_media_delete_owner"
        on storage.objects
        for delete
        to authenticated
        using (
          bucket_id = 'post-media'
          and (storage.foldername(name))[1] = (select auth.uid())::text
        );

      drop policy if exists "audio_tracks_select_public" on storage.objects;
      drop policy if exists "audio_tracks_insert_admin" on storage.objects;
      drop policy if exists "audio_tracks_update_admin" on storage.objects;
      drop policy if exists "audio_tracks_delete_admin" on storage.objects;

      create policy "audio_tracks_select_public"
        on storage.objects
        for select
        to anon, authenticated
        using (bucket_id = 'audio-tracks');

      create policy "audio_tracks_insert_admin"
        on storage.objects
        for insert
        to authenticated
        with check (bucket_id = 'audio-tracks' and public.is_admin());

      create policy "audio_tracks_update_admin"
        on storage.objects
        for update
        to authenticated
        using (bucket_id = 'audio-tracks' and public.is_admin())
        with check (bucket_id = 'audio-tracks' and public.is_admin());

      create policy "audio_tracks_delete_admin"
        on storage.objects
        for delete
        to authenticated
        using (bucket_id = 'audio-tracks' and public.is_admin());
    $sql$;
  end if;
end
$$;
