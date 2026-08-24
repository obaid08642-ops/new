# Semantic evidence — Mobile Health Passport

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/reports/passport.tsx:37–40` loads `/medical-profile` and `/medical-profile/passport-token`, but both failures are silently swallowed; profile failure leaves a mostly empty UI and token failure shows a generic unavailable message. No explicit 401/403/404/offline/retry state or token refresh/revocation/one-time validation is shown.

The QR value contains `format`, `version` and an opaque backend token (`:99–115`), and the UI displays `expires_at` (`:119–123`), but this client does not prove TTL enforcement, audience binding, scan authorization, one-time use, revocation or audit. The profile fields include blood type, age/gender, allergies and long-term medications (`:126–228`), all sensitive health data.

`handleSharePassport` sends full name, blood type and allergy names to native OS sharing (`:42–54`) with no consent confirmation, redaction/minimization option, recipient restriction, expiry/watermark, audit or PHI warning; share errors are silently ignored. The subtitle claims “safe sharing” without source/guarantee evidence (`:72–77`).

Emergency contacts render names and phone numbers, but tapping a contact only shows a confirmation alert and never invokes `Linking.openURL('tel:...')` or an actual call (`:230–273`). Age is calculated locally and gender defaults to male for any value other than `female` (`:145–152`). No access history, data freshness, profile ownership, six-locale or accessibility evidence is present. No Phase 0 remediation was made.
