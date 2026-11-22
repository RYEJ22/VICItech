import Link from 'next/link';
import type { ReactElement } from 'react';

import { HERO_CONTENT, HERO_SLIDES } from './hero-content';
import type { HeroContent, HeroSlides } from './hero-content';
import { HeroSlider } from './hero-slider';
import styles from './hero.module.css';

interface HeroProps {
  readonly content?: HeroContent;
  readonly slides?: HeroSlides;
}

/**
 * Server Component. Only the background slider is a Client Component, so the
 * headline, copy, and CTAs ship as plain server-rendered HTML.
 *
 * Stacking order inside the section: slides (1-2), overlay (3), copy (10),
 * pause control (20, rendered by HeroSlider).
 */
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
        className={`relative z-10 mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28 lg:px-8 ${styles.content}`}
        style={{ position: 'relative', zIndex: 10 }}
      >
        <div className="max-w-2xl">
          <h1
            id="hero-heading"
            className={`text-4xl font-semibold tracking-tight [text-wrap:balance] sm:text-5xl lg:text-6xl ${styles.headline}`}
          >
            {headline}
          </h1>
          <p className={`mt-5 max-w-xl text-base leading-relaxed sm:text-lg ${styles.description}`}>
            {subheadline}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-4">
            <Link
              href={primaryCta.href}
              className={`inline-flex h-11 items-center justify-center rounded-md px-6 text-base font-medium ${styles.ctaPrimary}`}
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className={`inline-flex h-11 items-center justify-center rounded-md px-5 text-base font-medium ${styles.ctaSecondary}`}
            >
              {secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
