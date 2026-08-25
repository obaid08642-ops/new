# Phase 0D cross-surface consolidation

> This report is static semantic evidence from the four baseline archives. It does not claim runtime, visual, payment, sandbox, device, human, deployment or production verification.

## Baseline archives

| Surface | Archive | SHA-256 | Total members | YES | N/A | NO | Manifest | Traceability |
|---|---|---|---:|---:|---:|---:|---|---|
| patient-mobile | `nabd_plus_patient_app.zip` | `70d01d4857e5326e17f3f3c14f35b20b4bbdbf775919d12bc7e280c24a84964b` | 665 | 606 | 59 | 0 | `audit-artifacts/phase0d/phase0d-patient-mobile/NABD_Phase0D_patient_mobile_Semantic_Read_Manifest.tsv` | `audit-artifacts/phase0d/phase0d-patient-mobile/Screen_Action_Journey_Traceability.tsv` |
| patient-web | `nabd-patient-web.zip` | `807237bb57c09964e13698c650b4258547ab280df48f2913d0179a16e6977ad5` | 1126 | 1022 | 104 | 0 | `audit-artifacts/phase0d/phase0d-patient-web/NABD_Phase0D_patient_web_Semantic_Read_Manifest.tsv` | `audit-artifacts/phase0d/phase0d-patient-web/Screen_Action_Journey_Traceability.tsv` |
| provider | `NabdProvider-provider.zip` | `4655c5c018e403c3ab3eb8c13645d876cc7f69b73f5ba6dd9050186917c92d4c` | 83 | 78 | 5 | 0 | `audit-artifacts/phase0d/phase0d-provider/NABD_Phase0D_provider_Semantic_Read_Manifest.tsv` | `audit-artifacts/phase0d/phase0d-provider/Screen_Action_Journey_Traceability.tsv` |
| admin | `web_admin_dashboard.zip` | `b32648f90eadcf7520644f77398bd99e9c2660ddde2e27bab160b5faaac65b82` | 66 | 59 | 7 | 0 | `audit-artifacts/phase0d/phase0d-admin/NABD_Phase0D_admin_Semantic_Read_Manifest.tsv` | `audit-artifacts/phase0d/phase0d-admin/Screen_Action_Journey_Traceability.tsv` |

## Manifest gates

| Gate | Result |
|---|---|
| Every archive member has one manifest row | PASS |
| Source/config/test members unread | 0 |
| Missing archive members | 0 |
| Duplicate manifest members | 0 |
| Missing evidence paths | 0 |
| Invalid line ranges | 0 |
| Product source changes | 0 |
| Build/test/remediation/migration/deployment | 0 |

## Required journey matrix

The detailed machine-readable matrix is `PHASE0D_Required_Journey_Matrix.tsv`. Every journey is deliberately marked `UNVERIFIED_BASELINE_ONLY`; static keyword presence is not treated as proof of a complete patient journey.

| Journey | Mobile | Web | Provider | Admin | Runtime status |
|---|---|---|---|---|---|
| Pharmacy | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |
| Consultation | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |
| Labs | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |
| Radiology | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |
| Nursing/Home-care | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |
| Identity/OTP/Roles | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |
| Family/Health | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |
| Prescription/Chat/Support | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |
| Wallet/Insurance/Payment | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |
| Settings/Accessibility/Location | PRESENT | PRESENT | PRESENT | PRESENT | UNVERIFIED_BASELINE_ONLY |

## Admin source determination

`web_admin_dashboard.zip` is present in the baseline archive directory and contains 66 members, including `src/pages/admin/*.tsx`, shared components, API utility, config, and public assets. Admin source is therefore present; `ADMIN_SOURCE_MISSING_EVIDENCE.md` is not applicable.

## Findings boundary

Phase 0D findings are per-surface static findings with an exact baseline archive member and line number. They are not the earlier backend root backlog and are not merged into it until reviewer acceptance. Static signals such as a client API call or CTA require contract and runtime reconciliation; they do not establish that the flow is complete or secure.

## Deliverables

- Four independent semantic manifests and evidence directories.
- Four `Screen_Action_Journey_Traceability.tsv` files.
- Four per-surface findings files plus `PHASE0D_Cross_Surface_Findings.tsv`.
- `PHASE0D_Required_Journey_Matrix.tsv`.
- `PHASE0D_MANIFEST_VALIDATION.json`.
