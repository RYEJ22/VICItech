import type { Metadata } from "next";
import { MARKET_PREVIEW_ITEMS } from "@/components/features/route-preview/route-preview-content";
import {
  buildMarketProductsJsonLd,
  buildSupabaseMarketProductsJsonLd,
  JsonLd,
} from "@/components/features/seo/json-ld";
import ViciTechApp from "@/components/vicitech/ViciTechApp";
import { listMarketProducts } from "@/lib/market/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Market & Hardware Library | ViciTech",
  description:
    "Jelajahi rakitan PC siap kirim, laptop refurbished lulus IoT QC, komponen terkurasi, katalog spesifikasi hardware, dan analisis upgrade ViciTech.",
  alternates: {
    canonical: "/market",
  },
  openGraph: {
    title: "Market & Hardware Library | ViciTech",
    description:
      "Etalase rakitan PC, laptop IoT QC, katalog spesifikasi hardware, dan analisis potensi upgrade ViciTech.",
    url: "/market",
    images: ["/images/hero/pc-rig.jpg"],
  },
};

interface MarketPageProps {
  readonly searchParams?:
    | Promise<{
        readonly view?: string | string[];
        readonly tab?: string | string[];
        readonly category?: string | string[];
      }>
    | {
        readonly view?: string | string[];
        readonly tab?: string | string[];
        readonly category?: string | string[];
      };
}

function readSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const viewParam = readSingleParam(resolvedSearchParams?.view);
  const tabParam = readSingleParam(resolvedSearchParams?.tab);
  const categoryParam = readSingleParam(resolvedSearchParams?.category);

  const initialView =
    viewParam === "catalog" || viewParam === "library" || tabParam === "library"
      ? "catalog"
      : viewParam === "upgrade"
        ? "upgrade"
        : "ready";

  const { products, error } = await listMarketProducts();

  return (
    <>
      <JsonLd
        data={
          products.length > 0
            ? buildSupabaseMarketProductsJsonLd(products)
            : buildMarketProductsJsonLd(MARKET_PREVIEW_ITEMS)
        }
      />
      <ViciTechApp
        initialModule="market"
        initialView={initialView}
        initialMarketProducts={products}
        initialMarketError={error}
        initialMarketCategory={categoryParam ?? "all"}
      />
    </>
  );
}
