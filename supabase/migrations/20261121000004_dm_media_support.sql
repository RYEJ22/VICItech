-- =====================================================================================
-- ViciTech OS Migration 20261121000004: Photo & Video Upload Support for DMs & Community
-- Safe to re-run (idempotent). Uses the existing `post-media` Storage bucket.
-- =====================================================================================

-- 1. Extend public.direct_messages with optional media attachments
alter table public.direct_messages
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists media_type text,
  alter column content set default '';

alter table public.direct_messages
  drop constraint if exists direct_messages_media_type_valid,
  drop constraint if exists direct_messages_content_valid;

alter table public.direct_messages
  add constraint direct_messages_media_type_valid check (
    media_type is null or media_type in ('image', 'video')
  ),
  add constraint direct_messages_content_valid check (
    (char_length(btrim(content)) between 1 and 4000)
    or (cardinality(media_urls) > 0 and char_length(btrim(content)) <= 4000)
  );

-- 2. Enforce immutability of media_urls & media_type on direct_messages updates
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
    or new.media_urls is distinct from old.media_urls
    or new.media_type is distinct from old.media_type
    or new.created_at <> old.created_at
    or old.is_read
    or not new.is_read then
    raise exception 'Direct messages are immutable; recipients may only mark unread messages as read.';
  end if;
  return new;
end;
$$;

-- 3. Populate a clear notification preview when a DM has only photo/video media
create or replace function private.notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_preview text;
begin
  v_preview := left(btrim(coalesce(new.content, '')), 160);
  if v_preview = '' and coalesce(cardinality(new.media_urls), 0) > 0 then
    v_preview := case
      when new.media_type = 'video' then '[Video]'
      else '[Foto]'
    end;
  end if;

  insert into public.notifications (user_id, actor_id, type, entity_id, title, body)
  values (
    new.receiver_id,
    new.sender_id,
    'dm',
    new.id::text,
    'Pesan langsung baru',
    nullif(v_preview, '')
  );
  return new;
end;
$$;

revoke all on function private.notify_on_direct_message() from public, anon, authenticated;

-- 4. Update send_direct_message_with_notification without creating an ambiguous overload
drop function if exists public.send_direct_message_with_notification(uuid, text);

create or replace function public.send_direct_message_with_notification(
  p_receiver_id uuid,
  p_content text default '',
  p_media_urls text[] default '{}',
  p_media_type text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_trimmed text := btrim(coalesce(p_content, ''));
  v_media_urls text[] := coalesce(p_media_urls, '{}'::text[]);
  v_media_type text := nullif(btrim(coalesce(p_media_type, '')), '');
  v_message_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_receiver_id is null or p_receiver_id = v_me then
    raise exception 'cannot message yourself' using errcode = '22023';
  end if;
  if char_length(v_trimmed) > 4000
     or (char_length(v_trimmed) = 0 and coalesce(cardinality(v_media_urls), 0) = 0) then
    raise exception 'invalid message length' using errcode = '22023';
  end if;
  if coalesce(cardinality(v_media_urls), 0) > 4 then
    raise exception 'too many media attachments' using errcode = '22023';
  end if;
  if v_media_type is not null and v_media_type not in ('image', 'video') then
    raise exception 'invalid media type' using errcode = '22023';
  end if;

  insert into public.direct_messages (sender_id, receiver_id, content, media_urls, media_type)
  values (v_me, p_receiver_id, v_trimmed, v_media_urls, v_media_type)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke execute on function public.send_direct_message_with_notification(uuid, text, text[], text) from public, anon;
grant execute on function public.send_direct_message_with_notification(uuid, text, text[], text) to authenticated;

-- 5. Update publish_community_post without creating an ambiguous overload
drop function if exists public.publish_community_post(text, text, text, boolean);

create or replace function public.publish_community_post(
  p_title text,
  p_content text,
  p_category text default 'general',
  p_record_shared_build boolean default false,
  p_media_urls text[] default '{}',
  p_media_type text default null
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  content text,
  category text,
  media_urls text[],
  media_type text,
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
  v_media_urls text[] := coalesce(p_media_urls, '{}'::text[]);
  v_media_type text := nullif(btrim(coalesce(p_media_type, '')), '');
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
  if coalesce(cardinality(v_media_urls), 0) > 4 then
    raise exception 'too many media attachments' using errcode = '22023';
  end if;
  if v_media_type is not null and v_media_type not in ('image', 'video') then
    raise exception 'invalid media type' using errcode = '22023';
  end if;

  insert into public.community_posts (user_id, title, content, category, media_urls, media_type)
  values (v_me, v_title, v_content, v_category, v_media_urls, v_media_type)
  returning
    community_posts.id,
    community_posts.user_id,
    community_posts.title,
    community_posts.content,
    community_posts.category,
    community_posts.media_urls,
    community_posts.media_type,
    community_posts.likes_count,
    community_posts.created_at
  into id, user_id, title, content, category, media_urls, media_type, likes_count, created_at;

  if coalesce(p_record_shared_build, false) or v_category = 'build_showcase' then
    insert into public.shared_builds (user_id, title)
    values (v_me, title);
  end if;

  return next;
end;
$$;

revoke execute on function public.publish_community_post(text, text, text, boolean, text[], text) from public, anon;
grant execute on function public.publish_community_post(text, text, text, boolean, text[], text) to authenticated;
