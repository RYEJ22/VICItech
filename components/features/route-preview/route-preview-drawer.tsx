'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import type {
  PreviewFilterOption,
  RoutePreviewItem,
  RoutePreviewKind,
} from './route-preview-content';
import { ShareMenu } from '@/components/features/share/share-menu';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import styles from './route-preview.module.css';

interface RoutePreviewExplorerProps {
  readonly kind: RoutePreviewKind;
  readonly filters: readonly [PreviewFilterOption, ...PreviewFilterOption[]];
  readonly items: readonly [RoutePreviewItem, ...RoutePreviewItem[]];
  readonly badgeText: string;
  readonly drawerTitle: string;
  readonly drawerDescription: string;
  readonly searchPlaceholder: string;
}

export function RoutePreviewExplorer({
  kind,
  filters,
  items,
  badgeText,
  drawerTitle,
  drawerDescription,
  searchPlaceholder,
}: RoutePreviewExplorerProps): ReactElement {
  const { isEnglish } = useLanguage();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [overlayOpen, setOverlayOpen] = useState<boolean>(false);
  const [isNotifying, setIsNotifying] = useState<boolean>(false);
  const [notifyEmail, setNotifyEmail] = useState<string>('');
  const [notifyFeedback, setNotifyFeedback] = useState<string>('');

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const overlayTitleId = useId();
  const searchInputId = useId();
  const notifyEmailId = useId();

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isNotifying) {
        closeOverlay();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOverlay, isNotifying, overlayOpen]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = selectedFilter === 'all' || item.categoryId === selectedFilter;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      return `${item.title} ${item.subtitle} ${item.categoryLabel} ${item.specPrimary} ${item.specSecondary}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [debouncedQuery, items, selectedFilter]);

  const featuredItem = useMemo(
    () => filteredItems.find((item) => item.isFeatured) ?? filteredItems[0] ?? null,
    [filteredItems],
  );
  const secondaryItems = useMemo(
    () => (featuredItem ? filteredItems.filter((item) => item.id !== featuredItem.id) : []),
    [featuredItem, filteredItems],
  );

  const handleEarlyAccessSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!notifyEmail.trim() || isNotifying) return;
    setIsNotifying(true);
    setNotifyFeedback('');

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setIsNotifying(false);
      setNotifyFeedback(
        kind === 'market'
          ? isEnglish
            ? 'Full catalog launch notification request has been noted locally.'
            : 'Permintaan notifikasi peluncuran katalog lengkap telah dicatat secara lokal.'
          : isEnglish
            ? 'Partner map directory launch notification request has been noted locally.'
            : 'Permintaan notifikasi pembukaan direktori peta mitra telah dicatat secara lokal.',
      );
      setNotifyEmail('');
    }, 240);
  };

  return (
    <div className="space-y-6">
      {/* Search + Contextual Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-default bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            {searchPlaceholder}
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            id={searchInputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-canvas py-2.5 pl-10 pr-4 text-sm text-primary outline-none transition placeholder:text-secondary/75 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          />
        </div>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOverlayOpen(true)}
          aria-expanded={overlayOpen}
          aria-controls={overlayTitleId}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-default bg-subtle px-4 py-2.5 text-sm font-medium text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
        >
          <Filter className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
          <span>{isEnglish ? 'Filters & Phase Info' : 'Filter & Info Fase'}</span>
        </button>
      </div>

      {/* Category / City Filter Pills */}
      <div
        role="tablist"
        aria-label={
          kind === 'market'
            ? isEnglish
              ? 'Filter market categories'
              : 'Filter kategori market'
            : isEnglish
              ? 'Filter partner cities'
              : 'Filter kota mitra'
        }
        className="flex flex-wrap gap-2"
      >
        {filters.map((option) => {
          const active = selectedFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedFilter(option.id)}
              className={`min-h-11 rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                active
                  ? 'bg-accent-cta font-semibold text-white hover:bg-accent-cta-hover'
                  : 'border border-default bg-surface font-medium text-secondary hover:bg-subtle hover:text-primary'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <section
          aria-live="polite"
          className="rounded-xl border border-default bg-surface p-8 text-center shadow-sm"
        >
          <p className="font-sans text-xl font-semibold text-primary">
            {isEnglish ? 'No matching previews found' : 'Tidak ada pratinjau yang cocok'}
          </p>
          <p className="mx-auto mt-2 max-w-[65ch] text-sm text-secondary">
            {isEnglish
              ? 'Your current keyword or filter did not match any preview item. Reset filters to view all active module highlights.'
              : 'Kata kunci atau filter yang dipilih belum menemukan item yang sesuai. Reset filter untuk melihat seluruh ringkasan modul aktif.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedFilter('all');
              setQuery('');
            }}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            {isEnglish ? 'Show All' : 'Tampilkan Semua'}
          </button>
        </section>
      ) : (
        <div className="space-y-6">
          {/* Highlight / Featured Card (Asymmetric Hierarchy per DESIGN.md Section 4 & CODING_STANDARDS Section 10) */}
          {featuredItem && (
            <article className="rounded-xl border border-default bg-accent-subtle p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="vt-badge-sample">{badgeText}</span>
                <span className="text-xs font-medium text-secondary">
                  {featuredItem.categoryLabel}
                </span>
              </div>

              <div className="mt-4 grid gap-6 lg:grid-cols-3 lg:items-end">
                <div className="lg:col-span-2">
                  <h2 className="tracking-tight font-sans text-2xl font-bold text-primary [text-wrap:balance] sm:text-3xl">
                    {featuredItem.title}
                  </h2>
                  <p className="mt-2.5 max-w-[68ch] text-sm leading-relaxed text-secondary sm:text-base">
                    {featuredItem.subtitle}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-primary">
                    <span className="rounded-md border border-default bg-surface px-2.5 py-1">
                      {featuredItem.specPrimary}
                    </span>
                    <span className="rounded-md border border-default bg-surface px-2.5 py-1">
                      {featuredItem.specSecondary}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-default bg-surface p-5 lg:items-end">
                  <div className="lg:text-right">
                    <p className="text-xs text-secondary">{featuredItem.metricLabel}</p>
                    <p className="mt-1 font-mono text-xl font-bold tabular-nums text-primary">
                      {featuredItem.metricValue}
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                    <Link
                      href={featuredItem.actionHref}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 lg:flex-none"
                    >
                      <span>{featuredItem.actionLabel}</span>
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                    <ShareMenu
                      title={featuredItem.title}
                      text={featuredItem.subtitle}
                      url={featuredItem.actionHref}
                      compact
                    />
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* Secondary Structured Cards */}
          {secondaryItems.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {secondaryItems.map((item) => (
                <article
                  key={item.id}
                  className="vt-card-lift flex flex-col justify-between rounded-xl border border-default bg-surface p-6 shadow-sm"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="vt-badge-sample">{badgeText}</span>
                      <span className="text-xs font-medium text-secondary">
                        {item.categoryLabel}
                      </span>
                    </div>
                    <h3 className="tracking-tight mt-4 font-sans text-xl font-bold text-primary [text-wrap:balance]">
                      {item.title}
                    </h3>
                    <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-secondary">
                      {item.subtitle}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-secondary">
                      <span className="rounded-md bg-subtle px-2.5 py-1 font-medium text-primary">
                        {item.specPrimary}
                      </span>
                      <span className="rounded-md bg-subtle px-2.5 py-1 font-medium text-primary">
                        {item.specSecondary}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
                    <div>
                      <p className="text-xs text-secondary">{item.metricLabel}</p>
                      <p className="font-mono text-base font-semibold tabular-nums text-primary">
                        {item.metricValue}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ShareMenu
                        title={item.title}
                        text={item.subtitle}
                        url={item.actionHref}
                        compact
                      />
                      <Link
                        href={item.actionHref}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-4 py-2 text-sm font-medium text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                      >
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contextual Side Drawer (>= 768px) / Bottom Sheet (< 768px) — Never a centered modal */}
      {overlayOpen && (
        <div className={styles.backdrop} onClick={closeOverlay}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={overlayTitleId}
            onClick={(event) => event.stopPropagation()}
            className={styles.panel}
          >
            <div className="flex justify-center pt-3 pb-1 md:hidden" aria-hidden="true">
              <span className={styles.dragHandle} />
            </div>

            <div className="flex items-start justify-between gap-3 border-b border-default px-5 py-4">
              <div>
                <span className="vt-badge-sample">
                  {isEnglish ? 'Phased Roadmap Release' : 'Rilis Bertahap Roadmap'}
                </span>
                <h2 id={overlayTitleId} className="tracking-tight mt-2 font-sans text-xl font-bold text-primary">
                  {drawerTitle}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeOverlay}
                aria-label={isEnglish ? 'Close filter and info drawer' : 'Tutup panel filter dan info'}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-subtle text-primary transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <p className="max-w-[65ch] text-sm leading-relaxed text-secondary">
                {drawerDescription}
              </p>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  {isEnglish ? 'Quick Filters' : 'Pilih Filter Cepat'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {filters.map((option) => {
                    const active = selectedFilter === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedFilter(option.id);
                          closeOverlay();
                        }}
                        className={`min-h-11 rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 ${
                          active
                            ? 'bg-accent-cta font-semibold text-white'
                            : 'border border-default bg-subtle text-primary hover:bg-canvas'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <form
                onSubmit={handleEarlyAccessSubmit}
                className="space-y-3 rounded-xl border border-default bg-canvas p-4"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span>{isEnglish ? 'Feature Launch Reminder' : 'Pengingat Kesiapan Fitur'}</span>
                </p>
                <label htmlFor={notifyEmailId} className="block text-xs text-secondary">
                  {isEnglish
                    ? 'Enter your email to save early-access interest for this session.'
                    : 'Masukkan email Anda untuk mencatat minat akses awal di sesi ini.'}
                </label>
                <input
                  id={notifyEmailId}
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(event) => setNotifyEmail(event.target.value)}
                  disabled={isNotifying}
                  placeholder={isEnglish ? 'name@domain.com' : 'nama@domain.com'}
                  className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isNotifying || !notifyEmail.trim()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isNotifying && (
                    <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span>
                    {isNotifying
                      ? isEnglish
                        ? 'Saving…'
                        : 'Menyimpan…'
                      : isEnglish
                        ? 'Save Reminder'
                        : 'Catat Pengingat'}
                  </span>
                </button>
                {notifyFeedback && (
                  <p
                    role="status"
                    className="flex items-start gap-2 rounded-lg bg-surface p-2.5 text-xs text-primary"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-status-live"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span>{notifyFeedback}</span>
                  </p>
                )}
              </form>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
