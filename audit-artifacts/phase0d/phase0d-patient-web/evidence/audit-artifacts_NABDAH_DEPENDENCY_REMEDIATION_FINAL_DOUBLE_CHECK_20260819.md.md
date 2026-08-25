# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_DEPENDENCY_REMEDIATION_FINAL_DOUBLE_CHECK_20260819.md`
- **Member SHA-256:** `28fcbf36be3f20b3035dc23532747cbc9bd21313e06ed7c2cec101218b7732e7`
- **Line count:** 43
- **Read range:** `1-43`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | تطبيق المزودين | Expo SDK 54→57، Camera/Audio مدعومان، Router/config/native dedupe | `npm ci`، TypeScript، 1 suite / 19 tests، Android/iOS/Web export، Expo Doctor 21/21: **PASS** | 8 moderate، 16 high، 0 critical | **PASS البوابات؛ خطر up`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
