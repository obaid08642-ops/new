# Phase 0B semantic evidence — Booking operations compatibility flow

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/booking-ops/booking-ops.module.ts:2–205`

`BookingOpsModule` is an additive adapter over pharmacy, lab, radiology, home-care and consultation models. It exposes derived invoice/payment routes, admin/provider payment marking, attachment upload/listing and a provider-ownership helper (`booking-ops.module.ts:2–10,38–80,180–205`). Type aliases map several route strings to domains, while role detection is based on raw `user.role`/provider type strings and ownership checks use a small set of provider fields (`50–69`).

Entity fetch applies patient ownership for patient role, provider field ORs for provider role and otherwise defaults to patient ownership; unmatched entities become 404. The provider ownership fields are heterogeneous and no facility/tenant/assignment or canonical ID resolver is visible (`67–80`). Invoice derivation trusts entity subtotal/total/price, applies hard-coded VAT and an 80% insurance discount whenever an insurance provider is present, and emits patient/provider IDs, raw items and payment data rather than delegating to a canonical invoice/tax/ledger source (`83–103`). Payment state is inferred from booking fields and defaults to cash/pending/insurance states without payment-provider verification (`106–120`).

Payment marking permits any detected admin/provider role, accepts arbitrary status/transaction ID and insurance status, updates the domain model directly with no transition policy, idempotency, actor assignment or ledger/event workflow (`123–150`). Attachments accept name/mime/base64/purpose with no visible MIME/content/size validation, object storage, malware scan, encryption, retention or idempotency; list hides base64 but get returns it and scopes only by booking resource ownership (`152–177`).

All routes are JWT guarded but use raw bodies and params rather than visible DTOs; payment mark and attachment creation are mutations without visible `Idempotency-Key` or durable event semantics (`180–189`). No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: heterogeneous ownership aliases, derived financial truth, client/provider payment mutation, insurance discount fabrication, raw attachment storage, sensitive invoice exposure and missing contract/idempotency/state controls.
