import type { ReactElement } from 'react';
import type { RoutePreviewItem } from '@/components/features/route-preview/route-preview-content';
import type { ProductRow, ProductStockStatus } from '@/lib/admin/products-validation';
import {
  getCategoryLabel,
  getProductHref,
  getProductValidImages,
  getSellerLabel,
} from '@/lib/market/product-presenter';

function extractNumericPrice(metricValue: string): string | undefined {
  const digits = metricValue.replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : undefined;
}

function extractCityLocality(title: string): string {
  const knownCities = ['Bandung', 'Jakarta Selatan', 'Jakarta', 'Tasikmalaya', 'Surabaya'];
  const match = knownCities.find((city) => title.toLowerCase().includes(city.toLowerCase()));
  return match ?? 'Indonesia';
}

function mapStockAvailability(status: ProductStockStatus): string {
  switch (status) {
    case 'ready':
      return 'https://schema.org/InStock';
    case 'preorder':
      return 'https://schema.org/PreOrder';
    case 'sold_out':
      return 'https://schema.org/OutOfStock';
  }
}

export function buildSingleProductJsonLd(product: ProductRow): Record<string, unknown> {
  const images = getProductValidImages(product);
  const priceNumber = Number(product.price);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || `${product.title} di ViciTech Market`,
    category: getCategoryLabel(product.category),
    sku: product.slug || product.id,
    url: getProductHref(product),
    ...(images.length > 0 ? { image: [...images] } : {}),
    brand: {
      '@type': 'Brand',
      name: getSellerLabel(product.seller_type),
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IDR',
      ...(Number.isFinite(priceNumber) ? { price: Math.round(priceNumber) } : {}),
      availability: mapStockAvailability(product.stock_status),
      url: getProductHref(product),
    },
  };
}

export function buildSupabaseMarketProductsJsonLd(
  products: readonly ProductRow[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'ViciTech Market & Preset Hardware',
    itemListElement: products.slice(0, 24).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: getProductHref(product),
      item: {
        '@type': 'Product',
        name: product.title,
        description: product.description || `${product.title} — ${getCategoryLabel(product.category)}`,
        category: getCategoryLabel(product.category),
        brand: {
          '@type': 'Brand',
          name: getSellerLabel(product.seller_type),
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'IDR',
          price: Math.round(Number(product.price) || 0),
          availability: mapStockAvailability(product.stock_status),
          url: getProductHref(product),
        },
      },
    })),
  };
}

export function buildMarketProductsJsonLd(
  items: readonly RoutePreviewItem[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'ViciTech Market & Preset Hardware',
    itemListElement: items.map((item, index) => {
      const numericPrice = extractNumericPrice(item.metricValue);
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: item.title,
          description: item.subtitle,
          category: item.categoryLabel,
          brand: {
            '@type': 'Brand',
            name: 'ViciTech',
          },
          offers: numericPrice
            ? {
                '@type': 'Offer',
                priceCurrency: 'IDR',
                price: numericPrice,
                availability: 'https://schema.org/InStock',
              }
            : {
                '@type': 'Offer',
                priceCurrency: 'IDR',
                availability: 'https://schema.org/InStock',
              },
        },
      };
    }),
  };
}

export function buildPartnersLocalBusinessJsonLd(
  items: readonly RoutePreviewItem[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'ViciTech Verified Service Centers & Component Stores',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'LocalBusiness',
        name: item.title,
        description: `${item.categoryLabel} — ${item.subtitle}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: extractCityLocality(item.title),
          addressCountry: 'ID',
        },
      },
    })),
  };
}

export function JsonLd({ data }: { readonly data: Record<string, unknown> }): ReactElement {
  const safeJson = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson }} />;
}
