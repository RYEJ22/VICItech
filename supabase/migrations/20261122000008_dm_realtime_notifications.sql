-- =====================================================================================
-- ViciTech OS Migration 20261122000008: Realtime DM Read-Tracking & Notifications
-- Safe to re-run (idempotent). Ensures is_read tracking, fast unread indexes,
-- recipient-only UPDATE RLS policy, replica identity full, and Realtime publication.
-- =====================================================================================

-- 1. Ensure read-tracking column exists on public.direct_messages
alter table public.direct_messages
  add column if not exists is_read boolean not null default false;

-- 2. Partial indexes for fast total unread badge counts and per-sender mark-as-read
create index if not exists direct_messages_receiver_unread_idx
  on public.direct_messages (receiver_id)
  where is_read = false;

create index if not exists direct_messages_receiver_sender_unread_idx
  on public.direct_messages (receiver_id, sender_id)
  where is_read = false;

-- 3. Ensure recipient can UPDATE is_read on incoming direct messages
grant update on table public.direct_messages to authenticated;

drop policy if exists "direct_messages_update_receiver" on public.direct_messages;
create policy "direct_messages_update_receiver"
  on public.direct_messages
  for update
  to authenticated
  using ((select auth.uid()) = receiver_id)
  with check ((select auth.uid()) = receiver_id);

-- 4. Enable FULL replica identity & publish direct_messages on supabase_realtime
alter table public.direct_messages replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'direct_messages'
     ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end
$$;
