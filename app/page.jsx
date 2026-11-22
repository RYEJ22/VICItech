import { EditorialShowcase } from "@/components/features/editorial-showcase/editorial-showcase";
import { SiteFooter } from "@/components/features/footer/site-footer";
import { Hero } from "@/components/features/hero/hero";

export const metadata = { title: "ViciTech | Circular IT Ecosystem" };

export default function Page() {
  return (
    <>
      <main>
        <Hero />
        <EditorialShowcase />
      </main>
      <SiteFooter />
    </>
  );
}
