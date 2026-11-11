'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

const SHELL_OWNED_ROUTES = ["/", "/messages"];
const NAV_ITEMS = [
  { href: "/", label: "Home", shortLabel: "Home" },
  { href: "/qc-panel", label: "QC Panel", shortLabel: "QC" },
  { href: "/marketplace", label: "Marketplace", shortLabel: "Market" },
  { href: "/community", label: "Community", shortLabel: "Community" },
] as const;

function isShellOwnedRoute(pathname: string) {
  return (
    SHELL_OWNED_ROUTES.includes(pathname) ||
    pathname.startsWith("/profile/") ||
    pathname.startsWith("/admin")
  );
}

function isActiveRoute(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname && isShellOwnedRoute(pathname)) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 text-zinc-900 backdrop-blur-md transition-colors duration-300 dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-100">
      <nav aria-label="Main navigation" className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="group inline-flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-emerald-950 shadow-[0_0_20px_-8px_rgba(16,185,129,0.8)] transition-colors duration-300">
            <Zap className="h-5 w-5 fill-current" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
            ViciTech <span className="text-emerald-600 dark:text-emerald-400">OS</span>
          </span>
        </Link>

        <div className="hidden shrink-0 items-center gap-1 sm:flex sm:gap-2">
          {NAV_ITEMS.map(({ href, label, shortLabel }) => {
            const active = isActiveRoute(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-2 py-2 text-[11px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 sm:px-3 sm:text-sm ${
                  active
                    ? "bg-emerald-500/10 text-emerald-700 shadow-[0_0_16px_-10px_rgba(16,185,129,0.8)] dark:text-emerald-300"
                    : "text-zinc-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-300"
                }`}
              >
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-emerald-500/40 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-emerald-300 sm:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-primary-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <span className="hidden h-6 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" aria-hidden="true" />
          <ThemeToggle />
        </div>
      </nav>
      {mobileOpen && (
        <div id="mobile-primary-navigation" className="border-t border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden">
          <nav aria-label="Mobile navigation" className="mx-auto grid max-w-7xl gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = isActiveRoute(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                    active
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "text-zinc-700 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-300"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
