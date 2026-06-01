// Inline stroke/fill SVG icons — ported from the handoff (Icon map in ui.jsx).
type P = { s?: number };

export const Icon = {
  trophy: ({ s = 24 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12v3a6 6 0 0 1-12 0V4Z" />
      <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M9 14.5V18m6-3.5V18M8 21h8M10 18h4" />
    </svg>
  ),
  cal: ({ s = 24 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  ),
  bolt: ({ s = 24 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor">
      <path d="M13.5 2 4 13.5h6L9 22l9.5-12H12l1.5-8Z" />
    </svg>
  ),
  user: ({ s = 24 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  book: ({ s = 24 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2V5Z" />
      <path d="M17 3h1a2 2 0 0 1 2 2v14" />
    </svg>
  ),
  back: ({ s = 22 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 5-7 7 7 7" />
    </svg>
  ),
  chev: ({ s = 18 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 5 7 7-7 7" />
    </svg>
  ),
  chevDown: ({ s = 18 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  plus: ({ s = 20 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  minus: ({ s = 20 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  ),
  check: ({ s = 20 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
  swords: ({ s = 24 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 14.5 21 21M21 4h-3l-9 9 3 3 9-9V4ZM3 4h3l5.5 5.5M3 4v3l5.5 5.5M16.5 13.5 14 16M9.5 16.5 3 21" />
    </svg>
  ),
  flame: ({ s = 20 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="currentColor">
      <path d="M12 2c1 3-2 4-2 7 0-2-2-3-2-3-1 2-3 3-3 7a7 7 0 0 0 14 0c0-4-3-6-4-9-1 2-2 2-2 0 0-3-1-7-1-9Z" />
    </svg>
  ),
  arrowUp: ({ s = 14 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  ),
  arrowDn: ({ s = 14 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  ),
  clock: ({ s = 14 }: P) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};
