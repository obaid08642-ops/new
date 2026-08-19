# Phase 9 — build-gate baseline and release-risk inventory

## Baseline

Phase 9 begins from `manus/on-live-reconciliation` at evidence head `4577aab` after the documented Phase 8 source-remediation closure. The four source archives are structurally valid and retain the following reproducible integrity identifiers.

| Archive | SHA-256 | Baseline role |
|---|---|---|
| `nabd_plus_patient_app.zip` | `89b11155f1e2161fa6644a868a59dda33b76c611f3a84787bb2a888f19df6040` | Patient source candidate |
| `NabdProvider-provider.zip` | `0d268f9bba887b8fb3151354609f675c59d257f0cfa7f60bf18c5d54dcbbc30e` | Provider source candidate |
| `nabdah-backend.zip` | `5a436d0147fa068b4d419b7861c46b5053cc957dc8853a772e4ddfc7ea45b392` | Backend source candidate |
| `web_admin_dashboard.zip` | `5f59cf5ca7515228bf035c2fbf6aa1caa114dfb316da12b47ff2a18fa7abfda0` | Admin source candidate |

## Available repeatable gates

| Surface | Available source gate |
|---|---|
| Backend | `npm test -- --runInBand`; `npm run build` |
| Patient | Jest; `tsc --noEmit`; Expo production web export |
| Provider | Jest; `tsc --noEmit`; Expo production web export |
| Admin | Node governance contracts; clean-environment `next build` |

## Risk inventory carried forward

The following are intentionally **not** converted into source-gate PASS statements: owner approval for SOS/QR/consent/location; Moyasar live activation and financial acceptance; sandbox end-to-end workflow proof; Android/iOS signed builds and real-device evidence; human review of six languages and RTL layouts; comprehensive screen-by-screen premium design acceptance; and reviewer-authorized deployment, rollback and post-deployment smoke evidence. No deployment is requested or performed in this baseline.
