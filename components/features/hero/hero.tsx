'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';

import { HERO_CONTENT, HERO_SLIDES } from './hero-content';
import type { HeroContent, HeroSlides } from './hero-content';
import { HeroSlider } from './hero-slider';
import styles from './hero.module.css';

interface HeroProps {
  readonly content?: HeroContent;
  readonly slides?: HeroSlides;
}

const TRUST_PILLAR_META = [
  { icon: ShieldCheck, href: '/qc-panel' },
  { icon: Lock, href: '/cookies' },
  { icon: Bot, href: '/toolkit/konsultan-ai' },
  { icon: Sparkles, href: '/builder' },
] as const;

export function Hero({
  content = HERO_CONTENT,
  slides = HERO_SLIDES,
}: HeroProps): ReactElement {
  const { t, isEnglish } = useLanguage();
  const firstSlide = slides[0];
  const eyebrow = isEnglish ? t.hero.eyebrow : content.eyebrow;
  const headline = isEnglish ? t.hero.headline : content.headline || firstSlide.headline;
  const subheadline = isEnglish
    ? t.hero.subheadline
    : content.subheadline || content.description || firstSlide.subheadline;
  const primaryCta = {
    href: (content.primaryCta || firstSlide.primaryCta).href,
    label: isEnglish ? t.hero.primaryCta : (content.primaryCta || firstSlide.primaryCta).label,
  };
  const secondaryCta = {
    href: (content.secondaryCta || firstSlide.secondaryCta).href,
    label: isEnglish ? t.hero.secondaryCta : (content.secondaryCta || firstSlide.secondaryCta).label,
  };

  return (
    <>
      <section
        aria-labelledby="hero-heading"
        className={`relative isolate flex items-center overflow-hidden ${styles.hero}`}
        style={{ position: 'relative', isolation: 'isolate', overflow: 'hidden' }}
      >
        <HeroSlider slides={slides} />
        <div
          className={`pointer-events-none absolute inset-0 z-[3] ${styles.scrim ?? ''}`}
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
              <span className="vt-pixel-led vt-pixel-led-pulse bg-accent-primary" aria-hidden="true" />
              <span>{eyebrow}</span>
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
        aria-label={t.hero.trustAria}
        className="border-y border-default bg-surface"
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {TRUST_PILLAR_META.map((meta, index) => {
              const Icon = meta.icon;
              const copy = t.hero.pillars[index];
              return (
                <li key={meta.href}>
                  <Link
                    href={meta.href}
                    className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all duration-200 ease-smooth hover:border-default hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-primary transition-colors group-hover:bg-accent-primary group-hover:text-white">
                      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-primary">{copy.title}</span>
                        {copy.badge ? (
                          <span className="vt-badge-simulated font-mono !px-1.5 !py-0.5 !text-[10px]">
                            {copy.badge}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-secondary">
                        {copy.subtitle}
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
