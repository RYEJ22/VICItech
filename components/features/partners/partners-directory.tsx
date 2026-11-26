'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Cpu,
  ExternalLink,
  MapPin,
  MessageCircle,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ShareMenu } from '@/components/features/share/share-menu';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  PARTNER_TYPE_LABELS,
  PARTNER_TYPES,
} from '@/lib/admin/partners-validation';
import type { PartnerRow, PartnerType } from '@/lib/admin/partners-validation';
import styles from './partners-directory.module.css';

interface PartnersDirectoryProps {
  readonly initialPartners: readonly PartnerRow[];
  readonly initialError?: string | null;
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60';

function getPartnerMapsUrl(partner: PartnerRow): string | null {
  const raw = typeof partner.gmaps_url === 'string' ? partner.gmaps_url.trim() : '';
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
    } catch {
      // Fallback ke koordinat bila URL tidak valid.
    }
  }
  if (partner.latitude !== null && partner.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${partner.latitude},${partner.longitude}`)}`;
  }
  return null;
}

function getPartnerWhatsappUrl(partner: PartnerRow): string | null {
  const raw = typeof partner.whatsapp_number === 'string' ? partner.whatsapp_number.trim() : '';
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 8) return null;
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

function formatCoordinates(partner: PartnerRow): string | null {
  if (partner.latitude === null || partner.longitude === null) return null;
  return `${Number(partner.latitude).toFixed(4)}, ${Number(partner.longitude).toFixed(4)}`;
}

function isSamplePartner(partner: PartnerRow): boolean {
  const hay = `${partner.name} ${partner.city} ${partner.address}`.toLowerCase();
  const wa = (partner.whatsapp_number ?? '').replace(/[^\d]/g, '');
  if (/(sample|demo|contoh|hub bandung|vicitech hub|jaksel|jakarta selatan)/i.test(hay)) {
    return true;
  }
  if (/^(62|0)?812345678/.test(wa)) {
    return true;
  }
  return false;
}

function PartnerTypeIcon({ type }: { readonly type: PartnerType }): ReactElement {
  return type === 'service_center' ? (
    <Wrench className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
  ) : (
    <Cpu className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
  );
}

