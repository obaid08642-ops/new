# Phase 0B semantic evidence — Provider availability contract spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/contracts/provider-availability.contract.spec.ts:1–38`

The spec constructs `ProviderOpsService` with a mocked Mongo connection/collection (`5–9`). It verifies a previously unconfigured provider can toggle instant availability to true, that the expected `provideravailability` collection and provider_id upsert filter/set are used (`11–22`). It verifies an existing available provider toggles false (`24–32`). It verifies a patient-role caller receives ForbiddenException (`34–37`).

This is a narrow mocked service contract. It does not execute an HTTP endpoint, real authentication, provider identity/role binding, provider profile ownership, facility/tenant boundary or provider-type capability validation (`11–37`). The second call omits role entirely, so the test does not establish the service's authorization behavior for missing/malformed caller context (`24–30`). The upsert assertion does not prove a unique provider index, compare-and-set/concurrent toggle safety, idempotency/replay, audit actor/time, status transition history, rate limiting or failure mapping (`17–31`). No schedule/time-window, location, workload/capacity, consultation-mode, holiday, suspension or health-service availability policy is represented. No live Mongo/index or read-side propagation evidence exists. No code was changed and no build/test/application operation was performed during this read.
