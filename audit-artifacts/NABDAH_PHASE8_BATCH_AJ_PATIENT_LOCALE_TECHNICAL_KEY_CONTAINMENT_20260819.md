# Phase 8 — Batch AJ: patient locale technical-key containment

## Purpose

The patient application has six supported languages and several feature JSON dictionaries. The runtime map merged those dictionaries independently; a key existing in Arabic but missing from a secondary locale could therefore display its implementation identifier, such as `pd.alternatives`, rather than readable patient-facing content.

## Source change

| Surface | Implemented control |
|---|---|
| Runtime locale merge | After locale files merge, every Arabic feature key is guaranteed to exist in English, Urdu, Hindi, Bengali and Filipino runtime maps. |
| Missing-key behavior | The runtime uses a known exact dynamic translation when present; otherwise it displays the reviewed Arabic source rather than a technical key. This is intentionally a visible source fallback, not an assertion that human translation is complete. |
| Regression coverage | A central i18n test walks all Arabic shared/feature keys in all six languages, rejects empty or raw-key output, verifies known exact dynamic translation, and ensures unknown server content is not silently mutated. |

## Verification

| Gate | Result |
|---|---|
| Focused central locale contract | **PASS** — 2/2. |
| Patient full test suite | **PASS** — full Jest command completed. |
| Patient TypeScript | **PASS** — `npx tsc --noEmit`. |
| Patient production web export | **PASS** — Expo web bundle completed. |
| Patient archive integrity | **PASS** — `unzip -tq`; SHA-256 `399cda42f0216093600fa273da7c1b437d062d8f60816f3ae0d8217f33e7850f`. |
| Branch upload | **PASS** — archive commit `8d7ca1d` (`fix: prevent raw patient locale keys`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

This test proves renderability and prevents technical-key leakage; it does **not** prove idiomatic, medically reviewed, culturally appropriate or layout-safe language in every screen. No patient data or production/sandbox account was accessed. Phase 9–11 still require screen-by-screen language/RTL/LTR/device validation, human review of all fallback source strings, plural/number/date/timezone behavior, accessibility labels, and real-device evidence.
