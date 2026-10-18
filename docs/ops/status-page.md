# Uptime checks and the public status page (20.6)

Plan 20.6: "External checks from several regions, and a public status page. Verify: the status page is live."

## What it is
`https://status.nabd.plus` is a Cloudflare Worker (`deploy/cloudflare/status-worker/`), independent of the origin server: when the server is
down the page still answers, and says so. No JavaScript, six languages (ar default; `?lang=en|ur|hi|bn|fil`, or the browser's language), colours from the
design tokens, a strict CSP. `https://status.nabd.plus/api/status.json` is the same data for a monitor.

## Where the checks come from (vantage points)
| Vantage | How | Network |
|---|---|---|
| `cloudflare` | the worker's own cron, every 5 minutes (`wrangler.toml`) | Cloudflare's edge (the data centre that runs the cron) |
| `github-actions` | `.github/workflows/uptime.yml`, `tools/uptime/probe.mjs`, every 5 minutes, reports to `POST /ingest` | GitHub's runners (a different provider and region) |
| `journeys` (20.7) | the synthetic user journeys, run by the worker's second cron (every 10 minutes) | Cloudflare's edge (see `synthetic-journeys.md`) |

Honest limit: that is **two independent networks**, not "many regions". A real multi-region monitor (UptimeRobot, Better Stack, Pingdom: probes from
several continents, free tiers exist) is an external service and needs the owner's approval; the status page would then just add its vantage to `/ingest`
(or the service's own page can replace this one).

## What is checked
`website` (`https://nabd.plus/ar`, expects 200) and `api` (`https://api.nabd.plus/api/v1/health/readiness`, expects 200). The probe URL carries `?__status=1`
(the origin ignores it) and a no-cache header. A slow answer (> 3 s) or the edge serving a saved copy (`x-nabd-edge: ERROR-STALE`/`UNAVAILABLE`) counts
as **degraded**, not working. The GitHub probe retries once before it calls a component down.

## How a status is decided
Per component, from the vantages that reported in the last 15 minutes: all ok = working; some = degraded (one vantage's own trouble is not an outage); none = down;
nothing recent = "No recent data". An **incident** opens when a component is down and closes when it works again; the page shows the last 10, and the 30/90-day
uptime per component. History is one KV key (90 days of ok/total per day and component); the worker writes it once per report: 2 vantages x 288 = 576 writes a
day, plus 144 for the journeys = 720; the Workers KV Free plan allows 1,000 writes a day. If the plan or the cadence changes, move the history to D1.

## Alerts (who hears when it is down)
- The GitHub uptime run **fails** when a component is down; GitHub emails that to the repository's watchers (the owner: Watch > Custom > Workflows).
- The in-app SLO alerts (20.5) cover "up but failing or slow"; `deploy/scripts/monitor.sh` covers the host. Telegram/email from the worker itself is not built.

## Rollout (build session, `server-ops`, owner Approve; nothing is changed by merging the PR)
1. `wrangler kv namespace create STATUS`; put its id in `wrangler.toml`.
2. A random 48-character secret: `wrangler secret put INGEST_SECRET` (worker) and the same value as the GitHub secret `STATUS_INGEST_SECRET`.
3. `wrangler deploy` (the custom domain `status.nabd.plus` creates its proxied DNS record). Credentials: the Cloudflare Global API Key already used by the ops tasks
   (`CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL`), or an API token with Workers Scripts, Workers KV and DNS edit.
4. Verify: the page answers in all six languages; `GET /api/status.json` shows two vantages within 10 minutes; stop the API container for a minute in a drill
   (or point a probe at a dead URL on a copy) and see "down" and an incident, then "working" and the incident closed; a forged `/ingest` answers 403.
5. Rollback: delete the worker's custom domain; nothing else depends on it.
