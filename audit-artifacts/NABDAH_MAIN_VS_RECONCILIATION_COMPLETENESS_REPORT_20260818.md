# Main versus manus/on-live-reconciliation — completeness decision

## Executive finding

Neither reference is a complete standalone release source. `main` is the owner-requested clean baseline, but it is older than the reconciliation branch by 22 commits at this comparison point and lacks later functional archive refreshes and QA corrections. `manus/on-live-reconciliation` is functionally newer and contains later verified rebuilds, Patient route cleanup, provider/admin refreshes, source-fix evidence, and the complete QA plan, but its archives intentionally omit some environment/sensitive files present in `main`, and Backend has one source file present only in `main`.

Therefore the correct decision is **not** to select a branch by date or archive size alone. Before Phase 2, the approved source set must be reconciled as a reviewed union: use the later functional source fixes from the reconciliation artifacts, restore or separately provision valid `main`-only runtime assets and source files after review, and never copy secrets into Git.

## Ref comparison

| Ref | Commit at comparison | Relationship | Meaning |
|---|---:|---|---|
| `origin/main` | `53ba7da` | ancestor of QA | clean owner baseline; older functional state |
| `origin/manus/on-live-reconciliation` | `9bff7c6` locally after Phase 1 evidence | 22 commits ahead of main | later QA history, regenerated artifacts, Patient route cleanup, and plan/evidence files |

The QA-ahead history contains five functional/artifact commits after the last shared state: Backend verified rebuild, Provider verified rebuild, Admin verified rebuild, Patient verified rebuild, and removal of 13 `*.backup.tsx` files that Expo Router treated as live routes. The remaining QA-ahead commits are audit evidence and plan history.

## Archive comparison

| Archive | Main members | QA members | Main-only | QA-only | Shared files changed |
|---|---:|---:|---:|---:|---:|
| Backend | 702 | 709 | 1 | 8 | 22 |
| Patient | 629 | 636 | 7 | 14 | 52 |
| Provider | 80 | 83 | 0 | 3 | 10 |
| Admin | 66 | 66 | 0 | 0 | 2 |

## Interpretation by application

### Backend and Database

QA contains later changes in `auth.guard.ts`, `main.ts`, AI, family, provider, notification, order, and other workflow/security files, plus contract tests and configured IO/health/provider-availability tests. The one Backend file unique to `main` is `src/modules/mental-health/repositories/selfassessment.repository.ts`; this must not be silently dropped. QA also has eight QA-only files, mostly tests/configuration. The Backend source set is therefore incomplete if either archive is used without a reviewed merge.

### Patient

QA contains later changes across diagnostics booking/checkout/tracking, AI, health records, maternity, mental health, nutrition, reports, family permissions, and additional localization/medication-notification modules. It also removed the 13 backup route files in the later Patient commit, which is an operational correctness improvement because Expo Router can register backup route files.

`main` contains seven files absent from QA: `.env*`, Firebase configuration files, and `expo-env.d.ts`. These must be treated as environment/release assets, not copied blindly into source; secrets and production credentials must be provisioned through the approved secret/release process. The Patient set must retain the valid non-secret type/configuration requirements while excluding secret material.

### Provider

QA adds three platform-map implementations and changes Provider package metadata, contract tests, location picker/context, Doctor, Pharmacy, and Radiology screens. These are functional/provider-operational updates, so QA is newer for Provider behavior. No main-only Provider source file was found in the archive comparison.

### Admin

Both archives contain the same member count. QA changes the Admin dashboard and API utility. These changes require build/typecheck and contract verification, but there is no archive member missing on either side.

## Data and placeholder decision

The archive comparison alone cannot prove that all business data is real. It does prove that the branch contents differ. Every changed/unique file must be scanned during the application inventory for mock/demo/sample data, hardcoded business defaults, fabricated reviews/ratings, local-only success, stale routes, and missing API transitions. Environment files and Firebase files are not evidence of real business data and must not be used to seed or fake data.

## Approved action before Phase 2

Phase 2 is **BLOCKED pending source-set reconciliation**. Before Patient inventory begins, the owner-approved source baseline must be one of:

1. a reviewed merge of the QA functional fixes into `main`, preserving the valid `main`-only Backend mental-health repository and release configuration contracts; or
2. a documented decision to use QA as the functional source while provisioning `main`-only runtime assets through secrets/release configuration and restoring the mental-health source file through a reviewed commit.

No blind overwrite, force-push, secret commit, or direct production mutation is permitted. Once the source-set decision is approved, rerun archive hashes, file counts, build manifests, and smoke builds, then close Phase 1 and begin Phase 2.
