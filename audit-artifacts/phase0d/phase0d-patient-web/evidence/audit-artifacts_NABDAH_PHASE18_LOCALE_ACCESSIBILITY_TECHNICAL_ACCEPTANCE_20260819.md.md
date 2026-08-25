# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE18_LOCALE_ACCESSIBILITY_TECHNICAL_ACCEPTANCE_20260819.md`
- **Member SHA-256:** `d999c090ab5698617ae9a5dd91ab0cf83f42b904dc010698ef344f8e2e56937b`
- **Line count:** 46
- **Read range:** `1-46`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: لم يجر اختبار device-native للـscreen reader أو focus order أو contrast أو touch targets أو line wrapping أو fonts أو dark mode أو orientation أو RTL navigation؛ Phase 17 نفسه محجوب لغياب artifacts الموقعة والأجهزة. لذلك لا يوثق هذا المستند`
- `31: | critical-screen visual pass | QA/Design | لا builds موقعة أو device farm أو هاتفان حقيقيان |`
- `32: | Accessibility pass | QA accessibility | لا screen reader/focus/contrast/touch evidence على native runtime |`
### backend_consumers_or_contracts
- `33: | API/push/error copy | Product/QA | لا E2E حي مكتمل ولا notification fixtures مملوكة |`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `33: | API/push/error copy | Product/QA | لا E2E حي مكتمل ولا notification fixtures مملوكة |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `33: | API/push/error copy | Product/QA | لا E2E حي مكتمل ولا notification fixtures مملوكة |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
