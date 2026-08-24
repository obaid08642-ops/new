# Semantic evidence — Mobile Insurance Refund Status

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/insurance/refund-status.tsx:32–37` calls `/refunds/my`, but any failure becomes `refunds=[]` and the UI renders the same no-requests empty state as a legitimate empty result (`:68–74`). There is no error/retry/offline/stale state, pagination, refresh, or explicit unauthenticated handling.

`STATE_MAP` recognizes only REQUESTED, APPROVED, EXECUTED, REJECTED and FAILED (`:18–24`); unknown states are rendered from raw `r.state` or `—` without a lifecycle contract. Mapping uses either `createdAt` and `refund_amount`/`amount_paid` (`:39–49`) without typed date/currency/status validation, settlement evidence, transaction/reference data, payment rail, webhook reconciliation, or timezone/source labeling.

Cards are non-interactive and expose no refund detail, evidence, withdrawal, dispute, retry, support correlation or secure document action (`:75–110`). The screen does not prove owner-scoped response behavior, booking/order linkage, policy/claim context, eligibility, partial/declined/reversed/expired states, or idempotent create/replay semantics. No Phase 0 remediation was made.
