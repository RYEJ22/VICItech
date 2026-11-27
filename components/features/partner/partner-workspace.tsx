'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  Lock,
  PackagePlus,
  ShieldCheck,
  Store,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { PartnerRow } from '@/lib/admin/partners-validation';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
} from '@/lib/admin/products-validation';
import type { ProductCategory, ProductStockStatus } from '@/lib/admin/products-validation';
import {
  DEMO_PARTNER_LISTINGS,
  IMMUTABLE_PARTNER_LEDGER_ENTRIES,
  PARTNER_CONDITION_GRADES,
  PARTNER_LISTINGS_STORAGE_KEY,
  PARTNER_LISTINGS_UPDATED_EVENT,
  addPartnerListing,
  computePartnerFinancialSummaries,
  formatIdr,
  formatLedgerDate,
  getCombinedPartnerListings,
  mergePartnerProfiles,
  removeLocalPartnerListing,
} from '@/lib/partners/partner-commerce';
import type {
  PartnerConditionGrade,
  PartnerListingRecord,
  PartnerSettlementStatus,
} from '@/lib/partners/partner-commerce';

interface PartnerWorkspaceProps {
  readonly initialPartners: readonly PartnerRow[];
}

const focusRing =
  'vt-motion-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';
const fieldClass =
  'vt-form-control box-border min-h-11 w-full max-w-full min-w-0 rounded-lg border border-default bg-canvas px-3.5 py-2.5 text-sm text-primary placeholder:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60';

function settlementMeta(
  status: PartnerSettlementStatus,
  isEnglish: boolean,
): { readonly label: string; readonly cls: string } {
  if (status === 'settled') {
    return { label: isEnglish ? 'Settled' : 'Tercairkan', cls: 'vt-badge-live' };
  }
  if (status === 'pending_escrow') {
    return {
      label: isEnglish ? 'Pending Escrow' : 'Escrow Tertahan',
      cls: 'vt-badge-simulated',
    };
  }
  return { label: isEnglish ? 'QC Hold' : 'Ditahan QC', cls: 'vt-badge-sample' };
}

