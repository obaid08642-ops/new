# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_W_PROVIDER_KYC_STATE_GATE_20260819.md`
- **Member SHA-256:** `4918c039af1ae4888bba15963f9f7631b405e8e8b5c003200f8c66d1a6b5163f`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Provider onboarding flow correctly submits a profile for review, but the Provider app treated every non-suspended/non-rejected `profile_status` as operational. The global JWT guard validated a provider token and role but did not verify `
- `12: | Onboarding exception | Only the authenticated provider’s narrow onboarding paths (`my-profile`, steps 2/3, submit, progress, contract) remain reachable while pending. This allows legitimate document submission and review remediation witho`
- `14: | Provider routing | Pending, rejected and suspended account states route to the review-status screen rather than an operational dashboard. The former **Explore App** escape action was replaced with a review-status refresh. |`
- `30: | Branch upload | **PASS** — source commit `4fc0b49` (`fix: gate provider operations on approval`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- `34: No KYC document, provider record, endpoint operation, or production account was used. Phase 11 must verify linked sandbox provider accounts across pending, needs-changes, approved, rejected and suspended states; confirm the narrow onboardin`
### auth_ownership
- `5: The Provider onboarding flow correctly submits a profile for review, but the Provider app treated every non-suspended/non-rejected `profile_status` as operational. The global JWT guard validated a provider token and role but did not verify `
- `11: | Central Backend gate | For tokens with `scope: provider`, `JwtAuthGuard` now resolves the server-side `provider_accounts` status. Any status other than `approved` is rejected on operational paths. Unknown provider accounts fail closed. |`
- `14: | Provider routing | Pending, rejected and suspended account states route to the review-status screen rather than an operational dashboard. The former **Explore App** escape action was replaced with a review-status refresh. |`
- `34: No KYC document, provider record, endpoint operation, or production account was used. Phase 11 must verify linked sandbox provider accounts across pending, needs-changes, approved, rejected and suspended states; confirm the narrow onboardin`
### state_transitions
- `1: # Phase 8 — Batch W: Provider KYC state-gate integrity`
- `5: The Provider onboarding flow correctly submits a profile for review, but the Provider app treated every non-suspended/non-rejected `profile_status` as operational. The global JWT guard validated a provider token and role but did not verify `
- `11: | Central Backend gate | For tokens with `scope: provider`, `JwtAuthGuard` now resolves the server-side `provider_accounts` status. Any status other than `approved` is rejected on operational paths. Unknown provider accounts fail closed. |`
- `12: | Onboarding exception | Only the authenticated provider’s narrow onboarding paths (`my-profile`, steps 2/3, submit, progress, contract) remain reachable while pending. This allows legitimate document submission and review remediation witho`
- `13: | Provider app state | The app now maps only `approved`/`active` to `logged_in`; every unknown or pre-approval status maps to `pending`, with rejected and suspended remaining non-operational. |`
- `14: | Provider routing | Pending, rejected and suspended account states route to the review-status screen rather than an operational dashboard. The former **Explore App** escape action was replaced with a review-status refresh. |`
- `15: | Regression coverage | Guard tests prove pending provider operation denial, onboarding exception, and approved-provider allowance. Provider static contract tests prove status routing and the absence of the operational escape CTA. |`
- `34: No KYC document, provider record, endpoint operation, or production account was used. Phase 11 must verify linked sandbox provider accounts across pending, needs-changes, approved, rejected and suspended states; confirm the narrow onboardin`
### payment_insurance_relevance
- `15: | Regression coverage | Guard tests prove pending provider operation denial, onboarding exception, and approved-provider allowance. Provider static contract tests prove status routing and the absence of the operational escape CTA. |`
### error_empty_loading_retry_cancel
- `12: | Onboarding exception | Only the authenticated provider’s narrow onboarding paths (`my-profile`, steps 2/3, submit, progress, contract) remain reachable while pending. This allows legitimate document submission and review remediation witho`
- `13: | Provider app state | The app now maps only `approved`/`active` to `logged_in`; every unknown or pre-approval status maps to `pending`, with rejected and suspended remaining non-operational. |`
- `14: | Provider routing | Pending, rejected and suspended account states route to the review-status screen rather than an operational dashboard. The former **Explore App** escape action was replaced with a review-status refresh. |`
- `15: | Regression coverage | Guard tests prove pending provider operation denial, onboarding exception, and approved-provider allowance. Provider static contract tests prove status routing and the absence of the operational escape CTA. |`
- `34: No KYC document, provider record, endpoint operation, or production account was used. Phase 11 must verify linked sandbox provider accounts across pending, needs-changes, approved, rejected and suspended states; confirm the narrow onboardin`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
