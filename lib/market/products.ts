import { cache } from 'react';
import { normalizeProductRecord } from '@/lib/admin/products-validation';
import type { ProductRow } from '@/lib/admin/products-validation';
import { createClient } from '@/lib/supabase/server';
import { isUuid, rankRecommendedProducts } from './product-presenter';

function decodeIdentifier(rawIdentifier: string): string {
  try {
    return decodeURIComponent(rawIdentifier).trim();
  } catch {
    return '';
  }
}

export async function listMarketProducts(
  limit = 100,
): Promise<{ readonly products: readonly ProductRow[]; readonly error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        products: [],
        error: 'Gagal memuat katalog produk dari Supabase. Coba muat ulang halaman beberapa saat lagi.',
      };
    }

    return {
      products: (data ?? []).map(normalizeProductRecord),
      error: null,
    };
  } catch {
    return {
      products: [],
      error: 'Koneksi ke katalog produk belum tersedia. Periksa konfigurasi Supabase Anda.',
    };
  }
}

export const getMarketProductByIdentifier = cache(
  async (rawIdentifier: string): Promise<ProductRow | null> => {
    const cleaned = decodeIdentifier(rawIdentifier);
    if (!cleaned || cleaned.length > 200) {
      return null;
    }

    const supabase = await createClient();
    const baseQuery = supabase.from('products').select('*');
    const { data, error } = isUuid(cleaned)
      ? await baseQuery.eq('id', cleaned).maybeSingle()
      : await baseQuery.eq('slug', cleaned).maybeSingle();

    if (error) {
      throw new Error('Gagal memuat detail produk dari database. Silakan muat ulang halaman.');
    }

    return data ? normalizeProductRecord(data) : null;
  },
);

export async function getRecommendedMarketProducts(
  currentProduct: ProductRow,
  limit = 8,
): Promise<{ readonly items: readonly ProductRow[]; readonly hasSameCategory: boolean }> {
  try {
    const supabase = await createClient();

    const [sameRes, fallbackRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('category', currentProduct.category)
        .neq('id', currentProduct.id)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('products')
        .select('*')
        .neq('id', currentProduct.id)
        .neq('category', currentProduct.category)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    const sameRows = !sameRes.error && sameRes.data
      ? sameRes.data.map(normalizeProductRecord)
      : [];
    const fallbackRows = !fallbackRes.error && fallbackRes.data
      ? fallbackRes.data.map(normalizeProductRecord)
      : [];

    return rankRecommendedProducts(currentProduct, sameRows, fallbackRows, limit);
  } catch {
    return { items: [], hasSameCategory: false };
  }
}
