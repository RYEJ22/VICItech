'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { TRANSLATIONS, type TranslationDictionary } from '@/lib/i18n/translations';
import {
  LANGUAGE_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
  USER_SETTINGS_UPDATED_EVENT,
  getStoredLanguage,
  setStoredLanguage,
  type UserLanguage,
} from '@/lib/user-settings';

interface LanguageContextValue {
  readonly language: UserLanguage;
  readonly isEnglish: boolean;
  readonly setLanguage: (next: UserLanguage) => void;
  readonly t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'id',
  isEnglish: false,
  setLanguage: () => {},
  t: TRANSLATIONS.id,
});

export function LanguageProvider({ children }: { readonly children: ReactNode }) {
  const [language, setLanguageState] = useState<UserLanguage>('id');

  useEffect(() => {
    const syncLanguage = () => {
      const next = getStoredLanguage();
      setLanguageState((prev) => (prev === next ? prev : next));
      if (typeof document !== 'undefined') {
        document.documentElement.lang = next;
        document.documentElement.setAttribute('data-language', next);
      }
    };

    syncLanguage();

    const handleSettingsUpdated = () => {
      syncLanguage();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY || event.key === USER_SETTINGS_STORAGE_KEY) {
        syncLanguage();
      }
    };

    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setLanguage = useCallback((next: UserLanguage) => {
    const saved = setStoredLanguage(next);
    setLanguageState(saved.language);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isEnglish: language === 'en',
      setLanguage,
      t: TRANSLATIONS[language],
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
