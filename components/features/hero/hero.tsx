import Link from 'next/link';
import { ArrowRight, Bot, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';

import { HERO_CONTENT, HERO_SLIDES } from './hero-content';
import type { HeroContent, HeroSlides } from './hero-content';
import { HeroSlider } from './hero-slider';
import styles from './hero.module.css';

interface HeroProps {
  readonly content?: HeroContent;
  readonly slides?: HeroSlides;
}

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    title: '15 Titik Hybrid IoT QC',
    subtitle: 'Mode Simulated / Demo',
    badge: 'Simulated',
    href: '/qc-panel',
  },
  {
    icon: Lock,
    title: 'Sanitasi Data NIST SP 800-88',
    subtitle: 'Standar hapus data aman',
    badge: null,
    href: '/cookies',
  },
  {
    icon: Bot,
    title: 'ViciTech AI Katalog Langsung',
    subtitle: 'Rekomendasi spek & harga',
    badge: null,
    href: '/toolkit/konsultan-ai',
  },
  {
    icon: Sparkles,
    title: 'Gratis Tanpa Login',
    subtitle: 'Coba semua toolkit seketika',
    badge: null,
    href: '/builder',
  },
] as const;

export function Hero({
  content = HERO_CONTENT,
  slides = HERO_SLIDES,
}: HeroProps): ReactElement {
  const firstSlide = slides[0];
  const headline = content.headline || firstSlide.headline;
  const subheadline = content.subheadline || content.description || firstSlide.subheadline;
  const primaryCta = content.primaryCta || firstSlide.primaryCta;
  const secondaryCta = content.secondaryCta || firstSlide.secondaryCta;

  return (
    <>
      <section
        aria-labelledby="hero-heading"
        className={`relative isolate flex items-center overflow-hidden ${styles.hero}`}
        style={{ position: 'relative', isolation: 'isolate', overflow: 'hidden' }}
      >
        <HeroSlider slides={slides} />
        <div
          className={styles.overlay}
          style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
          aria-hidden="true"
        />

        <div
          className={`relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6 md:pb-20 md:pt-32 lg:px-8 ${styles.content}`}
          style={{ position: 'relative', zIndex: 10 }}
        >
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E7] bg-white px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#18181B] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#EA580C]" aria-hidden="true" />
              <span>{content.eyebrow}</span>
            </p>

            <h1
              id="hero-heading"
              className={`mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight [text-wrap:balance] sm:text-5xl lg:text-6xl ${styles.headline}`}
            >
              {headline}
            </h1>
            <p className={`mt-5 max-w-[62ch] text-base leading-relaxed sm:text-lg ${styles.description}`}>
              {subheadline}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10 sm:gap-4">
              <Link
                href={primaryCta.href}
                className={`vt-motion-press active:scale-[0.97] motion-reduce:active:transform-none inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold sm:text-base ${styles.ctaPrimary}`}
              >
                <span>{primaryCta.label}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link
                href={secondaryCta.href}
                className={`vt-motion-press active:scale-[0.97] motion-reduce:active:transform-none inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold sm:text-base ${styles.ctaSecondary}`}
              >
                {secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sleek Compact Trust Strip */}
      <section
        aria-label="Keunggulan utama ViciTech"
        className="border-y border-[#E4E4E7] bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {TRUST_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <li key={pillar.title}>
                  <Link
                    href={pillar.href}
                    className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-[#E4E4E7] hover:bg-[#FAF9F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FFF7ED] text-[#EA580C] transition-colors group-hover:bg-[#EA580C] group-hover:text-white">
                      <Icon className="h-4 w-4" strokeWidth={1.85} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-[#18181B]">{pillar.title}</span>
                        {pillar.badge ? (
                          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                            {pillar.badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#52525B]">
                        {pillar.subtitle}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
