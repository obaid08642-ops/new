# Semantic evidence — Mobile Profile

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/profile/index.tsx:1–13` is marked `@ts-nocheck` and uses Redux, `useGuestGuard` and `apiFetch`. The profile menu exposes routes for health, medications, prescriptions, reports, appointments, orders, wallet, insurance, addresses, family, loyalty and settings (`:15–28`). Every destination requires separate route/contract/state verification; the source alone does not prove that all destinations exist or are complete.

The screen loads loyalty points from `/loyalty/account` for authenticated users and renders the server-derived value as a badge (`:40–54`). It uses fallback display names (`:61–68`) and guest copy. Guest users are allowed to navigate to most destinations; insurance and family are blocked through `requireAuth` (`:74–97`). The guest sign-in/create-account button calls `handleLogout`, which dispatches logout and navigates to the welcome route (`:30–35,74–80`), an action/context mismatch that may clear state instead of opening authentication.

Logout is also exposed for authenticated users (`:115`). The source does not prove remote session revocation, cache invalidation, or complete guest access policy for health, prescriptions, orders, wallet or appointments. Route vocabulary includes `/health/edit-profile`, `/health/family-hub`, `/consultations/appointments` and `/loyalty/hub`, which must be reconciled against the actual route tree and backend contracts.

No Phase 0 remediation was made.
