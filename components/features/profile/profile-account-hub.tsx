'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  LayoutGrid,
  LoaderCircle,
  MessageSquare,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sliders,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { loadMidtransSnap } from '@/lib/payments/load-midtrans-snap';
import {
  forceResetAuthSession,
  getSupabaseBrowserClient,
  isSupabaseAuthConfigured,
} from '@/lib/supabase/client';
import {
  cancelUserOrder,
  fetchOwnProfile,
  fetchProfileWorkspaceData,
  fetchPublicProfileByUsername,
} from '@/lib/profile/profile-service';
import {
  formatProfileFullDate,
  formatProfileIdr,
  getOrderStatusMeta,
  parseProfileTabParam,
} from '@/lib/profile/profile-types';
import type {
  ProfileOrderRecord,
  ProfileTabId,
  ProfileWorkspaceData,
  UnifiedProfile,
} from '@/lib/profile/profile-types';
import { CancelOrderModal } from './cancel-order-modal';
import { ProfileCustomizationTab } from './profile-customization-tab';
import { ProfileHeaderCard } from './profile-header-card';
import styles from './profile-hub.module.css';

interface AuthSnapshotUser {
  readonly id: string;
  readonly email?: string | undefined;
  readonly created_at?: string | undefined;
  readonly user_metadata?: unknown;
}

interface ProfileAccountHubProps {
  readonly mode: 'self' | 'public';
  readonly targetUsername?: string | undefined;
  readonly initialTab?: string | undefined;
  readonly user?: AuthSnapshotUser | null | undefined;
  readonly isAuthLoading?: boolean | undefined;
  readonly onReconfigurePreset?: ((preset: { readonly name: string }) => void) | undefined;
  readonly onNavigateModule?: ((moduleId: string, viewOrData?: unknown) => void) | undefined;
  readonly onSignOut?: (() => Promise<void> | void) | undefined;
}

const COMMUNITY_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  build_showcase: 'Showcase Rakitan',
  general: 'Panduan & Diskusi',
  troubleshooting: 'Tanya Jawab',
  news: 'Info Resmi',
};

const EMPTY_WORKSPACE: ProfileWorkspaceData = {
  posts: [],
  sharedBuilds: [],
  presets: [],
  orders: [],
  qcReports: [],
  stats: { communityPosts: 0, savedPresets: 0, sharedBuilds: 0 },
};

const focusRing =
  'vt-motion-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function toAuthSnapshotUser(raw: unknown): AuthSnapshotUser | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  return {
    id: raw.id,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    user_metadata: raw.user_metadata,
  };
}

