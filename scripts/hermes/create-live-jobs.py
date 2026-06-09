#!/usr/bin/env python3
"""Create the Hermes POLL + WRAP-UP cron jobs for one WC matchday's live-score scrape.

This is the Hermes side of the live pipeline: a browser agent scrapes the chosen
(Croatian) live-score site every few minutes during the match window and drops a
version-1 snapshot JSON into this repo's live-inbox/, where `npm run watch:live`
ingests it (live scores + provisional points, finals + recompute at the end).

Run with the HERMES venv python (so the cron API + deps resolve), shortly before
the first kickoff (the POLL uses a bounded interval, so it starts ~one interval after
creation and the window can safely cross midnight — WC matches in Zagreb time often
run 21:00 → ~06:00 next day):

  ~/.hermes/hermes-agent/venv/bin/python scripts/hermes/create-live-jobs.py \
      --date 2026-06-11 --hours 10 --wrap-at 2026-06-12T06:30 \
      --url "https://www.rezultati.com/nogomet/svijet/svjetsko-prvenstvo/"

  # preview the jobs (prompts + schedules) without creating them:
  ... --dry-run

--date is the TOURNAMENT matchday (pinned into every snapshot); the agent matches
fixtures by team name, not the local date the site shows. The CLI `hermes cron create`
cannot set enabled_toolsets, so we call create_job directly to scope each job to the
browser+file toolsets (token-lean, least-privilege), workdir = this repo. The gateway
(60s tick) picks the new jobs up automatically.

Cleanup after the day:  hermes cron list   then   hermes cron rm <job_id>
"""
import argparse
import math
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
INBOX = REPO / "live-inbox"
HERMES_AGENT = Path(os.environ.get("HERMES_AGENT_DIR", str(Path.home() / ".hermes" / "hermes-agent")))

LINE_RE = re.compile(r"^(\d+)\s+(\d{2})\.(\d{2})\.(\d{4})\s+([A-L])\s+(.+?)\s+–\s+(.+?)\s*$")


def fixtures_for(date_iso: str) -> list[str]:
    out: list[str] = []
    for line in (REPO / "data" / "grupna-faza.txt").read_text(encoding="utf-8").splitlines():
        m = LINE_RE.match(line.strip())
        if not m:
            continue
        _no, dd, mm, yyyy, _grp, home, away = m.groups()
        if f"{yyyy}-{mm}-{dd}" == date_iso:
            out.append(f"{home.strip()} – {away.strip()}")
    return out


def poll_prompt(date_iso: str, fixtures: list[str], url: str) -> str:
    fixture_lines = "\n".join(f"  - {f}" for f in fixtures)
    example = (
        '{"version":1,"source":"<site host>","capturedAt":<epoch ms now>,'
        f'"date":"{date_iso}","fixtures":['
        '{"home":"Brazil","away":"Maroko","score":[1,0],"minute":63,"status":"live"},'
        '{"home":"Katar","away":"Švicarska","score":null,"status":"upcoming"}]}'
    )
    return (
        f"You distill live football scores for {date_iso} (FIFA World Cup group stage). "
        "Use the browser toolset (read-only).\n\n"
        f"1. browser_navigate to: {url}  — then take a snapshot.\n"
        "2. For ONLY these fixtures, read the current score, match minute, and whether each is "
        "upcoming / live / final (FT). Keep team names EXACTLY as the site shows them (Croatian):\n"
        f"{fixture_lines}\n\n"
        "3. Build a single JSON object matching this version-1 schema EXACTLY:\n"
        f"   {example}\n"
        "   Rules: score:null + status:\"upcoming\" for not-yet-started games; status:\"live\" with the "
        "running score for in-play; status:\"final\" with the finished score for FT games. minute is "
        "optional (omit or null when unknown).\n"
        f"   IMPORTANT — the \"date\" field MUST be exactly \"{date_iso}\" (the tournament matchday). Do NOT "
        "use the calendar date the site shows: rezultati.com displays local Zagreb time, so a match can "
        f"appear under the NEXT day (e.g. \"12.06. 04:00\") yet still belong to matchday {date_iso}. Match "
        "fixtures by TEAM NAMES from the list above, not by the displayed date.\n"
        f"4. Using the file toolset, write that JSON to a NEW unique file:\n"
        f"   {INBOX}/{date_iso}-<capturedAt>.json   (use the same epoch-ms you put in capturedAt; never overwrite an existing file).\n"
        "5. Reply with ONE line: which fixtures are live/final and the file you wrote.\n\n"
        "If the site fails to load or you cannot read scores, say so and write NOTHING (do not invent scores)."
    )


