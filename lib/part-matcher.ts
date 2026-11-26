import type { ProductRow } from '@/lib/admin/products-validation';

export type PartCategory =
  | 'cpu'
  | 'mobo'
  | 'gpu'
  | 'ram'
  | 'ssd'
  | 'storage'
  | 'psu'
  | 'cooler'
  | 'case'
  | 'monitor';

export interface PartnerStoreLink {
  readonly store: 'Tokopedia' | 'Shopee';
  readonly label: string;
  readonly url: string;
}

export interface MatchedMarketPart {
  readonly matched: true;
  readonly badge: 'Tersedia di ViciTech Market';
  readonly ctaLabel: 'Beli di ViciTech';
  readonly href: string;
  readonly productId: string;
  readonly productTitle: string;
  readonly price: number;
  readonly stockStatus: string;
  readonly score: number;
  readonly partnerLinks: readonly PartnerStoreLink[];
}

export interface AffiliateFallbackPart {
  readonly matched: false;
  readonly badge: 'Cek di Toko Resmi (Partner)';
  readonly ctaLabel: 'Cek Partner';
  readonly href: string;
  readonly primaryStore: 'Tokopedia';
  readonly partnerLinks: readonly PartnerStoreLink[];
  readonly marketSearchHref: string;
}

export type PartMatchResult = MatchedMarketPart | AffiliateFallbackPart;

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'tanpa',
  'dengan',
  'untuk',
  'unit',
  'seri',
  'series',
  'edition',
  'pro',
  'plus',
  'max',
  'official',
  'resmi',
  'garansi',
  'box',
  'tray',
  'oem',
  'igpu',
  'terintegrasi',
  'bawaan',
  'cpu',
  'gpu',
  'ram',
  'ssd',
  'psu',
  'pc',
]);

