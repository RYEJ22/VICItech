'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import type {
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

export function EditorialShowcaseSteps({
  steps,
  pillars,
  onNavigate,
}: EditorialShowcaseInteractiveProps): ReactElement {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const activeStep = steps[activeStepIndex] ?? steps[0];

  return (
    <>
      {/* Band 3: Progressive Disclosure Alur Kerja Terpadu */}
      <section
        aria-labelledby="workflow-deck-heading"
        className="border-t border-[#E4E4E7] bg-[#FFFFFF] py-20 md:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="space-y-6 lg:col-span-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#EA580C]">
                  Alur Kerja Terpadu
                </p>
                <h2
                  id="workflow-deck-heading"
                  className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#18181B] [text-wrap:balance] sm:text-4xl"
                >
                  Empat langkah rapi dari riset hingga verifikasi.
                </h2>
              </div>

              <div className="space-y-3">
                {steps.map((step, index) => {
                  const isActive = index === activeStepIndex;
                  return (
                    <div
                      key={step.id}
                      className={`rounded-2xl transition-transform ${
                        isActive
                          ? styles.stepDeckCardActive
                          : `${styles.stepDeckCard ?? ''} ${prefersReducedMotion ? '' : 'hover:translate-x-1'}`
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={isActive}
                        onClick={() => setActiveStepIndex(index)}
                        className="flex min-h-11 w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/70"
                      >
                        <span className="min-w-0">
                          <span
                            className={`block font-mono text-[11px] font-semibold uppercase tracking-wider ${
                              isActive ? 'text-[#EA580C]' : 'text-[#71717A]'
                            }`}
                          >
                            {step.phaseLabel}
                          </span>
                          <span className="mt-1 block font-serif text-base font-semibold text-[#18181B] sm:text-lg">
                            {step.title}
                          </span>
                        </span>
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 transition-transform ${
                            isActive ? 'rotate-180 text-[#EA580C]' : 'text-[#71717A]'
                          }`}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </button>

                      {isActive && (
                        <div className={`border-t border-[#E4E4E7] px-5 pb-5 pt-4 ${styles.stepPanelReveal ?? ''}`}>
                          <p className="max-w-xl text-sm leading-relaxed text-[#71717A]">
                            {step.summary}
                          </p>
                          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                            {step.deliverables.map((item) => (
                              <li
                                key={item}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#18181B]"
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
                          <div className="mt-5">
                            {onNavigate ? (
                              <button
                                type="button"
                                onClick={() => onNavigate(step.targetModule, step.targetView)}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C2410C] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
                              >
                                <span>{step.actionLabel}</span>
                                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                              </button>
                            ) : (
                              <Link
                                href={`/home?tab=${encodeURIComponent(step.targetModule)}`}
                                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#C2410C] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
                              >
                                <span>{step.actionLabel}</span>
                                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
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

            {/* Foto visual bersih tanpa kartu duplikat yang berebut perhatian */}
            <div className="hidden lg:col-span-6 lg:block">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#E4E4E7] bg-[#FAF9F6]">
                <Image
                  src={activeStep.imageSrc}
                  alt={activeStep.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover transition-opacity duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Band 4: Direktori Pilar ViciTech Berbasis Hairline & Whitespace */}
      <section
        aria-labelledby="editorial-pillars-heading"
        className="border-t border-[#E4E4E7] bg-[#FAF9F6] py-20 md:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6 pb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#EA580C]">
                Jelajahi Ekosistem
              </p>
              <h2
                id="editorial-pillars-heading"
                className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#18181B] [text-wrap:balance] sm:text-4xl"
              >
                Setiap kebutuhan perangkat dalam satu jalur transparan.
              </h2>
            </div>
            <Link
              href="/market"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4E4E7] bg-[#FFFFFF] px-5 py-2.5 text-sm font-medium text-[#18181B] transition-colors hover:border-[#EA580C]/50 hover:text-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
            >
              <span>Lihat Etalase Market</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>

          <ul className="divide-y divide-[#E4E4E7] border-y border-[#E4E4E7]">
            {pillars.map((row) => (
              <li key={row.id} className={`py-7 sm:py-8 ${styles.pillarRow ?? ''}`}>
                <div className="grid gap-6 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-6">
                    <h3 className="font-serif text-xl font-semibold text-[#18181B] sm:text-2xl">
                      {row.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#71717A] sm:text-base">
                      {row.description}
                    </p>
                  </div>

                  <div className="hidden md:col-span-3 md:block">
                    <div className="relative aspect-[16/10] w-full max-w-[200px] overflow-hidden rounded-xl border border-[#E4E4E7] bg-[#FFFFFF]">
                      <Image
                        src={row.previewSrc}
                        alt={row.previewAlt}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex md:col-span-3 md:justify-end">
                    {row.targetHref ? (
                      <Link
                        href={row.targetHref}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#18181B] transition-colors hover:text-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
                      >
                        <span>{row.actionLabel}</span>
                        <ArrowRight className="h-4 w-4 text-[#EA580C]" strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    ) : row.targetModule && onNavigate ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(row.targetModule ?? 'home')}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#18181B] transition-colors hover:text-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
                      >
                        <span>{row.actionLabel}</span>
                        <ArrowRight className="h-4 w-4 text-[#EA580C]" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    ) : (
                      <Link
                        href={`/home?tab=${encodeURIComponent(row.targetModule ?? 'library')}`}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#18181B] transition-colors hover:text-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C]/60"
                      >
                        <span>{row.actionLabel}</span>
                        <ArrowRight className="h-4 w-4 text-[#EA580C]" strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
