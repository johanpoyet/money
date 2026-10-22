import type { Metadata, Viewport } from "next";
import { DM_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Money",
  description: "Mes comptes, classés tout seuls.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Money", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#11131b",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${manrope.variable} ${dmMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
