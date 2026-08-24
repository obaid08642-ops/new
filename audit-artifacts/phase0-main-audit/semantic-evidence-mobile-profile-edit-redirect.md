# Semantic evidence — Mobile profile edit redirect

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/profile/edit.tsx:1–5` is marked `@ts-nocheck` and exports a component that only returns `<Redirect href="/health/edit-profile" />`. It contains no form, field validation, loading/error/success state, API call, ownership handling or mutation logic. The actual profile-edit implementation must therefore be audited at `/health/edit-profile`; this file is only a route alias.

The alias creates a route-continuity dependency: callers using `/profile/edit` and callers using `/health/edit-profile` must resolve to one authoritative screen, and back navigation/deep links must not create loops or lose locale/session context.

No Phase 0 remediation was made.
