# Phase 0B semantic evidence — TypeScript build configuration

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `tsconfig.build.json:1–4`

The build configuration extends `./tsconfig.json` and overrides only the exclusion list (`2–3`). Consequently, all weak base compiler settings remain inherited, including disabled null/implicit-any/binding/casing/fallthrough checks, `skipLibCheck`, source maps, declarations and incremental compilation. No build-specific hardening is introduced.

The build excludes `node_modules`, `test`, `dist`, `scripts`, `scratch` and every `**/*spec.ts` file (`3`). Excluding tests is expected for production compilation, but excluding scripts and scratch without a supplemental typecheck can permit operational code drift; excluding every spec also prevents compilation assurance for test-only adapters and fixtures. The file does not define build-specific `noEmitOnError`, source-map suppression, declaration policy, clean output policy, module/target policy, path-alias runtime support, asset inclusion, generated-code boundary or project references.

There is no explicit assertion that this config is the one used by all Docker/build paths, nor a parity check against Nest CLI, package scripts or CI. No compiler/build was run, no product code was changed and no tests were run during this semantic read.
