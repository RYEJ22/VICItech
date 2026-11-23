-- =====================================================================================
-- ViciTech Migration 20261123000010: GIF Support on Community Comments
-- Safe & idempotent: adds nullable `gif_url` column, allows GIF-only or text+GIF
-- comments, and updates notification preview body in private.notify_on_community_comment().
-- =====================================================================================

alter table public.community_comments
  add column if not exists gif_url text;

alter table public.community_comments
  alter column content set default '';

alter table public.community_comments
  drop constraint if exists community_comments_content_valid,
  drop constraint if exists community_comments_gif_url_valid;

alter table public.community_comments
  add constraint community_comments_content_valid check (
    (char_length(btrim(coalesce(content, ''))) between 1 and 1000)
    or (
      gif_url is not null
      and char_length(btrim(gif_url)) between 10 and 2048
      and char_length(btrim(coalesce(content, ''))) <= 1000
    )
  ),
  add constraint community_comments_gif_url_valid check (
    gif_url is null
    or (
      char_length(btrim(gif_url)) <= 2048
      and btrim(gif_url) ~* '^https://'
    )
  );

create or replace function private.notify_on_community_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_body text;
begin
  select user_id into v_owner_id
  from public.community_posts
  where id = new.post_id;

  if v_owner_id is not null and v_owner_id <> new.user_id then
    v_body := left(btrim(coalesce(new.content, '')), 160);
    if v_body = '' and new.gif_url is not null then
      v_body := '[GIF]';
    end if;

    insert into public.notifications (user_id, actor_id, type, entity_id, title, body)
    values (
      v_owner_id,
      new.user_id,
      'comment',
      new.post_id::text,
      'Komentar baru pada postingan Anda',
      nullif(v_body, '')
    );
  end if;

  return new;
end;
$$;

revoke all on function private.notify_on_community_comment() from public, anon, authenticated;
