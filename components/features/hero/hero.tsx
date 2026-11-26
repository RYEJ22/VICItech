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
          className="pointer-events-none absolute inset-0 z-[3] bg-[#FAF9F6]/85 md:bg-transparent md:bg-gradient-to-r md:from-[#FAF9F6]/95 md:via-[#FAF9F6]/75 md:to-transparent"
          aria-hidden="true"
        />

        <div
          className={`relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 md:pb-20 md:pt-32 lg:px-8 ${styles.content}`}
          style={{ position: 'relative', zIndex: 10 }}
        >
          <div className="max-w-2xl">
            <p
              className={`inline-flex items-center gap-2 rounded-full border border-default bg-surface px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary shadow-card ${styles.stagger1}`}
            >
              <span className="h-2 w-2 rounded-full bg-accent-primary" aria-hidden="true" />
              <span>{content.eyebrow}</span>
            </p>

            <h1
              id="hero-heading"
              className={`mt-5 text-4xl font-extrabold leading-[1.06] tracking-tight [text-wrap:balance] sm:text-5xl lg:text-[3.5rem] ${styles.headline} ${styles.stagger2}`}
            >
              {headline}
            </h1>
            <p
              className={`mt-5 max-w-[60ch] text-base leading-relaxed sm:text-lg ${styles.description} ${styles.stagger3}`}
            >
              {subheadline}
            </p>
            <div
              className={`mt-8 flex flex-wrap items-center gap-3 sm:mt-9 sm:gap-4 ${styles.stagger4}`}
            >
              <Link
                href={primaryCta.href}
                className={`vt-motion-press active:scale-[0.98] motion-reduce:active:transform-none inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold sm:text-base ${styles.ctaPrimary}`}
              >
                <span>{primaryCta.label}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Link>
              <Link
                href={secondaryCta.href}
                className={`vt-motion-press active:scale-[0.98] motion-reduce:active:transform-none inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-sm font-semibold sm:text-base ${styles.ctaSecondary}`}
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
        className="border-y border-default bg-surface"
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {TRUST_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <li key={pillar.title}>
                  <Link
                    href={pillar.href}
                    className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all duration-200 ease-smooth hover:border-default hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary transition-colors group-hover:bg-accent-primary group-hover:text-white">
                      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-primary">{pillar.title}</span>
                        {pillar.badge ? (
                          <span className="vt-badge-simulated font-mono !px-1.5 !py-0.5 !text-[10px]">
                            {pillar.badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-secondary">
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
