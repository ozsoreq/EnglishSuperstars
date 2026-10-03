import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Andika, Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({ subsets: ["hebrew", "latin"], variable: "--font-rubik", display: "swap" });
const andika = Andika({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-andika", display: "swap" });

export const metadata: Metadata = {
  title: "כוכבים — Kochavim English",
  description: "הרפתקה באנגלית לילדים: כל מילה שלומדים מגדילה את העולם שלכם.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "כוכבים", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#2B2D5C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${andika.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
