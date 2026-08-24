# Phase 0B semantic evidence — PatientPharmacyController

**Archive member:** `src/modules/pharmacy/patient-pharmacy.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–15 from the baseline archive extraction.

Lines 1–3 import the Nest controller/query/guard primitives, `JwtAuthGuard`, and `PharmacyShortageService`. Lines 5–8 define `@Controller('patient/pharmacy')`, apply `@UseGuards(JwtAuthGuard)` at controller scope, and inject the shortage service. Lines 10–14 expose `GET /patient/pharmacy/shortage-flags/lookup`, accept `drugName` from the query, and call `shortageSvc.lookupForPatient(undefined, drugName)`, returning either one flag in an array or an empty array.

**Auth/ownership observation:** the route is guarded, but this method does not accept `CurrentUser` and passes `undefined` as the patient/user identifier. The effective ownership behavior therefore depends on the service implementation; this controller alone does not prove patient scoping.

**Truthfulness/state:** the response is a computed flags array; no price, payment, order state, or client fallback is visible in this member. No mutation or idempotency key is present.

**Consumer traceability:** not yet reconciled; route-to-consumer mapping is deferred to the dedicated traceability phase.

**Test implications:** require unauthenticated `401`; authenticated owner/other-user scoping tests; missing/empty `drugName`; service behavior when user id is undefined; and response shape tests. No tests executed during this semantic read.
