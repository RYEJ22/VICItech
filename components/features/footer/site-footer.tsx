import { Activity, Cpu, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

const ECOSYSTEM_LINKS: readonly { readonly href: string; readonly label: string }[] = [
  { href: '/', label: 'Beranda' },
  { href: '/market', label: 'Market & Hardware Library' },
  { href: '/builder', label: 'Smart Preset Builder' },
  { href: '/trade-in', label: 'Circular Trade-In' },
  { href: '/partners', label: 'Mitra & Service' },
  { href: '/community', label: 'Komunitas' },
];

const STANDARD_ITEMS: readonly string[] = [
  'Sanitasi Data NIST 800-88',
  'Protokol 15-Titik IoT QC',
  'Kebijakan JIT Dynamic Buffer 5%',
  'Sertifikasi Refurbished Grade A+',
];

const linkCls =
  'inline-flex min-h-9 items-center text-sm text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 rounded';

export function SiteFooter(): ReactElement {
  return (
    <footer className="border-t border-default bg-canvas">
      <div className="mx-auto hidden max-w-shell gap-10 px-4 py-12 sm:px-6 md:grid md:grid-cols-4">
        <div className="md:col-span-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-full pr-2 text-base font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-primary text-white shadow-sm">
              <Cpu className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="font-serif text-lg tracking-tight">ViciTech</span>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-secondary">
            Ekosistem Circular IT untuk riset spesifikasi perangkat keras, rakitan B2S/B2B/B2C terkurasi,
            tukar tambah aset, dan verifikasi kualitas berbasis telemetri ESP32.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="vt-badge-live">Live ESP32</span>
            <span className="vt-badge-sample">Spesifikasi Referensi</span>
          </div>
        </div>

        <nav aria-label="Navigasi ekosistem ViciTech">
          <p className="vt-eyebrow">Ekosistem</p>
          <ul className="mt-3 space-y-1.5">
            {ECOSYSTEM_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkCls}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="vt-eyebrow flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            Verifikasi &amp; Standar
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link
                href="/qc-panel"
                className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 rounded"
              >
                <Activity className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Cek Nomor Seri IoT QC</span>
              </Link>
            </li>
            {STANDARD_ITEMS.map((standard) => (
              <li key={standard} className="text-sm leading-relaxed text-secondary">
                {standard}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto space-y-2 px-4 py-4 md:hidden">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-primary text-white"><Cpu className="h-3.5 w-3.5" aria-hidden="true" /></span>
          <span>ViciTech</span>
        </Link>
        <details className="border-t border-default pt-2">
          <summary className="cursor-pointer py-1 text-xs font-semibold uppercase tracking-wide text-secondary">Ekosistem</summary>
          <nav aria-label="Navigasi ekosistem ViciTech versi mobile" className="flex flex-wrap gap-x-4 gap-y-1 pb-2">
            {ECOSYSTEM_LINKS.map((item) => <Link key={item.href} href={item.href} className="min-h-8 py-1 text-xs text-secondary">{item.label}</Link>)}
          </nav>
        </details>
        <details className="border-t border-default pt-2">
          <summary className="cursor-pointer py-1 text-xs font-semibold uppercase tracking-wide text-secondary">Verifikasi &amp; Standar</summary>
          <ul className="space-y-1 pb-2 text-xs text-secondary">
            <li><Link href="/qc-panel" className="inline-flex min-h-8 items-center gap-1.5 text-primary"><Activity className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />Cek Nomor Seri IoT QC</Link></li>
            {STANDARD_ITEMS.map((standard) => <li key={standard} className="py-1">{standard}</li>)}
          </ul>
        </details>
      </div>
      <div className="border-t border-default bg-surface/60">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-1.5 px-4 py-3 text-[11px] text-secondary sm:px-6 md:py-4 md:text-xs">
          <p>© {new Date().getFullYear()} ViciTech. Seluruh hak cipta dilindungi.</p>
          <p className="hidden md:block">Harga katalog sebagai referensi; data telemetri sensor &amp; profil simulasi dipisahkan eksplisit.</p>
        </div>
      </div>
    </footer>
  );
}
