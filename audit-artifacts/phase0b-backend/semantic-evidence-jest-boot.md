# Phase 0B semantic evidence — Jest boot configuration

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `jest.boot.config.js:1–8`

The boot Jest config uses repository root as `rootDir`, recognizes JS/JSON/TS, and selects only `test/.*\\.e2e-spec\\.ts$` (`2–4`). This defines a narrow filename-based e2e surface; it does not itself prove that the selected suite boots the compiled production artifact, exercises real external dependencies, or covers all startup paths. The configuration does not declare `testMatch` alternatives, test discovery assertions or a required test count.

TypeScript and JavaScript files are transformed with `ts-jest` and the environment is Node (`5–6`). No ts-jest diagnostics/isolatedModules policy, compiler config path, Node version parity, module format parity, source-map policy or transform cache/reproducibility contract is declared. An empty `moduleNameMapper` is configured (`7`), so the `@/*` alias declared in `tsconfig.json` has no Jest mapping in this file; alias-based imports may fail or differ from application/Docker execution.

No global setup/teardown, environment loading, secret validation, external-service readiness, test timeout, retry, open-handle detection, worker policy, coverage threshold, leak isolation or mock prohibition is present. This config therefore cannot alone establish a real boot gate or security/contract test gate. No test was run, no product code was changed and no build was performed during this semantic read.
