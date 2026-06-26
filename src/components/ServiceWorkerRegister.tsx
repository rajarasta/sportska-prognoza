"use client";

import { useEffect } from "react";

// Registers the minimal service worker (public/sw.js). Required so Android Chrome
// offers "Install app" — its install criteria need a registered SW with a fetch
// handler. Registered on window load so it doesn't compete with first paint.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal — the app still works, just isn't installable.
      });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
