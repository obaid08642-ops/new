# Backend hot paths (P14.3)

What the 2026-10-16 capacity run (`docs/perf/load-test-2026-10-16.md`, P14.27) found expensive, what changed, and the
measured effect. Same local test stack, same test data (21k public catalogue rows), `tools/perf/k6/ladder.sh`, 60 s per
step, both runs on the database with the catalogue indexes of PR #1567's shape already present.

| Hot path | Cause | Change |
|---|---|---|
| Doctors list (`GET /care/doctors`) | `nextAvailable` for each of the first 10 doctors, **one after another**, and per doctor **day by day**: up to 3 queries × 14 days (weekly hours, leave, bookings) | `nextAvailable` reads the doctor's weekly hours, leave and bookings for the 14 days in **3 queries**, then computes each day with the same `slotsForDate` rules (`SlotPreload`); the 10 doctors are read **in parallel** |
| Catalogue listing (`GET /public/products/search` without a term) | `countDocuments` over the whole public catalogue on **every** page, for `total` | the total is kept 60 s per process, concurrent misses share one count (a publish shows in the total within a minute; the rows are always live) |
| Catalogue sort and search | no index for the public filter + sort (Mongo read all 21k rows) | PR #1567 (schema indexes `public_popularity`, `public_price_*`, `public_newest`); not repeated here |

Measured (p95, ms):

| | 20 VUs before | 20 VUs after | 40 VUs before | 40 VUs after |
|---|---|---|---|---|
| doctors list | 391 | 170 | 1674 | 715 |
| catalogue listing | 195 | 152 | 540 | 496 |
| all public reads | 258 | 211 | 960 | 622 |
| Mongo CPU (avg %) | 51 | 42 | 59 | 52 |
| throughput (req/s) | 61 | 60 | 71 | 72 |

Throughput does not move because the single backend process is at one full core from 40 VUs (the next limit, P14.27):
the gain is latency at the same load. More throughput needs more API processes (P14.28 step 3, or cluster mode).

Tests: `care/tests/slot-next-available-p143.spec.ts` (the preloaded answer equals the day-by-day scan, with leave and a
booked slot, in at most 3 queries); `seo-search/public-listing-count-p143.spec.ts` (concurrent and repeated pages share one
count, a failed count is not kept, it counts again after a minute).

Already in place (checked, not changed): Mongo pool `maxPoolSize` 200 / `minPoolSize` 20 (`app.module.ts`); page-size
ceiling (`list-limit.middleware.ts`, P14.25); per-IP and per-route limits (`@Throttle`, P14.11); public-read micro-cache at
nginx (P14.11) and per-route `@PublicCache` with purge by tag (P14.7/14.8).

Needs review (not changed here, one line each):
- `backend/scripts/add-performance-indexes.js:118` cannot run (`const db = db.getSiblingDB(...)` uses `db` before it is
  defined) and no deploy step runs it; with #1567 the medicines entries are redundant, the others are unverified.
- `backend/src/modules/admin/notification-center/admin-notification-center.module.ts:226` queues a campaign one user at a
  time inside the request and `resolveSegment` stops at 100,000 users silently (P14.4).
