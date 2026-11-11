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

drop policy if exists "Users can read their own QC reports" on public.qc_test_reports;
create policy "Users can read their own QC reports"
  on public.qc_test_reports
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own QC reports" on public.qc_test_reports;
create policy "Users can create their own QC reports"
  on public.qc_test_reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.qc_test_reports to authenticated;
