import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Panel Diagnostik IoT QC | ViciTech",
  description: "Panel diagnostik, pelacakan pesanan, dan verifikasi telemetri IoT QC ViciTech.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function QCPanelLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
