# Semantic evidence — Mobile Settings index

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/index.tsx:1–23` is marked `@ts-nocheck` and defines settings navigation. Items route to profile, security, privacy, notification settings, support chat, support chat contact, terms and about (`:25–55`). Theme is a real local toggle, language routes to `/settings/language`, and calendar cycles among Gregorian/Hijri/auto (`:57–84`).

Logout dispatches the Redux `logout()` action and replaces the route with `/(auth)/welcome` (`:86–90`), correcting an earlier navigation-only pattern according to the inline source comment. The page itself has no direct backend mutation except whatever logout slice performs; session revocation and remote cleanup require verification.

The Mobile settings index therefore exposes substantially more navigation than the Patient Web Settings page, which is an SSR read-only summary of privacy/security/storage/sessions. Web/Mobile parity requires deciding which controls are intentionally native-only versus required on Web, and tracing each destination screen/API/ownership/error state.

## Required verification

1. Read Mobile privacy/security/notification settings and support screens.
2. Verify logout clears SecureStore/AsyncStorage/cache and revokes server sessions where required.
3. Compare language/calendar/theme persistence and six-locale behavior.
4. Verify support-chat ownership, PHI and mutation contracts.
5. Replace `@ts-nocheck` or document bounded debt with typecheck evidence.

No Phase 0 remediation was made.
