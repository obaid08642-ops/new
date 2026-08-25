# Phase 0B semantic evidence — TypeScript configuration

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `tsconfig.json:1–28`

The project compiles CommonJS with declarations, removes comments, emits decorator metadata and uses experimental decorators (`3–7`). `emitDecoratorMetadata` is required by Nest/class reflection but expands runtime metadata exposure and must be governed deliberately. The target is ES2021 with source maps enabled and output in `dist` (`9–11`); production packaging must ensure source maps and declaration artifacts are not publicly exposed or unnecessarily shipped.

The compiler uses `baseUrl`, incremental compilation and `skipLibCheck` (`12–14`). Incremental state and any generated metadata require clean-artifact/reproducibility controls. `skipLibCheck` suppresses type checking of declaration files and is a deliberate assurance reduction that must be justified and covered by dependency compatibility gates.

Several strictness and correctness checks are explicitly disabled: `strictNullChecks`, `noImplicitAny`, `strictBindCallApply`, `forceConsistentCasingInFileNames` and `noFallthroughCasesInSwitch` (`15–19`). This permits latent null/undefined, implicit-any, unsafe call binding, case-sensitive path and switch fallthrough defects to pass compilation. The file does not enable the umbrella `strict` mode, exact optional property semantics, noUncheckedIndexedAccess, noImplicitOverride, useUnknownInCatchVariables or other hardening checks.

`esModuleInterop` and JSON module resolution are enabled (`20–21`). The `@/*` path alias maps to `src/*` (`22–24`), but no runtime alias loader or emitted-path parity is declared here; compiled execution must prove that imports resolve after build. `scripts`, `scratch` and `dist` are excluded while only `src/**/*` is included (`26–28`), so operational scripts are outside the compiler contract and can drift without type checking. No compiler was run, no product code was changed and no tests were run during this semantic read.
