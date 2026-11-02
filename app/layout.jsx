import "./globals.css";

export const metadata = {
  title: "ViciTech | Circular IT Ecosystem",
  description:
    "Hardware library, upgrade planner, preset builder, trade-in, IoT QC, bottleneck analysis, and versus arena in one demo app.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
