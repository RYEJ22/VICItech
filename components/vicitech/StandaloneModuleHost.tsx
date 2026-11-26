'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import type { ProductRow } from '@/lib/admin/products-validation';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';

export const PENDING_BUILDER_CONFIG_STORAGE_KEY = 'vicitech:pending-builder-config';

const PresetBuilder = dynamic(() => import('./modules/PresetBuilder'), {
  loading: () => <ModuleRouteSkeleton />,
});
const BottleneckAnalyzer = dynamic(() => import('./modules/BottleneckAnalyzer'), {
  loading: () => <ModuleRouteSkeleton />,
});
const VersusArena = dynamic(() => import('./modules/VersusArena'), {
  loading: () => <ModuleRouteSkeleton />,
});
const TradeInPortal = dynamic(() => import('./modules/TradeInPortal'), {
  loading: () => <ModuleRouteSkeleton />,
});

function ModuleRouteSkeleton(): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat modul ViciTech"
      className="mx-auto max-w-7xl space-y-4 px-4 py-10 sm:px-6"
    >
      <div className="h-8 w-56 animate-pulse rounded-lg bg-subtle" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-subtle" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-44 animate-pulse rounded-xl border border-default bg-surface" />
        <div className="h-44 animate-pulse rounded-xl border border-default bg-surface" />
        <div className="h-44 animate-pulse rounded-xl border border-default bg-surface" />
      </div>
    </div>
  );
}

export function resolveModuleRoute(moduleId: string, view?: string): string {
  switch (moduleId) {
    case 'builder':
      return '/builder';
    case 'bottleneck':
      return '/bottleneck';
    case 'versus':
      return '/versus';
    case 'tradein':
    case 'trade-in':
      return '/trade-in';
    case 'qc':
      return '/qc-panel';
    case 'market':
      if (view === 'catalog' || view === 'library') return '/market?view=catalog';
      if (view === 'upgrade') return '/market?view=upgrade';
      return '/market';
    case 'library':
      return view === 'upgrade' ? '/market?view=upgrade' : '/market?view=catalog';
    case 'community':
      return '/community';
    case 'partners':
      return '/partners';
    case 'messages':
      return '/messages';
    case 'account':
    case 'profile':
      return '/profile';
    case 'home':
    default:
      return '/';
  }
}

export function savePendingBuilderConfig(config: unknown): void {
  if (typeof window === 'undefined' || !config || typeof config !== 'object') return;
  try {
    window.sessionStorage.setItem(PENDING_BUILDER_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Abaikan kuota sessionStorage jika penuh atau diblokir oleh mode privat.
  }
}

function consumePendingBuilderConfig(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_BUILDER_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_BUILDER_CONFIG_STORAGE_KEY);
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    try {
      window.sessionStorage.removeItem(PENDING_BUILDER_CONFIG_STORAGE_KEY);
    } catch {
      // Abaikan kegagalan pembersihan storage.
    }
    return null;
  }
}

export function BuilderRouteView({
  initialProductId = '',
  marketProducts = [],
}: {
  readonly initialProductId?: string;
  readonly marketProducts?: readonly ProductRow[];
}): ReactElement {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [importedConfig, setImportedConfig] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const pending = consumePendingBuilderConfig();
    if (pending) {
      setImportedConfig(pending);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) return undefined;
    let active = true;
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getUser()
      .then(({ data }: { readonly data?: { readonly user?: { readonly id?: string } | null } }) => {
        if (active) setUserId(data?.user?.id ?? undefined);
      })
      .catch(() => {
        // Tetap berjalan tanpa sesi user.
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: { readonly user?: { readonly id?: string } | null } | null) => {
        if (active) setUserId(session?.user?.id ?? undefined);
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-[calc(100vh-5.5rem)] min-w-0 bg-canvas text-primary">
      <PresetBuilder
        role="b2c"
        userId={userId}
        importedConfig={importedConfig}
        initialProductId={initialProductId}
        marketProducts={marketProducts as never[]}
      />
    </main>
  );
}

export function BottleneckRouteView({
  marketProducts = [],
}: {
  readonly marketProducts?: readonly ProductRow[];
}): ReactElement {
  const router = useRouter();
  return (
    <main className="min-h-[calc(100vh-5.5rem)] min-w-0 bg-canvas text-primary">
      <BottleneckAnalyzer
        marketProducts={marketProducts as never[]}
        onSwapToPreset={(parts: unknown) => {
          savePendingBuilderConfig(parts);
          router.push('/builder');
        }}
      />
    </main>
  );
}

export function VersusRouteView({
  marketProducts = [],
}: {
  readonly marketProducts?: readonly ProductRow[];
}): ReactElement {
  const router = useRouter();
  return (
    <main className="min-h-[calc(100vh-5.5rem)] min-w-0 bg-canvas text-primary">
      <VersusArena
        marketProducts={marketProducts as never[]}
        onDeployToPreset={(item: { readonly builderPartHint?: unknown } | null) => {
          const hint =
            item?.builderPartHint && typeof item.builderPartHint === 'object'
              ? (item.builderPartHint as Record<string, unknown>)
              : {};
          savePendingBuilderConfig({ ...hint, items: item ? [item] : [] });
          router.push('/builder');
        }}
      />
    </main>
  );
}

export function TradeInRouteView(): ReactElement {
  return (
    <main className="min-h-[calc(100vh-5.5rem)] min-w-0 bg-canvas text-primary">
      <TradeInPortal />
    </main>
  );
}
