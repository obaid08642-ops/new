# Phase 0B semantic evidence — nabd-extensions service/controller/module

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Members read:**
- `src/modules/nabd-extensions/nabd-extensions.service.ts:2–721` (full 721-line member)
- `src/modules/nabd-extensions/nabd-extensions.controller.ts:2–194` (full 194-line member)
- `src/modules/nabd-extensions/nabd-extensions.module.ts:2–74` (full 74-line member)
- `src/modules/nabd-extensions/repositories/appointment.repository.ts:2–13` (full 13-line member)

## Service semantics

Lines 2–70 inject Notifications/JWT, 18 repositories and model/schema types. Lines 76–123 log activities and react to appointment.created/order.cancelled/prescription.issued events; payloads are `any` and are persisted/logged/used for notifications. Lines 125–164 read/create wallet and mutate balance before creating a transaction, with no transaction/session, idempotency, atomic conditional debit, amount sign/finite validation or unique wallet guarantee. Lines 166–219 generate referral codes with Math.random and claim a reward, increment code use count and credit both wallets through independent writes; duplicate concurrent claims and partial failures are not prevented.

Lines 222–232 expose all feature flags and upsert arbitrary flag names/isEnabled. Lines 238–281 aggregate appointments, prescriptions, lab results and vitals into a patient timeline and generate a JWT health passport containing patient name/blood type/chronic diseases/allergies; the token is returned in response and embedded in a custom QR URI without explicit short TTL, audience/issuer/scope, revocation, consent or verifier access policy. Lines 283–371 enroll/complete care programs and return hard-coded Arabic master program text, rewards, session schedules/times and two programs (diabetes/pregnancy) while accepting arbitrary programType/sessionId values.

Lines 377–433 match pharmacies/nurses by loading approved accounts and provider profiles; raw provider records are returned and geographic fields use `geo` while the profile schema declares `location`, with per-provider inventory queries in a loop. Lines 435–481 run every-minute SLA audit: select CREATED orders, create breach log, mutate state/history and best-effort insert an admin notification per item; no claim/lease/idempotency/unique breach guard or atomic transition is present, so repeated workers can duplicate logs/notifications/race state.

Lines 483–508 rank verified providers but use constant rating, SLA and cancellation fallback values (4.5/0.95/0.05), optional is_sponsored and return complete provider records. Lines 510–558 fraud detection queries raw appointment/payment collections and creates alerts after non-atomic existence checks; broad catches silently suppress collection/errors. Lines 564–583 verify nurse attendance by loading a booking only by visitId, uses a Riyadh coordinate fallback when booking location is missing, accepts nurseId/coordinates without role/provider/visit ownership or freshness checks, logs coordinates and returns success based on distance. Lines 585–592 return checklist by visitId with no patient/nurse/provider ownership check. Lines 594–631 send inventory expiry notifications and return provider inventory by caller-supplied providerAccountId with no scope check in service.

Lines 633–657 verify lab result by sampleId, writes actualValue/status and alerts patient on range breach without authorization, state/version/CAS, provenance or validation of critical ranges. Lines 663–686 return order-derived city/category demand heatmaps and coordinates without aggregation privacy threshold. Lines 688–701 find a corporate account by companyName, ignore employeeId for lookup/authorization, increment usedCredit and save without atomic limit reservation/idempotency, allowing race overspend and cross-employee/company abuse. Lines 707–721 implement Haversine.

## Controller semantics

Class lines 7–9 has `JwtAuthGuard` globally, but lines 68–71 mark public `GET config/flags`. Lines 16–22 notification-read routes only log activity and do not mutate/verify a notification or check notification ownership. Lines 24–54 expose wallet balance/credit/debit; credit/debit pass raw `body.amount`, reference and description without DTO, role restriction, signed/finite/nonzero validation, idempotency or approval. Lines 56–65 referral claim validates only code presence. Lines 74–79 admin flag update has `@Roles(ADMIN)` but only checks flagName; service upserts arbitrary flags.

Lines 85–110 patient timeline/passport/program routes use current user for patientId but do not constrain body enums beyond presence; complete-session accepts arbitrary program/session strings. Lines 116–135 provider matching/ranking/fraud use raw body/query lat/lng/type and only fraud has admin role; matching/ranking returns provider objects and ranking is Redis-cached without explicit user/location privacy policy. Lines 142–171 nursing attendance/checklist, pharmacy broadcast/expiry and lab barcode/result routes have no role decorators and sparse validation; attendance/checklist use caller/query IDs without ownership checks; broadcast/barcode return success after merely logging input and do not persist/verify the operation; lab verify accepts raw values.

Lines 178–192 protect heatmaps with admin role but ad bid has no role/DTO/idempotency and returns hard-coded success after logging body; corporate enroll has no role/body validation and passes companyName/employeeId/requestedAmount to a service that ignores employeeId.

## Module/repository wiring

Module lines 45–74 registers extension schemas plus Appointment/Prescription/LabResult/VitalReading/Order/ProviderProfile/User under Mongoose and aliases 18 thin repositories as DI tokens. `appointment.repository.ts:6` imports `Appointment, AppointmentDocument` from `../../../schemas/extra.schemas`, while module `:19,61` registers `AppointmentSchema` from `../../../schemas/appointment.schema`; this creates a model-type/source inconsistency even though Mongoose token name may resolve at runtime. The repository has no custom ownership or transactional helpers.

## Findings candidates

The evidence supports: (1) unauthenticated public feature-flag/config exposure and arbitrary flag mutation surface; (2) wallet/referral/corporate non-atomic financial mutations and missing idempotency/validation; (3) patient timeline/passport PHI aggregation/token exposure without scoped access/TTL; (4) broad patient/provider record exposure and BOLA/IDOR on nursing checklist, attendance, inventory and corporate routes; (5) fake-success broadcast/barcode/ad operations; (6) fallback/hard-coded data in passport/program/ranking/attendance; (7) SLA/fraud duplicate/race and silent-error behavior; (8) lab result mutation without ownership/state/version controls; (9) heatmap privacy risk; (10) appointment repository wrong-schema import inconsistency.

No product code was changed and no tests/builds were run during this semantic read.
