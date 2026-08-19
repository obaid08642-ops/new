# Phase 8 — Batch W: Provider KYC state-gate integrity

## Purpose

The Provider onboarding flow correctly submits a profile for review, but the Provider app treated every non-suspended/non-rejected `profile_status` as operational. The global JWT guard validated a provider token and role but did not verify that the corresponding `provider_accounts` record was approved before a provider endpoint ran. This could expose operational dashboards and endpoint attempts before administrative/KYC approval.

## Source change

| Surface | Implemented control |
|---|---|
| Central Backend gate | For tokens with `scope: provider`, `JwtAuthGuard` now resolves the server-side `provider_accounts` status. Any status other than `approved` is rejected on operational paths. Unknown provider accounts fail closed. |
| Onboarding exception | Only the authenticated provider’s narrow onboarding paths (`my-profile`, steps 2/3, submit, progress, contract) remain reachable while pending. This allows legitimate document submission and review remediation without granting work operations. |
| Provider app state | The app now maps only `approved`/`active` to `logged_in`; every unknown or pre-approval status maps to `pending`, with rejected and suspended remaining non-operational. |
| Provider routing | Pending, rejected and suspended account states route to the review-status screen rather than an operational dashboard. The former **Explore App** escape action was replaced with a review-status refresh. |
| Regression coverage | Guard tests prove pending provider operation denial, onboarding exception, and approved-provider allowance. Provider static contract tests prove status routing and the absence of the operational escape CTA. |

## Verification

| Gate | Result |
|---|---|
| Focused Backend auth/KYC guard suite | **PASS** — 15 tests. |
| Full Backend regression suite | **PASS** — 54 suites, 338 tests. |
| Backend production build | **PASS** — `nest build`. |
| Provider release-contract suite | **PASS** — 1 suite, 10 tests. |
| Provider TypeScript check | **PASS** — `npx tsc --noEmit`. |
| Provider production Expo web export | **PASS**. |
| Archive integrity | **PASS** — rebuilt Backend and Provider archives validate with `unzip -tq`; dependencies and build outputs are excluded. |
| Backend archive SHA-256 | `7cab3ef05931fd7cac4ce46b9f34097dfe8e86b1a95cec8d89ac7c2d29ad62b7` |
| Provider archive SHA-256 | `b3969804af79369fddfd0e0255c5f72944d6960bfa8537cb607cd76ff46cda25` |
| Branch upload | **PASS** — source commit `4fc0b49` (`fix: gate provider operations on approval`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

No KYC document, provider record, endpoint operation, or production account was used. Phase 11 must verify linked sandbox provider accounts across pending, needs-changes, approved, rejected and suspended states; confirm the narrow onboarding exceptions; repeat API/WebSocket BOLA checks; and prove that a post-approval token/session refresh transitions correctly. Real KYC documents and non-sandbox providers remain out of scope.
