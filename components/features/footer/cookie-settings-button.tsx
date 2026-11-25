"use client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("vicitech:open-cookie-settings"))}
      className="inline-flex min-h-11 items-center rounded px-2 text-xs font-medium text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
    >
      Pengaturan Cookie
    </button>
  );
}
