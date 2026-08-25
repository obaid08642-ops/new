# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_FINAL_CLOSURE_DOUBLE_CHECK_20260819.md`
- **Member SHA-256:** `256225347696b2a81ea555f06896c96b1ef30c6ff92f67051fa4d4d79002296e`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: | Admin dashboard | Governance source contracts plus clean-environment Next production build | **PASS** — 7/7 contracts; compile/typecheck/prerender completed for 34 static routes. |`
- `29: | Administrative governance | Unverified maintenance, campaign delivery, SOS/PHI, AI routing, nursing assignment, disputes/refunds and catalogue publication are controlled or fail closed. | **Contained**. The required approved governance wo`
- `31: | Provider UI foundation | Shared buttons carry semantic role/state, touch margin, controlled haptic feedback and RTL flow. | **Improved**. This is not screen-by-screen device accessibility certification. |`
- `41: | Translation/design | Technical-key containment does not prove human-quality six-language content, RTL geometry or premium UX per screen. | Screen-by-screen linguistic, accessibility and visual evidence for all supported locales and form f`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: This review reconciled the newest source archives, branch history and repeatable gates after the Phase 8 remediation batches. It covers the source-level fixes and fail-closed containment created in Batches AE through AP, including ambulance`
- `7: > **Verdict: PASS for the current source-remediation gate; NOT APPROVED for production release.** The tested source is internally consistent and all four distributable archives are structurally valid. Production authorization remains blocke`
- `14: | Admin dashboard | Governance source contracts plus clean-environment Next production build | **PASS** — 7/7 contracts; compile/typecheck/prerender completed for 34 static routes. |`
- `20: | Admin archive | ZIP integrity | **PASS** — SHA-256 `5f59cf5ca7515228bf035c2fbf6aa1caa114dfb316da12b47ff2a18fa7abfda0`. |`
- `27: | Emergency/ambulance | Verified-vehicle binding and non-ambulance SOS surfaces fail closed. | **Contained**. No evidence asserts live dispatch authorization. |`
- `29: | Administrative governance | Unverified maintenance, campaign delivery, SOS/PHI, AI routing, nursing assignment, disputes/refunds and catalogue publication are controlled or fail closed. | **Contained**. The required approved governance wo`
- `31: | Provider UI foundation | Shared buttons carry semantic role/state, touch margin, controlled haptic feedback and RTL flow. | **Improved**. This is not screen-by-screen device accessibility certification. |`
- `37: | Emergency, QR, consent and location contracts | Owner legal/product approval has not been provided. | Approved policy/contract, security review and reviewer-authorized sandbox cases. |`
- `38: | Moyasar | Live merchant activation/test authority remains deferred. | Owner activation and controlled real-payment/rollback evidence. |`
- `39: | Live E2E | Source gates cannot prove state transitions, notifications, ownership, storage or realtime behavior against production. | Sandbox-only end-to-end matrix with artifacts and negative authorization cases. |`
- `40: | Devices and stores | Android SDK/physical-device and Apple TestFlight gates are outside this sandbox. | Signed build artifacts, device-farm evidence and owner real-device checklist completion. |`
- `42: | Deployment | No deployment was performed or authorized. | Reviewer/owner deployment request, rollback plan, backup verification and post-deployment smoke evidence. |`
### state_transitions
- `7: > **Verdict: PASS for the current source-remediation gate; NOT APPROVED for production release.** The tested source is internally consistent and all four distributable archives are structurally valid. Production authorization remains blocke`
- `13: | Backend | Full Jest regression plus Nest production build | **PASS** — 64 suites, 364 tests; build completed. |`
- `14: | Admin dashboard | Governance source contracts plus clean-environment Next production build | **PASS** — 7/7 contracts; compile/typecheck/prerender completed for 34 static routes. |`
- `15: | Provider app | Provider contracts, TypeScript and production Expo web export | **PASS** — 17/17 contracts; typecheck and export completed. |`
- `16: | Patient app | Full Jest, TypeScript and production Expo web export | **PASS** — test suite, typecheck and export completed. |`
- `25: | Area | Phase 8 state | Reconciliation result |`
- `29: | Administrative governance | Unverified maintenance, campaign delivery, SOS/PHI, AI routing, nursing assignment, disputes/refunds and catalogue publication are controlled or fail closed. | **Contained**. The required approved governance wo`
- `31: | Provider UI foundation | Shared buttons carry semantic role/state, touch margin, controlled haptic feedback and RTL flow. | **Improved**. This is not screen-by-screen device accessibility certification. |`
- `37: | Emergency, QR, consent and location contracts | Owner legal/product approval has not been provided. | Approved policy/contract, security review and reviewer-authorized sandbox cases. |`
- `39: | Live E2E | Source gates cannot prove state transitions, notifications, ownership, storage or realtime behavior against production. | Sandbox-only end-to-end matrix with artifacts and negative authorization cases. |`
### payment_insurance_relevance
- `28: | Doctor workflow | Owned request boundary now protects orders, completion, report issuance and insurance inputs; fabricated client facts removed/contained. | **Contained**. Clinical/reports/video/chat live acceptance remains required. |`
- `29: | Administrative governance | Unverified maintenance, campaign delivery, SOS/PHI, AI routing, nursing assignment, disputes/refunds and catalogue publication are controlled or fail closed. | **Contained**. The required approved governance wo`
- `38: | Moyasar | Live merchant activation/test authority remains deferred. | Owner activation and controlled real-payment/rollback evidence. |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
