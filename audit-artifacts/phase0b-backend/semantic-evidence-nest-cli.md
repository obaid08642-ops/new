# Phase 0B semantic evidence — Nest CLI configuration

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `nest-cli.json:1–10`

The Nest CLI configuration points to the external JSON schema, the Nest schematics collection and `src` as source root (`2–4`). The schema is referenced by URL but no pinned/local schema or validation evidence is present in this member. The compiler is configured to delete the output directory before compilation (`6`), which is destructive to pre-existing artifacts and requires a clean-build/reproducibility policy.

Nest is directed to use `tsconfig.build.json` (`7`), while the separately read `tsconfig.json` excludes scripts/scratch and includes only `src/**/*`; the build-config relationship, overrides and exact exclusion boundary must therefore be verified separately. Assets are defined as a single glob `assets/**/*` (`8`), but there is no explicit output path, watch behavior, runtime existence check, permission policy, cache invalidation policy or proof that all runtime assets are under that path. A Dockerfile that copies only `dist` may omit assets unless Nest copies them there and packaging verifies it.

No webpack/compiler plugin, source-map policy, path-alias runtime handling, deterministic build metadata, asset manifest, build failure on missing assets, or post-build runtime smoke contract is represented. No build was run, no product code was changed and no tests were run during this semantic read.
