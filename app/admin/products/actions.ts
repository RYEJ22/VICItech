'use server';

import { revalidatePath } from 'next/cache';
import {
  isMissingImageColumnError,
  isProductStockStatus,
  normalizeProductRecord,
  validateProductPayload,
} from '@/lib/admin/products-validation';
import type {
  ActionResponse,
  ProductFormPayload,
  ProductInsert,
  ProductRow,
  ProductStockStatus,
  ProductUpdate,
} from '@/lib/admin/products-validation';
import { verifyAdminRole } from '@/lib/supabase/admin-auth';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function checkVerifyAdminResult(
  result: unknown,
): { readonly isAdmin: boolean; readonly hasError: boolean } {
  if (typeof result !== 'object' || result === null) {
    return { isAdmin: false, hasError: true };
  }
  const record = result as { readonly isAdmin?: unknown; readonly error?: unknown };
  return {
    isAdmin: record.isAdmin === true,
    hasError: Boolean(record.error),
  };
}

async function authorizeAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      error: 'Sesi admin berakhir. Silakan login ulang untuk melanjutkan.',
    };
  }

  const roleCheck = checkVerifyAdminResult(await verifyAdminRole(supabase, user));
  if (roleCheck.hasError) {
    return { ok: false as const, error: 'Gagal memverifikasi hak akses admin.' };
  }
  if (!roleCheck.isAdmin) {
    return { ok: false as const, error: 'Akses ditolak: diperlukan akun administrator.' };
  }

  return { ok: true as const, supabase };
}

function revalidateMarketAndAdmin(slug?: string): void {
  revalidatePath('/admin/products');
  revalidatePath('/admin');
  revalidatePath('/market');
  revalidatePath('/builder');
  revalidatePath('/versus');
  revalidatePath('/market/[id]', 'page');
  if (slug) {
    revalidatePath(`/market/${encodeURIComponent(slug)}`);
  }
}

export async function createProductAction(
  payload: ProductFormPayload,
): Promise<ActionResponse<ProductRow>> {
  const auth = await authorizeAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const validated = validateProductPayload(payload);
  if (!validated.ok) return { success: false, error: validated.error };

  const updatedAt = new Date().toISOString();
  const v2PayloadObject = {
    ...validated.data,
    updated_at: updatedAt,
    image_url: validated.imageColumns.image_url,
    gallery_urls: [...validated.imageColumns.gallery_urls],
  };
  const v2InsertPayload: ProductInsert = v2PayloadObject;

  let result = await auth.supabase
    .from('products')
    .insert(v2InsertPayload)
    .select('*')
    .single();

  if (result.error && isMissingImageColumnError(result.error)) {
    result = await auth.supabase
      .from('products')
      .insert({
        ...validated.data,
        updated_at: updatedAt,
      })
      .select('*')
      .single();
  }

  if (result.error || !result.data) {
    if (result.error?.code === '23505') {
      return {
        success: false,
        error: 'Slug sudah dipakai produk lain. Gunakan slug yang berbeda.',
      };
    }
    return { success: false, error: 'Gagal menambahkan produk ke katalog. Coba lagi.' };
  }

  const normalized = normalizeProductRecord(result.data);
  revalidateMarketAndAdmin(normalized.slug);
  return { success: true, data: normalized };
}

export async function updateProductAction(
  productId: string,
  payload: ProductFormPayload,
): Promise<ActionResponse<ProductRow>> {
  if (!UUID_REGEX.test(productId)) {
    return { success: false, error: 'ID produk tidak valid.' };
  }

  const auth = await authorizeAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const validated = validateProductPayload(payload);
  if (!validated.ok) return { success: false, error: validated.error };

  const updatedAt = new Date().toISOString();
  const v2PayloadObject = {
    ...validated.data,
    updated_at: updatedAt,
    image_url: validated.imageColumns.image_url,
    gallery_urls: [...validated.imageColumns.gallery_urls],
  };
  const v2UpdatePayload: ProductUpdate = v2PayloadObject;

  let result = await auth.supabase
    .from('products')
    .update(v2UpdatePayload)
    .eq('id', productId)
    .select('*')
    .maybeSingle();

  if (result.error && isMissingImageColumnError(result.error)) {
    result = await auth.supabase
      .from('products')
      .update({
        ...validated.data,
        updated_at: updatedAt,
      })
      .eq('id', productId)
      .select('*')
      .maybeSingle();
  }

  if (result.error) {
    if (result.error.code === '23505') {
      return {
        success: false,
        error: 'Slug sudah dipakai produk lain. Gunakan slug yang berbeda.',
      };
    }
    return { success: false, error: 'Gagal memperbarui produk. Periksa kembali isian Anda.' };
  }

  if (!result.data) {
    return { success: false, error: 'Produk tidak ditemukan atau sudah dihapus.' };
  }

  const normalized = normalizeProductRecord(result.data);
  revalidateMarketAndAdmin(normalized.slug);
  return { success: true, data: normalized };
}

export async function updateProductStockAction(
  productId: string,
  stockStatus: ProductStockStatus,
): Promise<ActionResponse<ProductRow>> {
  if (!UUID_REGEX.test(productId)) {
    return { success: false, error: 'ID produk tidak valid.' };
  }
  if (!isProductStockStatus(stockStatus)) {
    return { success: false, error: 'Status stok tidak valid.' };
  }

  const auth = await authorizeAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const updatedAt = new Date().toISOString();
  const { data, error } = await auth.supabase
    .from('products')
    .update({
      stock_status: stockStatus,
      updated_at: updatedAt,
    })
    .eq('id', productId)
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: 'Gagal memperbarui status stok produk.' };
  }

  const normalized = normalizeProductRecord(data);
  revalidateMarketAndAdmin(normalized.slug);
  return { success: true, data: normalized };
}

export async function deleteProductAction(
  productId: string,
): Promise<ActionResponse<{ readonly id: string }>> {
  if (!UUID_REGEX.test(productId)) {
    return { success: false, error: 'ID produk tidak valid.' };
  }

  const auth = await authorizeAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from('products').delete().eq('id', productId);
  if (error) {
    return { success: false, error: 'Gagal menghapus produk dari database.' };
  }

  revalidateMarketAndAdmin();
  return { success: true, data: { id: productId } };
}
