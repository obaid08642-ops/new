# Dependencies and supply chain (16.7)

| plan line | what enforces it | where |
|---|---|---|
| Dependabot weekly for every app | npm: backend, admin, patient-web (pnpm), patient-app, provider-app, packages/ui, ui-native, shared-contracts; github-actions; docker (backend, deploy/docker) | `.github/dependabot.yml` |
| 0 high/critical runtime advisories | `node tools/audit/audit_gate.mjs <app>` per app (matrix job `Dependency audit`). Fails on a NEW advisory and on a baseline entry that is no longer vulnerable | `.github/workflows/security.yml`, `tools/audit/audit-baseline.json` |
| Lockfiles enforced | `tools/audit/lockfile_check.py`: every app has a tracked lockfile in step with package.json; no `npm install`, `npm ci \|\| npm install` or unfrozen `pnpm install` in a workflow or Dockerfile | `security.yml` job `Lockfiles and pinned Actions` |
| Actions pinned by commit SHA | `tools/audit/pin_actions.py --check` (every `uses:` is a 40-hex SHA with a `# vX` comment); `--pin` re-pins from the tags | same job |
| SBOM (CycloneDX) per release | Trivy writes `sbom-<app>.cdx.json` per app; attached to every published release; validated on lockfile PRs | `.github/workflows/sbom.yml`, `tools/audit/check_sbom.py` |
| Docker images scanned with Trivy | the backend, admin and patient-web images are built and scanned (HIGH/CRITICAL with a fix fail) on Dockerfile or lockfile changes and nightly | `.github/workflows/image-scan.yml`, `deploy/.trivyignore-image` |
| CodeQL | exists | `.github/workflows/codeql.yml` |

## Fixed in this item
- patient-web: Next 16.3.5 -> 16.3.8 (critical + high advisories incl. ISR cache poisoning), axios -> 1.20, overrides for brace-expansion, source-map-js, proxy-addr, sharp.
- admin: Next 16.3.6 -> 16.3.8, sharp 0.35.5, source-map-js 1.2.2 (lockfile).
- The admin Dockerfile no longer falls back to `npm install` when `npm ci` fails; `Dockerfile.perf` and four lines of `patient-production-ci.yml` use `npm ci`.

## Still open (baseline, owner / mobile team)
- backend: fastify and nodemailer (need a MAJOR upgrade).
- patient-app (20 packages) and provider-app (30): Expo SDK 57 / React Native / Metro / Firebase transitive packages; `npm audit fix` cannot clear them without an Expo SDK major upgrade. `axios` and `node-forge` in these lists are runtime packages and come first when the SDK is upgraded.
