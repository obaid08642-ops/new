# Capacity and cost review, 2026-10

**Status: baseline note. Production has not been sampled yet** (the sampler ships with this PR and needs the cron installed; the first measured note is `capacity-2026-11.md` and needs 7+ days of samples). Nothing below is a production measurement unless it says so.

## What is known today
| Fact | Source |
|---|---|
| One host runs everything (backend, worker, MongoDB, Redis, Meilisearch, LiveKit, coturn, nginx, both web apps): step 1 of §6 | `deploy/docker-compose.production.yml` |
| Ceiling of the API on a 4 vCPU test machine with production-sized test data: 10 VUs ≈ 31 req/s with every target met; flat at ≈ 54 req/s above 20 VUs; the first bottleneck was catalogue queries reading every row (fixed by the four `medicines` indexes) | `load-test-2026-10-16.md` (test machine, not production) |
| 2026-10-16 outage: the root disk filled (ISR cache in the container layer, 5.8 GB in 18 h) | `ISR_DISK_1603.md`, `docs/ops/DISK_ALERT_1603.md` |
| Disk is the constraint that already bit: the monitor warns under 20 % free, and fills-in-N-hours | `deploy/scripts/monitor.sh` |

## Triggers this month
Not evaluated: no samples. Step 1 is the current state; no step is claimed to be needed or cleared.

## Actions
1. Install the cron line for `capacity-sample.sh` (server-ops task, needs the owner's Approve) and set `METRICS_SCRAPE_TOKEN` (already in the env example; the sampler skips the API block without it).
2. After 7 days, run `review.py` on the copied `samples.jsonl` and replace this note with `capacity-2026-11.md`.
3. The R2 size of the backup bucket now that oplog slices are added (owner decision pending). The GitHub Actions minutes are settled: the probe stays at 5 minutes because the repository is public (owner, 2026-10-18).
