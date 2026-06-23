import type { Metadata, Viewport } from "next";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";

// Display font — big scores, screen titles. Single weight, condensed/impactful caps.
const anton = Anton({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-anton",
  display: "swap",
});

// UI/body font — all interface text.
const archivo = Archivo({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fantasy Liga — SP 2026",
  description:
    "Liga prognoza za Svjetsko prvenstvo 2026. Tipuj rezultate, skupljaj bodove, izazivaj ekipu.",
  applicationName: "Fantasy Liga",
  appleWebApp: { capable: true, title: "Fantasy Liga", statusBarStyle: "default" },
  // Only the Apple touch icon goes through metadata. We deliberately do NOT declare
  // `icons.icon` for the 192/512 PNGs: Next would emit <link rel="icon"> tags that
  // browsers may prefer over the existing favicon.ico. The web manifest
  // (src/app/manifest.ts) carries the 192/512/maskable icons for PWA install.
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0E1116",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hr">
      <body className={`${anton.variable} ${archivo.variable}`}>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
