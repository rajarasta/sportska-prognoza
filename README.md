# Fantasy Liga — Sportska prognoza (SP 2026)

Friends-only football prediction web app for the **2026 FIFA World Cup** group stage.
Players predict exact scorelines (graded on a Gaussian curve), climb the leaderboard, and
spend weekly **Izazovi** (challenge tokens) to duel another player's prediction for
double-or-nothing points. Mobile web, Croatian, high-fidelity design.

## Stack

- **Next.js 15** (App Router, TypeScript), SSR on **Firebase App Hosting**
- **Firebase Auth** (Google) gated by an email **allowlist** — server-verified session
  cookies via `next-firebase-auth-edge`
- **Firestore** for all data; all reads/writes go through the **Admin SDK** server-side
  (the browser never touches Firestore — rules deny all client access)
- Pure, shared **scoring engine** (`src/lib/scoring.ts`) used for both client preview and
  authoritative server scoring; duel resolution in `src/lib/duels.ts`
- Login "image of the day" pre-optimized to AVIF/WebP with `sharp`

## Local development

Use Node 22 (see `.nvmrc`):

```bash
nvm use            # 22
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

`.env.local` needs the Firebase web config (`NEXT_PUBLIC_FIREBASE_*`), a path to the Admin
service-account JSON (`GOOGLE_APPLICATION_CREDENTIALS`, local only — production uses ADC),
`AUTH_COOKIE_SIGNATURE_KEYS` (`openssl rand -base64 32`), and `LEAGUE_ADMIN_EMAILS`.

### Useful scripts

| Command | Purpose |
|---|---|
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run seed` | Seed Firestore: 48 teams + 6 trial teams, 72 fixtures + 3 trial friendlies, league config (from `data/grupna-faza.txt` + `src/lib/data/test-run.ts`). Idempotent; keeps entered results. Needs `GOOGLE_APPLICATION_CREDENTIALS`. |
| `npm run crawl` | Crawl finished results from the configured provider → mark matches final → recompute. Flags: `--dry-run`, `--force`. Needs `GOOGLE_APPLICATION_CREDENTIALS`. |
| `npm run optimize:images` | Regenerate `public/login/*.{avif,webp}` from `assets/login-src/*.png` |

## Data model (Firestore)

`leagueConfig` · `allowlist/{email}` · `users/{uid}` · `teams/{code}` · `matches/{id}` ·
`predictions/{matchId_uid}` · `duels/{id}` · `tokenBalances/{uid_wWeek}`

Scoring: exact = 3; otherwise Gaussian `exp(-d²/(2σ²))` (σ=1.9, 0–~1) + 0.3 if one side's
goals match. Duel: hit exact → 2× (6), opponent 0; both miss → normal scoring, no bonus.

## Deploy

App Hosting builds on push to `main`. Before the first deploy:

1. Create the cookie-signing secret: `firebase apphosting:secrets:set AUTH_COOKIE_SIGNATURE_KEYS`
2. (Optional) `firebase deploy --only firestore:rules`
3. Push `main` → watch the rollout in the Firebase console → App Hosting.

Admins (in `LEAGUE_ADMIN_EMAILS`) enter results at `/admin`; scores + duels + leaderboard
recompute automatically.

## Automatic results crawling

Instead of hand-entering every score, a pluggable crawler can fetch finished results, mark the
matches final, and recompute — the same idempotent path as the admin screen.

- **Providers** (`src/lib/server/results-crawler/providers/`): `mock` (default — reads
  `MOCK_RESULTS` JSON, no external calls) and `thesportsdb` (free; covers international
  friendlies). Pick via `RESULTS_PROVIDER`. Team-name matching lives in `team-aliases.ts`.
- **Core** (`src/lib/server/results-crawler/crawler.ts`): `crawlAndApply(db, opts)` is
  dependency-injected so it runs from both the server route and the CLI. The recompute logic is
  shared via `src/lib/server/recompute.ts` (`runRecompute(db)`).
- **CLI**: `npm run crawl` (add `-- --dry-run` to preview, `-- --force` to include matches whose
  kickoff hasn't passed — handy for mock tests).
- **HTTP**: `POST|GET /api/cron/crawl-results`, protected by `CRON_SECRET`
  (`Authorization: Bearer <secret>`, `x-cron-secret:` header, or `?secret=`). Supports
  `?dryRun=1` and `?force=1`. Fails closed (503) if `CRON_SECRET` is unset.

**Schedule it** (later) with Google Cloud Scheduler hitting the endpoint, e.g. every 15 min:

```bash
gcloud scheduler jobs create http crawl-results \
  --schedule="*/15 * * * *" --uri="https://<host>/api/cron/crawl-results" \
  --http-method=POST --headers="x-cron-secret=<CRON_SECRET>" --location=europe-west4
```

### Trial round (week 0)

`src/lib/data/test-run.ts` seeds three **international friendlies** on 2026-06-01 as a pre-WC
trial (`week 0`, labelled "Prijateljska"/"Probni krug"). For the trial, league config sets
`tokensByWeek: { "0": 1 }`, so every player gets exactly **1 Izazov token** that week
(`tokensForWeek()` in `src/lib/server/izazovi.ts`). Remove the week-0 entry from `WEEKS`,
`FRIENDLY_MATCHES`, and `tokensByWeek` after the trial to retire it.
