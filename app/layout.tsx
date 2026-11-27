import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Silkscreen } from "next/font/google";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { UserSettingsSync } from "@/components/providers/UserSettingsSync";
import IntroSplash from "@/components/ui/IntroSplash";
import Navbar from "@/components/Navbar";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { FloatingChatWidget } from "@/components/ai/FloatingChatWidget";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pixel",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vic-itech-6qrs.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ViciTech — Marketplace & Ekosistem Circular IT Terverifikasi IoT QC",
  description:
    "Beli, rakit, dan tukar tambah PC, laptop, serta perangkat teknologi dengan jaminan uji telemetri IoT QC 15 titik yang transparan dan anti-zonk.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: "ViciTech",
    title: "ViciTech — Marketplace & Ekosistem Circular IT Terverifikasi IoT QC",
    description:
      "Beli, rakit, dan tukar tambah PC, laptop, serta perangkat teknologi dengan jaminan uji telemetri IoT QC 15 titik yang transparan dan anti-zonk.",
    images: [
      {
        url: `${SITE_URL}/images/hero/pc-rig.jpg`,
        width: 1200,
        height: 630,
        alt: "ViciTech Circular IT Ecosystem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [`${SITE_URL}/images/hero/pc-rig.jpg`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const THEME_INIT_SCRIPT = `(function(){try{var k=localStorage.getItem('vici_theme');var l=localStorage.getItem('vici_language');var s=null;var raw=localStorage.getItem('vici_user_settings');if(raw){s=JSON.parse(raw);}var t=(k==='dark'||k==='light')?k:(s&&s.theme==='dark'?'dark':'light');var lang=(l==='en'||l==='id')?l:(s&&s.language==='en'?'en':'id');var r=document.documentElement;r.setAttribute('data-theme',t);r.setAttribute('data-language',lang);r.lang=lang;if(t==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');}if(s&&s.pixelIntensity==='subtle'){r.setAttribute('data-pixel-intensity','subtle');}if(s&&s.highContrast===true){r.setAttribute('data-high-contrast','true');}if(s&&(s.textScale==='large'||s.textScale==='xlarge')){r.setAttribute('data-text-scale',s.textScale);}if(s&&s.reducedMotion===true){r.setAttribute('data-reduced-motion','true');}if(s&&s.temperatureUnit==='F'){r.setAttribute('data-temp-unit','F');}if(s&&s.compactNumbers===true){r.setAttribute('data-compact-numbers','true');}if(s&&s.showSourceBadges===false){r.setAttribute('data-source-badges','minimal');}if(s&&s.navbarScrollBehavior==='keep-labels'){r.setAttribute('data-navbar-scroll','keep-labels');}if(s&&s.mobileDensity==='compact'){r.setAttribute('data-mobile-density','compact');}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="id"
      data-theme="light"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${silkscreen.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-canvas text-primary font-sans antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <CheckoutProvider>
              <UserSettingsSync />
              <IntroSplash />
              <Navbar />
              <div className="min-w-0 max-w-full overflow-x-clip pb-24 md:pb-0">{children}</div>
              <CookieConsentBanner />
              <FloatingChatWidget />
            </CheckoutProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
