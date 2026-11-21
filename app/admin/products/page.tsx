import type { ReactElement } from 'react';
import { MarketProductsManager } from '@/components/features/admin/market-products-manager';
import type { ProductRow } from '@/lib/admin/products-validation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PRODUCT_COLUMNS =
  'id, slug, title, description, price, category, seller_type, specs, images, stock_status, is_preset, preset_components, reviewed_by_name, reviewed_by_avatar, review_quote, review_video_url, created_at, updated_at';

export default async function AdminProductsPage(): Promise<ReactElement> {
  let initialProducts: ProductRow[] = [];
  let initialError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) {
      initialError = 'Gagal memuat katalog produk dari Supabase. Pastikan tabel public.products tersedia.';
    } else {
      initialProducts = data || [];
    }
  } catch (err: unknown) {
    initialError =
      err instanceof Error ? err.message : 'Gagal menghubungkan ke database Supabase.';
  }

  return (
    <MarketProductsManager
      initialProducts={initialProducts}
      initialError={initialError}
    />
  );
}
