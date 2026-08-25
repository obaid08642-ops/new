# Phase 0B semantic evidence — DriverShift schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/driver-shift.schema.ts:1–21`

The timestamped `DriverShift` schema defines unique/indexed ID, required indexed driver ID, status with runtime enum `online|offline|on_delivery` defaulting online, started/ended timestamps, object-typed current location with lat/lng/heading/speed/at, deliveries_completed defaulting zero and earnings defaulting zero (`9–21`). The schema comment describes one shift from go-online to go-offline and live position on the last shift (`5–8`).

No unique active-shift constraint or driver organization/role/eligibility ownership is represented (`11–13`). Status has an enum but no transition actor/time/reason/history, optimistic version, terminal protection or idempotent go-online/offline behavior (`13–15`). started_at is not required and no end-after-start/timezone/maximum-duration invariant is represented (`14–15`). current_location uses `Object` and has no coordinate range, accuracy/source/sequence/geospatial index, freshness, anti-spoofing, privacy or retention policy (`16`). deliveries_completed and earnings are unconstrained mutable numbers with no nonnegative/max/atomicity, currency, payout ledger, reconciliation or driver authorization contract (`17–18`). No shift audit, break/compliance, device/session binding or deletion/retention policy is represented. No code was changed and no build/test/application operation was performed during this read.