export function PartnerWorkspace({ initialPartners }: PartnerWorkspaceProps): ReactElement {
  const { isEnglish } = useLanguage();
  const partners = useMemo(() => mergePartnerProfiles(initialPartners), [initialPartners]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    () => partners[0]?.id ?? 'demo-partner-nusantara',
  );
  const [listings, setListings] = useState<readonly PartnerListingRecord[]>(DEMO_PARTNER_LISTINGS);

  // Add Product form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProductCategory>('component');
  const [priceInput, setPriceInput] = useState('');
  const [stockQtyInput, setStockQtyInput] = useState('3');
  const [stockStatus, setStockStatus] = useState<ProductStockStatus>('ready');
  const [conditionGrade, setConditionGrade] = useState<PartnerConditionGrade>('New Sealed');
  const [specsSummary, setSpecsSummary] = useState('');
  const [partnerNotes, setPartnerNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');

  // Hydrate local listings client-side so SSR matches initial render without mismatch
  useEffect(() => {
    const syncListings = () => {
      setListings(getCombinedPartnerListings());
    };
    syncListings();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === PARTNER_LISTINGS_STORAGE_KEY) {
        syncListings();
      }
    };

    window.addEventListener(PARTNER_LISTINGS_UPDATED_EVENT, syncListings);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(PARTNER_LISTINGS_UPDATED_EVENT, syncListings);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const activePartner = useMemo(
    () => partners.find((p) => p.id === selectedPartnerId) ?? partners[0]!,
    [partners, selectedPartnerId],
  );

  const partnerListings = useMemo(
    () => listings.filter((item) => item.partnerId === activePartner.id),
    [activePartner.id, listings],
  );

  const partnerSummary = useMemo(() => {
    const all = computePartnerFinancialSummaries(
      IMMUTABLE_PARTNER_LEDGER_ENTRIES,
      partners,
      listings,
    );
    return all.find((item) => item.partnerId === activePartner.id) ?? all[0]!;
  }, [activePartner.id, listings, partners]);

  const partnerLedger = useMemo(
    () =>
      IMMUTABLE_PARTNER_LEDGER_ENTRIES.filter((entry) => entry.partnerId === activePartner.id),
    [activePartner.id],
  );

  const handlePublish = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setFormError('');
    setFormNotice('');

    const parsedPrice = Number(priceInput.replace(/[^\d]/g, ''));
    const parsedStock = Number(stockQtyInput);

    const res = addPartnerListing({
      partner: activePartner,
      title,
      category,
      price: parsedPrice,
      stockQuantity: parsedStock,
      stockStatus,
      conditionGrade,
      specsSummary,
      partnerNotes,
    });

    if (!res.ok) {
      setFormError(res.error);
      return;
    }

    setListings(getCombinedPartnerListings());
    setTitle('');
    setPriceInput('');
    setStockQtyInput('2');
    setSpecsSummary('');
    setPartnerNotes('');
    setFormNotice(
      isEnglish
        ? `Listing "${res.listing.title}" published with Partner attribution (${activePartner.name}) and synced to /market.`
        : `Produk "${res.listing.title}" diterbitkan dengan atribusi Mitra (${activePartner.name}) dan langsung tampil di /market.`,
    );
  };

  return (
    <div className="mx-auto w-full max-w-shell min-w-0 space-y-6 px-4 pt-6 pb-24 sm:px-6 sm:pt-10 sm:pb-16">
      {/* Workspace Header & Active Partner Switcher */}
      <header className="box-border w-full max-w-full min-w-0 rounded-xl border border-default bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
                <Store className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>{isEnglish ? 'ViciTech Partner Workspace' : 'Ruang Kerja Mitra ViciTech'}</span>
              </span>
              <span
                className={
                  activePartner.source === 'live' ? 'vt-badge-live' : 'vt-badge-simulated'
                }
              >
                {activePartner.source === 'live' ? 'Live Directory' : 'Simulated / Demo'}
              </span>
            </div>
            <h1 className="font-sans text-2xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-3xl">
              {isEnglish
                ? 'Partner Product Listing & Read-Only Financial Status'
                : 'Portal Produk Mitra & Status Keuangan Hanya Baca'}
            </h1>
            <p className="max-w-[68ch] text-xs leading-relaxed text-secondary sm:text-sm">
              {isEnglish
                ? 'Publish partner hardware listings with automatic "Partner Listing" attribution onto ViciTech Market while auditing settlement figures on a tamper-evident read-only ledger.'
                : 'Terbitkan katalog hardware mitra dengan lencana atribusi "Mitra" otomatis ke ViciTech Market, dan pantau ringkasan pencairan dana pada buku besar hanya-baca.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 sm:w-64">
              <label htmlFor="partner-switcher" className="mb-1 block text-xs font-semibold text-secondary">
                {isEnglish ? 'Active Partner Account' : 'Akun Mitra Aktif'}
              </label>
              <select
                id="partner-switcher"
                value={activePartner.id}
                onChange={(e) => {
                  setSelectedPartnerId(e.target.value);
                  setFormError('');
                  setFormNotice('');
                }}
                className={fieldClass}
              >
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} · {partner.city}
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/market"
              className={`vt-btn-tactile inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2 text-xs font-semibold text-primary hover:bg-subtle sm:text-sm ${focusRing}`}
            >
              <span>{isEnglish ? 'View Market' : 'Lihat Market'}</span>
              <ArrowUpRight className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main 2-Column Workspace */}
      <div className="grid w-full max-w-full min-w-0 gap-6 lg:grid-cols-12">
        {/* Left: Add Partner Product Form */}
        <form
          onSubmit={handlePublish}
          className="box-border w-full max-w-full min-w-0 space-y-4 rounded-xl border border-default bg-surface p-4 shadow-sm sm:p-6 lg:col-span-5 lg:self-start"
        >
          <div className="border-b border-default pb-3">
            <h2 className="flex items-center gap-2 font-sans text-lg font-bold text-primary">
              <PackagePlus className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
              <span>{isEnglish ? 'Add Product' : 'Tambah Produk'}</span>
            </h2>
            <p className="mt-1 text-xs text-secondary">
              {isEnglish
                ? 'Automatically attaches Partner Attribution metadata onto /market cards.'
                : 'Otomatis menyematkan lencana & metadata Mitra pada kartu produk /market.'}
            </p>
          </div>

          {/* Automatic Attribution Preview Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default bg-canvas px-3 py-2.5 text-xs">
            <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-primary">
              <BadgeCheck className="h-4 w-4 shrink-0 text-accent-cta" aria-hidden="true" />
              <span className="truncate">
                {isEnglish ? 'Partner' : 'Mitra'}: {activePartner.name}
              </span>
            </span>
            <span className="rounded border border-accent-primary/35 bg-accent-subtle px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-accent-hover">
              Partner Listing
            </span>
          </div>

          <div>
            <label htmlFor="pt-prod-title" className="mb-1.5 block text-xs font-semibold text-primary sm:text-sm">
              {isEnglish ? 'Product Title' : 'Nama Produk'}
            </label>
            <input
              id="pt-prod-title"
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isEnglish ? 'e.g. MSI RTX 4070 Super Ventus 2X OC' : 'Contoh: MSI RTX 4070 Super Ventus 2X OC'
              }
              className={fieldClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pt-prod-category" className="mb-1.5 block text-xs font-semibold text-primary sm:text-sm">
                {isEnglish ? 'Category' : 'Kategori'}
              </label>
              <select
                id="pt-prod-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className={fieldClass}
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {PRODUCT_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pt-prod-condition" className="mb-1.5 block text-xs font-semibold text-primary sm:text-sm">
                {isEnglish ? 'Condition Grade' : 'Kondisi Unit'}
              </label>
              <select
                id="pt-prod-condition"
                value={conditionGrade}
                onChange={(e) => setConditionGrade(e.target.value as PartnerConditionGrade)}
                className={fieldClass}
              >
                {PARTNER_CONDITION_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label htmlFor="pt-prod-price" className="mb-1.5 block text-xs font-semibold text-primary sm:text-sm">
                {isEnglish ? 'Price (IDR)' : 'Harga (Rp)'}
              </label>
              <input
                id="pt-prod-price"
                type="number"
                min={10000}
                step={1000}
                required
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="4500000"
                className={`${fieldClass} font-mono tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="pt-prod-stock" className="mb-1.5 block text-xs font-semibold text-primary sm:text-sm">
                {isEnglish ? 'Stock Qty' : 'Stok'}
              </label>
              <input
                id="pt-prod-stock"
                type="number"
                min={0}
                max={999}
                required
                value={stockQtyInput}
                onChange={(e) => setStockQtyInput(e.target.value)}
                className={`${fieldClass} font-mono tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="pt-prod-status" className="mb-1.5 block text-xs font-semibold text-primary sm:text-sm">
                {isEnglish ? 'Availability' : 'Ketersediaan'}
              </label>
              <select
                id="pt-prod-status"
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as ProductStockStatus)}
                className={fieldClass}
              >
                <option value="ready">Ready Stock</option>
                <option value="preorder">Pre-Order</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="pt-prod-specs" className="mb-1.5 block text-xs font-semibold text-primary sm:text-sm">
              {isEnglish ? 'Key Specs (key: value, comma separated)' : 'Spesifikasi Ringkas (kunci: nilai, pisah koma)'}
            </label>
            <input
              id="pt-prod-specs"
              type="text"
              maxLength={240}
              value={specsSummary}
              onChange={(e) => setSpecsSummary(e.target.value)}
              placeholder="gpu: RTX 4070 Super, vram: 12 GB GDDR6X, warranty: 2 Tahun"
              className={`${fieldClass} font-mono text-xs`}
            />
          </div>

          <div>
            <label htmlFor="pt-prod-notes" className="mb-1.5 block text-xs font-semibold text-primary sm:text-sm">
              {isEnglish ? 'Partner Notes & Warranty' : 'Catatan Mitra & Garansi'}
            </label>
            <textarea
              id="pt-prod-notes"
              rows={2}
              maxLength={280}
              value={partnerNotes}
              onChange={(e) => setPartnerNotes(e.target.value)}
              placeholder={
                isEnglish
                  ? 'Describe QC test results, box completeness, or pickup city...'
                  : 'Cantumkan hasil uji QC, kelengkapan dus, atau lokasi pengambilan...'
              }
              className={`${fieldClass} resize-y`}
            />
          </div>

          {formError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
              {formError}
            </p>
          )}

          {formNotice && !formError && (
            <div role="status" className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-900">
              <p>{formNotice}</p>
              <Link href="/market" className="inline-flex items-center gap-1 font-semibold text-accent-cta underline">
                <span>{isEnglish ? 'Open ViciTech Market' : 'Buka ViciTech Market'}</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}

          <button
            type="submit"
            className={`vt-btn-tactile inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
          >
            <PackagePlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>{isEnglish ? 'Publish Partner Listing' : 'Terbitkan Produk Mitra'}</span>
          </button>
        </form>

        {/* Right: Partner Product Queue + Read-Only Financial Summary */}
        <div className="box-border w-full max-w-full min-w-0 space-y-6 lg:col-span-7">
          {/* Active Partner Product Queue */}
          <section className="box-border w-full max-w-full min-w-0 rounded-xl border border-default bg-surface p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
              <div>
                <h2 className="font-sans text-lg font-bold text-primary">
                  {isEnglish ? 'Partner Catalog Queue' : 'Antrean & Katalog Produk Mitra'}
                </h2>
                <p className="mt-0.5 text-xs text-secondary">
                  {activePartner.name} ({partnerListings.length}{' '}
                  {isEnglish ? 'listings' : 'produk'})
                </p>
              </div>
              <span className="vt-badge-simulated">Partner Attribution Active</span>
            </div>

            {partnerListings.length === 0 ? (
              <p className="py-6 text-sm text-secondary">
                {isEnglish
                  ? 'No listings for this partner yet. Use the form on the left to add one.'
                  : 'Belum ada produk untuk mitra ini. Tambahkan produk baru melalui formulir di samping.'}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {partnerListings.map((item) => (
                  <li
                    key={item.id}
                    className="box-border flex w-full max-w-full min-w-0 flex-col gap-3 rounded-lg border border-default bg-canvas p-3.5 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded border border-accent-primary/35 bg-accent-subtle px-2 py-0.5 text-[11px] font-semibold text-accent-hover">
                          <Store className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>
                            {isEnglish ? 'Partner' : 'Mitra'}: {item.partnerName}
                          </span>
                        </span>
                        <span className="rounded border border-default bg-surface px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary">
                          Partner Listing
                        </span>
                        <span className="rounded border border-default bg-subtle px-2 py-0.5 text-[10px] font-medium text-secondary">
                          {item.conditionGrade}
                        </span>
                      </div>
                      <p className="break-words text-sm font-bold text-primary">{item.title}</p>
                      {item.specsSummary && (
                        <p className="break-words font-mono text-[11px] text-secondary">
                          {item.specsSummary}
                        </p>
                      )}
                      {item.partnerNotes && (
                        <p className="break-words text-xs text-secondary">{item.partnerNotes}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <div className="text-left sm:text-right">
                        <p className="font-mono text-sm font-bold tabular-nums text-primary">
                          {formatIdr(item.price)}
                        </p>
                        <p className="font-mono text-[11px] tabular-nums text-secondary">
                          {isEnglish ? 'Stock' : 'Stok'}: {item.stockQuantity}
                        </p>
                      </div>
                      {item.source === 'partner_local' && (
                        <button
                          type="button"
                          onClick={() => removeLocalPartnerListing(item.id)}
                          aria-label={
                            isEnglish ? `Remove ${item.title}` : `Hapus ${item.title}`
                          }
                          className={`inline-flex min-h-11 items-center gap-1 rounded-lg border border-red-200 bg-surface px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 ${focusRing}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{isEnglish ? 'Remove' : 'Hapus'}</span>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Read-Only Partner Financial Status (Strictly Non-Editable) */}
          <section
            aria-label={isEnglish ? 'Read-only partner financial status' : 'Status keuangan mitra hanya baca'}
            className="box-border w-full max-w-full min-w-0 space-y-4 rounded-xl border border-default bg-surface p-4 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-default pb-3">
              <div>
                <h2 className="flex items-center gap-2 font-sans text-lg font-bold text-primary">
                  <ShieldCheck className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    {isEnglish
                      ? 'Partner Financial Status'
                      : 'Ringkasan Keuangan Mitra'}
                  </span>
                </h2>
                <p className="mt-0.5 text-xs text-secondary">
                  {isEnglish
                    ? 'Commission rate & settlement figures are locked and audited by ViciTech OS.'
                    : 'Tarif komisi dan pencairan bersifat tetap (hanya baca) di bawah audit ViciTech OS.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-default bg-canvas px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">
                  <Lock className="h-3 w-3 text-accent-cta" aria-hidden="true" />
                  <span>Immutable Ledger · Read-Only</span>
                </span>
                <span className="vt-badge-simulated">Simulated / Demo</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border border-default bg-canvas p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  {isEnglish ? 'Gross Sales' : 'Omzet Kotor'}
                </p>
                <p className="mt-1.5 font-mono text-sm font-bold tabular-nums text-primary sm:text-base">
                  {formatIdr(partnerSummary.grossSales)}
                </p>
              </div>
              <div className="rounded-lg border border-default bg-canvas p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  {isEnglish ? 'Platform Fee' : 'Komisi Platform'} (
                  {(partnerSummary.commissionRate * 100).toFixed(1)}%)
                </p>
                <p className="mt-1.5 font-mono text-sm font-bold tabular-nums text-primary sm:text-base">
                  {formatIdr(partnerSummary.platformFee)}
                </p>
              </div>
              <div className="rounded-lg border border-default bg-canvas p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  {isEnglish ? 'Pending Escrow' : 'Escrow Tertahan'}
                </p>
                <p className="mt-1.5 font-mono text-sm font-bold tabular-nums text-primary sm:text-base">
                  {formatIdr(partnerSummary.pendingEscrow)}
                </p>
              </div>
              <div className="rounded-lg border border-default bg-accent-subtle p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-hover">
                  {isEnglish ? 'Settled Payout' : 'Dana Tersedia'}
                </p>
                <p className="mt-1.5 font-mono text-sm font-bold tabular-nums text-primary sm:text-base">
                  {formatIdr(partnerSummary.settledPayout)}
                </p>
              </div>
            </div>

            {partnerLedger.length === 0 ? (
              <p className="rounded-lg border border-dashed border-default bg-canvas p-4 text-xs text-secondary">
                {isEnglish
                  ? 'No settled or escrow ledger entries for this partner profile yet.'
                  : 'Belum ada entri buku besar pencairan untuk profil mitra ini.'}
              </p>
            ) : (
              <ul className="divide-y divide-default rounded-lg border border-default bg-canvas">
                {partnerLedger.map((entry) => {
                  const status = settlementMeta(entry.settlementStatus, isEnglish);
                  return (
                    <li
                      key={entry.id}
                      className="flex flex-col gap-2 px-3.5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-primary">{entry.id}</span>
                          <span className="font-mono text-secondary">{entry.orderRef}</span>
                          <span className={status.cls}>{status.label}</span>
                        </div>
                        <p className="mt-1 truncate font-medium text-primary">{entry.productTitle}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-secondary">
                          {formatLedgerDate(entry.recordedAt, isEnglish)} · Hash {entry.auditHash}
                        </p>
                      </div>
                      <div className="shrink-0 text-left font-mono tabular-nums sm:text-right">
                        <p className="text-sm font-bold text-primary">
                          {formatIdr(entry.netPartnerAmount)}
                        </p>
                        <p className="text-[11px] text-secondary">
                          {isEnglish ? 'Gross' : 'Kotor'} {formatIdr(entry.grossAmount)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
