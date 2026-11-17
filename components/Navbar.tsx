'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";

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
    <header className="sticky top-0 z-50 glass-floating text-[#141518]">
      <nav aria-label="Main navigation" className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="group inline-flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]/50"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FF5500] text-white shadow-[0_4px_12px_rgba(255,85,0,0.25)] transition-all group-hover:scale-105">
            <Zap className="h-5 w-5 fill-current" aria-hidden="true" />
          </span>
          <span className="truncate text-base font-semibold tracking-tight text-[#141518]">
            ViciTech <span className="text-[#FF5500]">OS</span>
          </span>
        </Link>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {NAV_ITEMS.map(({ href, label, shortLabel }) => {
            const active = isActiveRoute(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-[#FF5500] text-white shadow-sm"
                    : "text-[#5A606A] hover:bg-black/5 hover:text-[#141518]"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#5A606A] shadow-sm hover:text-[#141518] sm:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-primary-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div id="mobile-primary-navigation" className="glass-floating p-3 shadow-lg sm:hidden">
          <nav aria-label="Mobile navigation" className="mx-auto grid max-w-7xl gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = isActiveRoute(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#FF5500] text-white shadow-sm"
                      : "text-[#5A606A] hover:bg-black/5 hover:text-[#141518]"
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