def wrapup_prompt(date_iso: str, fixtures: list[str], url: str) -> str:
    fixture_lines = "\n".join(f"  - {f}" for f in fixtures)
    return (
        f"End-of-day wrap-up for {date_iso} (FIFA World Cup group stage). Use the browser toolset.\n\n"
        f"1. browser_navigate to: {url} — confirm every fixture below is finished (FT):\n{fixture_lines}\n"
        "2. Write a FINAL version-1 snapshot (every fixture status:\"final\" with its real score) to "
        f"{INBOX}/{date_iso}-final-<capturedAt>.json — the watcher will finalize results and recompute points.\n"
        "3. Report a short Croatian summary: the day's FINAL match results AND the fantasy standings "
        "(final points for the day). Then stop."
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True, help="tournament matchday YYYY-MM-DD (pinned into snapshots)")
    ap.add_argument("--url", required=True, help="live-score page the agent scrapes")
    ap.add_argument("--hours", type=float, default=6.0, help="poll window length in hours; run near first kickoff (default 6)")
    ap.add_argument("--every", type=int, default=10, help="poll interval minutes (default 10)")
    ap.add_argument("--wrap-at", required=True, help="wrap-up one-shot timestamp, ISO e.g. 2026-06-12T06:30 (may be next day)")
    ap.add_argument("--deliver", default="local", help="cron delivery (local | discord:<id>)")
    ap.add_argument("--dry-run", action="store_true", help="print the jobs, don't create them")
    args = ap.parse_args()

    fixtures = fixtures_for(args.date)
    if not fixtures:
        print(f"No fixtures found for {args.date} in data/grupna-faza.txt", file=sys.stderr)
        return 1

    # Bounded interval (midnight-safe): first run ~one interval after creation, then
    # every `--every` min for `repeat` runs covering the `--hours` window.
    poll_schedule = f"every {args.every}m"
    poll_repeat = math.ceil((args.hours * 60) / args.every)
    common = dict(
        enabled_toolsets=["browser", "file"],
        workdir=str(REPO),
        deliver=args.deliver,
    )

    if args.dry_run:
        print(f"REPO         = {REPO}")
        print(f"INBOX        = {INBOX}")
        print(f"fixtures     = {fixtures}")
        print(f"POLL job     : schedule='{poll_schedule}' repeat={poll_repeat} (~{args.hours}h window) toolsets=browser,file")
        print(f"WRAP-UP job  : schedule='{args.wrap_at}' repeat=1")
        print("\n--- POLL prompt ---\n" + poll_prompt(args.date, fixtures, args.url))
        print("\n--- WRAP-UP prompt ---\n" + wrapup_prompt(args.date, fixtures, args.url))
        print("\n(dry-run — nothing created)")
        return 0

    sys.path.insert(0, str(HERMES_AGENT))
    from cron.jobs import create_job  # noqa: E402

    poll = create_job(
        prompt=poll_prompt(args.date, fixtures, args.url),
        schedule=poll_schedule,
        name=f"WC live poll {args.date}",
        repeat=poll_repeat,
        **common,
    )
    wrap = create_job(
        prompt=wrapup_prompt(args.date, fixtures, args.url),
        schedule=args.wrap_at,
        name=f"WC wrap-up {args.date}",
        repeat=1,
        **common,
    )
    print(f"Created POLL job    {poll['id']}  ({poll_schedule}, x{poll_repeat})")
    print(f"Created WRAP-UP job {wrap['id']}  ({args.wrap_at}, x1)")
    print(f"\nStart the watcher if it isn't running:\n  GOOGLE_APPLICATION_CREDENTIALS=<key.json> npm run watch:live")
    print("Cleanup later:  hermes cron list   then   hermes cron rm <job_id>")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
