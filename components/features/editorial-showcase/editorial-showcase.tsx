import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Cpu,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { RevealOnScroll } from '@/components/ui/RevealOnScroll';
import {
  SHOWCASE_MANIFESTO,
  SHOWCASE_PILLAR_ROWS,
  TECHNICAL_CALLOUTS,
  WORKFLOW_STEP_CARDS,
  type DataBadgeVariant,
  type ShowcaseIconKey,
  type TechnicalCallout,
} from './editorial-showcase-content';
import { EditorialShowcaseSteps } from './editorial-showcase-steps';
import { TriPillarBento } from './tri-pillar-bento';
import styles from './editorial-showcase.module.css';

interface EditorialShowcaseProps {
  readonly onNavigate?: (moduleId: string, view?: string) => void;
}

function CalloutIcon({
  iconKey,
  className,
}: {
  readonly iconKey: ShowcaseIconKey;
  readonly className: string;
}): ReactElement {
  switch (iconKey) {
    case 'shield':
      return <ShieldCheck className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'lock':
      return <Lock className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'sliders':
      return <Sliders className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'refresh':
      return <RefreshCw className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'layers':
      return <Layers className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'cpu':
      return <Cpu className={className} strokeWidth={1.75} aria-hidden="true" />;
  }
}

function badgeClass(variant: DataBadgeVariant): string {
  if (variant === 'live') return 'vt-badge-live';
  if (variant === 'simulated') return 'vt-badge-simulated';
  return 'vt-badge-sample';
}

function resolveShowcaseHref(targetModule: string, targetView?: string): string {
  switch (targetModule) {
    case 'builder':
      return '/builder';
    case 'qc':
      return '/qc-panel';
    case 'tradein':
      return '/trade-in';
    case 'library':
      return targetView === 'upgrade' ? '/market?view=upgrade' : '/market?view=catalog';
    case 'market':
      return '/market';
    case 'community':
      return '/community';
    default:
      return '/';
  }
}

function CalloutCard({
  item,
  onNavigate,
}: {
  readonly item: TechnicalCallout;
  readonly onNavigate?: (moduleId: string, view?: string) => void;
}): ReactElement {
  const content = (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-subtle text-accent-primary">
        <CalloutIcon iconKey={item.iconKey} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <span className={badgeClass(item.badgeVariant)}>{item.badgeLabel}</span>
        <h3 className="tracking-tight mt-2 font-sans text-base font-bold text-primary [text-wrap:balance]">
          {item.title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-secondary">{item.summary}</p>
      </div>
    </div>
  );

  const sharedClasses =
    'block min-h-11 w-full rounded-xl border border-default bg-surface p-4 text-left shadow-sm transition-colors hover:border-accent-primary/50 hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60';

  if (onNavigate) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(item.targetModule, item.targetView)}
        className={sharedClasses}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={resolveShowcaseHref(item.targetModule, item.targetView)}
      className={sharedClasses}
    >
      {content}
    </Link>
  );
}

