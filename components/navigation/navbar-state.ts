export type UserRole = 'guest' | 'member' | 'creator' | 'admin';

export type NavIconKey =
  | 'home'
  | 'market'
  | 'builder'
  | 'tradein'
  | 'partners'
  | 'community';

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

export interface SearchCommandItem {
  readonly label: string;
  readonly hint: string;
  readonly href: string;
  readonly module?: string;
  readonly view?: string;
  readonly keys: string;
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'home',
    href: '/home',
    label: 'Beranda',
    shortLabel: 'Beranda',
    iconKey: 'home',
    matchModules: ['home', 'bottleneck', 'versus', 'account'],
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
    label: 'Preset Builder',
    shortLabel: 'Builder',
    iconKey: 'builder',
    matchModules: ['builder'],
    targetModule: 'builder',
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
  {
    id: 'tradein',
    href: '/home?tab=tradein',
    label: 'Trade-In & IoT QC',
    shortLabel: 'Trade & QC',
    iconKey: 'tradein',
    matchModules: ['tradein', 'qc'],
    targetModule: 'tradein',
    allowedRoles: ['guest', 'member', 'creator', 'admin'],
  },
  {
    id: 'partners',
    href: '/partners',
    label: 'Mitra & Service',
    shortLabel: 'Mitra',
    iconKey: 'partners',
    matchModules: ['partners'],
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

// Mobile bottom bar strictly displays 5 core destinations per DESIGN.md Section 4.
export const MOBILE_BOTTOM_NAV_ITEMS: readonly NavItem[] = [
  PRIMARY_NAV_ITEMS[0],
  PRIMARY_NAV_ITEMS[1],
  PRIMARY_NAV_ITEMS[2],
  PRIMARY_NAV_ITEMS[3],
  PRIMARY_NAV_ITEMS[4],
].filter((item): item is NavItem => Boolean(item));

export const GLOBAL_SEARCH_ITEMS: readonly SearchCommandItem[] = [
  {
    label: 'Buka Beranda Workspace',
    hint: 'Ringkasan ekosistem ViciTech',
    href: '/home',
    module: 'home',
    keys: 'home beranda workspace dashboard overview',
  },
  {
    label: 'Buka Market — Siap Kirim',
    hint: 'Etalase rakitan PC & perangkat siap kirim',
    href: '/market',
    module: 'market',
    view: 'ready',
    keys: 'market ready stock shop store rakitan pc',
  },
  {
    label: 'Buka Market — Hardware Library & Spesifikasi',
    hint: 'Bandingkan ponsel, laptop, part PC & potensi upgrade',
    href: '/market?view=catalog',
    module: 'market',
    view: 'catalog',
    keys: 'library hardware specs gpu cpu ram nvme compare upgrade',
  },
  {
    label: 'Cek Potensi Upgrade Maksimal',
    hint: 'Analisis ekspansi slot RAM & NVMe',
    href: '/market?view=upgrade',
    module: 'market',
    view: 'upgrade',
    keys: 'upgrade analyzer ram nvme slot laptop pc',
  },
  {
    label: 'Buka Preset Builder',
    hint: 'Konfigurator rakitan B2S, B2B & B2C dengan JIT buffer',
    href: '/home?tab=builder',
    module: 'builder',
    keys: 'preset builder configurator cbt lab b2s b2b b2c wattage',
  },
  {
    label: 'Buka Portal Trade-In',
    hint: 'Estimasi buyback & unit refurbished bersertifikat IoT QC',
    href: '/home?tab=tradein',
    module: 'tradein',
    keys: 'tradein buyback sell valuation refurbished',
  },
  {
    label: 'Buka Mesin IoT QC & Telemetri',
    hint: 'Pencarian serial, telemetri Burn-In & 15 titik inspeksi',
    href: '/home?tab=qc',
    module: 'qc',
    keys: 'qc telemetry serial esp32 certificate burn-in',
  },
  {
    label: 'Buka Direktori Mitra & Service',
    hint: 'Toko komponen & pusat layanan terverifikasi',
    href: '/partners',
    keys: 'service mitra partners repair bandung jakarta tasikmalaya surabaya',
  },
  {
    label: 'Buka Komunitas & Pusat Pengetahuan',
    hint: 'Showcase rakitan, panduan lab & tanya jawab teknis',
    href: '/community',
    module: 'community',
    keys: 'community komunitas forum showcase guide q&a',
  },
  {
    label: 'Buka Pesan Langsung (DM)',
    hint: 'Percakapan langsung dengan teknisi & sesama builder',
    href: '/messages',
    module: 'messages',
    keys: 'dm messages chat teknisi pesan',
  },
];

export function isShellOwnedRoute(pathname: string): boolean {
  // Only /admin/* renders its dedicated admin sidebar layout.
  return pathname.startsWith('/admin');
}

/* ───────────── Command bar utilities (data sources, notifications, more menu) ───────────── */

export type DataSourceTone = 'live' | 'simulated' | 'sample';

export interface DataSourceInfo {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly detail: string;
  readonly tone: DataSourceTone;
  readonly href: string;
  readonly module?: string;
  readonly view?: string;
}

export const DATA_SOURCES: readonly DataSourceInfo[] = [
  {
    id: 'live-telemetry',
    label: 'Live ESP32',
    title: 'Sensor IoT QC & Burn-In',
    detail: 'Pembacaan suhu CPU/GPU, voltase, dan stabilitas aktual langsung dari smart bench.',
    tone: 'live',
    href: '/home?tab=qc',
    module: 'qc',
  },
  {
    id: 'simulated-qc',
    label: 'Simulasi IoT QC',
    title: 'Profil simulasi admin',
    detail: 'Skenario uji terkalibrasi yang dipisahkan secara eksplisit dari sensor fisik.',
    tone: 'simulated',
    href: '/home?tab=qc',
    module: 'qc',
  },
  {
    id: 'sample-catalog',
    label: 'Katalog Sampel',
    title: 'Katalog Market & Hardware Library',
    detail: 'Spesifikasi acuan, estimasi harga, dan simulasi upgrade untuk riset awal.',
    tone: 'sample',
    href: '/market?view=catalog',
    module: 'market',
    view: 'catalog',
  },
];

export interface NavNotification {
  readonly id: string;
  readonly text: string;
  readonly ago: string;
  readonly unread: boolean;
  readonly href: string;
  readonly module?: string;
  readonly view?: string;
}

export const SEED_NOTIFICATIONS: readonly NavNotification[] = [
  {
    id: 'n-qc-0412',
    text: 'Pre-order VT-PO-2026-0412 masuk tahap uji beban IoT QC',
    ago: '5 jam lalu',
    unread: true,
    href: '/home?tab=qc',
    module: 'qc',
  },
  {
    id: 'n-price-rtx4060',
    text: 'Harga acuan RTX 4060 turun minggu ini di Market',
    ago: '1 hari lalu',
    unread: true,
    href: '/market?view=catalog',
    module: 'market',
    view: 'catalog',
  },
  {
    id: 'n-community-upvotes',
    text: 'Postingan rakitan Anda mendapat 12 dukungan baru',
    ago: '2 hari lalu',
    unread: false,
    href: '/community',
    module: 'community',
  },
];

export type MoreMenuIconKey = 'qc' | 'messages' | 'bottleneck' | 'versus' | 'account';

export interface MoreMenuItem {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly href: string;
  readonly iconKey: MoreMenuIconKey;
  readonly module?: string;
}

export const MORE_MENU_ITEMS: readonly MoreMenuItem[] = [
  { id: 'qc-panel', label: 'Panel IoT QC', hint: 'Cek nomor seri & telemetri IoT QC', href: '/qc-panel', iconKey: 'qc' },
  { id: 'messages', label: 'Pesan Langsung', hint: 'Obrolan langsung dengan teknisi', href: '/messages', iconKey: 'messages' },
  { id: 'bottleneck', label: 'Analisis Bottleneck AI', hint: 'Analisis keseimbangan CPU, GPU & RAM', href: '/home?tab=bottleneck', iconKey: 'bottleneck', module: 'bottleneck' },
  { id: 'versus', label: 'Versus Arena', hint: 'Perbandingan spesifikasi berdampingan', href: '/home?tab=versus', iconKey: 'versus', module: 'versus' },
  { id: 'account', label: 'Dasbor Akun', hint: 'Pesanan, sertifikat IoT QC & preset tersimpan', href: '/home?tab=account', iconKey: 'account', module: 'account' },
];

export function countUnreadNotifications(items: readonly NavNotification[]): number {
  return items.reduce((total, item) => (item.unread ? total + 1 : total), 0);
}

export function resolveActiveNavId(
  pathname: string | null,
  activeModule: string | null,
): string | null {
  if (activeModule) {
    const moduleMatch = PRIMARY_NAV_ITEMS.find((item) =>
      item.matchModules.includes(activeModule),
    );
    if (moduleMatch) return moduleMatch.id;
  }

  if (!pathname) return null;
  if (pathname === '/') return null;
  if (pathname.startsWith('/market')) return 'market';
  if (pathname.startsWith('/partners')) return 'partners';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/qc-panel')) return 'tradein';
  if (pathname.startsWith('/home')) return 'home';
  return null;
}

export function isActiveRoute(
  pathname: string | null,
  href: string,
  activeModule: string | null = null,
): boolean {
  const activeId = resolveActiveNavId(pathname, activeModule);
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

export function getVisibleNavItems(
  items: readonly NavItem[],
  role: UserRole,
): readonly NavItem[] {
  return items.filter((item) => item.allowedRoles.includes(role));
}
