# Semantic evidence — Mobile Privacy Settings

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/privacy.tsx:1–24` is marked `@ts-nocheck` and uses `apiFetch`. It loads `/users/me/privacy-settings` and silently ignores read failure (`:38–42`). Every privacy switch updates local state optimistically and sends a PATCH for one field, swallowing the failure with no rollback or user-visible unavailable state (`:44–53`).

The screen presents toggles for location, analytics, health-data sharing, marketing and third-party sharing (`:55–81`). It also displays a factual-looking ISO 27001/encryption/no-sale claim in static UI copy (`:102–115`), which needs legal/security evidence and localization review.

The personal-data deletion action sends a POST to `/support/requests` with a `data_deletion` type and static Arabic subject/message, then reports that the request was accepted and will be handled within 72 hours (`:151–183`). The source shows no idempotency key, request status retrieval, upload/evidence flow, identity re-authentication or cancellation/duplicate-request handling. The success message is therefore not proof that deletion was scheduled or completed.

## Required verification

1. Reconcile privacy PATCH fields and validation with backend DTO/service policy.
2. Add or verify idempotency, rollback/error state and audit/consent records.
3. Verify data-deletion request contract, identity assurance, SLA semantics and lifecycle status.
4. Prove the ISO 27001/encryption/no-sale statements or remove/replace them with approved legal copy.
5. Compare Web privacy scope and all six locales/accessibility behavior.

No Phase 0 remediation was made.
