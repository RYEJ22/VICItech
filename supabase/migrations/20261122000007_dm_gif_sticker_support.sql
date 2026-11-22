-- =====================================================================================
-- ViciTech OS Migration 20261122000007: GIF & Custom Sticker Support for Realtime DMs
-- Safe to re-run (idempotent). Preserves all RLS policies and immutability triggers.
-- =====================================================================================

-- 1. Extend public.direct_messages constraints to permit 'gif' and 'sticker'
alter table public.direct_messages
  drop constraint if exists direct_messages_media_type_valid,
  drop constraint if exists direct_messages_content_valid;

alter table public.direct_messages
  add constraint direct_messages_media_type_valid check (
    media_type is null or media_type in ('image', 'video', 'gif', 'sticker')
  ),
  add constraint direct_messages_content_valid check (
    (char_length(btrim(content)) between 1 and 4000)
    or (cardinality(media_urls) > 0 and char_length(btrim(content)) <= 4000)
    or (media_type = 'sticker' and char_length(btrim(content)) <= 4000)
  );

-- 2. Update notification preview generation for stickers & GIFs
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

  if new.media_type = 'sticker' or v_preview like '[[vt:sticker:%]]' then
    v_preview := '[Stiker ViciTech]';
  elsif v_preview = '' and coalesce(cardinality(new.media_urls), 0) > 0 then
    v_preview := case
      when new.media_type = 'video' then '[Video]'
      when new.media_type = 'gif' then '[GIF]'
      else '[Foto]'
    end;
  elsif new.media_type = 'gif' and v_preview = '' then
    v_preview := '[GIF]';
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

-- 3. Update send_direct_message_with_notification to allow 'gif' and 'sticker'
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
  if v_media_type is not null and v_media_type not in ('image', 'video', 'gif', 'sticker') then
    raise exception 'invalid media type' using errcode = '22023';
  end if;
  if char_length(v_trimmed) > 4000
     or (
       char_length(v_trimmed) = 0
       and coalesce(cardinality(v_media_urls), 0) = 0
       and coalesce(v_media_type, '') <> 'sticker'
     ) then
    raise exception 'invalid message length' using errcode = '22023';
  end if;
  if coalesce(cardinality(v_media_urls), 0) > 4 then
    raise exception 'too many media attachments' using errcode = '22023';
  end if;

  insert into public.direct_messages (sender_id, receiver_id, content, media_urls, media_type)
  values (v_me, p_receiver_id, v_trimmed, v_media_urls, v_media_type)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke execute on function public.send_direct_message_with_notification(uuid, text, text[], text) from public, anon;
grant execute on function public.send_direct_message_with_notification(uuid, text, text[], text) to authenticated;
