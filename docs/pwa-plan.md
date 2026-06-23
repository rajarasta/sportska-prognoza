# PWA Plan — Fantasy Liga (SP 2026)

**Status:** v2.2 — Codex-approved (two rounds). Favicon-metadata, safe-area-floor, and iOS-auth-gate tweaks applied.
**Goal:** make the existing site installable — "Install" from the Chrome/Edge menu/omnibox (desktop + Android) and "Add to Home Screen" on iOS Safari — running in a standalone window with an app icon. No Play Store, no separate codebase, **no service worker in v1**.

This document is self-contained. It incorporates two review rounds; the decisions and their rationale are recorded inline.

---

## 1. Goal & non-goals

**Goal (v1):** installable PWA. Standalone window, app icon, correct splash/theme colors. Covers Chrome desktop install, Android install, and iOS manual Add-to-Home-Screen.

**Non-goals (v1), each with what it would take later:**
- **Offline / app shell** — needs a service worker with a cache strategy (Serwist). Phase 2.
- **Push notifications** — needs a real SW + Web Push/FCM + permission UX. Phase 2.
- **Custom in-app install button** (`beforeinstallprompt`) — Phase 2; browser/menu install is enough for v1.
- **App-store packaging** (TWA/Bubblewrap) — not needed for installability; out of scope.

