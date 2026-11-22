export type UserRole = 'guest' | 'member' | 'creator' | 'admin';

export type NavIconKey =
  | 'home'
  | 'market'
  | 'builder'
  | 'tradein'
  | 'partners'
  | 'community';

export type NavSubIconKey =
  | NavIconKey
  | 'library'
  | 'bottleneck'
  | 'versus'
  | 'upgrade'
  | 'qc'
  | 'messages'
  | 'account';

export type DesktopNavUmbrellaId = 'market' | 'toolkit' | 'services' | 'community';

export interface NavItem {
  readonly id: string;
  readonly href: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly iconKey: NavIconKey;
  readonly matchModules: readonly string[];
  readonly targetModule?: string;
  readonly allowedRoles: readonly [UserRole, ...UserRole[]];
}

export interface NavSubItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly iconKey: NavSubIconKey;
  readonly targetModule?: string;
  readonly targetView?: string;
}

export interface DesktopNavGroup {
  readonly id: DesktopNavUmbrellaId;
  readonly label: string;
  readonly href?: string;
  readonly description?: string;
  readonly items?: readonly NavSubItem[];
  readonly allowedRoles: readonly [UserRole, ...UserRole[]];
}

export interface SearchCommandItem {
  readonly label: string;
  readonly hint: string;
  readonly href: string;
  readonly module?: string;
  readonly view?: string;
  readonly keys: string;
}

