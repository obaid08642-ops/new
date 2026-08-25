# Phase 0B semantic evidence — Test provider seeder (JavaScript)

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `scripts/seed_test_providers.js:1–48`

The script loads Mongoose, bcrypt and dotenv, then defaults `MONGODB_URI` to `mongodb://localhost:27017/nabdah` (`1–5`). It defines a local provider schema with phone, password, names, type, status and online flag and reuses/creates a `Provider` model (`7–17`). The local schema is not visibly tied to the canonical provider schema, schema version, tenant/role model, license/credential model or provider-profile source of truth.

It connects to the selected Mongo URI and hashes one hardcoded shared password `Nabd@1234` with bcrypt cost 10 (`19–23`). It then defines six fixed test accounts for doctor, pharmacy, lab, radiology, nursing and facility, each marked `status: 'APPROVED'` and `is_online: true`, with phone numbers in a predictable sequence and explicit “Test” names (`25–32`). There is no environment/production denial, test-database identity assertion, operator authorization, expiration, account isolation, capability/license verification, or mechanism to prevent these accounts from becoming operationally visible.

Each provider is upserted by phone while `$set` writes the complete object, including the shared hashed password, status and online state (`34–37`). Reruns can overwrite provider state and re-enable accounts; no version/conflict policy, audit actor, deterministic seed release, unique-index assertion, rollback or reconciliation is performed. The password is printed in each success log together with the phone number (`36`), creating a direct credential disclosure in logs. The script reports completion without verifying target identity, account count, visibility, role/access behavior or removal of seeded data (`39`). Errors set process exit code and `finally` disconnects Mongo (`42–47`), but no structured evidence or cleanup of created test accounts exists. The script was not executed; no product code was changed and no tests/builds were run during this semantic read.
