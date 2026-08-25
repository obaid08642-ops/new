# Phase 0B semantic evidence — Backend package contract

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `package.json:1–108`

The package is a private NestJS backend at version `1.0.0` with scripts for build/start/dev/prod, lint, test and boot test (`1–14`). The lint script invokes ESLint with `--fix`, meaning a routine lint command can mutate source files rather than act as a read-only gate (`11`). There are no explicit scripts for security audit, typecheck, OpenAPI generation/verification, contract tests, sandbox tests, migration/seed governance, dependency scanning, coverage threshold, clean build, or production smoke/readiness verification (`6–14`).

Runtime dependencies include the full Nest/Mongoose/Redis/Bull/BullMQ/S3/Cloudinary/Firebase/LiveKit/mail/PDF/image/notification stack (`15–67`). Many versions use caret ranges, permitting resolver drift; there is no engines, package-manager pin, package provenance, resolutions/overrides, SBOM or vulnerability/license policy in the package contract (`15–67`). Both `@nestjs/bull` and `@nestjs/bullmq`, and both `bull` and `bullmq`, are installed (`20–21,40–41`), creating duplicate queue abstractions and possible worker/configuration drift. Multiple object-storage/email/AI-adjacent integrations and image/PDF stacks are present without feature ownership or optional dependency boundary (`16–19,44,54,57–63`).

The dev dependency set is broad and mostly caret-ranged, including Jest 30 with ts-jest 29, TypeScript 5.6, mongodb-memory-server and socket.io-client (`69–89`). Compatibility is not documented; no lockfile integrity/hash policy is declared in package.json. The Jest configuration sets `rootDir: src`, regex `.*\.spec\.ts$`, ts-jest transform, collects all TS/JS under root and uses Node test environment (`91–107`). There is no explicit timeout, max workers, coverage threshold, global setup/teardown, environment isolation, leak detection, test tagging or sandbox/real-service distinction. `test:boot` points to a root-level config while rootDir is `src`, so the effective coverage/boot contract requires separate verification.

The package has no `repository`, `license`, `engines`, `packageManager`, `exports`, `files`, `publishConfig`, `volta` or reproducibility metadata. It does not itself prove that production uses only the NestJS contract surface, because FastAPI/legacy scripts and compatibility paths are not represented in the scripts or package boundary. No install/build/test/lint command was run and no product code was changed during this semantic read.