const CATEGORY_SEARCH_HINT: Readonly<Record<PartCategory, string>> = {
  cpu: 'processor',
  mobo: 'motherboard',
  gpu: 'vga',
  ram: 'ram',
  ssd: 'ssd',
  storage: 'ssd',
  psu: 'power supply',
  cooler: 'cpu cooler',
  case: 'casing pc',
  monitor: 'monitor',
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenizeComponent(name: string): readonly string[] {
  return normalizeText(name)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function isModelIdentifier(token: string): boolean {
  return /\d/.test(token) && token.length >= 3;
}

function cleanSearchQuery(componentName: string, category?: PartCategory): string {
  const cleaned = componentName
    .replace(/\(.*?\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return category ? CATEGORY_SEARCH_HINT[category] : 'komponen pc';
  }

  // If the name is generic like "16 GB DDR4-3200", prefix a concise hint for better store results.
  const lower = cleaned.toLowerCase();
  if (category === 'ram' && !lower.includes('ram')) {
    return `RAM ${cleaned}`;
  }
  if ((category === 'ssd' || category === 'storage') && !lower.includes('ssd') && !lower.includes('hdd')) {
    return `SSD ${cleaned}`;
  }
  if (category === 'psu' && !lower.includes('psu') && !lower.includes('power')) {
    return `PSU ${cleaned}`;
  }
  return cleaned;
}

function appendAffiliateParams(baseUrl: string, envParam?: string): string {
  const cleaned = (envParam ?? '').trim().replace(/^[?&]+/, '');
  if (!cleaned) {
    return `${baseUrl}&utm_source=vicitech&utm_medium=affiliate_bridge`;
  }
  return `${baseUrl}&${cleaned}`;
}

export function buildPartnerStoreLinks(
  componentName: string,
  category?: PartCategory,
): readonly PartnerStoreLink[] {
  const safeName = typeof componentName === 'string' ? componentName : '';
  const query = cleanSearchQuery(safeName, category);
  const encoded = encodeURIComponent(query);

  const tokpedBase = `https://www.tokopedia.com/search?st=product&q=${encoded}&official=true`;
  const shopeeBase = `https://shopee.co.id/search?keyword=${encoded}&official_mall=1`;

  return [
    {
      store: 'Tokopedia',
      label: 'Cek di Toko Resmi Tokopedia (Partner)',
      url: appendAffiliateParams(tokpedBase, process.env.NEXT_PUBLIC_TOKOPEDIA_AFFILIATE_PARAM),
    },
    {
      store: 'Shopee',
      label: 'Cek di Shopee Mall (Partner)',
      url: appendAffiliateParams(shopeeBase, process.env.NEXT_PUBLIC_SHOPEE_AFFILIATE_PARAM),
    },
  ];
}

export function buildMarketCatalogUrl(query?: string): string {
  const trimmed = query?.trim();
  if (!trimmed) {
    return '/market?category=component';
  }
  return `/market?category=component&q=${encodeURIComponent(trimmed)}`;
}

function isProductAvailable(product: ProductRow): boolean {
  const status = String(product.stock_status ?? '').toLowerCase();
  return status !== 'sold_out';
}

function buildProductHaystack(product: ProductRow): string {
  const parts: string[] = [
    String(product.title ?? ''),
    String(product.slug ?? ''),
    String(product.description ?? ''),
  ];
  if (product.specs && typeof product.specs === 'object') {
    parts.push(JSON.stringify(product.specs));
  }
  return normalizeText(parts.join(' '));
}

export function matchPartToMarket(
  componentName: string,
  category: PartCategory,
  marketProducts: readonly ProductRow[] = [],
): PartMatchResult {
  const safeName = typeof componentName === 'string' ? componentName : '';
  const safeProducts = Array.isArray(marketProducts) ? marketProducts : [];
  const partnerLinks = buildPartnerStoreLinks(safeName, category);
  const marketSearchHref = buildMarketCatalogUrl(cleanSearchQuery(safeName, category));

  const normalizedQuery = normalizeText(safeName);
  const tokens = tokenizeComponent(safeName);

  // Skip matching placeholder/integrated options such as "Tanpa Monitor" or "Grafis Terintegrasi"
  if (
    !normalizedQuery ||
    normalizedQuery.startsWith('tanpa ') ||
    normalizedQuery.includes('terintegrasi') ||
    normalizedQuery.includes('cooler bawaan')
  ) {
    return {
      matched: false,
      badge: 'Cek di Toko Resmi (Partner)',
      ctaLabel: 'Cek Partner',
      href: partnerLinks[0].url,
      primaryStore: 'Tokopedia',
      partnerLinks,
      marketSearchHref,
    };
  }

  let bestProduct: ProductRow | null = null;
  let bestScore = 0;

  for (const product of safeProducts) {
    if (!product || !isProductAvailable(product)) continue;

    const productCategory = String(product.category ?? '').toLowerCase();
    // Prioritize individual component/accessory listings over unrelated full PC builds.
    const isComponentListing = productCategory === 'component' || productCategory === 'accessory';
    if (!isComponentListing && productCategory !== 'pc-build') continue;

    const titleNorm = normalizeText(String(product.title ?? ''));
    const haystack = buildProductHaystack(product);
    if (!haystack) continue;

    let score = 0;

    if (titleNorm && (titleNorm.includes(normalizedQuery) || normalizedQuery.includes(titleNorm))) {
      score += 8;
    }

    let matchedModelTokens = 0;
    let totalModelTokens = 0;

    for (const token of tokens) {
      const modelToken = isModelIdentifier(token);
      if (modelToken) totalModelTokens += 1;

      if (titleNorm.includes(token)) {
        score += modelToken ? 4 : 2;
        if (modelToken) matchedModelTokens += 1;
      } else if (haystack.includes(token)) {
        score += modelToken ? 2 : 1;
        if (modelToken) matchedModelTokens += 1;
      }
    }

    if (isComponentListing) {
      score += 1;
    } else if (score < 8) {
      // Do not match a full PC build for a single component unless it's a very strong title match.
      continue;
    }

    // Require at least one model identifier match if the component name has model identifiers.
    if (totalModelTokens > 0 && matchedModelTokens === 0) {
      continue;
    }

    if (score > bestScore) {
      bestScore = score;
      bestProduct = product;
    }
  }

  if (bestProduct && bestScore >= 6) {
    const identifier = bestProduct.slug || bestProduct.id;
    return {
      matched: true,
      badge: 'Tersedia di ViciTech Market',
      ctaLabel: 'Beli di ViciTech',
      href: `/market/${encodeURIComponent(identifier)}`,
      productId: bestProduct.id,
      productTitle: bestProduct.title,
      price: Number(bestProduct.price) || 0,
      stockStatus: String(bestProduct.stock_status ?? 'ready'),
      score: bestScore,
      partnerLinks,
    };
  }

  return {
    matched: false,
    badge: 'Cek di Toko Resmi (Partner)',
    ctaLabel: 'Cek Partner',
    href: partnerLinks[0].url,
    primaryStore: 'Tokopedia',
    partnerLinks,
    marketSearchHref,
  };
}
