# Phase 0B semantic evidence — provider.controllers.ts

**Archive member:** `src/modules/provider/provider.controllers.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–180, 182–360 and 361–535; full 535-line member covered.

## Auth/profile/operator/admin controllers — lines 2–143

Lines 2–22 import all Provider services, auth decorators, roles and request metadata helper. Lines 24–50 expose public provider register/login/refresh/send-OTP/email verification/forgot/reset endpoints, protected logout and authenticated `me`. Bodies are `any`; request IP/user-agent metadata is passed to services. The public auth surface is controller-routed but no DTO/rate-limit/idempotency decorators are visible here.

Lines 52–94 expose authenticated profile update/phones/KYC/bank/image/onboarding/delta routes and a public provider directory/bank list. Image upload passes authenticated ID and derives owner type from role; profile image status passes authenticated ID. Lines 96–106 expose operator list/invite/accept/update/disable/enable/revoke, with public invite acceptance. Lines 108–143 expose admin list/detail/approve/reject/reprocess/replace/retry/image logs/request-changes/suspend. The image admin controls at lines 122–139 have no `CurrentUser` parameter or visible `Roles` decorator, unlike the admin data/action routes.

## Operational request/clinical/insurance controllers — lines 145–379

Lines 156–180 expose request list/detail/accept/reject/start/complete/cancel/assign-staff and owned order projection. Lines 182–219 implement consultation end: load owned request, require in-progress, write SOAP/prescriptions/labs under provider ownership, call completion and emit `medical_orders.emitted`. No idempotency key or transaction is visible.

Lines 221–290 implement insurance copay decision: load owned request, derive patient, calculate price/patient/company share, require saved insurance policy, upsert `insuranceservicerequests` by booking ID/kind, append history or create initial history, emit insurance event and return request ID/state. The calculation trusts provider request `amount_total` and client approval status/copay/code/reason; no transaction, idempotency, verified insurer API or settlement ledger is visible.

Lines 292–340 issue a sick-leave medical report, accepting client patient ID/diagnosis/dates/name/recommendations, inserting directly into `medicalreports`, optionally updating appointment, emitting two events and returning a tracking URL. There is no visible request ownership check tying `id` to the authenticated doctor before issuance. Lines 342–378 issue a general medical report after owned request detail and patient mismatch check, but accept arbitrary attachments and insert directly with no storage/access policy, audit or transaction.

## Wallet/notifications/schedule/dashboard — lines 381–430

Lines 381–399 define a wallet withdrawal alias that explicitly throws retired-route error; comments describe a real flow but no implementation. Lines 401–407 expose provider notification list/read/read-all. Lines 409–413 expose schedule view. Lines 415–430 expose provider self/dashboard/recent/availability plus seed and seed-reset routes. Seed routes are protected only by `CurrentUser` in this controller; no admin/feature flag is visible here.

## Capability/zone/slot/score/matching controllers — lines 433–535

Lines 437–460 expose authenticated CRUD for pharmacy, lab, radiology, doctor-session and home-care capabilities. Lines 462–468 expose zone CRUD. Lines 470–476 expose schedule-slot CRUD. Lines 478–483 expose score read/recompute. Lines 485–515 define admin matching controller with class `@Roles(UserRole.ADMIN)`: preview by request, ad-hoc preview, dispatch, manual assignment, attempt listing, stale expiration. Lines 516–535 expose `seed-unassigned`, which creates a real DB request with fallback patient `{ name: 'Test Patient' }`, default amount zero and `seeded:true`; this is an explicit test/seeding path under an admin matching route.

## Confirmed findings

**Authorization:** many routes rely on `CurrentUser`, but controller-level role/permission decorators are sparse. Provider service-level assertions may cover some paths. Admin image controls lack visible authenticated user/role context. Sick-leave issuance does not first prove the supplied patient belongs to the appointment/request. `@Roles(UserRole.ADMIN)` protects matching class, but service methods still require caller/resource checks.

**Contract/integrity:** almost all mutations accept `any` bodies and lack visible Idempotency-Key/CAS/transaction decorators. Clinical completion, insurance copay upsert, medical-report inserts and appointment updates are sequential multi-write flows. Public auth routes have no controller-visible rate-limit contract.

**Truthfulness/security:** seed routes and fallback Test Patient/zero amount are explicitly non-production test paths but are reachable through backend routes. Insurance/medical data is derived from client/provider request input, and reports expose tracking URLs plus arbitrary attachments without visible signed/private controls. Wallet withdrawal alias is a dead/retired route despite legacy comments.

**Privacy:** `me`, detail, reports and image-log/admin routes may expose PII or storage references; DTO projections and redaction are not visible at controller boundary. Public directory/banks are intended public but require downstream filtering.

**Operational:** event emissions have no visible outbox/retry; routes have no pagination/size bounds in several surfaces. Seed and reset routes require an explicit production disable/feature gate to prevent non-real data.

**Test implications:** require controller integration tests for unauth/stranger/role/permission/tenant, method/path contracts, DTO validation, idempotency/replay, concurrent state changes, transaction rollback, event retry/outbox, report ownership/storage privacy, insurance settlement, admin image control protection, seed-route production gating, and zero/mock data detection. No tests executed during this semantic read.
