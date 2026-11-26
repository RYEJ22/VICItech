'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Gauge,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Store,
  Users,
  Wrench,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useUserSettings } from '@/hooks/useUserSettings';
import { formatTemperature } from '@/lib/user-settings';

export function TriPillarBento(): ReactElement {
  const { t, isEnglish } = useLanguage();
  const userSettings = useUserSettings();
  const b = t.bento;
  const burnInTemp = formatTemperature(64.0, userSettings.temperatureUnit, 1);
  const burnInDisplay = `${burnInTemp} · ${isEnglish ? 'Stable' : 'Stabil'}`;

  return (
    <section
      aria-labelledby="tri-pillar-heading"
      className="vt-grid-bg space-y-6 rounded-xl border border-default bg-canvas/80 p-4 sm:p-7"
    >
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-primary">
          <span className="vt-pixel-led bg-accent-primary" aria-hidden="true" />
          <span>{b.eyebrow}</span>
        </p>
        <h2
          id="tri-pillar-heading"
          className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-primary [text-wrap:balance] sm:text-4xl"
        >
          {b.headline}
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-secondary sm:text-base">
          {b.subtitle}
        </p>
        <span aria-hidden="true" className="vt-pixel-divider mt-5 max-w-xs" />
      </div>

      {/* Asymmetric 12-column Bento Grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Pillar 1 (Wide — 7 cols): Toolkit Simulasi */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent-hover">
                <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
                {b.p1Badge}
              </span>
              <span className="rounded-full border border-default bg-canvas px-2.5 py-0.5 text-[11px] font-medium text-secondary">
                {b.p1Meta}
              </span>
            </div>

            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl">
              {b.p1Title}
            </h3>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-secondary">
              {b.p1Desc}
            </p>

            {/* Mini Visual Preview */}
            <div className="mt-5 rounded-xl border border-default bg-canvas p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-primary">{b.p1PreviewTitle}</span>
                <span className="vt-badge-live font-mono tabular-nums">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {b.p1PreviewStatus}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:text-center">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-default bg-surface px-3 py-2 sm:block sm:px-2.5">
                  <p className="text-[11px] font-medium text-secondary sm:text-[10px]">{b.p1PsuLabel}</p>
                  <p className="font-mono text-xs font-bold tabular-nums text-primary sm:mt-0.5">340 W / 550 W</p>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-default bg-surface px-3 py-2 sm:block sm:px-2.5">
                  <p className="text-[11px] font-medium text-secondary sm:text-[10px]">{b.p1FpsLabel}</p>
                  <p className="font-mono text-xs font-bold tabular-nums text-accent-primary sm:mt-0.5">240+ FPS</p>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-default bg-surface px-3 py-2 sm:block sm:px-2.5">
                  <p className="text-[11px] font-medium text-secondary sm:text-[10px]">{b.p1JitLabel}</p>
                  <p className="font-mono text-xs font-bold tabular-nums text-primary sm:mt-0.5">{b.p1JitValue}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-default pt-4">
            <Link
              href="/builder"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{b.p1CtaBuilder}</span>
            </Link>
            <Link
              href="/bottleneck"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <Gauge className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>{b.p1CtaBottleneck}</span>
            </Link>
            <Link
              href="/market?view=upgrade"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <Wrench className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>{b.p1CtaUpgrade}</span>
            </Link>
            <Link
              href="/toolkit/konsultan-ai"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <Bot className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>{b.p1CtaAi}</span>
            </Link>
          </div>
        </article>

        {/* Pillar 2 (Tall — 5 cols): Hybrid IoT QC with Contained Obsidian Telemetry Preview */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent-hover">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                {b.p2Badge}
              </span>
              <span className="vt-badge-simulated font-mono">
                Simulated / Demo
              </span>
            </div>

            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl">
              {b.p2Title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              {b.p2Desc}
            </p>

            {/* Contained Telemetry Preview Card (Crisp White Box + Shadow in Light, Obsidian Ruby Pixel in Dark) */}
            <div className="vt-qc-preview-card mt-5 space-y-2.5 rounded-xl border-[1.5px] border-strong bg-surface p-4 shadow-[0_6px_20px_-6px_rgba(24,24,27,0.12),0_2px_0_0_rgba(24,24,27,0.06)]">
              <div className="flex items-center justify-between gap-2 border-b border-default pb-2.5">
                <span className="inline-flex items-center gap-2 font-mono text-xs font-bold tabular-nums text-primary">
                  <span className="vt-pixel-led vt-pixel-led-pulse bg-sky-600 dark:bg-sky-400" aria-hidden="true" />
                  <span>VICI-PC-2026-0104</span>
                </span>
                <span className="vt-badge-simulated !px-2 !py-0.5 !text-[10px]">
                  {b.p2DemoTag}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-secondary">
                  <span>{b.p2BurnInLabel}</span>
                  <span className="font-mono font-semibold tabular-nums text-primary">{burnInDisplay}</span>
                </div>
                <div className="vt-pixel-bar h-2.5 overflow-hidden rounded-[3px] border border-default bg-subtle">
                  <div className="h-full w-[88%] rounded-[2px] bg-accent-primary" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {b.p2SanitationLabel}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{b.p2SanitationValue}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-default pt-4">
            <Link
              href="/qc-panel"
              className="vt-motion-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <span>{b.p2Cta}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Pillar 3 (Bottom Left — 7 cols): Community Hub */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent-hover">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {b.p3Badge}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary">
                <MessageSquare className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
                {b.p3Meta}
              </span>
            </div>

            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-primary">
              {b.p3Title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              {b.p3Desc}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {['#ShowcaseRakitan', '#TanyaUpgrade', '#DiskusiBottleneck', '#DMKomunitas'].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-default bg-canvas px-3 py-1 text-xs font-medium text-secondary"
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-default pt-4">
            <Link
              href="/community"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <span>{b.p3CtaCommunity}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/messages"
              className="vt-motion-press inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-canvas px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <MessageSquare className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>{b.p3CtaMessages}</span>
            </Link>
          </div>
        </article>

        {/* Bottom Right (5 cols): Circular Market & Trade-In */}
        <article className="vt-card-lift group flex flex-col justify-between rounded-xl border border-default bg-surface p-5 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-strong hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:transform-none sm:p-7 lg:col-span-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-default bg-canvas px-3 py-1 text-xs font-semibold text-primary">
              <Store className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              {b.p4Badge}
            </span>
            <h3 className="mt-4 font-sans text-xl font-bold tracking-tight text-primary">
              {b.p4Title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              {b.p4Desc}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-default pt-4">
            <Link
              href="/market"
              className="vt-motion-press inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-4 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <span>{b.p4CtaMarket}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/trade-in"
              className="vt-motion-press inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-default bg-canvas px-4 text-xs font-semibold text-primary transition-all duration-200 ease-smooth hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              <RefreshCw className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span>{b.p4CtaTradeIn}</span>
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
