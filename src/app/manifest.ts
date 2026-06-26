import type { MetadataRoute } from "next";

// Web app manifest — served by Next at /manifest.webmanifest. This is the source
// of truth for PWA install (icons, name, colors, standalone display).
// NOTE: /manifest.webmanifest must be excluded from the auth middleware matcher
// (src/middleware.ts) so it returns 200 for anonymous installs, not a 302→/login.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", // stable app identity, independent of start_url
    name: "Fantasy Liga — SP 2026",
    short_name: "Fantasy Liga",
    description:
      "Liga prognoza za SP 2026. Tipuj rezultate, skupljaj bodove, izazivaj ekipu.",
    // /login is the only public route → returns 200 for anonymous installs.
    // Logged-in launches hit /login and the middleware redirects them to /bodovi.
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0E1116",
    theme_color: "#0E1116",
    lang: "hr",
    // PNG-only, exactly the structure that was installable before. Android Chrome
    // does NOT reliably support an SVG manifest icon, and listing one (sizes:"any")
    // can win icon selection and then fail to rasterize, breaking installability —
    // so the SVG mark stays a favicon (layout metadata) and is kept OUT of here.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
