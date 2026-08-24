# Semantic evidence — Admin Security / Passkey

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/web_admin_dashboard/src/pages/admin/security.tsx:20–77` loads passkey devices from `/auth/passkey/devices`, enrolls through POST `/auth/passkey/enroll/options` then WebAuthn `startRegistration` and POST `/auth/passkey/enroll/verify`, and deletes a device with DELETE `/auth/passkey/devices/{credentialId}`. It has visible loading, success and error messages and prevents deleting the last key only if the backend returns an error containing `last`.

The page copy claims mandatory two-factor authentication for the control panel (`:81–88`), but the source does not establish the surrounding password/2FA login flow, recovery, lockout, rate limits, CSRF/origin policy, idempotency, re-authentication for enrollment/removal, or immutable audit record. The enrollment and deletion calls also do not show an explicit idempotency key or user confirmation beyond browser `confirm` for delete (`:65–70`).

The security button contains an emoji glyph in its label (`:116–125`), contrary to the project’s no-emoji design requirement. This is a visual/brand finding, not a security control by itself.

## Cross-layer verification required

1. Verify backend passkey controller, designated-admin restriction, session binding and audit logging.
2. Test unauthenticated, wrong-role, wrong-admin, replay and last-key deletion cases.
3. Verify recovery when all passkeys are lost and whether password+passkey is truly enforced.
4. Verify device-name/credential validation and privacy of device metadata.
5. Remove emoji from production UI if the no-emoji policy is binding.

No Phase 0 remediation was made.