export function ProfileAccountHub({
  mode,
  targetUsername,
  initialTab,
  user: externalUser,
  isAuthLoading: externalAuthLoading,
  onReconfigurePreset,
  onNavigateModule,
  onSignOut: externalSignOut,
}: ProfileAccountHubProps): ReactElement {
  const router = useRouter();
  const usesExternalAuth = externalUser !== undefined;

  const [internalUser, setInternalUser] = useState<AuthSnapshotUser | null>(null);
  const [internalAuthLoading, setInternalAuthLoading] = useState<boolean>(!usesExternalAuth);

  const activeUser = usesExternalAuth ? (externalUser ?? null) : internalUser;
  const authLoading = usesExternalAuth ? Boolean(externalAuthLoading) : internalAuthLoading;

  const [profile, setProfile] = useState<UnifiedProfile | null>(null);
  const [workspace, setWorkspace] = useState<ProfileWorkspaceData>(EMPTY_WORKSPACE);
  const [status, setStatus] = useState<'loading' | 'signed-out' | 'not-found' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<ProfileTabId>(() =>
    parseProfileTabParam(initialTab, true),
  );
  const [toast, setToast] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<ProfileOrderRecord | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [cancelOrderError, setCancelOrderError] = useState('');
  const [payingOrderId, setPayingOrderId] = useState('');
  const [deletingOrderId, setDeletingOrderId] = useState('');

  const activeUserRef = useRef<AuthSnapshotUser | null>(activeUser);
  activeUserRef.current = activeUser;
  const loadedProfileIdRef = useRef<string | null>(null);
  const hasInitializedTabRef = useRef<boolean>(false);

  useEffect(() => {
    if (!initialTab) return;
    const isOwnerView = Boolean(
      activeUserRef.current &&
        (!loadedProfileIdRef.current || activeUserRef.current.id === loadedProfileIdRef.current),
    );
    setActiveTab(parseProfileTabParam(initialTab, isOwnerView));
  }, [initialTab]);

  // Sync auth automatically when rendered standalone at /profile or /profile/[username]
  useEffect(() => {
    if (usesExternalAuth) return undefined;
    if (!isSupabaseAuthConfigured) {
      setInternalUser(null);
      setInternalAuthLoading(false);
      return undefined;
    }

    let active = true;
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setInternalAuthLoading(false);
      return undefined;
    }

    const handleSession = (sessionUser: unknown) => {
      if (!active) return;
      const nextSnapshot = toAuthSnapshotUser(sessionUser);
      setInternalUser((prev) => {
        if (!prev && !nextSnapshot) return null;
        if (prev && nextSnapshot && prev.id === nextSnapshot.id && prev.email === nextSnapshot.email) {
          return prev;
        }
        return nextSnapshot;
      });
      setInternalAuthLoading(false);
    };

    void supabase.auth.getSession().then((res: unknown) => {
      const data = isRecord(res) && isRecord(res.data) ? res.data : null;
      const session = data && isRecord(data.session) ? data.session : null;
      handleSession(session ? session.user : null);
    });

    const { data: subscriptionData } = supabase.auth.onAuthStateChange(
      (_event: unknown, nextSession: unknown) => {
        const session = isRecord(nextSession) ? nextSession : null;
        handleSession(session ? session.user : null);
      },
    );

    const onAuthBroadcast = (event: Event) => {
      if (event instanceof CustomEvent && isRecord(event.detail)) {
        handleSession(event.detail.user);
      }
    };
    window.addEventListener('vicitech:auth-state', onAuthBroadcast);

    return () => {
      active = false;
      subscriptionData?.subscription?.unsubscribe();
      window.removeEventListener('vicitech:auth-state', onAuthBroadcast);
    };
  }, [usesExternalAuth]);

  const activeUserId = activeUser?.id ?? '';

  const loadAll = useCallback(async (options?: { readonly silent?: boolean }) => {
    const currentAuthUser = activeUserRef.current;

    if (authLoading) {
      if (!loadedProfileIdRef.current) setStatus('loading');
      return;
    }

    if (mode === 'self' && !currentAuthUser) {
      loadedProfileIdRef.current = null;
      setProfile(null);
      setWorkspace(EMPTY_WORKSPACE);
      setStatus('signed-out');
      return;
    }

    const isSameLoadedUser =
      Boolean(loadedProfileIdRef.current) &&
      (mode === 'self' ? loadedProfileIdRef.current === currentAuthUser?.id : true);

    if (!options?.silent && !isSameLoadedUser) {
      setStatus('loading');
    }
    setErrorMsg('');

    let loadedProfile: UnifiedProfile | null = null;
    let profileError: string | null = null;

    if (mode === 'self' && currentAuthUser) {
      const res = await fetchOwnProfile(currentAuthUser);
      loadedProfile = res.profile;
      profileError = res.error;
    } else if (mode === 'public') {
      const cleanUsername = targetUsername?.trim() ?? '';
      if (!cleanUsername) {
        setStatus('not-found');
        return;
      }
      const res = await fetchPublicProfileByUsername(cleanUsername);
      loadedProfile = res.profile;
      profileError = res.error;
    }

    if (profileError) {
      setErrorMsg(profileError);
      setStatus('error');
      return;
    }

    if (!loadedProfile) {
      setStatus('not-found');
      return;
    }

    const isOwnerView = Boolean(currentAuthUser && currentAuthUser.id === loadedProfile.id);
    let data: ProfileWorkspaceData;
    try {
      data = await fetchProfileWorkspaceData(loadedProfile.id, isOwnerView);
    } catch (error: unknown) {
      console.error('[ViciTech] Profile workspace fetch threw:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Gagal memuat data profil dan pesanan.');
      setStatus('error');
      return;
    }

    loadedProfileIdRef.current = loadedProfile.id;
    setProfile(loadedProfile);
    setWorkspace(data);

    if (!hasInitializedTabRef.current) {
      hasInitializedTabRef.current = true;
      setActiveTab(parseProfileTabParam(initialTab, isOwnerView));
    } else if (!isOwnerView) {
      setActiveTab('overview');
    }
    setStatus('ready');
  }, [authLoading, mode, activeUserId, targetUsername, initialTab]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (mode !== 'self' || !activeUser?.id || typeof window === 'undefined') return undefined;
    const handleOrderCreated = (): void => {
      void loadAll({ silent: true });
    };
    window.addEventListener('vicitech:order_created', handleOrderCreated);
    return () => window.removeEventListener('vicitech:order_created', handleOrderCreated);
  }, [activeUser?.id, loadAll, mode]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const continuePayment = async (order: ProfileOrderRecord): Promise<void> => {
    const paymentStatus = (order.paymentStatus ?? 'unpaid').toLowerCase();
    const orderStatus = (order.status ?? '').toLowerCase();
    if (
      payingOrderId ||
      orderStatus === 'cancelled' ||
      !['unpaid', 'pending', 'failed', 'expired'].includes(paymentStatus)
    ) return;

    setPayingOrderId(order.id);
    try {
      let token = paymentStatus === 'pending' ? (order.paymentReference ?? '').trim() : '';
      if (!token) {
        const response = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        });
        const result = await response.json() as { token?: string; error?: string };
        if (!response.ok || !result.token) throw new Error(result.error || 'Pembayaran tidak dapat dimulai.');
        token = result.token;
      }
      await loadMidtransSnap();
      if (!window.snap) {
        throw new Error('Jendela pembayaran belum siap. Muat ulang halaman dan coba lagi.');
      }
      window.snap.pay(token, {
        onSuccess: () => {
          setPayingOrderId('');
          setToast('Pembayaran diterima dan sedang diverifikasi.');
          void loadAll({ silent: true });
          router.refresh();
        },
        onPending: () => {
          setPayingOrderId('');
          setToast('Pembayaran masih menunggu penyelesaian.');
          void loadAll({ silent: true });
          router.refresh();
        },
        onError: () => {
          setPayingOrderId('');
          setToast('Pembayaran gagal. Silakan coba lagi.');
        },
        onClose: () => {
          setPayingOrderId('');
          setToast('Pembayaran belum selesai. Anda dapat melanjutkan kapan saja.');
        },
      });
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Pembayaran tidak dapat dimulai.');
    } finally {
      setPayingOrderId('');
    }
  };

  const handleConfirmCancelOrder = async (reason: string): Promise<void> => {
    if (!orderToCancel || !activeUser?.id || isCancellingOrder) return;
    setIsCancellingOrder(true);
    setCancelOrderError('');

    const res = await cancelUserOrder({
      orderId: orderToCancel.id,
      userId: activeUser.id,
      reason,
    });

    setIsCancellingOrder(false);
    if (!res.ok) {
      setCancelOrderError(res.error);
      return;
    }

    setWorkspace((current) => ({
      ...current,
      orders: current.orders.map((ord) =>
        ord.id === orderToCancel.id
          ? {
              ...ord,
              status: res.status,
              cancelReason: res.cancelReason,
              cancelledAt: res.cancelledAt,
            }
          : ord,
      ),
    }));
    setOrderToCancel(null);
    setCancelOrderError('');
    setToast('Pesanan berhasil dibatalkan.');
  };

  const handleDeleteCancelledOrder = async (order: ProfileOrderRecord): Promise<void> => {
    if (order.status !== 'cancelled' || deletingOrderId) return;
    const confirmed = window.confirm('Yakin ingin menghapus pesanan yang dibatalkan ini secara permanen?');
    if (!confirmed) return;

    setDeletingOrderId(order.id);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: 'DELETE' });
      const result = await response.json() as { readonly success?: boolean; readonly error?: string };
      if (!response.ok || result.success !== true) {
        throw new Error(result.error || 'Pesanan tidak dapat dihapus.');
      }
      setWorkspace((current) => ({
        ...current,
        orders: current.orders.filter((currentOrder) => currentOrder.id !== order.id),
      }));
      setToast('Pesanan yang dibatalkan berhasil dihapus.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Pesanan tidak dapat dihapus.');
    } finally {
      setDeletingOrderId('');
    }
  };

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    try {
      if (externalSignOut) {
        await externalSignOut();
      } else {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        await forceResetAuthSession(supabase);
      }
      setInternalUser(null);
      router.refresh();
      router.push('/');
    } catch (err: unknown) {
      setToast(err instanceof Error ? err.message : 'Gagal keluar dari sesi Anda.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const isOwner = Boolean(profile && activeUser && activeUser.id === profile.id);

  if (status === 'loading') {
    return (
      <main className="min-h-[65vh] bg-canvas px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-shell space-y-5">
          <div className="h-44 animate-pulse rounded-xl border border-default bg-surface" />
          <div className="h-12 w-80 animate-pulse rounded-lg bg-surface" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-48 animate-pulse rounded-xl border border-default bg-surface" />
            <div className="h-48 animate-pulse rounded-xl border border-default bg-surface" />
          </div>
        </div>
      </main>
    );
  }

  if (status === 'signed-out') {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-canvas px-4 py-12 text-primary">
        <section className="w-full max-w-lg rounded-xl border border-default bg-surface p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
          <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight text-primary [text-wrap:balance]">
            Masuk untuk membuka Profil &amp; Akun
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Kelola kartu profil publik, pantau pesanan Market dan Trade-In, serta simpan konfigurasi preset setelah masuk lewat tombol Masuk di bilah navigasi.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className={`vt-btn-tactile inline-flex min-h-11 items-center rounded-lg bg-accent-cta px-5 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
            >
              Ke Beranda
            </Link>
            <Link
              href="/community"
              className={`vt-btn-tactile inline-flex min-h-11 items-center rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-subtle ${focusRing}`}
            >
              Lihat Komunitas
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (status === 'not-found') {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-canvas px-4 py-12 text-primary">
        <section className="w-full max-w-lg rounded-xl border border-default bg-surface p-8 text-center shadow-sm">
          <UserRound className="mx-auto h-11 w-11 text-secondary" strokeWidth={1.75} aria-hidden="true" />
          <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight text-primary">
            Profil anggota tidak ditemukan
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">
            Username tersebut belum terdaftar atau telah diubah oleh pemiliknya.
          </p>
          <Link
            href="/community"
            className={`vt-btn-tactile mt-6 inline-flex min-h-11 items-center rounded-lg bg-accent-cta px-5 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
          >
            Kembali ke Komunitas
          </Link>
        </section>
      </main>
    );
  }

  if (status === 'error' || !profile) {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-canvas px-4 py-12">
        <section role="alert" className="w-full max-w-lg rounded-xl border border-red-200 bg-surface p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-800">{errorMsg || 'Terjadi kendala saat memuat profil.'}</p>
          <button
            type="button"
            onClick={() => void loadAll()}
            className={`vt-btn-tactile mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-cta px-5 py-2 text-sm font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Coba Muat Ulang</span>
          </button>
        </section>
      </main>
    );
  }

  const availableTabs: readonly {
    readonly id: ProfileTabId;
    readonly label: string;
    readonly Icon: typeof LayoutGrid;
  }[] = isOwner
    ? [
        { id: 'overview', label: 'Ringkasan & Showcase', Icon: LayoutGrid },
        { id: 'orders', label: 'Pesanan & Trade-In', Icon: Package },
        { id: 'settings', label: 'Kustomisasi & Pengaturan', Icon: Settings },
      ]
    : [{ id: 'overview', label: 'Ringkasan & Showcase', Icon: LayoutGrid }];

  return (
    <main className="min-h-[70vh] bg-canvas text-primary antialiased">
      <div className="mx-auto max-w-shell space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="vt-pop flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" strokeWidth={1.75} aria-hidden="true" />
            <span>{toast}</span>
          </div>
        )}

        <ProfileHeaderCard
          profile={profile}
          stats={{
            communityPosts: workspace.stats.communityPosts,
            savedPresets: workspace.stats.savedPresets,
          }}
          isOwner={isOwner}
          isSigningOut={isSigningOut}
          onEditProfile={isOwner ? () => setActiveTab('settings') : undefined}
          onQuickAvatarPick={isOwner ? () => setActiveTab('settings') : undefined}
          onSignOut={isOwner ? () => void handleSignOut() : undefined}
        />

        {/* Tab Switcher */}
        <div
          role="tablist"
          aria-label="Bagian Profil dan Akun"
          className="flex flex-wrap gap-2 rounded-xl border border-default bg-surface p-2 shadow-sm"
        >
          {availableTabs.map((tab) => {
            const TabIcon = tab.Icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`vt-btn-tactile inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold sm:text-sm ${focusRing} ${
                  selected
                    ? 'bg-accent-cta text-white hover:bg-accent-cta-hover'
                    : 'text-secondary hover:bg-subtle hover:text-primary'
                }`}
              >
                <TabIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview & Showcase (Public) */}
        {activeTab === 'overview' && (
          <section key="overview" className={`grid gap-6 lg:grid-cols-12 ${styles.tabPanel ?? ''}`}>
            <div className="space-y-5 lg:col-span-7">
              <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-default pb-3">
                  <h2 className="tracking-tight flex items-center gap-2 font-sans text-xl font-bold text-primary">
                    <MessageSquare className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                    <span>Postingan Komunitas</span>
                  </h2>
                  <Link
                    href="/community"
                    className={`text-xs font-semibold text-accent-cta hover:underline ${focusRing}`}
                  >
                    Buka Komunitas
                  </Link>
                </div>

                {workspace.posts.length > 0 ? (
                  <ul className="mt-4 divide-y divide-default">
                    {workspace.posts.map((post) => (
                      <li key={post.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <Link
                            href="/community"
                            className="block truncate text-sm font-semibold text-primary hover:text-accent-cta"
                          >
                            {post.title}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-secondary">
                            <span className="rounded-md border border-default bg-subtle px-2 py-0.5 font-medium">
                              {COMMUNITY_CATEGORY_LABELS[post.category] ?? 'Diskusi'}
                            </span>
                            <span className="font-mono tabular-nums">{post.likesCount} suka</span>
                            {post.createdAt && (
                              <span className="font-mono">{formatProfileFullDate(post.createdAt)}</span>
                            )}
                          </div>
                        </div>
                        {post.mediaUrls[0] && (
                          <img
                            src={post.mediaUrls[0]}
                            alt=""
                            width={64}
                            height={48}
                            loading="lazy"
                            decoding="async"
                            className="h-12 w-16 shrink-0 rounded-lg border border-default object-cover"
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-secondary">
                    {isOwner
                      ? 'Belum ada postingan di Komunitas. Bagikan rakitan atau ajukan pertanyaan di Community Hub.'
                      : 'Anggota ini belum menerbitkan postingan di Komunitas.'}
                  </p>
                )}
              </section>
            </div>

            <div className="space-y-5 lg:col-span-5">
              {/* Featured Rig Card */}
              <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
                <h2 className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
                  <Cpu className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                  <span>Perangkat Utama</span>
                </h2>
                {profile.featuredRig ? (
                  <p className="mt-3 rounded-lg border border-default bg-canvas px-3.5 py-2.5 font-mono text-sm text-primary">
                    {profile.featuredRig}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-secondary">
                    {isOwner
                      ? 'Tampilkan spesifikasi PC atau laptop andalan Anda melalui tab Kustomisasi.'
                      : 'Belum mencantumkan perangkat utama.'}
                  </p>
                )}
              </section>

              {/* Saved Presets (Owner) & Shared Builds (Public) */}
              <section className="rounded-xl border border-default bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-default pb-3">
                  <h2 className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
                    <Sliders className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                    <span>{isOwner ? 'Preset & Rakitan Tersimpan' : 'Showcase Rakitan Publik'}</span>
                  </h2>
                  <Link
                    href="/builder"
                    className={`text-xs font-semibold text-accent-cta hover:underline ${focusRing}`}
                  >
                    Preset Builder
                  </Link>
                </div>

                {isOwner && workspace.presets.length > 0 ? (
                  <ul className="mt-3 space-y-2.5">
                    {workspace.presets.map((preset) => (
                      <li
                        key={preset.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default bg-canvas p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-primary">{preset.name}</p>
                          <p className="mt-0.5 font-mono text-xs text-secondary">
                            {preset.role.toUpperCase()} · {preset.partsCount} komponen · {preset.qty} unit ·{' '}
                            {formatProfileIdr(preset.unitTotal)}
                          </p>
                        </div>
                        {onReconfigurePreset ? (
                          <button
                            type="button"
                            onClick={() => onReconfigurePreset(preset)}
                            className={`vt-btn-tactile min-h-11 rounded-lg border border-default bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-subtle ${focusRing}`}
                          >
                            Buka di Builder
                          </button>
                        ) : (
                          <Link
                            href="/builder"
                            className={`vt-btn-tactile inline-flex min-h-11 items-center rounded-lg border border-default bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-subtle ${focusRing}`}
                          >
                            Buka di Builder
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : workspace.sharedBuilds.length > 0 ? (
                  <ul className="mt-3 divide-y divide-default">
                    {workspace.sharedBuilds.map((build) => (
                      <li key={build.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="truncate font-medium text-primary">{build.title}</span>
                        <span className="shrink-0 font-mono text-xs text-secondary">
                          {formatProfileFullDate(build.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-secondary">
                    {isOwner
                      ? 'Belum ada preset tersimpan. Susun konfigurasi pertama Anda di Preset Builder.'
                      : 'Belum ada showcase rakitan publik yang dibagikan.'}
                  </p>
                )}
              </section>
            </div>
          </section>
        )}

        {/* Tab 2: Orders & Trade-In (Owner Only) */}
        {isOwner && activeTab === 'orders' && (
          <section key="orders" className={`grid gap-6 lg:grid-cols-12 ${styles.tabPanel ?? ''}`}>
            <div className="space-y-4 rounded-xl border border-default bg-surface p-5 shadow-sm lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
                <h2 className="tracking-tight flex items-center gap-2 font-sans text-xl font-bold text-primary">
                  <Package className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                  <span>Riwayat Pesanan Market &amp; Preset</span>
                </h2>
                <Link
                  href="/market"
                  className={`inline-flex items-center gap-1 text-xs font-semibold text-accent-cta hover:underline ${focusRing}`}
                >
                  <span>Jelajahi Market</span>
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>

              {workspace.orders.length > 0 ? (
                <ul className="space-y-3">
                  {workspace.orders.map((order) => {
                    const statusMeta = getOrderStatusMeta(order.status ?? '');
                    const paymentStatus = (order.paymentStatus ?? 'unpaid').toLowerCase();
                    const paymentLabel = paymentStatus === 'paid'
                      ? 'Lunas'
                      : paymentStatus === 'expired'
                        ? 'Kadaluarsa'
                        : paymentStatus === 'failed'
                          ? 'Gagal'
                          : 'Menunggu Pembayaran';
                    const canPay = !statusMeta.isCancelled &&
                      ['unpaid', 'pending', 'failed', 'expired'].includes(paymentStatus);
                    const showPaymentBadge = statusMeta.label !== paymentLabel;
                    return (
                      <li
                        key={order.id}
                        className="vt-card-lift rounded-lg border border-default bg-canvas p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {showPaymentBadge && (
                                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${paymentStatus === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : paymentStatus === 'expired' || paymentStatus === 'failed' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                                  {paymentLabel}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${statusMeta.badgeClass}`}
                              >
                                {statusMeta.label}
                              </span>
                              <span className="font-mono text-xs text-secondary">
                                {order.orderNumber || order.id}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm font-semibold text-primary">
                              {order.productName}
                            </p>
                            {order.itemsSummary.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5 text-xs text-secondary">
                                {order.itemsSummary.slice(0, 4).map((item, idx) => (
                                  <li key={`${order.id}-item-${idx}`} className="truncate">
                                    · {item.quantity}× {item.name}
                                  </li>
                                ))}
                                {order.itemsSummary.length > 4 && (
                                  <li className="text-[11px] text-secondary">
                                    +{order.itemsSummary.length - 4} item lainnya
                                  </li>
                                )}
                              </ul>
                            )}
                            <p className="mt-1 font-mono text-xs text-secondary">
                              {formatProfileFullDate(order.createdAt)}
                              {order.serialNumber ? ` · Serial ${order.serialNumber}` : ''}
                            </p>
                            {statusMeta.isCancelled && order.cancelReason && (
                              <p className="mt-1 text-xs text-red-700/85">
                                Alasan: {order.cancelReason}
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-base font-semibold text-primary">
                            <AnimatedNumber value={order.totalPrice} format="currency" />
                          </p>
                        </div>

                        {canPay && (
                          <div className="mt-3 border-t border-default pt-3">
                            <button
                              type="button"
                              disabled={Boolean(payingOrderId)}
                              onClick={() => void continuePayment(order)}
                              className={`vt-btn-tactile inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent-cta px-3 py-2 text-xs font-semibold text-white hover:bg-accent-cta-hover sm:w-auto ${focusRing}`}
                            >
                              {payingOrderId === order.id && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                              {paymentStatus === 'pending' && (order.paymentReference ?? '').trim() ? 'Lanjutkan Bayar' : 'Bayar Sekarang'}
                            </button>
                          </div>
                        )}

                        {(order.serialNumber && !statusMeta.isCancelled) || statusMeta.canCancel || order.status === 'cancelled' ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-default pt-3">
                            {order.serialNumber && !statusMeta.isCancelled && (
                              onNavigateModule ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigateModule('qc', order.serialNumber)}
                                  className={`vt-btn-tactile inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-subtle ${focusRing}`}
                                >
                                  <Activity className="h-3.5 w-3.5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                                  <span>Periksa Log IoT QC</span>
                                </button>
                              ) : (
                                <Link
                                  href="/qc-panel"
                                  className={`vt-btn-tactile inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-default bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-subtle ${focusRing}`}
                                >
                                  <Activity className="h-3.5 w-3.5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                                  <span>Periksa Log IoT QC</span>
                                </Link>
                              )
                            )}

                            {statusMeta.canCancel && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelOrderError('');
                                  setOrderToCancel(order);
                                }}
                                className={`vt-btn-tactile inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 ${focusRing}`}
                              >
                                <XCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                                <span>Batalkan Pesanan</span>
                              </button>
                            )}
                            {order.status === 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteCancelledOrder(order)}
                                disabled={Boolean(deletingOrderId)}
                                className={`vt-btn-tactile inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 ${focusRing}`}
                              >
                                {deletingOrderId === order.id
                                  ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                  : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                <span>{deletingOrderId === order.id ? 'Menghapus…' : 'Hapus Pesanan'}</span>
                              </button>
                            )}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed border-default bg-canvas p-6 text-center">
                  <p className="text-sm font-semibold text-primary">Belum ada pesanan aktif.</p>
                  <p className="mt-1 text-xs text-secondary">
                    Pesan paket siap kirim di Market atau rakit konfigurasi kustom melalui Preset Builder.
                  </p>
                  <Link
                    href="/market"
                    className={`vt-btn-tactile mt-4 inline-flex min-h-11 items-center rounded-lg bg-accent-cta px-4 py-2 text-xs font-semibold text-white hover:bg-accent-cta-hover ${focusRing}`}
                  >
                    Buka Market ViciTech
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-xl border border-default bg-surface p-5 shadow-sm lg:col-span-5 lg:self-start">
              <div className="flex items-center justify-between gap-2 border-b border-default pb-3">
                <h2 className="tracking-tight flex items-center gap-2 font-sans text-lg font-bold text-primary">
                  <RefreshCw className="h-5 w-5 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                  <span>Riwayat Trade-In &amp; Laporan QC</span>
                </h2>
              </div>

              {workspace.qcReports.length > 0 ? (
                <ul className="divide-y divide-default">
                  {workspace.qcReports.map((report) => (
                    <li key={report.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                      <div>
                        <p className="font-semibold text-primary">
                          Pemeriksaan QC ({report.overallStatus.toUpperCase()})
                        </p>
                        <p className="font-mono text-secondary">
                          {report.environment === 'device' ? 'Live ESP32' : 'Simulasi IoT QC'}
                        </p>
                      </div>
                      <span className="font-mono text-secondary">
                        {formatProfileFullDate(report.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-secondary">
                  Belum ada pengajuan Trade-In atau laporan uji QC mandiri pada akun Anda.
                </p>
              )}

              <Link
                href="/trade-in"
                className={`vt-btn-tactile inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-default bg-canvas px-4 py-2 text-xs font-semibold text-primary hover:bg-subtle ${focusRing}`}
              >
                <RefreshCw className="h-4 w-4 text-accent-cta" strokeWidth={1.75} aria-hidden="true" />
                <span>Ajukan Trade-In atau Cek Serial QC</span>
              </Link>
            </div>
          </section>
        )}

        {/* Tab 3: Customization & Settings (Owner Only) */}
        {isOwner && activeTab === 'settings' && (
          <div key="settings" className={styles.tabPanel ?? ''}>
            <ProfileCustomizationTab
              userId={profile.id}
              profile={profile}
              stats={{
                communityPosts: workspace.stats.communityPosts,
                savedPresets: workspace.stats.savedPresets,
              }}
              onSaved={(updated, message) => {
                setProfile(updated);
                setToast(message);
              }}
            />
          </div>
        )}
      </div>
      <CancelOrderModal
        order={orderToCancel}
        isSubmitting={isCancellingOrder}
        error={cancelOrderError}
        onClose={() => {
          if (!isCancellingOrder) {
            setOrderToCancel(null);
            setCancelOrderError('');
          }
        }}
        onConfirm={(reason) => void handleConfirmCancelOrder(reason)}
      />
    </main>
  );
}
