# Phase 0B semantic evidence — project reference

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full by ranges:** `NABDAH_PROJECT_REFERENCE.md:1–1801`

The document identifies itself as an engineering/operational reference, not a replacement for source code, official API contracts or security/privacy/legal review (`11–18`). It describes four delivery components—Backend/Database, Patient, Provider and Admin—along with the expected client→auth/session→controller/gateway→guard→service/persistence/external provider→normalized response/event path (`19–49`). This is governance context, not an executable contract.

The reference explicitly requires ownership, role/provider-type, resource state and idempotency controls and warns that a screen, route or schema does not prove a complete business workflow (`51–71,102–124,271–283`). It records sensitive contracts such as consent, QR verification, emergency location and error-code registry as draft/fail-closed/unactivated (`89–100`). It records payment, realtime, push, storage, AI, home-care, diagnostic, pharmacy and family risks and repeatedly distinguishes source/build verification from live E2E acceptance (`73–100,184–205,218–233`).

The embedded appendices are generated inventories of backend modules/routes, Patient screens/routes, Provider files/screens and Admin pages/configuration (`235–269,285–1800`). The reference warns that presence in an inventory is not endpoint acceptance or workflow completion; therefore these paths are navigation/source indexes and must be reconciled to the current baseline source, not treated as current runtime truth. The inventories also embed historical absolute paths such as `/home/ubuntu/nabdah-live-extracted` and `/home/ubuntu/admin-build-work`, which are not portable repository paths and need normalization before automated use.

The current-state section records unresolved production decisions including deployment/retest of ownership fixes, payment 500 investigation and sandbox payment/webhook/idempotency, WebSocket validation, OTP/2FA/rate limits, sensitive-contract review, real-device/accessibility/localization/push/calls/GPS testing, credential rotation, scaling/observability/backup/rollback (`218–233`). Historical commit references point to an older reconciliation branch/head (`7–9,207–216`), so they are provenance references rather than proof for the present `main @22526bed` audit.

The scenario matrix defines acceptance for patient/provider/admin auth, booking, chat, calls, orders, payments, labs/radiology, emergency, QR and push (`184–200`). The document states that local test/build numbers do not imply device, external integration or operational acceptance (`201–205`). It also includes project references and file listings that may be stale relative to the current baseline; each must be revalidated against the manifest before being used as an implementation authority.

No product code was changed, no referenced application was executed, no build/test/deployment was run, and no external secret or production data was accessed during this semantic read.
