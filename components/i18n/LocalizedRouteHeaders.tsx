'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';
import type { ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ShareMenu } from '@/components/features/share/share-menu';

export function SettingsPageHeader(): ReactElement {
  const { t } = useLanguage();
  return (
    <header className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-primary">
        {t.settings.pageEyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary [text-wrap:balance] sm:text-4xl">
        {t.settings.pageTitle}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-secondary sm:text-base">
        {t.settings.pageDesc}
      </p>
    </header>
  );
}

export function PartnersPageHeader({
  verifiedCount,
}: {
  readonly verifiedCount: number;
}): ReactElement {
  const { t } = useLanguage();
  const p = t.routes.partners;

  return (
    <section className="rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {verifiedCount > 0 ? (
          <span className="vt-badge-live">{p.verifiedBadge(verifiedCount)}</span>
        ) : (
          <span className="vt-badge-live">{p.fallbackBadge}</span>
        )}
        <Link
          href="/qc-panel"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-3.5 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        >
          <ShieldCheck className="h-4 w-4 text-status-live" strokeWidth={1.75} aria-hidden="true" />
          <span>{p.qcBtn}</span>
        </Link>
      </div>

      <h1 className="mt-5 font-sans text-3xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-4xl lg:text-5xl">
        {p.title}
      </h1>
      <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-secondary">{p.desc}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/messages"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        >
          <MessageSquare className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span>{p.dmCta}</span>
        </Link>
        <Link
          href="/trade-in"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        >
          <MapPin className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>{p.tradeInCta}</span>
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <ShareMenu
          title={p.title}
          text={p.desc}
          url="/partners"
          label={p.shareLabel}
        />
      </div>
    </section>
  );
}

export function KonsultanAiPageHeader(): ReactElement {
  const { t } = useLanguage();
  const c = t.routes.aiConsultant;
  return (
    <header className="min-w-0 max-w-3xl shrink-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-primary sm:text-xs">
        {c.eyebrow}
      </p>
      <h1 className="mt-1 text-xl font-extrabold tracking-tight text-primary [text-wrap:balance] sm:mt-2 sm:text-3xl lg:text-4xl">
        {c.title}
      </h1>
      <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-secondary sm:mt-2 sm:block lg:text-base">
        {c.desc}
      </p>
    </header>
  );
}

export function KonsultanAiDisclaimer(): ReactElement {
  const { t } = useLanguage();
  return (
    <p className="mt-2 hidden px-1 text-[11px] leading-4 text-secondary sm:block sm:text-xs sm:leading-5">
      {t.routes.aiConsultant.disclaimer}
    </p>
  );
}

export function FeedbackPageHeader(): ReactElement {
  const { t } = useLanguage();
  const f = t.routes.feedback;
  return (
    <header className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-primary">
        {f.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary [text-wrap:balance] sm:text-4xl">
        {f.title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-secondary sm:text-base">{f.desc}</p>
    </header>
  );
}

export function CookiesPageHeader(): ReactElement {
  const { t } = useLanguage();
  const c = t.routes.cookies;
  return (
    <header className="max-w-3xl">
      <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-accent-primary">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        {c.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary [text-wrap:balance] sm:text-4xl">
        {c.title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-secondary sm:text-base">{c.desc}</p>
    </header>
  );
}
