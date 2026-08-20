# Nabdah source authority correction — verified 2026-08-18

The earlier statement that the implementation source should remain on `fix/e2e-operational-contracts-20260814` at `21006cc` was **incorrect after the owner’s correction**.

GitHub verification for `obaid08642-ops/new` shows:

| Ref | Tip | Finding |
|---|---|---|
| `fix/e2e-operational-contracts-20260814` | `21006cc` | Older source branch; 28 commits ahead of reconciliation are not present here. |
| `manus/on-live-reconciliation` | `d59a8bf` | Approved current execution/reference branch. It is 311 commits ahead of the old fix branch and contains the merged reconciliation history. |
| `main` | `53ba7da` | Parent/cleaned structure referenced by the reconciliation commit; not selected as the working branch. |

The requested commit `d59a8bfa` exists and is the current remote tip of `manus/on-live-reconciliation`. The implementation worktree has been switched to that branch and is clean at that commit. The branch’s cleaned single-artifact structure stores the backend and patient source as `nabdah-backend.zip` and `nabd_plus_patient_app.zip` (with provider/admin archives also present), rather than unpacked `backend/`, `patient-app/`, `provider-app/`, and `admin-app/` directories at the repository root.

From this point forward, no work will be based on `fix/e2e-operational-contracts-20260814`. Any extraction for build or inspection will come from the artifacts on `manus/on-live-reconciliation`, and all resulting commits will be pushed only to that branch.
