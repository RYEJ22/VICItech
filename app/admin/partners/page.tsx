import type { ReactElement } from 'react';
import { PartnersManager } from '@/components/features/admin/partners-manager';
import type { PartnerRow } from '@/lib/admin/partners-validation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const PARTNER_COLUMNS =
  'id, name, type, address, city, gmaps_url, latitude, longitude, is_verified, whatsapp_number, created_at, updated_at';

export default async function AdminPartnersPage(): Promise<ReactElement> {
  let initialPartners: PartnerRow[] = [];
  let initialError: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('partners')
      .select(PARTNER_COLUMNS)
      .order('city', { ascending: true })
      .order('name', { ascending: true })
      .limit(250);

    if (error) {
      initialError = 'Gagal memuat daftar mitra dari Supabase. Pastikan tabel public.partners tersedia.';
    } else {
      initialPartners = data || [];
    }
  } catch (err: unknown) {
    initialError =
      err instanceof Error ? err.message : 'Gagal menghubungkan ke database Supabase.';
  }

  return (
    <PartnersManager
      initialPartners={initialPartners}
      initialError={initialError}
    />
  );
}
