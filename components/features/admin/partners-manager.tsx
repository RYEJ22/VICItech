'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import type { ReactElement } from 'react';
import {
  deletePartnerAction,
  togglePartnerVerifiedAction,
} from '@/app/admin/partners/actions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  PARTNER_TYPE_LABELS,
  PARTNER_TYPES,
} from '@/lib/admin/partners-validation';
import type { PartnerRow, PartnerType } from '@/lib/admin/partners-validation';

const AdminConfirmDialog = dynamic(
  () => import('./admin-confirm-dialog').then((mod) => mod.AdminConfirmDialog),
  { ssr: false },
);
const PartnerEditorDrawer = dynamic(
  () => import('./partner-editor-drawer').then((mod) => mod.PartnerEditorDrawer),
  { ssr: false },
);

const PAGE_SIZE = 20;

interface PartnersManagerProps {
  readonly initialPartners: readonly PartnerRow[];
  readonly initialError?: string | null;
}

type VerifiedFilter = 'all' | 'verified' | 'unverified';

export function PartnersManager({
  initialPartners,
  initialError = null,
}: PartnersManagerProps): ReactElement {
  const [partners, setPartners] = useState<readonly PartnerRow[]>(initialPartners);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [typeFilter, setTypeFilter] = useState<'all' | PartnerType>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('all');
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerRow | null>(null);
  const [deletingPartner, setDeletingPartner] = useState<PartnerRow | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const [busyId, setBusyId] = useState('');
  const [errorMessage, setErrorMessage] = useState(initialError ?? '');
  const [notice, setNotice] = useState('');
  const [isPending, startTransition] = useTransition();

  const filteredPartners = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return partners.filter((partner) => {
      if (typeFilter !== 'all' && partner.type !== typeFilter) return false;
      if (verifiedFilter === 'verified' && !partner.is_verified) return false;
      if (verifiedFilter === 'unverified' && partner.is_verified) return false;
      if (!query) return true;
      return `${partner.name} ${partner.city} ${partner.address}`.toLowerCase().includes(query);
    });
  }, [debouncedSearch, partners, typeFilter, verifiedFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, verifiedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedPartners = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredPartners.slice(start, start + PAGE_SIZE);
  }, [filteredPartners, safePage]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingPartner(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeletingPartner(null);
    setDeleteError('');
  }, []);

  const counts = useMemo(() => {
    const verified = partners.filter((p) => p.is_verified).length;
    const serviceCenters = partners.filter((p) => p.type === 'service_center').length;
    const componentStores = partners.filter((p) => p.type === 'toko_komponen').length;
    return {
      total: partners.length,
      verified,
      serviceCenters,
      componentStores,
    };
  }, [partners]);

  const openCreateDrawer = () => {
    setEditingPartner(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (partner: PartnerRow) => {
    setEditingPartner(partner);
    setDrawerOpen(true);
  };

  const handleSaved = (saved: PartnerRow, mode: 'create' | 'edit') => {
    setPartners((current) =>
      mode === 'create'
        ? [saved, ...current]
        : current.map((row) => (row.id === saved.id ? saved : row)),
    );
    setDrawerOpen(false);
    setEditingPartner(null);
    setErrorMessage('');
    setNotice(
      mode === 'create'
        ? `Mitra "${saved.name}" di ${saved.city} berhasil ditambahkan.`
        : `Data mitra "${saved.name}" telah diperbarui.`,
    );
  };

  const handleToggleVerified = (partner: PartnerRow) => {
    setBusyId(partner.id);
    setErrorMessage('');
    setNotice('');
    startTransition(async () => {
      const result = await togglePartnerVerifiedAction(partner.id, !partner.is_verified);
      setBusyId('');
      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }
      setPartners((current) =>
        current.map((row) => (row.id === partner.id ? result.data : row)),
      );
      setNotice(
        `${partner.name} sekarang berstatus ${
          result.data.is_verified ? 'Terverifikasi' : 'Belum Terverifikasi'
        }.`,
      );
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingPartner) return;
    const target = deletingPartner;
    setDeleteError('');
    setBusyId(target.id);
    startTransition(async () => {
      const result = await deletePartnerAction(target.id);
      setBusyId('');
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      setPartners((current) => current.filter((row) => row.id !== target.id));
      setDeletingPartner(null);
      setNotice(`Mitra "${target.name}" telah dihapus.`);
    });
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setVerifiedFilter('all');
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
            <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Jaringan Ekosistem Regional</span>
          </span>
          <h1 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            Manajemen Mitra &amp; Service
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm text-secondary">
            Kelola direktori resmi Service Center dan Toko Komponen ViciTech di seluruh kota.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-cta-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span>Tambah Mitra</span>
        </button>
      </header>

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-default bg-ink p-4 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">Total Mitra</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
            {counts.total.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-white/70">Terdaftar di `public.partners`</p>
        </article>
        <article className="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">Terverifikasi</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-primary">
            {counts.verified.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-secondary">Menampilkan badge terpercaya</p>
        </article>
        <article className="rounded-xl border border-default bg-surface p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">Service Center</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-primary">
            {counts.serviceCenters.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-secondary">Hub diagnostik &amp; repaste</p>
        </article>
        <article className="rounded-xl border border-default bg-accent-subtle p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-hover">Toko Komponen</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-primary">
            {counts.componentStores.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-secondary">Mitra pengadaan part lokal</p>
        </article>
      </div>

      {/* Feedback */}
      {errorMessage ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-status-danger/30 bg-red-50 p-3.5 text-sm text-status-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-default bg-surface p-3.5 text-sm text-primary shadow-sm"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-status-live" strokeWidth={1.75} aria-hidden="true" />
            <span>{notice}</span>
          </span>
          <button
            type="button"
            onClick={() => setNotice('')}
            className="text-xs font-medium text-secondary hover:text-primary"
          >
            Tutup
          </button>
        </div>
      ) : null}

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-default bg-surface p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_200px_200px_auto]">
        <div className="relative">
          <label htmlFor="partners-search" className="sr-only">
            Cari nama mitra, kota, atau alamat
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            id="partners-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama mitra, kota, atau alamat…"
            className="min-h-11 w-full rounded-lg border border-default bg-canvas py-2 pl-9 pr-3 text-sm text-primary outline-none placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          />
        </div>

        <label>
          <span className="sr-only">Filter tipe mitra</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as 'all' | PartnerType)}
            className="min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          >
            <option value="all">Semua Tipe Mitra</option>
            {PARTNER_TYPES.map((item) => (
              <option key={item} value={item}>
                {PARTNER_TYPE_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter verifikasi</span>
          <select
            value={verifiedFilter}
            onChange={(event) => setVerifiedFilter(event.target.value as VerifiedFilter)}
            className="min-h-11 w-full rounded-lg border border-default bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
          >
            <option value="all">Semua Status</option>
            <option value="verified">Terverifikasi</option>
            <option value="unverified">Belum Verifikasi</option>
          </select>
        </label>

        {(search || typeFilter !== 'all' || verifiedFilter !== 'all') ? (
          <button
            type="button"
            onClick={resetFilters}
            aria-label="Reset filter mitra"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-secondary transition hover:border-accent-primary/45 hover:text-primary"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Table / Cards */}
      <div className="overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default bg-canvas/60 px-4 py-3 text-xs font-medium text-secondary">
          <span>
            Menampilkan <strong className="font-mono text-primary">{paginatedPartners.length}</strong> dari{' '}
            <strong className="font-mono text-primary">{filteredPartners.length}</strong> mitra
            {filteredPartners.length !== partners.length
              ? ` (total ${partners.length})`
              : ''}
          </span>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                aria-label="Halaman mitra sebelumnya"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-default bg-surface text-primary transition hover:border-accent-primary/45 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <span className="font-mono text-xs tabular-nums text-secondary">
                Halaman {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage >= totalPages}
                aria-label="Halaman mitra berikutnya"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-default bg-surface text-primary transition hover:border-accent-primary/45 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {filteredPartners.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-serif text-lg font-semibold text-primary">
              {partners.length ? 'Tidak ada mitra yang sesuai' : 'Belum ada mitra terdaftar'}
            </p>
            <p className="mx-auto mt-1.5 max-w-[56ch] text-sm text-secondary">
              {partners.length
                ? 'Ubah kata kunci pencarian atau reset filter untuk melihat seluruh direktori mitra.'
                : 'Daftarkan Service Center atau Toko Komponen pertama Anda sekarang.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full table-auto text-left text-sm">
                <thead className="border-b border-default bg-canvas text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3">Nama Mitra &amp; Alamat</th>
                    <th scope="col" className="px-4 py-3">Tipe &amp; Kota</th>
                    <th scope="col" className="px-4 py-3">Kontak &amp; Peta</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {paginatedPartners.map((partner) => {
                    const rowBusy = isPending && busyId === partner.id;
                    return (
                      <tr key={partner.id} className="transition-colors hover:bg-canvas/70">
                        <td className="max-w-[360px] px-4 py-3.5">
                          <p className="font-semibold text-primary">{partner.name}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                            {partner.address}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="inline-flex rounded-md border border-default bg-canvas px-2 py-0.5 text-xs font-semibold text-primary">
                            {PARTNER_TYPE_LABELS[partner.type]}
                          </span>
                          <p className="mt-1 text-xs font-medium text-secondary">{partner.city}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                          <div className="flex flex-col gap-1">
                            {partner.whatsapp_number ? (
                              <span className="inline-flex items-center gap-1.5 font-mono text-primary">
                                <Phone className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                                +{partner.whatsapp_number}
                              </span>
                            ) : (
                              <span className="text-secondary">—</span>
                            )}
                            {partner.gmaps_url ? (
                              <a
                                href={partner.gmaps_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-accent-hover hover:underline"
                              >
                                <span>Buka Maps</span>
                                <ExternalLink className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                              </a>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          {partner.is_verified ? (
                            <span className="vt-badge-live">
                              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                              Terverifikasi
                            </span>
                          ) : (
                            <span className="vt-badge-sample">
                              <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                              Draft / Non-aktif
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleVerified(partner)}
                              disabled={rowBusy}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle disabled:opacity-50"
                            >
                              {partner.is_verified ? 'Cabut Verifikasi' : 'Verifikasi'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditDrawer(partner)}
                              disabled={rowBusy}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError('');
                                setDeletingPartner(partner);
                              }}
                              disabled={rowBusy}
                              aria-label={`Hapus mitra ${partner.name}`}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-secondary transition hover:border-status-danger/45 hover:bg-red-50 hover:text-status-danger disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-default lg:hidden">
              {paginatedPartners.map((partner) => {
                const rowBusy = isPending && busyId === partner.id;
                return (
                  <li key={partner.id} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md border border-default bg-canvas px-2 py-0.5 text-xs font-semibold text-primary">
                        {PARTNER_TYPE_LABELS[partner.type]} · {partner.city}
                      </span>
                      {partner.is_verified ? (
                        <span className="vt-badge-live">Terverifikasi</span>
                      ) : (
                        <span className="vt-badge-sample">Draft</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-primary">{partner.name}</p>
                      <p className="mt-0.5 text-xs text-secondary">{partner.address}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleVerified(partner)}
                        disabled={rowBusy}
                        className="inline-flex min-h-11 items-center rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary"
                      >
                        {partner.is_verified ? 'Cabut Verifikasi' : 'Verifikasi'}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(partner)}
                          disabled={rowBusy}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3.5 py-2 text-xs font-semibold text-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('');
                            setDeletingPartner(partner);
                          }}
                          disabled={rowBusy}
                          aria-label={`Hapus mitra ${partner.name}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-secondary hover:border-status-danger/45 hover:bg-red-50 hover:text-status-danger"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {drawerOpen ? (
        <PartnerEditorDrawer
          open={drawerOpen}
          partner={editingPartner}
          onClose={handleCloseDrawer}
          onSaved={handleSaved}
        />
      ) : null}

      {deletingPartner ? (
        <AdminConfirmDialog
          open={Boolean(deletingPartner)}
          title="Hapus Mitra Permanen?"
          description={`Mitra "${deletingPartner.name}" (${deletingPartner.city}) akan dihapus dari direktori public.partners.`}
          confirmLabel="Hapus Mitra"
          isBusy={Boolean(isPending && busyId === deletingPartner.id)}
          errorMessage={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      ) : null}
    </section>
  );
}
