# Phase 0B semantic evidence — provider-schedule.service.ts

**Archive member:** `src/modules/provider/services/provider-schedule.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–64; full 64-line member covered.

Lines 2–17 import request status/repository and provider role assertion, define start/end-of-day helpers using local `Date.setHours`, and construct the service with the request repository. Lines 19–36 implement `view`: provider role is required, mode defaults to daily or accepts weekly, the optional `from` value is parsed with `new Date`, daily/weekly local boundaries are built, and requests for the current provider with accepted/in-progress/completed statuses and scheduled timestamps in range are loaded sorted by scheduled time.

Lines 38–53 group results by `toISOString().slice(0,10)` and return request ID/type/status/time, slot duration defaulting to 30 minutes, patient name and bilingual summaries. Lines 56–62 return mode, local start/end, count and grouped days.

**Security/ownership:** the query is scoped by `provider_account_id=user.id` after a provider-role assertion. Patient name and summaries are included in the provider schedule response; sensitivity/minimization depends on controller/resource policy not visible here.

**Temporal correctness:** boundaries are calculated in local server time, while grouping keys are UTC ISO dates. A provider/client timezone can therefore see an item under a different day than the range boundaries. Invalid `from` values are not explicitly rejected. Weekly range uses fixed 24-hour arithmetic, which can drift across DST transitions. No holiday/leave/slot conflict/booking duration overlap logic is visible; this is a view over existing request records only.

**Mutation/integrity:** no mutation is present. Requests are read without pagination or upper bound, and no cursor/consistency snapshot is visible. Schedule output may contain stale or concurrently changing statuses.

**Truthfulness:** `scheduled_slot_minutes || 30` silently defaults missing duration; schedule inclusion reflects status and timestamp, not confirmation of actual provider availability or location. No authoritative calendar, timezone metadata or external scheduling source is visible.

**Price/payment/insurance source:** none visible.

**Test implications:** require provider owner/stranger/unauth tests, invalid-date handling, timezone/DST boundary tests, UTC/local grouping correctness, weekly range semantics, large-range pagination/performance, PII minimization, stale/concurrent reads, and missing-duration truthfulness tests. No tests executed during this semantic read.
