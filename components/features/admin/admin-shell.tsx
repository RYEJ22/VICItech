'use client';

import {
  Activity,
  ArrowLeft,
  Cpu,
  LayoutDashboard,
  MapPin,
  Menu,
  Package,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { AdminSignOutButton } from '@/components/vicitech/admin/AdminSignOutButton';
import styles from './admin-shell.module.css';

interface AdminNavItem {
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly icon: typeof LayoutDashboard;
}

const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    href: '/admin',
    label: 'Ringkasan',
    description: 'Bento KPI & aktivitas operasional',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/products',
    label: 'Produk Market',
    description: 'Katalog produk & preset rakitan',
    icon: Package,
  },
  {
    href: '/admin/hardware',
    label: 'Inventori Hardware',
    description: 'Stok komponen & registri Preset Builder',
    icon: Cpu,
  },
  {
    href: '/admin/dashboard',
    label: 'Pesanan',
    description: 'Pesanan masuk & status pengerjaan',
    icon: ShoppingBag,
  },
  {
    href: '/admin/iot-qc',
    label: 'IoT QC',
    description: 'Uji Burn-In, ESP32 & sertifikat',
    icon: Activity,
  },
  {
    href: '/admin/partners',
    label: 'Mitra & Service',
    description: 'Pusat layanan & toko komponen',
    icon: MapPin,
  },
];

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/admin') {
    return pathname === '/admin';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getActiveSection(pathname: string): AdminNavItem {
  const matched = ADMIN_NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href));
  return (
    matched ?? {
      href: '/admin',
      label: 'Ruang Kerja Admin',
      description: 'Pusat kontrol operasional ViciTech OS',
      icon: LayoutDashboard,
    }
  );
}

interface AdminShellProps {
  readonly adminEmail: string | null;
  readonly adminDisplayName: string | null;
  readonly children: ReactNode;
}

export function AdminShell({
  adminEmail,
  adminDisplayName,
  children,
}: AdminShellProps): ReactElement {
  const pathname = usePathname() || '/admin';
  const activeSection = getActiveSection(pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobileMenuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => {
      menuButtonRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMobileMenu, mobileMenuOpen]);

  const operatorLabel = adminDisplayName || adminEmail || 'Administrator';

  const renderSidebarNavigation = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col justify-between gap-6 p-4">
      <div className="space-y-6">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl border border-default bg-canvas px-3 py-3 transition hover:border-accent-primary/40"
        >
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink font-serif text-lg font-bold text-white shadow-sm">
            V
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent-primary"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-primary">
              ViciTech OS
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-primary">
              Konsol Admin
            </span>
          </span>
        </Link>

        <nav aria-label="Menu navigasi admin" className="space-y-1.5">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                  active
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-secondary hover:bg-subtle hover:text-primary'
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                    active
                      ? 'text-accent-primary'
                      : 'text-secondary group-hover:text-accent-primary'
                  }`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2.5 border-t border-default pt-4">
        <div className="rounded-xl border border-default bg-canvas px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            Sesi Admin Aktif
          </p>
          <p className="mt-1 truncate text-xs font-medium text-primary">{operatorLabel}</p>
        </div>

        <Link
          href="/"
          onClick={onNavigate}
          className="inline-flex min-h-11 w-full items-center gap-2 rounded-lg border border-default bg-surface px-3.5 py-2 text-sm font-medium text-secondary transition hover:border-accent-primary/40 hover:bg-accent-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>Kembali ke Storefront</span>
        </Link>

        <AdminSignOutButton className="w-full justify-start" />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper text-primary">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-default md:bg-surface">
        {renderSidebarNavigation()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-default bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Buka menu navigasi admin"
                aria-expanded={mobileMenuOpen}
                aria-controls={mobileMenuId}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-canvas text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 md:hidden"
              >
                <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
                  ViciTech OS / <span className="text-accent-primary">{activeSection.label}</span>
                </p>
                <p className="truncate text-sm font-semibold text-primary">
                  {activeSection.description}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1440px] min-w-0 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {mobileMenuOpen ? (
        <div className={styles.mobileBackdrop} onClick={closeMobileMenu}>
          <aside
            id={mobileMenuId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi Admin ViciTech OS"
            className={styles.mobileDrawer}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-default px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                Menu Admin
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMobileMenu}
                aria-label="Tutup menu navigasi admin"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {renderSidebarNavigation(closeMobileMenu)}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
