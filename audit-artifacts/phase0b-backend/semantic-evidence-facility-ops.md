# Phase 0B semantic evidence — Facility operations

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/facility-ops/facility-ops.module.ts:2–440`

Facility operations embeds beds/admissions, shifts/attendance, surgeries and facility communications/resources services/controllers in one module (`facility-ops.module.ts:17–440`). All controllers use JWT only; no visible route-level role decorators or facility membership checks are present. Controllers derive facility scope from `parent_provider_account_id || user.id` (`253–339,345–418`).

Beds admission checks availability then updates bed, creates admission and decrements ward count in separate operations; discharge separately updates admission, bed and ward. No visible transaction/idempotency/current-state predicate protects these counters (`29–150`). Ward creation creates N beds in a loop after ward insertion and has no visible total-beds bounds or partial-failure reconciliation (`60–79`). Admission listing returns patient IDs/names/phone fallback and discharge summaries (`29–50`).

Shift creation spreads raw body fields into persistence and accepts arbitrary time/day/user/department values. Check-in accepts caller GPS without bounds/geofence and creates unlimited attendance rows; check-out only checks facility/attendance ID and can be repeated (`161–204`). Surgery booking checks overlapping room availability then inserts separately, with no visible patient/provider authorization, duration/date bounds, idempotency or concurrency lock (`207–246`).

Announcements/resources are raw collections scoped by derived facility ID, with bounded text/name fields but no visible role separation, idempotency, moderation, branch ownership or resource type allowlist. Resource updates are scoped to facility and allow a limited status/capacity set (`342–418`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: facility authorization gaps, admissions/counter races, clinical PII exposure, mass assignment, attendance/GPS abuse, surgery double-booking, and raw communications/resource governance gaps.
