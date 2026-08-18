# Nabdah branch/component map — 2026-08-18

All entries below are from `obaid08642-ops/new` only.

| Branch | Observed component shape | QA interpretation |
|---|---|---|
| `main` | Four compressed project archives | Historical delivery archive; not directly patchable without extraction and source-to-commit proof |
| `m0-fixes` through `m6-seo-enterprise` | Four compressed project archives plus changelogs | Milestone/archive branches; not direct source trees |
| `m7-quality` | Four compressed project archives, latest quality milestone | Historical packaged delivery; requires exact archive hashes before patching |
| `remediation/e2e-traceability-20260814` | Archives plus audit artifacts | Evidence/remediation archive; source still packaged |
| `fix/e2e-operational-contracts-20260814` | Direct `backend`, `patient-app`, `provider-app`, `admin-app` trees plus remediation manifest | Primary direct-source candidate for the four Nabdah applications |
| `manus/on-live-reconciliation` | QA worktree, audit artifacts, provider source, packaged backend/patient/admin archives | Reconciliation/evidence branch; not yet a complete direct-source tree for all four applications |

No repository other than `obaid08642-ops/new` is in scope. `Alhrajplus` and `Naps-admin` were explicitly excluded as unrelated projects.

## Required next decision

Compare the direct source tree of `fix/e2e-operational-contracts-20260814` against the packaged artifacts and the reconciliation branch. Record hashes for each of the four application roots, then use the direct Nabdah source branch as the only patch base. Any deployment commit must be a descendant of that source and be separately identified from the QA/evidence commits.
