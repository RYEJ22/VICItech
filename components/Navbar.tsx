'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  ChevronDown,
  Cpu,
  Gauge,
  LayoutGrid,
  Layers,
  MapPin,
  Menu,
  MessageSquare,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Swords,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent as ReactFocusEvent, MouseEvent as ReactMouseEvent, ReactElement } from 'react';
import AuthNavigation from '@/components/vicitech/auth/AuthNavigation';
import { useCheckout } from '@/context/CheckoutContext';
import { DmNotificationToast } from '@/components/chat/DmNotificationToast';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { shouldInterceptRouteLink, startRouteTransition } from '@/lib/motion/view-transition';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';
import {
  DESKTOP_NAV_GROUPS,
  MOBILE_BOTTOM_NAV_ITEMS,
  countUnreadNotifications,
  formatNotificationRelativeTime,
  getVisibleNavItems,
  isActiveRoute,
  isShellOwnedRoute,
  isSubItemActive,
  mapNotificationRow,
  normalizeUserRole,
  resolveActiveUmbrellaId,
} from './navigation/navbar-state';
import type {
  DatabaseNotificationRow,
  DesktopNavUmbrellaId,
  NavIconKey,
  NavItem,
  NavNotification,
  NavSubIconKey,
  NavSubItem,
  UserRole,
} from './navigation/navbar-state';
import styles from './navigation/navbar.module.css';

const NavbarCommandPalette = dynamic(() => import('./navigation/navbar-command-palette'), {
  ssr: false,
});

interface NavbarProps {
  readonly initialRole?: UserRole;
}

type OpenMenu = DesktopNavUmbrellaId | 'notifications' | 'account' | null;

const SHELL_ROUTES = ['/market', '/community'];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50';
const iconBtnBase =
  `vt-motion-press relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-smooth active:scale-[0.98] sm:h-9 sm:w-9 md:h-10 md:w-10 ${focusRing}`;

function NavIcon({
  iconKey,
  className,
}: {
  readonly iconKey: NavIconKey;
  readonly className: string;
}): ReactElement {
  switch (iconKey) {
    case 'home':
      return <LayoutGrid className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'market':
      return <ShoppingBag className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'builder':
      return <Wrench className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'services':
      return <ShieldCheck className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'tradein':
      return <RefreshCw className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'partners':
      return <MapPin className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'community':
      return <Users className={className} strokeWidth={1.75} aria-hidden="true" />;
  }
}

function SubNavIcon({
  iconKey,
  active,
}: {
  readonly iconKey: NavSubIconKey;
  readonly active?: boolean;
}): ReactElement {
  const cls = `mt-0.5 h-4 w-4 shrink-0 transition-colors ${
    active ? 'text-accent-primary' : 'text-secondary group-hover:text-accent-primary'
  }`;
  switch (iconKey) {
    case 'home':
      return <LayoutGrid className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'market':
      return <ShoppingBag className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'library':
      return <Layers className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'builder':
      return <Sliders className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'bottleneck':
      return <Gauge className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'versus':
      return <Swords className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'upgrade':
      return <Wrench className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'qc':
      return <Activity className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'services':
      return <ShieldCheck className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'tradein':
      return <RefreshCw className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'partners':
      return <MapPin className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'community':
      return <Users className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'messages':
      return <MessageSquare className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'account':
      return <User className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'settings':
      return <Settings className={cls} strokeWidth={1.75} aria-hidden="true" />;
  }
}

