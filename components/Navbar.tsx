'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  ChevronDown,
  Cpu,
  Database,
  Gauge,
  LayoutGrid,
  MapPin,
  Menu,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShoppingBag,
  Sliders,
  Swords,
  User,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import AuthNavigation from '@/components/vicitech/auth/AuthNavigation';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';
import {
  DATA_SOURCES,
  MOBILE_BOTTOM_NAV_ITEMS,
  MORE_MENU_ITEMS,
  PRIMARY_NAV_ITEMS,
  SEED_NOTIFICATIONS,
  countUnreadNotifications,
  formatUnreadBadge,
  getVisibleNavItems,
  isActiveRoute,
  isShellOwnedRoute,
  normalizeUserRole,
} from './navigation/navbar-state';
import type {
  DataSourceTone,
  MoreMenuIconKey,
  NavIconKey,
  NavItem,
  NavNotification,
  UserRole,
} from './navigation/navbar-state';
import styles from './navigation/navbar.module.css';

const NavbarCommandPalette = dynamic(() => import('./navigation/navbar-command-palette'), {
  ssr: false,
});

interface NavbarProps {
  readonly initialRole?: UserRole;
}

type OpenMenu = 'brand' | 'sources' | 'notifications' | 'more' | null;

const SHELL_ROUTES = ['/home', '/market', '/community'];
const MINIMIZE_AFTER_Y = 80;
const RESTORE_BELOW_Y = 40;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60';
const utilityBtn = `relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium transition-colors duration-150 ${focusRing}`;
const utilityIdle = 'border-default bg-surface text-secondary hover:bg-subtle hover:text-primary';
const utilityOpen = 'border-accent-primary bg-accent-subtle text-primary';
const menuPanel = `absolute top-full z-[60] mt-2 rounded-xl border border-default bg-surface p-2 shadow-2xl ${styles.menuPop ?? ''}`;

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
      return <Sliders className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'tradein':
      return <RefreshCw className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'partners':
      return <MapPin className={className} strokeWidth={1.75} aria-hidden="true" />;
    case 'community':
      return <Users className={className} strokeWidth={1.75} aria-hidden="true" />;
  }
}

function MoreIcon({ iconKey }: { readonly iconKey: MoreMenuIconKey }): ReactElement {
  const cls = 'h-4 w-4 shrink-0 text-accent-primary';
  switch (iconKey) {
    case 'qc':
      return <Activity className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'messages':
      return <MessageSquare className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'bottleneck':
      return <Gauge className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'versus':
      return <Swords className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'account':
      return <User className={cls} strokeWidth={1.75} aria-hidden="true" />;
  }
}

function sourceBadgeClass(tone: DataSourceTone): string {
  switch (tone) {
    case 'live':
      return 'vt-badge-live';
    case 'simulated':
      return 'vt-badge-simulated';
    case 'sample':
      return 'vt-badge-sample';
  }
}

