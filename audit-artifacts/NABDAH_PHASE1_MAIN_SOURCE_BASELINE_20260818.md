# Nabdah Phase 1 — Main source baseline and governance evidence

## Scope

Phase 1 was executed after the owner explicitly instructed: pull the latest version from `main`. The source baseline is therefore `origin/main` from `obaid08642-ops/new`, while the QA evidence and plan history remain recorded on `manus/on-live-reconciliation`.

## Source verification

| Check | Result |
|---|---|
| Repository | `https://github.com/obaid08642-ops/new.git` |
| Approved source ref | `main` |
| Main commit | `53ba7dac361854ef947ac7f15a09fec018a4fc62` |
| Main short commit | `53ba7da` |
| Main subject | `chore(cleanup): remove duplicate provider-app folder` |
| Main commit time | `2026-08-18T03:32:15+03:00` |
| Main worktree | `/home/ubuntu/nabdah-main-worktree` detached at `origin/main` |
| Main worktree status | clean |
| Main remote comparison | local main worktree equals `origin/main` |

The previous QA worktree was preserved separately at `/home/ubuntu/nabdah-authoritative-worktree` and was not overwritten. It remains on `manus/on-live-reconciliation` with an uncommitted todo update preserved for the QA record.

## Four application artifacts from main

The latest `main` contains all four application archives and they were extracted to `/home/ubuntu/nabdah-main-source`:

| Component | Archive | Extracted file count | Key manifest evidence |
|---|---|---:|---|
| Backend/Database | `nabdah-backend.zip` | 702 | Backend `package.json`, E2E `package.json` |
| Patient | `nabd_plus_patient_app.zip` | 629 | `nabd_plus/app.json`, `package.json`, `eas.json` |
| Provider | `NabdProvider-provider.zip` | 80 | `NabdProvider/app.json`, `package.json` |
| Admin | `Napd-admin-dashboard.zip` | 66 | `web-admin/package.json` |

The Backend archive is the location to inspect for server, schema, migrations, and database contracts. Production database data is not contained in Git and requires separate approved backup/database verification.

## Main versus reconciliation branch

`origin/main` is an ancestor of `origin/manus/on-live-reconciliation`, but the reconciliation branch is 21 commits ahead at the time of this check. The current refs were:

| Ref | Commit | Meaning |
|---|---:|---|
| `main` | `53ba7da` | Owner-requested source baseline for the current phase |
| `manus/on-live-reconciliation` | `2651f6e` | QA/evidence branch with later audit artifacts and later archive revisions |

The four archive SHA-256 values from `main` were recorded during extraction. They differ from the archive values on the reconciliation branch, so the two refs must not be silently mixed. For Phase 1 and subsequent source inspection, use the extracted `main` set unless the owner explicitly changes the source baseline again. QA documents may remain on the reconciliation branch as the evidence ledger.

## Safety and evidence policy

No production mutation was performed in Phase 1. No non-sandbox account was used. No source code was modified in the main baseline. The phase only fetched, compared, extracted, and documented artifacts. Payment, legal, device, and production E2E actions remain outside Phase 1.

## Phase 1 checklist

| Phase 1 requirement | Status | Evidence |
|---|---|---|
| Verify repository identity | PASS | This report and Git remote check |
| Pull latest owner-requested `main` | PASS | Main worktree at `53ba7da`, equal to `origin/main` |
| Preserve previous QA worktree | PASS | QA worktree remained separate |
| Identify Backend, Patient, Provider, Admin | PASS | Four archives and extracted manifests |
| Establish evidence and safety rules | PASS | This report, existing plan, todo |
| Confirm blockers and boundaries | PASS | No source mutation; DB data not in Git; later QA ref differs |
| Double-check against Phase 1 scope | PASS | All Phase 1 items reviewed line by line |

## Gate decision

**Phase 1 is complete for the requested `main` baseline.** Phase 2 must not begin automatically. It requires the owner’s explicit instruction to proceed. The next phase will inventory Patient screens, buttons, states, and contracts from the extracted `main` Patient archive only.
