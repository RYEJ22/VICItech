'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import {
  BadgeCheck,
  Download,
  Lock,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  DEMO_PARTNER_LISTINGS,
  DEMO_PARTNER_PROFILES,
  IMMUTABLE_PARTNER_LEDGER_ENTRIES,
  PARTNER_LISTINGS_STORAGE_KEY,
  PARTNER_LISTINGS_UPDATED_EVENT,
  buildPartnerAuditCsv,
  computePartnerFinancialSummaries,
  formatIdr,
  formatLedgerDate,
  getCombinedPartnerListings,
} from '@/lib/partners/partner-commerce';
import type {
  PartnerListingRecord,
  PartnerSettlementStatus,
} from '@/lib/partners/partner-commerce';

type SettlementFilter = 'all' | PartnerSettlementStatus;

function settlementBadge(
  status: PartnerSettlementStatus,
  isEnglish: boolean,
): { readonly label: string; readonly cls: string } {
  if (status === 'settled') {
    return { label: isEnglish ? 'Settled' : 'Cair / Settled', cls: 'vt-badge-live' };
  }
  if (status === 'pending_escrow') {
    return {
      label: isEnglish ? 'Pending Escrow' : 'Escrow Tertahan',
      cls: 'vt-badge-simulated',
    };
  }
  return { label: isEnglish ? 'QC Hold' : 'Ditahan QC', cls: 'vt-badge-sample' };
}

