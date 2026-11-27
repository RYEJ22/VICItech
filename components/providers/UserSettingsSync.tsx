'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';
import {
  DEFAULT_USER_SETTINGS,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
  USER_SETTINGS_UPDATED_EVENT,
  applyUserSettingsToDocument,
  getStoredUserSettings,
  mergeRemoteUserSettings,
  saveStoredUserSettings,
} from '@/lib/user-settings';

export function UserSettingsSync() {
  useEffect(() => {
    const localSettings = getStoredUserSettings();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const initial = localSettings ?? {
      ...DEFAULT_USER_SETTINGS,
      reducedMotion: prefersReducedMotion,
    };
    applyUserSettingsToDocument(initial);

    const handleSettingsUpdate = () => {
      const latest = getStoredUserSettings();
      if (latest) {
        applyUserSettingsToDocument(latest);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === USER_SETTINGS_STORAGE_KEY ||
        event.key === THEME_STORAGE_KEY ||
        event.key === LANGUAGE_STORAGE_KEY
      ) {
        handleSettingsUpdate();
      }
    };

    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
    window.addEventListener('storage', handleStorage);

    let active = true;
    async function syncFromProfile(): Promise<void> {
      if (!isSupabaseAuthConfigured) return;
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active || !user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .maybeSingle();

        if (!active || error || !profile?.settings) return;
        const remoteKeys =
          typeof profile.settings === 'object' && profile.settings !== null
            ? Object.keys(profile.settings)
            : [];
        if (remoteKeys.length === 0) return;

        const localBefore = getStoredUserSettings();
        const merged = mergeRemoteUserSettings(profile.settings, localBefore);
        const unchanged =
          localBefore !== null &&
          localBefore.theme === merged.theme &&
          localBefore.language === merged.language &&
          localBefore.pixelIntensity === merged.pixelIntensity &&
          localBefore.highContrast === merged.highContrast &&
          localBefore.textScale === merged.textScale &&
          localBefore.reducedMotion === merged.reducedMotion &&
          localBefore.temperatureUnit === merged.temperatureUnit &&
          localBefore.compactNumbers === merged.compactNumbers &&
          localBefore.showSourceBadges === merged.showSourceBadges &&
          localBefore.navbarScrollBehavior === merged.navbarScrollBehavior &&
          localBefore.mobileDensity === merged.mobileDensity &&
          localBefore.deletionRequestedAt === merged.deletionRequestedAt;

        if (unchanged) {
          applyUserSettingsToDocument(merged);
        } else {
          saveStoredUserSettings(merged, { preserveUpdatedAt: true });
        }
      } catch {
        // Pertahankan preferensi lokal jika sinkronisasi profil belum tersedia.
      }
    }

    void syncFromProfile();

    return () => {
      active = false;
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, handleSettingsUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return null;
}
