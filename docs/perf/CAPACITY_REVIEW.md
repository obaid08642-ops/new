# Monthly capacity and cost review (20.10)

**Rule:** on the 1st of every month one note `docs/perf/capacity-<YYYY-MM>.md` is written from the measured numbers, not from feeling. A scale-out step of [`SCALE_ARCHITECTURE.md`](SCALE_ARCHITECTURE.md) §6 starts when its trigger fires in that note, and not before (no spending on servers "just in case", no waiting for an outage either).

## Where the numbers come from
| Part | What | Where |
|---|---|---|
| Sampler | every 15 min one JSON line: CPU busy %, RAM, disk, API latency buckets / requests / 5xx / event-loop lag / **open sockets** (`nabd_ws_connections`), MongoDB cache pages read vs requested, Redis hits / misses / evictions. Read-only; kept 40 days | `deploy/scripts/capacity-sample.sh` → `/var/lib/nabdah-capacity/samples.jsonl` (cron: `deploy/cron/nabd-backups`) |
| Review | decides which step the 30 days trigger; writes the note; exit 0 none / 3 triggered / 2 not enough data (7 days minimum, never "all good" on thin data) | `python3 tools/perf/capacity-review/review.py samples.jsonl --month YYYY-MM --out docs/perf/capacity-YYYY-MM.md [--step2-done] [--costs docs/perf/costs.json]` |
| Reminder | a GitHub issue with this checklist on the 1st | `.github/workflows/capacity-review.yml` |
| Dashboards | the same signals live: admin Ops page, `/observability/metrics` (Prometheus), SLO alerts (20.5), status page (20.6) | |

## Triggers (from §6; the review computes them)
| Step | Fires when | Metric |
|---|---|---|
| 2 Split stateful services | CPU > 70 % for an hour or more on 3+ days **or** MongoDB cache miss ratio rising (last 7 days ≥ 1.5× the first 7 and > 0.5 %) | `cpu_busy_pct`, WiredTiger `pages read into cache` / `pages requested from the cache` |
| 3 Horizontal API | API p95 > 400 ms at the daily peak on 3+ days, **after** step 2 is done | all-route latency buckets, windowed between samples |
| 4 Realtime tier | more than 50,000 open sockets | `nabd_ws_connections` (this process) |
| 5 Region resilience | business need or regulation | owner decision (Phase 19) |

Guardrails the note also lists (a month with one is not "fine"): disk > 80 %, RAM > 85 % average, event-loop lag > 100 ms, 5xx share > 0.5 %, Redis evictions.

## The monthly steps
1. Copy `samples.jsonl` off the server (server-ops task, read-only) and run `review.py`; commit the note.
2. If a step fired: write under it what to buy / move, its cost, and the date; after the step, re-run the capacity workflow (`tools/perf/k6`) and add `load-test-<date>.md`.
3. Costs: fill this month in `docs/perf/costs.json` (`{"2026-10": {"server": 0, "cloudflare": 0, ...}}`, the owner's invoices); the note shows the change and flags anything over 20 % with a line that explains it.
4. Check the limits that cost money when crossed (below).

## Lines that can cost money, and the limit to watch
| Line | Limit / cost driver | Where to read it | Current design |
|---|---|---|---|
| Server | CPU, RAM, disk of the one host (steps 2–3 add servers) | sampler | one host |
| Cloudflare Workers KV (status page) | Free plan: 1,000 writes a day | `docs/ops/status-page.md` | 720 a day with the journeys (see that doc); move history to D1 before raising the cadence |
| Cloudflare R2 (backups, archive, media) | storage and operations; backups expire after 30 days (lifecycle) | R2 dashboard; the oplog adds 144 uploads a day plus about 30 days of slices (20.8) | check the bucket size each month |
| GitHub Actions minutes | the external uptime probe (`.github/workflows/uptime.yml`) runs every 15 minutes since 2026-10-18 (was 5): about 2,900 runs a month, each billed at least 1 minute; a private repository on the Free plan has 2,000 minutes | repository Settings → Billing | **owner decision 2026-10-18:** slowed to 15 minutes. If minutes still run out, go to 30 (about 1,450 a month) or keep only the Cloudflare vantage |
| Mail | Resend / Brevo / Mailjet free tiers have daily caps; the fallback chain uses them in order | provider dashboards | check the monthly volume against the cap |
| Sentry (20.4) | events per month on the plan | Sentry usage page | sample rate in `SENTRY_*` env |

No external monitoring or cost tool is added without the owner's approval.

## What this does not do
It cannot read invoices (the owner provides `costs.json`), and it only sees the one API process's sockets (with several API nodes, sum the gauge). The first real note needs a week of samples after the cron is installed.
