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
import {
  SHOWCASE_MANIFESTO,
  SHOWCASE_PILLAR_ROWS,
  TECHNICAL_CALLOUTS,
  WORKFLOW_STEP_CARDS,
  type ShowcaseIconKey,
  type TechnicalCallout,
} from './editorial-showcase-content';
import { EditorialShowcaseSteps } from './editorial-showcase-steps';

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

function CalloutCard({
  item,
  onNavigate,
}: {
  readonly item: TechnicalCallout;
  readonly onNavigate?: (moduleId: string, view?: string) => void;
}): ReactElement {
  const content = (
    <div className="flex items-start gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FAF9F6] text-[#EA580C]">
        <CalloutIcon iconKey={item.iconKey} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-base font-semibold leading-snug text-[#18181B]">
          {item.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[#71717A]">{item.summary}</p>
      </div>
    </div>
  );

  const sharedClasses =
    'block min-h-11 w-full rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] p-5 text-left transition-colors hover:border-[#EA580C]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60';

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
      href={`/home?tab=${encodeURIComponent(item.targetModule)}`}
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
    <div aria-label="Ringkasan ekosistem ViciTech">
      {/* Band 1: Manifesto Editorial yang Tenang & Fokus Tunggal */}
      <section className="border-t border-[#E4E4E7] bg-[#FFFFFF] py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#EA580C]">
            {SHOWCASE_MANIFESTO.badgeLabel}
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight text-[#18181B] [text-wrap:balance] sm:text-4xl lg:text-5xl">
            {SHOWCASE_MANIFESTO.headline}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#71717A]">
            {SHOWCASE_MANIFESTO.subtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            {onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate(SHOWCASE_MANIFESTO.ctaModule)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C2410C] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
              >
                <span>{SHOWCASE_MANIFESTO.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            ) : (
              <Link
                href={`/home?tab=${SHOWCASE_MANIFESTO.ctaModule}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C2410C] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
              >
                <span>{SHOWCASE_MANIFESTO.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            )}
            <Link
              href={SHOWCASE_MANIFESTO.secondaryHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-6 py-3 text-sm font-medium text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
            >
              <span>{SHOWCASE_MANIFESTO.secondaryLabel}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Band 2: 4 Pilar Pengujian & Jaminan di Atas Kanvas Bersih */}
      <section className="border-t border-[#E4E4E7] bg-[#FAF9F6] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#EA580C]">
              Standar Jaminan Unit
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#18181B] [text-wrap:balance] sm:text-4xl">
              Empat pilar kualitas di setiap perangkat ViciTech.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-8">
            <div className="space-y-5 lg:col-span-4">
              {leftCallouts.map((item) => (
                <CalloutCard key={item.id} item={item} onNavigate={onNavigate} />
              ))}
            </div>

            <div className="lg:col-span-4">
              <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF]">
                <Image
                  src="/images/hero/pc-rig.jpg"
                  alt="Unit workstation ViciTech yang melalui 15 titik inspeksi QC"
                  fill
                  sizes="(min-width: 1024px) 360px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="space-y-5 lg:col-span-4">
              {rightCallouts.map((item) => (
                <CalloutCard key={item.id} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Band 3 & 4: Alur Kerja Interaktif & Direktori Ekosistem */}
      <EditorialShowcaseSteps
        steps={WORKFLOW_STEP_CARDS}
        pillars={SHOWCASE_PILLAR_ROWS}
        onNavigate={onNavigate}
      />

      {/* Band 5: Closing Editorial CTA */}
      <section className="border-t border-[#E4E4E7] bg-[#FFFFFF] py-20 md:py-28">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-end lg:px-8">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#EA580C]">
              Terbuka &amp; Terverifikasi
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#18181B] [text-wrap:balance] sm:text-4xl">
              Rakit, diagnosa, dan kelola perangkat keras bersama komunitas.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#71717A]">
              Terhubung dengan builder, teknisi mitra lokal, dan panduan perawatan dalam satu ekosistem sirkular.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/community"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C2410C] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
            >
              <span>Buka Komunitas</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link
              href="/partners"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-6 py-3 text-sm font-medium text-[#18181B] transition-colors hover:bg-[#F3F1ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]"
            >
              <span>Cari Mitra Servis</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
