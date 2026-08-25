# Phase 0B semantic evidence — root Dockerfile

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `Dockerfile:1–15`

The root Dockerfile defines a second two-stage Node 20 Alpine image separate from `Dockerfile.production` (`1–15`). Both stages use mutable `node:20-alpine` tags without digest, provenance, SBOM, vulnerability scan or signing policy. The builder copies package manifests, runs `npm ci`, copies the entire context and builds (`1–6`) without an explicit sensitive-content boundary or lock/integrity assertion in the Dockerfile.

The runtime stage copies only `dist` and package manifests, installs production dependencies and exposes port 3000 (`8–13`). It does not copy runtime assets/templates/localization/patches or prove native module availability. `npm ci --only=production` is not accompanied by npm/version/lock integrity policy. The image has no non-root user, read-only filesystem, dropped capabilities, no-new-privileges, resource limits, init/signal policy or writable-temp policy. The process runs via `npm run start:prod` (`14`), adding an npm process layer and relying on package script resolution rather than directly invoking the runtime entry point.

No `HEALTHCHECK`, readiness/liveness probe, startup secret/dependency preflight, graceful shutdown, log policy, release labels, migration/seed policy, rollback or platform declaration exists. The port is exposed as 3000 without parity evidence against actual application configuration. Because `Dockerfile.production` also exists with a different runtime user/CMD, the repository has competing image contracts and no visible authoritative selection or drift gate. No image was built, no product code was changed and no tests were run during this semantic read.
