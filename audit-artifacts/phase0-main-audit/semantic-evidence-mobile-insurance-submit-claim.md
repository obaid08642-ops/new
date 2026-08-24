# Semantic evidence — Mobile Insurance Submit Claim

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/insurance/submit-claim.tsx:24–41` posts `/insurance/claims/submit` with only `claim_type`, a client-supplied `status: "pending"`, and a client-generated `submitted_at`. No policy ID, provider/member context, source booking/order/service ID, amount, invoice/document/evidence reference, diagnosis/service metadata, or ownership/eligibility proof is passed.

The mutation has no visible Idempotency-Key, request correlation, duplicate-claim/precondition control, re-auth/step-up, upload binding, or replay handling (`:24–34`). Four cards submit immediately on press (`:76–152`) without a details form, confirmation, evidence upload, validation, policy selection, cash/insurance distinction or consent. `submitting` is set globally but not used to disable the cards, so repeated taps may create duplicate requests (`:19–40`).

Any successful HTTP response produces a local alert claiming submission and a fixed 2–5 business-day review window (`:27–35`), without using a server claim ID, accepted/pending/rejected status, SLA source, next step, polling/detail route or notification contract. Failure is a generic alert with no retry-preserved request state (`:36–40`).

The screen therefore exposes a financial/insurance mutation that is structurally incomplete and can create untraceable claims. No Phase 0 remediation was made.
