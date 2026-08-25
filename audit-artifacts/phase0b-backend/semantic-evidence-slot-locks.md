# Phase 0B semantic evidence — Slot locks

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/slot-locks/slot-locks.module.ts:2–73`

`SlotLocksService` defines a 10-minute held-lock TTL. Reserve validates only provider ID and slot start, parses dates, deletes expired held locks, performs an overlap query, returns an existing same-patient conflict, otherwise creates a held lock (`slot-locks.module.ts:7–31`). The overlap check and create are separate and there is no visible unique interval/index/transaction; invalid dates, end-before-start, booking-kind/provider relationship and maximum interval are not visibly rejected.

Confirm loads a lock scoped to current patient, changes it to confirmed, attaches caller-supplied booking ID and extends expiry to one year (`34–42`). No visible check binds booking to provider/patient/kind/slot or prevents late confirmation; confirmed lock release/completion lifecycle is absent. Release is patient scoped but returns success for a missing lock and uses separate read/save without idempotency (`45–51`). Mine returns all held/confirmed locks with no visible pagination or minimal projection (`54`).

The controller is JWT guarded and exposes reserve/confirm/release/mine routes with raw bodies and no visible DTO or idempotency decorator (`57–65`). The module registers the schema/controller/service and exports the service (`67–73`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: slot collision races, invalid interval acceptance, untrusted booking confirmation, year-long stale holds, missing completion release, raw lock disclosure and mutation replay gaps.
