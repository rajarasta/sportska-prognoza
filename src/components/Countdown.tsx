"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Live "za 2 h 14 min" countdown to a kickoff epoch. Renders nothing on the
 *  server and nothing once the match has started (it triggers one
 *  router.refresh() at kickoff so lock state flips without a manual reload). */
export default function Countdown({
  kickoff,
  prefix = "Počinje za",
  style,
}: {
  kickoff: number;
  prefix?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (now != null && now >= kickoff && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [now, kickoff, router]);

  if (now == null || now >= kickoff) return null;
  return <span style={style}>{`${prefix} ${remainingLabel(kickoff - now)}`}</span>;
}

function remainingLabel(ms: number): string {
  const min = Math.ceil(ms / 60000);
  if (min < 1) return "manje od minute";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) {
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh ? `${d} d ${hh} h` : `${d} d`;
}