export const DESKTOP_NAV_GROUPS: readonly DesktopNavGroup[] = [
  {
    id: 'market',
    label: 'Market',
    items: [
      {
        id: 'market-ready',
        label: 'Etalase Market',
        description: 'PC rakitan siap kirim & unit laptop lulus uji IoT QC.',
        href: '/market',
        iconKey: 'market',
        targetModule: 'market',
        targetView: 'ready',
      },
      {
        id: 'market-catalog',
        label: 'Hardware Library',
        description: 'Katalog spesifikasi CPU, GPU, laptop & komponen lengkap.',
        href: '/market?view=catalog',
        iconKey: 'library',
        targetModule: 'market',
        targetView: 'catalog',
      },
    ],
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
  {
    id: 'toolkit',
    label: 'Toolkit',
    items: [
      {
        id: 'toolkit-builder',
        label: 'Preset Builder',
        description: 'Rakit PC otomatis dengan cek kompatibilitas soket & TDP.',
        href: '/home?tab=builder',
        iconKey: 'builder',
        targetModule: 'builder',
      },
      {
        id: 'toolkit-bottleneck',
        label: 'Bottleneck Analyzer',
        description: 'Hitung keseimbangan performa CPU & GPU.',
        href: '/home?tab=bottleneck',
        iconKey: 'bottleneck',
        targetModule: 'bottleneck',
      },
      {
        id: 'toolkit-versus',
        label: 'Versus Arena',
        description: 'Bandingkan spesifikasi hardware head-to-head.',
        href: '/home?tab=versus',
        iconKey: 'versus',
        targetModule: 'versus',
      },
      {
        id: 'toolkit-upgrade',
        label: 'Upgrade Analyzer',
        description: 'Cek potensi ekspansi RAM & storage perangkatmu.',
        href: '/market?view=upgrade',
        iconKey: 'upgrade',
        targetModule: 'market',
        targetView: 'upgrade',
      },
    ],
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
  {
    id: 'services',
    label: 'Layanan & QC',
    items: [
      {
        id: 'service-qc',
        label: 'Panel IoT QC',
        description: 'Lacak status perakitan & telemetri burn-in ESP32.',
        href: '/qc-panel',
        iconKey: 'qc',
      },
      {
        id: 'service-tradein',
        label: 'Trade-In & Refurbished',
        description: 'Tukar tambah perangkat lama & unit bekas terverifikasi.',
        href: '/home?tab=tradein',
        iconKey: 'tradein',
        targetModule: 'tradein',
      },
      {
        id: 'service-partners',
        label: 'Mitra & Service',
        description: 'Cari toko komponen & service center lokal tepercaya.',
        href: '/partners',
        iconKey: 'partners',
      },
    ],
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
  {
    id: 'community',
    label: 'Komunitas',
    href: '/community',
    description: 'Showcase rakitan, panduan teknis & tanya jawab komunitas.',
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
];

// Core 5 items synced between mobile bottom navigation and the umbrella taxonomy.
export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'home',
    href: '/home',
    label: 'Beranda',
    shortLabel: 'Beranda',
    iconKey: 'home',
    matchModules: ['home', 'account'],
    targetModule: 'home',
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
  {
    id: 'market',
    href: '/market',
    label: 'Market',
    shortLabel: 'Market',
    iconKey: 'market',
    matchModules: ['market', 'library'],
    targetModule: 'market',
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
  {
    id: 'builder',
    href: '/home?tab=builder',
    label: 'Toolkit',
    shortLabel: 'Toolkit',
    iconKey: 'builder',
    matchModules: ['builder', 'bottleneck', 'versus'],
    targetModule: 'builder',
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
  {
    id: 'tradein',
    href: '/home?tab=tradein',
    label: 'Layanan & QC',
    shortLabel: 'Layanan',
    iconKey: 'tradein',
    matchModules: ['tradein', 'qc', 'partners'],
    targetModule: 'tradein',
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
  {
    id: 'community',
    href: '/community',
    label: 'Komunitas',
    shortLabel: 'Komunitas',
    iconKey: 'community',
    matchModules: ['community'],
    targetModule: 'community',
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
];

export const MOBILE_BOTTOM_NAV_ITEMS: readonly NavItem[] = PRIMARY_NAV_ITEMS;

export const GLOBAL_SEARCH_ITEMS: readonly SearchCommandItem[] = [
  {
    label: 'Buka Beranda Workspace',
    hint: 'Ringkasan ekosistem ViciTech',
    href: '/home',
    module: 'home',
    keys: 'home beranda workspace dashboard overview',
  },
  {
    label: 'Etalase Market — Siap Kirim',
    hint: 'PC rakitan siap kirim & unit laptop lulus uji IoT QC',
    href: '/market',
    module: 'market',
    view: 'ready',
    keys: 'market ready stock shop store rakitan pc',
  },
  {
    label: 'Hardware Library & Spesifikasi',
    hint: 'Katalog spesifikasi CPU, GPU, laptop & komponen lengkap',
    href: '/market?view=catalog',
    module: 'market',
    view: 'catalog',
    keys: 'library hardware specs gpu cpu ram nvme compare',
  },
  {
    label: 'Upgrade Analyzer',
    hint: 'Cek potensi ekspansi RAM & storage perangkatmu',
    href: '/market?view=upgrade',
    module: 'market',
    view: 'upgrade',
    keys: 'upgrade analyzer ram nvme slot laptop pc',
  },
  {
    label: 'Preset Builder',
    hint: 'Rakit PC otomatis dengan cek kompatibilitas soket & TDP',
    href: '/home?tab=builder',
    module: 'builder',
    keys: 'preset builder configurator cbt lab b2s b2b b2c wattage',
  },
  {
    label: 'Bottleneck Analyzer',
    hint: 'Hitung keseimbangan performa CPU & GPU',
    href: '/home?tab=bottleneck',
    module: 'bottleneck',
    keys: 'bottleneck analyzer cpu gpu fps kalkulator performa',
  },
  {
    label: 'Versus Arena',
    hint: 'Bandingkan spesifikasi hardware head-to-head',
    href: '/home?tab=versus',
    module: 'versus',
    keys: 'versus arena compare bandingkan hardware head-to-head',
  },
  {
    label: 'Panel IoT QC & Telemetri',
    hint: 'Lacak status perakitan & telemetri burn-in ESP32',
    href: '/qc-panel',
    keys: 'qc telemetry serial esp32 certificate burn-in panel',
  },
  {
    label: 'Trade-In & Refurbished',
    hint: 'Tukar tambah perangkat lama & unit bekas terverifikasi',
    href: '/home?tab=tradein',
    module: 'tradein',
    keys: 'tradein buyback sell valuation refurbished',
  },
  {
    label: 'Mitra & Service Center',
    hint: 'Cari toko komponen & service center lokal tepercaya',
    href: '/partners',
    keys: 'service mitra partners repair bandung jakarta tasikmalaya surabaya',
  },
  {
    label: 'Komunitas ViciTech',
    hint: 'Showcase rakitan, panduan teknis & tanya jawab komunitas',
    href: '/community',
    module: 'community',
    keys: 'community komunitas forum showcase guide q&a',
  },
  {
    label: 'Pesan Langsung (DM)',
    hint: 'Percakapan langsung dengan teknisi & sesama builder',
    href: '/messages',
    module: 'messages',
    keys: 'dm messages chat teknisi pesan',
  },
  {
    label: 'Profil & Akun',
    hint: 'Kartu profil publik, pesanan, preset tersimpan & pengaturan',
    href: '/profile',
    keys: 'profil akun profile account pesanan preset kustomisasi',
  },
];

export function isShellOwnedRoute(pathname: string): boolean {
  // Only /admin/* renders its dedicated admin sidebar layout.
  return pathname.startsWith('/admin');
}

export type NotificationType = 'like' | 'comment' | 'dm' | 'system';

export interface DatabaseNotificationRow {
  readonly id: string;
  readonly actor_id?: string | null;
  readonly type: NotificationType | string;
  readonly entity_id?: string | null;
  readonly title: string | null;
  readonly body: string | null;
  readonly is_read: boolean;
  readonly created_at: string;
}

export interface NavNotification {
  readonly id: string;
  readonly title: string;
  readonly body: string | null;
  readonly type: NotificationType;
  readonly createdAt: string;
  readonly unread: boolean;
  readonly href: string;
  readonly module?: string;
  readonly view?: string;
}

export function formatNotificationRelativeTime(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (!Number.isFinite(ts)) return 'baru saja';
  const diffMinutes = Math.floor((Date.now() - ts) / 60000);
  if (diffMinutes < 1) return 'baru saja';
  if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hr lalu`;
}

export function mapNotificationRow(row: DatabaseNotificationRow): NavNotification {
  const normalizedType: NotificationType =
    row.type === 'dm' || row.type === 'like' || row.type === 'comment' || row.type === 'system'
      ? row.type
      : 'system';

  const destination =
    normalizedType === 'dm'
      ? { href: '/messages', module: 'messages' }
      : normalizedType === 'like' || normalizedType === 'comment'
        ? { href: '/community', module: 'community' }
        : { href: '/home', module: 'home' };

  const defaultTitle =
    normalizedType === 'dm'
      ? 'Pesan langsung baru'
      : normalizedType === 'like'
        ? 'Postingan Anda disukai'
        : normalizedType === 'comment'
          ? 'Komentar baru pada postingan Anda'
          : 'Notifikasi ViciTech';

  return {
    id: row.id,
    title: row.title?.trim() || defaultTitle,
    body: row.body?.trim() || null,
    type: normalizedType,
    createdAt: row.created_at,
    unread: !row.is_read,
    href: destination.href,
    module: destination.module,
  };
}

export function countUnreadNotifications(items: readonly NavNotification[]): number {
  return items.reduce((total, item) => (item.unread ? total + 1 : total), 0);
}

export function resolveActiveUmbrellaId(
  pathname: string | null,
  activeModule: string | null,
  activeView: string | null = null,
): DesktopNavUmbrellaId | null {
  if (activeModule) {
    if (activeModule === 'market' || activeModule === 'library') {
      return activeView === 'upgrade' ? 'toolkit' : 'market';
    }
    if (activeModule === 'builder' || activeModule === 'bottleneck' || activeModule === 'versus') {
      return 'toolkit';
    }
    if (activeModule === 'tradein' || activeModule === 'qc') {
      return 'services';
    }
    if (activeModule === 'community') {
      return 'community';
    }
    if (activeModule === 'home' || activeModule === 'account') {
      return null;
    }
  }

  if (!pathname || pathname === '/') return null;
  if (pathname.startsWith('/market')) {
    return activeView === 'upgrade' ? 'toolkit' : 'market';
  }
  if (pathname.startsWith('/qc-panel') || pathname.startsWith('/partners')) {
    return 'services';
  }
  if (pathname.startsWith('/community')) {
    return 'community';
  }
  return null;
}

export function isSubItemActive(
  item: NavSubItem,
  pathname: string | null,
  activeModule: string | null,
  activeView: string | null = null,
): boolean {
  if (item.targetModule === 'market') {
    const inMarket = activeModule === 'market' || (!activeModule && Boolean(pathname?.startsWith('/market')));
    if (!inMarket) return false;
    if (item.targetView === 'ready') {
      return !activeView || activeView === 'ready';
    }
    return activeView === item.targetView;
  }

  if (item.targetModule) {
    return activeModule === item.targetModule;
  }

  if (!pathname) return false;
  const baseHref = item.href.split('?')[0]?.split('#')[0] ?? item.href;
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

export function resolveActiveNavId(
  pathname: string | null,
  activeModule: string | null,
  activeView: string | null = null,
): string | null {
  if ((activeModule === 'market' || (!activeModule && pathname?.startsWith('/market'))) && activeView === 'upgrade') {
    return 'builder';
  }

  if (activeModule) {
    const moduleMatch = PRIMARY_NAV_ITEMS.find((item) =>
      item.matchModules.includes(activeModule),
    );
    if (moduleMatch) return moduleMatch.id;
  }

  if (!pathname || pathname === '/') return null;
  if (pathname.startsWith('/market')) return 'market';
  if (pathname.startsWith('/partners') || pathname.startsWith('/qc-panel')) return 'tradein';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/home')) return 'home';
  return null;
}

export function isActiveRoute(
  pathname: string | null,
  href: string,
  activeModule: string | null = null,
  activeView: string | null = null,
): boolean {
  const activeId = resolveActiveNavId(pathname, activeModule, activeView);
  const matchingItem = PRIMARY_NAV_ITEMS.find((item) => item.href === href);
  if (matchingItem && activeId) {
    return matchingItem.id === activeId;
  }

  if (!pathname) return false;
  const baseHref = href.split('?')[0]?.split('#')[0] ?? href;
  if (baseHref === '/') return pathname === '/';
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

export function formatUnreadBadge(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const whole = Math.floor(count);
  return whole > 99 ? '99+' : String(whole);
}

export function normalizeUserRole(raw: unknown): UserRole {
  if (raw === 'admin') return 'admin';
  if (raw === 'creator') return 'creator';
  if (raw === 'member' || raw === 'user') return 'member';
  return 'guest';
}

export function getVisibleNavItems<T extends { readonly allowedRoles: readonly UserRole[] }>(
  items: readonly T[],
  role: UserRole,
): readonly T[] {
  return items.filter((item) => item.allowedRoles.includes(role));
}
