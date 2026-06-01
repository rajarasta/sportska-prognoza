"use client";

import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { C, FONT, R, SHADOW } from "@/lib/tokens";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (res.ok) {
        window.location.assign("/bodovi");
        return;
      }

      // Rejected — drop the client session and explain.
      await auth.signOut().catch(() => {});
      if (res.status === 403) {
        setError("Nisi na popisu ekipe. Javi se administratoru lige za pristup.");
      } else {
        setError("Prijava nije uspjela. Pokušaj ponovno.");
      }
      setLoading(false);
    } catch (e) {
      if (
        e instanceof FirebaseError &&
        (e.code === "auth/popup-closed-by-user" ||
          e.code === "auth/cancelled-popup-request")
      ) {
        setLoading(false);
        return;
      }
      setError("Prijava nije uspjela. Pokušaj ponovno.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: "100%",
          height: 54,
          border: "none",
          borderRadius: R.sm,
          background: loading ? C.disabledBtn : C.red,
          color: "#fff",
          boxShadow: loading ? "none" : SHADOW.fab,
          fontFamily: FONT.archivo,
          fontWeight: 800,
          fontSize: 16.5,
          letterSpacing: 0.3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? (
          "Prijava…"
        ) : (
          <>
            <GoogleGlyph />
            Uđi u ligu
            <span style={{ transform: "translateY(-1px)" }}>→</span>
          </>
        )}
      </button>

      {error && (
        <div
          style={{
            background: C.redChipBg,
            color: C.redChipFg,
            borderRadius: R.chip,
            padding: "10px 14px",
            fontFamily: FONT.archivo,
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        background: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        />
      </svg>
    </span>
  );
}
