"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { C, FONT, APP_MAX_WIDTH } from "@/lib/tokens";

const FLAT = [
  { href: "/bodovi", Ic: Icon.trophy, label: "Bodovi" },
  { href: "/raspored", Ic: Icon.cal, label: "Raspored" },
] as const;
const FLAT2 = [
  { href: "/profil", Ic: Icon.user, label: "Profil" },
  { href: "/pravila", Ic: Icon.book, label: "Pravila" },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const fabOn = active("/izazovi");

  const Item = ({ href, Ic, label }: { href: string; Ic: (p: { s?: number }) => React.ReactElement; label: string }) => {
    const on = active(href);
    return (
      <Link
        href={href}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          color: on ? C.red : "#A2A9B4",
          textDecoration: "none",
        }}
      >
        <Ic s={24} />
        <span style={{ fontFamily: FONT.archivo, fontWeight: on ? 800 : 700, fontSize: 10.5 }}>{label}</span>
      </Link>
    );
  };

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: APP_MAX_WIDTH,
        zIndex: 40,
        background: "rgba(255,255,255,.94)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: `1px solid ${C.hairline}`,
        // Floor at today's 30px; add the home-indicator inset on top in standalone.
        // On non-notch devices env() resolves to 0, so max() preserves the 30px baseline.
        padding: "10px 14px max(30px, calc(14px + env(safe-area-inset-bottom)))",
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      <Item {...FLAT[0]} />
      <Item {...FLAT[1]} />

      {/* center FAB → Izazovi */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <Link
          href="/izazovi"
          style={{
            width: 56,
            height: 56,
            borderRadius: 19,
            marginTop: -24,
            background: fabOn ? C.goldGrad : C.red,
            color: fabOn ? "#1A1206" : "#fff",
            boxShadow: fabOn ? "0 10px 22px rgba(242,184,7,.45)" : "0 10px 22px rgba(228,0,43,.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all .18s",
          }}
        >
          <Icon.bolt s={28} />
        </Link>
        <span style={{ fontFamily: FONT.archivo, fontWeight: fabOn ? 800 : 700, fontSize: 10.5, color: fabOn ? "#C9A227" : "#A2A9B4" }}>
          Izazovi
        </span>
      </div>

      <Item {...FLAT2[0]} />
      <Item {...FLAT2[1]} />
    </nav>
  );
}
