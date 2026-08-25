# Phase 0B semantic evidence — Home-care compatibility, nursing ops and chat aliases

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/home-care-compat/home-care-compat.module.ts:2–322`

The compatibility controller is JWT guarded to bridge legacy nursing paths to `/home-care/*`, with catalog/services/providers, booking, nursing state transitions, care plans, availability, inventory, nursing reference data and chat aliases (`home-care-compat.module.ts:2–322`). Catalog/provider reads are broad and provider detail returns the whole profile document (`32–57`). Booking creation validates only service/scheduled time, reads service price, but stores caller address/payment method and a client-derived date without visible payment-policy, address, timezone, idempotency or slot-lock binding (`74–95`). `myBookings` selects patient or provider based on role but has no explicit owner/provider validation for unusual roles (`98–100`).

Access helper permits admins, owner patients, assigned providers and optionally any unassigned nursing provider for some transitions (`60–72`). Nursing queue intentionally exposes all unassigned requests to all eligible nurses; transitions use read-then-save, raw metadata/body fields, and state rules that are not atomic (`103–148`). Assignment accepts arbitrary provider ID with admin only, while check-in/report and GPS store checklist/vitals/clinical notes/medication/consumables and coordinates without visible schema, bounds, consent, geofence, idempotency or audit (`151–180`).

Care-plan reads/creates expose patient plans to admins, owner patients or assigned nursing/doctor users; creation checks assignment only in some role paths and stores raw bounded title/description/tasks with no visible idempotency/versioning (`182–206`). Provider availability writes booleans by current user ID but does not return matched-count truth (`209–212`). Inventory requests append raw items to a booking using `$push` without item validation, stock reservation, idempotency or quantity bounds (`215–224`).

Nursing checklists/supplies are hard-coded reference data (`228–272`). Chat aliases multiply route conventions, accept multiple body keys and delegate to ChatService; provider quick-send trusts supplied thread ID to downstream authorization and there is no visible idempotency at alias boundary (`274–308`). Module wiring registers chat and four models but no providers of its own (`310–322`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: client-price/payment and scheduling gaps, broad provider/profile exposure, unassigned-provider access, non-atomic nursing transitions, clinical PII and GPS risks, care-plan authorization gaps, raw inventory mutations and duplicated chat contracts.
