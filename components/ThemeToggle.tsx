'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  THEME_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
  USER_SETTINGS_UPDATED_EVENT,
  getStoredTheme,
  setStoredTheme,
  type ThemeMode,
} from '@/lib/user-settings';

interface ThemeToggleProps {
  readonly className?: string;
  readonly showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { t } = useLanguage();
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setTheme(getStoredTheme());
    };

    syncTheme();
    setMounted(true);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === USER_SETTINGS_STORAGE_KEY) {
        syncTheme();
      }
    };

    window.addEventListener(USER_SETTINGS_UPDATED_EVENT, syncTheme);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(USER_SETTINGS_UPDATED_EVENT, syncTheme);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const isDark = mounted && theme === 'dark';
  const nextTheme: ThemeMode = isDark ? 'light' : 'dark';
  const label = isDark ? t.themeToggle.switchToLight : t.themeToggle.switchToDark;

  const handleToggle = () => {
    const updated = setStoredTheme(nextTheme);
    setTheme(updated.theme);
  };

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={label}
        aria-pressed={isDark}
        className={`vt-motion-press flex w-full items-center justify-between gap-3 rounded-lg border border-default bg-canvas px-3 py-2.5 text-left transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${className}`}
      >
        <span className="flex items-center gap-3">
          {isDark ? (
            <Sun className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} aria-hidden="true" />
          )}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-primary">
              {isDark ? t.themeToggle.darkTitle : t.themeToggle.lightTitle}
            </span>
            <span className="mt-0.5 block text-xs text-secondary">
              {isDark ? t.themeToggle.darkSub : t.themeToggle.lightSub}
            </span>
          </span>
        </span>
        <span className="vt-pixel-tag rounded border border-default bg-surface px-2 py-1 text-primary">
          {isDark ? 'DARK' : 'LIGHT'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className={`vt-motion-press relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary transition-all duration-200 ease-smooth hover:bg-subtle hover:text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 sm:h-9 sm:w-9 md:h-10 md:w-10 ${
        isDark ? 'text-accent-primary hover:text-accent-primary' : ''
      } ${className}`}
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
