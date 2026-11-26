'use client';

import { Activity, Cpu, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { CookieSettingsButton } from './cookie-settings-button';

const ECOSYSTEM_HREFS = [
  '/',
  '/market',
  '/builder',
  '/trade-in',
  '/partners',
  '/community',
  '/feedback',
] as const;

const linkCls =
  'vt-motion-press inline-flex min-h-9 items-center text-sm text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 rounded';

export function SiteFooter(): ReactElement {
  const { t } = useLanguage();
  const f = t.footer;

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
            <span className="font-sans text-lg tracking-tight">ViciTech</span>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-secondary">
            {f.description}
          </p>
          <span aria-hidden="true" className="vt-pixel-divider mt-4 max-w-[14rem]" />
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <span className="vt-badge-simulated">Simulated / Demo QC</span>
            <span className="vt-badge-sample">{f.badgeRef}</span>
          </div>
        </div>

        <nav aria-label={f.ecosystemHeading}>
          <p className="vt-eyebrow">{f.ecosystemHeading}</p>
          <ul className="mt-3 space-y-1.5">
            {ECOSYSTEM_HREFS.map((href) => (
              <li key={href}>
                <Link href={href} className={linkCls}>
                  {f.links[href] ?? href}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="vt-eyebrow flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            {f.verificationHeading}
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link
                href="/qc-panel"
                className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 rounded"
              >
                <Activity className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>{f.checkSerialCta}</span>
              </Link>
            </li>
            {f.standards.map((standard) => (
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
          <summary className="cursor-pointer py-1 text-xs font-semibold uppercase tracking-wide text-secondary">{f.ecosystemHeading}</summary>
          <nav aria-label={f.ecosystemHeading} className="flex flex-wrap gap-x-4 gap-y-1 pb-2">
            {ECOSYSTEM_HREFS.map((href) => <Link key={href} href={href} className="min-h-8 py-1 text-xs text-secondary">{f.links[href] ?? href}</Link>)}
          </nav>
        </details>
        <details className="border-t border-default pt-2">
          <summary className="cursor-pointer py-1 text-xs font-semibold uppercase tracking-wide text-secondary">{f.verificationHeading}</summary>
          <ul className="space-y-1 pb-2 text-xs text-secondary">
            <li><Link href="/qc-panel" className="inline-flex min-h-8 items-center gap-1.5 text-primary"><Activity className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />{f.checkSerialCta}</Link></li>
            {f.standards.map((standard) => <li key={standard} className="py-1">{standard}</li>)}
          </ul>
        </details>
      </div>
      <div className="border-t border-default bg-surface/60">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px] text-secondary sm:px-6 md:py-4 md:text-xs">
          <p>{f.copyright(new Date().getFullYear())}</p>
          <p className="hidden lg:block">{f.disclaimer}</p>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <Link
              href="/settings"
              className="vt-motion-press inline-flex min-h-11 items-center rounded px-2 text-xs font-medium text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            >
              {f.settings}
            </Link>
            <Link
              href="/feedback"
              className="vt-motion-press inline-flex min-h-11 items-center rounded px-2 text-xs font-medium text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            >
              {f.feedback}
            </Link>
            <Link
              href="/cookies"
              className="vt-motion-press inline-flex min-h-11 items-center rounded px-2 text-xs font-medium text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
            >
              {f.cookies}
            </Link>
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
