# Phase 0B semantic evidence — production Dockerfile

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `Dockerfile.production:1–37`

The image uses mutable `node:20-alpine` tags for both build and production stages (`1–2,12–13`) without digest pinning, base-image provenance, vulnerability scan, SBOM or signature policy. The builder copies `package*.json` and runs `npm ci`, then copies the entire build context with `COPY . .` and runs `npm run build` (`4–10`). This relies on an unseen `.dockerignore`, can include sensitive/unneeded repository content in the build context, and has no explicit secret/credential exclusion or source integrity assertion.

The production stage copies `package*.json` and runs `npm ci --only=production` (`15–22`). There is no explicit lockfile requirement/check, npm version pin, cache/provenance policy, offline/reproducible mode or dependency scan. The file does not copy any patches/overlays or account for standalone tracing/native/runtime dependencies; only `dist` is copied from the builder (`24–25`). Runtime imports/assets/templates, generated files, certificates, localization, media, `node_modules/.bin` assumptions or native `sharp` requirements are not validated by the Dockerfile.

A non-root `nestjs` user is created and selected (`27–30`), but no filesystem ownership/permissions, read-only root filesystem, dropped capabilities, seccomp, no-new-privileges, UID collision policy, writable temp directory or resource limits are configured. The image exposes port 3000 and starts `node dist/main` (`32–36`) with no `HEALTHCHECK`, readiness/liveness contract, graceful signal policy, init process, `STOPSIGNAL`, log/redaction policy or runtime dependency preflight. Port 3000 must be reconciled with the application's configured/listening port and deployment edge.

There is no multi-architecture/platform declaration, build metadata, provenance label, release version/commit label, migration/seed policy, rollback strategy, image signing or registry policy. The Dockerfile does not demonstrate that the production image contains only the authoritative NestJS surface or excludes legacy/FastAPI/seed tooling. No image was built, no product code was changed and no tests were run during this semantic read.
