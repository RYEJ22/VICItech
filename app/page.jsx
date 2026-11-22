import { EditorialShowcase } from "@/components/features/editorial-showcase/editorial-showcase";
import { SiteFooter } from "@/components/features/footer/site-footer";
import { Hero } from "@/components/features/hero/hero";

export const metadata = {
  title: "ViciTech — Marketplace & Ekosistem Circular IT Terverifikasi IoT QC",
};

export default function Page() {
  return (
    <>
      <main className="bg-canvas text-primary">
        <Hero />
        <EditorialShowcase />
      </main>
      <SiteFooter />
    </>
  );
}
