-- =====================================================================================
-- ViciTech OS Migration 20261122000005: Product Images Bucket & Multi-Image Gallery
-- Safe to re-run (idempotent). Preserves existing `public.products.images` rows.
-- =====================================================================================

-- 1. Add primary image_url and gallery_urls columns to public.products
alter table public.products
  add column if not exists image_url text,
  add column if not exists gallery_urls text[] not null default '{}';

-- Backfill existing products seamlessly without overwriting already-populated values
update public.products
set
  image_url = coalesce(nullif(btrim(image_url), ''), images[1]),
  gallery_urls = case
    when coalesce(cardinality(gallery_urls), 0) > 0 then gallery_urls
    when coalesce(cardinality(images), 0) > 0 then images
    else '{}'::text[]
  end
where (image_url is null or btrim(image_url) = '')
   or coalesce(cardinality(gallery_urls), 0) = 0;

alter table public.products
  drop constraint if exists products_gallery_urls_limit;

alter table public.products
  add constraint products_gallery_urls_limit check (cardinality(gallery_urls) <= 10);

-- 2. Keep image_url, gallery_urls, and legacy images synchronized on insert/update
create or replace function public.sync_product_image_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_raw_urls text[] := '{}'::text[];
  v_clean_urls text[] := '{}'::text[];
  v_item text;
  v_trimmed text;
begin
  if tg_op = 'INSERT' then
    if nullif(btrim(coalesce(new.image_url, '')), '') is not null
       or coalesce(cardinality(new.gallery_urls), 0) > 0 then
      if nullif(btrim(coalesce(new.image_url, '')), '') is not null then
        v_raw_urls := array_append(v_raw_urls, btrim(new.image_url));
      end if;
      v_raw_urls := v_raw_urls || coalesce(new.gallery_urls, '{}'::text[]);
    else
      v_raw_urls := coalesce(new.images, '{}'::text[]);
    end if;
  else
    if new.images is distinct from old.images
       and new.image_url is not distinct from old.image_url
       and new.gallery_urls is not distinct from old.gallery_urls then
      v_raw_urls := coalesce(new.images, '{}'::text[]);
    elsif new.image_url is distinct from old.image_url then
      if nullif(btrim(coalesce(new.image_url, '')), '') is not null then
        v_raw_urls := array_append(v_raw_urls, btrim(new.image_url));
      end if;
      v_raw_urls := v_raw_urls || coalesce(new.gallery_urls, '{}'::text[]);
    elsif new.gallery_urls is distinct from old.gallery_urls then
      v_raw_urls := coalesce(new.gallery_urls, '{}'::text[]);
    else
      if nullif(btrim(coalesce(new.image_url, '')), '') is not null then
        v_raw_urls := array_append(v_raw_urls, btrim(new.image_url));
      end if;
      v_raw_urls := v_raw_urls || coalesce(new.gallery_urls, '{}'::text[]);
    end if;
  end if;

  foreach v_item in array coalesce(v_raw_urls, '{}'::text[]) loop
    v_trimmed := nullif(btrim(coalesce(v_item, '')), '');
    if v_trimmed is not null and not (v_trimmed = any(v_clean_urls)) then
      v_clean_urls := array_append(v_clean_urls, v_trimmed);
    end if;
  end loop;

  new.gallery_urls := v_clean_urls;
  new.images := v_clean_urls;
  new.image_url := v_clean_urls[1];
  return new;
end;
$$;

drop trigger if exists products_sync_image_columns on public.products;
create trigger products_sync_image_columns
  before insert or update on public.products
  for each row execute function public.sync_product_image_columns();

-- 3. Public Storage bucket `product-images` + per-operation RLS policies
do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    execute $sql$
      insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values (
        'product-images',
        'product-images',
        true,
        5242880,
        array['image/jpeg', 'image/png', 'image/webp']
      )
      on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

      drop policy if exists "product_images_select_public" on storage.objects;
      drop policy if exists "product_images_insert_admin" on storage.objects;
      drop policy if exists "product_images_update_admin" on storage.objects;
      drop policy if exists "product_images_delete_admin" on storage.objects;

      create policy "product_images_select_public"
        on storage.objects
        for select
        to anon, authenticated
        using (bucket_id = 'product-images');

      create policy "product_images_insert_admin"
        on storage.objects
        for insert
        to authenticated
        with check (bucket_id = 'product-images' and public.is_admin());

      create policy "product_images_update_admin"
        on storage.objects
        for update
        to authenticated
        using (bucket_id = 'product-images' and public.is_admin())
        with check (bucket_id = 'product-images' and public.is_admin());

      create policy "product_images_delete_admin"
        on storage.objects
        for delete
        to authenticated
        using (bucket_id = 'product-images' and public.is_admin());
    $sql$;
  end if;
end
$$;
