import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "IoT Diagnostics Panel | ViciTech OS",
  description: "Interactive ViciTech diagnostics, order tracking, and hardware compatibility workspace.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function QCPanelLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
