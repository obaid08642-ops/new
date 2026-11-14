# Incident checklist

Use for anything users can feel: status page red, `Critical` alert, journey failure, a support wave. One person leads; everything is written in one thread with times.

## 1. First 5 minutes
- [ ] Say who leads. Open the thread; write the first line: time, symptom, who noticed how.
- [ ] Is it real? Status page (`status.nabd.plus`), synthetic journeys (which step failed: `docs/ops/synthetic-journeys.md`), `/api/v1/health/readiness`.
- [ ] Severity: **S1** payments, sign-in, booking or calls down for many users, or data at risk. **S2** one feature or one platform degraded. **S3** cosmetic or single user.
- [ ] S1: stop deploys (`docs/runbooks/api-availability.md`, no merges to main until clear).

## 2. Find the area (pick the runbook)
| Symptom | Runbook |
|---|---|
| API 5xx / unreachable | `api-availability.md` |
| Slow, event-loop lag | `slow-api.md` |
| 503 `server_busy`, overload alert | `overload.md` |
| Payments failing | `checkout-failures.md` |
| Push/SMS/e-mail not arriving | `notifications-queue.md` |
| Sign-in or OTP failing | `sign-in.md` |
| Calls failing | `calls.md` |
| Database / host down, data lost | `disaster-recovery.md`, `rebuild-from-repo.md` |
| Cron job not running or twice | `docs/platform/R3-cron-leases.md` |
| App crashes after a release | `app-release-health.md` |

## 3. Communicate
- [ ] S1/S2 longer than 10 minutes: status page incident is open (opens by itself when a component is down; add a note).
- [ ] Support gets one sentence they can paste and a time for the next update (every 30 min while open).
- [ ] No customer data in the thread. Health data is never pasted, only ids.

## 4. Fix
- [ ] Prefer rollback to a forward fix under pressure (previous image tag; `zero-downtime` rules apply).
- [ ] Production changes only as a `tools/ops` task (dry run first); no hand edits on the server.
- [ ] Write down every command run.

## 5. Close
- [ ] Verify with the metric that alerted and one synthetic journey (green twice in a row).
- [ ] Status page incident closed, support told.
- [ ] Within 2 working days: a note in `docs/incidents/YYYY-MM-DD-<slug>.md` (create the folder with the first one) with timeline, cause, what detected it, what would have detected it sooner, actions with owners. No blame, no secrets.
