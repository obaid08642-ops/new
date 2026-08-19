# Backend dependency migration — controlled remediation

## Decision and scope

The Backend dependency remediation was performed only in an isolated copy of the current governed Backend archive. It began from the previously fixed prescription-detail authorization source, made no production request or deployment, and used clean installs plus full tests/builds before the archive was replaced.

## Changes

| Area | Before | After | Contract preserved |
|---|---|---|---|
| Spreadsheet parser/writer | SheetJS `xlsx` 0.18.5 | `exceljs` 4.4.0 | Prescription spreadsheet parsing and two-sheet provider settlement export remain buffer-based. |
| Nest framework line | Nest 10.4.x mixed ecosystem | Compatible Nest 11 ecosystem, including core/common/platform/websocket/testing/CLI, Mongoose 11, Swagger 11, Terminus 11 and supporting direct modules. | Existing module contracts and tests remain green. |
| Google Vision | 5.3.7 | 6.0.0 | `ImageAnnotatorClient` construction and document-text extraction contract compile and retain their existing fail-closed error behavior. |
| JWT config typing | Nest 10-compatible unconstrained string | `StringValue` type on the unchanged `JWT_EXPIRES_IN` environment value. | Default duration remains `1h`; no runtime session policy was changed. |
| Lockfile | High-risk transitive resolution | Bounded `glob` lockfile update within existing semver ranges. | No force update or source API replacement. |

The SheetJS replacement is not a dead-dependency removal. The former package served both the prescription spreadsheet parser and a legally scoped settlement workbook exporter. Two focused tests now prove bilingual spreadsheet parsing, invalid-file containment, settlement/totals worksheet names, key header retention and generated buffer readability.

## Verification

| Gate | Result |
|---|---|
| Focused Excel migration tests | **PASS — 3/3** |
| Complete Backend test suite | **PASS — 67 suites / 373 tests** |
| Nest build | **PASS** |
| Clean dependency installation | **PASS** via `npm ci` after lockfile migration |
| `npm audit --json` before work | 58 total: 3 low, 46 moderate, 9 high, 0 critical |
| `npm audit --json` after work | **28 total: 0 low, 28 moderate, 0 high, 0 critical** |
| Backend ZIP integrity | **PASS**; excludes `node_modules`, `dist` and `coverage` |

## Resulting archive

The authoritative `nabdah-backend.zip` was rebuilt and mirrored to the remediation archive path. Its SHA-256 is:

```text
82b8d667a147d8fe1b771e2c837940738d5e92e7906daf23ecad25cb1d96837e
```

## Remaining boundary

This migration removes the high/critical findings reported by the current Backend audit, but 28 moderate findings still require ongoing triage. It does **not** authorize a production deployment or close the live BOLA proof for the prescription-detail authorization patch. It also does not alter the independent Patient and Provider Expo migration blockers, payment activation, legal/product approval, real-device, human quality or reviewer-controlled rollout gates.

## References

[1]: NABDAH_PHASE10_FINAL_DOUBLE_CHECK_20260819.md "Phase 10 final double-check"
[2]: NABDAH_READINESS_RESUMPTION_BLOCKER_RECONCILIATION_20260819.md "Readiness resumption blocker reconciliation"
[3]: NABDAH_PHASE11_PRESCRIPTIONS_AUTHORIZATION_REMEDIATION_20260819.md "Phase 11 prescription detail authorization remediation"
