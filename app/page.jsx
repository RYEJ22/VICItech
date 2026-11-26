import { EditorialShowcase } from "@/components/features/editorial-showcase/editorial-showcase";
import { SiteFooter } from "@/components/features/footer/site-footer";
import { Hero } from "@/components/features/hero/hero";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vic-itech-6qrs.vercel.app";

export const metadata = {
  title: "ViciTech | Circular IT Ecosystem",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ViciTech — Ekosistem Circular IT & Hardware Toolkit Indonesia",
    description:
      "Beli, rakit, dan upgrade PC & laptop dengan Toolkit Simulasi Presisi, protokol 15 titik Hybrid IoT QC (Simulated/Demo), dan ViciTech AI terhubung ke katalog.",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/images/hero/pc-rig.jpg`,
        width: 1200,
        height: 630,
        alt: "ViciTech Circular IT Ecosystem",
      },
    ],
  },
};

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
