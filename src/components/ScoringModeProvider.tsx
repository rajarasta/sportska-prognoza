"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ScoringMode = "old" | "m2";

type ScoringModeContextValue = {
  mode: ScoringMode;
  setMode: (mode: ScoringMode) => void;
};

const STORAGE_KEY = "sportska-prognoza.scoringMode";

const ScoringModeContext = createContext<ScoringModeContextValue | null>(null);

export function ScoringModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ScoringMode>("old");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "old" || saved === "m2") setModeState(saved);
  }, []);

  const value = useMemo<ScoringModeContextValue>(
    () => ({
      mode,
      setMode: (nextMode) => {
        setModeState(nextMode);
        window.localStorage.setItem(STORAGE_KEY, nextMode);
      },
    }),
    [mode],
  );

  return <ScoringModeContext.Provider value={value}>{children}</ScoringModeContext.Provider>;
}

export function useScoringMode() {
  const ctx = useContext(ScoringModeContext);
  if (!ctx) throw new Error("useScoringMode must be used inside ScoringModeProvider");
  return ctx;
}
