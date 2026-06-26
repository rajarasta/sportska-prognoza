import { C, FONT, R, SHADOW } from "@/lib/tokens";
import { pickRandom, imageSources, imageFallback } from "@/lib/data/loginImages";
import { availableLoginImages } from "@/lib/server/login-images";
import LoginButton from "./LoginButton";

// Rotating "image of the day" — chosen per request.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const img = pickRandom(availableLoginImages());

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: C.surface,
        display: "flex",
        flexDirection: "column",
        padding: "56px 22px 34px",
        gap: 18,
      }}
    >
      {/* Brand lockup */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: C.red,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: SHADOW.fab,
            }}
          >
            <svg viewBox="0 0 24 24" width={26} height={26} fill="currentColor">
              <path d="M13.5 2 4 13.5h6L9 22l9.5-12H12l1.5-8Z" />
            </svg>
          </div>
          <div style={{ fontFamily: FONT.anton, fontSize: 26, letterSpacing: 0.5, color: C.ink, lineHeight: 0.92 }}>
            FANTASY
            <br />
            LIGA
          </div>
        </div>
        <div style={{ textAlign: "right", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
          <div>SP 2026</div>
          <div style={{ color: C.red }}>EKIPA · 12</div>
        </div>
      </header>

      {/* Hero — rotating photo */}
      <div
        style={{
          flex: 1,
          minHeight: 340,
          borderRadius: R.sheet,
          position: "relative",
          overflow: "hidden",
          boxShadow: SHADOW.raised,
          background: C.ink,
        }}
      >
        {img && (
          <picture>
            {imageSources(img).map((s) => (
              <source key={s.src} srcSet={s.src} type={s.type} />
            ))}
            <img
              src={imageFallback(img)}
              alt="Slika dana"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          </picture>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,17,22,0) 45%, rgba(14,17,22,.72) 100%)" }} />
        <div style={{ position: "absolute", left: 14, bottom: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(228,0,43,.92)", color: "#fff", borderRadius: 7, padding: "4px 9px", fontFamily: FONT.archivo, fontWeight: 700, fontSize: 11.5, letterSpacing: 0.3, textTransform: "uppercase" }}>
            📸 Slika dana
          </span>
        </div>
        <div style={{ position: "absolute", right: 16, bottom: 14, fontFamily: FONT.anton, fontSize: 22, color: "rgba(255,255,255,.92)", letterSpacing: 0.5, textAlign: "right", lineHeight: 1 }}>
          SP 2026
        </div>
      </div>

      <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13.5, color: C.muted2, textAlign: "center", lineHeight: 1.45, padding: "0 6px" }}>
        Svaki login te dočeka nova slika ekipe. Tipuj rezultate, skupljaj bodove i baci izazov prije prvog zvižduka.
      </div>

      {/* CTA */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LoginButton />
        <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 12, color: C.muted, textAlign: "center" }}>
          Prijava Google računom · samo za pozvane igrače
        </div>
      </div>
    </main>
  );
}
