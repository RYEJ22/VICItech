-- =====================================================================================
-- ViciTech OS Migration 20261126: User Feedback & Validation Hub
-- Safe to re-run (idempotent).
-- Allows public/authenticated INSERT for frictionless user testing,
-- while restricting SELECT, UPDATE, and DELETE strictly to admins.
-- =====================================================================================

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null,
  rating smallint not null,
  message text not null,
  page_module text,
  contact_name text,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_feedback_category_check check (
    category in ('Saran Fitur', 'Laporan Bug', 'Testimoni / Pengalaman', 'Lainnya')
  ),
  constraint user_feedback_rating_check check (
    rating between 1 and 5
  ),
  constraint user_feedback_message_length check (
    char_length(btrim(message)) between 5 and 2000
  ),
  constraint user_feedback_page_module_length check (
    page_module is null or char_length(btrim(page_module)) <= 120
  ),
  constraint user_feedback_contact_name_length check (
    contact_name is null or char_length(btrim(contact_name)) <= 160
  ),
  constraint user_feedback_status_check check (
    status in ('new', 'reviewed', 'resolved', 'archived')
  )
);

create index if not exists idx_user_feedback_created_at
  on public.user_feedback (created_at desc);

create index if not exists idx_user_feedback_category_status
  on public.user_feedback (category, status);

alter table public.user_feedback enable row level security;

drop policy if exists user_feedback_public_insert on public.user_feedback;
drop policy if exists user_feedback_admin_select on public.user_feedback;
drop policy if exists user_feedback_admin_update on public.user_feedback;
drop policy if exists user_feedback_admin_delete on public.user_feedback;

create policy user_feedback_public_insert
  on public.user_feedback
  for insert
  to anon, authenticated
  with check (
    user_id is null
    or user_id = (select auth.uid())
  );

create policy user_feedback_admin_select
  on public.user_feedback
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

create policy user_feedback_admin_update
  on public.user_feedback
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

create policy user_feedback_admin_delete
  on public.user_feedback
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

revoke all on public.user_feedback from anon, authenticated;
grant insert on public.user_feedback to anon, authenticated;
grant select, update, delete on public.user_feedback to authenticated;
