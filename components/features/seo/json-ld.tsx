import type { ReactElement } from 'react';
import type { RoutePreviewItem } from '@/components/features/route-preview/route-preview-content';

function extractNumericPrice(metricValue: string): string | undefined {
  const digits = metricValue.replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : undefined;
}

function extractCityLocality(title: string): string {
  const knownCities = ['Bandung', 'Jakarta Selatan', 'Jakarta', 'Tasikmalaya', 'Surabaya'];
  const match = knownCities.find((city) => title.toLowerCase().includes(city.toLowerCase()));
  return match ?? 'Indonesia';
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
