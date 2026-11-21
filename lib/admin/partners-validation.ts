import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types';

export const PARTNER_TYPES = ['service_center', 'toko_komponen'] as const;

export type PartnerRow = Tables<'partners'>;
export type PartnerInsert = TablesInsert<'partners'>;
export type PartnerUpdate = TablesUpdate<'partners'>;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export interface PartnerFormPayload {
  readonly name: string;
  readonly type: string;
  readonly city: string;
  readonly address: string;
  readonly whatsapp_number: string;
  readonly gmaps_url: string;
  readonly latitude: string;
  readonly longitude: string;
  readonly is_verified: boolean;
}

export const PARTNER_TYPE_LABELS: Readonly<Record<PartnerType, string>> = {
  service_center: 'Service Center',
  toko_komponen: 'Toko Komponen',
};

export function isPartnerType(value: unknown): value is PartnerType {
  return typeof value === 'string' && (PARTNER_TYPES as readonly string[]).includes(value);
}

function parseOptionalCoord(
  raw: string,
  min: number,
  max: number,
  label: string,
): { readonly ok: true; readonly value: number | null } | { readonly ok: false; readonly error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { ok: false, error: `${label} harus berupa angka antara ${min} hingga ${max}.` };
  }
  return { ok: true, value: Number(parsed.toFixed(6)) };
}

export function validatePartnerPayload(
  input: PartnerFormPayload,
):
  | { readonly ok: true; readonly data: PartnerInsert }
  | { readonly ok: false; readonly error: string } {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 160) {
    return { ok: false, error: 'Nama mitra wajib diisi antara 2 hingga 160 karakter.' };
  }

  if (!isPartnerType(input.type)) {
    return { ok: false, error: 'Pilih tipe mitra yang valid.' };
  }

  const city = input.city.trim();
  if (city.length < 2 || city.length > 100) {
    return { ok: false, error: 'Kota wajib diisi antara 2 hingga 100 karakter.' };
  }

  const address = input.address.trim();
  if (address.length < 4 || address.length > 300) {
    return { ok: false, error: 'Alamat lengkap wajib diisi antara 4 hingga 300 karakter.' };
  }

  const rawWhatsapp = input.whatsapp_number.trim();
  let normalizedWhatsapp: string | null = null;
  if (rawWhatsapp) {
    const digits = rawWhatsapp.replace(/[^\d]/g, '');
    if (digits.length < 8 || digits.length > 16) {
      return { ok: false, error: 'Nomor WhatsApp harus terdiri dari 8 hingga 16 digit angka.' };
    }
    normalizedWhatsapp = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  }

  const gmapsUrl = input.gmaps_url.trim();
  if (gmapsUrl) {
    try {
      const parsed = new URL(gmapsUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, error: 'URL Google Maps harus diawali https:// atau http://.' };
      }
    } catch {
      return { ok: false, error: 'Format URL Google Maps tidak valid.' };
    }
  }

  const latResult = parseOptionalCoord(input.latitude, -90, 90, 'Latitude');
  if (!latResult.ok) return latResult;

  const lngResult = parseOptionalCoord(input.longitude, -180, 180, 'Longitude');
  if (!lngResult.ok) return lngResult;

  return {
    ok: true,
    data: {
      name,
      type: input.type,
      city,
      address,
      whatsapp_number: normalizedWhatsapp,
      gmaps_url: gmapsUrl || null,
      latitude: latResult.value,
      longitude: lngResult.value,
      is_verified: Boolean(input.is_verified),
    },
  };
}
