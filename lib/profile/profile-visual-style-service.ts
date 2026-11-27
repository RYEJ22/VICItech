import { DEFAULT_PROFILE_VISUAL_STYLE, loadProfileVisualStyle, normalizeProfileVisualStyle } from './profile-customization';
import type { ProfileVisualCustomization } from './profile-customization';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';

const PROFILE_VISUAL_STYLE_KEY = 'profileVisualStyle';
const profileStyleCache = new Map<string, Promise<ProfileVisualCustomization | null>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractVisualStyle(settings: unknown): ProfileVisualCustomization | null {
  if (!isRecord(settings) || !isRecord(settings[PROFILE_VISUAL_STYLE_KEY])) return null;
  return normalizeProfileVisualStyle(settings[PROFILE_VISUAL_STYLE_KEY]);
}

export function clearProfileVisualStyleCache(userId?: string): void {
  if (userId) {
    profileStyleCache.delete(userId.trim());
    return;
  }
  profileStyleCache.clear();
}

export function fetchProfileVisualStyle(
  userId: string,
  allowLocalFallback = false,
): Promise<ProfileVisualCustomization> {
  const cleanUserId = userId.trim();
  if (!cleanUserId || !isSupabaseAuthConfigured) {
    return Promise.resolve(allowLocalFallback ? loadProfileVisualStyle(cleanUserId) : DEFAULT_PROFILE_VISUAL_STYLE);
  }

  const cached = profileStyleCache.get(cleanUserId);
  if (cached) {
    return cached.then((style) => style ?? (allowLocalFallback ? loadProfileVisualStyle(cleanUserId) : DEFAULT_PROFILE_VISUAL_STYLE));
  }

  const request = (async (): Promise<ProfileVisualCustomization | null> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', cleanUserId)
        .maybeSingle();

      if (!error) {
        return extractVisualStyle(data?.settings);
      }

      console.error('[ViciTech] Profile visual style query failed:', error);
      return null;
    } catch (error: unknown) {
      console.error('[ViciTech] Profile visual style fetch threw:', error);
      return null;
    }
  })();

  profileStyleCache.set(cleanUserId, request);
  return request.then((style) => style ?? (allowLocalFallback ? loadProfileVisualStyle(cleanUserId) : DEFAULT_PROFILE_VISUAL_STYLE));
}

export async function saveProfileVisualStyleToProfile(
  userId: string,
  style: ProfileVisualCustomization,
): Promise<{ readonly ok: true; readonly style: ProfileVisualCustomization } | { readonly ok: false; readonly error: string }> {
  const cleanUserId = userId.trim();
  if (!cleanUserId) return { ok: false, error: 'ID profil tidak tersedia untuk menyimpan kustomisasi.' };
  if (!isSupabaseAuthConfigured) return { ok: false, error: 'Konfigurasi Supabase belum aktif.' };

  const normalized = normalizeProfileVisualStyle(style);
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: profile, error: readError } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', cleanUserId)
      .maybeSingle();

    if (readError) return { ok: false, error: `Gagal membaca pengaturan profil: ${readError.message}` };
    if (!profile) return { ok: false, error: 'Profil tidak ditemukan. Muat ulang halaman lalu coba lagi.' };

    const existingSettings = isRecord(profile.settings) ? profile.settings : {};
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        settings: { ...existingSettings, [PROFILE_VISUAL_STYLE_KEY]: normalized },
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanUserId);

    if (updateError) return { ok: false, error: `Gagal menyimpan kustomisasi profil: ${updateError.message}` };

    profileStyleCache.set(cleanUserId, Promise.resolve(normalized));
    return { ok: true, style: normalized };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? `Gagal menyimpan kustomisasi profil: ${error.message}` : 'Gagal menyimpan kustomisasi profil.',
    };
  }
}
