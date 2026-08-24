# Phase 0B semantic evidence — scheduling-engine.service.ts

**Archive member:** `src/modules/provider/services/scheduling-engine.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–111; full 111-line member covered.

Lines 2–12 import schedule/request models and repositories, define `assertProvider`, and require a recognized provider role. Lines 14–19 parse strict `HH:MM` values into minutes, rejecting invalid hours/minutes. Lines 21–26 construct the scheduling engine with slot and provider-request repositories.

Lines 29–32 list slots scoped by `provider_account_id=user.id`, sorted by day/start. Lines 34–48 upsert a provider slot after validating day 0–6 and end-after-start; updates require matching slot ID and provider ID, while creates spread arbitrary body fields and force provider ID. Lines 50–55 delete a slot scoped by provider ID and return not-found if absent.

Lines 57–89 implement availability. They derive local JavaScript day/hour from desired date, require one active weekly slot for the day, verify requested duration fits its start/end, count accepted/in-progress requests using a symmetric window around desired time, compare to `capacity_per_slot || 1`, and return availability/reason/load/capacity. Lines 91–99 compute workload as accepted plus in-progress count. Lines 101–110 return whether a provider is on duty based on local day/time and inclusive slot boundaries.

**Security/ownership:** CRUD methods enforce provider role and provider ID scoping. `checkAvailability`, `getWorkload`, and `isOnDuty` accept arbitrary `provider_account_id` strings and have no caller context, authorization or tenant validation in this member; exposure through controllers could enable cross-provider data probing.

**Scheduling correctness:** availability uses one `findOne` slot rather than evaluating overlapping weekly slots, handles no overnight ranges, uses local server timezone, and treats the conflict window as `desiredAt ± duration` with only `scheduled_at` bounds; it does not model actual booking end times or exact interval overlap. Count-then-book is not atomic, so concurrent requests can exceed capacity. No holiday, timezone, DST, blackout, cancellation timing, machine/resource or provider leave integration is visible.

**Mutation integrity:** upsert create spreads arbitrary body fields despite no DTO in this service; no idempotency, audit, version/CAS, transaction, duplicate-slot uniqueness or overlap validation is visible. Delete is not visibly idempotent beyond not-found behavior.

**Truthfulness/data source:** availability is derived from repository counts and weekly slot data, but `capacity_per_slot || 1` silently defaults missing capacity to one. No authoritative calendar, external booking source or persisted reservation is visible.

**State transitions:** provider request statuses `ACCEPTED` and `IN_PROGRESS` count toward load; no transition mutation occurs here.

**Price/payment/insurance source:** none visible.

**Test implications:** require provider owner/stranger/unauth tests for all public entry points, exact timezone/DST/overnight/holiday/leave cases, interval overlap and duration correctness, concurrent capacity reservation, duplicate/overlap slot prevention, arbitrary-field rejection, idempotency/audit/CAS, and cross-provider enumeration controls. No tests executed during this semantic read.
