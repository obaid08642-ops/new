# Phase 9 — provider dependency-lock integrity

## Finding and correction

The provider clean-install gate initially failed because the project combined Expo 54 and Expo Router 6 with `jest-expo` 52, which resolved an incompatible React Server Components peer. A second resolver pass exposed that the caret range for `react-test-renderer` could select 19.2 while the app pins React 19.1.

The provider archive source now pins a compatible Expo 54 test package (`jest-expo` 54.0.13) and pins `react-test-renderer` to the application’s React 19.1.0 version. The package lock was regenerated and a clean install was followed by all available Provider source gates.

## Verification

| Gate | Result |
|---|---|
| Clean dependency install | **PASS** — `npm ci --ignore-scripts`. |
| Provider release contracts | **PASS** — 17/17. |
| Provider TypeScript | **PASS** — `npx tsc --noEmit`. |
| Provider production web export | **PASS** — Expo web bundle completed. |
| Provider archive integrity | **PASS** — `unzip -tq`; SHA-256 `66657e8aeac20a142ebc226e3b978b62a98dc063ec620e0cbfa430a8eca94aee`. |
| Branch upload | **PASS** — archive commit `b3849e9` (`fix: align provider Expo test dependencies`) is pushed to `manus/on-live-reconciliation`. |

## Limits

This repairs clean dependency resolution and test-renderer version consistency. It does not resolve dependency audit advisories, replace Android/iOS build evidence, or waive the documented real-device, live-E2E, legal/consent, payment and deployment gates.
