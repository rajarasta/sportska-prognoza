"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { C, FONT, SAFE } from "@/lib/tokens";

export default function OverlayHeader({
  title,
  accent,
  fallback = "/raspored",
}: {
  title: string;
  accent?: string; // dark hero bg; otherwise white
  fallback?: string;
}) {
  const router = useRouter();
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: accent || C.surface,
        padding: `${SAFE.top}px 16px 14px`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: accent ? "none" : "0 1px 0 #ECEEF2",
      }}
    >
      <button
        onClick={back}
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          border: "none",
          cursor: "pointer",
          background: accent ? "rgba(255,255,255,.18)" : C.bg,
          color: accent ? "#fff" : C.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon.back />
      </button>
      <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 18, color: accent ? "#fff" : C.ink, whiteSpace: "nowrap" }}>
        {title}
      </div>
    </div>
  );
}