function BrandMark({ compact = false }: { readonly compact?: boolean }): ReactElement {
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-primary text-white transition-all duration-300 ease-smooth motion-reduce:transition-none ${
        compact ? 'md:h-8 md:w-8' : 'md:h-9 md:w-9'
      }`}
    >
      <Cpu
        className={`h-4 w-4 transition-all duration-300 ease-smooth motion-reduce:transition-none ${
          compact ? 'md:h-4 md:w-4' : 'md:h-[18px] md:w-[18px]'
        }`}
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </span>
  );
}

function NotificationsPanel({
  items,
  isAuthenticated,
  isLoading,
  onSelect,
  onMarkAllRead,
  onLoginClick,
}: {
  readonly items: readonly NavNotification[];
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly onSelect: (item: NavNotification) => void;
  readonly onMarkAllRead: () => void;
  readonly onLoginClick: () => void;
}): ReactElement {
  const unread = countUnreadNotifications(items);
  return (
    <div
      role="dialog"
      aria-label="Notifikasi"
      className={`absolute right-0 top-full z-[60] mt-3.5 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl p-2 ${styles.dropdownPanel ?? ''} ${styles.menuPop ?? ''}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-default px-2.5 pb-2 pt-1">
        <p className="text-sm font-semibold text-primary">Notifikasi</p>
        {isAuthenticated && (
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unread === 0}
            className={`min-h-8 rounded-full px-2.5 text-xs font-medium text-secondary transition-colors hover:bg-subtle hover:text-primary disabled:cursor-default disabled:opacity-50 ${focusRing}`}
          >
            Tandai dibaca
          </button>
        )}
      </div>

      {!isAuthenticated ? (
        <div className="mt-2 space-y-2.5 rounded-xl bg-canvas px-3 py-4 text-center">
          <p className="text-xs leading-relaxed text-secondary">
            Masuk untuk melihat notifikasi pesanan, komentar, dan pesan langsung Anda.
          </p>
          <Link
            href="/login"
            onClick={onLoginClick}
            className={`inline-flex min-h-9 items-center justify-center rounded-lg bg-accent-primary px-4 py-1.5 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] ${focusRing}`}
          >
            Masuk ke Akun
          </Link>
        </div>
      ) : isLoading ? (
        <div className="mt-2 space-y-2 p-1" aria-hidden="true">
          <div className="h-12 animate-pulse rounded-lg bg-subtle" />
          <div className="h-12 animate-pulse rounded-lg bg-subtle" />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-2 rounded-xl bg-canvas px-3 py-5 text-center text-xs text-secondary">
          Belum ada notifikasi baru.
        </p>
      ) : (
        <ul className="mt-1 grid max-h-80 gap-0.5 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={`flex min-h-11 w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-subtle ${focusRing}`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    item.unread ? 'bg-accent-primary' : 'bg-border-strong'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm leading-snug ${
                      item.unread ? 'font-semibold text-primary' : 'text-secondary'
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.body && (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-secondary">
                      {item.body}
                    </span>
                  )}
                  <span className="mt-0.5 block text-[11px] text-secondary">
                    {formatNotificationRelativeTime(item.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Navbar({ initialRole = 'guest' }: NavbarProps): ReactElement | null {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifications, setNotifications] = useState<readonly NavNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const lastHoverOpenRef = useRef<{ readonly id: DesktopNavUmbrellaId; readonly ts: number } | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  currentUserIdRef.current = currentUserId;

  const { unreadCount, toasts, dismissToast } = useUnreadMessages({
    userId: currentUserId,
    pathname,
    enabled: Boolean(currentUserId) && !isShellOwnedRoute(pathname ?? ''),
  });
  const { totalCartItems, openCart } = useCheckout();

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimerRef.current !== null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearHoverCloseTimer, [clearHoverCloseTimer]);

  useEffect(() => {
    const handleScroll = (): void => {
      const scrolled = window.scrollY > 40;
      setIsScrolled((prev) => (prev === scrolled ? prev : scrolled));
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    window.requestAnimationFrame(() => {
      menuTriggerRef.current?.focus();
    });
  }, []);

  const closeAllMenus = useCallback(() => {
    clearHoverCloseTimer();
    setOpenMenu(null);
  }, [clearHoverCloseTimer]);

  const toggleMenu = useCallback(
    (menu: Exclude<OpenMenu, null>) => {
      clearHoverCloseTimer();
      setOpenMenu((current) => (current === menu ? null : menu));
    },
    [clearHoverCloseTimer],
  );

  const openUmbrellaOnHover = useCallback(
    (id: DesktopNavUmbrellaId) => {
      clearHoverCloseTimer();
      setOpenMenu((current) => {
        if (current !== id) {
          lastHoverOpenRef.current = { id, ts: Date.now() };
        }
        return id;
      });
    },
    [clearHoverCloseTimer],
  );

  const scheduleUmbrellaClose = useCallback(
    (id: DesktopNavUmbrellaId) => {
      clearHoverCloseTimer();
      hoverCloseTimerRef.current = window.setTimeout(() => {
        setOpenMenu((current) => (current === id ? null : current));
        hoverCloseTimerRef.current = null;
      }, 140);
    },
    [clearHoverCloseTimer],
  );

  const toggleUmbrellaClick = useCallback(
    (id: DesktopNavUmbrellaId) => {
      clearHoverCloseTimer();
      const recentHover = lastHoverOpenRef.current;
      if (recentHover && recentHover.id === id && Date.now() - recentHover.ts < 220) {
        lastHoverOpenRef.current = null;
        setOpenMenu(id);
        return;
      }
      lastHoverOpenRef.current = null;
      setOpenMenu((current) => (current === id ? null : id));
    },
    [clearHoverCloseTimer],
  );

  const handleUmbrellaBlur = useCallback(
    (id: DesktopNavUmbrellaId, event: ReactFocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
      setOpenMenu((current) => (current === id ? null : current));
    },
    [],
  );

  const toggleAccountMenu = useCallback(() => {
    toggleMenu('account');
  }, [toggleMenu]);

  const triggerGlobalSearch = useCallback(() => {
    closeAllMenus();
    const commandEvent = new CustomEvent('vicitech:open-command-palette', { cancelable: true });
    const notHandledByShell = window.dispatchEvent(commandEvent);
    if (notHandledByShell) {
      setSearchOpen((prev) => !prev);
    }
  }, [closeAllMenus]);

  // Track active module + sub-view across route transitions and client-side workspace tabs.
  useEffect(() => {
    const syncModuleFromUrl = () => {
      const hashParts = window.location.hash.slice(1).split('/');
      const hashId = hashParts[0] || null;
      const hashView = hashParts[1] || null;
      if (hashId) {
        setActiveModule(hashId);
        setActiveView(hashView);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const viewParam = params.get('view');
      const normalizedView = viewParam === 'library' ? 'catalog' : viewParam;
      setActiveModule(tabParam || null);
      setActiveView(normalizedView || null);
    };

    const handleModuleChange = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail?.module === 'string') {
        setActiveModule(event.detail.module);
        setActiveView(
          typeof event.detail.view === 'string' && event.detail.view.length > 0
            ? event.detail.view
            : null,
        );
      } else {
        syncModuleFromUrl();
      }
    };

    syncModuleFromUrl();
    window.addEventListener('hashchange', syncModuleFromUrl);
    window.addEventListener('popstate', syncModuleFromUrl);
    window.addEventListener('vicitech:module-change', handleModuleChange);
    return () => {
      window.removeEventListener('hashchange', syncModuleFromUrl);
      window.removeEventListener('popstate', syncModuleFromUrl);
      window.removeEventListener('vicitech:module-change', handleModuleChange);
    };
  }, [pathname]);

  // Global Ctrl+K / Cmd+K shortcut + Escape closes overlays.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        triggerGlobalSearch();
      } else if (event.key === 'Escape') {
        setSearchOpen(false);
        closeAllMenus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeAllMenus, triggerGlobalSearch]);

  // Outside click closes any open dropdown.
  useEffect(() => {
    if (!openMenu) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-nav-menu]')) return;
      closeAllMenus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [closeAllMenus, openMenu]);

  // Reset open overlays on route or sub-module change.
  useEffect(() => {
    setSheetOpen(false);
    setSearchOpen(false);
    closeAllMenus();
  }, [pathname, activeModule, activeView, closeAllMenus]);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSheet();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeSheet, sheetOpen]);

  // Sync authenticated role + current user ID from Supabase.
  useEffect(() => {
    if (!isSupabaseAuthConfigured) {
      setRole('guest');
      setCurrentUserId(null);
      return undefined;
    }

    let isMounted = true;
    const supabase = getSupabaseBrowserClient();

    async function syncNavigationState(): Promise<void> {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;
        if (authError || !user) {
          setRole('guest');
          setCurrentUserId(null);
          return;
        }

        setCurrentUserId(user.id);
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) return;
        const appRole = normalizeUserRole(user.app_metadata?.role);
        const profileRole = normalizeUserRole(profileRow?.role);
        setRole(appRole === 'admin' ? 'admin' : profileRole === 'guest' ? 'member' : profileRole);
      } catch {
        if (isMounted) {
          setRole('guest');
          setCurrentUserId(null);
        }
      }
    }

    void syncNavigationState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: string, session: { readonly user?: { readonly id?: string } } | null) => {
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setRole('guest');
            setCurrentUserId(null);
          }
          return;
        }
        if (
          event === 'TOKEN_REFRESHED' &&
          session?.user?.id &&
          session.user.id === currentUserIdRef.current
        ) {
          return;
        }
        void syncNavigationState();
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load real notifications from Supabase public.notifications and subscribe to live updates.
  useEffect(() => {
    if (!isSupabaseAuthConfigured || !currentUserId) {
      setNotifications([]);
      setNotificationsLoading(false);
      return undefined;
    }

    let isMounted = true;
    const supabase = getSupabaseBrowserClient();
    setNotificationsLoading(true);

    async function loadNotifications(): Promise<void> {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, actor_id, type, entity_id, title, body, is_read, created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!isMounted) return;
        if (!error && Array.isArray(data)) {
          setNotifications(data.map((row) => mapNotificationRow(row as DatabaseNotificationRow)));
        }
      } catch {
        // Pertahankan state terakhir jika terjadi gangguan jaringan sementara.
      } finally {
        if (isMounted) setNotificationsLoading(false);
      }
    }

    void loadNotifications();

    const channel = supabase
      .channel(`navbar-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload: {
          readonly eventType: string;
          readonly new?: DatabaseNotificationRow;
          readonly old?: { readonly id?: string };
        }) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT' && payload.new) {
            const incoming = mapNotificationRow(payload.new);
            setNotifications((prev) => [
              incoming,
              ...prev.filter((item) => item.id !== incoming.id),
            ].slice(0, 20));
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = mapNotificationRow(payload.new);
            setNotifications((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            );
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            const deletedId = payload.old.id;
            setNotifications((prev) => prev.filter((item) => item.id !== deletedId));
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const visibleDesktopGroups = useMemo(() => getVisibleNavItems(DESKTOP_NAV_GROUPS, role), [role]);
  const visibleBottomItems = useMemo(() => getVisibleNavItems(MOBILE_BOTTOM_NAV_ITEMS, role), [role]);
  const unreadNotifications = countUnreadNotifications(notifications);
  const hasUnreadAlerts = unreadNotifications > 0 || unreadCount > 0;
  const activeUmbrella = resolveActiveUmbrellaId(pathname, activeModule, activeView);
  const isMessagesRoute = pathname === '/messages' || Boolean(pathname?.startsWith('/messages/'));
  const isProfileRoute = pathname === '/profile' || Boolean(pathname?.startsWith('/profile/'));
  const isSettingsRoute = pathname === '/settings' || Boolean(pathname?.startsWith('/settings/'));

  const handleHrefClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
      closeAllMenus();
      setSheetOpen(false);
      if (shouldInterceptRouteLink(event, href, pathname)) {
        event.preventDefault();
        startRouteTransition(() => {
          router.push(href);
        });
      }
    },
    [closeAllMenus, pathname, router],
  );

  const handleSubItemClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>, item: NavSubItem) => {
      closeAllMenus();
      setSheetOpen(false);

      if (item.href.startsWith('/market') && pathname === '/market' && item.targetModule === 'market') {
        event.preventDefault();
        window.dispatchEvent(
          new CustomEvent('vicitech:navigate-module', {
            detail: { module: 'market', view: item.targetView ?? 'ready' },
          }),
        );
        return;
      }

      handleHrefClick(event, item.href);
    },
    [closeAllMenus, handleHrefClick, pathname],
  );

  const handleBottomNavClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>, item: NavItem) => {
      handleHrefClick(event, item.href);
    },
    [handleHrefClick],
  );

  const navigateTo = useCallback(
    (targetHref: string, moduleName?: string, viewName?: string) => {
      setSearchOpen(false);
      closeAllMenus();
      setSheetOpen(false);
      if (moduleName && pathname && SHELL_ROUTES.includes(pathname)) {
        const isMarketSwitch = pathname === '/market' && moduleName === 'market';
        if (isMarketSwitch) {
          window.dispatchEvent(
            new CustomEvent('vicitech:navigate-module', { detail: { module: moduleName, view: viewName } }),
          );
          return;
        }
      }
      startRouteTransition(() => {
        router.push(targetHref);
      });
    },
    [closeAllMenus, pathname, router],
  );

  const handleAuthNavigate = useCallback(
    (mod: string) => {
      const target =
        mod === 'builder'
          ? '/builder'
          : mod === 'bottleneck'
            ? '/bottleneck'
            : mod === 'versus'
              ? '/versus'
              : mod === 'tradein' || mod === 'trade-in'
                ? '/trade-in'
                : mod === 'qc'
                  ? '/qc-panel'
                  : mod === 'market'
                    ? '/market'
                    : mod === 'community'
                      ? '/community'
                      : mod === 'account' || mod === 'profile'
                        ? '/profile'
                        : '/';
      startRouteTransition(() => {
        router.push(target);
      });
    },
    [router],
  );

  const selectNotification = useCallback(
    (item: NavNotification) => {
      const wasUnread = item.unread;
      if (wasUnread && currentUserId && isSupabaseAuthConfigured) {
        setNotifications((list) => list.map((n) => (n.id === item.id ? { ...n, unread: false } : n)));
        const supabase = getSupabaseBrowserClient();
        void supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', item.id)
          .eq('user_id', currentUserId)
          .then(({ error }: { readonly error: unknown }) => {
            if (error) {
              setNotifications((list) => list.map((n) => (n.id === item.id ? { ...n, unread: true } : n)));
            }
          });
      }
      navigateTo(item.href, item.module, item.view);
    },
    [currentUserId, navigateTo],
  );

  const markAllNotificationsRead = useCallback(() => {
    if (!currentUserId || !isSupabaseAuthConfigured) return;
    let previousSnapshot: readonly NavNotification[] = [];
    setNotifications((list) => {
      previousSnapshot = list;
      return list.map((n) => ({ ...n, unread: false }));
    });
    const supabase = getSupabaseBrowserClient();
    void supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUserId)
      .eq('is_read', false)
      .then(({ error }: { readonly error: unknown }) => {
        if (error && previousSnapshot.length > 0) {
          setNotifications(previousSnapshot);
        }
      });
  }, [currentUserId]);

  if (pathname && isShellOwnedRoute(pathname)) return null;

  return (
    <>
      {/* ───────── Floating Pill Navbar (Progressive Disclosure) ───────── */}
      <header
        className={`pointer-events-none fixed inset-x-0 top-0 z-40 px-0 transition-all duration-300 ease-smooth motion-reduce:transition-none md:px-6 ${
          isScrolled ? 'md:top-2.5' : 'md:top-4'
        }`}
      >
        <div
          className={`pointer-events-auto mx-auto flex h-14 w-full items-center justify-between gap-2 rounded-none px-3 transition-all duration-300 ease-smooth motion-reduce:transition-none md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:rounded-full ${
            styles.floatingPill ?? ''
          } ${
            isScrolled
              ? `${styles.floatingPillScrolled ?? ''} md:h-[54px] md:max-w-3xl md:gap-2.5 md:pl-3.5 md:pr-2.5`
              : 'md:h-[64px] md:max-w-6xl md:gap-4 md:pl-5 md:pr-3.5'
          }`}
        >
          {/* Left: Brand Logo -> Beranda ("/") */}
          <Link
            href="/"
            onClick={(event) => handleHrefClick(event, '/')}
            title="ViciTech Beranda"
            aria-label="ViciTech Beranda"
            className={`inline-flex min-h-10 w-fit shrink-0 items-center justify-self-start rounded-full pr-1 transition-all duration-300 ease-smooth hover:opacity-85 motion-reduce:transition-none ${
              isScrolled ? 'gap-2' : 'gap-2.5'
            } ${focusRing}`}
          >
            <BrandMark compact={isScrolled} />
            <span
              className={`hidden font-sans font-bold tracking-tight text-primary transition-all duration-300 ease-smooth motion-reduce:transition-none min-[375px]:inline ${
                isScrolled ? 'text-base' : 'text-lg'
              }`}
            >
              ViciTech
            </span>
          </Link>

          {/* Center (Desktop): 4 Umbrella Menus (Icons + Labels at top, Icon-Only compact on scroll) */}
          <nav
            aria-label="Navigasi utama ViciTech"
            onMouseLeave={() => {
              clearHoverCloseTimer();
              hoverCloseTimerRef.current = window.setTimeout(() => {
                setOpenMenu((current) => current && ['market', 'toolkit', 'services', 'community'].includes(current) ? null : current);
                hoverCloseTimerRef.current = null;
              }, 120);
            }}
            className={`hidden items-center justify-self-center transition-all duration-300 ease-smooth motion-reduce:transition-none md:flex ${
              isScrolled ? 'gap-1.5 lg:gap-2' : 'gap-2 lg:gap-3'
            }`}
          >
            {visibleDesktopGroups.map((group) => {
              const isOpen = openMenu === group.id;
              const isActive = activeUmbrella === group.id;
              const iconTone =
                isActive || isOpen
                  ? 'text-accent-primary'
                  : 'text-secondary group-hover/nav:text-accent-primary';

              if (!group.items?.length && group.href) {
                return (
                  <Link
                    key={group.id}
                    href={group.href}
                    onClick={(event) => handleHrefClick(event, group.href ?? '/community')}
                    title={group.label}
                    aria-label={group.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group/nav vt-motion-press vt-nav-link relative inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 ease-smooth motion-reduce:transition-none ${focusRing} ${
                      isScrolled ? 'min-w-10 px-3 py-2' : 'px-3 py-2'
                    } ${
                      isActive
                        ? isScrolled
                          ? 'bg-accent-subtle text-accent-primary'
                          : 'text-accent-primary'
                        : 'text-primary/85 hover:bg-subtle hover:text-accent-primary'
                    }`}
                  >
                    <NavIcon
                      iconKey={group.iconKey}
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${iconTone}`}
                    />
                    <span
                      className={`${styles.navLabel ?? ''} ${
                        isScrolled ? (styles.navLabelCollapsed ?? '') : ''
                      }`}
                    >
                      {group.label}
                    </span>
                    {!isScrolled && (
                      <span aria-hidden="true" className={`vt-nav-underline !inset-x-3 ${isActive ? 'is-active' : ''}`} />
                    )}
                  </Link>
                );
              }

              return (
                <div
                  key={group.id}
                  className="relative"
                  data-nav-menu
                  onMouseEnter={() => openUmbrellaOnHover(group.id)}
                  onBlur={(event) => handleUmbrellaBlur(group.id, event)}
                >
                  <button
                    type="button"
                    onClick={() => toggleUmbrellaClick(group.id)}
                    title={group.label}
                    aria-label={group.label}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-controls={`nav-panel-${group.id}`}
                    className={`group/nav vt-nav-link vt-motion-press relative inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 ease-smooth motion-reduce:transition-none ${focusRing} ${
                      isScrolled ? 'min-w-10 px-2.5 py-2' : 'px-3 py-2'
                    } ${
                      isActive || isOpen
                        ? isScrolled
                          ? 'bg-accent-subtle text-accent-primary'
                          : 'text-accent-primary'
                        : 'text-primary/85 hover:bg-subtle hover:text-accent-primary'
                    }`}
                  >
                    <NavIcon
                      iconKey={group.iconKey}
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${iconTone}`}
                    />
                    <span
                      className={`${styles.navLabel ?? ''} ${
                        isScrolled ? (styles.navLabelCollapsed ?? '') : ''
                      }`}
                    >
                      {group.label}
                    </span>
                    <ChevronDown
                      className={`vt-chevron shrink-0 transition-all duration-300 ease-smooth motion-reduce:transition-none ${
                        isScrolled ? 'ml-0.5 h-3 w-3' : 'ml-1 h-3.5 w-3.5'
                      } ${
                        isOpen ? 'rotate-180 text-accent-primary' : 'text-secondary group-hover/nav:text-accent-primary'
                      }`}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    {!isScrolled && (
                      <span aria-hidden="true" className={`vt-nav-underline !inset-x-3 ${isActive ? 'is-active' : ''}`} />
                    )}
                  </button>

                  {group.items && isOpen && (
                    <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
                      <div
                        id={`nav-panel-${group.id}`}
                        className={`vt-nav-dropdown-open w-[340px] max-w-[calc(100vw-2rem)] rounded-xl bg-surface p-2 opacity-100 shadow-floating ${styles.dropdownPanel ?? ''}`}
                      >
                        <ul className="grid gap-0.5">
                          {group.items.map((subItem) => {
                            const subActive = isSubItemActive(subItem, pathname, activeModule, activeView);
                            return (
                              <li key={subItem.id}>
                                <Link
                                  href={subItem.href}
                                  onClick={(event) => handleSubItemClick(event, subItem)}
                                  aria-current={subActive ? 'page' : undefined}
                                  className={`vt-motion-press group flex items-start gap-3 rounded-lg px-3.5 py-2.5 transition-colors hover:bg-subtle ${focusRing} ${
                                    subActive ? 'bg-accent-subtle' : ''
                                  }`}
                                >
                                  <SubNavIcon iconKey={subItem.iconKey} active={subActive} />
                                  <span className="min-w-0 flex-1">
                                    <span
                                      className={`block text-sm font-semibold transition-colors ${
                                        subActive
                                          ? 'text-accent-hover'
                                          : 'text-primary group-hover:text-accent-hover'
                                      }`}
                                    >
                                      {subItem.label}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-secondary">
                                      {subItem.description}
                                    </span>
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right: Streamlined Utilities (Search, Cart, Notif & DM, Account) */}
          <div className="flex shrink-0 items-center justify-self-end gap-0.5 sm:gap-1.5">
            {/* 1. Search (Ctrl+K) & Cart */}
            <button
              type="button"
              onClick={triggerGlobalSearch}
              title="Cari cepat (Ctrl+K)"
              aria-label="Cari di ViciTech (Ctrl+K)"
              aria-keyshortcuts="Control+K Meta+K"
              className={`${iconBtnBase} text-secondary hover:bg-subtle hover:text-primary`}
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                closeAllMenus();
                openCart();
              }}
              title="Keranjang Belanja"
              aria-label={
                totalCartItems > 0
                  ? `Keranjang Belanja (${totalCartItems} item)`
                  : 'Keranjang Belanja'
              }
              className={`${iconBtnBase} text-secondary hover:bg-subtle hover:text-primary`}
            >
              <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              {totalCartItems > 0 && (
                <span
                  aria-hidden="true"
                  key={`cart-count-${totalCartItems}`}
                  className="vt-motion-pop absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-primary px-1 font-mono text-[10px] font-bold leading-none text-white ring-2 ring-surface"
                >
                  {totalCartItems > 99 ? '99+' : totalCartItems}
                </span>
              )}
            </button>

            {/* 2. Pesan Langsung & Notifikasi (grouped with quiet indicator dots) */}
            <div className="flex items-center gap-0.5">
              <Link
                href="/messages"
                onClick={(event) => handleHrefClick(event, '/messages')}
                aria-current={isMessagesRoute ? 'page' : undefined}
                aria-label={unreadCount > 0 ? `Pesan Langsung (${unreadCount} belum dibaca)` : 'Pesan Langsung'}
                className={`${iconBtnBase} ${
                  isMessagesRoute
                    ? 'bg-accent-subtle text-accent-hover'
                    : 'text-secondary hover:bg-subtle hover:text-primary'
                }`}
              >
                <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-primary ring-2 ring-surface"
                  />
                )}
              </Link>

              <div className="relative" data-nav-menu>
                <button
                  type="button"
                  onClick={() => toggleMenu('notifications')}
                  aria-haspopup="dialog"
                  aria-expanded={openMenu === 'notifications'}
                  aria-label={
                    unreadNotifications > 0
                      ? `Notifikasi (${unreadNotifications} belum dibaca)`
                      : 'Notifikasi'
                  }
                  className={`${iconBtnBase} ${
                    openMenu === 'notifications'
                      ? 'bg-accent-subtle text-accent-hover'
                      : 'text-secondary hover:bg-subtle hover:text-primary'
                  }`}
                >
                  <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  {unreadNotifications > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-primary ring-2 ring-surface"
                    />
                  )}
                </button>
                {openMenu === 'notifications' && (
                  <NotificationsPanel
                    items={notifications}
                    isAuthenticated={Boolean(currentUserId)}
                    isLoading={notificationsLoading}
                    onSelect={selectNotification}
                    onMarkAllRead={markAllNotificationsRead}
                    onLoginClick={closeAllMenus}
                  />
                )}
              </div>
            </div>

            <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-default sm:block" />

            {/* 3. Akun */}
            <div className="hidden md:flex md:items-center">
              <AuthNavigation
                variant="desktop"
                isMenuOpen={openMenu === 'account'}
                onToggleMenu={toggleAccountMenu}
                onCloseMenu={closeAllMenus}
                onNavigate={handleAuthNavigate}
              />
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <AuthNavigation
                variant="mobile"
                isMenuOpen={openMenu === 'account'}
                onToggleMenu={toggleAccountMenu}
                onCloseMenu={closeAllMenus}
                onNavigate={handleAuthNavigate}
              />
              <button
                ref={menuTriggerRef}
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-label="Buka menu navigasi ViciTech"
                aria-expanded={sheetOpen}
                aria-controls="mobile-nav-bottom-sheet"
                className={`${iconBtnBase} text-primary hover:bg-subtle`}
              >
                <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Safe top clearance beneath the fixed header (Hero handles its own offset on "/") */}
      <div aria-hidden="true" className={pathname === '/' ? 'h-0' : 'h-14 md:h-[92px]'} />

      {/* ───────── Mobile Fixed Bottom Navigation (< md, 5 core items — compact icon-only on scroll) ───────── */}
      <nav aria-label="Navigasi bawah mobile" className={`md:hidden ${styles.bottomNav ?? ''}`}>
        <ul
          className={`mx-auto grid max-w-lg grid-cols-5 items-center gap-0.5 px-1.5 transition-all duration-300 ease-smooth motion-reduce:transition-none ${
            isScrolled ? 'h-12 py-1' : 'h-14 py-1.5'
          }`}
        >
          {visibleBottomItems.map((item) => {
            const active = isActiveRoute(pathname, item.href, activeModule, activeView);
            return (
              <li key={item.id} className="h-full">
                <Link
                  href={item.href}
                  onClick={(event) => handleBottomNavClick(event, item)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`vt-motion-press flex h-full min-h-[40px] flex-col items-center justify-center rounded-lg px-1 text-[10px] leading-none transition-colors ${focusRing} ${
                    active
                      ? 'bg-accent-subtle font-semibold text-accent-hover'
                      : 'font-medium text-secondary hover:bg-subtle hover:text-primary'
                  }`}
                >
                  <NavIcon
                    iconKey={item.iconKey}
                    className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-accent-primary' : 'text-secondary'}`}
                  />
                  <span
                    className={`truncate ${styles.mobileNavLabel ?? ''} ${
                      isScrolled ? (styles.mobileNavLabelCollapsed ?? '') : ''
                    }`}
                  >
                    {item.shortLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ───────── Mobile Bottom Sheet Drawer (Synced Umbrella Taxonomy) ───────── */}
      {sheetOpen && (
        <div className={`md:hidden ${styles.sheetBackdrop ?? ''}`} onClick={closeSheet}>
          <div
            id="mobile-nav-bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi ViciTech"
            onClick={(event) => event.stopPropagation()}
            className={styles.bottomSheet}
          >
            <div className="flex justify-center pb-1 pt-3" aria-hidden="true">
              <span className={styles.dragHandle} />
            </div>

            <div className="flex items-center justify-between border-b border-default px-4 pb-3 pt-1">
              <div>
                <p className="font-sans text-base font-bold text-primary">ViciTech</p>
                <p className="text-xs text-secondary">Ekosistem Circular IT &amp; Hardware QC</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeSheet}
                aria-label="Tutup menu navigasi"
                className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-canvas text-primary transition-colors hover:bg-subtle ${focusRing}`}
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Menu lengkap mobile" className="grid gap-4 p-4">
              {visibleDesktopGroups.map((group) => {
                if (!group.items?.length && group.href) {
                  const active = activeUmbrella === group.id;
                  return (
                    <div key={group.id}>
                      <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                        Sosial &amp; Panduan
                      </p>
                      <Link
                        href={group.href}
                        onClick={(event) => handleHrefClick(event, group.href ?? '/community')}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-subtle ${focusRing} ${
                          active ? 'bg-accent-subtle' : ''
                        }`}
                      >
                        <SubNavIcon iconKey="community" active={active} />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm font-semibold ${
                              active ? 'text-accent-hover' : 'text-primary group-hover:text-accent-hover'
                            }`}
                          >
                            {group.label}
                          </span>
                          {group.description && (
                            <span className="mt-0.5 block text-xs leading-relaxed text-secondary">
                              {group.description}
                            </span>
                          )}
                        </span>
                      </Link>
                    </div>
                  );
                }

                return (
                  <div key={group.id}>
                    <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                      {group.label}
                    </p>
                    <div className="grid gap-1">
                      {group.items?.map((subItem) => {
                        const subActive = isSubItemActive(subItem, pathname, activeModule, activeView);
                        return (
                          <Link
                            key={subItem.id}
                            href={subItem.href}
                            onClick={(event) => handleSubItemClick(event, subItem)}
                            aria-current={subActive ? 'page' : undefined}
                            className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-subtle ${focusRing} ${
                              subActive ? 'bg-accent-subtle' : ''
                            }`}
                          >
                            <SubNavIcon iconKey={subItem.iconKey} active={subActive} />
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block text-sm font-semibold ${
                                  subActive
                                    ? 'text-accent-hover'
                                    : 'text-primary group-hover:text-accent-hover'
                                }`}
                              >
                                {subItem.label}
                              </span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-secondary">
                                {subItem.description}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-default pt-3">
                <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                  Workspace &amp; Akun
                </p>
                <div className="grid gap-1">
                  <Link
                    href="/"
                    onClick={(event) => handleHrefClick(event, '/')}
                    className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-subtle ${focusRing} ${
                      pathname === '/' ? 'bg-accent-subtle' : ''
                    }`}
                  >
                    <SubNavIcon iconKey="home" active={pathname === '/'} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-semibold ${
                          pathname === '/'
                            ? 'text-accent-hover'
                            : 'text-primary group-hover:text-accent-hover'
                        }`}
                      >
                        Beranda
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-secondary">
                        Halaman utama ekosistem Circular IT &amp; Hardware QC ViciTech.
                      </span>
                    </span>
                  </Link>

                  <Link
                    href="/messages"
                    onClick={(event) => handleHrefClick(event, '/messages')}
                    className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-subtle ${focusRing} ${
                      isMessagesRoute ? 'bg-accent-subtle' : ''
                    }`}
                  >
                    <SubNavIcon iconKey="messages" active={isMessagesRoute} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:text-accent-hover">
                        <span>Pesan Langsung</span>
                        {hasUnreadAlerts && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-accent-primary" aria-hidden="true" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-secondary">
                        {unreadCount > 0
                          ? `${unreadCount} pesan belum dibaca`
                          : 'Obrolan langsung dengan teknisi & builder.'}
                      </span>
                    </span>
                  </Link>

                  <Link
                    href="/profile"
                    onClick={(event) => handleHrefClick(event, '/profile')}
                    className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-subtle ${focusRing} ${
                      isProfileRoute ? 'bg-accent-subtle' : ''
                    }`}
                  >
                    <SubNavIcon iconKey="account" active={isProfileRoute} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-primary group-hover:text-accent-hover">
                        Profil &amp; Akun
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-secondary">
                        Pesanan, preset tersimpan &amp; preferensi akun.
                      </span>
                    </span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={(event) => handleHrefClick(event, '/settings')}
                    aria-current={isSettingsRoute ? 'page' : undefined}
                    className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-subtle ${focusRing} ${
                      isSettingsRoute ? 'bg-accent-subtle' : ''
                    }`}
                  >
                    <SubNavIcon iconKey="settings" active={isSettingsRoute} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-semibold ${
                          isSettingsRoute
                            ? 'text-accent-hover'
                            : 'text-primary group-hover:text-accent-hover'
                        }`}
                      >
                        Pengaturan &amp; Privasi
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-secondary">
                        Aksesibilitas tampilan, ekspor data &amp; kontrol UU PDP.
                      </span>
                    </span>
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* ───────── Live DM Toast Preview (when away from /messages) ───────── */}
      <DmNotificationToast
        toasts={toasts}
        onDismiss={dismissToast}
        onOpen={(toast) => {
          dismissToast(toast.id);
          startRouteTransition(() => {
            router.push(toast.href);
          });
        }}
      />

      {/* ───────── Standalone Global Search (routes outside ViciTechApp) ───────── */}
      {searchOpen && <NavbarCommandPalette onClose={closeSearch} onNavigate={navigateTo} />}
    </>
  );
}
