import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
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
  title: "ViciTech OS v2 | Minimalist Hardware Hub & CRM",
  description:
    "ViciTech OS v2: modern minimalist hardware hub and CRM with semi-metallic unibody Bento Grid architecture.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-[#F4F4F2] text-[#141518] font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
          <CheckoutProvider>
            <Navbar />
            {children}
          </CheckoutProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
