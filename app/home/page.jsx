import ViciTechApp from "@/components/vicitech/ViciTechApp";
import { listMarketProducts } from "@/lib/market/products";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workspace | ViciTech OS",
  description: "Ruang kerja terpadu ViciTech OS untuk Market, Preset Builder, Trade-In, dan IoT QC.",
};

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const initialModule =
    typeof resolvedSearchParams?.tab === "string" ? resolvedSearchParams.tab : "home";
  const categoryParam =
    typeof resolvedSearchParams?.category === "string" ? resolvedSearchParams.category : "all";

  const { products, error } = await listMarketProducts();

  return (
    <ViciTechApp
      initialModule={initialModule}
      initialMarketProducts={products}
      initialMarketError={error}
      initialMarketCategory={categoryParam}
    />
  );
}
