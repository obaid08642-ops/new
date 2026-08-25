# Phase 0B semantic evidence — Patient UX, refunds, rebook and admin overrides

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/patient-ux/patient-ux.module.ts:2–310`

`PatientUxService` supports reviews, refund requests, rebooking and admin overrides across pharmacy/lab/radiology/nursing/consultation models (`patient-ux.module.ts:17–34`). Review checks rating range, owner and domain-specific completion status, then upserts by booking kind/ID but accepts raw comment/aspects and has no visible unique/replay or provider aggregation contract (`36–67`). Refund request checks owner and payment status, returns an existing requested record if found, creates a new request with caller amount/reason and emits events; no visible atomic uniqueness/idempotency, refund cap, ledger/payment-provider action or PII minimization is present (`69–84`).

Admin refund list returns up to 500 raw records; decision updates request state and, when approved, best-effort updates booking payment fields separately. Amount may be overridden by admin without visible cap/payment-provider verification; audit events are emitted best-effort (`86–124`). Rebook deep-clones the prior document, deletes selected fields, writes a new document with raw requested scheduled date and generic created/pending states, with no slot/capacity/price/payment/prescription revalidation or idempotency (`126–141`).

Admin override service can force cancel, arbitrary transition state or payment status by loading any entity ID and saving raw state/status/payment fields; event/audit emission is best-effort. Controller is JWT+ADMIN metadata but mutations lack visible idempotency, transition legality, settlement/refund orchestration, amount bounds or approval separation (`167–291`). Module registers a distinct `PatientUxRefund` model against the shared refund collection to avoid schema-name collision, but the comment documents prior silent schema stripping risk (`293–310`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: review/replay gaps, caller/admin-controlled refund amounts, non-atomic refund state/payment updates, unsafe rebook cloning, arbitrary admin state/payment overrides, best-effort audit/event truthfulness and shared collection schema drift.
