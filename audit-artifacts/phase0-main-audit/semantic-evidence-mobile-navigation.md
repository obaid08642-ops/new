# Semantic evidence — Patient Mobile entry and navigation

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## App root

Source: `nabd_plus_patient_app/app/index.tsx`.

Line 1 contains `// @ts-nocheck`, so TypeScript safety for the app entry is disabled and must be tracked as a quality/security finding. Lines 17–35 wait 2.6 seconds, read SecureStore auth token and AsyncStorage guest mode, then route to `/(auth)/welcome` or `/(tabs)`. The root explicitly preserves authenticated and guest sessions, which is a product behavior requiring guest-data isolation and expiry tests.

The splash renders an animated logo and Arabic-only branding text at lines 38–56. This proves an entry animation exists, but not parity across locales, reduced-motion support, loading/error behavior, or accessibility semantics.

## Tabs layout

Source: `nabd_plus_patient_app/app/(tabs)/_layout.tsx`.

Line 1 also disables TypeScript checks. The visible tab declarations are home/index, consultations, pharmacy, diagnostics, services and health at lines 17–22. Nursing is declared at line 23 with `href: null`, meaning the route exists but is hidden from the tab bar. This is a confirmed discoverability/deep-link candidate; it is not proof that the nursing patient journey is complete or intentionally hidden.

The layout uses a custom `BottomNavBar` and `Header` while leaving `headerShown: true` at lines 9–15. Navigation behavior, accessibility labels, active-state semantics, deep links and unauthenticated route guards require screen-level and runtime verification.

## Classification

These are direct source observations only. No remediation is performed in Phase 0. Final status requires route/screen/action mapping, contract, actor, state, test, localization, accessibility and live evidence.
