'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { RevealOnScroll } from '@/components/ui/RevealOnScroll';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import type {
  DataBadgeVariant,
  NonEmptyReadonlyArray,
  ShowcasePillarRow,
  WorkflowStepCard,
} from './editorial-showcase-content';
import styles from './editorial-showcase.module.css';

interface EditorialShowcaseInteractiveProps {
  readonly steps: NonEmptyReadonlyArray<WorkflowStepCard>;
  readonly pillars: NonEmptyReadonlyArray<ShowcasePillarRow>;
  readonly onNavigate?: (moduleId: string, view?: string) => void;
}

function getBadgeClassName(variant: DataBadgeVariant): string {
  if (variant === 'live') return 'vt-badge-live';
  if (variant === 'simulated') return 'vt-badge-simulated';
  return 'vt-badge-sample';
}

function resolveCanonicalHref(targetModule: string, targetView?: string): string {
  switch (targetModule) {
    case 'builder':
      return '/builder';
    case 'bottleneck':
      return '/bottleneck';
    case 'versus':
      return '/versus';
    case 'qc':
      return '/qc-panel';
    case 'tradein':
      return '/trade-in';
    case 'partners':
      return '/partners';
    case 'community':
      return '/community';
    case 'library':
      return targetView === 'upgrade' ? '/market?view=upgrade' : '/market?view=catalog';
    case 'market':
      return '/market';
    default:
      return '/market';
  }
}

