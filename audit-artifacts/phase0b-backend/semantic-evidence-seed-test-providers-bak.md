# Phase 0B semantic evidence — Backup test provider seeder

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `scripts/seed_test_providers.ts.bak:1–101`

This `.bak` file is a second complete executable-looking test-provider seeder, separate from `scripts/seed_test_providers.js`. It imports Mongoose and bcrypt, defaults to `mongodb://localhost:27017/nabdah`, defines a local provider schema/model and connects to Mongo (`1–20`). There is no extension-level quarantine, production/test-database identity gate, operator authorization or explicit deprecation marker.

It hashes the hardcoded shared password `Nabd@1234` (`22`) and defines the same six predictable test identities for doctor, pharmacy, lab, radiology, nursing and facility, each with `status: 'APPROVED'` and `is_online: true` (`24–79`). The model is local rather than visibly canonical, and there is no capability/license/readiness, expiry, tenant isolation, discovery exclusion or account lifecycle contract.

The seeder upserts by phone with `$set` and logs each phone plus the plaintext password (`81–88`). Reruns can overwrite password/status/online state without versioning, review, rollback, audit, reconciliation or transaction. It reports completion without target/account validation (`90`). Error handling sets a process exit code and `finally` disconnects Mongoose (`93–100`), but no cleanup/removal of accounts or structured evidence is produced. This is duplicate test-data entry-point drift: even if not referenced, its presence increases the probability of accidental invocation or reintroduction. The file was not executed; no product code was changed and no tests/builds were run during this semantic read.
