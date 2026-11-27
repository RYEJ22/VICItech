"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export function CookieSettingsButton() {
  const { isEnglish } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("vicitech:open-cookie-settings"))}
      className="vt-motion-press inline-flex min-h-11 items-center rounded px-2 text-xs font-medium text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
    >
      {isEnglish ? "Cookie Settings" : "Pengaturan Cookie"}
    </button>
  );
}
