# Semantic evidence — Mobile Settings About

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/about.tsx:18–52` hard-codes website/social URLs (`nabdahplus.com`, Twitter and Instagram) and team-member names/roles. These destinations, brand identity and staffing claims are not fetched or verified in the screen. `handleOpenLink` swallows all `Linking.openURL` errors (`:58–60`), so unavailable or unsafe link failures have no user-visible recovery.

The page hard-codes app version `v1.0.0` (`:97–109`), Saudi service/coverage/security/accreditation claims in the description (`:112–125`), and “customer service around the clock” in team copy (`:39–52`). Legal/service claims require source-of-truth/versioning and localization review; the page has no release metadata, licenses, company/legal identity, contact channel, accessibility labels, or remote content freshness.

Terms and privacy routes exist (`:218–250`), but there is no effective-date/version acknowledgement, consent state, or proof that the legal documents correspond to the backend policy. Social sharing/opening is an external navigation surface with no canonical link analytics or privacy disclosure. No Phase 0 remediation was made.
