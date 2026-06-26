// Minimal service worker. Its only job is to exist with a fetch handler so the
// app meets PWA install criteria on Android Chrome, which won't offer "Install
// app" without a registered service worker. It deliberately does NOT intercept
// requests (no respondWith) — navigations, redirects and server actions are
// handled natively — so there's no risk of serving stale pages or breaking auth.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  // Pass-through; present only to satisfy installability.
  void event;
});
