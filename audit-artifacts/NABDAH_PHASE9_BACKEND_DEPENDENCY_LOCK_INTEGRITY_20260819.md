# Phase 9 — Backend dependency-lock integrity

## Finding and correction

The first reproducibility gate, `npm ci --dry-run --ignore-scripts`, failed in Backend because `@nestjs/terminus` 11.1.1 declares an optional peer requirement for `@nestjs/mongoose` 11 while the application intentionally uses Nest/Mongoose 10. The current source test environment could still build from its pre-existing dependencies, but a clean CI install was not reliable.

The Backend archive source now aligns `@nestjs/terminus` to the 10.3 line, whose published peer definition supports Nest/Mongoose 10. The package lock was regenerated without lifecycle scripts, followed by a clean `npm ci --ignore-scripts` and a repeatable dry-run installation check.

## Verification

| Gate | Result |
|---|---|
| Clean dependency install | **PASS** — `npm ci --ignore-scripts`. |
| Reproducibility probe | **PASS** — `npm ci --dry-run --ignore-scripts`. |
| Backend regression suite | **PASS** — 64 suites, 364 tests. |
| Backend production build | **PASS** — `nest build`. |
| Backend archive integrity | **PASS** — `unzip -tq`; SHA-256 `88d268f8d234db7f4d034e1cfbce85141f352432c5f1121172a7c8967414cc6f`. |
| Branch upload | **PASS** — archive commit `79ad622` (`fix: align backend Terminus dependency lock`) is pushed to `manus/on-live-reconciliation`. |

## Limits

This corrects the deterministic dependency-install blocker discovered by Phase 9. It does not resolve the separately reported dependency audit advisories, and it does not authorize deployment or alter the deferred live/financial/device acceptance gates.
