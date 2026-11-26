import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Gauge,
  Lock,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
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

const HERO_SNAPSHOT_MODULES = [
  {
    icon: Sliders,
    label: 'Smart Preset Builder',
    meta: 'B2C · B2B · B2S · JIT 5%',
    href: '/builder',
  },
  {
    icon: Gauge,
    label: 'Bottleneck & PSU +35%',
    meta: 'Proyeksi FPS & Headroom',
    href: '/bottleneck',
  },
  {
    icon: Activity,
    label: 'Panel Hybrid IoT QC',
    meta: '15 Titik · Simulated / Demo',
    href: '/qc-panel',
  },
  {
    icon: Bot,
    label: 'Konsultan Rakitan AI',
    meta: 'Terhubung ke Katalog Market',
    href: '/toolkit/konsultan-ai',
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
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="max-w-2xl lg:col-span-7">
              <p
                className={`inline-flex items-center gap-2 rounded-full border border-[#E4E4E7] bg-white px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#18181B] shadow-sm ${styles.stagger1}`}
              >
                <span className="h-2 w-2 rounded-full bg-[#EA580C]" aria-hidden="true" />
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
                className={`mt-8 flex flex-wrap items-center gap-3 sm:mt-10 sm:gap-4 ${styles.stagger4}`}
              >
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

            {/* Flagship Desktop Obsidian Telemetry Snapshot Card */}
            <aside
              aria-label="Ringkasan cepat modul ViciTech OS"
              className={`hidden lg:col-span-5 lg:block ${styles.previewReveal}`}
            >
              <div className="vt-obsidian-panel rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#EA580C]">
                      VICITECH OS · v2.2
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-[#FAFAFA]">
                      Akses Cepat Precision Studio
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-400/25 bg-sky-500/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-sky-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                    QC Simulated / Demo
                  </span>
                </div>

                <ul className="mt-3.5 space-y-2">
                  {HERO_SNAPSHOT_MODULES.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="vt-motion-press group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 transition-colors hover:border-[#EA580C]/50 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/70"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-[#EA580C] transition-colors group-hover:border-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white">
                              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-bold text-[#FAFAFA]">
                                {item.label}
                              </span>
                              <span className="block truncate font-mono text-[11px] text-[#A1A1AA]">
                                {item.meta}
                              </span>
                            </span>
                          </span>
                          <ArrowRight
                            className="h-4 w-4 shrink-0 text-[#A1A1AA] transition-transform group-hover:translate-x-0.5 group-hover:text-[#EA580C] motion-reduce:transform-none"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[11px] text-[#A1A1AA]">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    NIST SP 800-88 Ready
                  </span>
                  <span>Gratis Tanpa Login</span>
                </div>
              </div>
            </aside>
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
