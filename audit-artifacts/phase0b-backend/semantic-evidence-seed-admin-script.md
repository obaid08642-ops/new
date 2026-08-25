# Phase 0B semantic evidence — Admin seed script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/scripts/seed-admin.ts:1–67`

The script requires admin phone/email/password and `MONGO_URL`, enforces only a 12-character minimum password, and connects to Mongo with a silent `DB_NAME || 'nabd'` fallback (`19–35`). There is no production/non-production gate, database identity assertion, explicit admin-seeding approval, dry-run, environment allowlist, TLS/certificate validation or collection/schema/index readiness check.

The script claims idempotency but uses a non-atomic `findOne({phone})` followed by `insertOne` (`38–58`); concurrent runs can create duplicate admin accounts unless an external unique index exists and is verified. It checks phone only, while email is lowercased on insert and has no preflight uniqueness/conflict check (`38–50`). It assigns `role:'admin'`, `active:true`, `is_guest:false` directly through raw collection access (`46–55`) with no least-privilege role, approval, MFA/bootstrap-token, actor audit or post-creation verification lifecycle.

The password is hashed with bcrypt, which is positive, but the script gives no breached-password/complexity/rotation/expiry/revocation policy and only prints that the password should be changed after first login (`45–60`). Errors are sent to console and the failure path has no visible `finally` disconnect, structured redaction or audit/run ID (`64–67`). The script is documented as “ONCE per environment” but does not enforce once-only execution or an immutable reconciliation marker (`2–13`). No product code was changed and the script was not executed; no tests/builds were run during this semantic read.
