"use client";

import { useEffect, useState } from "react";
import { imageSources, imageFallback, type PoolImage } from "@/lib/data/loginImages";
import { C, FONT } from "@/lib/tokens";

// Full-screen "slika dana". The image is chosen on the SERVER and rendered into
// the initial HTML, so it is the first thing painted after the OS launch splash
// (the breasts icon). It stays HOLD_MS, can be tapped to skip after SKIP_AFTER_MS,
// then fades out. Gated by sessionStorage so it only acts as a splash once per
// launch, not on every navigation back into the app.
const SESSION_KEY = "fl_splash_shown";
const HOLD_MS = 5000; // fully visible before the auto fade-out
const SKIP_AFTER_MS = 3000; // tap-to-skip becomes active after this
const FADE_MS = 550; // fade-out duration

export default function SplashScreen({ image }: { image: PoolImage | null }) {
  // Render by default (server + first client paint). `gone` lazily reads
  // sessionStorage on the client so re-mounts within the same session (e.g.
  // returning from match detail) don't flash the splash again.
  const [gone, setGone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false; // SSR: always paint it
    try {
      return Boolean(sessionStorage.getItem(SESSION_KEY));
    } catch {
      return false;
    }
  });
  const [leaving, setLeaving] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!image || gone) return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage unavailable (private mode) — show this once regardless.
    }
    const tSkip = setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    const t1 = setTimeout(() => setLeaving(true), HOLD_MS);
    const t2 = setTimeout(() => setGone(true), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(tSkip);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [image, gone]);

  if (!image || gone) return null;

  return (
    <div
      aria-hidden
      onClick={() => {
        if (canSkip) setLeaving(true); // only skippable after SKIP_AFTER_MS
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: C.ink, // matches the manifest background_color → seamless handoff
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <picture>
        {imageSources(image).map((s) => (
          <source key={s.src} srcSet={s.src} type={s.type} />
        ))}
        <img
          src={imageFallback(image)}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </picture>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(14,17,22,.2) 38%, rgba(14,17,22,.86) 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 26, right: 26, bottom: "12%", color: "#fff" }}>
        <div style={{ fontFamily: FONT.anton, fontSize: 42, letterSpacing: 0.5, lineHeight: 0.92 }}>
          FANTASY
          <br />
          LIGA
        </div>
        <div
          style={{
            fontFamily: FONT.archivo,
            fontWeight: 800,
            fontSize: 12.5,
            color: "rgba(255,255,255,.72)",
            marginTop: 8,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          SP 2026 · Slika dana
        </div>
      </div>
      {/* Skip affordance — fades in once tapping is allowed (after SKIP_AFTER_MS). */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 30,
          textAlign: "center",
          fontFamily: FONT.archivo,
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: "rgba(255,255,255,.65)",
          opacity: canSkip && !leaving ? 1 : 0,
          transition: "opacity 400ms ease",
        }}
      >
        Dodirni za preskok ▸
      </div>
    </div>
  );
}