export function EditorialShowcase({ onNavigate }: EditorialShowcaseProps): ReactElement {
  const leftCallouts = TECHNICAL_CALLOUTS.filter(
    (item) => item.position === 'top-left' || item.position === 'bottom-left',
  );
  const rightCallouts = TECHNICAL_CALLOUTS.filter(
    (item) => item.position === 'top-right' || item.position === 'bottom-right',
  );

  return (
    <section
      aria-label="Ringkasan arsitektur Circular IT ViciTech"
      className="bg-surface pb-24 pt-12 sm:pb-24 sm:pt-16"
    >
      <div className="mx-auto max-w-shell space-y-14 px-4 sm:space-y-16 sm:px-6">
        {/* Tri-Pillar Moat Asymmetric Bento Grid */}
        <RevealOnScroll>
          <TriPillarBento />
        </RevealOnScroll>

        {/* Reference 00:07–00:08: Vibrant Tech Orange Editorial Manifesto Band */}
        <RevealOnScroll>
        <div className={`rounded-xl px-6 py-10 text-center sm:px-10 sm:py-14 ${styles.manifestoBand ?? ''}`}>
          <span className="inline-flex items-center rounded-md bg-surface px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            {SHOWCASE_MANIFESTO.badgeLabel}
          </span>
          <h2 className="mx-auto mt-5 max-w-3xl font-sans text-3xl font-bold leading-tight tracking-tight text-primary [text-wrap:balance] sm:text-4xl">
            {SHOWCASE_MANIFESTO.headline}
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate(SHOWCASE_MANIFESTO.ctaModule)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-surface transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>{SHOWCASE_MANIFESTO.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            ) : (
              <Link
                href={resolveShowcaseHref(SHOWCASE_MANIFESTO.ctaModule)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-surface transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>{SHOWCASE_MANIFESTO.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            )}
            <Link
              href={SHOWCASE_MANIFESTO.secondaryHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-surface px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>{SHOWCASE_MANIFESTO.secondaryLabel}</span>
            </Link>
          </div>
        </div>
        </RevealOnScroll>

        {/* Reference 00:09–00:13: 4-Corner Hardware Diagram with Technical Callouts */}
        <RevealOnScroll>
        <div className={`rounded-xl p-5 sm:p-8 ${styles.diagramFrame ?? ''}`}>
          <div className="mb-6 max-w-2xl">
            <span className="vt-badge-live">Verifikasi Teknis Multi-Perangkat</span>
            <h2 className="tracking-tight mt-3 font-sans text-2xl font-bold text-primary [text-wrap:balance] sm:text-3xl">
              Empat pilar pengujian dan jaminan di setiap unit ViciTech.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-4">
              {leftCallouts.map((item) => (
                <div key={item.id} className="relative flex items-center gap-3">
                  <CalloutCard item={item} onNavigate={onNavigate} />
                  <span
                    aria-hidden="true"
                    className={`hidden w-6 shrink-0 lg:block ${styles.connectorLineLeft ?? ''}`}
                  />
                </div>
              ))}
            </div>

            <div className="lg:col-span-4">
              <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
                <Image
                  src="/images/hero/pc-rig.jpg"
                  alt="Unit workstation ViciTech yang melalui 15 titik inspeksi QC"
                  fill
                  sizes="(min-width: 1024px) 360px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="space-y-4 lg:col-span-4">
              {rightCallouts.map((item) => (
                <div key={item.id} className="relative flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`hidden w-6 shrink-0 lg:block ${styles.connectorLineRight ?? ''}`}
                  />
                  <CalloutCard item={item} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          </div>
        </div>
        </RevealOnScroll>

        {/* Interactive Stacked Step Deck (00:14–00:21) + Editorial Pillar List (00:22–00:27) */}
        <RevealOnScroll>
          <EditorialShowcaseSteps
            steps={WORKFLOW_STEP_CARDS}
            pillars={SHOWCASE_PILLAR_ROWS}
            onNavigate={onNavigate}
          />
        </RevealOnScroll>

        {/* Reference 00:28–00:30: Closing Watermark Banner CTA */}
        <RevealOnScroll>
        <div className={`rounded-xl p-6 sm:p-10 ${styles.watermarkBanner ?? ''}`}>
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 430 104"
            className={`block h-12 w-auto max-w-full sm:h-[4.5rem] lg:h-24 ${styles.watermarkText ?? ''}`}
          >
            <text
              x="0"
              y="82"
              fill="currentColor"
              fontSize="94"
              fontWeight="700"
              letterSpacing="-0.025em"
              style={{ fontFamily: 'var(--font-sans, "Plus Jakarta Sans", Arial, sans-serif)' }}
            >
              ViciTech
            </text>
          </svg>
          <div className="relative -mt-3 flex flex-wrap items-center justify-between gap-6 sm:-mt-5">
            <div className="max-w-xl">
              <h2 className="tracking-tight font-sans text-2xl font-bold text-primary [text-wrap:balance] sm:text-3xl">
                Rakit, diagnosa, dan kelola siklus hidup perangkat keras Anda.
              </h2>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-secondary">
                Dari rakitan PC kustom dan laptop enterprise hingga smartphone dan aksesori, semua terhubung dalam satu ekosistem transparan.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/community"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <span>Buka Community Hub</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
              <Link
                href="/partners"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <span>Cari Mitra Servis</span>
              </Link>
            </div>
          </div>
        </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
