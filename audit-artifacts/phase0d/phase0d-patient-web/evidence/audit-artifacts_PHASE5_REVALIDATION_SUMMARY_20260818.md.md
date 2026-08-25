# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE5_REVALIDATION_SUMMARY_20260818.md`
- **Member SHA-256:** `c223c478f04b87eaa1e951a8a776edb17d65cb542a93b7dbfb4e588040ea879a`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The reconciliation branch is clean and synchronized at the latest QA commit. Provider App TypeScript, Jest contract tests, Expo Android export, and Expo prebuild passed after restoring the authoritative entrypoint. The audit-report project `
- `9: Pharmacy lifecycle is blocked because the sandbox pharmacy has `started:false`, an empty broadcast list, and no proven ownership of the real pending order. Laboratory lifecycle is blocked because the inbox has no pre-report sandbox request.`
- `13: The first Patient exact-read attempt remains recorded as a transport timeout; it was superseded for the tested read set by a later successful retry and must not be counted as a functional failure.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The reconciliation branch is clean and synchronized at the latest QA commit. Provider App TypeScript, Jest contract tests, Expo Android export, and Expo prebuild passed after restoring the authoritative entrypoint. The audit-report project `
- `9: Pharmacy lifecycle is blocked because the sandbox pharmacy has `started:false`, an empty broadcast list, and no proven ownership of the real pending order. Laboratory lifecycle is blocked because the inbox has no pre-report sandbox request.`
- `17: These results do not constitute a full launch-ready certification. They establish several verified security/readiness gates while leaving lifecycle, Admin source authority, device testing, financial gateway activation, and contract approval`
### state_transitions
- `5: The reconciliation branch is clean and synchronized at the latest QA commit. Provider App TypeScript, Jest contract tests, Expo Android export, and Expo prebuild passed after restoring the authoritative entrypoint. The audit-report project `
- `9: Pharmacy lifecycle is blocked because the sandbox pharmacy has `started:false`, an empty broadcast list, and no proven ownership of the real pending order. Laboratory lifecycle is blocked because the inbox has no pre-report sandbox request.`
- `13: The first Patient exact-read attempt remains recorded as a transport timeout; it was superseded for the tested read set by a later successful retry and must not be counted as a functional failure.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: The reconciliation branch is clean and synchronized at the latest QA commit. Provider App TypeScript, Jest contract tests, Expo Android export, and Expo prebuild passed after restoring the authoritative entrypoint. The audit-report project `
- `9: Pharmacy lifecycle is blocked because the sandbox pharmacy has `started:false`, an empty broadcast list, and no proven ownership of the real pending order. Laboratory lifecycle is blocked because the inbox has no pre-report sandbox request.`
- `13: The first Patient exact-read attempt remains recorded as a transport timeout; it was superseded for the tested read set by a later successful retry and must not be counted as a functional failure.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
