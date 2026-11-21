import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { CheckoutProvider } from "@/context/CheckoutContext";
import ThemeProvider from "@/components/providers/ThemeProvider";
import Navbar from "@/components/Navbar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://vicitech.id"),
  title: "ViciTech OS v2 | Minimalist Hardware Hub & CRM",
  description:
    "ViciTech OS v2: modern minimalist hardware hub and CRM with semi-metallic unibody Bento Grid architecture.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "ViciTech",
    title: "ViciTech | Ekosistem Circular IT, Market & Hardware Hub",
    description:
      "Rakit PC, cek telemetri QC burn-in, tukar tambah aset IT, dan temukan mitra servis terverifikasi dalam satu platform.",
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
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-canvas text-primary font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
          <CheckoutProvider>
            <Navbar />
            <div className="pb-20 md:pb-0">{children}</div>
          </CheckoutProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