export function PartnersDirectory({
  initialPartners,
  initialError = null,
}: PartnersDirectoryProps): ReactElement {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | PartnerType>('all');
  const [query, setQuery] = useState<string>('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [activePartner, setActivePartner] = useState<PartnerRow | null>(null);

  const searchInputId = useId();
  const drawerTitleId = useId();
  const drawerPanelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const cityFilters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const partner of initialPartners) {
      const cityName = partner.city.trim();
      if (!cityName) continue;
      counts.set(cityName, (counts.get(cityName) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'id'))
      .map(([city, count]) => ({ city, count }));
  }, [initialPartners]);

  const filteredPartners = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    return initialPartners.filter((partner) => {
      if (selectedCity !== 'all' && partner.city.trim().toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (selectedType !== 'all' && partner.type !== selectedType) {
        return false;
      }
      if (!normalizedQuery) return true;

      const typeLabel = PARTNER_TYPE_LABELS[partner.type] ?? partner.type;
      const haystack = `${partner.name} ${partner.city} ${partner.address} ${typeLabel}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [debouncedQuery, initialPartners, selectedCity, selectedType]);

  const featuredPartner = useMemo(() => {
    if (filteredPartners.length === 0) return null;
    return filteredPartners.find((item) => item.is_verified) ?? filteredPartners[0] ?? null;
  }, [filteredPartners]);

  const secondaryPartners = useMemo(
    () => (featuredPartner ? filteredPartners.filter((item) => item.id !== featuredPartner.id) : []),
    [featuredPartner, filteredPartners],
  );

  const hasActiveFilters =
    selectedCity !== 'all' || selectedType !== 'all' || debouncedQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedCity('all');
    setSelectedType('all');
    setQuery('');
  };

  const openPartnerDetail = useCallback((partner: PartnerRow, triggerEl: HTMLButtonElement) => {
    lastTriggerRef.current = triggerEl;
    setActivePartner(partner);
  }, []);

  const closePartnerDetail = useCallback(() => {
    setActivePartner(null);
    window.requestAnimationFrame(() => {
      lastTriggerRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!activePartner) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const rafId = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePartnerDetail();
        return;
      }
      if (event.key === 'Tab' && drawerPanelRef.current) {
        const focusables = drawerPanelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePartner, closePartnerDetail]);

  const activeMapsUrl = activePartner ? getPartnerMapsUrl(activePartner) : null;
  const activeWhatsappUrl = activePartner ? getPartnerWhatsappUrl(activePartner) : null;
  const activeCoords = activePartner ? formatCoordinates(activePartner) : null;

  return (
    <div className="space-y-6">
      {initialError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-status-danger/30 bg-surface p-4 text-sm text-primary shadow-sm"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" strokeWidth={1.75} aria-hidden="true" />
          <p>{initialError}</p>
        </div>
      )}

      {initialPartners.length === 0 ? (
        <section
          aria-live="polite"
          className="rounded-xl border border-default bg-surface p-8 text-center shadow-sm sm:p-10"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-default bg-subtle text-accent-primary">
            <MapPin className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2 className="tracking-tight mt-4 font-sans text-2xl font-bold text-primary">
            Belum ada mitra yang terdaftar
          </h2>
          <p className="mx-auto mt-2 max-w-[65ch] text-sm leading-relaxed text-secondary">
            Daftar toko komponen dan service center terverifikasi yang ditambahkan oleh tim ViciTech
            akan tampil di halaman ini. Sementara itu, Anda dapat berkonsultasi langsung dengan
            teknisi atau mengajukan inspeksi Trade-In.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/messages"
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover ${focusRing}`}
            >
              <MessageSquare className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Konsultasi Teknisi via DM</span>
            </Link>
            <Link
              href="/trade-in"
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-canvas ${focusRing}`}
            >
              <span>Ajukan Inspeksi Trade-In</span>
              <ArrowRight className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Search + Service Type Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-default bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <label htmlFor={searchInputId} className="sr-only">
                Cari nama mitra, kota, atau alamat layanan
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
                placeholder="Cari mitra, kota, atau alamat bengkel…"
                className="vt-form-control min-h-11 w-full rounded-lg border border-default bg-canvas py-2.5 pl-10 pr-4 text-sm text-primary outline-none transition placeholder:text-secondary/75 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              />
            </div>

            <div
              role="group"
              aria-label="Filter tipe layanan mitra"
              className="inline-flex flex-wrap gap-1 rounded-lg border border-default bg-subtle p-1"
            >
              <button
                type="button"
                aria-pressed={selectedType === 'all'}
                onClick={() => setSelectedType('all')}
                className={`min-h-11 rounded-md px-3 py-1.5 text-xs font-medium transition ${focusRing} ${
                  selectedType === 'all'
                    ? 'bg-accent-cta font-semibold text-white'
                    : 'text-secondary hover:bg-surface hover:text-primary'
                }`}
              >
                Semua Layanan
              </button>
              {PARTNER_TYPES.map((typeOption) => {
                const active = selectedType === typeOption;
                return (
                  <button
                    key={typeOption}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedType(typeOption)}
                    className={`min-h-11 rounded-md px-3 py-1.5 text-xs font-medium transition ${focusRing} ${
                      active
                        ? 'bg-accent-cta font-semibold text-white'
                        : 'text-secondary hover:bg-surface hover:text-primary'
                    }`}
                  >
                    {PARTNER_TYPE_LABELS[typeOption]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* City Filter Pills + Result Count */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Filter kota mitra"
              className="flex flex-wrap gap-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedCity === 'all'}
                onClick={() => setSelectedCity('all')}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${focusRing} ${
                  selectedCity === 'all'
                    ? 'bg-accent-cta font-semibold text-white hover:bg-accent-cta-hover'
                    : 'border border-default bg-surface font-medium text-secondary hover:bg-subtle hover:text-primary'
                }`}
              >
                <span>Semua Kota</span>
                <span className="font-mono text-xs tabular-nums opacity-85">
                  {initialPartners.length}
                </span>
              </button>

              {cityFilters.map(({ city, count }) => {
                const active = selectedCity.toLowerCase() === city.toLowerCase();
                return (
                  <button
                    key={city}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCity(city)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${focusRing} ${
                      active
                        ? 'bg-accent-cta font-semibold text-white hover:bg-accent-cta-hover'
                        : 'border border-default bg-surface font-medium text-secondary hover:bg-subtle hover:text-primary'
                    }`}
                  >
                    <span>{city}</span>
                    <span className="font-mono text-xs tabular-nums opacity-85">{count}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-medium text-secondary">
              Menampilkan{' '}
              <span className="font-mono font-semibold tabular-nums text-primary">
                {filteredPartners.length}
              </span>{' '}
              mitra
            </p>
          </div>

          {/* Filtered Empty State or Partner Cards */}
          {filteredPartners.length === 0 ? (
            <section
              aria-live="polite"
              className="rounded-xl border border-default bg-surface p-8 text-center shadow-sm"
            >
              <p className="font-sans text-xl font-semibold text-primary">
                Mitra tidak ditemukan
              </p>
              <p className="mx-auto mt-2 max-w-[65ch] text-sm text-secondary">
                Tidak ada mitra yang cocok dengan kata kunci, tipe layanan, atau kota yang dipilih.
                Atur ulang filter untuk menampilkan seluruh direktori mitra ViciTech.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover ${focusRing}`}
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span>Reset Filter</span>
                </button>
              )}
            </section>
          ) : (
            <div className="space-y-6">
              {featuredPartner && (() => {
                const mapsUrl = getPartnerMapsUrl(featuredPartner);
                const whatsappUrl = getPartnerWhatsappUrl(featuredPartner);
                const coords = formatCoordinates(featuredPartner);
                const typeLabel = PARTNER_TYPE_LABELS[featuredPartner.type] ?? featuredPartner.type;
                const featuredIsSample = isSamplePartner(featuredPartner);
                return (
                  <article className="vt-card-lift rounded-xl border border-accent-primary/25 bg-accent-subtle p-6 shadow-sm sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {featuredPartner.is_verified ? (
                          <span className="vt-badge-live">
                            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                            <span>Terverifikasi ViciTech</span>
                          </span>
                        ) : (
                          <span className="vt-badge-sample">Mitra Terdaftar</span>
                        )}
                        {featuredIsSample && (
                          <span className="vt-badge-sample">Sample</span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <PartnerTypeIcon type={featuredPartner.type} />
                        <span>{typeLabel}</span>
                      </span>
                    </div>

                    <div className="mt-4 grid gap-6 lg:grid-cols-3 lg:items-end">
                      <div className="lg:col-span-2">
                        <h2 className="tracking-tight font-sans text-2xl font-bold text-primary [text-wrap:balance] sm:text-3xl">
                          {featuredPartner.name}
                        </h2>
                        <p className="mt-2.5 max-w-[68ch] text-sm leading-relaxed text-secondary sm:text-base">
                          {featuredPartner.address}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-primary">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-default bg-surface px-2.5 py-1">
                            <MapPin className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                            <span>{featuredPartner.city}</span>
                          </span>
                          {coords && (
                            <span className="rounded-md border border-default bg-surface px-2.5 py-1 font-mono tabular-nums text-secondary">
                              {coords}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5 rounded-xl border border-default bg-surface p-5">
                        <button
                          type="button"
                          onClick={(event) => openPartnerDetail(featuredPartner, event.currentTarget)}
                          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover ${focusRing}`}
                        >
                          <span>Lihat Detail Mitra</span>
                          <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                        <div className="flex flex-wrap gap-2">
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-default bg-subtle px-3 py-2 text-xs font-medium text-primary transition hover:bg-canvas ${focusRing}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                              <span>Google Maps</span>
                            </a>
                          )}
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-default bg-subtle px-3 py-2 text-xs font-medium text-primary transition hover:bg-canvas ${focusRing}`}
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-status-live" strokeWidth={1.75} aria-hidden="true" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })()}

              {secondaryPartners.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {secondaryPartners.map((partner) => {
                    const mapsUrl = getPartnerMapsUrl(partner);
                    const whatsappUrl = getPartnerWhatsappUrl(partner);
                    const coords = formatCoordinates(partner);
                    const typeLabel = PARTNER_TYPE_LABELS[partner.type] ?? partner.type;
                    const partnerIsSample = isSamplePartner(partner);

                    return (
                      <article
                        key={partner.id}
                        className="vt-card-lift flex flex-col justify-between rounded-xl border border-default bg-surface p-6 shadow-sm"
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {partner.is_verified ? (
                                <span className="vt-badge-live">
                                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                                  <span>Terverifikasi</span>
                                </span>
                              ) : (
                                <span className="vt-badge-sample">Mitra Terdaftar</span>
                              )}
                              {partnerIsSample && (
                                <span className="vt-badge-sample">Sample</span>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary">
                              <PartnerTypeIcon type={partner.type} />
                              <span>{typeLabel}</span>
                            </span>
                          </div>

                          <h3 className="tracking-tight mt-4 font-sans text-xl font-bold text-primary [text-wrap:balance]">
                            {partner.name}
                          </h3>
                          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-secondary">
                            {partner.address}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-subtle px-2.5 py-1 font-medium text-primary">
                              <MapPin className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                              <span>{partner.city}</span>
                            </span>
                            {coords && (
                              <span className="rounded-md bg-subtle px-2.5 py-1 font-mono tabular-nums text-secondary">
                                {coords}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-default pt-4">
                          <div className="flex flex-wrap gap-2">
                            {mapsUrl && (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary transition hover:bg-subtle ${focusRing}`}
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                                <span>Maps</span>
                              </a>
                            )}
                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary transition hover:bg-subtle ${focusRing}`}
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-status-live" strokeWidth={1.75} aria-hidden="true" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(event) => openPartnerDetail(partner, event.currentTarget)}
                            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-subtle px-4 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle ${focusRing}`}
                          >
                            <span>Lihat Detail</span>
                            <ArrowRight className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Contextual Side Drawer (>= 768px) / Bottom Sheet (< 768px) */}
      {activePartner && (
        <div className={styles.backdrop} onClick={closePartnerDetail}>
          <aside
            ref={drawerPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            onClick={(event) => event.stopPropagation()}
            className={styles.panel}
          >
            <div className="flex justify-center pb-1 pt-3 md:hidden" aria-hidden="true">
              <span className={styles.dragHandle} />
            </div>

            <div className="flex items-start justify-between gap-3 border-b border-default px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {activePartner.is_verified ? (
                    <span className="vt-badge-live">
                      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      <span>Terverifikasi ViciTech</span>
                    </span>
                  ) : (
                    <span className="vt-badge-sample">Mitra Terdaftar</span>
                  )}
                  <span className="text-xs font-medium text-secondary">
                    {PARTNER_TYPE_LABELS[activePartner.type] ?? activePartner.type}
                  </span>
                </div>
                <h2
                  id={drawerTitleId}
                  className="tracking-tight mt-2 font-sans text-xl font-bold text-primary [text-wrap:balance]"
                >
                  {activePartner.name}
                </h2>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closePartnerDetail}
                aria-label="Tutup detail mitra"
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-subtle text-primary transition hover:bg-canvas ${focusRing}`}
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <dl className="divide-y divide-default rounded-xl border border-default bg-canvas">
                <div className="px-4 py-3">
                  <dt className="text-xs font-medium text-secondary">Kota</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <MapPin className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                    <span>{activePartner.city}</span>
                  </dd>
                </div>
                <div className="px-4 py-3">
                  <dt className="text-xs font-medium text-secondary">Alamat Lengkap</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-primary">
                    {activePartner.address}
                  </dd>
                </div>
                {activeCoords && (
                  <div className="px-4 py-3">
                    <dt className="text-xs font-medium text-secondary">Koordinat Lokasi</dt>
                    <dd className="mt-1 font-mono text-sm tabular-nums text-primary">
                      {activeCoords}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="space-y-2.5">
                {activeMapsUrl && (
                  <a
                    href={activeMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-cta-hover ${focusRing}`}
                  >
                    <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    <span>Buka di Google Maps</span>
                  </a>
                )}

                {activeWhatsappUrl && (
                  <a
                    href={activeWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-surface px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-subtle ${focusRing}`}
                  >
                    <MessageCircle className="h-4 w-4 text-status-live" strokeWidth={1.75} aria-hidden="true" />
                    <span>Chat via WhatsApp</span>
                  </a>
                )}

                <Link
                  href="/messages"
                  className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-subtle px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-canvas ${focusRing}`}
                >
                  <MessageSquare className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span>Konsultasi via DM ViciTech</span>
                </Link>
              </div>

              <div className="flex items-center justify-between border-t border-default pt-4">
                <span className="text-xs text-secondary">Bagikan lokasi mitra ini</span>
                <ShareMenu
                  title={`${activePartner.name} — Mitra ViciTech`}
                  text={`${PARTNER_TYPE_LABELS[activePartner.type] ?? activePartner.type} di ${activePartner.city}: ${activePartner.address}`}
                  url="/partners"
                  label="Bagikan"
                />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
