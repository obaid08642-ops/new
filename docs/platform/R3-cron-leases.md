# R3 - Cron safety: one run per job across N workers (2026-11-02)

Problem: 37 `@Cron`/`@Interval` jobs run in the worker role; 19 had no distributed lock, so a second worker would run each one twice (double notifications, double sweeps, double retention deletes).

## `@ScheduledOnce` (`backend/src/common/scheduled-once.ts`)

```ts
@Cron('*/5 * * * *')
@ScheduledOnce()                      // or @ScheduledOnce({ holdMs: 2000 }) under @Interval(5_000)
async sweep() { ... }
```
- Lease key `cron:lease:<Class.method>` in the **main** Redis (`SET key token PX ttl NX`, ttl 30 s). The loser skips silently (returns `undefined`).
- The winner renews the lease every ttl/3 (Lua compare-token-then-`PEXPIRE`), so a long job keeps it and a dead worker loses it after 30 s.
- On finish the key is **shortened to `holdMs`, not deleted** (Lua, only if still ours). Otherwise a worker whose tick arrives a few ms late would find the key gone and run the job again. Defaults: 2 s; `@Cron` with seconds: 3 s; `@Interval(n)`: about n/2.
- Lease lost (renewal fails): `cron_lease_lost` is logged at error level; the running job cannot be cancelled, so keep jobs idempotent.
- Redis down, or the in-memory fallback shim (per-process, not a lease): **fail open** - the job runs, one warning per job per minute. Set `CRON_LEASE_FAIL_CLOSED=1` in the worker env as soon as a second worker exists: then it skips instead. `cronLeaseStats` counts ran / skipped / failedOpen / failedClosed / lost.
- Clock skew between workers larger than `holdMs` could still let a late worker rerun a job; hosts need NTP (chrony), already in `setup-server.sh`'s base image assumptions - verify with the ops memory report when a second node exists.

## Applied to 34 of 37 jobs
All except: `worker-heartbeat` (per process on purpose), `mail` keep-alive (keeps this process's SMTP connection warm), `seo-indexing` (already has its own Mongo lease).
Two jobs are also called by hand, so the cron entry was split to keep the manual call unleased: `GuestLifecycleService.purgeInactiveGuests` (admin endpoint) now has `purgeInactiveGuestsScheduled`, `LegalEnterpriseService.licenseMonitor` (manual `licenseMonitorRun`) has `licenseMonitorScheduled`.

## Test (`scheduled-once.spec.ts`, real redis-server like `configured-io.adapter.spec.ts`; CI installs redis-server)
2 and 8 workers on one tick -> 1 run; late tick not rerun, next period runs; 1.5 s job with a 0.6 s ttl keeps its lease; dead worker's lease expires; failing job propagates and still shortens the lease; an old worker never touches a lease someone else now owns; Redis unavailable / erroring fails open and closed on request; decorator keeps `this`, arguments, method name and the `@Cron` metadata.
Not done: a two-OS-process run against a deployed stack (staging, R6).

## Related
The R2 sweeper and `DurableEventsService.process` use an atomic Mongo claim instead and are safe with N workers without this decorator.
