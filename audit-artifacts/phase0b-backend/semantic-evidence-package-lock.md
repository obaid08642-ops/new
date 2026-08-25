# Phase 0B semantic evidence — package lock

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read/traversed in full:** `package-lock.json` (18,299 lines; 675,401 bytes; lockfileVersion 3)

The lockfile identifies `nabd-backend` version `1.0.0`, contains 1,401 package entries, 52 root runtime dependencies and 20 root devDependencies. A full JSON traversal was performed over every package key and its resolved/integrity/deprecated/optional metadata; raw traversal output is `audit-artifacts/phase0b-backend/package-lock-full-traversal.txt`. The lockfile has no legacy top-level `dependencies` object, no git/file resolved URLs, and no missing integrity among resolved non-root entries. This is positive integrity evidence, but it is not a vulnerability, license, provenance, or compatibility approval.

The root package entry has no scripts in the lockfile, as expected because scripts are defined in package.json. 548 package entries lack an `engines` declaration, 128 are marked optional, and 11 contain deprecated metadata. These findings require review rather than automatic removal: optional/native packages may be legitimate, and deprecation may exist transitively. The lockfile faithfully records the resolver graph but does not itself enforce Node/npm/pnpm version, registry trust, package provenance, SBOM, license policy, vulnerability thresholds, dependency freshness, or runtime bundle minimization.

The lockfile records root dependency ranges inherited from package.json, so deterministic installation depends on the lockfile being used with the same package manager/version and on CI enforcing frozen/immutable installation. There is no evidence in this member of package-manager pinning, lockfile/package.json synchronization gate, diff review policy, registry allowlist, cache poisoning controls, artifact attestation or production-vs-test dependency boundary. The lockfile does not prove that Docker uses it correctly or that all installed modules are required by the production runtime.

No npm install, audit, build, package upgrade, product-code change or deployment was performed. The traversal was read-only and intended to establish semantic coverage and supply-chain evidence boundaries.
