import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { CheckoutProvider } from "@/context/CheckoutContext";
import ThemeProvider from "@/components/providers/ThemeProvider";
import IntroSplash from "@/components/ui/IntroSplash";
import Navbar from "@/components/Navbar";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { FloatingChatWidget } from "@/components/ai/FloatingChatWidget";
import Script from "next/script";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://vicitech.id"),
  title: "ViciTech — Marketplace & Ekosistem Circular IT Terverifikasi IoT QC",
  description:
    "Beli, rakit, dan tukar tambah PC, laptop, serta perangkat teknologi dengan jaminan uji telemetri IoT QC 15 titik yang transparan dan anti-zonk.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "ViciTech",
    title: "ViciTech — Marketplace & Ekosistem Circular IT Terverifikasi IoT QC",
    description:
      "Beli, rakit, dan tukar tambah PC, laptop, serta perangkat teknologi dengan jaminan uji telemetri IoT QC 15 titik yang transparan dan anti-zonk.",
    images: [
      {
        url: "/images/hero/pc-rig.jpg",
        width: 1200,
        height: 630,
        alt: "ViciTech Circular IT Ecosystem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="id"
      className={plusJakartaSans.variable}
      suppressHydrationWarning
    >
      <body className="min-h-screen overflow-x-hidden bg-canvas text-primary font-sans antialiased">
        <Script
          id="midtrans-snap"
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""}
          strategy="afterInteractive"
        />
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
          <CheckoutProvider>
            <IntroSplash />
            <Navbar />
            <div className="pb-20 md:pb-0">{children}</div>
            <CookieConsentBanner />
            <FloatingChatWidget />
          </CheckoutProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
