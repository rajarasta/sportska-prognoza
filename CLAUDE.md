# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Friends-only football prediction web app for the **2026 FIFA World Cup** group stage. Players
predict exact scorelines (graded on a Gaussian curve), climb a leaderboard, and spend weekly
**Izazov** tokens to duel another player's prediction for double-or-nothing. Mobile web, Croatian
UI, Next.js 15 App Router on Firebase App Hosting.

## Commands

```bash
npm run dev          # next dev — http://localhost:3000
npm run build        # next build (production)
npm run typecheck    # tsc --noEmit  ← primary correctness gate
npm run lint         # eslint
```

There is **no test runner** — verification is `typecheck` + `lint` + running the app. Don't add a
test command unless asked.

### Firestore CLI scripts (need Admin credentials)

All run via `tsx` and talk to **production Firestore** (there is no local DB / emulator wired up by
default). They authenticate with `GOOGLE_APPLICATION_CREDENTIALS=<service-account.json>` pointing at
a gitignored key, e.g. `GOOGLE_APPLICATION_CREDENTIALS=key.json npm run seed`.

| Command | Purpose |
|---|---|
| `npm run seed` | Idempotent seed of teams + fixtures + league config from `data/grupna-faza.txt` and `src/lib/data/test-run.ts`. Keeps already-entered results. |
| `npm run crawl` | Crawl finished results from the configured provider, mark final, recompute. `-- --dry-run`, `-- --force`. |
| `npm run recompute` | Re-run the full derived-data recompute (see below) without changing inputs. |
| `npm run fix:kickoffs` | Push edited kickoff times from `data/grupna-faza.txt` into Firestore. **Use this to change kickoffs — not a redeploy.** |
| `npm run grant:tokens` | Grant Izazov tokens (trial / fixups). |
| `tsx scripts/report.ts` | Read-only HTML report (Ljestvica / per-match points / full prediction matrix). Writes nothing back. `-- --out <file>`. |

Live scores and predictions exist **only in production Firestore** — there are no local fixtures, so
inspecting real data requires a key and one of the scripts above (typically `report.ts`).

## Architecture

### The server-only data boundary (most important rule)

The browser **never touches Firestore**. `firestore.rules` denies all client read/write. Every read
and write goes through the Next.js server using the **Admin SDK** (`src/lib/firebase/admin.ts`,
imported only behind `import "server-only"`). Consequences:

- **Reads** live in `src/lib/server/queries.ts` + `izazovi.ts` (server components call these).
- **Writes** live in `src/app/actions/*.ts` (`"use server"` actions called from client components).
- "Don't peek at others' picks before kickoff" is enforced by the **server choosing what to
  return** (e.g. `getMatchDetail` only includes others' predictions once you've tipped or the match
  is final) — not by client logic and not by rules.

### The `server-only` barrier and dependency injection

`@/lib/firebase/admin` is marked `server-only`, which would break any plain `tsx` CLI that imports
it. The pattern that keeps logic shared between the Next server and CLIs:

- **Pure modules** (no firebase, no `server-only`): `src/lib/scoring.ts`, `src/lib/duels.ts`,
  `src/lib/data/season.ts`. Used by client preview AND server.
- **DI core**: `src/lib/server/recompute.ts` (`runRecompute(db)`) takes a Firestore handle as an
  argument and is deliberately **not** `server-only`, so both the server and standalone CLIs can call it.
- **Server-only wrapper**: `src/lib/server/scoring-engine.ts` (`recomputeScores()`) just passes
  `adminDb` into `runRecompute`. CLIs build their own Admin handle and call `runRecompute` directly.

When adding shared logic that a CLI must reach, follow this: keep it pure or DI, never let it import
the `server-only` admin module.

### Scoring & recompute (single source of truth for derived data)

The source of truth is `matches` + `predictions` + `duels`. **Everything else is derived** —
prediction `points`/`effectivePoints`/`exact`, duel resolution, per-user `totalPoints`/`weeklyPoints`/
`exactCount`/`duelsWon`/`rank`. `runRecompute` recomputes all of it idempotently in one `bulkWriter`
pass. It is the **only writer of derived fields**; never compute and persist these ad-hoc elsewhere.

Both result paths funnel through it: the admin screen (`actions/results.ts` → `recomputeScores()`)
and the crawler (`results-crawler/crawler.ts` → `runRecompute`). After it runs, actions call
`revalidatePath` on the affected routes.

Scoring model (`scoring.ts`): exact = `exactPoints` (3); otherwise Gaussian `exp(-d²/(2σ²))`
(σ=1.9, 0–~1) + `goalBonus` (0.3) if exactly one side's goal count matches. Duels (`duels.ts`):
whoever hits exact gets `2×exactPoints` and the other gets 0; both miss → normal scoring, no bonus.
`effectivePoints` = duel override if present, else base `points`.

### Auth & gating

- **Edge middleware** (`src/middleware.ts`) gates every non-public route via `next-firebase-auth-edge`
  with server-verified session cookies. Shared config in `src/lib/auth/config.ts` (must import only
  env — no firebase-admin/fs — because Edge runs it).
- **Allowlist** (`src/lib/server/allowlist.ts`): login is restricted to emails on the Firestore
  allowlist or in `LEAGUE_ADMIN_EMAILS`. Admins enter results at `/admin`.
- `requireUser()` (`src/lib/server/session.ts`) is the standard "who am I" in actions/server
  components; it throws if unauthenticated (routes are already middleware-gated).

### Business-rule invariants (enforced server-side; keep them intact)

- **Tips are final once submitted** — submitting reveals others' tips, so it can never be edited
  (`actions/predictions.ts`). Matches lock at `kickoff` epoch (`isLocked` / status `live`/`final`).
- **A duel is played with your already-submitted tip**, never a fresh score — so you can't see an
  opponent's tip and craft a counter-pick (`actions/challenges.ts`).
- **At most one duel per player per match** — enforced in a transaction; this is what keeps the
  recompute override map from colliding.
- **Week-0 "Probni krug" friendlies award nothing** (`friendly: true`). They resolve and display as
  played but contribute 0 to points, exact tallies and win/loss records — see the `counts()` vs
  `isFinal()` distinction in `recompute.ts`.

### Route groups (App Router)

- `(app)` — the tabbed authed screens (bodovi/raspored/izazovi/profil/pravila) with a bottom `TabBar`.
- `(full)` — full-screen overlay flows (match detail, tip entry `/unos`, challenge setup `/izazov`,
  `/admin`).
- `(auth)` — `/login`. `api/login` + `api/logout` issue/clear the session cookie (excluded from
  middleware).

### Time / kickoffs

Schedule times in `data/grupna-faza.txt` are **Europe/Zagreb** local. A `+1` suffix (e.g. `04:00+1`)
means the match kicks off past midnight, the calendar day **after** its matchday (North-American
evening slots). `season.ts` (`kickoffMs`, `kickoffLabel`, `zagrebParts`) is the single place that
resolves this — `kickoff` (epoch ms) on each match is authoritative for all before/after-kickoff gating.

## Deploy

App Hosting auto-builds on push to `main` (`apphosting.yaml`). Runtime secrets (`AUTH_COOKIE_SIGNATURE_KEYS`,
`CRON_SECRET`) come from Cloud Secret Manager; public `NEXT_PUBLIC_FIREBASE_*` are inlined at build.
Production uses Application Default Credentials (the backend's compute service account) — no key file.
