-- =====================================================================================
-- ViciTech OS Migration 20261126: Catalog Metadata Expansion (Consoles & Handheld PCs)
-- Schema migration ONLY (safe to re-run / idempotent).
-- Optional sample demo items live separately in supabase/seed_consoles_handhelds.sql.
-- =====================================================================================

alter table public.products
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_metadata_is_object'
  ) then
    alter table public.products
      add constraint products_metadata_is_object
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

-- Expand category check constraint to support Consoles & Handhelds alongside existing categories.
alter table public.products
  drop constraint if exists products_category_check;

alter table public.products
  add constraint products_category_check
  check (
    category in (
      'pc-build',
      'laptop',
      'smartphone',
      'console',
      'handheld',
      'component',
      'accessory'
    )
  );

create index if not exists idx_products_metadata_gin
  on public.products using gin (metadata);
