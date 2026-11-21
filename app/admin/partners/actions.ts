'use server';

import { revalidatePath } from 'next/cache';
import { validatePartnerPayload } from '@/lib/admin/partners-validation';
import type { PartnerFormPayload, PartnerRow } from '@/lib/admin/partners-validation';
import type { ActionResponse } from '@/lib/admin/products-validation';
import { verifyAdminRole } from '@/lib/supabase/admin-auth';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARTNER_SELECT_COLUMNS =
  'id, name, type, address, city, gmaps_url, latitude, longitude, is_verified, whatsapp_number, created_at, updated_at';

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

function revalidatePartnersAndAdmin(): void {
  revalidatePath('/admin/partners');
  revalidatePath('/admin');
  revalidatePath('/partners');
}

export async function createPartnerAction(
  payload: PartnerFormPayload,
): Promise<ActionResponse<PartnerRow>> {
  const auth = await authorizeAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const validated = validatePartnerPayload(payload);
  if (!validated.ok) return { success: false, error: validated.error };

  const { data, error } = await auth.supabase
    .from('partners')
    .insert({
      ...validated.data,
      updated_at: new Date().toISOString(),
    })
    .select(PARTNER_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    return { success: false, error: 'Gagal mendaftarkan mitra baru. Periksa kembali data Anda.' };
  }

  revalidatePartnersAndAdmin();
  return { success: true, data };
}

export async function updatePartnerAction(
  partnerId: string,
  payload: PartnerFormPayload,
): Promise<ActionResponse<PartnerRow>> {
  if (!UUID_REGEX.test(partnerId)) {
    return { success: false, error: 'ID mitra tidak valid.' };
  }

  const auth = await authorizeAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const validated = validatePartnerPayload(payload);
  if (!validated.ok) return { success: false, error: validated.error };

  const { data, error } = await auth.supabase
    .from('partners')
    .update({
      ...validated.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', partnerId)
    .select(PARTNER_SELECT_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: 'Gagal memperbarui data mitra.' };
  }

  revalidatePartnersAndAdmin();
  return { success: true, data };
}

export async function togglePartnerVerifiedAction(
  partnerId: string,
  nextVerified: boolean,
): Promise<ActionResponse<PartnerRow>> {
  if (!UUID_REGEX.test(partnerId)) {
    return { success: false, error: 'ID mitra tidak valid.' };
  }

  const auth = await authorizeAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from('partners')
    .update({
      is_verified: Boolean(nextVerified),
      updated_at: new Date().toISOString(),
    })
    .eq('id', partnerId)
    .select(PARTNER_SELECT_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: 'Gagal mengubah status verifikasi mitra.' };
  }

  revalidatePartnersAndAdmin();
  return { success: true, data };
}

export async function deletePartnerAction(
  partnerId: string,
): Promise<ActionResponse<{ readonly id: string }>> {
  if (!UUID_REGEX.test(partnerId)) {
    return { success: false, error: 'ID mitra tidak valid.' };
  }

  const auth = await authorizeAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from('partners').delete().eq('id', partnerId);
  if (error) {
    return { success: false, error: 'Gagal menghapus mitra dari database.' };
  }

  revalidatePartnersAndAdmin();
  return { success: true, data: { id: partnerId } };
}
