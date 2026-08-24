# Semantic evidence — Patient Web Settings

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd-patient-web/app/[locale]/settings/page.tsx:12–44` requires patient access and reads privacy, security, storage and sessions in parallel through server helpers. It redirects 401 to localized login, treats 403/404 as not-found, and shows an unavailable alert for any other failed response (`:17–31`). It parses each response through bounded helpers before rendering.

The page renders profile visibility/data sharing, biometric/two-factor status, storage summary and a truncated session list (`:32–43`). It explicitly renders a read-only boundary and contains no controls for changing privacy/security settings, revoking sessions, changing password, enabling 2FA or deleting storage. This is consistent with the source-level read-only scope but not full Mobile settings parity.

## Cross-layer verification required

1. Map the read helpers to exact backend DTOs and ownership/PHI rules.
2. Compare Mobile settings actions and session/security controls.
3. Decide whether Web must expose mutations; if yes, define explicit contracts and tests.
4. Verify session expiry representation, device metadata minimization and logout/revocation semantics.
5. Verify all six locales and accessibility semantics for lists/status values.

No Phase 0 remediation was made.
