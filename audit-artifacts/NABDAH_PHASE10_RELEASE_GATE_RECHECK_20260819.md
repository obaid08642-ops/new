# Phase 10 — release-gate recheck

## Recheck result

The unified source gate was replayed after the verified Admin dependency remediation. All four application surfaces completed their available tests/build exports. The Admin archive digest below supersedes the earlier Phase 9 candidate digest.

| Surface | Current gate | Result |
|---|---|---|
| Backend | Clean installation, full regression and Nest build | **PASS** — 64 suites, 364 tests. |
| Patient | Jest, TypeScript and production Expo web export | **PASS**. |
| Provider | Contracts, TypeScript and production Expo web export | **PASS** — 17/17 contracts. |
| Admin | Governance contracts and Next 16.3.1 production build | **PASS** — 7/7 contracts; 34 static routes. |

## Archive reconciliation

| Archive | SHA-256 | State |
|---|---|---|
| Patient | `89b11155f1e2161fa6644a868a59dda33b76c611f3a84787bb2a888f19df6040` | Validated in Phase 9; unchanged. |
| Provider | `66657e8aeac20a142ebc226e3b978b62a98dc063ec620e0cbfa430a8eca94aee` | Validated in Phase 9; unchanged. |
| Backend | `88d268f8d234db7f4d034e1cfbce85141f352432c5f1121172a7c8967414cc6f` | Validated in Phase 9; unchanged. |
| Admin | `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2` | Supersedes prior Admin candidate after Next/transitive dependency remediation. |

## Risk decision

Admin `npm audit` is now clean. Backend, Patient and Provider remain deployment-blocked by the controlled-migration dependency risks recorded in `NABDAH_PHASE10_DEPENDENCY_RISK_TRIAGE_20260819.md`. The owner approval, Moyasar, live sandbox E2E, device, translation/design and deployment gates also remain open. This is not a production deployment authorization.
