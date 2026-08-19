# Phase 8 — Batch S: family calendar contract and Android compatibility

## Purpose

The Patient family calendar used `Alert.prompt`, which is unavailable on Android, and sent only a title and fixed type while the Backend silently invented the event date and family member. Any group member could delete any shared event. This made the cross-platform experience incomplete and weakened family ownership controls.

## Source change

| Surface | Implemented control |
|---|---|
| Android/iOS input | Replaced the iOS-only prompt with a React Native modal form that works on Android and iOS. It asks for title, ISO schedule, a real family member, and an explicit allowed event type. |
| Client contract | A tested pure helper rejects a missing/invalid date, missing member, missing title, unsupported type, or malformed calendar response. A failed calendar response renders an error/retry state instead of an empty calendar. |
| Member source | The form fetches `/family/members`; it does not send a free-text member name or default the member to the current user. |
| Backend event creation | Event creation now requires valid `event_date`, `member_user_id`, and a type in the explicit allow-list. The member must be the group owner or a real group member. The Backend derives the display name from group membership. |
| Server-authoritative deletion | Calendar reads include `can_delete`, true only for the creator or group owner. The client hides destructive UI without that capability, and the Backend independently rejects a non-owner/non-creator delete request. |

## Verification

| Gate | Result |
|---|---|
| Family Backend regression suite | **PASS** — 15 tests, including missing schedule/member and foreign-delete negative cases. |
| Focused Patient calendar contract tests | **PASS** — 2 tests. |
| Full Backend regression suite | **PASS** — 54 suites, 336 tests. |
| Backend production build | **PASS** — `nest build`. |
| Full Patient Jest suite | **PASS** — 18 suites, 49 tests. |
| Patient TypeScript check and production Expo web export | **PASS**. |
| Archive integrity | **PASS** — rebuilt Backend and Patient archives validate with `unzip -tq`; dependencies and build outputs are excluded. |
| Backend archive SHA-256 | `5e4075f3c7633c88386e9e507c7a0beb2cae57f9a504dbc910f9aecdaf2270ba` |
| Patient archive SHA-256 | `f9f6b2cf8099676a87a31e5b039178c1a5d87d158736f9dbe6dd476f5cbcf37c` |
| Branch upload | **PASS** — source commit `6d13619` (`fix: secure family calendar events`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

No family group, event, permission, or patient data was created or changed on production in this batch. The release still requires an actual Android/iOS device form pass, server deployment confirmation, linked sandbox family E2E, creator/owner/removed-member BOLA verification, and six-language human copy review in Phases 10–11.