export function EditorialShowcaseSteps({
  steps,
  pillars,
  onNavigate,
}: EditorialShowcaseInteractiveProps): ReactElement {
  const { t } = useLanguage();
  const s = t.showcase;
  const localizedSteps = steps.map((step) => {
    const tr = s.steps[step.id];
    return tr
      ? {
          ...step,
          phaseLabel: tr.phaseLabel,
          title: tr.title,
          summary: tr.summary,
          deliverables: tr.deliverables,
          actionLabel: tr.actionLabel,
        }
      : step;
  });
  const localizedPillars = pillars.map((row) => {
    const tr = s.pillars[row.id];
    return tr
      ? {
          ...row,
          title: tr.title,
          description: tr.description,
          tags: tr.tags,
          badgeLabel: tr.badgeLabel,
          actionLabel: tr.actionLabel,
        }
      : row;
  });

  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [previousStep, setPreviousStep] = useState<WorkflowStepCard | null>(null);
  const [activePillarId, setActivePillarId] = useState<string>(pillars[0].id);

  const activeStep = localizedSteps[activeStepIndex] ?? localizedSteps[0];

  useEffect(() => {
    if (prefersReducedMotion) setPreviousStep(null);
  }, [prefersReducedMotion]);

  return (
    <div className="space-y-16">
      {/* Reference 00:14–00:21: Stacked Workflow Deck over Framed Hardware Photography */}
      <RevealOnScroll as="section" ariaLabelledBy="workflow-deck-heading" className="relative overflow-hidden rounded-xl border border-default bg-[#09090B]">
        <div className="relative min-h-[28rem] w-full p-5 sm:p-8 lg:p-10">
          <div key={`workflow-background-${activeStep.imageSrc}`} className="absolute inset-0 vt-crossfade">
            <Image
              src={activeStep.imageSrc}
              alt=""
              fill
              sizes="(min-width: 1024px) 1200px, 100vw"
              className="object-cover opacity-35"
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#09090B]/95 via-[#09090B]/85 to-[#09090B]/50"
          />

          <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Stacked Interactive Step Deck */}
            <div className="space-y-2.5 lg:col-span-6">
              <div className="mb-4">
                <span className="vt-badge-sample">{s.workflowBadge}</span>
                <h2
                  id="workflow-deck-heading"
                  className="tracking-tight mt-3 font-sans text-2xl font-bold text-[#FAFAFA] [text-wrap:balance] sm:text-3xl"
                >
                  {s.workflowHeadline}
                </h2>
              </div>

              <div className="space-y-2">
                {localizedSteps.map((step, index) => {
                  const isActive = index === activeStepIndex;
                  return (
                    <div
                      key={step.id}
                      className={`rounded-xl transition-transform ${
                        isActive
                          ? styles.stepDeckCardActive
                          : `${styles.stepDeckCard ?? ''} ${prefersReducedMotion ? '' : 'hover:translate-x-1'}`
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={isActive}
                        onClick={() => {
                          if (index !== activeStepIndex) setPreviousStep(activeStep);
                          setActiveStepIndex(index);
                        }}
                        className="vt-motion-press flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/70"
                      >
                        <span className="min-w-0">
                          <span
                            className={`block font-mono text-[11px] font-semibold uppercase tracking-wider ${
                              isActive ? 'text-accent-cta' : 'text-white'
                            }`}
                          >
                            {step.phaseLabel}
                          </span>
                          <span className="mt-0.5 block font-sans text-base font-semibold sm:text-lg">
                            {step.title}
                          </span>
                        </span>
                        <ChevronDown
                          className={`vt-chevron h-5 w-5 shrink-0 ${
                            isActive ? 'rotate-180 text-accent-cta' : 'text-white'
                          }`}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </button>

                      {isActive && (
                        <div className={`border-t border-default px-4 pb-4 pt-3 ${styles.stepPanelReveal ?? ''}`}>
                          <p className="max-w-[65ch] text-sm leading-relaxed text-secondary">
                            {step.summary}
                          </p>
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {step.deliverables.map((item) => (
                              <li
                                key={item}
                                className="inline-flex items-center gap-1.5 rounded-md bg-subtle px-2.5 py-1 text-xs font-medium text-primary"
                              >
                                <CheckCircle2
                                  className="h-3.5 w-3.5 text-status-live"
                                  strokeWidth={1.75}
                                  aria-hidden="true"
                                />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4">
                            {onNavigate ? (
                              <button
                                type="button"
                                onClick={() => onNavigate(step.targetModule, step.targetView)}
                                className="vt-motion-press group inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                              >
                                <span>{step.actionLabel}</span>
                                <ArrowRight className="vt-icon-nudge h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                              </button>
                            ) : (
                              <Link
                                href={resolveCanonicalHref(step.targetModule, step.targetView)}
                                className="vt-motion-press group inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                              >
                                <span>{step.actionLabel}</span>
                                <ArrowRight className="vt-icon-nudge h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Visual Card Callout on Desktop */}
            <div className="hidden lg:col-span-6 lg:block">
              <div className="ml-auto max-w-md rounded-xl border border-default bg-surface p-5 text-primary shadow-xl">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-subtle">
                  {previousStep && !prefersReducedMotion && (
                    <div className="vt-crossfade-out absolute inset-0" aria-hidden="true">
                      <Image
                        src={previousStep.imageSrc}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 420px, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div
                    key={`workflow-preview-${activeStep.imageSrc}`}
                    className={`absolute inset-0 ${previousStep && !prefersReducedMotion ? 'vt-crossfade-in' : ''}`}
                    onAnimationEnd={() => setPreviousStep(null)}
                  >
                    <Image
                      src={activeStep.imageSrc}
                      alt={activeStep.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 420px, 100vw"
                      className="object-cover"
                    />
                  </div>
                </div>
                <p className="mt-3 font-mono text-xs font-semibold text-accent-cta">
                  {activeStep.phaseLabel}
                </p>
                <p className="mt-1 font-sans text-lg font-semibold text-primary">
                  {activeStep.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-secondary">
                  {activeStep.imageAlt}
                </p>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>

      {/* Reference 00:22–00:27: Editorial Pillar Rows with Tags & Hover/Focus Image Preview */}
      <RevealOnScroll as="section" ariaLabelledBy="editorial-pillars-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <div>
            <span className="vt-badge-sample">{s.pillarsBadge}</span>
            <h2
              id="editorial-pillars-heading"
              className="mt-3 max-w-xl font-sans text-2xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-3xl"
            >
              {s.pillarsHeadline}
            </h2>
          </div>
          <Link
            href="/market"
            className="vt-motion-press inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
          >
            <span>{s.pillarsCta}</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>

        <ul className="divide-y divide-default border-y border-default">
          {localizedPillars.map((row) => {
            const isPreviewed = activePillarId === row.id;
            return (
              <li
                key={row.id}
                onMouseEnter={() => setActivePillarId(row.id)}
                onFocus={() => setActivePillarId(row.id)}
                className={`py-5 px-2 sm:px-4 ${styles.pillarRow ?? ''}`}
              >
                <div className="grid gap-4 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-4">
                    <span className={getBadgeClassName(row.badgeVariant)}>{row.badgeLabel}</span>
                    <h3 className="tracking-tight mt-2 font-sans text-xl font-bold text-primary">
                      {row.title}
                    </h3>
                    <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-secondary sm:text-sm">
                      {row.description}
                    </p>
                  </div>

                  {/* Preview Image (revealed cleanly when active/focused or shown neatly inline) */}
                  <div className="md:col-span-3">
                    <div
                      className={`relative aspect-video w-full max-w-[220px] overflow-hidden rounded-lg border border-default bg-subtle transition-opacity duration-150 ${
                        isPreviewed ? 'opacity-100' : 'opacity-80 md:opacity-65'
                      }`}
                    >
                      <Image
                        src={row.previewSrc}
                        alt={row.previewAlt}
                        fill
                        sizes="(min-width: 768px) 220px, 90vw"
                        className="object-cover"
                      />
                    </div>
                  </div>

                  {/* 3 Technical Pill Tags */}
                  <div className="flex flex-wrap gap-1.5 md:col-span-3">
                    {row.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-default bg-surface px-3 py-1 text-xs font-medium text-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Trigger (>= 44x44px) */}
                  <div className="flex md:col-span-2 md:justify-end">
                    {row.targetHref ? (
                      <Link
                        href={row.targetHref}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                      >
                        <span>{row.actionLabel}</span>
                        <ArrowRight className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    ) : row.targetModule && onNavigate ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(row.targetModule ?? 'home')}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                      >
                        <span>{row.actionLabel}</span>
                        <ArrowRight className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    ) : (
                      <Link
                        href={resolveCanonicalHref(row.targetModule ?? 'library')}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-surface px-3.5 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                      >
                        <span>{row.actionLabel}</span>
                        <ArrowRight className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </RevealOnScroll>
    </div>
  );
}
