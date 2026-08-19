# Phase 9 — release-candidate manifest and rollback plan

## Status

> **This is a source release candidate, not a deployment authorization.** No production deployment, database migration, payment action, emergency activation or live mutation was requested or performed.

The candidate is assembled on `manus/on-live-reconciliation` at evidence head `990354c`. It includes the Phase 8 containment work and Phase 9 dependency-lock repairs.

## Candidate artifacts

| Surface | Archive | SHA-256 | Reproducibility/build evidence |
|---|---|---|---|
| Patient app | `nabd_plus_patient_app.zip` | `89b11155f1e2161fa6644a868a59dda33b76c611f3a84787bb2a888f19df6040` | Clean install; Jest; TypeScript; production Expo web export. |
| Provider app | `NabdProvider-provider.zip` | `66657e8aeac20a142ebc226e3b978b62a98dc063ec620e0cbfa430a8eca94aee` | Clean install; 17/17 contracts; TypeScript; production Expo web export. |
| Backend | `nabdah-backend.zip` | `88d268f8d234db7f4d034e1cfbce85141f352432c5f1121172a7c8967414cc6f` | Clean install; 64 suites/364 tests; Nest build. |
| Admin dashboard | `web_admin_dashboard.zip` | `5f59cf5ca7515228bf035c2fbf6aa1caa114dfb316da12b47ff2a18fa7abfda0` | Clean install; 7/7 governance contracts; clean Next build/34 static routes. |

## Deployment decision

| Decision item | Current state |
|---|---|
| Source build and regression gates | **PASS** for the evidence listed above. |
| Package reproducibility | **PASS** after Backend Terminus and Provider Jest-Expo/React Test Renderer alignment. |
| Dependency advisory closure | **BLOCKED** — audit advisories remain and require dedicated remediation/review; no `npm audit fix --force` was used. |
| Contract approval | **BLOCKED** — SOS, QR, consent and location remain fail-closed pending owner legal/product approval. |
| Payments | **BLOCKED** — Moyasar live activation and controlled payment acceptance remain deferred. |
| Live workflow evidence | **BLOCKED** — reviewer-authorized sandbox E2E matrix is not complete. |
| Devices/stores | **BLOCKED** — Android/iOS signed build, device-farm and physical-device evidence remain pending. |
| Translation/design acceptance | **BLOCKED** — human six-language, RTL, accessibility and screen-by-screen premium UX review remain pending. |
| Deployment request | **NOT SENT** — blockers prevent treating this candidate as deployable. |

## Reviewer-only deployment prerequisites

If, after later phases, the owner/reviewer authorizes deployment, the reviewer must first verify the exact branch head and all four SHA-256 values above, create a timestamped immutable database backup, retain the currently deployed image/artifact and configuration reference, verify disk capacity, and confirm production secrets/migrations. Only then should the reviewer deploy through the approved operational path.

## Rollback plan

| Trigger | Immediate safe action | Evidence required before resuming |
|---|---|---|
| Health/startup failure | Stop rollout; restore the previously retained application image/artifact; do not run data repair commands. | Prior image identity, startup logs and health check. |
| Authorization/privacy regression | Disable affected traffic/route using the approved operational control; restore prior application image; preserve logs. | Reproduction with a sandbox identity and audit trail. |
| Data migration failure | Halt rollout and do not attempt ad-hoc destructive corrections. Restore only from the timestamped, verified backup under owner approval. | Backup integrity, migration record and owner authorization. |
| Payment/emergency anomaly | Keep payment or emergency operation disabled/fail-closed; preserve evidence; do not retry financial or dispatch mutation. | Owner/reviewer incident decision and controlled sandbox reproduction. |

## Post-deployment acceptance, if later authorized

The reviewer must run a minimal sandbox-only smoke set covering authenticated login, negative authorization, owned-record access, patient/provider/admin routing, notification persistence and fail-closed checks for payment/emergency/QR/consent. A deployment may not be called successful from process health alone.
