# Phase 0B semantic evidence — Auth schemas and password validator

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/auth/schemas/passkey-credential.schema.ts:2–35`
- `src/modules/auth/schemas/trusted-device.schema.ts:2–28`
- `src/common/validators/password.validator.ts:2–27`

`PasskeyCredential` stores admin `user_id`, unique credential_id, COSE public key bytes, signature counter, transports, device name and last-used timestamp. The schema correctly avoids private authenticator secrets, but exposes no explicit revoked/deleted/attestation metadata, credential lifecycle expiry or compound user/credential governance beyond unique credential_id.

`TrustedDevice` stores only SHA-256 token hash and binds it to user_id, with optional name/user-agent/enrollment IP/last IP, last_seen_at and revoked. It has no visible expiry/last-used cutoff, explicit device fingerprint binding, reason/audit history for revoke, or compound indexes for user active device management; raw IP and user-agent are retained as PII/security telemetry.

`IsStrongPasswordConstraint` enforces minimum eight characters, one uppercase, one digit and one listed special character. It does not enforce a maximum length, breached-password screening, Unicode/normalization policy, password history, or protection against common passwords. The validator is a decorator and its actual application to every password creation/reset/change DTO must be verified at the consuming controllers.

No product code was changed and no tests/builds were executed during this semantic read.
