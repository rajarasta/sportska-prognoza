"use client";

import { useEffect, useState } from "react";
import { LOGIN_IMAGES } from "@/lib/data/loginImages";
import { C, FONT } from "@/lib/tokens";

// Full-screen "slika dana" shown once per app launch, then fades to reveal the
// app. Gated by sessionStorage so it does NOT reappear when navigating back from
// full-screen flows (match detail, /unos…) within the same session.
const SESSION_KEY = "fl_splash_shown";
const HOLD_MS = 1500; // fully visible before the fade starts
const FADE_MS = 550; // fade-out duration

export default function SplashScreen() {
  const [img, setImg] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage may be unavailable (private mode) — fall through and show.
    }
    setImg(LOGIN_IMAGES[Math.floor(Math.random() * LOGIN_IMAGES.length)]);
    const t1 = setTimeout(() => setLeaving(true), HOLD_MS);
    const t2 = setTimeout(() => setImg(null), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!img) return null;

  return (
    <div
      aria-hidden
      onClick={() => setLeaving(true)} // tap to skip
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: C.ink,
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <picture>
        <source srcSet={`/login/${img}.avif`} type="image/avif" />
        <source srcSet={`/login/${img}.webp`} type="image/webp" />
        <img
          src={`/login/${img}.webp`}
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
    </div>
  );
}
