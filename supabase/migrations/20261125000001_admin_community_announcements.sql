-- Allow trusted admins to publish official community announcements (category = 'news').
-- Regular members can still create and edit their own non-official posts only.

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    lower(trim(coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', ''))) = 'admin'
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and lower(trim(coalesce(profiles.role, ''))) = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "community_posts_insert_owner" on public.community_posts;
create policy "community_posts_insert_owner"
  on public.community_posts
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (category <> 'news' or (select public.is_admin()))
  );

drop policy if exists "community_posts_update_owner" on public.community_posts;
create policy "community_posts_update_owner"
  on public.community_posts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (category <> 'news' or (select public.is_admin()))
  );
