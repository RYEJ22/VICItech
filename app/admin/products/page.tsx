import type { ReactElement } from 'react';
import { MarketProductsManager } from '@/components/features/admin/market-products-manager';
import { normalizeProductRecord } from '@/lib/admin/products-validation';
import type { ProductRow } from '@/lib/admin/products-validation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage(): Promise<ReactElement> {
  let initialProducts: ProductRow[] = [];
  let initialError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) {
      initialError =
        'Gagal memuat katalog produk dari Supabase. Pastikan tabel public.products tersedia.';
    } else {
      initialProducts = (data ?? []).map(normalizeProductRecord);
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
