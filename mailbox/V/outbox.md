# Lane V outbox

## 2026-11-09 13:45 UTC — Item 1: run 109 results + who restarts mongod
Status: in progress
PR: #2545 (CI: pending) — read-only ops task 96k; #2535 closed (superseded)
What changed:
- Run 109 (42616573387, main@58a1bb6e): deploy DONE, health ok, cache MISS->HIT, BYPASS with Authorization. Pre-deploy dump 351 MB, dump-guard ok. mongod cacheSizeGB=0.6 applied (equals the file). Container 1600 MB: cgroup max=6803, oom 0, oom_kill 0; kernel kills 0 in 48 h; mongod log 32 starts, 0 signals, 0 shutdowns. mongodb restarts=359 (356 at run 108), so about 3 more since then: restarts may have mostly stopped. 96k answers this.
- Host: swap used 866 MB of 4095, MemAvailable 1153 MB, disk 86%, coturn restarts=3. clamav SKIPPED_LOW_MEMORY (uploads stay refused until the scanner runs). Watchdog/monitor scripts re-installed from the release.
- Halala: wallets.balance doubles=8 (clean, no shadow). Also missing shadow, all clean: orders 20, labbookings 5, appointments 1. Total 193 rows missing shadow, 0 unclean, 0 disagree.
- Who restarts mongod (from the repo): only Docker's `restart: unless-stopped` when mongod exits. The healthcheck never restarts it; backend-watchdog watches only backend and patient-web; no script restarts/stops/kills mongodb. So mongod itself exits without SIGTERM. 96k reads exit code/OOMKilled, starts per hour, the log lines before each start, and host kill sources.
Left / blockers / questions:
- Lead: please add `96k-mongo-restart-who.sh` to tools/ops/RUN on review/server-inspect once #2545 is green (I must not push there).
- Halala backfill plan for the 8 wallet rows comes after the 96k run (dry-run, then owner approval).
- Next: item 2 (PT-08 doctor side, reading #2543).
