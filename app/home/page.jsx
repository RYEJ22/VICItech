import { redirect } from "next/navigation";
import ViciTechApp from "@/components/vicitech/ViciTechApp";
import { listMarketProducts } from "@/lib/market/products";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workspace | ViciTech",
  description: "Ruang kerja terpadu ViciTech untuk Market, Preset Builder, Trade-In, dan IoT QC.",
};

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const initialModule =
    typeof resolvedSearchParams?.tab === "string" ? resolvedSearchParams.tab : "home";

  if (initialModule === "account") {
    redirect("/profile");
  }

  const categoryParam =
    typeof resolvedSearchParams?.category === "string" ? resolvedSearchParams.category : "all";
  const productIdParam =
    typeof resolvedSearchParams?.productId === "string" ? resolvedSearchParams.productId : "";

  const { products, error } = await listMarketProducts();

  return (
    <ViciTechApp
      initialModule={initialModule}
      initialMarketProducts={products}
      initialMarketError={error}
      initialMarketCategory={categoryParam}
      initialBuilderProductId={productIdParam}
    />
  );
}
