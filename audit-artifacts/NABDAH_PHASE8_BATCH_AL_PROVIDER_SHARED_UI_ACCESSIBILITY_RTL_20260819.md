# Phase 8 — Batch AL: provider shared UI accessibility and RTL foundation

## Purpose

Many provider screens use the shared `NBtn` component. The prior implementation lacked an explicit semantic button role/state/label, did not enlarge its touch target, always vibrated including in web contexts, and retained fixed left-to-right content flow inside the button despite the application’s RTL support.

## Source change

| Surface | Implemented control |
|---|---|
| Accessibility semantics | Shared buttons now expose button role, label and disabled/busy state to assistive technologies. |
| Touch and feedback | Buttons add a six-point touch margin and use restrained vibration only on native platforms. |
| RTL geometry | Button content follows `isRTL`, matching the surrounding localized layout rather than forcing a fixed row direction. |
| Visual hierarchy | Enabled primary actions receive the existing shared elevation token; disabled and non-primary variants retain their controlled contrast semantics. |
| Regression coverage | Provider release-contract test asserts the semantic role/state, RTL-aware direction and native-only feedback guards. |

## Verification

| Gate | Result |
|---|---|
| Provider release contracts | **PASS** — 17/17. |
| Provider TypeScript | **PASS** — `npx tsc --noEmit`. |
| Provider production web export | **PASS** — Expo web bundle completed. |
| Provider archive integrity | **PASS** — `unzip -tq`; SHA-256 `0d268f9bba887b8fb3151354609f675c59d257f0cfa7f60bf18c5d54dcbbc30e`. |
| Branch upload | **PASS** — archive commit `a7ed9fa` (`fix: improve provider shared button accessibility`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

This applies a verified shared-component foundation; it does not prove visual parity on every provider screen, human translation quality in all six languages, native screen-reader behavior, contrast on every theme/device, or clinical workflow usability. Those require the planned screen/device acceptance work and must not be inferred from a source-level shared component test.