**Why no service worker in v1:** current Chrome installs from a valid manifest + icons + HTTPS alone (the old SW-with-fetch-handler requirement was relaxed — see [Chrome install criteria update](https://developer.chrome.com/blog/update-install-criteria)). iOS never required one. Since v1 has no offline/push/custom-prompt need, a no-op SW would add the single riskiest moving part (registration/update/rollback loops) for zero benefit. Defer it.

---

## 2. Deployment & codebase context (verified facts)

- **Next.js 15.5 App Router, React 19, default SSR.** No `output: 'export'`/`'standalone'` in `next.config.ts`, so `src/app/manifest.ts` and the Metadata API work normally.
- **Routes live in `src/app`** (the project uses the `src/` folder). **All file-convention files must go under `src/app/`.** Creating a root-level `app/` directory would make Next ignore `src/app` and break routing — see [Next `src` folder docs](https://nextjs.org/docs/app/api-reference/file-conventions/src-folder).
- **Host: Firebase App Hosting** (evidence: `src/lib/auth/config.ts` comment — in production the service account is omitted so the lib uses the compute service account via the GCP metadata server). HTTPS in production. There is **no `hosting` block** in `firebase.json`; response headers, if ever needed, go via Next's `headers()` in `next.config.ts` — **not** firebase.json. (Not needed in v1.)
- **Auth:** `__session` cookie (httpOnly; `secure` only in production; sameSite=lax; path `/`; 12-day maxAge), set by `next-firebase-auth-edge`. `src/middleware.ts` gates every route except `/login` (`PUBLIC_PATHS = ["/login"]`). Logged-out → redirect to `/login`; logged-in hitting `/login` → redirect to `HOME = /bodovi`. `src/app/page.tsx` (`/`) server-redirects to `/bodovi`.
- **Login uses `signInWithPopup`** (`src/app/(auth)/login/LoginButton.tsx:17`) — Google provider, no redirect fallback. Relevant to the iOS spike below.
- **UI:** fixed bottom `TabBar` (`src/components/TabBar.tsx`) with a **hardcoded** `padding: "10px 14px 30px"` (no `env(safe-area-inset-*)`). `viewport-fit: cover` and `themeColor: "#0E1116"` already set in `src/app/layout.tsx`. Brand tokens (`src/lib/tokens.ts`): ink `#0E1116`, brand red `#E4002B`, gold `#F2B807`, app bg `#F4F5F7`. The app already fakes safe areas with fixed px (`SAFE = { top: 56, nav: 108 }`).
- **Existing icon:** `src/app/favicon.ico` exists and is auto-served at `/favicon.ico` (browser tab). There is **no** `src/app/icon.*` or `apple-icon.*`. A brand mark exists only as JSX/SVG (`Icon.bolt` in `src/components/icons.tsx`), **not** as an image asset.

---

## 3. Approach

Hand-rolled manifest + Metadata API + a sharp-generated icon set. No `next-pwa`/Serwist in v1 (revisit Serwist only when offline becomes a goal). Total v1 surface: one new route file, a one-line middleware change, metadata additions, an icon script + assets, and a TabBar safe-area tweak.

---

## 4. Files to add / change (v1)

| Path | New/Edit | Purpose |
|---|---|---|
| `src/app/manifest.ts` | new | Web manifest, served at `/manifest.webmanifest` |
| `src/middleware.ts` | edit | Add `webmanifest` to excluded extensions (**mandatory**) |
| `src/app/layout.tsx` | edit | `appleWebApp` + `icons` metadata (no SW registrar) |
| `scripts/generate-icons.mjs` | new | sharp icon generator (mirrors `optimize-images.mjs`) |
| `package.json` | edit | add `"icons": "node scripts/generate-icons.mjs"` |
| `assets/icon-src/icon.svg` | new | square master artwork (ink bg + brand bolt) |
| `public/icons/*` | new (generated) | `icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon` |
| `src/components/TabBar.tsx` | edit | `env(safe-area-inset-bottom)` bottom padding |
| `src/app/favicon.ico` | keep | unchanged — still the browser-tab favicon |

`next.config.ts` is **untouched** in v1.

---

## 5. Step-by-step

### 5.1 Manifest — `src/app/manifest.ts`

`start_url: "/login"` (see rationale below):

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",                       // stable app identity, independent of start_url
    name: "Fantasy Liga — SP 2026",
    short_name: "Fantasy Liga",
    description:
      "Liga prognoza za SP 2026. Tipuj rezultate, skupljaj bodove, izazivaj ekipu.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0E1116",
    theme_color: "#0E1116",
    lang: "hr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

Reference: [Next manifest docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest). Defining this file auto-injects `<link rel="manifest" href="/manifest.webmanifest">`.

**`start_url` rationale:** `/login` is the only public route, so it returns **200** for an anonymous install (cleaner for crawlers/install validation than a protected route that 302s). A logged-in launch hits `/login` and the middleware redirects it to `/bodovi`, so it still lands home. Trade-off: logged-in users incur one instant server redirect at launch instead of logged-out users doing so. Acceptable, and avoids making the manifest's start URL a protected route.

### 5.2 Middleware — `src/middleware.ts` (mandatory)

Next serves the manifest at `/manifest.webmanifest`. The current matcher excludes `js/png/json/...` but **not `webmanifest`**, so an anonymous browser fetching the manifest is 302'd to `/login` → broken install. Append `|webmanifest` to the excluded extensions:

```
"/((?!_next|api/login|api/logout|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp|avif|js|css|txt|xml|json|woff2?|map|webmanifest)$).*)",
```

(`/sw.js` is not used in v1; `/icons/*.png` are already excluded via `png`.)

### 5.3 Metadata — `src/app/layout.tsx`

Add to the existing `metadata` export. `statusBarStyle: "default"` for v1 (avoids content sliding under the iOS status bar given the app's fixed `SAFE.top`; `black-translucent` is a Phase-2 polish that needs `safe-area-inset-top`):

```ts
appleWebApp: { capable: true, title: "Fantasy Liga", statusBarStyle: "default" },
icons: {
  // ONLY the Apple touch icon goes through metadata. We deliberately do NOT add
  // `icons.icon` for the 192/512 PNGs: Next would emit <link rel="icon"> tags that
  // browsers may prefer over the existing favicon.ico for the tab icon. The web
  // manifest (§5.1) already carries the 192/512/maskable icons for PWA install.
  apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
},
```

No manifest link or SW registrar to add. `favicon.ico` stays the tab icon (unchanged, auto-served); the manifest is the source of PWA install icons. (`metadata.icons` emits real `<link>` tags — [Next metadata icons docs](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#icons) — which is why we keep it to `apple` only.)

### 5.4 Icon source — `assets/icon-src/icon.svg`

The brand bolt exists only as an SVG path, not an asset ([icons.tsx:17-21](../src/components/icons.tsx#L17-L21)). We make the source **explicit and version-controlled**: a single square master SVG (full-bleed ink background + the same bolt path in brand red), which the generator rasterizes deterministically. Adjust the `transform`/fill once visually if desired (e.g. red → gold).

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0E1116"/>
  <path transform="translate(88 76) scale(15)" fill="#E4002B"
        d="M13.5 2 4 13.5h6L9 22l9.5-12H12l1.5-8Z"/>
</svg>
```

The bolt is centered at ~58% of the canvas — comfortably inside the maskable safe zone, so the same artwork doubles as the maskable icon.

### 5.5 Generator — `scripts/generate-icons.mjs`

Mirrors `optimize-images.mjs` (ESM `.mjs`, run via `node`, `sharp`, `assets/<x>-src/` → `public/<x>/`). Emits PWA/app icons only; does **not** touch the favicon.

```js
// Generate the PWA icon set from a single square master.
//   assets/icon-src/icon.svg  (512x512, ink background + brand bolt)
// → public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
// Run with: npm run icons
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = join(process.cwd(), "assets", "icon-src", "icon.svg");
const OUT = join(process.cwd(), "public", "icons");
const INK = "#0E1116";

await mkdir(OUT, { recursive: true });

// "any" icons — the master is full-bleed ink, so a straight resize is correct.
for (const size of [192, 512]) {
  await sharp(SRC, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(OUT, `icon-${size}.png`));
}

// maskable — bolt stays within the inner safe zone, so the master doubles as
// maskable; emitted as its own file so padding can change later without
// touching the "any" icons.
await sharp(SRC, { density: 384 })
  .resize(512, 512)
  .png()
  .toFile(join(OUT, "icon-maskable-512.png"));

// apple-touch-icon — 180, flattened opaque on ink (iOS dislikes transparency).
await sharp(SRC, { density: 384 })
  .resize(180, 180)
  .flatten({ background: INK })
  .png()
  .toFile(join(OUT, "apple-touch-icon.png"));

console.log("Generated PWA icons → public/icons/");
```

`package.json` scripts: add `"icons": "node scripts/generate-icons.mjs"`.

### 5.6 Safe-area — `src/components/TabBar.tsx`

The fixed bottom nav uses a hardcoded `30px` bottom pad ([TabBar.tsx:57](../src/components/TabBar.tsx#L57)); in standalone on notch devices that's too short. Add the real inset, but **floor it at the current `30px` with `max()`** so non-notch devices (where `env(safe-area-inset-bottom)` resolves to `0`, not the fallback) don't regress below today's spacing:

```
padding: "10px 14px max(30px, calc(14px + env(safe-area-inset-bottom)))",
```

Non-notch → `max(30, 14) = 30px` (unchanged from today). Notch/home-indicator → e.g. `max(30, 14+34) = 48px`. Still eyeball it on one notch **and** one non-notch device.

---

## 6. Icons summary

| File | Size | Purpose | Notes |
|---|---|---|---|
| `public/icons/icon-192.png` | 192² | `any` | full-bleed ink + bolt |
| `public/icons/icon-512.png` | 512² | `any` | install + splash |
| `public/icons/icon-maskable-512.png` | 512² | `maskable` | bolt within safe zone |
| `public/icons/apple-touch-icon.png` | 180² | iOS home screen | opaque (flattened) |
| `src/app/favicon.ico` | — | browser tab | **unchanged, kept** |

---

## 7. Auth / standalone correctness

- `start_url: "/login"` returns 200 for anonymous; logged-in launches redirect to `/bodovi`. The session `__session` cookie is set inside the installed context on login, so it persists for the standalone app.
- **iOS storage:** WebKit isolates home-screen web-app storage from Safari and **exempts it from the 7-day script-writable storage cap** ([WebKit tracking prevention](https://webkit.org/tracking-prevention/)). So the session is *expected* to persist across launches — we verify rather than assume frequent eviction.
- **iOS popup-auth spike (top risk).** `signInWithPopup` is historically unreliable inside installed iOS web apps. **Required test on a real iOS device:** install → log in via popup → confirm it completes and the session survives reopen. If it fails, gate a `signInWithRedirect` fallback to standalone display-mode — with the caveat that redirect + ITP has its own setup needs (authDomain/helper), so it's a spike, not a free swap.

---

## 8. Standalone display polish

- Bottom nav floors at today's `30px` and adds `env(safe-area-inset-bottom)` on top via `max()` (§5.6).
- `statusBarStyle: "default"` for v1 — no content under the iOS status bar (matches the app's fixed-px header spacing). `black-translucent` + `safe-area-inset-top` is a Phase-2 option for an edge-to-edge look.
- `background_color`/`theme_color` = `#0E1116` → splash matches the dark letterbox/body.

---

## 9. Acceptance checklist

**Hard release gates (must pass before shipping):**
- **iOS installed-app login** (real device, deployed HTTPS): install → log in via `signInWithPopup` → completes → reopen from the home-screen icon → still authed. This is the **top risk**; if popup auth fails in the installed app, it **blocks release** until the standalone `signInWithRedirect` fallback works (§7).
- **Anonymous `/manifest.webmanifest` → 200** (not 302→/login), tested as a real **GET** in incognito.

**Local (`npm run build && npm start`) — validates manifest & rendering only.** Note: `secure` cookies are set in production mode, so over local **HTTP** auth/session behavior is misleading — do not gate auth tests here.
1. DevTools ▸ Application ▸ Manifest: no errors; icons resolve; "Installable" with no warnings.
2. Anonymous **GET** `/manifest.webmanifest` (incognito) → **200**, not 302→/login. (Test a real GET, not only HEAD.)
3. Icons generated and referenced correctly; `/favicon.ico` still served.

**Deployed HTTPS — the real gates:**
4. **Chrome desktop:** the actual omnibox/menu **Install** appears and installs to a standalone window. (Don't rely solely on DevTools' static "installable" verdict — promotion can involve engagement heuristics; see [web.dev install criteria](https://web.dev/articles/install-criteria).)
5. **Android Chrome:** Install / Add to Home screen → launches standalone.
6. **iOS Safari:** Share → Add to Home Screen → correct icon, standalone, status bar OK (manual — no prompt, expected).
7. **Auth (iOS spike):** install → log in (popup) → succeeds → reopen from icon → still authed; logout still works.
8. SSR + route gating still behave in standalone.

---

## 10. Rollback

v1 adds no service worker, so there is **no SW cache to purge** (the dangerous part). To revert: remove the manifest/icons/metadata changes and redeploy. Caveat: browsers and already-installed instances may retain **cached manifest metadata and icons** until they refresh, and existing home-screen installs persist until the user uninstalls — they'll simply point at the removed manifest/icons (which 404 gracefully). The one-line middleware change reverts cleanly.

---

## 11. Phase 2 (deferred — only if wanted)

- Service worker + offline app shell (Serwist), `register("/sw.js", { updateViaCache: "none" })`, and a **correct kill-switch**: disable the registrar *in the same deploy* and ship a non-reloading unregister SW (auto-reload loops if paired with an active registrar).
- Custom `beforeinstallprompt` install button + installed-state detection.
- Manifest `screenshots` for richer install UI.
- `black-translucent` status bar with `safe-area-inset-top`.

---

## 12. Open decisions

1. **Custom install prompt in v1?** Recommended **no** (browser/menu install suffices).
2. **Production origin / domain** — confirm it, and that it's in **Firebase Auth → Authorized domains** + Google OAuth authorized origins (otherwise sign-in breaks, independent of PWA). Also drives an optional `metadataBase`.
3. **Icon art** — recommended: red bolt on `#0E1116` (brand-consistent, matches the FAB). Alt: "FL" monogram.
4. **iOS re-login** — acceptable as a rare fallback if the installed-app login flow itself works reliably? (Session is expected to persist.)

---

## 13. Effort

~**3–4h**: ~1h code (manifest/middleware/metadata/TabBar), ~1–1.5h icons (artwork + generator), ~1–1.5h deployed cross-device testing incl. the iOS auth spike.

---

## Sources

- [web.dev — install criteria](https://web.dev/articles/install-criteria)
- [Chrome — install criteria update](https://developer.chrome.com/blog/update-install-criteria)
- [Next.js — manifest file convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)
- [Next.js — `src` folder](https://nextjs.org/docs/app/api-reference/file-conventions/src-folder)
- [WebKit — tracking prevention](https://webkit.org/tracking-prevention/)
