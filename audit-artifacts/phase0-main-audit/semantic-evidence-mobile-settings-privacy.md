# Semantic evidence — Mobile Settings Privacy

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/privacy.tsx:30–42` initializes five privacy flags locally (`shareData:false`, `analytics:true`, `location:true`, `marketing:false`, `thirdParty:false`) and then reads `/users/me/privacy-settings`. Fetch failure is swallowed, so defaults can be displayed as if they were the patient’s saved consent state. There is no loading/sync/error/stale state, consent version, purpose detail, audit timestamp, or handling for server fields outside this fixed object.

Each toggle optimistically updates local state and fires `PATCH /users/me/privacy-settings` with one key (`:44–53`). The mutation has no visible Idempotency-Key, rollback on failure, in-flight lock, conflict/version handling, retry, ownership/authorization proof or confirmation for sensitive sharing changes. A failed request leaves the UI falsely showing the new preference. The five labels/subtexts are hard-coded Arabic, and the UI does not explain legal basis, retention, processor/partner scope or granular health-data purposes (`:55–81,123–149`).

The page claims ISO 27001 protection and no sale of data (`:102–116`) without source/version/evidence. The deletion CTA creates `POST /support/requests` with a fixed data-deletion message (`:151–183`), but lacks Idempotency-Key, request ID/status, identity verification, re-authentication, scope selection, legal retention exceptions, confirmation receipt, progress, cancellation or actual deletion verification. It promises a 72-hour response without contract proof. No Phase 0 remediation was made.
