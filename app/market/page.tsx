import type { Metadata } from "next";
import { MARKET_PREVIEW_ITEMS } from "@/components/features/route-preview/route-preview-content";
import { buildMarketProductsJsonLd, JsonLd } from "@/components/features/seo/json-ld";
import ViciTechApp from "@/components/vicitech/ViciTechApp";

export const metadata: Metadata = {
  title: "Market & Hardware Library | ViciTech",
  description:
    "Explore curated ready-stock PCs, QC-pass refurbished workstations, hardware specs library, and upgrade analyzer inside ViciTech.",
  alternates: {
    canonical: "/market",
  },
  openGraph: {
    title: "Market & Hardware Library | ViciTech",
    description:
      "Etalase rakitan PC, laptop QC-pass, katalog spesifikasi hardware, dan analisis potensi upgrade ViciTech.",
    url: "/market",
    images: ["/images/hero/pc-rig.jpg"],
  },
};

interface MarketPageProps {
  readonly searchParams?: {
    readonly view?: string | string[];
    readonly tab?: string | string[];
  };
}

function readSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function MarketPage({ searchParams }: MarketPageProps) {
  const viewParam = readSingleParam(searchParams?.view);
  const tabParam = readSingleParam(searchParams?.tab);

  const initialView =
    viewParam === "catalog" || viewParam === "library" || tabParam === "library"
      ? "catalog"
      : viewParam === "upgrade"
        ? "upgrade"
        : "ready";

  return (
    <>
      <JsonLd data={buildMarketProductsJsonLd(MARKET_PREVIEW_ITEMS)} />
      <ViciTechApp initialModule="market" initialView={initialView} />
    </>
  );
}
