# Phase 0B semantic evidence — BookingFlowService spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/booking-flow/booking-flow.service.spec.ts:1–29`

The spec creates a partial BookingFlowService object with `Object.create`, configures only the radiology alias and a mocked radiology `findOne` chain (`6–12`). It verifies an assigned radiology provider can read a status entity and that the database query includes the booking id plus an `$or` across provider_account_id, provider_id, doctor_user_id and pharmacy_id, with `_id`/`__v` excluded (`14–22`). It verifies an unassigned radiology provider receives null when the mocked query returns null (`24–28`).

Coverage is prototype/mock-only and read-only; constructor/module wiring, HTTP guards, authenticated-session provenance, patient/owner/facility/tenant boundaries and live Mongo behavior are unproven (`7–28`). Only radiology is configured; other booking kinds, alias validity and kind-to-model isolation are absent (`8–10,14–28`). The query's multiple ownership fields are not proven to represent a consistent role/capability policy, and no tests cover missing/malformed IDs, missing context, patient access, family delegation, provider type mismatch, deleted/stale account or cross-tenant data (`14–28`).

No create/hold/slot-lock, payment intent, cancel/reschedule, call-token, completion, notification or settlement workflow is covered. There is no idempotency/replay, CAS/concurrency/transaction, state-transition, price/insurance/fee truthfulness, audit/provenance, PII projection, rate-limit, error-schema or live integration evidence (`1–29`). `NotFoundException` is imported but unused, so no explicit HTTP 404 mapping is asserted (`1,24–28`). No code was changed and no build/test/application operation was performed during this read.
