# Phase 0B semantic evidence — Deployment script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `scripts/deploy.sh:1–36`

The script declares usage as `prod|staging`, enables `set -euo pipefail`, accepts an `ENV` argument with a default of `staging`, and only echoes the value (`7–10`). The selected environment is never used to select a compose file, project, image, secrets, host, network or policy. Consequently, invoking the script with an environment label does not establish that deployment targets that environment. The script emits emoji/status text, which is operationally cosmetic and not a signed deployment result.

It runs `docker compose pull` and then `docker compose build --no-cache backend` with no immutable image digest, repository/commit assertion, registry trust check, SBOM/signature/vulnerability gate, resource preflight or clean-build artifact capture (`12–18`). The comment says migrations/seeds may run, but the implementation performs none; it starts MongoDB and Redis with `docker compose up -d`, sleeps exactly ten seconds, then starts the full stack (`20–28`). There is no polling with bounded readiness criteria, schema migration lock, backup/restore checkpoint, data compatibility gate, secret presence check, rollback trap, previous-version retention, canary/health verification or traffic cutover validation.

The script unconditionally reports `Deployment complete!` immediately after `docker compose up -d`, then prints `docker compose ps` and backend logs without checking exit status/health semantics beyond shell command success (`30–36`). It has no explicit HTTP readiness, database/Redis health, migration/reconciliation, smoke/contract/security verification, rollback-on-failure or cleanup. The baseline script was not executed; no product code was changed and no tests/builds were run during this semantic read.
