# AGENT PROGRESS — fix/audit-2026-09

Format: task | commit sha | verify result | notes

| Task | Commit | Verify | Notes |
|---|---|---|---|
| P0.1 | aa86d2f | YAML valid; gitleaks not installed locally (CI-run) | Secret rotation itself BLOCKED for owner; agent added gitleaks CI step scanning full history, fails on findings |
| P0.2 | 4466f9e | npm ci + tsc --noEmit + nest build all exit 0, no --legacy-peer-deps; npm ls 0 invalid | All @nestjs/* at 12.x (core/common/platforms/cqrs/terminus/mongoose/config/schedule/swagger/jwt/passport/bull/bullmq/event-emitter/cli/testing); throttler 6.7.0 (own line, peers allow ^12); sentry 10.x→11.0.0, nest-winston 1.x→2.0.0 (invalid peers introduced by move); fixed 1 tsc error in configured-io.adapter.ts (socket.io ServerOptions partial bridge) |
| P0.3 | 1886886 | pnpm install --frozen-lockfile + pnpm check exit 0 (pnpm 10.4.1 via corepack) | Deleted patient-web/package-lock.json (pnpm-only) and admin/pnpm-lock.yaml (npm-only); lighthouse.yml + patient-production-ci patient-web job now corepack enable + pnpm install --frozen-lockfile; freed ~850Mi (npm cache + partial node_modules) to fit install on full disk |
