'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_USER_SETTINGS,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
  USER_SETTINGS_UPDATED_EVENT,
  applyUserSettingsToDocument,
  getStoredTheme,
  getStoredUserSettings,
} from '@/lib/user-settings';

export interface ThemeProviderProps {
  readonly children: ReactNode;
}

function resolveDocumentSettings() {
  const stored = getStoredUserSettings();
  if (stored) return stored;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    ...DEFAULT_USER_SETTINGS,
    reducedMotion: prefersReducedMotion,
  };
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    applyUserSettingsToDocument(resolveDocumentSettings());
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    let isSyncing = false;

    const enforceStoredTheme = () => {
      if (isSyncing) return;
      const expectedTheme = getStoredUserSettings()?.theme ?? getStoredTheme();
      const currentAttr = root.getAttribute('data-theme');
      const hasDarkClass = root.classList.contains('dark');
      const shouldBeDark = expectedTheme === 'dark';

      if (currentAttr !== expectedTheme || hasDarkClass !== shouldBeDark) {
        isSyncing = true;
        try {
          root.setAttribute('data-theme', expectedTheme);
          root.classList.toggle('dark', shouldBeDark);
        } finally {
          isSyncing = false;
        }
      }
    };

    const syncAll = () => {
      isSyncing = true;
      try {
        applyUserSettingsToDocument(resolveDocumentSettings());
      } finally {
        isSyncing = false;
      }
    };

    enforceStoredTheme();

    const observer = new MutationObserver(() => {
      enforceStoredTheme();
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === THEME_STORAGE_KEY ||
        event.key === USER_SETTINGS_STORAGE_KEY ||
        event.key === LANGUAGE_STORAGE_KEY
      ) {
        syncAll();
      }
    };

    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, syncAll);
    window.addEventListener('storage', handleStorage);
    return () => {
      observer.disconnect();
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, syncAll);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return <>{children}</>;
}
