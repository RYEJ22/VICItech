import type { PartnerRow } from '@/lib/admin/partners-validation';
import { createClient } from '@/lib/supabase/server';

const PUBLIC_PARTNER_COLUMNS =
  'id, name, type, address, city, gmaps_url, latitude, longitude, is_verified, whatsapp_number, created_at, updated_at';

export async function listPublicPartners(
  limit = 200,
): Promise<{ readonly partners: readonly PartnerRow[]; readonly error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('partners')
      .select(PUBLIC_PARTNER_COLUMNS)
      .order('is_verified', { ascending: false })
      .order('city', { ascending: true })
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      return {
        partners: [],
        error: 'Gagal memuat direktori mitra dari Supabase. Coba muat ulang halaman beberapa saat lagi.',
      };
    }

    return {
      partners: data ?? [],
      error: null,
    };
  } catch {
    return {
      partners: [],
      error: 'Koneksi ke direktori mitra belum tersedia. Periksa konfigurasi Supabase Anda.',
    };
  }
}
