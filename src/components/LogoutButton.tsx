"use client";

import { auth } from "@/lib/firebase/client";
import { C, FONT, R } from "@/lib/tokens";

export default function LogoutButton({
  label = "Odjava",
}: {
  label?: string;
}) {
  async function logout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    await auth.signOut().catch(() => {});
    window.location.assign("/login");
  }

  return (
    <button
      onClick={logout}
      style={{
        height: 44,
        padding: "0 18px",
        borderRadius: R.chip,
        border: `1.5px solid ${C.hairline3}`,
        background: C.surface,
        color: C.ink,
        fontFamily: FONT.archivo,
        fontWeight: 800,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
