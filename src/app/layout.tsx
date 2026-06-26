import type { Metadata, Viewport } from "next";
import { Anton, Archivo } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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
  // Favicon + Apple touch icon point at the same Next icon route as the manifest
  // (see src/app/appicon-*), because /public files 404 on Firebase App Hosting.
  icons: {
    icon: [{ url: "/appicon-512", type: "image/png" }],
    apple: [{ url: "/appicon-512", type: "image/png" }],
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
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
