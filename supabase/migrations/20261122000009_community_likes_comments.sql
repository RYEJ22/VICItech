-- =====================================================================================
-- ViciTech Migration 20261122000009: Community Likes & Comments Persistence
-- Adds normalized tables `public.community_post_likes` and `public.community_comments`,
-- strict per-operation RLS policies, and atomic count/notification triggers.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. public.community_post_likes
-- -------------------------------------------------------------------------------------
create table if not exists public.community_post_likes (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.community_posts (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint community_post_likes_unique unique (post_id, user_id)
);

create index if not exists community_post_likes_post_idx
  on public.community_post_likes (post_id);
create index if not exists community_post_likes_user_idx
  on public.community_post_likes (user_id);

alter table public.community_post_likes enable row level security;
revoke all on table public.community_post_likes from public;
grant select on table public.community_post_likes to anon, authenticated;
grant insert, delete on table public.community_post_likes to authenticated;

drop policy if exists "community_post_likes_select_public" on public.community_post_likes;
drop policy if exists "community_post_likes_insert_owner" on public.community_post_likes;
drop policy if exists "community_post_likes_delete_owner" on public.community_post_likes;

create policy "community_post_likes_select_public"
  on public.community_post_likes
  for select
  to anon, authenticated
  using (true);

create policy "community_post_likes_insert_owner"
  on public.community_post_likes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "community_post_likes_delete_owner"
  on public.community_post_likes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.sync_community_post_likes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid;
  v_owner_id uuid;
  v_post_title text;
begin
  v_post_id := case when tg_op = 'DELETE' then old.post_id else new.post_id end;

  update public.community_posts
  set likes_count = (
    select count(*)::integer
    from public.community_post_likes as l
    where l.post_id = v_post_id
  )
  where id = v_post_id
  returning user_id, title into v_owner_id, v_post_title;

  if tg_op = 'INSERT' and v_owner_id is not null and v_owner_id <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, entity_id, title, body)
    values (
      v_owner_id,
      new.user_id,
      'like',
      v_post_id::text,
      'Postingan Anda disukai',
      left(btrim(coalesce(v_post_title, '')), 160)
    );
  end if;

  return null;
end;
$$;

revoke all on function private.sync_community_post_likes() from public, anon, authenticated;

drop trigger if exists on_community_post_like_sync on public.community_post_likes;
create trigger on_community_post_like_sync
  after insert or delete on public.community_post_likes
  for each row execute function private.sync_community_post_likes();

-- -------------------------------------------------------------------------------------
-- 2. public.community_comments
-- -------------------------------------------------------------------------------------
create table if not exists public.community_comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.community_posts (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now(),

  constraint community_comments_content_valid check (char_length(btrim(content)) between 1 and 1000)
);

create index if not exists community_comments_post_created_idx
  on public.community_comments (post_id, created_at asc);
create index if not exists community_comments_user_idx
  on public.community_comments (user_id);

alter table public.community_comments enable row level security;
revoke all on table public.community_comments from public;
grant select on table public.community_comments to anon, authenticated;
grant insert, delete on table public.community_comments to authenticated;

drop policy if exists "community_comments_select_public" on public.community_comments;
drop policy if exists "community_comments_insert_owner" on public.community_comments;
drop policy if exists "community_comments_delete_owner" on public.community_comments;

create policy "community_comments_select_public"
  on public.community_comments
  for select
  to anon, authenticated
  using (true);

create policy "community_comments_insert_owner"
  on public.community_comments
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "community_comments_delete_owner"
  on public.community_comments
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.notify_on_community_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  select user_id into v_owner_id
  from public.community_posts
  where id = new.post_id;

  if v_owner_id is not null and v_owner_id <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, entity_id, title, body)
    values (
      v_owner_id,
      new.user_id,
      'comment',
      new.post_id::text,
      'Komentar baru pada postingan Anda',
      left(btrim(new.content), 160)
    );
  end if;

  return new;
end;
$$;

revoke all on function private.notify_on_community_comment() from public, anon, authenticated;

drop trigger if exists on_community_comment_notify on public.community_comments;
create trigger on_community_comment_notify
  after insert on public.community_comments
  for each row execute function private.notify_on_community_comment();
