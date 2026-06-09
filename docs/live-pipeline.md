# Live-score pipeline (Hermes → watcher → app)

Automated **live** scoring during WC matchdays. A Hermes browser agent scrapes a
Croatian live-score site every few minutes, drops a structured JSON snapshot into
`live-inbox/`, and a local watcher ingests it: **live scores + provisional "mogući
bodovi"** while games play, **final scores + final points** at the end. The existing
manual/`crawl` finals path is untouched.

```
Hermes POLL cron (browser+file, every 10m, bounded)   Hermes WRAP-UP cron (once, day end)
        │ scrape Croatian site                                  │ final snapshot
        ▼ write live-inbox/<DATE>-<ts>.json  ──────────────────▶│
        ▼
   npm run watch:live  (chokidar daemon, ADC → Firestore)
   parseSnapshot (zod) → resolveMatchId (date + HR/EN aliases)
     ├─ live  → match.liveRes/minute/status='live' ; runProvisional(db)
     └─ final → match.res/status='final' (clear live) ; runRecompute(db)
   archive → live-inbox/processed | failed
        ▼
   SSR pages + <LiveRefresher/> router.refresh() ~45s while any match is live
```

## Components
- **Snapshot contract** — [src/lib/server/live/schema.ts](../src/lib/server/live/schema.ts) (zod, version 1).
- **Resolver** — [src/lib/server/live/resolve.ts](../src/lib/server/live/resolve.ts) + 48-team HR/EN aliases in [team-aliases.ts](../src/lib/server/results-crawler/team-aliases.ts).
- **Ingest** — [src/lib/server/live/ingest.ts](../src/lib/server/live/ingest.ts): live → `runProvisional`, final → `runRecompute` (idempotent; never overwrites a final).
- **Provisional scoring** — [src/lib/server/live/provisional.ts](../src/lib/server/live/provisional.ts): `provPoints` per pick, `provTotalPoints` per user (no duel 2× until final).
- **Watcher** — [scripts/watch-live.ts](../scripts/watch-live.ts) (`npm run watch:live`).
- **UI** — live score + `UŽIVO m'` badge + `Mogući bodovi` on `/raspored` & `/match/[id]`; `⚡ Uživo` standings toggle on `/bodovi`; auto-refresh via `src/components/LiveRefresher.tsx`.
- **Hermes jobs** — [scripts/hermes/create-live-jobs.py](hermes/create-live-jobs.py).

## Operate a matchday
1. **Watcher** (long-running; writes prod Firestore via ADC):
   ```bash
   nvm use 22
   GOOGLE_APPLICATION_CREDENTIALS=<serviceAccount.json> npm run watch:live   # under tmux/nohup
   ```
   Flags: `--dry-run` (read + log, no writes), `--once` (drain backlog + exit).
2. **Arm the Hermes jobs** — run shortly before the first kickoff (the POLL is a bounded
   interval, so the window can safely cross midnight):
   ```bash
   ~/.hermes/hermes-agent/venv/bin/python scripts/hermes/create-live-jobs.py \
     --date 2026-06-11 --hours 10 --wrap-at 2026-06-12T06:30 \
     --url "https://www.rezultati.com/nogomet/svijet/svjetsko-prvenstvo/"   # add --dry-run to preview
   ```
   Creates a bounded POLL job (`every 10m`, repeat = window/interval) + a one-shot WRAP-UP,
   both scoped to `browser`+`file`, workdir = this repo.
3. **Cleanup** after the day: `hermes cron list` → `hermes cron rm <job_id>`.

### Source site: rezultati.com (Croatian Flashscore)

Verified working in headless agent-browser (2026-06-09 dry run): load the URL → dismiss
the cookie consent by clicking **"Odbij sve"** → the **SP 2026** section lists every
fixture as `DATE TIME · HOME · AWAY · homeScore · awayScore` with Croatian names that
match our resolver exactly (scores show `-` until kickoff). **Timezone caveat:** rezultati
shows local Zagreb time, so a North-American evening kickoff appears under the *next*
calendar day (e.g. Južna Koreja–Češka shows `12.06 04:00` though it's matchday 11.06). The
agent therefore pins `date` to the tournament `--date` and matches by team name, never by
the displayed date — and the poll window is sized in hours (`--hours`) to span past midnight.

## Verify (offline, no prod)
```bash
npm run verify:live   # resolver: all 72+3 fixtures map (HR+EN); ingest e2e: live→prov→final→recompute, idempotent
npm run typecheck && npm run lint && npm run build
```
For a full prod/emulator e2e: start the watcher, drop a `live` snapshot then a `final`
snapshot into `live-inbox/`, and confirm the UI shows UŽIVO + Mogući bodovi, then banked
points. (Use `FIRESTORE_EMULATOR_HOST` or a dev service account to avoid touching prod.)
```json
// example live-inbox/2026-06-11-1.json
{"version":1,"source":"manual","capturedAt":1749600000000,"date":"2026-06-11",
 "fixtures":[{"home":"Meksiko","away":"Južna Afrika","score":[1,0],"minute":55,"status":"live"}]}
```

## Notes / guards
- Writes go to **production** Firestore; ingest is idempotent and **never overwrites a
  final** (mirrors the crawler). The in-app admin `enterResult` stays the human override.
- The agent emits team NAMES; the watcher resolves by date + alias and **logs any
  unresolved fixture** rather than guessing — watch that line on the first matchday.
- `live-inbox/` is local + gitignored (a trust boundary): anything written there reaches
  prod, so keep it on the owner's machine only.
