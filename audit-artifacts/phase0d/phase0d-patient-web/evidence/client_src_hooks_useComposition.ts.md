# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/hooks/useComposition.ts`
- **Member SHA-256:** `674c515075a2f318d4ec2291313ba552488de0b2c1aac7f36f3d71c4e34d434e`
- **Line count:** 81
- **Read range:** `1-81`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `21: type TimerResponse = ReturnType<typeof setTimeout>;`
- `38: clearTimeout(timer.current);`
- `42: clearTimeout(timer2.current);`
- `50: // 使用两层 setTimeout 来处理 Safari 浏览器中 compositionEnd 先于 onKeyDown 触发的问题`
- `51: timer.current = setTimeout(() => {`
- `52: timer2.current = setTimeout(() => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
