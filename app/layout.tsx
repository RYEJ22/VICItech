import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { CheckoutProvider } from "@/context/CheckoutContext";
import ThemeProvider from "@/components/providers/ThemeProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ViciTech | Circular IT Ecosystem",
  description:
    "Hardware library, upgrade planner, preset builder, trade-in, IoT QC, bottleneck analysis, and versus arena in one demo app.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark">
          <CheckoutProvider>
            <Navbar />
            {children}
          </CheckoutProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