export function PartnerFinancialAuditPanel(): ReactElement {
  const { isEnglish } = useLanguage();
  const [listings, setListings] = useState<readonly PartnerListingRecord[]>(DEMO_PARTNER_LISTINGS);
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<SettlementFilter>('all');

  useEffect(() => {
    const sync = () => {
      setListings(getCombinedPartnerListings());
    };
    sync();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === PARTNER_LISTINGS_STORAGE_KEY) {
        sync();
      }
    };

    window.addEventListener(PARTNER_LISTINGS_UPDATED_EVENT, sync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(PARTNER_LISTINGS_UPDATED_EVENT, sync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const partnerSummaries = useMemo(
    () =>
      computePartnerFinancialSummaries(
        IMMUTABLE_PARTNER_LEDGER_ENTRIES,
        DEMO_PARTNER_PROFILES,
        listings,
      ),
    [listings],
  );

  const filteredSummaries = useMemo(
    () =>
      partnerFilter === 'all'
        ? partnerSummaries
        : partnerSummaries.filter((item) => item.partnerId === partnerFilter),
    [partnerFilter, partnerSummaries],
  );

  const filteredLedger = useMemo(
    () =>
      IMMUTABLE_PARTNER_LEDGER_ENTRIES.filter((entry) => {
        if (partnerFilter !== 'all' && entry.partnerId !== partnerFilter) return false;
        if (statusFilter !== 'all' && entry.settlementStatus !== statusFilter) return false;
        return true;
      }),
    [partnerFilter, statusFilter],
  );

  const totals = useMemo(
    () =>
      filteredSummaries.reduce(
        (acc, item) => ({
          grossSales: acc.grossSales + item.grossSales,
          platformFee: acc.platformFee + item.platformFee,
          pendingEscrow: acc.pendingEscrow + item.pendingEscrow,
          settledPayout: acc.settledPayout + item.settledPayout,
        }),
        { grossSales: 0, platformFee: 0, pendingEscrow: 0, settledPayout: 0 },
      ),
    [filteredSummaries],
  );

  const handleExportCsv = (): void => {
    const csv = buildPartnerAuditCsv(filteredSummaries, filteredLedger, isEnglish);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'vicitech-partner-financial-audit.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-labelledby="admin-partner-audit-heading"
      className="box-border w-full max-w-full min-w-0 space-y-5 rounded-xl border border-default bg-surface p-4 shadow-sm sm:p-6"
    >
      {/* Header + Tamper-Evident Lock Badges + Actions */}
      <div className="flex flex-col gap-4 border-b border-default pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
              <Store className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>{isEnglish ? 'Partner Financial Audit' : 'Audit Keuangan Mitra'}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-default bg-canvas px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
              <Lock className="h-3 w-3 text-accent-cta" aria-hidden="true" />
              <span>Immutable Ledger · Read-Only</span>
            </span>
            <span className="vt-badge-simulated">Simulated / Demo</span>
          </div>
          <h2
            id="admin-partner-audit-heading"
            className="font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl"
          >
            {isEnglish
              ? 'Partner Financial Status & Settlement Ledger'
              : 'Status Keuangan Mitra & Buku Besar Pencairan'}
          </h2>
          <p className="max-w-[68ch] text-xs leading-relaxed text-secondary sm:text-sm">
            {isEnglish
              ? 'Tamper-evident read-only view of partner gross sales, ViciTech platform fees, pending escrow holds, and settled payouts. Manual balance overrides are disabled.'
              : 'Tampilan audit hanya-baca untuk penjualan kotor mitra, komisi platform ViciTech, dana escrow tertahan, dan pencairan bersih. Perubahan saldo manual dinonaktifkan.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={isEnglish ? 'Filter by partner' : 'Filter berdasarkan mitra'}
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="min-h-11 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary outline-none focus:border-accent-primary"
          >
            <option value="all">{isEnglish ? 'All Partners' : 'Semua Mitra'}</option>
            {partnerSummaries.map((p) => (
              <option key={p.partnerId} value={p.partnerId}>
                {p.partnerName}
              </option>
            ))}
          </select>

          <select
            aria-label={isEnglish ? 'Filter by settlement status' : 'Filter status pencairan'}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SettlementFilter)}
            className="min-h-11 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary outline-none focus:border-accent-primary"
          >
            <option value="all">{isEnglish ? 'All Statuses' : 'Semua Status'}</option>
            <option value="settled">{isEnglish ? 'Settled' : 'Tercairkan'}</option>
            <option value="pending_escrow">{isEnglish ? 'Pending Escrow' : 'Escrow Tertahan'}</option>
            <option value="qc_hold">{isEnglish ? 'QC Hold' : 'Ditahan QC'}</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="vt-motion-press vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>{isEnglish ? 'Export Audit CSV' : 'Ekspor Audit CSV'}</span>
          </button>
        </div>
      </div>

      {/* Ecosystem Read-Only Totals */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="rounded-lg border border-default bg-canvas p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
            {isEnglish ? 'Partner Gross Sales' : 'Penjualan Kotor Mitra'}
          </p>
          <p className="mt-2 font-mono text-base font-bold tabular-nums text-primary sm:text-xl">
            {formatIdr(totals.grossSales)}
          </p>
        </article>
        <article className="rounded-lg border border-default bg-canvas p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
            {isEnglish ? 'Platform Commission' : 'Komisi Platform'}
          </p>
          <p className="mt-2 font-mono text-base font-bold tabular-nums text-primary sm:text-xl">
            {formatIdr(totals.platformFee)}
          </p>
        </article>
        <article className="rounded-lg border border-default bg-canvas p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
            {isEnglish ? 'Pending Escrow' : 'Escrow Tertahan'}
          </p>
          <p className="mt-2 font-mono text-base font-bold tabular-nums text-primary sm:text-xl">
            {formatIdr(totals.pendingEscrow)}
          </p>
        </article>
        <article className="rounded-lg border border-default bg-accent-subtle p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-hover">
            {isEnglish ? 'Settled Payouts' : 'Pencairan Selesai'}
          </p>
          <p className="mt-2 font-mono text-base font-bold tabular-nums text-primary sm:text-xl">
            {formatIdr(totals.settledPayout)}
          </p>
        </article>
      </div>

      {/* Per-Partner Breakdown: Desktop Table + Mobile Stacked Cards */}
      <div className="overflow-hidden rounded-xl border border-default bg-canvas">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-surface px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            {isEnglish ? 'Per-Partner Financial Summary (Read-Only)' : 'Ringkasan per Mitra (Hanya Baca)'}
          </h3>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-status-live" aria-hidden="true" />
            <span>{filteredSummaries.length} {isEnglish ? 'partners audited' : 'mitra diaudit'}</span>
          </span>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full table-auto text-left text-xs">
            <thead className="border-b border-default bg-surface text-[11px] font-semibold uppercase tracking-wider text-secondary">
              <tr>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Partner' : 'Mitra'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Rate' : 'Komisi'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'SKUs' : 'SKU'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Gross Sales' : 'Omzet Kotor'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Platform Fee' : 'Komisi'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Pending Escrow' : 'Escrow'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Settled Payout' : 'Dana Cair'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
              {filteredSummaries.map((row) => (
                <tr key={row.partnerId} className="hover:bg-surface/80">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-semibold text-primary">
                      <span>{row.partnerName}</span>
                      {row.isVerified && (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent-cta" aria-hidden="true" />
                      )}
                    </span>
                    <span className="text-[11px] text-secondary">{row.partnerCity}</span>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-secondary">
                    {(row.commissionRate * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-primary">
                    {row.activeListings}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold tabular-nums text-primary">
                    {formatIdr(row.grossSales)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-secondary">
                    {formatIdr(row.platformFee)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-primary">
                    {formatIdr(row.pendingEscrow)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold tabular-nums text-primary">
                    {formatIdr(row.settledPayout)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-default lg:hidden">
          {filteredSummaries.map((row) => (
            <li key={row.partnerId} className="space-y-2.5 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-primary">
                    <span className="truncate">{row.partnerName}</span>
                    {row.isVerified && (
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent-cta" aria-hidden="true" />
                    )}
                  </p>
                  <p className="text-[11px] text-secondary">
                    {row.partnerCity} · {(row.commissionRate * 100).toFixed(1)}% fee · {row.activeListings} SKU
                  </p>
                </div>
                <span className="vt-badge-simulated shrink-0">Read-Only</span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[10px] uppercase text-secondary">{isEnglish ? 'Gross' : 'Kotor'}</dt>
                  <dd className="font-mono font-semibold tabular-nums text-primary">{formatIdr(row.grossSales)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-secondary">{isEnglish ? 'Fee' : 'Komisi'}</dt>
                  <dd className="font-mono tabular-nums text-secondary">{formatIdr(row.platformFee)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-secondary">{isEnglish ? 'Escrow' : 'Escrow'}</dt>
                  <dd className="font-mono tabular-nums text-primary">{formatIdr(row.pendingEscrow)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-secondary">{isEnglish ? 'Settled' : 'Cair'}</dt>
                  <dd className="font-mono font-bold tabular-nums text-primary">{formatIdr(row.settledPayout)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>

      {/* Immutable Ledger Entries: Desktop Table + Mobile Stacked Cards */}
      <div className="overflow-hidden rounded-xl border border-default bg-canvas">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-surface px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            {isEnglish ? 'Immutable Transaction Ledger' : 'Buku Besar Transaksi (Tak Dapat Diubah)'}
          </h3>
          <span className="font-mono text-[11px] text-secondary">
            {filteredLedger.length} {isEnglish ? 'entries' : 'entri'}
          </span>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full table-auto text-left text-xs">
            <thead className="border-b border-default bg-surface text-[11px] font-semibold uppercase tracking-wider text-secondary">
              <tr>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Ledger & Hash' : 'ID & Hash Audit'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Partner' : 'Mitra'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Order & Listing' : 'Order & Produk'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Gross' : 'Kotor'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Fee' : 'Komisi'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Net Payout' : 'Hak Mitra'}</th>
                <th scope="col" className="px-4 py-3">{isEnglish ? 'Status' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
              {filteredLedger.map((entry) => {
                const badge = settlementBadge(entry.settlementStatus, isEnglish);
                return (
                  <tr key={entry.id} className="hover:bg-surface/80">
                    <td className="px-4 py-3">
                      <span className="block font-mono font-bold text-primary">{entry.id}</span>
                      <span className="block font-mono text-[10px] text-secondary">{entry.auditHash}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-primary">{entry.partnerName}</span>
                      <span className="text-[11px] text-secondary">{entry.partnerCity}</span>
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <span className="block font-mono text-[11px] font-semibold text-primary">
                        {entry.orderRef}
                      </span>
                      <span className="block truncate text-secondary">{entry.productTitle}</span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-primary">
                      {formatIdr(entry.grossAmount)}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-secondary">
                      {formatIdr(entry.platformFee)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tabular-nums text-primary">
                      {formatIdr(entry.netPartnerAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={badge.cls}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-default lg:hidden">
          {filteredLedger.map((entry) => {
            const badge = settlementBadge(entry.settlementStatus, isEnglish);
            return (
              <li key={entry.id} className="space-y-2 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{entry.id}</span>
                  <span className={badge.cls}>{badge.label}</span>
                </div>
                <p className="text-xs font-semibold text-primary">{entry.partnerName}</p>
                <p className="break-words text-xs text-secondary">
                  {entry.orderRef} · {entry.productTitle}
                </p>
                <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1 font-mono text-xs tabular-nums">
                  <span className="text-primary">
                    {isEnglish ? 'Net' : 'Bersih'}: <strong>{formatIdr(entry.netPartnerAmount)}</strong>
                  </span>
                  <span className="text-[11px] text-secondary">
                    {isEnglish ? 'Fee' : 'Komisi'}: {formatIdr(entry.platformFee)}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-secondary">
                  {formatLedgerDate(entry.recordedAt, isEnglish)} · {entry.auditHash}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
