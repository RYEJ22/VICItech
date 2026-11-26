'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_USER_SETTINGS,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
  USER_SETTINGS_UPDATED_EVENT,
  getStoredUserSettings,
  type UserSettings,
} from '@/lib/user-settings';

export function useUserSettings(): UserSettings {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

  useEffect(() => {
    const sync = () => {
      const latest = getStoredUserSettings();
      if (latest) {
        setSettings(latest);
      }
    };

    sync();

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === USER_SETTINGS_STORAGE_KEY ||
        event.key === THEME_STORAGE_KEY ||
        event.key === LANGUAGE_STORAGE_KEY
      ) {
        sync();
      }
    };

    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, sync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, sync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return settings;
}
