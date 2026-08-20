# Phase 8 — Batch E: patient locale-aware bottom navigation

## Purpose

The Patient bottom navigation had a hard-coded `|| true` expression that forced right-to-left layout for all locales, and all five primary labels were Arabic regardless of the selected language. This caused a verified P0 usability/localization defect for English, Hindi, Bengali and Filipino users.

## Source change

| Surface | Implemented control |
|---|---|
| Direction | `BottomNavBar` now consumes the selected locale direction from `AppContext`; it no longer forces RTL. Arabic and Urdu remain RTL, while English, Hindi, Bengali and Filipino render LTR. |
| Labels | A typed `bottomNavLocale` module supplies non-empty Home, Pharmacy, Consultations, Diagnostics and Nursing labels for all six supported locales. |
| Accessibility | Every tab and the central consultation action now declare tab role, localized label, selected state and stable test ID. |
| Visual behavior | The existing compact five-item navigation, center consultation action, vector Material Symbols, theme color behavior and animated interaction are retained; only language-dependent layout/copy is corrected. |

## Verification

| Gate | Result |
|---|---|
| Focused locale test | **PASS** — `bottomNavLocale.test.ts`: 1 suite, 2 tests. It verifies that only Arabic/Urdu are RTL and that all five labels are non-empty in all six locales. |
| Patient TypeScript | **PASS** — `npm run typecheck`. |
| Patient Expo export | **PASS** — `npm run export:web` generated web, iOS and Android bundles in the isolated workspace. |
| Archive integrity | **PASS** — rebuilt `nabd_plus_patient_app.zip` validates with `unzip -tq`; `node_modules`, `dist` and coverage outputs are excluded. |
| Source archive SHA-256 | `9b3ca3342dbcdb2ea10b77707c5f1d0b6f838183fdce1ddad586681f4a6d1f0c` |
| Branch upload | **PASS** — source commit `ae0673a` (`fix: localize patient bottom navigation`) is on `manus/on-live-reconciliation`. |

## Remaining scope

This fixes the global navigation shell, not every hard-coded RTL/LTR screen or all translation content. Phase 8 continues with feature-specific screen remediation and Phase 9/10 retain the mandatory six-language screen inventory, geometry, text-overflow, accessibility and device validation gates.
