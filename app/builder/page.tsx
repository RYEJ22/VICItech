import type { Metadata } from 'next';
import { BuilderRouteView } from '@/components/vicitech/StandaloneModuleHost';
import { listMarketProducts } from '@/lib/market/products';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Preset Builder | ViciTech',
  description:
    'Rakit PC otomatis untuk kebutuhan kreator, kantor, dan lab CBT lengkap dengan cek kompatibilitas soket, estimasi beban daya PSU, dan buffer pasar JIT 5%.',
  alternates: {
    canonical: '/builder',
  },
};

interface BuilderPageProps {
  readonly searchParams?:
    | Promise<{ readonly productId?: string | string[] }>
    | { readonly productId?: string | string[] };
}

function readSingleParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : '';
}

export default async function BuilderPage({ searchParams }: BuilderPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const productId = readSingleParam(resolvedSearchParams?.productId);
  const { products } = await listMarketProducts();

  return <BuilderRouteView initialProductId={productId} marketProducts={products} />;
}
