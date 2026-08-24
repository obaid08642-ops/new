# Phase 0B semantic evidence — HealthModuleController

**Archive member:** `src/modules/health/health.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–140 from the baseline archive extraction.

Lines 1–12 define a JWT-guarded, idempotency-intercepted `health` controller backed by `HealthService`. Lines 14–36 expose authenticated read routes for vitals, vitals log, chart, recent/latest/summary, and health score. Query limits are parsed with `parseInt` and default to 100 or 20; no explicit upper-bound validation is visible here.

Lines 37–48 expose idempotent vital add/update/delete. Add accepts an untyped body and returns only the created reading ID; update/delete pass user and ID to the service. Lines 50–55 expose idempotent wearable link/unlink routes that immediately throw `NotImplementedException('wearable_provider_not_enabled')`; these are explicit blocked capabilities, not mocks or successful fallbacks.

Lines 57–80 expose reminders list, idempotent create/log/update/delete, and non-idempotent refill/refill-snooze/refill-cancel. Reminder log passes status, time key default, and occurred-at to the service. Refill routes do not visibly require idempotency despite mutating refill/chronic state.

Lines 82–84 expose idempotent medication refill. Lines 86–93 expose sleep list/add; sleep add has no visible idempotency decorator. Lines 95–139 expose reports, medication reminders, prescriptions, emergency contacts, chronic diseases, chronic meds, and trends reads, plus non-idempotent emergency-contact add/delete. All delegate user context to the service.

**Routes/events:** vitals reads and mutations, wearable link/unlink, reminders lifecycle/refill/log, medication refill, sleep read/write, reports/prescriptions/medication reminders/emergency contacts/chronic data/trends.

**Auth/ownership:** controller-level JWT guard; all methods accept `CurrentUser` and delegate user-scoped operations. Exact stranger behavior is service-dependent from this member.

**State transitions:** vital create/update/delete; reminder create/log/update/delete/refill/snooze/cancel; medication refill; sleep add; emergency-contact add/delete. Wearable operations are explicitly unsupported.

**Price/payment/insurance source:** none visible in this member.

**Idempotency/security observations:** idempotency is applied to vitals mutations, wearable stubs, reminder create/log/update/delete, and medication refill. It is absent on reminder refill/snooze/cancel, sleep add, and emergency-contact add/delete. Bodies are mostly `any`, so DTO/runtime constraints are not established here. Query limits lack visible range caps.

**Test implications:** unauth 401; owner/stranger non-disclosure for all IDs; replay tests for decorated mutations; explicit 501/unsupported behavior for wearables; idempotency coverage for undecorated mutations; query limit bounds; reminder time/status validation; medication/refill ownership; emergency-contact validation; and no-success-on-unsupported assertions. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
