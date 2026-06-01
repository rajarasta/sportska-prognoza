"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "@/components/ui";
import { C, FONT, R } from "@/lib/tokens";
import { addAllowlistEmail, removeAllowlistEmail } from "@/app/actions/allowlist";
import type { AllowlistEntry } from "@/lib/server/queries";

export default function MembersManager({
  allowlist,
  adminEmails,
}: {
  allowlist: AllowlistEntry[];
  adminEmails: string[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    setError(null);
    const value = email.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await addAllowlistEmail(value);
      if (res.ok) {
        setEmail("");
        router.refresh();
      } else {
        setError(res.error ?? "Greška.");
      }
    });
  };

  const remove = (e: string) => {
    setError(null);
    startTransition(async () => {
      const res = await removeAllowlistEmail(e);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Greška.");
    });
  };

  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted, margin: "4px 2px 12px" }}>
        Članovi lige
      </div>

      {/* add */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="email"
          inputMode="email"
          placeholder="ime.prezime@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={{
            flex: 1,
            height: 44,
            borderRadius: R.chip,
            border: `1.5px solid ${C.hairline3}`,
            padding: "0 14px",
            fontFamily: FONT.archivo,
            fontWeight: 600,
            fontSize: 14,
            color: C.ink,
            background: "#fff",
          }}
        />
        <button
          onClick={add}
          disabled={pending}
          style={{ height: 44, padding: "0 18px", borderRadius: R.chip, border: "none", background: pending ? C.disabledBtn : C.red, color: "#fff", fontFamily: FONT.archivo, fontWeight: 800, fontSize: 14, cursor: pending ? "default" : "pointer" }}
        >
          Dodaj
        </button>
      </div>
      {error && <div style={{ marginBottom: 10, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 12.5, color: C.redChipFg }}>{error}</div>}

      <div style={{ background: C.surface, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(14,17,22,.05)" }}>
        {adminEmails.map((e, i) => (
          <Row key={`admin-${e}`} top={i > 0} email={e}>
            <Tag tone="gold">ADMIN</Tag>
          </Row>
        ))}
        {allowlist.map((m) => (
          <Row key={m.email} top email={m.email}>
            {m.joined ? <Tag tone="green">prijavljen</Tag> : <Tag tone="gray">pozvan</Tag>}
            <button
              onClick={() => remove(m.email)}
              disabled={pending}
              aria-label="ukloni"
              style={{ marginLeft: 8, width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${C.hairline3}`, background: "#fff", color: C.muted, fontFamily: FONT.archivo, fontWeight: 800, fontSize: 16, lineHeight: 1, cursor: "pointer" }}
            >
              ×
            </button>
          </Row>
        ))}
        {allowlist.length === 0 && adminEmails.length === 0 && (
          <div style={{ padding: 16, textAlign: "center", fontFamily: FONT.archivo, fontWeight: 600, fontSize: 13, color: C.muted }}>
            Nema članova.
          </div>
        )}
      </div>
      <div style={{ fontFamily: FONT.archivo, fontWeight: 600, fontSize: 11.5, color: C.muted, marginTop: 8, padding: "0 2px", lineHeight: 1.4 }}>
        Dodani igrači se mogu prijaviti svojim Google računom. Admin je uvijek dopušten.
      </div>
    </section>
  );
}

function Row({ email, children, top }: { email: string; children: React.ReactNode; top?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderTop: top ? "1px solid #F1F2F5" : "none" }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: FONT.archivo, fontWeight: 700, fontSize: 13.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {email}
      </span>
      {children}
    </div>
  );
}