function BrandMark({ compact = false }: { readonly compact?: boolean }): ReactElement {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-accent-primary text-primary shadow-sm ${
        compact ? 'h-8 w-8' : 'h-9 w-9'
      }`}
    >
      <Cpu className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

function NotificationsPanel({
  items,
  onSelect,
  onMarkAllRead,
  align,
}: {
  readonly items: readonly NavNotification[];
  readonly onSelect: (item: NavNotification) => void;
  readonly onMarkAllRead: () => void;
  readonly align: 'left' | 'right';
}): ReactElement {
  const unread = countUnreadNotifications(items);
  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className={`${menuPanel} ${align === 'right' ? 'right-0' : 'left-0'} w-[min(22rem,calc(100vw-1.5rem))]`}
    >
      <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
        <p className="text-sm font-semibold text-primary">Notifications</p>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={unread === 0}
          className={`min-h-9 rounded-full px-2.5 text-xs font-medium text-secondary transition hover:bg-subtle hover:text-primary disabled:cursor-default disabled:opacity-50 ${focusRing}`}
        >
          Mark all read
        </button>
      </div>
      <ul className="grid gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={`flex min-h-11 w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-subtle ${focusRing}`}
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.unread ? 'bg-accent-primary' : 'bg-subtle'}`}
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm leading-snug ${item.unread ? 'font-semibold text-primary' : 'text-secondary'}`}>
                  {item.text}
                </span>
                <span className="mt-0.5 block text-xs text-secondary">{item.ago}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Navbar({ initialRole = 'guest' }: NavbarProps): ReactElement | null {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [notifications, setNotifications] = useState<readonly NavNotification[]>(SEED_NOTIFICATIONS);

  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastScrollYRef = useRef(0);
  const isMinimizedRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  const setMinimizedSynced = useCallback((next: boolean) => {
    if (isMinimizedRef.current === next) return;
    isMinimizedRef.current = next;
    setIsMinimized(next);
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

  const toggleMenu = useCallback((menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  }, []);

  const triggerGlobalSearch = useCallback(() => {
    setOpenMenu(null);
    const commandEvent = new CustomEvent('vicitech:open-command-palette', { cancelable: true });
    const notHandledByShell = window.dispatchEvent(commandEvent);
    if (notHandledByShell) {
      setSearchOpen((prev) => !prev);
    }
  }, []);

  // Track active tab/module when moving inside the client-side ViciTechApp workspace.
  useEffect(() => {
    const syncModuleFromUrl = () => {
      const hashId = window.location.hash.slice(1).split('/')[0];
      if (hashId) {
        setActiveModule(hashId);
        return;
      }
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      setActiveModule(tabParam || null);
    };

    const handleModuleChange = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail?.module === 'string') {
        setActiveModule(event.detail.module);
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
        setOpenMenu(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerGlobalSearch]);

  // Outside click closes any open command-bar dropdown.
  useEffect(() => {
    if (!openMenu) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-nav-menu]')) return;
      setOpenMenu(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openMenu]);

  useEffect(() => {
    setSheetOpen(false);
    setSearchOpen(false);
    setOpenMenu(null);
    setMinimizedSynced(false);
  }, [pathname, setMinimizedSynced]);

  // Scroll-to-minimize: collapse into the compact logo button when scrolling down,
  // restore automatically near the top of the page. Updates only on threshold transitions.
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const evaluateScroll = () => {
      scrollRafRef.current = null;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      if (currentY <= RESTORE_BELOW_Y) {
        setMinimizedSynced(false);
        lastScrollYRef.current = currentY;
        return;
      }
      if (currentY > MINIMIZE_AFTER_Y && delta > 10) {
        if (!isMinimizedRef.current) {
          setMinimizedSynced(true);
          setOpenMenu(null);
        }
        lastScrollYRef.current = currentY;
      } else if (delta < -5) {
        lastScrollYRef.current = currentY;
      }
    };

    const handleScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(evaluateScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [setMinimizedSynced]);

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

  // Role + live DM unread badge from Supabase.
  useEffect(() => {
    if (!isSupabaseAuthConfigured) {
      setRole('guest');
      setUnreadCount(0);
      return undefined;
    }

    let isMounted = true;
    const supabase = getSupabaseBrowserClient();
    let dmChannel: ReturnType<typeof supabase.channel> | null = null;
    let activeDmUserId: string | null = null;

    async function refreshUnreadMessages(userId: string): Promise<void> {
      const { count } = await supabase
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (isMounted && typeof count === 'number') {
        setUnreadCount(count);
      }
    }

    function subscribeToMessages(userId: string): void {
      if (activeDmUserId === userId && dmChannel) return;
      if (dmChannel) {
        void supabase.removeChannel(dmChannel);
      }
      activeDmUserId = userId;
      dmChannel = supabase
        .channel(`nav-unread-dm:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${userId}` },
          () => {
            void refreshUnreadMessages(userId);
          },
        )
        .subscribe();
    }

    async function syncNavigationState(): Promise<void> {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;
        if (authError || !user) {
          activeDmUserId = null;
          if (dmChannel) {
            void supabase.removeChannel(dmChannel);
            dmChannel = null;
          }
          setRole('guest');
          setUnreadCount(0);
          return;
        }

        const [profileResult, unreadResult] = await Promise.all([
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
          supabase
            .from('direct_messages')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('is_read', false),
        ]);

        if (!isMounted) return;
        const appRole = normalizeUserRole(user.app_metadata?.role);
        const profileRole = normalizeUserRole(profileResult.data?.role);
        setRole(appRole === 'admin' ? 'admin' : profileRole === 'guest' ? 'member' : profileRole);
        if (typeof unreadResult.count === 'number') {
          setUnreadCount(unreadResult.count);
        }
        subscribeToMessages(user.id);
      } catch {
        if (isMounted) {
          setRole('guest');
          setUnreadCount(0);
        }
      }
    }

    void syncNavigationState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: string, session: { readonly user?: { readonly id?: string } } | null) => {
      if (event === 'SIGNED_OUT') {
        activeDmUserId = null;
        if (dmChannel) {
          void supabase.removeChannel(dmChannel);
          dmChannel = null;
        }
        if (isMounted) {
          setRole('guest');
          setUnreadCount(0);
        }
        return;
      }
      if (event === 'TOKEN_REFRESHED' && session?.user?.id && session.user.id === activeDmUserId) {
        return;
      }
      void syncNavigationState();
    });

    return () => {
      isMounted = false;
      activeDmUserId = null;
      subscription.unsubscribe();
      if (dmChannel) {
        void supabase.removeChannel(dmChannel);
      }
    };
  }, []);

  const visibleDesktopItems = useMemo(() => getVisibleNavItems(PRIMARY_NAV_ITEMS, role), [role]);
  const visibleBottomItems = useMemo(() => getVisibleNavItems(MOBILE_BOTTOM_NAV_ITEMS, role), [role]);
  const dmBadgeLabel = formatUnreadBadge(unreadCount);
  const unreadNotifications = countUnreadNotifications(notifications);
  const notificationBadge = formatUnreadBadge(unreadNotifications);

  const handleNavClick = useCallback(
    (item: NavItem) => {
      if (item.targetModule && pathname === '/home') {
        window.dispatchEvent(
          new CustomEvent('vicitech:navigate-module', { detail: { module: item.targetModule } }),
        );
      }
    },
    [pathname],
  );

  // Shared navigation for search results, notifications, data sources and More menu.
  const navigateTo = useCallback(
    (targetHref: string, moduleName?: string, viewName?: string) => {
      setSearchOpen(false);
      setOpenMenu(null);
      if (moduleName && pathname && SHELL_ROUTES.includes(pathname)) {
        window.dispatchEvent(
          new CustomEvent('vicitech:navigate-module', { detail: { module: moduleName, view: viewName } }),
        );
        return;
      }
      router.push(targetHref);
    },
    [pathname, router],
  );

  const handleAuthNavigate = useCallback(
    (mod: string) => {
      if (pathname === '/home') {
        window.dispatchEvent(new CustomEvent('vicitech:navigate-module', { detail: { module: mod } }));
      } else {
        router.push(`/home?tab=${encodeURIComponent(mod)}`);
      }
    },
    [pathname, router],
  );

  const selectNotification = useCallback(
    (item: NavNotification) => {
      setNotifications((list) => list.map((n) => (n.id === item.id ? { ...n, unread: false } : n)));
      navigateTo(item.href, item.module, item.view);
    },
    [navigateTo],
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((list) => list.map((n) => ({ ...n, unread: false })));
  }, []);

  const expandNavbar = useCallback(() => {
    setMinimizedSynced(false);
    lastScrollYRef.current = window.scrollY;
  }, [setMinimizedSynced]);

  if (pathname && isShellOwnedRoute(pathname)) return null;

  // In/out animation states (elements stay mounted so exit transitions can play).
  // Wrappers are pointer-events-none so only the pills themselves catch clicks.
  const barState = isMinimized
    ? 'pointer-events-none invisible -translate-y-6 scale-95 opacity-0'
    : 'pointer-events-auto visible translate-y-0 scale-100 opacity-100';
  const pillState = isMinimized
    ? 'pointer-events-none invisible -translate-y-4 scale-95 opacity-0'
    : 'pointer-events-auto visible translate-y-0 scale-100 opacity-100';
  const logoState = isMinimized
    ? 'pointer-events-auto visible translate-y-0 scale-100 opacity-100'
    : 'pointer-events-none invisible -translate-y-2 scale-90 opacity-0';
  const motion = 'transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none';

  const activeItem = visibleDesktopItems.find((item) => isActiveRoute(pathname, item.href, activeModule));

  return (
    <>
      {/* ───────── Desktop Command Floating Pill (md and up) ───────── */}
      <header
        aria-hidden={isMinimized}
        className="pointer-events-none fixed inset-x-0 top-3 z-50 hidden justify-center px-4 md:flex"
      >
        <div
          className={`flex h-14 w-full max-w-6xl items-center gap-2 rounded-full py-1.5 pl-1.5 pr-2 lg:gap-3 ${motion} ${barState} ${styles.floatingPill ?? ''} ${styles.pillEnter ?? ''}`}
        >
          {/* Left: logo + brand dropdown */}
          <div className="relative shrink-0" data-nav-menu>
            <button
              type="button"
              onClick={() => toggleMenu('brand')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'brand'}
              className={`group inline-flex h-11 items-center gap-2 rounded-full pl-1 pr-2.5 transition-colors hover:bg-subtle ${focusRing}`}
            >
              <BrandMark />
              <span className="font-serif text-base font-semibold tracking-tight text-primary">ViciTech</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-secondary transition-transform duration-200 ${openMenu === 'brand' ? 'rotate-180' : ''}`}
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
            {openMenu === 'brand' && (
              <div role="menu" aria-label="ViciTech workspace" className={`${menuPanel} left-0 w-64`}>
                {[
                  { label: 'Welcome page', hint: 'Circular tech ecosystem intro', href: '/' },
                  { label: 'Workspace Home', hint: 'Role-based overview', href: '/home' },
                  { label: 'Market', hint: 'Ready stock + Hardware Library', href: '/market' },
                  { label: 'Service & Mitra', hint: 'Verified partners directory', href: '/partners' },
                ].map((entry) => (
                  <Link
                    key={entry.href}
                    role="menuitem"
                    href={entry.href}
                    onClick={() => setOpenMenu(null)}
                    className={`flex min-h-11 flex-col justify-center rounded-lg px-3 py-2 transition-colors hover:bg-subtle ${focusRing}`}
                  >
                    <span className="text-sm font-medium text-primary">{entry.label}</span>
                    <span className="text-xs text-secondary">{entry.hint}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Center-left: search trigger */}
          <button
            type="button"
            onClick={triggerGlobalSearch}
            aria-label="Search modules, serials, guides (Ctrl K)"
            aria-keyshortcuts="Control+K Meta+K"
            className={`inline-flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-default bg-surface px-3 text-left text-sm text-secondary transition-colors hover:bg-subtle hover:text-primary lg:max-w-sm ${focusRing}`}
          >
            <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="hidden min-w-0 flex-1 truncate lg:inline">Search modules, serials, guides</span>
            <span className="min-w-0 flex-1 truncate lg:hidden">Search</span>
            <kbd className="shrink-0 rounded-full bg-subtle px-2 py-0.5 font-mono text-[10px] font-semibold text-secondary">
              Ctrl K
            </kbd>
          </button>

          {/* Right utilities */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {/* Data sources */}
            <div className="relative" data-nav-menu>
              <button
                type="button"
                onClick={() => toggleMenu('sources')}
                aria-haspopup="dialog"
                aria-expanded={openMenu === 'sources'}
                aria-label="Data sources"
                className={`${utilityBtn} ${openMenu === 'sources' ? utilityOpen : utilityIdle}`}
              >
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-live opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-status-live" />
                </span>
                <Database className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="hidden xl:inline">Data sources</span>
              </button>
              {openMenu === 'sources' && (
                <div role="dialog" aria-label="Data sources" className={`${menuPanel} right-0 w-80`}>
                  <p className="px-2 pb-2 pt-1 text-sm font-semibold text-primary">Data transparency</p>
                  <ul className="grid gap-1">
                    {DATA_SOURCES.map((source) => (
                      <li key={source.id}>
                        <button
                          type="button"
                          onClick={() => navigateTo(source.href, source.module, source.view)}
                          className={`flex min-h-11 w-full flex-col items-start gap-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-subtle ${focusRing}`}
                        >
                          <span className={sourceBadgeClass(source.tone)}>{source.label}</span>
                          <span className="text-sm font-medium text-primary">{source.title}</span>
                          <span className="text-xs leading-relaxed text-secondary">{source.detail}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative" data-nav-menu>
              <button
                type="button"
                onClick={() => toggleMenu('notifications')}
                aria-haspopup="dialog"
                aria-expanded={openMenu === 'notifications'}
                aria-label={notificationBadge ? `Notifications (${unreadNotifications} unread)` : 'Notifications'}
                className={`${utilityBtn} w-9 px-0 ${openMenu === 'notifications' ? utilityOpen : utilityIdle}`}
              >
                <Bell className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                {notificationBadge && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent-primary px-1 py-0.5 font-mono text-[10px] font-bold leading-none tabular-nums text-primary">
                    {notificationBadge}
                  </span>
                )}
              </button>
              {openMenu === 'notifications' && (
                <NotificationsPanel
                  items={notifications}
                  onSelect={selectNotification}
                  onMarkAllRead={markAllNotificationsRead}
                  align="right"
                />
              )}
            </div>

            {/* More menu */}
            <div className="relative" data-nav-menu>
              <button
                type="button"
                onClick={() => toggleMenu('more')}
                aria-haspopup="menu"
                aria-expanded={openMenu === 'more'}
                aria-label={dmBadgeLabel ? `More (${unreadCount} unread messages)` : 'More'}
                className={`${utilityBtn} ${openMenu === 'more' ? utilityOpen : utilityIdle}`}
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span className="hidden xl:inline">More</span>
                {dmBadgeLabel && (
                  <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent-primary" />
                )}
              </button>
              {openMenu === 'more' && (
                <div role="menu" aria-label="More tools" className={`${menuPanel} right-0 w-72`}>
                  {MORE_MENU_ITEMS.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      role="menuitem"
                      onClick={() => navigateTo(entry.href, entry.module)}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-subtle ${focusRing}`}
                    >
                      <MoreIcon iconKey={entry.iconKey} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-primary">{entry.label}</span>
                        <span className="block text-xs text-secondary">{entry.hint}</span>
                      </span>
                      {entry.iconKey === 'messages' && dmBadgeLabel && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent-primary px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-primary">
                          {dmBadgeLabel}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile pill, Admin QC Portal (admins only), Sign In / Sign Out */}
            <AuthNavigation
              onAuthState={undefined}
              onNotify={undefined}
              onNavigate={handleAuthNavigate}
              onSignOut={undefined}
            />
          </div>
        </div>
      </header>

      {/* ───────── Desktop Floating Pill Sub-Nav (merged Market) ───────── */}
      <div
        aria-hidden={isMinimized}
        className="pointer-events-none fixed inset-x-0 top-[5rem] z-40 hidden justify-center px-4 md:flex"
      >
        <nav
          aria-label="Navigasi utama ViciTech"
          className={`max-w-full ${motion} ${pillState}`}
        >
          <div
            className={`flex items-center gap-0.5 overflow-x-auto rounded-full p-1.5 lg:gap-1 ${styles.floatingPill ?? ''} ${styles.pillEnter ?? ''}`}
          >
            {visibleDesktopItems.map((item) => {
              const active = isActiveRoute(pathname, item.href, activeModule);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => handleNavClick(item)}
                  aria-current={active ? 'page' : undefined}
                  tabIndex={isMinimized ? -1 : undefined}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs transition-colors duration-200 lg:px-3.5 lg:text-sm ${focusRing} ${
                    active
                      ? 'bg-accent-primary font-semibold text-primary shadow-sm hover:bg-accent-hover hover:text-accent-foreground'
                      : 'font-medium text-secondary hover:bg-subtle hover:text-primary'
                  }`}
                >
                  <NavIcon iconKey={item.iconKey} className="hidden h-4 w-4 shrink-0 xl:block" />
                  <span className="lg:hidden">{item.shortLabel}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ───────── Mobile Command Floating Pill (< md) ───────── */}
      <header
        aria-hidden={isMinimized}
        className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 md:hidden"
      >
        <div
          className={`flex h-14 w-full items-center justify-between gap-2 rounded-full py-1.5 pl-1.5 pr-2 ${motion} ${barState} ${styles.floatingPill ?? ''} ${styles.pillEnter ?? ''}`}
        >
          <Link href="/" className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full ${focusRing}`}>
            <BrandMark compact />
            <span className="font-serif text-base font-semibold tracking-tight text-primary">ViciTech</span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={triggerGlobalSearch}
              aria-label="Search modules, serials, guides"
              className={`${utilityBtn} w-9 px-0 ${utilityIdle}`}
            >
              <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>

            <div className="relative" data-nav-menu>
              <button
                type="button"
                onClick={() => toggleMenu('notifications')}
                aria-haspopup="dialog"
                aria-expanded={openMenu === 'notifications'}
                aria-label={notificationBadge ? `Notifications (${unreadNotifications} unread)` : 'Notifications'}
                className={`${utilityBtn} w-9 px-0 ${openMenu === 'notifications' ? utilityOpen : utilityIdle}`}
              >
                <Bell className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                {notificationBadge && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 py-0.5 font-mono text-[9px] font-bold leading-none tabular-nums text-primary">
                    {notificationBadge}
                  </span>
                )}
              </button>
              {openMenu === 'notifications' && (
                <NotificationsPanel
                  items={notifications}
                  onSelect={selectNotification}
                  onMarkAllRead={markAllNotificationsRead}
                  align="right"
                />
              )}
            </div>

            <AuthNavigation
              onAuthState={undefined}
              onNotify={undefined}
              onNavigate={handleAuthNavigate}
              onSignOut={undefined}
            />

            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label="Buka menu navigasi lainnya"
              aria-expanded={sheetOpen}
              aria-controls="mobile-nav-bottom-sheet"
              className={`${utilityBtn} w-9 px-0 ${utilityIdle}`}
            >
              <Menu className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* ───────── Minimized ViciTech logo button (all breakpoints) ───────── */}
      <button
        type="button"
        onClick={expandNavbar}
        aria-hidden={!isMinimized}
        tabIndex={isMinimized ? 0 : -1}
        aria-label="Expand ViciTech navigation"
        className={`group fixed left-3 top-3 z-50 flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-primary md:left-4 md:top-4 ${motion} ${logoState} ${styles.floatingPill ?? ''} ${styles.floatingPillMinimized ?? ''} ${focusRing}`}
      >
        <BrandMark compact />
        <span className="font-serif text-sm font-semibold tracking-tight">ViciTech</span>
        {activeItem && (
          <span className="hidden rounded-full bg-subtle px-2 py-0.5 text-[11px] font-medium text-secondary sm:inline">
            {activeItem.shortLabel}
          </span>
        )}
        {(unreadNotifications > 0 || unreadCount > 0) && (
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent-primary" />
        )}
        <ChevronDown className="h-3.5 w-3.5 text-secondary" strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* Safe top clearance beneath the floating command + nav pills (Hero handles its own offset on "/") */}
      <div aria-hidden="true" className={pathname === '/' ? 'h-0' : 'h-20 md:h-36'} />

      {/* ───────── Mobile Fixed Bottom Navigation (< md, 5 core items) ───────── */}
      <nav aria-label="Navigasi bawah mobile" className={`md:hidden ${styles.bottomNav ?? ''}`}>
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-1.5 pt-1">
          {visibleBottomItems.map((item) => {
            const active = isActiveRoute(pathname, item.href, activeModule);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => handleNavClick(item)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] leading-tight transition-colors duration-150 ${focusRing} ${
                    active ? 'bg-accent-subtle font-semibold text-primary' : 'font-medium text-secondary hover:bg-subtle hover:text-primary'
                  }`}
                >
                  <NavIcon iconKey={item.iconKey} className={`h-5 w-5 ${active ? 'text-accent-primary' : 'text-secondary'}`} />
                  <span className="truncate">{item.shortLabel}</span>
                  {active && <span aria-hidden="true" className="mt-0.5 h-1 w-4 rounded-full bg-accent-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ───────── Mobile Bottom Sheet (full menu + utilities) ───────── */}
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
                <p className="font-serif text-base font-semibold text-primary">Navigasi ViciTech</p>
                <p className="text-xs text-secondary">Ekosistem Circular IT &amp; Hardware</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeSheet}
                aria-label="Tutup menu navigasi"
                className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-default bg-subtle text-primary transition-colors hover:bg-canvas ${focusRing}`}
              >
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Menu lengkap mobile" className="grid gap-1.5 p-4">
              {visibleDesktopItems.map((item) => {
                const active = isActiveRoute(pathname, item.href, activeModule);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      handleNavClick(item);
                      closeSheet();
                    }}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors ${focusRing} ${
                      active ? 'bg-accent-primary font-semibold text-primary' : 'bg-subtle text-primary hover:bg-canvas'
                    }`}
                  >
                    <NavIcon iconKey={item.iconKey} className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <p className="mt-2 px-1 text-xs font-semibold uppercase tracking-wide text-secondary">More tools</p>
              {MORE_MENU_ITEMS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    closeSheet();
                    navigateTo(entry.href, entry.module);
                  }}
                  className={`flex min-h-11 items-center gap-3 rounded-lg border border-default bg-surface px-3.5 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-subtle ${focusRing}`}
                >
                  <MoreIcon iconKey={entry.iconKey} />
                  <span className="flex-1">{entry.label}</span>
                  {entry.iconKey === 'messages' && dmBadgeLabel && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent-primary px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-primary">
                      {dmBadgeLabel}
                    </span>
                  )}
                </button>
              ))}

              <p className="mt-2 px-1 text-xs font-semibold uppercase tracking-wide text-secondary">Data sources</p>
              <div className="flex flex-wrap gap-1.5 px-1">
                {DATA_SOURCES.map((source) => (
                  <span key={source.id} className={sourceBadgeClass(source.tone)}>
                    {source.label}
                  </span>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* ───────── Standalone Global Search (routes outside ViciTechApp) ───────── */}
      {searchOpen && <NavbarCommandPalette onClose={closeSearch} onNavigate={navigateTo} />}
    </>
  );
}
