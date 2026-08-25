# Phase 0B semantic evidence — Emergency admin containment spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/emergency/emergency.admin-containment.spec.ts:1–14`

The spec constructs `EmergencyController` directly with an `any`-cast dependency and asserts that five administrative operations—active list, single-record lookup, assignment, auto-dispatch and resolution—throw `ServiceUnavailableException` (`4–13`). This is a focused fail-closed containment check intended to prevent the admin surface from exposing or mutating emergency records while the administrative implementation is unavailable.

The direct controller calls do not exercise Nest authentication/authorization guards, route binding, DTO validation, tenant/facility scope or the deployed artifact (`5–12`). The test does not prove that patient emergency surfaces remain available, that emergency record addresses/symptoms/locations are projected safely, or that hospital/vehicle/paramedic assignment and resolution are authorized and audited. It also does not cover rate limits, replay/idempotency, state transitions, concurrent dispatch, notifications, escalation, retention or live dispatch behavior. No code was changed and no build/test/application operation was performed during this read.
